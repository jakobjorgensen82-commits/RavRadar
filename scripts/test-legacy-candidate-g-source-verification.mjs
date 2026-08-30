import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  LEGACY_CANDIDATE_G_IMPLEMENTATION_CLOSURE_SHA256,
  LEGACY_CANDIDATE_G_IMPLEMENTATION_FILE_COUNT,
  LEGACY_CANDIDATE_G_MODEL_ID,
  LEGACY_CANDIDATE_G_PROFILE_SWITCH,
  LEGACY_CANDIDATE_G_RELEASE_VERSION,
  LEGACY_CANDIDATE_G_SOURCE_HEAD,
  LEGACY_CANDIDATE_G_SOURCE_TREE,
  LEGACY_CANDIDATE_G_STATE_SCHEMA_VERSION,
  legacyCandidateGCentralProfile,
  legacyCandidateGSourceIdentity,
} from './lib/ravscore-legacy-candidate-g-source.mjs';
import {
  attestLegacyCandidateGSource,
  baselineImplementationSources,
  legacyCandidateGImplementationClosureSha256,
  verifyLegacyCandidateGSource,
} from './verify-legacy-candidate-g-source.mjs';

const sourceHead = 'b'.repeat(40);
const datasetId = 'rr-20260829130800-210-legacy-source-test';
const productionReferenceAt = '2026-08-29T13:00:00.000Z';
const startupBytes = Buffer.from('{"legacy":"startup"}\n');
const detailsBytes = Buffer.from('{"legacy":"details"}\n');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');

assert.equal(LEGACY_CANDIDATE_G_RELEASE_VERSION, '4.0.316');
assert.equal(LEGACY_CANDIDATE_G_SOURCE_HEAD,
  '49dd4cb454656bdf629e5df760176705e38d2cb0');
assert.equal(LEGACY_CANDIDATE_G_SOURCE_TREE,
  '975c3e9432cea7780564ffd56766bc1f0a0a9763');
assert.equal(LEGACY_CANDIDATE_G_PROFILE_SWITCH,
  'RAVSCORE-PROFILE-SWITCH-4.0.316');
assert.equal(LEGACY_CANDIDATE_G_IMPLEMENTATION_CLOSURE_SHA256,
  'a366b4a64fc3ccc8f1b94f3fed24b3ce03ea23d906396bc8bea183338c5d2606');
assert.notEqual(LEGACY_CANDIDATE_G_IMPLEMENTATION_CLOSURE_SHA256,
  '1bd8b3171f127e158e578c98e76597f8fadeaeafb267ffbd26aaa9e318d8ca45',
  'the 4.0.316 public source closure must not reuse the stale a930 closure');
assert.notEqual(LEGACY_CANDIDATE_G_IMPLEMENTATION_CLOSURE_SHA256,
  '1c00465c3760b7765552bbaf07829cb165c3de79d964394c87176d26a588a6fd',
  'the 4.0.316 public source closure must not omit deployed score or trip modules');
assert.equal(LEGACY_CANDIDATE_G_IMPLEMENTATION_FILE_COUNT, 53);
const sourceIdentity = legacyCandidateGSourceIdentity();
assert.equal(sourceIdentity.sourceContractSha256,
  '2f888a16190e9e43e44536536029f1b0021a1b850195524aa2312664ca74810b');
assert.equal(sourceIdentity.sourceBundleSha256,
  'e04a0db79feabae09184aa0e2430c2c5a300948065e64dde4c57ae0287767ce4');
assert.deepEqual(legacyCandidateGCentralProfile(), {
  schemaVersion: '2.0.0',
  sourceVersion: '4.0.316',
  switchVersion: 'RAVSCORE-PROFILE-SWITCH-4.0.316',
  requestedProfileId: LEGACY_CANDIDATE_G_MODEL_ID,
  rollbackProfileId: null,
  candidateProfileId: LEGACY_CANDIDATE_G_MODEL_ID,
  candidateActivationEnabled: true,
  prePublicWarmupAccepted: true,
  automaticActivationAllowed: false,
  publicAvailabilityPolicy: 'candidate-g-local-fail-closed',
  legacyPublicFallbackAllowed: false,
  status: 'owner-approved-candidate-g-only-local-fail-closed',
  activationAuthority: 'DEC-0072-owner-decision-2026-08-24',
  evidence: {
    freshFinalShadowRunId: null,
    ownerReviewDecisionId: 'DEC-0072-CANDIDATE-G-ONLY-LOCAL-AVAILABILITY',
  },
});

const manifest = Object.freeze({
  schemaVersion: 2,
  datasetId,
  productionReferenceAt,
  complete: true,
  zoneCount: 210,
  coastalPartCount: 673,
  conditionsPath: './public-conditions.json',
  conditionDetailsPath: './public-condition-details.json',
  fullConditionsPath: './conditions.json',
  publicConditionsSha256: digest(startupBytes),
  publicConditionsBytes: startupBytes.length,
  publicConditionDetailsSha256: digest(detailsBytes),
  publicConditionDetailsBytes: detailsBytes.length,
  ravScoreProfile: Object.freeze({
    schemaVersion: '2.0.0',
    switchVersion: LEGACY_CANDIDATE_G_PROFILE_SWITCH,
    requestedProfileId: LEGACY_CANDIDATE_G_MODEL_ID,
    activeProfileId: LEGACY_CANDIDATE_G_MODEL_ID,
    candidateProfileId: LEGACY_CANDIDATE_G_MODEL_ID,
    rollbackProfileId: null,
    activationState: 'candidate-g-only-local-fail-closed',
    publicAvailabilityPolicy: 'candidate-g-local-fail-closed',
    legacyPublicFallbackAllowed: false,
    automaticActivationAllowed: false,
  }),
});

