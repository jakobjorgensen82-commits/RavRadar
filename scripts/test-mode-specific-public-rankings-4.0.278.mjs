import assert from 'node:assert/strict';
import fs from 'node:fs';

import { buildLocalZoneScore, selectLocalBestForDay } from '../js/core/local-zone-score.js';
import { addNationalRanking, compareNationalRankingRows } from '../js/core/zone-ranking.js';
import { compareRavScoreBestTimeCandidates } from '../js/core/best-time-policy.js';

const currentAt = '2026-08-25T12:00:00.000Z';
const laterAt = '2026-08-25T15:00:00.000Z';
const value = (score, winner) => ({
  available: true,
  scoreQuality: 'FULL_HISTORY',
  calibrationEligible: true,
  scoreSemantics: 'EXACT_POINT_SCORE',
  conservativeTailResetApplied: false,
  scoreBounds: {
    lower: score,
    upper: score,
    modelUncertaintyPoints: 0,
    rawLower: score,
    rawUpper: score,
  },
  historyCoverageHours: 48,
  historyReasonCodes: [],
  status: 'whole-zone',
  score,
  winningPartId: winner,
  winningPartName: winner,
  winningPartUncertain: false,
  possibleWinningPartCount: 1,
  possibleWinningParts: [{
    partId: winner,
    name: winner,
    score,
    scoreBounds: {
      lower: score,
      upper: score,
      modelUncertaintyPoints: 0,
      rawLower: score,
      rawUpper: score,
    },
  }],
  comparisonPartCount: 1,
  scoreSpread: 0,
  components: { huntability: score, transport: score, release: score },
  componentReasons: {},
});
const coastalParts = {
  enabled: true,
  generatedAt: currentAt,
  parts: {},
  zones: {
    west: {
      expectedPartCount: 1,
      hourly: [
        { time: currentAt, waders: value(82, 'west-part'), beach: value(42, 'west-part') },
        { time: laterAt, waders: value(48, 'west-part'), beach: value(91, 'west-part') },
      ],
    },
    east: {
      expectedPartCount: 1,
      hourly: [
        { time: currentAt, waders: value(55, 'east-part'), beach: value(76, 'east-part') },
        { time: laterAt, waders: value(93, 'east-part'), beach: value(51, 'east-part') },
      ],
    },
  },
};
const zones = [{ id: 'west' }, { id: 'east' }];
const currentRanking = mode => zones.map(zone => addNationalRanking({
  zone,
  result: buildLocalZoneScore({ coastalParts, zoneId: zone.id, mode, time: currentAt }),
}, [])).sort(compareNationalRankingRows);
const dayRanking = mode => zones.map(zone => addNationalRanking({
  zone,
  result: selectLocalBestForDay({
    coastalParts,
    zoneId: zone.id,
    mode,
    date: currentAt.slice(0, 10),
  }).result,
}, [])).sort(compareNationalRankingRows);

assert.equal(currentRanking('waders')[0].zone.id, 'west');
assert.equal(currentRanking('beach')[0].zone.id, 'east');
assert.equal(dayRanking('waders')[0].zone.id, 'east');
assert.equal(dayRanking('beach')[0].zone.id, 'west');

const qualityResult = (score, scoreQuality) => ({
  available: true,
  score,
  scoreQuality,
  calibrationEligible: scoreQuality === 'FULL_HISTORY',
});
const higherIncompleteRanking = [
  addNationalRanking({ zone:{ id:'incomplete' }, result:qualityResult(81, 'HISTORY_INCOMPLETE') }, []),
  addNationalRanking({ zone:{ id:'full' }, result:qualityResult(80, 'FULL_HISTORY') }, []),
].sort(compareNationalRankingRows);
assert.equal(higherIncompleteRanking[0].zone.id, 'incomplete',
  'national ranking must remain numeric before history quality');
const exactTieRanking = [
  addNationalRanking({ zone:{ id:'incomplete' }, result:qualityResult(80, 'HISTORY_INCOMPLETE') }, []),
  addNationalRanking({ zone:{ id:'full' }, result:qualityResult(80, 'FULL_HISTORY') }, []),
].sort(compareNationalRankingRows);
assert.equal(exactTieRanking[0].zone.id, 'full',
  'FULL_HISTORY may break only an exact national score tie');

const bestTimeCandidates = [
  { hour:{ time:'2026-08-25T13:00:00.000Z' }, result:qualityResult(81, 'HISTORY_INCOMPLETE') },
  { hour:{ time:'2026-08-25T12:00:00.000Z' }, result:qualityResult(80, 'FULL_HISTORY') },
].sort((left,right)=>compareRavScoreBestTimeCandidates(left,right,'beach'));
assert.equal(bestTimeCandidates[0].result.scoreQuality, 'HISTORY_INCOMPLETE',
  'best time must remain numeric before history quality');
const exactBestTimeTie = [
  { hour:{ time:'2026-08-25T12:00:00.000Z' }, result:qualityResult(80, 'HISTORY_INCOMPLETE') },
  { hour:{ time:'2026-08-25T13:00:00.000Z' }, result:qualityResult(80, 'FULL_HISTORY') },
].sort((left,right)=>compareRavScoreBestTimeCandidates(left,right,'beach'));
assert.equal(exactBestTimeTie[0].result.scoreQuality, 'FULL_HISTORY',
  'FULL_HISTORY may break only an exact best-time score tie');
const unavailableCandidate = {
  hour:{ time:'2026-08-25T11:00:00.000Z' },
  result:{ available:false, score:100, scoreQuality:'UNAVAILABLE', calibrationEligible:false },
};
assert.ok(compareRavScoreBestTimeCandidates(unavailableCandidate, exactBestTimeTie[0], 'beach') > 0,
  'UNAVAILABLE must never outrank a numeric score even if malformed input carries a number');

const app = fs.readFileSync('app.js', 'utf8');
assert.match(app, /buildLocalZoneScore\(\{coastalParts:state\.conditions\.coastalParts,zoneId:zone\?\.id,mode:state\.mode/,
  'den aktuelle rangliste skal bruge den valgte jagtform');
assert.match(app, /selectLocalBestForDay\(\{coastalParts:state\.conditions\.coastalParts,zoneId:zone\.id,mode:state\.mode,date\}\)/,
  'femdagesranglisten skal bruge den valgte jagtform');

console.log('Aktuel rangliste og femdagesprognose bruger hver sin waders-/strandscore: OK');
