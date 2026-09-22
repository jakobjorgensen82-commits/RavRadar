import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const generators = [
  'scripts/build-post-cutover-current-hold-binding-migration.mjs',
  'scripts/build-valid-data-before-local-missing-binding-migration.mjs',
  'scripts/build-partial-zone-public-metadata-binding-migration.mjs',
  'scripts/build-last-mile-history-envelope-binding-migration.mjs',
  'scripts/build-current-input-foundation-binding-migration.mjs',
  'scripts/build-measured-warmup-checkpoint-migration.mjs',
  'scripts/build-public-hour-delivery-binding-migration.mjs',
  'scripts/build-integrated-model-binding-successor.mjs',
];

for (const generator of generators) {
  const result = spawnSync(process.execPath, [generator, '--check'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
  });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  assert.equal(
    result.status,
    0,
    generator + ' skal verificere sit append-only migrationsled',
  );
}

console.log('Current binding migration chain preserves and verifies all append-only links.');
