import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import { execFileSync } from 'node:child_process';
import {
  decideSourceGate,
  discoverPullRequestSourceGate,
  sourceGateRecord,
  SOURCE_GATE_CONTRACT,assertSourceCodeBeforeHydrationWorkflow,assertSourceCodeBeforeSavedWeatherWorkflow,
  SOURCE_PR_NATIVE_CONTRACT,assertSourcePrNativeLocator,
} from './lib/weather-source-gate.mjs';
import {
  sourceTreeContentSha256,sourceTreeContentIdentity,assertSourceTreePhysicalIdentity,
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

const sourceProofGit = (args, options = {}) => execFileSync('git', args, {
      maxBuffer: 512 * 1024 * 1024, timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'], ...options,
      env: { ...process.env, GIT_NO_LAZY_FETCH: '1', GIT_NO_REPLACE_OBJECTS: '1',
        GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_COUNT: '1',
        GIT_CONFIG_KEY_0: 'protocol.allow', GIT_CONFIG_VALUE_0: 'never' },
    });

async function verifiedTargetedSourceProof(record, context, sourceTreeSha256) {
  try {
    const { decideTargetedSourceGate, discoverTargetedSourceGate } = await import('./source-targeted-consumer.mjs');
    const { sourceImpactEvidenceAccess } = await import('./native-postgres-evidence.mjs');
    const access = sourceImpactEvidenceAccess({ env: context });
    const readGit=sourceProofGit;
    let locator = ['weather-source-targeted-impact-v1', 'weather-source-targeted-domains-v2',
      'weather-source-current-contracts-v3','weather-source-current-change-v4',
      'RAVRADAR_SOURCE_AFTER598_PR_NATIVE_POSTGRES_PHASE_V1'].includes(record?.contractId) ? record : null;
    if (!locator) {
      const found = await discoverTargetedSourceGate(context, sourceTreeSha256, { ...access, readGit });
      if (!found.locator || found.requiresVerification !== true) return null;
      locator = found.locator;
    }
    // Discovery is only a locator. One closed physical request/deadline budget
    // also covers verification and its historical FULL qualification.
    const decision = await decideTargetedSourceGate(locator, context, {
      ...access, readGit,
    });
    return { decision, record: locator };
  } catch {
    return { decision: { required: true, reason: 'targeted-source-proof-unavailable' } };
  }
}

// Same sourcegate before the first private central read or hydration.
// A record is only data; entry also requires this exact command's genuine
// successful earlier step in the same live GitHub job.
async function qualifySourceBeforePrivate(placement){
  const metadataPath='scripts/lib/source-producer-after597-binding.generated.json';
  let metadata;
  try{metadata=JSON.parse(await fs.readFile(metadataPath,'utf8'));}
  catch(error){if(error?.code==='ENOENT')return {source:false};throw error;}
  const {assertSourceProducerAfter597DerivedMetadata}=await import('./lib/source-producer-after597-derived-metadata.mjs');
  assertSourceProducerAfter597DerivedMetadata(metadata);
  if(metadata.binding===null&&metadata.output===null)return {source:false};
  const family=await import('./lib/source-producer-after597-runtime-family.mjs');
  family.requireSourceProducerOutput();
  if(exactHead()!==env.GITHUB_SHA||env.GITHUB_REF!=='refs/heads/main'
    ||env.GITHUB_EVENT_NAME!=='workflow_dispatch'||!/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ATTEMPT??''))
    throw new Error('SOURCE_EARLY_EXACT_MAIN');
  if(sourceProofGit(['for-each-ref','refs/replace']).length!==0)
    throw new Error('SOURCE_EARLY_REPLACED_GIT');
  if(placement==='weather'){
    assertSourceCodeBeforeHydrationWorkflow(await fs.readFile('.github/workflows/reusable-weather-build.yml','utf8'));
  }else if(placement==='saved-weather'){
    assertSourceCodeBeforeSavedWeatherWorkflow(await fs.readFile('.github/workflows/deploy-code-only-repair.yml','utf8'));
  }else throw new Error('SOURCE_EARLY_FIXED_CALLER');
  const started=performance.now(),identity=sourceTreeContentIdentity('HEAD',{git:sourceProofGit});
  const physical=assertSourceTreePhysicalIdentity(identity,process.cwd());
  const targeted=await verifiedTargetedSourceProof(null,env,identity.sha256);
  if(!targeted || targeted.record?.contractId!==SOURCE_PR_NATIVE_CONTRACT
    ||targeted.decision?.required!==false||targeted.decision.scope!=='SOURCE_PR_NATIVE_TEST'
    ||targeted.decision.sourceAdmission!==false||targeted.decision.productionProof!==false)
    throw new Error('SOURCE_EARLY_TYPED_CI_REQUIRED');
  if(exactHead()!==env.GITHUB_SHA)throw new Error('SOURCE_EARLY_HEAD_CHANGED');
  assertSourcePrNativeLocator(targeted.record,env,identity.sha256);
  await writeJson(locatorPath,targeted.record);
  console.log('SOURCE_CODE_TIME '+JSON.stringify({files:physical.files,bytes:physical.bytes,
    physicalElapsedMs:physical.elapsedMs,totalElapsedMs:Math.round(performance.now()-started)}));
  return {source:true,files:physical.files,bytes:physical.bytes,sourceTreeSha256:identity.sha256,
    decision:targeted.decision};
}
export async function qualifySourceBeforeHydration(){
  if(arguments.length!==0)throw new Error('SOURCE_EARLY_FIXED_CALLER');
  return qualifySourceBeforePrivate('weather');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
const mode = process.argv[2];
if (mode === 'source-before-hydration') {
  await qualifySourceBeforeHydration();
} else if (mode === 'digest' || mode === 'impact-digest') {
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
    const { prepareSourceCurrentValidation } = await import('./source-first-issuance-contracts.mjs');
    impact = await prepareSourceCurrentValidation();
    if (!impact) impact = await coordinateTargetedSourceProducer();
  }
  if (['SOURCE_FIRST_ISSUANCE','SOURCE_CURRENT_UNCHANGED'].includes(impact?.selection)) {
    await fs.mkdir('.cache', { recursive: true });
    const owned = await fs.lstat('.cache');
    if (!owned.isDirectory() || owned.isSymbolicLink()) throw new Error('Source cache must be an owned directory');
    await fs.writeFile(impact.receiptPath, JSON.stringify(impact.proof)+'\n', {flag:'wx'});
    await fs.appendFile(env.GITHUB_OUTPUT, 'selection='+impact.selection+'\n'
      +'source_tree_sha256='+impact.current.sourceTreeSha256+'\n'
      +'artifact_name='+impact.artifactName+'\nreceipt_path='+impact.receiptPath+'\n');
    console.log('Source validation prepared; current contracts and actual Source native execution remain mandatory.');
  } else if (impact?.selection === 'TARGETED') {
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
} else if (mode === 'check' || mode === 'check-before-private') {
  const early=mode==='check-before-private'?await qualifySourceBeforePrivate('saved-weather'):{source:false};
  if(early.source){
    await fs.appendFile(env.GITHUB_OUTPUT,
      'required=false\nreason='+early.decision.reason+'\nsource_tree_sha256='+early.sourceTreeSha256+'\n');
    console.log('Source gate: required=false; reason='+early.decision.reason);
  }else{
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
  }
} else {
  throw new Error('Expected check, check-before-private, source-before-hydration, digest or record');
}

}
