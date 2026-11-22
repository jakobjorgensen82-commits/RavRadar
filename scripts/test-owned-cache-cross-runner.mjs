// Kun syntetisk cachebevis. Produktionsactionens adgang og nøgler ændres ikke.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {weatherComponentProgressCache} from './weather-component-progress-cache.mjs';

const SELF=fileURLToPath(import.meta.url),SOURCE=path.resolve(path.dirname(SELF),'..');
const WORKFLOW='.github/workflows/verify-synthetic-owned-cache-recovery.yml';
const MEMBER='.cache/weather-private-progress.encrypted';
const CONDITIONS='{"fixture":"owned-cache-recovery-v1"}\n';
const CURSOR='{"synthetic":true,"completed":7}\n';
// Offentlig prøvenøgle. Den bruges aldrig til produktionsdata.
const ENCRYPTION_KEY=Buffer.alloc(32,67).toString('base64');
const REPOSITORY='synthetic/owned-cache-recovery';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const BUNDLE=sha('synthetic-owned-cache-recovery-v1');
const oid=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);
const digest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const positive=value=>typeof value==='string'&&/^[1-9][0-9]*$/.test(value);
const hostKeys=['PATH','Path','HOME','USERPROFILE','SystemRoot','WINDIR','ComSpec','PATHEXT','TEMP','TMP','LANG','LC_ALL','LD_LIBRARY_PATH'];
function hostEnvironment(env=process.env){return Object.fromEntries(hostKeys.filter(key=>Object.hasOwn(env,key)).map(key=>[key,env[key]]));}
const gitEnvironment=()=>({...hostEnvironment(),GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0'});
function context(env=process.env,platform=process.platform,nodeMajor=process.versions.node.split('.')[0]){
  assert.equal(platform,'linux');assert.equal(nodeMajor,'24');
  assert.equal(env.GITHUB_ACTIONS,'true');assert.equal(env.GITHUB_EVENT_NAME,'workflow_dispatch');
  assert.equal(env.GITHUB_REF,'refs/heads/main');assert.equal(env.RUNNER_OS,'Linux');
  assert(oid(env.GITHUB_SHA)&&env.EXPECTED_MAIN_HEAD===env.GITHUB_SHA);
  assert(positive(env.GITHUB_RUN_ID)&&positive(env.GITHUB_RUN_ATTEMPT));
  assert(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(env.GITHUB_REPOSITORY||''));
  assert.equal(env.GITHUB_WORKFLOW_REF,env.GITHUB_REPOSITORY+'/'+WORKFLOW+'@refs/heads/main');
  assert(['produce','restore'].includes(env.GITHUB_JOB));
  return {repository:env.GITHUB_REPOSITORY,head:env.GITHUB_SHA,runId:env.GITHUB_RUN_ID,
    attempt:env.GITHUB_RUN_ATTEMPT,key:`ravradar-synthetic-owned-progress-v1-Linux-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}-${env.GITHUB_SHA}`};
}
function bootDigest(){const boot=fs.readFileSync('/proc/sys/kernel/random/boot_id','ascii').trim();assert(/^[a-f0-9-]{36}$/.test(boot));return sha(boot);}
function exactJson(file){const stat=fs.lstatSync(file);assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1&&stat.size<=8192);return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,value){fs.writeFileSync(file,JSON.stringify(value)+'\n',{flag:'wx',mode:0o600});}
function validateProducer(value,current,currentBoot){
  assert.deepEqual(Object.keys(value).sort(),['schemaVersion','kind','repository','head','runId','attempt','key',
    'producerBootSha256','cipherSha256','cipherBytes','sdkVersion','sdkFinalizeAcknowledged',
    'callerReceipt','workerClosed','fault'].sort());
  assert.equal(value.schemaVersion,1);assert.equal(value.kind,'SYNTHETIC_CACHE_CALLER_RECEIPT_LOSS_V1');
  for(const key of ['repository','head','runId','attempt','key'])assert.equal(value[key],current[key]);
  assert(digest(value.producerBootSha256)&&digest(value.cipherSha256));
  assert.notEqual(value.producerBootSha256,currentBoot,'A different Linux boot is required');
  assert(Number.isSafeInteger(value.cipherBytes)&&value.cipherBytes>0&&value.cipherBytes<=1024*1024);
  assert.equal(value.sdkVersion,'6.1.0');assert.equal(value.sdkFinalizeAcknowledged,true);
  assert.equal(value.callerReceipt,false);assert.equal(value.workerClosed,true);
  assert.equal(value.fault,'SDK_RESULT_HELD_BEFORE_CALLER_RECEIPT');
  return value;
}
async function prepareRoot(root){
  await fsp.mkdir(root,{mode:0o700});await fsp.mkdir(path.join(root,'data/live'),{recursive:true,mode:0o700});
  await fsp.writeFile(path.join(root,'data/live/conditions.json'),CONDITIONS,{flag:'wx',mode:0o600});
  const basePath=path.join(root,'base.json');
  const captured=await weatherComponentProgressCache({mode:'capture-base',repositoryRoot:root,basePath,
    repository:REPOSITORY,protectedBundleSha256:BUNDLE});
  assert.equal(captured.captured,true);return basePath;
}
async function seal(root,basePath){
  await fsp.mkdir(path.join(root,'.cache'),{mode:0o700});
  await fsp.writeFile(path.join(root,'.cache/weather-component-fallback-cursor.json'),CURSOR,{flag:'wx',mode:0o600});
  const saved=await weatherComponentProgressCache({mode:'save',repositoryRoot:root,basePath,
    repository:REPOSITORY,encryptionKey:ENCRYPTION_KEY});
  assert.equal(saved.saved,true);const bytes=await fsp.readFile(path.join(root,MEMBER));
  assert(bytes.length<=1024*1024);return {cipherSha256:sha(bytes),cipherBytes:bytes.length};
}
async function authenticatedRestore(root,basePath){
  const result=await weatherComponentProgressCache({mode:'restore',repositoryRoot:root,basePath,
    repository:REPOSITORY,encryptionKey:ENCRYPTION_KEY});
  assert.equal(result.restored,true);
  assert.equal(await fsp.readFile(path.join(root,'.cache/weather-component-fallback-cursor.json'),'utf8'),CURSOR);
  assert.equal(await fsp.readFile(path.join(root,'data/live/conditions.json'),'utf8'),CONDITIONS);
}
// Det offentlige SDK-resultat er set af fejlinjektoren, men returneres aldrig
// til kaldersiden. Dette er ikke tab af HTTP-svaret inde i SDK'et.
export async function holdCommittedReturn(save,observe){
  const id=await save();assert(Number.isSafeInteger(id)&&id>0);
  observe();await new Promise(()=>{});
}

// Genbrug de eksisterende native pidfd-/identitetslæsere. Ingen PID-signaler
// uden et tilbageholdt kernel-handle, og ingen API-/SDK-output i jobloggen.
const CONTROLLER=String.raw`
import importlib.util,json,os,select,signal,subprocess,sys,time
node,entry,role,root,native=sys.argv[1:]
spec=importlib.util.spec_from_file_location('owned_native_fixture',native)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
readfd,writefd=os.pipe();startfd,releasefd=os.pipe()
env=dict(os.environ,FIXTURE_REPORT_FD=str(writefd),FIXTURE_START_FD=str(startfd))
owner=os.getpid()
def own_child():
    libc=m.ctypes.CDLL(None,use_errno=True)
    if libc.prctl(1,signal.SIGKILL,0,0,0)!=0 or os.getppid()!=owner:os._exit(125)
p=subprocess.Popen([node,entry,'--sdk-'+role,root],cwd=root,env=env,
    stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,
    pass_fds=(writefd,startfd),start_new_session=True,preexec_fn=own_child)
os.close(writefd);os.close(startfd);fd=None
try:
    fd=m.retain_pidfd(p.pid);expected=m.identity(p.pid)
    assert expected['ppid']==os.getpid() and expected['pgid']==p.pid and expected['sid']==p.pid
    os.write(releasefd,b'1');os.close(releasefd);releasefd=None
    deadline=time.monotonic()+180;raw=b''
    while b'\n' not in raw:
        assert time.monotonic()<deadline,'OWN_WORKER_DID_NOT_REPORT'
        if select.select([readfd],[],[],0.05)[0]:
            chunk=os.read(readfd,4097-len(raw));assert chunk
            raw+=chunk;assert len(raw)<=4096
        else:assert not m.exited(fd),'OWN_WORKER_DID_NOT_REPORT'
    assert raw.endswith(b'\n') and raw.count(b'\n')==1
    value=json.loads(raw);assert set(value)=={'kind','noChildren'} and value['noChildren'] is True
    if role=='save':
        assert value['kind']=='SDK_COMMIT_RESULT_HELD' and m.identity(p.pid)==expected
        signal.pidfd_send_signal(fd,signal.SIGKILL)
        assert m.exited(fd,2) and p.wait(timeout=2)==-signal.SIGKILL
    else:
        assert value['kind']=='SDK_RESTORE_AUTHENTICATED'
        assert m.exited(fd,2) and p.wait(timeout=2)==0
    print(json.dumps({'kind':value['kind'],'workerClosed':True}))
finally:
    if fd is not None:
        if not m.exited(fd):signal.pidfd_send_signal(fd,signal.SIGKILL)
        assert m.exited(fd,2);p.wait(timeout=2);os.close(fd)
    if releasefd is not None:
        os.close(releasefd);p.wait(timeout=2)
    os.close(readfd)
`;
function noChildren(){
  for(const task of fs.readdirSync('/proc/self/task')){
    const value=fs.readFileSync('/proc/self/task/'+task+'/children','ascii').trim();assert.equal(value,'');
  }
  return true;
}
function sdkEnvironment(root){
  const env=hostEnvironment();
  for(const key of ['ACTIONS_RUNTIME_TOKEN','ACTIONS_RESULTS_URL','ACTIONS_CACHE_SERVICE_V2']){
    assert(typeof process.env[key]==='string'&&process.env[key].length>0);env[key]=process.env[key];
  }
  for(const key of ['GITHUB_ACTIONS','GITHUB_EVENT_NAME','GITHUB_REF','RUNNER_OS','GITHUB_SHA','EXPECTED_MAIN_HEAD',
    'GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','GITHUB_REPOSITORY','GITHUB_WORKFLOW_REF','GITHUB_JOB','RUNNER_TEMP'])env[key]=process.env[key];
  env.GITHUB_WORKSPACE=root;env.PYTHONDONTWRITEBYTECODE='1';return env;
}
function runWorker(role,root){
  const raw=execFileSync('python3',['-B','-c',CONTROLLER,process.execPath,SELF,role,root,
    path.join(SOURCE,'scripts/test-owned-dmi-grib-save-native.py')],{
    env:sdkEnvironment(root),timeout:190000,maxBuffer:8192,stdio:['ignore','pipe','ignore']});
  const value=JSON.parse(raw.toString('utf8'));
  assert.deepEqual(value,{kind:role==='save'?'SDK_COMMIT_RESULT_HELD':'SDK_RESTORE_AUTHENTICATED',workerClosed:true});
}
async function sdkWorker(role,root){
  const start=Number(process.env.FIXTURE_START_FD);assert(Number.isSafeInteger(start)&&start>2);
  const gate=Buffer.alloc(1);assert.equal(fs.readSync(start,gate,0,1,null),1);fs.closeSync(start);assert.equal(gate[0],49);
  const current=context();assert.equal(process.env.GITHUB_WORKSPACE,root);
  assert.equal(fs.realpathSync(root),root);assert.equal(process.cwd(),root);
  assert.equal(path.basename(root),role==='save'?'produce':'restore');
  const action=path.join(SOURCE,'.github/actions/save-owned-dmi-grib');
  const metadata=exactJson(path.join(action,'node_modules/@actions/cache/package.json'));
  assert.equal(metadata.name,'@actions/cache');assert.equal(metadata.version,'6.1.0');
  const api=await import(pathToFileURL(path.join(action,'node_modules/@actions/cache/lib/cache.js')));
  const report=kind=>{const fd=Number(process.env.FIXTURE_REPORT_FD);assert(Number.isSafeInteger(fd)&&fd>2);
    fs.writeSync(fd,JSON.stringify({kind,noChildren:noChildren()})+'\n');};
  if(role==='save'){
    const keepAlive=setInterval(()=>{},1000);
    await holdCommittedReturn(()=>api.saveCache([MEMBER],current.key),()=>report('SDK_COMMIT_RESULT_HELD'));
    clearInterval(keepAlive);throw new Error('CALLER_RECEIPT_MUST_NOT_BE_REACHED');
  }
  assert.equal(await api.restoreCache([MEMBER],current.key,[],undefined,false),current.key);
  const receipt=validateProducer(exactJson(path.join(root,'producer.json')),current,bootDigest());
  const bytes=fs.readFileSync(path.join(root,MEMBER));
  assert.equal(bytes.length,receipt.cipherBytes);assert.equal(sha(bytes),receipt.cipherSha256);
  await authenticatedRestore(root,path.join(root,'base.json'));report('SDK_RESTORE_AUTHENTICATED');
}

export async function runHostedCacheRecoveryFixture(role){
  assert(['produce','restore'].includes(role));const current=context();assert.equal(process.env.GITHUB_JOB,role);
  assert.equal(fs.realpathSync(process.env.GITHUB_WORKSPACE),fs.realpathSync(SOURCE));
  assert.equal(execFileSync('git',['-c','protocol.allow=never','-C',SOURCE,'rev-parse','HEAD'],
    {env:gitEnvironment(),encoding:'utf8'}).trim(),current.head);
  assert.equal(execFileSync('git',['-c','protocol.allow=never','-C',SOURCE,'status','--porcelain','--untracked-files=no'],
    {env:gitEnvironment(),encoding:'utf8'}).trim(),'');
  const temp=fs.realpathSync(process.env.RUNNER_TEMP);assert.equal(temp,path.resolve(process.env.RUNNER_TEMP));
  const parent=path.join(temp,`ravradar-synthetic-cache-${current.runId}-${current.attempt}`);
  fs.mkdirSync(parent,{mode:0o700});const root=path.join(parent,role);
  const base=await prepareRoot(root),boot=bootDigest();
  const output=path.join(temp,'ravradar-synthetic-cache-proof');
  fs.mkdirSync(output,{mode:0o700});
  if(role==='produce'){
    const cipher=await seal(root,base);runWorker('save',root);
    writeJson(path.join(output,'producer.json'),{schemaVersion:1,kind:'SYNTHETIC_CACHE_CALLER_RECEIPT_LOSS_V1',
      ...current,producerBootSha256:boot,...cipher,sdkVersion:'6.1.0',sdkFinalizeAcknowledged:true,
      callerReceipt:false,workerClosed:true,fault:'SDK_RESULT_HELD_BEFORE_CALLER_RECEIPT'});
  }else{
    const receipt=validateProducer(exactJson(path.join(temp,'ravradar-synthetic-cache-received','producer.json')),current,boot);
    writeJson(path.join(root,'producer.json'),receipt);runWorker('restore',root);
    writeJson(path.join(output,'restore.json'),{schemaVersion:1,kind:'SYNTHETIC_CACHE_SEPARATE_BOOT_RESTORE_V1',
      ...current,producerBootSha256:receipt.producerBootSha256,consumerBootSha256:boot,
      cipherSha256:receipt.cipherSha256,cipherBytes:receipt.cipherBytes,exactCacheHit:true,
      authenticatedRestore:true,baselinePreserved:true,cursorRestored:true,workerClosed:true,
      callerReceiptWasLost:true,sdkHttpReceiptWasLost:false,productionAuthority:false});
  }
  console.log('SYNTHETIC_CACHE_RECOVERY_FIXTURE_'+role.toUpperCase()+'_PASS');
}

async function sourceTests(){
  const {test}=await import('node:test');
  const env={GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/main',RUNNER_OS:'Linux',
    GITHUB_SHA:'a'.repeat(40),EXPECTED_MAIN_HEAD:'a'.repeat(40),GITHUB_RUN_ID:'17',GITHUB_RUN_ATTEMPT:'1',
    GITHUB_REPOSITORY:'owner/repo',GITHUB_WORKFLOW_REF:'owner/repo/'+WORKFLOW+'@refs/heads/main',GITHUB_JOB:'produce'};
  test('Syntetisk namespace og lukkede hosted identiteter',()=>{
    const current=context(env,'linux','24');assert(current.key.startsWith('ravradar-synthetic-owned-progress-v1-'));
    for(const change of [{GITHUB_REF:'refs/heads/other'},{GITHUB_EVENT_NAME:'pull_request_target'},
      {EXPECTED_MAIN_HEAD:'b'.repeat(40)},{GITHUB_WORKFLOW_REF:env.GITHUB_WORKFLOW_REF+'x'},
      {GITHUB_RUN_ID:'0'},{GITHUB_JOB:'build'}])assert.throws(()=>context({...env,...change},'linux','24'));
    assert.throws(()=>context(env,'win32','24'));assert.throws(()=>context(env,'linux','22'));
    assert.deepEqual(hostEnvironment({PATH:'fixture',WEATHER_PROGRESS_MASTER_SECRET:'never-pass',NODE_OPTIONS:'never-pass'}),{PATH:'fixture'});
  });
  test('Den ejede controller kompilerer uden platformskift eller netkald',()=>{
    execFileSync(process.platform==='win32'?'python':'python3',['-B','-c',
      'import sys; compile(sys.stdin.read(), "owned-cache-fixture-controller", "exec")'],
      {input:CONTROLLER,env:hostEnvironment(),timeout:5000,stdio:['pipe','pipe','pipe']});
    assert(CONTROLLER.includes('m.retain_pidfd(p.pid)'));assert(CONTROLLER.includes('signal.pidfd_send_signal'));
  });
  test('Kun opt-in og begge normale kildeporte før den afgrænsede action',()=>{
    const workflow=fs.readFileSync(path.join(SOURCE,WORKFLOW),'utf8');
    assert.match(workflow,/\n  workflow_dispatch:\n/);
    assert(!/\n  (schedule|push|pull_request|workflow_call):/.test(workflow));
    assert(!workflow.includes('secrets.'));assert(!workflow.includes('ravradar-weather-production'));
    assert.match(workflow,/\n    needs: produce\n/);
    assert.equal(workflow.split('uses: ./.github/actions/prove-synthetic-cache-recovery').length,3);
    const jobs=workflow.split('\njobs:\n')[1];
    for(const section of [jobs.split('\n  restore:\n')[0],jobs.split('\n  restore:\n')[1]]){
      assert(section);assert(section.includes('test "$GITHUB_REF" = refs/heads/main'));
      assert(section.includes('test "$GITHUB_SHA" = "$EXPECTED_HEAD"'));
      assert(section.includes('git/ref/heads/main'));
      assert(section.includes('test "$CONFIRMATION" = PROVE-SYNTHETIC-CACHE-CALLER-RECEIPT-LOSS'));
      const gate=section.indexOf('run: node scripts/weather-source-gate.mjs check');
      const refusal=section.indexOf('run: test "$SOURCE_REQUIRED" = false');
      const fixture=section.indexOf('uses: ./.github/actions/prove-synthetic-cache-recovery');
      assert(gate>0&&refusal>gate&&fixture>refusal);
      assert(section.includes('npm ci --ignore-scripts --no-audit --no-fund'));
      assert(section.includes('run: node scripts/test-owned-dmi-cache-dependency.mjs'));
    }
    assert(workflow.includes('synthetic-cache-producer-${{ github.run_id }}-${{ github.run_attempt }}'));
    assert(!workflow.includes('restore-keys:'));assert(!workflow.includes('actions/cache/'));
    assert.match(fs.readFileSync(path.join(SOURCE,'.github/actions/prove-synthetic-cache-recovery/action.yml'),'utf8'),/using: node24/);
  });
  test('En faktisk SDK-retur tilbageholdes før caller-retur',async()=>{
    let saves=0,observed=0,returned=false;
    holdCommittedReturn(async()=>{saves++;return 17;},()=>{observed++;}).then(()=>{returned=true;});
    await new Promise(resolve=>setTimeout(resolve,15));assert.equal(saves,1);assert.equal(observed,1);assert.equal(returned,false);
    await assert.rejects(()=>holdCommittedReturn(async()=>-1,()=>{}));
  });
  test('Samme boot, forkert kilde og falsk receipt afvises',()=>{
    const current=context(env,'linux','24');const receipt={schemaVersion:1,kind:'SYNTHETIC_CACHE_CALLER_RECEIPT_LOSS_V1',
      ...current,producerBootSha256:'1'.repeat(64),cipherSha256:'2'.repeat(64),cipherBytes:100,
      sdkVersion:'6.1.0',sdkFinalizeAcknowledged:true,callerReceipt:false,workerClosed:true,fault:'SDK_RESULT_HELD_BEFORE_CALLER_RECEIPT'};
    assert.equal(validateProducer(receipt,current,'3'.repeat(64)),receipt);
    assert.throws(()=>validateProducer(receipt,current,receipt.producerBootSha256));
    for(const changed of [{head:'b'.repeat(40)},{callerReceipt:true},{workerClosed:false},{key:'dmi-grib-v4-production'},
      {sdkFinalizeAcknowledged:false},{cipherBytes:2*1024*1024},{unexpected:true}])
      assert.throws(()=>validateProducer({...receipt,...changed},current,'3'.repeat(64)));
  });
  test('Normal AEAD, baseline og cursor gennem den syntetiske fixture',async()=>{
    const parent=await fsp.mkdtemp(path.join(os.tmpdir(),'rr-cache-cross-runner-source-'));
    const source=path.join(parent,'source'),base=await prepareRoot(source);await seal(source,base);
    const bytes=await fsp.readFile(path.join(source,MEMBER));
    const target=path.join(parent,'target'),targetBase=await prepareRoot(target);
    await fsp.mkdir(path.join(target,'.cache'));await fsp.writeFile(path.join(target,MEMBER),bytes,{flag:'wx'});
    await authenticatedRestore(target,targetBase);
    for(const kind of ['authentication','baseline']){
      const root=path.join(parent,kind),basePath=await prepareRoot(root);await fsp.mkdir(path.join(root,'.cache'));
      const bad=Buffer.from(bytes);if(kind==='authentication')bad[bad.length-1]^=1;
      await fsp.writeFile(path.join(root,MEMBER),bad,{flag:'wx'});
      if(kind==='baseline')await fsp.writeFile(path.join(root,'data/live/conditions.json'),'{"changed":true}\n');
      const refused=await weatherComponentProgressCache({mode:'restore',repositoryRoot:root,basePath,
        repository:REPOSITORY,encryptionKey:ENCRYPTION_KEY});
      assert.notEqual(refused.restored,true);assert.equal(fs.existsSync(path.join(root,'.cache/weather-component-fallback-cursor.json')),false);
    }
  });
}

if(process.argv[1]&&path.resolve(process.argv[1])===SELF){
  if(process.argv.length===2)await sourceTests();
  else if(process.argv.length===4&&['--sdk-save','--sdk-restore'].includes(process.argv[2])){
    try{await sdkWorker(process.argv[2].slice(6),process.argv[3]);}catch{process.exitCode=1;}
  }else throw new Error('FIXTURE_ARGUMENT_REFUSED');
}
