import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { buildPublicConditions, buildPublicConditionDetails, compactJson } from './public-conditions-lib.mjs';
import { selectLocalBestForDay } from '../js/core/local-zone-score.js';
import { addNationalRanking, compareNationalRankingRows } from '../js/core/zone-ranking.js';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { ravScoreVerifiedEvidenceTrust } from '../js/core/ravscore-evidence-trust-contract.js';
import { resolvePublicRavScoreProfile } from '../js/core/ravscore-public-model.js';

const dates = ['2026-08-28', '2026-08-29', '2026-08-30', '2026-08-31', '2026-09-01'];
const zoneCount = 6;
const zones = {};
const coastalZones = {};
const parts = {};
const modelBinding = ravScoreModelBinding();
const evidenceTrust = ravScoreVerifiedEvidenceTrust();
const fullHistoryQuality = score => ({
  scoreQuality:'FULL_HISTORY',
  calibrationEligible:true,
  scoreSemantics:'EXACT_POINT_SCORE',
  conservativeTailResetApplied:false,
  scoreBounds:{lower:score,upper:score,modelUncertaintyPoints:0,rawLower:score,rawUpper:score},
  historyCoverageHours:48,
  historyReasonCodes:[],
});
const scoreProfile = resolvePublicRavScoreProfile({
  modelCoverageReady: true,
  modelMemoryReady: true,
  modelMigrationReady: true,
});

for (let zoneIndex = 0; zoneIndex < zoneCount; zoneIndex += 1) {
  const zoneId = `zone-${zoneIndex}`;
  const firstPartId = `${zoneId}-a`;
  const secondPartId = `${zoneId}-b`;
  parts[firstPartId] = { zoneId, name:firstPartId, onshoreDirectionDeg:(zoneIndex * 37) % 360 };
  parts[secondPartId] = { zoneId, name:secondPartId, onshoreDirectionDeg:(zoneIndex * 37 + 120) % 360 };
  const hourly = dates.flatMap((date, dayIndex) => [0, 1, 2].map(hourIndex => {
    const time = `${date}T${String(8 + hourIndex).padStart(2, '0')}:00:00.000Z`;
    const value = (modeIndex) => {
      const score = 30 + zoneIndex * 5 + dayIndex + hourIndex * 4 + modeIndex;
      const quality = fullHistoryQuality(score);
      return {
        available:true,status:'only-part',score,...quality,
        modelBinding,scoreProfileId:modelBinding.modelId,
        winningPartId:firstPartId,winningPartName:firstPartId,
        winningPartUncertain:false,possibleWinningPartCount:1,
        possibleWinningParts:[{partId:firstPartId,name:firstPartId,score,scoreBounds:{...quality.scoreBounds}}],
        scoreSpread:12,comparisonPartCount:2,
        components:{huntability:score,transport:score,release:score},
        componentReasons:{huntability:['test'],transport:['test'],release:['test']},
        explanation:{...modelBinding,weights:{huntability:.2,transport:.5,release:.3}},
        weather:{windSpeedMps:4},
        parts:[{partId:firstPartId,name:firstPartId,score,
          scoreQuality:quality.scoreQuality,scoreBounds:{...quality.scoreBounds},
          historyCoverageHours:quality.historyCoverageHours,historyReasonCodes:[]}],
      };
    };
    return { time, waders:value(0), beach:value(1) };
  }));
  zones[zoneId] = { forecast:{ hourly:hourly.map(row => ({time:row.time,windSpeedMps:4})) } };
  coastalZones[zoneId] = { expectedPartCount:2, scoredPartCount:2, hourly };
}

const full = {
  datasetId:'performance-contract',
  generatedAt:'2026-08-28T07:00:00.000Z',
  productionReferenceAt:'2026-08-28T07:00:00.000Z',
  zones,
  coastalParts:{
    schemaVersion:2,enabled:true,modelBinding,scoreProfile,evidenceTrust,
    scoreAvailability:{schemaVersion:2,policy:'integrated-model-local-fail-closed',
      allZonesActive:true,activeZoneCount:zoneCount,unavailableZoneCount:0,totalZoneCount:zoneCount,
      allCurrentScoresFullHistory:true,fullHistoryModeCount:zoneCount*2,
      historyIncompleteModeCount:0,historyIncompleteZoneCount:0,
      evaluatedAt:'2026-08-28T07:00:00.000Z',unavailableZones:[],historyIncompleteZones:[]},
    expectedPartCount:zoneCount*2,scoredPartCount:zoneCount*2,parts,zones:coastalZones,
  },
};

