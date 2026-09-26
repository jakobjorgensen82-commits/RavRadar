// A native, point-bound DMI water-level row for the routing regression tests.
// Keep the proof shape in sync with verifiedDmiNativeSource rather than letting
// value-only fixtures silently exercise an unverified path.
export function dmiWaterSourceFixture(source, time, valueCm, generatedAt) {
  const sourceId = `SOURCE::${source.sourceKey}`;
  const point = [...source.point];
  return {
    time,
    'sea-mean-deviation': valueCm === null ? null : valueCm / 100,
    sources: {
      waterLevel: {
        provider: 'dmi',
        fallback: false,
        collection: 'dkss_idw',
        collectionFamily: 'marine',
        component: 'waterLevel',
        componentKind: 'marine-water-level-scalar',
        fieldSet: ['sea-mean-deviation'],
        optionalFieldSet: [],
        modelRun: generatedAt,
        nativeValidTime: time,
        leadTimeHours: (Date.parse(time) - Date.parse(generatedAt)) / 3_600_000,
        entityId: sourceId,
        parentZoneId: sourceId,
        entityType: 'water-level-source',
        samplingContext: 'water-level-source-point',
        samplingPoint: point,
        gridPoint: [...point],
        gridDefinitionSha256: 'a'.repeat(64),
        distanceKm: 0,
        spatialSelection: 'nearest-valid-grid-cell-no-spatial-interpolation',
        spatialSemanticsVersion: 1,
        itemId: `fixture-${source.stationId}-${time}`,
        assetIdentitySha256: 'b'.repeat(64),
        acquiredAt: generatedAt,
      },
    },
  };
}
