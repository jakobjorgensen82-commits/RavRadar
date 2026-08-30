import fs from 'node:fs/promises';
const [html,js,css]=await Promise.all([
 fs.readFile('admin.html','utf8'),fs.readFile('js/ui/admin-dashboard.js','utf8'),fs.readFile('admin.css','utf8')
]);
const version=JSON.parse(await fs.readFile('version.json','utf8')).version;
for(const required of ['data-tab="directionAudit"','leaflet@1.9.4',version])if(!html.includes(required))throw new Error(`admin.html mangler ${required}`);
for(const required of ['renderDirectionAudit','DIRECTION_REVIEW_KEY','Godkend og gå til næste','Download zones.geojson','manually-verified','bearingDeg','destinationPoint','directionAnchors','anchorAdd','anchorSeaLon','anchorLandLon','draggable:true'])if(!js.includes(required))throw new Error(`admin-dashboard mangler ${required}`);
for(const required of ['directionConfirmSea','directionConfirmLand','directionConfirmArrow','directionMinus5','directionPlus5','directionUsePointBearing','confirmations'])if(!js.includes(required))throw new Error(`admin-dashboard mangler ${required}`);
for(const required of ['.direction-layout','.direction-map','.direction-zone-row','.anchor-tabs','.direction-point'])if(!css.includes(required))throw new Error(`admin.css mangler ${required}`);
console.log('Adminens geografiske multi-ankerkontrol er dokumenteret og tilgængelig.');

if(js.includes('ravradar-runtime-diagnostics.json?t=${Date.now()}'))throw new Error('Admin må ikke hente beskyttet runtime fra offentlig URL');
if(!js.includes("allowed('diagnostics_download')")||!js.includes('decodeRuntimeDiagnosticsEnvelope(state.runtime)')||!js.includes("download('ravradar-runtime-diagnostics.json',runtime)"))throw new Error('Admin mangler rettighedskontrolleret og verificeret download af beskyttet runtime');
for(const required of ['loadVerifiedPublicRuntime','loadDataManifest','loadConditions({manifest})','loadZones({manifest})'])if(!js.includes(required))throw new Error(`Admin bruger ikke den manifest- og hashverificerede offentlige runtimekæde: ${required}`);
if(!js.includes('runtime.zones.coastalParts'))throw new Error('Admin skal udpakke den hashverificerede kystdelspakke fra loadZones-resultatet');
if(!js.includes("loadAdminDocument('coastal-point-staging-status'"))throw new Error('Admin henter ikke kandidatstatus gennem den beskyttede dokumentport');
if(!js.includes('Kandidatstatus er utilgængelig')||!js.includes('Ingen punktændring kan derfor aktiveres'))throw new Error('Manglende beskyttet kandidatstatus skal vises og blokere aktivering fail-closed');
for(const forbidden of [
 "getJson('./data/live/conditions.json')",
 'data/live/conditions.json?t=',
 'downloadConditions',
 'Download conditions.json',
 'data/live/dmi-bulk-cache.json',
 'data/live/dmi-forecast-cache.json',
 'data/live/current-pilot-history.json',
 "getJson('./data/live/coastal-point-staging-status.json')"
])if(js.includes(forbidden))throw new Error(`Admin må ikke have en offentlig privat-runtimevej: ${forbidden}`);
