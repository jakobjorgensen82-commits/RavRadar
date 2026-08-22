#!/usr/bin/env node
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateRavScore } from '../js/core/score-engine.js';
import { evaluateRules } from '../js/core/rule-engine.js';
import { evaluatePhaseDWaveProcessCandidate } from '../js/core/phase-d-wave-process-candidate.js';
import { evaluateRavScoreCandidateG } from '../js/core/ravscore-candidate-g.js';
import { buildBlendedRegimeMemory, normalizeMemoryTrackCausally, signedDirectionalForce } from '../js/core/ravscore-regime-memory.js';
import { SCORE_MODEL_IDS } from '../js/core/score-candidates.js';
import { applyCurrentTransportToHistory } from './lib/current-transport-history.mjs';

const DEFAULTS={contract:'.geometry-v2-work/national-weather-shadow-contract.json',multi:'.geometry-v2-work/national-multi-step-series-validation.json',state:'.geometry-v2-work/national-state-history-validation.json',wind:'.geometry-v2-work/national-local-part-wind-series.json',marineInput:'.cache/national-shadow-score-marine-input.json',windInput:'.cache/national-shadow-score-wind-input.json',output:'.geometry-v2-work/national-shadow-score-validation.json'};
const finite=value=>Number.isFinite(Number(value))?Number(value):null;
const norm=value=>(Number(value)%360+360)%360;
const toward=(u,v)=>norm(Math.atan2(Number(u),Number(v))*180/Math.PI);
const windFrom=(u,v)=>norm(toward(u,v)+180);
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,20);
const round=(value,digits=2)=>Number(Number(value).toFixed(digits));
const hours=milliseconds=>milliseconds/3600000;
const candidateGTracks={candidateG24:{variantId:'G-24H-LIN',activeWeight:1},candidateG5050:{variantId:'G-50-50-LIN',activeWeight:.5},candidateG48:{variantId:'G-48H-LIN',activeWeight:0}};

function directionalAlignment(towardDirection,onshoreDirection){
  return Math.cos((Number(towardDirection)-Number(onshoreDirection))*Math.PI/180);
}

function candidateGMemoryByTime(marineHours,localWind,part){
  const samples=marineHours.map(hour=>{
    const wind=localWind.get(hour.time),cu=finite(hour['current-u']),cv=finite(hour['current-v']),wu=finite(wind?.['wind-u-10m']),wv=finite(wind?.['wind-v-10m']),waveHeight=finite(hour['significant-wave-height']),wavePeriod=finite(hour['dominant-wave-period']),waveFrom=finite(hour['mean-wave-dir']);
    if([cu,cv,wu,wv,waveHeight,wavePeriod,waveFrom].some(value=>value===null))return null;
    const onshore=Number(part.onshoreDirectionDeg);
    return {time:hour.time,currentForce:signedDirectionalForce({magnitude:Math.hypot(cu,cv),alignment:directionalAlignment(toward(cu,cv),onshore)}),waveForce:signedDirectionalForce({magnitude:Math.max(0,waveHeight)**2*Math.max(0,wavePeriod),alignment:directionalAlignment(norm(waveFrom+180),onshore)}),windForce:signedDirectionalForce({magnitude:Math.hypot(wu,wv),alignment:directionalAlignment(toward(wu,wv),onshore)})};
  }).filter(Boolean).sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));
  const result={};
  for(const [key,track] of Object.entries(candidateGTracks)){
    const normalized=(force,scale)=>normalizeMemoryTrackCausally(buildBlendedRegimeMemory(samples,{activeHalfLifeHours:24,backgroundHalfLifeHours:48,activeWeight:track.activeWeight,getTime:sample=>sample.time,getForce:sample=>sample[force]}),{initialScale:scale,minimumScale:scale});
    const current=normalized('currentForce',.3),wave=normalized('waveForce',7),directWind=normalized('windForce',8);
    result[key]=new Map(samples.map((sample,index)=>[sample.time,{current:current[index].boundedState,wave:wave[index].boundedState,directWind:directWind[index].boundedState}]));
  }
  return result;
}

