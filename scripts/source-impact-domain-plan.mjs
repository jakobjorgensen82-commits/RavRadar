// Domain planning only. ROOT review, real commands and V2 consumption are separate.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {analyzeSourceDomainInputs} from './source-impact-domain-inputs.mjs';
import {scanAllSourceDependencies,dependencySourceLiterals} from './lib/source-impact-control-imports.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const REGISTRY_SHA256='3970bc86fb8afd99d193507b82337c1068aa368f6d62ff728988fc21da9577f4';
const REGISTRY597_SHA256='a7ccfba2b2f631ccc358342e2c3b87e1cb1edbd54311148c94822fddaa6dbcfa';
const REGISTRY598_SHA256='b24c90a74017752ded98d4ff3188405ad0fe0833718fd096f93cfcd753cebeaf';
const PAGES_TRANSPORT_FIELDS=Object.freeze({
  "scripts/lib/pages-per-artifact-identity.mjs": [],
  "scripts/lib/pages-sealed-retry-decision.mjs": [
    [
      "MINIMUM_RECOVERY_WINDOW_MS",
      19,
      30
    ],
    [
      "MAXIMUM_OBSERVATIONS",
      2,
      121
    ]
  ],
  "scripts/lib/publish-sealed-pages-with-recovery.mjs": [
    [
      "horizon",
      2,
      121
    ],
    [
      "intervalMs",
      5000,
      10000
    ]
  ],
  "scripts/lib/run-sealed-pages-deployment.mjs": [
    [
      "intervalMs",
      5000,
      10000
    ],
    [
      "maxAttempts",
      60,
      121
    ]
  ]
});
// A cumulative FULL baseline may predate this reviewed control code. Its three
// owners still run the normal independent CONTROL qualification in that case.
const NARROW_SCOPE_CONTROL_OWNERS = new Set([
  'scripts/source-impact-domain-plan.mjs', 'scripts/lib/source-impact-domain-owners-598.json',
  'scripts/source-targeted-producer.mjs', 'scripts/source-impact-full-baseline.mjs',
  'scripts/native-postgres-evidence.mjs', 'scripts/test-native-postgres-evidence.mjs',
  'scripts/test-source-impact-domain-plan.mjs',
]);
const LOCAL_RESTORE_FIXTURE='scripts/test-supabase-cli-local-restore.mjs';
const LOCAL_RESTORE_SELF_TEST='node '+LOCAL_RESTORE_FIXTURE+' --self-test';
const LOCAL_RESTORE_WORKFLOW='.github/workflows/verify-supabase-cli-local-restore.yml';
const LOCAL_RESTORE_WORKFLOW_BLOB='6cb1db7082c7a16efa5947b7c97a6659459aedc7';
const LOCAL_RESTORE_IMPORTS='\nconst P=Object.freeze(';
const LOCAL_RESTORE_DISPATCH='if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){';
const LOCAL_RESTORE_IMPORTS_SHA256='dd05a1d036c7d9afff9ae2ba4c0511dff199ad4faf5baab258b2a17b0cd728d4';
const LOCAL_RESTORE_DISPATCH_SHA256='2e0d348293d622790375df6457726e0af04d92c9e23aedbac42033aa5049443c';
// The public English dialog change owns three shared entrypoints only as the exact reviewed cohort.
const EN2_ENTRYPOINTS=['app.js','bootstrap.js','index.html'];
const EN2_GENERATION='scripts/test-map-timeline-generation.mjs';
const EN2_MAP_PARENT='node --test scripts/test-map-forecast-panel.mjs '+EN2_GENERATION;
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const oid=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);
const relative=value=>typeof value==='string'&&/^[A-Za-z0-9_./-]+$/.test(value)&&!value.startsWith('/')
  &&!value.includes('//')&&!value.split('/').some(part=>part==='.'||part==='..');
const domainNames=['postgres','d1','historical584National','currentCandidateGAudit','controls','adminUI','sharing','documentation'];
const base=()=>({schemaVersion:1,status:'PLANNED',selection:'FULL',commands:[],
  domains:Object.fromEntries(domainNames.map(name=>[name,{status:'NOT_APPLICABLE',executed:false,commands:[]}])),
  inputDigests:{},closureSha256:'',inventorySha256:'',changedRows:0,reasonCodes:[],authority:'PLANNING_ONLY',
  baselineQualified:false,skipAuthorized:false,productionAuthority:false});
const environment=()=>({...Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP']
  .filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]])),LANG:'C',LC_ALL:'C',
  GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0',
  GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':'/dev/null',
  GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'protocol.allow',GIT_CONFIG_VALUE_0:'never'});
