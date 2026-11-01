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
const sameHourRecovery = { ...previous, releaseVersion: 'exact-recovery-successor' };
const sameHourRecoveryReuse = { ...reuse, generatedPublicManifestSha256: hash(text(sameHourRecovery)),
  datasetId: sameHourRecovery.datasetId, productionReferenceAt: sameHourRecovery.productionReferenceAt,
  publicRuntimeAdvanced: true };
assert.equal(assertMonotonicPagesGeneration({ targetText: text(sameHourRecovery), publicText: text(previous),
  reuseReport: sameHourRecoveryReuse, recoverySourceSha256: sha256CanonicalJson(previous) }), 'EXACT_RECOVERY_GENERATION');
const formattedPredecessor = `${JSON.stringify(previous, null, 2)}\n`;
assert.notEqual(hash(formattedPredecessor), sha256CanonicalJson(previous));
assert.equal(assertMonotonicPagesGeneration({ targetText: text(sameHourRecovery), publicText: formattedPredecessor,
  recoverySourceSha256: sha256CanonicalJson(previous) }), 'EXACT_RECOVERY_GENERATION');
assert.throws(() => assertMonotonicPagesGeneration({ targetText: text(sameHourRecovery), publicText: formattedPredecessor,
  recoverySourceSha256: hash(formattedPredecessor) }), /sealed public predecessor/);

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
function assertSourceReviewRead(source, job) {
  let scope = source, indent = 0;
  if (job) {
    const start = source.indexOf('\n  ' + job + ':\n');
    assert.ok(start >= 0, 'Expected recovery job: ' + job);
    // The next two-space job key, rather than one of the job's own fields.
    const next = source.slice(start + 4).search(/^  [a-z][a-z-]+:\s*$/m);
    scope = source.slice(start, next < 0 ? source.length : start + 4 + next);
    indent = 4;
  }
  const block = scope.match(new RegExp('^' + ' '.repeat(indent) + 'permissions:\\n((?:' + ' '.repeat(indent + 2) + '[^\\n]*\\n)+)', 'm'));
  assert.ok(block && new RegExp('^' + ' '.repeat(indent + 2) + 'pull-requests: read$', 'm').test(block[1]),
    'Source review read permission missing: ' + (job || 'workflow'));
}
for (const name of ['update-and-deploy', 'run-current-weather-once', 'deploy-code-only-repair']) {
  const source = await read(name);
  assert.match(source, /ravradar-weather-production-v2/);
  assert.match(source, /uses: \.\/\.github\/workflows\/reusable-operational-reentry.yml/);
  assertSourceReviewRead(source);
  assertSourceReviewRead(source, 'operational-recovery-gate');
  assert.throws(() => assertSourceReviewRead(source.replaceAll('      pull-requests: read\n', ''),
    'operational-recovery-gate'), /Source review read permission missing/);
}
const recovery = await read('reusable-operational-reentry');
assertSourceReviewRead(recovery);
for (const job of ['reconcile-operational-pending', 'recover-operational-pages-target']) {
  assertSourceReviewRead(recovery, job);
  assert.throws(() => assertSourceReviewRead(recovery.replaceAll('      pull-requests: read\n', ''), job),
    /Source review read permission missing/);
}
const checkpoint = await read('resume-operational-checkpoint');
assertSourceReviewRead(checkpoint);
assert.match(checkpoint, /group: ravradar-weather-production-v2/);
assert.match(checkpoint, /uses: \.\/\.github\/workflows\/reusable-operational-reentry.yml/);
assert.match(checkpoint, /test "\$RESULT" = success/);
assert.match(checkpoint, /EXACT_TARGET_REDEPLOY\|TARGET_RECONCILE\|COMPLETED_PRE_ACTIVATION\|PRE_ACTIVATION_RESUME/);
assert.match(checkpoint, /\*\) echo "No exact prepared target was publicly recovered\." >&2; exit 1/);
for (const source of [checkpoint, recovery]) {
  assert.throws(() => assertSourceReviewRead(source.replace(/^  pull-requests: read\n/m, '')),
    /Source review read permission missing/);
}
assert.doesNotMatch(recovery, /^concurrency:/m);
assert.match(recovery, /github-pages-attempt-evidence.mjs/);
assert.match(recovery, /assertMonotonicPagesGeneration/);
assert.match(recovery, /protected-operational-reentry-evidence\.mjs --restore/);
assert.match(recovery, /--durable-evidence/);
assert.match(recovery, /TERMINAL_SOURCE_STABLE_AFTER_ARTIFACT_EXPIRY/);
for (const name of ['reusable-weather-build', 'deploy-code-only-repair']) {
  const source = await read(name);
  assert.match(source, /MEASURED_WARMUP_PUBLISHED/);
  assert.match(source, /copy-public-delivery-shards.mjs/);
  for (const step of ['checkpoint-build', 'checkpoint-save', 'checkpoint-publish']) {
    const at = source.indexOf(`id: ${step}`), end = source.indexOf('\n      - ', at);
    const block = source.slice(at, end);
    assert.match(block, /disposition == 'READY_PUBLISHED'/);
    assert.match(block, /disposition == 'MEASURED_WARMUP_PUBLISHED'/);
    assert.doesNotMatch(block, /rollback_activation_ready == 'true'/);
  }
}
const deploy = await read('reusable-pages-deploy');
assert.doesNotMatch(deploy, /^concurrency:/m);

