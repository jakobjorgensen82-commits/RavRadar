import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {calculateRavScore} from '../js/core/score-engine.js';
import {analyzeZoneDirections} from './audit-zone-direction-opportunity.mjs';

const EXPECTED_ZONES=210;
const EXPECTED_PARTS=673;
const TAU_CANDIDATES=[1,2,4,6,10,15,20];
const ALPHA_CANDIDATES=[.1,.2,.3,.4,.5,.6,.8,1];
const RESOLUTION_CANDIDATES=[.5,1,2];
const CANDIDATE_CONFIGS=TAU_CANDIDATES.flatMap(tau=>ALPHA_CANDIDATES.flatMap(alpha=>RESOLUTION_CANDIDATES.map(resolution=>({
 id:`softmax-t${tau}-a${alpha}-r${resolution}`,tau,alpha,resolution,
}))));
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
const quantile=(values,p)=>{
 const sorted=[...values].sort((a,b)=>a-b);
 if(!sorted.length)return 0;
 const position=(sorted.length-1)*p,low=Math.floor(position),high=Math.ceil(position);
 return low===high?sorted[low]:sorted[low]+(sorted[high]-sorted[low])*(position-low);
};
const bucketFor=count=>count<=2?'1-2':count<=5?'3-5':'6+';

function pearson(left,right){
 const lm=mean(left),rm=mean(right);
 let numerator=0,ls=0,rs=0;
 for(let i=0;i<left.length;i+=1){
  const ld=left[i]-lm,rd=right[i]-rm;
  numerator+=ld*rd;ls+=ld**2;rs+=rd**2;
 }
 return ls&&rs?numerator/Math.sqrt(ls*rs):0;
}

export function buildDirectionalWeights(rawDirections){
 const directions=[...new Set(rawDirections.map(normalize).map(value=>round(value,6)))].sort((a,b)=>a-b);
 if(!directions.length)throw new Error('Retningsprofil uden gyldige retninger.');
 if(directions.length===1)return [{directionDeg:directions[0],weight:1}];
 return directions.map((direction,index)=>{
  const previous=directions[(index-1+directions.length)%directions.length];
  const next=directions[(index+1)%directions.length];
  const previousGap=normalize(direction-previous);
  const nextGap=normalize(next-direction);
  return {directionDeg:direction,weight:(previousGap+nextGap)/720};
 });
}

export function normalizedSoftMaximum(scores,weights,tau){
 if(scores.length!==weights.length||!scores.length||!(tau>0))throw new Error('Ugyldigt soft-maximum input.');
 const maximum=Math.max(...scores);
 const weightedExponentials=scores.reduce((sum,score,index)=>sum+weights[index]*Math.exp((score-maximum)/tau),0);
 return maximum+tau*Math.log(weightedExponentials);
}

export function blendedOpportunityScore(scores,weights,{tau,alpha,resolution}){
 const rawScore=Math.max(...scores);
 const normalized=normalizedSoftMaximum(scores,weights,tau);
 const continuous=rawScore-alpha*(rawScore-normalized);
 const rounded=Math.round(continuous/resolution)*resolution;
 return Math.min(rawScore,rounded);
}

export function buildScenarioMatrix(){
 const rows=[];
 for(const split of ['train','holdout']){
  const start=split==='train'?0:10;
  for(let bearing=start;bearing<360;bearing+=20){
   for(const regime of REGIMES){
    for(const mode of MODES)rows.push({split,bearing,mode,...regime,scenarioId:`${split}-${bearing}-${regime.id}-${mode}`});
   }
  }
 }
 return rows;
}

function scoreForDirection(directionDeg,scenario){
 const weather={
  windSpeedMps:scenario.wind,
  windDirectionDeg:normalize(scenario.bearing+scenario.windOffset+180),
  waveHeightM:scenario.wave,
  wavePeriodS:scenario.period,
  waveDirectionDeg:normalize(scenario.bearing+scenario.waveOffset+180),
  currentSpeedMps:scenario.current,
  currentDirectionDeg:normalize(scenario.bearing+scenario.currentOffset),
  waterLevelTrendCm3h:scenario.trend,
 };
 const result=calculateRavScore({
  mode:scenario.mode,
  zone:{id:'neutral-direction',coastType:'east',onshoreDirectionDeg:directionDeg,shallowWater:false,reefs:false,seagrass:false},
  weather,
  history:{maxWind24hMps:scenario.maxWind,maxWave24hM:scenario.maxWave,hoursSinceHighEnergy:scenario.age},
 });
 if(!result.available||!Number.isFinite(result.score))throw new Error(`Scoren mangler for ${scenario.scenarioId}/${directionDeg}.`);
 return result.score;
}

