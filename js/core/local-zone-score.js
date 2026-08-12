import { scoreRating } from './score-engine.js?v=4.0.191';

const finite = value => Number.isFinite(Number(value));
const coverageReason = value => value?.status === 'whole-zone'
  ? 'Kystdelene ligger højst 7 point fra hinanden, så scoren gælder hele zonen.'
  : value?.status === 'only-part'
    ? `${value.winningPartName} scorer mere end 7 point bedre end en eller flere andre dele af zonen.`
    : `Flere navngivne kystdele ligger inden for 7 point af zonens højeste score.`;

export function localCoverageSummary(value) {
  if (!value || !finite(value.score)) return null;
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
  const value=row?.[mode];
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
    explanation:exact?.explanation || null,localPart:true,time:row.time
  };
}
