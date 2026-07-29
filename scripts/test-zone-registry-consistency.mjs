import fs from 'node:fs';
const zones=JSON.parse(fs.readFileSync('data/zones.geojson','utf8'));
const registry=fs.readFileSync('js/services/zone-registry.js','utf8');
const dataService=fs.readFileSync('js/services/data-service.js','utf8');
const admin=fs.readFileSync('js/ui/admin-dashboard.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const all=zones.features||[];
const active=all.filter(f=>f?.properties?.zoneStatus!=='legacy');
const legacy=all.filter(f=>f?.properties?.zoneStatus==='legacy');
if(all.length!==231) throw new Error(`Forventede 231 registrerede zoner, fandt ${all.length}`);
if(!registry.includes("cache: 'no-store'")||!registry.includes('loadActiveZoneCollection')) throw new Error('Zone Registry hentes ikke cache-sikkert');
if(!dataService.includes("from './zone-registry.js'")) throw new Error('Appens data-service bruger ikke Zone Registry');
if(!admin.includes("from '../services/zone-registry.js'")) throw new Error('Administratorcenteret bruger ikke Zone Registry');
if(!sw.includes("url.pathname.endsWith('/data/zones.geojson')")||!sw.includes('networkFirst(event.request)')) throw new Error('Service worker bruger ikke network-first for Zone Registry');
console.log(`OK: én Zone Registry med ${all.length} registrerede, ${active.length} aktive og ${legacy.length} historiske zoner.`);

if(!sw.includes("url.pathname.includes('/data/live/')")||!sw.includes("url.pathname.includes('/data/diagnostics/')")) throw new Error('Service worker bruger ikke network-first for live- og diagnostikfiler');
