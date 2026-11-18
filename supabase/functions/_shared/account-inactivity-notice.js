import { GatewayError } from './public-gateway.ts';
import { accountLifecycleConfiguration as configuration, accountLifecycleSetting as setting,
  accountLifecycleServiceHeaders as serviceHeaders, accountLifecycleRequestJson as requestJson,
  accountLifecycleRpc as rpc } from './account-lifecycle.js';
import { inactivityNoticeBody, sendInactivityNotice } from './inactivity-notice-mail.mjs';
import { sha256Hex } from './trip-storage.js';

const PREFIX='account-inactivity-';
export const NOTICE_CONFIRMATION='SEND-ACCOUNT-INACTIVITY-NOTICE';
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const id=value=>typeof value==='string'&&UUID.test(value)&&value!=='00000000-0000-0000-0000-000000000000';
const KEYS=['noticeId','targetUserId','state','holdReason','revision','activityRevision','accepted','delivered','deleteNotBefore','automaticDeletionEnabled'];
const PRIVATE=['attemptId','recipientDigest','authUserCreatedAt','providerId','reservedAt'];
const STATES=['HELD','READY','CLAIMED','ACCEPTED','DELIVERED','UNKNOWN','CANCELLED'];
const HOLDS=['POLICY_OFF','COVERAGE_UNKNOWN','DELIVERY_UNQUALIFIED','ACTIVITY_UNKNOWN','ACTIVITY_TOO_RECENT','ERASURE_PENDING',
  'TARGET_POLICY','ACTIVITY_CHANGED','SEND_WINDOW_EXPIRED','TARGET_CHANGED','DELIVERY_UNCONFIRMED','SEND_OUTCOME_UNKNOWN',
  'ACTIVITY_OBSERVED','TARGET_MISSING','AUTH_UNAVAILABLE','DELIVERY_UNAVAILABLE','ATTEMPT_LIMIT'];
const BLOCKED=['POLICY_OFF','COVERAGE_UNKNOWN','DELIVERY_UNQUALIFIED','ACTIVITY_UNKNOWN','ACTIVITY_TOO_RECENT','ERASURE_PENDING','TARGET_POLICY','ACTIVITY_CHANGED','SEND_WINDOW_EXPIRED','ATTEMPT_LIMIT'];
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...keys].sort().join(',');
const revision=value=>typeof value==='string'&&/^[1-9][0-9]{0,18}$/.test(value)&&BigInt(value)<=9223372036854775807n;
const date=value=>typeof value==='string'&&value.length<=40&&Number.isFinite(Date.parse(value));
const generation=value=>date(value)&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(value);
const fail=(code='ACCOUNT_NOTICE_UNAVAILABLE',status=503)=>{throw new GatewayError(status,code);};