function currentRegime(weather,zone){
  const direction=finite(weather?.currentDirectionDeg),onshore=finite(zone?.onshoreDirectionDeg);
  if(direction===null||onshore===null)return 'unknown';
  const alignment=Math.cos((direction-onshore)*Math.PI/180);
  return alignment>=.35?'onshore-delivery':alignment<=-.35?'offshore-removal':'alongshore-passage';
}

function cadenceHours(samples){
  const gaps=samples.slice(1).map((sample,index)=>hours(Date.parse(sample.at)-Date.parse(samples[index].at))).filter(value=>value>0&&value<=12).sort((a,b)=>a-b);
  return gaps.length?gaps[Math.floor(gaps.length/2)]:3;
}

function lastContiguousShadowEvent(samples,predicate){
  let end=-1;for(let index=samples.length-1;index>=0;index-=1)if(predicate(samples[index])){end=index;break;}
  if(end<0)return null;
  const cadence=cadenceHours(samples),maximumGap=cadence*1.5;let start=end;
  while(start>0&&predicate(samples[start-1])&&hours(Date.parse(samples[start].at)-Date.parse(samples[start-1].at))<=maximumGap)start-=1;
  return {endAt:samples[end].at,durationHours:round(Math.max(cadence,hours(Date.parse(samples[end].at)-Date.parse(samples[start].at))+cadence),1)};
}

function buildShadowHistory(marineHours,localWind,currentSamples,at){
  const target=Date.parse(at),start=target-24*3600000;
  const samples=marineHours.filter(hour=>{const time=Date.parse(hour.time);return time>=start&&time<=target;}).map(hour=>{
    const wind=localWind.get(hour.time),wu=finite(wind?.['wind-u-10m']),wv=finite(wind?.['wind-v-10m']);
    return {at:hour.time,windSpeedMps:wu===null||wv===null?null:Math.hypot(wu,wv),waveHeightM:finite(hour['significant-wave-height'])};
  }).filter(sample=>sample.windSpeedMps!==null||sample.waveHeightM!==null).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
  const winds=samples.map(sample=>sample.windSpeedMps).filter(Number.isFinite),waves=samples.map(sample=>sample.waveHeightM).filter(Number.isFinite);
  const high=samples.filter(sample=>(sample.windSpeedMps??0)>=9||(sample.waveHeightM??0)>=1.2).at(-1);
  const strong=lastContiguousShadowEvent(samples,sample=>(sample.windSpeedMps??0)>=14||(sample.waveHeightM??0)>=1.5);
  const mobilisationPotential=Math.max(0,Math.min(100,
    (winds.length?Math.min(55,Math.max(...winds)/14*55):0)+
    (waves.length?Math.min(35,Math.max(...waves)/1.5*35):0)+
    (strong?Math.min(10,strong.durationHours*2):0)));
  const base={
    maxWind24hMps:winds.length?round(Math.max(...winds),1):null,
    maxWave24hM:waves.length?round(Math.max(...waves),2):null,
    hoursSinceHighEnergy:high?round(hours(target-Date.parse(high.at)),1):null,
    strongEventDurationHours:strong?.durationHours??null,
    hoursSinceStrongEventEnd:strong?round(hours(target-Date.parse(strong.endAt)),1):null,
    mobilisationPotential:round(mobilisationPotential,1),
    shadowEventHistoryCadenceHours:round(cadenceHours(samples),1),
  };
  const currentWindow=currentSamples.filter(sample=>{const time=Date.parse(sample.at);return time<=target&&time>=target-72*3600000;});
  return applyCurrentTransportToHistory(base,currentWindow);
}

function summarizeDeltas(rows,from,to){
  const values=rows.filter(row=>Number.isFinite(row[from])&&Number.isFinite(row[to])).map(row=>row[to]-row[from]);
  if(!values.length)return {count:0,meanDelta:null,minimumDelta:null,maximumDelta:null,raisedCount:0,loweredCount:0,unchangedCount:0};
  return {count:values.length,meanDelta:round(values.reduce((sum,value)=>sum+value,0)/values.length),minimumDelta:Math.min(...values),maximumDelta:Math.max(...values),raisedCount:values.filter(value=>value>0).length,loweredCount:values.filter(value=>value<0).length,unchangedCount:values.filter(value=>value===0).length};
}

