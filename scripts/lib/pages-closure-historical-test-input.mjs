// TEST ONLY. Exact historical workflow inputs; no production/admission authority.
// Actual current caller tests read their raw workflow/action/CLI bytes separately.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {currentWorkflowTargets} from '../source-current-contract-plan.mjs';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
// One genuine pre-mail inventory for the older oracle. Never updated per PR.
const LEGACY_WORKFLOW_HEAD='56d53a3fcb33eae3e248ffda8ca5f262b2dfc876';
const LEGACY_WORKFLOW_TREE='c5507d6b43108b5b9855944a3f7e9b69f2d4f1de';
const childEnvironment=()=>Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','HOME','USERPROFILE',
  'TMPDIR','TEMP','TMP','COMSPEC','PATHEXT','LANG','LC_ALL','PYTHON']
  .filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]]));
// Pure planning only. The normal entry below independently reads the genuine
// inventory and physically executes each required current owner target.
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
  const git=(args,raw=false)=>{const bytes=execFileSync('git',['-C',ROOT,...args],{
    env:{...environment,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',
      GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_NOSYSTEM:'1',
      GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':'/dev/null',
      GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'protocol.allow',GIT_CONFIG_VALUE_0:'never'},
    timeout:10_000,maxBuffer:256*1024,stdio:['ignore','pipe','pipe']});
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
export function qualifyCurrentWorkflowInventory(){
  assert.equal(arguments.length,0,'No caller-selected workflow inventory, catalog or target runner');
  const {environment,legacy,blobs}=historicalWorkflowInventory(),changed=[];
  const directory=path.join(ROOT,'.github/workflows');
  const actual=fs.readdirSync(directory).filter(name=>/\.ya?ml$/i.test(name)).sort();
  for(const name of actual){
    const file=path.join(directory,name),stat=fs.lstatSync(file);assert(stat.isFile()&&!stat.isSymbolicLink());
    assert(stat.size>0&&stat.size<=2*1024*1024,'Bounded actual workflow');
    if(blobs.has(name)){
      const body=fs.readFileSync(file);
      // Exact Git blob identity only selects the current owner target; it is
      // neither a new snapshot pin nor evidence that any target has passed.
      const blob=crypto.createHash('sha1').update('blob '+body.length+'\0').update(body).digest('hex');
      if(blob!==blobs.get(name))changed.push(name);
    }
  }
  const plan=planCurrentWorkflowInventory(actual,legacy,changed),completed=new Set();
  for(const owner of plan.owners)for(const command of owner.commands){
    if(completed.has(command))continue;
    assert(/^node(?: --[a-z-]+)*(?: [A-Za-z0-9_./-]+\.mjs)+(?: --self-test)?$/.test(command));
    try{
      execFileSync(process.execPath,command.split(' ').slice(1),{cwd:ROOT,env:environment,
        timeout:120_000,maxBuffer:4*1024*1024,stdio:['ignore','pipe','pipe']});
    }catch{throw new Error('CURRENT_WORKFLOW_OWNER_TARGET_FAILED '+owner.area);}
    completed.add(command);
    console.log('Current workflow owner target completed: '+owner.area+' '+command);
  }
  return Object.freeze(plan.legacyNames);
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