export function validateAccountInactivityNoticePayload(value){
 const action=value?.operation;
 const fields=action===PREFIX+'list'?['operation',...(Object.hasOwn(value,'afterNoticeId')?['afterNoticeId']:[])]
  :action===PREFIX+'prepare'?['operation','noticeId','targetUserId']
  :action===PREFIX+'status'?['operation','noticeId']:['operation','noticeId','attemptId','confirmation'];
 if(![PREFIX+'list',PREFIX+'prepare',PREFIX+'status',PREFIX+'resume'].includes(action)||!exact(value,fields)
  ||action===PREFIX+'list'&&Object.hasOwn(value,'afterNoticeId')&&!id(value.afterNoticeId)
  ||action!==PREFIX+'list'&&!id(value.noticeId)||action===PREFIX+'prepare'&&!id(value.targetUserId)
  ||action===PREFIX+'resume'&&(!id(value.attemptId)||value.confirmation!==NOTICE_CONFIRMATION))fail('ACCOUNT_NOTICE_INPUT_INVALID',400);
}
export function checkedAccountInactivityNotice(value,noticeId=null,internal=false,claim=false){
 if(!exact(value,[...KEYS,...(internal?PRIVATE:[]),...(claim?['shouldSend']:[])])||!id(value.noticeId)||!id(value.targetUserId)
  ||noticeId!==null&&value.noticeId!==noticeId||!STATES.includes(value.state)||!revision(value.revision)
  ||!(value.activityRevision===null||revision(value.activityRevision))||!(value.holdReason===null||HOLDS.includes(value.holdReason))
  ||typeof value.accepted!=='boolean'||typeof value.delivered!=='boolean'||value.automaticDeletionEnabled!==false
  ||!(value.deleteNotBefore===null||date(value.deleteNotBefore))||value.delivered&&!value.accepted
  ||['ACCEPTED','DELIVERED'].includes(value.state)&&!value.accepted
  ||['READY','CLAIMED','UNKNOWN'].includes(value.state)&&value.accepted
  ||value.deleteNotBefore!==null&&value.state!=='DELIVERED'
  ||value.deleteNotBefore!==null&&!value.delivered||value.state==='CANCELLED'&&value.deleteNotBefore!==null
  ||value.state==='DELIVERED'&&(!value.delivered||value.deleteNotBefore===null||value.holdReason!==null))fail('ACCOUNT_NOTICE_SCHEMA_UNAVAILABLE');
 if(internal&&(!(value.attemptId===null||id(value.attemptId))||!(value.providerId===null||id(value.providerId))
  ||!(value.reservedAt===null||date(value.reservedAt))||!(value.authUserCreatedAt===null||generation(value.authUserCreatedAt))
  ||!(value.recipientDigest===null||typeof value.recipientDigest==='string'&&/^[a-f0-9]{64}$/.test(value.recipientDigest))||value.accepted!==(value.providerId!==null)))fail('ACCOUNT_NOTICE_SCHEMA_UNAVAILABLE');
 if(claim&&(typeof value.shouldSend!=='boolean'||value.shouldSend&&(value.state!=='CLAIMED'||!value.attemptId||!value.reservedAt||!value.recipientDigest||!value.authUserCreatedAt)))fail('ACCOUNT_NOTICE_SCHEMA_UNAVAILABLE');
 return value;
}
const publicStatus=value=>Object.fromEntries(KEYS.map(key=>[key,value[key]]));

