import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { publicAssistantContext } from '../js/services/rav-assistant.js';
import { EXPERT_PERMISSION_IDS } from '../js/services/permissions-service.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>readFile(path.join(root,relative),'utf8');
const htmlFiles=['about.html','admin.html','documentation.html','handbook.html','index.html','kystimport.html','learn.html','supabase-setup.html'];

for(const file of htmlFiles){
  const html=await read(file);
  assert.match(html,/<meta\s+http-equiv="Content-Security-Policy"/i,`${file}: CSP mangler`);
  const policy=html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i)?.[1]||'';
  assert.match(policy,/default-src 'self'/,`${file}: default-src skal være lukket`);
  assert.match(policy,/base-uri 'self'/,`${file}: base-uri skal være lukket`);
  assert.match(policy,/object-src 'none'/,`${file}: object-src skal være lukket`);
  assert.match(policy,/form-action 'self'/,`${file}: form-action skal være lukket`);
  assert.doesNotMatch(policy,/unsafe-eval/,`${file}: unsafe-eval må ikke tillades`);
  assert.match(policy,/afqhhdrkjfjtpadntdzo\.supabase\.co/,`${file}: Supabase mangler i connect-src`);
  assert.doesNotMatch(html,/<script(?![^>]*\bsrc=)[^>]*>\s*\S/i,`${file}: inline-script bryder den låste CSP`);
  assert.doesNotMatch(html,/\son[a-z]+\s*=/i,`${file}: inline event-handler må ikke bruges`);
}

const publicContext=publicAssistantContext({
  mode:'beach',
  zone:{id:'zone-1',name:'Zone 1',coastType:'strand',secret:'må ikke med'},
  result:{score:73,level:'god',reasons:['A'.repeat(500)],internalDiagnostics:{token:'hemmelig'}},
  weather:{windSpeedMps:5,currentSpeedMps:0.2,rawVector:{u:1,v:2}},
  zones:{private:'må ikke med'},
  conditions:{private:'må ikke med'},
  knowledge_rules:['må ikke med'],
});
assert.deepEqual(Object.keys(publicContext).sort(),['mode','result','weather','zone']);
assert.equal(publicContext.result.reasons.length,1);
assert.equal(publicContext.result.reasons[0].length,180);
assert.equal('secret' in publicContext.zone,false);
assert.equal('rawVector' in publicContext.weather,false);
assert.equal(JSON.stringify(publicContext).includes('hemmelig'),false);

assert.deepEqual([...EXPERT_PERMISSION_IDS],['admin_access','handbook_view','handbook_review']);
const permissions=await read('js/services/permissions-service.js');
const dashboard=await read('js/ui/admin-dashboard.js');
assert.match(dashboard,/EXPERT_PERMISSIONS/);
assert.match(dashboard,/visibleProfiles=canManageAll\?state\.profiles:state\.profiles\.filter\(profile=>profile\.role==='expert'\)/);
assert.match(permissions,/EXPERT_PERMISSION_IDS/);

