import fs from 'node:fs/promises';
const required=['AGENTS.md','docs/rdks/00_READ_FIRST.md','docs/rdks/01_AI_OPERATING_RULES.md','docs/rdks/MASTER_LOG.md','docs/rdks/90_INDEX/CURRENT_TRUTH.md'];
for(const file of required){const text=await fs.readFile(file,'utf8');if(!text.trim())throw new Error(`Tom RDKS-fil: ${file}`);}
const version=JSON.parse(await fs.readFile('package.json','utf8')).version;
const log=await fs.readFile('docs/rdks/MASTER_LOG.md','utf8');
if(!log.includes(version))throw new Error(`RDKS Master Log mangler version ${version}`);
const rules=await fs.readFile('docs/rdks/01_AI_OPERATING_RULES.md','utf8');
if(!/Implementer aldrig alene på baggrund af en gammel chat/i.test(rules))throw new Error('RDKS mangler sikkerhedsregel for gamle chats');
console.log(`OK: RDKS valideret for ${version}.`);
