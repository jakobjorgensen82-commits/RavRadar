import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  LEGACY_CANDIDATE_G_MODEL_ID,
  LEGACY_CANDIDATE_G_PROFILE_SWITCH,
  LEGACY_CANDIDATE_G_STATE_SCHEMA_VERSION,
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
for (const transitive of [
  'js/services/data-service.js',
  'js/core/local-zone-score.js',
  'js/core/zone-ranking.js',
  'js/services/rav-assistant.js',
  'js/services/trip-evidence-contract.js',
]) {
  assert.ok(baselinePaths.includes(transitive),
    `the recursive a930 closure must include ${transitive}`);
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
}), /implementation drifted from 4\.0\.308: js\/services\/data-service\.js/,
'a transitive score consumer mutation must invalidate the legacy source seal');

console.log('Legacy Candidate G source: exact schema-2 210/673 attestation, recursive a930 module closure and transitive mutation rejection passed.');
