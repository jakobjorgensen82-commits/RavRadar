import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const [reader,writer,migration,audit,workflow,schema]=await Promise.all([
 fs.readFile('scripts/sync-admin-config.py','utf8'),
 fs.readFile('scripts/sync-protected-admin-assets.mjs','utf8'),
 fs.readFile('supabase/RavRadar-4.0.153-supabase-quota-controls.sql','utf8'),
 fs.readFile('supabase/RavRadar-4.0.153-supabase-quota-audit.sql','utf8'),
 fs.readFile('.github/workflows/update-and-deploy.yml','utf8'),
 fs.readFile('supabase/schema.sql','utf8')
]);
assert.match(reader,/document_key.*in\.\(/s,'Admin-readback skal filtrere server-side på nødvendige nøgler');
assert.ok(!reader.includes("admin_documents?select=document_key,payload,updated_at"),'Ufiltreret fuld payload-readback er forbudt');
for(const token of ['protected-asset-manifest','sha256','springer skrivning over'])assert.ok(writer.includes(token),`Idempotent protected sync mangler ${token}`);
for(const token of ['new.payload is not distinct from old.payload','if not machine_document','r.rn>100','VACUUM FULL is deliberately not automatic'])assert.ok(migration.includes(token),`Kvotemigration mangler ${token}`);
for(const token of ['READ ONLY','rows_that_cleanup_will_remove','payload_that_cleanup_will_remove'])assert.ok(audit.includes(token),`Read-only kvoteaudit mangler ${token}`);
for(const token of ['new.payload is not distinct from old.payload','protected-asset-manifest'])assert.ok(schema.includes(token),`Nye Supabase-installationer mangler ${token}`);
assert.ok(workflow.indexOf('Sync centrally saved admin configuration')<workflow.indexOf('Decide whether weather needs updating'),'Central admin-sandhed skal fortsat hydreres før preflight');
console.log('Supabase kvotekontrol: bestået.');
