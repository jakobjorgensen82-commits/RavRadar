// TEST ONLY. Exact historical workflow inputs; no production/admission authority.
// Actual current caller tests read their raw workflow/action/CLI bytes separately.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {currentWorkflowTargets} from '../source-current-contract-plan.mjs';
import * as ASSISTANT_WORKFLOW_SUCCESSORS from './assistant-later-h0-successor-source.mjs';
import * as SOURCE_WORKFLOW_PROVENANCE from '../check-assistant-later-h0-predecessor-source.mjs';
import * as HISTORICAL_WORKFLOW_REVIEW from './completed-private-runtime-workflow-review.mjs';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
// One genuine pre-mail inventory for the older oracle. Never updated per PR.
const LEGACY_WORKFLOW_HEAD='56d53a3fcb33eae3e248ffda8ca5f262b2dfc876';
const LEGACY_WORKFLOW_TREE='c5507d6b43108b5b9855944a3f7e9b69f2d4f1de';
// The introduction of these existing frames owns their original AFTER inputs.
// This fixed historical origin never classifies or qualifies a current head.
const PAGES_CLOSURE_ORIGINAL_HEAD='8c8aae9c74399680e4b11796e1ce51eeb37b668c';
const PAGES_CLOSURE_ORIGINAL_TREE='650d94972ba18c662cdc8f0a0ab820cc2f04c519';
const childEnvironment=()=>Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','HOME','USERPROFILE',
  'TMPDIR','TEMP','TMP','COMSPEC','PATHEXT','LANG','LC_ALL','PYTHON']
  .filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]]));

// Exact test-input projection, not a new workflow/head cohort or admission.
const AFTER598_BUILD_EDITS=Object.freeze([
  [
    "        if: steps.assistant-later-h0-source.outputs.required != 'true' && steps.preflight.outputs.should_run == 'true' && inputs.weather_state_epoch_bootstrap != true && inputs.weather_state_epoch_checkpoint_reentry != true && inputs.native_sampling_identity_original_recovery != true && inputs.checkpoint_only != true && inputs.quick_confirmation != true && inputs.completed_private_runtime != true && steps.operational-action.outputs.action == 'integrated'",
    "        if: steps.assistant-later-h0-source.outputs.required != 'true' && steps.preflight.outputs.should_run == 'true' && inputs.weather_state_epoch_bootstrap != true && inputs.weather_state_epoch_checkpoint_reentry != true && inputs.native_sampling_identity_original_recovery != true && inputs.checkpoint_only != true && inputs.quick_confirmation != true && inputs.completed_private_runtime != true && (steps.operational-action.outputs.action == 'integrated' || steps.operational-action.outputs.action == 'integrated-historical-maintenance')"
  ],
  [
    "          node scripts/reconcile-private-runtime-checkpoint.mjs select",
    "          if test \"$OPERATIONAL_ACTION\" = integrated-historical-maintenance; then\n            node scripts/reconcile-private-runtime-checkpoint.mjs select-after598\n          else\n            node scripts/reconcile-private-runtime-checkpoint.mjs select\n          fi"
  ],
  [
    "        if: steps.preflight.outputs.should_run == 'true' && inputs.weather_state_epoch_bootstrap != true && inputs.weather_state_epoch_checkpoint_reentry != true && inputs.native_sampling_identity_original_recovery != true && inputs.checkpoint_only != true && inputs.quick_confirmation != true && inputs.completed_private_runtime != true && steps.operational-action.outputs.action == 'integrated' && steps.paired-checkpoint-route.outputs.required == 'true'",
    "        if: steps.preflight.outputs.should_run == 'true' && inputs.weather_state_epoch_bootstrap != true && inputs.weather_state_epoch_checkpoint_reentry != true && inputs.native_sampling_identity_original_recovery != true && inputs.checkpoint_only != true && inputs.quick_confirmation != true && inputs.completed_private_runtime != true && (steps.operational-action.outputs.action == 'integrated' || steps.operational-action.outputs.action == 'integrated-historical-maintenance') && steps.paired-checkpoint-route.outputs.required == 'true'"
  ],
  [
    "          node scripts/reconcile-private-runtime-checkpoint.mjs reconcile",
    "          if test \"$OPERATIONAL_ACTION\" = integrated-historical-maintenance; then\n            node scripts/reconcile-private-runtime-checkpoint.mjs reconcile-after598\n          else\n            node scripts/reconcile-private-runtime-checkpoint.mjs reconcile\n          fi"
  ]
]);

