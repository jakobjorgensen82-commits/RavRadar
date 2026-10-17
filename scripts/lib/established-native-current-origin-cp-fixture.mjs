// PRIVATE preparation only. No origin issuer, product replacement or test run.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const OLD_FACTORY_LF = '968ad80f7b5e7768ff25f3de7c9386f6b39852d022240d8773be59d8f6e9b753';
const FROZEN_INPUT_CHANGES = [
  ['function replayReserveCurrent(provider, { speed = 0.14, modelRun = null } = {}) {',
    'function replayReserveCurrent(provider, { speed = 0.14, modelRun = null, hour = 2 } = {}) {'],
  ['  const row = withoutWave(weather(2, { speed }));',
    '  const row = withoutWave(weather(hour, { speed }));'],
  ['    ? { ...controlledLiveWeather(2).currentProvenance, uMps: speed }',
    '    ? { ...controlledLiveWeather(hour).currentProvenance, uMps: speed }'],
];

export async function normalCpFollowerInputs(repositoryRoot, {
  part: requestedPart = null, zone: requestedZone = null,
} = {}) {
  const whole = (await fs.readFile(path.join(repositoryRoot,
    'scripts/test-ravscore-recovery-replay.mjs'), 'utf8')).replaceAll('\r\n', '\n');
  const start = whole.indexOf('const HOUR_MS =');
  const end = whole.indexOf('function withoutWaveDirectionAttestation(');
  assert(start >= 0 && end > start);
  const originalFactory = whole.slice(start, end);
  assert.equal(sha(originalFactory), OLD_FACTORY_LF,
    'The complete existing normal factory must be the frozen genuine d7/48 source.');
  const changes = [...FROZEN_INPUT_CHANGES];
  if (requestedPart !== null || requestedZone !== null) {
    assert(requestedPart && requestedZone);
    const partStart = originalFactory.indexOf('const part = {');
    const partEnd = originalFactory.indexOf('const vectorSelection =');
    assert(partStart >= 0 && partEnd > partStart);
    // Only the test's input declarations vary per central part. The same
    // normal provenance constructor recomputes that actual part's identity.
    changes.push([originalFactory.slice(partStart, partEnd),
      'const part = fixturePart;\nconst zone = fixtureZone;\n']);
  }
  let factory = originalFactory;
  for (const [before, after] of changes) {
    assert.equal(factory.split(before).length, 2);
    factory = factory.replace(before, after);
  }
  let inverse = factory;
  for (const [before, after] of [...changes].reverse()) {
    assert.equal(inverse.split(after).length, 2);
    inverse = inverse.replace(after, before);
  }
  assert.equal(inverse, originalFactory, 'Whole normal factory inverse, not a weakened reader.');
  const live = await import(pathToFileURL(path.join(repositoryRoot,
    'scripts/lib/live-current-pilot.mjs')).href);
  const normal = new Function('assert', 'crypto', 'copernicusLiveRecordProjectionSha256',
    'openMeteoLiveRecordProjectionSha256', 'fixturePart', 'fixtureZone', factory
      + '\nreturn {replayReserveCurrent,weather,withoutCurrent,part,zone,time};')(
    assert, crypto, live.copernicusLiveRecordProjectionSha256,
    live.openMeteoLiveRecordProjectionSha256, requestedPart, requestedZone);
  const { replayReserveCurrent, weather, withoutCurrent, part, zone, time } = normal;
  const current = (hour, speed = 0.09, modelRun = time(-72)) => ({
    ...weather(hour, { speed }),
    currentProvenance: replayReserveCurrent('copernicus', { hour, speed, modelRun }).currentProvenance,
  });
  const missing = new Set([-48, -47, -46, -14, 5, 18, 31, 44]);
  const originals = Array.from({ length: 100 }, (_, i) => {
    const hour = i - 48, row = current(hour);
    return missing.has(hour) ? withoutCurrent(row) : row;
  });
  const historicalRevision = originals.map(row => row.time === time(-4)
    ? current(-4, 0.12, time(-60)) : row);
  const originalsSnapshot = JSON.stringify(originals);
  const revisionSnapshot = JSON.stringify(historicalRevision);
  if (requestedPart === null) {
    assert.equal(sha(originalsSnapshot), '8fb46a6080bdfc4ceab0532cf0bc87a936d1d12572c70283bb7bf7a44f794b2b');
    assert.equal(sha(revisionSnapshot), 'b62ecc42f79eaf28a60025230c922ef5b358291e6acad7288ebe7e1584b85177');
  }
  return {
    part, zone, time, current, withoutCurrent, originals, historicalRevision,
    references: [0, 19, 32, 51], jumps: [19, 13, 19],
    source: (hourly, source = 'deployed-private-runtime') => ({
      source, record: { point: part.waterPoint, hourly },
    }),
    assertInputsUnchanged() {
      assert.equal(JSON.stringify(originals), originalsSnapshot);
      assert.equal(JSON.stringify(historicalRevision), revisionSnapshot);
    },
    factoryProof: {
      beforeSha256: OLD_FACTORY_LF, afterSha256: sha(factory), wholeInverse: true,
      inputChanges: changes, productBodiesReplaced: false, opaqueScopeMinted: false,
    },
  };
}
