#!/usr/bin/env node
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyCurrentTransportToHistory } from './lib/current-transport-history.mjs';
import { calculateRavScore } from '../js/core/score-engine.js';

const DEFAULT_CONTRACT='.geometry-v2-work/national-weather-shadow-contract.json';
const DEFAULT_SERIES='.geometry-v2-work/national-multi-step-series-validation.json';
const DEFAULT_INPUT='.cache/national-state-replay-input.json';
const DEFAULT_OUTPUT='.geometry-v2-work/national-state-history-validation.json';
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,20);
const finite=value=>Number.isFinite(Number(value))?Number(value):null;
const clamp=(value,min=-1,max=1)=>Math.min(max,Math.max(min,value));
const direction=(u,v)=>(Math.atan2(u,v)*180/Math.PI+360)%360;
const alignment=(toward,onshore)=>clamp(Math.cos((toward-onshore)*Math.PI/180));

export function buildNationalStateHistoryReport(contract,multi,input){
  if(contract?.status!=='private-national-shadow-contract-ready'||multi?.status!=='passed-private-national-multi-step-series-validation'||input?.status!=='private-transient-national-state-replay')throw new Error('National stategate kræver bestået kontrakt, flertrinsrapport og transient replay');
  if(contract?.statePolicy?.enabled!==false||contract?.statePolicy?.parentHistoryReuseAllowed!==false||contract?.statePolicy?.separatePartHistoryRequired!==true)throw new Error('Kontrakten tillader ikke sikker separat statevalidering');
  const contractParts=new Map(contract.parts.map(part=>[part.partId,part]));
  const multiParts=new Map(multi.series.map(part=>[part.partId,part]));
  const expectedEligible=contract.parts.filter(part=>part.coverage?.dkssFamilyComplete===true);
  const expectedExcluded=contract.parts.filter(part=>part.coverage?.dkssFamilyComplete!==true);
  if(expectedEligible.length+expectedExcluded.length!==contract.eligiblePartCount)throw new Error('Statepopulation matcher ikke kontrakten');
  if(input.series?.length!==expectedEligible.length||input.excluded?.length!==expectedExcluded.length)throw new Error('Transient replay har forkert eligible/excluded-population');
  const excludedById=new Map(input.excluded.map(row=>[row.partId,row]));
  for(const part of expectedExcluded){
    const row=excludedById.get(part.partId);
    if(!row||row.zoneId!==part.zoneId||row.reason!=='MISSING_DKSS_CURRENT_FAMILY')throw new Error(`${part.partId} mangler fail-closed stateudelukkelse`);
  }
  const seenHistory=new Set(),seenSeries=new Set(),seenParts=new Set(),rows=[];
  for(const raw of input.series||[]){
    const part=contractParts.get(raw.partId),evidence=multiParts.get(raw.partId);
    if(!part||!evidence||part.coverage?.dkssFamilyComplete!==true||raw.zoneId!==part.zoneId||raw.seriesId!==part.seriesId||raw.historyKey!==part.historyKey)throw new Error(`${raw.partId} bryder national serie-/historikidentitet`);
    if(seenParts.has(raw.partId)||seenHistory.has(raw.historyKey)||seenSeries.has(raw.seriesId)||raw.historyKey===raw.zoneId||raw.seriesId===raw.zoneId)throw new Error(`${raw.partId} deler eller genbruger identitet`);
    seenParts.add(raw.partId);seenHistory.add(raw.historyKey);seenSeries.add(raw.seriesId);
    const allowedTimes=new Set(evidence.families?.dkss?.hours?.map(hour=>hour.time)||[]);
    const samples=(raw.hours||[]).map(hour=>{
      const u=finite(hour['current-u']),v=finite(hour['current-v']);
      if(u===null||v===null||!allowedTimes.has(hour.time))throw new Error(`${raw.partId} har ugyldigt replaytrin`);
      const toward=direction(u,v);
      return {at:hour.time,currentSpeedMps:Math.hypot(u,v),currentDirectionDeg:toward,currentAlignment:alignment(toward,Number(raw.onshoreDirectionDeg)),currentVerified:true};
    });
    if(samples.length<multi.minimumCompleteStepsPerAvailableFamily)throw new Error(`${raw.partId} har for få state-replaytrin`);
    const history=applyCurrentTransportToHistory({},samples);
    const zone={id:raw.partId,coastType:part.coastType,onshoreDirectionDeg:Number(raw.onshoreDirectionDeg)};
    const weather={windSpeedMps:7,windDirectionDeg:270,waveHeightM:.8,currentSpeedMps:.2,currentDirectionDeg:90,waterLevelTrendCm3h:0};
    const scoreNeutral=['waders','beach'].every(mode=>{
      const before=calculateRavScore({mode,zone,weather,history:{}}),after=calculateRavScore({mode,zone,weather,history});
      return before.score===after.score&&JSON.stringify(before.components)===JSON.stringify(after.components);
    });
    if(!scoreNeutral)throw new Error(`${raw.partId} ændrer numerisk score under privat state-replay`);
    rows.push({zoneId:raw.zoneId,partId:raw.partId,seriesId:raw.seriesId,historyKey:raw.historyKey,sampleCount:samples.length,
      firstSampleAt:samples[0]?.at??null,lastSampleAt:samples.at(-1)?.at??null,inputDigest:hash([raw.historyKey,raw.hours]),historyDigest:hash([raw.historyKey,history]),
      stateSummary:{stateModelMode:history.stateModelMode,activeCurrentRegime:history.activeCurrentRegime,activeCurrentRegimeDurationHours:history.activeCurrentRegimeDurationHours,verifiedCurrentCoverageHours:history.verifiedCurrentCoverageHours,unverifiedCurrentSampleCount:history.unverifiedCurrentSampleCount},
      parentHistoryReused:false,crossPartHistoryRead:false,stateEnabled:false,scoreEnabled:false,scoreInfluenceObserved:false,publicProjectionEnabled:false,adminWriteEnabled:false,automaticActivationAllowed:false});
  }
  if(rows.length!==expectedEligible.length||new Set(rows.map(row=>row.inputDigest)).size!==rows.length||new Set(rows.map(row=>row.historyDigest)).size!==rows.length)throw new Error('Statebeviset er ikke komplet og entydigt pr. historiknøgle');
  return {schemaVersion:'1.0.0',status:'passed-private-national-state-history-isolation',generatedAt:new Date().toISOString(),eligibleStatePartCount:rows.length,
    excludedMissingCurrentPartCount:expectedExcluded.length,excludedParts:expectedExcluded.map(part=>({zoneId:part.zoneId,partId:part.partId,reason:'MISSING_DKSS_CURRENT_FAMILY'})),
    parentRuntimeTruth:contract.parentRuntimeTruth,series:rows,separateHistoryKeysValidated:true,parentHistoryReuseDetected:false,crossPartHistoryReadDetected:false,
    rawReplayValuesStored:false,transientReplayInputDeleted:false,activationGatesRemaining:['national-shadow-score-validation','score-neutral-ui-review','central-admin-roundtrip-and-rollback','explicit-owner-go-no-go-before-score-or-production-activation'],
    productionGeometryChanged:false,adminDataChanged:false,weatherSamplingChanged:false,stateChanged:false,publicRuntimeChanged:false,scoreChanged:false,automaticActivationAllowed:false};
}

