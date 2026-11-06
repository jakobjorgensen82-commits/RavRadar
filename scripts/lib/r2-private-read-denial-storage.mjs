import {createR2PrivateRuntimeStorage} from './r2-private-runtime-storage.mjs';

const MAXIMUM_ERROR_BYTES=4096;
const authorizationError=/^(?:<\?xml version="1\.0" encoding="UTF-8"\?>[ \t\r\n]*)?<Error>[ \t\r\n]*<Code>InvalidArgument<\/Code>[ \t\r\n]*<Message>Authorization<\/Message>[ \t\r\n]*<\/Error>[ \t\r\n]*$/;

async function readErrorEnvelope(response){
  const declared=response.headers.get('content-length');
  if(declared!==null&&(!/^(0|[1-9][0-9]*)$/.test(declared)||Number(declared)>MAXIMUM_ERROR_BYTES)){
    await response.body?.cancel?.().catch(()=>{});return null;
  }
  if(!response.body?.getReader)return null;
  const reader=response.body.getReader(),chunks=[];let bytes=0;
  try{
    for(;;){
      const next=await reader.read();if(next.done)break;
      bytes+=next.value.byteLength;
      if(bytes>MAXIMUM_ERROR_BYTES){await reader.cancel().catch(()=>{});return null;}
      chunks.push(Buffer.from(next.value));
    }
    return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(Buffer.concat(chunks,bytes));
  }catch{await reader.cancel().catch(()=>{});return null;}
  finally{reader.releaseLock();}
}

async function classify(response){
  const result=(denied,reason)=>({kind:'R2_ANONYMOUS_READ_DENIAL_V1',httpStatus:response.status,denied,reason});
  if([401,403,404].includes(response.status))return result(true,'HTTP_READ_DENIED');
  // The unchanged legacy probe cancels these responses. Never consume2xx,
  // redirects or upstream-error bodies while checking an object's privacy.
  if(response.status!==400)return result(false,'UNEXPECTED_HTTP_STATUS');
  if(!/^application\/xml(?:[ \t]*;[ \t]*charset=utf-8)?$/i.test(response.headers.get('content-type')??''))return result(false,'INVALID_ERROR_MEDIA_TYPE');
  const text=await readErrorEnvelope(response);
  if(text===null)return result(false,'INVALID_OR_OVERSIZED_ERROR_ENVELOPE');
  const denied=authorizationError.test(text);
  return result(denied,denied?'R2_S3_AUTHORIZATION_REQUIRED':'INVALID_ERROR_ENVELOPE');
}

// Only the two private history/backup owners adopt this decorator. The original
// transport and anonymousStatus API remain byte-identical for historic callers.
// Existing private-bucket admission and authenticated exact-byte readback remain
// caller requirements; this result classifies only the anonymous read response.
export function createR2PrivateReadDenialStorage(options={}){
  const storage=createR2PrivateRuntimeStorage(options),fetchImpl=options.fetchImpl??globalThis.fetch;
  async function anonymousReadDenial(objectPath){
    let denial=null;
    const probe=createR2PrivateRuntimeStorage({...options,fetchImpl:async(url,request)=>{
      const headers=new Headers(request.headers);
      if(request.method!=='GET'||request.redirect!=='manual'||headers.has('authorization')||headers.get('range')!=='bytes=0-0')throw new Error('R2 anonymous read probe left its fixed transport');
      const response=await fetchImpl(url,request);
      denial=await classify(response);
      return response;
    }});
    // Reuse the complete normal endpoint/path/retry/cancellation implementation.
    const httpStatus=await probe.anonymousStatus(objectPath);
    if(!denial||denial.httpStatus!==httpStatus)throw new Error('R2 anonymous read denial was not observed');
    return denial;
  }
  return{...storage,anonymousReadDenial};
}
