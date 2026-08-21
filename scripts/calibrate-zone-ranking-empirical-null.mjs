import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {calculateRavScore} from '../js/core/score-engine.js';
import {analyzeZoneDirections} from './audit-zone-direction-opportunity.mjs';
import {buildDirectionalWeights,normalizedSoftMaximum} from './calibrate-zone-ranking-opportunity-normalization.mjs';

const EXPECTED_ZONES=210;
const EXPECTED_PARTS=673;
const TAUS=[1,2,4,6,10,15,20];
const MODES=['waders','beach'];
const REGIMES=[
 {id:'quiet',wind:3,wave:.2,period:4,current:.05,windOffset:35,waveOffset:55,currentOffset:75,maxWind:4,maxWave:.3,age:120,trend:0},
 {id:'building',wind:10,wave:1.2,period:6,current:.25,windOffset:0,waveOffset:10,currentOffset:0,maxWind:10,maxWave:1.2,age:0,trend:8},
 {id:'peak',wind:16,wave:3,period:8,current:.45,windOffset:-10,waveOffset:0,currentOffset:10,maxWind:16,maxWave:3,age:0,trend:4},
 {id:'early-recession',wind:7,wave:.9,period:7,current:.3,windOffset:20,waveOffset:-15,currentOffset:0,maxWind:17,maxWave:3,age:4,trend:-8},
 {id:'post-storm',wind:4,wave:.4,period:6,current:.25,windOffset:45,waveOffset:20,currentOffset:0,maxWind:17,maxWave:3,age:10,trend:-6},
 {id:'current-led',wind:5,wave:.6,period:5,current:.35,windOffset:90,waveOffset:90,currentOffset:0,maxWind:9,maxWave:1.1,age:8,trend:-4},
 {id:'wave-led',wind:5,wave:.8,period:7,current:.12,windOffset:0,waveOffset:0,currentOffset:90,maxWind:14,maxWave:2.4,age:8,trend:-4},
 {id:'conflict',wind:5,wave:.8,period:7,current:.3,windOffset:180,waveOffset:180,currentOffset:0,maxWind:14,maxWave:2.4,age:8,trend:-4},
];

const normalize=value=>((Number(value)%360)+360)%360;
const round=(value,digits=4)=>Number(value.toFixed(digits));
const mean=values=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:0;
const bucketFor=count=>count<=2?'1-2':count<=5?'3-5':'6+';
const quantile=(values,p)=>{
 if(!values.length)return 0;
 const position=(values.length-1)*Math.max(0,Math.min(1,p)),low=Math.floor(position),high=Math.ceil(position);
 return low===high?values[low]:values[low]+(values[high]-values[low])*(position-low);
};

function lowerBound(values,target){let low=0,high=values.length;while(low<high){const middle=(low+high)>>1;if(values[middle]<target)low=middle+1;else high=middle;}return low;}
function upperBound(values,target){let low=0,high=values.length;while(low<high){const middle=(low+high)>>1;if(values[middle]<=target)low=middle+1;else high=middle;}return low;}

export function empiricalMidrank(sortedValues,value){
 if(!sortedValues.length)throw new Error('Tom nulfordeling.');
 return (lowerBound(sortedValues,value)+upperBound(sortedValues,value))/(2*sortedValues.length);
}

export function mapToReferenceEquivalent(value,zoneDistribution,referenceDistribution){
 const percentile=empiricalMidrank(zoneDistribution,value);
 return {percentile,equivalent:quantile(referenceDistribution,percentile)};
}

function pearson(left,right){
 const lm=mean(left),rm=mean(right);let numerator=0,ls=0,rs=0;
 for(let i=0;i<left.length;i+=1){const ld=left[i]-lm,rd=right[i]-rm;numerator+=ld*rd;ls+=ld**2;rs+=rd**2;}
 return ls&&rs?numerator/Math.sqrt(ls*rs):0;
}

function stableHash(value){let hash=2166136261;for(const character of value){hash^=character.charCodeAt(0);hash=Math.imul(hash,16777619);}return hash>>>0;}

function scoreAtRelativeBearing(relativeBearing,mode,regime){
 const result=calculateRavScore({
  mode,
  zone:{id:'neutral-direction',coastType:'east',onshoreDirectionDeg:0,shallowWater:false,reefs:false,seagrass:false},
  weather:{
   windSpeedMps:regime.wind,windDirectionDeg:normalize(relativeBearing+regime.windOffset+180),
   waveHeightM:regime.wave,wavePeriodS:regime.period,waveDirectionDeg:normalize(relativeBearing+regime.waveOffset+180),
   currentSpeedMps:regime.current,currentDirectionDeg:normalize(relativeBearing+regime.currentOffset),waterLevelTrendCm3h:regime.trend,
  },
  history:{maxWind24hMps:regime.maxWind,maxWave24hM:regime.maxWave,hoursSinceHighEnergy:regime.age},
 });
 if(!result.available)throw new Error(`Manglende neutral score for ${relativeBearing}/${mode}/${regime.id}.`);
 return result.score;
}

