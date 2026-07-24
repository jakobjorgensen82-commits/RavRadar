import { loadAdaptiveModel, modelAdjustment } from './adaptive-model.js';
const clamp=(v,min=0,max=100)=>Math.min(max,Math.max(min,v));
const sigmoid=x=>1/(1+Math.exp(-x));
export function predictAmberChance({baseScore,zone,weather={},history={},observations=[],model=loadAdaptiveModel()}={}){
  if(!Number.isFinite(Number(baseScore)))return {available:false,probability:null,confidence:0,label:'Ingen prognose',reasons:['RavScore mangler.']};
  const adaptive=modelAdjustment({model,zone,weather});
  const local=observations.filter(x=>x.zone_id===zone?.id);const comparable=local.length>=5?local:observations;
  const success=comparable.filter(x=>x.result&&!['none','no'].includes(x.result)).length;
  const empirical=comparable.length?success/comparable.length:null;
  const modelProbability=sigmoid((Number(baseScore)+adaptive.adjustment-55)/13);
  const evidenceWeight=Math.min(.45,comparable.length/80);
  const probability=clamp(Math.round(100*((1-evidenceWeight)*modelProbability+evidenceWeight*(empirical??modelProbability))));
  const completeness=['windSpeedMps','waveHeightM','waterLevelCm','currentSpeedMps'].filter(k=>Number.isFinite(Number(weather[k]))).length/4;
  const confidence=clamp(Math.round(35+completeness*35+Math.min(25,comparable.length*.8)));
  const reasons=[`Regelbaseret RavScore bidrager med ${Math.round(modelProbability*100)} %.`];
  if(empirical!=null)reasons.push(`${comparable.length} sammenlignelige ture giver en fundrate på ${Math.round(empirical*100)} %.`);
  if(adaptive.adjustment)reasons.push(`Godkendte modeltilpasninger ændrer vurderingen med ${adaptive.adjustment>0?'+':''}${adaptive.adjustment} point.`);
  return {available:true,probability,confidence,label:probability>=70?'Høj chance':probability>=45?'Middel chance':'Lav chance',modelProbability:Math.round(modelProbability*100),empiricalProbability:empirical==null?null:Math.round(empirical*100),sampleSize:comparable.length,adaptiveAdjustment:adaptive.adjustment,reasons};
}
