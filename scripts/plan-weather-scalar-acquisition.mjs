#!/usr/bin/env node
// Private, advisory retained demand. No weather value or coverage admission.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadRetainedPartScalarPlanning, retainedScalarPlanningFailureDiagnostic} from './lib/weather-component-runtime.mjs';
import {isWeatherTransportStopUnproved} from './lib/weather-transport-settlement.mjs';
const HOUR=3600000,COMPONENTS=['wind','waterLevel','waterTemperature'];
export function encodeRetainedScalarNeeds(plan) {
  const reference=Date.parse(plan.productionReferenceAt);
  if (!Number.isFinite(reference)||reference%HOUR!==0||!Array.isArray(plan.parts)||!plan.parts.length||plan.parts.length>673) throw Error('SCALAR_ENCODING_DOMAIN_INVALID');
  const partIds=plan.parts.map(part=>part.partId).sort((a,b)=>Buffer.compare(Buffer.from(a),Buffer.from(b)));
  if(partIds.some(id=>typeof id!=='string'||!id)||new Set(partIds).size!==partIds.length)throw Error('SCALAR_ENCODING_DOMAIN_INVALID');
  const ordinal=new Map(partIds.map((id,i)=>[id,i])),n=partIds.length;
  const value=Object.fromEntries(COMPONENTS.map(c=>[c,Buffer.alloc(Math.ceil(n*118/8))]));
  const trend=Buffer.alloc(Math.ceil(n*118/8)),support=Buffer.alloc(Math.ceil(n*121/8));
  const set=(bytes,index)=>{bytes[index>>3]|=1<<(index&7);};
  const index=(row,hours)=>{const offset=(Date.parse(row.validTime)-reference)/HOUR;const part=ordinal.get(row.partId);if(part===undefined||!Number.isInteger(offset)||offset<0||offset>=hours)throw Error('SCALAR_ENCODING_ROW_INVALID');return part*hours+offset;};
  for(const row of plan.needs){
    if(row.purpose!=='GAP')continue;
    if(!COMPONENTS.includes(row.component))throw Error('SCALAR_ENCODING_COMPONENT_INVALID');
    const target=row.gapReason==='VALUE_GAP'?value[row.component]:row.component==='waterLevel'&&row.gapReason==='TREND_GAP'?trend:null;
    if(!target)throw Error('SCALAR_ENCODING_REASON_INVALID');set(target,index(row,118));
  }
  for(const row of plan.privateSupportNeeds){if(row.component!=='waterLevel'||row.purpose!=='PRIVATE_T_PLUS_3_SUPPORT')throw Error('SCALAR_ENCODING_SUPPORT_INVALID');set(support,index(row,121));}
  return {schemaVersion:1,kind:'retained-part-scalar-needs-v1',productionReferenceAt:new Date(reference).toISOString().replace('.000Z','Z'),partIds,
    forecastHourCount:118,supportHourCount:121,encoding:'hex-lsb0-v1',valueGapMasks:Object.fromEntries(COMPONENTS.map(c=>[c,value[c].toString('hex')])),
    waterTrendGapMask:trend.toString('hex'),waterSupportMask:support.toString('hex'),snapshotInputHashes:plan.snapshotInputHashes};
}
async function main() {
  // This selects the ordinary restored route only. The existing private restore
  // and every normal component reader still provide actual data qualification.
  const startedAt=performance.now();
  let phase='CONTEXT';
  try {
    if(process.env.RAVRADAR_RETAINED_SCALAR_CONTEXT!=='ordinary-restored'
      ||process.env.RAVRADAR_REQUIRE_PRIVATE_WEATHER_BASELINE!=='true')throw Error('RETAINED_SCALAR_CONTEXT_UNAVAILABLE');
    phase='ARGUMENTS';
    const args=new Map();for(let i=2;i<process.argv.length;i+=2){const key=process.argv[i],value=process.argv[i+1];if(!['--cache','--at','--historical'].includes(key)||args.has(key)||!value)throw Error('RETAINED_SCALAR_ARGUMENTS_INVALID');args.set(key,value);}
    if(!args.has('--cache')||!args.has('--at'))throw Error('RETAINED_SCALAR_ARGUMENTS_INVALID');
    const root=path.resolve('.'),reference=new Date(args.get('--at')).toISOString();
    phase='LOAD';
    const plan=await loadRetainedPartScalarPlanning({root,dmiCachePath:path.resolve(args.get('--cache')),productionReferenceAt:reference,
      historicalCachePath:args.has('--historical')?path.resolve(args.get('--historical')):null});
    phase='ENCODE';
    const bytes=Buffer.from(JSON.stringify(encodeRetainedScalarNeeds(plan))+'\n');if(bytes.length>16*1024*1024)throw Error('RETAINED_SCALAR_PLAN_SIZE');
    phase='PUBLISH';
    const output=path.join(root,'.cache/weather-scalar-needs.json'),temporary=output+'.tmp';
    let handle=null,owned=false;
    try{handle=await fs.open(temporary,'wx',0o600);owned=true;await handle.writeFile(bytes);await handle.sync();await handle.close();handle=null;await fs.rename(temporary,output);owned=false;}
    finally{await handle?.close();if(owned)await fs.unlink(temporary);}
    console.log('Retained scalar advisory plan prepared from normal offline readers.');
  } catch(error) {
    const unproved=isWeatherTransportStopUnproved(error);
    console.error(unproved?'RETAINED_SCALAR_PLAN_STOP_UNPROVED':'RETAINED_SCALAR_PLAN_UNAVAILABLE');
    console.error(JSON.stringify({...retainedScalarPlanningFailureDiagnostic(error,phase),
      elapsedMillis:Math.max(0,Math.round(performance.now()-startedAt))}));
    process.exitCode=unproved?2:1;
  }
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
  await main();
}
