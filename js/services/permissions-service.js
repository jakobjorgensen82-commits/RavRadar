import { PUBLIC_CONFIG } from "../../config.js?v=4.0.589";
import { authIdentityEpoch, authorizedFetch, currentSession, requireFreshSession, getCurrentProfile } from "./auth-service.js?v=4.0.589";
export const PERMISSIONS=Object.freeze([
 {id:'admin_access',label:'Åbn administrationen'},
 {id:'handbook_view',label:'Læs håndbogen'},
 {id:'handbook_review',label:'Indsend faglige rettelser til håndbogen'},
 {id:'zones_view',label:'Se zoner, retninger og station-routing'},
 {id:'zones_weather_edit',label:'Redigér zoner og DMI-indstillinger'},
 {id:'diagnostics_view',label:'Se datakvalitet og diagnostik'},
 {id:'diagnostics_download',label:'Download rå diagnostik og logs'},
 {id:'observations_view',label:'Se observationer og historisk analyse'},
 {id:'learning_manage',label:'Se kalibreringsgrundlag'},
 {id:'experts_manage',label:'Administrér eksperter og rettigheder'},
 {id:'system_manage',label:'Administrér system og caches'},
 {id:'full_admin',label:'Fuld adminadgang'}
]);
export const EXPERT_PERMISSION_IDS=Object.freeze([
 'admin_access',
 'handbook_view',
 'handbook_review'
]);
export const EXPERT_PERMISSIONS=Object.freeze(PERMISSIONS.filter(permission=>EXPERT_PERMISSION_IDS.includes(permission.id)));
function enabled(){return Boolean(PUBLIC_CONFIG.supabaseUrl&&PUBLIC_CONFIG.supabasePublishableKey&&currentSession()?.access_token);}
export async function listProfiles(){
 if(!enabled())return [];
 const identity=authIdentityEpoch(),startingOwner=currentSession()?.user?.id;
 const active=await requireFreshSession(),ownerId=startingOwner??active?.user?.id;
 const assertOwner=()=>{
  if(authIdentityEpoch()!==identity||!ownerId||currentSession()?.user?.id!==ownerId)
   throw new Error('Kontoen blev ændret. Prøv igen fra den rigtige konto.');
 };
 assertOwner();
 const {response:r,body:profiles}=await authorizedFetch(`${PUBLIC_CONFIG.supabaseUrl}/rest/v1/profiles?select=id,email,display_name,role,is_active,user_permissions(permission_key,enabled)&order=email`,{},{consumeJson:true});
 assertOwner();
 if(!r.ok)throw new Error(`Brugere kunne ikke hentes (${r.status})`);
 if(!Array.isArray(profiles))throw new Error('Brugere kunne ikke hentes sikkert.');
 assertOwner();
 return profiles;
}
export async function savePermissions(userId,values){if(!enabled())throw new Error('Supabase-login mangler.');await requireFreshSession();const r=await authorizedFetch(`${PUBLIC_CONFIG.supabaseUrl}/rest/v1/rpc/save_ravradar_permissions`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_user_id:userId,p_permissions:values})});if(!r.ok)throw new Error(`Rettigheder kunne ikke gemmes (${r.status})`);}
export async function myAccess(){
 if(!enabled())return {profile:null,permissions:new Set()};
 const identity=authIdentityEpoch(),startingOwner=currentSession()?.user?.id;
 const profile=await getCurrentProfile();
 const id=startingOwner??profile?.id;
 const assertOwner=()=>{
  if(authIdentityEpoch()!==identity||currentSession()?.user?.id!==id||(profile&&profile.id!==id))
   throw new Error('Kontoen blev ændret. Prøv igen fra den rigtige konto.');
 };
 assertOwner();
 if(!profile?.is_active)throw new Error('Din RavRadar-konto er deaktiveret.');
 if(profile.role==='owner')return {profile,permissions:new Set(PERMISSIONS.map(p=>p.id))};
 const {response:r,body:permissions}=await authorizedFetch(`${PUBLIC_CONFIG.supabaseUrl}/rest/v1/user_permissions?user_id=eq.${id}&enabled=eq.true&select=permission_key`,{},{consumeJson:true});
 assertOwner();
 if(!r.ok)throw new Error(`Rettigheder kunne ikke hentes (${r.status})`);
 if(!Array.isArray(permissions))throw new Error('Rettigheder kunne ikke hentes sikkert.');
 assertOwner();
 return {profile,permissions:new Set(permissions.map(x=>x.permission_key))};
}
export async function myPermissions(){return [...(await myAccess()).permissions];}
export function hasPermission(access,key){return access?.profile?.role==='owner'||access?.permissions?.has('full_admin')||access?.permissions?.has(key);}

// Own-user preference only. This never enables aggregate processing, grants
// consent, or makes trip pseudonyms anonymous. Server-confirmed absence is ON;
// missing/failed/malformed responses are unknown, never an implied default.
const statisticsPreferenceOwners=new WeakMap();
function validStatisticsRevision(value){
 return typeof value==='string'&&/^(0|[1-9][0-9]{0,18})$/.test(value)
  &&BigInt(value)<=9223372036854775807n&&String(BigInt(value))===value;
}
async function ownStatisticsPreference(operation, payload={}, observedOwner=null) {
 const identity=authIdentityEpoch(),startingOwner=currentSession()?.user?.id;
 if(observedOwner&&(observedOwner.identity!==identity||observedOwner.ownerId!==startingOwner))
  throw new Error('Kontoen blev ændret. Prøv igen fra den rigtige konto.');
 const active=await requireFreshSession(),ownerId=startingOwner??active?.user?.id;
 const assertOwner=()=>{
  if(authIdentityEpoch()!==identity||!ownerId||currentSession()?.user?.id!==ownerId)
   throw new Error('Kontoen blev ændret. Prøv igen fra den rigtige konto.');
 };
 assertOwner();
 const {response,body}=await authorizedFetch(
  `${PUBLIC_CONFIG.supabaseUrl}/rest/v1/rpc/${operation}`,
  {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)},
  {consumeJson:true,expectedUserId:ownerId});
 assertOwner();
 if(!response.ok||!body||typeof body!=='object'||Array.isArray(body)
  ||Object.keys(body).sort().join(',')!=='enabled,revision,source'||typeof body.enabled!=='boolean'
  ||!validStatisticsRevision(body.revision)||!['default','stored'].includes(body.source)
  ||(body.source==='default'&&(body.enabled!==true||body.revision!=='0')))
  throw new Error('Kontovalget kunne ikke bekræftes.');
 const value=Object.freeze({enabled:body.enabled,source:body.source,revision:body.revision});
 statisticsPreferenceOwners.set(value,{identity,ownerId});
 return value;
}
export async function getOwnStatisticsPreference(){
 return ownStatisticsPreference('get_own_statistics_preference');
}
export async function setOwnStatisticsPreference(enabled,observed){
 if(typeof enabled!=='boolean')throw new Error('Kontovalget er ugyldigt.');
 const owner=observed&&statisticsPreferenceOwners.get(observed);
 if(!owner)throw new Error('Kontovalget skal først hentes igen.');
 const value=await ownStatisticsPreference('set_own_statistics_preference',
  {p_enabled:enabled,p_expected_revision:observed.revision},owner);
 if(value.source!=='stored'||value.enabled!==enabled
  ||BigInt(value.revision)<=BigInt(observed.revision)
  ||(enabled&&BigInt(value.revision)!==BigInt(observed.revision)+1n))
  throw new Error('Kontovalget kunne ikke bekræftes.');
 return value;
}
