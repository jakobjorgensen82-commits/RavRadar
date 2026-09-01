import { getLocalObservations } from './observation-service.js?v=4.0.319';
import { ravScoreModelBinding } from '../core/ravscore-model-contract.js?v=4.0.319';
import {
  calibrationEligibilityIssues,
  isCalibrationEligibleForBinding,
} from './calibration-eligibility.js?v=4.0.319';
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const found=row=>row.result&&!['none','no'].includes(row.result);
const average=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
function stableId(parts){let h=2166136261;for(const c of parts.join('|'))h=Math.imul(h^c.charCodeAt(0),16777619);return `ml-${(h>>>0).toString(16)}`;}
function metricProposal(field,label,unit,successful,unsuccessful){const yes=successful.map(r=>r[field]).filter(finite),no=unsuccessful.map(r=>r[field]).filter(finite);if(yes.length<4||no.length<4)return null;const y=average(yes),n=average(no),delta=y-n;const spread=Math.max(1,Math.abs(y)+Math.abs(n));const confidence=clamp(Math.round(55+Math.min(35,(yes.length+no.length)*1.2)+Math.min(10,Math.abs(delta)/spread*30)),55,95);if(Math.abs(delta)<({water_level_cm:4,wind_speed_mps:.8,wave_height_m:.15}[field]||.1))return null;const positive=delta>0;const threshold=Number(((y+n)/2).toFixed(field==='water_level_cm'?0:1));const adjustment=clamp(Math.round(Math.abs(delta)/({water_level_cm:6,wind_speed_mps:1.2,wave_height_m:.2}[field]||1)),2,8)*(positive?1:-1);const id=stableId([field,String(threshold),String(adjustment)]);return {id,type:'metric-adjustment',title:`Tilpas ${label}`,description:`Registrerede fund har i gennemsnit ${y.toFixed(1)} ${unit}, mens ture uden fund har ${n.toFixed(1)} ${unit}.`,evidence:{successful:yes.length,unsuccessful:no.length,successfulAverage:y,unsuccessfulAverage:n,delta,unit},confidence,expectedEffect:`Juster RavScore med ${adjustment>0?'+':''}${adjustment} point, når ${label} er ${positive?'mindst':'højst'} ${threshold} ${unit}.`,patch:{metricAdjustment:{id,field,min:positive?threshold:null,max:positive?null:threshold,adjustment,label,approvedFrom:'machine-learning-studio'}}};}
export function analyzeObservationRows(rows=[]){
  const binding=ravScoreModelBinding();
  const source=Array.isArray(rows)?rows:[];
  const valid=source.filter(row=>isCalibrationEligibleForBinding(row,binding));
  const successful=valid.filter(found),unsuccessful=valid.filter(r=>!found(r));
  const modes=Object.fromEntries(['waders','beach'].map(mode=>[mode,valid.filter(row=>row.hunt_mode===mode).length]));
  const zoneCount=new Set(valid.map(row=>row.zone_id)).size;
  const effortCount=valid.filter(row=>Number.isInteger(row.search_minutes)&&row.search_minutes>0).length;
  const snapshotLinkCount=valid.filter(row=>Boolean(row.forecast_snapshot_id||row.weather_snapshot?.snapshotId)).length;
  const exclusionReasons=source.filter(row=>!isCalibrationEligibleForBinding(row,binding)).flatMap(row=>calibrationEligibilityIssues(row,binding));
  const exclusionCounts=Object.fromEntries([...new Set(exclusionReasons)].sort().map(reason=>[reason,exclusionReasons.filter(value=>value===reason).length]));
  return {status:'coverage-only',calibrationLocked:true,sampleSize:valid.length,excludedCount:source.length-valid.length,sourceCount:source.length,successCount:successful.length,noFindCount:unsuccessful.length,successRate:valid.length?Number((successful.length/valid.length).toFixed(3)):null,zoneCount,modes,effortCount,snapshotLinkCount,modelBinding:binding,exclusionCounts,suggestions:[],generatedAt:new Date().toISOString(),policy:'integrated-trip-schema3-current-binding-coverage-only-until-explicit-rdks-activation'};
}
export function analyzeObservations(){return analyzeObservationRows(getLocalObservations());}
