import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const source=await fs.readFile('scripts/audit-national-coastal-part-names.py','utf8');const validator=await fs.readFile('scripts/validate-national-coastal-part-names.py','utf8');const workflow=await fs.readFile('.github/workflows/update-and-deploy.yml','utf8');
for(const x of ['api.dataforsyningen.dk/steder','Danmarks officielle stednavneregister','proposedName":None','automaticRenameAllowed":False','FETCH_MARGIN_DEGREES=0.12','MAX_CANDIDATES=30','CANDIDATE_QUOTAS','direct-coastal','local-settlement','WORKERS=4'])assert.ok(source.includes(x),`Navneaudit mangler ${x}`);
for(const x of ['private-national-read-only-official-place-name-candidates','ids!=expected','officialPlaceCandidates','maximumCandidateDistanceM','requestCount'])assert.ok(validator.includes(x),`Navnevalidator mangler ${x}`);
for(const x of ['audit-national-coastal-part-names.py','validate-national-coastal-part-names.py','national-coastal-part-name-audit.json'])assert.ok(workflow.includes(x),`Workflow mangler ${x}`);
console.log('National officiel stednavneaudit-kontrakt: bestået.');
