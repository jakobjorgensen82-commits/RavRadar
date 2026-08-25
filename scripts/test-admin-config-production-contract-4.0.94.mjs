import assert from 'node:assert/strict';
import fs from 'node:fs';

const service = fs.readFileSync('js/services/rule-service.js', 'utf8');
assert.doesNotMatch(service, /admin-active-rules\.json/, 'Centralt gemte administratorregler må ikke læses af en offentlig service');
assert.doesNotMatch(service, /localStorage\.getItem\('ravradar-admin-rules-v1'/, 'Offentlig kode må ikke læse lokale administratorregler');

const workflow = fs.readFileSync('.github/workflows/update-and-deploy.yml', 'utf8');
assert.doesNotMatch(workflow, /generate-public-admin-rules\.mjs/, 'Workflowet må ikke publicere pensionerede administratorregler');
assert.match(workflow, /--exclude 'data\/admin\//, 'Rå centrale adminfiler skal fortsat holdes ude af GitHub Pages');
for (const retiredPublicPath of ['js/ui/admin-app.js', 'js/core/rule-engine.js', 'js/services/rule-service.js', 'rules/']) {
  assert.match(workflow, new RegExp(`--exclude '${retiredPublicPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`), `Pages-artifactet skal udelukke ${retiredPublicPath}`);
}

const admin = fs.readFileSync('admin.html', 'utf8');
assert.doesNotMatch(admin, /data-tab="rules"/, 'Regelværkstedet må ikke kunne åbnes i adminfladen');
assert.doesNotMatch(admin, /data-tab="knowledge"/, 'Den gamle erfaringsvidenfane må ikke kunne åbnes i adminfladen');
assert.doesNotMatch(admin, /ruleDialog|ruleTestDialog|ruleImportInput/, 'Skjulte dialoger fra Regelværkstedet må ikke ligge i adminfladen');
assert.match(admin, />Kalibreringsgrundlag</, 'Adminfladen skal kalde den skrivebeskyttede turdataoversigt for Kalibreringsgrundlag');
assert.doesNotMatch(admin, />Model-forslag</, 'Adminfladen må ikke love en lokal scoremodel');

const permissions = fs.readFileSync('js/services/permissions-service.js', 'utf8');
assert.doesNotMatch(permissions, /rules_(view|edit|publish)/, 'Pensionerede regelrettigheder må ikke kunne tildeles i adminfladen');

const dashboard = fs.readFileSync('js/ui/admin-dashboard.js', 'utf8');
assert.doesNotMatch(dashboard, /loadAdminDocument\('rules'/, 'Adminfladen må ikke indlæse historiske centrale regler som aktive data');
assert.doesNotMatch(dashboard, /loadAdminDocument\('rule-history'/, 'Adminfladen må ikke indlæse historisk regelhistorik som aktiv funktion');
assert.doesNotMatch(dashboard, /renderRules|renderKnowledge|openRuleEditor|queueAdminDocumentSave\('rules'|rules_(edit|publish)/, 'Skjult Regelværksted-kode må ikke være en aktiv del af adminmodulet');
assert.match(dashboard, /Scoreændringer kræver kodegennemgang/, 'Adminfladen skal forklare den sikre arbejdsgang for scoreændringer');
assert.doesNotMatch(dashboard, /adaptive-model|activateAdaptiveModel|rollbackAdaptiveModel|localModel/, 'Kalibreringsgrundlaget må ikke kunne aktivere eller tilbagerulle en lokal scoremodel');
assert.match(dashboard, /Siden ændrer aldrig Candidate G eller den offentlige RavScore/, 'Kalibreringsgrundlaget skal forklare, at det er skrivebeskyttet');

assert.equal(fs.existsSync('scripts/generate-public-admin-rules.mjs'), false, 'Et pensioneret udgivelsesværktøj må ikke kunne genaktivere administratorregler');

const serviceWorker = fs.readFileSync('service-worker.js', 'utf8');
assert.doesNotMatch(serviceWorker, /rule-engine|rule-service|(?:national|local|experimental)-rules\.json/, 'Regelværkstedets gamle motor og regelsæt må ikke ligge i den offentlige offlinepakke');

console.log('Admin-kontrakt bestået: Regelværkstedet er pensioneret, Candidate G ændres kun gennem kode, tests og versionsstyring, og eksisterende regeldata slettes ikke.');
