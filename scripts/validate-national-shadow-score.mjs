#!/usr/bin/env node
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateRavScore } from '../js/core/score-engine.js';
import { applyCurrentTransportToHistory } from './lib/current-transport-history.mjs';

const DEFAULTS={contract:'.geometry-v2-work/national-weather-shadow-contract.json',multi:'.geometry-v2-work/national-multi-step-series-validation.json',state:'.geometry-v2-work/national-state-history-validation.json',wind:'.geometry-v2-work/national-local-part-wind-series.json',marineInput:'.cache/national-shadow-score-marine-input.json',windInput:'.cache/national-shadow-score-wind-input.json',output:'.geometry-v2-work/national-shadow-score-validation.json'};
const finite=value=>Number.isFinite(Number(value))?Number(value):null;
const norm=value=>(Number(value)%360+360)%360;
const toward=(u,v)=>norm(Math.atan2(Number(u),Number(v))*180/Math.PI);
const windFrom=(u,v)=>norm(toward(u,v)+180);
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,20);

function validateInputs(contract,multi,state,wind,marineInput,windInput){
  if(contract?.status!=='private-national-shadow-contract-ready'||multi?.status!=='passed-private-national-multi-step-series-validation'||state?.status!=='passed-private-national-state-history-isolation'||wind?.status!=='passed-private-national-native-wind-series-validation')throw new Error('Shadow-score kræver fire beståede nationale forgates');
  if(marineInput?.status!=='private-transient-national-shadow-score-marine-input'||windInput?.status!=='private-transient-national-shadow-score-wind-input')throw new Error('Shadow-score mangler transient native input');
  for(const report of [multi,state,wind])for(const flag of ['productionGeometryChanged','adminDataChanged','publicRuntimeChanged','scoreChanged','automaticActivationAllowed'])if(report[flag]!==false)throw new Error(`Forgate tillader mutation: ${flag}`);
}

