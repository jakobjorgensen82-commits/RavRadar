// Test-only exact inverse. Every byte of the historical workflow oracle is
// retained; new-route behavior is tested separately against the actual files.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
const review = JSON.parse(fs.readFileSync(new URL('./completed-private-runtime-workflow-review.json', import.meta.url), 'utf8'));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
// Exact test-only ordinary checkout inverse; no runtime source guard is changed.
export function inverseOrdinaryFullHistoryCheckout(source, role) {
  if (role !== 'build' || sha(source) !== '861fad7501e32d4b63c72caa598825b15fb5fb2758961a1187ed57858e5c01ce') return source;
  const actual = "      - uses: actions/checkout@v7\n        with:\n          fetch-depth: 0\n";
  const original = "      - uses: actions/checkout@v7\n        with:\n          fetch-depth: ${{ inputs.completed_private_runtime && '0' || '1' }}\n";
  assert.equal(source.split(actual).length, 2, 'One reviewed checkout block');
  const previous = source.replace(actual, original);
  assert.equal(sha(previous), 'c3f3f76aed3b1193d3c446f00018668ea165370bcdb92742c7139b2cd3e9ab7d',
    'The entire preceding workflow survives the one-line checkout inverse');
  return previous;
}
export function inverseCompletedRuntimeWorkflow(source, role) {
  source = inverseOrdinaryFullHistoryCheckout(source, role);
  // Exact release581 UA-only inverse; all historical guards below remain intact.
  if (role === 'build' && sha(source) === 'c3f3f76aed3b1193d3c446f00018668ea165370bcdb92742c7139b2cd3e9ab7d') {
    assert.equal(source.split('RavRadar/4.0.581').length, 6, 'Exactly five reviewed581 UA changes');
    source = source.replaceAll('RavRadar/4.0.581', 'RavRadar/4.0.580');
    assert.equal(sha(source), '41db6fb9dbde88f26cf6be776db5d712925e166ebc90e4db8f3d754954233615',
      'Whole reviewed580 workflow must survive the581 inverse');
  }
  // Exact release580 successor only; retain the reviewed579 inverse below.
  if (role === 'build' && sha(source) === '41db6fb9dbde88f26cf6be776db5d712925e166ebc90e4db8f3d754954233615') {
    assert.equal(source.split('RavRadar/4.0.580').length, 6, 'Exactly five reviewed580 UA changes');
    source = source.replaceAll('RavRadar/4.0.580', 'RavRadar/4.0.579');
    assert.equal(sha(source), '1630141d45a0b65bbe0b6940b23079f330c2b94a1b4ec947b3c6d961f9f43f8b',
      'Whole reviewed579 workflow must survive the580 inverse');
  }
  // Exact test-only UA release successor; retain the entire old workflow oracle.
  if (role === 'build' && sha(source) === '1630141d45a0b65bbe0b6940b23079f330c2b94a1b4ec947b3c6d961f9f43f8b') {
    assert.equal(source.split('RavRadar/4.0.579').length, 6, 'Exactly five reviewed UA changes');
    source = source.replaceAll('RavRadar/4.0.579', 'RavRadar/4.0.578');
    assert.equal(sha(source), '061c8eaababf8e718e30c98faee1f789850536d8b28fe11e4071b71d27b45af4',
      'Whole pre-release completed-runtime workflow must survive the inverse');
  }
  const row = review.inverseReview[role];
  if (!row) return source;
  assert.equal(sha(source), row.actualSha256, 'Exact reviewed completed-runtime workflow: ' + role);
  let legacy = source;
  for (const [offset, actual, original] of row.edits) {
    assert.equal(legacy.slice(offset, offset + actual.length), actual, 'Exact inverse segment');
    legacy = legacy.slice(0, offset) + original + legacy.slice(offset + actual.length);
  }
  assert.equal(sha(legacy), row.legacySha256, 'Whole historical workflow must survive the inverse');
  return legacy;
}
