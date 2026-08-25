import assert from 'node:assert/strict';
import fs from 'node:fs';

import { buildLocalZoneScore, selectLocalBestForDay } from '../js/core/local-zone-score.js';
import { addNationalRanking, compareNationalRankingRows } from '../js/core/zone-ranking.js';

const currentAt = '2026-08-25T12:00:00.000Z';
const laterAt = '2026-08-25T15:00:00.000Z';
const value = (score, winner) => ({
  available: true,
  status: 'whole-zone',
  score,
  winningPartId: winner,
  winningPartName: winner,
  comparisonPartCount: 1,
  scoreSpread: 0,
  components: {},
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

const app = fs.readFileSync('app.js', 'utf8');
assert.match(app, /buildLocalZoneScore\(\{coastalParts:state\.conditions\.coastalParts,zoneId:zone\?\.id,mode:state\.mode/,
  'den aktuelle rangliste skal bruge den valgte jagtform');
assert.match(app, /selectLocalBestForDay\(\{coastalParts:state\.conditions\.coastalParts,zoneId:zone\.id,mode:state\.mode,date\}\)/,
  'femdagesranglisten skal bruge den valgte jagtform');

console.log('Aktuel rangliste og femdagesprognose bruger hver sin waders-/strandscore: OK');
