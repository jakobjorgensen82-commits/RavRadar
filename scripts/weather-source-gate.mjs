import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import {
  decideSourceGate,
  discoverPullRequestSourceGate,
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

async function githubJson(route) {
  const response = await fetch(`https://api.github.com${route}`, {
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('GitHub proof is unavailable');
  return response.json();
}

function exactHead() {
  return execFileSync('git', ['rev-parse', 'HEAD^{commit}'], { encoding: 'utf8' }).trim();
}

async function writeJson(path, value) {
  await fs.mkdir('.cache', { recursive: true });
  await fs.writeFile(path, `${JSON.stringify(value)}\n`);
}

async function verifiedTargetedSourceProof(record, context, sourceTreeSha256) {
  try {
    const { decideTargetedSourceGate, discoverTargetedSourceGate } = await import('./source-targeted-consumer.mjs');
    const { assistantPublic591Reader } = await import('./native-postgres-evidence.mjs');
    const reader = () => assistantPublic591Reader({ env: context });
    const readGit = (args, options = {}) => execFileSync('git', args, {
      maxBuffer: 512 * 1024 * 1024, timeout: 10000,
      stdio: ['ignore', 'pipe', 'pipe'], ...options,
      env: { ...process.env, GIT_NO_LAZY_FETCH: '1', GIT_NO_REPLACE_OBJECTS: '1',
        GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_COUNT: '1',
        GIT_CONFIG_KEY_0: 'protocol.allow', GIT_CONFIG_VALUE_0: 'never' },
    });
    let locator = record?.contractId === 'weather-source-targeted-impact-v1' ? record : null;
    if (!locator) {
      const get = reader();
      const found = await discoverTargetedSourceGate(context, sourceTreeSha256, {
        getJson: route => get(route), getArtifactZip: route => get(route, { zip: true }),
      });
      if (!found.locator || found.requiresVerification !== true) return null;
      locator = found.locator;
    }
    // Discovery is only a locator. Give the full consumer a fresh bounded
    // transport phase; never spend its deadline while discovering the proof.
    const get = reader();
    const decision = await decideTargetedSourceGate(locator, context, {
      getJson: route => get(route), getArtifactZip: route => get(route, { zip: true }), readGit,
    });
    return { decision, record: locator };
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
    console.log('Created separate targeted source receipt; database and national execution are not claimed.');
  } else {
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
      + (mode === 'impact-digest' ? `selection=FULL\nreceipt_path=${pullRequestProofPath}\n` : ''));
    console.log('Created privacy-safe SHA-256 source-tree content proof.');
  }
} else if (mode === 'record') {
  if (exactHead() !== env.GITHUB_SHA) throw new Error('Source gate checkout differs from GITHUB_SHA');
  const sourceTreeSha256 = sourceTreeContentSha256('HEAD');
  const record = sourceGateRecord(env, env.SOURCE_GATE_OUTCOME, sourceTreeSha256);
  await writeJson(locatorPath, record);
} else if (mode === 'check') {
  if (exactHead() !== env.GITHUB_SHA) throw new Error('Source proof checkout differs from GITHUB_SHA');
  const sourceTreeSha256 = sourceTreeContentSha256('HEAD');
  let record = null;
  try { record = JSON.parse(await fs.readFile(locatorPath, 'utf8')); } catch { /* discover or run gate */ }
  let decision = await decideSourceGate(record, env, githubJson, { sourceTreeSha256 });
  if (decision.required) {
    const discovered = await discoverPullRequestSourceGate(env, sourceTreeSha256, githubJson);
    if (!discovered.required) {
      record = discovered.record;
      await writeJson(locatorPath, record);
      decision = await decideSourceGate(record, env, githubJson, { sourceTreeSha256 });
    } else {
      decision = discovered;
    }
  }
  if (decision.required) {
    const targeted = await verifiedTargetedSourceProof(record, env, sourceTreeSha256);
    if (targeted) {
      decision = targeted.decision;
      if (!decision.required) {
        record = targeted.record;
        await writeJson(locatorPath, record);
      }
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
