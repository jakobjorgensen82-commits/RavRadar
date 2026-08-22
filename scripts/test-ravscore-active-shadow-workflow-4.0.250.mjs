import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync('.github/workflows/update-and-deploy.yml','utf8');
const builder=fs.readFileSync('scripts/build-active-runtime-shadow-input.py','utf8');
const adminSync=fs.readFileSync('scripts/sync-admin-config.py','utf8');
const publicRuleBuilder=fs.readFileSync('scripts/generate-public-admin-rules.mjs','utf8');
for(const marker of ['ravscore_active_shadow:','ravscore-active-shadow:','Build read-only shadow input from active 210/673 runtime','Validate active points on native DMI grids','Validate active-point private RavScore candidate shadow','ravradar-active-ravscore-shadow'])assert.ok(workflow.includes(marker),`Workflow mangler ${marker}`);
const sectionStart=workflow.indexOf('ravscore-active-shadow:');
const sectionEnd=workflow.indexOf('geometry-v2-pilot:',sectionStart);
assert.ok(sectionStart>=0&&sectionEnd>sectionStart,'RavScore-shadowjobbet kunne ikke afgrænses');
const section=workflow.slice(sectionStart,sectionEnd);
assert.match(section,/permissions:\s*\n\s*contents: read/);
for(const marker of ['Hydrate centrally saved expert rules for active RavScore shadow','python scripts/sync-admin-config.py','node scripts/generate-public-admin-rules.mjs'])assert.ok(section.includes(marker),`RavScore-shadowjobbet mangler den tilladte read-only-hydrering: ${marker}`);
assert.doesNotMatch(section,/pages:\s*write|id-token:\s*write|deploy-pages/);
for(const forbidden of [
  'scripts/apply-central-zone-reviews.py',
  'scripts/sync-protected-admin-assets.mjs',
  'scripts/test-supabase-persistence.mjs',
  'scripts/validate-national-admin-roundtrip.mjs',
  'actions/upload-pages-artifact',
  'actions/deploy-pages'
])assert.ok(!section.includes(forbidden),`RavScore-shadowjobbet maa ikke bruge skrive-/deployvejen ${forbidden}`);

const fetchStart=adminSync.indexOf('def fetch_admin_rows(');
const fetchEnd=adminSync.indexOf('\ndef ',fetchStart+1);
assert.ok(fetchStart>=0&&fetchEnd>fetchStart,'Central admin-hydreringens laesefunktion kunne ikke afgrænses');
const fetchAdminRows=adminSync.slice(fetchStart,fetchEnd);
assert.match(fetchAdminRows,/"select":\s*"document_key,payload,updated_at"/,'Central admin-hydrering skal vaere en eksplicit select');
assert.match(fetchAdminRows,/urllib\.request\.Request\(url \+ "\/rest\/v1\/admin_documents\?" \+ query, headers=headers\)/,'Central admin-hydrering skal bruge standard-GET uden request-body');
assert.doesNotMatch(fetchAdminRows,/\b(?:data|method)\s*=/,'Central admin-hydrering maa ikke kunne skifte til en skrivende HTTP-metode');
assert.doesNotMatch(publicRuleBuilder,/\bfetch\s*\(|https?:\/\//,'Regelbyggeren maa ikke kontakte en fjernservice');
assert.match(publicRuleBuilder,/fs\.writeFile\(outputPath,/,'Regelbyggeren skal kun materialisere den lokalt hydrerede regelfil');

for(const marker of ['active-public-runtime-read-only','private-national-read-only-local-part-point-pairs','productionGeometryChanged','adminDataChanged','weatherSamplingChanged','scoreChanged','publicRuntimeChanged','automaticActivationAllowed'])assert.ok(builder.includes(marker),`Inputbygger mangler ${marker}`);
assert.match(workflow,/build-and-prepare:[\s\S]{0,220}inputs\.ravscore_active_shadow != true/);
console.log('Aktive produktionspunkter til privat RavScore-shadow workflow: bestået.');
