import { PUBLIC_CONFIG } from '../../config.js?v=4.0.312';
import { authorizedFetch, currentSession, requireFreshSession } from './auth-service.js?v=4.0.312';

const KEY='ravradar-handbook-review-drafts-v1';
const enabled=Boolean(PUBLIC_CONFIG.supabaseUrl&&PUBLIC_CONFIG.supabasePublishableKey);
const TABLE_URL=()=>`${PUBLIC_CONFIG.supabaseUrl}/rest/v1/handbook_reviews`;

function drafts(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}
function save(rows){localStorage.setItem(KEY,JSON.stringify(rows));}
function id(){return crypto.randomUUID?.()||`review-${Date.now()}-${Math.random().toString(36).slice(2)}`;}
export function centralReviewStorageEnabled(){return enabled&&Boolean(currentSession()?.access_token);}

async function responseError(response,action){
 const raw=await response.text().catch(()=> '');
 let body=null;try{body=raw?JSON.parse(raw):null;}catch{}
 const message=body?.message||body?.error_description||body?.hint||body?.details||raw||`HTTP ${response.status}`;
 const code=body?.code?` [${body.code}]`:'';
 return new Error(`${action} (${response.status})${code}: ${message}`);
}

function reviewPayload(review,{includeOptional=true}={}){
 const session=currentSession();
 const payload={
  id:review.id,
  handbook_version:review.handbookVersion,
  section_id:review.sectionId,
  section_title:review.sectionTitle,
  expertise:review.expertise,
  issue:review.issue,
  proposal:review.proposal,
  reasoning:review.reasoning,
  status:'new',
  created_by:session?.user?.id
 };
 if(includeOptional){
  payload.expert_name=review.expertName||null;
  payload.organization=review.organization||null;
  payload.client_payload=review;
 }
 return payload;
}

async function insertPayload(payload){
 const response=await authorizedFetch(TABLE_URL(),{
  method:'POST',
  headers:{'Content-Type':'application/json',Prefer:'return=representation'},
  body:JSON.stringify(payload)
 });
 if(!response.ok)throw await responseError(response,'Central gemning fejlede');
 const rows=await response.json().catch(()=>[]);
 return rows[0]||null;
}

async function remoteInsert(review){
 await requireFreshSession();
 const session=currentSession();
 if(!enabled||!session?.access_token||!session?.user?.id)throw new Error('Login kræves, og sessionen skal indeholde et bruger-id.');
 let inserted;
 try{
  inserted=await insertPayload(reviewPayload(review));
 }catch(error){
  // Ældre, allerede installerede Supabase-skemaer kan mangle de nyere valgfrie
  // kolonner. Bevar den eksisterende installation og genforsøg med kerneskemaet.
  if(!/client_payload|expert_name|organization|schema cache|column/i.test(error.message))throw error;
  inserted=await insertPayload(reviewPayload(review,{includeOptional:false}));
 }
 const verify=await authorizedFetch(`${TABLE_URL()}?id=eq.${encodeURIComponent(review.id)}&select=*`,{headers:{'Cache-Control':'no-store'}});
 if(!verify.ok)throw await responseError(verify,'Rettelsen blev skrevet, men kunne ikke verificeres');
 const rows=await verify.json();
 if(rows.length!==1||rows[0].id!==review.id)throw new Error('Rettelsen kunne ikke læses tilbage fra Supabase. Kontrollér RLS-politikken for egne reviews.');
 return rows[0]||inserted;
}

export async function submitHandbookReview(input){
 const review={...input,id:id(),createdAt:new Date().toISOString(),schemaVersion:2};
 try{return{central:true,row:await remoteInsert(review)}}catch(error){
  const rows=drafts();rows.unshift({...review,localOnly:true,lastError:error.message});save(rows);
  return{central:false,error:error.message,review};
 }
}

