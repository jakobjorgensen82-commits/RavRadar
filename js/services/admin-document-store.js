import { PUBLIC_CONFIG } from "../../config.js?v=4.0.299";
import { authorizedFetch, currentSession, requireFreshSession } from "./auth-service.js?v=4.0.299";

const PREFIX="ravradar-admin-document:";
const listeners=new Set();
const pending=new Map();
const enabled=Boolean(PUBLIC_CONFIG.supabaseUrl&&PUBLIC_CONFIG.supabasePublishableKey);
const lastStatus=new Map();
const LOCAL_CACHE_KEYS=new Set(['rules','rule-history','water-level-station-routing','direction-reviews','coastline-overrides']);
function clearObsoleteAdminDocumentCaches(){
  try{
    for(let i=localStorage.length-1;i>=0;i--){
      const key=localStorage.key(i);
      if(key?.startsWith(PREFIX)&&!LOCAL_CACHE_KEYS.has(key.slice(PREFIX.length)))localStorage.removeItem(key);
    }
  }catch{}
}
clearObsoleteAdminDocumentCaches();
function emit(status){lastStatus.set(status.key||'global',status);for(const fn of listeners)fn(status);}
function localKey(key){return `${PREFIX}${key}`;}
function readLocal(key,fallback){try{return JSON.parse(localStorage.getItem(localKey(key))||"null")??fallback}catch{return fallback}}
function writeLocal(key,payload){
  if(!LOCAL_CACHE_KEYS.has(key))return {ok:false,skipped:true};
  let serialized;
  try{serialized=JSON.stringify(payload);}catch(error){return {ok:false,error};}
  try{localStorage.setItem(localKey(key),serialized);return {ok:true};}
  catch(error){
    clearObsoleteAdminDocumentCaches();
    try{localStorage.setItem(localKey(key),serialized);return {ok:true,recovered:true};}
    catch(retryError){console.warn(`[RavRadar] Lokal cache kunne ikke gemmes for ${key}; central gemning fortsætter.`,retryError);return {ok:false,error:retryError};}
  }
}
async function remoteRead(key){
  if(!enabled)return null; await requireFreshSession();
  const q=encodeURIComponent(`eq.${key}`);
  const r=await authorizedFetch(`${PUBLIC_CONFIG.supabaseUrl}/rest/v1/admin_documents?document_key=${q}&select=payload,version,updated_at,updated_by&limit=1`);
  if(!r.ok)throw new Error(`Central læsning fejlede (${r.status})`);
  return (await r.json())[0]??null;
}
async function remoteWrite(key,payload){
  if(!enabled)throw new Error("Supabase er ikke konfigureret"); await requireFreshSession();
  const body={document_key:key,payload};
  const r=await authorizedFetch(`${PUBLIC_CONFIG.supabaseUrl}/rest/v1/rpc/save_ravradar_admin_document`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({p_document_key:key,p_payload:payload})});
  if(!r.ok){ const detail=await r.text().catch(()=>""); throw new Error(`Central gemning fejlede (${r.status})${detail?`: ${detail.slice(0,160)}`:''}`); }
  const rows=await r.json().catch(()=>[]); const row=Array.isArray(rows)?rows[0]:rows;
  const verified=await remoteRead(key);
  if(!verified?.payload)throw new Error("Central gemning kunne ikke verificeres efter skrivning");
  return verified||row||body;
}
export async function readAdminDocumentNow(key){return remoteRead(key);}
export function onAdminSaveStatus(fn){listeners.add(fn);return()=>listeners.delete(fn);}
export function getAdminSaveStatuses(){return Object.fromEntries(lastStatus);}
export async function loadAdminDocument(key,fallback){
  const local=readLocal(key,null);
  try{const remote=await remoteRead(key);if(remote?.payload){writeLocal(key,remote.payload);emit({state:"saved",key,at:remote.updated_at,version:remote.version,central:true});return remote.payload;}}
  catch(error){emit({state:"local",key,error:error.message,central:false});}
  return local??fallback;
}
export function queueAdminDocumentSave(key,payload,{delay=500}={}){writeLocal(key,payload);emit({state:"saving",key,central:false});clearTimeout(pending.get(key));pending.set(key,setTimeout(async()=>{try{const row=await remoteWrite(key,payload);emit({state:"saved",key,at:new Date().toISOString(),serverAt:row.updated_at||null,version:row.version,central:true});}catch(error){emit({state:"local",key,error:error.message,central:false});}},delay));}
export async function saveAdminDocumentNow(key,payload,{writeLocal:shouldWriteLocal=true}={}){if(shouldWriteLocal)writeLocal(key,payload);emit({state:"saving",key,central:false});try{const row=await remoteWrite(key,payload);const clientAt=new Date().toISOString();emit({state:"saved",key,at:clientAt,serverAt:row.updated_at||null,version:row.version,central:true});return {ok:true,row,clientAt}}catch(error){emit({state:"local",key,error:error.message,central:false});return {ok:false,error}}}
export function centralAdminStorageEnabled(){return enabled&&Boolean(currentSession()?.access_token);}
export async function adminStorageHealth(keys=['water-level-station-routing','direction-reviews','coastline-overrides']){
  const result={ok:true,checkedAt:new Date().toISOString(),documents:{}};
  try{await requireFreshSession();}catch(error){return {ok:false,checkedAt:result.checkedAt,error:error.message,documents:{}};}
  for(const key of keys){try{const row=await remoteRead(key);result.documents[key]={ok:true,exists:Boolean(row),updatedAt:row?.updated_at||null,version:row?.version||null};}catch(error){result.ok=false;result.documents[key]={ok:false,error:error.message};}}
  return result;
}
