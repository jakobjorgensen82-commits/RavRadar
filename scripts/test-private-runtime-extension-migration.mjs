import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { assertExactRuntimeInventory, copyPrivateRuntimeInventory } from './migrate-post-cutover-private-runtime.mjs';
import { PRIVATE_RUNTIME_BASE_FILES, PRIVATE_WEATHER_COMPONENT_PACK_FILE } from './lib/private-weather-component-inventory.mjs';

const marker = { schemaVersion: 1, kind: 'PRIVATE_WEATHER_COMPONENT_INPUTS', sourceSelectionApplied: true,
  openMeteoBankSha256: null, copernicusBankSha256: null, selectedComponentsSha256: 'a'.repeat(64) };
async function fixture(t, extended = false) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-private-migration-inventory-'));
  t.after(async () => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('rr-private-migration-inventory-'));
    await fs.rm(root, { recursive: true, force: true });
  });
  const source = path.join(root, 'source');
  const output = path.join(root, 'output');
  const files = extended ? [...PRIVATE_RUNTIME_BASE_FILES, PRIVATE_WEATHER_COMPONENT_PACK_FILE] : PRIVATE_RUNTIME_BASE_FILES;
  for (const descriptor of files) {
    const file = path.join(source, descriptor.relativePath);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, descriptor.id === 'full-conditions'
      ? JSON.stringify(extended ? { weatherComponentInputs: marker } : { legacy: true })
      : descriptor.id === PRIVATE_WEATHER_COMPONENT_PACK_FILE.id
        ? Buffer.from([0, 1, 255, 13, 10, 128, 4]) : `original-${descriptor.id}\n`);
  }
  return { root, source, output, files };
}

for (const extended of [false, true]) {
  test(`migration preserves the exact ${extended ? 'ten-file component' : 'nine-file legacy'} generation byte for byte`, async t => {
    const { source, output, files } = await fixture(t, extended);
    const inventory = await assertExactRuntimeInventory(source);
    assert.deepEqual(inventory, files);
    await copyPrivateRuntimeInventory(source, output, inventory);
    assert.deepEqual(await assertExactRuntimeInventory(output), files);
    for (const file of files) assert.deepEqual(await fs.readFile(path.join(output, file.relativePath)),
      await fs.readFile(path.join(source, file.relativePath)));
    await assert.rejects(copyPrivateRuntimeInventory(source, output, inventory), /EEXIST/);
  });
}

test('migration rejects an omitted marked pack, an extra input file and an extra directory', async t => {
  const { source } = await fixture(t, true);
  await fs.unlink(path.join(source, PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath));
  await assert.rejects(assertExactRuntimeInventory(source), /marker requires its preserved input pack/);
  await fs.writeFile(path.join(source, PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath), 'unchanged-pack');
  const unknown = path.join(source, '.cache', 'unbound-input.json');
  await fs.writeFile(unknown, '{}');
  await assert.rejects(assertExactRuntimeInventory(source), /unapproved file/);
  await fs.unlink(unknown);
  await fs.mkdir(path.join(source, '.cache', 'unbound'));
  await assert.rejects(assertExactRuntimeInventory(source), /unapproved directory/);
});

test('migration cannot silently drop the new extension during copy', async t => {
  const { source, output } = await fixture(t, true);
  await assert.rejects(copyPrivateRuntimeInventory(source, output, PRIVATE_RUNTIME_BASE_FILES), /copy inventory/);
  await assert.rejects(fs.stat(output), /ENOENT/);
});
