import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequiredFileReader } from './lib/release-gate-required-files.mjs';

const tempBase = path.resolve(os.tmpdir());
const tempRoot = await fs.mkdtemp(path.join(tempBase, 'ravradar-release-gate-reader-'));
const resolvedTempRoot = path.resolve(tempRoot);
assert.ok(resolvedTempRoot.startsWith(`${tempBase}${path.sep}`), 'temporary test root escaped the system temp directory');

try {
  await fs.writeFile(path.join(resolvedTempRoot, 'valid.json'), '{"version":"4.0.317"}\n', 'utf8');
  await fs.writeFile(path.join(resolvedTempRoot, 'invalid.json'), '{not-json}\n', 'utf8');

  const errors = [];
  const { readText, readJson } = createRequiredFileReader(resolvedTempRoot, errors);
  assert.deepEqual(await readJson('valid.json'), { version: '4.0.317' });
  assert.equal(await readText('missing-changelog.md'), '');
  assert.deepEqual(await readJson('invalid.json', { invalid: true }), { invalid: true });
  assert.equal(errors.length, 2, 'missing and malformed files must be aggregated without an early throw');
  assert.match(errors[0], /^missing-changelog\.md: kunne ikke læses \([A-Z0-9_]+\)$/);
  assert.match(errors[1], /^invalid\.json: ugyldig JSON \([A-Z0-9_]+\)$/);
} finally {
  await fs.rm(resolvedTempRoot, { recursive: true, force: true });
}

console.log('Release-gate required-file diagnostics aggregate missing and malformed files.');