function stableHash(value){
 let hash=2166136261;
 for(const character of value){hash^=character.charCodeAt(0);hash=Math.imul(hash,16777619);}
 return hash>>>0;
}

function summarizeCandidate(contexts,profiles,candidate){
 const buckets={'1-2':0,'3-5':0,'6+':0};
 for(const profile of profiles)buckets[profile.bucket]+=1;
 const topCounts={'1-2':0,'3-5':0,'6+':0};
 const all=[];
 let changedTop1=0;
 for(const context of contexts){
  const rows=context.rows.map(row=>{
   const adjusted=candidate===null?row.rawScore:blendedOpportunityScore(row.scores,row.weights,candidate);
   const adjustment=row.rawScore-adjusted;
   const supportShare=row.weights.reduce((sum,weight,index)=>sum+(row.scores[index]>=row.rawScore-4?weight:0),0);
   const value={...row,adjusted,adjustment,supportShare,tie:stableHash(`${context.scenarioId}|${row.zoneId}`)};
   all.push(value);
   return value;
  });
  const raw=[...rows].sort((a,b)=>b.rawScore-a.rawScore||a.tie-b.tie);
  const ranked=[...rows].sort((a,b)=>b.adjusted-a.adjusted||a.tie-b.tie);
  if(raw[0].zoneId!==ranked[0].zoneId)changedTop1+=1;
  for(const row of ranked.slice(0,5))topCounts[row.bucket]+=1;
 }
 const totalSlots=contexts.length*5;
 const overrepresentation=Object.fromEntries(Object.keys(buckets).map(bucket=>[
  bucket,round((topCounts[bucket]/totalSlots)/(buckets[bucket]/profiles.length),4),
 ]));
 const isolated=all.filter(row=>row.supportShare<=.25);
 const broad=all.filter(row=>row.supportShare>=.75);
 const single=all.filter(row=>row.partCount===1);
 const fairnessError=mean(Object.values(overrepresentation).map(value=>Math.abs(Math.log(Math.max(value,.0001)))))+Math.abs(pearson(all.map(row=>row.adjusted),all.map(row=>row.opportunityIndex)));
 return {
  id:candidate?.id||'raw-maximum',
  tau:candidate?.tau??null,
  alpha:candidate?.alpha??null,
  resolution:candidate?.resolution??null,
  scoreOpportunityCorrelation:round(pearson(all.map(row=>row.adjusted),all.map(row=>row.opportunityIndex)),4),
  top5BucketCounts:topCounts,
  top5Overrepresentation:overrepresentation,
  fairnessError:round(fairnessError,4),
  changedTop1Rate:round(changedTop1/contexts.length,4),
  meanAdjustment:round(mean(all.map(row=>row.adjustment)),4),
  p95Adjustment:round(quantile(all.map(row=>row.adjustment),.95),4),
  maximumAdjustment:round(Math.max(...all.map(row=>row.adjustment)),4),
  meanIsolatedAdjustment:round(mean(isolated.map(row=>row.adjustment)),4),
  meanBroadSupportAdjustment:round(mean(broad.map(row=>row.adjustment)),4),
  maximumSinglePartAdjustment:round(Math.max(...single.map(row=>Math.abs(row.adjustment))),6),
 };
}

