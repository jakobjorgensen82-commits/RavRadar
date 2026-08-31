import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { readProductionWorkflowSource } from './lib/production-workflow-sources.mjs';
const [reader,writer,migration,audit,workflow,schema,operationalMigration]=await Promise.all([
 fs.readFile('scripts/sync-admin-config.py','utf8'),
 fs.readFile('scripts/sync-protected-admin-assets.mjs','utf8'),
 fs.readFile('supabase/RavRadar-4.0.153-supabase-quota-controls.sql','utf8'),
 fs.readFile('supabase/RavRadar-4.0.153-supabase-quota-audit.sql','utf8'),
 readProductionWorkflowSource('build'),
 fs.readFile('supabase/schema.sql','utf8'),
 fs.readFile('supabase/migrations/20260829010000_ravscore_operational_documents_no_history.sql','utf8')
]);
assert.match(reader,/document_key.*in\.\(/s,'Admin-readback skal filtrere server-side på nødvendige nøgler');
assert.ok(!reader.includes("admin_documents?select=document_key,payload,updated_at"),'Ufiltreret fuld payload-readback er forbudt');
for(const token of ['preserve_newer_owner_approved_activation','local_version > central_version','automaticActivationAllowed','activationAuthority'])assert.ok(reader.includes(token),`Central sync mangler sikker engangspromotion: ${token}`);
for(const token of ['protected-asset-manifest','sha256','springer skrivning over','buildRuntimeDiagnosticsEnvelope','pakket tabsfrit','handbook-source-baseline','mergeProtectedHandbook','RAVRADAR_PREVIOUS_HANDBOOK_URL','fc13fb5ab326d8824ca55235ac454ac230e3db3e','fetchPreviousHandbookSource'])assert.ok(`${writer}\n${workflow}`.includes(token),`Idempotent protected sync mangler ${token}`);
for(const token of ['ravscore-profile-selection','preserve_newer_owner_approved_ravscore_selection','prePublicWarmupAccepted'])assert.ok(reader.includes(token),`Central RavScore-hydrering mangler ${token}`);
for(const token of ['ravscore-profile-selection','Central RavScore-profil verificeret'])assert.ok(writer.includes(token),`Central RavScore-readback mangler ${token}`);
assert.ok(writer.includes('coastal-point-staging-status'),'Beskyttet driftssync mangler det operationelle staging-dokument');
for(const token of ['admin_document_versions','ryd driftshistorik','method:\'DELETE\''])assert.equal(writer.includes(token),false,`Beskyttet driftssync må ikke slette bevaret historik: ${token}`);
for(const token of ['new.payload is not distinct from old.payload','if not machine_document','r.rn>100','VACUUM FULL is deliberately not automatic'])assert.ok(migration.includes(token),`Kvotemigration mangler ${token}`);
for(const token of ['READ ONLY','rows_that_cleanup_will_remove','payload_that_cleanup_will_remove'])assert.ok(audit.includes(token),`Read-only kvoteaudit mangler ${token}`);
for(const token of ['new.payload is not distinct from old.payload','protected-asset-manifest'])assert.ok(schema.includes(token),`Den historiske skemareference mangler den grundlæggende kvotekontrakt: ${token}`);
for(const token of ['create or replace function public.version_admin_document()','coastal-point-staging-status','ravscore-continuation-checkpoint','performs no destructive cleanup'])assert.ok(operationalMigration.includes(token),`Driftsdokumentmigrationen mangler ${token}`);
assert.doesNotMatch(operationalMigration,/\b(?:delete|truncate)\s+from\b|\btruncate\s+table\b/i,'Driftsdokumentmigrationen må ikke destruere eksisterende historik');
const preflightIndex=workflow.indexOf('Decide whether weather needs updating before private runtime download');
const centralSyncIndex=workflow.indexOf('Sync centrally saved admin configuration');
const protectedRuntimeIndex=workflow.indexOf('Restore newest compatible private runtime from protected storage');
assert.ok(preflightIndex>=0 && preflightIndex<centralSyncIndex && centralSyncIndex<protectedRuntimeIndex,
  'Billig preflight skal ske før beskyttet hydrering, mens central admin-sandhed skal hentes før privat runtime genoprettes');
console.log('Supabase kvotekontrol: bestået.');

