export const ADAPTIVE_MODEL_KEY = 'ravradar-adaptive-model-v1';
export const ML_DECISIONS_KEY = 'ravradar-ml-decisions-v1';
export const DEFAULT_ADAPTIVE_MODEL = Object.freeze({
  schemaVersion: 1,
  version: 1,
  updatedAt: null,
  weights: { huntability: 0.40, transport: 0.35, release: 0.25 },
  scoreAdjustment: 0,
  zoneAdjustments: {},
  metricAdjustments: [],
  source: 'factory-default'
});
const clone=value=>JSON.parse(JSON.stringify(value));
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
function storage(){return typeof localStorage==='undefined'?null:localStorage;}
export function normalizeAdaptiveModel(value={}){
  const merged={...clone(DEFAULT_ADAPTIVE_MODEL),...value,weights:{...DEFAULT_ADAPTIVE_MODEL.weights,...(value.weights||{})},zoneAdjustments:{...(value.zoneAdjustments||{})},metricAdjustments:Array.isArray(value.metricAdjustments)?value.metricAdjustments:[]};
  const sum=Object.values(merged.weights).reduce((a,b)=>a+Number(b||0),0)||1;
  for(const key of Object.keys(merged.weights)) merged.weights[key]=Number((clamp(Number(merged.weights[key]||0)/sum,.05,.8)).toFixed(4));
  const normalizedSum=Object.values(merged.weights).reduce((a,b)=>a+b,0);
  for(const key of Object.keys(merged.weights)) merged.weights[key]=Number((merged.weights[key]/normalizedSum).toFixed(4));
  merged.scoreAdjustment=clamp(Number(merged.scoreAdjustment||0),-15,15);
  return merged;
}
export function loadAdaptiveModel(){const s=storage();if(!s)return clone(DEFAULT_ADAPTIVE_MODEL);try{return normalizeAdaptiveModel(JSON.parse(s.getItem(ADAPTIVE_MODEL_KEY)||'{}'));}catch{return clone(DEFAULT_ADAPTIVE_MODEL);}}
export function saveAdaptiveModel(model){const normalized=normalizeAdaptiveModel(model);storage()?.setItem(ADAPTIVE_MODEL_KEY,JSON.stringify(normalized));return normalized;}
export function modelAdjustment({model=loadAdaptiveModel(),zone,weather={}}={}){
  let adjustment=Number(model.scoreAdjustment||0)+Number(model.zoneAdjustments?.[zone?.id]||0);const matches=[];
  for(const rule of model.metricAdjustments||[]){const value=Number(weather?.[rule.field]);if(!Number.isFinite(value))continue;const ok=(rule.min==null||value>=rule.min)&&(rule.max==null||value<=rule.max);if(ok){adjustment+=Number(rule.adjustment||0);matches.push(rule);}}
  return {adjustment:clamp(Math.round(adjustment),-25,25),matches};
}
export function applyApprovedSuggestion(suggestion, current=loadAdaptiveModel()){
  if(!suggestion?.id||!suggestion?.patch)throw new Error('Forslaget mangler en gyldig modelændring.');
  const next=clone(current);const patch=suggestion.patch;
  if(patch.weights) next.weights={...next.weights,...patch.weights};
  if(Number.isFinite(Number(patch.scoreAdjustment))) next.scoreAdjustment=Number(next.scoreAdjustment||0)+Number(patch.scoreAdjustment);
  if(patch.zoneAdjustment?.zoneId) next.zoneAdjustments[patch.zoneAdjustment.zoneId]=clamp(Number(next.zoneAdjustments[patch.zoneAdjustment.zoneId]||0)+Number(patch.zoneAdjustment.adjustment||0),-15,15);
  if(patch.metricAdjustment) next.metricAdjustments=[...(next.metricAdjustments||[]).filter(x=>x.id!==patch.metricAdjustment.id),patch.metricAdjustment];
  next.version=Number(next.version||1)+1;next.updatedAt=new Date().toISOString();next.source='approved-machine-learning';next.lastSuggestionId=suggestion.id;
  return saveAdaptiveModel(next);
}
export function decisionHistory(){try{return JSON.parse(storage()?.getItem(ML_DECISIONS_KEY)||'[]');}catch{return[];}}
export function recordDecision(suggestion,decision,modelVersion=null){const rows=decisionHistory();rows.unshift({id:crypto.randomUUID?.()||`${Date.now()}`,suggestionId:suggestion.id,decision,at:new Date().toISOString(),modelVersion,suggestion});storage()?.setItem(ML_DECISIONS_KEY,JSON.stringify(rows.slice(0,300)));return rows[0];}
export function rollbackAdaptiveModel(){const current=loadAdaptiveModel();const reset={...clone(DEFAULT_ADAPTIVE_MODEL),version:Number(current.version||1)+1,updatedAt:new Date().toISOString(),source:'manual-rollback'};return saveAdaptiveModel(reset);}
