import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const source=await fs.readFile('scripts/build-national-local-part-points.py','utf8');const validator=await fs.readFile('scripts/validate-national-local-part-points.py','utf8');const workflow=await fs.readFile('.github/workflows/update-and-deploy.yml','utf8');
for(const token of ['centrally-hydrated-zone-dataPoint','official-farvand-place-candidate','NO_OFFICIAL_LAND_WITNESS','NO_VALID_OPPOSITE_WITNESS_PAIR','unresolvedNormalCandidates','weatherSamplingEnabled":False','automaticActivationAllowed":False'])assert.ok(source.includes(token),`Punktbygger mangler ${token}`);
for(const token of ['build-national-local-part-points.py','validate-national-local-part-points.py','national-local-part-point-pairs.json'])assert.ok(workflow.includes(token),`Workflow mangler ${token}`);
assert.ok(validator.includes('to DMI-reviewkandidater'), 'Validator mangler fail-closed punktkontrol.');
console.log('National local part point pairs kontrakt: bestået.');
