// Search guidance uses mapped lithology, never a find score or exposure claim.
// Marine peat/gyttja and alternating beds are deliberately distinct from clay.
export const SEARCH_CONTEXT_VERSION = '0.1.0';
export const PHYSICAL_TYPES = Object.freeze({
  coarse: ['DS','DG','TS','TG','ZS','ZG','HS','HG','HSG','YS','YG','QS','QG','FS','FG','FHS','FHG','S','G'],
  fine: ['DI','DL','TI','TL','ZL','ZI','HI','HL','YL','QL','FI','FL','FHL'],
  organic: ['FT','FP','IT','HP','HT','YP'],
  aeolian: ['ES','EK'],
  alternating: ['DV','TV','ZV','HV','FV'],
  variant: ['HV-L','HV-S'],
  till: ['ML','MS','MG','MI','MV','KML','KMS','KMG'],
  chemical: ['FK','FJ'],
  older: ['GS','GL','GV','GC','KS','LL','OL','PL','PS','RL','SL','ED','EE'],
  rock: ['BK','K','SK','ZK']
});
const oldTypes = {
  coarse:['DSG','HG'], fine:['DL'], till:['ML','MSG'],
  aeolian:['ES'], alternating:['HV'], broad:['F','HSL','Y','T'],
  older:['ED','GC','GL','GS','KS','LL','OL','PL','BS','CV','JV','KA','RG'],
  rock:['GNG','HAG','PAM','ROG','SVG','VAG','EQ','KQ','AF','SK','ZK']
};
export function physicalContext(code, older = false) {
  const combinedSymbol = !older && ['HV-L','HV-S'].includes(code);
  const parts = combinedSymbol ? [code] : (code || '').split('-');
  const lookup = older ? oldTypes : PHYSICAL_TYPES;
  const types = [...new Set(parts.map(part => Object.keys(lookup).find(type => lookup[type].includes(part)) || 'unknown'))];
  return {types, lateralMixture:parts.length > 1};
}

export function searchContext(entry) {
  const older = entry.source === 'soil-old';
  const upper = physicalContext(entry.surface, older);
  const lower = older ? null : physicalContext(entry.depth);
  const relationship = older ? 'old' : !entry.surface || !entry.depth ||
    upper.types.includes('unknown') || lower.types.includes('unknown') ? 'unknown' :
    entry.surface === entry.depth ? 'same' : 'different';
  // The potential category and geometry are unchanged. A physical profile
  // explains how to inspect it, including general and unresolved areas.
  const tasks = entry.potential === 'unresolved' ? ['unknown'] : upper.types;
  return {upper, lower, relationship, tasks,
    missingLink: entry.potential === 'covered' ? 'cover' :
      entry.potential === 'possible' ? 'general' :
      entry.potential === 'limited' ? 'rock' :
      entry.potential === 'unresolved' ? 'unknown' : 'supply'};
}
