import assert from 'node:assert/strict';
import fs from 'node:fs';
import { analyzeZoneDirections } from './audit-zone-direction-opportunity.mjs';
import {
  addNationalRanking,
  analyzeRankingDirections,
  calculateNationalRanking,
  compareNationalRankingRows,
  displayNationalRankingScore,
  rankingSupportRatio,
} from '../js/core/zone-ranking.js';
import { buildLocalZoneScore, selectLocalBestForDay } from '../js/core/local-zone-score.js';

const partsDocument = JSON.parse(fs.readFileSync('data/live/coastal-parts-v2.json', 'utf8'));
const zones = Object.values(partsDocument.zones || {});
assert.equal(zones.length, 210, 'Rangmodellen skal kontrolleres paa alle 210 zoner.');
assert.equal(zones.flat().length, 673, 'Rangmodellen skal kontrolleres paa alle 673 kystdele.');

for (const parts of zones) {
  const directions = parts.map((part) => part.onshoreDirectionDeg);
  const research = analyzeZoneDirections(directions);
  const production = analyzeRankingDirections(directions);
  assert.ok(production, 'Alle aktive zoner skal have mindst en gyldig retning.');
  assert.equal(production.uniqueDirectionCount, research.uniqueDirectionCount);
  assert.ok(Math.abs(production.meanPositiveAlignment - research.meanPositiveAlignment) < 1e-12, 'Produktion og analyse skal bruge samme retningsmatematik.');
}

const spreadParts = [0, 90, 180, 270].map((onshoreDirectionDeg) => ({ onshoreDirectionDeg }));
const onlyPartResult = { score: 80, localCoverage: { status: 'only-part', comparisonPartCount: 4, parts: [] } };
const onlyPart = calculateNationalRanking(onlyPartResult, spreadParts);
assert.equal(rankingSupportRatio(onlyPartResult, 4), 0.25);
assert.ok(onlyPart.applied && onlyPart.correctionPoints > 0 && onlyPart.correctionPoints < 19);

const severalPartsResult = { score: 80, localCoverage: { status: 'several-parts', comparisonPartCount: 4, parts: [{}, {}] } };
assert.equal(calculateNationalRanking(severalPartsResult, spreadParts).correctionPoints, 0, 'Halvdelen af zonen skal give fuldt stoettevaern.');

const wholeZoneResult = { score: 80, localCoverage: { status: 'whole-zone', comparisonPartCount: 4, parts: spreadParts } };
assert.equal(calculateNationalRanking(wholeZoneResult, spreadParts).correctionPoints, 0, 'En helzonevinder maa ikke korrigeres.');

const sameDirectionParts = [0, 0, 0, 0].map((onshoreDirectionDeg) => ({ onshoreDirectionDeg }));
assert.ok(Math.abs(calculateNationalRanking(onlyPartResult, sameDirectionParts).correctionPoints) < 1e-12, 'Gentagne ens retninger er ikke ekstra lodder.');
assert.equal(calculateNationalRanking({ score: 80, localCoverage: { status: 'only-part', comparisonPartCount: 3 } }, spreadParts).correctionPoints, 0, 'Ufuldstaendig delkontrakt skal falde sikkert tilbage til raascore.');

const rows = [
  addNationalRanking({ zone: { id: 'bred' }, result: onlyPartResult }, spreadParts),
  addNationalRanking({ zone: { id: 'smal' }, result: { score: 75, localCoverage: { status: 'only-part', comparisonPartCount: 1 } } }, [{ onshoreDirectionDeg: 0 }]),
].sort(compareNationalRankingRows);
assert.equal(rows[0].zone.id, 'smal', 'Områdescoren skal fortsat modvirke ekstra lodder fra mange retninger.');
assert.ok(rows[0].rankingDisplayScore>=rows[1].rankingDisplayScore, 'Den viste områdescore skal falde med rangeringen.');
assert.equal(displayNationalRankingScore(-4),0);
assert.equal(displayNationalRankingScore(100.8),100);

const tiedRows = [
  addNationalRanking({ zone: { id: 'bred-lav-stoette' }, result: onlyPartResult }, spreadParts),
  addNationalRanking({ zone: { id: 'smal-fuld-stoette' }, result: { score: 80, localCoverage: { status: 'only-part', comparisonPartCount: 1 } } }, [{ onshoreDirectionDeg: 0 }]),
].sort(compareNationalRankingRows);
assert.equal(tiedRows[0].zone.id, 'smal-fuld-stoette', 'Støttevurderingen skal fortsat afgøre den reelle områdescore.');

