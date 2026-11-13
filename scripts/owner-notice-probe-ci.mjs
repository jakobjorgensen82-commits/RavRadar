// One temporary owner probe. Deployment uses the existing CLI, never a new transport.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {createSupabaseAdminRequester} from './lib/supabase-admin-rest.mjs';

const PROJECT='afqhhdrkjfjtpadntdzo',ORIGIN='https://'+PROJECT+'.supabase.co';
const SLUG='inactivity-notice-owner-probe',WORKFLOW='Test one RavRadar owner notice';
const PERMANENT=['ravradar-assistant','submit-observation','trip-log'];
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const TEMPLATE='scripts/fixtures/owner-notice-probe/';
const SHARED=['public-gateway.ts','trip-storage.js','trip-storage-contract-probe.js'];
const PROBE=['index.ts','inactivity-notice-mail.mjs','owner-notice-probe.mjs',
  'owner-notice-probe-invoke.mjs','reservation.mjs','hosted-owner-adapter-v1/hosted-owner-notice-probe.mjs'];
const CONFIG='project_id = "ravradar-private-owner-mail-probe"\n\n[functions.'+SLUG+']\nverify_jwt = false\n';
const fail=code=>{throw Object.assign(new Error(code),{code});};
const need=(value,code)=>{if(!value)fail(code);};
const baseEnv=env=>Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','HOME']
  .filter(key=>typeof env[key]==='string').map(key=>[key,env[key]]));
