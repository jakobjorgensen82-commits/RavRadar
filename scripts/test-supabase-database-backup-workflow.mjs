import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {runHostedSupabaseBackup as run} from './run-hosted-supabase-backup.mjs';
const workflow=fs.readFileSync(new URL('../.github/workflows/backup-supabase-database.yml',import.meta.url),'utf8');
const realController=fs.readFileSync(new URL('./archive-supabase-database-backup.mjs',import.meta.url),'utf8');
const workflowName='Back up RavRadar Supabase database',captureConfirmation='CAPTURE-PRIVATE-SUPABASE-DATABASE-BACKUP';
function fixture(changed={},fault={}){
  const env={GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/main',GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'12345',GITHUB_ACTIONS:'true',
    GITHUB_REPOSITORY:'jakobjorgensen82-commits/RavRadar',GITHUB_WORKFLOW:workflowName,GITHUB_SHA:'a'.repeat(40),EXPECTED_HEAD_SHA:'a'.repeat(40),
    RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Linux',RUNNER_TEMP:'/runner/temp',PATH:'/normal/bin',HOME:'/ambient/home',
    SUPABASE_BACKUP_OPERATION:'bucket-readonly',SUPABASE_BACKUP_CONFIRMATION:'',SUPABASE_BACKUP_INDEX_SHA:'',
    SUPABASE_URL:'https://afqhhdrkjfjtpadntdzo.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic-existing-master-never-real',SUPABASE_ACCESS_TOKEN:'synthetic-supabase-access',SUPABASE_DB_PASSWORD:'synthetic-database-password',
    RAVRADAR_R2_ACCOUNT_ID:'b'.repeat(32),RAVRADAR_R2_ACCESS_KEY_ID:'synthetic-r2-access',RAVRADAR_R2_SECRET_ACCESS_KEY:'synthetic-r2-secret',CLOUDFLARE_API_TOKEN:'synthetic-cloudflare-token',
    GITHUB_TOKEN:'synthetic-source-token',TRIP_GATEWAY_SHARED_SECRET:'synthetic-unrelated-secret',...changed};
  const calls=[],bucketCalls=[],controllerCalls=[],dockerCalls=[],gitCalls=[],made=[];let clock=0;
  const modes=new Map([['/runner/temp',0o755],['/runner',0o755],['/',0o755]]);
  const fsImpl={realpathSync:value=>fault.realpath??value,lstatSync:value=>({isDirectory:()=>true,isSymbolicLink:()=>fault.symlink===value,mode:modes.get(value)??0o700,uid:fault.uid??1001}),
    existsSync:()=>false,mkdtempSync(prefix){const value=prefix+'owned';made.push(value);modes.set(value,0o700);return value;},chmodSync(value,mode){assert.equal(mode,0o700);modes.set(value,mode);},
    mkdirSync(value,options){assert.equal(options.mode,0o700);modes.set(value,options.mode);}};
  const proc={platform:fault.platform??'linux',versions:{node:fault.node??'24.19.0'},getuid:()=>1001,execPath:'/normal/node24'};
  const failure=(record)=>{const e=new Error('raw-private-error-never-log');e.stderr=record?Buffer.from(JSON.stringify(record)):Buffer.from('raw-private-error-never-log');throw e;};
  const execFileSyncImpl=(command,args,options)=>{
    calls.push({command,args:[...args],options});assert.equal(options.shell,false);assert.equal(options.windowsHide,true);assert.deepEqual(options.stdio,['ignore','pipe','pipe']);
    assert.ok(options.timeout>0&&options.timeout<=20*60_000);assert.equal(options.maxBuffer,65536);
    if(command==='git'){gitCalls.push({args,options});if(fault.gitUnavailable)failure();if(args[0]==='fetch')return Buffer.from('');
      return Buffer.from((fault.wrongMain||fault.changedAfterBucket&&bucketCalls.length?'c'.repeat(40):env.EXPECTED_HEAD_SHA)+'\n');}
    if(command==='docker'){dockerCalls.push({args,options});if(args[0]==='context')return Buffer.from(JSON.stringify(fault.remoteDocker?'tcp://remote.invalid:2375':'unix:///var/run/docker.sock'));
      assert.deepEqual(args,['info','--format','{{json .OSType}}']);return Buffer.from(JSON.stringify(fault.dockerOs??'linux'));}
    assert.equal(command,proc.execPath);
    if(args[0]==='scripts/provision-supabase-backup-bucket.mjs'){bucketCalls.push({args,options});
      if(fault.bucketDenied)failure({status:'FAILED_CLOSED',code:'R2_BUCKET_API_DENIED',httpStatus:403,detail:'raw-private-error-never-log'});
      if(fault.bucketUnknown)failure({status:'FAILED_CLOSED',code:'R2_BUCKET_CREATE_OUTCOME_UNKNOWN',writeOutcome:'UNKNOWN_NO_RETRY'});
      return Buffer.from(JSON.stringify({status:fault.bucketAbsent?'PRIVATE_EU_BUCKET_ABSENT':args[1]==='--create'?'PRIVATE_EU_BUCKET_CREATED_VERIFIED':'PRIVATE_EU_BUCKET_VERIFIED',
        bucket:'ravradar-supabase-backup',jurisdiction:'eu',managedPublicEnabled:false,customDomainCount:0,objectsUploaded:false,settingsChanged:false,
        postCount:args[1]==='--create'?1:0,writeOutcome:args[1]==='--create'?'CREATED':'NOT_STARTED'}));}
    assert.equal(args[0],'scripts/archive-supabase-database-backup.mjs');controllerCalls.push({args,options});
    if(fault.childFailure)failure(fault.childCode?{status:'FAILED_CLOSED',code:fault.childCode,externalDumpOutcome:fault.dumpOutcome??null,payload:'never-log-payload'}:null);
    const mode=args[1],selected=mode==='--bootstrap'&&args.length===3;
    const status=mode==='--capture'?'REMOTE_AUTHENTICATED_SQL_BYTE_ROUNDTRIP_ONLY':mode==='--discover'?'CENTRAL_DISCOVERY_AUTHENTICATED_SQL_BYTE_ROUNDTRIP_ONLY'
      :selected?'R2_BOOTSTRAP_AUTHENTICATED_SQL_BYTE_ROUNDTRIP_ONLY':'R2_BOOTSTRAP_AUTHENTICATED_INDEX_CANDIDATES_ONLY';
    assert.ok(realController.includes("'"+status+"'"),'receipt type exists in the exact unchanged real V3 caller');
    return Buffer.from(JSON.stringify({status,remoteArchiveVerified:mode!=='--bootstrap'||selected,centralLocatorVerified:mode!=='--bootstrap',archiveWrittenThisOperation:mode==='--capture',centralLocatorWrittenThisOperation:mode==='--capture',
      fullDatabaseBackupVerified:fault.falseAuthority??false,authRestoreVerified:false,freeReady:false,sourceAdmission:false,automaticRetry:false,
      ...(mode==='--capture'?{totalSqlBytes:5120,files:Array.from({length:5},()=>({sqlBytes:1024,cipherBytes:128,file:'never-log-file'}))}:{}),...(fault.captureBytes??{}),
      diagnostics:{listedObjects:6,unsupportedNamespaceObjects:0,objectsAboveIndexLimit:0,emptyObjects:0,eligibleNotInspected:0,nonIndexSqlFrames:5,legacyRequiresDbPointer:0,invalidOrUnsupported:fault.badDiagnostics?{'private-payload':1}:{}},
      indexSha256:fault.missingIndex||mode==='--bootstrap'&&!selected?undefined:'d'.repeat(64),candidates:mode==='--bootstrap'&&!selected?[{indexSha256:'d'.repeat(64),completedAt:'2026-11-02T12:00:00.000Z',privatePayload:'never-log-payload'}]:undefined,
      payload:'never-log-payload'}));
  };
  return{env,calls,bucketCalls,controllerCalls,dockerCalls,gitCalls,made,fault,invoke:(phase='execute')=>run({phase},{env,fsImpl,pathImpl:path.posix,processImpl:proc,execFileSyncImpl,now:()=>clock}),setClock:value=>{clock=value;}};
}
function captureEnv(){return{SUPABASE_BACKUP_OPERATION:'capture',SUPABASE_BACKUP_CONFIRMATION:captureConfirmation};}
function code(fn,wanted){assert.throws(fn,e=>e.code===wanted);}

