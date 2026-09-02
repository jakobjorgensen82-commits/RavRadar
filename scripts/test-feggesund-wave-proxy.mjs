import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {
  FEGGESUND_WAVE_PROXY_POLICY,
  FEGGESUND_WAVE_PROXY_POLICY_SHA256,
  bindVerifiedFeggesundWaveSource,
  buildFeggesundWaveInputProofEntry,
  buildFeggesundWaveProxy,
  verifyCompactFeggesundWaveProxy,
  verifyFeggesundWaveProxy,
} from './lib/feggesund-wave-proxy.mjs';

const TIME = '2026-09-02T12:00:00Z';
const TARGET = 'PART::synthetic-feggesund-part';
const proof = digit => String(digit).repeat(64);
const canonicalValue = value => {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .filter(([, nested]) => nested !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, canonicalValue(nested)]));
  }
  return value;
};
const digest = value => crypto.createHash('sha256')
  .update(JSON.stringify(canonicalValue(value)))
  .digest('hex');
const updateWeatherSource = fs.readFileSync(
  new URL('./update-weather.mjs', import.meta.url),
  'utf8',
);
assert.match(
  updateWeatherSource,
  /\+\s*\(RAVSCORE_PUBLIC_FORECAST_HOURS - 1\) \* 3_600_000;/,
  'Feggesund proof entries must stop at the 118-hour public horizon',
);
assert.match(
  updateWeatherSource,
  /buildFeggesundWaveCoverageProof\(\{\s*forecastStartAt: partForecastStartAt,\s*forecastHours: RAVSCORE_PUBLIC_FORECAST_HOURS,/,
  'Feggesund coverage proof must use the 118-hour public horizon',
);
const source = (parentZoneId, waveHeightM, wavePeriodS, waveDirectionDeg, digit) => ({
  parentZoneId,
  validTime: TIME,
  provider: 'dmi',
  collection: 'wam_dw',
  component: 'wave',
  fallback: false,
  modelRun: '2026-09-02T00:00:00Z',
  waveHeightM,
  wavePeriodS,
  waveDirectionDeg,
  evidenceSha256: proof(digit),
});
const build = (left, right) => buildFeggesundWaveProxy({
  targetEntityId: TARGET,
  time: TIME,
  sources: [right, left],
});

assert.match(FEGGESUND_WAVE_PROXY_POLICY_SHA256, /^[0-9a-f]{64}$/);
assert.equal(FEGGESUND_WAVE_PROXY_POLICY.targetParentZoneId, 'DK-B05-11');
assert.deepEqual(FEGGESUND_WAVE_PROXY_POLICY.sourceParentZoneIds, [
  'DK-B05-10',
  'DK-B05-12',
]);

const wrapSources = [
  source('DK-B05-10', 1, 6, 350, 1),
  source('DK-B05-12', 1, 6, 10, 2),
];
const wrap = build(...wrapSources);
assert.equal(wrap.waveHeightM, 1);
assert.equal(wrap.wavePeriodS, 6);
assert.equal(wrap.waveDirectionDeg, 0,
  '350/10 must use a circular mean at north');
assert.equal(wrap.proxy.disagreementClass, 'LOW');
assert.equal(wrap.proxy.directionResolution, 'CIRCULAR_HS_SQUARED_WEIGHTED');
assert.deepEqual(wrap.proxy.sourceParentZoneIds, ['DK-B05-10', 'DK-B05-12']);
assert.deepEqual(wrap.proxy.sourceWeights, [0.5, 0.5]);
assert.equal(wrap.proxy.calibrationEligible, false);
assert.equal(wrap.proxy.coordinatesIncluded, false);
assert.equal(wrap.proxy.rawSourceValuesIncluded, false);
assert.match(wrap.proxy.sourceEvidenceSha256, /^[0-9a-f]{64}$/);
assert.match(wrap.proxy.sourceProjectionSha256, /^[0-9a-f]{64}$/);
assert.match(wrap.proxy.projectionSha256, /^[0-9a-f]{64}$/);
assert.equal(verifyFeggesundWaveProxy({
  targetEntityId: TARGET,
  time: TIME,
  sources: wrapSources,
  projection: wrap,
}), true);
assert.equal(verifyCompactFeggesundWaveProxy({
  targetEntityId: TARGET,
  time: TIME,
  projection: wrap,
}), true);

const energySources = [
  source('DK-B05-10', 1, 4, 45, 3),
  source('DK-B05-12', 2, 8, 45, 4),
];
const energy = build(...energySources);
assert.ok(Math.abs(energy.waveHeightM - Math.sqrt(2.5)) < 1e-11);
assert.equal(energy.wavePeriodS, 7.2);
assert.ok(Math.abs(
  energy.waveHeightM ** 2 * energy.wavePeriodS
    - ((1 ** 2 * 4 + 2 ** 2 * 8) / 2),
) < 1e-9, 'proxy must preserve the equal mean Hs^2*T driver');

const equalAntipodal = build(
  source('DK-B05-10', 1, 6, 90, 5),
  source('DK-B05-12', 1, 6, 270, 6),
);
assert.equal(equalAntipodal.waveDirectionDeg, 90,
  'equal antipodal energy must use the first approved source id');
assert.equal(equalAntipodal.proxy.disagreementClass, 'HIGH');
assert.equal(equalAntipodal.proxy.directionResolution,
  'ANTIPODAL_ENERGY_DOMINANT_TIEBREAK');

const dominantAntipodal = build(
  source('DK-B05-10', 1, 6, 90, 7),
  source('DK-B05-12', 2, 6, 270, 8),
);
assert.equal(dominantAntipodal.waveDirectionDeg, 270,
  'antipodal direction must follow the Hs^2-dominant source');
assert.equal(dominantAntipodal.proxy.disagreementClass, 'HIGH');

const calmSources = [
  source('DK-B05-10', 0, 4, null, 9),
  source('DK-B05-12', 0, 8, null, 'a'),
];
const calm = build(...calmSources);
assert.equal(calm.waveHeightM, 0);
assert.equal(calm.wavePeriodS, 6);
assert.equal(calm.waveDirectionDeg, null);
assert.equal(calm.proxy.disagreementClass, 'LOW');
assert.equal(calm.proxy.directionResolution, 'CALM_NO_DIRECTION');

const oneCalm = build(
  source('DK-B05-10', 0, 5, null, 'b'),
  source('DK-B05-12', 2, 7, 123, 'c'),
);
assert.equal(oneCalm.waveDirectionDeg, 123);
assert.equal(oneCalm.wavePeriodS, 7);
assert.equal(oneCalm.proxy.disagreementClass, 'HIGH');

const serializedProxy = JSON.stringify(wrap.proxy).toLowerCase();
for (const forbidden of [
  'longitude', 'latitude', 'samplingpoint', 'gridpoint',
  'waveheightm', 'waveperiods', 'wavedirectiondeg',
]) {
  assert.equal(serializedProxy.includes(forbidden), false,
    `compact proxy leaked forbidden source detail: ${forbidden}`);
}

const tamperedTuple = structuredClone(wrap);
tamperedTuple.waveHeightM += 0.01;
assert.equal(verifyFeggesundWaveProxy({
  targetEntityId: TARGET,
  time: TIME,
  sources: wrapSources,
  projection: tamperedTuple,
}), false, 'tuple tampering must invalidate the projection');

const tamperedHash = structuredClone(wrap);
tamperedHash.proxy.projectionSha256 = proof('f');
assert.equal(verifyFeggesundWaveProxy({
  targetEntityId: TARGET,
  time: TIME,
  sources: wrapSources,
  projection: tamperedHash,
}), false, 'hash tampering must invalidate the projection');
assert.equal(verifyCompactFeggesundWaveProxy({
  targetEntityId: TARGET,
  time: TIME,
  projection: tamperedHash,
}), false, 'compact verifier must reject hash tampering');

const directionlessActiveProxy = structuredClone(wrap);
directionlessActiveProxy.waveDirectionDeg = null;
const { projectionSha256: ignoredHash, ...directionlessProxyMetadata } =
  directionlessActiveProxy.proxy;
directionlessActiveProxy.proxy.projectionSha256 = digest({
  tuple: {
    waveHeightM: directionlessActiveProxy.waveHeightM,
    wavePeriodS: directionlessActiveProxy.wavePeriodS,
    waveDirectionDeg: null,
  },
  proxy: directionlessProxyMetadata,
});
assert.equal(verifyCompactFeggesundWaveProxy({
  targetEntityId: TARGET,
  time: TIME,
  projection: directionlessActiveProxy,
}), false, 'compact proxy must reject positive waves without a finite direction');

const completeDirect = buildFeggesundWaveInputProofEntry({
  partId: 'synthetic-feggesund-part',
  time: TIME,
  hour: {
    waveHeightM: 1,
    wavePeriodS: 6,
    waveDirectionDeg: 45,
    waveInputSource: 'DIRECT_OFFICIAL',
    waveInputNoticeId: null,
    waveProvenance: { status: 'verified', provider: 'dmi' },
  },
});
assert.equal(completeDirect.disposition, 'DIRECT');
const exactCalmDirect = buildFeggesundWaveInputProofEntry({
  partId: 'synthetic-feggesund-part',
  time: TIME,
  hour: {
    waveHeightM: 0,
    wavePeriodS: 0,
    waveDirectionDeg: null,
    waveInputSource: 'DIRECT_OFFICIAL',
    waveInputNoticeId: null,
    waveProvenance: { status: 'verified', provider: 'dmi' },
  },
});
assert.equal(exactCalmDirect.disposition, 'DIRECT',
  'verified exact calm remains a physically valid direct DMI tuple');
for (const invalidDirectTuple of [
  { waveHeightM: 1, wavePeriodS: 0, waveDirectionDeg: 45 },
  { waveHeightM: 1, wavePeriodS: 6, waveDirectionDeg: null },
]) {
  assert.throws(() => buildFeggesundWaveInputProofEntry({
    partId: 'synthetic-feggesund-part',
    time: TIME,
    hour: {
      ...invalidDirectTuple,
      waveInputSource: 'DIRECT_OFFICIAL',
      waveInputNoticeId: null,
      waveProvenance: { status: 'verified', provider: 'dmi' },
    },
  }), /inconsistent accepted input/,
  'coverage proof must not classify an incomplete official tuple as DIRECT');
}
for (const invalidProxyTuple of [
  { waveHeightM: 1, wavePeriodS: 0, waveDirectionDeg: 45 },
  { waveHeightM: 1, wavePeriodS: 6, waveDirectionDeg: null },
]) {
  assert.throws(() => buildFeggesundWaveInputProofEntry({
    partId: 'synthetic-feggesund-part',
    time: TIME,
    hour: {
      ...invalidProxyTuple,
      waveInputSource: 'FEGGESUND_TWO_NEIGHBOR_WAVE_INTERPOLATION',
      waveInputNoticeId: 'FEGGESUND_NEIGHBOR_WAVE_PROXY',
      waveProvenance: {
        status: 'verified-derived',
        sourceClass: 'owner-approved-neighbor-wave-proxy',
      },
    },
  }), /inconsistent accepted input/,
  'coverage proof must not accept a proxy tuple rejected by the score adapter');
}

const bound = bindVerifiedFeggesundWaveSource({
  parentZoneId: 'DK-B05-10',
  time: TIME,
  waveHeightM: 1,
  wavePeriodS: 6,
  waveDirectionDeg: 45,
  verifiedDmiSource: {
    provider: 'dmi',
    collection: 'wam_dw',
    component: 'wave',
    fallback: false,
    parentZoneId: 'DK-B05-10',
    modelRun: '2026-09-02T00:00:00Z',
    nativeProof: 'synthetic-private-proof',
  },
});
assert.match(bound.evidenceSha256, /^[0-9a-f]{64}$/);
assert.equal(Object.hasOwn(bound, 'verifiedDmiSource'), false);

assert.throws(() => buildFeggesundWaveProxy({
  targetEntityId: TARGET,
  time: TIME,
  sources: [wrapSources[0]],
}), /exactly two sources/);
assert.throws(() => buildFeggesundWaveProxy({
  targetEntityId: 'PART::outside-exception',
  targetParentZoneId: 'DK-B05-10',
  time: TIME,
  sources: wrapSources,
}), /outside the approved exception/);

console.log('OK: Feggesund wave proxy is bounded, energy-consistent, circular and hash-bound.');
