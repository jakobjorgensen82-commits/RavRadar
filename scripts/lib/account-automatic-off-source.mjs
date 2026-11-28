import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MIGRATIONS_DIRECTORY = fileURLToPath(new URL('../../supabase/migrations/', import.meta.url));

export const ACCOUNT_AUTOMATIC_OFF_MIGRATIONS = Object.freeze([
  Object.freeze({
    version: '20261128073000',
    filename: '20261128073000_account_automatic_erasure_off.sql',
    sha256: 'a525c4c498abf0174a8e6612d059b3c0ba024ee3af57dca7266945bee31ed979',
  }),
  Object.freeze({
    version: '20261128103000',
    filename: '20261128103000_account_automatic_notices_off.sql',
    sha256: '4a363e874ad34a9b71a8dae1860bcad45dc0e0ee307143d8ea7a34337894b9eb',
  }),
]);

export async function readAccountAutomaticOffSql(migration, migrationsDirectory = MIGRATIONS_DIRECTORY) {
  assert(ACCOUNT_AUTOMATIC_OFF_MIGRATIONS.includes(migration), 'An exact automatic account migration is required');
  const file = path.join(migrationsDirectory, migration.filename);
  const stat = await fs.lstat(file);
  assert(stat.isFile() && !stat.isSymbolicLink() && stat.size > 0 && stat.size <= 65_536,
    'Automatic account migration must be a bounded regular file');
  const bytes = await fs.readFile(file);
  assert.equal(bytes.length, stat.size);
  const sql = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replaceAll('\r\n', '\n');
  assert.equal(createHash('sha256').update(sql).digest('hex'), migration.sha256,
    'Automatic account migration must match the qualified source');
  return sql;
}
