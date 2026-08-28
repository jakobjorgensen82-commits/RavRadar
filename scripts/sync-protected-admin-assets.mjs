import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {createSupabaseAdminRequester} from './lib/supabase-admin-rest.mjs';
import {buildRuntimeDiagnosticsEnvelope} from './lib/runtime-diagnostics-envelope.mjs';
import {fetchPreviousHandbookSource,mergeProtectedHandbook,stableHandbookDigest} from './lib/merge-protected-handbook.mjs';
const url=process.env.SUPABASE_URL?.replace(/\/$/,'');
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw new Error('SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY kræves');
const endpoint=`${url}/rest/v1/admin_documents`;
const request=createSupabaseAdminRequester({endpoint,key});
const assets={
 'weather-health':'data/live/weather-health.json',
 'runtime-diagnostics':'data/live/ravradar-runtime-diagnostics.json',
 'dmi-water-stations':'data/live/dmi-water-stations.json',
 'water-station-routing-audit':'data/live/water-station-routing-audit.json',
 'ocean-diagnostics':'data/diagnostics/dmi-ocean-diagnostics.json',
 'cache-audit':'data/diagnostics/dmi-cache-audit.json',
 'implementation-audit':'data/diagnostics/implementation-plan-audit.json',
 'coastal-parts-v2-activation':'data/geometry-v2/active-national-coastal-parts/manifest.json',
 'ravscore-profile-selection':'data/admin/ravscore-profile-selection.json',
 'handbook':'docs/handbook/content.json'
};
const lifecycleFields=['hasEverDelivered','firstObservationAt','lastObservationAt','lastObservationValueCm','consecutiveMissingObservationRuns','deliveryStatus','forecastCacheGeneratedAt','forecastCacheValidUntil','forecastCacheStatus','overallUsabilityStatus','forecastCacheZoneIds'];
const manifestKey='protected-asset-manifest';
const digest=payload=>crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
const stableDigest=payload=>crypto.createHash('sha256').update(JSON.stringify(stable(payload))).digest('hex');
const candidateGProfileId='RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3';
function assertCandidateGOnlySelection(payload,label='ravscore-profile-selection'){
 const version=String(payload?.sourceVersion||'');
 const valid=/^\d+\.\d+\.\d+$/.test(version)
  &&payload?.schemaVersion==='2.0.0'
  &&payload?.switchVersion===`RAVSCORE-PROFILE-SWITCH-${version}`
  &&payload?.requestedProfileId===candidateGProfileId
  &&payload?.candidateProfileId===candidateGProfileId
  &&payload?.rollbackProfileId===null
  &&payload?.candidateActivationEnabled===true
  &&payload?.prePublicWarmupAccepted===true
  &&payload?.automaticActivationAllowed===false
  &&payload?.publicAvailabilityPolicy==='candidate-g-local-fail-closed'
  &&payload?.legacyPublicFallbackAllowed===false
  &&String(payload?.status||'').startsWith('owner-approved-candidate-g-only-')
  &&Boolean(String(payload?.activationAuthority||'').trim())
  &&Boolean(String(payload?.evidence?.ownerReviewDecisionId||'').trim());
 if(!valid)throw new Error(`${label} er ikke den komplette Candidate G-only-kontrakt`);
 return payload;
}
async function existingDocument(documentKey){
 return (await request(`?select=payload&document_key=eq.${encodeURIComponent(documentKey)}&limit=1`,{},`beskyttet sync: læs ${documentKey}`))?.[0]?.payload??null;
}
function mergeStationDocuments(local,central){
 if(!central?.stations?.length)return local;
 const centralById=new Map(central.stations.map(st=>[String(st.stationId),st]));
 const stations=(local?.stations??[]).map(st=>{
  const old=centralById.get(String(st.stationId));
  if(!old)return st;
  const merged={...old,...st,properties:{...(old.properties??{}),...(st.properties??{})}};
  for(const field of lifecycleFields){
   const incoming=st[field];
   const missing=incoming===undefined||incoming===null||incoming==='unknown';
   if(missing&&old[field]!==undefined)merged[field]=old[field];
  }
  return merged;
 });
 for(const old of central.stations){if(!stations.some(st=>String(st.stationId)===String(old.stationId)))stations.push(old);}
 return {...central,...local,schemaVersion:Math.max(Number(local?.schemaVersion||0),Number(central?.schemaVersion||0),3),stations};
}
const previousManifest=await existingDocument(manifestKey);
const previousHandbookBaseline=await existingDocument('handbook-source-baseline');
const nextManifest={schemaVersion:1,assets:{}};
for(const [document_key,file] of Object.entries(assets)){
 let handbookSourceForBaseline=null;
 let payload;try{payload=JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT'){console.warn(`Springer over ${file}`);continue;}throw e;}
 if(document_key==='ravscore-profile-selection')assertCandidateGOnlySelection(payload,'Lokal ravscore-profile-selection');
 if(document_key==='dmi-water-stations')payload=mergeStationDocuments(payload,await existingDocument(document_key));
 if(document_key==='handbook'){
  const source=payload;
  const central=await existingDocument(document_key);
  const previousSourceHash=previousManifest?.assets?.[document_key]?.sha256;
  let compatibleBaseline=previousHandbookBaseline
   ??(central&&previousSourceHash&&digest(central)===previousSourceHash?central:null);
  if(!compatibleBaseline&&central&&previousSourceHash){
   compatibleBaseline=await fetchPreviousHandbookSource({
    url:process.env.RAVRADAR_PREVIOUS_HANDBOOK_URL,
    expectedDigest:previousSourceHash,
   });
  }
  const merged=mergeProtectedHandbook({source,central,baseline:compatibleBaseline});
  payload=merged.payload;
  handbookSourceForBaseline=source;
  console.log(`Beskyttet håndbog: ${merged.strategy}${merged.preservedSectionIds?.length?` (${merged.preservedSectionIds.length} ekspertredigerede afsnit bevaret)`:''}`);
 }
 if(document_key==='runtime-diagnostics'){
  const packed=buildRuntimeDiagnosticsEnvelope(payload);
  payload=packed.payload;
  console.log(`Beskyttet runtime-diagnostik pakket tabsfrit: ${packed.originalBytes} -> ${packed.storedBytes} byte`);
 }
 const hash=digest(payload);nextManifest.assets[document_key]={sha256:hash,bytes:Buffer.byteLength(JSON.stringify(payload))};
 if(previousManifest?.assets?.[document_key]?.sha256===hash)console.log(`Beskyttet admin-data uændret; springer skrivning over: ${document_key}`);
 else{
  await request('?on_conflict=document_key',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({document_key,payload,updated_by:null})},`beskyttet sync: skriv ${document_key}`);
  console.log(`Beskyttet admin-data synkroniseret: ${document_key}`);
 }
 if(handbookSourceForBaseline&&(!previousHandbookBaseline||stableHandbookDigest(previousHandbookBaseline)!==stableHandbookDigest(handbookSourceForBaseline))){
  await request('?on_conflict=document_key',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({document_key:'handbook-source-baseline',payload:handbookSourceForBaseline,updated_by:null})},'beskyttet sync: skriv handbook-source-baseline');
 }
}
nextManifest.generatedAt=new Date().toISOString();
await request('?on_conflict=document_key',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({document_key:manifestKey,payload:nextManifest,updated_by:null})},`beskyttet sync: skriv ${manifestKey}`);
const activationLocal=JSON.parse(await fs.readFile(assets['coastal-parts-v2-activation'],'utf8'));
const activationCentral=await existingDocument('coastal-parts-v2-activation');
if(!activationCentral||stableDigest(activationCentral)!==stableDigest(activationLocal)||activationCentral.publicActivation!==activationLocal.publicActivation){
 throw new Error('coastal-parts-v2-activation central readback matcher ikke den publicerede aktivering');
}
console.log(`Central kystdelsaktivering verificeret: ${activationCentral.publicActivation?'aktiv':'rollback'}`);
const ravScoreSelectionLocal=JSON.parse(await fs.readFile(assets['ravscore-profile-selection'],'utf8'));
const ravScoreSelectionCentral=await existingDocument('ravscore-profile-selection');
assertCandidateGOnlySelection(ravScoreSelectionLocal,'Lokal ravscore-profile-selection');
assertCandidateGOnlySelection(ravScoreSelectionCentral,'Central ravscore-profile-selection');
if(!ravScoreSelectionCentral
 ||stableDigest(ravScoreSelectionCentral)!==stableDigest(ravScoreSelectionLocal)
 ||ravScoreSelectionCentral.requestedProfileId!==ravScoreSelectionLocal.requestedProfileId
 ||ravScoreSelectionCentral.automaticActivationAllowed!==false){
 throw new Error('ravscore-profile-selection central readback matcher ikke den versionsbundne profilaktivering');
}
console.log(`Central RavScore-profil verificeret: ${ravScoreSelectionCentral.requestedProfileId}`);

