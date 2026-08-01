const n=v=>Number.isFinite(Number(v))?Number(v):null;
const clamp=(v,min=0,max=100)=>Math.min(max,Math.max(min,v));

export function classifyCoastalZone(zone={}){
  const type=String(zone.coastType||'unknown').toLowerCase();
  const tags=[];
  if(type==='west') tags.push('open-exposed-coast');
  if(type==='east') tags.push('sheltered-or-semi-exposed-coast');
  if(zone.reefs) tags.push('reef-or-bar-influence');
  if(zone.shallowWater) tags.push('shallow-water');
  if(zone.seagrass) tags.push('vegetation-retention');
  if(Array.isArray(zone.directionAnchors)&&zone.directionAnchors.length>1) tags.push('curved-or-multi-orientation');
  const name=String(zone.name||'').toLowerCase();
  if(/fjord|limfjord|mariager|randers fjord|roskilde fjord/.test(name)) tags.push('fjord-system');
  if(/odde|næs|gren|spids/.test(name)) tags.push('headland');
  return {primary:type,tags:[...new Set(tags)],confidence:'heuristic'};
}

export function evaluateTransportEvent({history={},weather={},zone={}}={}){
  const maxWind=n(history.maxWind24hMps),maxWave=n(history.maxWave24hM),hours=n(history.hoursSinceHighEnergy);
  const current=n(weather.currentSpeedMps),trend=n(weather.waterLevelTrendCm3h),wave=n(weather.waveHeightM);
  const directionAlignment=n(weather.currentAlignment ?? weather.currentAlignmentScore);
  let mobilisation=0;
  if(maxWind!==null) mobilisation += maxWind>=14?55:maxWind>=9?32:12;
  if(maxWave!==null) mobilisation += maxWave>=2?35:maxWave>=1.2?22:5;
  mobilisation=clamp(mobilisation);
  let timing=35;
  if(hours!==null){ if(hours>=3&&hours<=18) timing=90; else if(hours<=36) timing=65; else if(hours>72) timing=15; }
  let continuation=35;
  if(current!==null) continuation += current>=.15&&current<=.65?35:current>.65?15:-10;
  if(trend!==null) continuation += Math.abs(trend)>=8?12:0;
  const coast=classifyCoastalZone(zone);
  const retention=(zone.reefs?12:0)+(zone.seagrass?12:0)+(zone.shallowWater?8:0)+(coast.tags.includes('headland')?6:0);
  let remobilisation=18;
  if(wave!==null) remobilisation += wave>=.25&&wave<=1.2?28:wave>1.2?18:4;
  if(current!==null) remobilisation += current>=.12&&current<=.65?22:current>.65?10:0;
  if(trend!==null&&Math.abs(trend)>=6) remobilisation += 10;
  remobilisation += Math.min(12,retention);
  remobilisation=clamp(remobilisation);
  const freshPath=clamp(Math.round(mobilisation*.58+timing*.27+continuation*.15));
  const remobilisationPath=clamp(Math.round(remobilisation*.65+continuation*.25+retention*.1));
  const dominantPathway=freshPath>=remobilisationPath?'fresh-release':'nearshore-remobilisation';
  const index=clamp(Math.max(freshPath,remobilisationPath)+(freshPath>=65&&remobilisationPath>=50?6:0));
  const phase = dominantPathway==='nearshore-remobilisation'
    ? 'genmobiliseringsfase'
    : mobilisation<30?'rolig fase':hours===null?'ukendt fase':hours<3?'højenergifase':hours<=18?'efterstorm/transportfase':hours<=48?'aflejringsfase':'sen efterfase';
  return {index,phase,dominantPathway,freshPath,remobilisationPath,mobilisation:Math.round(mobilisation),remobilisation:Math.round(remobilisation),timing:Math.round(timing),continuation:Math.round(continuation),retention:Math.round(retention),coast};
}