test('hosted backup workflow: exact qualified lock/source order, readonly default and bounded early target before private access',()=>{
  assert.match(workflow,/workflow_dispatch:/);assert(!workflow.includes('schedule:'));assert.match(workflow,/default: bucket-readonly/);
  const outer=workflow.slice(workflow.indexOf('concurrency:'),workflow.indexOf('jobs:'));assert.match(outer,/group: ravradar-weather-production-v2\n  queue: max\n  cancel-in-progress: false/);
  assert.match(workflow,/group: ravradar-trip-storage-production\n      cancel-in-progress: false/);assert.equal((workflow.match(/cancel-in-progress: false/g)||[]).length,2);
  assert.match(workflow,/runs-on: ubuntu-latest/);assert.match(workflow,/timeout-minutes: 30/);assert.match(workflow,/node-version: 24/);
  assert.match(workflow,/contents: read\n  actions: read\n  pull-requests: read/);assert.match(workflow,/fetch-depth: 0/);
  assert.match(workflow,/run: node scripts\/weather-source-gate.mjs check/);assert.match(workflow,/run: test "\$\{\{ steps.source-proof.outputs.required \}\}" = false/);
  const source=workflow.indexOf('Reject missing source proof'),pre=workflow.indexOf('Check private bucket before capture-only CLI setup'),cli=workflow.indexOf('uses: supabase/setup-cli@3c2f5e2ae34c34e428e8e206e2c4d21fa2d20fbf'),execute=workflow.indexOf('Run only the fixed backup operation');
  assert(source<pre&&pre<cli&&cli<execute);assert(workflow.indexOf('node --test scripts/test-supabase-database-backup-workflow.mjs')<source);
  assert.match(workflow,/version: 2\.117\.0/);assert.equal((workflow.match(/if: inputs.operation == 'capture'/g)||[]).length,2);
  assert(!/upload-artifact|continue-on-error|always\(\)|\|\| true|^\s+container:|restore-to-prod|prune|monitor-trip-storage/m.test(workflow));
  assert.match(workflow,/inputs.operation == 'capture' && secrets.SUPABASE_DB_PASSWORD \|\| ''/);
  assert.match(workflow,/inputs.operation != 'bootstrap' && secrets.CLOUDFLARE_API_TOKEN \|\| ''/);
});
test('hosted backup caller: default execute only reads fixed bucket; exact403 has no CLI, SQL, Docker or archive call',()=>{
  const f=fixture();const r=f.invoke();assert.equal(r.status,'SUPABASE_BACKUP_BUCKET_OPERATION_COMPLETE');assert.equal(r.bucketCreatedThisOperation,false);
  assert.equal(f.bucketCalls.length,1);assert.deepEqual(f.bucketCalls[0].args,['scripts/provision-supabase-backup-bucket.mjs','--read-only']);assert.equal(f.controllerCalls.length,0);assert.equal(f.dockerCalls.length,0);assert.equal(f.made.length,0);
  const denied=fixture({}, {bucketDenied:true});assert.throws(()=>denied.invoke(),e=>e.code==='R2_BUCKET_API_DENIED'&&e.httpStatus===403&&!JSON.stringify(e).includes('raw-private'));
  assert.equal(denied.bucketCalls.length,1);assert.equal(denied.controllerCalls.length,0);assert.equal(denied.dockerCalls.length,0);
  const cap=fixture(captureEnv(),{bucketDenied:true});code(()=>cap.invoke('preflight'),'R2_BUCKET_API_DENIED');assert.equal(cap.controllerCalls.length,0);assert.equal(cap.dockerCalls.length,0);assert.equal(cap.made.length,0);
});
test('hosted backup caller: preflight is readonly and execute repeats private bucket checks before fixed V3 capture',()=>{
  const f=fixture(captureEnv()),pre=f.invoke('preflight');assert.equal(pre.status,'SUPABASE_BACKUP_READ_ONLY_PREFLIGHT_COMPLETE');assert.equal(f.controllerCalls.length,0);assert.equal(f.dockerCalls.length,0);
  const r=f.invoke();assert.equal(r.remoteArchiveVerified,true);assert.equal(r.centralLocatorVerified,true);assert.equal(r.archiveWrittenThisOperation,true);assert.equal(r.centralLocatorWrittenThisOperation,true);
  assert.equal(r.fullDatabaseBackupVerified,false);assert.equal(r.authRestoreVerified,false);assert.equal(r.freeReady,false);assert.ok(!JSON.stringify(r).includes('never-log'));
  assert.equal(f.bucketCalls.length,2);assert.equal(f.controllerCalls.length,1);assert.deepEqual(f.controllerCalls[0].args,['scripts/archive-supabase-database-backup.mjs','--capture']);
  f.fault.bucketDenied=true;code(()=>f.invoke(),'R2_BUCKET_API_DENIED');assert.equal(f.controllerCalls.length,1,'no controller replay after later failed prerequisites');
});
test('hosted backup caller: capture preserves only bounded SQL and cipher byte totals, never wire or egress claims',()=>{
  const basic=fixture(captureEnv()),reply=basic.invoke();
  assert.equal(reply.totalSqlBytes,5120);assert.equal(reply.totalCipherBytes,640);
  assert(!/never-log|files|sqlSha|cipherSha|wireBytes|egressBytes/.test(JSON.stringify(reply)));
  const maximum=fixture(captureEnv(),{captureBytes:{totalSqlBytes:2_000_000_000,
    files:Array.from({length:5},()=>({sqlBytes:400_000_000,cipherBytes:36_000_000}))}}).invoke();
  assert.equal(maximum.totalSqlBytes,2_000_000_000);assert.equal(maximum.totalCipherBytes,180_000_000);
  const minimum=fixture(captureEnv(),{captureBytes:{totalSqlBytes:5,
    files:Array.from({length:5},()=>({sqlBytes:1,cipherBytes:1}))}}).invoke();
  assert.equal(minimum.totalSqlBytes,5);assert.equal(minimum.totalCipherBytes,5);
  for(const mode of ['discover','bootstrap']){
    const other=fixture({SUPABASE_BACKUP_OPERATION:mode},{captureBytes:{totalSqlBytes:'never-log-bytes',files:['never-log-file']}}).invoke();
    assert.equal(Object.hasOwn(other,'totalSqlBytes'),false);assert.equal(Object.hasOwn(other,'totalCipherBytes'),false);
    assert(!JSON.stringify(other).includes('never-log'));
  }
});

