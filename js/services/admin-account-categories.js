import { PUBLIC_CONFIG } from '../../config.js?v=4.0.594';
import { requireFreshSession, authIdentityEpoch, currentSession, authorizedFetch } from './auth-service.js?v=4.0.594';
import { myAccess, hasPermission } from './permissions-service.js?v=4.0.594';

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const CATEGORIES=['owner','expert','ordinary','unknown'];
const ISSUES=['profile-unavailable','owner-expert-conflict','ordinary-has-permissions','multiple-owners-in-batch'];
const fail=()=>{throw Error('ADMIN_ACCOUNT_CATEGORIES_UNAVAILABLE');};
export async function loadAdminAccountCategories(ids){
 if(!Array.isArray(ids)||ids.length<1||ids.length>64||ids.some(id=>typeof id!=='string'||!UUID.test(id))||new Set(ids).size!==ids.length)fail();
 const requested=[...ids];await requireFreshSession();const identity=authIdentityEpoch(),owner=currentSession()?.user?.id;
 const same=()=>{if(!owner||authIdentityEpoch()!==identity||currentSession()?.user?.id!==owner)fail();};
 const permitted=async()=>{const access=await myAccess();same();if(access?.profile?.id!==owner||access.profile.is_active!==true||!hasPermission(access,'full_admin'))fail();};
 await permitted();if(!PUBLIC_CONFIG.supabaseUrl||!PUBLIC_CONFIG.supabasePublishableKey)fail();
 const {response,body}=await authorizedFetch(PUBLIC_CONFIG.supabaseUrl+'/functions/v1/trip-log',{
  method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'admin-account-categories',ids:requested}),cache:'no-store',
 },{consumeJson:true,expectedUserId:owner,timeoutMs:20_000});same();
 if(!response.ok||!body||Object.keys(body).sort().join(',')!=='checkedAt,rows,scope'||body.scope!=='requested-rls-visible-profiles-only'
  ||!Array.isArray(body.rows)||body.rows.length!==requested.length||typeof body.checkedAt!=='string'
  ||!Number.isFinite(Date.parse(body.checkedAt))||new Date(body.checkedAt).toISOString()!==body.checkedAt)fail();
 for(let i=0;i<requested.length;i++){
  const row=body.rows[i];if(!row||Object.keys(row).sort().join(',')!=='category,id,issues'||row.id!==requested[i]
   ||!CATEGORIES.includes(row.category)||!Array.isArray(row.issues)||new Set(row.issues).size!==row.issues.length
   ||row.issues.some(issue=>!ISSUES.includes(issue)))fail();
 }
 await permitted();same();return structuredClone(body);
}
export function filterAdminAccountProfiles(profiles,categories,filter){
 if(filter==='all')return profiles;
 if(!['owner','expert','ordinary'].includes(filter))throw Error('ADMIN_ACCOUNT_FILTER_INVALID');
 return profiles.filter(profile=>categories.get(profile.id)?.category===filter);
}
