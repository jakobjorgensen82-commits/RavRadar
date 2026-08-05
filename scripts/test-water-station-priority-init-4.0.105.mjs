import fs from 'node:fs';

const source=fs.readFileSync('js/ui/admin-dashboard.js','utf8');
const siteTest=fs.readFileSync('js/services/site-function-test-service.js','utf8');
const failures=[];
const expect=(condition,message)=>{if(!condition)failures.push(message);};

expect(source.includes('async function loadPriorityWaterStationAdminData()'),'Prioriteret vandstandsinitialisering mangler.');
expect(source.includes("loadAdminDocument('dmi-water-stations'"),'Stationsregisteret indlæses ikke i den prioriterede kæde.');
expect(source.includes("loadAdminDocument('water-level-station-routing'"),'Central routing indlæses ikke i den prioriterede kæde.');
expect(source.includes("getJson('./data/water-level-station-routing.json')"),'Projektfallback for routing mangler.');
expect(source.includes("state.waterStationsLoading||!state.waterStationsReady"),'Vandstandsfanen beskyttes ikke mod halvfærdig klikbar rendering.');
expect(source.includes('Henter vandstandskilder og administratorvalg…'),'Tydelig indlæsningsstatus mangler.');
expect(source.includes('const waterPriority=loadPriorityWaterStationAdminData().catch'),'Prioritetskæden startes ikke straks efter adgangskontrollen.');

const fullBlock=source.match(/const \[conditions,health,runtime[\s\S]*?\]=await Promise\.all\(\[([\s\S]*?)\]\);/i)?.[1]||'';
expect(!fullBlock.includes('dmi-water-stations'),'Den langsomme baggrundsblok genindlæser stadig stationsregisteret.');
expect(!fullBlock.includes("'water-level-station-routing'"),'Den langsomme baggrundsblok kan stadig overskrive aktiv routing.');
expect(siteTest.includes('waterStationsReadyMs'),'Sitetesten måler ikke, hvornår vandstandsfanen faktisk er klar.');
expect(siteTest.includes("querySelector('#routingZone')&&frame.contentDocument.querySelector('#stationRoutingMap')"),'Sitetesten beviser ikke, at fanen er funktionelt klar.');

if(failures.length){console.error(failures.map(x=>`- ${x}`).join('\n'));process.exit(1);}
console.log('Vandstandsstationernes prioriterede admininitialisering er afgrænset og testet.');
