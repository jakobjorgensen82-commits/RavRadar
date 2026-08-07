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


function formatHours(value) {
  const hours=n(value);
  if(hours===null)return null;
  if(hours<1)return 'under 1 time';
  const rounded=Math.round(hours*10)/10;
  return `${String(rounded).replace('.',',')} ${Math.abs(rounded-1)<.05?'time':'timer'}`;
}

export function buildStateExplanation(history={}) {
  const mode=history.stateModelMode||null;
  if(!mode)return null;
  const phase=history.eventPhase||'ukendt fase';
  const inbound=n(history.inboundCurrentDurationHours);
  const inboundMomentum=n(history.inboundCurrentMomentum);
  const outbound=n(history.outboundCurrentDurationHours);
  const outboundPressure=n(history.outboundCurrentPressure);
  const eventDuration=n(history.strongEventDurationHours);
  const sinceEvent=n(history.hoursSinceStrongEventEnd);
  const mobilisation=n(history.mobilisationPotential);
  const nearshore=n(history.nearshorePotential);
  const stability=n(history.activeCurrentRegimeStability ?? history.currentDirectionStability);
  const activeRegime=history.activeCurrentRegime||null;
  const activeDuration=n(history.activeCurrentRegimeDurationHours);
  const facts=[];
  if(eventDuration!==null&&eventDuration>0){
    const age=sinceEvent===null?'':` og sluttede for ${formatHours(sinceEvent)} siden`;
    facts.push(`En kraftig energihændelse varede cirka ${formatHours(eventDuration)}${age}.`);
  }
  if(inbound!==null&&inbound>0){
    const strength=inboundMomentum===null?'':inboundMomentum>=65?' med stærkt akkumuleret transportbidrag':inboundMomentum>=30?' med tydeligt akkumuleret transportbidrag':' med et foreløbigt transportbidrag';
    facts.push(`Strømmen har haft en indadgående komponent i cirka ${formatHours(inbound)}${strength}.`);
  }
  if(outbound!==null&&outbound>0){
    const strength=outboundPressure===null?'':outboundPressure>=55?' og giver et stærkt udtransporttryk':outboundPressure>=25?' og giver et mærkbart udtransporttryk':' og giver et mindre udtransporttryk';
    facts.push(`Strømmen har også bevæget sig væk fra kysten i cirka ${formatHours(outbound)}${strength}.`);
  }
  if(activeRegime==='inbound'&&activeDuration!==null&&activeDuration>0)facts.push(`Det aktuelle sammenhængende indtransportforløb har varet cirka ${formatHours(activeDuration)}.`);
  else if(activeRegime==='outbound'&&activeDuration!==null&&activeDuration>0)facts.push(`Det aktuelle sammenhængende udtransportforløb har varet cirka ${formatHours(activeDuration)}.`);
  else if(activeRegime==='unavailable')facts.push('Den seneste strømprøve kunne ikke verificeres som marin DMI-strøm og tæller derfor ikke med i transporthistorikken.');
  if(stability!==null&&activeRegime&&activeRegime!=='unavailable'&&activeRegime!=='neutral'){
    if(stability>=.75)facts.push('Strømretningen har været forholdsvis stabil.');
    else if(stability<.4)facts.push('Strømretningen har skiftet en del, så transportforløbet er mere usikkert.');
  }
  let summary='RavRadar har endnu ikke nok historik til en sikker tilstandsvurdering.';
  if(phase==='højenergifase')summary='Der er høj energi nu eller meget nyligt. Rav kan være blevet mobiliseret, men jagtforholdene kan stadig være vanskelige.';
  else if(phase==='efterstorm/indtransport')summary='En tidligere kraftig hændelse efterfølges nu af indadgående strøm. Potentialet ved kysten er derfor under opbygning.';
  else if(phase==='vedvarende nærkystpotentiale')summary='Der forventes fortsat et nærkystpotentiale fra tidligere gunstige forhold, selv om der ikke nødvendigvis kommer nyt rav ind lige nu.';
  else if(phase==='udtransport/nedbrydning')summary='Tidligere potentiale bliver sandsynligvis reduceret, fordi strømmen gennem en periode har ført materiale væk fra kysten.';
  else if(phase==='indtransport opbygges')summary='Strømmen har en indadgående komponent, og transportpotentialet stiger gradvist jo længere forholdet varer.';
  else if(phase==='rolig fase'&&nearshore!==null&&nearshore<25)summary='Der er kun svage tegn på en aktiv transport- eller mobiliseringshændelse i den tilgængelige historik.';
  const confidence = [inbound,outbound,mobilisation,nearshore].filter(v=>v!==null).length>=3 ? 'beregnet' : 'foreløbig';
  return {phase,summary,facts,confidence,mobilisationPotential:mobilisation,nearshorePotential:nearshore};
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
  const shadowState={
    mode:history.stateModelMode||null,
    eventPhase:history.eventPhase||null,
    strongEventDurationHours:n(history.strongEventDurationHours),
    hoursSinceStrongEventEnd:n(history.hoursSinceStrongEventEnd),
    inboundCurrentDurationHours:n(history.inboundCurrentDurationHours),
    inboundCurrentMomentum:n(history.inboundCurrentMomentum),
    outboundCurrentDurationHours:n(history.outboundCurrentDurationHours),
    outboundCurrentPressure:n(history.outboundCurrentPressure),
    activeCurrentRegime:history.activeCurrentRegime||null,
    activeCurrentRegimeDurationHours:n(history.activeCurrentRegimeDurationHours),
    activeCurrentRegimeMomentum:n(history.activeCurrentRegimeMomentum),
    activeCurrentRegimeStability:n(history.activeCurrentRegimeStability),
    verifiedCurrentCoverageHours:n(history.verifiedCurrentCoverageHours),
    unverifiedCurrentSampleCount:n(history.unverifiedCurrentSampleCount),
    currentDirectionStability:n(history.currentDirectionStability),
    mobilisationPotential:n(history.mobilisationPotential),
    nearshorePotential:n(history.nearshorePotential)
  };
  const stateExplanation=buildStateExplanation(history);
  return {index,phase,dominantPathway,freshPath,remobilisationPath,mobilisation:Math.round(mobilisation),remobilisation:Math.round(remobilisation),timing:Math.round(timing),continuation:Math.round(continuation),retention:Math.round(retention),coast,shadowState,stateExplanation};
}