function buildCandidateShadow(partRows,contract){
  const rows=partRows.flatMap(part=>part.snapshots.flatMap(snapshot=>Object.entries(snapshot.modes).map(([mode,result])=>({zoneId:part.zoneId,partId:part.partId,time:snapshot.time,mode,currentRegime:result.currentRegime,active:result.score,activeFinal:result.finalScore,activeRuleCount:result.activeRuleCount,activeRuleMatchCount:result.activeRuleMatchCount,candidateGRuleMatchCount:result.candidateGRuleMatchCount,noDirectRuleMatchCount:result.noDirectRuleMatchCount,wadersLimitRuleMatchCount:result.wadersLimitRuleMatchCount,...result.shadowCandidates}))));
  const byMode=Object.fromEntries(['waders','beach'].map(mode=>{const selected=rows.filter(row=>row.mode===mode);return [mode,{activeToA:summarizeDeltas(selected,'active','candidateA'),activeToB:summarizeDeltas(selected,'active','candidateB'),activeToC:summarizeDeltas(selected,'active','candidateC'),activeToD:summarizeDeltas(selected,'active','candidateD'),activeToE:summarizeDeltas(selected,'active','candidateE'),activeToG24:summarizeDeltas(selected,'active','candidateG24'),activeToG5050:summarizeDeltas(selected,'active','candidateG5050'),activeToG48:summarizeDeltas(selected,'active','candidateG48'),activeFinalToG5050Final:summarizeDeltas(selected,'activeFinal','candidateG5050Final'),activeFinalToGNoDirectWindFinal:summarizeDeltas(selected,'activeFinal','candidateGNoDirectWindFinal'),activeFinalToGWadersLimitFinal:summarizeDeltas(selected,'activeFinal','candidateGWadersLimitFinal'),g5050BaseToFinal:summarizeDeltas(selected,'candidateG5050','candidateG5050Final'),noDirectBaseToFinal:summarizeDeltas(selected,'candidateGNoDirectWind','candidateGNoDirectWindFinal'),wadersLimitBaseToFinal:summarizeDeltas(selected,'candidateGWadersLimit','candidateGWadersLimitFinal'),noDirectToWadersLimit:summarizeDeltas(selected,'candidateGNoDirectWind','candidateGWadersLimit'),eToG5050:summarizeDeltas(selected,'candidateE','candidateG5050'),g24ToG48:summarizeDeltas(selected,'candidateG24','candidateG48'),noDirectToG5050:summarizeDeltas(selected,'candidateGNoDirectWind','candidateG5050'),aToB:summarizeDeltas(selected,'candidateA','candidateB'),bToC:summarizeDeltas(selected,'candidateB','candidateC'),cToD:summarizeDeltas(selected,'candidateC','candidateD'),dToE:summarizeDeltas(selected,'candidateD','candidateE')}];}));
  const deliveryDirectionAudit=Object.fromEntries(['onshore-delivery','alongshore-passage','offshore-removal','unknown'].map(regime=>{const selected=rows.filter(row=>row.currentRegime===regime);return [regime,{candidateBMinusA:summarizeDeltas(selected,'candidateA','candidateB'),candidateDMinusA:summarizeDeltas(selected,'candidateA','candidateD'),candidateEMinusD:summarizeDeltas(selected,'candidateD','candidateE'),candidateG5050MinusE:summarizeDeltas(selected,'candidateE','candidateG5050'),candidateG5050MinusNoDirectWind:summarizeDeltas(selected,'candidateGNoDirectWind','candidateG5050')}];}));
  const candidateIds=['candidateA','candidateB','candidateC','candidateD','candidateE','candidateG24','candidateG5050','candidateG48','candidateGNoDirectWind','candidateGWadersLimit','candidateG5050Final','candidateGNoDirectWindFinal','candidateGWadersLimitFinal'];
  const extremes=rows.flatMap(row=>candidateIds.filter(candidate=>Number.isFinite(row[candidate])).map(candidate=>({...row,candidate,delta:row[candidate]-row.active,candidateScore:row[candidate]}))).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)||a.partId.localeCompare(b.partId)).slice(0,5).map(row=>({zoneId:row.zoneId,partId:row.partId,time:row.time,mode:row.mode,currentRegime:row.currentRegime,candidate:row.candidate,activeScore:row.active,candidateScore:row.candidateScore,delta:row.delta}));
  const retentionFeatureContextCount=partRows.reduce((sum,part)=>sum+(part.retentionFeaturesAvailable?part.snapshots.length*2:0),0);
  const activeRuleCount=rows[0]?.activeRuleCount??0;
  const scoredPartIds=new Set(partRows.map(part=>part.partId));
  const unscoredParts=(contract.parts||[]).filter(part=>!scoredPartIds.has(part.partId));
  const completeRetentionPartCount=partRows.filter(part=>part.retentionFeaturesAvailable).length;
  const fullNativeFamilyPartCount=Number(contract.fullCoveragePartCount??partRows.length);
  const scoreInputCoverageReady=contract.eligiblePartCount>0&&partRows.length===contract.eligiblePartCount&&fullNativeFamilyPartCount===contract.eligiblePartCount;
  const nationalCoverageGate={
    eligiblePartCount:contract.eligiblePartCount,
    scoredPartCount:partRows.length,
    unscoredPartCount:Math.max(0,Number(contract.eligiblePartCount)-partRows.length),
    scoredPartCoverage:contract.eligiblePartCount?round(partRows.length/contract.eligiblePartCount,3):0,
    fullNativeFamilyPartCount,
    partialNativeFamilyPartCount:Number(contract.partialCoveragePartCount??unscoredParts.length),
    unscoredMissingWaveFamilyPartCount:unscoredParts.filter(part=>part.coverage?.waveFamilyComplete!==true).length,
    unscoredMissingDkssFamilyPartCount:unscoredParts.filter(part=>part.coverage?.dkssFamilyComplete!==true).length,
    completeLocalRetentionFeaturePartCount:completeRetentionPartCount,
    completeLocalRetentionFeatureCoverage:partRows.length?round(completeRetentionPartCount/partRows.length,3):0,
    parentZoneMorphologyAcceptedAsLocalPartEvidence:false,
    scoreInputCoverageReady,
    staticLocalRetentionModelIncluded:false,
    staticLocalRetentionScoreImpact:false,
    localRetentionFeatureEvidenceRequiredForActivation:false,
    activationCoverageReady:scoreInputCoverageReady,
  };
  const limitations=[
    ...(scoreInputCoverageReady?[]:['NATIONAL_CONTRACT_HAS_INCOMPLETE_SCORE_INPUT_COVERAGE']),
    'CANDIDATE_G_REMAINS_RESEARCH_ONLY_WITHOUT_FIND_OUTCOME_CALIBRATION',
  ];
  const retentionFeatureDiagnostic={status:partRows.length>0&&completeRetentionPartCount===partRows.length?'available-but-excluded':'incomplete-and-not-required',staticLocalFeatureModelIncluded:false,staticLocalFeatureScoreImpact:false,featureEvidenceRequiredForActivation:false,parentZoneMorphologyAcceptedAsLocalPartEvidence:false};
  return {status:'private-score-neutral-ravscore-candidate-shadow',modelIds:SCORE_MODEL_IDS,contextCount:rows.length,retentionFeatureContextCount,retentionFeatureCoverage:rows.length?round(retentionFeatureContextCount/rows.length,3):0,retentionFeatureDiagnostic,nationalCoverageGate,limitations,byMode,deliveryDirectionAudit,extremes,centralRuleChain:{activeRuleCount,activeMatchedContextCount:rows.filter(row=>row.activeRuleMatchCount>0).length,candidateGMatchedContextCount:rows.filter(row=>row.candidateGRuleMatchCount>0).length,noDirectMatchedContextCount:rows.filter(row=>row.noDirectRuleMatchCount>0).length,wadersLimitMatchedContextCount:rows.filter(row=>row.wadersLimitRuleMatchCount>0).length,blockedActiveFinalCount:rows.filter(row=>row.activeFinal===null).length,blockedCandidateGFinalCount:rows.filter(row=>row.candidateG5050Final===null).length,blockedNoDirectFinalCount:rows.filter(row=>row.candidateGNoDirectWindFinal===null).length,blockedWadersLimitFinalCount:rows.filter(row=>row.candidateGWadersLimitFinal===null).length,ruleSource:'versioned-rule-files-at-validator-runtime',wadersHuntabilityLimitAppliedAfterRules:true},eventHistory:{windowHours:24,currentWindowHours:72,samplingAwareStrongEventDuration:true,candidateGTracks:['24h','24h-48h-50-50','48h'],candidateGNoDirectWindControl:true,candidateGWadersLimitControl:true},rawWeatherValuesStored:false,scoreChanged:false,publicRuntimeChanged:false,automaticActivationAllowed:false};
}

