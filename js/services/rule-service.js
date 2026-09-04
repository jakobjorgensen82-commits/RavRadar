import { evaluateRules } from '../core/rule-engine.js?v=4.0.322';

let cachedRules = null;

export async function loadActiveRules() {
  if (cachedRules) return cachedRules;
  const files = ['./rules/national-rules.json', './rules/local-rules.json', './rules/experimental-rules.json'];
  const results = await Promise.all(files.map(async url => {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data.rules) ? data.rules : [];
    } catch { return []; }
  }));
  // Denne service er kun bevaret til versionsstyret forskning og historiske
  // analyser. Den offentlige integrerede RavScore anvender ikke disse regler.
  // Centralt gemte administratorregler må hverken publiceres eller påvirke
  // RavScore gennem denne service.
  cachedRules = results.flat().filter(rule => rule.status === 'active');
  return cachedRules;
}

export async function applyKnowledgeRules(input) {
  const rules = await loadActiveRules();
  return evaluateRules({ ...input, rules });
}
