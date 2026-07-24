import { getLocalObservations } from "./observation-service.js";

const finite = value => Number.isFinite(Number(value));
const found = row => row.result && !["none", "no"].includes(row.result);
const average = values => values.length ? values.reduce((sum,value)=>sum+value,0)/values.length : null;
function groupRate(rows, selector) {
  const groups = new Map();
  for (const row of rows) { const key=selector(row); if(key==null) continue; const group=groups.get(key)||[]; group.push(row); groups.set(key,group); }
  return [...groups].map(([key,items])=>({key,count:items.length,successRate:items.filter(found).length/items.length})).filter(item=>item.count>=3).sort((a,b)=>b.successRate-a.successRate);
}
export function analyzeObservationRows(rows = []) {
  const valid=rows.filter(row=>row?.zone_id&&row?.observed_at&&row?.weather_snapshot);
  if(valid.length<8) return {status:"collecting",sampleSize:valid.length,minimumSampleSize:8,suggestions:[]};
  const successful=valid.filter(found), unsuccessful=valid.filter(row=>!found(row));
  const metricDiff=(field,label,unit)=>{const yes=successful.map(r=>r[field]).filter(finite).map(Number), no=unsuccessful.map(r=>r[field]).filter(finite).map(Number);if(yes.length<3||no.length<3)return null;const delta=average(yes)-average(no);if(Math.abs(delta)<0.05)return null;return {metric:field,label,delta:Number(delta.toFixed(2)),unit,evidence:`Fund: ${average(yes).toFixed(1)} ${unit}; ingen fund: ${average(no).toFixed(1)} ${unit}`};};
  const suggestions=[metricDiff("water_level_cm","vandstand","cm"),metricDiff("wind_speed_mps","vindstyrke","m/s"),metricDiff("wave_height_m","bølgehøjde","m")].filter(Boolean);
  const zones=groupRate(valid,row=>row.zone_id).slice(0,5);
  return {status:"ready",sampleSize:valid.length,successCount:successful.length,successRate:Number((successful.length/valid.length).toFixed(3)),suggestions,zones,generatedAt:new Date().toISOString(),policy:"advisory-only"};
}
export function analyzeObservations(){return analyzeObservationRows(getLocalObservations());}