const after598WorkflowSelected=()=>ASSISTANT_WORKFLOW_SUCCESSORS.ACTIVE_ASSISTANT_SUCCESSOR?.sourcePhase==='assistant-after598-successor';
export function inverseAssistantAfter598BuildTestInput(source){
  assert.equal(arguments.length,1);assert.equal(typeof source,'string');
  assert(after598WorkflowSelected(),'EXACT_AFTER598_WORKFLOW_PHASE');
  const profile=ASSISTANT_WORKFLOW_SUCCESSORS.INACTIVE_ASSISTANT_AFTER598_SUCCESSOR;
  assert(profile&&Object.isFrozen(profile),'ISSUED_AFTER598_WORKFLOW_PROFILE_REQUIRED');
  assert.equal(ASSISTANT_WORKFLOW_SUCCESSORS.ACTIVE_ASSISTANT_SUCCESSOR,profile,'EXACT_AFTER598_WORKFLOW_PROFILE');
  assert.equal(typeof SOURCE_WORKFLOW_PROVENANCE.assertSource598CodeSourceSelected,'function','ISSUED_AFTER598_CODE_GUARD_REQUIRED');
  const binding=profile.requireBinding(),output=profile.requireOutput();
  assert.equal(profile.requireRelease(),'4.0.599');
  const migration=fs.readFileSync(path.join(ROOT,'supabase/migrations',profile.migration().filename));
  assert.equal(sha(migration),output.migrationSha256,'Whole issued599 SQL before historical workflow projection');
  const pkg=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8'));
  const version=JSON.parse(fs.readFileSync(path.join(ROOT,'version.json'),'utf8'));
  assert.equal(pkg.version,version.version);assert.equal(version.releaseContract.releaseVersion,pkg.version);
  assert.match(pkg.version,/^4\.0\.[0-9]+$/);
  assert(Number(pkg.version.split('.').at(-1))>=599,'Application cannot precede the fixed issued599 model');
  assert.equal(version.releaseContract.modelBindings.integrated.modelBundleSha256,binding.I);
  assert.equal(version.releaseContract.modelBindings.candidateGRollback.modelBundleSha256,binding.C);
  // Exact current app metadata chooses only its five whole UA lines. A pure
  // app600 may retain model599; no arbitrary-version regexp rewrites source.
  const ua=release=>'          WEATHER_USER_AGENT: "RavRadar/'+release+' (${{ github.server_url }}/${{ github.repository }})"';
  const edits=[[ua('4.0.598'),ua(pkg.version),5],...AFTER598_BUILD_EDITS.map(([before,after])=>[before,after,1])];
  let previous=source;
  for(const [before,after,count]of edits){
    assert.equal(previous.split(after).length,count+1,'Exact current599 workflow hunk cardinality');
    previous=previous.replaceAll(after,before);
  }
  const selected=SOURCE_WORKFLOW_PROVENANCE.assertSource598CodeSourceSelected(),{git}=historicalWorkflowInventory();
  assert.equal(git(['rev-parse',selected.head+'^{tree}']).trim(),selected.tree);
  const authentic=git(['cat-file','blob',selected.head+':.github/workflows/reusable-weather-build.yml'],true,2*1024*1024);
  assert(Buffer.from(previous).equals(authentic),'Whole authentic CODE598 workflow survives the inverse');
  let roundtrip=previous;
  for(const [before,after,count]of edits){
    assert.equal(roundtrip.split(before).length,count+1,'Exact predecessor workflow hunk cardinality');
    roundtrip=roundtrip.replaceAll(before,after);
  }
  assert.equal(roundtrip,source,'Whole current workflow must be reconstructed');
  return previous;
}

