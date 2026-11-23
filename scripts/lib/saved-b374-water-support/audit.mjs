import { isDeepStrictEqual as same } from 'node:util';

export const H0 = '2026-11-23T00:00:00.000Z';
export const H3 = '2026-11-23T03:00:00.000Z';
const slots = [H0, H3];
export const scope = Object.freeze([
  ['DK-B04-07', 'dk-b04-07-national-part-02'],
  ['DK-B04-07', 'dk-b04-07-national-part-03'],
  ['DK-B04-07', 'dk-b04-07-national-part-04'],
  ['DK-B04-07', 'dk-b04-07-national-part-05'],
  ['DK-B04-08', 'dk-b04-08-national-part-01-locality-01'],
  ['DK-B04-08', 'dk-b04-08-national-part-01-locality-02'],
].map(Object.freeze));

const fail = status => { throw new Error(status); };
const sourceKey = source => String(source?.sourceKey ?? source?.stationId ?? '');
const at = (record, time) => record?.hourly.find(row => row.time === time);
const series = row => {
  const source = row?.sources?.waterLevel;
  return source?.provider === 'dmi'
    ? [source.entityId, source.collection, source.modelRun, source.gridDefinitionSha256, source.gridPoint]
    : null;
};
const qualifies = (row, initial, zoneId, normal) => Number.isFinite(row?.waterLevelCm)
  && series(row) !== null && same(series(initial), series(row))
  && normal.collectionAllowedForZone(row.sources.waterLevel.collection, zoneId, 'waterLevel');

function selectRoute(normal, part, feature, stationRegistry, index, routing) {
  return normal.applyVerifiedWaterSourceRoutingToPartHourly({
    part, parentFeature: feature, hourly: slots.map(time => ({ time })),
    sources: stationRegistry, index, routing, haversineKm: normal.haversineKm,
    diagnosticReferenceAt: H0,
  });
}

function normalDecision(zoneId, partId, publicHours, result) {
  const observation = result.romoWaterTrendObservation;
  const [initial, future] = result.hourly;
  const keys = initial?.waterLevelProvenance?.sourceKeys;
  if (observation?.zoneId !== zoneId || observation?.partId !== partId
    || observation.selectedPath !== 'ROUTED_SOURCE' || !observation.selectedSourceT3Qualified
    || observation.seriesMatch !== false || observation.comparisonUsed !== false
    || !Array.isArray(keys) || keys.length === 0 || keys.length > 16
    || new Set(keys).size !== keys.length || !same(keys, future?.waterLevelProvenance?.sourceKeys)
    || !slots.every((time, offset) => Number.isFinite(result.hourly[offset]?.waterLevelCm)
      && result.hourly[offset].waterLevelCm === publicHours.get(time)?.waterLevelCm)
    || publicHours.get(H0)?.waterLevelTrendCm3h !== null) fail('SEALED_B374_ROUTE_MISMATCH');
  return keys;
}

