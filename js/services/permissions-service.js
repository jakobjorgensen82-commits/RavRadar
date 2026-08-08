import { PUBLIC_CONFIG } from "../../config.js?v=4.0.124";
import { authorizedFetch, currentSession, requireFreshSession, getCurrentProfile } from "./auth-service.js?v=4.0.124";
export const PERMISSIONS=Object.freeze([
 {id:'admin_access',label:'Åbn administrationen'},
 {id:'handbook_view',label:'Læs håndbogen'},
 {id:'handbook_review',label:'Indsend faglige rettelser til håndbogen'},
 {id:'rules_view',label:'Se regler og erfaringsviden'},
 {id:'rules_edit',label:'Opret og redigér regler'},
 {id:'rules_publish',label:'Aktivér og publicér regler'},
 {id:'zones_view',label:'Se zoner, retninger og station-routing'},
 {id:'zones_weather_edit',label:'Redigér zoner og DMI-indstillinger'},
 {id:'diagnostics_view',label:'Se datakvalitet og diagnostik'},
 {id:'diagnostics_download',label:'Download rå diagnostik og logs'},
 {id:'observations_view',label:'Se observationer og historisk analyse'},
 {id:'learning_manage',label:'Godkend eller tilbagerul model-forslag'},
 {id:'experts_manage',label:'Administrér eksperter og rettigheder'},
 {id:'system_manage',label:'Administrér system og caches'},
 {id:'full_admin',label:'Fuld adminadgang'}
]);
function enabled(){return Boolean(PUBLIC_CONFIG.supabaseUrl&&PUBLIC_CONFIG.supabasePublishableKey&&currentSession()?.access_token);}
export async function listProfiles(){if(!enabled())return [];await requireFreshSession();const r=await authorizedFetch(`${PUBLIC_CONFIG.supabaseUrl}/rest/v1/profiles?select=id,email,display_name,role,is_active,user_permissions(permission_key,enabled)&order=email`);if(!r.ok)throw new Error(`Brugere kunne ikke hentes (${r.status})`);return r.json();}
export async function savePermissions(userId,values){if(!enabled())throw new Error('Supabase-login mangler.');await requireFreshSession();const r=await authorizedFetch(`${PUBLIC_CONFIG.supabaseUrl}/rest/v1/rpc/save_ravradar_permissions`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_user_id:userId,p_permissions:values})});if(!r.ok)throw new Error(`Rettigheder kunne ikke gemmes (${r.status})`);}
export async function myAccess(){if(!enabled())return {profile:null,permissions:new Set()};const profile=await getCurrentProfile();if(!profile?.is_active)throw new Error('Din RavRadar-konto er deaktiveret.');if(profile.role==='owner')return {profile,permissions:new Set(PERMISSIONS.map(p=>p.id))};const id=currentSession()?.user?.id;const r=await authorizedFetch(`${PUBLIC_CONFIG.supabaseUrl}/rest/v1/user_permissions?user_id=eq.${id}&enabled=eq.true&select=permission_key`);if(!r.ok)throw new Error(`Rettigheder kunne ikke hentes (${r.status})`);return {profile,permissions:new Set((await r.json()).map(x=>x.permission_key))};}
export async function myPermissions(){return [...(await myAccess()).permissions];}
export function hasPermission(access,key){return access?.profile?.role==='owner'||access?.permissions?.has('full_admin')||access?.permissions?.has(key);}
