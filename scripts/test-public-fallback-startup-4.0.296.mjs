import assert from 'node:assert/strict';
import {
  buildPublicConditions,
  buildPublicConditionDetails,
  compactJson,
  sha256Text,
} from './public-conditions-lib.mjs';
import { upgradeRecoveryFallbackBundle } from './candidate-g-public-recovery-fallback.mjs';
import { buildLocalZoneScore } from '../js/core/local-zone-score.js';
import { addNationalRanking } from '../js/core/zone-ranking.js';

const dates = ['2026-08-28', '2026-08-29', '2026-08-30', '2026-08-31', '2026-09-01'];
const zones = {};
const coastalZones = {};
const parts = {};
const verbose = 'Diagnostik som kun hører hjemme i behovshentede detaljer. '.repeat(30);
const projectedCoverage = value => {
  const fields = [
    'available','status','score','winningPartId','winningPartName','scoreSpread','comparisonPartCount',
    'validPartCount','expectedPartCount','components','weather',
  ];
  return {
    ...Object.fromEntries(fields.filter(field => value?.[field] !== undefined).map(field => [field,value[field]])),
    ...(Array.isArray(value?.parts) ? {parts:value.parts.map(part => ({partId:part.partId,name:part.name,score:part.score}))} : {}),
  };
};

for (let zoneIndex = 0; zoneIndex < 12; zoneIndex += 1) {
  const zoneId = `zone-${zoneIndex}`;
  const partIds = [`${zoneId}-a`, `${zoneId}-b`, `${zoneId}-c`];
  for (const [partIndex, partId] of partIds.entries()) {
    parts[partId] = {
      id:partId, zoneId, name:`Del ${partIndex + 1}`,
      waterPoint:[10 + zoneIndex / 10, 55 + partIndex / 10],
      landPoint:[10 + zoneIndex / 10, 55.01 + partIndex / 10],
      onshoreDirectionDeg:(zoneIndex * 31 + partIndex * 80) % 360,
      onshoreDirectionSource:'test',
      flowPoints:{
        current:[10 + zoneIndex / 10, 55 + partIndex / 10],
        wind:[10.01 + zoneIndex / 10, 55.01 + partIndex / 10],
        sources:{current:'dmi-marine-grid',wind:'dmi-atmospheric-grid'},
        diagnostic:verbose,
      },
      current:{diagnostic:verbose}, forecast:{diagnostic:verbose}, candidateG:{diagnostic:verbose},
    };
  }
  const hourly = dates.flatMap((date, dayIndex) => [8, 9, 10].map((hour, hourIndex) => {
    const time = `${date}T${String(hour).padStart(2, '0')}:00:00.000Z`;
    const value = modeIndex => {
      const score = 40 + zoneIndex + dayIndex + hourIndex + modeIndex;
      const winningPartId = partIds[modeIndex];
      return {
        available:true,
        status:zoneIndex % 3 === 0 ? 'whole-zone' : zoneIndex % 3 === 1 ? 'only-part' : 'multiple-parts',
        score,
        winningPartId,
        winningPartName:parts[winningPartId].name,
        scoreSpread:zoneIndex % 3 === 0 ? 4 : 12,
        comparisonPartCount:3,
        validPartCount:3,
        expectedPartCount:3,
        components:{huntability:score - 2,transport:score + 1,release:score},
        componentReasons:{huntability:[verbose],transport:[verbose],release:[verbose]},
        explanation:{transportDiagnostics:{diagnostic:verbose}},
        weather:{windSpeedMps:4,waveHeightM:0.7,currentSpeedMps:0.12},
        reasons:[verbose],
        unavailableParts:[{partId:partIds[2],reason:verbose}],
        parts:partIds.map((partId, index) => ({
          partId,
          name:parts[partId].name,
          score:score - index,
          explanation:{diagnostic:verbose},
        })),
      };
    };
    return { time, waders:value(0), beach:value(1) };
  }));
  zones[zoneId] = { forecast:{ hourly:hourly.map(row => ({time:row.time,windSpeedMps:4})) } };
  coastalZones[zoneId] = { expectedPartCount:3, scoredPartCount:3, hourly };
}

const full = {
  datasetId:'fallback-performance-contract',
  generatedAt:'2026-08-28T09:00:00.000Z',
  productionReferenceAt:'2026-08-28T09:00:00.000Z',
  zones,
  coastalParts:{
    schemaVersion:1, enabled:true, expectedPartCount:Object.keys(parts).length,
    scoredPartCount:Object.keys(parts).length, parts, zones:coastalZones,
  },
};

