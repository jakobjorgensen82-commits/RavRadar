// Fixed EU archive bucket only. No object access, ACL changes, token creation or retries.
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {boundedFetch} from './lib/bounded-fetch.mjs';
export const ADMIN_HISTORY_BUCKET_PROVISION=Object.freeze({bucket:'ravradar-admin-history-archive',jurisdiction:'eu',
  storageClass:'Standard',maximumResponseBytes:1_048_576,maximumPages:10,maximumOperationMs:120_000});
const P=ADMIN_HISTORY_BUCKET_PROVISION;
const fail=(code,httpStatus=null,writeOutcome='NOT_STARTED')=>{
  const error=new Error(code);Object.assign(error,{code,httpStatus,writeOutcome});throw error;
};
const need=(value,code)=>{if(!value)fail(code);};
export async function provisionAdminDocumentHistoryBucket(options={}, {env=process.env,fetchImpl=globalThis.fetch}={}){
  need(options&&typeof options==='object'&&!Array.isArray(options)
    &&Object.keys(options).every(key=>['mode','confirmation'].includes(key)),'R2_BUCKET_OPTIONS');
  const {mode='read-only',confirmation=null}=options;
  need(['read-only','create'].includes(mode),'R2_BUCKET_MODE');
  need(mode==='create'?confirmation==='CREATE-PRIVATE-EU-ADMIN-HISTORY-BUCKET':confirmation===null,'R2_BUCKET_CONFIRMATION');
  const account=env.RAVRADAR_R2_ACCOUNT_ID,token=env.CLOUDFLARE_API_TOKEN;
  need(typeof account==='string'&&/^[a-f0-9]{32}$/.test(account),'R2_BUCKET_EXISTING_ACCOUNT_REQUIRED');
  need(!env.CLOUDFLARE_ACCOUNT_ID||env.CLOUDFLARE_ACCOUNT_ID===account,'R2_BUCKET_ACCOUNT_MISMATCH');
  need(typeof token==='string'&&token.length>0&&!/[\r\n]/.test(token),'R2_BUCKET_EXISTING_TOKEN_REQUIRED');
  need(typeof fetchImpl==='function','R2_BUCKET_TRANSPORT');
  const base=`https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets`;
  const bucket=base+'/'+P.bucket,deadline=Date.now()+P.maximumOperationMs;
  let writeOutcome='NOT_STARTED',postCount=0;
  async function request(url,{create=false,absentAllowed=false}={}){
    need(Date.now()<deadline,'R2_BUCKET_DEADLINE');
    need(url===bucket||url===bucket+'/domains/managed'||url===bucket+'/domains/custom'
      ||url===base||url.startsWith(base+'?name_contains='+P.bucket+'&per_page=1000'),'R2_BUCKET_NETWORK_SURFACE');
    const init={method:create?'POST':'GET',redirect:'manual',
      signal:AbortSignal.timeout(Math.max(1,Math.min(15_000,deadline-Date.now()))),
      headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','cf-r2-jurisdiction':'eu'}};
    if(create){need(url===base&&mode==='create'&&postCount===0,'R2_BUCKET_CREATE_ONLY');postCount++;
      init.body=JSON.stringify({name:P.bucket,storageClass:'Standard'});writeOutcome='UNKNOWN_NO_RETRY';}
    let response;
    try{response=await boundedFetch(url,init,{fetchImpl,timeoutMs:Math.max(1,Math.min(15_000,deadline-Date.now()))});}
    catch{fail(create?'R2_BUCKET_CREATE_OUTCOME_UNKNOWN':'R2_BUCKET_READ_TRANSPORT',null,writeOutcome);}
    if(response.status===401||response.status===403){await response.body?.cancel?.().catch(()=>{});
      if(create)writeOutcome='REJECTED';fail('R2_BUCKET_API_DENIED',response.status,writeOutcome);}
    if(absentAllowed&&response.status===404){await response.body?.cancel?.().catch(()=>{});return null;}
    if(response.status!==200){await response.body?.cancel?.().catch(()=>{});
      fail(create?'R2_BUCKET_CREATE_OUTCOME_UNKNOWN':'R2_BUCKET_API_HTTP',response.status,writeOutcome);}
    const chunks=[];let size=0;
    try{
      for await(const chunk of response.body||[]){size+=chunk.length;if(size>P.maximumResponseBytes)fail('R2_BUCKET_RESPONSE_BOUND');chunks.push(chunk);}
      const body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));
      need(body?.success===true&&Array.isArray(body.errors)&&body.errors.length===0
        &&body.result&&typeof body.result==='object','R2_BUCKET_API_ENVELOPE');
      if(create)writeOutcome='CREATED';return body;
    }catch(error){fail(create?'R2_BUCKET_CREATE_OUTCOME_UNKNOWN'
      :(['R2_BUCKET_RESPONSE_BOUND','R2_BUCKET_API_ENVELOPE'].includes(error.code)?error.code:'R2_BUCKET_RESPONSE_INVALID'),response.status,writeOutcome);}
  }
  function properties(value){
    need(value&&value.name===P.bucket&&value.jurisdiction==='eu'&&value.storage_class==='Standard','R2_BUCKET_PROPERTIES');
  }
  async function inventory(){
    let cursor='',found=false;const cursors=new Set();
    for(let page=0;page<P.maximumPages;page++){
      const url=base+'?name_contains='+P.bucket+'&per_page=1000'+(cursor?'&cursor='+encodeURIComponent(cursor):'');
      const body=await request(url),rows=body.result.buckets;
      need(Array.isArray(rows)&&rows.length<=1000&&body.result_info
        &&Number.isSafeInteger(body.result_info.total_count)&&body.result_info.total_count>=0,'R2_BUCKET_INVENTORY');
      for(const row of rows){need(typeof row?.name==='string','R2_BUCKET_INVENTORY');
        if(row.name===P.bucket){need(!found,'R2_BUCKET_AMBIGUOUS');properties(row);found=true;}}
      const next=body.result_info.cursor;
      need(next===undefined||typeof next==='string','R2_BUCKET_INVENTORY_CURSOR');
      if(!next)return found;
      need(!cursors.has(next)&&next.length<=4096,'R2_BUCKET_INVENTORY_CURSOR');cursors.add(next);cursor=next;
    }
    fail('R2_BUCKET_INVENTORY_BOUND');
  }
  async function privateMetadata(){
    const detail=await request(bucket);properties(detail.result);
    const managed=await request(bucket+'/domains/managed');
    need(managed.result.enabled===false&&typeof managed.result.domain==='string'
      &&typeof managed.result.bucketId==='string','R2_BUCKET_MANAGED_PUBLIC_OR_UNKNOWN');
    const custom=await request(bucket+'/domains/custom');
    need(Array.isArray(custom.result.domains)&&custom.result.domains.length===0,'R2_BUCKET_CUSTOM_DOMAINS_PRESENT_OR_UNKNOWN');
    return {bucket:P.bucket,jurisdiction:'eu',storageClass:'Standard',managedPublicEnabled:false,customDomainCount:0};
  }
  try{
    const exists=await inventory();
    if(exists){const metadata=await privateMetadata();return{status:'PRIVATE_EU_BUCKET_VERIFIED',...metadata,writeOutcome,postCount,objectsUploaded:false,settingsChanged:false};}
    // A 404 alone is not absence: the authenticated complete EU inventory must also omit the exact name.
    need(await request(bucket,{absentAllowed:true})===null,'R2_BUCKET_INVENTORY_CHANGED');
    if(mode==='read-only')return{status:'PRIVATE_EU_BUCKET_ABSENT',bucket:P.bucket,jurisdiction:'eu',writeOutcome,postCount,objectsUploaded:false,settingsChanged:false};
    const created=await request(base,{create:true});properties(created.result);
    need(await inventory(),'R2_BUCKET_CREATE_READBACK_MISSING');
    const metadata=await privateMetadata();return{status:'PRIVATE_EU_BUCKET_CREATED_VERIFIED',...metadata,writeOutcome,postCount,objectsUploaded:false,settingsChanged:false};
  }catch(error){
    if(typeof error.code!=='string'||!/^R2_BUCKET_[A-Z_]+$/.test(error.code))fail('R2_BUCKET_OPERATION_FAILED',null,writeOutcome);
    error.writeOutcome=writeOutcome;throw error;
  }
}
async function main(){
  const args=process.argv.slice(2),options={};
  if(args.length===0||args.length===1&&args[0]==='--read-only')options.mode='read-only';
  else if(args.length===3&&args[0]==='--create'&&args[1]==='--confirm'){options.mode='create';options.confirmation=args[2];}
  else fail('R2_BUCKET_CLI');
  console.log(JSON.stringify(await provisionAdminDocumentHistoryBucket(options)));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  main().catch(error=>{console.error(JSON.stringify({status:'FAILED_CLOSED',
    code:/^R2_BUCKET_[A-Z_]+$/.test(error.code||'')?error.code:'R2_BUCKET_OPERATION_FAILED',
    httpStatus:Number.isInteger(error.httpStatus)?error.httpStatus:null,writeOutcome:error.writeOutcome||'NOT_STARTED'}));process.exitCode=1;});
