import { currentSession, requireFreshSession } from './auth-service.js';
import { readAdminDocumentNow, saveAdminDocumentNow } from './admin-document-store.js';
import { listProfiles } from './permissions-service.js';
import { listHandbookReviews } from './handbook-review-store.js';

const DOCUMENTS=['rules','rule-history','water-level-station-routing','direction-reviews','coastline-overrides'];
const clone=value=>value==null?value:structuredClone(value);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

async function testDocument(key,runId){
  const before=await readAdminDocumentNow(key);
  if(!before?.payload)return {name:key,status:'skipped',detail:'Dokumentet findes endnu ikke centralt.'};
  const original=clone(before.payload);
  const probe={...clone(original),__ravradarPersistenceProbe:{runId,phase:'write',at:new Date().toISOString()}};
  const write=await saveAdminDocumentNow(key,probe,{writeLocal:false});
  if(!write.ok)throw new Error(write.error?.message||String(write.error||'Skrivning fejlede'));
  const written=await readAdminDocumentNow(key);
  if(written?.payload?.__ravradarPersistenceProbe?.runId!==runId)throw new Error('Testmarkøren blev ikke læst tilbage fra Supabase.');
  const updated={...clone(probe),__ravradarPersistenceProbe:{runId,phase:'update',at:new Date().toISOString()}};
  const update=await saveAdminDocumentNow(key,updated,{writeLocal:false});
  if(!update.ok)throw new Error(update.error?.message||String(update.error||'Opdatering fejlede'));
  const updatedRead=await readAdminDocumentNow(key);
  if(updatedRead?.payload?.__ravradarPersistenceProbe?.phase!=='update')throw new Error('Opdateringen blev ikke læst tilbage.');
  const restore=await saveAdminDocumentNow(key,original,{writeLocal:false});
  if(!restore.ok)throw new Error('Originalen kunne ikke gendannes.');
  const restored=await readAdminDocumentNow(key);
  if(!equal(restored?.payload,original))throw new Error('Gendannelsen kunne ikke verificeres.');
  return {name:key,status:'passed',detail:`Skriv, læs, opdater og gendan bestået · v${restored.version??'?'}`,serverAt:restored.updated_at};
}

export async function runFullPersistenceTest(){
  await requireFreshSession();
  const session=currentSession();
  const runId=`e2e-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const startedAt=new Date().toISOString();
  const results=[];
  for(const key of DOCUMENTS){try{results.push(await testDocument(key,runId));}catch(error){results.push({name:key,status:'failed',detail:error.message});}}
  try{const profiles=await listProfiles();results.push({name:'ekspertprofiler og rettigheder',status:'passed',detail:`RLS-læsning bestået (${profiles.length} profiler). Skrivning testes ikke mod en virkelig bruger for at undgå rettighedstab.`});}catch(error){results.push({name:'ekspertprofiler og rettigheder',status:'failed',detail:error.message});}
  try{const reviews=await listHandbookReviews();results.push({name:'håndbogskommentarer',status:'passed',detail:`RLS-læsning bestået (${reviews.length} kommentarer). Der oprettes ikke kunstige ekspertkommentarer.`});}catch(error){results.push({name:'håndbogskommentarer',status:'failed',detail:error.message});}
  return {runId,startedAt,finishedAt:new Date().toISOString(),userId:session?.user?.id||null,ok:results.every(x=>x.status!=='failed'),results};
}