// Pure catalog planning only; it does not execute or qualify current targets.
// The normal CURRENT producer/consumer owns actual changed-target execution.
// The legacy entry below reads only its authentic historical membership.
export function planCurrentWorkflowInventory(actualNames,legacyNames,changedNames=[]){
  assert(arguments.length===2||arguments.length===3);
  for(const names of [actualNames,legacyNames]){
    assert(Array.isArray(names)&&names.length>0&&names.length<=200);
    assert(names.every(name=>typeof name==='string'&&/^[A-Za-z0-9_.-]+\.ya?ml$/.test(name)));
    assert.equal(new Set(names).size,names.length,'Duplicate workflow names are not historical input');
  }
  const actual=new Set(actualNames),legacy=new Set(legacyNames),owners=new Map();
  assert(Array.isArray(changedNames)&&changedNames.length<=legacyNames.length);
  assert.equal(new Set(changedNames).size,changedNames.length,'Duplicate changed workflow names');
  assert(changedNames.every(name=>typeof name==='string'&&actual.has(name)&&legacy.has(name)),
    'Changed historical workflows must exist in both actual and original inventories');
  const changed=new Set(changedNames);
  assert(legacyNames.every(name=>actual.has(name)),'A genuine legacy workflow is missing');
  for(const name of actualNames.filter(name=>!legacy.has(name)||changed.has(name))){
    const target=currentWorkflowTargets('.github/workflows/'+name);
    assert(target?.owners.length,'Current workflow needs a declared owner and normal target');
    for(const owner of target.owners){
      assert(owner.commands.length>0);
      if(owners.has(owner.area))assert.deepEqual(owners.get(owner.area),owner.commands);
      else owners.set(owner.area,owner.commands);
    }
  }
  return {scope:'HISTORICAL_INVENTORY_PLANNING_ONLY',legacyNames:[...legacyNames].sort(),
    owners:[...owners].map(([area,commands])=>({area,commands:[...commands]}))};
}
function historicalWorkflowInventory(){
  const environment=childEnvironment();
  const git=(args,raw=false,maximumBytes=256*1024)=>{const bytes=execFileSync('git',['-C',ROOT,...args],{
    env:{...environment,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',
      GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_NOSYSTEM:'1',
      GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':'/dev/null',
      GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'protocol.allow',GIT_CONFIG_VALUE_0:'never'},
    timeout:10_000,maxBuffer:maximumBytes,stdio:['ignore','pipe','pipe']});
    return raw?bytes:bytes.toString('utf8');};
  assert.equal(git(['rev-parse',LEGACY_WORKFLOW_HEAD+':.github/workflows']).trim(),LEGACY_WORKFLOW_TREE);
  const rows=git(['ls-tree','-z',LEGACY_WORKFLOW_TREE]).split('\0').filter(Boolean);
  const blobs=new Map();
  const legacy=rows.map(row=>{
    const match=/^100644 blob ([a-f0-9]{40})\t([A-Za-z0-9_.-]+\.ya?ml)$/.exec(row);
    assert(match,'Genuine historical workflow must be a regular Git blob');
    blobs.set(match[2],match[1]);return match[2];
  });
  return {environment,git,legacy,blobs};
}
// Fixed authentic sources for older private-study oracles; never current authority.
export function readHistoricalPrivateStudySources(){
  assert.equal(arguments.length,0,'No caller-selected historical private-study source');
  const {git}=historicalWorkflowInventory();
  return Object.freeze(Object.fromEntries([
    ['workflow','.github/workflows/private-trip-weather-study.yml'],
    ['publisher','scripts/publish-private-trip-weather-study.mjs'],
    ['controller','scripts/deploy-private-trip-study.mjs'],
  ].map(([role,relative])=>{
    const row=git(['ls-tree','-z',LEGACY_WORKFLOW_HEAD,'--',relative]);
    const entry=/^100644 blob ([a-f0-9]{40})\t([^\0]+)\0$/.exec(row);
    assert(entry&&entry[2]===relative,'Original private-study source must be a regular fixed Git blob');
    const body=git(['cat-file','blob',entry[1]],true,128*1024);
    assert(body.length>0&&body.length<=128*1024,'Bounded original private-study source');
    return [role,body.toString('utf8')];
  })));
}

