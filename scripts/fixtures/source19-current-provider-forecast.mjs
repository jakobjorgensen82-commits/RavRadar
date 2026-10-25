// PRIVATE native provider INPUT only: no conditions/state/origin/publicPack.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {writeSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {requireSourceProducerOutput} from '../lib/source-producer-successor-source.mjs';
import {readDmiBulkDocument} from '../lib/dmi-bulk-storage.mjs';
import {bulkZoneToForecastRecord,buildPrivateDmiRecoveryRecord} from '../lib/private-dmi-recovery-record.mjs';
import {dmiExpectedIdentityForPart,verifiedIntegratedPartHourly,
  assertDmiPartHourlyGridSamplingApplicable} from '../lib/ravscore-production-adapters.mjs';
import {packDmiPartContinuity,unpackDmiPartContinuity} from '../lib/dmi-part-continuity.mjs';
import {writeDmiForecastFileAtomic,inspectDmiForecastFile,readDmiForecastRecord,
  readDmiWaterSourceContinuity} from '../lib/dmi-forecast-file.mjs';

// Fixed test telemetry only. The existing parent owns/fsyncs whole stderr.
// A failed write remains an ordinary I/O error; no private error text is emitted.
function createForecastStageObservation(){
  const started=performance.now();let phase='READ_INPUT',phaseStarted=started;
  const completedMs={READ_INPUT:null,QUALIFY:null,PACK:null,WRITE:null,READBACK:null};
  let readback=null,readbackStarted=null;
  return (next,counts,nextReadback=null)=>{
    const now=performance.now();
    if(nextReadback!==null){
      if(readback===null)readback={phase:nextReadback,
        completedMs:{INSPECT:null,PARENT_READ:null,PART_READ:null,UNPACK:null,EQUALITY:null}};
      else readback.completedMs[readback.phase]=Math.floor(now-readbackStarted);
      readback.phase=nextReadback;readbackStarted=now;
    }
    if(next!==phase){completedMs[phase]=Math.floor(now-phaseStarted);phase=next;phaseStarted=now;}
    const value={kind:'SOURCE_FORECAST_STAGE_OBSERVATION',phase,
      elapsedMs:Math.floor(now-started),phaseElapsedMs:Math.floor(now-phaseStarted),
      completedMs:{...completedMs},...counts,
      ...(readback===null?{}:{readback:{phase:readback.phase,completedMs:{...readback.completedMs}}}),
      privatePayloadIncluded:false};
    const bytes=Buffer.from(JSON.stringify(value)+'\n');let offset=0;
    while(offset<bytes.length){
      const written=writeSync(2,bytes,offset,bytes.length-offset);
      if(written<=0)throw new Error('SOURCE_FORECAST_OBSERVATION_WRITE_FAILED');
      offset+=written;
    }
  };
}
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export async function prepareNativeCurrentForecast(target,initialPhase=null){
  requireSourceProducerOutput(); // Own genuine issued output before input getters/I/O.
  assert.equal(process.platform,'linux');assert.equal(process.versions.node.split('.')[0],'24');
  assert.equal(path.basename(ROOT),'current-source-native');
  assert(path.basename(path.dirname(ROOT)).startsWith('rr-source19-union-native-'));
  assert.equal(await fs.realpath(process.env.RUNNER_TEMP),path.join(ROOT,'runner-temp'));
  const at=new Date(target).toISOString();assert.equal(Date.parse(at)%3600000,0);
  assert([null,'h0','h1','predecessor587'].includes(initialPhase));
  const out=path.join(path.dirname(ROOT),initialPhase==='predecessor587'?'fixture-587':initialPhase?'fixture-initial-'+initialPhase:'fixture'),file=path.join(out,'data/live/dmi-forecast-cache.json');
  await assert.rejects(fs.lstat(file),{code:'ENOENT'});
  const observe=createForecastStageObservation();
  const counts={parentRecords:0,partCount:0,qualifiedCurrentRows:0,bulkZoneCount:null,
    packRawBytes:null,packCompressedBytes:null,forecastBytes:null};
  observe('READ_INPUT',counts);
  const registry=JSON.parse(await fs.readFile(path.join(ROOT,'data/live/coastal-parts-v2.json')));
  const zoneRegistry=JSON.parse(await fs.readFile(path.join(ROOT,'data/zones.geojson')));
  assert.equal(registry.zoneCount,210);assert.equal(registry.partCount,673);
  let bulk=await readDmiBulkDocument(path.join(out,'data/live/dmi-bulk-cache.json'));
  counts.bulkZoneCount=Object.keys(bulk.zones??{}).length;
  observe('QUALIFY',counts);
  let parents=new Map(zoneRegistry.features.map(feature=>[feature.properties.id,feature])),zones={};
  const parts=[],records=new Map();let qualifiedNativeRows=0;
  for(const [zoneId,rows]of Object.entries(registry.zones)){
    const parent=parents.get(zoneId);assert(parent);
    const parentRecord=bulkZoneToForecastRecord(parent,bulk,at,null,{startAt:at});
    if(parentRecord)zones[zoneId]=parentRecord; // Honest missing parent stays missing.
    if(parentRecord)counts.parentRecords++;
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
      // Qualify every row above, then persist the unchanged original DMI record.
      // The normal selectedDmiPartRecords owner packs before score sanitization;
      // derived *Provenance views are recreated by its normal scoring adapters.
      parts.push(part);records.set(part.partId,record);
      counts.partCount=parts.length;counts.qualifiedCurrentRows=qualifiedNativeRows;
      if(parts.length%32===0)observe('QUALIFY',counts);
    }
  }
  assert.equal(parts.length,673);assert.equal(qualifiedNativeRows,673*121);
  // Release only fixture-owned roots after qualification; expected records stay intact.
  bulk=null;parents=null;
  observe('PACK',counts);
  let partContinuity=await packDmiPartContinuity(records,parts,at);
  counts.packRawBytes=partContinuity.rawBytes;counts.packCompressedBytes=partContinuity.compressedBytes;
  observe('WRITE',counts);
  const written=await writeDmiForecastFileAtomic(file,{schemaVersion:2,generatedAt:at,zones,partContinuity});
  counts.forecastBytes=written.bytes;
  const parentRecords=Object.keys(zones).length;
  // The atomic writer has settled; retain no unused parent/packed owner here.
  zones=null;partContinuity=null;
  observe('READBACK',counts,'INSPECT');
  const index=await inspectDmiForecastFile(file);
  observe('READBACK',counts,'PARENT_READ');
  // Keep every normal parent reread/hash/identity/close refusal, then discard its value.
  for(const descriptor of index.zones.values())await readDmiForecastRecord(index,descriptor);
  observe('READBACK',counts,'PART_READ');
  let readbackPack=index.metadata.partContinuity;
  if(index.continuity){
    const entries=[];
    for(const descriptor of index.continuity.entries)entries.push(await readDmiForecastRecord(index,descriptor));
    readbackPack={...index.continuity.metadata,entries};
  }
  // This fixture does not write waterSourceContinuity; preserve the normal optional read.
  if(index.waterSourceContinuity)await readDmiWaterSourceContinuity(index);
  observe('READBACK',counts,'UNPACK');
  const restored=await unpackDmiPartContinuity(readbackPack,parts,at);
  observe('READBACK',counts,'EQUALITY');
  for(const part of parts)assert.deepEqual(restored.get(part.partId).hourly,records.get(part.partId).hourly);
  observe('COMPLETE',counts,'COMPLETE');
  return {parentRecords,partCount:parts.length,qualifiedCurrentRows:qualifiedNativeRows,
    otherWeatherComplete:false,scoreProduced:false,actionInvoked:false,productionProof:false};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
  try{
  requireSourceProducerOutput();assert([3,4].includes(process.argv.length));
  const phase=process.argv.length===3?null:({'--initial-h0':'h0','--initial-h1':'h1','--predecessor587':'predecessor587'}[process.argv[3]]);
  assert(phase!==undefined);
  console.log(JSON.stringify(await prepareNativeCurrentForecast(process.argv[2],phase)));
  }catch(error){
    try{const {emitNativePostgresFirstFailure}=await import('../lib/checkpoint-cas-native-postgres.mjs');
      await emitNativePostgresFirstFailure(error,'SOURCE_LEGACY_PROVIDERS');}catch{}
    throw error;
  }
}
