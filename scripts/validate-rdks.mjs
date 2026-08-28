import fs from 'node:fs/promises';

const required = [
  'AGENTS.md',
  'docs/rdks/00_READ_FIRST.md',
  'docs/rdks/01_AI_OPERATING_RULES.md',
  'docs/rdks/MASTER_LOG.md',
  'docs/rdks/90_INDEX/CURRENT_TRUTH.md',
  'docs/rdks/90_INDEX/IMPLEMENTATION_STATUS.md',
  'docs/rdks/90_INDEX/CHRONOLOGY.md',
  'docs/rdks/20_REQUIREMENTS/ACTIVE-REQUIREMENTS.md',
  'docs/rdks/40_KNOWN_ISSUES/KNOWN-ISSUES.md',
  'docs/rdks/70_CHAT_IMPORT/IMPORT-MANIFEST.json',
  'HANDBOOK-RAVRADAR.md',
  'docs/ai/CODEX_START_HERE.md',
  'docs/ai/AI_KNOWLEDGE_BASE.md',
  'docs/ai/AI_ARCHITECTURE_MAP.md',
  'docs/ai/AI_WORKING_RULES.md',
  'docs/ai/AI_ROADMAP.md',
  'docs/ai/AI_LESSONS_LEARNED.md',
  'docs/ai/CODEX_HANDOFF_CHECKLIST.md',
  'docs/handbook/content.json',
  'docs/rdks/10_DECISIONS/DEC-0103-COASTAL-CAUSAL-RAVSCORE-ACTIVATION.md',
  'docs/research/RAVSCORE_NEXT_GENERATION_MODEL_AUDIT_2026-08-28.md',
  'docs/research/RAVSCORE_NEXT_GENERATION_OFFLINE_EVIDENCE_2026-08-28.md'
];
for (const file of required) {
  const text = await fs.readFile(file, 'utf8');
  if (!text.trim()) throw new Error(`Tom RDKS-/håndbogsfil: ${file}`);
}
const pkg = JSON.parse(await fs.readFile('package.json', 'utf8'));
const version = pkg.version;
const log = await fs.readFile('docs/rdks/MASTER_LOG.md', 'utf8');
if (!log.includes(version)) throw new Error(`RDKS Master Log mangler version ${version}`);
const rules = await fs.readFile('docs/rdks/01_AI_OPERATING_RULES.md', 'utf8');
if (!/Implementer aldrig alene på baggrund af en gammel chat/i.test(rules)) throw new Error('RDKS mangler sikkerhedsregel for gamle chats');
if (!/samtaledeltaet/i.test(rules)) throw new Error('RDKS mangler automatisk samtaledelta ved nye versioner');
const manifest = JSON.parse(await fs.readFile('docs/rdks/70_CHAT_IMPORT/IMPORT-MANIFEST.json', 'utf8'));
if (!Array.isArray(manifest.items) || manifest.items.length < 7) throw new Error('Chatimport mangler importerede historiske kilder');
const orders=manifest.items.map(item=>item.chronologicalOrder);
if(new Set(manifest.items.map(item=>item.id)).size!==manifest.items.length)throw new Error('Chatimport indeholder dublerede id’er');
if(orders.some((value,index)=>value!==index+1))throw new Error('Chatimportens kronologi er ikke sammenhængende');
for (const item of manifest.items) {
  if (item.status !== 'imported-classified') throw new Error(`Chat ikke færdigimporteret: ${item.id}`);
  await fs.access(item.normalizedText);
  await fs.access(`docs/rdks/70_CHAT_IMPORT/${item.id}.md`);
}
const handbook = JSON.parse(await fs.readFile('docs/handbook/content.json', 'utf8'));
if (handbook.handbookVersion !== version) throw new Error(`Webhåndbog ${handbook.handbookVersion} matcher ikke release ${version}`);
if (!Array.isArray(handbook.sections) || handbook.sections.length < 15) throw new Error('Webhåndbogen er ikke fuldt udbygget');
const markdownHandbook = await fs.readFile('HANDBOOK-RAVRADAR.md', 'utf8');
if (!markdownHandbook.includes(`Håndbogsversion:** ${version}`)) throw new Error('Markdown-håndbogen matcher ikke releaseversionen');
console.log(`OK: RDKS, ${manifest.items.length} chatkilder og håndbog valideret for ${version}.`);
