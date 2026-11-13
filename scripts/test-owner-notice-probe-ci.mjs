import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {qualifyOwnerProbeCli,ownerProbeInventory,readUniqueConfirmedOwner,runOwnerProbeWindow,
  materializeOwnerProbe} from './owner-notice-probe-ci.mjs';
import {currentWorkflowTargets} from './source-current-contract-plan.mjs';
import {planCurrentWorkflowInventory,qualifyCurrentWorkflowInventory} from './lib/pages-closure-historical-test-input.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const slug='inactivity-notice-owner-probe',project='https://afqhhdrkjfjtpadntdzo.supabase.co';
const ownerId='10000000-0000-4000-8000-000000000001',noticeId='20000000-0000-4000-8000-000000000002';
const permanent=['ravradar-assistant','submit-observation','trip-log'].map((slug,i)=>({
  slug,id:'30000000-0000-4000-8000-00000000000'+i,version:1,status:'ACTIVE',verify_jwt:false}));
const extra={slug,id:'40000000-0000-4000-8000-000000000001',version:1,status:'ACTIVE',verify_jwt:false};
const profile={id:ownerId,role:'owner',is_active:true};
const user={id:ownerId,email:'owner@example.invalid',email_confirmed_at:'2026-01-01T00:00:00Z'};
test('one current owner catalog closes new and changed workflows; the legacy inventory stays historical',async()=>{
  const legacy=['update-and-deploy.yml'],actual=[...legacy,'test-owner-notice-mail.yml'];
  const target=currentWorkflowTargets('.github/workflows/test-owner-notice-mail.yml');
  assert.deepEqual(target.owners,[{area:'mailOwnerProbe',commands:['node --test scripts/test-owner-notice-probe-ci.mjs']}]);
  const plan=planCurrentWorkflowInventory(actual,legacy);
  assert.deepEqual(plan.legacyNames,legacy);assert.deepEqual(plan.owners,target.owners);
  assert.equal(plan.scope,'HISTORICAL_INVENTORY_PLANNING_ONLY');
  // Execute the actual older caller with an unrelated current workflow comment.
  // Its immutable input must remain its own historical source, while the
  // changed current workflow still has a real owner below.
  const callerOracle=fs.readFileSync(path.join(root,'scripts/test-workflow-validation-order-4.0.108.mjs'),'utf8');
  const callerBegin=callerOracle.indexOf('const expectedWorkflowFiles = ');
  const callerEnd=callerOracle.indexOf('for (const names of [',callerBegin);
  assert(callerBegin>=0&&callerEnd>callerBegin);
  const callerModule=await import('./lib/pages-closure-historical-test-input.mjs');
  const originalNames=['backup-supabase-database.yml','maintain-admin-document-history.yml','verify-supabase-cli-local-restore.yml'];
  const callerPhysical=originalNames.map(name=>[name,fs.readFileSync(path.join(root,'.github/workflows',name))]);
  const callerSources=Object.fromEntries(callerPhysical);
  callerSources['backup-supabase-database.yml']=Buffer.concat([callerSources['backup-supabase-database.yml'],Buffer.from('\n# Synthetic unrelated current workflow comment\n')]);
  const callerCode=callerOracle.slice(callerBegin,callerEnd);
  const callerWithInventory=callerCode.replace('// Test-only:',
    `const currentPhysicalWorkflowFiles=[...expectedWorkflowFiles,'private-trip-weather-study.yml',
      'deploy-forecast-share.yml',...originalNames].sort();\n// Test-only:`);
  const callerResult=vm.runInNewContext(callerWithInventory+'\nphysicalWorkflowFiles',
    {assert,crypto:await import('node:crypto'),Buffer,originalNames,
      readHistoricalMaintenanceWorkflowSources:callerModule.readHistoricalMaintenanceWorkflowSources,
      workflowDirectory:'.github/workflows',fs:{readFileSync:file=>callerSources[path.basename(file)]}},
    {timeout:1000});
  assert(callerResult.length>0);

  const existing=[...legacy,'backup-supabase-database.yml'];
  const changed=planCurrentWorkflowInventory(existing,existing,['backup-supabase-database.yml']);
  const backupTarget=currentWorkflowTargets('.github/workflows/backup-supabase-database.yml');
  assert.deepEqual(changed.owners,backupTarget.owners);
  assert(changed.owners.some(owner=>owner.commands.includes('node --test scripts/test-supabase-database-backup-workflow.mjs')));
  for(const bad of [['unknown.yml'],['backup-supabase-database.yml','backup-supabase-database.yml'],['test-owner-notice-mail.yml']])
    assert.throws(()=>planCurrentWorkflowInventory(existing,existing,bad));
  const {readHistoricalMaintenanceWorkflowSources}=await import('./lib/pages-closure-historical-test-input.mjs');
  const historical=readHistoricalMaintenanceWorkflowSources();
  assert.deepEqual(Object.keys(historical).sort(),['backup-supabase-database.yml','maintain-admin-document-history.yml','verify-supabase-cli-local-restore.yml']);
  assert(Object.values(historical).every(Buffer.isBuffer));
  assert.throws(()=>readHistoricalMaintenanceWorkflowSources('caller origin'),/No caller-selected/);
  // Run the existing exact historical oracle on its real committed inputs.
  const oracle=fs.readFileSync(path.join(root,'scripts/test-workflow-validation-order-4.0.108.mjs'),'utf8');
  const begin=oracle.indexOf('const expectedWorkflowFiles = '),end=oracle.indexOf('const reviewedMaintenanceSources = ');
  assert(begin>=0&&end>begin);
  const historicalResult=vm.runInNewContext(oracle.slice(begin,end)+
    `inverseReviewedMaintenanceWorkflowInventory([...expectedWorkflowFiles,'private-trip-weather-study.yml',
      'deploy-forecast-share.yml',...Object.keys(reviewedMaintenanceWorkflows)].sort(),historicalSources)`,
    {assert,crypto:await import('node:crypto'),Buffer,historicalSources:historical});
  assert(historicalResult.length>0);

  for(const [names,before]of [
    [actual.slice(1),legacy],[actual.concat(actual[0]),legacy],[actual,legacy.concat(legacy[0])],
    [actual.concat('unknown-writer.yml'),legacy],[actual.concat('../outside.yml'),legacy],
  ])assert.throws(()=>planCurrentWorkflowInventory(names,before));
  assert.equal(currentWorkflowTargets('.github/workflows/unknown-writer.yml'),null);
  assert.equal(currentWorkflowTargets('../outside.yml'),null);
  assert.throws(()=>qualifyCurrentWorkflowInventory('synthetic override'),/No caller-selected/);
});
function fixture(change={}){
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'rr-mail-ci-')),calls=[],announcements=[];
  let deployed=!!change.cleanupOnly,deleted=false,deployment,now=1_800_000_000_000,listReads=0;
  const env={RUNNER_TEMP:tmp,GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/main',
    GITHUB_WORKFLOW:'Test one RavRadar owner notice',GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'42',
    GITHUB_SHA:'a'.repeat(40),GITHUB_REPOSITORY:'synthetic-owner/synthetic-repo',
    OWNER_NOTICE_CONFIRMATION:change.cleanupOnly?'CLEANUP-EXPIRED-OWNER-PROBE-ONLY':'TEST-EXISTING-OWNER-MAIL-ONCE',SUPABASE_ACCESS_TOKEN:'synthetic-management',
    SUPABASE_SERVICE_ROLE_KEY:'synthetic-service',GITHUB_TOKEN:'synthetic-github',...change.env};
  if(change.cleanupOnly){
    deployment=path.join(tmp,'existing-expired');
    materializeOwnerProbe({sourceRoot:root,target:deployment,reservation:{ownerId,recipient:user.email,noticeId,
      reservedAt:now-600_001,expiresAt:now-1,...change.cleanupReservation}});
    if(change.cleanupReservationText)fs.writeFileSync(path.join(deployment,'supabase/functions/'+slug+'/reservation.mjs'),change.cleanupReservationText);
  }
  const fetchImpl=async(url,options)=>{
    calls.push({url:String(url),options});
    if(String(url).includes('/rest/v1/profiles?'))return Response.json(change.profiles??[profile]);
    if(String(url).includes('/auth/v1/admin/users/'))return Response.json(change.user??user);
    assert.equal(options.method,'OPTIONS');assert.equal(options.headers.origin,'https://ravradar.dk');
    if(change.gatewayThrows)throw Error('synthetic gateway read failed');
    return new Response(null,{status:change.gatewayStatus??204,headers:{'access-control-allow-origin':'https://ravradar.dk',
      'access-control-allow-methods':'POST','access-control-allow-headers':'apikey, authorization'}});
  };
  const run=(command,args,options)=>{
    calls.push({command,args,options,at:now});
    if(command==='git')return args[0]==='fetch'?'':env.GITHUB_SHA;
    if(command==='gh')return JSON.stringify([{workflow_runs:change.otherWriter?[{id:99,path:'.github/workflows/update-and-deploy.yml'}]:[{id:42}]}]);
    assert.equal(command,'supabase');assert.equal(options.env.SUPABASE_ACCESS_TOKEN,'synthetic-management');
    for(const key of ['GITHUB_TOKEN','GH_TOKEN','SUPABASE_SERVICE_ROLE_KEY'])assert.equal(options.env[key],undefined);
    assert(!args.includes('--prune'));assert(args.includes('afqhhdrkjfjtpadntdzo'));
    if(args[1]==='list'){
      listReads++;
      return JSON.stringify(deployed&&!deleted?[...permanent,{...extra,...((change.identityChanged||(change.cleanupIdentityChanged&&listReads>1))?{version:2}:{})}]:permanent);
    }
    assert.equal(args[2],slug);
    if(args[1]==='deploy'){
      deployed=true;deployment=options.cwd;
      if(change.deployUnknown)throw Error('synthetic secret/raw provider error');
    }else if(args[1]==='download'){
      fs.cpSync(path.join(deployment,'supabase'),path.join(options.cwd,'supabase'),{recursive:true});
      if(change.sourceChanged)fs.appendFileSync(path.join(options.cwd,'supabase/functions/'+slug+'/reservation.mjs'),'// changed');
      if(change.sourceCodeChanged)fs.appendFileSync(path.join(options.cwd,'supabase/functions/'+slug+'/index.ts'),'// changed');
    }else if(args[1]==='delete'){
      deleted=true;if(change.deleteUnknown)throw Error('synthetic unknown delete');
    }else assert.fail('Unexpected CLI call');
    return '';
  };
  return{tmp,calls,announcements,options:{env,sourceRoot:root,platform:'linux',run,fetchImpl,
    clock:()=>now,sleep:async ms=>{now+=ms;},uuid:()=>noticeId,announce:x=>announcements.push(x)},
    cleanup(){const target=path.resolve(tmp);assert(target.startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(target,{recursive:true,force:true});}};
}
test('fixed normal CLI window: one named deploy, exact readback, expiry and one named delete',async()=>{
  const f=fixture();try{
    assert.deepEqual(await runOwnerProbeWindow(f.options),{temporaryProbeRemoved:true,permanentFunctionsUnchanged:true,mailDeliveryProved:false});
    const writes=f.calls.filter(c=>c.command==='supabase'&&['deploy','delete'].includes(c.args[1]));
    assert.deepEqual(writes.map(c=>c.args[1]),['deploy','delete']);
    assert(f.announcements[0].startsWith('OWNER_NOTICE_PROBE_READY_UNTIL '));
    assert(!JSON.stringify(f.announcements).includes(user.email));
    assert.equal(f.calls.filter(c=>c.url?.includes('resend.com')).length,0);
  }finally{f.cleanup();}
});
for(const [name,change,code,deploys,deletes]of [
  ['other writer',{otherWriter:true},'OWNER_PROBE_OTHER_WRITER',0,0],
  ['two owners',{profiles:[profile,profile]},'OWNER_PROBE_UNIQUE_ACTIVE_OWNER',0,0],
  ['wrong auth owner',{user:{...user,id:noticeId}},'OWNER_PROBE_CONFIRMED_OWNER',0,0],
  ['unconfirmed owner',{user:{...user,email_confirmed_at:null}},'OWNER_PROBE_CONFIRMED_OWNER',0,0],
  ['unknown deploy',{deployUnknown:true},'OWNER_PROBE_CLI_OUTCOME_UNPROVED',1,0],
  ['changed actual source',{sourceChanged:true},'OWNER_PROBE_EXACT_SOURCE_UNPROVED',1,0],
  ['unknown delete',{deleteUnknown:true},'OWNER_PROBE_CLI_OUTCOME_UNPROVED',1,1],
  ['wrong branch',{env:{GITHUB_REF:'refs/heads/other'}},'OWNER_PROBE_AUTHORITY',0,0],
]){
  test('refuse '+name+' without retries or unrelated writes',async()=>{
    const f=fixture(change);try{
      await assert.rejects(runOwnerProbeWindow(f.options),error=>error.code===code);
      for(const [operation,count]of [['deploy',deploys],['delete',deletes]])
        assert.equal(f.calls.filter(c=>c.command==='supabase'&&c.args[1]===operation).length,count);
    }finally{f.cleanup();}
  });
}
for(const [name,change,code]of [
  ['rejected OPTIONS',{gatewayStatus:404},'OWNER_PROBE_GATEWAY_UNPROVED'],
  ['unknown OPTIONS read',{gatewayThrows:true},undefined],
]){
  test('known owned probe is cleaned after '+name+' without READY or a new reservation',async()=>{
    const f=fixture(change);try{
      await assert.rejects(runOwnerProbeWindow(f.options),error=>code?error.code===code:error.message==='synthetic gateway read failed');
      const writes=f.calls.filter(c=>c.command==='supabase'&&['deploy','delete'].includes(c.args[1]));
      assert.deepEqual(writes.map(c=>c.args[1]),['deploy','delete']);
      assert(writes[1].at>=writes[0].at+600_000);
      assert(!f.announcements.some(x=>x.startsWith('OWNER_NOTICE_PROBE_READY_UNTIL')));
      assert.equal(f.announcements.at(-1),'OWNER_NOTICE_PROBE_REMOVED_THREE_PERMANENT_FUNCTIONS_UNCHANGED');
    }finally{f.cleanup();}
  });
}
test('cleanup-only removes the matched expired fixed probe without deploy, new UUID, OPTIONS or mail',async()=>{
  const f=fixture({cleanupOnly:true});try{
    f.options.uuid=()=>assert.fail('Cleanup must not mint another reservation');
    f.options.sleep=()=>assert.fail('Already expired cleanup must not open a window');
    assert.deepEqual(await runOwnerProbeWindow(f.options),{temporaryProbeRemoved:true,permanentFunctionsUnchanged:true,mailDeliveryProved:false,cleanupOnly:true});
    const writes=f.calls.filter(c=>c.command==='supabase'&&['deploy','delete'].includes(c.args[1]));
    assert.deepEqual(writes.map(c=>c.args[1]),['delete']);
    assert.equal(f.calls.filter(c=>c.url&&c.options.method==='OPTIONS').length,0);
    assert.equal(f.calls.filter(c=>c.url?.includes('resend.com')).length,0);
    assert(!f.announcements.some(x=>x.startsWith('OWNER_NOTICE_PROBE_READY_UNTIL')));
  }finally{f.cleanup();}
});
for(const [name,change,code,deletes]of [
  ['active reservation',{cleanupReservation:{reservedAt:1_800_000_000_000-599_999,expiresAt:1_800_000_000_001}},'OWNER_PROBE_RESERVATION_UNPROVED',0],
  ['different owner reservation',{cleanupReservation:{ownerId:noticeId}},'OWNER_PROBE_RESERVATION_UNPROVED',0],
  ['wrong reservation interval',{cleanupReservation:{reservedAt:1_800_000_000_000-600_002}},'OWNER_PROBE_RESERVATION_UNPROVED',0],
  ['executable reservation',{cleanupReservationText:'export default (()=>({}));\n'},'OWNER_PROBE_JSON_UNPROVED',0],
  ['changed source',{sourceChanged:true},'OWNER_PROBE_RESERVATION_UNPROVED',0],
  ['changed executable source',{sourceCodeChanged:true},'OWNER_PROBE_EXACT_SOURCE_UNPROVED',0],
  ['changed cleanup identity',{cleanupIdentityChanged:true},'OWNER_PROBE_CLEANUP_IDENTITY_CHANGED',0],
  ['unknown delete',{deleteUnknown:true},'OWNER_PROBE_CLI_OUTCOME_UNPROVED',1],
]){
  test('cleanup-only refuses '+name+' without deployment or delete retry',async()=>{
    const f=fixture({cleanupOnly:true,...change});try{
      await assert.rejects(runOwnerProbeWindow(f.options),error=>error.code===code);
      assert.equal(f.calls.filter(c=>c.command==='supabase'&&c.args[1]==='deploy').length,0);
      assert.equal(f.calls.filter(c=>c.command==='supabase'&&c.args[1]==='delete').length,deletes);
    }finally{f.cleanup();}
  });
}
test('CLI/help and inventory fail closed',()=>{
  qualifyOwnerProbeCli(args=>args[0]==='--version'?'2.117.0':'--project-ref --output --workdir --use-api --yes');
  assert.throws(()=>qualifyOwnerProbeCli(()=>''),/OWNER_PROBE_CLI_VERSION/);
  assert.throws(()=>ownerProbeInventory([...permanent,extra]),/OWNER_PROBE_INVENTORY/);
  assert.throws(()=>ownerProbeInventory([{...permanent[0],version:0},...permanent.slice(1)]),/OWNER_PROBE_INVENTORY/);
});
test('the actual normal owner button reaches the unchanged nine-file probe once',async()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'rr-mail-owner-'));
  const oldFetch=globalThis.fetch,oldDeno=globalThis.Deno;let sends=0,registered;
  const providerId='5b4529f7-1f0d-4276-a253-dbe5c1baa4f0',session={user:{id:ownerId},access_token:'synthetic.owner.token'};
  try{
    materializeOwnerProbe({sourceRoot:root,target:tmp,reservation:null});
    // Restore the existing inert template: deployment materialization above deliberately writes null.
    globalThis.Deno={serve:h=>{registered=h;},env:{get:key=>({
      SUPABASE_URL:project,SUPABASE_ANON_KEY:'synthetic-public',
      TRIP_GATEWAY_SHARED_SECRET:'synthetic-shared'.repeat(3),RAVRADAR_RESEND_NOTICE_SEND_KEY:'re_synthetic',
    })[key]}};
    globalThis.fetch=async(input,options)=>{
      const url=String(input);
      if(url===project+'/auth/v1/user')return Response.json({id:ownerId});
      if(url.startsWith(project+'/rest/v1/profiles?'))return Response.json([profile]);
      assert.equal(url,'https://api.resend.com/emails');sends++;
      assert.deepEqual(JSON.parse(options.body).to,[user.email]);
      return Response.json({id:providerId.toUpperCase()});
    };
    const {createOwnerNoticeEdgeHandler}=await import(pathToFileURL(path.join(tmp,'supabase/functions/'+slug+'/index.ts')).href);
    assert.equal((await registered(new Request(project+'/functions/v1/'+slug,{method:'POST'}))).status,404);
    const handler=createOwnerNoticeEdgeHandler({ownerId,recipient:user.email,noticeId,reservedAt:Date.now()-100,expiresAt:Date.now()+10_000});
    const button={disabled:false,isConnected:true},status={textContent:''};
    const content={insertAdjacentHTML(){},querySelector:id=>id==='#sendOwnerNoticeProbe'?button:status};
    const context={content,state:{tab:'system',access:{profile:{role:'owner'}}},SITE_TEST_MODE:false,
      location:{origin:'https://ravradar.dk',pathname:'/admin.html'},PUBLIC_CONFIG:{supabaseUrl:project,supabasePublishableKey:'synthetic-public'},
      currentAdminRead:()=>()=>true,onAuthChange:()=>()=>{},currentSession:()=>session,requireFreshSession:async()=>session,AbortSignal,
      fetch:async(url,options)=>{const headers=new Headers(options.headers);headers.set('origin','https://ravradar.dk');return handler(new Request(url,{...options,headers}));}};
    const source=fs.readFileSync(path.join(root,'js/ui/admin-dashboard.js'),'utf8');
    const start=source.indexOf('let ownerNoticeProbeAttempted=false;'),end=source.indexOf('\nfunction defaultVisitorPeriod(',start);
    assert(start>=0&&end>start);
    vm.runInNewContext(source.slice(start,end)+'\nmountOwnerNoticeProbe();',context);
    await button.onclick();await button.onclick();
    assert.equal(sends,1);assert(status.textContent.includes(providerId));assert(!status.textContent.includes(user.email));
  }finally{
    globalThis.fetch=oldFetch;globalThis.Deno=oldDeno;
    const target=path.resolve(tmp);assert(target.startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(target,{recursive:true,force:true});
  }
});
test('normal workflow qualifies source and CLI before private credentials; no personal inputs',()=>{
  const workflow=fs.readFileSync(path.join(root,'.github/workflows/test-owner-notice-mail.yml'),'utf8');
  assert(workflow.indexOf('Qualify pinned CLI help')<workflow.indexOf('secrets.SUPABASE_ACCESS_TOKEN'));
  assert(workflow.indexOf('Reject missing actual source qualification')<workflow.indexOf('secrets.SUPABASE_ACCESS_TOKEN'));
  assert(workflow.includes('group: ravradar-weather-production-v2'));
  assert(workflow.includes('options: [TEST-EXISTING-OWNER-MAIL-ONCE, CLEANUP-EXPIRED-OWNER-PROBE-ONLY]'));
  assert(!/upload-artifact|--prune|recipient:|owner_id:|RAVRADAR_RESEND_NOTICE_SEND_KEY:/.test(workflow));
  assert.deepEqual([...workflow.matchAll(/secrets\.([A-Z0-9_]+)/g)].map(m=>m[1]).sort(),
    ['SUPABASE_ACCESS_TOKEN','SUPABASE_SERVICE_ROLE_KEY']);
  assert(!/secrets\s*:\s*inherit|secrets\s*\[|:\s*write\b/.test(workflow));
  assert.deepEqual([...workflow.matchAll(/^\s*(?:-\s+)?uses: (.+)$/gm)].map(m=>m[1]),
    ['actions/checkout@v7','actions/setup-node@v7','supabase/setup-cli@3c2f5e2ae34c34e428e8e206e2c4d21fa2d20fbf','actions/cache/restore@v6']);
  assert.equal([...workflow.matchAll(/^  group: /gm)].length,1);
  assert.equal([...workflow.matchAll(/^  cancel-in-progress: false$/gm)].length,1);
  const privateStep=workflow.slice(workflow.indexOf('      - name: Open one fixed temporary owner window'));
  assert(privateStep.startsWith('      - name: Open one fixed temporary owner window and remove only that probe\n        run: node scripts/owner-notice-probe-ci.mjs\n'));
  assert(!workflow.slice(0,workflow.indexOf(privateStep)).includes('secrets.'));
});
