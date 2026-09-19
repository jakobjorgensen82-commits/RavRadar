import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { writeBoundedJsonAtomic } from './lib/bounded-json-writer.mjs';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-bounded-json-'));
try {
  const destination = path.join(root, 'conditions.json');
  const shared = { text: 'vind, bølger og strøm', finite: 4.2 };
  const source = {
    schemaVersion: 4,
    shared,
    repeated: shared,
    array: [undefined, Number.NaN, Number.POSITIVE_INFINITY, 'rav'],
    omitted: undefined,
    date: new Date('2026-09-19T17:00:00.000Z'),
    nested: Array.from({ length: 4000 }, (_, index) => ({ index, valid: true })),
  };
  const expected = `${JSON.stringify(source)}\n`;
  const written = await writeBoundedJsonAtomic(destination, source, {
    maximumBytes: Buffer.byteLength(expected), bufferBytes: 97,
  });
  assert.equal(await fs.readFile(destination, 'utf8'), expected);
  assert.equal(written.bytes, Buffer.byteLength(expected));
  assert.ok(written.topLevelBytes.nested > written.topLevelBytes.schemaVersion);

  await fs.writeFile(destination, 'preserve-me');
  await assert.rejects(
    writeBoundedJsonAtomic(destination, source, { maximumBytes: 100, bufferBytes: 16 }),
    /BOUNDED_JSON_MAXIMUM_BYTES_EXCEEDED/,
  );
  assert.equal(await fs.readFile(destination, 'utf8'), 'preserve-me',
    'En overskridelse må ikke erstatte den seneste gyldige fil.');
  assert.equal((await fs.readdir(root)).filter(name => name.endsWith('.tmp')).length, 0);

  const circular = {};
  circular.self = circular;
  await assert.rejects(
    writeBoundedJsonAtomic(destination, circular, { maximumBytes: 1000 }),
    /circular structure/i,
  );
  assert.equal(await fs.readFile(destination, 'utf8'), 'preserve-me');
} finally {
  await fs.rm(root, { recursive: true, force: true });
}

console.log('OK: stor conditions-JSON skrives kompakt, atomisk og med fast parsebar størrelsesgrænse.');
