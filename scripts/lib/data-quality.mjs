export function buildDataQuality(output, stationInventory = {}) {
  const zones = Object.entries(output.zones ?? {});
  const stationUse = new Map();
  const issues = [];
  let direct = 0, interpolated = 0, observationFallback = 0;
  for (const [zoneId, zone] of zones) {
    const method = zone.waterLevel?.diagnostic?.observationMethod ?? zone.waterLevel?.interpolation?.method ?? null;
    const stations = zone.waterLevel?.diagnostic?.observationStations ?? zone.waterLevel?.interpolation?.stations ?? [];
    if (method?.startsWith('direct-')) direct++; else if (method === 'coast-bracket-2-stations') interpolated++; else observationFallback++;
    const ids = stations.map(x=>x.stationId).filter(Boolean);
    if (new Set(ids).size !== ids.length) issues.push({severity:'error',code:'DUPLICATE_STATION',zoneId,message:'Samme DMI-station er valgt mere end én gang.'});
    if (method === 'coast-bracket-2-stations') {
      const sides = new Set(stations.map(x=>x.side));
      if (stations.length !== 2 || !sides.has('before') || !sides.has('after')) issues.push({severity:'error',code:'INVALID_BRACKET',zoneId,message:'Interpolation mangler én unik station på hver side.'});
    }
    for (const station of stations) {
      stationUse.set(station.stationId,(stationUse.get(station.stationId)??0)+1);
      if ((station.distanceKm??0)>80) issues.push({severity:'warning',code:'DISTANT_STATION',zoneId,message:'Stationen ligger mere end 80 km fra zonens datapunkt.'});
      if ((station.observationAgeMinutes??0)>90) issues.push({severity:'warning',code:'STALE_OBSERVATION',zoneId,message:'DMI-observationen er ældre end 90 minutter.'});
    }
  }
  const cache = output.weatherEngine?.dmiForecastCache ?? {};
  const acq = output.weatherEngine?.acquisition ?? {};
  if (cache.currentZones !== undefined && (cache.currentZones??0) < zones.length*.8) issues.push({severity:'warning',code:'DMI_CURRENT_LOW_COVERAGE',message:`DMI-strøm dækker kun ${cache.currentZones??0} af ${zones.length} zoner.`});
  if (cache.waterLevelZones !== undefined && (cache.waterLevelZones??0) < zones.length*.8) issues.push({severity:'warning',code:'DMI_WATER_LEVEL_LOW_COVERAGE',message:`DMI-vandstand dækker kun ${cache.waterLevelZones??0} af ${zones.length} zoner.`});
  if (stationInventory.attempted === true && stationInventory.stationsFetched === 0 && (stationInventory.stationsWithFreshLevel??0) === 0) issues.push({severity:'warning',code:'DMI_OBSERVATIONS_UNAVAILABLE',message:'DMI-vandstandsobservationer blev forsøgt hentet, men ingen friske observationer var tilgængelige.'});
  if (acq.stoppedByHttp429) issues.push({severity:'error',code:'DMI_HTTP_429_ACTIVE',message:'DMI stoppede kørslens livehentning med HTTP 429.'});
  if ((cache.duplicateTimestampZones??0)>0) issues.push({severity:'warning',code:'DUPLICATE_FORECAST_TIMESTAMPS',message:`${cache.duplicateTimestampZones} zoner havde dublerede rå prognosetider.`});
  const bulkErrors = acq.bulkModelDownloads?.diagnostics?.errors ?? [];
  if (bulkErrors.some(x=>String(x.message||'').includes('no required RavRadar parameters'))) issues.push({severity:'error',code:'UNRECOGNIZED_GRIB_PARAMETERS',message:'Mindst én DMI GRIB-samling blev hentet uden genkendte RavRadar-parametre.'});
  const mixedWithout = zones.filter(([,z])=>z.provider==='mixed'&&!z.sources).length;
  if (mixedWithout) issues.push({severity:'error',code:'MIXED_PROVIDER_WITHOUT_PROVENANCE',message:`${mixedWithout} blandede zoner mangler komponentvis kildeinformation.`});
  const errors=issues.filter(x=>x.severity==='error').length,warnings=issues.filter(x=>x.severity==='warning').length;
  return {generatedAt:output.generatedAt,status:errors?'error':warnings?'warning':'ok',observations:{stationsFetched:stationInventory.stationsFetched??null,stationsWithFreshLevel:stationInventory.stationsWithFreshLevel??null,uniqueStationsUsed:stationUse.size,directZones:direct,interpolatedZones:interpolated,zonesWithoutDmiObservation:observationFallback},forecast:{zonesFromDmiOrCache:zones.filter(([,z])=>['dmi','dmi-cache','mixed'].includes(z.provider)).length,completeDmiZones:cache.completeZones??0,componentCoverage:{wind:cache.windZones??0,wave:cache.waveZones??0,current:cache.currentZones??0,waterLevel:cache.waterLevelZones??0},cacheZones:cache.zones??0},issueCounts:{errors,warnings},issues:issues.slice(0,250)};
}
