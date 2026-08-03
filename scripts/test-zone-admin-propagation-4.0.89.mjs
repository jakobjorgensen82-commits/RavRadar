import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const admin=fs.readFileSync('js/ui/admin-dashboard.js','utf8');
for(const token of ['Slet valgt kystdel','Slet hele zonen','saveDirectionReviewsNow','deleted:true','applyDirectionReviewToFeature']) assert.ok(admin.includes(token),`Admin mangler ${token}`);
const workflow=fs.readFileSync('.github/workflows/update-and-deploy.yml','utf8');
assert.ok(workflow.indexOf('Sync centrally saved admin configuration') < workflow.indexOf('Hydrate latest deployed weather state'),'Central zonekonfiguration skal hentes før vejrhyrering');
assert.ok(workflow.includes('Apply centrally approved zone geometry and deletions'),'Workflow mangler anvendelse af centrale zoneændringer');

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
