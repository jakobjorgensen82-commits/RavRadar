import {SOURCE_PR_NATIVE_CONTRACT} from './lib/weather-source-gate.mjs';
import {sourceProducerAfter597ManifestFromText,sourceProducerAfter597CodePinsFromText,
  SOURCE_PRODUCER_AFTER597_CODE_PIN_PATH} from './lib/source-producer-after597-runtime-family.mjs';
// Første SOURCE efter genuine598: aktuelle kontrakter og den eksisterende
// særskilte native-type. Ingen uændret-PG/V3-, FULL- eller produktionspåstand.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import inputs from './lib/source-first-issuance-inputs.json' with {type:'json'};

export const SOURCE_FIRST_SELECTION='SOURCE_FIRST_ISSUANCE';
export const SOURCE_UNCHANGED_SELECTION='SOURCE_CURRENT_UNCHANGED';
export const SOURCE_SELECTIONS=Object.freeze([SOURCE_FIRST_SELECTION,SOURCE_UNCHANGED_SELECTION]);
export const SOURCE_FIRST_NATIVE_KIND=SOURCE_PR_NATIVE_CONTRACT;
export const SOURCE_FIRST_CURRENT_STEP='Validate current Source contracts and release governance';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const FAMILY='scripts/lib/source-producer-after597-binding.generated.json';
const PROOF='.cache/source-tree-content-proof.json';
const CONTRACT='weather-source-gate-content-v2';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const oid=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);
const positive=value=>Number.isSafeInteger(value)&&value>0;
const exact=(value,keys)=>assert(value&&Object.getPrototypeOf(value)===Object.prototype
  &&JSON.stringify(Object.keys(value).sort())===JSON.stringify([...keys].sort()));
const env=()=>({...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',
  GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':'/dev/null',
  GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'protocol.allow',GIT_CONFIG_VALUE_0:'never'});
const git=args=>execFileSync('git',['-C',ROOT,...args],{env:env(),timeout:10000,maxBuffer:8*1024*1024,
  stdio:['pipe','pipe','pipe']});
const gitText=args=>git(args).toString('utf8').trim();

export function assertSourceApplicationRelease(applicationRelease,modelRelease,previousRelease=modelRelease) {
  const patch=value=>{
    assert(typeof value==='string'&&/^4\.0\.[1-9][0-9]*$/.test(value),'SOURCE_APPLICATION_RELEASE');
    const result=Number(value.slice(4));assert(Number.isSafeInteger(result));return result;
  };
  assert(patch(applicationRelease)>=patch(modelRelease),'SOURCE_APPLICATION_BEFORE_MODEL');
  assert(patch(applicationRelease)>=patch(previousRelease),'SOURCE_APPLICATION_ROLLBACK');
  return applicationRelease;
}