function markdown(report){
 const rows=report.shortlist.map(candidate=>`| ${candidate.id} | ${candidate.train.top5Overrepresentation['1-2'].toFixed(2)}x | ${candidate.train.top5Overrepresentation['3-5'].toFixed(2)}x | ${candidate.train.top5Overrepresentation['6+'].toFixed(2)}x | ${candidate.holdout.top5Overrepresentation['6+'].toFixed(2)}x | ${candidate.holdout.scoreOpportunityCorrelation.toFixed(3)} | ${candidate.holdout.meanAdjustment.toFixed(2)} | ${candidate.holdout.meanBroadSupportAdjustment.toFixed(2)} | ${(candidate.holdout.changedTop1Rate*100).toFixed(1)}% |`);
 const selected=report.selectedCandidate;
 return `# Kalibrering af mulighedsnormaliseret zonerangering

Dato: 2026-08-21

Status: Privat, score-neutral analyse. Ingen produktionsregel er aktiveret.

## Hvad der testes

Zonens nuværende maksimum favoriserer zoner med mange forskelligt vendte kystdele. Analysen bruger den aktive RavScore på en neutral kyst og roterer de samme ${report.scenarioCount} scenarier over hele Danmark. Dermed skyldes forskelle mellem zoner kun deres antal og kombination af kystretninger.

Kandidaten er et vægtet og normaliseret soft-maximum blandet med den rå maksimumscore. Én kystdel er uændret. Hvis alle retninger er lige gode, er resultatet også uændret. En enkelt høj score blandt mange retninger korrigeres derimod mere. Retninger, der næsten er ens, tælles ikke som fulde uafhængige lodder. Rangeringens opløsning kalibreres samtidig, så ubegrundede decimaler ikke afgør mellem heltallige RavScore.

## Resultater

| Kandidat | Træning 1-2 | Træning 3-5 | Træning 6+ | Holdout 6+ | Holdout korrelation | Gns. korrektion | Bred støtte | Ændret nr. 1 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
${rows.join('\n')}

Automatisk mindste tilstrækkelige kandidat: **${selected?selected.id:'ingen kandidat bestod kravene'}**.

${selected?`På holdout-scenarierne er 6+-zonernes overrepræsentation ${selected.holdout.top5Overrepresentation['6+'].toFixed(2)}x mod ${report.baseline.holdout.top5Overrepresentation['6+'].toFixed(2)}x uden korrektion. Gennemsnitskorrektionen er ${selected.holdout.meanAdjustment.toFixed(2)} point, mens bred støtte korrigeres ${selected.holdout.meanBroadSupportAdjustment.toFixed(2)} point i gennemsnit.`:'Ingen af de afprøvede styrker er endnu både fair og tilstrækkeligt skånsom. Derfor må ingen regel aktiveres.'}

## Beskyttelse af reelle resultater

- En zone med én kystdel ændres matematisk ikke.
- Flere ens retninger giver ikke flere selvstændige lodder.
- Mange samtidigt gode retninger holder den normaliserede score tættere på maksimum.
- En enkelt god retning blandt mange skal have et større råt forspring for at vinde.
- Den offentligt viste RavScore er ikke ændret i denne analyse.

## Begrænsninger og næste kontrol

- Scenarierne er systematiske forskningsscenarier, ikke observerede fund.
- Den aktive RavScores egne antagelser følger med ind i resultatet.
- Rumlige forskelle i vejr og lokal ravtilgængelighed er bevidst neutraliseret for at isolere lotterieffekten.
- En kandidat skal bagefter kontrolleres mod de 107 faktiske prognosetimer og senere mod nationale turdata.
- Ingen kandidat må aktiveres uden ejerbeslutning og fuld produktionskontrol.
`;
}

