import { loadAdaptiveModel, modelAdjustment } from './adaptive-model.js?v=4.0.259';
const clamp=(v,min=0,max=100)=>Math.min(max,Math.max(min,v));
const sigmoid=x=>1/(1+Math.exp(-x));
const asFinite=v=>(v===null||v===undefined||v===''||typeof v==='boolean')?null:(Number.isFinite(Number(v))?Number(v):null);
const isFind=row=>row?.result&&!['none','no'].includes(row.result);
function betaEstimate(rows,priorSuccess=2,priorFailure=3){const success=rows.filter(isFind).length;return {rate:(success+priorSuccess)/(rows.length+priorSuccess+priorFailure),success,total:rows.length};}
function comparableRows(observations,zone,weather){
  const local=observations.filter(x=>x.zone_id===zone?.id);
  if(local.length>=6)return {rows:local,scope:'samme zone'};
  const coast=observations.filter(x=>x.coast_type&&x.coast_type===zone?.coastType);
  if(coast.length>=10)return {rows:coast,scope:'samme kysttype'};
  const water=asFinite(weather?.waterLevelCm),wind=asFinite(weather?.windSpeedMps);
  const similar=observations.filter(x=>(water===null||asFinite(x.water_level_cm)===null||Math.abs(asFinite(x.water_level_cm)-water)<=20)&&(wind===null||asFinite(x.wind_speed_mps)===null||Math.abs(asFinite(x.wind_speed_mps)-wind)<=3));
  return {rows:similar.length>=8?similar:observations,scope:similar.length>=8?'lignende vejrforhold':'alle ture'};
}
export function predictAmberChance({baseScore,zone,weather={},history={},observations=[],model=loadAdaptiveModel()}={}){
  if(asFinite(baseScore)===null)return {available:false,probability:null,confidence:0,label:'Ingen prognose',reasons:['RavScore mangler.']};
  const adaptive=modelAdjustment({model,zone,weather});
  const comparable=comparableRows(observations,zone,weather);const empirical=betaEstimate(comparable.rows);
  const modelProbability=sigmoid((Number(baseScore)+adaptive.adjustment-55)/13);
  const evidenceWeight=Math.min(.50,comparable.rows.length/60);
  const probability=clamp(Math.round(100*((1-evidenceWeight)*modelProbability+evidenceWeight*empirical.rate)));
  const fields=['windSpeedMps','waveHeightM','waterLevelCm','currentSpeedMps'];const completeness=fields.filter(k=>asFinite(weather[k])!==null).length/fields.length;
  const freshness=weather?.time?Math.max(0,1-Math.abs(Date.now()-Date.parse(weather.time))/(36*3600000)):0.6;
  const confidence=clamp(Math.round(30+completeness*30+freshness*15+Math.min(25,comparable.rows.length*.75)));
  const reasons=[`RavScore-modellen svarer til cirka ${Math.round(modelProbability*100)} %.`,`Datagrundlaget bruger ${comparable.rows.length} ture fra ${comparable.scope} og en udglattet fundrate på ${Math.round(empirical.rate*100)} %.`];
  if(adaptive.adjustment)reasons.push(`Godkendte modeltilpasninger ændrer vurderingen med ${adaptive.adjustment>0?'+':''}${adaptive.adjustment} point.`);
  if(confidence<55)reasons.push('Sikkerheden er begrænset, fordi datagrundlaget eller vejrsnapshot er ufuldstændigt.');
  return {available:true,probability,confidence,label:probability>=70?'Høj chance':probability>=45?'Middel chance':'Lav chance',modelProbability:Math.round(modelProbability*100),empiricalProbability:Math.round(empirical.rate*100),sampleSize:comparable.rows.length,evidenceScope:comparable.scope,adaptiveAdjustment:adaptive.adjustment,reasons,modelVersion:model.version};
}
