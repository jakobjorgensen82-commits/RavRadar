import fs from 'node:fs/promises';
const zones=JSON.parse(await fs.readFile('data/zones.geojson','utf8')).features||[];
const norm=x=>(Number(x)%360+360)%360;
const diff=(a,b)=>Math.abs(((a-b+540)%360)-180);
function bearing(a,b){const [lo1,la1,lo2,la2]=[...a,...b].map(x=>x*Math.PI/180);return norm(Math.atan2(Math.sin(lo2-lo1)*Math.cos(la2),Math.cos(la1)*Math.sin(la2)-Math.sin(la1)*Math.cos(la2)*Math.cos(lo2-lo1))*180/Math.PI)}
const rows=[];
for(const f of zones){const p=f.properties||{}; const issues=[]; let pointBearing=null;
 if(!Array.isArray(p.dataPoint)||!Array.isArray(p.pinPoint)) issues.push('missing-sea-or-land-point'); else {pointBearing=bearing(p.dataPoint,p.pinPoint); const d=diff(Number(p.onshoreDirectionDeg),pointBearing); if(d>45)issues.push(`direction-mismatch-${Math.round(d)}deg`); if(p.dataPoint[0]===p.pinPoint[0]&&p.dataPoint[1]===p.pinPoint[1])issues.push('identical-points');}
 const anchors=Array.isArray(p.directionAnchors)?p.directionAnchors:[]; if((p.coastLine?.length||0)>12&&anchors.length<2)issues.push('curved-coast-without-multiple-anchors');
 if(issues.length)rows.push({zoneId:p.id,name:p.name,configured:p.onshoreDirectionDeg,pointBearing:pointBearing&&Math.round(pointBearing),issues,suggestedAction:issues.some(x=>x.startsWith('direction-mismatch'))?'manual-map-review':'review'});
}
await fs.mkdir('data/diagnostics',{recursive:true}); await fs.writeFile('data/diagnostics/zone-geometry-audit.json',JSON.stringify({generatedAt:new Date().toISOString(),count:rows.length,rows},null,2));
console.log(`Geometriaudit: ${rows.length} zoner kræver kontrol.`);
