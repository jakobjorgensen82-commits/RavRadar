const finite = value => value === null || value === undefined || value === '' ? null : (Number.isFinite(Number(value)) ? Number(value) : null);
const round = (value, digits = 0) => Number.isFinite(value) ? Number(value.toFixed(digits)) : null;

/**
 * Builds one coherent water-level series. DMI is authoritative; short internal
 * DMI gaps are interpolated. Other providers are only used as continuous,
 * bias-adjusted blocks when DMI genuinely has no coverage.
 */
export function repairWaterLevelContinuity(rows, dmiByTime, fallbackByTime, {
  shortDmiGapHours = 6,
  jumpWarningCm = 35
} = {}) {
  const diagnostics = {
    dmiHours: 0,
    interpolatedDmiGapHours: 0,
    fallbackHours: 0,
    sourceSwitches: 0,
    continuityRepairs: 0,
    largestHourlyJumpCm: 0,
    warnings: []
  };
  const values = rows.map(row => finite(dmiByTime.get(row.time)?.waterLevelCm));
  for (const value of values) if (value !== null) diagnostics.dmiHours += 1;

  for (let start = 0; start < values.length;) {
    if (values[start] !== null) { start += 1; continue; }
    let end = start;
    while (end < values.length && values[end] === null) end += 1;
    const gap = end - start;
    const before = start > 0 ? values[start - 1] : null;
    const after = end < values.length ? values[end] : null;
    if (before !== null && after !== null && gap <= shortDmiGapHours) {
      for (let i = 0; i < gap; i += 1) values[start + i] = before + (after - before) * ((i + 1) / (gap + 1));
      diagnostics.interpolatedDmiGapHours += gap;
      diagnostics.continuityRepairs += gap;
    }
    start = end;
  }

  for (let start = 0; start < values.length;) {
    if (values[start] !== null) { start += 1; continue; }
    let end = start;
    while (end < values.length && values[end] === null) end += 1;
    const fallbackValues = [];
    for (let i = start; i < end; i += 1) fallbackValues.push(finite(fallbackByTime.get(rows[i].time)?.waterLevelCm));
    const beforeDmi = start > 0 ? values[start - 1] : null;
    const afterDmi = end < values.length ? values[end] : null;
    const firstFallback = fallbackValues.find(v => v !== null) ?? null;
    const lastFallback = [...fallbackValues].reverse().find(v => v !== null) ?? null;
    const beforeOffset = beforeDmi !== null && firstFallback !== null ? beforeDmi - firstFallback : null;
    const afterOffset = afterDmi !== null && lastFallback !== null ? afterDmi - lastFallback : null;
    for (let i = start; i < end; i += 1) {
      const raw = fallbackValues[i - start];
      if (raw === null) continue;
      let offset = beforeOffset ?? afterOffset ?? 0;
      if (beforeOffset !== null && afterOffset !== null && end - start > 1) {
        offset = beforeOffset + (afterOffset - beforeOffset) * ((i - start) / (end - start - 1));
      }
      values[i] = raw + offset;
      rows[i].waterLevelFallbackRawCm = raw;
      rows[i].waterLevelFallbackOffsetCm = round(offset, 1);
      diagnostics.fallbackHours += 1;
      diagnostics.continuityRepairs += Math.abs(offset) >= 0.5 ? 1 : 0;
    }
    start = end;
  }

  let previousProvider = null;
  for (let i = 0; i < rows.length; i += 1) {
    const originalDmi = finite(dmiByTime.get(rows[i].time)?.waterLevelCm) !== null;
    const interpolatedDmi = !originalDmi && values[i] !== null && rows[i].waterLevelFallbackRawCm === undefined;
    const provider = originalDmi ? 'dmi' : interpolatedDmi ? 'dmi-interpolated' : values[i] !== null ? 'open-meteo-adjusted' : 'missing';
    rows[i].waterLevelCm = values[i] === null ? null : round(values[i], 0);
    rows[i].waterLevelModelCm = originalDmi ? rows[i].waterLevelCm : null;
    rows[i].waterLevelSource = provider;
    rows[i].sources ??= {};
    rows[i].sources.waterLevel = { provider, fallback: provider.startsWith('open-meteo'), repaired: interpolatedDmi || provider.endsWith('adjusted') };
    if (previousProvider && provider !== previousProvider && provider !== 'missing' && previousProvider !== 'missing') diagnostics.sourceSwitches += 1;
    previousProvider = provider;
    if (i > 0 && rows[i - 1].waterLevelCm != null && rows[i].waterLevelCm != null) {
      const jump = Math.abs(rows[i].waterLevelCm - rows[i - 1].waterLevelCm);
      diagnostics.largestHourlyJumpCm = Math.max(diagnostics.largestHourlyJumpCm, jump);
      if (jump >= jumpWarningCm) diagnostics.warnings.push({ time: rows[i].time, jumpCm: jump, from: rows[i - 1].waterLevelCm, to: rows[i].waterLevelCm, source: provider });
    }
  }
  for (let i = 0; i < rows.length; i += 1) {
    const future = rows[i + 3]?.waterLevelCm;
    rows[i].waterLevelTrendCm3h = rows[i].waterLevelCm == null || future == null ? null : round(future - rows[i].waterLevelCm, 0);
  }
  return diagnostics;
}
