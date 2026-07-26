export function buildDataQuality(output, stationInventory = {}) {
  const zones = Object.entries(output.zones ?? {});
  const stationUse = new Map();
  const issues = [];
  let direct = 0;
  let interpolated = 0;
  let observationFallback = 0;

  for (const [zoneId, zone] of zones) {
    const method = zone.waterLevel?.diagnostic?.observationMethod ?? zone.waterLevel?.interpolation?.method ?? null;
    const stations = zone.waterLevel?.diagnostic?.observationStations ?? zone.waterLevel?.interpolation?.stations ?? [];
    if (method?.startsWith('direct-')) direct += 1;
    else if (method === 'coast-bracket-2-stations') interpolated += 1;
    else observationFallback += 1;

    const ids = stations.map(item => item.stationId).filter(Boolean);
    if (new Set(ids).size !== ids.length) {
      issues.push({ severity: 'error', code: 'DUPLICATE_STATION', zoneId, message: 'Samme DMI-station er valgt mere end én gang.' });
    }
    if (method === 'coast-bracket-2-stations') {
      const sides = new Set(stations.map(item => item.side));
      if (stations.length !== 2 || !sides.has('before') || !sides.has('after')) {
        issues.push({ severity: 'error', code: 'INVALID_BRACKET', zoneId, message: 'Interpolation mangler én unik station på hver side.' });
      }
    }
    for (const station of stations) {
      stationUse.set(station.stationId, (stationUse.get(station.stationId) ?? 0) + 1);
      if ((station.distanceKm ?? 0) > 80) {
        issues.push({ severity: 'warning', code: 'DISTANT_STATION', zoneId, stationId: station.stationId, distanceKm: station.distanceKm, message: 'Stationen ligger mere end 80 km fra zonens datapunkt.' });
      }
      if ((station.observationAgeMinutes ?? 0) > 90) {
        issues.push({ severity: 'warning', code: 'STALE_OBSERVATION', zoneId, stationId: station.stationId, ageMinutes: station.observationAgeMinutes, message: 'DMI-observationen er ældre end 90 minutter.' });
      }
    }
  }

  const forecastZones = zones.filter(([, zone]) => zone.provider === 'dmi' || zone.provider === 'dmi-cache').length;
  const partialForecastZones = zones.filter(([, zone]) => zone.dmiCompleteness?.componentErrors?.length).length;
  return {
    generatedAt: output.generatedAt,
    status: issues.some(item => item.severity === 'error') ? 'error' : issues.length ? 'warning' : 'ok',
    observations: {
      stationsFetched: stationInventory.stationsFetched ?? null,
      stationsWithFreshLevel: stationInventory.stationsWithFreshLevel ?? null,
      uniqueStationsUsed: stationUse.size,
      directZones: direct,
      interpolatedZones: interpolated,
      zonesWithoutDmiObservation: observationFallback
    },
    forecast: {
      zonesFromDmiOrCache: forecastZones,
      partialLiveDmiZones: partialForecastZones,
      cacheZones: output.weatherEngine?.dmiForecastCache?.zones ?? 0
    },
    issueCounts: {
      errors: issues.filter(item => item.severity === 'error').length,
      warnings: issues.filter(item => item.severity === 'warning').length
    },
    issues: issues.slice(0, 250)
  };
}
