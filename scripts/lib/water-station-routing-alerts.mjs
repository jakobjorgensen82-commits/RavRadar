function activeStation(station) {
  const status = String(station?.registryStatus ?? station?.properties?.status ?? '').toLowerCase();
  return !['retired', 'deleted', 'historical', 'inactive', 'future'].includes(status);
}

function effectiveSelections(features, routing, audit) {
  const selected = new Map();
  for (const feature of features ?? []) {
    const zoneId = String(feature?.properties?.id ?? '');
    if (!zoneId) continue;
    const override = routing?.zones?.[zoneId];
    const sources = override?.enabled && Array.isArray(override.stations) && override.stations.length
      ? override.stations.map(item => ({ stationId: String(item.stationId ?? ''), source: 'admin-override' }))
      : (audit?.zones?.[zoneId]?.stations ?? []).map(item => ({ stationId: String(item.stationId ?? ''), source: 'automatic' }));
    for (const source of sources) {
      if (!source.stationId) continue;
      const rows = selected.get(source.stationId) ?? [];
      rows.push({ zoneId, source: source.source });
      selected.set(source.stationId, rows);
    }
  }
  return selected;
}

function latestValidUntil(station) {
  const values = [station?.sourceForecastValidUntil, station?.forecastCacheValidUntil]
    .map(value => Date.parse(value ?? ''))
    .filter(Number.isFinite);
  return values.length ? Math.max(...values) : NaN;
}

export function buildEffectiveRoutingCacheAlerts({ document, features, routing, audit, generatedAt }) {
  const warningHours = Math.max(1, Math.min(120, Number(routing?.alertSettings?.cacheWarningHours ?? 12)));
  const selected = effectiveSelections(features, routing, audit);
  const now = Date.parse(generatedAt);
  const newNotifications = [];
  const stations = (document?.stations ?? []).map(station => {
    const routedZones = selected.get(String(station.stationId)) ?? [];
    let alertLevel = null;
    let remainingHours = null;
    if (routedZones.length && activeStation(station) && station.deliveryStatus !== 'delivering') {
      const validUntil = latestValidUntil(station);
      remainingHours = Number.isFinite(validUntil) && Number.isFinite(now) ? (validUntil - now) / 3600000 : null;
      if (remainingHours === null || remainingHours <= 0) alertLevel = 'critical';
      else if (remainingHours <= warningHours) alertLevel = 'warning';
    }
    const previousLevel = station.routingCacheAlertLevel ?? null;
    if (alertLevel && alertLevel !== previousLevel) {
      const type = alertLevel === 'critical' ? 'selected-station-cache-exhausted' : 'selected-station-cache-warning';
      newNotifications.push({
        id: `${type}:${station.stationId}:${generatedAt}`,
        type,
        severity: alertLevel,
        stationId: String(station.stationId),
        stationName: station.name,
        generatedAt,
        cacheRemainingHours: remainingHours === null ? null : Number(remainingHours.toFixed(1)),
        cacheWarningHours: warningHours,
        routedZones,
        message: alertLevel === 'critical'
          ? `${station.name} er valgt til ${routedZones.length} zone(r), leverer ikke nu og har ingen gyldig prognose eller cache.`
          : `${station.name} er valgt til ${routedZones.length} zone(r), leverer ikke nu, og prognose/cache udløber om ca. ${Math.max(0, Math.round(remainingHours))} timer.`
      });
    }
    return {
      ...station,
      effectiveRoutingZoneIds: routedZones.map(item => item.zoneId),
      effectiveRoutingSources: [...new Set(routedZones.map(item => item.source))],
      routingCacheAlertLevel: alertLevel,
      routingCacheRemainingHours: remainingHours === null ? null : Number(remainingHours.toFixed(1)),
      routingCacheWarningHours: warningHours
    };
  });
  const notifications = [...newNotifications, ...(document?.notifications ?? [])]
    .filter((item, index, all) => all.findIndex(other => other.id === item.id) === index)
    .slice(0, 250);
  return {
    document: {
      ...(document ?? {}), generatedAt, stations, notifications,
      alertSettings: { cacheWarningHours: warningHours },
      summary: {
        ...(document?.summary ?? {}),
        selectedStationsWithCacheWarning: stations.filter(item => item.routingCacheAlertLevel === 'warning').length,
        selectedStationsCritical: stations.filter(item => item.routingCacheAlertLevel === 'critical').length,
        newNotifications: newNotifications.length
      }
    },
    newNotifications
  };
}