const startup = buildPublicConditions(full);
const details = buildPublicConditionDetails(full);
const legacyZones = Object.fromEntries(Object.entries(coastalZones).map(([zoneId, zone]) => [zoneId, {
  expectedPartCount:zone.expectedPartCount,
  scoredPartCount:zone.scoredPartCount,
  currentReferenceAt:full.productionReferenceAt,
  hourly:[zone.hourly.find(row => row.time === full.productionReferenceAt)],
}]));
const legacyCoastalParts = {
  ...full.coastalParts,
  parts:Object.fromEntries(Object.entries(parts).filter(([partId]) => partId.endsWith('-a') || partId.endsWith('-b'))),
  zones:legacyZones,
};

for (const [zoneId] of Object.entries(coastalZones)) {
  const geometryParts = Object.values(parts).filter(part => part.zoneId === zoneId);
  for (const mode of ['waders', 'beach']) {
    const expected = buildLocalZoneScore({coastalParts:full.coastalParts,zoneId,mode,time:full.productionReferenceAt});
    const actual = buildLocalZoneScore({coastalParts:startup.coastalParts,zoneId,mode,time:full.productionReferenceAt});
    assert.deepEqual({
      available:actual.available, score:actual.score, time:actual.time,
      localPartId:actual.localPartId, localPartName:actual.localPartName,
      components:actual.components, localWeather:actual.localWeather,
      localCoverage:actual.localCoverage,
    }, {
      available:expected.available, score:expected.score, time:expected.time,
      localPartId:expected.localPartId, localPartName:expected.localPartName,
      components:expected.components, localWeather:expected.localWeather,
      localCoverage:projectedCoverage(expected.localCoverage),
    }, `${zoneId}/${mode}: den kompakte aktuelle score afviger`);
    assert.equal(
      addNationalRanking({result:actual},geometryParts).rankingDisplayScore,
      addNationalRanking({result:expected},geometryParts).rankingDisplayScore,
      `${zoneId}/${mode}: den nationale aktuelle rangering afviger`,
    );
  }
}

const startupCoastalText = compactJson(startup.coastalParts);
const collectKeys = (value, keys = new Set()) => {
  if (!value || typeof value !== 'object') return keys;
  for (const [key, nested] of Object.entries(value)) {
    keys.add(key);
    collectKeys(nested, keys);
  }
  return keys;
};
const startupCoastalKeys = collectKeys(startup.coastalParts);
for (const forbidden of ['componentReasons','explanation','transportDiagnostics','unavailableParts','reasons','candidateG','forecast','diagnostic']) {
  assert.ok(!startupCoastalKeys.has(forbidden), `Opstartsprojektionen indeholder fortsat ${forbidden}.`);
}
for (const winner of Object.values(startup.coastalParts.parts)) {
  assert.deepEqual(Object.keys(winner).sort(), [
    'flowPoints','id','landPoint','name','onshoreDirectionDeg','onshoreDirectionSource','waterPoint','zoneId',
  ]);
  assert.deepEqual(Object.keys(winner.flowPoints).sort(), ['current','sources','wind']);
  assert.equal(winner.flowPoints.sources.current, 'dmi-marine-grid');
}

const legacyConditions = {...startup, coastalParts:legacyCoastalParts};
const detailsHashBefore = sha256Text(compactJson(details));
const upgraded = upgradeRecoveryFallbackBundle({
  descriptor:{
    datasetId:full.datasetId,
    generatedAt:full.generatedAt,
    publicConditionsSha256:sha256Text(compactJson(legacyConditions)),
    publicConditionDetailsSha256:detailsHashBefore,
  },
  conditions:legacyConditions,
  details,
});
assert.strictEqual(upgraded.details, details, 'Recovery-opgraderingen må ikke erstatte detaljepakken.');
assert.equal(sha256Text(compactJson(upgraded.details)), detailsHashBefore, 'Detaljepakkens hash blev ændret.');
assert.equal(upgraded.conditions.datasetId, full.datasetId);
assert.equal(upgraded.conditions.generatedAt, full.generatedAt);
assert.equal(upgraded.conditions.productionReferenceAt, full.productionReferenceAt);
assert.equal(upgraded.descriptor.publicConditionsSha256, sha256Text(compactJson(upgraded.conditions)));
assert.equal(upgraded.descriptor.publicConditionDetailsSha256, detailsHashBefore);

const legacyBytes = Buffer.byteLength(compactJson(legacyConditions));
const upgradedBytes = Buffer.byteLength(compactJson(upgraded.conditions));
assert.ok(upgradedBytes < legacyBytes * 0.25, `Recovery-startpakken er ikke reduceret nok: ${legacyBytes} -> ${upgradedBytes}.`);
assert.ok(upgradedBytes < 250_000, `Den syntetiske recovery-startpakke er for stor: ${upgradedBytes}.`);

console.log(`Public fallback startup 4.0.296: score-/rankingparitet, uændrede detaljer og ${legacyBytes} -> ${upgradedBytes} byte består.`);
