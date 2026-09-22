// The registry is intentionally additive.  A newly discovered identity
// relation belongs here as one classified record instead of another literal
// copied into several workflows.  The registry describes ownership and
// validation; the producer/consumer code still performs the actual value
// checks for its scope.
const freezeEntry = entry => Object.freeze({
  ...entry,
  consumers: Object.freeze([...entry.consumers]),
});

export const RUNTIME_BINDING_REGISTRY = Object.freeze([
  freezeEntry({
    key: 'ravscore.integrated.modelBinding',
    class: 'LIVE_RUNTIME',
    scope: 'private-runtime-and-public-score',
    producer: 'js/core/ravscore-model-contract.js#ravScoreModelBinding',
    consumers: [
      'scripts/migrate-post-cutover-private-runtime.mjs',
      'scripts/sync-ravscore-model-binding.mjs',
      'js/services/data-service.js',
      'js/core/ravscore-public-runtime-contract.js',
    ],
    sourceOfTruth: 'current integrated RavScore model contract',
    validator: 'assertRavScoreModelBinding',
    requiredWhen: 'integrated-runtime',
    sensitivity: 'public-hashes-only',
    historicalPolicy: 'successor-only',
  }),
  freezeEntry({
    key: 'ravscore.candidate-g.rollbackModelBinding',
    class: 'FIXTURE_OR_RESEARCH',
    scope: 'private-rollback-compatibility',
    producer: 'scripts/rollback-assets/ravscore-model-contract.js#ravScoreModelBinding',
    consumers: [
      'scripts/migrate-post-cutover-private-runtime.mjs',
      'scripts/sync-ravscore-model-binding.mjs',
    ],
    sourceOfTruth: 'sealed Candidate G rollback contract',
    validator: 'assertCandidateBinding',
    requiredWhen: 'historical-rollback-runtime',
    sensitivity: 'private-hashes-only',
    historicalPolicy: 'immutable-history',
  }),
  freezeEntry({
    key: 'runtime.protectedPredecessorIdentity',
    class: 'EXACT_RECOVERY',
    scope: 'code-only-and-post-cutover-migration',
    producer: 'scripts/protected-private-production-runtime.mjs#describeTargetProtectedPrivateProductionRuntime',
    consumers: [
      '.github/workflows/deploy-code-only-repair.yml',
      'scripts/migrate-post-cutover-private-runtime.mjs',
    ],
    sourceOfTruth: 'protected runtime pointer selected for the exact target reference',
    validator: 'validatePredecessorIdentity',
    requiredWhen: 'target-runtime-migration',
    sensitivity: 'payload-free-private-metadata',
    historicalPolicy: 'exact-target-only',
  }),
  freezeEntry({
    key: 'runtime.protectedCurrentIdentity',
    class: 'LIVE_RUNTIME',
    scope: 'saved-weather-code-only-continuation',
    producer: 'scripts/protected-private-production-runtime.mjs#describeCurrentProtectedPrivateProductionRuntime',
    consumers: [
      '.github/workflows/deploy-code-only-repair.yml',
      'scripts/private-production-runtime-workflow.mjs',
      'scripts/protected-private-production-runtime.mjs',
    ],
    sourceOfTruth: 'newest central protected runtime pointer selected before saved-weather continuation',
    validator: 'canonicalUtcTarget+monotonicTarget+horizonValidity+sourceAncestor',
    requiredWhen: 'saved-weather-continuation',
    sensitivity: 'payload-free-private-metadata',
    historicalPolicy: 'newest-horizon-valid-monotonic-successor',
  }),
  freezeEntry({
    key: 'runtime.targetReferenceAt',
    class: 'LIVE_RUNTIME',
    scope: 'scheduler-provider-cache-and-public-runtime',
    producer: 'workflow target/reference selection',
    consumers: [
      '.github/workflows/reusable-weather-build.yml',
      '.github/workflows/deploy-code-only-repair.yml',
      'scripts/protected-private-production-runtime.mjs',
      'scripts/migrate-post-cutover-private-runtime.mjs',
    ],
    sourceOfTruth: 'single locked production target for the run',
    validator: 'exactUtcHourAndTargetReferenceChecks',
    requiredWhen: 'every-production-run',
    sensitivity: 'public-timestamp',
    historicalPolicy: 'monotonic-or-explicit-successor',
  }),
  freezeEntry({
    key: 'runtime.public-hour-delivery.identity',
    class: 'LIVE_RUNTIME',
    scope: 'private-public-hour-pack-and-public-hour-files',
    producer: 'scripts/lib/public-hour-delivery-pack.mjs#build/rebindPrivatePublicHourDeliveryPack',
    consumers: [
      'scripts/lib/public-hour-delivery-pack.mjs#inspectPrivatePublicHourDeliveryPack',
      'scripts/migrate-post-cutover-private-runtime.mjs',
      'scripts/private-production-runtime-workflow.mjs',
      'scripts/protected-private-production-runtime.mjs#validateSameReferencePrivateRuntimeSuccessor',
      'scripts/public-conditions-lib.mjs',
    ],
    sourceOfTruth: 'one publicHourDelivery marker bound to the complete 118-hour pack',
    validator: 'privatePublicHourDeliveryMarker+inspectPrivatePublicHourDeliveryPack+exactSameReferencePackDigest',
    requiredWhen: 'preserved-or-new-public-hour-delivery',
    sensitivity: 'public-digests-and-private-pack-sizes',
    historicalPolicy: 'rebuild-or-rebind-as-one-atomic-identity',
  }),
]);

const REQUIRED_FIELDS = Object.freeze([
  'key',
  'class',
  'scope',
  'producer',
  'consumers',
  'sourceOfTruth',
  'validator',
  'requiredWhen',
  'sensitivity',
  'historicalPolicy',
]);
const CLASSES = new Set([
  'LIVE_RUNTIME',
  'IMMUTABLE_HISTORY',
  'EXACT_RECOVERY',
  'FIXTURE_OR_RESEARCH',
]);

export function assertRuntimeBindingRegistry(registry = RUNTIME_BINDING_REGISTRY) {
  if (!Array.isArray(registry) || registry.length === 0) {
    throw new Error('Runtime binding registry must contain at least one entry');
  }
  const keys = new Set();
  for (const entry of registry) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error('Runtime binding registry contains a non-object entry');
    }
    const actualFields = Object.keys(entry).sort();
    const expectedFields = [...REQUIRED_FIELDS].sort();
    if (actualFields.length !== expectedFields.length
        || actualFields.some((field, index) => field !== expectedFields[index])) {
      throw new Error(`Runtime binding ${String(entry.key)} has an incomplete field set`);
    }
    if (!/^[a-z][A-Za-z0-9]*(?:\.[A-Za-z0-9-]+)+$/.test(entry.key)
        || keys.has(entry.key)) {
      throw new Error(`Runtime binding key is invalid or duplicated: ${String(entry.key)}`);
    }
    keys.add(entry.key);
    if (!CLASSES.has(entry.class)
        || ![entry.scope, entry.producer, entry.sourceOfTruth, entry.validator,
          entry.requiredWhen, entry.sensitivity, entry.historicalPolicy]
          .every(value => typeof value === 'string' && value.length > 0)
        || !Array.isArray(entry.consumers)
        || entry.consumers.length === 0
        || entry.consumers.some(value => typeof value !== 'string' || value.length === 0)) {
      throw new Error(`Runtime binding ${entry.key} has invalid ownership metadata`);
    }
  }
  return registry;
}

assertRuntimeBindingRegistry();