function validateInputs(contract,multi,state,wind,marineInput,windInput){
  if(contract?.status!=='private-national-shadow-contract-ready'||multi?.status!=='passed-private-national-multi-step-series-validation'||state?.status!=='passed-private-national-state-history-isolation'||wind?.status!=='passed-private-national-native-wind-series-validation')throw new Error('Shadow-score kræver fire beståede nationale forgates');
  if(marineInput?.status!=='private-transient-national-shadow-score-marine-input'||windInput?.status!=='private-transient-national-shadow-score-wind-input')throw new Error('Shadow-score mangler transient native input');
  for(const report of [multi,state,wind])for(const flag of ['productionGeometryChanged','adminDataChanged','publicRuntimeChanged','scoreChanged','automaticActivationAllowed'])if(report[flag]!==false)throw new Error(`Forgate tillader mutation: ${flag}`);
}

export function buildNationalShadowScoreReport(contract,multi,state,wind,marineInput,windInput,publicRules=[]){
  validateInputs(contract,multi,state,wind,marineInput,windInput);
  const activeRules=publicRules.filter(rule=>rule.status==='active');
  const contractById=new Map(contract.parts.map(part=>[part.partId,part]));
  const windById=new Map(windInput.series.map(row=>[row.partId,new Map(row.hours.map(hour=>[hour.time,hour]))]));
  const partRows=[];
  for(const marine of marineInput.series){
    const part=contractById.get(marine.partId),localWind=windById.get(marine.partId);
    if(!part||marine.zoneId!==part.zoneId||marine.seriesId!==part.seriesId||!localWind)continue;
    const marineByTime=new Map(marine.hours.map(hour=>[Date.parse(hour.time),hour]));
    const candidateGMemory=candidateGMemoryByTime(marine.hours,localWind,part);
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
      const history=buildShadowHistory(marine.hours,localWind,currentSamples,hour.time);
      const zone={...part,id:part.partId,name:part.partName??part.name??part.partId,onshoreDirectionDeg:Number(part.onshoreDirectionDeg)};
      const modes={};
      for(const mode of ['waders','beach']){
        const result=calculateRavScore({mode,zone,weather,history});
        if(!result.available||!Number.isFinite(result.score))throw new Error(`${part.partId}/${hour.time}/${mode} gav ikke gyldig RavScore`);
        const shadow=evaluatePhaseDWaveProcessCandidate({mode,zone,weather,history});
        if(!shadow.available||!Object.values(shadow.candidateScores||{}).every(Number.isFinite))throw new Error(`${part.partId}/${hour.time}/${mode} gav ikke gyldige RavScore-kandidater`);
        const candidateGResults=Object.fromEntries(Object.entries(candidateGTracks).map(([key,track])=>{
          const memory=candidateGMemory[key].get(hour.time);if(!memory)throw new Error(`${part.partId}/${hour.time}/${mode} mangler Candidate G memory`);
          const candidate=evaluateRavScoreCandidateG({mode,zone,weather,history},{variantId:track.variantId,memory});
          if(!candidate.available||!Number.isFinite(candidate.score))throw new Error(`${part.partId}/${hour.time}/${mode} gav ikke gyldig Candidate G`);
          return [key,candidate.score];
        }));
        const noDirect=evaluateRavScoreCandidateG({mode,zone,weather,history},{variantId:'G-50-50-NO-DIRECT-WIND',memory:candidateGMemory.candidateG5050.get(hour.time)});
        const wadersLimit=evaluateRavScoreCandidateG({mode,zone,weather,history},{variantId:'G-50-50-NO-DIRECT-WIND-WADERS-LIMIT',memory:candidateGMemory.candidateG5050.get(hour.time)});
        const activeFinal=evaluateRules({rules:activeRules,zone,mode,weather,history,baseScore:result.score});
        const candidateGFinal=evaluateRules({rules:activeRules,zone,mode,weather,history,baseScore:candidateGResults.candidateG5050});
        const noDirectFinal=evaluateRules({rules:activeRules,zone,mode,weather,history,baseScore:noDirect.score});
        const wadersLimitRuleResult=evaluateRules({rules:activeRules,zone,mode,weather,history,baseScore:wadersLimit.score});
        const wadersLimitFinal=mode==='waders'&&wadersLimitRuleResult.score!==null?Math.min(wadersLimitRuleResult.score,wadersLimit.components.huntability):wadersLimitRuleResult.score;
        modes[mode]={score:result.score,finalScore:activeFinal.score,activeRuleCount:activeRules.length,activeRuleMatchCount:activeFinal.matches.length,candidateGRuleMatchCount:candidateGFinal.matches.length,noDirectRuleMatchCount:noDirectFinal.matches.length,wadersLimitRuleMatchCount:wadersLimitRuleResult.matches.length,components:result.components,contributions:result.explanation?.contributions,dominantPathway:result.explanation?.mobilisationDiagnostics?.dominantPathway??null,currentRegime:currentRegime(weather,zone),shadowCandidates:{...shadow.candidateScores,...candidateGResults,candidateGNoDirectWind:noDirect.score,candidateGWadersLimit:wadersLimit.score,candidateGWadersLimitHuntability:wadersLimit.components.huntability,candidateG5050Final:candidateGFinal.score,candidateGNoDirectWindFinal:noDirectFinal.score,candidateGWadersLimitFinal:wadersLimitFinal}};
      }
      snapshots.push({time:hour.time,inputDigest:digest([part.seriesId,hour.time,weather,history]),modes,stateModelMode:history.stateModelMode??'shadow-v2'});
    }
    if(snapshots.length)partRows.push({zoneId:part.zoneId,partId:part.partId,partName:part.partName??part.name??part.partId,seriesId:part.seriesId,retentionFeaturesAvailable:['reefs','shallowWater','seagrass'].every(key=>typeof part[key]==='boolean'),snapshots});
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
  return {schemaVersion:'1.4.0',status:'passed-private-national-shadow-score-validation',generatedAt:new Date().toISOString(),marginPoints:7,eligiblePartCount:contract.eligiblePartCount,scoredPartCount:partRows.length,unscoredPartCount:contract.eligiblePartCount-partRows.length,blockedPartCount:contract.blockedPartCount,zoneCount:zones.length,coverageStatusCounts:Object.fromEntries(['whole-zone','only-part','several-parts','uncertain'].map(status=>[status,evaluationRows.filter(row=>row.status===status).length])),candidateShadow:buildCandidateShadow(partRows,contract),parts:partRows,zones,parentRuntimeTruth:contract.parentRuntimeTruth,rawWeatherValuesStored:false,transientInputsDeleted:false,parentFallbackDetected:false,interpolationDetected:false,crossPartMergeDetected:false,scoreEnabled:false,productionGeometryChanged:false,adminDataChanged:false,weatherSamplingChanged:false,stateChanged:false,publicRuntimeChanged:false,scoreChanged:false,automaticActivationAllowed:false,activationGatesRemaining:['candidate-national-score-input-coverage','candidate-waders-rule-order-public-product-review','candidate-arrow-history-public-product-review','candidate-extreme-review','score-neutral-ui-review','central-admin-roundtrip-and-rollback','explicit-owner-go-no-go-before-score-or-production-activation']};
}

