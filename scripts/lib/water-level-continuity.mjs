const finite = value => value === null || value === undefined || value === '' ? null : (Number.isFinite(Number(value)) ? Number(value) : null);
const round = (value, digits = 0) => Number.isFinite(value) ? Number(value.toFixed(digits)) : null;

function directionOf(delta, deadbandCm) {
  if (!Number.isFinite(delta) || Math.abs(delta) < deadbandCm) return 0;
  return delta > 0 ? 1 : -1;
}

/**
 * Diagnose tidal shape without modifying authoritative water levels.
 *
 * A semidiurnal tide normally produces about two highs and two lows per day,
 * i.e. roughly four meaningful turning points in 24 hours. Small movements near
 * slack water are ignored by a deadband. Repeated significant hour-by-hour
 * reversals are treated as a likely data-composition problem, not as a reason
 * to flatten the tide automatically.
 */
function diagnoseTidalPattern(rows, {
  directionDeadbandCm = 5,
  tidalWindowHours = 24,
  maxTurningPointsPerWindow = 6,
  rapidReversalHours = 2,
  minRapidReversals = 3
} = {}) {
  const result = {
    expectedTidesPerDay: 2,
    expectedTurningPointsPerDay: 4,
    directionDeadbandCm,
    windowsAnalyzed: 0,
    suspiciousWindows: 0,
    maximumTurningPointsInWindow: 0,
    rapidReversals: 0,
    alternatingRuns: [],
    warnings: []
  };

  const directions = [];
  for (let i = 1; i < rows.length; i += 1) {
    const a = finite(rows[i - 1]?.waterLevelCm);
    const b = finite(rows[i]?.waterLevelCm);
    if (a === null || b === null) continue;
    const direction = directionOf(b - a, directionDeadbandCm);
    if (direction !== 0) directions.push({ index: i, time: rows[i].time, direction, deltaCm: round(b - a, 1) });
  }

  // Detect rapid alternating runs (+ - + -), while ignoring insignificant plateau noise.
  let runStart = 0;
  for (let i = 1; i <= directions.length; i += 1) {
    const continues = i < directions.length
      && directions[i].direction !== directions[i - 1].direction
      && directions[i].index - directions[i - 1].index <= rapidReversalHours;
    if (continues) continue;
    const run = directions.slice(runStart, i);
    if (run.length >= minRapidReversals + 1) {
      const reversals = run.length - 1;
      result.rapidReversals += reversals;
      result.alternatingRuns.push({
        from: run[0].time,
        to: run.at(-1).time,
        reversals,
        pattern: run.map(item => item.direction > 0 ? '+' : '-').join(''),
        deltasCm: run.map(item => item.deltaCm)
      });
    }
    runStart = i;
  }

  // Rolling 24-hour turning-point count. More than six gives tolerance beyond
  // the four astronomical turning points while still catching implausible zigzag.
  for (let start = 0; start < rows.length; start += 1) {
    const end = Math.min(rows.length, start + tidalWindowHours + 1);
    if (end - start < Math.min(12, tidalWindowHours)) continue;
    const windowDirections = directions.filter(item => item.index > start && item.index < end);
    if (windowDirections.length < 2) continue;
    let turns = 0;
    for (let i = 1; i < windowDirections.length; i += 1) {
      if (windowDirections[i].direction !== windowDirections[i - 1].direction) turns += 1;
    }
    result.windowsAnalyzed += 1;
    result.maximumTurningPointsInWindow = Math.max(result.maximumTurningPointsInWindow, turns);
    if (turns > maxTurningPointsPerWindow) {
      result.suspiciousWindows += 1;
      result.warnings.push({
        from: rows[start].time,
        to: rows[end - 1].time,
        turningPoints: turns,
        expectedTurningPoints: 4,
        allowedWithTolerance: maxTurningPointsPerWindow,
        classification: 'excessive-tidal-direction-reversals',
        action: 'diagnostic-review-without-modification'
      });
    }
  }

  for (const run of result.alternatingRuns) {
    result.warnings.push({
      ...run,
      classification: 'rapid-hourly-water-level-zigzag',
      action: 'diagnostic-review-without-modification'
    });
  }
  return result;
}


