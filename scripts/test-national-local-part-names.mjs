import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import { readProductionWorkflowSource } from './lib/production-workflow-sources.mjs';
const source=await fs.readFile('scripts/build-national-local-part-names.py','utf8');const validator=await fs.readFile('scripts/validate-national-local-part-names.py','utf8');const workflow=await readProductionWorkflowSource('orchestrator');
for(const token of ['chosenOfficialCandidate','directionalQualifier','fallbackMaximumDistanceM','automaticRenameAllowed":False','automaticActivationAllowed":False'])assert.ok(source.includes(token),`Navnebygger mangler ${token}`);
for(const token of ['national-local-part-name-suggestions.json','build-national-local-part-names.py','validate-national-local-part-names.py'])assert.ok(workflow.includes(token),`Workflow mangler ${token}`);
assert.ok(validator.includes('chosenOfficialCandidate'), 'Validator kræver ikke officielt kandidat-ID.');
console.log('National local part names kontrakt: bestået.');