export function calibrate({partsData,zonesData}){
 const parts=partsData.parts||[];
 const zoneIds=new Set((zonesData.features||[]).map(feature=>feature?.properties?.id).filter(Boolean));
 assert.equal(parts.length,EXPECTED_PARTS,'Kalibreringen kræver 673 kystdele.');
 const grouped=new Map();
 for(const part of parts){
  if(!zoneIds.has(part.zoneId))throw new Error(`Ukendt zone for ${part.finalPartId||part.partId}.`);
  if(!grouped.has(part.zoneId))grouped.set(part.zoneId,[]);
  grouped.get(part.zoneId).push(part);
 }
 assert.equal(grouped.size,EXPECTED_ZONES,'Kalibreringen kræver 210 zoner.');
 const directionBaseline=analyzeZoneDirections([0]).meanPositiveAlignment;
 const profiles=[...grouped.entries()].map(([zoneId,zoneParts])=>{
  const directions=zoneParts.map(part=>Number(part.onshoreDirectionDeg));
  const weights=buildDirectionalWeights(directions);
  const opportunity=analyzeZoneDirections(directions).meanPositiveAlignment/directionBaseline;
  return {zoneId,partCount:zoneParts.length,bucket:bucketFor(zoneParts.length),opportunityIndex:opportunity,directions:weights};
 });
 const contexts=buildScenarioMatrix().map(scenario=>({
  ...scenario,
  rows:profiles.map(profile=>{
   const scores=profile.directions.map(item=>scoreForDirection(item.directionDeg,scenario));
   return {zoneId:profile.zoneId,partCount:profile.partCount,bucket:profile.bucket,opportunityIndex:profile.opportunityIndex,scores,weights:profile.directions.map(item=>item.weight),rawScore:Math.max(...scores)};
  }),
 }));
 const train=contexts.filter(context=>context.split==='train');
 const holdout=contexts.filter(context=>context.split==='holdout');
 const baseline={id:'raw-maximum',tau:null,alpha:null,resolution:null,train:summarizeCandidate(train,profiles,null),holdout:summarizeCandidate(holdout,profiles,null)};
 const candidates=CANDIDATE_CONFIGS.map(candidate=>({...candidate,train:summarizeCandidate(train,profiles,candidate),holdout:summarizeCandidate(holdout,profiles,candidate)}));
 const eligible=candidates.filter(candidate=>
  candidate.train.top5Overrepresentation['6+']>=.75&&candidate.train.top5Overrepresentation['6+']<=1.25
  && Math.abs(candidate.train.scoreOpportunityCorrelation)<=.08
  && candidate.holdout.top5Overrepresentation['6+']>=.7&&candidate.holdout.top5Overrepresentation['6+']<=1.3
  && Math.abs(candidate.holdout.scoreOpportunityCorrelation)<=.1
  && candidate.holdout.maximumSinglePartAdjustment===0);
 const selected=eligible.sort((a,b)=>a.holdout.meanAdjustment-b.holdout.meanAdjustment||a.holdout.fairnessError-b.holdout.fairnessError)[0]||null;
 const shortlist=[...candidates].sort((a,b)=>a.holdout.fairnessError-b.holdout.fairnessError||a.holdout.meanAdjustment-b.holdout.meanAdjustment).slice(0,12);
 if(selected&&!shortlist.some(candidate=>candidate.id===selected.id))shortlist.push(selected);
 return {
  schemaVersion:1,generatedAt:new Date().toISOString(),status:'private-score-neutral-opportunity-normalization-calibration',
  scenarioCount:contexts.length,trainScenarioCount:train.length,holdoutScenarioCount:holdout.length,zoneCount:profiles.length,partCount:parts.length,
  method:'global direction rotation + neutral coast + circular Voronoi weights + normalized soft maximum',
  baseline,candidates,shortlist,selectedCandidate:selected,
  scoreImpact:false,publicRuntimeImpact:false,landOrWaterPointsChanged:false,automaticActivationAllowed:false,
 };
}

function args(argv){
 const result={};
 for(let i=0;i<argv.length;i+=1)if(argv[i].startsWith('--')){const key=argv[i].slice(2),next=argv[i+1];if(next&&!next.startsWith('--')){result[key]=next;i+=1;}else result[key]=true;}
 return result;
}

function main(){
 const options=args(process.argv.slice(2));
 const partsPath=options.parts||'data/geometry-v2/active-national-coastal-parts/point-pairs.json';
 const zonesPath=options.zones||'data/zones.geojson';
 const report=calibrate({partsData:JSON.parse(fs.readFileSync(partsPath,'utf8')),zonesData:JSON.parse(fs.readFileSync(zonesPath,'utf8'))});
 if(options['json-out']){fs.mkdirSync(path.dirname(options['json-out']),{recursive:true});fs.writeFileSync(options['json-out'],`${JSON.stringify(report,null,2)}\n`);}
 if(options['markdown-out']){fs.mkdirSync(path.dirname(options['markdown-out']),{recursive:true});fs.writeFileSync(options['markdown-out'],markdown(report));}
 console.log(`Scenarier: ${report.trainScenarioCount} træning + ${report.holdoutScenarioCount} holdout`);
 console.log(`Baseline holdout 6+: ${report.baseline.holdout.top5Overrepresentation['6+']}x; korrelation ${report.baseline.holdout.scoreOpportunityCorrelation}`);
 for(const candidate of report.shortlist)console.log(`${candidate.id}: holdout 6+ ${candidate.holdout.top5Overrepresentation['6+']}x; corr ${candidate.holdout.scoreOpportunityCorrelation}; justering ${candidate.holdout.meanAdjustment}; bred ${candidate.holdout.meanBroadSupportAdjustment}`);
 console.log(`Valgt kandidat: ${report.selectedCandidate?.id||'ingen'}`);
 console.log('Produktionspåvirkning: nej');
}

if(import.meta.url===pathToFileURL(process.argv[1]).href)main();
