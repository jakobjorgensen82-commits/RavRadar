import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {build} from './build-public-coastal-parts-v2.mjs';

const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'rav-part-owner-'));
const source='data/geometry-v2/active-national-coastal-parts';
const coast=JSON.parse(await fs.readFile(path.join(source,'coastal-parts.geojson'),'utf8'));
const ids=coast.features.slice(0,2).map(feature=>({id:feature.properties.finalPartId,zoneId:feature.properties.zoneId}));
assert.equal(ids.length,2);
const target=ids[1].zoneId===ids[0].zoneId?'DK-B01-99':ids[1].zoneId;
const zones={type:'FeatureCollection',features:[
  {type:'Feature',properties:{id:ids[0].zoneId,zoneStatus:'active'},geometry:null},
  {type:'Feature',properties:{id:target,zoneStatus:'active'},geometry:null}
]};
const zonesFile=path.join(tmp,'zones.json'),overrides=path.join(tmp,'overrides.json'),output=path.join(tmp,'public.json');
await fs.writeFile(zonesFile,JSON.stringify(zones));
await fs.writeFile(overrides,JSON.stringify({schemaVersion:3,partOwnership:{[ids[0].id]:{targetZoneId:target,published:true}}}));
const result=await build({source,output,overrides,zonesFile});
assert.ok(result.zones[target].some(part=>part.partId===ids[0].id),'Flyttet kystdel mangler hos modtagerzonen.');
assert.ok(!result.zones[ids[0].zoneId]?.some(part=>part.partId===ids[0].id),'Flyttet kystdel ligger stadig i den gamle hovedzone.');
assert.equal(Object.values(result.zones).flat().filter(part=>part.partId===ids[0].id).length,1,'En kystdel må kun have én hovedzoneejer.');

const deletedZones={type:'FeatureCollection',features:[
  {type:'Feature',properties:{id:ids[0].zoneId,zoneStatus:'retired'},geometry:null},
  {type:'Feature',properties:{id:target,zoneStatus:'active'},geometry:null}
]};
await fs.writeFile(zonesFile,JSON.stringify(deletedZones));
const reassignedAfterDelete=await build({source,output,overrides,zonesFile});
assert.ok(reassignedAfterDelete.zones[target].some(part=>part.partId===ids[0].id),'En flyttet kystdel skal overleve, når den tidligere hovedzone slettes.');

await fs.writeFile(overrides,JSON.stringify({schemaVersion:3,partOwnership:{}}));
const deletedWithoutReassignment=await build({source,output,overrides,zonesFile});
assert.ok(!Object.values(deletedWithoutReassignment.zones).flat().some(part=>part.partId===ids[0].id),'En slettet hovedzones kystdel må ikke blive offentlig uden en ny ejer.');

await fs.writeFile(zonesFile,JSON.stringify(zones));
await fs.writeFile(overrides,JSON.stringify({schemaVersion:4,partOwnership:{},disabledParts:{[ids[0].id]:{disabled:true,published:true}}}));
const erased=await build({source,output,overrides,zonesFile});
assert.ok(!Object.values(erased.zones).flat().some(part=>part.partId===ids[0].id),'Viskelæderet skal fjerne kystdelen og dens punkt-/DMI-kontrakt samlet.');

const editorSource=await fs.readFile('js/ui/admin-coastline-editor.js','utf8');
const dashboardSource=await fs.readFile('js/ui/admin-dashboard.js','utf8');
for(const token of ['partOwnership','disabledParts','Viskelæder','Gem kyst og zonegrænser','landpunkt, vandpunkt og vejrdata','coastline-boundary-handle','draggable:true','Zonestregen følger automatisk med'])assert.ok(editorSource.includes(token),`Admin-editor mangler kontrakten: ${token}`);
assert.ok(dashboardSource.includes('coastalParts'),'Admin-dashboardet skal hente de præcise kystdele til redigering.');
assert.ok(editorSource.includes('schemaVersion=4'),'Editoren skal bevare kystredigeringens schema 4.');
console.log('OK: Admin kan flytte og slette zoners kystdele uden dubletter eller tab af den samlede datakontrakt.');
