import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import {
  decideSourceGate,
  discoverPullRequestSourceGate,
  discoverMainSourceGate,
  inspectSourceProofRenewalMetadata,
  sourceGateRecord,
  SOURCE_GATE_CONTRACT,
} from './lib/weather-source-gate.mjs';
import {
  sourceTreeContentSha256,
  sourceTreeProofArtifactName,
} from './lib/source-tree-content.mjs';

const locatorPath = '.cache/weather-source-validation.json';
const pullRequestProofPath = '.cache/source-tree-content-proof.json';
const env = process.env;


function exactHead() {
  return execFileSync('git', ['rev-parse', 'HEAD^{commit}'], { encoding: 'utf8' }).trim();
}

async function writeJson(path, value) {
  await fs.mkdir('.cache', { recursive: true });
  await fs.writeFile(path, `${JSON.stringify(value)}\n`);
}

async function verifiedTargetedSourceProof(record, context, sourceTreeSha256, access) {
  try {
    const { decideTargetedSourceGate, discoverTargetedSourceGate } = await import('./source-targeted-consumer.mjs');
    const readGit = (args, options = {}) => execFileSync('git', args, {
      maxBuffer: 512 * 1024 * 1024, timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'], ...options,
      env: { ...process.env, GIT_NO_LAZY_FETCH: '1', GIT_NO_REPLACE_OBJECTS: '1',
        GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_COUNT: '1',
        GIT_CONFIG_KEY_0: 'protocol.allow', GIT_CONFIG_VALUE_0: 'never' },
    });
    let locator = ['weather-source-targeted-impact-v1', 'weather-source-targeted-domains-v2',
      'weather-source-current-contracts-v3','weather-source-current-change-v4'].includes(record?.contractId) ? record : null;
    let found;
    if (!locator) {
      found = await discoverTargetedSourceGate(context, sourceTreeSha256, { ...access, readGit });
      if (!found.locator || found.requiresVerification !== true)
        return { renewalState: ['MISSING','EXPIRED'].includes(found.frontierAvailability) ? found.frontierAvailability : 'UNPROVED' };
      locator = found.locator;
    }
    // Discovery is only a locator. One closed physical request/deadline budget
    // also covers verification and its historical FULL qualification.
    const decision = await decideTargetedSourceGate(locator, context, {
      ...access, readGit,
    });
    if (!decision.required) return { decision, record: locator };
    if (decision.reason !== 'targeted-source-proof-unavailable') return { decision, record: locator };
    found ??= await discoverTargetedSourceGate(context, sourceTreeSha256, { ...access, readGit });
    if (['MISSING','EXPIRED'].includes(found.frontierAvailability))
      return { decision, renewalState: found.frontierAvailability };
    if (!found.receipt || found.requiresVerification !== true) return { decision };
    const renewalState = await inspectSourceProofRenewalMetadata(
      found.receipt.baselineReference, context.GITHUB_REPOSITORY, access.getJson);
    return { decision, renewalState };
  } catch {
    return { decision: { required: true, reason: 'targeted-source-proof-unavailable' } };
  }
}

