export function createPersistentDmiStore(existingStore, activeZoneIds, horizonHours) {
  const active = new Set(activeZoneIds);
  const zones = Object.fromEntries(
    Object.entries(existingStore?.zones ?? {}).filter(([zoneId]) => active.has(zoneId))
  );
  return {
    schemaVersion: 2,
    generatedAt: existingStore?.generatedAt ?? null,
    horizonHours,
    runtime: {
      nextZoneCursor: 0,
      rateLimits: { forecastEdr: { rateLimitedUntil: null, successStreak: 0, last429At: null }, forecastStac: { rateLimitedUntil: null }, oceanObs: { rateLimitedUntil: null } },
      lastAttemptedZoneId: null,
      lastAttemptAt: null,
      lastSuccessfulZoneId: null,
      lastSuccessAt: null,
      ...(existingStore?.runtime ?? {})
    },
    zones
  };
}

export function prioritizeDmiFeatures(features, store, generatedAt, coverageFn, cursor = 0) {
  const stable = [...features].sort((a, b) => String(a.properties?.id ?? '').localeCompare(String(b.properties?.id ?? '')));
  const start = Math.max(0, Number(cursor) || 0) % Math.max(1, stable.length);
  const rank = new Map(stable.map((feature, index) => [feature.properties?.id, (index - start + stable.length) % stable.length]));
  const prioritized = [...stable].sort((a, b) => {
    const aId = a.properties?.id ?? '';
    const bId = b.properties?.id ?? '';
    const aCoverage = coverageFn(store?.zones?.[aId], generatedAt);
    const bCoverage = coverageFn(store?.zones?.[bId], generatedAt);
    if (aCoverage.available !== bCoverage.available) return aCoverage.available ? 1 : -1;
    if (aCoverage.remainingHours !== bCoverage.remainingHours) return aCoverage.remainingHours - bCoverage.remainingHours;
    return (rank.get(aId) ?? 0) - (rank.get(bId) ?? 0);
  });
  return { stable, prioritized, startCursor: start };
}

export function countDmiBackedZones(zones) {
  const values = Object.values(zones ?? {});
  return {
    live: values.filter(zone => zone?.provider === 'dmi').length,
    cached: values.filter(zone => zone?.provider === 'dmi-cache').length,
    total: values.filter(zone => zone?.provider === 'dmi' || zone?.provider === 'dmi-cache').length
  };
}

export function summarizeAvailableCoverage(records, generatedAt, coverageFn, roundFn = value => value) {
  const available = Object.values(records ?? {})
    .map(record => coverageFn(record, generatedAt))
    .filter(item => item.available);
  return {
    zones: available.length,
    minimumRemainingHours: available.length ? roundFn(Math.min(...available.map(item => item.remainingHours)), 1) : 0,
    maximumRemainingHours: available.length ? roundFn(Math.max(...available.map(item => item.remainingHours)), 1) : 0
  };
}
