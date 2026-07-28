import { PUBLIC_CONFIG } from "../../config.js";
import { currentSession } from "./auth-service.js";

const PREFIX="ravradar-admin-document:";
const listeners=new Set();
const pending=new Map();
const enabled=Boolean(PUBLIC_CONFIG.supabaseUrl&&PUBLIC_CONFIG.supabasePublishableKey);
function emit(status){for(const fn of listeners)fn(status);}
function localKey(key){return `${PREFIX}${key}`;}
function readLocal(key,fallback){try{return JSON.parse(localStorage.getItem(localKey(key))||"null")??fallback}catch{return fallback}}
function writeLocal(key,payload){localStorage.setItem(localKey(key),JSON.stringify(payload));}
async function remoteRead(key){const s=currentSession();if(!enabled||!s?.access_token)return null;const q=encodeURIComponent(`eq.${key}`);const r=await fetch(`${PUBLIC_CONFIG.supabaseUrl}/rest/v1/admin_documents?document_key=${q}&select=payload,version,updated_at&limit=1`,{headers:{apikey:PUBLIC_CONFIG.supabasePublishableKey,Authorization:`Bearer ${s.access_token}`}});if(!r.ok)throw new Error(`Central læsning fejlede (${r.status})`);return (await r.json())[0]??null;}
async function remoteWrite(key,payload){const s=currentSession();if(!enabled||!s?.access_token)throw new Error("Central adminlagring kræver Supabase-login");const body={document_key:key,payload,updated_at:new Date().toISOString()};const r=await fetch(`${PUBLIC_CONFIG.supabaseUrl}/rest/v1/admin_documents`,{method:"POST",headers:{apikey:PUBLIC_CONFIG.supabasePublishableKey,Authorization:`Bearer ${s.access_token}`,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify(body)});if(!r.ok)throw new Error(`Central gemning fejlede (${r.status})`);return (await r.json())[0]??body;}
export function onAdminSaveStatus(fn){listeners.add(fn);return()=>listeners.delete(fn);}
export async function loadAdminDocument(key,fallback){const local=readLocal(key,null);try{const remote=await remoteRead(key);if(remote?.payload){writeLocal(key,remote.payload);emit({state:"saved",key,at:remote.updated_at,central:true});return remote.payload;}}catch(error){emit({state:"local",key,error:error.message,central:false});}return local??fallback;}
export function queueAdminDocumentSave(key,payload,{delay=500}={}){writeLocal(key,payload);emit({state:"saving",key,central:false});clearTimeout(pending.get(key));pending.set(key,setTimeout(async()=>{try{const row=await remoteWrite(key,payload);emit({state:"saved",key,at:row.updated_at||new Date().toISOString(),central:true});}catch(error){emit({state:"local",key,error:error.message,central:false});}},delay));}
export async function saveAdminDocumentNow(key,payload){writeLocal(key,payload);emit({state:"saving",key,central:false});try{const row=await remoteWrite(key,payload);emit({state:"saved",key,at:row.updated_at||new Date().toISOString(),central:true});return true}catch(error){emit({state:"local",key,error:error.message,central:false});return false}}
export function centralAdminStorageEnabled(){return enabled&&Boolean(currentSession()?.access_token);}
