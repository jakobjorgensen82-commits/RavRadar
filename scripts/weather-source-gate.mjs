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

const mode = process.argv[2];
if (mode === 'digest') {
  const pullRequestNumber = Number(env.PULL_REQUEST_NUMBER);
  const expectedHead = env.SOURCE_GATE_HEAD_SHA;
  const headSha = exactHead();
  if (!Number.isSafeInteger(pullRequestNumber) || pullRequestNumber < 1
      || !/^[a-f0-9]{40}$/.test(expectedHead || '') || headSha !== expectedHead
      || env.GITHUB_EVENT_NAME !== 'pull_request') {
    throw new Error('Pull-request source proof is not bound to the exact checked-out head');
  }
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
  await fs.appendFile(env.GITHUB_OUTPUT, `source_tree_sha256=${sourceTreeSha256}\nartifact_name=${artifactName}\n`);
  console.log('Created privacy-safe SHA-256 source-tree content proof.');
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
