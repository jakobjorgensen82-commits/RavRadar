'use strict';
const path = require('node:path');
const { pathToFileURL } = require('node:url');
(async () => {
  try {
    const helper = path.resolve(__dirname, '../../../scripts/test-owned-cache-cross-runner.mjs');
    const { runHostedCacheRecoveryFixture } = await import(pathToFileURL(helper));
    await runHostedCacheRecoveryFixture(process.env.INPUT_MODE);
  } catch {
    // SDK messages and environment values must never become diagnostics.
    console.error('SYNTHETIC_CACHE_RECOVERY_REFUSED');
    process.exitCode = 1;
  }
})();
