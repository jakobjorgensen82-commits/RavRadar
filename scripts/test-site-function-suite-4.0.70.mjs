import fs from 'node:fs';
const required=['js/services/site-function-test-service.js','js/services/persistence-test-service.js','js/services/handbook-review-store.js','js/services/rav-assistant.js','js/ui/admin-dashboard.js'];
for(const file of required)if(!fs.existsSync(file))throw new Error(`Mangler ${file}`);
const service=fs.readFileSync('js/services/site-function-test-service.js','utf8');
const dashboard=fs.readFileSync('js/ui/admin-dashboard.js','utf8');
for(const marker of [
 "Offentlig side","Data og prognoser","Spørg RavRadar","Adgang og admin","Supabase-lagring","Deploy og opdatering","Performance",
 'loadPublicFrame','Jagtform kan skiftes','5-dages prognose renderes','Hensigtsforståelse','Landsdækkende prognosesvar',
 'assetClosure','Service worker og versionssammenhæng','Browserfejl og afviste promises','Kritiske ressourcer og opstartsprofil'
])if(!service.includes(marker))throw new Error(`Helhedstesten mangler: ${marker}`);
for(const marker of [
 'loadDataManifest','loadConditions({manifest:manifestData})','loadZones({manifest:manifestData})',
 'loadConditionDetails({manifest:manifestData,conditions:conditionsData})','mergeConditionDetails',
 'count!==210','partCount!==673','futureRows.length<1','hash-, byte-, body-hash-, model- og referencebinding',
 "'./data/live/public-condition-details.json'","'./data/live/coastal-parts-v2.json'"
])if(!service.includes(marker))throw new Error(`Helhedstestens verificerede public loader mangler: ${marker}`);
for(const forbidden of ['mRes.json()','cRes.json()','details=await response.json()']){
 if(service.includes(forbidden))throw new Error(`Helhedstesten må ikke omgå den fælles verificerede loader: ${forbidden}`);
}
for(const marker of ['loadVerifiedPublicRuntime','loadDataManifest','loadConditions({manifest})','loadZones({manifest})']){
 if(!dashboard.includes(marker))throw new Error(`Admin skal bruge den fælles verificerede public loader: ${marker}`);
}
for(const marker of ['Samlet funktionstest af hele RavRadar','Download denne testrapport','report.categories','report.summary','TESTEN KØRER','siteTestLiveRows','scrollIntoView','ravradar-last-site-test-report-v1','TESTEN STOPPEDE MED FEJL'])if(!dashboard.includes(marker))throw new Error(`Adminrapporten mangler: ${marker}`);
if(/downloadJson\(`ravradar-sitetest/.test(dashboard))throw new Error('Testrapporten bruger en ikke-defineret downloadJson-funktion.');
if(!service.includes("phase:'finished'"))throw new Error('Helhedstesten sender ikke afslutningsstatus for hver deltest.');
if(!service.includes('globalTimeoutMs'))throw new Error('Helhedstesten mangler samlet timeout.');
console.log('OK: helhedstesten viser fremdrift, delresultater, slutrapport og fejl synligt samt dækker hele sitet.');
