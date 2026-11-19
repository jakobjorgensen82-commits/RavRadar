import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { buildRawSuccessorPlanBytes } from './lib/verified-raw-cache-rotation.mjs';
import { projectPublicRawRotationProof } from './lib/raw-rotation-handoff.mjs';
import { RAVSCORE_CURRENT_HISTORY_DEMAND_PATH } from './plan-ravscore-current-history.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = 'jakobjorgensen82-commits/RavRadar';
const WORKFLOW = REPO + '/.github/workflows/run-current-weather-once.yml@refs/heads/main';
const SHA256 = /^[a-f0-9]{64}$/;
const HEAD = /^[a-f0-9]{40}$/;
const NUM = /^[1-9][0-9]{0,19}$/;
const HOUR = /^\d{4}-\d\d-\d\dT\d\d:00:00Z$/;
const CACHE_KEY = /^dmi-grib-v4-Linux-\d{4}-W(?:0[1-9]|[1-4][0-9]|5[0-3])-[1-9][0-9]*-[1-9][0-9]*$/;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const flatDigest = value => digest(JSON.stringify(value, Object.keys(value).sort()));

function requireProof(ok) {
  if (!ok) throw new Error('RAW_BOOTSTRAP_PRE_DMI_PROOF_REFUSED');
}

// These are independent outputs minted by the already completed normal B/S
// reconciliation, never a digest minted by re-reading demand.rawRetention.
export function preparePreDmiRawSuccessorProof({ demand, pairedBaseline, identity, run, matchedKey }) {
  const boundary = demand?.rawRetention?.boundary;
  requireProof(pairedBaseline?.schemaVersion === 1 && pairedBaseline.kind === 'DMI_PAIRED_RAW_BASELINE_V1'
    && Object.keys(pairedBaseline).length === 6
    && typeof pairedBaseline.bSourceHead === 'string' && HEAD.test(pairedBaseline.bSourceHead)
    && typeof pairedBaseline.boundarySha256 === 'string' && SHA256.test(pairedBaseline.boundarySha256)
    && [pairedBaseline.bVersion, pairedBaseline.sVersion].every(version => Number.isSafeInteger(version) && version > 0)
    && boundary && flatDigest(boundary) === pairedBaseline.boundarySha256);
  requireProof(identity && Object.keys(identity).length === 3
    && Number.isSafeInteger(identity.id) && identity.id > 0
    && CACHE_KEY.test(matchedKey ?? '') && identity.key === matchedKey
    && typeof identity.version === 'string' && SHA256.test(identity.version)
    && NUM.test(run?.runId ?? '') && run.runAttempt === '1' && HEAD.test(run.sourceHead)
    && HOUR.test(run.targetReferenceAt));
  const planBytes = buildRawSuccessorPlanBytes({demand, targetReferenceAt: run.targetReferenceAt, boundary});
  const required = demand.rawRetention.captures.length;
  const expected = {
    schemaVersion: 1, kind: 'DMI_RESTORED_RAW_SUCCESSOR_COVERAGE_V1',
    ...run, cacheIdentitySha256: flatDigest(identity), baselineBoundarySha256: pairedBaseline.boundarySha256,
    planSha256: digest(planBytes), allRequiredVerified: true, requiredCaptures: required,
    protectedFiles: required, unavailableCaptures: 0,
  };
  return { planBytes, expected, boundary };
}