const mode = process.argv[2];
if (mode === 'digest' || mode === 'impact-digest') {
  const pullRequestNumber = Number(env.PULL_REQUEST_NUMBER);
  const expectedHead = env.SOURCE_GATE_HEAD_SHA;
  const headSha = exactHead();
  if (!Number.isSafeInteger(pullRequestNumber) || pullRequestNumber < 1
      || !/^[a-f0-9]{40}$/.test(expectedHead || '') || headSha !== expectedHead
      || env.GITHUB_EVENT_NAME !== 'pull_request') {
    throw new Error('Pull-request source proof is not bound to the exact checked-out head');
  }
  // The original digest remains offline. Only the reviewed CI entrance may
  // discover a baseline and execute the selected normal source targets.
  let impact = null;
  if (mode === 'impact-digest') {
    const { coordinateTargetedSourceProducer } = await import('./source-targeted-producer.mjs');
    impact = await coordinateTargetedSourceProducer();
  }
  if (impact?.selection === 'TARGETED') {
    if (impact.receiptPath !== '.cache/source-targeted-impact-proof.json') {
      throw new Error('Targeted source receipt destination differs from the fixed contract');
    }
    await fs.mkdir('.cache', { recursive: true });
    const cache = await fs.lstat('.cache');
    if (!cache.isDirectory() || cache.isSymbolicLink()) throw new Error('Source cache must be an owned directory');
    await fs.writeFile(impact.receiptPath, `${JSON.stringify(impact.receipt)}\n`, { flag: 'wx' });
    await fs.appendFile(env.GITHUB_OUTPUT,
      `selection=TARGETED\nsource_tree_sha256=${impact.sourceTreeSha256}\n`
      + `artifact_name=${impact.artifactName}\nreceipt_path=${impact.receiptPath}\n`);
    console.log(impact.receipt.schemaVersion === 4
      ? 'Created current-change receipt from a qualified change frontier or explicit cumulative target fallback; original PostgreSQL scope is unchanged.'
      : impact.receipt.schemaVersion === 3
      ? 'Created current-contract receipt; exact current targets passed; unchanged PostgreSQL inputs and historical execution are reported separately.'
      : impact.receipt.schemaVersion === 2
      ? 'Created separate domain receipt; exact command results are reported per domain; PostgreSQL and historical national execution are not claimed.'
      : 'Created separate targeted source receipt; database and national execution are not claimed.');
  } else {
    const reasonCode = mode === 'impact-digest' ? impact?.reasonCode : null;
    if (mode === 'impact-digest' && ![
      'COMPLETE_DIFF_REQUIRES_FULL', 'CUMULATIVE_DIFF_REQUIRES_FULL',
      'FULL_BASELINE_NOT_QUALIFIED', 'NO_QUALIFIED_FULL_ANCESTOR', 'TARGETED_PRECONDITION_UNAVAILABLE',
    ].includes(reasonCode)) throw new Error('Source impact FULL reason differs from the fixed contract');
    const sourceTreeSha256 = sourceTreeContentSha256('HEAD');
    const artifactName = sourceTreeProofArtifactName({
      pullRequestNumber,
      headSha,
      sourceTreeSha256,
    });
    await writeJson(pullRequestProofPath, {
      schemaVersion: 1,
      contractId: SOURCE_GATE_CONTRACT,
      repository: env.GITHUB_REPOSITORY,
      pullRequestNumber,
      headSha,
      sourceTreeSha256,
      privatePayloadIncluded: false,
    });
    await fs.appendFile(env.GITHUB_OUTPUT, `source_tree_sha256=${sourceTreeSha256}\nartifact_name=${artifactName}\n`
      + (mode === 'impact-digest' ? `selection=FULL\nreason_code=${reasonCode}\nreceipt_path=${pullRequestProofPath}\n` : ''));
    if (mode === 'impact-digest') console.log('SOURCE_IMPACT ' + JSON.stringify({selection: 'FULL', reason_code: reasonCode}));
    console.log('Created privacy-safe SHA-256 source-tree content proof.');
  }
} else if (mode === 'record') {
  if (exactHead() !== env.GITHUB_SHA) throw new Error('Source gate checkout differs from GITHUB_SHA');
  const sourceTreeSha256 = sourceTreeContentSha256('HEAD');
  const record = sourceGateRecord(env, env.SOURCE_GATE_OUTCOME, sourceTreeSha256);
  await writeJson(locatorPath, record);
} else if (mode === 'check') {
  // All discovery, verification, signed ZIP hops and final negative reads
  // share the existing physical 64-request/60-second source envelope.
  // Record/digest remain offline and do not require a GitHub token.
  const { sourceImpactEvidenceAccess } = await import('./native-postgres-evidence.mjs');
  const access = sourceImpactEvidenceAccess({ env });
  const githubJson = access.getJson;
  if (exactHead() !== env.GITHUB_SHA) throw new Error('Source proof checkout differs from GITHUB_SHA');
  const sourceTreeSha256 = sourceTreeContentSha256('HEAD');
  let record = null;
  try { record = JSON.parse(await fs.readFile(locatorPath, 'utf8')); } catch { /* discover or run gate */ }
  let renewalState = null;
  let decision = await decideSourceGate(record, env, githubJson, { sourceTreeSha256 });
  // These are absence/old-history outcomes, not actual source-red, identity
  // drift or unavailable transport. Every other refusal stays HOLD throughout
  // the fallback chain; a later locator miss cannot erase its cause.
  const mayLocate = value => value.required && [
    'missing-or-mismatched-proof', 'source-history-inspection-limit',
  ].includes(value.reason);
  // An unusable old locator is not authority to reuse or renew, but it must
  // not prevent an independent current dedicated proof from being qualified.
  // A dedicated miss preserves that old HOLD; known source-red/unresolved
  // never enters this fallback. The new proof uses the unchanged v2 reader.
  if (mayLocate(decision) || decision.reason === 'proof-verification-unavailable') {
    const main = await discoverMainSourceGate(env, sourceTreeSha256, githubJson);
    if (!main.required) {
      record = main.record;
      await writeJson(locatorPath, record);
      decision = { required: false, reason: main.reason, runId: main.runId };
    } else if (main.mainAvailability !== 'MISSING') {
      decision = { required: true, reason: main.reason };
    }
  }
  if (mayLocate(decision)) {
    const discovered = await discoverPullRequestSourceGate(env, sourceTreeSha256, githubJson);
    if (!discovered.required) {
      record = discovered.record;
      decision = await decideSourceGate(record, env, githubJson, { sourceTreeSha256 });
      if (!decision.required) await writeJson(locatorPath, record);
    } else {
      decision = discovered;
    }
  }
  if (decision.required && (mayLocate(decision)
      || decision.reason === 'matching-pull-request-source-proof-not-found')) {
    const targeted = await verifiedTargetedSourceProof(record, env, sourceTreeSha256, access);
    renewalState = targeted?.renewalState ?? null;
    if (targeted?.decision) {
      decision = targeted.decision;
      if (!decision.required) {
        record = targeted.record;
        await writeJson(locatorPath, record);
      }
    }
    if (decision.required && ['MISSING','EXPIRED'].includes(renewalState)
        && (!targeted?.decision || ['targeted-source-proof-unavailable',
          'source-history-inspection-limit'].includes(decision.reason))) {
      // Permission to RUN a new complete source validation, never permission
      // to reuse old evidence or dispatch weather. Only a real new FULL-PASS
      // can create the normal v2 record with its actual new run/proofTime.
      decision = { required: true, reason: 'source-proof-renewal-required' };
    }
  }
  await fs.appendFile(
    env.GITHUB_OUTPUT,
    `required=${decision.required}\nreason=${decision.reason}\nsource_tree_sha256=${sourceTreeSha256}\n`,
  );
  console.log(`Source gate: required=${decision.required}; reason=${decision.reason}`);
} else {
  throw new Error('Expected check, digest or record');
}
