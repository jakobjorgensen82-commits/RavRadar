import fs from 'node:fs/promises';
const [html,js,css]=await Promise.all([
 fs.readFile('admin.html','utf8'),fs.readFile('js/ui/admin-dashboard.js','utf8'),fs.readFile('admin.css','utf8')
]);
for(const required of ['data-tab="directionAudit"','leaflet@1.9.4','4.0.13'])if(!html.includes(required))throw new Error(`admin.html mangler ${required}`);
for(const required of ['renderDirectionAudit','DIRECTION_REVIEW_KEY','Godkend og gå til næste','Download zones.geojson','manually-verified','bearingDeg','destinationPoint','directionAnchors','anchorAdd','anchorSeaLon','anchorLandLon','draggable:true'])if(!js.includes(required))throw new Error(`admin-dashboard mangler ${required}`);
for(const required of ['directionConfirmSea','directionConfirmLand','directionConfirmArrow','directionMinus5','directionPlus5','directionUsePointBearing','confirmations'])if(!js.includes(required))throw new Error(`admin-dashboard mangler ${required}`);
for(const required of ['.direction-layout','.direction-map','.direction-zone-row','.anchor-tabs','.direction-point'])if(!css.includes(required))throw new Error(`admin.css mangler ${required}`);
console.log('Adminens geografiske multi-ankerkontrol er dokumenteret og tilgængelig.');
