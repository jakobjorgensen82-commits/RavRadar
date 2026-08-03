import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const sourcePath = path.resolve(root, process.argv[2] || 'data/admin/admin-rules.json');
const outputPath = path.resolve(root, process.argv[3] || 'rules/admin-active-rules.json');

const allowedKinds = new Set(['bonus', 'penalty', 'persistence', 'gate', 'override', 'annotation']);
const allowedKnowledgeClasses = new Set(['documented', 'expert', 'data-derived', 'hypothesis']);
const allowedConfidence = new Set(['lav', 'mellem', 'stor']);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cleanRule(rule) {
  if (!isObject(rule) || rule.status !== 'active') return null;
  const id = String(rule.id || '').trim();
  const name = String(rule.name || '').trim();
  const kind = String(rule.kind || '').trim();
  const knowledgeClass = String(rule.knowledgeClass || '').trim();
  const confidence = String(rule.confidence || '').trim();
  const priority = Number(rule.priority);
  const version = Number(rule.version);
  if (id.length < 3) throw new Error('Aktiv administratorregel mangler gyldigt id');
  if (name.length < 3) throw new Error(`${id}: aktiv administratorregel mangler navn`);
  if (!allowedKinds.has(kind)) throw new Error(`${id}: ukendt regeltype ${kind}`);
  if (!allowedKnowledgeClasses.has(knowledgeClass)) throw new Error(`${id}: ukendt vidensklasse ${knowledgeClass}`);
  if (!allowedConfidence.has(confidence)) throw new Error(`${id}: ukendt tillidsniveau ${confidence}`);
  if (!Number.isInteger(priority) || priority < 0 || priority > 10000) throw new Error(`${id}: ugyldig prioritet`);
  if (!Number.isInteger(version) || version < 1) throw new Error(`${id}: ugyldig version`);
  if (!isObject(rule.geography) || !isObject(rule.conditions) || !isObject(rule.effect)) throw new Error(`${id}: geografi, betingelser og effekt skal være objekter`);

  // Kun de felter, som den offentlige regelmotor behøver, publiceres.
  return {
    id,
    name,
    status: 'active',
    kind,
    knowledgeClass,
    confidence,
    priority,
    geography: structuredClone(rule.geography),
    conditions: structuredClone(rule.conditions),
    effect: structuredClone(rule.effect),
    version
  };
}

let source;
try {
  source = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
} catch (error) {
  if (error.code === 'ENOENT') {
    try {
      const existing = JSON.parse(await fs.readFile(outputPath, 'utf8'));
      if (Array.isArray(existing.rules)) {
        console.log(`Central regelfil mangler; bevarer ${existing.rules.length} allerede publicerede administratorregler.`);
        process.exit(0);
      }
    } catch {}
    throw new Error('Central regelfil mangler, og der findes ingen tidligere sikker offentlig regelfil');
  }
  throw error;
}

const inputRules = Array.isArray(source?.rules) ? source.rules : [];
const activeRules = inputRules.map(cleanRule).filter(Boolean);
const ids = new Set();
for (const rule of activeRules) {
  if (ids.has(rule.id)) throw new Error(`Dubleret aktiv administratorregel: ${rule.id}`);
  ids.add(rule.id);
}

const output = {
  schemaVersion: '1.0',
  generatedAt: new Date().toISOString(),
  source: 'central-admin-rules',
  rules: activeRules
};
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(`Offentlig administratorregelfil oprettet med ${activeRules.length} aktive regler.`);