/**
 * Builds one coherent water-level series.
 *
 * Scientific safety principle:
 * - Valid DMI values are authoritative and are never altered merely because
 *   the hourly change is large. Large changes can be physically correct,
 *   especially in strongly tidal waters such as the Wadden Sea.
 * - Short internal DMI gaps may be interpolated between two DMI anchors.
 * - Other providers are used only for genuine DMI gaps, as contiguous,
 *   bias-adjusted blocks.
 * - Large DMI changes are diagnostics, not automatic repair triggers.
 */
export function repairWaterLevelContinuity(rows, dmiByTime, fallbackByTime, options = {}) {
  const {
    shortDmiGapHours = 6,
    jumpWarningCm = 35
  } = options;
  const diagnostics = {
    dmiHours: 0,
    interpolatedDmiGapHours: 0,
    fallbackHours: 0,
    // Kept for backwards-compatible diagnostics. Valid DMI slopes are no longer repaired.
    dmiSlopeRepairs: 0,
    authoritativeDmiJumpsAccepted: 0,
    sourceSwitches: 0,
    continuityRepairs: 0,
    largestHourlyJumpCm: 0,
    warnings: [],
    tidalPattern: null
  };

  // Clear metadata inherited from an older cached merge before rebuilding the series.
  for (const row of rows) {
    delete row.waterLevelFallbackRawCm;
    delete row.waterLevelFallbackOffsetCm;
    delete row.waterLevelRepairBasis;
  }

  const values = rows.map(row => finite(dmiByTime.get(row.time)?.waterLevelCm));
  for (const value of values) if (value !== null) diagnostics.dmiHours += 1;

  // Fill only short, internal gaps between two authoritative DMI anchors.
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

  // Fill remaining genuine DMI gaps with one coherent, bias-adjusted fallback block.
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
      rows[i].waterLevelRepairBasis = 'open-meteo-gap-shape-bias-adjusted-to-dmi';
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
    const priorDmiSource = rows[i].sources.waterLevel?.provider === 'dmi' ? rows[i].sources.waterLevel : {};
    rows[i].sources.waterLevel = {
      ...(provider === 'dmi' ? priorDmiSource : {}),
      provider,
      fallback: provider.startsWith('open-meteo'),
      repaired: interpolatedDmi || provider.endsWith('adjusted'),
      repairBasis: rows[i].waterLevelRepairBasis ?? null
    };
    if (previousProvider && provider !== previousProvider && provider !== 'missing' && previousProvider !== 'missing') diagnostics.sourceSwitches += 1;
    previousProvider = provider;

    if (i > 0 && rows[i - 1].waterLevelCm != null && rows[i].waterLevelCm != null) {
      const jump = Math.abs(rows[i].waterLevelCm - rows[i - 1].waterLevelCm);
      diagnostics.largestHourlyJumpCm = Math.max(diagnostics.largestHourlyJumpCm, jump);
      if (jump >= jumpWarningCm) {
        const previousOriginalDmi = finite(dmiByTime.get(rows[i - 1].time)?.waterLevelCm) !== null;
        const authoritativeDmiPair = previousOriginalDmi && originalDmi;
        if (authoritativeDmiPair) diagnostics.authoritativeDmiJumpsAccepted += 1;
        diagnostics.warnings.push({
          time: rows[i].time,
          jumpCm: jump,
          from: rows[i - 1].waterLevelCm,
          to: rows[i].waterLevelCm,
          source: provider,
          classification: authoritativeDmiPair ? 'authoritative-dmi-dynamic-change' : 'continuity-transition-review',
          action: authoritativeDmiPair ? 'accepted-without-modification' : 'diagnostic-review'
        });
      }
    }
  }

  diagnostics.tidalPattern = diagnoseTidalPattern(rows, options);
  diagnostics.warnings.push(...diagnostics.tidalPattern.warnings);

  for (let i = 0; i < rows.length; i += 1) {
    const future = rows[i + 3]?.waterLevelCm;
    rows[i].waterLevelTrendCm3h = rows[i].waterLevelCm == null || future == null ? null : round(future - rows[i].waterLevelCm, 0);
  }
  return diagnostics;
}
