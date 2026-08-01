const url=(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const key=process.env.SUPABASE_SERVICE_ROLE_KEY||'';
if(!url||!key)throw new Error('SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY mangler');
const headers={apikey:key,'Content-Type':'application/json'};
if(!key.startsWith('sb_secret_'))headers.Authorization=`Bearer ${key}`;
const id=`github-e2e-${Date.now()}`;
const endpoint=`${url}/rest/v1/admin_documents`;
async function req(path,options={}){const r=await fetch(endpoint+path,{...options,headers:{...headers,...options.headers}});const text=await r.text();if(!r.ok)throw new Error(`${options.method||'GET'} ${path}: ${r.status} ${text.slice(0,300)}`);return text?JSON.parse(text):null;}
try{
  await req('',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({document_key:id,payload:{phase:'create',id}})});
  let rows=await req(`?document_key=eq.${encodeURIComponent(id)}&select=document_key,payload,version,updated_at`);
  if(rows?.[0]?.payload?.phase!=='create')throw new Error('Create kunne ikke verificeres');
  await req(`?document_key=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({payload:{phase:'update',id}})});
  rows=await req(`?document_key=eq.${encodeURIComponent(id)}&select=payload,version`);
  if(rows?.[0]?.payload?.phase!=='update')throw new Error('Update kunne ikke verificeres');
  await req(`?document_key=eq.${encodeURIComponent(id)}`,{method:'DELETE',headers:{Prefer:'return=representation'}});
  rows=await req(`?document_key=eq.${encodeURIComponent(id)}&select=document_key`);
  if(rows.length)throw new Error('Delete kunne ikke verificeres');
  console.log('Supabase persistence E2E: create/read/update/delete bestået');
}catch(error){console.error(error);process.exitCode=1;}
