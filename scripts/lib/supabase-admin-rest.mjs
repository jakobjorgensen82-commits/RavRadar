const DEFAULT_RETRY_DELAY_MS=1000;

function parseJson(text){
  if(!text)return null;
  try{return JSON.parse(text);}catch{return null;}
}

function compact(value,maxLength=300){
  const text=String(value??'').replace(/\s+/g,' ').trim();
  return text.length>maxLength?`${text.slice(0,maxLength)}…`:text;
}

export function buildSupabaseAdminHeaders(key){
  if(!key)throw new Error('Supabase service key mangler');
  const headers={apikey:key,'Content-Type':'application/json'};
  // Nye sb_secret_-nøgler er ikke JWT'er og må kun sendes som apikey.
  if(!key.startsWith('sb_secret_'))headers.Authorization=`Bearer ${key}`;
  return headers;
}

export function isRetryableTranslatedSecretAuthError({key,status,body}){
  if(!key?.startsWith('sb_secret_')||status!==401)return false;
  return parseJson(body)?.code==='PGRST303';
}

export function isRetryableStatementTimeout({status,body}){
  return status===500&&parseJson(body)?.code==='57014';
}

export function isRetryableTransientRead({method,status}){
  return ['GET','HEAD'].includes(String(method||'GET').toUpperCase())
    && [429,502,503,504].includes(Number(status));
}

// Wrap only the transport operation, never JSON parsing or a size/integrity
// check. A successful HTTP status does not mean the response body arrived.
export async function readSupabaseBodyTransport(read){
  try{return await read();}catch{
    const error=new Error('Supabase response body transport was interrupted');
    error.code='SUPABASE_RESPONSE_BODY_TRANSPORT';
    throw error;
  }
}

export function createSupabaseAdminRequester({
  endpoint,
  key,
  fetchImpl=globalThis.fetch,
  delayImpl=ms=>new Promise(resolve=>setTimeout(resolve,ms)),
  retryDelayMs=DEFAULT_RETRY_DELAY_MS,
  logger=message=>console.warn(message)
}){
  if(!endpoint)throw new Error('Supabase admin-endpoint mangler');
  if(typeof fetchImpl!=='function')throw new Error('Fetch-funktion mangler');
  const baseHeaders=buildSupabaseAdminHeaders(key);

  return async function request(suffix='',options={},operation='admin-anmodning'){
    const method=options.method||'GET';
    for(let attempt=1;attempt<=2;attempt+=1){
      let response;
      try{
        response=await fetchImpl(endpoint+suffix,{...options,headers:{...baseHeaders,...options.headers}});
      }catch(error){
        if(attempt===1&&['GET','HEAD'].includes(String(method).toUpperCase())){
          logger(`Supabase ${operation} (${method}) fik en midlertidig netværksfejl; genprøver én gang efter ${retryDelayMs} ms`);
          await delayImpl(retryDelayMs);
          continue;
        }
        throw new Error(`Supabase ${operation} (${method}) kunne ikke nås: ${compact(error?.message||error)}`);
      }
      let body;
      try{
        body=await readSupabaseBodyTransport(()=>response.text());
      }catch(error){
        if(attempt===1&&['GET','HEAD'].includes(String(method).toUpperCase())){
          logger(`Supabase ${operation} (${method}) response body was interrupted; retrying once after ${retryDelayMs} ms`);
          await delayImpl(retryDelayMs);
          continue;
        }
        // An ordinary write may already have committed. Its owner must use
        // its exact read-back/CAS protocol instead of repeating it blindly.
        throw error;
      }
      if(response.ok){
        if(!body)return null;
        const parsed=parseJson(body);
        if(parsed===null)throw new Error(`Supabase ${operation} (${method}) returnerede ugyldigt JSON`);
        return parsed;
      }

      const parsed=parseJson(body);
      const code=parsed?.code||null;
      const translatedSecretAuth=isRetryableTranslatedSecretAuthError({key,status:response.status,body});
      const statementTimeout=isRetryableStatementTimeout({status:response.status,body});
      const transientRead=isRetryableTransientRead({method,status:response.status});
      const retryable=attempt===1&&(translatedSecretAuth||statementTimeout||transientRead);
      if(retryable){
        const reason=translatedSecretAuth?'PGRST303':statementTimeout?'statement-timeout 57014':`HTTP ${response.status}`;
        logger(`Supabase ${operation} (${method}) fik ${reason}; genprøver én gang efter ${retryDelayMs} ms`);
        await delayImpl(retryDelayMs);
        continue;
      }
      const detail=compact(parsed?.message||body||'intet fejlsvar');
      throw new Error(`Supabase ${operation} (${method}) fejlede: HTTP ${response.status}${code?` ${code}`:''} – ${detail}`);
    }
    throw new Error(`Supabase ${operation} (${method}) fejlede efter sikker genprøvning`);
  };
}