// The older oracle reads its own already-pinned inventory, never current bytes
// coerced into another successor. This reader grants no current qualification.
export function readHistoricalMaintenanceWorkflowSources(){
  assert.equal(arguments.length,0,'No caller-selected historical workflow origin');
  const {git,blobs}=historicalWorkflowInventory();
  return Object.freeze(Object.fromEntries(['backup-supabase-database.yml',
    'maintain-admin-document-history.yml','verify-supabase-cli-local-restore.yml'].map(name=>{
    assert(blobs.has(name),'Original maintenance workflow must exist');
    const body=git(['cat-file','blob',blobs.get(name)],true);
    assert(body.length>0&&body.length<=128*1024,'Bounded original maintenance workflow');
    return [name,body];
  })));
}
// One authentic original build for the older workflow oracle; never current authority.
export function readHistoricalBuildWorkflowSource(){
  assert.equal(arguments.length,0,'No caller-selected historical build source');
  const {git,blobs}=historicalWorkflowInventory(),name='reusable-weather-build.yml';
  assert(blobs.has(name),'Original build workflow must exist');
  const row=frames[aliases.build];
  const body=git(['cat-file','blob',blobs.get(name)],true,row.after.bytes+1);
  assert.equal(body.length,row.after.bytes,'Original build workflow size');
  assert.equal(sha(body),row.after.sha256,'Original build workflow identity');
  return body.toString('utf8');
}
// The RAW-retention oracle predates the Pages inventory and owns this existing base.
export function readHistoricalCurrentRawRetentionWorkflowSource(){
  assert.equal(arguments.length,0,'No caller-selected RAW-retention workflow origin');
  const review=JSON.parse(fs.readFileSync(path.join(ROOT,
    'scripts/lib/current-family-cold-start-workflow-review.json'),'utf8'));
  const {git}=historicalWorkflowInventory(),row=review.roles.build;
  const body=git(['cat-file','blob',review.baseHead+':'+row.relativePath],true,1024*1024);
  assert(body.length>0&&body.length<=1024*1024,'Bounded original RAW-retention workflow');
  assert.equal(sha(body),row.predecessorSha256,'Whole original RAW-retention workflow identity');
  return body.toString('utf8');
}
// The older stage-source oracle uses the same authentic inventory for BOTH
// workflow roles. Current caller checks continue reading their actual files.
export function readHistoricalCompletedStageWorkflowSources(){
  assert.equal(arguments.length,0,'No caller-selected historical stage source');
  const {git,blobs}=historicalWorkflowInventory(),name='run-current-weather-once.yml';
  assert(blobs.has(name),'Original once workflow must exist');
  const once=git(['cat-file','blob',blobs.get(name)],true);
  assert(once.length>0&&once.length<=128*1024,'Bounded original once workflow');
  return Object.freeze({build:readHistoricalBuildWorkflowSource(),once:once.toString('utf8')});
}
// Read the four original AFTER inputs, so the unchanged old projection and
// mutation oracles exercise their own frames instead of newer caller bytes.
export function readHistoricalPagesClosureWorkflowSources(){
  assert.equal(arguments.length,0,'No caller-selected Pages closure source');
  const {git}=historicalWorkflowInventory();
  assert.equal(git(['rev-parse',PAGES_CLOSURE_ORIGINAL_HEAD+'^{tree}']).trim(),PAGES_CLOSURE_ORIGINAL_TREE);
  return Object.freeze(Object.fromEntries(Object.entries(aliases).map(([role,relative])=>{
    const row=frames[relative];
    const body=role==='build'?Buffer.from(readHistoricalBuildWorkflowSource())
      :git(['cat-file','blob',PAGES_CLOSURE_ORIGINAL_HEAD+':'+relative],true,row.after.bytes+1);
    assert.equal(body.length,row.after.bytes,'Original Pages closure workflow size: '+role);
    assert.equal(sha(body),row.after.sha256,'Original Pages closure workflow identity: '+role);
    return [role,body.toString('utf8')];
  })));
}
// The old metadata/Pages repair oracle owns its original input, not current YAML.
export function readHistoricalRepairWorkflowSource(){
  assert.equal(arguments.length,0,'No caller-selected historical repair source');
  const inverse=HISTORICAL_WORKFLOW_REVIEW.inverseReviewedPagesArtifactMetadataCaller;
  const row=HISTORICAL_WORKFLOW_REVIEW.pagesPublicProjectionWorkflowReview?.roles?.repair;
  assert.equal(typeof inverse,'function','Original repair metadata inverse must exist');assert(row);
  const {git}=historicalWorkflowInventory();
  assert.equal(git(['rev-parse',PAGES_CLOSURE_ORIGINAL_HEAD+'^{tree}']).trim(),PAGES_CLOSURE_ORIGINAL_TREE);
  const relative='.github/workflows/deploy-code-only-repair.yml';
  const body=git(['cat-file','blob',PAGES_CLOSURE_ORIGINAL_HEAD+':'+relative],true,row.after.bytes+1).toString('utf8');
  const previous=inverse(body,'repair',relative);
  assert.notEqual(previous,body,'The original AFTER input must exercise its metadata inverse');
  assert.equal(Buffer.byteLength(previous),row.after.bytes,'Original repair predecessor size');
  assert.equal(sha(previous),row.after.sha256,'Whole original repair predecessor identity');
  return body;
}
// Source/CI only: compare current SQL safety frames with their authenticated original input.
// This is no workflow projection, runtime admission or new whole-file/hash cohort.
export function assertCurrentRepairSqlSecurityFrames(raw){
  assert.equal(arguments.length,1,'CURRENT_REPAIR_SQL_FRAME_ARGUMENTS');
  assert.equal(typeof raw,'string','CURRENT_REPAIR_SQL_FRAME_TYPE');
  assert(Buffer.byteLength(raw)>0&&Buffer.byteLength(raw)<=2*1024*1024,'CURRENT_REPAIR_SQL_FRAME_BOUND');
  const original=readHistoricalRepairWorkflowSource();
  const mutators=[
    'Apply exact dry-run-verified post-cutover binding',
    'Apply sole last-mile binding only after all new artifact checks',
    'Complete exact native-original binding after artifacts and fresh authentic originals',
    'Apply the sole new metadata binding after every artifact gate and fresh originals',
  ];
  const supporting=[
    'Reverify the same assistant originals before binding installation',
    'Dry-run and require only the latest exact integrated migration',
    'Reconfirm current main before the database binding write',
  ];
  const archiveCommands=[
    ['node scripts/update-weather.mjs','Build a new full public forecast through the normal provider-free updater'],
    ['npm run release:gate','Run production release gate on the actual newly calculated forecast'],
  ];
  const frames=source=>{
    const headings=[...source.matchAll(/^      - (?:name|uses): [^\n]+\n/gm)];
    return headings.map((heading,index)=>{
      const start=heading.index,end=index+1<headings.length?headings[index+1].index:source.length;
      return {name:/^      - name: ([^\n]+)/.exec(heading[0])?.[1],start,end,body:source.slice(start,end)};
    });
  };
  const actualFrames=frames(raw),originalFrames=frames(original),selected=[];
  for(const name of [...mutators,...supporting,...archiveCommands.map(([,name])=>name)]){
    const actual=actualFrames.filter(frame=>frame.name===name),expected=originalFrames.filter(frame=>frame.name===name);
    assert.equal(actual.length,1,'CURRENT_REPAIR_SQL_FRAME_UNIQUE');
    assert.equal(expected.length,1,'ORIGINAL_REPAIR_SQL_FRAME_UNIQUE');
    assert(actual[0].body===expected[0].body,'CURRENT_REPAIR_SQL_SECURITY_FRAME_CHANGED: '+name);
    selected.push({name,actual:actual[0],expected:expected[0]});
  }
  const prior=[...selected].sort((a,b)=>a.expected.start-b.expected.start);
  assert.deepEqual([...selected].sort((a,b)=>a.actual.start-b.actual.start).map(frame=>frame.name),
    prior.map(frame=>frame.name),'CURRENT_REPAIR_SQL_FRAME_ORDER');
  for(let index=1;index<prior.length;index++){
    if(prior[index-1].expected.end===prior[index].expected.start)
      assert.equal(prior[index-1].actual.end,prior[index].actual.start,'CURRENT_REPAIR_SQL_FRESH_MAIN_ADJACENCY');
  }
  for(const match of raw.matchAll(/\bsupabase[ \t]+db[ \t]+push\b/g)){
    const line=raw.slice(match.index).split('\n',1)[0];
    const readOnly=/^supabase db push --linked --dry-run --skip-vault(?=[ \t]*(?:\)|2>&1 \||\r?$))/.test(line);
    assert(readOnly||selected.some(frame=>mutators.includes(frame.name)&&match.index>=frame.actual.start
      &&match.index<frame.actual.end),'CURRENT_REPAIR_SQL_UNKNOWN_APPLY_ROLE');
  }
  const jobHeader=source=>{
    const marker='  build-code-only:\n';
    assert.equal(source.split(marker).length,2,'CURRENT_REPAIR_SQL_JOB_UNIQUE');
    const start=source.indexOf(marker),end=source.indexOf('    steps:\n',start);
    assert(end>start,'CURRENT_REPAIR_SQL_JOB_BOUNDARY');return source.slice(start,end);
  };
  for(const key of ['RAVRADAR_WEATHER_CACHE_ONLY','RAVRADAR_REQUIRE_PRIVATE_WEATHER_BASELINE']){
    const pattern=new RegExp('^      '+key+': [^\\n]+$','gm');
    const actual=jobHeader(raw).match(pattern)??[],expected=jobHeader(original).match(pattern)??[];
    assert.equal(actual.length,1,'CURRENT_REPAIR_PROVIDER_ENV_UNIQUE');
    assert.equal(expected.length,1,'ORIGINAL_REPAIR_PROVIDER_ENV_UNIQUE');
    assert.deepEqual(actual,expected,'CURRENT_REPAIR_PROVIDER_ENV_CHANGED');
  }
  for(const [command,name] of archiveCommands){
    const frame=selected.find(candidate=>candidate.name===name).actual;
    for(let at=raw.indexOf(command);at>=0;at=raw.indexOf(command,at+command.length))
      assert(at>=frame.start&&at<frame.end,'CURRENT_REPAIR_UNKNOWN_ARCHIVE_COMMAND_ROLE');
  }
}
// The old audit oracle owns the named original leaf in the existing inventory.
export function readHistoricalSavedWeatherAuditWorkflowSource(){
  assert.equal(arguments.length,0,'No caller-selected historical audit workflow origin');
  const {git,blobs}=historicalWorkflowInventory(),name='audit-saved-weather-inputs.yml';
  assert(blobs.has(name),'Original saved-weather audit workflow must exist');
  const body=git(['cat-file','blob',blobs.get(name)],true,128*1024);
  assert(body.length>0&&body.length<=128*1024,'Bounded original saved-weather audit workflow');
  return body.toString('utf8');
}
// Historical test data only. Current changed targets belong to the normal
// CURRENT producer/consumer, never a second global sweep from this old oracle.
export function qualifyCurrentWorkflowInventory(){
  assert.equal(arguments.length,0,'No caller-selected workflow inventory, catalog or target runner');
  const {legacy}=historicalWorkflowInventory();
  const directory=path.join(ROOT,'.github/workflows');
  const actual=fs.readdirSync(directory).filter(name=>/\.ya?ml$/i.test(name)).sort();
  assert(actual.length>0&&actual.length<=200,'Bounded current inventory shape');
  assert.equal(new Set(actual).size,actual.length,'Duplicate current workflow name');
  for(const name of actual){
    assert(/^[A-Za-z0-9_.-]+\.ya?ml$/.test(name),'Safe current workflow name');
    const file=path.join(directory,name),stat=fs.lstatSync(file);
    assert(stat.isFile()&&!stat.isSymbolicLink(),'Regular current workflow');
    assert(stat.size>0&&stat.size<=2*1024*1024,'Bounded actual workflow');
  }
  return Object.freeze([...legacy].sort());
}

