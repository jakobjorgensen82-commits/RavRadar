import fs from 'node:fs/promises';
const dashboard=await fs.readFile('js/ui/admin-dashboard.js','utf8');
const failures=[];
const need=(ok,msg)=>{if(!ok)failures.push(msg)};
need(dashboard.includes('function destroyDirectionMap()'),'Retningskortet mangler samlet oprydning.');
need(dashboard.includes("if(state.tab!=='directionAudit')destroyDirectionMap()"),'Faneskift rydder ikke retningskort og ventende initialisering.');
need(dashboard.includes("state.tab!=='directionAudit'||!mapContainer||!mapContainer.isConnected"),'Forsinket Leaflet-initialisering kontrollerer ikke fanen og containerens livscyklus.');
need(dashboard.includes('L.map(mapContainer'),'Leaflet initialiseres stadig via et ubeskyttet id-opslag.');
need(dashboard.includes("state.tab!=='waterStations'&&state.stationMap"),'Stationskortet ryddes ikke ved faneskift.');
if(failures.length){console.error('Admin-kortlivscyklus fejlede:\n- '+failures.join('\n- '));process.exit(1)}
console.log('OK: Forsinkede admin-kortinitialiseringer afbrydes sikkert, og kort fjernes ved faneskift.');
