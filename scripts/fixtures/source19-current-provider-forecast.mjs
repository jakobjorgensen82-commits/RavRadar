// PRIVATE native provider INPUT only: no conditions/state/origin/publicPack.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {requireSourceProducerOutput} from '../lib/source-producer-successor-source.mjs';
import {readDmiBulkDocument} from '../lib/dmi-bulk-storage.mjs';
import {bulkZoneToForecastRecord,buildPrivateDmiRecoveryRecord} from '../lib/private-dmi-recovery-record.mjs';
import {dmiExpectedIdentityForPart,verifiedIntegratedPartHourly,
  assertDmiPartHourlyGridSamplingApplicable} from '../lib/ravscore-production-adapters.mjs';
import {packDmiPartContinuity,unpackDmiPartContinuity} from '../lib/dmi-part-continuity.mjs';
import {writeDmiForecastFileAtomic,readDmiForecastFile} from '../lib/dmi-forecast-file.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const CODE37_HEAD='37a34703d9ae8bfb2c28056f21a7ea73944033ae';
const CODE37_TREE='09aef7f6f5d965f565fadabea203b50687acc255';
const LEGACY_API=Object.freeze({readDmiBulkDocument,bulkZoneToForecastRecord,buildPrivateDmiRecoveryRecord,
  dmiExpectedIdentityForPart,verifiedIntegratedPartHourly,assertDmiPartHourlyGridSamplingApplicable,
  packDmiPartContinuity,unpackDmiPartContinuity,writeDmiForecastFileAtomic,readDmiForecastFile});
