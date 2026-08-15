import { scoreRating } from './score-engine.js?v=4.0.217';

const finite = value => Number.isFinite(Number(value));
const coverageReason = value => Number(value?.comparisonPartCount) <= 1
  ? 'Der er kun beregnet én kystdel. Derfor kan forskelle inden for zonen endnu ikke sammenlignes.'
  : value?.status === 'whole-zone'
  ? 'Kystdelene ligger højst 7 point fra hinanden, så scoren gælder hele zonen.'
  : value?.status === 'only-part'
    ? `${value.winningPartName} scorer mere end 7 point bedre end en eller flere andre dele af zonen.`
    : `Flere navngivne kystdele ligger inden for 7 point af zonens højeste score.`;

export function localCoverageSummary(value) {
  if (!value || !finite(value.score)) return null;
  if (Number(value.comparisonPartCount) <= 1) return {
    kind:'single-part',
    title:'Kun én kystdel er beregnet',
    text:'Der er ikke flere beregnede kystdele at sammenligne. Det betyder ikke, at forholdene nødvendigvis er ens i hele zonen.'
  };
  if (value.status === 'whole-zone') return {
    kind:'whole-zone',
    title:'Forholdene gælder hele zonen',
    text:`Forskellen mellem zonens kystdele er ${value.scoreSpread} point og dermed højst 7 point.`
  };
  const parts=(value.parts || []).filter(part=>finite(part.score));
  return {
    kind:value.status,
    title:value.status === 'only-part' ? `Bedste del: ${value.winningPartName}` : 'Bedste dele af zonen',
    text:value.status === 'only-part'
      ? `${value.winningPartName} har RavScore ${value.score}. Det er denne del – ikke nødvendigvis resten af zonen – som giver zonen dens viste score.`
      : `Disse kystdele ligger inden for 7 point af den bedste: ${parts.map(part=>`${part.name} (${part.score})`).join(', ')}. Andre dele af zonen scorer lavere.`,
    parts
  };
}

export function buildLocalZoneScore({coastalParts,zoneId,mode,time}) {
  const rows=coastalParts?.zones?.[zoneId]?.hourly || [];
  if(!coastalParts?.enabled || !rows.length)return null;
  const target=Date.parse(time || coastalParts.generatedAt || new Date().toISOString());
  const row=rows.reduce((best,item)=>Math.abs(Date.parse(item.time)-target)<Math.abs(Date.parse(best.time)-target)?item:best,rows[0]);
  const rawValue=row?.[mode];
  const value=rawValue ? {...rawValue,comparisonPartCount:Number(rawValue.comparisonPartCount ?? coastalParts?.zones?.[zoneId]?.expectedPartCount ?? 0)} : rawValue;
  if(!finite(value?.score) || value.status === 'uncertain')return {available:false,score:null,level:'unavailable',label:'Lokale data mangler',localCoverage:value||null};
  const rating=scoreRating(value.score);
  const winner=coastalParts.parts?.[value.winningPartId];
  const exact=winner?.current?.time === row.time ? winner.current?.[mode] : null;
  const components=exact?.components || value.components || {};
  const detailedReasons=exact?.componentReasons || {};
  const generic=coverageReason(value);
  const componentReasons=Object.fromEntries(['huntability','transport','release'].map(key=>[
    key,
    detailedReasons[key]?.length ? detailedReasons[key] : finite(components[key]) ? [generic] : []
  ]));
  return {
    available:true,score:value.score,baseScore:value.score,level:rating.level,label:rating.label,
    components,componentReasons,reasons:[generic],localCoverage:value,localCoverageSummary:localCoverageSummary(value),
    explanation:exact?.explanation || null,localPart:true,time:row.time,
    localPartId:value.winningPartId,localPartName:value.winningPartName,
    localWeather:winner?.current?.weather || null,
    localZone:winner ? {
      id:value.winningPartId,name:winner.name,
      dataPoint:winner.waterPoint,pinPoint:winner.landPoint,
      onshoreDirectionDeg:winner.onshoreDirectionDeg,
      onshoreDirectionSource:winner.onshoreDirectionSource || 'Godkendt land-/havpunkt for kystdelen'
    } : null
  };
}
