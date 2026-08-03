import { evaluateRules } from '../core/rule-engine.js?v=4.0.93';

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
  let adminRules = [];
  try { adminRules = JSON.parse(localStorage.getItem('ravradar-admin-rules-v1') || '[]'); } catch {}
  cachedRules = [...results.flat(), ...adminRules].filter(rule => rule.status === 'active');
  return cachedRules;
}

export async function applyKnowledgeRules(input) {
  const rules = await loadActiveRules();
  return evaluateRules({ ...input, rules });
}
