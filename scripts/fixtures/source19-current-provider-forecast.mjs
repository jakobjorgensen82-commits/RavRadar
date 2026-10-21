// PRIVATE native provider INPUT only: no conditions/state/origin/publicPack.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {requireSourceProducerOutput} from '../lib/source-producer-successor-source.mjs';
import {readDmiBulkDocument} from '../lib/dmi-bulk-storage.mjs';
import {bulkZoneToForecastRecord,buildPrivateDmiRecoveryRecord} from '../lib/private-dmi-recovery-record.mjs';
import {dmiExpectedIdentityForPart,verifiedIntegratedPartHourly,
  assertDmiPartHourlyGridSamplingApplicable} from '../lib/ravscore-production-adapters.mjs';
import {packDmiPartContinuity,unpackDmiPartContinuity} from '../lib/dmi-part-continuity.mjs';
import {writeDmiForecastFileAtomic,readDmiForecastFile} from '../lib/dmi-forecast-file.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export async function prepareNativeCurrentForecast(target,initialPhase=null){
  requireSourceProducerOutput(); // Own genuine issued output before input getters/I/O.
  assert.equal(process.platform,'linux');assert.equal(process.versions.node.split('.')[0],'24');
  assert.equal(path.basename(ROOT),'current-source-native');
  assert(path.basename(path.dirname(ROOT)).startsWith('rr-source19-union-native-'));
  assert.equal(await fs.realpath(process.env.RUNNER_TEMP),path.join(ROOT,'runner-temp'));
  const at=new Date(target).toISOString();assert.equal(Date.parse(at)%3600000,0);
  assert([null,'h0','h1'].includes(initialPhase));
  const out=path.join(path.dirname(ROOT),initialPhase?'fixture-initial-'+initialPhase:'fixture'),file=path.join(out,'data/live/dmi-forecast-cache.json');
  await assert.rejects(fs.lstat(file),{code:'ENOENT'});
  const registry=JSON.parse(await fs.readFile(path.join(ROOT,'data/live/coastal-parts-v2.json')));
  const zoneRegistry=JSON.parse(await fs.readFile(path.join(ROOT,'data/zones.geojson')));
  assert.equal(registry.zoneCount,210);assert.equal(registry.partCount,673);
  const bulk=await readDmiBulkDocument(path.join(out,'data/live/dmi-bulk-cache.json'));
  const parents=new Map(zoneRegistry.features.map(feature=>[feature.properties.id,feature]));
  const zones={},parts=[],records=new Map();let qualifiedNativeRows=0;
  for(const [zoneId,rows]of Object.entries(registry.zones)){
    const parent=parents.get(zoneId);assert(parent);
    const parentRecord=bulkZoneToForecastRecord(parent,bulk,at,null,{startAt:at});
    if(parentRecord)zones[zoneId]=parentRecord; // Honest missing parent stays missing.
    for(const base of rows){
      const part={...base,zoneId,parentZoneId:zoneId},id='PART::'+part.partId;
      const identity=dmiExpectedIdentityForPart(part,id);assert(identity);
      const feature={type:'Feature',geometry:{type:'Point',coordinates:part.waterPoint},
        properties:{...parent.properties,id,dataPoint:part.waterPoint}};
      const record=buildPrivateDmiRecoveryRecord(feature,bulk,at,{startAt:at,expectedIdentity:identity});
      assert(record);assert.equal(record.hourly.length,121);assert.equal(record.zoneId,id);
      const qualified=verifiedIntegratedPartHourly(record,bulk,id,part,{requireNativeGridSampling:true});
      assertDmiPartHourlyGridSamplingApplicable(qualified,id,part);
      for(const row of qualified){
        assert.equal(row.currentProvenance?.provider,'dmi');assert.equal(row.currentProvenance?.status,'verified');
        assert(Number.isFinite(row.currentUMps)&&Number.isFinite(row.currentVMps));qualifiedNativeRows++;
      }
      // The normal adapters/pack serialize actual selected/qualified values;
      // no handcrafted forecast point, provenance, interpolation or state.
      parts.push(part);records.set(part.partId,{...record,hourly:qualified});
    }
  }
  assert.equal(parts.length,673);assert.equal(qualifiedNativeRows,673*121);
  const partContinuity=await packDmiPartContinuity(records,parts,at);
  await writeDmiForecastFileAtomic(file,{schemaVersion:2,generatedAt:at,zones,partContinuity});
  const readback=await readDmiForecastFile(file),restored=await unpackDmiPartContinuity(readback.partContinuity,parts,at);
  for(const part of parts)assert.deepEqual(restored.get(part.partId).hourly,records.get(part.partId).hourly);
  return {parentRecords:Object.keys(zones).length,partCount:parts.length,qualifiedCurrentRows:qualifiedNativeRows,
    otherWeatherComplete:false,scoreProduced:false,actionInvoked:false,productionProof:false};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
  try{
  requireSourceProducerOutput();assert([3,4].includes(process.argv.length));
  const phase=process.argv.length===3?null:({'--initial-h0':'h0','--initial-h1':'h1'}[process.argv[3]]);
  assert(phase!==undefined);
  console.log(JSON.stringify(await prepareNativeCurrentForecast(process.argv[2],phase)));
  }catch(error){
    try{const {emitNativePostgresFirstFailure}=await import('../lib/checkpoint-cas-native-postgres.mjs');
      await emitNativePostgresFirstFailure(error,'SOURCE_LEGACY_PROVIDERS');}catch{}
    throw error;
  }
}
