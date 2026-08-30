import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import {
  buildPublicManifest,
  buildPublicConditions,
  buildPublicConditionDetails,
  compactJson,
  sha256Text,
} from './public-conditions-lib.mjs';
import { buildLocalZoneScore } from '../js/core/local-zone-score.js';
import { addNationalRanking } from '../js/core/zone-ranking.js';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { ravScoreVerifiedEvidenceTrust } from '../js/core/ravscore-evidence-trust-contract.js';
import { resolvePublicRavScoreProfile } from '../js/core/ravscore-public-model.js';

const productionReferenceAt = '2026-08-28T09:00:00.000Z';
const horizonTimes = Array.from({ length: 118 }, (_, index) =>
  new Date(Date.parse(productionReferenceAt) + index * 3_600_000).toISOString());
const zoneCount = 210;
const coastalPartCount = 673;
const modelBinding = ravScoreModelBinding();
const scoreProfile = resolvePublicRavScoreProfile({
  modelCoverageReady:true,
  modelMemoryReady:true,
  modelMigrationReady:true,
});
const zones = {};
const coastalZones = {};
const parts = {};
const verbose = 'Diagnostik som kun hører hjemme i behovshentede detaljer.';
const fullHistoryQuality = score => ({
  scoreQuality:'FULL_HISTORY',
  calibrationEligible:true,
  scoreSemantics:'EXACT_POINT_SCORE',
  conservativeTailResetApplied:false,
  scoreBounds:{lower:score,upper:score,modelUncertaintyPoints:0,rawLower:score,rawUpper:score},
  historyCoverageHours:48,
  historyReasonCodes:[],
});
const projectedCoverage = value => {
  const fields = [
    'available','status','score','winningPartId','winningPartName','scoreSpread','comparisonPartCount',
    'validPartCount','expectedPartCount','scoreQuality','calibrationEligible','scoreSemantics',
    'conservativeTailResetApplied','historyCoverageHours','historyReasonCodes','scoreBounds',
    'winningPartUncertain','possibleWinningPartCount','possibleWinningParts','components','weather',
  ];
  return {
    ...Object.fromEntries(fields.filter(field => value?.[field] !== undefined).map(field => [field,value[field]])),
    scoreProfileId:modelBinding.modelId,
    modelBinding,
    ...(Array.isArray(value?.parts) ? {parts:value.parts.map(part => ({
      partId:part.partId,name:part.name,score:part.score,
      scoreQuality:part.scoreQuality,scoreBounds:{...part.scoreBounds},
      historyCoverageHours:part.historyCoverageHours,
      historyReasonCodes:[...part.historyReasonCodes],
    }))} : {}),
  };
};

for (let zoneIndex = 0; zoneIndex < zoneCount; zoneIndex += 1) {
  const zoneId = `zone-${zoneIndex}`;
  const zonePartCount = zoneIndex < 43 ? 4 : 3;
  const partIds = Array.from({ length: zonePartCount }, (_, index) => `${zoneId}-${index}`);
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
  const hourly = horizonTimes.map((time, hourIndex) => {
    const value = modeIndex => {
      const score = 40 + (zoneIndex % 20) + (hourIndex % 15) + modeIndex;
      const winningPartId = partIds[modeIndex];
      const quality = fullHistoryQuality(score);
      return {
        available:true,
        modelBinding,
        status:zoneIndex % 3 === 0 ? 'whole-zone' : zoneIndex % 3 === 1 ? 'only-part' : 'multiple-parts',
        score,
        ...quality,
        winningPartId,
        winningPartName:parts[winningPartId].name,
        winningPartUncertain:false,
        possibleWinningPartCount:1,
        possibleWinningParts:[{
          partId:winningPartId,name:parts[winningPartId].name,score,
          scoreBounds:{...quality.scoreBounds},
        }],
        scoreSpread:zoneIndex % 3 === 0 ? 4 : 12,
        comparisonPartCount:zonePartCount,
        validPartCount:zonePartCount,
        expectedPartCount:zonePartCount,
        components:{huntability:score - 2,transport:score + 1,release:score},
        componentReasons:{huntability:[verbose],transport:[verbose],release:[verbose]},
        explanation:{...modelBinding,transportDiagnostics:{diagnostic:verbose}},
        weather:{windSpeedMps:4,waveHeightM:0.7,currentSpeedMps:0.12},
        reasons:[verbose],
        unavailableParts:[{partId:partIds[2],reason:verbose}],
        parts:partIds.map((partId, index) => ({
          partId,
          name:parts[partId].name,
          score:score - Math.abs(index - modeIndex),
          ...fullHistoryQuality(score - Math.abs(index - modeIndex)),
          explanation:{diagnostic:verbose},
        })),
      };
    };
    return { time, waders:value(0), beach:value(1) };
  });
  zones[zoneId] = { forecast:{ hourly:hourly.map(row => ({time:row.time,windSpeedMps:4})) } };
  coastalZones[zoneId] = {
    expectedPartCount:zonePartCount,
    scoredPartCount:zonePartCount,
    hourly,
  };
}
assert.equal(Object.keys(parts).length, coastalPartCount,
  'The startup fixture must close the exact national 673-part package.');