// Ren datakontrol til prøver og interne sammenligninger. Returnerer ingen
// kapabilitet; de normale indgange læser altid selv den faktiske Source-familie.
export function assertSourceFirstIdentityData(value){
  exact(value,['release','predecessorRelease','binding','output','migrationCount','selectedVersion']);
  assert.equal(value.predecessorRelease,'4.0.598');
  assert.match(value.release,/^4\.0\.[1-9][0-9]*$/);
  assert(Number(value.release.slice(4))>598);
  exact(value.binding,['version','C','I','T','candidateManifestSha256','integratedManifestSha256']);
  assert.match(value.binding.version,/^[0-9]{14}$/);
  for(const key of ['C','I','T','candidateManifestSha256','integratedManifestSha256'])
    assert.match(value.binding[key],/^[a-f0-9]{64}$/);
  assert.equal(value.binding.C,value.binding.candidateManifestSha256);
  assert.equal(value.binding.I,value.binding.integratedManifestSha256);
  assert.equal(new Set(['C','I','T'].map(key=>value.binding[key])).size,3);
  exact(value.output,['migrationSha256','canonicalSha256','checkpointContractSha256','tripBindingPolicySha256']);
  for(const item of Object.values(value.output))assert.match(item,/^[a-f0-9]{64}$/);
  assert.equal(value.migrationCount,64);assert.equal(value.selectedVersion,value.binding.version);
}
export function assertSourceFirstPathScope(paths,identity){
  assertSourceFirstIdentityData(identity);assert(Array.isArray(paths)&&paths.length>0);
  assert.equal(inputs.schemaVersion,1);assert.equal(inputs.scope,'SOURCE_AFTER598_FIRST_ISSUANCE');
  const featurePaths=new Set(inputs.sourceFeaturePaths);
  assert.equal(featurePaths.size,inputs.sourceFeaturePaths.length);
  // Previously issued SQL paths come from the same authentic immutable prefix
  // whose complete bytes/hashes are checked below, not another per-release list.
  const allowed=new Set([...featurePaths,...inputs.preservedSql.map(row=>row.path)]);
  for(const file of paths){
    assert(typeof file==='string'&&/^[A-Za-z0-9_.\/-]+$/.test(file)
      &&!file.startsWith('/')&&!file.split('/').some(part=>part==='.'||part==='..'));
    if(allowed.has(file)||/^docs\/(?:rdks|ai|handbook)\/.+\.md$/.test(file))continue;
    assert.equal(file,'supabase/migrations/'+identity.binding.version+'_source_producer_original_bound_successor.sql',
      'SOURCE_FIRST_UNCLASSIFIED_PATH:'+file);
  }
}
export function assertSourceFirstDiffRecords(buffer){
  assert(Buffer.isBuffer(buffer));const fields=buffer.toString('utf8').split('\0');assert.equal(fields.pop(),'');
  const paths=[];assert.equal(fields.length%2,0);
  for(let i=0;i<fields.length;i+=2){
    const m=/^:(000000|100644) (100644) ([a-f0-9]{40}) ([a-f0-9]{40}) ([AM])$/.exec(fields[i]);
    assert(m,'SOURCE_FIRST_DIFF_MODE_OR_STATUS');assert.equal(m[5],m[1]==='000000'?'A':'M');
    assert.equal(m[3]==='0'.repeat(40),m[5]==='A');assert.notEqual(m[4],'0'.repeat(40));paths.push(fields[i+1]);
  }
  assert(paths.length>0&&new Set(paths).size===paths.length);return paths;
}
export function assertSourceFirstCommittedScope(readGit,base,head,identity){
  assert.equal(typeof readGit,'function');assert(oid(base)&&oid(head));
  const changed=assertSourceFirstDiffRecords(readGit(['diff-tree','-r','--no-renames','--no-ext-diff',
    '--no-textconv','--no-abbrev','--raw','-z',base,head]));
  // Newly extracted numerical modules are actual model inputs, not a second
  // hand-maintained Source path cohort. The normal parser validates the
  // committed generated manifests against this exact family's C and I.
  const models=[['C','scripts/rollback-assets/ravscore-model-bundle.generated.js'],
    ['I','js/core/ravscore-model-bundle.generated.js']];
  const modelPaths=new Set();
  for(const [kind,file] of models) {
    const manifest=sourceProducerAfter597ManifestFromText(
      readGit(['cat-file','blob',head+':'+file]).toString('utf8'),kind,identity.binding[kind]);
    for(const row of manifest.files)modelPaths.add(row[kind==='I'?'path':'file']);
    for(const excluded of manifest.excludedModules??[]) {
      assert(['js/core/ravscore-model-bundle.generated.js','scripts/rollback-assets/ravscore-model-bundle.generated.js',
        'js/core/ravscore-model-identity.generated.js','scripts/rollback-assets/ravscore-model-identity.generated.js'].includes(excluded));
      modelPaths.add(excluded);
    }
  }
  // The already existing RAW catalogue owns operational CODE, not numerics.
  // Its strict parser retains its original closed inventory; exact committed
  // head/tree and normal typed CI qualify these bytes independently of C/I.
  const raw=sourceProducerAfter597CodePinsFromText(
    readGit(['cat-file','blob',head+':'+SOURCE_PRODUCER_AFTER597_CODE_PIN_PATH]).toString('utf8'));
  assert(raw.files!==null,'SOURCE_FIRST_CODE_CATALOGUE_REQUIRED');
  const codePaths=new Set(raw.files.map(row=>row.path));
  const other=changed.filter(file=>!modelPaths.has(file)&&!codePaths.has(file));
  if(other.length)assertSourceFirstPathScope(other,identity);
  else assertSourceFirstIdentityData(identity);
  assert.equal(inputs.preservedSql.length,79);assert.equal(new Set(inputs.preservedSql.map(x=>x.path)).size,79);
  for(const row of inputs.preservedSql){
    const body=readGit(['cat-file','blob',head+':'+row.path]);assert(Buffer.isBuffer(body));
    assert.equal(body.length,row.bytes);assert.equal(sha(body),row.sha256,'Historical SQL archive is immutable: '+row.path);
  }
}
export function sourceFirstFamilyPresent(){
  try{const row=fs.lstatSync(path.join(ROOT,FAMILY));assert(row.isFile()&&!row.isSymbolicLink());return true;}
  catch(error){if(error?.code==='ENOENT')return false;throw error;}
}
// Ren klassifikation. De normale indgange læser selv binding og Git-input.
export function classifySourceValidationBaseData(identity,basePackage,metadata){
  assertSourceFirstIdentityData(identity);assert(basePackage&&typeof basePackage.version==='string');
  const empty={schemaVersion:'source-producer-after597-derived-metadata-v1',release:null,version:null,binding:null,output:null};
  if(basePackage.version==='4.0.598'&&(metadata===null||JSON.stringify(metadata)===JSON.stringify(empty)))return SOURCE_FIRST_SELECTION;
  assertSourceApplicationRelease(basePackage.version,identity.release);
  assert.deepEqual(metadata,{schemaVersion:empty.schemaVersion,release:identity.release,version:identity.binding.version,
    binding:identity.binding,output:identity.output},'SOURCE_MODEL_OR_OUTPUT_CHANGED');
  return SOURCE_UNCHANGED_SELECTION;
}
function committedOptional(readGit,ref,file){
  const row=readGit(['ls-tree','-z',ref,'--',file]);assert(Buffer.isBuffer(row));
  if(row.length===0)return null;
  const fields=row.toString('utf8').split('\0');assert.equal(fields.length,2);assert.equal(fields[1],'');
  const match=/^100644 blob ([a-f0-9]{40})\t(.+)$/.exec(fields[0]);assert(match);assert.equal(match[2],file);
  return readGit(['cat-file','blob',ref+':'+file]);
}
export function sourceInstallerHandbookProjection(sql,book){
  assert(typeof sql==='string');assert(book&&typeof book==='object');
  const statement="insert into public.admin_documents(document_key,payload,updated_by) values('handbook','"
    +JSON.stringify(book).replaceAll("'","''")+"'::jsonb,null)";
  const parts=sql.split(statement);assert.equal(parts.length,2);
  return parts[0]+'<CURRENT_SOURCE_HANDBOOK_INSERT>'+parts[1];
}
export function assertSourceValidationBaseFromGit(readGit,base,head,identity){
  assert.equal(typeof readGit,'function');assert(oid(base)&&oid(head));assertSourceFirstIdentityData(identity);
  const optional=committedOptional(readGit,base,FAMILY);
  const selection=classifySourceValidationBaseData(identity,JSON.parse(readGit(['cat-file','blob',base+':package.json'])),optional?JSON.parse(optional):null);
  if(selection===SOURCE_FIRST_SELECTION)return selection;
  const read=(ref,file)=>readGit(['cat-file','blob',ref+':'+file]);
  const identical=file=>{const before=read(base,file),after=read(head,file);assert(Buffer.isBuffer(before)&&Buffer.isBuffer(after));
    assert(before.equals(after),'SOURCE_UNCHANGED_INPUT_CHANGED:'+file);};
  identical(FAMILY);
  const changed=assertSourceFirstDiffRecords(readGit(['diff-tree','-r','--no-renames','--no-ext-diff','--no-textconv','--no-abbrev','--raw','-z',base,head]));
  for(const file of changed){
    assert(!file.startsWith('supabase/functions/')&&file!=='supabase/config.toml','SOURCE_AUTH_SERVICE_CHANGED:'+file);}
  const app=JSON.parse(read(head,'package.json')).version;
  assertSourceApplicationRelease(app,identity.release,JSON.parse(read(base,'package.json')).version);
  // CURRENT means the same issued model/schema, not a PostgreSQL reuse grant.
  // Actual PG execution/input/runtime qualification belongs to the native
  // coordinator. The current head's package, workflow and presentation CODE
  // still pass fresh normal contracts; they are not a numerical SQL cache key.
  for(const file of ['scripts/rollback-assets/ravscore-model-bundle.generated.js',
    'js/core/ravscore-model-bundle.generated.js'])identical(file);
  const sqlRows=ref=>{
    const rows=new Map();const fields=readGit(['ls-tree','-rz','--full-tree',ref]).toString('utf8').split('\0');assert.equal(fields.pop(),'');
    for(const field of fields){const match=/^([0-9]{6}) (blob) ([a-f0-9]{40})\t(.+)$/.exec(field);assert(match);
      if(/\.sql$/i.test(match[4])){assert.equal(match[1],'100644');rows.set(match[4],match[3]);}}
    return rows;
  };
  const before=sqlRows(base),after=sqlRows(head);assert.deepEqual([...before.keys()].sort(),[...after.keys()].sort(),'SOURCE_SQL_INVENTORY_CHANGED');
  const installer='supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql';
  for(const [file,hash] of before){
    if(file!==installer){assert.equal(after.get(file),hash,'SOURCE_SQL_CHANGED:'+file);continue;}
    const project=ref=>sourceInstallerHandbookProjection(read(ref,file).toString('utf8'),JSON.parse(read(ref,'docs/handbook/content.json')));
    assert.equal(project(base),project(head),'SOURCE_INSTALLER_DDL_CHANGED');
  }
  return selection;
}
export async function readActualSourceFirstIdentity(){
  // NULL, forkert kodeparent eller manglende output stopper før API/native.
  const family=await import('./lib/source-producer-after597-runtime-family.mjs');
  const parent=await import('./lib/source-producer-after597-parent.mjs');
  const readiness=await import('./integrated-cutover-readiness.mjs');
  const output=family.requireSourceProducerOutput(),binding=family.requireSourceProducerBinding();
  parent.requireSourceProducerAfter597CodeParent();
  const migrations=readiness.sourceProducerRequiredMigrations();
  const value={release:parent.SOURCE_PRODUCER_AFTER597_PARENT.nextRelease,
    predecessorRelease:parent.SOURCE_PRODUCER_AFTER597_PARENT.release,binding,output,
    migrationCount:migrations.length,selectedVersion:migrations.at(-1).version};
  assertSourceFirstIdentityData(value);
  assertSourceApplicationRelease(JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'))).version,value.release);
  return structuredClone(value);
}

export const SOURCE_FIRST_COMMANDS=Object.freeze([
  'node scripts/validate-release-version.mjs',
  'node scripts/test-module-version-closure-4.0.87.mjs',
  'node scripts/test-security-hardening-4.0.284.mjs',
  'node scripts/build-source-producer-successor.mjs --check',
  'node scripts/sync-ravscore-model-binding.mjs --check',
  'node scripts/sync-release-contract-metadata.mjs --check',
  'node scripts/source-critical-gate.mjs',
  'node --test scripts/test-ordinary-pages-immediate-retry.mjs',
  'node scripts/test-pages-generation-and-reentry.mjs',
  'node scripts/test-ravscore-operational-pages-recovery.mjs',
  'node --test scripts/test-protected-operational-reentry-evidence.mjs',
  'node --test scripts/test-pages-artifact-metadata.mjs',
  'node scripts/test-water-station-active-routing-display-4.0.102.mjs',
  'node scripts/test-code-only-public-runtime.mjs',
  'node scripts/test-supabase-cli-local-restore.mjs --self-test',
  'node scripts/validate-rdks.mjs',
  'node scripts/test-handbook-plain-language-4.0.70.mjs',
  'node scripts/test-handbook-review-archive-4.0.91.mjs',
  'node scripts/test-protected-handbook-merge-4.0.270.mjs',
  'node --test scripts/test-source-current-contracts.mjs',
]);
function assertCurrentIdentity(value){
  exact(value,['repository','head','sourceTreeSha256','pullRequest','runId','runAttempt']);
  assert.equal(value.repository,'jakobjorgensen82-commits/RavRadar');assert(oid(value.head));
  assert.match(value.sourceTreeSha256,/^sha256:[a-f0-9]{64}$/);
  for(const key of ['pullRequest','runId','runAttempt'])assert(positive(value[key]));assert.equal(value.runAttempt,1);
}
export function assertSourceFirstCurrentResults(results,current,identity){
  assertSourceFirstIdentityData(identity);assertCurrentIdentity(current);
  exact(results,['scope','current','identity','reportedCommandResults','nativeExecutionRequired',
    'nativeExecutionClaimed','historicalCompatibilityExecuted','fullSourceValidationClaimed','productionAuthority']);
  assert.equal(results.scope,'SOURCE_CURRENT_CONTRACT_RESULTS');assert.deepEqual(results.current,current);
  assert.deepEqual(results.identity,identity);assert.equal(results.nativeExecutionRequired,true);
  for(const key of ['nativeExecutionClaimed','historicalCompatibilityExecuted','fullSourceValidationClaimed','productionAuthority'])
    assert.equal(results[key],false);
  assert.equal(results.reportedCommandResults.length,SOURCE_FIRST_COMMANDS.length);
  for(let i=0;i<SOURCE_FIRST_COMMANDS.length;i++){
    const row=results.reportedCommandResults[i];exact(row,['phase','command','elapsedMs','outcome']);
    assert.equal(row.phase,'source-current-contract');assert.equal(row.command,SOURCE_FIRST_COMMANDS[i]);
    assert.equal(row.outcome,'PASS');assert(Number.isSafeInteger(row.elapsedMs)&&row.elapsedMs>=0);
  }
}
export function assertSourceFirstProofData(proof,current,identity){
  assertCurrentIdentity(current);assertSourceFirstIdentityData(identity);
  exact(proof,['schemaVersion','contractId','kind','qualification','repository','pullRequestNumber','headSha',
    'sourceTreeSha256','privatePayloadIncluded','sourceBase','currentSourceContracts',
    ...(Object.hasOwn(proof,'nativePostgres')?['nativePostgres']:[])]);
  assert.equal(proof.schemaVersion,1);assert.equal(proof.contractId,CONTRACT);
  assert.equal(proof.kind,SOURCE_FIRST_NATIVE_KIND);assert(SOURCE_SELECTIONS.includes(proof.qualification));
  assert.equal(proof.repository,current.repository);assert.equal(proof.headSha,current.head);
  assert.equal(proof.pullRequestNumber,current.pullRequest);assert.equal(proof.sourceTreeSha256,current.sourceTreeSha256);
  assert.equal(proof.privatePayloadIncluded,false);
  assert(oid(proof.sourceBase));
  assertSourceFirstCurrentResults(proof.currentSourceContracts,current,identity);
}
// Det komplette normale jobforløb: ingen fraværende/ukendte trin tæller som PASS.
export const SOURCE_FIRST_JOB_STEPS=Object.freeze([
 ['Set up job','success'],['Run actions/checkout@v7','success'],['Require exact pull-request source head','success'],
 ['Run actions/setup-node@v7','success'],['Run actions/setup-python@v7','success'],
 ['Install declared DMI dependencies before source planning','success'],['Build deterministic source-tree content identity','success'],
 ['Diagnose normal pack-reader closure on artificial data only','skipped'],['Install source-gate dependencies','success'],
 ['Set up Node24 for isolated acquisition contracts','success'],['Install exact local cache-action dependencies without scripts','success'],
 ['Verify locked cache API distribution without runtime calls','success'],
 ['Prepare Node24 for Source native and validate acquisition only on FULL','success'],['Restore Node22 for existing source validation','success'],
 ['Validate bounded native current diagnosis on artificial data only','skipped'],['Validate source contracts and release governance','skipped'],
 [SOURCE_FIRST_CURRENT_STEP,'success'],['Validate native PostgreSQL checkpoint CAS on artificial data only','success'],
 ['Upload independently completed native586 PostgreSQL phase','success'],['Validate isolated restart and two ordinary national followers','skipped'],
 ['Validate durable Copernicus current-reference baseline on artificial data only','skipped'],
 ['Validate download-inclusive DMI capacity on artificial data only','skipped'],
 ['Require validated source tree to remain unchanged','success'],['Upload tree-content source validation proof','success'],
].map(Object.freeze));
function assertSourceFirstStepEnvelope(job){
 assert(job&&Array.isArray(job.steps));assert(job.steps.length>=SOURCE_FIRST_JOB_STEPS.length);
 for(let i=0;i<SOURCE_FIRST_JOB_STEPS.length;i++){
  const row=job.steps[i];assert.equal(row.number,i+1);assert.equal(row.name,SOURCE_FIRST_JOB_STEPS[i][0]);
  assert.equal(row.status,'completed');assert.equal(row.conclusion,SOURCE_FIRST_JOB_STEPS[i][1]);
 }
 const post=job.steps.slice(SOURCE_FIRST_JOB_STEPS.length);
 // GitHub reserves internal action step numbers, so actual post steps may
 // begin at 44 after the same 24 declared/runtime main steps. Authenticate
 // their known reverse action order and monotonic identities, not adjacency.
 const postNames=['Post Restore Node22 for existing source validation','Post Set up Node24 for isolated acquisition contracts',
  'Post Run actions/setup-python@v7','Post Run actions/setup-node@v7','Post Run actions/checkout@v7','Complete job'];
 assert(post.length<=postNames.length);assert.equal(new Set(post.map(x=>x.name)).size,post.length);
 let previousNumber=SOURCE_FIRST_JOB_STEPS.length,previousOrder=-1;
 for(const row of post){
  assert(Number.isSafeInteger(row.number)&&row.number>previousNumber);
  const order=postNames.indexOf(row.name);assert(order>previousOrder);
  assert.equal(row.status,'completed');assert.equal(row.conclusion,'success');
  previousNumber=row.number;previousOrder=order;
 }
}
export function assertSourceFirstWorkflowContract(source){
 assert(typeof source==='string'&&!source.includes('\r'));
 const blocks=[...source.matchAll(/^      - (?:name: ([^\n]+)|uses: ([^\n]+))\n[\s\S]*?(?=^      - |$(?![\s\S]))/gm)].map(x=>({name:x[1]??'Run '+x[2],text:x[0]}));
 assert.deepEqual(blocks.map(x=>x.name),SOURCE_FIRST_JOB_STEPS.slice(1).map(x=>x[0]));
 const one=name=>{const rows=blocks.filter(x=>x.name===name);assert.equal(rows.length,1);return rows[0].text;};
 const only="        if: ${{ steps.source-content.outputs.selection == 'SOURCE_FIRST_ISSUANCE' || steps.source-content.outputs.selection == 'SOURCE_CURRENT_UNCHANGED' }}";
 const both="        if: ${{ steps.source-content.outputs.selection == 'FULL' || steps.source-content.outputs.selection == 'SOURCE_FIRST_ISSUANCE' || steps.source-content.outputs.selection == 'SOURCE_CURRENT_UNCHANGED' }}";
 const full="        if: ${{ steps.source-content.outputs.selection == 'FULL' }}";
 const current=one(SOURCE_FIRST_CURRENT_STEP);assert(current.includes(only+'\n'));
 assert(current.includes('        run: node scripts/source-first-issuance-contracts.mjs contracts\n'));
 assert(current.includes('RAVRADAR_SOURCE_NATIVE_NODE24_PATH: ${{ steps.source-native-node24.outputs.node24_path }}'));
 const pg=one('Validate native PostgreSQL checkpoint CAS on artificial data only');assert(pg.includes(both+'\n'));
 assert.equal(pg.split('        run: |\n')[1],'          set -euo pipefail\n          node --test scripts/test-native-postgres-evidence.mjs\n          node scripts/native-postgres-evidence.mjs\n\n');
 assert(pg.includes('RAVRADAR_SOURCE_NATIVE_NODE24_PATH: ${{ steps.source-native-node24.outputs.node24_path }}'));
 const upload=one('Upload independently completed native586 PostgreSQL phase');assert(upload.includes(both+'\n'));
 for(const value of ['uses: actions/upload-artifact@v7','path: .cache/native-postgres-phase-proof.json','if-no-files-found: error',
  'name: native586-phase-${{ github.run_id }}-${{ github.run_attempt }}-${{ github.event.pull_request.head.sha }}'])assert(upload.includes(value));
 const node24=one('Prepare Node24 for Source native and validate acquisition only on FULL');assert(node24.includes(both+'\n'));
 assert(node24.includes('        id: source-native-node24\n'));
 assert(node24.includes('          printf \'node24_path=%s\\n\' "$(command -v node)" >> "$GITHUB_OUTPUT"'));
 for(const name of ['Install source-gate dependencies','Set up Node24 for isolated acquisition contracts',
  'Install exact local cache-action dependencies without scripts','Verify locked cache API distribution without runtime calls',
  'Restore Node22 for existing source validation'])
  assert(one(name).includes(both+'\n'));
 for(const [name,result] of SOURCE_FIRST_JOB_STEPS.slice(1))if(result==='skipped')assert(one(name).includes(full+'\n'));
 const checkout=one('Run actions/checkout@v7');assert(checkout.includes('          fetch-depth: 0\n'));
 assert(checkout.includes('ref: ${{ github.event.pull_request.head.sha }}'));
 const digest=one('Build deterministic source-tree content identity');assert(digest.includes('run: node scripts/weather-source-gate.mjs impact-digest'));
 const final=one('Upload tree-content source validation proof');
 assert(final.includes("path: ${{ steps.source-content.outputs.receipt_path || '.cache/source-tree-content-proof.json' }}"));
 assert(final.includes('name: ${{ steps.source-content.outputs.artifact_name }}')&&final.includes('if-no-files-found: error'));
 return true;
}
export function sourceFirstNativeStepShape(job){
  assert(job&&Array.isArray(job.steps));
  assert.equal(new Set(job.steps.map(row=>row.number)).size,job.steps.length);
  const one=name=>{const found=job.steps.filter(row=>row.name===name);assert.equal(found.length,1);return found[0];};
  const source=one(SOURCE_FIRST_CURRENT_STEP);
  const pg=one('Validate native PostgreSQL checkpoint CAS on artificial data only');
  const upload=one('Upload independently completed native586 PostgreSQL phase');
  for(const row of [source,pg,upload])assert(row.status==='completed'&&row.conclusion==='success');
  assert.equal(pg.number,source.number+1);assert.equal(upload.number,pg.number+1);
  assertSourceFirstStepEnvelope(job);
  const historical=one('Validate source contracts and release governance');
  assert.equal(historical.status,'completed');assert.equal(historical.conclusion,'skipped');
  const finished=one('Require validated source tree to remain unchanged');
  const final=one('Upload tree-content source validation proof');
  for(const row of [finished,final])assert(row.status==='completed'&&row.conclusion==='success');
  const time=value=>{const n=Date.parse(value);assert(Number.isFinite(n));return n;};
  assert(time(source.completed_at)<=time(pg.started_at));assert(time(pg.completed_at)<=time(upload.started_at));
  assert(time(upload.completed_at)<=time(finished.started_at));assert(time(finished.completed_at)<=time(final.started_at));
  return {proofTime:time(pg.completed_at),earliestArtifact:time(source.started_at),latestArtifact:time(final.completed_at)};
}
export async function verifySourceFirstCompletedReceipt(receipt,{record,run,pull,jobs,readGit,getJson,getArtifactZip}){
  const identity=await readActualSourceFirstIdentity(); // faktisk binding før proof-operander/I/O
  const current={repository:record.repository,head:record.producerHeadSha,sourceTreeSha256:record.sourceTreeSha256,
    pullRequest:record.pullRequestNumber,runId:Number(record.runId),runAttempt:1};
  assertSourceFirstProofData(receipt,current,identity);
  assert.equal(pull.head?.ref,run.head_branch);
  const parents=readGit(['rev-list','--parents','-n','1',record.headSha]).toString('utf8').trim().split(' ');
  assert.equal(parents.length,3);assert.equal(parents[2],record.producerHeadSha);
  assert.equal(receipt.sourceBase,parents[1]);
  assert.equal(receipt.qualification,assertSourceValidationBaseFromGit(readGit,receipt.sourceBase,record.headSha,identity));
  assertSourceFirstCommittedScope(readGit,receipt.sourceBase,record.headSha,identity);
  const job=jobs.jobs.filter(row=>row.id===record.jobId);assert.equal(job.length,1);
  sourceFirstNativeStepShape(job[0]);
  const step=name=>{const found=job[0].steps.filter(row=>row.name===name);assert.equal(found.length,1);return found[0];};
  const pg=step('Validate native PostgreSQL checkpoint CAS on artificial data only');
  const upload=step('Upload independently completed native586 PostgreSQL phase');
  const nativeCurrent={run:Number(record.runId),attempt:1,head:record.producerHeadSha,
    pullRequest:record.pullRequestNumber,branch:run.head_branch};
  const expected={jobId:record.jobId,mainHead:receipt.sourceBase,sourceTreeSha256:record.sourceTreeSha256};
  const phase={kind:'SOURCE_PR_NATIVE_JOB_METADATA_V1',stage:'UPLOADED',current:{...nativeCurrent,jobId:record.jobId},
    mainHead:receipt.sourceBase,sourceTreeSha256:record.sourceTreeSha256,
    pgStartedAt:pg.started_at,pgCompletedAt:pg.completed_at,uploadedAt:upload.completed_at};
  const native=await import('./native-postgres-evidence.mjs');
  native.verifySourcePrNativePhaseReceipt(receipt.nativePostgres,nativeCurrent,expected,phase);
  const repo='/repos/'+record.repository+'/actions';
  const list=await getJson(repo+'/runs/'+record.runId+'/artifacts?per_page=100');
  assert(Array.isArray(list.artifacts)&&list.total_count===list.artifacts.length&&list.total_count<=100);
  const name='native586-phase-'+record.runId+'-1-'+record.producerHeadSha;
  const selected=list.artifacts.filter(row=>row.name===name&&row.expired===false);assert.equal(selected.length,1);
  const metadata=await getJson(repo+'/artifacts/'+selected[0].id);assert.deepEqual(metadata,selected[0]);
  const zip=await getArtifactZip(repo+'/artifacts/'+metadata.id+'/zip');
  const proof=native.verifySourcePrNativeArtifact(metadata,zip,run,phase,nativeCurrent,expected);
  assert.deepEqual(proof.nativePostgres,receipt.nativePostgres);
  assert.deepEqual(await getJson(repo+'/artifacts/'+metadata.id),metadata);
  return {validStructure:true,scope:'SOURCE_PR_NATIVE_TEST',nativeExecutedInProducerRun:true,
    postgresExecuted:false,historicalCompatibilityExecuted:false,historicalNationalExecuted:false,sourceAdmission:false,
    productionProof:false};
}
function clean(head){
  assert.equal(gitText(['rev-parse','HEAD']),head);assert.equal(gitText(['status','--porcelain','--untracked-files=no']),'');
  assert.equal(gitText(['for-each-ref','refs/replace']),'');assert.equal(gitText(['rev-parse','--is-shallow-repository']),'false');
}
async function current(){
  const {sourceTreeContentSha256}=await import('./lib/source-tree-content.mjs');
  const e=process.env;assert.equal(e.GITHUB_EVENT_NAME,'pull_request');
  const value={repository:e.GITHUB_REPOSITORY,head:e.SOURCE_GATE_HEAD_SHA,sourceTreeSha256:sourceTreeContentSha256('HEAD'),
    pullRequest:Number(e.PULL_REQUEST_NUMBER),runId:Number(e.GITHUB_RUN_ID),runAttempt:Number(e.GITHUB_RUN_ATTEMPT)};
  assertCurrentIdentity(value);clean(value.head);return value;
}
export async function prepareSourceCurrentValidation(){
  assert.equal(arguments.length,0);
  if(!sourceFirstFamilyPresent())return null;
  assertSourceFirstWorkflowContract(fs.readFileSync(path.join(ROOT,'.github/workflows/validate-pull-request.yml'),'utf8'));
  const identity=await readActualSourceFirstIdentity(),id=await current();
  const {assistantPublic591Reader}=await import('./native-postgres-evidence.mjs');
  const get=assistantPublic591Reader();const pull=await get('/repos/'+id.repository+'/pulls/'+id.pullRequest);
  assert.equal(pull.number,id.pullRequest);assert.equal(pull.state,'open');assert.equal(pull.head?.sha,id.head);
  for(const repo of [pull.head?.repo,pull.base?.repo])assert.equal(repo?.full_name,id.repository);
  assert.equal(pull.base?.ref,'main');const sourceBase=pull.base.sha;assert(oid(sourceBase));
  git(['merge-base','--is-ancestor',sourceBase,id.head]);
  const selection=assertSourceValidationBaseFromGit(git,sourceBase,id.head,identity);
  assertSourceFirstCommittedScope(git,sourceBase,id.head,identity);
  const {sourceTreeProofArtifactName}=await import('./lib/source-tree-content.mjs');
  const proof={schemaVersion:1,contractId:CONTRACT,kind:SOURCE_FIRST_NATIVE_KIND,qualification:selection,
    repository:id.repository,pullRequestNumber:id.pullRequest,headSha:id.head,sourceTreeSha256:id.sourceTreeSha256,
    privatePayloadIncluded:false,sourceBase};
  // Klargøring er kun indholdsidentitet. Ingen kontrakt- eller PG-PASS endnu.
  return {selection,identity,current:id,proof,
    artifactName:sourceTreeProofArtifactName({pullRequestNumber:id.pullRequest,headSha:id.head,sourceTreeSha256:id.sourceTreeSha256}),
    receiptPath:PROOF,deliveryAuthority:false};
}
async function executeCurrentContracts(){
  assertSourceFirstWorkflowContract(fs.readFileSync(path.join(ROOT,'.github/workflows/validate-pull-request.yml'),'utf8'));
  const identity=await readActualSourceFirstIdentity(),id=await current();
  const initial=fs.readFileSync(path.join(ROOT,PROOF),'utf8'),proof=JSON.parse(initial);
  assert.equal(proof.kind,SOURCE_FIRST_NATIVE_KIND);assert(SOURCE_SELECTIONS.includes(proof.qualification));
  assert.equal(proof.headSha,id.head);assert.equal(proof.sourceTreeSha256,id.sourceTreeSha256);
  assert(!Object.hasOwn(proof,'currentSourceContracts')&&!Object.hasOwn(proof,'nativePostgres'));
  const rows=[];
  for(const command of SOURCE_FIRST_COMMANDS){
    clean(id.head);let program=process.execPath;
    const backup=command==='node scripts/test-supabase-cli-local-restore.mjs --self-test';
    if(backup){
      program=process.env.RAVRADAR_SOURCE_NATIVE_NODE24_PATH;assert(path.isAbsolute(program??''));
      assert.equal(fs.realpathSync(program),program);const row=fs.lstatSync(program);assert(row.isFile()&&!row.isSymbolicLink());
      assert.match(execFileSync(program,['--version'],{encoding:'utf8',timeout:10000}).trim(),/^v24\./);
    }
    const childEnv=backup?Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','HOME','USERPROFILE','TMPDIR','TEMP','TMP','COMSPEC','PATHEXT']
      .filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]])):undefined;
    const started=performance.now();const result=spawnSync(program,command.split(' ').slice(1),
      {cwd:ROOT,stdio:'inherit',shell:false,timeout:300000,env:childEnv});
    const row={phase:'source-current-contract',command,elapsedMs:Math.max(0,Math.round(performance.now()-started)),
      outcome:result.status===0&&!result.error&&!result.signal?'PASS':'FAIL'};
    console.log('SOURCE_TIME '+JSON.stringify(row));rows.push(row);assert.equal(row.outcome,'PASS');
  }
  clean(id.head);assert.deepEqual(await current(),id);assert.deepEqual(await readActualSourceFirstIdentity(),identity);
  assert.equal(fs.readFileSync(path.join(ROOT,PROOF),'utf8'),initial);
  proof.currentSourceContracts={scope:'SOURCE_CURRENT_CONTRACT_RESULTS',current:id,identity,reportedCommandResults:rows,
    nativeExecutionRequired:true,nativeExecutionClaimed:false,historicalCompatibilityExecuted:false,
    fullSourceValidationClaimed:false,productionAuthority:false};
  assertSourceFirstProofData(proof,id,identity);
  fs.writeFileSync(path.join(ROOT,PROOF),JSON.stringify(proof)+'\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  assert.equal(process.argv.length,3);assert.equal(process.argv[2],'contracts');await executeCurrentContracts();
}
