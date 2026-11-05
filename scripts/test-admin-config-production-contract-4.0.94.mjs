import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readProductionWorkflowSource } from './lib/production-workflow-sources.mjs';

const service = fs.readFileSync('js/services/rule-service.js', 'utf8');
assert.doesNotMatch(service, /admin-active-rules\.json/, 'Centralt gemte administratorregler må ikke læses af en offentlig service');
assert.doesNotMatch(service, /localStorage\.getItem\('ravradar-admin-rules-v1'/, 'Offentlig kode må ikke læse lokale administratorregler');

const buildWorkflow = await readProductionWorkflowSource('build');
assert.doesNotMatch(buildWorkflow, /generate-public-admin-rules\.mjs/, 'Workflowet må ikke publicere pensionerede administratorregler');
assert.match(buildWorkflow, /--exclude 'data\/admin\//, 'Rå centrale adminfiler skal fortsat holdes ude af GitHub Pages');
for (const retiredPublicPath of ['js/ui/admin-app.js', 'js/core/rule-engine.js', 'js/services/rule-service.js', 'rules/']) {
  assert.match(buildWorkflow, new RegExp(`--exclude '${retiredPublicPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`), `Pages-artifactet skal udelukke ${retiredPublicPath}`);
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
assert.match(dashboard, /Siden ændrer aldrig den aktive model eller den offentlige RavScore/, 'Kalibreringsgrundlaget skal forklare, at det er skrivebeskyttet');

const siteFunctionTest = fs.readFileSync('js/services/site-function-test-service.js', 'utf8');
assert.doesNotMatch(siteFunctionTest, /['"]rules['"]|['"]rule-history['"]/, 'Den aktive helhedstest må ikke kræve pensionerede adminfaner eller regeldokumenter');
assert.match(siteFunctionTest, /skrivebeskyttet kalibreringsgrundlag/, 'Helhedstesten skal kontrollere den aktive skrivebeskyttede kalibreringsside');
for (const tab of ['waterStations', 'coastlineEditor', 'observations', 'history', 'learning', 'documentation']) {
  assert.match(siteFunctionTest, new RegExp(`['"]${tab}['"]`), `Helhedstesten mangler den aktive adminfane ${tab}`);
}

assert.equal(fs.existsSync('scripts/generate-public-admin-rules.mjs'), false, 'Et pensioneret udgivelsesværktøj må ikke kunne genaktivere administratorregler');

const serviceWorker = fs.readFileSync('service-worker.js', 'utf8');
const release=JSON.parse(fs.readFileSync('package.json','utf8')).version;
const adminUi='admin-current-data-20261028';
const dashboardSource=/<script\b[^>]*\bsrc="([^"]*js\/ui\/admin-dashboard\.js\?[^"]+)"/.exec(admin)?.[1];
assert.ok(dashboardSource,'Admin skal have den faktiske modulindgang.');
const dashboardUrl=new URL(dashboardSource,'https://ravradar.invalid/');
assert.equal(dashboardUrl.searchParams.get('v'),release,'Admin-HTML må ikke indlæse en anden release.');
assert.match(dashboardUrl.searchParams.get('ui')||'',/^admin-[a-z-]+-\d{8}$/,'Admin skal bruge en særskilt versionsbundet UI-adresse.');
const workerRelease=/const APP_VERSION\s*=\s*["']([^"']+)["']/.exec(serviceWorker)?.[1];
const compactMap=/const COMPACT_MAP\s*=\s*["']([^"']+)["']/.exec(serviceWorker)?.[1];
assert.equal(workerRelease,release,'Serviceworker og admin-HTML skal følge samme aktuelle release.');
assert.ok(compactMap,'Den faktiske korttransportbinding skal være til stede.');
const expandedWorker=serviceWorker.replaceAll('${APP_VERSION}',release).replaceAll('${COMPACT_MAP}',compactMap);
assert.ok(expandedWorker.includes('.'+dashboardUrl.pathname+dashboardUrl.search),
  'Serviceworker skal cache præcis admin-HTMLs moduladresse inklusive alle UI-/kortparametre.');
for(const file of ['admin-trip-count.js','admin-account-categories.js'])
  assert(dashboard.includes(`${file}?v=${release}&ui=${adminUi}`));
for(const file of ['admin-trip-count.js','admin-account-categories.js']){
  const source=new RegExp("from ['\"]([^'\"]*"+file.replaceAll('.','\\.')+"\\?[^'\"]+)['\"]").exec(dashboard)?.[1];
  assert.ok(source,'Den normale administratorservice skal importeres direkte.');
  const url=new URL(source,dashboardUrl);
  assert.equal(url.searchParams.get('v'),release);
  assert.ok(expandedWorker.includes('.'+url.pathname+url.search),'Normal offline-liste skal følge den præcise faktiske serviceadresse.');
}
assert.doesNotMatch(serviceWorker, /rule-engine|rule-service|(?:national|local|experimental)-rules\.json/, 'Regelværkstedets gamle motor og regelsæt må ikke ligge i den offentlige offlinepakke');

console.log('Admin-kontrakt bestået: Regelværkstedet er pensioneret, Candidate G ændres kun gennem kode, tests og versionsstyring, og eksisterende regeldata slettes ikke.');
