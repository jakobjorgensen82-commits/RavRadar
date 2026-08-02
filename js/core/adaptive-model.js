export const ADAPTIVE_MODEL_KEY = 'ravradar-adaptive-model-v1';
export const ADAPTIVE_MODEL_HISTORY_KEY = 'ravradar-adaptive-model-history-v1';
export const ML_DECISIONS_KEY = 'ravradar-ml-decisions-v1';
export const DEFAULT_ADAPTIVE_MODEL = Object.freeze({
  schemaVersion: 2,
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
function readJson(key,fallback){try{return JSON.parse(storage()?.getItem(key)||'null')??fallback;}catch{return fallback;}}
function writeJson(key,value){storage()?.setItem(key,JSON.stringify(value));}
let adaptiveModelCacheRaw = Symbol('unset');
let adaptiveModelCacheValue = null;
export function normalizeAdaptiveModel(value={}){
  const merged={...clone(DEFAULT_ADAPTIVE_MODEL),...value,weights:{...DEFAULT_ADAPTIVE_MODEL.weights,...(value.weights||{})},zoneAdjustments:{...(value.zoneAdjustments||{})},metricAdjustments:Array.isArray(value.metricAdjustments)?value.metricAdjustments:[]};
  const sum=Object.values(merged.weights).reduce((a,b)=>a+Number(b||0),0)||1;
  for(const key of Object.keys(merged.weights)) merged.weights[key]=Number((clamp(Number(merged.weights[key]||0)/sum,.05,.8)).toFixed(4));
  const normalizedSum=Object.values(merged.weights).reduce((a,b)=>a+b,0);
  for(const key of Object.keys(merged.weights)) merged.weights[key]=Number((merged.weights[key]/normalizedSum).toFixed(4));
  merged.scoreAdjustment=clamp(Number(merged.scoreAdjustment||0),-15,15);
  merged.version=Math.max(1,Math.trunc(Number(merged.version)||1));
  merged.schemaVersion=2;
  return merged;
}
export function loadAdaptiveModel(){
  const raw=storage()?.getItem(ADAPTIVE_MODEL_KEY)??null;
  if(raw===adaptiveModelCacheRaw&&adaptiveModelCacheValue)return adaptiveModelCacheValue;
  let parsed=null;
  try{parsed=raw?JSON.parse(raw):null;}catch{parsed=null;}
  adaptiveModelCacheRaw=raw;
  adaptiveModelCacheValue=parsed?normalizeAdaptiveModel(parsed):clone(DEFAULT_ADAPTIVE_MODEL);
  return adaptiveModelCacheValue;
}
export function listAdaptiveModelVersions(){
  const history=readJson(ADAPTIVE_MODEL_HISTORY_KEY,[]).map(normalizeAdaptiveModel);
  const current=loadAdaptiveModel();
  const byVersion=new Map([[current.version,current],...history.map(model=>[model.version,model])]);
  return [...byVersion.values()].sort((a,b)=>b.version-a.version);
}
function archiveModel(model){
  const normalized=normalizeAdaptiveModel(model);const rows=listAdaptiveModelVersions().filter(x=>x.version!==normalized.version);
  rows.unshift(normalized);writeJson(ADAPTIVE_MODEL_HISTORY_KEY,rows.slice(0,50));
}
export function saveAdaptiveModel(model,{archiveCurrent=true}={}){
  const current=loadAdaptiveModel();if(archiveCurrent&&current)archiveModel(current);
  const normalized=normalizeAdaptiveModel(model);writeJson(ADAPTIVE_MODEL_KEY,normalized);adaptiveModelCacheRaw=storage()?.getItem(ADAPTIVE_MODEL_KEY)??null;adaptiveModelCacheValue=normalized;archiveModel(normalized);return normalized;
}
export function modelAdjustment({model=loadAdaptiveModel(),zone,weather={}}={}){
  let adjustment=Number(model.scoreAdjustment||0)+Number(model.zoneAdjustments?.[zone?.id]||0);const matches=[];
  for(const rule of model.metricAdjustments||[]){const value=Number(weather?.[rule.field]);if(!Number.isFinite(value))continue;const ok=(rule.min==null||value>=rule.min)&&(rule.max==null||value<=rule.max);if(ok){adjustment+=Number(rule.adjustment||0);matches.push(rule);}}
  return {adjustment:clamp(Math.round(adjustment),-25,25),matches};
}
export function applyApprovedSuggestion(suggestion,current=loadAdaptiveModel()){
  if(!suggestion?.id||!suggestion?.patch)throw new Error('Forslaget mangler en gyldig modelændring.');
  const next=clone(current);const patch=suggestion.patch;
  if(patch.weights)next.weights={...next.weights,...patch.weights};
  if(Number.isFinite(Number(patch.scoreAdjustment)))next.scoreAdjustment=Number(next.scoreAdjustment||0)+Number(patch.scoreAdjustment);
  if(patch.zoneAdjustment?.zoneId)next.zoneAdjustments[patch.zoneAdjustment.zoneId]=clamp(Number(next.zoneAdjustments[patch.zoneAdjustment.zoneId]||0)+Number(patch.zoneAdjustment.adjustment||0),-15,15);
  if(patch.metricAdjustment)next.metricAdjustments=[...(next.metricAdjustments||[]).filter(x=>x.id!==patch.metricAdjustment.id),patch.metricAdjustment];
  next.version=Number(current.version||1)+1;next.updatedAt=new Date().toISOString();next.source='approved-machine-learning';next.lastSuggestionId=suggestion.id;
  return saveAdaptiveModel(next);
}
export function activateAdaptiveModelVersion(version){
  const target=listAdaptiveModelVersions().find(x=>x.version===Number(version));if(!target)throw new Error('Modelversionen blev ikke fundet.');
  const current=loadAdaptiveModel();const next={...clone(target),version:current.version+1,updatedAt:new Date().toISOString(),source:`rollback-from-v${target.version}`,restoredFromVersion:target.version};
  return saveAdaptiveModel(next);
}
export function decisionHistory(){return readJson(ML_DECISIONS_KEY,[]);}
export function recordDecision(suggestion,decision,modelVersion=null){const rows=decisionHistory();rows.unshift({id:crypto.randomUUID?.()||`${Date.now()}`,suggestionId:suggestion.id,decision,at:new Date().toISOString(),modelVersion,suggestion});writeJson(ML_DECISIONS_KEY,rows.slice(0,300));return rows[0];}
export function rollbackAdaptiveModel(){const current=loadAdaptiveModel();const reset={...clone(DEFAULT_ADAPTIVE_MODEL),version:Number(current.version||1)+1,updatedAt:new Date().toISOString(),source:'manual-rollback'};return saveAdaptiveModel(reset);}
