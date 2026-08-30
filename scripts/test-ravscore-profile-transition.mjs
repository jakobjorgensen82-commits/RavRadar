import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  assertIntegratedRavScoreSelection,
  isCandidateGOnlySelection,
  ravScoreProfileWriteAction,
  withExpectedAdminVersion,
} from './lib/ravscore-profile-transition.mjs';

const integrated = JSON.parse(await fs.readFile(
  new URL('../data/admin/ravscore-profile-selection.json', import.meta.url),
  'utf8',
));
assertIntegratedRavScoreSelection(integrated);

const candidateG = {
  schemaVersion: '2.0.0',
  sourceVersion: '4.0.307',
  switchVersion: 'RAVSCORE-PROFILE-SWITCH-4.0.307',
  requestedProfileId: 'RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3',
  candidateProfileId: 'RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3',
  rollbackProfileId: null,
  candidateActivationEnabled: true,
  prePublicWarmupAccepted: true,
  automaticActivationAllowed: false,
  publicAvailabilityPolicy: 'candidate-g-local-fail-closed',
  legacyPublicFallbackAllowed: false,
  status: 'owner-approved-candidate-g-only-local-fail-closed',
  activationAuthority: 'DEC-0072',
  evidence: { freshFinalShadowRunId: null, ownerReviewDecisionId: 'DEC-0072' },
};
assert.equal(isCandidateGOnlySelection(candidateG), true);
assert.equal(isCandidateGOnlySelection({ ...candidateG, unexpectedShadowBinding: true }), false);
assert.equal(isCandidateGOnlySelection({
  ...candidateG,
  evidence:{ ...candidateG.evidence, extra:true },
}), false);

const next = { ...integrated, sourceVersion: '4.0.308' };
const cutover = withExpectedAdminVersion(
  ravScoreProfileWriteAction({ local: next, central: candidateG }),
  { version: 19 },
);
assert.deepEqual(cutover, { type: 'CAS_CANDIDATE_G_CUTOVER', expectedVersion: 19 });
assert.equal(
  ravScoreProfileWriteAction({ local: next, central: next }).type,
  'VERIFY_IDENTICAL',
);
assert.equal(
  withExpectedAdminVersion(
    ravScoreProfileWriteAction({
      local: { ...next, sourceVersion: '4.0.309' },
      central: next,
    }),
    { version: 20 },
  ).expectedVersion,
  20,
);
assert.throws(() => ravScoreProfileWriteAction({
  local: next,
  central: { ...next, sourceVersion: '4.0.309' },
}), /newer central/);
assert.throws(() => ravScoreProfileWriteAction({
  local: next,
  central: { ...next, modelBundleSha256: 'unknown' },
}), /Central RavScore profile/);
assert.throws(() => ravScoreProfileWriteAction({
  local: next,
  central: { ...next, modelContractSha256: 'unknown' },
}), /Central RavScore profile/);
assert.throws(() => assertIntegratedRavScoreSelection({
  ...next,
  unexpectedShadowBinding:true,
}), /complete integrated-model-only contract/);
assert.throws(() => assertIntegratedRavScoreSelection({
  ...next,
  evidence:{ ...next.evidence, extra:true },
}), /complete integrated-model-only contract/);
assert.throws(() => assertIntegratedRavScoreSelection({
  ...next,
  presentationPolicyId:undefined,
}), /complete integrated-model-only contract/);
assert.throws(() => withExpectedAdminVersion(cutover, { version: null }), /CAS version/);

console.log('RavScore central profile transition and CAS policy: passed.');
