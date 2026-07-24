import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const confidence = new Set(['lav', 'mellem', 'stor']);
const ruleFiles = ['rules/national-rules.json', 'rules/local-rules.json', 'rules/experimental-rules.json'];
const ids = new Set();
let count = 0;

for (const rel of ruleFiles) {
  const doc = JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  if (!Array.isArray(doc.rules)) throw new Error(`${rel}: rules skal være en liste`);
  for (const rule of doc.rules) {
    count += 1;
    if (!rule.id || ids.has(rule.id)) throw new Error(`${rel}: manglende eller dubleret regel-id`);
    ids.add(rule.id);
    if (!confidence.has(rule.confidence)) throw new Error(`${rule.id}: confidence skal være lav, mellem eller stor`);
    if (!rule.source?.type || !rule.source?.title) throw new Error(`${rule.id}: kilde mangler`);
    if (!Number.isInteger(rule.version) || rule.version < 1) throw new Error(`${rule.id}: ugyldig version`);
  }
}

for (const rel of ['knowledge/amber-behaviour.json']) {
  const doc = JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  for (const statement of doc.statements ?? []) {
    if (!confidence.has(statement.confidence)) throw new Error(`${statement.id}: confidence skal være lav, mellem eller stor`);
    if (!statement.source) throw new Error(`${statement.id}: kilde mangler`);
  }
}

console.log(`Knowledge validation OK: ${count} regler, tillidsniveauer lav/mellem/stor.`);
