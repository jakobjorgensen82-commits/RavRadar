import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertPublicDeliveryDocument } from '../js/core/public-delivery-contract.js';
import { publicDeliveryTransportEntries } from '../js/services/public-delivery-transport-binding.js';
import { comparePublicWeatherHours } from './check-public-weather-continuity.mjs';
import { admitCompletedPrivateRuntime, completedRuntimeFailureCode, readCompletedPrivateRuntimePin } from './completed-private-runtime-admission.mjs';
import { restoreProtectedRavScoreContinuationCheckpoint } from './protected-ravscore-continuation-checkpoint.mjs';
import { readBoundedPublicManifest } from './lib/pages-generation-order.mjs';
import { classifyOrdinaryPagesContinuation } from './lib/ordinary-completed-pages-route.mjs';
import { readPublicDeliveryJsonBytes, readPublicDeliveryJsonFile } from './lib/public-delivery-json-transport.mjs';
import { createProtectedPrivateRuntimeClients } from './protected-private-production-runtime.mjs';
import { completedRuntimeOperationalSource, operationalResolvedBindingCurrent,
  RAVSCORE_OPERATIONAL_ACTIVATION_DOCUMENT_KEY, RAVSCORE_PROFILE_SELECTION_DOCUMENT_KEY,
} from './ravscore-operational-activation.mjs';
import { sha256CanonicalJson } from './ravscore-operational-pages-recovery.mjs';

const live = 'https://ravradar.dk/data/live/';
const sha = /^[a-f0-9]{64}$/;
const hour = 3_600_000;
const maximumPublicOverlapBytes = 256 * 1024 * 1024;
const jsonFile = async file => JSON.parse(await fs.readFile(file, 'utf8'));

export function cancelledReplayAnchor({ head, consumerRunId, publicManifestSha256, activeSha256, pin }) {
  assert(/^[a-f0-9]{40}$/.test(head) && Number.isSafeInteger(consumerRunId) && consumerRunId > 0
    && sha.test(publicManifestSha256) && sha.test(activeSha256) && sha.test(pin), 'PAGES_REPLAY_ANCHOR_INVALID');
  return sha256CanonicalJson({ head, consumerRunId, publicManifestSha256, activeSha256, pin });
}

async function exactPublicResponse(url, signal, fetchPublic, revalidate = false) {
  const headers = revalidate ? { 'Cache-Control': 'no-cache' } : undefined;
  const response = await fetchPublic(url, { redirect: 'error', signal, headers });
  assert(response.status === 200 && !response.redirected && response.url === url.href,
    'PAGES_REPLAY_PUBLIC_HTTP');
  return response;
}

export function createOrdinaryPagesBaselineReaders({ fetchPublic = fetch } = {}) {
  const { documentRequest: request } = createProtectedPrivateRuntimeClients({ storageBackend: 'supabase' });
  return {
    readPin: () => readCompletedPrivateRuntimePin(request),
    readPublic: async run => {
      const url = new URL('manifest.json', live);
      url.searchParams.set('pages-reentry', String(run));
      const response = await exactPublicResponse(url, AbortSignal.timeout(15_000), fetchPublic, true);
      return JSON.parse(await readBoundedPublicManifest(response, 512 * 1024));
    },
    readActive: async () => {
      const activation = RAVSCORE_OPERATIONAL_ACTIVATION_DOCUMENT_KEY;
      const profile = RAVSCORE_PROFILE_SELECTION_DOCUMENT_KEY;
      const rows = await request('?select=document_key,payload,version&document_key=in.(' + activation + ',' + profile + ')',
        {}, 'read');
      assert(Array.isArray(rows) && rows.length === 2, 'PAGES_AUTO_ACTIVE_ROWS');
      const active = completedRuntimeOperationalSource(rows.find(row => row.document_key === activation),
        rows.find(row => row.document_key === profile));
      assert(operationalResolvedBindingCurrent(active), 'PAGES_AUTO_ACTIVE_BINDING');
      return active;
    },
  };
}

async function fetchPublicHour(entry, signal, fetchPublic) {
  const url = new URL(entry.path, live);
  const response = await exactPublicResponse(url, signal, fetchPublic);
  // The shared native reader also verifies the outer digest and any encoded
  // logical payload. Enforce the wire bound while reading, before allocating it.
  const raw = await readBoundedPublicManifest(response, entry.bytes);
  return (await readPublicDeliveryJsonBytes(Buffer.from(raw, 'utf8'), entry, true)).value;
}

