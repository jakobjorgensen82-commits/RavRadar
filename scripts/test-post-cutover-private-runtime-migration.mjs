import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  POST_CUTOVER_PREDECESSOR,
  allowedChange,
  assertBindingUpgrade,
  migratePostCutoverPrivateRuntime,
} from './migrate-post-cutover-private-runtime.mjs';
import { PRIVATE_RUNTIME_FILES } from './private-production-runtime-workflow.mjs';

assert.equal(POST_CUTOVER_PREDECESSOR.sourceHead, 'fa418f43bbd070c446ed19b6587541b93af89599');
assert.equal(POST_CUTOVER_PREDECESSOR.datasetId, 'rr-20260914180039-210');
assert.equal(POST_CUTOVER_PREDECESSOR.expectedZoneCount, 210);
assert.equal(POST_CUTOVER_PREDECESSOR.expectedPartCount, 673);
assert.equal(PRIVATE_RUNTIME_FILES.length, 9);

const previous = POST_CUTOVER_PREDECESSOR.modelBinding;
const current = { ...previous, modelBundleSha256: 'f'.repeat(64) };
assert.doesNotThrow(() => assertBindingUpgrade(previous, current, 'fixture'));
assert.throws(() => assertBindingUpgrade(previous, { ...current, modelId: 'changed' }, 'fixture'),
  /more than the implementation bundle hash/);
assert.throws(() => assertBindingUpgrade(previous, previous, 'fixture'), /does not require migration/);

for (const pathValue of [
  'coastalParts.modelBinding.modelBundleSha256',
  'coastalParts.parts.part-1.ravScoreModel.modelBundleSha256',
  'coastalParts.parts.part-1.ravScoreModel.currentState.modelBundleSha256',
  'ravScoreCandidateGRollback.sourceModelBinding.modelBundleSha256',
  'ravScoreCandidateGWarmup.runtime.modelBinding.modelBundleSha256',
]) assert.equal(allowedChange(pathValue), true, `Tilladt modelbinding blev afvist: ${pathValue}`);
for (const pathValue of [
  'zones.zone-1.weather.currentSpeedMps',
  'coastalParts.parts.part-1.ravScoreModel.currentState.transportEvidence',
  'ravScoreCandidateGRollback.runtime.parts.part-1',
  'datasetId',
]) assert.equal(allowedChange(pathValue), false, `Privat måle-/statefelt blev tilladt: ${pathValue}`);

await assert.rejects(
  migratePostCutoverPrivateRuntime({ expectedSourceHead: '0'.repeat(40) }),
  /authorized only for the exact predecessor source head/,
);

const source = fs.readFileSync('scripts/migrate-post-cutover-private-runtime.mjs', 'utf8');
for (const marker of [
  'measurementsChanged: false',
  'candidateStatesChanged: false',
  'privatePayloadIncluded: false',
  'Private runtime inventory is not the exact nine-file allowlist',
  'Private runtime migration changed forbidden paths',
]) assert.match(source, new RegExp(marker.replace(/[.*+?^$()|[\]\\]/g, '\\$&')));

console.log('Post-cutover private runtime migration: exact predecessor, binding-only changes, nine-file allowlist and payload-free report.');
