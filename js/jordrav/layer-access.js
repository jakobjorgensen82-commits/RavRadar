// Investigation guidance only. No measured depth, exposure or amber score.
import { searchContext } from './search-context.js?v=4.0.573';
export const LAYER_ACCESS_VERSION = '0.1.0';
export const LAYER_ACCESS_KINDS = Object.freeze([
  'unresolved', 'legacy', 'variant', 'repeated',
  'cover-contact', 'mixed-cover-contact', 'sediment-contact'
]);
export function layerAccessPlan(entry) {
  const { upper, lower, relationship } = searchContext(entry);
  let kind;
  if (entry.potential === 'unresolved' || relationship === 'unknown') kind = 'unresolved';
  else if (relationship === 'old') kind = 'legacy';
  else if ([...upper.types, ...lower.types].includes('variant')) kind = 'variant';
  else if (relationship === 'same') kind = 'repeated';
  else if (upper.types.some(type => ['organic', 'aeolian'].includes(type))) {
    kind = upper.lateralMixture ? 'mixed-cover-contact' : 'cover-contact';
  } else kind = 'sediment-contact';
  const steps = {
    unresolved: ['resolve-record', 'local-profile'],
    legacy: ['local-profile', 'compare-worked'],
    variant: ['resolve-variant', 'local-profile', 'compare-worked'],
    repeated: ['compare-worked', 'check-identity'],
    'cover-contact': ['upper-receiver', 'locate-contact', 'compare-worked'],
    'mixed-cover-contact': ['separate-patches', 'upper-receiver', 'locate-contact'],
    'sediment-contact': ['locate-contact', 'check-identity', 'compare-worked']
  }[kind].slice();
  // A combined lower symbol also needs lateral clarification. It does not
  // become a sequence of beds merely because it appears in JSYM2.
  if (kind !== 'unresolved' && kind !== 'mixed-cover-contact' &&
      (upper.lateralMixture || lower?.lateralMixture)) steps.unshift('separate-patches');
  return { kind, upper, lower, relationship, steps, huntability: 'unknown' };
}