async function observeCancelledReplayBaseline({ head, consumerRunId, anchor }, { readPin, readPublic, readActive }) {
  const [publicManifest, current, active] = await Promise.all([readPublic(consumerRunId), readPin(), readActive()]);
  const publicManifestSha256 = sha256CanonicalJson(publicManifest);
  const saved = current.descriptor;
  assert.equal(cancelledReplayAnchor({ head, consumerRunId, publicManifestSha256,
    activeSha256: sha256CanonicalJson(active), pin: current.pin }), anchor,
    'PAGES_REPLAY_ANCHOR_MOVED');
  assert.equal(classifyOrdinaryPagesContinuation({ head, consumerRunId, publicManifest, publicManifestSha256, active, saved }).route,
    'unresolved', 'PAGES_REPLAY_EXPECTED_SAVED_AHEAD');
  return { publicManifest, current, active };
}

export async function verifyCancelledReplayContinuity({ head, consumerRunId, anchor, targetHour,
  restored, newLiveDirectory, readPin, readPublic, readActive, fetchPublic = fetch }) {
  const scope = { head, consumerRunId, anchor };
  const readers = { readPin, readPublic, readActive };
  const baseline = await observeCancelledReplayBaseline(scope, readers);
  const saved = baseline.current.descriptor;
  // Compare the actual restored generation, not a description requested by
  // the caller. The ordinary private no-loss check runs before this one.
  for (const key of ['datasetId', 'productionReferenceAt', 'generatedAt', 'bundleContentSha256', 'sourceHead']) {
    assert(typeof saved[key] === 'string' && saved[key].length > 0 && restored?.[key] === saved[key],
      'PAGES_REPLAY_RESTORED_GENERATION_MOVED');
  }
  const previous = baseline.publicManifest;
  const candidate = await jsonFile(path.join(newLiveDirectory, 'manifest.json'));
  const target = Date.parse(targetHour);
  assert(Number.isSafeInteger(target) && target % hour === 0
    && target > Date.parse(saved.productionReferenceAt) && target === Date.parse(candidate.productionReferenceAt)
    && candidate.datasetId !== saved.datasetId && candidate.datasetId !== previous.datasetId
    && candidate.complete === true && candidate.zoneCount === 210 && candidate.coastalPartCount === 673,
  'PAGES_REPLAY_TARGET_INVALID');
  const oldHours = publicDeliveryTransportEntries(previous).filter(entry => entry.kind === 'hour' && Date.parse(entry.key) >= target);
  const nextHours = new Map(publicDeliveryTransportEntries(candidate).filter(entry => entry.kind === 'hour')
    .map(entry => [entry.key, entry]));
  const bytes = oldHours.reduce((sum, entry) => sum + entry.bytes, 0);
  assert(bytes <= maximumPublicOverlapBytes
    && oldHours.every(entry => nextHours.has(entry.key)), 'PAGES_REPLAY_PUBLIC_OVERLAP_INVALID');
  const deadline = AbortSignal.timeout(150_000);
  const compareHour = async entry => {
    const currentEntry = nextHours.get(entry.key);
    const [oldDocument, current] = await Promise.all([
      fetchPublicHour(entry, AbortSignal.any([deadline, AbortSignal.timeout(15_000)]), fetchPublic),
      readPublicDeliveryJsonFile(path.join(newLiveDirectory, currentEntry.path), currentEntry, true),
    ]);
    assertPublicDeliveryDocument(oldDocument, previous, entry);
    assertPublicDeliveryDocument(current.value, candidate, currentEntry);
    const comparison = comparePublicWeatherHours(oldDocument, current.value, { time: entry.key,
      previousDatasetId: previous.datasetId, currentDatasetId: candidate.datasetId, partCount: 673 });
    assert(comparison.changedIdentities === 0 && Object.values(comparison.losses).every(count => count === 0),
      'PAGES_REPLAY_PUBLISHED_WEATHER_LOSS');
  };
  for (let index = 0; index < oldHours.length; index += 4) {
    await Promise.all(oldHours.slice(index, index + 4).map(compareHour));
  }
  assert.deepEqual(await observeCancelledReplayBaseline(scope, readers), baseline, 'PAGES_REPLAY_BASELINE_CHANGED_DURING_COMPARISON');
  return { comparedHours: oldHours.length, comparedPartHours: oldHours.length * 673, publicBytes: bytes };
}