// Both normal historical begin callers must carry the independently observed
// public identity, including a valid public generation ahead of central ACTIVE.
const observedSourceArgument = '--source-deployment-id "$(cat "$RAVRADAR_OPERATIONAL_HANDOFF/source-deployment-id.txt")"';
function historicalBeginStep(source, id) {
  const marker = '\n        id: ' + id + '\n';
  assert.equal(source.split(marker).length, 2, 'One exact historical begin step: ' + id);
  const at = source.indexOf(marker), end = source.indexOf('\n      - name:', at + marker.length);
  return source.slice(source.lastIndexOf('\n      - name:', at), end < 0 ? source.length : end);
}
function assertObservedHistoricalBeginCallers(source) {
  for (const id of ['integrated-historical-maintenance-begin', 'code-only-integrated-historical-maintenance-begin']) {
    const step = historicalBeginStep(source, id);
    assert.equal(step.split(observedSourceArgument).length, 2,
      id + ' must pass the observed public source deployment');
    assert.match(step, /ravscore-operational-activation\.mjs integrated-historical-maintenance-begin/);
    assert.match(step, /--source-verification "\$RAVRADAR_OPERATIONAL_HANDOFF\/source-verification\.json"/);
  }
}
assertObservedHistoricalBeginCallers(deploy);
for (const id of ['integrated-historical-maintenance-begin', 'code-only-integrated-historical-maintenance-begin']) {
  const step = historicalBeginStep(deploy, id);
  for (const replacement of ['', '--source-deployment-id "${{ inputs.active_deployment_id }}"']) {
    assert.throws(() => assertObservedHistoricalBeginCallers(deploy.replace(step,
      step.replace(observedSourceArgument, replacement))), /must pass the observed public source deployment/);
  }
}

assert.equal(deploy.match(/check-pages-generation-order.mjs/g).length, 2);
assert.match(deploy, /exact_public_recovery/);
assert.match(deploy, /--recovery-source-sha256/);
assert.equal(deploy.match(/\.sourcePublicManifestCanonicalSha256/g)?.length, 2);
assert.doesNotMatch(deploy, /jq -er '\.sourcePublicManifestSha256/);
assert.ok(deploy.indexOf('id: code-only-integrated-historical-maintenance-begin') < deploy.indexOf('id: deployment'));
assert.match(deploy, /steps\.integrated-historical-maintenance-begin\.outcome == 'success' \|\| steps\.code-only-integrated-historical-maintenance-begin\.outcome == 'success'/);
assert.match(deploy, /MEASURED_WARMUP_PUBLISHED/);
assert.match(deploy, /NOT_APPLICABLE_DURING_MEASURED_WARMUP/);
assert.match(deploy, /Publish exact target reentry evidence before any activation CAS/);
assert.match(deploy, /--retain-public-manifest-sha256/);
assert.ok(deploy.indexOf('Publish exact target reentry evidence before any activation CAS')
  < deploy.indexOf('id: candidate-begin'));
console.log('Pages generation order, exact reusable attempt, shared reentry and measured-warmup workflow integration: passed.');


// Distinct fixed namespaces prevent a recovery and subsequent ordinary Pages
// deployment in the same run from aliasing terminal evidence or immutable IDs.
{
  const ordinary=job('Deploy prepared Pages artifact');
  const recovered=job('Recovery / Deploy exact pre-activation Pages artifact');
  recovered.steps[0].conclusion='failure';
  const both=[ordinary,recovered];
  assert.equal(exactPagesAttemptStep(both,identity),'success');
  const recoveryIdentity={...identity,attemptId:'pages-recovery-'+identity.runId+'-'+identity.runAttempt};
  assert.equal(exactPagesAttemptStep(both,recoveryIdentity),'failure');
  assert.throws(()=>exactPagesAttemptStep([ordinary],recoveryIdentity),/unambiguous/);
  assert.throws(()=>exactPagesAttemptStep([recovered,recovered],recoveryIdentity),/unambiguous/);
  assert.throws(()=>exactPagesAttemptStep(both,{...recoveryIdentity,attemptId:'pages-recovery-1-999'}),/identity/);
}
