#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DEFAULT_SOURCE=path.join(ROOT,'data/geometry-v2/active-national-coastal-parts');
const DEFAULT_OUTPUT=path.join(ROOT,'data/live/coastal-parts-v2.json');
const DEFAULT_OVERRIDES=path.join(ROOT,'data/admin/coastline-overrides.json');
const DEFAULT_ZONES=path.join(ROOT,'data/zones.geojson');
const sha=text=>crypto.createHash('sha256').update(text.replace(/\r\n/g,'\n')).digest('hex');
const read=async (source,name)=>{const text=await fs.readFile(path.join(source,name),'utf8');return{text,json:JSON.parse(text)}};
const cleanPoint=point=>[Number(Number(point[0]).toFixed(6)),Number(Number(point[1]).toFixed(6))];
function simplifyLine(points,tolerance=0.000025){
  const line=points.map(cleanPoint);if(line.length<=2)return line;
  const sq=tolerance*tolerance,keep=new Uint8Array(line.length);keep[0]=keep[line.length-1]=1;const stack=[[0,line.length-1]];
  while(stack.length){const [a,b]=stack.pop(),p=line[a],q=line[b],dx=q[0]-p[0],dy=q[1]-p[1],den=dx*dx+dy*dy;let max=sq,index=-1;for(let i=a+1;i<b;i++){const r=line[i],t=den?Math.max(0,Math.min(1,((r[0]-p[0])*dx+(r[1]-p[1])*dy)/den)):0,x=p[0]+t*dx,y=p[1]+t*dy,d=(r[0]-x)**2+(r[1]-y)**2;if(d>max){max=d;index=i;}}if(index>=0){keep[index]=1;stack.push([a,index],[index,b]);}}
  return line.filter((_,index)=>keep[index]);
}
function publicGeometry(geometry){
  if(geometry?.type==='LineString')return{type:'LineString',coordinates:simplifyLine(geometry.coordinates||[])};
  if(geometry?.type==='MultiLineString')return{type:'MultiLineString',coordinates:(geometry.coordinates||[]).map(line=>simplifyLine(line)).filter(line=>line.length>1)};
  throw new Error(`Ikke-understøttet kystgeometri: ${geometry?.type}`);
}

async function optionalJson(file,fallback){try{return JSON.parse(await fs.readFile(file,'utf8'))}catch(error){if(error.code==='ENOENT')return fallback;throw error}}

export async function build({source=DEFAULT_SOURCE,output:outputPath=DEFAULT_OUTPUT,overrides=DEFAULT_OVERRIDES,zonesFile=DEFAULT_ZONES}={}){
  const SOURCE=source,OUTPUT=outputPath;
  const manifest=JSON.parse(await fs.readFile(path.join(SOURCE,'manifest.json'),'utf8'));
  const [coast,names,points,grid,admin,zonesCollection]=await Promise.all([
    ...['coastal-parts.geojson','part-names.json','point-pairs.json','dmi-grid-proof.json'].map(name=>read(SOURCE,name)),
    optionalJson(overrides,{partOwnership:{}}),optionalJson(zonesFile,{features:[]})
  ]);
  for(const [name,expected] of Object.entries(manifest.files||{})){
    const source={
      'coastal-parts.geojson':coast,
      'part-names.json':names,
      'point-pairs.json':points,
      'dmi-grid-proof.json':grid,
    }[name];
    if(!source||sha(source.text)!==expected)throw new Error(`${name}: digest matcher ikke den ejer-godkendte kandidat`);
  }
  const features=coast.json.features||[],nameById=new Map((names.json.parts||[]).map(row=>[row.finalPartId,row])),pointById=new Map((points.json.parts||[]).map(row=>[row.finalPartId,row])),gridById=new Map((grid.json.parts||[]).map(row=>[row.finalPartId,row]));
  if(features.length!==manifest.partCount||nameById.size!==features.length||pointById.size!==features.length||gridById.size!==features.length)throw new Error('Aktiv kystdelskandidat er ikke 1:1 mellem geometri, navn, punktpar og DMI-grid');
  const zones={};
  const activeZoneIds=new Set((zonesCollection.features||[]).filter(feature=>feature.properties?.zoneStatus!=='retired'&&feature.properties?.active!==false).map(feature=>feature.properties?.id));
  const ownership=admin?.partOwnership||{};
  for(const feature of features){
    const id=feature.properties?.finalPartId||feature.properties?.partId,sourceZoneId=feature.properties?.zoneId,n=nameById.get(id),p=pointById.get(id),g=gridById.get(id);
    const requestedZoneId=ownership[id]?.targetZoneId;
    if(requestedZoneId&&!activeZoneIds.has(requestedZoneId))throw new Error(`${id}: admin-ejerskab peger på en ukendt eller slettet hovedzone (${requestedZoneId})`);
    const zoneId=requestedZoneId||sourceZoneId;
    if(!id||!zoneId||!n||!p||!g||p.status!=='private-point-pair-proposed'||g.status!=='validated-selected-water-point')throw new Error(`${id||'ukendt'}: ugyldig aktiv kystdel`);
    // Når en hovedzone slettes, forsvinder dens kystdele også, medmindre ejeren
    // udtrykkeligt har flyttet dem til en anden aktiv hovedzone først.
    if(!activeZoneIds.has(zoneId))continue;
    (zones[zoneId]??=[]).push({
      partId:id,
      sourceZoneId,
      name:n.suggestedName,
      geometry:publicGeometry(feature.geometry),
      landPoint:p.landPoint,
      waterPoint:p.waterPoint,
      onshoreDirectionDeg:p.onshoreDirectionDeg,
      marineCoverage:g.selected?.fullWeatherCoverage?'full':'partial',
      coverageGaps:g.selected?.coverageGaps||[],
    });
  }
  for(const parts of Object.values(zones))parts.sort((a,b)=>a.name.localeCompare(b.name,'da')||a.partId.localeCompare(b.partId));
  const publicPartCount=Object.values(zones).reduce((sum,parts)=>sum+parts.length,0);
  const output={schemaVersion:2,enabled:manifest.publicActivation===true,datasetVersion:manifest.sourceVersion,sourceRunId:manifest.sourceRunId,generatedAt:`${manifest.activatedAt}T00:00:00.000Z`,partCount:publicPartCount,sourcePartCount:features.length,zoneCount:Object.keys(zones).length,wholeZoneMarginPoints:7,zones};
  await fs.mkdir(path.dirname(OUTPUT),{recursive:true});await fs.writeFile(OUTPUT,`${JSON.stringify(output)}\n`);return output;
}

async function selfTest(){
  const output=await build();
  if(output.partCount<1||output.zoneCount<1||Object.values(output.zones).flat().some(part=>!part.landPoint||!part.waterPoint))throw new Error('Public kystdelsbygger self-test fejlede');
  console.log(`Public kystdelskontrakt: ${output.partCount} dele i ${output.zoneCount} zoner`);
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))(process.argv.includes('--self-test')?selfTest():build().then(output=>console.log(JSON.stringify({partCount:output.partCount,zoneCount:output.zoneCount})))).catch(error=>{console.error(error.message);process.exit(1)});