function buildLookup(){
 const lookup=new Map();
 for(const mode of MODES)for(const regime of REGIMES)for(let relative=0;relative<360;relative+=1){
  lookup.set(`${mode}|${regime.id}|${relative}`,scoreAtRelativeBearing(relative,mode,regime));
 }
 return lookup;
}

function scoresFor(profile,bearing,mode,regime,lookup){
 return profile.directions.map(item=>lookup.get(`${mode}|${regime.id}|${Math.round(normalize(bearing-item.directionDeg))%360}`));
}

function statistic(scores,weights,tau){return tau===null?Math.max(...scores):normalizedSoftMaximum(scores,weights,tau);}

function summarize({profiles,lookup,tau,zoneDistributions,referenceDistributions}){
 const bucketZones={'1-2':0,'3-5':0,'6+':0};for(const profile of profiles)bucketZones[profile.bucket]+=1;
 const topCounts={'1-2':0,'3-5':0,'6+':0};
 const all=[];let contexts=0,changedTop1=0;
 const ownerCounts={baseline:{'DK-B10-06':0,'DK-B10-10':0},adjusted:{'DK-B10-06':0,'DK-B10-10':0}};
 for(const mode of MODES)for(const regime of REGIMES)for(let bearing=1;bearing<360;bearing+=2){
  contexts+=1;
  const rows=profiles.map(profile=>{
   const scores=scoresFor(profile,bearing,mode,regime,lookup),weights=profile.directions.map(item=>item.weight);
   const rawScore=Math.max(...scores),supportShare=weights.reduce((sum,weight,index)=>sum+(scores[index]>=rawScore-4?weight:0),0);
   let adjusted=rawScore,percentile=null;
   if(tau!==null){
    const mapped=mapToReferenceEquivalent(statistic(scores,weights,tau),zoneDistributions.get(`${profile.zoneId}|${mode}`),referenceDistributions.get(mode));
    percentile=mapped.percentile;adjusted=Math.min(rawScore,mapped.equivalent);
   }
   const row={...profile,rawScore,adjusted,adjustment:rawScore-adjusted,supportShare,percentile,tie:stableHash(`${mode}|${regime.id}|${bearing}|${profile.zoneId}`)};
   all.push(row);return row;
  });
  const raw=[...rows].sort((a,b)=>b.rawScore-a.rawScore||a.tie-b.tie);
  const ranked=[...rows].sort((a,b)=>b.adjusted-a.adjusted||(b.percentile??0)-(a.percentile??0)||a.tie-b.tie);
  if(raw[0].zoneId!==ranked[0].zoneId)changedTop1+=1;
  for(const row of raw.slice(0,5))if(Object.hasOwn(ownerCounts.baseline,row.zoneId))ownerCounts.baseline[row.zoneId]+=1;
  for(const row of ranked.slice(0,5)){topCounts[row.bucket]+=1;if(Object.hasOwn(ownerCounts.adjusted,row.zoneId))ownerCounts.adjusted[row.zoneId]+=1;}
 }
 const slots=contexts*5;
 const top5Overrepresentation=Object.fromEntries(Object.keys(bucketZones).map(bucket=>[bucket,round((topCounts[bucket]/slots)/(bucketZones[bucket]/profiles.length),4)]));
 const broad=all.filter(row=>row.supportShare>=.75),isolated=all.filter(row=>row.supportShare<=.25),single=all.filter(row=>row.partCount===1);
 const highBroad=all.filter(row=>row.rawScore>=75&&row.supportShare>=.75);
 return {
  contextCount:contexts,top5BucketCounts:topCounts,top5Overrepresentation,
  scoreOpportunityCorrelation:round(pearson(all.map(row=>row.adjusted),all.map(row=>row.opportunityIndex)),4),
  changedTop1Rate:round(changedTop1/contexts,4),meanAdjustment:round(mean(all.map(row=>row.adjustment)),4),
  meanBroadSupportAdjustment:round(mean(broad.map(row=>row.adjustment)),4),meanIsolatedAdjustment:round(mean(isolated.map(row=>row.adjustment)),4),
  maximumSinglePartAdjustment:round(single.reduce((maximum,row)=>Math.max(maximum,Math.abs(row.adjustment)),0),6),
  highBroadCount:highBroad.length,highBroadStillGoodShare:round(highBroad.filter(row=>row.adjusted>=75).length/Math.max(1,highBroad.length),4),
  ownerTop5Counts:ownerCounts,
 };
}