const json=raw=>{try{return JSON.parse(String(raw));}catch{fail('OWNER_PROBE_JSON_UNPROVED');}};
const sourcePath=name=>'supabase/functions/'+SLUG+'/'+name;
function regular(file,maximum=128*1024){
  const s=fs.lstatSync(file);need(s.isFile()&&!s.isSymbolicLink()&&s.size>0&&s.size<=maximum,'OWNER_PROBE_SOURCE_BOUND');
  return fs.readFileSync(file);
}
function privateFile(root,name,bytes){
  const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
  fs.writeFileSync(file,bytes,{flag:'wx',mode:0o600});
}
export function qualifyOwnerProbeCli(run){
  need(String(run(['--version'])).trim()==='2.117.0','OWNER_PROBE_CLI_VERSION');
  for(const verb of ['list','deploy','download','delete']){
    const help=String(run(['functions',verb,'--help']));
    need(help.includes('--project-ref')&&help.includes('--output')&&help.includes('--workdir'),'OWNER_PROBE_CLI_HELP');
    if(['deploy','download'].includes(verb))need(help.includes('--use-api'),'OWNER_PROBE_CLI_HELP');
    if(['deploy','delete'].includes(verb))need(help.includes('--yes'),'OWNER_PROBE_CLI_HELP');
  }
}
export function ownerProbeInventory(value,includeProbe=false){
  need(Array.isArray(value)&&value.length===(includeProbe?4:3),'OWNER_PROBE_INVENTORY');
  const result=value.map(row=>{
    need(row&&UUID.test(row.id||'')&&typeof row.slug==='string'
      &&Number.isSafeInteger(row.version)&&row.version>0&&row.status==='ACTIVE'
      &&typeof row.verify_jwt==='boolean','OWNER_PROBE_INVENTORY');
    return{id:row.id,slug:row.slug,version:row.version,status:row.status,verify_jwt:row.verify_jwt};
  }).sort((a,b)=>a.slug.localeCompare(b.slug));
  need(new Set(result.map(row=>row.id)).size===result.length
    &&new Set(result.map(row=>row.slug)).size===result.length,'OWNER_PROBE_INVENTORY');
  need(isDeepStrictEqual(result.map(row=>row.slug),[...PERMANENT,...(includeProbe?[SLUG]:[])].sort()),'OWNER_PROBE_INVENTORY');
  return result;
}
export async function readUniqueConfirmedOwner({key,fetchImpl}){
  const profileSuffix='?select=id,role,is_active&role=eq.owner&is_active=eq.true&limit=2';
  let allowed=new Set([ORIGIN+'/rest/v1/profiles'+profileSuffix]);
  const guarded=async(url,options={})=>{
    need(allowed.has(String(url))&&(!options.method||options.method==='GET')&&!options.body,'OWNER_PROBE_OWNER_READ_SCOPE');
    return fetchImpl(url,{...options,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10_000)});
  };
  const options={key,fetchImpl:guarded,logger:()=>{}};
  try{
    const profiles=await createSupabaseAdminRequester({endpoint:ORIGIN+'/rest/v1/profiles',...options})(profileSuffix);
    need(Array.isArray(profiles)&&profiles.length===1&&UUID.test(profiles[0]?.id||'')
      &&profiles[0].role==='owner'&&profiles[0].is_active===true,'OWNER_PROBE_UNIQUE_ACTIVE_OWNER');
    const ownerId=profiles[0].id,endpoint=ORIGIN+'/auth/v1/admin/users/'+ownerId;
    allowed=new Set([endpoint]);
    const user=await createSupabaseAdminRequester({endpoint,...options})('');
    need(user?.id===ownerId&&typeof user.email==='string'&&user.email===user.email.trim()
      &&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)&&user.email.length<=254
      &&typeof user.email_confirmed_at==='string'&&Number.isFinite(Date.parse(user.email_confirmed_at))
      &&!user.is_anonymous&&!user.deleted_at&&!user.banned_until,'OWNER_PROBE_CONFIRMED_OWNER');
    return{ownerId,recipient:user.email};
  }catch(error){
    if(error?.code?.startsWith('OWNER_PROBE_'))throw error;
    fail('OWNER_PROBE_OWNER_READ_UNPROVED');
  }
}
export function materializeOwnerProbe({sourceRoot,target,reservation}){
  const inputs=new Map();
  for(const name of SHARED)inputs.set('supabase/functions/_shared/'+name,
    regular(path.join(sourceRoot,'supabase/functions/_shared',name)));
  for(const name of PROBE)inputs.set(sourcePath(name),regular(path.join(sourceRoot,TEMPLATE,name)));
  need(inputs.get(sourcePath('reservation.mjs')).toString('utf8').trim().endsWith('export default null;'),'OWNER_PROBE_INERT_TEMPLATE');
  inputs.set(sourcePath('reservation.mjs'),Buffer.from('export default '+JSON.stringify(reservation)+';\n'));
  privateFile(target,'supabase/config.toml',CONFIG);
  for(const [name,bytes]of inputs)privateFile(target,name,bytes);
  return inputs;
}
export function assertOwnerProbeReadback(directory,inputs){
  for(const [name,bytes]of inputs)need(regular(path.join(directory,name)).equals(bytes),'OWNER_PROBE_EXACT_SOURCE_UNPROVED');
}
function readExpiredOwnerProbeReservation(directory,owner,now){
  const raw=regular(path.join(directory,sourcePath('reservation.mjs')),4096);
  let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(raw);}catch{fail('OWNER_PROBE_RESERVATION_UNPROVED');}
  need(text.startsWith('export default ')&&text.endsWith(';\n'),'OWNER_PROBE_RESERVATION_UNPROVED');
  const reservation=json(text.slice('export default '.length,-2));
  need(reservation&&typeof reservation==='object'&&!Array.isArray(reservation)
    &&isDeepStrictEqual(Object.keys(reservation).sort(),['expiresAt','noticeId','ownerId','recipient','reservedAt'])
    &&raw.equals(Buffer.from('export default '+JSON.stringify(reservation)+';\n'))
    &&reservation.ownerId===owner.ownerId&&reservation.recipient===owner.recipient&&UUID.test(reservation.noticeId||'')
    &&Number.isSafeInteger(reservation.reservedAt)&&reservation.reservedAt>=0
    &&Number.isSafeInteger(reservation.expiresAt)&&reservation.expiresAt-reservation.reservedAt===10*60_000
    &&Number.isSafeInteger(now)&&now>=reservation.expiresAt,'OWNER_PROBE_RESERVATION_UNPROVED');
  return reservation;
}
export async function runOwnerProbeWindow({
  env=process.env,sourceRoot=path.resolve('.'),run=execFileSync,fetchImpl=globalThis.fetch,
  clock=Date.now,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),uuid=()=>crypto.randomUUID(),
  announce=message=>console.log(message),platform=process.platform,
}={}){
  need(platform==='linux'&&env.GITHUB_EVENT_NAME==='workflow_dispatch'&&env.GITHUB_REF==='refs/heads/main'
    &&env.GITHUB_WORKFLOW===WORKFLOW&&env.GITHUB_RUN_ATTEMPT==='1'
    &&/^[a-f0-9]{40}$/.test(env.GITHUB_SHA||'')&&/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID||'')
    &&/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(env.GITHUB_REPOSITORY||'')
    &&['TEST-EXISTING-OWNER-MAIL-ONCE','CLEANUP-EXPIRED-OWNER-PROBE-ONLY'].includes(env.OWNER_NOTICE_CONFIRMATION),'OWNER_PROBE_AUTHORITY');
  need(typeof env.SUPABASE_ACCESS_TOKEN==='string'&&env.SUPABASE_ACCESS_TOKEN
    &&typeof env.SUPABASE_SERVICE_ROLE_KEY==='string'&&env.SUPABASE_SERVICE_ROLE_KEY
    &&typeof env.GITHUB_TOKEN==='string'&&env.GITHUB_TOKEN,'OWNER_PROBE_EXISTING_CREDENTIALS_REQUIRED');
  const temp=path.resolve(env.RUNNER_TEMP||''),workspace=path.resolve(sourceRoot);
  need(path.isAbsolute(env.RUNNER_TEMP||'')&&temp!==workspace&&!temp.startsWith(workspace+path.sep),'OWNER_PROBE_RUNNER_TEMP');
  const dir=fs.mkdtempSync(path.join(temp,'ravradar-owner-notice-'));
  const call=(command,args,credentials={},cwd=sourceRoot,timeout=60_000)=>{
    try{return run(command,args,{cwd,env:{...baseEnv(env),...credentials},encoding:'utf8',
      stdio:['ignore','pipe','pipe'],timeout,maxBuffer:2*1024*1024});}
    catch{fail(command==='git'?'OWNER_PROBE_SOURCE_READ_UNPROVED':
      command==='gh'?'OWNER_PROBE_WRITER_READ_UNPROVED':'OWNER_PROBE_CLI_OUTCOME_UNPROVED');}
  };
  const gh=args=>call('gh',args,{GH_TOKEN:env.GITHUB_TOKEN});
  const cli=(args,cwd=dir)=>call('supabase',args,{SUPABASE_ACCESS_TOKEN:env.SUPABASE_ACCESS_TOKEN},cwd,120_000);
  const exactMain=()=>{
    call('git',['fetch','--no-tags','origin','+refs/heads/main:refs/remotes/origin/main'],{GITHUB_TOKEN:env.GITHUB_TOKEN});
    for(const ref of ['HEAD^{commit}','origin/main^{commit}'])
      need(String(call('git',['rev-parse',ref])).trim()===env.GITHUB_SHA,'OWNER_PROBE_MAIN_CHANGED');
    call('git',['diff','--quiet','HEAD','--','scripts/owner-notice-probe-ci.mjs',
      'scripts/lib/supabase-admin-rest.mjs',TEMPLATE,
      ...SHARED.map(name=>'supabase/functions/_shared/'+name)]);
  };
  const noOtherWriter=()=>{
    for(const status of ['in_progress']){
      const pages=json(gh(['api','--paginate','--slurp','repos/'+env.GITHUB_REPOSITORY+'/actions/runs?per_page=100&status='+status]));
      need(Array.isArray(pages)&&pages.length>0&&pages.length<=10,'OWNER_PROBE_WRITER_CENSUS');
      for(const page of pages){
        need(Array.isArray(page?.workflow_runs)&&page.workflow_runs.length<=100,'OWNER_PROBE_WRITER_CENSUS');
        for(const row of page.workflow_runs)need(row?.id===Number(env.GITHUB_RUN_ID)
          ||row?.path==='.github/workflows/validate-pull-request.yml','OWNER_PROBE_OTHER_WRITER');
      }
    }
  };
  const list=includeProbe=>ownerProbeInventory(json(cli(['functions','list','--project-ref',PROJECT,'--output','json'])),includeProbe);
  const download=label=>{
    const target=path.join(dir,label);fs.mkdirSync(target,{mode:0o700});
    cli(['functions','download',SLUG,'--project-ref',PROJECT,'--use-api'],target);return target;
  };
  const cleanupOwned=async({before,after,inputs,reservation})=>{
    while(clock()<reservation.expiresAt)await sleep(Math.min(10_000,reservation.expiresAt-clock()));
    const current=list(true);
    need(isDeepStrictEqual(current,after),'OWNER_PROBE_CLEANUP_IDENTITY_CHANGED');
    assertOwnerProbeReadback(download('predelete'),inputs);
    exactMain();noOtherWriter();
    cli(['functions','delete',SLUG,'--project-ref',PROJECT,'--yes']);
    need(isDeepStrictEqual(list(false),before),'OWNER_PROBE_DELETE_UNPROVED');
    announce('OWNER_NOTICE_PROBE_REMOVED_THREE_PERMANENT_FUNCTIONS_UNCHANGED');
  };
  exactMain();noOtherWriter();
  if(env.OWNER_NOTICE_CONFIRMATION==='CLEANUP-EXPIRED-OWNER-PROBE-ONLY'){
    const after=list(true),probe=after.find(row=>row.slug===SLUG);
    need(probe.verify_jwt===false,'OWNER_PROBE_POSTDEPLOY_IDENTITY');
    const before=after.filter(row=>row.slug!==SLUG);
    const owner=await readUniqueConfirmedOwner({key:env.SUPABASE_SERVICE_ROLE_KEY,fetchImpl});
    const downloaded=download('expired-probe');
    const reservation=readExpiredOwnerProbeReservation(downloaded,owner,clock());
    const expected=path.join(dir,'expected-expired');fs.mkdirSync(expected,{mode:0o700});
    const inputs=materializeOwnerProbe({sourceRoot,target:expected,reservation});
    assertOwnerProbeReadback(downloaded,inputs);
    privateFile(dir,'private-cleanup-intent.json',JSON.stringify({project:PROJECT,slug:SLUG,sourceHead:env.GITHUB_SHA,before,after,reservation}));
    await cleanupOwned({before,after,inputs,reservation});
    return{temporaryProbeRemoved:true,permanentFunctionsUnchanged:true,mailDeliveryProved:false,cleanupOnly:true};
  }
  const before=list(false);
  const owner=await readUniqueConfirmedOwner({key:env.SUPABASE_SERVICE_ROLE_KEY,fetchImpl});
  const reservedAt=clock(),reservation={...owner,noticeId:uuid(),reservedAt,expiresAt:reservedAt+10*60_000};
  need(UUID.test(reservation.noticeId),'OWNER_PROBE_RESERVATION');
  const deployment=path.join(dir,'deploy');fs.mkdirSync(deployment,{mode:0o700});
  const inputs=materializeOwnerProbe({sourceRoot,target:deployment,reservation});
  privateFile(dir,'private-intent.json',JSON.stringify({project:PROJECT,slug:SLUG,sourceHead:env.GITHUB_SHA,before,reservation}));
  exactMain();noOtherWriter();
  need(isDeepStrictEqual(list(false),before),'OWNER_PROBE_PREDEPLOY_INVENTORY_CHANGED');
  // No retry or cleanup follows an unproved write outcome.
  cli(['functions','deploy',SLUG,'--project-ref',PROJECT,'--use-api','--yes'],deployment);
  const after=list(true),probe=after.find(row=>row.slug===SLUG);
  need(probe.verify_jwt===false&&isDeepStrictEqual(after.filter(row=>row.slug!==SLUG),before),'OWNER_PROBE_POSTDEPLOY_IDENTITY');
  assertOwnerProbeReadback(download('postdeploy'),inputs);
  try{
    privateFile(dir,'private-deployment.json',JSON.stringify({after,reservation}));
    const preflight=await fetchImpl(ORIGIN+'/functions/v1/'+SLUG,{method:'OPTIONS',
      headers:{origin:'https://ravradar.dk','access-control-request-method':'POST',
        'access-control-request-headers':'apikey,authorization'},
      redirect:'error',cache:'no-store',signal:AbortSignal.timeout(5_000)});
    need(preflight.status===204&&!preflight.redirected
      &&preflight.headers.get('access-control-allow-origin')==='https://ravradar.dk'
      &&preflight.headers.get('access-control-allow-methods')==='POST'
      &&preflight.headers.get('access-control-allow-headers')==='apikey, authorization','OWNER_PROBE_GATEWAY_UNPROVED');
    need(clock()<reservation.expiresAt-60_000,'OWNER_PROBE_RESERVATION_TOO_LATE');
    announce('OWNER_NOTICE_PROBE_READY_UNTIL '+new Date(reservation.expiresAt).toISOString());
  }finally{
    // Only the positively qualified owned deployment reaches this cleanup.
    // A read-only gateway failure does not abandon it or open another window.
    await cleanupOwned({before,after,inputs,reservation});
  }
  return{temporaryProbeRemoved:true,permanentFunctionsUnchanged:true,mailDeliveryProved:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.length!==2)fail('OWNER_PROBE_NO_ARBITRARY_ARGUMENTS');
  runOwnerProbeWindow().catch(error=>{
    console.error(error?.code?.startsWith('OWNER_PROBE_')?error.code:'OWNER_PROBE_STOPPED_UNCONFIRMED');
    process.exitCode=1;
  });
}
