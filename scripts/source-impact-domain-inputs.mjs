// Git-object comparison only. This cannot qualify a baseline or authorize skips.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {ASSISTANT_AFTER599_BINDING as FAMILY601} from './lib/assistant-later-h0-successor-source.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// Known issued model family, not an application-version range or gate authority.
const FAMILY599=Object.freeze({C:'faa049cb86e733e451211f50c155ff90fd3462230310298cf5696757ef5c9f5d',
  I:'d8319503e040139ab739d589fa80c97cb683dfad7a2fc6f79eeeec6a9afe44e9',
  T:'23577d15b555acb50ee73f0fb4117282701f4d97e933932f30ac54df2c679645'});
const TEMPLATE598=Object.freeze({head:'bd9cf518fe798ddea45d2b835f324f6e2bea06fc',tree:'2f71c562eea774ca03996802f83bdad7cccd43cc'});
const FACTORY598=Object.freeze({head:'82200280c42b9060f14be2721ba7b766e0ede5a6',tree:'c69c1beed4275fb02af216a1c4741410555e2675'});
const PROFILE599_ID='DERIVED_599_DOMAIN_INPUTS_C101_I100_T12';
const PROFILE601_ID='DERIVED_601_DOMAIN_INPUTS_C101_I100_T12';
const FACTORY599=Object.freeze({head:'9d67207fbbec0f6bcf7819048f72e57535e9615d',tree:'a1a76ef3b38885ba46f3422ee287fe1b1c581363'});
// One semantic ancillary app schema after issued599, never a per-head profile.
const ERASURE_SQL='supabase/migrations/20261116181500_account_erasure_outbox_off.sql';
const INACTIVITY_OFF_SQL=Object.freeze(['supabase/migrations/20261117180000_account_inactivity_notice_off.sql','supabase/migrations/20261117180100_account_native_activity_capture_off.sql']);
const ERASURE_METADATA_READER='scripts/verify-account-erasure-schema.mjs';
const ERASURE_NATIVE_ADAPTER='scripts/lib/account-erasure-outbox-native-fixture.mjs';
const NATIVE_RECEIPT_SQL='supabase/migrations/20261122200000_account_native_activity_receipt_off.sql';
const NATIVE_RECEIPT_SOURCE='scripts/lib/account-native-activity-receipt-source.mjs';
const PROFILE_FILE='scripts/lib/source-impact-domain-inputs-594.json';
const PROFILE_SHA256='ae33e59b09a9d005579da78a32e2be5943856bfe03fdc2a54ba252071e5fe563';
const MAX_BLOB=4*1024*1024,MAX_TOTAL=32*1024*1024,MAX_GIT=64*1024*1024;
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const oid=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);
const relative=file=>typeof file==='string'&&/^[A-Za-z0-9_./-]+$/.test(file)
  &&!file.startsWith('/')&&!file.includes('//')&&!file.split('/').some(part=>part==='.'||part==='..');
const freeze=value=>{for(const item of Object.values(value))if(item&&typeof item==='object')freeze(item);return Object.freeze(value);};
const keys=(value,expected)=>assert(value&&Object.getPrototypeOf(value)===Object.prototype
  &&JSON.stringify(Object.keys(value).sort())===JSON.stringify([...expected].sort()));
const normalized=value=>value.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
const modelNormalized=value=>normalized(value).replace(/([?&]v=)\d+\.\d+\.\d+(?=["'])/g,'$1<release-version>');
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'
  ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const list=value=>{assert(Array.isArray(value)&&value.length>0&&value.length<=512);
  assert(value.every(relative)&&new Set(value).size===value.length);return value;};
const environment=()=>({...Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP']
  .filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]])),
  LANG:'C',LC_ALL:'C',GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',
  GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':'/dev/null',
  GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'protocol.allow',GIT_CONFIG_VALUE_0:'never'});
export const SOURCE_DOMAIN_ANALYSIS_STATUS='DOMAIN_ANALYSIS_NOT_GATE_AUTHORITY';
const authority={baselineQualified:false,skipAuthorized:false,postgresExecuted:false,sqliteExecuted:false,
  historicalNationalExecuted:false,productionAuthority:false};