// Pure projection. The caller authenticates both B archives, geometry, public
// hour member and installed normal module before it constructs these inputs.
export function auditB374WaterSourceSupport({
  normal, cases, stationRegistry, routing, routingConfigurationSha256, sealedIndex,
  activeBulk, protectedBulk, historicalBulk, retainedIndex,
}) {
  if (!/^[0-9a-f]{64}$/.test(routingConfigurationSha256 ?? '')
    || normal.waterRoutingConfigurationSha256(routing) !== routingConfigurationSha256) {
    fail('SEALED_B374_ROUTING_CONFIGURATION_MISMATCH');
  }
  if (!(cases instanceof Map) || cases.size !== scope.length || !Array.isArray(stationRegistry)
    || !(sealedIndex instanceof Map) || !(retainedIndex instanceof Map)
    || !activeBulk?.zones || !protectedBulk?.zones
    || (historicalBulk !== null && !historicalBulk?.zones)) fail('AUTHENTICATED_INPUTS_REQUIRED');

  const chosen = scope.map(([zoneId, partId]) => {
    const item = cases.get(partId);
    if (item?.part?.partId !== partId || item.part.zoneId !== zoneId
      || item.feature?.properties?.id !== zoneId || !(item.publicHours instanceof Map)) {
      fail('SEALED_B374_PART_SCOPE_MISMATCH');
    }
    const result = selectRoute(normal, item.part, item.feature, stationRegistry, sealedIndex, routing);
    return { zoneId, partId, keys: normalDecision(zoneId, partId, item.publicHours, result) };
  });

  const selectedKeys = new Set(chosen.flatMap(row => row.keys));
  const selectedStations = stationRegistry.filter(source => selectedKeys.has(sourceKey(source)));
  if (selectedStations.length !== selectedKeys.size
    || new Set(selectedStations.map(sourceKey)).size !== selectedKeys.size) fail('SEALED_B374_STATIONS_MISMATCH');
  const build = (bulk, options) => normal.buildWaterSourceForecastIndex(selectedStations, bulk, H0, options);
  const union = build(activeBulk, { protectedBulkCache: protectedBulk, historicalBulkCache: historicalBulk,
    retainedSourceIndex: retainedIndex });
  const banks = [
    ['ACTIVE_CANDIDATE', build(activeBulk)],
    ['PROTECTED_BULK', build(protectedBulk)],
    ['HISTORICAL_BULK', build(historicalBulk)],
    ['RETAINED_SOURCE', build(null, { retainedSourceIndex: retainedIndex })],
  ];
  for (const key of selectedKeys) {
    const record = union.get(key);
    const sealed = sealedIndex.get(key);
    if (!record || !sealed
      || !same(record.point, sealed.point)
      || !same(JSON.parse(JSON.stringify(record.hourly)), sealed.hourly)) fail('SEALED_B374_SOURCE_UNION_MISMATCH');
  }

  const parts = chosen.map(({ zoneId, partId, keys }) => {
    const supports = keys.map(key => {
      const record = union.get(key);
      const initial = at(record, H0);
      const selectedFuture = at(record, H3);
      if (qualifies(selectedFuture, initial, zoneId, normal)) return { selectedFuture, banks: [], conflict: false };
      const alternatives = banks.flatMap(([bank, index]) => {
        const future = at(index.get(key), H3);
        return qualifies(future, initial, zoneId, normal) ? [{ bank, future }] : [];
      });
      return {
        selectedFuture: alternatives[0]?.future,
        banks: alternatives.map(row => row.bank),
        conflict: new Set(alternatives.map(row => row.future.waterLevelCm)).size > 1,
      };
    });
    const candidateBanks = banks.map(([bank]) => bank)
      .filter(bank => supports.some(support => support.banks.includes(bank)));
    if (supports.some(support => support.conflict)) return { partId, decision: 'CONFLICTING_SUPPORT', candidateBanks };
    if (supports.some(support => !support.selectedFuture)) return { partId, decision: 'QUALIFIED_SUPPORT_MISSING', candidateBanks };

    // Confirm the isolated comparison with the actual normal route. This
    // creates a fresh in-memory view and never replaces any saved row.
    const possible = new Map(sealedIndex);
    keys.forEach((key, i) => {
      const record = sealedIndex.get(key);
      possible.set(key, { ...record, hourly: record.hourly.map(row =>
        row.time === H3 ? supports[i].selectedFuture : row) });
    });
    const { part, feature, publicHours } = cases.get(partId);
    const result = selectRoute(normal, part, feature, stationRegistry, possible, routing);
    const initial = result.hourly[0];
    if (result.romoWaterTrendObservation?.comparisonUsed !== true
      || !same(keys, initial?.waterLevelProvenance?.sourceKeys)
      || initial.waterLevelCm !== publicHours.get(H0).waterLevelCm) fail('ALTERNATIVE_NORMAL_PREDICATE_MISMATCH');
    return { partId, decision: 'QUALIFIED_SUPPORT_EXISTS', candidateBanks };
  });

  return { kind: 'B374_WATER_SOURCE_SUPPORT_AUDIT_V1', parts };
}