const loadNormal=(root,relative)=>import(pathToFileURL(path.join(root,relative)).href);
async function genuine37CodeRoot(value){
  assert.equal(typeof value,'string');assert(path.isAbsolute(value));
  const expected=path.join(path.dirname(ROOT),'current594-native-inputs/normal-genuine594');
  assert.equal(value,expected);assert.equal(await fs.realpath(value),value);
  let at=path.parse(value).root;
  for(const part of path.relative(at,value).split(path.sep).filter(Boolean)){
    at=path.join(at,part);assert(!(await fs.lstat(at)).isSymbolicLink());
  }
  const git=(...args)=>execFileSync('git',['-c','core.autocrlf=false','-C',value,...args],{encoding:'utf8',
    stdio:['ignore','pipe','pipe'],timeout:30000,maxBuffer:4*1024*1024,
    env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',
      GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'protocol.allow',GIT_CONFIG_VALUE_0:'never'}}).trim();
  assert.equal(git('rev-parse','HEAD'),CODE37_HEAD);assert.equal(git('rev-parse','HEAD^{tree}'),CODE37_TREE);
  const admin=new Set(['data/zones.geojson','data/admin/coastline-overrides.json','data/admin/direction-reviews.json',
    'data/live/coastal-parts-v2.json','data/geometry-v2/active-national-coastal-parts/manifest.json',
    ...['coastal-parts.geojson','part-names.json','point-pairs.json','dmi-grid-proof.json']
      .map(name=>'data/geometry-v2/active-national-coastal-parts/'+name)]);
  assert(git('diff','--name-only','HEAD').split('\n').filter(Boolean).every(name=>admin.has(name)),'Genuine37 product unchanged');
  assert.equal(git('ls-files','--others','--exclude-standard','--','scripts','js'),'');
  return value;
}
async function normalApi(root){
  if(root===ROOT)return LEGACY_API;
  return Object.assign({},await loadNormal(root,'scripts/lib/dmi-bulk-storage.mjs'),
    await loadNormal(root,'scripts/lib/private-dmi-recovery-record.mjs'),
    await loadNormal(root,'scripts/lib/ravscore-production-adapters.mjs'),
    await loadNormal(root,'scripts/lib/dmi-part-continuity.mjs'),
    await loadNormal(root,'scripts/lib/dmi-forecast-file.mjs'));
}
export async function prepareNativeCurrentForecast(target,initialPhase=null,code37Root=null){
  requireSourceProducerOutput(); // Own genuine issued output before input getters/I/O.
  assert.equal(process.platform,'linux');assert.equal(process.versions.node.split('.')[0],'24');
  assert.equal(path.basename(ROOT),'current-source-native');
  assert(path.basename(path.dirname(ROOT)).startsWith('rr-source19-union-native-'));
  assert.equal(await fs.realpath(process.env.RUNNER_TEMP),path.join(ROOT,'runner-temp'));
  const at=new Date(target).toISOString();assert.equal(Date.parse(at)%3600000,0);
  assert([null,'h0','h1','current594'].includes(initialPhase));
  const current594=initialPhase==='current594';assert(code37Root===null||current594);
  const normalRoot=code37Root===null?ROOT:await genuine37CodeRoot(code37Root),api=await normalApi(normalRoot);
  const out=path.join(path.dirname(ROOT),code37Root!==null?'fixture-current594-code37':current594?'fixture-current594':initialPhase?'fixture-initial-'+initialPhase:'fixture'),file=path.join(out,'data/live/dmi-forecast-cache.json');
  await assert.rejects(fs.lstat(file),{code:'ENOENT'});
  const registry=JSON.parse(await fs.readFile(path.join(normalRoot,'data/live/coastal-parts-v2.json')));
  const zoneRegistry=JSON.parse(await fs.readFile(path.join(normalRoot,'data/zones.geojson')));
  assert.equal(registry.zoneCount,210);assert.equal(registry.partCount,673);
  const bulk=await api.readDmiBulkDocument(path.join(out,'data/live/dmi-bulk-cache.json'));
  const parents=new Map(zoneRegistry.features.map(feature=>[feature.properties.id,feature]));
  const zones={},parts=[],records=new Map();let qualifiedNativeRows=0,qualifiedPrivateHistoryRows=0;
  const demand=current594?JSON.parse(await fs.readFile(path.join(out,'.cache/current594-history-demand.json'))):null;
  const byPart=new Map((demand?.demands??[]).map(row=>[row.partId,row]));
  if(current594){assert.equal(demand.productionReferenceAt,at);assert.equal(byPart.size,673);}
  for(const [zoneId,rows]of Object.entries(registry.zones)){
    const parent=parents.get(zoneId);assert(parent);
    const parentRecord=api.bulkZoneToForecastRecord(parent,bulk,at,null,{startAt:at});
    if(parentRecord)zones[zoneId]=parentRecord; // Honest missing parent stays missing.
    for(const base of rows){
      const part={...base,zoneId,parentZoneId:zoneId},id='PART::'+part.partId;
      const identity=api.dmiExpectedIdentityForPart(part,id);assert(identity);
      const feature={type:'Feature',geometry:{type:'Point',coordinates:part.waterPoint},
        properties:{...parent.properties,id,dataPoint:part.waterPoint}};
      const record=api.buildPrivateDmiRecoveryRecord(feature,bulk,at,{startAt:at,expectedIdentity:identity});
      assert(record);assert.equal(record.hourly.length,121);assert.equal(record.zoneId,id);
      const qualified=api.verifiedIntegratedPartHourly(record,bulk,id,part,{requireNativeGridSampling:true});
      api.assertDmiPartHourlyGridSamplingApplicable(qualified,id,part);
      for(const row of qualified){
        assert.equal(row.currentProvenance?.provider,'dmi');assert.equal(row.currentProvenance?.status,'verified');
        assert(Number.isFinite(row.currentUMps)&&Number.isFinite(row.currentVMps));qualifiedNativeRows++;
      }
      if(current594){
        const need=byPart.get(part.partId);assert(need);assert.equal(need.endAt,at);
        const history=api.buildPrivateDmiRecoveryRecord(feature,bulk,at,{startAt:need.startAt,expectedIdentity:identity});
        assert(history);
        const verified=api.verifiedIntegratedPartHourly(history,bulk,id,part,{requireNativeGridSampling:true});
        api.assertDmiPartHourlyGridSamplingApplicable(verified,id,part);
        const expectedHours=(Date.parse(at)-Date.parse(need.startAt))/3600000;
        assert(Number.isSafeInteger(expectedHours)&&expectedHours>=0&&expectedHours<=123);
        for(let offset=0;offset<expectedHours;offset++){
          const time=new Date(Date.parse(need.startAt)+offset*3600000).toISOString();
          const row=verified.find(hour=>hour.time===time);assert(row);
          assert.equal(row.currentProvenance?.provider,'dmi');assert.equal(row.currentProvenance?.status,'verified');
          assert(Number.isFinite(row.currentUMps)&&Number.isFinite(row.currentVMps));qualifiedPrivateHistoryRows++;
        }
      }
      // The normal adapters/pack serialize actual selected/qualified values;
      // no handcrafted forecast point, provenance, interpolation or state.
      parts.push(part);records.set(part.partId,{...record,hourly:qualified});
    }
  }
  assert.equal(parts.length,673);assert.equal(qualifiedNativeRows,673*121);
  const partContinuity=await api.packDmiPartContinuity(records,parts,at);
  await api.writeDmiForecastFileAtomic(file,{schemaVersion:2,generatedAt:at,zones,partContinuity});
  const readback=await api.readDmiForecastFile(file),restored=await api.unpackDmiPartContinuity(readback.partContinuity,parts,at);
  for(const part of parts)assert.deepEqual(restored.get(part.partId).hourly,records.get(part.partId).hourly);
  return {parentRecords:Object.keys(zones).length,partCount:parts.length,qualifiedCurrentRows:qualifiedNativeRows,
    otherWeatherComplete:false,scoreProduced:false,actionInvoked:false,productionProof:false,
    ...(current594?{profile:'current594-preparation',qualifiedPrivateHistoryRows,historyProducedByNormalDecoder:true,
      fullRuntimeProduced:false,sourceOwnerIssued:false}: {})};
}
// One actual normal acquisition-demand projection, not a selected parent,
// state/origin/READY writer or an alternate positive attestation.
export async function prepareNativeCurrent594Demand(target,code37Root=null){
  requireSourceProducerOutput();
  assert.equal(process.platform,'linux');assert.equal(process.versions.node.split('.')[0],'24');
  assert.equal(path.basename(ROOT),'current-source-native');
  assert(path.basename(path.dirname(ROOT)).startsWith('rr-source19-union-native-'));
  assert.equal(await fs.realpath(process.env.RUNNER_TEMP),path.join(ROOT,'runner-temp'));
  const at=new Date(target).toISOString();assert.equal(target,at);assert.equal(Date.parse(at)%3600000,0);
  const normalRoot=code37Root===null?ROOT:await genuine37CodeRoot(code37Root);
  const out=path.join(path.dirname(ROOT),code37Root===null?'fixture-current594':'fixture-current594-code37');
  assert.equal(await fs.realpath(out),out);
  const raw=await fs.readFile(path.join(normalRoot,'data/live/coastal-parts-v2.json'));
  const registry=JSON.parse(raw);assert.equal(registry.zoneCount,210);assert.equal(registry.partCount,673);
  const {buildRavScoreCurrentHistoryDemand}=await loadNormal(normalRoot,'scripts/plan-ravscore-current-history.mjs');
  const demand=buildRavScoreCurrentHistoryDemand({registry,conditions:{},checkpoint:{loaded:false},
    productionReferenceAt:at,registrySha256:'sha256:'+crypto.createHash('sha256').update(raw).digest('hex'),
    sourceHashes:{activation:null,checkpoint:null,conditions:null}});
  assert.equal(demand.demands.length,673);
  const file=path.join(out,'.cache/current594-history-demand.json');
  await fs.mkdir(path.dirname(file),{recursive:true});
  const bytes=Buffer.from(JSON.stringify(demand)+'\n');
  const handle=await fs.open(file,'wx',0o600);let first;
  try{await handle.writeFile(bytes);await handle.sync();}catch(error){first=error;}
  try{await handle.close();}catch(error){first??=error;}if(first)throw first;
  assert.deepEqual(await fs.readFile(file),bytes);
  return {profile:'current594-preparation',partCount:673,normalHistoryDemand:true,
    fullRuntimeProduced:false,sourceOwnerIssued:false,actionInvoked:false,productionProof:false};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
  try{
  requireSourceProducerOutput();assert([3,4,5].includes(process.argv.length));
  const mode=process.argv.length===3?null:process.argv[3];
  const code37Mode=['--current594-code37','--current594-code37-demand'].includes(mode);
  assert.equal(process.argv.length===5,code37Mode);const code37Root=code37Mode?process.argv[4]:null;
  const demand=['--current594-demand','--current594-code37-demand'].includes(mode);
  const phase=mode===null?null:({'--initial-h0':'h0','--initial-h1':'h1','--current594':'current594','--current594-code37':'current594'}[mode]);
  assert(phase!==undefined||demand);
  console.log(JSON.stringify(await(demand?prepareNativeCurrent594Demand(process.argv[2],code37Root):
    prepareNativeCurrentForecast(process.argv[2],phase,code37Root))));
  }catch(error){
    try{const {emitNativePostgresFirstFailure}=await import('../lib/checkpoint-cas-native-postgres.mjs');
      await emitNativePostgresFirstFailure(error,'SOURCE_LEGACY_PROVIDERS');}catch{}
    throw error;
  }
}