const sanitizer=await read('js/services/html-sanitizer.js');
assert.match(sanitizer,/DROP_WITH_CONTENT=new Set\(\['EMBED','IFRAME','OBJECT','SCRIPT','STYLE','TEMPLATE'\]\)/);
assert.match(sanitizer,/\['http:','https:','mailto:'\]/);
assert.match(sanitizer,/!href\.startsWith\('\/\/'\)/);
assert.doesNotMatch(sanitizer,/GLOBAL_ATTRIBUTES[^\n]*['"]id['"]/);
for(const file of ['js/ui/handbook.js','js/ui/admin-dashboard.js']){
  const source=await read(file);
  assert.match(source,/sanitizeTrustedHtml/);
}

const observation=await read('js/services/observation-service.js');
assert.match(observation,/\/functions\/v1\/submit-observation/);
assert.doesNotMatch(observation,/\/rest\/v1\/observations[\s\S]{0,300}method:\s*['"]POST['"]/);
assert.match(observation,/WEATHER_SNAPSHOT_FIELDS/);
assert.match(observation,/publicWeatherSnapshot\(weather\)/);
assert.doesNotMatch(observation,/current:weather\|\|\{\}/,'Et helt vejrobjekt må ikke sendes som tursnapshot.');

const gateway=await read('supabase/functions/_shared/public-gateway.ts');
assert.match(gateway,/PUBLIC_RATE_LIMIT_SECRET/);
assert.match(gateway,/consume_public_request_limit/);
assert.match(gateway,/fetchWithTimeout/);
assert.doesNotMatch(gateway,/Access-Control-Allow-Origin['"]?\s*[:,]\s*['"]\*['"]/);

const assistant=await read('supabase/functions/ravradar-assistant/index.ts');
assert.match(assistant,/readJsonObject\(request, 16 \* 1024\)/);
assert.match(assistant,/minute: 6, hour: 40, globalDay: 500/);
assert.match(assistant,/fetchWithTimeout[\s\S]*7_000/);
assert.doesNotMatch(assistant,/knowledge_rules/);
const publicConfig=await read('config.js');
const assistantService=await read('js/services/rav-assistant.js');
assert.match(publicConfig,/ravAssistantRemoteEnabled:\s*false/);
assert.match(assistantService,/PUBLIC_CONFIG\.ravAssistantRemoteEnabled!==true/);

const submit=await read('supabase/functions/submit-observation/index.ts');
assert.match(submit,/readJsonObject\(request, 64 \* 1024\)/);
assert.match(submit,/minute: 4, hour: 50, globalDay: 2000/);
assert.match(submit,/PRECISE_LOCATION_NOT_ALLOWED/);
assert.match(submit,/LOGIN_REQUIRED_FOR_ACCOUNT_REPORT/);
assert.match(submit,/SUPABASE_SERVICE_ROLE_KEY/);
assert.doesNotMatch(submit,/\"consent_version\"/,'Edge-porten må ikke acceptere felter, som ikke findes i den levende observations-tabel.');
assert.doesNotMatch(submit,/\"score_engine_version\"/,'Edge-porten må ikke acceptere felter, som ikke findes i den levende observations-tabel.');

assert.match(assistant,/from "\.\.\/_shared\/public-gateway\.ts"/);
assert.match(submit,/from "\.\.\/_shared\/public-gateway\.ts"/);
for(const functionGateway of [
  'supabase/functions/ravradar-assistant/public-gateway.ts',
  'supabase/functions/submit-observation/public-gateway.ts'
]){
  await assert.rejects(read(functionGateway),{code:'ENOENT'},`${functionGateway} må ikke duplikere den fælles gateway.`);
}

const migration=await read('supabase/migrations/20260826_security_hardening.sql');
const installSql=await read('supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql');
assert.match(migration,/revoke insert on table public\.observations from anon, authenticated/i);
assert.match(migration,/admin_access[\s\S]*handbook_view[\s\S]*handbook_review/i);
assert.match(migration,/create policy ravradar_profiles_read[\s\S]*experts_manage[\s\S]*role = 'expert'/i);
assert.match(migration,/create policy ravradar_user_permissions_read[\s\S]*permission_key in \('admin_access', 'handbook_view', 'handbook_review'\)[\s\S]*target_profile\.role = 'expert'/i);
assert.match(migration,/UNKNOWN_PERMISSION_KEY/);
assert.match(migration,/INVALID_PERMISSION_VALUE/);
assert.match(dashboard,/canManage=state\.access\?\.profile\?\.role==='owner'\|\|state\.access\?\.permissions\?\.has\('full_admin'\)/);
assert.match(migration,/drop policy if exists "authenticated admins manage documents"/i);
for(const legacyPolicy of [
  'reviewers read handbook review versions',
  'experts submit handbook reviews',
  'reviewers update handbook reviews',
  'users or reviewers read handbook reviews'
]){
  assert.match(
    migration,
    new RegExp(`drop policy if exists "${legacyPolicy}"`, 'i'),
    `Migrationen skal fjerne den overlappende legacy-policy: ${legacyPolicy}`
  );
  assert.match(
    installSql,
    new RegExp(`drop policy if exists "${legacyPolicy}"`, 'i'),
    `Installations-SQL skal fjerne den overlappende legacy-policy: ${legacyPolicy}`
  );
}
assert.match(migration,/revoke insert, update, delete on table public\.admin_documents from anon, authenticated/i);
assert.match(migration,/ravradar_security_contract/);
assert.match(
  migration,
  /handbook_review_read[\s\S]*\(\s*public\.has_ravradar_permission\('handbook_review'\)\s*and created_by = auth\.uid\(\)\s*\)\s*or public\.is_ravradar_owner\(\)\s*or public\.has_ravradar_permission\('full_admin'\)/i,
  'Ejer og full-admin skal kunne læse hele reviewkøen uden samtidig at være afhængige af ekspertens handbook_review-rettighed.'
);
for(const marker of [
  'PERMISSION_OBJECT_REQUIRED',
  'UNKNOWN_PERMISSION_KEY',
  'INVALID_PERMISSION_VALUE',
  'ravradar_profiles_read',
  'ravradar_user_permissions_read',
  'public.public_request_limits',
  'public.consume_public_request_limit',
  'revoke insert on public.observations from anon,authenticated',
  'public.ravradar_security_contract'
]){
  assert.ok(installSql.includes(marker),`Installations-SQL mangler sikkerhedskontrakten: ${marker}`);
}

console.log('OK: sikkerhedshærdningens browser-, assistent-, observations-, ekspert- og Supabase-kontrakter er låst.');