const frames = {
  ".github/workflows/reusable-weather-build.yml": {
    "before": {
      "bytes": 303925,
      "sha256": "ed56abc4b55a1bbc3a22efd4a67f19a675f78547cd7f70d9a6a76aa47b9abecf"
    },
    "after": {
      "bytes": 304005,
      "sha256": "0204c3ab1312f2b41c085ce43d990bde06f96e2a0235584ba3a57d6685aa4690"
    },
    "inverse": [
      [
        268692,
        40,
        "94029cb8f71094002cd359d9bd77191a8ba34be1382b9b602dc31423781b51dc",
        ""
      ],
      [
        267865,
        40,
        "94029cb8f71094002cd359d9bd77191a8ba34be1382b9b602dc31423781b51dc",
        ""
      ]
    ]
  },
  ".github/workflows/reusable-pages-deploy.yml": {
    "before": {
      "bytes": 67578,
      "sha256": "0962368ac5efe85da0c1f24a62668f559a081823650253cdbb565fe2c489a465"
    },
    "after": {
      "bytes": 68640,
      "sha256": "f2fb0f94021701894dd96514c0318f809b394bef70ed7808b8b39882d8b006de"
    },
    "inverse": [
      [
        37827,
        130,
        "9a7597725a1a7aab080286af24457d738b9ecde41d0363b34829b6e494089230",
        ""
      ],
      [
        36650,
        722,
        "f7fe50d3338bffd557fb5eb77b23d13d329d8cbbe322c5bd2e2e38db44c2f833",
        ""
      ],
      [
        24456,
        203,
        "1c9261f4cadbcb20fddd370b8dc0377c61de7c4a60b2fb3ba24ca94d1b8ede3a",
        "            --deployment-id \"pages-$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT\" \\\n"
      ],
      [
        23489,
        40,
        "94029cb8f71094002cd359d9bd77191a8ba34be1382b9b602dc31423781b51dc",
        ""
      ],
      [
        22830,
        40,
        "94029cb8f71094002cd359d9bd77191a8ba34be1382b9b602dc31423781b51dc",
        ""
      ]
    ]
  },
  ".github/workflows/reusable-operational-reentry.yml": {
    "before": {
      "bytes": 102685,
      "sha256": "6228ec52b4901aa26f6fa29cda81826a5f8c3536441aba8d28e5c78473f19370"
    },
    "after": {
      "bytes": 104498,
      "sha256": "720a7d1d3f4f468b7b4befdb7f370d00514a3972ca549e9b6c7f3499aeb12a00"
    },
    "inverse": [
      [
        58372,
        537,
        "166cb6ee912bae5ac34790719dcaae111313de32374fc10590e989e0967fd8fd",
        ""
      ],
      [
        55964,
        124,
        "d47c310396e0c136e4aa62a00edb672c829866ef60064d6bc4f31221be8a6641",
        "          node scripts/ravscore-operational-pages-recovery.mjs --read-protected-prepared-target \\\n"
      ],
      [
        43614,
        196,
        "83e91335a337630baf18f4e87895ffcfc1fea842e38966f9d00a62433e89049b",
        "            test \"$recovery_action\" = PRE_ACTIVATION_RESUME\n"
      ],
      [
        43360,
        55,
        "995b363295d55f446bf09b59f957e5b6787d8cd0071dd1f0aea0d0dc75d7df18",
        ""
      ],
      [
        9999,
        211,
        "85afb81fe6dea985739ada47bb348296ba684788a7d9db11097d24ba43d75744",
        ""
      ],
      [
        9726,
        71,
        "0d206d46ca15049dfe773ea4b4bc925c3b2cc6419fe80879a3a364b0f7ec0bee",
        ""
      ],
      [
        9171,
        55,
        "995b363295d55f446bf09b59f957e5b6787d8cd0071dd1f0aea0d0dc75d7df18",
        ""
      ],
      [
        6273,
        722,
        "c052561358794eb1737d62b01379b9a7d4c625ef057bbde1633bcd3949e51ce0",
        ""
      ]
    ]
  },
  ".github/actions/deploy-ravradar-pages/action.yml": {
    "before": {
      "bytes": 1537,
      "sha256": "9e954ec600f629befc82a65c37fe21c90f4337b00abb43c9ce0d0cb462bfae20"
    },
    "after": {
      "bytes": 1834,
      "sha256": "cfa8db3446bb7a337bf8bbb48b296f338ce8b4793c63b2a36c23bcc4d042d347"
    },
    "inverse": [
      [
        1504,
        124,
        "084062686be03b42a25d401ca02ebb72df7f4178603122668be3a39f02ec737f",
        ""
      ],
      [
        1380,
        50,
        "23b123d4c861723b7adf97e5ce9dbac70451b6ad2752e9e69e7e1794420b6f26",
        "      # Midlertidigt inaktiv: den nye botrute har en uafklaret deployregression.\n      # Bevar koden, indtil rettelse og faktisk drift er verificeret.\n      if: ${{ false }}\n"
      ],
      [
        1100,
        50,
        "0e98e7305d0ab5c325a39fbbd98b358952567ff6530d22084a7b9c8f83d953ad",
        ""
      ],
      [
        366,
        261,
        "b01ea1b0e4dab63e68e0fbcbe6f0c0f56e635636330d4507fc94b74dd21effa7",
        ""
      ],
      [
        47,
        80,
        "fc724fd89b44c3584dc632636ebad1b56e93819e954dde82986bad7b07658e96",
        "description: Bruger den officielle Pages-rute; samme-job-genforsøg er midlertidigt inaktivt.\n"
      ]
    ]
  }
};
const aliases = Object.freeze({build:'.github/workflows/reusable-weather-build.yml',
  deploy:'.github/workflows/reusable-pages-deploy.yml',recovery:'.github/workflows/reusable-operational-reentry.yml',
  action:'.github/actions/deploy-ravradar-pages/action.yml'});
