// Derived output, not executable model implementation or caller authority.
// A real release still recomputes C/I/T and every SQL/output pin from source.
import assert from 'node:assert/strict';

// Fixed issued588 predecessor only; this is not a selectable SOURCE version.
export const SOURCE_PRODUCER_PREDECESSOR_VERSION = '20261025110000';
export const SOURCE_PRODUCER_DERIVED_METADATA_PATH =
  'scripts/lib/source-producer-binding.generated.json';
export const MODEL_RELEASE_ONLY_DEPENDENCIES = Object.freeze([
  'scripts/ravscore-operational-activation.mjs',
]);
const exact = (value, keys) => {
  assert(value && Object.getPrototypeOf(value) === Object.prototype);
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort());
};

export function assertSourceProducerDerivedMetadata(value) {
  assert.equal(arguments.length, 1);
  exact(value, ['schemaVersion', 'version', 'binding', 'output']);
  assert.equal(value.schemaVersion, 'source-producer-derived-metadata-v1');
  if (value.version === null) {
    assert.equal(value.binding, null);
    assert.equal(value.output, null);
  } else {
    assert.match(value.version, /^[0-9]{14}$/);
    assert(value.version > SOURCE_PRODUCER_PREDECESSOR_VERSION,
      'SOURCE derived version must follow the actual issued588 predecessor');
    exact(value.binding, ['version', 'C', 'I', 'T', 'candidateManifestSha256', 'integratedManifestSha256']);
    assert.equal(value.binding.version, value.version);
    for (const key of ['C', 'I', 'T', 'candidateManifestSha256', 'integratedManifestSha256'])
      assert.match(value.binding[key], /^[a-f0-9]{64}$/);
    assert.equal(value.binding.C, value.binding.candidateManifestSha256);
    assert.equal(value.binding.I, value.binding.integratedManifestSha256);
    assert.equal(new Set(['C', 'I', 'T'].map(key => value.binding[key])).size, 3);
    Object.freeze(value.binding);
    // Binding derivation precedes SQL-output derivation. Production consumers
    // retain their existing requireSourceProducerOutput() admission boundary.
    if (value.output !== null) {
      exact(value.output, ['canonicalSha256', 'checkpointContractSha256', 'migrationSha256', 'tripBindingPolicySha256']);
      for (const pin of Object.values(value.output)) assert.match(pin, /^[a-f0-9]{64}$/);
      Object.freeze(value.output);
    }
  }
  return Object.freeze(value);
}

export function sourceProducerDerivedMetadataFromText(source) {
  assert.equal(arguments.length, 1);
  assert.equal(typeof source, 'string');
  assert(Buffer.byteLength(source, 'utf8') <= 8192);
  const value = assertSourceProducerDerivedMetadata(JSON.parse(source));
  // No duplicate keys, executable text, hidden properties, alternative JSON
  // spellings, or caller-selected source are accepted as generated output.
  assert.equal(source, JSON.stringify(value, null, 2) + '\n');
  return value;
}
