import { evaluateDirectionAnchors } from './direction-anchors.js?v=4.0.290';
function finite(v){const n=Number(v);return Number.isFinite(n)?n:null;}
function norm(v){return ((Number(v)%360)+360)%360;}
export function directionFromComponents(u,v){
  const east=finite(u),north=finite(v);if(east===null||north===null)return null;
  return norm(Math.atan2(east,north)*180/Math.PI);
}
export function arrowDirection(type,directionDeg){const d=finite(directionDeg);if(d===null)return null;return norm(d+(type==='wind'?180:0));}
export function auditCurrentDirection(zone,weather={}){
  const provided=finite(weather.currentDirectionDeg??weather.currentDirectionTowardsDeg);
  const fromUv=directionFromComponents(weather.currentUMps??weather.currentU,weather.currentVMps??weather.currentV);
  const movement=provided??fromUv;
  const anchors=evaluateDirectionAnchors(zone,movement);
  const primary=anchors.primaryAnchor?.onshoreDirectionDeg??finite(zone?.onshoreDirectionDeg);
  const difference=movement===null||primary===null?null:Math.abs(((movement-primary+540)%360)-180);
  const alignment=anchors.effectiveAlignment;
  const classification=alignment===null?'ukendt':alignment>=.65?'ind mod land':alignment>=.2?'skråt ind/langs kysten':alignment<=-.35?'væk fra land':'mest langs kysten';
  return {zoneId:zone?.id,zoneName:zone?.name,rawU:finite(weather.currentUMps??weather.currentU),rawV:finite(weather.currentVMps??weather.currentV),providedDirectionDeg:provided,computedFromUvDeg:fromUv,displayedArrowDeg:arrowDirection('current',movement),onshoreDirectionDeg:primary,differenceDeg:difference,alignment,classification,currentSpeedMps:finite(weather.currentSpeedMps),anchorMethod:anchors.method,anchors:anchors.anchors};
}
