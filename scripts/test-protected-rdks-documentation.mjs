import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import {
  buildProtectedRdksDocumentation,
  PROTECTED_RDKS_DOCUMENTS,
} from './lib/protected-rdks-documentation.mjs';

const payload = await buildProtectedRdksDocumentation();
const packageDocument = JSON.parse(await fs.readFile('package.json', 'utf8'));
assert.equal(payload.schemaVersion, 1);
assert.equal(payload.sourceVersion, packageDocument.version);
assert.deepEqual(payload.documents.map(document => document.id), PROTECTED_RDKS_DOCUMENTS.map(document => document.id));
for (const document of payload.documents) {
  assert.equal(document.contentType, 'text/markdown; charset=utf-8');
  assert.ok(document.content.length > 100, `${document.id} er uventet kort`);
  assert.equal(document.bytes, Buffer.byteLength(document.content, 'utf8'));
  assert.equal(document.sha256, crypto.createHash('sha256').update(document.content, 'utf8').digest('hex'));
  assert.ok(!document.content.includes('\r'), `${document.id} er ikke normaliseret deterministisk`);
}

const dashboard = await fs.readFile('js/ui/admin-dashboard.js', 'utf8');
const sync = await fs.readFile('scripts/sync-protected-admin-assets.mjs', 'utf8');
const migration = await fs.readFile('supabase/migrations/20260829010000_ravscore_operational_documents_no_history.sql', 'utf8');
const installer = await fs.readFile('supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql', 'utf8');
for (const marker of [
  "loadAdminDocument('rdks-documentation-center',null)",
  'bundle?.sourceVersion!==VERSION',
  'await sha256Text(documentEntry.content)!==documentEntry.sha256',
]) assert.ok(dashboard.includes(marker), `Adminforbrugeren mangler ${marker}`);
for (const forbidden of ['./docs/rdks/', 'fetch(button.dataset.docUrl']) {
  assert.ok(!dashboard.includes(forbidden), `Admin må ikke omgå den beskyttede dokumentkanal: ${forbidden}`);
}
for (const source of [sync, migration, installer]) {
  assert.ok(source.includes('rdks-documentation-center'), 'Den beskyttede RDKS-nøgle mangler i en producent-/rettighedskontrakt');
}
assert.match(migration, /when p_document_key in \('handbook','rdks-documentation-center'\) then 'handbook_view'/);
assert.match(migration, /when p_document_key in \('handbook','rdks-documentation-center'\) then 'full_admin'/);

await assert.rejects(
  buildProtectedRdksDocumentation({
    documents: [{...PROTECTED_RDKS_DOCUMENTS[0]}, {...PROTECTED_RDKS_DOCUMENTS[0]}],
  }),
  /dubleret id/,
);

console.log(`Beskyttet RDKS-dokumentation OK: ${payload.documents.length} versions- og hashbundne dokumenter`);
