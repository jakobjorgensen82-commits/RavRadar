#!/usr/bin/env node
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyCurrentTransportToHistory } from './lib/current-transport-history.mjs';
import { calculateRavScore } from '../js/core/score-engine.js';

const DEFAULT_CONTRACT='.geometry-v2-work/blaavand-weather-shadow-contract.json';
const DEFAULT_SERIES='.geometry-v2-work/blaavand-multi-step-series-validation.json';
const DEFAULT_INPUT='.cache/blaavand-state-replay-input.json';
const DEFAULT_OUTPUT='.geometry-v2-work/blaavand-state-history-validation.json';
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,20);
const finite=value=>Number.isFinite(Number(value))?Number(value):null;
const clamp=(value,min=-1,max=1)=>Math.min(max,Math.max(min,value));
const direction=(u,v)=>(Math.atan2(u,v)*180/Math.PI+360)%360;
const alignment=(toward,onshore)=>clamp(Math.cos((toward-onshore)*Math.PI/180));

export function buildStateHistoryReport(contract,multi,input){
  if(contract?.status!=='private-shadow-contract-ready'||multi?.status!=='passed-private-multi-step-series-validation')throw new Error('Stategaten kræver bestået shadow-kontrakt og flertidsserie');
  if(contract?.statePolicy?.enabled!==false||contract?.statePolicy?.parentHistoryReuseAllowed!==false||contract?.statePolicy?.separatePartHistoryRequired!==true)throw new Error('Shadow-kontrakten tillader ikke sikker separat statevalidering');
  if(input?.zoneId!==contract.zoneId||multi?.zoneId!==contract.zoneId)throw new Error('Stateinput og kontrakt beskriver ikke samme zone');
  const contractParts=new Map(contract.parts.map(part=>[part.partId,part]));
  const multiParts=new Map(multi.series.map(part=>[part.partId,part]));
  if(contractParts.size!==2||multiParts.size!==2||input.series?.length!==2)throw new Error('Stategaten kræver præcis to kystdele');
  const seenHistory=new Set(),seenSeries=new Set();
  const rows=[];
  for(const raw of input.series){
    const part=contractParts.get(raw.partId),evidence=multiParts.get(raw.partId);
    if(!part||!evidence||raw.seriesId!==part.seriesId||raw.historyKey!==part.historyKey)throw new Error(`${raw.partId} bryder serie-/historikidentiteten`);
    if(raw.historyKey===contract.zoneId||raw.seriesId===contract.zoneId)throw new Error(`${raw.partId} genbruger parent-identitet`);
    if(seenHistory.has(raw.historyKey)||seenSeries.has(raw.seriesId))throw new Error('Kystdele deler serie- eller historiknøgle');
    seenHistory.add(raw.historyKey);seenSeries.add(raw.seriesId);
    const samples=(raw.hours||[]).map(hour=>{
      const u=finite(hour['current-u']),v=finite(hour['current-v']);
      if(u===null||v===null||!multi.sharedCompleteNativeTimes.includes(hour.time))throw new Error(`${raw.partId} har ugyldigt replaytrin`);
      const toward=direction(u,v);
      return {at:hour.time,currentSpeedMps:Math.hypot(u,v),currentDirectionDeg:toward,currentAlignment:alignment(toward,Number(raw.onshoreDirectionDeg)),currentVerified:true};
    });
    if(samples.length<multi.minimumCompleteSteps)throw new Error(`${raw.partId} har for få state-replaytrin`);
    const history=applyCurrentTransportToHistory({},samples);
    const zone={id:raw.partId,coastType:'west',onshoreDirectionDeg:Number(raw.onshoreDirectionDeg)};
    const weather={windSpeedMps:7,windDirectionDeg:270,waveHeightM:.8,currentSpeedMps:.2,currentDirectionDeg:90,waterLevelTrendCm3h:0};
    const scoreNeutral=['waders','beach'].every(mode=>{
      const before=calculateRavScore({mode,zone,weather,history:{}}),after=calculateRavScore({mode,zone,weather,history});
      return before.score===after.score&&JSON.stringify(before.components)===JSON.stringify(after.components);
    });
    if(!scoreNeutral)throw new Error(`${raw.partId} ændrer numerisk score under privat state-replay`);
    rows.push({partId:raw.partId,seriesId:raw.seriesId,historyKey:raw.historyKey,sampleCount:samples.length,
      firstSampleAt:samples[0]?.at??null,lastSampleAt:samples.at(-1)?.at??null,inputDigest:hash([raw.historyKey,raw.hours]),
      historyDigest:hash([raw.historyKey,history]),stateSummary:{stateModelMode:history.stateModelMode,
        activeCurrentRegime:history.activeCurrentRegime,activeCurrentRegimeDurationHours:history.activeCurrentRegimeDurationHours,
        verifiedCurrentCoverageHours:history.verifiedCurrentCoverageHours,unverifiedCurrentSampleCount:history.unverifiedCurrentSampleCount},
      parentHistoryReused:false,crossPartHistoryRead:false,stateEnabled:false,scoreEnabled:false,scoreInfluenceObserved:false,
      publicProjectionEnabled:false,adminWriteEnabled:false,automaticActivationAllowed:false});
  }
  if(new Set(rows.map(row=>row.inputDigest)).size!==2||new Set(rows.map(row=>row.historyDigest)).size!==2)throw new Error('Statebeviset er ikke entydigt pr. historiknøgle');
  return {schemaVersion:'1.0.0',status:'passed-private-state-history-isolation',generatedAt:new Date().toISOString(),zoneId:contract.zoneId,
    parentRuntimeTruth:contract.parentRuntimeTruth,series:rows,separateHistoryKeysValidated:true,parentHistoryReuseDetected:false,
    crossPartHistoryReadDetected:false,rawReplayValuesStored:false,transientReplayInputDeleted:false,
    activationGatesRemaining:['score-neutral-ui-review','central-admin-roundtrip-and-rollback','explicit-owner-go-no-go-before-any-score-or-production-activation'],
    productionGeometryChanged:false,adminDataChanged:false,weatherSamplingChanged:false,stateChanged:false,publicRuntimeChanged:false,
    scoreChanged:false,automaticActivationAllowed:false};
}

