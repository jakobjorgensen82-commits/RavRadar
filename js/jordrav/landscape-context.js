// Source-bound landscape interpretation. Neither a local date nor exposure proof.
export const LANDSCAPE_CONTEXT_VERSION = '0.1.0';
const definitions = {
  lake:['Sø',[0],'water'],
  tillPlain:['Bundmoræneflade',[1],'till'],
  drumlin:['Drumlin',[2],'till'],
  tunnelValley:['Tunneldal',[4],'tunnel-valley'],
  esker:['Ås',[5],'esker'],
  deadIce:['Dødislandskab',[8],'dead-ice'],
  kettle:['Dødishul',[9],'kettle'],
  lakeHill:['Issøbakke',[10],'lake-hill'],
  moraine:['Randmorænebakke',[13],'ice-margin'],
  overridden:['Isoverskredet randmoræne',[15],'ice-margin'],
  olderTill:['Ældre moræneflade',[16],'till'],
  outwash:['Hedeslette',[19],'outwash'],
  raisedPlain:['Hævet senglacial flade',[20,50],'raised-plain'],
  hummockyOutwash:['Hedeslette dødislandskab',[21],'outwash'],
  erosionValley:['Erosionsdal',[22],'erosion-valley'],
  iceLake:['Issøflade',[23],'ice-lake'],
  raisedRidge:['Hævet senglacial strandvold',[24,50,54],'raised-ridge'],
  marine:['Marin flade',[25],'marine'],
  marsh:['Marsk',[26],'marsh'],
  ridge:['Strandvold',[27],'beach-ridge'],
  delta:['Delta',[28],'delta'],
  lakePlain:['Søbund',[29],'lake-plain'],
  bog:['Mose',[30],'bog'],
  dune:['Klit',[32],'dune'],
  windPlain:['Flyvesandsflade',[33],'wind-plain'],
  tectonic:['Spaltedal',[34],'bedrock'],
  reclaimedLake:['Tørlagt ferskvandssø',[35],'reclaimed-lake'],
  reclaimedMarine:['Tørlagt marint forland',[36],'reclaimed-marine'],
  human:['Antropogent landskab',[37],'human'],
  tidalFlat:['Tidevandsflade',[42],'tidal'],
  tidalInlet:['Tidevandsdyb',[44],'tidal'],
  bedrock:['Grundfjeld',[46],'bedrock'],
  chalk:['Kalkmassiv',[47],'bedrock'],
  missing:['Ikke kortlagt',[null],'unknown']
};
export const LANDSCAPES = Object.freeze(Object.fromEntries(Object.entries(definitions).map(([key,[name,codes,route]])=>
  [key,Object.freeze({name,codes:Object.freeze(codes),route})])));
export const LANDSCAPE_ROUTES = Object.freeze([...new Set(Object.values(LANDSCAPES).map(item=>item.route))]);
// Exact codes from GEUS 2025/32. Never derive geological age from one letter,
// a historic 1:200,000 symbol or the landscape's numeric code alone.
const origins = {
  freshwater:['FG','FS','FI','FL','FP','FT','FV','FK','FJ'],
  delta:['FHG','FHS','FHL'],
  marine:['HG','HS','HSG','HI','HL','HP','HT','HV','HV-L','HV-S'],
  aeolian:['EK','ES'],
  'late-marine':['YG','YS','YL','YP']
};
export function upperSedimentHistory(entry) {
  if(entry.source==='soil-old')return 'legacy';
  if(entry.potential==='unresolved'||!entry.surface)return 'unresolved';
  const parts=['HV-L','HV-S'].includes(entry.surface)?[entry.surface]:entry.surface.split('-');
  const groups=[...new Set(parts.map(part=>Object.keys(origins).find(key=>origins[key].includes(part))||'other'))];
  return groups.length===1?groups[0]:'mixed';
}
export function landscapeContext(entry) {
  // Code 50 has two source labels in this dataset. Both must survive.
  const key=Object.keys(LANDSCAPES).find(key=>LANDSCAPES[key].name===entry.landscape&&LANDSCAPES[key].codes.includes(entry.landscapeCode));
  const route=key?LANDSCAPES[key].route:'unknown';
  const history=upperSedimentHistory(entry);
  const raised=['raised-plain','raised-ridge'].includes(route);
  const chronology=history==='legacy'?'legacy':history==='unresolved'?'unresolved':
    raised&&['freshwater','delta','marine','aeolian'].includes(history)?'younger-on-raised':
    raised&&history==='late-marine'?'late-on-raised':'separate';
  return {key:key||null,route,history,chronology,huntability:'unknown'};
}