function profile(){
  const raw=fs.readFileSync(new URL('./lib/source-impact-domain-inputs-594.json',import.meta.url));
  assert.equal(sha(raw),PROFILE_SHA256,'DOMAIN_PROFILE_BYTES');const value=JSON.parse(raw);
  assert.equal(value.schemaVersion,1);assert.equal(value.id,'REVIEWED_594_DOMAIN_INPUTS_C100_I99_T12');
  assert(oid(value.referenceCommit));assert.equal(list(value.postgresModules).length,66);
  assert.equal(list(value.postgresData).length,5);list(value.nativeEvidenceControls);list(value.setupInputs);list(value.plannerTrustChain);
  assert.equal(list(value.continuation.files).length,12);assert(relative(value.continuation.file));
  assert.equal(value.frozenGitAnchors.length,13);
  for(const anchor of value.frozenGitAnchors){keys(anchor,['head','tree']);assert(oid(anchor.head)&&oid(anchor.tree));}
  return value;
}
// Additive597 source inventory. This is NOT a qualified FULL baseline.
// The594 loader and its original frozen inventory remain byte-exact.
function profile597(){
  const raw=fs.readFileSync(new URL('./lib/source-impact-domain-inputs-597.json',import.meta.url));
  assert.equal(sha(raw),'5e25fbfe6f8d08f65fcf5885f7a4be4b6387bd1e3affb012b5ad08e75ed4036f','DOMAIN_PROFILE_BYTES');const value=JSON.parse(raw);
  assert.equal(value.schemaVersion,1);assert.equal(value.id,'REVIEWED_597_DOMAIN_INPUTS_C101_I100_T12');
  assert(oid(value.referenceCommit));assert.equal(list(value.postgresModules).length,66);
  assert.equal(list(value.postgresData).length,5);list(value.nativeEvidenceControls);list(value.setupInputs);list(value.plannerTrustChain);
  assert.equal(list(value.continuation.files).length,12);assert(relative(value.continuation.file));
  assert.equal(value.frozenGitAnchors.length,14);
  for(const anchor of value.frozenGitAnchors){keys(anchor,['head','tree']);assert(oid(anchor.head)&&oid(anchor.tree));}
  assert(value.frozenGitAnchors.some(anchor=>anchor.head==='37a34703d9ae8bfb2c28056f21a7ea73944033ae'
    &&anchor.tree==='09aef7f6f5d965f565fadabea203b50687acc255'),'DOMAIN_GENUINE_594_PARENT_REQUIRED');
  return value;
}
// Fixed598 inventory for its own genuine FULL baseline. No native execution is inferred here.
function profile598(){
  const raw=fs.readFileSync(new URL('./lib/source-impact-domain-inputs-598.json',import.meta.url));
  assert.equal(sha(raw),'6bb15e67912b919beecf26eea50c89c227425bf79bf0e4cbf7c65bd6904afed0','DOMAIN_PROFILE_BYTES');const value=JSON.parse(raw);
  assert.equal(value.schemaVersion,1);assert.equal(value.id,'REVIEWED_598_DOMAIN_INPUTS_C101_I100_T12');
  assert(oid(value.referenceCommit));assert.equal(list(value.postgresModules).length,69);
  assert.equal(list(value.postgresData).length,5);list(value.nativeEvidenceControls);list(value.setupInputs);list(value.plannerTrustChain);
  assert.equal(list(value.continuation.files).length,12);assert(relative(value.continuation.file));
  assert.equal(value.frozenGitAnchors.length,16);
  for(const anchor of value.frozenGitAnchors){keys(anchor,['head','tree']);assert(oid(anchor.head)&&oid(anchor.tree));}
  for(const [head,tree]of [['803f2c7c61237cef5c5f6b39ce0eaac5e090fb84','a5df6f32aac090c948be97a4a5532bb07482a31d'],
    ['97d189e4a99fdab1b2764db1bfe59f96e92c3f02','b804a9d766e1828cfed6ef6927ddf6582d2dc326']])
    assert(value.frozenGitAnchors.some(anchor=>anchor.head===head&&anchor.tree===tree),'DOMAIN_GENUINE_597_CODE_AND_NATIVE_REQUIRED');
  return value;
}
// The reviewed598 inventory remains immutable; these are already genuine input origins.
function profile599(){
  const source=profile598();assert.equal(source.referenceCommit,TEMPLATE598.head);
  return {...source,id:PROFILE599_ID,derivedFrom:{id:source.id,sha256:'6bb15e67912b919beecf26eea50c89c227425bf79bf0e4cbf7c65bd6904afed0',
    family:FAMILY599,metadataTemplate:TEMPLATE598,factory:FACTORY598},
    frozenGitAnchors:[...source.frozenGitAnchors,TEMPLATE598,FACTORY598]};
}
function profile601(){
  assert(FAMILY601,'DOMAIN_AFTER599_UNISSUED');
  const source=profile599();
  return {...source,id:PROFILE601_ID,derivedFrom:{id:source.id,family:FAMILY601,
    metadataTemplate:FACTORY599,factory:FACTORY599},
    frozenGitAnchors:[...source.frozenGitAnchors,FACTORY599]};
}
function fixedProfileForReleases(before,after){
  assert.match(before,/^4\.0\.[0-9]+$/);assert.match(after,/^4\.0\.[0-9]+$/);
  if(before==='4.0.598'||after==='4.0.598'){
    assert(before===after,'DOMAIN_RELEASE_PROFILE_MISMATCH');return profile598();
  }
  if(before==='4.0.597'||after==='4.0.597'){
    assert(before===after,'DOMAIN_RELEASE_PROFILE_MISMATCH');return profile597();
  }
  return profile();
}
function parseTree(raw){
  assert(raw.length<=8*1024*1024&&raw.at(-1)===0);const rows=[];
  for(const text of raw.subarray(0,-1).toString('utf8').split('\0')){
    const match=/^(\d{6}) (blob|commit) ([a-f0-9]{40})\t([\s\S]+)$/.exec(text);assert(match);
    rows.push({file:match[4],mode:match[1],type:match[2],blob:match[3]});
  }
  assert.equal(new Set(rows.map(row=>row.file)).size,rows.length);return new Map(rows.map(row=>[row.file,row]));
}
function diffInventory(raw){
  assert(raw.length<=8*1024*1024);if(!raw.length)return[];assert.equal(raw.at(-1),0);
  const fields=raw.subarray(0,-1).toString('binary').split('\0');assert.equal(fields.length%2,0);
  const rows=[];
  for(let i=0;i<fields.length;i+=2){
    const match=/^:(\d{6}) (\d{6}) ([a-f0-9]{40}) ([a-f0-9]{40}) ([AMDMTUXB])$/.exec(fields[i]);assert(match);
    rows.push({pathUtf8Hex:Buffer.from(fields[i+1],'binary').toString('hex'),status:match[5],
      beforeMode:match[1],afterMode:match[2],beforeOid:match[3],afterOid:match[4]});
  }
  return rows;
}
function generatedManifest(raw,definition,family){
  const source=new TextDecoder('utf-8',{fatal:true}).decode(raw);
  const header=family==='C'?'// Generated by scripts/build-candidate-g-rollback-bundle.mjs. Do not edit.':
    '// Generated by scripts/build-ravscore-model-bundle.mjs. Do not edit manually.';
  const expression=new RegExp('^'+header.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\nexport const '
    +definition.contractName+" = '([a-f0-9]{64})';\\nexport const "+definition.bundleName
    +" = '([a-f0-9]{64})';\\nexport const "+definition.manifestName+' = Object\\.freeze\\(([\\s\\S]*)\\);\\n$');
  const match=expression.exec(source);assert(match,'DOMAIN_MODEL_MANIFEST_FRAME');
  const value=JSON.parse(match[3]);
  keys(value,family==='C'?['schemaVersion','normalizationId','entrypoints','excludedModules','files']:
    ['schemaVersion','normalizationId','contractSha256','entrypoints','files']);
  assert.equal(value.schemaVersion,definition.schemaVersion);assert.equal(value.normalizationId,definition.normalizationId);
  list(value.entrypoints);if(family==='C')list(value.excludedModules);else assert.equal(value.contractSha256,match[1]);
  assert(Array.isArray(value.files)&&value.files.length>0&&value.files.length<=512);
  for(const row of value.files){keys(row,[definition.rowKey,'sha256']);assert(relative(row[definition.rowKey]));assert.match(row.sha256,/^[a-f0-9]{64}$/);}
  assert.equal(new Set(value.files.map(row=>row[definition.rowKey])).size,value.files.length);
  assert.equal(sha(JSON.stringify(family==='I'?canonical(value):value)),match[2],'DOMAIN_MODEL_MANIFEST_DIGEST');
  return {manifest:value,contractSha256:match[1],bundleSha256:match[2]};
}
function comparison(before,after){
  const a=new Map(before.map(row=>[row.file,row])),b=new Map(after.map(row=>[row.file,row]));
  const changes=[...new Set([...a.keys(),...b.keys()])].sort().flatMap(file=>{
    const left=a.get(file)??null,right=b.get(file)??null;
    return JSON.stringify(left)===JSON.stringify(right)?[]:[{file,before:left,after:right}];
  });
  return {unchanged:changes.length===0,beforeSha256:sha(JSON.stringify(before)),afterSha256:sha(JSON.stringify(after)),changes};
}