// Pin every byte except the bounded transport fields. In particular auth, slots,
// producer admission and transport identities cannot change in this domain.
function pagesTransportFrame(file, body){
  let source=new TextDecoder('utf8',{fatal:true}).decode(body);
  const rules=PAGES_TRANSPORT_FIELDS[file];
  if(!rules||source.length>32*1024)return null;
  if(file==='scripts/lib/pages-per-artifact-identity.mjs'){
    const pattern=/^const PENDING = new Set\(\[\n  (.+),\n\]\);$/gm;
    const matches=[...source.matchAll(pattern)];if(matches.length!==1)return null;
    const statuses=matches[0][1].split(', ');
    const allowed=["'deployment_queued'","'deployment_in_progress'","'deployment_working'","'syncing_files'"];
    if(!statuses.includes(allowed[0])||!statuses.includes(allowed[3])
      ||new Set(statuses).size!==statuses.length||statuses.some(status=>!allowed.includes(status)))return null;
    source=source.replace(pattern,'<reviewed-pending-statuses>');
  }
  for(const [name,min,max] of rules){
    const suffix=name==='MINIMUM_RECOVERY_WINDOW_MS'?' [*] minute':'';
    const pattern=new RegExp('^((?:export )?const '+name+' = )([0-9][0-9_]*)('+suffix+';)$','gm');
    const matches=[...source.matchAll(pattern)];if(matches.length!==1)return null;
    const literal=matches[0][2],value=Number(literal.replaceAll('_',''));
    if(!/^[1-9][0-9]*(?:_[0-9]+)*$/.test(literal)||!Number.isInteger(value)||value<min||value>max)return null;
    source=source.replace(pattern,'$1<reviewed-transport-bound>$3');
  }
  return sha(source);
}
function handbookFrame(source){
  const anchor="values('handbook','",start=source.indexOf(anchor);assert(start>=0&&source.indexOf(anchor,start+1)===-1);
  let end=start+anchor.length;
  for(;end<source.length;end++)if(source[end]==="'"){if(source[end+1]==="'"){end++;continue;}break;}
  assert(source.slice(end,end+14).startsWith("'::jsonb,null)"));
  const body=source.slice(start+anchor.length,end).replaceAll("''","'");JSON.parse(body);
  return {frame:source.slice(0,start+anchor.length)+'<handbook-json>'+source.slice(end),body};
}
function sourceReferences(file,scan,index){
  const imports=[],resources=[];
  const resolve=specifier=>{
    const clean=specifier.split(/[?#]/,1)[0],target=path.posix.normalize(path.posix.join(path.posix.dirname(file),clean));
    if(!relative(target))throw Error('IMPORT_ESCAPES_SOURCE:'+file);
    const found=[target,target+'.js',target+'.mjs',target+'.json',target+'/index.js'].find(name=>index.has(name));
    if(!found)throw Error('IMPORT_SOURCE_MISSING:'+file);return found;
  };
  for(const row of scan.imports)if(row.specifier?.startsWith('./')||row.specifier?.startsWith('../'))imports.push(resolve(row.specifier));
  for(const value of dependencySourceLiterals(scan)){
    if(!/\.(?:mjs|js|json|sql|yml|py|html|css|ts|toml|md|txt)$/.test(value))continue;
    for(const candidate of [value,path.posix.normalize(path.posix.join(path.posix.dirname(file),value))])
      if(relative(candidate)&&index.has(candidate))resources.push(candidate);
  }
  return {imports:[...new Set(imports)].sort(),resources:[...new Set(resources)].sort()};
}
// The fixed597 overlay preserves the genuine594 registry as historical data.
// Its complete bytes are pinned here; callers cannot supply owners or capabilities.
function registry597(legacyBytes){
  const bytes=fs.readFileSync(new URL('./lib/source-impact-domain-owners-597.json',import.meta.url));
  assert.equal(sha(bytes),REGISTRY597_SHA256,'DOMAIN_REGISTRY_BYTES');
  const delta=JSON.parse(bytes),registry=JSON.parse(legacyBytes);
  assert.equal(delta.schemaVersion,1);assert.equal(delta.id,'CLOSED_REVIEWED_597_DOMAIN_DELTA');
  assert.equal(delta.baseRegistrySha256,REGISTRY_SHA256);
  assert.equal(delta.sourceReference.head,'45594e185f087ff02c8e72649d02cb45cf79cf16');
  assert.equal(delta.sourceReference.tree,'20fd7b1a49dbb07edf9157658ddb38bb1ec75656');
  for(const owner of delta.owners){
    assert(relative(owner.path)&&!registry.owners.some(row=>row.path===owner.path));
    registry.owners.push(owner);
  }
  for(const [file,row]of Object.entries(delta.sources)){
    assert(relative(file));
    assert.equal(registry.sources[file]?sha(JSON.stringify(registry.sources[file])):null,row.beforeDefinitionSha256);
    registry.sources[file]=row.definition;
  }
  for(const file of delta.resourceFiles){assert(relative(file)&&!registry.resourceFiles.includes(file));registry.resourceFiles.push(file);}
  return {value:registry,digest:sha(Buffer.concat([legacyBytes,bytes])),blobBudgetBytes:56*1024*1024};
}
// Additive exact598 CODE definitions over the unchanged594+597 registry.
function registry598(legacyBytes){
  const previous=registry597(legacyBytes);
  const bytes=fs.readFileSync(new URL('./lib/source-impact-domain-owners-598.json',import.meta.url));
  assert.equal(sha(bytes),REGISTRY598_SHA256,'DOMAIN_REGISTRY_BYTES');
  const delta=JSON.parse(bytes),registry=previous.value;
  assert.equal(delta.schemaVersion,1);assert.equal(delta.id,'CLOSED_REVIEWED_598_DOMAIN_DELTA');
  assert.equal(delta.baseRegistrySha256,previous.digest);
  assert.equal(delta.sourceReference.head,'bd9cf518fe798ddea45d2b835f324f6e2bea06fc');
  assert.equal(delta.sourceReference.tree,'2f71c562eea774ca03996802f83bdad7cccd43cc');
  registry.assistantWindFollowup=delta.assistantWindFollowup;
  registry.assistantAdminUi=delta.assistantAdminUi;
  for(const owner of delta.owners){
    assert(relative(owner.path)&&!registry.owners.some(row=>row.path===owner.path));registry.owners.push(owner);
  }
  for(const [file,row]of Object.entries(delta.sources)){
    assert(relative(file));const before=registry.sources[file];
    assert.equal(before?sha(JSON.stringify(before)):null,row.beforeDefinitionSha256);
    if(before)for(const [key,values]of Object.entries(before))for(const value of values)
      assert(row.definition[key].includes(value),'DOMAIN_PRIOR_SOURCE_BOUNDARY_REQUIRED');
    registry.sources[file]=row.definition;
  }
  for(const file of delta.resourceFiles){assert(relative(file)&&!registry.resourceFiles.includes(file));registry.resourceFiles.push(file);}
  // Only the fixed whole-source pairs reviewed in this598 overlay may extend the historical grammar.
  for(const [file,pairs]of Object.entries(delta.exactSourceTransitions)){
    assert(['.github/workflows/deploy-code-only-repair.yml',
      '.github/workflows/maintain-admin-document-history.yml','admin.html',
      'supabase/functions/_shared/rav-assistant-contract.ts','supabase/functions/ravradar-assistant/index.ts',
      'scripts/test-rav-assistant-main-edge-roundtrip.mjs',
      'scripts/run-hosted-supabase-backup.mjs','scripts/test-supabase-database-backup-workflow.mjs',
      'js/services/forecast-share-contract.js','scripts/forecast-share/handler.mjs',
      'scripts/test-map-forecast-panel.mjs','.github/workflows/validate-pull-request.yml',
      'scripts/update-dmi-bulk.py','scripts/test-dmi-dkss-primary-mode.py',
      'scripts/test-current-operational-python-contracts.mjs','scripts/test-runner-android-sdk-reclaim.mjs',
      'service-worker.js','scripts/test-public-cold-start-4.0.303.mjs'].includes(file));
    const previousPairs=registry.exactSourceTransitions[file]??[];
    for(const pair of pairs){assert(/^[a-f0-9]{64}\/[a-f0-9]{64}$/.test(pair));assert(!previousPairs.includes(pair));previousPairs.push(pair);}
    registry.exactSourceTransitions[file]=previousPairs;
  }
  const restoreOwners=registry.owners.filter(owner=>owner.localRestoreSelfTest===true);
  assert.deepEqual(restoreOwners,[{path:LOCAL_RESTORE_FIXTURE,domains:['controls'],controlQualification:true,
    localRestoreSelfTest:true,commands:[['controls',LOCAL_RESTORE_SELF_TEST]]}]);
  // These two existing adminUI address owners must each close the actual cache contracts.
  // This fixed598 loop cannot admit caller-supplied owner or command overrides.
  for(const file of ['admin.html','service-worker.js']){
    const matches=registry.owners.filter(row=>row.path===file);assert.equal(matches.length,1);
    const owner=matches[0];
    assert.deepEqual(owner,{path:file,domains:['adminUI'],exactSourceTransition:true,commands:[
      ['adminUI','node scripts/test-ravscore-public-data-service-binding.mjs'],
      ['adminUI','node scripts/test-admin-active-ravscore-runtime.mjs'],
      ['adminUI','node scripts/test-ravscore-public-browser-closure.mjs']]});
    for(const command of ['node scripts/test-public-cold-start-4.0.303.mjs','node scripts/test-admin-config-production-contract-4.0.94.mjs']){
      assert(!owner.commands.some(row=>row[1]===command));owner.commands.push(['adminUI',command]);
    }
  }
  assert.deepEqual(Object.keys(delta.pagesTransport.frames).sort(),Object.keys(PAGES_TRANSPORT_FIELDS).sort());
  return {value:registry,digest:sha(Buffer.concat([Buffer.from(previous.digest,'hex'),bytes])),
    blobBudgetBytes:previous.blobBudgetBytes,pagesTransport:delta.pagesTransport};
}
export function planSourceDomainImpactFromGit(input){
  const out=base();
  const full=reason=>{out.selection='FULL';out.commands=[];out.reasonCodes=[reason];
    out.domains=base().domains;out.domains.postgres.status='REQUIRED';
    out.domains.historical584National.status='REQUIRED';return out;};
  try{
    assert.equal(arguments.length,1);assert(input&&Object.getPrototypeOf(input)===Object.prototype);
    assert.deepEqual(Object.keys(input).sort(),['baselineCommit','candidateCommit','expectedHead']);
    assert(Object.values(input).every(oid));
    const analysis=analyzeSourceDomainInputs(input);
    if(analysis.analysis!=='COMPLETE'){out.status='REFUSED';return full('DOMAIN_INPUT_ANALYSIS_REFUSED');}
    out.inputDigests={postgresBefore:analysis.actualPostgresInput.before.inputSha256,postgresAfter:analysis.actualPostgresInput.after.inputSha256,
      CBefore:analysis.models.C.before.bundleSha256,CAfter:analysis.models.C.after.bundleSha256,
      IBefore:analysis.models.I.before.bundleSha256,IAfter:analysis.models.I.after.bundleSha256,
      TBefore:analysis.models.T.before.implementationSha256,TAfter:analysis.models.T.after.implementationSha256};
    out.inventorySha256=analysis.completeGitDiff.rawInventorySha256;out.changedRows=analysis.completeGitDiff.changedRows;
    if(!analysis.actualPostgresInput.unchanged||!Object.values(analysis.models).every(value=>value.unchanged))
      return full('POSTGRES_OR_MODEL_INPUT_CHANGED');
    if(!out.changedRows)return full('EMPTY_DIFF_REQUIRES_NO_NEW_SHORT_PROOF');
    const registryBytes=fs.readFileSync(new URL('./lib/source-impact-domain-owners-594.json',import.meta.url));
    assert.equal(sha(registryBytes),REGISTRY_SHA256,'DOMAIN_REGISTRY_BYTES');
    const is598=analysis.profile?.id==='REVIEWED_598_DOMAIN_INPUTS_C101_I100_T12';
    const selectedRegistry=is598?registry598(registryBytes):analysis.profile?.id==='REVIEWED_597_DOMAIN_INPUTS_C101_I100_T12'
      ?registry597(registryBytes):{value:JSON.parse(registryBytes),digest:REGISTRY_SHA256,blobBudgetBytes:48*1024*1024};
    const registry=selectedRegistry.value,registrySha256=selectedRegistry.digest;
    const owners=new Map(registry.owners.map(row=>[row.path,row])),selected=new Set(['controls']);
    const git=(args,options={})=>execFileSync('git',['-C',ROOT,...args],{env:environment(),timeout:10000,
      maxBuffer:64*1024*1024,stdio:['pipe','pipe','pipe'],...options});
    const tree=git(['ls-tree','-rz','--full-tree',input.candidateCommit]).toString('utf8').split('\0').filter(Boolean)
      .map(line=>{const m=/^(\d{6}) (blob|commit) ([a-f0-9]{40})\t([\s\S]+)$/.exec(line);assert(m);
        return {file:m[4],mode:m[1],type:m[2],oid:m[3]};});
    const index=new Map(tree.map(row=>[row.file,row])),inventory=analysis.completeGitDiff.inventory;
    let qualification=!analysis.evidenceControls.plannerTrustChain.unchanged;
    const changes=[];
    const en2=is598?registry.assistantWindFollowup:null;
    const adminUi=is598?registry.assistantAdminUi:null;
    const uiOnly=new Set(['js/services/admin-document-store.js','js/services/visitor-report-service.js',
      'scripts/test-private-visitor-statistics-4.0.215.mjs','scripts/test-public-json-reader-bridge.mjs','scripts/validate-release-version.mjs']);
    for(const row of inventory){
      const file=new TextDecoder('utf8',{fatal:true,ignoreBOM:true}).decode(Buffer.from(row.pathUtf8Hex,'hex'));
      const owner=owners.get(file)??(en2&&EN2_ENTRYPOINTS.includes(file)
        ?{domains:['adminUI'],controlQualification:true,exactSourceTransition:true}:null)
        ??(adminUi&&uiOnly.has(file)&&Object.hasOwn(adminUi.frames,file)
          ?{domains:[file==='scripts/validate-release-version.mjs'?'controls':'adminUI'],controlQualification:true,exactSourceTransition:true}:null);
      if(!relative(file)||!owner)return full('UNCLASSIFIED_OWNER:'+file);
      if(!['100644','000000'].includes(row.beforeMode)||row.afterMode!=='100644')return full('OWNER_MODE_OR_DELETION:'+file);
      for(const domain of owner.domains)selected.add(domain);
      if(owner.controlQualification)qualification=true;changes.push({file,row,owner});
    }
    const productChanges=changes.filter(change=>{
      if(change.file==='docs/rdks/10_DECISIONS/DEC-0302-CHANGE-BASED-VALIDATION-AND-CONTROL-CLEANUP.md'
        && change.owner.domains.length===1 && change.owner.domains[0]==='documentation')return false;
      return !NARROW_SCOPE_CONTROL_OWNERS.has(change.file)||change.owner.controlQualification!==true;
    });
    const pagesChanges=productChanges.filter(change=>change.owner.pagesTransportOnly===true);
    const rollback=is598?selectedRegistry.pagesTransport.standardActionRollback:null;
    const pagesRollback=pagesChanges.some(change=>change.owner.pagesStandardActionRollback===true);
    // This test-only historical bridge is one complete reviewed four-file cohort.
    // Validate every status/mode/blob before excluding any member from product scope.
    const historicalBridge=rollback?.artifactMetadataHistoricalBridge;
    const historicalBridgeSelected=historicalBridge&&productChanges.some(change=>
      historicalBridge.members.some(entry=>entry.path===change.file)
      &&(change.file!==rollback.test.path||change.row.afterOid!==rollback.test.afterBlob));
    if(historicalBridgeSelected){
      for(const entry of historicalBridge.members){
        const change=productChanges.find(row=>row.file===entry.path),row=change?.row;
        if(!row||row.status!=='M'||row.beforeMode!=='100644'||row.afterMode!=='100644'
          ||!entry.beforeBlobs.includes(row.beforeOid)||row.afterOid!==entry.afterBlob)
          return full('PAGES_METADATA_HISTORICAL_BRIDGE_BYTES:'+entry.path);
      }
      for(const entry of [rollback.action,rollback.artifactMetadataCaller]){
        const row=index.get(entry.path);
        if(row?.type!=='blob'||row.mode!=='100644'||row.oid!==entry.afterBlob)
          return full('PAGES_METADATA_HISTORICAL_BRIDGE_CALLER:'+entry.path);
      }
    }
    const scopedProducts=historicalBridgeSelected?productChanges.filter(change=>
      !historicalBridge.members.some(entry=>entry.path===change.file)
      ||pagesRollback&&change.file===rollback.test.path):productChanges;
    const metadataCaller=pagesRollback||historicalBridgeSelected?productChanges.find(change=>
      change.file===rollback?.artifactMetadataCaller?.path):null;
    if(metadataCaller){
      const {row}=metadataCaller,entry=rollback.artifactMetadataCaller;
      if(row.status!=='M'||row.beforeMode!=='100644'||row.afterMode!=='100644'
        ||row.beforeOid!==entry.beforeBlob||row.afterOid!==entry.afterBlob)
        return full('PAGES_STANDARD_ACTION_METADATA_CALLER_BYTES:'+entry.path);
    }
    const uiProducts=pagesRollback?scopedProducts.filter(change=>change!==metadataCaller
      &&change.file!==rollback?.action.path&&change.file!==rollback?.test.path)
      :historicalBridgeSelected?scopedProducts.filter(change=>change!==metadataCaller):productChanges;
    if(historicalBridgeSelected&&uiProducts.length&&(!adminUi
      ||uiProducts.length!==Object.keys(adminUi.frames).length
      ||uiProducts.some(({file,row})=>!Object.hasOwn(adminUi.frames,file)
        ||row.status!=='M'||row.beforeMode!=='100644'||row.afterMode!=='100644'
        ||row.beforeOid!==adminUi.frames[file].beforeBlob||row.afterOid!==adminUi.frames[file].afterBlob)))
      return full('PAGES_METADATA_HISTORICAL_BRIDGE_SCOPE');
    if(pagesRollback){
      if(!rollback||pagesChanges.length!==1||scopedProducts.length!==2+(metadataCaller?1:0)+uiProducts.length
        ||uiProducts.length&&(!adminUi||uiProducts.length!==Object.keys(adminUi.frames).length
          ||uiProducts.some(({file,row})=>!Object.hasOwn(adminUi.frames,file)
            ||row.beforeOid!==adminUi.frames[file].beforeBlob||row.afterOid!==adminUi.frames[file].afterBlob)))
        return full('PAGES_STANDARD_ACTION_ROLLBACK_SCOPE');
      for(const entry of [rollback.action,rollback.test]){
        const change=productChanges.find(row=>row.file===entry.path);
        if(!change||change.row.status!=='M'||change.row.beforeMode!=='100644'
          ||change.row.beforeOid!==entry.beforeBlob||change.row.afterOid!==(historicalBridgeSelected&&entry===rollback.test
            ?historicalBridge.members.find(row=>row.path===entry.path).afterBlob:entry.afterBlob))
          return full('PAGES_STANDARD_ACTION_ROLLBACK_BYTES:'+entry.path);
      }
    }else if(pagesChanges.length&&(!is598||pagesChanges.length!==productChanges.length))
      return full('PAGES_TRANSPORT_COMBINED_SCOPE');
    const localRestoreFixture=productChanges.find(change=>change.owner.localRestoreSelfTest===true);
    if(localRestoreFixture&&(!is598||productChanges.length!==1))return full('LOCAL_RESTORE_FIXTURE_COMBINED_SCOPE');
    if(localRestoreFixture&&(localRestoreFixture.row.status!=='M'||localRestoreFixture.row.beforeMode!=='100644'))
      return full('LOCAL_RESTORE_FIXTURE_NOT_EXISTING_REGULAR_SOURCE');
    const en2Selected=en2&&changes.some(change=>EN2_ENTRYPOINTS.includes(change.file));
    const adminUiSelected=adminUi&&(changes.some(change=>uiOnly.has(change.file))
      ||en2Selected&&uiProducts.length!==Object.keys(en2.transitions).length);
    if(adminUiSelected){
      const paths=Object.keys(adminUi.frames);
      if(uiProducts.length!==paths.length||uiProducts.some(({file,row})=>!Object.hasOwn(adminUi.frames,file)
        ||row.status!=='M'||row.beforeMode!=='100644'))return full(en2Selected?'ASSISTANT_WIND_FOLLOWUP_COMBINED_SCOPE':'REVIEWED_ADMIN_UI_COMBINED_SCOPE');
    }
    if(en2Selected&&!adminUiSelected){
      const paths=Object.keys(en2.transitions);
      if(productChanges.length!==paths.length||productChanges.some(({file,row})=>!Object.hasOwn(en2.transitions,file)
        ||row.status!=='M'||row.beforeMode!=='100644'))return full('ASSISTANT_WIND_FOLLOWUP_COMBINED_SCOPE');
    }
    const blobs=new Map();
    const load=ids=>{
      const wanted=[...new Set(ids)].filter(id=>!blobs.has(id));if(!wanted.length)return;
      assert(wanted.length<=4096&&wanted.every(oid));
      const meta=git(['cat-file','--batch-check'],{input:wanted.join('\n')+'\n'}).toString('ascii').trimEnd().split('\n');
      let total=0;for(let i=0;i<wanted.length;i++){
        const m=/^([a-f0-9]{40}) blob ([0-9]+)$/.exec(meta[i]);assert(m&&m[1]===wanted[i]);
        assert(Number(m[2])<=8*1024*1024);total+=Number(m[2]);
      }assert(total<=selectedRegistry.blobBudgetBytes,'DOMAIN_COMMITTED_BLOB_BUDGET_EXCEEDED');
      if(is598||analysis.profile?.id==='REVIEWED_597_DOMAIN_INPUTS_C101_I100_T12')
        assert(total+[...blobs.values()].reduce((sum,body)=>sum+body.length,0)<=selectedRegistry.blobBudgetBytes,
          'DOMAIN_COMMITTED_BLOB_BUDGET_EXCEEDED');
      const raw=git(['cat-file','--batch'],{input:wanted.join('\n')+'\n'});let offset=0;
      for(const id of wanted){const end=raw.indexOf(10,offset),m=/^([a-f0-9]{40}) blob ([0-9]+)$/.exec(raw.subarray(offset,end).toString('ascii'));
        assert(m&&m[1]===id);const size=Number(m[2]),body=raw.subarray(end+1,end+1+size);assert.equal(raw[end+1+size],10);
        assert.equal(crypto.createHash('sha1').update('blob '+size+'\0').update(body).digest('hex'),id);
        blobs.set(id,body);offset=end+2+size;
      }assert.equal(offset,raw.length);
    };
    const commandsByDomain=Object.fromEntries(domainNames.map(name=>[name,selected.has(name)?[...(registry.commands[name]??[])]:[]]));
    commandsByDomain.controls=[...registry.commonCommands,...(qualification?registry.controlSuite:[])];
    for(const {owner}of changes)for(const [domain,command]of owner.commands??[])commandsByDomain[domain].push(command);
    if(en2Selected){
      // Generation runs the existing cold-start child, so run that check once.
      commandsByDomain.adminUI=commandsByDomain.adminUI.filter(command=>command!=='node scripts/test-public-cold-start-4.0.303.mjs');
      commandsByDomain.adminUI.push(EN2_MAP_PARENT);
    }
    if(adminUiSelected)commandsByDomain.adminUI.push('node scripts/test-admin-initial-dashboard-4.0.77.mjs',
      'node scripts/test-private-visitor-statistics-4.0.215.mjs');
    const entries=[...new Set(Object.values(commandsByDomain).flat()
      .filter(command=>!localRestoreFixture||command!==LOCAL_RESTORE_SELF_TEST)
      .flatMap(command=>command.split(' ').filter(value=>value.endsWith('.mjs'))))];
    const pending=[...changes.filter(row=>/\.(?:mjs|js|ts)$/.test(row.file)
      && !row.owner.exactSourceTransition && row!==localRestoreFixture).map(row=>row.file),...entries];
    const visited=new Set(),edges=[],closureRows=[],pagesRows=[];
    // All reads below are committed blobs. Current runtime hydration is not reset.
    //597 keeps every conservative resource, then loads executable sources only when
    //actually reached. Unvisited definitions were never closure members.594 is unchanged.
    const eagerSources=is598||analysis.profile?.id==='REVIEWED_597_DOMAIN_INPUTS_C101_I100_T12'?[]:Object.keys(registry.sources);
    load([...new Set([...eagerSources,...registry.resourceFiles,...entries,
      ...changes.map(row=>row.file)])].flatMap(file=>index.has(file)?[index.get(file).oid]:[]));
    const get=file=>{const row=index.get(file);if(!row||row.type!=='blob'||!['100644','100755'].includes(row.mode))throw Error('CLOSURE_SOURCE_MISSING:'+file);
      load([row.oid]);return blobs.get(row.oid);};
    if(pagesChanges.length){
      const {callers,frames}=selectedRegistry.pagesTransport;
      for(const [file,oid]of Object.entries(callers)){
        const item=index.get(file);
        const expected=pagesRollback&&file===rollback.action.path?rollback.action.afterBlob
          :metadataCaller&&file===rollback.artifactMetadataCaller.path?rollback.artifactMetadataCaller.afterBlob:oid;
        if(item?.oid!==expected||item.mode!=='100644'||item.type!=='blob')return full('PAGES_TRANSPORT_CALLER_CHANGED:'+file);
        closureRows.push({file,mode:item.mode,blob:item.oid,sha256:sha(get(file))});
      }
      for(const {file,row}of pagesChanges){
        if(pagesRollback)break;
        if(row.status!=='M'||row.beforeMode!=='100644')return full('PAGES_TRANSPORT_NOT_EXISTING_SOURCE:'+file);
        load([row.beforeOid]);
        const before=blobs.get(row.beforeOid),after=get(file);
        if(pagesTransportFrame(file,before)!==frames[file]||pagesTransportFrame(file,after)!==frames[file])
          return full('PAGES_TRANSPORT_FRAME_CHANGED:'+file);
        pagesRows.push({file,mode:row.afterMode,blob:row.afterOid,sha256:sha(after),
          beforeBlob:row.beforeOid,beforeSha256:sha(before)});
      }
    }
    if(historicalBridgeSelected)for(const entry of [rollback.action,rollback.artifactMetadataCaller]){
      const row=index.get(entry.path);closureRows.push({file:entry.path,mode:row.mode,blob:row.oid,sha256:sha(get(entry.path))});
    }
    if(adminUiSelected){
      for(const {file,row}of uiProducts){load([row.beforeOid]);const frame=adminUi.frames[file];
        if(row.beforeOid!==frame.beforeBlob||row.afterOid!==frame.afterBlob
          ||sha(blobs.get(row.beforeOid))!==frame.beforeSha256||sha(get(file))!==frame.afterSha256)
          return full('REVIEWED_ADMIN_UI_SOURCE_CHANGED:'+file);
        closureRows.push({file,mode:row.afterMode,blob:row.afterOid,sha256:frame.afterSha256,
          beforeBlob:row.beforeOid,beforeSha256:frame.beforeSha256});
      }
    }
    if(en2Selected&&!adminUiSelected){
      if(sha(get(EN2_GENERATION))!==en2.mapGenerationSha256)return full('ASSISTANT_WIND_FOLLOWUP_NORMAL_PARENT_CHANGED');
      for(const {file,row}of changes)if(Object.hasOwn(en2.transitions,file)){
        load([row.beforeOid]);
        const beforeSha256=sha(blobs.get(row.beforeOid)),afterSha256=sha(get(file));
        const [expectedBefore,expectedAfter]=en2.transitions[file];
        if(beforeSha256!==expectedBefore||afterSha256!==expectedAfter)
          return full('ASSISTANT_WIND_FOLLOWUP_SOURCE_CHANGED:'+file);
        closureRows.push({file,mode:row.afterMode,blob:row.afterOid,sha256:afterSha256});
      }
    }
    for(const {file,row,owner}of changes)if(owner.exactSourceTransition&&!(adminUiSelected&&Object.hasOwn(adminUi.frames,file))
      &&!(en2Selected&&Object.hasOwn(en2.transitions,file))){
      if(row.beforeMode!=='100644')return full('UNKNOWN_EXACT_SOURCE_TRANSITION:'+file);
      load([row.beforeOid]);const pair=sha(blobs.get(row.beforeOid))+'/'+sha(get(file));
      if(!registry.exactSourceTransitions?.[file]?.includes(pair))return full('UNKNOWN_EXACT_SOURCE_TRANSITION:'+file);
      closureRows.push({file,mode:row.afterMode,blob:row.afterOid,sha256:sha(get(file))});
    }
    if(localRestoreFixture){
      // ROOT independently reviews the whole fixture body before the fixed synthetic command.
      // Here the committed old/new bytes, import header, CLI dispatcher and normal workflow are bound.
      const {row}=localRestoreFixture;
      const workflow=index.get(LOCAL_RESTORE_WORKFLOW);
      if(workflow?.mode!=='100644'||workflow.type!=='blob'||workflow.oid!==LOCAL_RESTORE_WORKFLOW_BLOB)
        return full('LOCAL_RESTORE_FIXTURE_WORKFLOW_CHANGED');
      load([row.beforeOid]);
      const prior=blobs.get(row.beforeOid),candidate=get(LOCAL_RESTORE_FIXTURE);
      for(const source of [prior,candidate]){
        const imports=source.indexOf(LOCAL_RESTORE_IMPORTS),dispatch=source.indexOf(LOCAL_RESTORE_DISPATCH);
        if(source.length>256*1024||imports<1||dispatch<=imports
          ||source.indexOf(LOCAL_RESTORE_IMPORTS,imports+1)!==-1
          ||source.indexOf(LOCAL_RESTORE_DISPATCH,dispatch+1)!==-1
          ||sha(source.subarray(0,imports))!==LOCAL_RESTORE_IMPORTS_SHA256
          ||sha(source.subarray(dispatch))!==LOCAL_RESTORE_DISPATCH_SHA256)
          return full('LOCAL_RESTORE_FIXTURE_IMPORTS_OR_DISPATCH_CHANGED');
      }
      closureRows.push({file:LOCAL_RESTORE_FIXTURE,mode:row.afterMode,blob:row.afterOid,sha256:sha(candidate),
        beforeBlob:row.beforeOid,beforeSha256:sha(prior)});
      closureRows.push({file:LOCAL_RESTORE_WORKFLOW,mode:workflow.mode,blob:workflow.oid,sha256:sha(get(LOCAL_RESTORE_WORKFLOW))});
      edges.push([LOCAL_RESTORE_FIXTURE,'read',LOCAL_RESTORE_WORKFLOW]);
    }
    while(pending.length){const file=pending.pop();if(visited.has(file))continue;visited.add(file);
      const known=registry.sources[file];if(!known)return full('UNKNOWN_IMPORT_OR_EXECUTABLE:'+file);
      const bytes=get(file),scan=scanAllSourceDependencies(new TextDecoder('utf8',{fatal:true}).decode(bytes));
      for(const item of scan.imports){
        if(item.specifier===null){
          const boundary=scan.computedImportBoundaries.find(row=>row.expression===item.expression);
          if(!known.computedBoundaries.includes(sha(JSON.stringify(boundary))))return full('UNKNOWN_COMPUTED_IMPORT:'+file);
        }else if(item.specifier.startsWith('node:')){
          if(!known.nodeImports.includes(item.specifier))return full('UNDECLARED_NODE_IMPORT:'+file);
        }else if(!item.specifier.startsWith('./')&&!item.specifier.startsWith('../')){
          // Only the unchanged type declaration in this exact reviewed Edge body is permitted.
          if(!(is598&&file==='supabase/functions/ravradar-assistant/index.ts'
            &&sha(bytes)==='8c8cb9a9448e06c172525c1cea017c43d7ea34bf08dc921538e128cba089511e'
            &&item.kind==='static'&&item.specifier==='jsr:@supabase/functions-js/edge-runtime.d.ts'))
            return full('BARE_DATA_OR_URL_IMPORT:'+file);
        }
      }
      for(const surface of scan.dependencySurfaces)if(!known.dependencySurfaces.includes(sha(JSON.stringify(surface))))
        return full('UNKNOWN_READ_OR_SUBPROCESS_SURFACE:'+file);
      for(const surface of scan.bindingSurfaces)if(!known.bindingSurfaces.includes(sha(JSON.stringify(surface))))
        return full('UNKNOWN_SENSITIVE_BINDING_OR_REFLECTIVE_SURFACE:'+file);
      const references=sourceReferences(file,scan,index);
      for(const imported of references.imports){if(!known.imports.includes(imported))return full('UNKNOWN_IMPORT_EDGE:'+file);
        pending.push(imported);edges.push([file,'import',imported]);}
      for(const resource of references.resources){if(!known.resources.includes(resource))return full('UNKNOWN_READ_EDGE:'+file);
        const row=index.get(resource),body=get(resource);closureRows.push({file:resource,mode:row.mode,blob:row.oid,sha256:sha(body)});
        edges.push([file,'read',resource]);}
      const row=index.get(file);closureRows.push({file,mode:row.mode,blob:row.oid,sha256:sha(bytes)});
    }
    // Keep the already reviewed resource inventory conservatively bound even
    // when a particular current branch has no literal read edge to a member.
    for(const file of registry.resourceFiles){const row=index.get(file);
      closureRows.push(row?{file,mode:row.mode,blob:row.oid,sha256:sha(get(file))}:{file,present:false});}
    for(const {file,row,owner}of changes){
      if(owner.handbookPayload){
        load([row.beforeOid]);const before=handbookFrame(blobs.get(row.beforeOid).toString('utf8')),after=handbookFrame(get(file).toString('utf8'));
        if(before.frame!==after.frame)return full('INSTALL_DDL_OR_UNKNOWN_SQL_CHANGED');
        if(after.body!==JSON.stringify(JSON.parse(get('docs/handbook/content.json'))))return full('INSTALL_HANDBOOK_PAYLOAD_MISMATCH');
      }
      if(owner.auditMetadataOnly){
        load([row.beforeOid]);const pair=sha(blobs.get(row.beforeOid))+'/'+sha(get(file));
        if(!registry.auditMetadataTransitions[file].includes(pair))return full('CURRENT_AUDIT_POSITIVE_OR_UNKNOWN_CHANGE');
      }
    }
    const global=[...new Set(Object.values(commandsByDomain).flat())];
    const reach=start=>{const seen=new Set(),queue=[start];while(queue.length){const at=queue.pop();if(seen.has(at))continue;seen.add(at);
      for(const [from,kind,to]of edges)if(from===at&&kind==='import')queue.push(to);}return seen;};
    const replacement=new Map();
    for(const [parent,children]of Object.entries(registry.normalParents))if(global.includes(parent)){
      const reached=reach(parent.split(' ').at(-1));for(const child of children)if(global.includes(child)&&reached.has(child.split(' ').at(-1)))replacement.set(child,parent);
    }
    for(const domain of domainNames){
      const commands=[...new Set(commandsByDomain[domain].map(command=>replacement.get(command)??command))];
      out.domains[domain]={status:selected.has(domain)?'SELECTED':'NOT_APPLICABLE',executed:false,commands};
    }
    out.commands=[...new Set(Object.values(out.domains).flatMap(domain=>domain.commands))];
    if(out.commands.includes(LOCAL_RESTORE_SELF_TEST)!==Boolean(localRestoreFixture)
      ||out.commands.some(command=>command!==LOCAL_RESTORE_SELF_TEST
        &&!/^node(?: --[A-Za-z0-9-]+)*(?: [A-Za-z0-9_./-]+\.mjs)+$/.test(command)))return full('UNSUPPORTED_NORMAL_COMMAND');
    out.selection=qualification?'CONTROL_QUALIFICATION_REQUIRED':'TARGETED_DOMAINS';
    out.reasonCodes=qualification?['UNCHANGED_POSTGRES_AND_MODEL_INPUTS','CONTROL_QUALIFICATION_REQUIRED']:['UNCHANGED_POSTGRES_AND_MODEL_INPUTS',pagesChanges.length?'CLOSED_PAGES_TRANSPORT_POLICY':'CLOSED_REGISTERED_DOMAIN_IMPACT'];
    const uniqueRows=[...new Map([...closureRows,...pagesRows].map(row=>[row.file,row])).values()].sort((a,b)=>a.file.localeCompare(b.file,'en'));
    out.closureSha256=sha(JSON.stringify({rows:uniqueRows,edges:[...new Set(edges.map(JSON.stringify))].sort(),
      prerequisites:is598&&out.commands.includes('node --test scripts/test-current-operational-python-contracts.mjs')
        ?{...registry.runtimePrerequisites,pythonStdlibOnly:false,thirdPartyImports:['requests','requests.adapters','urllib3.util.retry','eccodes'],
          pythonRequirements:['requirements-dmi.txt'],expectedEcCodesApiVersion:'2.48.2',pipInstallation:true}
        :registry.runtimePrerequisites,registrySha256}));
    assert.equal(git(['rev-parse','HEAD']).toString('utf8').trim(),input.expectedHead);
    return out;
  }catch(error){out.status='REFUSED';return full(/^DOMAIN_[A-Z_]+$/.test(error?.message??'')?error.message:'DOMAIN_PLAN_REFUSED');}
}