export function buildNationalShadowScoreReport(contract,multi,state,wind,marineInput,windInput){
  validateInputs(contract,multi,state,wind,marineInput,windInput);
  const contractById=new Map(contract.parts.map(part=>[part.partId,part]));
  const windById=new Map(windInput.series.map(row=>[row.partId,new Map(row.hours.map(hour=>[hour.time,hour]))]));
  const partRows=[];
  for(const marine of marineInput.series){
    const part=contractById.get(marine.partId),localWind=windById.get(marine.partId);
    if(!part||marine.zoneId!==part.zoneId||marine.seriesId!==part.seriesId||!localWind)continue;
    const marineByTime=new Map(marine.hours.map(hour=>[Date.parse(hour.time),hour]));
    const currentSamples=[];
    for(const hour of marine.hours){
      const u=finite(hour['current-u']),v=finite(hour['current-v']);
      if(u!==null&&v!==null)currentSamples.push({at:hour.time,currentSpeedMps:Math.hypot(u,v),currentDirectionDeg:toward(u,v),currentAlignment:Math.cos((toward(u,v)-Number(part.onshoreDirectionDeg))*Math.PI/180),currentVerified:true});
    }
    const snapshots=[];
    for(const hour of marine.hours){
      const next=marineByTime.get(Date.parse(hour.time)+3*3600e3),w=localWind.get(hour.time);
      if(!next||!w)continue;
      const values=['significant-wave-height','sea-mean-deviation','current-u','current-v'].map(key=>finite(hour[key]));
      const wu=finite(w['wind-u-10m']),wv=finite(w['wind-v-10m']),nextSea=finite(next['sea-mean-deviation']);
      if(values.some(value=>value===null)||wu===null||wv===null||nextSea===null)continue;
      const [wave,sea,cu,cv]=values;
      const weather={windSpeedMps:Math.hypot(wu,wv),windDirectionDeg:windFrom(wu,wv),waveHeightM:wave,waveDirectionDeg:finite(hour['mean-wave-dir']),wavePeriodS:finite(hour['dominant-wave-period']),waterLevelCm:sea*100,waterLevelTrendCm3h:(nextSea-sea)*100,currentSpeedMps:Math.hypot(cu,cv),currentDirectionDeg:toward(cu,cv)};
      const history=applyCurrentTransportToHistory({},currentSamples.filter(sample=>Date.parse(sample.at)<=Date.parse(hour.time)));
      const zone={id:part.partId,name:part.partName??part.name??part.partId,coastType:part.coastType,onshoreDirectionDeg:Number(part.onshoreDirectionDeg)};
      const modes={};
      for(const mode of ['waders','beach']){
        const result=calculateRavScore({mode,zone,weather,history});
        if(!result.available||!Number.isFinite(result.score))throw new Error(`${part.partId}/${hour.time}/${mode} gav ikke gyldig RavScore`);
        modes[mode]={score:result.score,components:result.components,contributions:result.explanation?.contributions,dominantPathway:result.explanation?.mobilisationDiagnostics?.dominantPathway??null};
      }
      snapshots.push({time:hour.time,inputDigest:digest([part.seriesId,hour.time,weather,history]),modes,stateModelMode:history.stateModelMode??'shadow-v2'});
    }
    if(snapshots.length)partRows.push({zoneId:part.zoneId,partId:part.partId,partName:part.partName??part.name??part.partId,seriesId:part.seriesId,snapshots});
  }
  if(partRows.length!==contract.fullCoveragePartCount)throw new Error(`Shadow-score dækkede ${partRows.length}/${contract.fullCoveragePartCount} fuldt marine-dækkede dele`);
  const rowsByZone=new Map();for(const row of partRows)(rowsByZone.get(row.zoneId)??rowsByZone.set(row.zoneId,[]).get(row.zoneId)).push(row);
  const blockedByZone=new Map();for(const row of contract.blockedParts||[])(blockedByZone.get(row.zoneId)??blockedByZone.set(row.zoneId,[]).get(row.zoneId)).push(row);
  const zones=[];
  const zoneIds=[...new Set([...contract.parts.map(part=>part.zoneId),...(contract.blockedParts||[]).map(part=>part.zoneId)].filter(Boolean))].sort();
  for(const zoneId of zoneIds){
    const parts=contract.parts.filter(part=>part.zoneId===zoneId);
    const scored=rowsByZone.get(zoneId)||[],times=[...new Set(scored.flatMap(row=>row.snapshots.map(s=>s.time)))].sort(),evaluations=[];
    for(const time of times)for(const mode of ['waders','beach']){
      const available=scored.map(row=>({partId:row.partId,partName:row.partName,result:row.snapshots.find(s=>s.time===time)?.modes?.[mode]})).filter(row=>row.result);
      if(available.length!==parts.length){evaluations.push({time,mode,status:'uncertain',reason:'MISSING_LOCAL_PART_COMPARISON',validPartCount:available.length,expectedPartCount:parts.length});continue;}
      available.sort((a,b)=>b.result.score-a.result.score||a.partId.localeCompare(b.partId));const max=available[0].result.score,min=available.at(-1).result.score,near=available.filter(row=>max-row.result.score<=7);
      const status=max-min<=7?'whole-zone':near.length===1?'only-part':'several-parts';
      evaluations.push({time,mode,status,winningScore:max,scoreSpread:max-min,marginPoints:7,parts:status==='whole-zone'?[]:near.map(row=>({partId:row.partId,partName:row.partName,score:row.result.score})),scoreDigest:digest(available.map(row=>[row.partId,row.result.score]))});
    }
    if(!times.length)evaluations.push({time:null,mode:'both',status:'uncertain',reason:blockedByZone.has(zoneId)?'BLOCKED_OR_MISSING_NATIVE_INPUT':'NO_COMMON_NATIVE_SCORE_TIME',validPartCount:0,expectedPartCount:parts.length});
    zones.push({zoneId,expectedPartCount:parts.length,validShadowPartCount:scored.length,blockedPartCount:(blockedByZone.get(zoneId)||[]).length,evaluations});
  }
  const evaluationRows=zones.flatMap(zone=>zone.evaluations);
  return {schemaVersion:'1.0.0',status:'passed-private-national-shadow-score-validation',generatedAt:new Date().toISOString(),marginPoints:7,eligiblePartCount:contract.eligiblePartCount,scoredPartCount:partRows.length,unscoredPartCount:contract.eligiblePartCount-partRows.length,blockedPartCount:contract.blockedPartCount,zoneCount:zones.length,coverageStatusCounts:Object.fromEntries(['whole-zone','only-part','several-parts','uncertain'].map(status=>[status,evaluationRows.filter(row=>row.status===status).length])),parts:partRows,zones,parentRuntimeTruth:contract.parentRuntimeTruth,rawWeatherValuesStored:false,transientInputsDeleted:false,parentFallbackDetected:false,interpolationDetected:false,crossPartMergeDetected:false,scoreEnabled:false,productionGeometryChanged:false,adminDataChanged:false,weatherSamplingChanged:false,stateChanged:false,publicRuntimeChanged:false,scoreChanged:false,automaticActivationAllowed:false,activationGatesRemaining:['score-neutral-ui-review','central-admin-roundtrip-and-rollback','explicit-owner-go-no-go-before-score-or-production-activation']};
}