export function exportLocalHandbookDrafts(){
 const data={schemaVersion:1,exportedAt:new Date().toISOString(),reviews:drafts()};
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');
 a.href=URL.createObjectURL(blob);a.download=`ravradar-ekspertrettelser-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),0);
}
export function localHandbookDraftCount(){return drafts().length;}
export function listLocalHandbookDrafts(){return drafts();}
export function deleteLocalHandbookDraft(reviewId){const rows=drafts().filter(x=>x.id!==reviewId);save(rows);return rows;}
export async function retryLocalHandbookDraft(reviewId){const rows=drafts();const review=rows.find(x=>x.id===reviewId);if(!review)throw new Error('Den lokale nødkladde findes ikke længere.');const row=await remoteInsert(review);save(rows.filter(x=>x.id!==reviewId));return row;}

export async function listHandbookReviews(){
 if(!enabled||!currentSession()?.access_token)return[];
 const response=await authorizedFetch(`${TABLE_URL()}?select=*&order=created_at.desc`);
 if(!response.ok)throw await responseError(response,'Kunne ikke hente ekspertrettelser');
 const rows=await response.json();
 return rows.filter(row=>!String(row.resolution_note||'').startsWith('[ARKIVERET]'));
}

export async function archiveHandbookReview(reviewId,reason='Arkiveret af ejer') {
 return updateHandbookReview(reviewId,{status:'rejected',resolution_note:`[ARKIVERET] ${reason} · ${new Date().toISOString()}`});
}

export async function updateHandbookReview(reviewId,patch){
 await requireFreshSession();
 const response=await authorizedFetch(`${TABLE_URL()}?id=eq.${encodeURIComponent(reviewId)}`,{
  method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(patch)
 });
 if(!response.ok)throw await responseError(response,'Kunne ikke opdatere ekspertrettelse');
 return (await response.json().catch(()=>[]))[0]||null;
}

async function deleteOrArchiveProbe(probeId){
 const response=await authorizedFetch(`${TABLE_URL()}?id=eq.${encodeURIComponent(probeId)}`,{method:'DELETE',headers:{Prefer:'return=representation'}});
 if(response.ok){
  const verify=await authorizedFetch(`${TABLE_URL()}?id=eq.${encodeURIComponent(probeId)}&select=id`,{headers:{'Cache-Control':'no-store'}});
  if(!verify.ok)throw await responseError(verify,'Oprydningen kunne ikke verificeres');
  if((await verify.json()).length)throw new Error('Testreviewet blev ikke fjernet igen.');
  return'deleted';
 }
 // Nogle eksisterende installationer har med vilje ingen DELETE-policy. I så fald
 // efterlades højst én tydeligt mærket, afvist systemtestpost i stedet for at fejle
 // eller kræve en ny Supabase-installation.
 const deleteError=await responseError(response,'Testreview kunne ikke slettes');
 const archived=await updateHandbookReview(probeId,{
  status:'rejected',
  resolution_note:`[ARKIVERET] Automatisk systemtest afsluttet og skjult fra reviewkøen. DELETE var ikke tilladt; auditsporet er bevaret. ${deleteError.message}`
 });
 if(!archived||archived.status!=='rejected')throw deleteError;
 return'archived';
}

export async function createHandbookReviewProbe(runId){
 const session=await requireFreshSession();
 const probe={
  id:crypto.randomUUID?.()||`probe-${runId}-${Date.now()}`,
  handbookVersion:'systemtest',sectionId:'system-test',sectionTitle:'Automatisk systemtest',
  expertise:'Data og software',issue:'Automatisk testpost – må ikke behandles fagligt',
  proposal:'Test af central skrivning og readback',reasoning:`Oprettet af RavRadars samlede funktionstest ${runId}`,
  expertName:'RavRadar systemtest',organization:null,createdBy:session.user?.id
 };
 await remoteInsert(probe);
 const patch=await updateHandbookReview(probe.id,{status:'reviewing',resolution_note:'Automatisk readback- og opdateringstest'});
 if(!patch||patch.status!=='reviewing')throw new Error('Testreview kunne ikke opdateres og læses tilbage.');
 const cleanup=await deleteOrArchiveProbe(probe.id);
 return cleanup==='deleted'
  ?'Opret, læs, opdater og slet af håndbogsreview bestået.'
  :'Opret, læs og opdater bestod. Supabase-installationen tillader ikke DELETE, så testposten blev soft-slettet og skjult fra reviewkøen.';
}
