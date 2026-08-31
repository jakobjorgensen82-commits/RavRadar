import assert from 'node:assert/strict';

import { classifyRavQuestion, askRavRadar } from '../js/services/rav-assistant.js';

const cases = [
  ['hvilket udstyr skal jeg bruge?', 'equipment'],
  ['bedste sted i morgen?', 'best-place'],
  ['bedste tidspunkt i dag?', 'best-time'],
  ['hvorfor denne score?', 'score'],
  ['er det sikkert?', 'safety'],
];
for (const [question, expected] of cases) {
  assert.equal(classifyRavQuestion(question), expected, question);
}

const equipment = await askRavRadar(
  'hvilket udstyr skal jeg bruge?',
  { weather: { windSpeedMps: 7, waveHeightM: 0.8 } },
  { localOnly: true },
);
assert.match(equipment, /polariserede|ravlygte|waders/i);
assert.doesNotMatch(equipment, /Aktuelle RavRadar-data/);

const tomorrow = new Date();
tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
const date = tomorrow.toISOString().slice(0, 10);
const at = hour => `${date}T${String(hour).padStart(2, '0')}:00:00.000Z`;
const exactBounds = score => ({
  lower: score,
  upper: score,
  modelUncertaintyPoints: 0,
  rawLower: score,
  rawUpper: score,
});
const candidateValue = (score, partId) => ({
  available: true,
  score,
  scoreQuality: 'FULL_HISTORY',
  calibrationEligible: true,
  scoreSemantics: 'EXACT_POINT_SCORE',
  conservativeTailResetApplied: false,
  historyCoverageHours: 48,
  historyReasonCodes: [],
  scoreBounds: exactBounds(score),
  status: 'whole-zone',
  comparisonPartCount: 1,
  winningPartId: partId,
  winningPartName: `Kystdel ${partId}`,
  winningPartUncertain: false,
  possibleWinningPartCount: 1,
  possibleWinningParts: [{
    partId,
    name: `Kystdel ${partId}`,
    score,
    scoreBounds: exactBounds(score),
  }],
  components: { huntability: 70, transport: 80, release: 60 },
  componentReasons: {
    huntability: ['Aktuelle søgeforhold'],
    transport: ['Aktuel transport'],
    release: ['Aktuel mobilisering'],
  },
  weather: { windSpeedMps: 4 },
});
const coastalParts = {
  enabled: true,
  generatedAt: at(12),
  zones: {
    zoneHigh: {
      expectedPartCount: 1,
      hourly: [
        { time: at(10), waders: candidateValue(72, 'high') },
        { time: at(12), waders: candidateValue(81, 'high') },
      ],
    },
    zoneLow: {
      expectedPartCount: 1,
      hourly: [{ time: at(11), waders: candidateValue(55, 'low') }],
    },
    zoneUnavailable: {
      expectedPartCount: 1,
      hourly: [{
        time: at(12),
        waders: {
          available: false,
          score: null,
          scoreQuality: 'UNAVAILABLE',
          calibrationEligible: false,
          scoreSemantics: null,
          conservativeTailResetApplied: false,
          historyCoverageHours: null,
          historyReasonCodes: [],
          scoreBounds: null,
          status: 'unavailable',
          reasons: ['Den integrerede RavScore mangler sammenhængende data'],
        },
      }],
    },
  },
  parts: {},
};
const context = {
  mode: 'waders',
  zone: { id: 'zoneHigh', name: 'Zone høj' },
  zones: {
    features: [
      { properties: { id: 'zoneLow', name: 'Zone lav' } },
      { properties: { id: 'zoneUnavailable', name: 'Zone uden data' } },
      { properties: { id: 'zoneHigh', name: 'Zone høj' } },
    ],
  },
  conditions: { coastalParts },
};

const bestPlace = await askRavRadar('bedste sted i morgen?', context, { localOnly: true });
assert.match(bestPlace, /1\. Zone høj – score 81/);
assert.match(bestPlace, /2\. Zone lav – score 55/);
assert.doesNotMatch(bestPlace, /Zone uden data/);

const bestTime = await askRavRadar('bedste tidspunkt i morgen?', context, { localOnly: true });
assert.match(bestTime, /Zone høj/);
assert.match(bestTime, /RavScore 81/);
assert.match(bestTime, /72/);

const noCandidateData = await askRavRadar(
  'bedste sted i morgen?',
  { ...context, conditions: {} },
  { localOnly: true },
);
assert.match(noCandidateData, /ikke nok gyldige prognosedata/i);
assert.doesNotMatch(noCandidateData, /score \d+/i);

const originalFetch = globalThis.fetch;
let remoteCalls = 0;
globalThis.fetch = async () => {
  remoteCalls += 1;
  throw new Error('Fjernassistenten må ikke kaldes, mens dens produktionsflag er slået fra.');
};
try {
  const localByDefault = await askRavRadar('hvilket udstyr skal jeg bruge?', context);
  assert.match(localByDefault, /polariserede|ravlygte|waders/i);
  assert.equal(remoteCalls, 0);
} finally {
  globalThis.fetch = originalFetch;
}

console.log('OK: Spørg RavRadar bruger lokale integrerede scorer, udelader utilgængelige zoner og kalder ikke den deaktiverede fjernassistent.');
