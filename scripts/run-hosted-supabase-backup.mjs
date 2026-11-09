import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {DB_BACKUP_CIPHER_LIMITS as CIPHER} from './seal-supabase-database-export.mjs';
import {FIXED_844_ROLE_GRANT_COMMITMENTS,FIXED_844_ROLE_GRANT_CONFIRMATION} from './archive-supabase-database-backup.mjs';
const WORKFLOW='Back up RavRadar Supabase database',REPOSITORY='jakobjorgensen82-commits/RavRadar',BUCKET='ravradar-supabase-backup';
const need=(ok,code)=>{if(!ok){const e=new Error(code);e.code=code;throw e;}},hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const BASE_ENV=['PATH','Path','HOME','USERPROFILE','SystemRoot','WINDIR','TEMP','TMP','RUNNER_TEMP','LANG','LC_ALL'];
const CONTEXT_ENV=['GITHUB_ACTIONS','RUNNER_ENVIRONMENT','RUNNER_OS','GITHUB_REPOSITORY','GITHUB_SHA','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT'];
const pick=(env,keys)=>Object.fromEntries(keys.filter(k=>typeof env[k]==='string').map(k=>[k,env[k]]));
export function runHostedSupabaseBackup({phase='preflight'}={},dependencies={}){
  const env=dependencies.env??process.env,proc=dependencies.processImpl??process,files=dependencies.fsImpl??fs,paths=dependencies.pathImpl??path,
    exec=dependencies.execFileSyncImpl??execFileSync,now=dependencies.now??Date.now;let stage='AUTHORITY';
  try{
    need(['preflight','execute'].includes(phase),'SUPABASE_BACKUP_PHASE');
    need(env.GITHUB_EVENT_NAME==='workflow_dispatch'&&env.GITHUB_REF==='refs/heads/main'&&env.GITHUB_RUN_ATTEMPT==='1'
      &&env.GITHUB_REPOSITORY===REPOSITORY&&env.GITHUB_WORKFLOW===WORKFLOW&&/^[a-f0-9]{40}$/.test(env.EXPECTED_HEAD_SHA||'')
      &&env.GITHUB_SHA===env.EXPECTED_HEAD_SHA&&/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID||''),'SUPABASE_BACKUP_AUTHORITY');
    need(proc.platform==='linux'&&Number(proc.versions?.node?.split('.')[0])>=24&&env.GITHUB_ACTIONS==='true'
      &&env.RUNNER_ENVIRONMENT==='github-hosted'&&env.RUNNER_OS==='Linux','SUPABASE_BACKUP_HOSTED_VM');
    const operation=env.SUPABASE_BACKUP_OPERATION,roleGrantAudit=operation==='audit-fixed-844-role-grant';
    need(roleGrantAudit||['bucket-readonly','bucket-create','capture','discover','bootstrap'].includes(operation),'SUPABASE_BACKUP_OPERATION');
    const confirmation=env.SUPABASE_BACKUP_CONFIRMATION||'',selector=env.SUPABASE_BACKUP_INDEX_SHA||'';
    need(operation==='bucket-create'?confirmation==='CREATE-PRIVATE-EU-SUPABASE-BACKUP-BUCKET':operation==='capture'?confirmation==='CAPTURE-PRIVATE-SUPABASE-DATABASE-BACKUP'
      :roleGrantAudit?confirmation===FIXED_844_ROLE_GRANT_CONFIRMATION:confirmation==='','SUPABASE_BACKUP_CONFIRMATION');
    need(selector===''||(operation==='bootstrap'&&hash(selector)),'SUPABASE_BACKUP_SELECTOR');
    if(roleGrantAudit)need(env.SUPABASE_BACKUP_AUDIT_INDEX_ABSENT==='true','SUPABASE_BACKUP_ROLE_GRANT_INDEX_INPUT');
    need(typeof env.RUNNER_TEMP==='string'&&paths.isAbsolute(env.RUNNER_TEMP),'SUPABASE_BACKUP_TEMP');
    if(operation==='capture')need(['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_CONFIG','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH','CONTAINER_HOST'].every(k=>!env[k]),'SUPABASE_BACKUP_DOCKER_ENV');
    const deadline=now()+20*60_000,remaining=()=>{const n=deadline-now();need(n>0,'SUPABASE_BACKUP_DEADLINE');return n;};
    const gitEnv={...pick(env,BASE_ENV),GIT_TERMINAL_PROMPT:'0'},completed=[];
    function call(command,args,childEnv,limit=remaining(),cwd=undefined){
      return exec(command,args,{env:childEnv,cwd,shell:false,windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:Math.min(limit,remaining()),maxBuffer:65536});
    }
    function mainHead(){stage='MAIN_RECONFIRM';try{
      call('git',['fetch','--no-tags','origin','+refs/heads/main:refs/remotes/origin/main'],gitEnv,60_000);
      for(const ref of ['HEAD^{commit}','origin/main^{commit}'])need(call('git',['rev-parse',ref],gitEnv,10_000).toString('utf8').trim()===env.EXPECTED_HEAD_SHA,'SUPABASE_BACKUP_MAIN_CHANGED');
    }catch(e){if(['SUPABASE_BACKUP_MAIN_CHANGED','SUPABASE_BACKUP_DEADLINE'].includes(e.code))throw e;need(false,'SUPABASE_BACKUP_MAIN_UNAVAILABLE');}}
    function parsedChild(args,childEnv,fallback,limit=remaining()){
      try{return JSON.parse(call(proc.execPath,args,childEnv,limit).toString('utf8'));}
      catch(e){let r=null;try{r=JSON.parse(e.stderr.toString('utf8'));}catch{}const error=new Error(fallback);
        error.code=r?.status==='FAILED_CLOSED'&&/^[A-Z][A-Z0-9_]{0,95}$/.test(r.code||'')?r.code:fallback;
        error.httpStatus=Number.isInteger(r?.httpStatus)&&r.httpStatus>=100&&r.httpStatus<=599?r.httpStatus:null;
        error.externalDumpOutcome=['UNKNOWN','NOT_STARTED'].includes(r?.externalDumpOutcome)?r.externalDumpOutcome:null;
        error.writeOutcome=['UNKNOWN_NO_RETRY','REJECTED','CREATED','NOT_STARTED'].includes(r?.writeOutcome)?r.writeOutcome:null;throw error;}
    }
    function bucket(mode,required){mainHead();stage='BUCKET_'+mode;const args=['scripts/provision-supabase-backup-bucket.mjs','--'+mode];if(mode==='create')args.push('--confirm',confirmation);
      const r=parsedChild(args,pick(env,[...BASE_ENV,'RAVRADAR_R2_ACCOUNT_ID','CLOUDFLARE_API_TOKEN']),mode==='create'?'R2_BUCKET_CREATE_OUTCOME_UNKNOWN':'R2_BUCKET_READ_FAILED',120_000);
      const verified=['PRIVATE_EU_BUCKET_VERIFIED','PRIVATE_EU_BUCKET_CREATED_VERIFIED'].includes(r?.status);
      need(r?.bucket===BUCKET&&r.jurisdiction==='eu'&&r.objectsUploaded===false&&r.settingsChanged===false
        &&(verified||(!required&&r.status==='PRIVATE_EU_BUCKET_ABSENT'))&&(!verified||(r.managedPublicEnabled===false&&r.customDomainCount===0)),'SUPABASE_BACKUP_BUCKET_RECEIPT');
      completed.push('bucket-'+mode);return r;
    }
    function localDocker(){stage='LOCAL_DOCKER';
      const temp=files.realpathSync(env.RUNNER_TEMP);need(paths.resolve(temp)===paths.resolve(env.RUNNER_TEMP),'SUPABASE_BACKUP_TEMP');
      for(let at=temp;;at=paths.dirname(at)){const st=files.lstatSync(at);need(st.isDirectory()&&!st.isSymbolicLink()&&!files.existsSync(paths.join(at,'.git')),'SUPABASE_BACKUP_TEMP');if(at===paths.dirname(at))break;}
      const work=files.mkdtempSync(paths.join(temp,'rr-supabase-backup-'));files.chmodSync(work,0o700);const home=paths.join(work,'home');files.mkdirSync(home,{mode:0o700});
      for(const p of [work,home]){const st=files.lstatSync(p);need(st.isDirectory()&&!st.isSymbolicLink()&&(st.mode&0o077)===0&&st.uid===proc.getuid(),'SUPABASE_BACKUP_PRIVATE_HOME');}
      const clean={...pick(env,['PATH','LANG','LC_ALL']),HOME:home,XDG_CONFIG_HOME:paths.join(home,'.config'),CI:'true',NO_COLOR:'1'};
      try{const endpoint=JSON.parse(call('docker',['context','inspect','default','--format','{{json .Endpoints.docker.Host}}'],clean,15_000,work).toString('utf8'));
        need(endpoint==='unix:///var/run/docker.sock','SUPABASE_BACKUP_LOCAL_DOCKER');
        need(JSON.parse(call('docker',['info','--format','{{json .OSType}}'],clean,15_000,work).toString('utf8'))==='linux','SUPABASE_BACKUP_LOCAL_DOCKER');
      }catch{need(false,'SUPABASE_BACKUP_LOCAL_DOCKER');}completed.push('local-docker');
    }
    if(phase==='preflight'){mainHead();if(operation==='capture')bucket('read-only',true);else if(['bucket-readonly','bucket-create','discover'].includes(operation))bucket('read-only',operation==='discover');
      return{status:'SUPABASE_BACKUP_READ_ONLY_PREFLIGHT_COMPLETE',phase,operation,completed,archiveWrittenThisOperation:false,centralLocatorWrittenThisOperation:false,fullDatabaseBackupVerified:false,authRestoreVerified:false,freeReady:false};}
    if(roleGrantAudit){
      mainHead();stage=operation;
      const childEnv=pick(env,[...BASE_ENV,...CONTEXT_ENV,'SUPABASE_SERVICE_ROLE_KEY',
        'RAVRADAR_R2_ACCOUNT_ID','RAVRADAR_R2_ACCESS_KEY_ID','RAVRADAR_R2_SECRET_ACCESS_KEY']);
      const r=parsedChild(['scripts/archive-supabase-database-backup.mjs','--audit-fixed-844-role-grant',confirmation],
        childEnv,'SUPABASE_BACKUP_CHILD_FAILED',135_000);
      const keys=['status','match','selectorSha256','originSha256','rolesFileVerified','fullDatabaseBackupVerified',
        'databaseRestoreExecuted','archiveWrittenThisOperation'];
      need(r&&typeof r==='object'&&!Array.isArray(r)&&Object.keys(r).length===keys.length&&keys.every(k=>Object.hasOwn(r,k))
        &&r.status==='AUTHENTICATED_ROLES_FIXED_GRANT_AUDIT_ONLY'&&['ABSENT_EXACT','PRESENT_ONCE','PRESENT_MULTIPLE'].includes(r.match)
        &&r.selectorSha256===FIXED_844_ROLE_GRANT_COMMITMENTS.selectorSha256
        &&r.originSha256===FIXED_844_ROLE_GRANT_COMMITMENTS.originSha256&&r.rolesFileVerified===true
        &&r.fullDatabaseBackupVerified===false&&r.databaseRestoreExecuted===false&&r.archiveWrittenThisOperation===false,
        'SUPABASE_BACKUP_ROLE_GRANT_RECEIPT');
      return{status:'SUPABASE_BACKUP_ROLE_GRANT_AUDIT_COMPLETE',phase,operation,match:r.match,
        ...FIXED_844_ROLE_GRANT_COMMITMENTS,rolesFileVerified:true,
        archiveWrittenThisOperation:false,centralLocatorWrittenThisOperation:false,productionDatabaseRestoreExecuted:false,
        fullDatabaseBackupVerified:false,authRestoreVerified:false,freeReady:false,automaticRetry:false};
    }
    if(operation==='bucket-readonly'||operation==='bucket-create'){const r=bucket(operation==='bucket-create'?'create':'read-only',operation==='bucket-create');
      return{status:'SUPABASE_BACKUP_BUCKET_OPERATION_COMPLETE',phase,operation,completed,bucketStatus:r.status,bucket:BUCKET,
        bucketCreatedThisOperation:r.writeOutcome==='CREATED'&&r.postCount===1,archiveWrittenThisOperation:false,centralLocatorWrittenThisOperation:false,fullDatabaseBackupVerified:false,authRestoreVerified:false,freeReady:false};}
    if(operation!=='bootstrap')bucket('read-only',true);if(operation==='capture'){mainHead();localDocker();}mainHead();stage=operation;
    const childEnv=pick(env,[...BASE_ENV,...CONTEXT_ENV,'SUPABASE_SERVICE_ROLE_KEY','RAVRADAR_R2_ACCOUNT_ID','RAVRADAR_R2_ACCESS_KEY_ID','RAVRADAR_R2_SECRET_ACCESS_KEY',
      ...(operation==='bootstrap'?[]:['SUPABASE_URL','SUPABASE_ACCESS_TOKEN']),...(operation==='capture'?['SUPABASE_DB_PASSWORD']:[])]);
    const args=['scripts/archive-supabase-database-backup.mjs','--'+operation];if(selector)args.push(selector);
    const r=parsedChild(args,childEnv,operation==='capture'?'BACKUP_CAPTURE_OUTCOME_UNKNOWN':'SUPABASE_BACKUP_CHILD_FAILED');
    const expected=operation==='capture'?'REMOTE_AUTHENTICATED_SQL_BYTE_ROUNDTRIP_ONLY':operation==='discover'?'CENTRAL_DISCOVERY_AUTHENTICATED_SQL_BYTE_ROUNDTRIP_ONLY'
      :selector?'R2_BOOTSTRAP_AUTHENTICATED_SQL_BYTE_ROUNDTRIP_ONLY':'R2_BOOTSTRAP_AUTHENTICATED_INDEX_CANDIDATES_ONLY';
    need(r?.status===expected&&r.fullDatabaseBackupVerified===false&&r.authRestoreVerified===false&&r.freeReady===false&&r.sourceAdmission===false&&r.automaticRetry===false
      &&r.remoteArchiveVerified===(operation!=='bootstrap'||selector!=='')&&r.centralLocatorVerified===(operation!=='bootstrap')
      &&typeof r.archiveWrittenThisOperation==='boolean'&&typeof r.centralLocatorWrittenThisOperation==='boolean'
      &&(operation==='capture'?r.centralLocatorWrittenThisOperation===true:r.archiveWrittenThisOperation===false&&r.centralLocatorWrittenThisOperation===false),'SUPABASE_BACKUP_CHILD_RECEIPT');
    let captureBytes={};
    if(operation==='capture'){
      // Logical SQL and stored ciphertext counts; neither is metered network egress.
      need(Number.isSafeInteger(r.totalSqlBytes)&&r.totalSqlBytes>0&&r.totalSqlBytes<=2_000_000_000
        &&Array.isArray(r.files)&&r.files.length===5,'SUPABASE_BACKUP_CAPTURE_BYTES');
      let totalSqlBytes=0,totalCipherBytes=0;
      for(const file of r.files){
        need(file&&typeof file==='object'&&!Array.isArray(file)
          &&Number.isSafeInteger(file.sqlBytes)&&file.sqlBytes>0&&file.sqlBytes<=1_000_000_000
          &&Number.isSafeInteger(file.cipherBytes)&&file.cipherBytes>0&&file.cipherBytes<=CIPHER.totalBytes,'SUPABASE_BACKUP_CAPTURE_BYTES');
        totalSqlBytes+=file.sqlBytes;totalCipherBytes+=file.cipherBytes;
      }
      need(totalSqlBytes===r.totalSqlBytes&&totalSqlBytes<=2_000_000_000&&totalCipherBytes<=CIPHER.totalBytes,'SUPABASE_BACKUP_CAPTURE_BYTES');
      if(r.files.some(file=>file.cipherBytes>CIPHER.partBytes)){
        const expectedParts=r.files.reduce((n,file)=>n+Math.ceil(file.cipherBytes/CIPHER.partBytes),0);
        need(r.cipherPartCount===expectedParts&&expectedParts<=CIPHER.parts&&Number.isSafeInteger(r.archiveWireBytes)
          &&r.archiveWireBytes>=totalCipherBytes&&r.archiveWireBytes<=CIPHER.wireBytes,'SUPABASE_BACKUP_CAPTURE_BYTES');
      }
      captureBytes={totalSqlBytes,totalCipherBytes};
    }
    let candidates=[],diagnostics=null;if(operation==='bootstrap'){const d=r.diagnostics,keys=['listedObjects','unsupportedNamespaceObjects','objectsAboveIndexLimit','emptyObjects','eligibleNotInspected','nonIndexSqlFrames','legacyRequiresDbPointer'];
      need(d&&keys.every(k=>Number.isSafeInteger(d[k])&&d[k]>=0&&d[k]<=512)&&d.invalidOrUnsupported&&typeof d.invalidOrUnsupported==='object'&&!Array.isArray(d.invalidOrUnsupported)
        &&Object.keys(d.invalidOrUnsupported).length<=64&&Object.entries(d.invalidOrUnsupported).every(([k,v])=>/^[A-Z][A-Z0-9_]{0,95}$/.test(k)&&Number.isSafeInteger(v)&&v>0&&v<=512),'SUPABASE_BACKUP_DIAGNOSTICS');
      diagnostics={...Object.fromEntries(keys.map(k=>[k,d[k]])),invalidOrUnsupported:{...d.invalidOrUnsupported}};}
    if(operation==='bootstrap'&&!selector){need(Array.isArray(r.candidates)&&r.candidates.length<=64,'SUPABASE_BACKUP_CANDIDATES');candidates=r.candidates.map(x=>{
      need(hash(x.indexSha256)&&typeof x.completedAt==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x.completedAt),'SUPABASE_BACKUP_CANDIDATES');return{indexSha256:x.indexSha256,completedAt:x.completedAt};});}
    need(operation==='bootstrap'&&!selector?r.indexSha256===undefined:hash(r.indexSha256),'SUPABASE_BACKUP_CHILD_RECEIPT');completed.push(operation);
    return{status:'SUPABASE_BACKUP_OPERATION_COMPLETE',phase,operation,completed,remoteArchiveVerified:r.remoteArchiveVerified,centralLocatorVerified:r.centralLocatorVerified,
      archiveWrittenThisOperation:r.archiveWrittenThisOperation,centralLocatorWrittenThisOperation:r.centralLocatorWrittenThisOperation,indexSha256:r.indexSha256??null,candidates,diagnostics,...captureBytes,
      fullDatabaseBackupVerified:false,authRestoreVerified:false,productionDatabaseRestoreExecuted:false,freeReady:false,sourceAdmission:false};
  }catch(e){const error=new Error(/^[A-Z][A-Z0-9_]{0,95}$/.test(e.code||'')?e.code:'SUPABASE_BACKUP_OPERATOR_FAILED');
    Object.assign(error,{code:error.message,stage,httpStatus:Number.isInteger(e.httpStatus)?e.httpStatus:null,
      externalDumpOutcome:e.externalDumpOutcome??null,writeOutcome:e.writeOutcome??null,automaticRetry:false});throw error;}
}
function main(){const args=process.argv.slice(2);need(args.length===0||args.length===1&&['--preflight','--execute'].includes(args[0]),'SUPABASE_BACKUP_PHASE');
  console.log(JSON.stringify(runHostedSupabaseBackup({phase:args[0]==='--execute'?'execute':'preflight'})));}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  try{main();}catch(e){console.error(JSON.stringify({status:'FAILED_CLOSED',stage:e.stage??'AUTHORITY',code:e.code??'SUPABASE_BACKUP_OPERATOR_FAILED',httpStatus:e.httpStatus??null,
    externalDumpOutcome:e.externalDumpOutcome??null,writeOutcome:e.writeOutcome??null,automaticRetry:false,fullDatabaseBackupVerified:false,authRestoreVerified:false,freeReady:false}));process.exitCode=1;}
