import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { evaluateRules } from '../js/core/rule-engine.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ravradar-admin-config-'));
const source = path.join(tmp, 'admin-rules.json');
const output = path.join(tmp, 'public-rules.json');
const active = {
  id:'ADMIN-ACTIVE-1', name:'Central aktiv testregel', status:'active', kind:'bonus',
  knowledgeClass:'expert', confidence:'mellem', priority:500,
  geography:{scope:'zone',zoneIds:['ZONE-1']}, source:{type:'expert',title:'Privat faglig note',reference:'Må ikke publiceres'},
  conditions:{maxWindSpeedMps:10}, effect:{scoreAdjustment:7,explanation:'Central regel anvendt'}, version:2,
  privateComment:'Må ikke udstilles'
};
const draft = {...active,id:'ADMIN-DRAFT-1',name:'Ikke aktiv',status:'draft'};
const inactive = {...active,id:'ADMIN-INACTIVE-1',name:'Slukket',status:'inactive'};
fs.writeFileSync(source, JSON.stringify({rules:[active,draft,inactive]}));
const result = spawnSync(process.execPath, ['scripts/generate-public-admin-rules.mjs', source, output], {encoding:'utf8'});
assert.equal(result.status, 0, result.stderr || result.stdout);
const published = JSON.parse(fs.readFileSync(output,'utf8'));
assert.deepEqual(published.rules.map(r=>r.id), ['ADMIN-ACTIVE-1']);
assert.equal(published.rules[0].privateComment, undefined);
assert.equal(published.rules[0].source, undefined, 'Privat kildemetadata må ikke publiceres i rå adminform');
const scored = evaluateRules({rules:published.rules,zone:{id:'ZONE-1'},mode:'beach',weather:{windSpeedMps:5},history:{},baseScore:50});
assert.equal(scored.score,57,'Central aktiv regel skal påvirke offentlig score');

const service = fs.readFileSync('js/services/rule-service.js','utf8');
assert.match(service,/admin-active-rules\.json/);
assert.doesNotMatch(service,/localStorage\.getItem\('ravradar-admin-rules-v1'/,'Offentlig score må ikke læse administratorregler fra lokal browser');
const workflow = fs.readFileSync('.github/workflows/update-and-deploy.yml','utf8');
assert.match(workflow,/generate-public-admin-rules\.mjs/);
assert.match(workflow,/--exclude 'data\/admin\/'/,'Rå centrale adminfiler må ikke publiceres på GitHub Pages');
console.log('Admin-produktionskontrakt bestået: aktive regler publiceres sikkert og centralt; kladder, inaktive regler og rå adminfiler forbliver private.');