const startup = buildPublicConditions(full);
const details = buildPublicConditionDetails(full);
assert.equal(startup.nationalForecast.schemaVersion, 2);
assert.deepEqual(startup.nationalForecast.dates, dates);

for (const mode of ['waders', 'beach']) {
  const actualDays = startup.nationalForecast.modes[mode];
  assert.equal(actualDays.length, 5);
  for (const day of actualDays) {
    const expected = Object.keys(zones).flatMap(zoneId => {
      const best = selectLocalBestForDay({coastalParts:full.coastalParts,zoneId,mode,date:day.date,now:0});
      return best ? [addNationalRanking({zoneId,time:best.hour.time,result:best.result}, Object.values(parts).filter(part=>part.zoneId===zoneId))] : [];
    }).sort(compareNationalRankingRows).slice(0,5).map(row => ({
      zoneId:row.zoneId,
      time:row.time,
      score:row.result.score,
      scoreBounds:{...row.result.scoreBounds},
      rankingScore:row.rankingScore,
      rankingDisplayScore:row.rankingDisplayScore,
      scoreQuality:row.result.scoreQuality,
      calibrationEligible:row.result.calibrationEligible,
      scoreSemantics:row.result.scoreSemantics,
      conservativeTailResetApplied:row.result.conservativeTailResetApplied,
      historyCoverageHours:row.result.historyCoverageHours,
      historyReasonCodes:[...row.result.historyReasonCodes],
    }));
    assert.deepEqual(day.rows, expected, `${mode}/${day.date}: kompakt og fuld beregning afviger`);
  }
}

const nationalText = JSON.stringify(startup.nationalForecast);
const nationalBytes = Buffer.byteLength(nationalText);
const nationalGzipBytes = gzipSync(nationalText, { level: 9 }).byteLength;
assert.ok(nationalBytes < 24_000,
  `Det schema-6-kvalitetsbundne nationale femdøgnsindeks er ikke længere kompakt (${nationalBytes} bytes).`);
assert.ok(nationalGzipBytes < 2_000,
  `Det komprimerede nationale femdøgnsindeks er ikke længere kompakt (${nationalGzipBytes} bytes).`);
assert.ok(nationalBytes < Buffer.byteLength(compactJson(details)), 'Indekset reducerer ikke opstartspayloaden.');
for (const forbidden of ['"waterPoint"','"landPoint"','"componentReasons"','"explanation"','"onshoreDirectionDeg"']) {
  assert.ok(!nationalText.includes(forbidden), `Det kompakte indeks lækker unødvendigt felt: ${forbidden}`);
}

const [app, serviceWorker, dataService] = await Promise.all([
  fs.readFile('app.js', 'utf8'),
  fs.readFile('service-worker.js', 'utf8'),
  fs.readFile('js/services/data-service.js', 'utf8'),
]);
assert.match(app,/state\.conditions\?\.nationalForecast\?\.modes\?\.\[state\.mode\]/);
assert.match(app,/function ensureConditionDetails\(\)/);
assert.match(app,/detailsRequired:\(\)=>conditionDetailsPromise!==null/);
assert.match(app,/map\.getZoom\(\)>=9/);
const startupBlock = app.slice(app.indexOf("renderRanking();performance.mark?.('ravradar:ranking-ready')"), app.indexOf('// Vind- og strømpile'));
assert.ok(!startupBlock.includes('loadConditionDetails('), 'Normal opstart henter stadig detaljepakken.');
assert.match(serviceWorker,/isContentAddressedLiveData/);
assert.match(serviceWorker,/force-cache/);
assert.match(serviceWorker,/no-store/);
assert.match(dataService,/params\.set\('sha'/);
assert.match(dataService,/contentAddressedCache/);

console.log('Public load performance 4.0.295: kompakt top-5-paritet, behovsstyrede detaljer og SHA-cache består.');
