const finite = value => Number.isFinite(Number(value));
export const normalizeDeg = value => ((Number(value) % 360) + 360) % 360;
export const angularDifference = (a,b) => Math.abs(((normalizeDeg(a)-normalizeDeg(b)+540)%360)-180);
export function directionAlignment(directionDeg,targetDeg){
  if(!finite(directionDeg)||!finite(targetDeg)) return null;
  const d=angularDifference(directionDeg,targetDeg);
  if(d<=25)return 1;if(d<=55)return .65;if(d<=90)return .2;if(d<=130)return -.35;return -.8;
}
export function normalizeDirectionAnchors(zone={}){
  const raw=Array.isArray(zone.directionAnchors)&&zone.directionAnchors.length?zone.directionAnchors:[{
    id:'primary',name:'Primær kystdel',dataPoint:zone.dataPoint,pinPoint:zone.pinPoint,onshoreDirectionDeg:zone.onshoreDirectionDeg,weight:1,verified:zone.onshoreDirectionReviewStatus==='manually-verified'
  }];
  return raw.map((a,index)=>({
    id:String(a.id||`anchor-${index+1}`),name:String(a.name||`Kystdel ${index+1}`),
    dataPoint:Array.isArray(a.dataPoint)?a.dataPoint.map(Number):null,
    pinPoint:Array.isArray(a.pinPoint)?a.pinPoint.map(Number):null,
    onshoreDirectionDeg:finite(a.onshoreDirectionDeg)?normalizeDeg(a.onshoreDirectionDeg):null,
    weight:finite(a.weight)?Math.max(.1,Number(a.weight)):1,
    verified:Boolean(a.verified||a.reviewStatus==='verified')
  })).filter(a=>a.onshoreDirectionDeg!==null);
}
export function evaluateDirectionAnchors(zone,currentDirectionDeg){
  const anchors=normalizeDirectionAnchors(zone);
  const rows=anchors.map(a=>({...a,alignment:directionAlignment(currentDirectionDeg,a.onshoreDirectionDeg),differenceDeg:finite(currentDirectionDeg)?angularDifference(currentDirectionDeg,a.onshoreDirectionDeg):null}));
  const valid=rows.filter(r=>r.alignment!==null);
  if(!valid.length)return {anchors:rows,effectiveAlignment:null,primaryAnchor:null,method:'no-direction-data'};
  const best=[...valid].sort((a,b)=>b.alignment-a.alignment)[0];
  const positive=valid.filter(r=>r.alignment>0);
  let effectiveAlignment;
  let method;
  if(positive.length){
    const weightedAverage=positive.reduce((s,r)=>s+r.alignment*r.weight,0)/positive.reduce((s,r)=>s+r.weight,0);
    effectiveAlignment=Math.max(-.8,Math.min(1,best.alignment*.7+weightedAverage*.3));
    method=valid.length>1?'best-exposed-plus-weighted-support':'single-anchor';
  }else{
    effectiveAlignment=best.alignment;
    method=valid.length>1?'least-offshore-anchor':'single-anchor';
  }
  return {anchors:rows,effectiveAlignment,primaryAnchor:best,method};
}
export function anchorClassification(alignment){
  if(alignment===null)return'unknown';if(alignment>=.65)return'onshore';if(alignment>=.2)return'partly-onshore';if(alignment<=-.75)return'strongly-offshore';if(alignment<=-.35)return'offshore';return'cross-shore';
}
export function buildCoastTransportExplanation(evaluation){
  if(!evaluation?.anchors?.length)return {summary:'RavRadar mangler en verificeret lokal kystretning for området.',items:[]};
  const labels={onshore:'gunstig indtransport', 'partly-onshore':'delvis indtransport','cross-shore':'strøm langs kysten',offshore:'strøm væk fra land','strongly-offshore':'kraftig strøm væk fra land',unknown:'ukendt retning'};
  const items=evaluation.anchors.map(a=>({id:a.id,name:a.name,classification:anchorClassification(a.alignment),differenceDeg:a.differenceDeg,onshoreDirectionDeg:a.onshoreDirectionDeg,weight:a.weight,selected:a.id===evaluation.primaryAnchor?.id,text:`${a.name}: ${labels[anchorClassification(a.alignment)]}.`}));
  const best=evaluation.primaryAnchor;
  let summary;
  if(items.length===1) summary=items[0].classification.includes('offshore')?'Strømmen går væk fra denne kyststrækning, så indtransporten begrænses.':'Strømmen vurderes mod den lokale kystretning for denne strækning.';
  else if(best?.alignment>=.65) summary=`Området bugter sig. Lige nu rammer strømmen mest gunstigt ved ${best.name}, som derfor vægter højest i transportvurderingen.`;
  else if(best?.alignment>=.2) summary=`Området har flere kystretninger. ${best.name} har den mest gunstige, men kun delvise, indtransport lige nu.`;
  else summary='Strømmen går væk fra eller langs alle kontrollerede kystdele, så transporten mod land begrænses.';
  return {summary,items,method:evaluation.method,selectedAnchorId:best?.id||null};
}