function markdown(report){
 const rows=report.candidates.map(candidate=>`| ${candidate.id} | ${candidate.holdout.top5Overrepresentation['1-2'].toFixed(2)}x | ${candidate.holdout.top5Overrepresentation['3-5'].toFixed(2)}x | ${candidate.holdout.top5Overrepresentation['6+'].toFixed(2)}x | ${candidate.holdout.scoreOpportunityCorrelation.toFixed(3)} | ${candidate.holdout.meanAdjustment.toFixed(2)} | ${candidate.holdout.meanBroadSupportAdjustment.toFixed(2)} | ${candidate.holdout.meanIsolatedAdjustment.toFixed(2)} | ${(candidate.holdout.highBroadStillGoodShare*100).toFixed(1)}% |`);
 const selected=report.selectedCandidate;
 return `# Empirisk nulmodel for fair national zonerangering

Dato: 2026-08-21

Status: Privat, score-neutral analyse. Ingen produktionsregel er aktiveret.

## Metode

For hver zone beregnes dens egen nulfordeling for ${report.trainContextCount} neutrale træningsscenarier. Fordelingen viser, hvor høj zonens bedste resultat normalt bliver alene på grund af dens antal og kombination af retninger. Holdout bruger ${report.holdoutContextCount} andre retninger.

Et aktuelt zoneresultat oversættes til samme percentil i en enkelt kystretnings referencefordeling. Resultatet kan kun sænkes, aldrig løftes. Soft-maximum gør samtidig bred støtte stærkere end én isoleret høj del, og næsten ens retninger vægtes efter deres faktiske andel af retningscirklen.

| Kandidat | 1-2 dele | 3-5 dele | 6+ dele | Korrelation | Gns. korrektion | Bred støtte | Isoleret top | Høj+bred stadig God |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
${rows.join('\n')}

Baseline for 6+-zoner: **${report.baseline.holdout.top5Overrepresentation['6+'].toFixed(2)}x**.  
Valgt mindste tilstrækkelige kandidat: **${selected?selected.id:'ingen kandidat bestod kravene'}**.

${selected?`Den valgte kandidat giver ${selected.holdout.top5Overrepresentation['6+'].toFixed(2)}x for 6+-zoner og korrelation ${selected.holdout.scoreOpportunityCorrelation.toFixed(3)} på holdout. Bred støtte korrigeres ${selected.holdout.meanBroadSupportAdjustment.toFixed(2)} point mod ${selected.holdout.meanIsolatedAdjustment.toFixed(2)} point for isolerede toppe.`:'Der er endnu ikke dokumenteret en kandidat, som både fjerner mulighedsfordelen og bevarer de krævede sikkerhedsegenskaber.'}

## Sikkerhed og begrænsninger

- Én kystdel skal forblive matematisk uændret.
- Den offentlige RavScore, pile, forklaring og geometri er ikke ændret.
- Nulmodellen bruger den aktive RavScore og arver derfor dens faglige begrænsninger.
- Rumlige vejrgradienter er neutraliseret for at isolere lotterieffekten.
- En bestået syntetisk kandidat skal stadig prøves mod de 107 faktiske timer og ejerens konkrete zoneeksempler.
- Ingen automatisk aktivering er tilladt.
`;
}

