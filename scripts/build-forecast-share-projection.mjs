import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { assertPublicRuntimeEnvelope, RAVSCORE_PUBLIC_DETAILS_KIND } from '../js/core/ravscore-public-runtime-contract.js';
import { buildForecastShareProjection, buildForecastShareZoneProjection, assembleForecastShareProjection,
  assertForecastShareDescriptor, assertForecastShareProjection, assertForecastShareZoneProjection,
  assertForecastShareProjectionParity, FORECAST_SHARE_DESCRIPTOR_SCHEMA, FORECAST_SHARE_ZONE_MAX_BYTES,
  FORECAST_SHARE_INDEX_MAX_BYTES } from '../js/services/forecast-share-projection.js';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const parse=bytes=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
const need=(ok,code)=>{if(!ok)throw new Error(code);};
async function regular(file,{bytes=null,sha256=null,limit=FORECAST_SHARE_ZONE_MAX_BYTES}={}) {
  const stat=await fs.lstat(file);
  need(stat.isFile()&&!stat.isSymbolicLink()&&stat.size>0&&stat.size<=limit
    &&(bytes===null||stat.size===bytes),'FORECAST_SHARE_FILE_SIZE');
  const body=await fs.readFile(file);
  need(body.length===stat.size&&(bytes===null||body.length===bytes)
    &&(sha256===null||hash(body)===sha256),'FORECAST_SHARE_FILE_HASH');
  return body;
}
async function writeContent(file,bytes) {
  await fs.mkdir(path.dirname(file),{recursive:true});
  try{await fs.writeFile(file,bytes,{flag:'wx'});}catch(error){
    if(error.code!=='EEXIST')throw error;
    const current=await regular(file,{bytes:bytes.length,sha256:hash(bytes)});
    need(current.equals(bytes),'FORECAST_SHARE_CONTENT_CONFLICT');
  }
}
async function writeDescriptor(file,bytes) {
  const temporary=file+'.tmp-'+crypto.randomUUID();
  await fs.writeFile(temporary,bytes,{flag:'wx'});
  try{await fs.rename(temporary,file);}catch(error){await fs.unlink(temporary).catch(()=>{});throw error;}
}
export function serializeForecastShareProjection({projection,manifest,manifestSha256}) {
  const zoneFiles=projection.zones.map(zone=>{
    const payload=buildForecastShareZoneProjection(projection,zone),bytes=Buffer.from(JSON.stringify(payload));
    need(bytes.length<=FORECAST_SHARE_ZONE_MAX_BYTES,'FORECAST_SHARE_PROJECTION_TOO_LARGE');
    const sha256=hash(bytes);
    return {entry:{id:zone.id,path:'./share/'+sha256+'.json',sha256,bytes:bytes.length},payload,bytes};
  });
  const descriptor={schemaVersion:FORECAST_SHARE_DESCRIPTOR_SCHEMA,manifestSha256,
    datasetId:manifest.datasetId,generatedAt:manifest.generatedAt,productionReferenceAt:manifest.productionReferenceAt,
    modelBinding:manifest.ravScoreModelBinding,zoneCount:210,forecastHours:118,modeCount:2,
    zones:zoneFiles.map(file=>file.entry)};
  const descriptorBytes=Buffer.from(JSON.stringify(descriptor)+'\n');
  need(descriptorBytes.length<=FORECAST_SHARE_INDEX_MAX_BYTES,'FORECAST_SHARE_INDEX_TOO_LARGE');
  assertForecastShareDescriptor(descriptor,manifest,manifestSha256);
  assertForecastShareProjection(projection,descriptor,manifest);
  zoneFiles.forEach(file=>assertForecastShareZoneProjection(file.payload,descriptor,manifest,file.entry));
  return {descriptor,descriptorBytes,zoneFiles};
}
// Only the direct return of the normal in-process public producer belongs on
// this branch. It is not public input or independent artifact authenticity.
// Hash the already held text in small UTF-8-safe slices, never a second340MB
// Buffer/string/decoded object. The full disk artifact parity remains mandatory.
function producerTextSha256(text) {
  const digest=crypto.createHash('sha256');
  for(let at=0;at<text.length;){
    let end=Math.min(at+64*1024,text.length);
    const last=text.charCodeAt(end-1);
    if(end<text.length&&last>=0xd800&&last<=0xdbff)end--;
    digest.update(text.slice(at,end),'utf8');at=end;
  }
  return digest.digest('hex');
}
async function producerDetails(producerResult,manifest,file) {
  need(producerResult&&typeof producerResult==='object'
    &&typeof producerResult.detailsText==='string'
    &&JSON.stringify(producerResult.manifest)===JSON.stringify(manifest),'FORECAST_SHARE_PRODUCER_MANIFEST');
  const stat=await fs.lstat(file);
  need(stat.isFile()&&!stat.isSymbolicLink()&&stat.size>0&&stat.size<=512*1024*1024
    &&stat.size===manifest.publicConditionDetailsBytes,'FORECAST_SHARE_FILE_SIZE');
  need(Buffer.byteLength(producerResult.detailsText,'utf8')===manifest.publicConditionDetailsBytes
    &&producerTextSha256(producerResult.detailsText)===manifest.publicConditionDetailsSha256,'FORECAST_SHARE_PRODUCER_TEXT_BINDING');
  const details=producerResult.detailsDocument;
  assertPublicRuntimeEnvelope(details,{kind:RAVSCORE_PUBLIC_DETAILS_KIND,
    datasetId:manifest.datasetId,productionReferenceAt:manifest.productionReferenceAt,
    payloadBodySha256:manifest.ravScoreRuntime?.details?.payloadBodySha256,
    modelBinding:manifest.ravScoreModelBinding,label:'Forecast sharing normal producer details'});
  need(details.generatedAt===manifest.generatedAt,'FORECAST_SHARE_PRODUCER_GENERATION');
  return details;
}
export async function writeForecastShareProjection({repository=ROOT,producerResult=null}={}) {
  const live=path.join(repository,'data/live');
  const manifestBytes=await regular(path.join(live,'manifest.json'),{limit:1024*1024});
  const manifest=parse(manifestBytes);
  const [details,registryBytes]=await Promise.all([
    producerResult===null
      ? regular(path.join(live,'public-condition-details.json'),{bytes:manifest.publicConditionDetailsBytes,sha256:manifest.publicConditionDetailsSha256,limit:512*1024*1024}).then(parse)
      : producerDetails(producerResult,manifest,path.join(live,'public-condition-details.json')),
    regular(path.join(repository,'data/zones.geojson'),{bytes:manifest.zoneRegistryBytes,sha256:manifest.zoneRegistrySha256,limit:32*1024*1024}),
  ]);
  const registry=parse(registryBytes);
  const projection=buildForecastShareProjection({manifest,details,registry});
  const files=serializeForecastShareProjection({projection,manifest,manifestSha256:hash(manifestBytes)});
  const parity=assertForecastShareProjectionParity({projection,descriptor:files.descriptor,manifest,details,registry});
  for(const file of files.zoneFiles)await writeContent(path.join(live,file.entry.path.slice(2)),file.bytes);
  need((await regular(path.join(live,'manifest.json'),{limit:1024*1024})).equals(manifestBytes),'FORECAST_SHARE_SOURCE_MOVED');
  await writeDescriptor(path.join(live,'forecast-share.json'),files.descriptorBytes);
  return Object.freeze({descriptor:files.descriptor,files:files.zoneFiles.length+1,comparisons:parity.comparisons,manifestUnchanged:true});
}
export async function readForecastShareProjectionFiles({liveDirectory,manifestText,required=false}={}) {
  let descriptorBytes;
  try{descriptorBytes=await regular(path.join(liveDirectory,'forecast-share.json'),{limit:FORECAST_SHARE_INDEX_MAX_BYTES});}
  catch(error){if(error.code==='ENOENT'&&!required)return null;throw error;}
  const manifestBytes=Buffer.from(manifestText);
  const manifest=parse(manifestBytes),descriptor=parse(descriptorBytes);
  assertForecastShareDescriptor(descriptor,manifest,hash(manifestBytes));
  const zoneFiles=[];
  for(const entry of descriptor.zones){
    const bytes=await regular(path.join(liveDirectory,entry.path.slice(2)),entry);
    const payload=assertForecastShareZoneProjection(parse(bytes),descriptor,manifest,entry);
    zoneFiles.push({entry,bytes,payload});
  }
  const projection=assembleForecastShareProjection(zoneFiles.map(file=>file.payload),descriptor,manifest);
  return {descriptor,descriptorBytes,projection,zoneFiles};
}
export async function copyForecastShareProjection({source,target}={}) {
  const manifestText=(await regular(path.join(source,'manifest.json'),{limit:1024*1024})).toString('utf8');
  const files=await readForecastShareProjectionFiles({liveDirectory:source,manifestText});
  if(!files)return {files:0};
  for(const file of files.zoneFiles)await writeContent(path.join(target,file.entry.path.slice(2)),file.bytes);
  await fs.writeFile(path.join(target,'forecast-share.json'),files.descriptorBytes);
  return {files:files.zoneFiles.length+1};
}
export async function auditForecastShareProjectionFiles({liveDirectory,manifestText,details,registry,required=false}={}) {
  const files=await readForecastShareProjectionFiles({liveDirectory,manifestText,required});
  if(!files)return null;
  const parity=assertForecastShareProjectionParity({projection:files.projection,descriptor:files.descriptor,
    manifest:JSON.parse(manifestText),details,registry});
  return {files:files.zoneFiles.length+1,comparisons:parity.comparisons,descriptor:files.descriptor};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await writeForecastShareProjection()));
}