test('hosted backup caller: malformed capture byte counts stop after one child without a replay or raw disclosure',()=>{
  const five=()=>Array.from({length:5},()=>({sqlBytes:1024,cipherBytes:128}));
  const invalid=[{totalSqlBytes:undefined},{totalSqlBytes:null},{totalSqlBytes:'5120'},{totalSqlBytes:0},
    {totalSqlBytes:-1},{totalSqlBytes:1.5},{totalSqlBytes:Number.MAX_SAFE_INTEGER+1},{totalSqlBytes:2_000_000_001},
    {totalSqlBytes:5121},{files:null},{files:{}},{files:five().slice(1)},{files:[...five(),five()[0]]},{files:[null,...five().slice(1)]}];
  for(const key of ['sqlBytes','cipherBytes'])for(const value of [null,'128',0,-1,1.5,Number.MAX_SAFE_INTEGER+1,
    key==='sqlBytes'?1_000_000_001:36_000_001]){
    const broken=five();broken[0][key]=value;invalid.push({files:broken});
  }
  for(const captureBytes of invalid){
    const once=fixture(captureEnv(),{captureBytes});
    assert.throws(()=>once.invoke(),error=>error.code==='SUPABASE_BACKUP_CAPTURE_BYTES'&&error.automaticRetry===false
      &&!/never-log|raw-private/.test(JSON.stringify(error)));
    assert.equal(once.controllerCalls.length,1);assert.equal(once.bucketCalls.length,1);
  }
});