export function selfTest(){
  const times=['2026-08-10T00:00:00.000Z','2026-08-10T03:00:00.000Z'];
  const parts=['a','b'].map((partId,i)=>({zoneId:'Z',partId,partName:partId,seriesId:`Z::${partId}`,historyKey:`h::${partId}`,coastType:'west',onshoreDirectionDeg:90}));
  const contract={status:'private-national-shadow-contract-ready',eligiblePartCount:2,fullCoveragePartCount:2,blockedPartCount:0,blockedParts:[],parts,parentRuntimeTruth:'parent'};
  const clean={productionGeometryChanged:false,adminDataChanged:false,publicRuntimeChanged:false,scoreChanged:false,automaticActivationAllowed:false};
  const multi={status:'passed-private-national-multi-step-series-validation',...clean},state={status:'passed-private-national-state-history-isolation',...clean},wind={status:'passed-private-national-native-wind-series-validation',...clean};
  const marineInput={status:'private-transient-national-shadow-score-marine-input',series:parts.map((p,i)=>({...p,hours:times.map((time,j)=>({time,'significant-wave-height':.4+i*.02,'mean-wave-dir':270,'dominant-wave-period':5,'sea-mean-deviation':.1+j*.01,'current-u':.2,'current-v':.1}))})),excluded:[]};
  const windInput={status:'private-transient-national-shadow-score-wind-input',series:parts.map(p=>({...p,hours:[{time:times[0],'wind-u-10m':-4,'wind-v-10m':0}]})),excluded:[]};
  const report=buildNationalShadowScoreReport(contract,multi,state,wind,marineInput,windInput);
  if(report.status!=='passed-private-national-shadow-score-validation'||report.scoredPartCount!==2||report.zones.length!==1||report.zones[0].evaluations.length!==2||report.rawWeatherValuesStored)throw new Error('Gyldig shadow-score blev afvist');
  const broken=structuredClone(windInput);broken.series.pop();try{buildNationalShadowScoreReport(contract,multi,state,wind,marineInput,broken);throw new Error('Manglende fulddækket del blev accepteret');}catch(error){if(error.message==='Manglende fulddækket del blev accepteret')throw error;}
  console.log('National privat shadow-score self-test: bestået');
}

async function main(){
  if(process.argv.includes('--self-test')){selfTest();return;}
  const args=process.argv.slice(2),value=(flag,fallback)=>{const i=args.indexOf(flag);return i>=0?args[i+1]:fallback};
  const files=Object.fromEntries(Object.entries(DEFAULTS).map(([key,fallback])=>[key,value(`--${key.replace(/[A-Z]/g,m=>`-${m.toLowerCase()}`)}`,fallback)]));
  try{
    const [contract,multi,state,wind,marineInput,windInput]=await Promise.all(['contract','multi','state','wind','marineInput','windInput'].map(key=>fs.readFile(files[key],'utf8').then(JSON.parse)));
    const report=buildNationalShadowScoreReport(contract,multi,state,wind,marineInput,windInput);await fs.mkdir(path.dirname(files.output),{recursive:true});await fs.writeFile(files.output,JSON.stringify(report,null,2)+'\n');
    await Promise.all([files.marineInput,files.windInput].map(file=>fs.unlink(file)));report.transientInputsDeleted=true;await fs.writeFile(files.output,JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({status:report.status,scoredPartCount:report.scoredPartCount,unscoredPartCount:report.unscoredPartCount,coverageStatusCounts:report.coverageStatusCounts,scoreChanged:false}));
  }finally{await Promise.all([files.marineInput,files.windInput].map(file=>fs.unlink(file).catch(()=>{})));}
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))main().catch(error=>{console.error(error.message);process.exit(1)});
