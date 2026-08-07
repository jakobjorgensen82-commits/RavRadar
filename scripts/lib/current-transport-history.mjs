const finite=value=>value===null||value===undefined||value===''||typeof value==='boolean'?null:(Number.isFinite(Number(value))?Number(value):null);
const round=(value,digits=2)=>Number.isFinite(value)?Number(value.toFixed(digits)):null;
const clamp=(value,min=0,max=100)=>Math.min(max,Math.max(min,value));
const atMs=sample=>Date.parse(sample?.at||'');

export function currentRegime(sample={}){
  if(sample.currentVerified!==true)return 'unavailable';
  const alignment=finite(sample.currentAlignment),speed=finite(sample.currentSpeedMps);
  if(alignment===null||speed===null||speed<=0)return 'neutral';
  if(alignment>=.2)return 'inbound';
  if(alignment<=-.35)return 'outbound';
  return 'neutral';
}

function intervalHours(samples,index){
  const start=atMs(samples[index]);
  if(!Number.isFinite(start))return 0;
  const next=index+1<samples.length?atMs(samples[index+1]):start+3600000;
  if(!Number.isFinite(next)||next<=start)return 0;
  return Math.max(0,Math.min(2,(next-start)/3600000));
}

function accumulated(samples,regime){
  let duration=0,momentum=0;
  for(let i=0;i<samples.length;i+=1){
    const sample=samples[i];
    if(currentRegime(sample)!==regime)continue;
    const hours=intervalHours(samples,i);
    const alignment=finite(sample.currentAlignment)??0;
    const speed=finite(sample.currentSpeedMps)??0;
    const strength=regime==='inbound'?Math.max(0,alignment)*speed:Math.abs(Math.min(0,alignment))*speed;
    duration+=hours;momentum+=strength*hours;
  }
  return {durationHours:round(duration,1),rawMomentum:round(momentum,3)};
}

function activeRun(samples){
  if(!samples.length)return {regime:'unavailable',durationHours:0,rawMomentum:0,stability:null,sampleCount:0};
  const end=samples.length-1;
  const regime=currentRegime(samples[end]);
  if(regime==='unavailable')return {regime,durationHours:0,rawMomentum:0,stability:null,sampleCount:0};
  let start=end;
  while(start>0){
    const gap=atMs(samples[start])-atMs(samples[start-1]);
    if(!Number.isFinite(gap)||gap>2*3600000||currentRegime(samples[start-1])!==regime)break;
    start-=1;
  }
  let duration=0,momentum=0;
  const alignments=[];
  for(let i=start;i<=end;i+=1){
    const sample=samples[i];
    const hours=intervalHours(samples,i);
    duration+=hours;
    const alignment=finite(sample.currentAlignment),speed=finite(sample.currentSpeedMps);
    if(alignment!==null)alignments.push(alignment);
    if(speed!==null&&alignment!==null){
      if(regime==='inbound')momentum+=Math.max(0,alignment)*speed*hours;
      if(regime==='outbound')momentum+=Math.abs(Math.min(0,alignment))*speed*hours;
    }
  }
  const stability=alignments.length>=2?clamp(1-(Math.max(...alignments)-Math.min(...alignments))/1.8,0,1):null;
  return {regime,durationHours:round(duration,1),rawMomentum:round(momentum,3),stability:stability===null?null:round(stability,2),sampleCount:end-start+1};
}

export function deriveCurrentTransportHistory(samples=[]){
  const ordered=[...samples].filter(s=>Number.isFinite(atMs(s))).sort((a,b)=>atMs(a)-atMs(b));
  const inbound=accumulated(ordered,'inbound');
  const outbound=accumulated(ordered,'outbound');
  const active=activeRun(ordered);
  let verifiedCoverage=0;
  for(let i=0;i<ordered.length;i+=1)if(ordered[i].currentVerified===true)verifiedCoverage+=intervalHours(ordered,i);
  return {
    inboundCurrentDurationHours:inbound.durationHours,
    inboundCurrentMomentum:round(clamp(inbound.rawMomentum*85),1),
    outboundCurrentDurationHours:outbound.durationHours,
    outboundCurrentPressure:round(clamp(outbound.rawMomentum*85),1),
    activeCurrentRegime:active.regime,
    activeCurrentRegimeDurationHours:active.durationHours,
    activeCurrentRegimeMomentum:round(clamp(active.rawMomentum*85),1),
    activeCurrentRegimeStability:active.stability,
    activeCurrentRegimeSampleCount:active.sampleCount,
    verifiedCurrentCoverageHours:round(verifiedCoverage,1),
    unverifiedCurrentSampleCount:ordered.filter(s=>s.currentVerified!==true).length
  };
}

export function applyCurrentTransportToHistory(history={},samples=[]){
  const current=deriveCurrentTransportHistory(samples);
  const mobilisation=finite(history.mobilisationPotential)??0;
  const nearshore=clamp(mobilisation*.45+current.inboundCurrentMomentum*.65-current.outboundCurrentPressure*.55);
  const strongEnd=finite(history.hoursSinceStrongEventEnd);
  let phase='rolig fase';
  if(strongEnd!==null&&strongEnd<=1)phase='højenergifase';
  else if(strongEnd!==null&&strongEnd<=18&&current.inboundCurrentDurationHours>0)phase='efterstorm/indtransport';
  else if(nearshore>=55)phase='vedvarende nærkystpotentiale';
  else if(current.outboundCurrentPressure>=35)phase='udtransport/nedbrydning';
  else if(current.inboundCurrentDurationHours>0)phase='indtransport opbygges';
  return {...history,...current,currentDirectionStability:current.activeCurrentRegimeStability,nearshorePotential:round(nearshore,1),eventPhase:phase,stateModelMode:'shadow-v2'};
}