const zones = Object.fromEntries(Array.from({ length: 210 }, (_, index) => [
  `legacy-zone-${index + 1}`,
  Object.freeze({ id: `legacy-zone-${index + 1}` }),
]));
const parts = Object.fromEntries(Array.from({ length: 673 }, (_, index) => [
  `legacy-part-${index + 1}`,
  Object.freeze({
    candidateG: Object.freeze({
      currentState: Object.freeze({
        schemaVersion: LEGACY_CANDIDATE_G_STATE_SCHEMA_VERSION,
        modelId: LEGACY_CANDIDATE_G_MODEL_ID,
      }),
    }),
  }),
]));
const conditions = Object.freeze({
  datasetId,
  productionReferenceAt,
  zones,
  coastalParts: Object.freeze({
    scoreProfile: Object.freeze({ activeProfileId: LEGACY_CANDIDATE_G_MODEL_ID }),
    parts,
  }),
});

const attestation = attestLegacyCandidateGSource({ manifest, conditions });
assert.equal(attestation.zoneCount, 210);
assert.equal(attestation.coastalPartCount, 673);
assert.equal(attestation.candidateStateCount, 673);
assert.equal(attestation.privatePayloadLogged, false);
assert.doesNotMatch(JSON.stringify(attestation), /coordinates|waterPoint|landPoint|rawU|rawV/i);
assert.throws(() => attestLegacyCandidateGSource({
  manifest,
  conditions: {
    ...conditions,
    coastalParts: {
      ...conditions.coastalParts,
      parts: {
        ...parts,
        'legacy-part-1': {
          ...parts['legacy-part-1'],
          ravScoreModel: { hiddenFallback: true },
        },
      },
    },
  },
}), /non-Candidate or incomplete part/);

const baseline = await baselineImplementationSources();
const baselinePaths = baseline.map(item => item.relative);
assert.equal(baseline.length, LEGACY_CANDIDATE_G_IMPLEMENTATION_FILE_COUNT);
for (const transitive of [
  'js/services/data-service.js',
  'js/core/local-zone-score.js',
  'js/core/zone-ranking.js',
  'js/services/rav-assistant.js',
  'js/services/trip-evidence-contract.js',
  'js/core/adaptive-model.js',
  'js/core/prediction-engine.js',
  'js/core/score-engine.js',
  'js/core/coastal-process-model.js',
  'js/core/debug-trace.js',
  'js/core/direction-anchors.js',
  'js/services/trip-service.js',
]) {
  assert.ok(baselinePaths.includes(transitive),
    `the recursive 49dd closure must include ${transitive}`);
}

function response(bytes) {
  const copy = Buffer.from(bytes);
  return Object.freeze({
    ok: true,
    status: 200,
    arrayBuffer: async () => copy.buffer.slice(copy.byteOffset, copy.byteOffset + copy.byteLength),
  });
}

function fetchFrom(files) {
  return async url => {
    const relative = new URL(url).pathname.replace(/^\/+/, '');
    const bytes = files.get(relative);
    if (!bytes) return Object.freeze({ ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) });
    return response(bytes);
  };
}

const files = new Map(baseline.map(item => [item.relative, item.bytes]));
files.set('data/live/manifest.json', Buffer.from(JSON.stringify(manifest)));
files.set('data/live/public-conditions.json', startupBytes);
files.set('data/live/public-condition-details.json', detailsBytes);
const verification = await verifyLegacyCandidateGSource({
  baseUrl: 'https://legacy-source.example.test/',
  sourceHead,
  expectedManifest: manifest,
  localAttestation: attestation,
  fetchImpl: fetchFrom(files),
});
assert.equal(verification.status, 'passed');
assert.equal(verification.privatePayloadRead, false);
assert.equal(verification.privatePayloadLogged, false);
assert.match(verification.implementationClosureSha256, /^[a-f0-9]{64}$/);
assert.equal(verification.implementationClosureSha256,
  LEGACY_CANDIDATE_G_IMPLEMENTATION_CLOSURE_SHA256);
assert.equal(verification.implementationClosureSha256,
  await legacyCandidateGImplementationClosureSha256(),
  'the first-cutover plan and live legacy verifier must use one exact closure');

const mutatedFiles = new Map(files);
mutatedFiles.set('js/services/data-service.js', Buffer.concat([
  files.get('js/services/data-service.js'),
  Buffer.from('\n// forbidden transitive drift\n'),
]));
await assert.rejects(() => verifyLegacyCandidateGSource({
  baseUrl: 'https://legacy-source.example.test/',
  sourceHead,
  expectedManifest: manifest,
  localAttestation: attestation,
  fetchImpl: fetchFrom(mutatedFiles),
}), /implementation drifted from 4\.0\.316: js\/services\/data-service\.js/,
'a transitive score consumer mutation must invalidate the legacy source seal');

const newlyCoveredFiles = new Map(files);
newlyCoveredFiles.set('js/core/score-engine.js', Buffer.concat([
  files.get('js/core/score-engine.js'),
  Buffer.from('\n// forbidden public score drift\n'),
]));
await assert.rejects(() => verifyLegacyCandidateGSource({
  baseUrl: 'https://legacy-source.example.test/',
  sourceHead,
  expectedManifest: manifest,
  localAttestation: attestation,
  fetchImpl: fetchFrom(newlyCoveredFiles),
}), /implementation drifted from 4\.0\.316: js\/core\/score-engine\.js/,
'a deployed score module mutation must invalidate the complete 4.0.316 source seal');

console.log('Legacy Candidate G source: exact schema-2 210/673 attestation, recursive 49dd module closure and transitive mutation rejection passed.');
