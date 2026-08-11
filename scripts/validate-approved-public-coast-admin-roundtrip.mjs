#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const hash=value=>crypto.createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex').slice(0,24);
const flags=['productionGeometryChanged','adminDataChanged','weatherSamplingChanged','stateChanged','publicRuntimeChanged','scoreChanged','automaticActivationAllowed'];

export function buildDraft(manifest,registry,runId='self-test'){
  if(manifest?.status!=='private-owner-approved-runtime-bundle-not-active'||manifest.partCount!==643||manifest.parentZoneCount!==212||manifest.publicActivation!==false)throw new Error('Admin-gaten kræver den deaktiverede 643-dels runtimepakke');
  if(registry?.status!=='private-owner-approved-not-active'||registry.features?.length!==212||registry.automaticActivationAllowed!==false)throw new Error('Admin-gaten kræver det private 212-zoners register');
  const added=registry.features.filter(feature=>['DK-B04-12','DK-B04-13','DK-B04-14'].includes(feature.properties?.id)).map(feature=>({id:feature.properties.id,name:feature.properties.name,coastType:feature.properties.coastType,dataPoint:feature.properties.dataPoint,pinPoint:feature.properties.pinPoint,onshoreDirectionDeg:feature.properties.onshoreDirectionDeg,zoneStatus:feature.properties.zoneStatus}));
  if(added.length!==3)throw new Error('Admin-kladden mangler de tre Vadehavszoner');
  return{schemaVersion:'1.0.0',status:'private-approved-public-coast-draft-never-active',runId,partCount:643,preciseZoneCount:206,parentZoneCount:212,bundleFileDigests:manifest.files,zoneRegistryDigest:hash(registry),addedParentZones:added,publicActivation:false,published:false,scoreEnabled:false,automaticActivationAllowed:false};
}

async function main(){
  if(process.argv.includes('--self-test')){const manifest={status:'private-owner-approved-runtime-bundle-not-active',partCount:643,parentZoneCount:212,publicActivation:false,files:{}},registry={status:'private-owner-approved-not-active',automaticActivationAllowed:false,features:Array.from({length:212},(_,i)=>({properties:{id:i<3?`DK-B04-${12+i}`:`Z${i}`,name:`Z${i}`}}))},draft=buildDraft(manifest,registry);if(draft.addedParentZones.length!==3||draft.published)throw new Error('Self-test fejlede');console.log('Godkendt kyst admin-roundtrip self-test: bestået');return;}
  const args=process.argv.slice(2),val=(flag,fallback)=>{const index=args.indexOf(flag);return index<0?fallback:args[index+1]};
  const bundle=val('--bundle','.geometry-v2-work/approved-public-coast-runtime-bundle'),registryPath=val('--registry','data/geometry-v2/approved-public-coast-zone-registry-2026-08-11.geojson'),output=val('--output','.geometry-v2-work/approved-public-coast-admin-roundtrip.json');
  const url=(process.env.SUPABASE_URL||'').replace(/\/$/,''),key=process.env.SUPABASE_SERVICE_ROLE_KEY||'';if(!url||!key)throw new Error('Supabase-secrets mangler');
  const headers={apikey:key,'Content-Type':'application/json'};if(!key.startsWith('sb_secret_'))headers.Authorization=`Bearer ${key}`;
  const [manifest,registry]=await Promise.all([fs.readFile(path.join(bundle,'manifest.json'),'utf8'),fs.readFile(registryPath,'utf8')].map(p=>p.then(JSON.parse)));
  const endpoint=`${url}/rest/v1/admin_documents`,runId=process.env.GITHUB_RUN_ID||String(Date.now()),tempKey=`approved-public-coast-private-roundtrip-${runId}`,draft=buildDraft(manifest,registry,runId);
  const request=async(suffix,options={})=>{const response=await fetch(endpoint+suffix,{...options,headers:{...headers,...options.headers}}),body=await response.text();if(!response.ok)throw new Error(`Central kyst-admin-roundtrip fejlede (${response.status})`);return body?JSON.parse(body):null};
  const read=async documentKey=>(await request(`?document_key=eq.${encodeURIComponent(documentKey)}&select=document_key,payload,version,updated_at`))?.[0]??null;
  const protectedKeys=['coastline-overrides','direction-reviews','coastal-parts-v2-activation'];
  const before=Object.fromEntries(await Promise.all(protectedKeys.map(async documentKey=>[documentKey,await read(documentKey)])));
  let created=false,readBack=false,updated=false,deleted=false;
  try{
    if(await read(tempKey))throw new Error('Midlertidig godkendt-kystnøgle fandtes allerede');
    await request('',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({document_key:tempKey,payload:{...draft,phase:'create'}})});created=true;
    let row=await read(tempKey);readBack=row?.payload?.partCount===643&&row?.payload?.parentZoneCount===212&&row?.payload?.published===false;if(!readBack)throw new Error('Kystkladde-readback fejlede');
    await request(`?document_key=eq.${encodeURIComponent(tempKey)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({payload:{...draft,phase:'rollback-ready'}})});
    row=await read(tempKey);updated=row?.payload?.phase==='rollback-ready';if(!updated)throw new Error('Kystkladde-update-readback fejlede');
  }finally{
    await request(`?document_key=eq.${encodeURIComponent(tempKey)}`,{method:'DELETE',headers:{Prefer:'return=representation'}}).catch(()=>{});deleted=!(await read(tempKey));
  }
  const after=Object.fromEntries(await Promise.all(protectedKeys.map(async documentKey=>[documentKey,await read(documentKey)])));
  const unchanged=protectedKeys.every(documentKey=>hash(before[documentKey]?.payload??null)===hash(after[documentKey]?.payload??null)&&before[documentKey]?.version===after[documentKey]?.version);
  if(!created||!readBack||!updated||!deleted||!unchanged)throw new Error('Kystkladde-roundtrip eller rollback var ikke komplet');
  const report={schemaVersion:'1.0.0',status:'passed-private-approved-public-coast-admin-roundtrip',generatedAt:new Date().toISOString(),partCount:643,parentZoneCount:212,tempDocumentCreated:created,tempDocumentReadBack:readBack,tempDocumentUpdated:updated,tempDocumentDeleted:deleted,tempDocumentAbsentAfterRollback:deleted,protectedDocuments:protectedKeys.map(documentKey=>({documentKey,versionBefore:before[documentKey]?.version??null,versionAfter:after[documentKey]?.version??null,payloadDigestBefore:hash(before[documentKey]?.payload??null),payloadDigestAfter:hash(after[documentKey]?.payload??null),unchanged:true})),protectedRuntimeUnchanged:true,rawGeometryStored:false,credentialOrRequestUrlStored:false,...Object.fromEntries(flags.map(flag=>[flag,false]))};
  await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,partCount:643,parentZoneCount:212,protectedRuntimeUnchanged:true,tempDocumentDeleted:true}));
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))main().catch(error=>{console.error(error.message);process.exit(1)});
