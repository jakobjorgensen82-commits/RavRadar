import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import { readProductionWorkflowSource } from './lib/production-workflow-sources.mjs';

const admin=fs.readFileSync('js/ui/admin-dashboard.js','utf8');
for(const token of ['Slet valgt kystdel','Slet hele zonen','saveDirectionReviewsNow','deleted:true','applyDirectionReviewToFeature']) assert.ok(admin.includes(token),`Admin mangler ${token}`);
const workflow=await readProductionWorkflowSource('build');
const centralSyncIndex=workflow.indexOf('Sync centrally saved admin configuration');
const applyGeometryIndex=workflow.indexOf('Apply centrally approved zone geometry and deletions');
const protectedRuntimeIndex=workflow.indexOf('Restore newest compatible private runtime from protected storage');
assert.ok(centralSyncIndex>=0 && centralSyncIndex<applyGeometryIndex && applyGeometryIndex<protectedRuntimeIndex,
  'Central zonekonfiguration og godkendte zoneændringer skal anvendes før den beskyttede runtime genoprettes');

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'rav-zone-review-'));
const zones={type:'FeatureCollection',features:[
 {type:'Feature',properties:{id:'KEEP',zoneStatus:'active',onshoreDirectionDeg:90,dataPoint:[10,56],pinPoint:[10.1,56]},geometry:{type:'Polygon',coordinates:[]}},
 {type:'Feature',properties:{id:'DELETE',zoneStatus:'active',onshoreDirectionDeg:90},geometry:{type:'Polygon',coordinates:[]}}
]};
const reviews={schemaVersion:2,zones:{KEEP:{status:'verified',anchors:[{id:'primary',dataPoint:[11,57],pinPoint:[11.1,57],onshoreDirectionDeg:180,weight:1}]},DELETE:{status:'deleted',deleted:true}}};
const zp=path.join(tmp,'zones.json'),rp=path.join(tmp,'reviews.json');
fs.writeFileSync(zp,JSON.stringify(zones));fs.writeFileSync(rp,JSON.stringify(reviews));
const result=spawnSync('python',['scripts/apply-central-zone-reviews.py','--zones',zp,'--reviews',rp],{encoding:'utf8'});
assert.equal(result.status,0,result.stderr||result.stdout);
const out=JSON.parse(fs.readFileSync(zp));
assert.deepEqual(out.features.map(f=>f.properties.id),['KEEP']);
assert.equal(out.features[0].properties.onshoreDirectionDeg,180);
assert.deepEqual(out.features[0].properties.dataPoint,[11,57]);
console.log('Central sletning og retningsændring forplanter sig til den autoritative zonefil.');

const coastline=fs.readFileSync('js/ui/admin-coastline-editor.js','utf8');
for(const token of ['Flyt kort','Præcis redigering','Zonenavn','Gem ændringer','onZoneSelected','published']) assert.ok(coastline.includes(token),`Kystlinjeeditor mangler ${token}`);
for(const forbidden of ['Gem zonekladde','Slet kladde','Eksportér kladdebackup','Eksportér valideret zones.geojson']) assert.ok(!coastline.includes(forbidden),`Teknisk kladde-UI er stadig synligt: ${forbidden}`);
const zones2={type:'FeatureCollection',features:[{type:'Feature',properties:{id:'COAST',name:'Gammelt navn',coastLine:[[10,56],[10.1,56.1]]},geometry:{type:'Polygon',coordinates:[]}}]};
const coastDoc={schemaVersion:2,overrides:{COAST:{zoneId:'COAST',zoneName:'Nyt navn',published:true,status:'published',coastLine:[[11,57],[11.1,57.1]],updatedAt:'2026-08-03T12:00:00Z'}}};
const zp2=path.join(tmp,'zones2.json'),cp=path.join(tmp,'coast.json'),emptyReviews=path.join(tmp,'reviews2.json');
fs.writeFileSync(zp2,JSON.stringify(zones2));fs.writeFileSync(cp,JSON.stringify(coastDoc));fs.writeFileSync(emptyReviews,JSON.stringify({zones:{}}));
const result2=spawnSync('python',['scripts/apply-central-zone-reviews.py','--zones',zp2,'--reviews',emptyReviews,'--coastlines',cp],{encoding:'utf8'});
assert.equal(result2.status,0,result2.stderr||result2.stdout);
const out2=JSON.parse(fs.readFileSync(zp2));assert.equal(out2.features[0].properties.name,'Nyt navn');assert.deepEqual(out2.features[0].properties.coastLine,[[11,57],[11.1,57.1]]);
const legacy={schemaVersion:1,overrides:{COAST:{zoneName:'Må ikke bruges',status:'draft',coastLine:[[12,57],[12.1,57.1]]}}};fs.writeFileSync(cp,JSON.stringify(legacy));fs.writeFileSync(zp2,JSON.stringify(zones2));spawnSync('python',['scripts/apply-central-zone-reviews.py','--zones',zp2,'--reviews',emptyReviews,'--coastlines',cp],{encoding:'utf8'});const out3=JSON.parse(fs.readFileSync(zp2));assert.equal(out3.features[0].properties.name,'Gammelt navn');
console.log('Kystlinjeeditorens gemte navn og geometri forplanter sig; historiske kladder ignoreres.');