export function calibrateEmpiricalNull({partsData,zonesData}){
 const parts=partsData.parts||[],zoneIds=new Set((zonesData.features||[]).map(feature=>feature?.properties?.id).filter(Boolean));
 assert.equal(parts.length,EXPECTED_PARTS);const grouped=new Map();
 for(const part of parts){if(!zoneIds.has(part.zoneId))throw new Error(`Ukendt zone ${part.zoneId}.`);if(!grouped.has(part.zoneId))grouped.set(part.zoneId,[]);grouped.get(part.zoneId).push(part);}
 assert.equal(grouped.size,EXPECTED_ZONES);
 const directionBaseline=analyzeZoneDirections([0]).meanPositiveAlignment;
 const profiles=[...grouped.entries()].map(([zoneId,zoneParts])=>{
  const directions=zoneParts.map(part=>Number(part.onshoreDirectionDeg)),weighted=buildDirectionalWeights(directions);
  return {zoneId,partCount:zoneParts.length,bucket:bucketFor(zoneParts.length),opportunityIndex:analyzeZoneDirections(directions).meanPositiveAlignment/directionBaseline,directions:weighted};
 });
 const lookup=buildLookup();
 const buildDistributions=tau=>{
  const zoneDistributions=new Map(),referenceDistributions=new Map();
  for(const mode of MODES){
   const reference=[];for(const regime of REGIMES)for(let bearing=0;bearing<360;bearing+=2)reference.push(lookup.get(`${mode}|${regime.id}|${bearing}`));
   reference.sort((a,b)=>a-b);referenceDistributions.set(mode,reference);
   for(const profile of profiles){
    const values=[];for(const regime of REGIMES)for(let bearing=0;bearing<360;bearing+=2){const scores=scoresFor(profile,bearing,mode,regime,lookup);values.push(statistic(scores,profile.directions.map(item=>item.weight),tau));}
    values.sort((a,b)=>a-b);zoneDistributions.set(`${profile.zoneId}|${mode}`,values);
   }
  }
  return {zoneDistributions,referenceDistributions};
 };
 const baseline=summarize({profiles,lookup,tau:null,zoneDistributions:new Map(),referenceDistributions:new Map()});
 const candidates=TAUS.map(tau=>{
  const distributions=buildDistributions(tau),holdout=summarize({profiles,lookup,tau,...distributions});
  return {id:`empirical-null-softmax-${tau}`,tau,holdout};
 });
 const eligible=candidates.filter(candidate=>Object.values(candidate.holdout.top5Overrepresentation).every(value=>value>=.75&&value<=1.25)
  && Math.abs(candidate.holdout.scoreOpportunityCorrelation)<=.08
  && candidate.holdout.maximumSinglePartAdjustment<=.01
  && candidate.holdout.meanBroadSupportAdjustment<candidate.holdout.meanIsolatedAdjustment);
 const selected=[...eligible].sort((a,b)=>a.holdout.meanBroadSupportAdjustment-b.holdout.meanBroadSupportAdjustment||a.holdout.meanAdjustment-b.holdout.meanAdjustment)[0]||null;
 return {schemaVersion:1,generatedAt:new Date().toISOString(),status:'private-score-neutral-empirical-null-calibration',zoneCount:profiles.length,partCount:parts.length,trainContextCount:180*REGIMES.length*MODES.length,holdoutContextCount:180*REGIMES.length*MODES.length,method:'even-bearing empirical null mapped to one-direction reference; odd-bearing holdout',baseline:{id:'raw-maximum',holdout:baseline},candidates,selectedCandidate:selected,scoreImpact:false,publicRuntimeImpact:false,landOrWaterPointsChanged:false,automaticActivationAllowed:false};
}

function parseArgs(argv){const result={};for(let i=0;i<argv.length;i+=1)if(argv[i].startsWith('--')){const key=argv[i].slice(2),next=argv[i+1];if(next&&!next.startsWith('--')){result[key]=next;i+=1;}else result[key]=true;}return result;}

function main(){
 const options=parseArgs(process.argv.slice(2));
 const report=calibrateEmpiricalNull({partsData:JSON.parse(fs.readFileSync(options.parts||'data/geometry-v2/active-national-coastal-parts/point-pairs.json','utf8')),zonesData:JSON.parse(fs.readFileSync(options.zones||'data/zones.geojson','utf8'))});
 if(options['json-out']){fs.mkdirSync(path.dirname(options['json-out']),{recursive:true});fs.writeFileSync(options['json-out'],`${JSON.stringify(report,null,2)}\n`);}
 if(options['markdown-out']){fs.mkdirSync(path.dirname(options['markdown-out']),{recursive:true});fs.writeFileSync(options['markdown-out'],markdown(report));}
 console.log(`Nulmodel: ${report.trainContextCount} træning / ${report.holdoutContextCount} holdout`);
 console.log(`Baseline: 6+ ${report.baseline.holdout.top5Overrepresentation['6+']}x; corr ${report.baseline.holdout.scoreOpportunityCorrelation}`);
 for(const candidate of report.candidates)console.log(`${candidate.id}: 1-2 ${candidate.holdout.top5Overrepresentation['1-2']}x; 3-5 ${candidate.holdout.top5Overrepresentation['3-5']}x; 6+ ${candidate.holdout.top5Overrepresentation['6+']}x; corr ${candidate.holdout.scoreOpportunityCorrelation}; bred ${candidate.holdout.meanBroadSupportAdjustment}; isoleret ${candidate.holdout.meanIsolatedAdjustment}`);
 console.log(`Valgt kandidat: ${report.selectedCandidate?.id||'ingen'}`);console.log('Produktionspåvirkning: nej');
}

if(import.meta.url===pathToFileURL(process.argv[1]).href)main();