test('hosted backup caller: fixed scope, host, Node24, attempt and confirmations refuse before private subprocess or filesystem work',()=>{
  for(const changed of [{GITHUB_REF:'refs/heads/topic'},{GITHUB_RUN_ATTEMPT:'2'},{GITHUB_EVENT_NAME:'schedule'},{GITHUB_REPOSITORY:'foreign/repo'},
    {GITHUB_WORKFLOW:'other'},{EXPECTED_HEAD_SHA:'c'.repeat(40)},{GITHUB_RUN_ID:'0'},{GITHUB_ACTIONS:'false'},{RUNNER_ENVIRONMENT:'self-hosted'},{RUNNER_OS:'Windows'},
    {SUPABASE_BACKUP_OPERATION:'capture; curl private.invalid'},{SUPABASE_BACKUP_OPERATION:'capture'},{SUPABASE_BACKUP_OPERATION:'bucket-create'},
    {SUPABASE_BACKUP_CONFIRMATION:'unexpected'},{SUPABASE_BACKUP_INDEX_SHA:'d'.repeat(64)},{SUPABASE_BACKUP_OPERATION:'bootstrap',SUPABASE_BACKUP_INDEX_SHA:'invalid'}]){
    const f=fixture(changed);assert.throws(()=>f.invoke());assert.equal(f.calls.length,0);assert.equal(f.made.length,0);}
  for(const fault of [{platform:'darwin'},{node:'22.0.0'}]){const f=fixture({},fault);code(()=>f.invoke(),'SUPABASE_BACKUP_HOSTED_VM');assert.equal(f.calls.length,0);}
});
test('hosted backup caller: wrong or unavailable actual main never reaches bucket or controller; drift is rechecked before Docker',()=>{
  for(const fault of [{wrongMain:true},{gitUnavailable:true}]){const f=fixture(captureEnv(),fault);assert.throws(()=>f.invoke());assert.equal(f.bucketCalls.length,0);assert.equal(f.controllerCalls.length,0);}
  const drift=fixture(captureEnv(),{changedAfterBucket:true});code(()=>drift.invoke(),'SUPABASE_BACKUP_MAIN_CHANGED');assert.equal(drift.bucketCalls.length,1);assert.equal(drift.dockerCalls.length,0);assert.equal(drift.controllerCalls.length,0);
});
test('hosted backup caller: Git, bucket, local Docker and archive each receive only their own credentials and actual context',()=>{
  const f=fixture(captureEnv());f.invoke();
  for(const c of f.gitCalls)for(const key of ['GITHUB_TOKEN','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_ACCESS_TOKEN','SUPABASE_DB_PASSWORD','CLOUDFLARE_API_TOKEN','RAVRADAR_R2_SECRET_ACCESS_KEY'])assert.equal(c.options.env[key],undefined);
  for(const c of f.bucketCalls){assert.equal(c.options.env.CLOUDFLARE_API_TOKEN,f.env.CLOUDFLARE_API_TOKEN);for(const key of ['GITHUB_TOKEN','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_ACCESS_TOKEN','SUPABASE_DB_PASSWORD','RAVRADAR_R2_ACCESS_KEY_ID','RAVRADAR_R2_SECRET_ACCESS_KEY'])assert.equal(c.options.env[key],undefined);}
  for(const c of f.dockerCalls){assert.equal(c.options.env.HOME,'/runner/temp/rr-supabase-backup-owned/home');assert.equal(c.options.cwd,'/runner/temp/rr-supabase-backup-owned');
    for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_CONFIG','CONTAINER_HOST','GITHUB_TOKEN','SUPABASE_DB_PASSWORD','SUPABASE_SERVICE_ROLE_KEY','CLOUDFLARE_API_TOKEN'])assert.equal(c.options.env[key],undefined);}
  const child=f.controllerCalls[0].options.env;for(const key of ['GITHUB_ACTIONS','RUNNER_ENVIRONMENT','RUNNER_OS','GITHUB_REPOSITORY','GITHUB_SHA','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','RUNNER_TEMP','SUPABASE_DB_PASSWORD'])assert.equal(child[key],f.env[key]);
  for(const key of ['GITHUB_TOKEN','CLOUDFLARE_API_TOKEN','TRIP_GATEWAY_SHARED_SECRET','DOCKER_HOST','DOCKER_CONTEXT'])assert.equal(child[key],undefined);
});
test('hosted backup caller: ambient/remote Docker, reparse/foreign temp and wrong private ownership stop before DB export',()=>{
  for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_CONFIG','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH','CONTAINER_HOST']){const f=fixture({...captureEnv(),[key]:'untrusted'});code(()=>f.invoke(),'SUPABASE_BACKUP_DOCKER_ENV');assert.equal(f.calls.length,0);}
  for(const fault of [{remoteDocker:true},{dockerOs:'windows'},{realpath:'/other/temp'},{symlink:'/runner/temp'},{uid:1002}]){const f=fixture(captureEnv(),fault);assert.throws(()=>f.invoke());assert.equal(f.controllerCalls.length,0);}
});
test('hosted backup caller: unknown bucket/capture writes or untyped child failures stop once without raw disclosure or failure archive',()=>{
  const bucket=fixture({SUPABASE_BACKUP_OPERATION:'bucket-create',SUPABASE_BACKUP_CONFIRMATION:'CREATE-PRIVATE-EU-SUPABASE-BACKUP-BUCKET'},{bucketUnknown:true});
  assert.throws(()=>bucket.invoke(),e=>e.code==='R2_BUCKET_CREATE_OUTCOME_UNKNOWN'&&e.writeOutcome==='UNKNOWN_NO_RETRY');assert.equal(bucket.bucketCalls.length,1);assert.equal(bucket.controllerCalls.length,0);
  for(const childCode of [null,'DB_BACKUP_WRITE_OUTCOME_UNKNOWN','SUPABASE_DB_EXPORT_FAILED']){const f=fixture(captureEnv(),{childFailure:true,childCode,dumpOutcome:'UNKNOWN'});
    assert.throws(()=>f.invoke(),e=>e.code===(childCode??'BACKUP_CAPTURE_OUTCOME_UNKNOWN')&&!JSON.stringify(e).includes('never-log')&&e.automaticRetry===false);assert.equal(f.controllerCalls.length,1);}
});
test('hosted backup caller: bootstrap preserves DB-independent read-only scope and explicit SHA; verified existing data is no new mutation',()=>{
  for(const selected of ['', 'd'.repeat(64)]){const f=fixture({SUPABASE_BACKUP_OPERATION:'bootstrap',SUPABASE_BACKUP_INDEX_SHA:selected});const r=f.invoke();
    assert.equal(f.bucketCalls.length,0);assert.equal(f.dockerCalls.length,0);assert.equal(f.controllerCalls.length,1);assert.equal(r.centralLocatorVerified,false);assert.equal(r.archiveWrittenThisOperation,false);assert.equal(r.centralLocatorWrittenThisOperation,false);
    assert.deepEqual(f.controllerCalls[0].args,['scripts/archive-supabase-database-backup.mjs','--bootstrap',...(selected?[selected]:[])]);
    for(const key of ['SUPABASE_URL','SUPABASE_ACCESS_TOKEN','SUPABASE_DB_PASSWORD','CLOUDFLARE_API_TOKEN','GITHUB_TOKEN'])assert.equal(f.controllerCalls[0].options.env[key],undefined);
    assert.equal(r.remoteArchiveVerified,!!selected);assert.equal(r.diagnostics.listedObjects,6);assert.equal(r.diagnostics.nonIndexSqlFrames,5);assert.ok(!JSON.stringify(r).includes('never-log'));}
  const f=fixture({SUPABASE_BACKUP_OPERATION:'discover'}),r=f.invoke();assert.equal(r.remoteArchiveVerified,true);assert.equal(r.centralLocatorVerified,true);assert.equal(r.archiveWrittenThisOperation,false);assert.equal(r.centralLocatorWrittenThisOperation,false);
});
test('hosted backup caller: no child boolean may upgrade transport evidence into Auth restore, full backup or FreeReady',()=>{
  const f=fixture(captureEnv(),{falseAuthority:true});code(()=>f.invoke(),'SUPABASE_BACKUP_CHILD_RECEIPT');assert.equal(f.controllerCalls.length,1);
});

// One explicit normal target includes the separately fixed bucket helper's whole retargeted cases.
import './test-supabase-backup-bucket.mjs';

test('hosted backup caller: missing index identity and unsafe bootstrap diagnostics are rejected instead of silently losing evidence',()=>{
  const capture=fixture(captureEnv(),{missingIndex:true});code(()=>capture.invoke(),'SUPABASE_BACKUP_CHILD_RECEIPT');
  const bootstrap=fixture({SUPABASE_BACKUP_OPERATION:'bootstrap'},{badDiagnostics:true});code(()=>bootstrap.invoke(),'SUPABASE_BACKUP_DIAGNOSTICS');
});