export function projectPagesClosureHistoricalTestInput(source, relative) {
  const selected = typeof relative === 'string' && Object.hasOwn(aliases, relative) ? aliases[relative]
    : typeof relative === 'string' && Object.hasOwn(frames, relative.slice(3)) && relative.startsWith('../') ? relative.slice(3) : relative;
  const row = typeof selected === 'string' && Object.hasOwn(frames, selected) ? frames[selected] : null;
  if (!row || typeof source !== 'string' || Buffer.byteLength(source) !== row.after.bytes
    || sha(source) !== row.after.sha256) return source;
  let bytes = Buffer.from(source);
  for (const [offset, length, afterSha256, original] of row.inverse) {
    assert.equal(sha(bytes.subarray(offset, offset + length)), afterSha256, 'PAGES_CLOSURE_TEST_EXACT_HUNK');
    bytes = Buffer.concat([bytes.subarray(0, offset), Buffer.from(original), bytes.subarray(offset + length)]);
  }
  assert.equal(bytes.length, row.before.bytes, 'PAGES_CLOSURE_TEST_EXACT_BEFORE_SIZE');
  assert.equal(sha(bytes), row.before.sha256, 'PAGES_CLOSURE_TEST_EXACT_BEFORE_SHA');
  return bytes.toString('utf8');
}
