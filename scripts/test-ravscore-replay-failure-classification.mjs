#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  stateReplayFailureKind,
  waveApproachContinuationFailureKind,
} from './audit-ravscore-integrated-public-runtime.mjs';
import {
  RAVSCORE_WAVE_APPROACH_POLICY,
  RAVSCORE_WAVE_APPROACH_STATE_SCHEMA_VERSION,
} from '../js/core/ravscore-wave-approach-state.js';

const validWaveApproachState = {
  schemaVersion: RAVSCORE_WAVE_APPROACH_STATE_SCHEMA_VERSION,
  policyId: RAVSCORE_WAVE_APPROACH_POLICY.id,
  time: '2026-09-18T12:00:00.000Z',
  waveReferenceAt: '2026-09-18T12:00:00.000Z',
  waveActivityMoment: 0.5,
  waveNormalMoment: 0.5,
  waveTangentMoment: 0,
  latestWaveEnergyWeight: 0.5,
  latestWaveNormalAlignment: 1,
  latestWaveTangentAlignment: 0,
  readiness: true,
  status: 'READY',
};

assert.equal(waveApproachContinuationFailureKind(validWaveApproachState),
  'LAST_MILE_CONTINUATION_OTHER');
for (const [mutation, expected] of [
  [{ schemaVersion: 0 }, 'LAST_MILE_CONTINUATION_SCHEMA'],
  [{ time: '2026-09-18T12:00:00Z' }, 'LAST_MILE_CONTINUATION_TIME'],
  [{ waveNormalMoment: 0.8 }, 'LAST_MILE_CONTINUATION_MOMENTS'],
  [{ readiness: false }, 'LAST_MILE_CONTINUATION_READINESS'],
  [{ waveReferenceAt: '2026-09-18T11:00:00.000Z' },
    'LAST_MILE_CONTINUATION_REFERENCE'],
  [{ latestWaveNormalAlignment: 0.5 },
    'LAST_MILE_CONTINUATION_LATEST_VECTOR'],
]) {
  const state = { ...validWaveApproachState, ...mutation };
  assert.equal(waveApproachContinuationFailureKind(state), expected);
  assert.equal(stateReplayFailureKind(
    new Error('Wave-approach continuation is internally inconsistent'),
    { waveApproachState: state },
  ), expected);
}

for (const [message, expected] of [
  ['Integrated RavScore wave-approach state is not bound to parent time',
    'LAST_MILE_PARENT_TIME'],
  ['Wave-approach continuation has an incompatible exact schema',
    'LAST_MILE_CONTINUATION_SCHEMA'],
  ['Integrated RavScore last-mile point lies outside its history bounds',
    'LAST_MILE_HISTORY_POINT'],
  ['Integrated RavScore exact last-mile history must have collapsed tracks',
    'LAST_MILE_HISTORY_BOUNDS'],
  ['Integrated RavScore wave-approach fallback failed', 'LAST_MILE_STATE'],
]) {
  assert.equal(stateReplayFailureKind(new Error(message)), expected, message);
}

console.log('RavScore replay failure classification tests: passed');