export function selfTest(){
  const times=['2026-08-10T00:00:00.000Z','2026-08-10T03:00:00.000Z'];
  const parts=['a','b'].map((partId,i)=>({zoneId:'Z',partId,partName:partId,seriesId:`Z::${partId}`,historyKey:`h::${partId}`,coastType:'west',onshoreDirectionDeg:90}));
  const contract={status:'private-national-shadow-contract-ready',eligiblePartCount:2,fullCoveragePartCount:2,blockedPartCount:0,blockedParts:[],parts,parentRuntimeTruth:'parent'};
  const clean={productionGeometryChanged:false,adminDataChanged:false,publicRuntimeChanged:false,scoreChanged:false,automaticActivationAllowed:false};
  const multi={status:'passed-private-national-multi-step-series-validation',...clean},state={status:'passed-private-national-state-history-isolation',...clean},wind={status:'passed-private-national-native-wind-series-validation',...clean};
  const marineInput={status:'private-transient-national-shadow-score-marine-input',series:parts.map((p,i)=>({...p,hours:times.map((time,j)=>({time,'significant-wave-height':.4+i*.02,'mean-wave-dir':270,'dominant-wave-period':5,'sea-mean-deviation':.1+j*.01,'current-u':.2,'current-v':.1}))})),excluded:[]};
  const windInput={status:'private-transient-national-shadow-score-wind-input',series:parts.map(p=>({...p,hours:[{time:times[0],'wind-u-10m':-4,'wind-v-10m':0}]})),excluded:[]};
  const publicRules=[{id:'self-test-central-rule',status:'active',kind:'bonus',priority:1,geography:{scope:'national'},conditions:{},effect:{scoreAdjustment:2,explanation:'self-test'}}];
  const report=buildNationalShadowScoreReport(contract,multi,state,wind,marineInput,windInput,publicRules);
  if(report.status!=='passed-private-national-shadow-score-validation'||report.scoredPartCount!==2||report.zones.length!==1||report.zones[0].evaluations.length!==2||report.rawWeatherValuesStored)throw new Error('Gyldig shadow-score blev afvist');
  if(report.candidateShadow?.status!=='private-score-neutral-ravscore-candidate-shadow'||report.candidateShadow.contextCount!==4||report.candidateShadow.rawWeatherValuesStored||report.candidateShadow.scoreChanged||report.candidateShadow.automaticActivationAllowed)throw new Error('Kandidat-shadow mangler eller kan aktivere score');
  if(report.candidateShadow.retentionFeatureCoverage!==0||report.candidateShadow.retentionFeatureDiagnostic.status!=='incomplete-and-not-required'||report.candidateShadow.retentionFeatureDiagnostic.staticLocalFeatureModelIncluded||report.candidateShadow.retentionFeatureDiagnostic.staticLocalFeatureScoreImpact||report.candidateShadow.retentionFeatureDiagnostic.featureEvidenceRequiredForActivation)throw new Error('Kandidat-shadow blander udeladt statisk fastholdelse ind i aktiveringscoverage');
  if(report.candidateShadow.nationalCoverageGate.eligiblePartCount!==2||report.candidateShadow.nationalCoverageGate.scoredPartCount!==2||report.candidateShadow.nationalCoverageGate.completeLocalRetentionFeaturePartCount!==0||!report.candidateShadow.nationalCoverageGate.scoreInputCoverageReady||!report.candidateShadow.nationalCoverageGate.activationCoverageReady)throw new Error('Kandidat-shadow sammenblander scoreinputcoverage og udeladt statisk fastholdelse');
  const partialCoverage=buildCandidateShadow(report.parts,{...contract,eligiblePartCount:3,fullCoveragePartCount:2,partialCoveragePartCount:1,parts:[...parts,{zoneId:'Z',partId:'c',coverage:{waveFamilyComplete:false,dkssFamilyComplete:false}}]});
  if(partialCoverage.nationalCoverageGate.unscoredPartCount!==1||partialCoverage.nationalCoverageGate.partialNativeFamilyPartCount!==1||partialCoverage.nationalCoverageGate.unscoredMissingWaveFamilyPartCount!==1||partialCoverage.nationalCoverageGate.unscoredMissingDkssFamilyPartCount!==1||partialCoverage.nationalCoverageGate.activationCoverageReady||!partialCoverage.limitations.includes('NATIONAL_CONTRACT_HAS_INCOMPLETE_SCORE_INPUT_COVERAGE'))throw new Error('Kandidat-shadow skjuler delvis national inputcoverage');
  if(!report.candidateShadow.modelIds?.candidateA||!report.candidateShadow.modelIds?.candidateD||!report.candidateShadow.modelIds?.candidateG5050||!report.candidateShadow.modelIds?.candidateGWadersLimit||!Object.values(report.parts[0].snapshots[0].modes.waders.shadowCandidates).every(Number.isFinite))throw new Error('Kandidat-shadow mangler stabile modeller eller scorer');
  if(report.candidateShadow.byMode.waders.activeToG5050.count!==2||report.candidateShadow.byMode.beach.noDirectToG5050.count!==2)throw new Error('Candidate G national shadow mangler tracks eller no-direct-wind kontrol');
  if(report.candidateShadow.centralRuleChain.activeRuleCount!==1||report.candidateShadow.centralRuleChain.activeMatchedContextCount!==4||report.candidateShadow.centralRuleChain.candidateGMatchedContextCount!==4||report.candidateShadow.byMode.waders.g5050BaseToFinal.meanDelta!==2)throw new Error('Candidate G national shadow afspiller ikke den centrale slutregelkaede');
  if(report.candidateShadow.centralRuleChain.wadersLimitMatchedContextCount!==4||!report.candidateShadow.centralRuleChain.wadersHuntabilityLimitAppliedAfterRules)throw new Error('Waders-varianten afspiller ikke regler og jagtbarhedsloft i den dokumenterede rækkefølge');
  for(const part of report.parts)for(const snapshot of part.snapshots){const waders=snapshot.modes.waders.shadowCandidates,beach=snapshot.modes.beach.shadowCandidates;if(waders.candidateGWadersLimitFinal>waders.candidateGWadersLimitHuntability)throw new Error('Waders-slutscore overstiger jagtbarheden');if(beach.candidateGWadersLimit!==beach.candidateGNoDirectWind)throw new Error('Waders-varianten ændrer strandscore');}
  if(report.candidateShadow.deliveryDirectionAudit['onshore-delivery'].candidateDMinusA.count!==4)throw new Error('Retningsaudit dækkede ikke alle score-contexts');
  const broken=structuredClone(windInput);broken.series.pop();try{buildNationalShadowScoreReport(contract,multi,state,wind,marineInput,broken);throw new Error('Manglende fulddækket del blev accepteret');}catch(error){if(error.message==='Manglende fulddækket del blev accepteret')throw error;}
  console.log('National privat shadow-score self-test: bestået');
}

