import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectPublishedRawCurrentCaptureUnion } from './lib/committed-raw-current-capture-union.mjs';
import { rawRotationPairDigest } from './lib/raw-rotation-handoff.mjs';
import { verifySavedRawCaptureCoverage } from './lib/verify-saved-raw-capture-coverage.mjs';
import { readPublishedRawRotationInputs } from './read-published-raw-rotation-runtime.mjs';

const SHA256 = /^[a-f0-9]{64}$/;
const HEAD = /^[a-f0-9]{40}$/;
const RUN = /^[1-9][0-9]{0,19}$/;
const HOUR = /^\d{4}-\d\d-\d\dT\d\d:00:00Z$/;
const digest = data => createHash('sha256').update(data).digest('hex');

function requireProof(condition) {
  if (!condition) throw new Error('DMI_RAW_POST_PUBLISH_PROOF_REFUSED');
}

function validateSavedInventory(value) {
  requireProof(value && Object.keys(value).length === 2
    && Number.isSafeInteger(value.cacheId) && value.cacheId > 0
    && SHA256.test(value.inventorySha256 ?? ''));
  return value;
}

export function projectPostPublishSavedRawHandoff({ scope, plan, published, savedInventory, coverage }) {
  validateSavedInventory(savedInventory);
  const { runId, runAttempt, sourceHead, targetReferenceAt } = scope;
  const target = Date.parse(targetReferenceAt ?? '');
  requireProof(RUN.test(runId ?? '') && runAttempt === '1' && HEAD.test(sourceHead ?? '')
    && HOUR.test(targetReferenceAt ?? '') && Number.isFinite(target)
    && new Date(target).toISOString() === plan?.boundary?.productionReferenceAt
    && published?.bSourceHead === sourceHead
    && plan?.schemaVersion === 1 && plan.kind === 'PUBLISHED_ORDINARY_RAW_CAPTURE_UNION'
    && Array.isArray(plan.captures) && plan.captures.length <= 4096);
  requireProof(coverage && Object.keys(coverage).length === 4
    && coverage.cacheId === savedInventory.cacheId && coverage.inventorySha256 === savedInventory.inventorySha256
    && coverage.verifiedCaptureCount === plan.captures.length
    && coverage.capturePlanSha256 === digest(JSON.stringify(plan)));
  return {
    schemaVersion: 1, kind: 'DMI_RAW_SAVED_COVERAGE_HANDOFF_V1',
    runId, runAttempt, sourceHead, targetReferenceAt,
    savedCacheId: coverage.cacheId, inventorySha256: coverage.inventorySha256,
    capturePlanSha256: coverage.capturePlanSha256,
    protectedPairSha256: rawRotationPairDigest({ ...plan.boundary, ...published }),
    verifiedCaptureCount: coverage.verifiedCaptureCount,
  };
}

async function main(env) {
  const saved = env.RAW_SAVED_INVENTORY;
  requireProof(typeof saved === 'string' && Buffer.byteLength(saved) <= 256
    && path.isAbsolute(env.GITHUB_OUTPUT ?? '') && path.isAbsolute(env.RUNNER_TEMP ?? '')
    && await fs.realpath(env.RUNNER_TEMP) === env.RUNNER_TEMP);
  const savedInventory = validateSavedInventory(JSON.parse(saved));
  const view = await readPublishedRawRotationInputs();
  const plan = await collectPublishedRawCurrentCaptureUnion(view);
  const coverage = await verifySavedRawCaptureCoverage({ plan, savedInventory });
  const scope = { runId: env.GITHUB_RUN_ID, runAttempt: env.GITHUB_RUN_ATTEMPT,
    sourceHead: env.GITHUB_SHA, targetReferenceAt: env.RAVRADAR_PRODUCTION_TARGET_HOUR };
  const handoff = projectPostPublishSavedRawHandoff({ scope, plan, published: view.published, savedInventory, coverage });
  const bytes = Buffer.from(JSON.stringify(handoff));
  requireProof(bytes.length <= 1024);
  const directory = path.join(env.RUNNER_TEMP, 'ravradar-raw-after-publish');
  await fs.mkdir(directory, { mode: 0o700 });
  await fs.writeFile(path.join(directory, 'coverage.json'), bytes, { flag: 'wx', mode: 0o600 });
  await fs.appendFile(env.GITHUB_OUTPUT, 'raw_post_publish_proof=true\n');
  console.log('DMI_RAW_POST_PUBLISH_PROOF_COMPLETE');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    requireProof(process.argv.length === 2);
    await main(process.env);
  } catch (error) {
    const safe = /^(?:DMI_(?:SAVED_RAW|RAW_POST_PUBLISH)|RAW_(?:CAPTURE_UNION|ROTATION_PUBLISHED_PAIR))_[A-Z_]+$/;
    console.error(safe.test(error?.message ?? '') ? error.message : 'DMI_RAW_POST_PUBLISH_PROOF_REFUSED');
    process.exitCode = 2;
  }
}
