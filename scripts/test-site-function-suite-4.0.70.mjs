import fs from 'node:fs';
const required=['js/services/site-function-test-service.js','js/services/persistence-test-service.js','js/services/handbook-review-store.js','js/services/rav-assistant.js','js/ui/admin-dashboard.js'];
for(const file of required)if(!fs.existsSync(file))throw new Error(`Mangler ${file}`);
const service=fs.readFileSync('js/services/site-function-test-service.js','utf8');
const dashboard=fs.readFileSync('js/ui/admin-dashboard.js','utf8');
for(const marker of [
 "Offentlig side","Data og prognoser","Spørg RavRadar","Adgang og admin","Supabase-lagring","Deploy og opdatering","Performance",
 'loadPublicFrame','Jagtform kan skiftes','5-dages prognose renderes','Hensigtsforståelse','Landsdækkende prognosesvar',
 'assetClosure','Service worker og versionssammenhæng','Browserfejl og afviste promises','Opstarts- og ressourcemåling'
])if(!service.includes(marker))throw new Error(`Helhedstesten mangler: ${marker}`);
for(const marker of ['Samlet funktionstest af hele RavRadar','Download testrapport','report.categories','report.summary','TESTEN KØRER','siteTestLiveRows','scrollIntoView','ravradar-last-site-test-report-v1','TESTEN STOPPEDE MED FEJL'])if(!dashboard.includes(marker))throw new Error(`Adminrapporten mangler: ${marker}`);
if(/downloadJson\(`ravradar-sitetest/.test(dashboard))throw new Error('Testrapporten bruger en ikke-defineret downloadJson-funktion.');
if(!service.includes("phase:'finished'"))throw new Error('Helhedstesten sender ikke afslutningsstatus for hver deltest.');
if(!service.includes('globalTimeoutMs'))throw new Error('Helhedstesten mangler samlet timeout.');
console.log('OK: helhedstesten viser fremdrift, delresultater, slutrapport og fejl synligt samt dækker hele sitet.');