async function main(){
  if(process.argv.includes('--self-test')){selfTest();return;}
  const args=process.argv.slice(2),value=(flag,fallback)=>{const i=args.indexOf(flag);return i>=0?args[i+1]:fallback};
  const files=Object.fromEntries(Object.entries(DEFAULTS).map(([key,fallback])=>[key,value(`--${key.replace(/[A-Z]/g,m=>`-${m.toLowerCase()}`)}`,fallback)]));
  try{
    const [contract,multi,state,wind,marineInput,windInput]=await Promise.all(['contract','multi','state','wind','marineInput','windInput'].map(key=>fs.readFile(files[key],'utf8').then(JSON.parse)));
    const publicRules=(await Promise.all(['rules/national-rules.json','rules/local-rules.json','rules/experimental-rules.json','rules/admin-active-rules.json'].map(file=>fs.readFile(file,'utf8').then(JSON.parse)))).flatMap(document=>document.rules||[]);
    const report=buildNationalShadowScoreReport(contract,multi,state,wind,marineInput,windInput,publicRules);await fs.mkdir(path.dirname(files.output),{recursive:true});await fs.writeFile(files.output,JSON.stringify(report,null,2)+'\n');
    await Promise.all([files.marineInput,files.windInput].map(file=>fs.unlink(file)));report.transientInputsDeleted=true;await fs.writeFile(files.output,JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({status:report.status,scoredPartCount:report.scoredPartCount,unscoredPartCount:report.unscoredPartCount,coverageStatusCounts:report.coverageStatusCounts,scoreChanged:false}));
  }finally{await Promise.all([files.marineInput,files.windInput].map(file=>fs.unlink(file).catch(()=>{})));}
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))main().catch(error=>{console.error(error.message);process.exit(1)});