// No automatic erasure or new mail service. The SQL policy starts OFF/UNKNOWN.
export async function runAccountInactivityNotice(request,actorId,payload){
 validateAccountInactivityNoticePayload(payload);
 if(!id(actorId)||!request.headers.get('authorization'))fail('ACCOUNT_NOTICE_OWNER_REQUIRED',403);
 const config=configuration(),ownerHeaders={apikey:config.anon,Authorization:request.headers.get('authorization')};
 const readOwner=async()=>checkedAccountInactivityNotice(await rpc(config,'get_account_inactivity_notice_status',{p_notice:payload.noticeId},ownerHeaders),payload.noticeId);
 if(payload.operation===PREFIX+'list'){
  const result=await rpc(config,'list_account_inactivity_notices',{p_after:payload.afterNoticeId??null},ownerHeaders,32768);
  if(!exact(result,['scope','rows','truncated'])||result.scope!=='own-account-inactivity-notices'||!Array.isArray(result.rows)
   ||result.rows.length>64||typeof result.truncated!=='boolean'||result.truncated&&result.rows.length!==64)fail('ACCOUNT_NOTICE_SCHEMA_UNAVAILABLE');
  let prior=payload.afterNoticeId??null;
  for(const row of result.rows){checkedAccountInactivityNotice(row);if(row.state==='CANCELLED'||prior!==null&&row.noticeId<=prior)fail('ACCOUNT_NOTICE_SCHEMA_UNAVAILABLE');prior=row.noticeId;}
  return result;
 }
 if(payload.operation===PREFIX+'prepare')return checkedAccountInactivityNotice(await rpc(config,'prepare_account_inactivity_notice',{
  p_notice:payload.noticeId,p_target:payload.targetUserId},ownerHeaders),payload.noticeId);
 let status=await readOwner();
 if(payload.operation===PREFIX+'status'||['CANCELLED','DELIVERED'].includes(status.state))return status;
 if(status.state==='HELD'&&!status.accepted)status=checkedAccountInactivityNotice(await rpc(config,'prepare_account_inactivity_notice',{
  p_notice:payload.noticeId,p_target:status.targetUserId},ownerHeaders),payload.noticeId);
 if(['CANCELLED','DELIVERED'].includes(status.state)||BLOCKED.includes(status.holdReason))return status;
 const headers=serviceHeaders(setting('SUPABASE_SERVICE_ROLE_KEY')),actor={p_notice:payload.noticeId,p_actor:actorId};
 const readService=async()=>checkedAccountInactivityNotice(await rpc(config,'get_account_inactivity_notice_service_status',actor,headers),payload.noticeId,true);
 let privateStatus=await readService();
 const hold=async reason=>checkedAccountInactivityNotice(await rpc(config,'hold_account_inactivity_notice',{
  ...actor,p_expected_revision:privateStatus.revision,p_reason:reason},headers),payload.noticeId);
 let auth;
 try{auth=await requestJson(config.base+'/auth/v1/admin/users/'+status.targetUserId,{method:'GET',headers});}catch{return hold('AUTH_UNAVAILABLE');}
 if(auth.status===404&&auth.data?.error_code==='user_not_found')return hold('TARGET_MISSING');
 if(auth.status!==200||auth.data?.id!==status.targetUserId||!generation(auth.data.created_at)
  ||typeof auth.data.email!=='string'||auth.data.email.length>254)return hold('AUTH_UNAVAILABLE');
 // The private digest binds the complete wire body (recipient AND template).
 const body=inactivityNoticeBody(auth.data.email,false),digest=await sha256Hex(JSON.stringify(body));
 if(privateStatus.authUserCreatedAt!==null&&(privateStatus.authUserCreatedAt!==auth.data.created_at||privateStatus.recipientDigest!==digest))return hold('TARGET_CHANGED');
 const key=setting('RAVRADAR_RESEND_NOTICE_SEND_KEY');
 if(!privateStatus.accepted){
  const claim=checkedAccountInactivityNotice(await rpc(config,'claim_account_inactivity_notice',{
   ...actor,p_expected_revision:privateStatus.revision,p_attempt:payload.attemptId,p_recipient_digest:digest,
   p_auth_created_at:auth.data.created_at},headers),payload.noticeId,true,true);
  if(!claim.shouldSend)return publicStatus(claim);
  privateStatus=claim;
  // The same notice/body/idempotency key, within the original 23h window. A new
  // explicit resume gets one CAS attempt; no automatic transport retry exists.
  const receipt=await sendInactivityNotice({key,recipient:auth.data.email,noticeId:payload.noticeId,
   reservedAt:Date.parse(claim.reservedAt),probe:false});
  try{status=checkedAccountInactivityNotice(await rpc(config,'acknowledge_account_inactivity_notice',{
   ...actor,p_expected_revision:claim.revision,p_attempt:payload.attemptId,p_outcome:receipt.state,
   p_provider:receipt.state==='accepted'?receipt.providerId:null},headers),payload.noticeId);}catch{return readOwner();}
  if(!status.accepted||status.state==='CANCELLED')return status;
  privateStatus=await readService();
 }
 // Existing provider/key only. A send-only key's 403 is HOLD, never delivery.
 let provider;
 try{provider=await requestJson('https://api.resend.com/emails/'+privateStatus.providerId,{
  method:'GET',headers:{Authorization:'Bearer '+key}});}catch{return hold('DELIVERY_UNAVAILABLE');}
 const data=provider.data;
 if(provider.status!==200||data?.id!==privateStatus.providerId||data.from!==body.from
  ||JSON.stringify(data.to)!==JSON.stringify(body.to)||data.subject!==body.subject||data.text!==body.text
  ||JSON.stringify(data.reply_to)!==JSON.stringify([body.reply_to]))return hold('DELIVERY_UNAVAILABLE');
 if(data.last_event!=='delivered')return readOwner();
 try{return checkedAccountInactivityNotice(await rpc(config,'acknowledge_account_inactivity_notice',{
  ...actor,p_expected_revision:privateStatus.revision,p_attempt:privateStatus.attemptId,p_outcome:'delivered',
  p_provider:privateStatus.providerId},headers),payload.noticeId);}catch{return readOwner();}
}