export function selfTest(){
  const parts=[
    {zoneId:'Z',partId:'a',seriesId:'Z::a',historyKey:'coastal-part::Z::a',coastType:'west',coverage:{dkssFamilyComplete:true}},
    {zoneId:'Z',partId:'b',seriesId:'Z::b',historyKey:'coastal-part::Z::b',coastType:'west',coverage:{dkssFamilyComplete:false}},
  ];
  const contract={status:'private-national-shadow-contract-ready',eligiblePartCount:2,parts,statePolicy:{enabled:false,parentHistoryReuseAllowed:false,separatePartHistoryRequired:true}};
  const times=['2026-08-10T00:00:00Z','2026-08-10T03:00:00Z'];
  const multi={status:'passed-private-national-multi-step-series-validation',minimumCompleteStepsPerAvailableFamily:2,series:[{partId:'a',families:{dkss:{hours:times.map(time=>({time}))}}},{partId:'b',families:{wave:{hours:times.map(time=>({time}))}}}]};
  const input={status:'private-transient-national-state-replay',series:[{...parts[0],onshoreDirectionDeg:90,hours:times.map((time,i)=>({time,'current-u':.1+i/100,'current-v':.2}))}],excluded:[{zoneId:'Z',partId:'b',reason:'MISSING_DKSS_CURRENT_FAMILY'}]};
  const result=buildNationalStateHistoryReport(contract,multi,input);
  if(result.status!=='passed-private-national-state-history-isolation'||result.eligibleStatePartCount!==1||result.excludedMissingCurrentPartCount!==1||result.series.some(row=>row.scoreInfluenceObserved))throw new Error('Gyldig national state-isolation blev afvist');
  const broken=structuredClone(input);broken.excluded=[];
  try{buildNationalStateHistoryReport(contract,multi,broken);throw new Error('Manglende stateudelukkelse blev accepteret');}catch(error){if(error.message==='Manglende stateudelukkelse blev accepteret')throw error;}
  console.log('National privat state-/historikisolation self-test: bestået');
}

async function main(){
  if(process.argv.includes('--self-test')){selfTest();return;}
  const args=process.argv.slice(2);const value=(flag,fallback)=>{const i=args.indexOf(flag);return i>=0?args[i+1]:fallback};
  const contractPath=value('--contract',DEFAULT_CONTRACT),seriesPath=value('--series',DEFAULT_SERIES),inputPath=value('--input',DEFAULT_INPUT),outputPath=value('--output',DEFAULT_OUTPUT);
  try{
    const [contract,multi,input]=await Promise.all([contractPath,seriesPath,inputPath].map(file=>fs.readFile(file,'utf8').then(JSON.parse)));
    const report=buildNationalStateHistoryReport(contract,multi,input);await fs.mkdir(path.dirname(outputPath),{recursive:true});
    await fs.writeFile(outputPath,JSON.stringify(report,null,2)+'\n','utf8');await fs.unlink(inputPath);report.transientReplayInputDeleted=true;
    await fs.writeFile(outputPath,JSON.stringify(report,null,2)+'\n','utf8');
    console.log(JSON.stringify({status:report.status,eligibleStatePartCount:report.eligibleStatePartCount,excludedMissingCurrentPartCount:report.excludedMissingCurrentPartCount,scoreChanged:false}));
  }finally{await fs.unlink(inputPath).catch(()=>{});}
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))main().catch(error=>{console.error(error.message);process.exit(1)});