export function selfTest(){
  const parts=['north','southeast'].map((partId,index)=>({partId,seriesId:`Z::${partId}`,historyKey:`coastal-part::Z::${partId}`,onshoreDirectionDeg:index?20:110}));
  const contract={status:'private-shadow-contract-ready',zoneId:'Z',parts,statePolicy:{enabled:false,parentHistoryReuseAllowed:false,separatePartHistoryRequired:true},parentRuntimeTruth:{seriesId:'Z',remainsAuthoritative:true}};
  const multi={status:'passed-private-multi-step-series-validation',zoneId:'Z',minimumCompleteSteps:2,sharedCompleteNativeTimes:['2026-08-09T03:00:00Z','2026-08-09T06:00:00Z'],series:parts};
  const input={zoneId:'Z',series:parts.map((part,index)=>({...part,hours:multi.sharedCompleteNativeTimes.map((time,i)=>({time,'current-u':index?-.1:.2+i/100,'current-v':index?.2:.1}))}))};
  const result=buildStateHistoryReport(contract,multi,input);
  if(result.status!=='passed-private-state-history-isolation'||!result.separateHistoryKeysValidated||result.series.some(row=>row.scoreInfluenceObserved))throw new Error('Gyldig state-isolation blev afvist');
  const broken=structuredClone(input);broken.series[1].historyKey=broken.series[0].historyKey;
  try{buildStateHistoryReport(contract,multi,broken);throw new Error('Delt historiknøgle blev accepteret');}catch(error){if(error.message==='Delt historiknøgle blev accepteret')throw error;}
  console.log('Blåvand privat state-/historikisolation self-test: bestået');
}

async function main(){
  if(process.argv.includes('--self-test')){selfTest();return;}
  const args=process.argv.slice(2);const value=(flag,fallback)=>{const i=args.indexOf(flag);return i>=0?args[i+1]:fallback};
  const contractPath=value('--contract',DEFAULT_CONTRACT),seriesPath=value('--series',DEFAULT_SERIES),inputPath=value('--input',DEFAULT_INPUT),outputPath=value('--output',DEFAULT_OUTPUT);
  try{
    const [contract,multi,input]=await Promise.all([contractPath,seriesPath,inputPath].map(path=>fs.readFile(path,'utf8').then(JSON.parse)));
    const report=buildStateHistoryReport(contract,multi,input);await fs.mkdir(path.dirname(outputPath),{recursive:true});
    await fs.writeFile(outputPath,JSON.stringify(report,null,2)+'\n','utf8');await fs.unlink(inputPath);report.transientReplayInputDeleted=true;
    await fs.writeFile(outputPath,JSON.stringify(report,null,2)+'\n','utf8');
    console.log(JSON.stringify({status:report.status,seriesCount:report.series.length,separateHistoryKeysValidated:true,scoreChanged:false}));
  }finally{await fs.unlink(inputPath).catch(()=>{});}
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))main().catch(error=>{console.error(error.message);process.exit(1)});
