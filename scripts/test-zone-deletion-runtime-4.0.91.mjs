import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'ravradar-delete-'));
const zonesPath=path.join(tmp,'zones.geojson');
const reviewsPath=path.join(tmp,'direction-reviews.json');
const coastPath=path.join(tmp,'coastline-overrides.json');
const zones={type:'FeatureCollection',features:[
 {type:'Feature',properties:{id:'KEEP',name:'Behold',zoneStatus:'active'},geometry:{type:'Polygon',coordinates:[]}},
 {type:'Feature',properties:{id:'DELETE',name:'Slet',zoneStatus:'active'},geometry:{type:'Polygon',coordinates:[]}},
 {type:'Feature',properties:{id:'DRAFT',name:'Kladde',zoneStatus:'active',onshoreDirectionDeg:10},geometry:{type:'Polygon',coordinates:[]}}
]};
const reviews={zones:{
 DELETE:{status:'deleted',deleted:true},
 DRAFT:{status:'reviewing',anchors:[{dataPoint:[10,56],pinPoint:[10.1,56],onshoreDirectionDeg:180}]}
}};
await fs.writeFile(zonesPath,JSON.stringify(zones));
await fs.writeFile(reviewsPath,JSON.stringify(reviews));
await fs.writeFile(coastPath,JSON.stringify({overrides:{}}));
const python=process.env.RAVRADAR_PYTHON||process.env.PYTHON||'python';
const result=spawnSync(python,['scripts/apply-central-zone-reviews.py','--zones',zonesPath,'--reviews',reviewsPath,'--coastlines',coastPath],{encoding:'utf8'});
assert.equal(result.status,0,result.stderr);
const output=JSON.parse(await fs.readFile(zonesPath,'utf8'));
assert.deepEqual(output.features.map(f=>f.properties.id),['KEEP','DRAFT']);
assert.equal(output.features.find(f=>f.properties.id==='DRAFT').properties.onshoreDirectionDeg,10,'Ikke-godkendt review må ikke ændre produktionen');
console.log('Zonesletning reducerer registeret kontrolleret, og ikke-godkendte retningskladder ignoreres.');