async function readJson(file, maximum) {
  const before = await fs.lstat(file, {bigint: true});
  requireProof(before.isFile() && !before.isSymbolicLink() && before.nlink === 1n
    && before.size > 0n && before.size <= BigInt(maximum));
  const bytes = await fs.readFile(file);
  const after = await fs.lstat(file, {bigint: true});
  requireProof(BigInt(bytes.length) === before.size
    && ['dev', 'ino', 'mode', 'size', 'mtimeNs', 'ctimeNs'].every(field => before[field] === after[field]));
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

async function main(env) {
  const run = { runId: env.GITHUB_RUN_ID, runAttempt: env.GITHUB_RUN_ATTEMPT, sourceHead: env.GITHUB_SHA,
    targetReferenceAt: env.RAVRADAR_PRODUCTION_TARGET_HOUR };
  requireProof(process.platform === 'linux' && env.GITHUB_ACTIONS === 'true' && env.RUNNER_ENVIRONMENT === 'github-hosted'
    && env.RAVRADAR_RAW_BOOTSTRAP_PROOF === 'observe' && env.GITHUB_REPOSITORY === REPO
    && env.GITHUB_WORKFLOW_REF === WORKFLOW && env.GITHUB_EVENT_NAME === 'workflow_dispatch'
    && env.GITHUB_REF === 'refs/heads/main' && env.GITHUB_ACTOR === 'github-actions[bot]'
    && env.GITHUB_TRIGGERING_ACTOR === 'github-actions[bot]' && run.runAttempt === '1'
    && env.RAW_NORMAL_PRE_DMI_STEPS_VERIFIED === 'true' && env.GITHUB_WORKSPACE === ROOT
    && env.OPERATIONAL_ACTION === 'integrated' && path.isAbsolute(env.RUNNER_TEMP ?? '')
    && path.isAbsolute(env.GITHUB_OUTPUT ?? ''));
  requireProof(execFileSync('git', ['rev-parse', 'HEAD^{commit}'], {cwd: ROOT, encoding: 'utf8'}).trim() === run.sourceHead
    && await fs.realpath(env.RUNNER_TEMP) === env.RUNNER_TEMP && await fs.realpath(ROOT) === ROOT
    && await fs.realpath(path.join(ROOT, '.cache')) === path.join(ROOT, '.cache'));
  const [pairedBaseline, demand, identity] = await Promise.all([
    readJson(path.join(env.RUNNER_TEMP, 'ravradar-raw-baseline-evidence.json'), 512),
    readJson(path.join(ROOT, RAVSCORE_CURRENT_HISTORY_DEMAND_PATH), 8 * 1024 * 1024),
    readJson(path.join(ROOT, '.cache/dmi-restored-raw-identity.json'), 512),
  ]);
  const { planBytes, expected, boundary } = preparePreDmiRawSuccessorProof({
    demand, pairedBaseline, identity, run, matchedKey: env.RAW_MATCHED_CACHE_KEY,
  });
  const work = path.join(env.RUNNER_TEMP, 'ravradar-raw-rotation');
  await fs.mkdir(work, {mode: 0o700});
  const planPath = path.join(work, 'successor-plan.json');
  await fs.writeFile(planPath, planBytes, {mode: 0o600, flag: 'wx'});
  const result = execFileSync('python3', ['-B', path.join(ROOT, 'scripts/prove-restored-raw-successor.py')], {
    cwd: ROOT, env: { ...env, RAVRADAR_RAW_SUCCESSOR_PLAN_SHA256: expected.planSha256 },
    timeout: 75_000, encoding: 'utf8', maxBuffer: 16 * 1024,
  });
  const coverage = JSON.parse(result);
  requireProof(isDeepStrictEqual(coverage, expected));
  // Keep the complete handoff in runner-private scratch. The job output is
  // only its digest and grants no deletion. A writer must authenticate this job and
  // reconfirm the same protected B/S, producer archive and reader/pin inventory.
  const output = Buffer.from(JSON.stringify({
    schemaVersion: 1, kind: 'DMI_RAW_BOOTSTRAP_PRE_DMI_HANDOFF_V1', pairedBaseline, boundary, coverage,
  }));
  const proofSha256 = digest(output);
  const handoff = projectPublicRawRotationProof(output, proofSha256);
  await fs.writeFile(path.join(work, 'proof.json'), output, {mode: 0o600, flag: 'wx'});
  await fs.writeFile(path.join(work, 'handoff.json'), JSON.stringify(handoff), {mode: 0o600, flag: 'wx'});
  await fs.appendFile(env.GITHUB_OUTPUT, 'raw_bootstrap_coverage_sha256=' + proofSha256 + '\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    requireProof(process.argv.length === 2);
    await main(process.env);
  } catch {
    console.error('RAW_BOOTSTRAP_PRE_DMI_PROOF_REFUSED');
    process.exitCode = 2;
  }
}