const modeSpecificCoastalParts = {
  enabled: true,
  generatedAt: '2026-08-25T09:00:00.000Z',
  parts: {
    'zone-a-part': { current: {} },
    'zone-b-part': { current: {} },
  },
  zones: {
    'zone-a': {
      expectedPartCount: 1,
      currentReferenceAt: '2026-08-25T09:00:00.000Z',
      hourly: [
        {
          time: '2026-08-25T09:00:00.000Z',
          waders: { status: 'whole-zone', score: 90, comparisonPartCount: 1, winningPartId: 'zone-a-part', winningPartName: 'A' },
          beach: { status: 'whole-zone', score: 30, comparisonPartCount: 1, winningPartId: 'zone-a-part', winningPartName: 'A' },
        },
        {
          time: '2026-08-25T10:00:00.000Z',
          waders: { status: 'whole-zone', score: 85, comparisonPartCount: 1, winningPartId: 'zone-a-part', winningPartName: 'A' },
          beach: { status: 'whole-zone', score: 35, comparisonPartCount: 1, winningPartId: 'zone-a-part', winningPartName: 'A' },
        },
      ],
    },
    'zone-b': {
      expectedPartCount: 1,
      currentReferenceAt: '2026-08-25T09:00:00.000Z',
      hourly: [
        {
          time: '2026-08-25T09:00:00.000Z',
          waders: { status: 'whole-zone', score: 40, comparisonPartCount: 1, winningPartId: 'zone-b-part', winningPartName: 'B' },
          beach: { status: 'whole-zone', score: 80, comparisonPartCount: 1, winningPartId: 'zone-b-part', winningPartName: 'B' },
        },
        {
          time: '2026-08-25T10:00:00.000Z',
          waders: { status: 'whole-zone', score: 45, comparisonPartCount: 1, winningPartId: 'zone-b-part', winningPartName: 'B' },
          beach: { status: 'whole-zone', score: 75, comparisonPartCount: 1, winningPartId: 'zone-b-part', winningPartName: 'B' },
        },
      ],
    },
  },
};
const modeSpecificZones = [
  { id: 'zone-a', parts: [{ onshoreDirectionDeg: 0 }] },
  { id: 'zone-b', parts: [{ onshoreDirectionDeg: 0 }] },
];
const currentModeRanking = mode => modeSpecificZones.map(zone => addNationalRanking({
  zone,
  result: buildLocalZoneScore({
    coastalParts: modeSpecificCoastalParts,
    zoneId: zone.id,
    mode,
    time: modeSpecificCoastalParts.zones[zone.id].currentReferenceAt,
  }),
}, zone.parts)).sort(compareNationalRankingRows);
assert.equal(currentModeRanking('waders')[0].zone.id, 'zone-a', 'Den aktuelle wadersliste skal bruge wadersscoren.');
assert.equal(currentModeRanking('beach')[0].zone.id, 'zone-b', 'Den aktuelle strandliste skal bruge strandscoren.');

const dailyModeRanking = mode => modeSpecificZones.map(zone => addNationalRanking({
  zone,
  ...selectLocalBestForDay({
    coastalParts: modeSpecificCoastalParts,
    zoneId: zone.id,
    mode,
    date: '2026-08-25',
  }),
}, zone.parts)).sort(compareNationalRankingRows);
assert.equal(dailyModeRanking('waders')[0].zone.id, 'zone-a', '5-dages waderslisten skal vælge dagens bedste wadersscore.');
assert.equal(dailyModeRanking('beach')[0].zone.id, 'zone-b', '5-dages strandlisten skal vælge dagens bedste strandscore.');

const app = fs.readFileSync('app.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
assert.ok(app.includes('compareNationalRankingRows') && app.includes('addNationalRanking'), 'Begge landslister skal bruge den faelles rangfunktion.');
assert.match(app, /buildLocalZoneScore\(\{coastalParts:state\.conditions\.coastalParts,zoneId:zone\?\.id,mode:state\.mode,time:referenceAt\}\)/, 'Den aktuelle liste skal sende den valgte jagtform til lokal RavScore.');
assert.match(app, /selectLocalBestForDay\(\{coastalParts:state\.conditions\.coastalParts,zoneId:zone\.id,mode:state\.mode,date\}\)/, '5-dages listen skal sende den valgte jagtform til dagens lokale RavScore.');
assert.equal((app.match(/item\.rankingDisplayScore/g)||[]).length>=4,true,'Begge lister skal vise den samme områdescore, som de sorterer efter.');
assert.equal(
  (index.match(/Højeste områdescore står øverst\./g) || []).length,
  2,
  'Begge landslister skal forklare områdescoren med almindeligt brugersprog.',
);

console.log('National broad-support-rangering: 210 zoner / 673 kystdele og UI-kontrakt er groen.');
