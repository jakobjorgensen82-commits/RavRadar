import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {build} from './build-public-coastal-parts-v2.mjs';
import {pairGeometryCheck} from '../js/ui/admin-direction-editor.js';

const ui=await fs.readFile('js/ui/admin-direction-editor.js','utf8');
for(const needle of ['coastalParts.zones','partOverrides','Godkend og gem centralt','draggable:selected',"marker.on('dragend'"])assert.ok(ui.includes(needle),`Admin-editor mangler ${needle}`);
for(const needle of ['warning:true','!blockers.length','din manuelle helhedsvurdering afgør godkendelsen'])assert.ok(ui.includes(needle),`Admin-editor mangler den ikke-blokerende ejeradvarsel: ${needle}`);
for(const removed of ['Sæt nyt havpunkt','Sæt nyt landpunkt','Sæt nyt land-/havpunkt','id="setSeaPoint"','id="setLandPoint"','id="setPointPair"'])assert.ok(!ui.includes(removed),`Admin-editor viser stadig den fjernede funktion: ${removed}`);
for(const needle of ['focusRequested=true','selectedZoneId!==id','map.invalidateSize()','map.fitBounds','direction-point'])assert.ok(ui.includes(needle),`Admin-editor mangler robust kortvalg: ${needle}`);
for(const needle of ['Hav → land','pairGeometryCheck','Lokal kystvinkel (vejledende)','step="1" disabled','L.polyline([water,land]'])assert.ok(ui.includes(needle),`Admin-editor mangler bindende punkt-/pilkontrol: ${needle}`);
assert.ok(!ui.includes('requestAnimationFrame(()=>'),'Zonevalgets korttegning må ikke afhænge af en senere animation callback.');
assert.ok(ui.indexOf('map.fitBounds')<ui.indexOf('if(feature)add(L.geoJSON'),'Kortet skal have geografisk fokus, før Leaflet tilføjer det første vektorlag.');
assert.ok(!ui.includes('id="directionOpenMain"'),'Den overflødige hovedkortknap findes stadig i land/hav-editoren.');
assert.ok(!ui.includes("host.querySelector('#directionOpenMain').onclick"),'Den slettede hovedkortfunktion har stadig en eventhandler.');
const baseline=JSON.parse(await fs.readFile('data/live/coastal-parts-v2.json','utf8')),zoneId=Object.keys(baseline.zones).find(id=>baseline.zones[id].length>1)||Object.keys(baseline.zones)[0],part=baseline.zones[zoneId][0];
const curvedCoastReview=pairGeometryCheck({
  geometry:{type:'LineString',coordinates:[[9.9998,55],[10.0002,55]]},
  waterPoint:[10.004,55.002],
  landPoint:[9.996,54.998]
});
assert.equal(curvedCoastReview.valid,true,'En skæv lokal mikrotangent må ikke blokere ejerens helhedsvurdering');
assert.equal(curvedCoastReview.warning,true,'Stor lokal vinkelafvigelse skal fortsat vises som vejledende advarsel');
assert.match(curvedCoastReview.message,/kun vejledende og blokerer ikke godkendelsen/);
const missingCoastCrossing=pairGeometryCheck({
  geometry:{type:'LineString',coordinates:[[9.995,55],[10.005,55]]},
  waterPoint:[10,55.01],
  landPoint:[10.001,55.009]
});
assert.equal(missingCoastCrossing.valid,false,'Et punktpar, der ikke krydser egen kyst, skal fortsat blokere');
const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'ravradar-direction-'));
const reviews=path.join(tmp,'direction-reviews.json'),output=path.join(tmp,'coastal-parts.json');
const waterPoint=[part.waterPoint[0]+0.0001,part.waterPoint[1]],landPoint=[part.landPoint[0]+0.0001,part.landPoint[1]];
await fs.writeFile(reviews,JSON.stringify({schemaVersion:3,zones:{[zoneId]:{status:'verified',partOverrides:{[part.partId]:{partId:part.partId,waterPoint,landPoint,onshoreDirectionDeg:123,verified:true}}}}}));
const built=await build({directionReviews:reviews,output});const changed=built.zones[zoneId].find(row=>row.partId===part.partId);
assert.deepEqual(changed.waterPoint,waterPoint);assert.deepEqual(changed.landPoint,landPoint);assert.notEqual(changed.onshoreDirectionDeg,123,'En løs gradværdi må ikke overstyre punktparret');
const expectedBearing=(()=>{const [lon1,lat1]=waterPoint.map(value=>value*Math.PI/180),[lon2,lat2]=landPoint.map(value=>value*Math.PI/180);return Number((((Math.atan2(Math.sin(lon2-lon1)*Math.cos(lat2),Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(lon2-lon1))*180/Math.PI)%360+360)%360).toFixed(1));})();
assert.equal(changed.onshoreDirectionDeg,expectedBearing,'Runtime-retningen skal beregnes direkte fra vandpunkt til landpunkt');
await fs.writeFile(reviews,JSON.stringify({schemaVersion:3,zones:{[zoneId]:{status:'draft',partOverrides:{[part.partId]:{waterPoint:[9,55],landPoint:[9.1,55.1],onshoreDirectionDeg:9}}}}}));
const draft=await build({directionReviews:reviews,output});assert.deepEqual(draft.zones[zoneId].find(row=>row.partId===part.partId).waterPoint,part.waterPoint,'Kladder må ikke påvirke runtime');
console.log(`Admin land/hav-editor: ${zoneId} / ${part.partId} består central runtime-roundtrip`);
