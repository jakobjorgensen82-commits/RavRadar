import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { assertMonotonicPagesGeneration, readBoundedPublicManifest } from './lib/pages-generation-order.mjs';
import { exactPagesAttemptStep } from './github-pages-attempt-evidence.mjs';
import { sha256CanonicalJson } from './ravscore-operational-pages-recovery.mjs';

const manifest = (hour, minute = 10) => ({ complete: true, zoneCount: 210,
  datasetId: `rr-${hour}-${minute}`, productionReferenceAt: `2026-09-19T${hour}:00:00.000Z`,
  generatedAt: `2026-09-19T${hour}:${minute}:00.000Z` });
const text = value => JSON.stringify(value);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
assert.equal(await readBoundedPublicManifest(new Response('{"ok":true}')), '{"ok":true}');
await assert.rejects(readBoundedPublicManifest(new Response('12345'), 4), /admission bound/);
await assert.rejects(readBoundedPublicManifest(new Response(new Uint8Array([0xff]))), /encoded data/);
await assert.rejects(readBoundedPublicManifest(new Response(null)), /no readable body/);
const previous = manifest('10'), next = manifest('11');
const input = { targetText: text(next), publicText: text(previous) };
assert.equal(assertMonotonicPagesGeneration(input), 'FORWARD_WEATHER_GENERATION');
assert.throws(() => assertMonotonicPagesGeneration({ ...input, publicText: text(manifest('12')) }), /older/);
assert.equal(assertMonotonicPagesGeneration({ ...input, targetText: text(manifest('10', 20)) }), 'FORWARD_WEATHER_GENERATION');
assert.throws(() => assertMonotonicPagesGeneration({ ...input, targetText: text(previous) }), /Same-hour/);
const repacked = { ...previous, releaseVersion: 'synthetic-successor' };
const reuse = { sourcePublicManifestSha256: hash(text(previous)),
  generatedPublicManifestSha256: hash(text(repacked)), sourceDatasetId: previous.datasetId,
  datasetId: repacked.datasetId, productionReferenceAt: repacked.productionReferenceAt,
  providerRequestsPerformed: false, privatePayloadIncluded: false, publicRuntimeAdvanced: false };
assert.equal(assertMonotonicPagesGeneration({ ...input, targetText: text(repacked), reuseReport: reuse }), 'EXACT_REUSE_PREDECESSOR');
for (const mutation of [{ sourcePublicManifestSha256: 'f'.repeat(64) },
  { generatedPublicManifestSha256: 'f'.repeat(64) }, { sourceDatasetId: 'other' },
  { publicRuntimeAdvanced: true }, { providerRequestsPerformed: true }]) {
  assert.throws(() => assertMonotonicPagesGeneration({ ...input, targetText: text(repacked), reuseReport: { ...reuse, ...mutation } }));
}
assert.equal(assertMonotonicPagesGeneration({ ...input, recoverySourceSha256: sha256CanonicalJson(previous) }), 'EXACT_RECOVERY_GENERATION');
assert.throws(() => assertMonotonicPagesGeneration({ ...input, recoverySourceSha256: 'f'.repeat(64) }), /sealed public predecessor/);

const identity = { runId: 123, runAttempt: 2, headSha: 'a'.repeat(40) };
const job = name => ({ name, run_id: 123, run_attempt: 2, head_sha: identity.headSha,
  steps: [{ name: 'Deploy to GitHub Pages', conclusion: 'success' }] });
for (const name of ['Deploy prepared Pages artifact',
  'Deploy verified code-only artifact / Deploy prepared Pages artifact',
  'Deploy prepared Pages artifact through reusable workflow / Deploy prepared Pages artifact']) {
  assert.equal(exactPagesAttemptStep([job(name)], identity), 'success');
}
assert.throws(() => exactPagesAttemptStep([job('Deploy prepared Pages artifact'), job('X / Deploy prepared Pages artifact')], identity), /unambiguous/);
assert.throws(() => exactPagesAttemptStep([{ ...job('Deploy prepared Pages artifact'), run_attempt: 1 }], identity));
assert.throws(() => exactPagesAttemptStep([{ ...job('Deploy prepared Pages artifact'), head_sha: 'b'.repeat(40) }], identity));

const read = file => fs.readFile(`.github/workflows/${file}.yml`, 'utf8');
for (const name of ['update-and-deploy', 'run-current-weather-once', 'deploy-code-only-repair']) {
  const source = await read(name);
  assert.match(source, /ravradar-weather-production-v2/);
  assert.match(source, /uses: \.\/\.github\/workflows\/reusable-operational-reentry.yml/);
}
const recovery = await read('reusable-operational-reentry');
assert.doesNotMatch(recovery, /^concurrency:/m);
assert.match(recovery, /github-pages-attempt-evidence.mjs/);
assert.match(recovery, /assertMonotonicPagesGeneration/);
assert.match(recovery, /protected-operational-reentry-evidence\.mjs --restore/);
assert.match(recovery, /--durable-evidence/);
assert.match(recovery, /TERMINAL_SOURCE_STABLE_AFTER_ARTIFACT_EXPIRY/);
for (const name of ['reusable-weather-build', 'deploy-code-only-repair']) {
  const source = await read(name);
  assert.match(source, /NOT_APPLICABLE_DURING_MEASURED_WARMUP/);
  assert.match(source, /copy-public-delivery-shards.mjs/);
  for (const step of ['checkpoint-build', 'checkpoint-save', 'checkpoint-publish']) {
    const at = source.indexOf(`id: ${step}`), end = source.indexOf('\n      - ', at);
    const block = source.slice(at, end);
    assert.match(block, /rollback_status == 'READY'/);
    assert.doesNotMatch(block, /BUILDING_MEASURED_ONLY/);
    assert.doesNotMatch(block, /rollback_activation_ready == 'true'/);
  }
}
const deploy = await read('reusable-pages-deploy');
assert.doesNotMatch(deploy, /^concurrency:/m);
assert.equal(deploy.match(/check-pages-generation-order.mjs/g).length, 2);
assert.ok(deploy.indexOf('id: code-only-integrated-historical-maintenance-begin') < deploy.indexOf('id: deployment'));
assert.match(deploy, /steps\.integrated-historical-maintenance-begin\.outcome == 'success' \|\| steps\.code-only-integrated-historical-maintenance-begin\.outcome == 'success'/);
assert.match(deploy, /MEASURED_WARMUP_PUBLISHED/);
assert.match(deploy, /NOT_APPLICABLE_DURING_MEASURED_WARMUP/);
assert.match(deploy, /Publish exact target reentry evidence before any activation CAS/);
assert.match(deploy, /--retain-public-manifest-sha256/);
assert.ok(deploy.indexOf('Publish exact target reentry evidence before any activation CAS')
  < deploy.indexOf('id: candidate-begin'));
console.log('Pages generation order, exact reusable attempt, shared reentry and measured-warmup workflow integration: passed.');
