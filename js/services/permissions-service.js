import { PUBLIC_CONFIG } from "../../config.js";
import { currentSession } from "./auth-service.js";
export const PERMISSIONS=Object.freeze([
 {id:'handbook_review',label:'Læs og kommentér drejebog'},
 {id:'rules_edit',label:'Opret og redigér regler'},
 {id:'rules_publish',label:'Aktivér regler direkte'},
 {id:'zones_weather_edit',label:'Redigér zoner og DMI-indstillinger'},
 {id:'diagnostics_view',label:'Se diagnostik og logs'},
 {id:'experts_manage',label:'Administrér eksperter'},
 {id:'full_admin',label:'Fuld adminadgang'}
]);
function headers(extra={}){const s=currentSession();return {apikey:PUBLIC_CONFIG.supabasePublishableKey,Authorization:`Bearer ${s?.access_token||''}`,'Content-Type':'application/json',...extra};}
function enabled(){return Boolean(PUBLIC_CONFIG.supabaseUrl&&PUBLIC_CONFIG.supabasePublishableKey&&currentSession()?.access_token);}
export async function listProfiles(){if(!enabled())return [];const r=await fetch(`${PUBLIC_CONFIG.supabaseUrl}/rest/v1/profiles?select=id,email,display_name,role,is_active,user_permissions(permission_key,enabled)&order=email`,{headers:headers()});if(!r.ok)throw new Error(`Brugere kunne ikke hentes (${r.status})`);return r.json();}
export async function savePermissions(userId,values){if(!enabled())throw new Error('Supabase-login mangler.');const rows=PERMISSIONS.map(p=>({user_id:userId,permission_key:p.id,enabled:Boolean(values[p.id]),updated_at:new Date().toISOString()}));const r=await fetch(`${PUBLIC_CONFIG.supabaseUrl}/rest/v1/user_permissions`,{method:'POST',headers:headers({Prefer:'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify(rows)});if(!r.ok)throw new Error(`Rettigheder kunne ikke gemmes (${r.status})`);}
export async function myPermissions(){if(!enabled())return [];const id=currentSession()?.user?.id;if(!id)return [];const r=await fetch(`${PUBLIC_CONFIG.supabaseUrl}/rest/v1/user_permissions?user_id=eq.${id}&enabled=eq.true&select=permission_key`,{headers:headers()});if(!r.ok)return [];return (await r.json()).map(x=>x.permission_key);}