const full = {
  datasetId:'fallback-performance-contract',
  generatedAt:productionReferenceAt,
  productionReferenceAt,
  zones,
  coastalParts:{
    schemaVersion:2, enabled:true, modelBinding,
    evidenceTrust:ravScoreVerifiedEvidenceTrust(), scoreProfile,
    scoreAvailability:{schemaVersion:2,policy:'integrated-model-local-fail-closed',
      allZonesActive:true,activeZoneCount:zoneCount,unavailableZoneCount:0,totalZoneCount:zoneCount,
      allCurrentScoresFullHistory:true,fullHistoryModeCount:zoneCount*2,
      historyIncompleteModeCount:0,historyIncompleteZoneCount:0,
      evaluatedAt:productionReferenceAt,unavailableZones:[],historyIncompleteZones:[]},
    expectedPartCount:Object.keys(parts).length,
    scoredPartCount:Object.keys(parts).length, parts, zones:coastalZones,
  },
};

const startup = buildPublicConditions(full);
const details = buildPublicConditionDetails(full);

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
    'flowPoints','id','landPoint','name','onshoreDirectionDeg','onshoreDirectionSource',
    'ravScoreEvidenceTrust','waterPoint','zoneId',
  ]);
  assert.deepEqual(Object.keys(winner.flowPoints).sort(), ['current','sources','wind']);
  assert.equal(winner.flowPoints.sources.current, 'dmi-marine-grid');
}

const startupText = compactJson(startup);
const detailsText = compactJson(details);
const coastalPartsText = compactJson(full.coastalParts);
const zoneRegistryText = compactJson({
  type: 'FeatureCollection',
  features: Object.keys(full.zones).map(id => ({
    type: 'Feature', properties: { id, zoneStatus: 'active' }, geometry: null,
  })),
});
const manifest = buildPublicManifest(full, startupText, detailsText, coastalPartsText, zoneRegistryText);
assert.equal(manifest.schemaVersion, 4);
assert.equal(manifest.complete, true);
assert.equal(manifest.recoveryFallback, undefined);
assert.equal(manifest.ravScoreRuntime.modelBinding.modelId, modelBinding.modelId);
assert.equal(manifest.ravScoreRuntime.startup.fileSha256, sha256Text(startupText));
assert.equal(manifest.ravScoreRuntime.details.fileSha256, sha256Text(detailsText));
assert.equal(startup.ravScoreRuntime.datasetId, details.ravScoreRuntime.datasetId);
assert.equal(startup.ravScoreRuntime.productionReferenceAt, details.ravScoreRuntime.productionReferenceAt);
assert.deepEqual(startup.ravScoreRuntime.modelBinding, details.ravScoreRuntime.modelBinding);

const fullBytes = Buffer.byteLength(compactJson(full));
const startupBytes = Buffer.byteLength(startupText);
const startupGzipBytes = gzipSync(startupText, { level: 9 }).byteLength;
assert.ok(startupBytes < fullBytes * 0.25, `Den atomiske startpakke er ikke reduceret nok: ${fullBytes} -> ${startupBytes}.`);
// VERIFIED_ONLY trust is intentionally repeated on every selectable winner so
// account/trip evidence cannot inherit an unbound aggregate trust marker. Keep
// the synthetic national upper bound explicit without removing that binding.
// Schema 6 also binds exact quality/bounds to every current mode and compact
// comparison row; 1.5 MB leaves about 13 % headroom over the 1,330,623-byte
// national fixture while still failing on material startup-payload growth.
assert.ok(startupBytes < 1_500_000,
  `Den fulde 210/673 syntetiske atomiske startpakke er for stor: ${startupBytes}.`);
assert.ok(startupGzipBytes < 50_000,
  `Den komprimerede 210/673-startpakke er for stor: ${startupGzipBytes}.`);

console.log(`Public schema-4 startup: score-/rankingparitet, fælles modelbinding og ${fullBytes} -> ${startupBytes} byte består.`);