// Fixed repository and reviewed inventory. No readers, roots, omission lists,
// proof booleans or candidate JavaScript evaluation can be supplied by callers.
export function analyzeSourceDomainInputs(input){
  const refused=error=>freeze({schemaVersion:1,status:SOURCE_DOMAIN_ANALYSIS_STATUS,analysis:'REFUSED',
    failureCode:/^DOMAIN_[A-Z_]+$/.test(error?.message??'')?error.message:'DOMAIN_INPUT_ANALYSIS_REFUSED',...authority});
  try{
    assert.equal(arguments.length,1);keys(input,['baselineCommit','candidateCommit','expectedHead']);
    assert(Object.values(input).every(oid));assert.equal(input.candidateCommit,input.expectedHead);
    const deadline=performance.now()+60000;
    const git=(args,options={})=>{const remaining=deadline-performance.now();assert(remaining>0,'DOMAIN_LOCAL_TIME_BOUND');
      try{return execFileSync('git',['-C',ROOT,...args],{env:environment(),timeout:Math.min(10000,Math.floor(remaining)),
        maxBuffer:MAX_GIT,stdio:['pipe','pipe','pipe'],...options});}catch{throw new Error('DOMAIN_GIT_OBJECT_UNAVAILABLE');}};
    const text=args=>git(args).toString('utf8').trim();
    const exactHead=()=>assert.equal(text(['rev-parse','--verify','HEAD']),input.expectedHead);
    const top=fs.statSync(fs.realpathSync(text(['rev-parse','--show-toplevel'])),{bigint:true});
    const local=fs.statSync(fs.realpathSync(ROOT),{bigint:true});
    assert(top.isDirectory()&&top.ino>0n&&top.ino===local.ino&&top.dev===local.dev);
    exactHead();assert.equal(text(['for-each-ref','refs/replace']),'');assert.equal(text(['rev-parse','--is-shallow-repository']),'false');
    for(const ref of [input.baselineCommit,input.candidateCommit])assert.equal(text(['cat-file','-t',ref]),'commit');
    git(['merge-base','--is-ancestor',input.baselineCommit,input.candidateCommit]);
    const release=ref=>{const raw=git(['cat-file','blob',ref+':package.json']);
      assert(raw.length>0&&raw.length<=65536,'DOMAIN_PACKAGE_SCOPE_BOUND');return JSON.parse(raw).version;};
    let p=fixedProfileForReleases(release(input.baselineCommit),release(input.candidateCommit));
    const refs=[input.baselineCommit,input.candidateCommit];
    const trees=new Map(refs.map(ref=>[ref,parseTree(git(['ls-tree','-rz','--full-tree',ref]))]));
    const objects=new Map();let selectedBytes=0;
    const load=(ids,phase)=>{
      const unique=[...new Set(ids)].filter(id=>!objects.has(id));if(!unique.length)return;
      assert(unique.length<=1024&&unique.every(oid));
      const inventory=git(['cat-file','--batch-check'],{input:unique.join('\n')+'\n'}).toString('ascii').trimEnd().split('\n');
      assert.equal(inventory.length,unique.length);
      for(let i=0;i<unique.length;i++){
        const match=/^([a-f0-9]{40}) (blob|tree|commit) ([0-9]+)$/.exec(inventory[i]);
        if(!match)throw new Error(phase==='ANCHOR'?'DOMAIN_FROZEN_ANCHOR_UNAVAILABLE':'DOMAIN_SELECTED_OBJECT_UNAVAILABLE');
        assert.equal(match[1],unique[i]);const size=Number(match[3]);
        assert(Number.isSafeInteger(size)&&size>=0&&size<=MAX_BLOB,'DOMAIN_SELECTED_OBJECT_BOUND');selectedBytes+=size;
      }
      assert(selectedBytes<=MAX_TOTAL,'DOMAIN_TOTAL_SELECTED_BYTES_BOUND');
      const output=git(['cat-file','--batch'],{input:unique.join('\n')+'\n'});let offset=0;
      for(const id of unique){
        const end=output.indexOf(10,offset);assert(end>offset);const header=output.subarray(offset,end).toString('ascii');
        const match=/^([a-f0-9]{40}) (blob|tree|commit) ([0-9]+)$/.exec(header);assert(match&&match[1]===id);
        const size=Number(match[3]),start=end+1,finish=start+size;assert(finish<output.length&&output[finish]===10);
        const raw=output.subarray(start,finish);
        assert.equal(crypto.createHash('sha1').update(match[2]+' '+raw.length+'\0').update(raw).digest('hex'),id);
        objects.set(id,{type:match[2],raw});offset=finish+1;
      }
      assert.equal(offset,output.length);
    };
    const record=(ref,file,required=true)=>{
      const row=trees.get(ref).get(file);
      if(!row){assert(!required,'DOMAIN_SELECTED_INPUT_ABSENT');return {file,present:false};}
      assert(['100644','100755'].includes(row.mode)&&row.type==='blob','DOMAIN_SELECTED_INPUT_NOT_REGULAR');
      const object=objects.get(row.blob);assert(object?.type==='blob');
      return {file,mode:row.mode,blob:row.blob,bytes:object.raw.length,sha256:sha(object.raw)};
    };
    const raw=(ref,file)=>{const row=trees.get(ref).get(file);assert(row?.type==='blob'&&['100644','100755'].includes(row.mode));
      return objects.get(row.blob).raw;};
    const modelData=new Map();
    load(refs.flatMap(ref=>Object.values(p.models).map(def=>trees.get(ref).get(def.file)?.blob)),'MODEL');
    for(const ref of refs)modelData.set(ref,Object.fromEntries(Object.entries(p.models).map(([family,def])=>
      [family,generatedManifest(raw(ref,def.file),def,family)])));
    // Old profile paths above are unchanged and lazy: only the known issued pair
    // may read the additional Git metadata/origins below. No candidate JS is evaluated.
    const family599=refs.map(ref=>modelData.get(ref).C.bundleSha256===FAMILY599.C
      &&modelData.get(ref).I.bundleSha256===FAMILY599.I);
    if(family599.some(Boolean)){
      assert(family599.every(Boolean),'DOMAIN_RELEASE_PROFILE_MISMATCH');
      const previousModels=p.models;p=profile599();assert.deepEqual(p.models,previousModels);
      const origins=[TEMPLATE598,FACTORY598];
      load(origins.flatMap(origin=>[origin.head,origin.tree]),'ANCHOR');
      for(const origin of origins){
        assert.equal(objects.get(origin.head).type,'commit');assert.equal(objects.get(origin.tree).type,'tree');
        assert.equal(objects.get(origin.head).raw.toString('utf8').split('\n',1)[0],'tree '+origin.tree,'DOMAIN_FROZEN_ANCHOR_TREE');
      }
      const historicalTrees=new Map([
        [TEMPLATE598.head,parseTree(git(['ls-tree','-z','--full-tree',TEMPLATE598.head,'--','version.json']))],
        [FACTORY598.head,parseTree(git(['ls-tree','-rz','--full-tree',FACTORY598.head,'--',
          'scripts/test-protected-ravscore-continuation-checkpoint.mjs','data/admin/ravscore-profile-selection.json']))],
      ]);
      const historicalBlob=(origin,file)=>{const row=historicalTrees.get(origin.head).get(file);
        assert(row&&row.mode==='100644'&&row.type==='blob','DOMAIN_FROZEN_SELECTED_INPUT');return row.blob;};
      const templateBlob=historicalBlob(TEMPLATE598,'version.json');
      const factoryBlob=historicalBlob(FACTORY598,'scripts/test-protected-ravscore-continuation-checkpoint.mjs');
      const factoryProfileBlob=historicalBlob(FACTORY598,'data/admin/ravscore-profile-selection.json');
      const metadataFiles=refs.flatMap(ref=>['package.json','version.json'].map(file=>{const row=trees.get(ref).get(file);
        assert(row&&row.mode==='100644'&&row.type==='blob','DOMAIN_AFTER598_RELEASE_METADATA');return row.blob;}));
      load([templateBlob,factoryBlob,factoryProfileBlob,...metadataFiles],'INPUT');
      const templateRaw=objects.get(templateBlob).raw;assert(templateRaw.length>0&&templateRaw.length<=65536,'DOMAIN_METADATA_BOUND');
      const template=JSON.parse(templateRaw);assert.equal(template.version,'4.0.598','DOMAIN_METADATA_TEMPLATE');
      assert.equal(template.releaseContract.releaseVersion,'4.0.598','DOMAIN_METADATA_TEMPLATE');
      assert.equal(objects.get(factoryBlob).raw.length,72068,'DOMAIN_FACTORY_INPUT_BOUND');
      assert.equal(sha(objects.get(factoryBlob).raw),'ade9f05c1cfbf25687700a7d5d12b47653fe6da5b7961d49eca7997c6b3d8e5c','DOMAIN_FACTORY_INPUT');
      assert.equal(objects.get(factoryProfileBlob).raw.length,1633,'DOMAIN_FACTORY_INPUT_BOUND');
      assert.equal(sha(objects.get(factoryProfileBlob).raw),'8a2a91ade24d85bd18804d5c91bc17b28b1578933446f4dfcfc8a2c618d604f8','DOMAIN_FACTORY_INPUT');
      for(const ref of refs){
        const boundedJson=file=>{const bytes=raw(ref,file);assert(bytes.length>0&&bytes.length<=65536,'DOMAIN_METADATA_BOUND');return JSON.parse(bytes);};
        const pkg=boundedJson('package.json'),version=boundedJson('version.json');
        assert.equal(pkg.type,'module','DOMAIN_AFTER598_RELEASE_METADATA');assert.match(pkg.version,/^4\.0\.[0-9]+$/);
        assert.equal(version.version,pkg.version,'DOMAIN_AFTER598_RELEASE_METADATA');
        const expected=structuredClone(template.releaseContract);expected.releaseVersion=pkg.version;
        expected.modelBindings.candidateGRollback.modelBundleSha256=FAMILY599.C;
        expected.modelBindings.integrated.modelBundleSha256=FAMILY599.I;
        assert.deepEqual(version.releaseContract,expected,'DOMAIN_AFTER598_RELEASE_METADATA');
        assert.equal(modelData.get(ref).C.contractSha256,expected.modelBindings.candidateGRollback.modelContractSha256,'DOMAIN_AFTER598_RELEASE_METADATA');
        assert.equal(modelData.get(ref).I.contractSha256,expected.modelBindings.integrated.modelContractSha256,'DOMAIN_AFTER598_RELEASE_METADATA');
      }
    }
    const family601=refs.map(ref=>FAMILY601!==null&&modelData.get(ref).C.bundleSha256===FAMILY601.C
      &&modelData.get(ref).I.bundleSha256===FAMILY601.I);
    if(family601.some(Boolean)){
      assert(family601.every(Boolean),'DOMAIN_RELEASE_PROFILE_MISMATCH');
      const previousModels=p.models;p=profile601();assert.deepEqual(p.models,previousModels);
      const origins=[FACTORY599];
      load(origins.flatMap(origin=>[origin.head,origin.tree]),'ANCHOR');
      for(const origin of origins){
        assert.equal(objects.get(origin.head).type,'commit');assert.equal(objects.get(origin.tree).type,'tree');
        assert.equal(objects.get(origin.head).raw.toString('utf8').split('\n',1)[0],'tree '+origin.tree,'DOMAIN_FROZEN_ANCHOR_TREE');
      }
      const historicalTrees=new Map([[FACTORY599.head,parseTree(git(['ls-tree','-rz','--full-tree',FACTORY599.head,'--',
        'version.json','scripts/test-protected-ravscore-continuation-checkpoint.mjs','data/admin/ravscore-profile-selection.json']))]]);
      const historicalBlob=(origin,file)=>{const row=historicalTrees.get(origin.head).get(file);
        assert(row&&row.mode==='100644'&&row.type==='blob','DOMAIN_FROZEN_SELECTED_INPUT');return row.blob;};
      const templateBlob=historicalBlob(FACTORY599,'version.json');
      const factoryBlob=historicalBlob(FACTORY599,'scripts/test-protected-ravscore-continuation-checkpoint.mjs');
      const factoryProfileBlob=historicalBlob(FACTORY599,'data/admin/ravscore-profile-selection.json');
      const metadataFiles=refs.flatMap(ref=>['package.json','version.json'].map(file=>{const row=trees.get(ref).get(file);
        assert(row&&row.mode==='100644'&&row.type==='blob','DOMAIN_AFTER599_RELEASE_METADATA');return row.blob;}));
      load([templateBlob,factoryBlob,factoryProfileBlob,...metadataFiles],'INPUT');
      const templateRaw=objects.get(templateBlob).raw;assert(templateRaw.length>0&&templateRaw.length<=65536,'DOMAIN_METADATA_BOUND');
      const template=JSON.parse(templateRaw);assert.equal(template.version,'4.0.599','DOMAIN_METADATA_TEMPLATE');
      assert.equal(template.releaseContract.releaseVersion,'4.0.599','DOMAIN_METADATA_TEMPLATE');
      assert.equal(objects.get(factoryBlob).raw.length,73002,'DOMAIN_FACTORY_INPUT_BOUND');
      assert.equal(sha(objects.get(factoryBlob).raw),'a6251fe2370dabe00191c79dd545a0f6a33e42acfbaf3089828da6cec602d2ea','DOMAIN_FACTORY_INPUT');
      assert.equal(objects.get(factoryProfileBlob).raw.length,1633,'DOMAIN_FACTORY_INPUT_BOUND');
      assert.equal(sha(objects.get(factoryProfileBlob).raw),'3c5a8b22c53dfc4be1683201f982adc8dbf51d2ee652a8785d3636eac81ce5d4','DOMAIN_FACTORY_INPUT');
      for(const ref of refs){
        const boundedJson=file=>{const bytes=raw(ref,file);assert(bytes.length>0&&bytes.length<=65536,'DOMAIN_METADATA_BOUND');return JSON.parse(bytes);};
        const pkg=boundedJson('package.json'),version=boundedJson('version.json');
        assert.equal(pkg.type,'module','DOMAIN_AFTER599_RELEASE_METADATA');assert.match(pkg.version,/^4\.0\.[0-9]+$/);
        assert.equal(version.version,pkg.version,'DOMAIN_AFTER599_RELEASE_METADATA');
        const expected=structuredClone(template.releaseContract);expected.releaseVersion=pkg.version;
        expected.modelBindings.candidateGRollback.modelBundleSha256=FAMILY601.C;
        expected.modelBindings.integrated.modelBundleSha256=FAMILY601.I;
        assert.deepEqual(version.releaseContract,expected,'DOMAIN_AFTER599_RELEASE_METADATA');
        assert.equal(modelData.get(ref).C.contractSha256,expected.modelBindings.candidateGRollback.modelContractSha256,'DOMAIN_AFTER599_RELEASE_METADATA');
        assert.equal(modelData.get(ref).I.contractSha256,expected.modelBindings.integrated.modelContractSha256,'DOMAIN_AFTER599_RELEASE_METADATA');
      }
    }
    const is597=p.id==='REVIEWED_597_DOMAIN_INPUTS_C101_I100_T12';
    const is598=p.id==='REVIEWED_598_DOMAIN_INPUTS_C101_I100_T12',is599=p.id===PROFILE599_ID,is601=p.id===PROFILE601_ID;
    const scopePaths=new Set(['package.json']);
    for(const module of p.postgresModules)for(let directory=path.posix.dirname(module);directory!=='.';directory=path.posix.dirname(directory))
      scopePaths.add(directory+'/package.json');
    const sql=ref=>[...trees.get(ref).keys()].filter(file=>file.startsWith('supabase/migrations/')&&file.endsWith('.sql')).sort();
    const offPresent=ref=>(is599||is601)&&trees.get(ref).has(ERASURE_SQL);
    const noticePresent=ref=>{
      const count=INACTIVITY_OFF_SQL.filter(file=>trees.get(ref).has(file)).length;
      assert(count===0||(is601&&count===2),'DOMAIN_PARTIAL_OR_WRONG_FAMILY_NOTICE_SQL');
      return count===2;
    };
    const receiptPresent=ref=>{
      const present=trees.get(ref).has(NATIVE_RECEIPT_SQL);
      assert.equal(trees.get(ref).has(NATIVE_RECEIPT_SOURCE),present,'DOMAIN_PARTIAL_NATIVE_RECEIPT_SOURCE');
      if(present)assert(is601&&offPresent(ref)&&noticePresent(ref)&&sql(ref).length===80,'DOMAIN_NATIVE_RECEIPT_REQUIRES_WHOLE80');
      return present;
    };
    const pgModules=ref=>{noticePresent(ref);const receipt=receiptPresent(ref);return offPresent(ref)
      ?[...p.postgresModules,ERASURE_METADATA_READER,ERASURE_NATIVE_ADAPTER,...(receipt?[NATIVE_RECEIPT_SOURCE]:[])]:p.postgresModules;};
    // All SQL stays in the real PG inventory; the known76th row grants no reuse.
    assert.equal(sql(input.baselineCommit).length,is601?77+2*Number(noticePresent(input.baselineCommit))+Number(receiptPresent(input.baselineCommit)):is599?75+Number(offPresent(input.baselineCommit)):is598?74:is597?73:72,
      'DOMAIN_BASELINE_PROFILE_SQL_COUNT');
    if(is597||is598||is599||is601){assert.equal(modelData.get(input.baselineCommit).C.manifest.files.length,101,'DOMAIN_BASELINE_MODEL_MEMBERSHIP');
      assert.equal(modelData.get(input.baselineCommit).I.manifest.files.length,100,'DOMAIN_BASELINE_MODEL_MEMBERSHIP');}
    const selected=ref=>[...new Set([...pgModules(ref),...p.postgresData,...sql(ref),...p.nativeEvidenceControls,
      ...p.setupInputs,...p.plannerTrustChain,...scopePaths,...p.continuation.files,p.continuation.file,
      ...Object.values(p.models).map(def=>def.file),
      ...Object.entries(modelData.get(ref)).flatMap(([family,data])=>data.manifest.files.map(row=>row[p.models[family].rowKey]))])];
    load(refs.flatMap(ref=>selected(ref).flatMap(file=>trees.get(ref).has(file)?[trees.get(ref).get(file).blob]:[])),'INPUT');
    load(p.frozenGitAnchors.flatMap(anchor=>[anchor.head,anchor.tree]),'ANCHOR');
    for(const anchor of p.frozenGitAnchors){
      assert.equal(objects.get(anchor.head).type,'commit');assert.equal(objects.get(anchor.tree).type,'tree');
      assert.equal(objects.get(anchor.head).raw.toString('utf8').split('\n',1)[0],'tree '+anchor.tree,'DOMAIN_FROZEN_ANCHOR_TREE');
    }
    const rows=(ref,files,required=true)=>[...files].sort((a,b)=>a.localeCompare(b,'en')).map(file=>record(ref,file,required));
    const native=ref=>{
      const modules=pgModules(ref);
      const files=rows(ref,[...modules,...p.postgresData,...sql(ref)],ref===input.baselineCommit);
      const scopes=[...scopePaths].sort().map(file=>{
        if(!trees.get(ref).has(file))return {file,present:false};
        const row=record(ref,file),value=JSON.parse(raw(ref,file));
        return file==='package.json'?{file,present:true,mode:row.mode,type:value.type??null,version:value.version??null}:
          {...row,present:true,type:value.type??null};
      });
      const moduleRows=modules.map(file=>record(ref,file,ref===input.baselineCommit));
      return {files,modules:modules.length,dataFiles:p.postgresData.length,sqlFiles:sql(ref).length,totalFiles:files.length,
        completeReviewedInputs:files.every(row=>row.present!==false),inputSha256:sha(JSON.stringify(files)),
        moduleSha256:sha(JSON.stringify(moduleRows.map(({file,bytes,sha256,present})=>present===false?{file,present:false}:{file,bytes,sha256}))),
        packageScopes:scopes};
    };
    const old=native(input.baselineCommit),next=native(input.candidateCommit);
    const models=Object.fromEntries(['C','I'].map(family=>{
      const capture=ref=>{
        const data=modelData.get(ref)[family],def=p.models[family],files=rows(ref,data.manifest.files.map(row=>row[def.rowKey]));
        const sourceMismatches=data.manifest.files.filter(row=>sha(modelNormalized(raw(ref,row[def.rowKey]).toString('utf8')))!==row.sha256)
          .map(row=>row[def.rowKey]);
        return {generated:record(ref,def.file),bundleSha256:data.bundleSha256,contractSha256:data.contractSha256,
          files,sourceMismatches};
      };
      const before=capture(input.baselineCommit),after=capture(input.candidateCommit);
      assert.equal(before.sourceMismatches.length,0,'DOMAIN_BASELINE_MODEL_MANIFEST_STALE');
      return [family,{before,after,unchanged:JSON.stringify(before)===JSON.stringify(after)}];
    }));
    const continuation=ref=>{
      const files=rows(ref,p.continuation.files),textRows=[...p.continuation.files].sort().map(file=>
        [file,sha(normalized(raw(ref,file).toString('utf8')))]);
      return {files,implementationContract:record(ref,p.continuation.file),implementationSha256:sha(JSON.stringify(textRows))};
    };
    const beforeT=continuation(input.baselineCommit),afterT=continuation(input.candidateCommit);
    models.T={before:beforeT,after:afterT,unchanged:JSON.stringify(beforeT)===JSON.stringify(afterT)};
    if(is599)for(const value of [beforeT,afterT])assert.equal(value.implementationSha256,FAMILY599.T,'DOMAIN_AFTER598_FAMILY_T_MISMATCH');
    if(is601)for(const value of [beforeT,afterT])assert.equal(value.implementationSha256,FAMILY601.T,'DOMAIN_AFTER599_FAMILY_T_MISMATCH');
    const control=(files,optional=false)=>comparison(rows(input.baselineCommit,files,!optional),rows(input.candidateCommit,files,!optional));
    const inventoryRaw=git(['diff-tree','-r','--raw','-z','--no-abbrev','--no-renames','--no-ext-diff','--no-textconv',
      '--no-commit-id',input.baselineCommit,input.candidateCommit,'--']);
    const inventory=diffInventory(inventoryRaw);
    exactHead();assert.equal(text(['for-each-ref','refs/replace']),'');
    return freeze({schemaVersion:1,status:SOURCE_DOMAIN_ANALYSIS_STATUS,analysis:'COMPLETE',...authority,
      profile:{id:p.id,sha256:is601||is599?sha(JSON.stringify(canonical(p))):is598?'6bb15e67912b919beecf26eea50c89c227425bf79bf0e4cbf7c65bd6904afed0':is597?'5e25fbfe6f8d08f65fcf5885f7a4be4b6387bd1e3affb012b5ad08e75ed4036f':PROFILE_SHA256,
        scope:is601?'DERIVED_601_INPUT_INVENTORY_ONLY':is599?'DERIVED_599_INPUT_INVENTORY_ONLY':is598?'REVIEWED_598_INPUT_INVENTORY_ONLY':is597?'REVIEWED_597_INPUT_INVENTORY_ONLY':'REVIEWED_594_INPUT_INVENTORY_ONLY'},
      identity:{...input,actualHead:input.expectedHead,ancestorVerified:true,
        baselineTree:text(['rev-parse',input.baselineCommit+'^{tree}']),candidateTree:text(['rev-parse',input.candidateCommit+'^{tree}'])},
      completeGitDiff:{inventory,rawInventorySha256:sha(inventoryRaw),changedRows:inventory.length},
      actualPostgresInput:{before:old,after:next,...comparison(old.files,next.files),
        unchanged:JSON.stringify(old)===JSON.stringify(next),doesNotEstablishAbsenceOfAdditionalInputs:true},
      evidenceControls:{native:control(p.nativeEvidenceControls),setup:control(p.setupInputs),plannerTrustChain:control(p.plannerTrustChain,true)},
      models,frozenGitAnchors:{verified:true,anchors:p.frozenGitAnchors},
      additionalDependencyClassificationRequired:true,independentControlQualificationRequired:true});
  }catch(error){return refused(error);}
}
