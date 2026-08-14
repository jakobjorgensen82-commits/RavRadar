import fs from 'node:fs/promises';

const inputPath=process.argv[2]||'data/live/coastal-parts-v2.json';
const outputPath=process.argv[3]||'data/diagnostics/local-part-orientation-audit-4.0.193.json';
const R=6371000;
const rad=value=>Number(value)*Math.PI/180;
const distance=(a,b)=>{
  const p1=rad(a[1]),p2=rad(b[1]),dp=p2-p1,dl=rad(b[0]-a[0]);
  const h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));
};
const bearing=(a,b)=>((Math.atan2(Math.sin(rad(b[0]-a[0]))*Math.cos(rad(b[1])),Math.cos(rad(a[1]))*Math.sin(rad(b[1]))-Math.sin(rad(a[1]))*Math.cos(rad(b[1]))*Math.cos(rad(b[0]-a[0])))*180/Math.PI)+360)%360;
const axial=value=>((Number(value)%180)+180)%180;
const axialDiff=(a,b)=>Math.abs(((axial(a)-axial(b)+270)%180)-90);
const lines=geometry=>geometry?.type==='LineString'?[geometry.coordinates]:geometry?.type==='MultiLineString'?geometry.coordinates:[];

function chunks(coords,targetM=1000,minM=650){
  const rows=[];
  let start=0,travel=0;
  for(let index=1;index<coords.length;index++){
    travel+=distance(coords[index-1],coords[index]);
    if(travel>=targetM){
      const direct=distance(coords[start],coords[index]);
      if(direct>=minM)rows.push({bearingDeg:bearing(coords[start],coords[index]),lengthM:travel,start:coords[start],end:coords[index]});
      start=index;travel=0;
    }
  }
  if(travel>=minM&&coords.length-start>1)rows.push({bearingDeg:bearing(coords[start],coords.at(-1)),lengthM:travel,start:coords[start],end:coords.at(-1)});
  return rows;
}

export function auditPart(part){
  const windows=lines(part.geometry).flatMap(line=>chunks(line));
  let maxAxialDifferenceDeg=0,pair=null;
  for(let a=0;a<windows.length;a++)for(let b=a+1;b<windows.length;b++){
    const delta=axialDiff(windows[a].bearingDeg,windows[b].bearingDeg);
    if(delta>maxAxialDifferenceDeg){maxAxialDifferenceDeg=delta;pair=[windows[a],windows[b]];}
  }
  const persistentDirectionChange=windows.length>=2&&maxAxialDifferenceDeg>=35;
  return {partId:part.partId,zoneId:part.zoneId,name:part.name,fragmentCount:lines(part.geometry).length,windowCount:windows.length,maxAxialDifferenceDeg:Math.round(maxAxialDifferenceDeg*10)/10,persistentDirectionChange,evidence:pair};
}

if(process.argv.includes('--self-test')){
  const straight={partId:'s',zoneId:'z',name:'straight',geometry:{type:'LineString',coordinates:[[10,55],[10.02,55],[10.04,55]]}};
  const corner={partId:'c',zoneId:'z',name:'corner',geometry:{type:'LineString',coordinates:[[10,55],[10.03,55],[10.03,55.03]]}};
  if(auditPart(straight).persistentDirectionChange)throw new Error('En lige kyst blev fejlagtigt flagget.');
  if(!auditPart(corner).persistentDirectionChange)throw new Error('En vedvarende retvinklet kystændring blev ikke flagget.');
  console.log('OK: afstandsbaseret orienteringsaudit skelner lige kyst fra vedvarende retningsskift.');
  process.exit(0);
}

const contract=JSON.parse(await fs.readFile(inputPath,'utf8'));
const results=Object.entries(contract.zones||{}).flatMap(([zoneId,parts])=>parts.map(part=>auditPart({...part,zoneId})));
const flagged=results.filter(row=>row.persistentDirectionChange).sort((a,b)=>b.maxAxialDifferenceDeg-a.maxAxialDifferenceDeg||a.partId.localeCompare(b.partId));
const zones=[...new Set(flagged.map(row=>row.zoneId))].sort();
const report={schemaVersion:1,generatedAt:new Date().toISOString(),method:{windowTargetM:1000,minimumWindowM:650,minimumPersistentAxialDifferenceDeg:35,note:'Read-only triage. Små hak og korte fragmenter kan ikke alene udløse flag.'},datasetVersion:contract.datasetVersion,partCount:results.length,flaggedPartCount:flagged.length,flaggedZoneCount:zones.length,flaggedZones:zones,flaggedParts:flagged,status:'review-required'};
await fs.mkdir(outputPath.slice(0,outputPath.lastIndexOf('/')),{recursive:true});
await fs.writeFile(outputPath,`${JSON.stringify(report,null,2)}\n`);
console.log(`Orienteringsaudit: ${flagged.length}/${results.length} dele i ${zones.length} zoner kræver nærmere kontrol.`);
