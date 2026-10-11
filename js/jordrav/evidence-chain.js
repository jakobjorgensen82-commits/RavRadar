import { searchContext } from './search-context.js?v=4.0.573';
import { landscapeContext } from './landscape-context.js?v=4.0.573';
export const EVIDENCE_CHAIN_VERSION='0.1.0';
// An order for investigating missing evidence, not a ranking of find chances.
// No names, known finds, coastline distances, heights or numerical bonuses.
export function evidenceChain(entry) {
  const physical=searchContext(entry),landscape=landscapeContext(entry),types=physical.upper.types;
  const unknown=entry.potential==='unresolved',legacy=entry.source==='soil-old';
  const covered=types.some(t=>['organic','aeolian'].includes(t));
  const fine=types.some(t=>['fine','organic','alternating','variant'].includes(t));
  const mappedTransport=['meltwater','erosion','pushed','shore','till','older-till'].includes(entry.process);
  const mappedReceiver=['coastal','basin'].includes(entry.potential)||['marine','shore','basin'].includes(entry.process);
  const priority=unknown?'resolve-input':legacy?'resolve-scale':entry.potential==='limited'?'loose-cover':covered?'cover-depth':
    entry.potential==='possible'?'trace-supply':fine?'receiver-profile':'surface-link';
  return {version:EVIDENCE_CHAIN_VERSION,priority,
    source:'unverified',transport:unknown?'unknown':landscape.chronology==='younger-on-raised'?'separate-episodes':mappedTransport?'mapped-process':'unverified',
    receiver:unknown?'unknown':mappedReceiver?'mapped-environment':'unverified',
    preservation:unknown?'unknown':covered?'possible-cover':fine?'possible-fine':'unverified',
    access:'unknown',steps:[priority,'local-profile','supply-check']};
}