function scopeFromEnv(env) {
  const consumerRunId = Number(env.GITHUB_RUN_ID);
  assert(env.GITHUB_REPOSITORY === 'jakobjorgensen82-commits/RavRadar' && env.GITHUB_REF === 'refs/heads/main'
    && env.GITHUB_WORKFLOW === 'Run current RavRadar weather once' && env.GITHUB_RUN_ATTEMPT === '1'
    && env.GITHUB_EVENT_NAME === 'workflow_dispatch' && env.GITHUB_ACTOR === 'github-actions[bot]'
    && env.GITHUB_TRIGGERING_ACTOR === 'github-actions[bot]' && env.RAVRADAR_PAGES_REPEAT_ACTION === 'integrated'
    && String(consumerRunId) === env.GITHUB_RUN_ID && sha.test(env.RAVRADAR_PAGES_REPEAT_ANCHOR ?? ''),
  'PAGES_REPLAY_WRITER_SCOPE');
  return { head: env.GITHUB_SHA, consumerRunId, anchor: env.RAVRADAR_PAGES_REPEAT_ANCHOR };
}

async function admitSavedPair(env, scope, readers, receiptPath) {
  const baseline = await observeCancelledReplayBaseline(scope, readers);
  const { descriptor, pin } = baseline.current;
  assert(Date.parse(env.RAVRADAR_PRODUCTION_TARGET_HOUR) > Date.parse(descriptor.productionReferenceAt),
    'PAGES_REPLAY_TARGET_INVALID');
  const checkpoint = await restoreProtectedRavScoreContinuationCheckpoint({
    targetReference: descriptor.productionReferenceAt,
  });
  assert(['protected-checkpoint-restored', 'protected-checkpoint-equivalent'].includes(checkpoint.reason),
    'PAGES_REPLAY_SAVED_CHECKPOINT_REQUIRED');
  const root = env.GITHUB_WORKSPACE;
  const temporary = env.RUNNER_TEMP;
  await admitCompletedPrivateRuntime({
    root,
    privateRoot: env.RAVRADAR_PRIVATE_RUNTIME_ROOT,
    bundle: env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE,
    currentPath: path.join(temporary, 'private-runtime-current-source.json'),
    restoredPath: path.join(temporary, 'private-runtime-restored-source.json'),
    expectedPath: path.join(root, '.cache/private-production-runtime-expected.json'),
    activeSource: baseline.active,
    checkpointPath: path.join(root, '.cache/ravscore-continuation-checkpoint/checkpoint.json'),
    receiptPath,
    target: descriptor.productionReferenceAt,
    head: scope.head,
    expectedPin: pin,
    readPin: readers.readPin,
  });
  assert.deepEqual(await observeCancelledReplayBaseline(scope, readers), baseline, 'PAGES_REPLAY_BASELINE_CHANGED_DURING_ADMISSION');
  console.log('PAGES_REPLAY_SAVED_PAIR_VERIFIED');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const env = process.env;
    const scope = scopeFromEnv(env);
    const readers = createOrdinaryPagesBaselineReaders();
    const receiptPath = path.join(env.RUNNER_TEMP, 'pages-cancelled-replay-saved-pair.json');
    if (process.argv[2] === 'admit') {
      await admitSavedPair(env, scope, readers, receiptPath);
    } else if (process.argv[2] === 'compare') {
      const receipt = await jsonFile(receiptPath);
      assert(receipt.kind === 'COMPLETED_PROTECTED_RUNTIME_ADMISSION' && receipt.consumerHead === scope.head,
        'PAGES_REPLAY_SAVED_PAIR_RECEIPT_REQUIRED');
      const result = await verifyCancelledReplayContinuity({
        ...scope, targetHour: env.RAVRADAR_PRODUCTION_TARGET_HOUR, newLiveDirectory: 'data/live',
        restored: receipt, ...readers,
      });
      console.log(JSON.stringify(result));
    } else {
      throw new Error('PAGES_REPLAY_COMMAND_INVALID');
    }
  } catch (error) {
    const reason = /^(PAGES_REPLAY|PAGES_SAVED)_[A-Z0-9_]+$/.test(error?.message ?? '')
      ? error.message : error?.completedRuntimeBoundary ? completedRuntimeFailureCode(error)
        : 'PAGES_REPLAY_PUBLIC_CONTINUITY_REFUSED';
    console.error(reason);
    process.exitCode = 1;
  }
}
