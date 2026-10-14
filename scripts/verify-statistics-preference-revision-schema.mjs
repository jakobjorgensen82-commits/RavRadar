#!/usr/bin/env node
// Explicit revision-phase readback only. The original schema1 CLI is unchanged.
import {fileURLToPath} from 'node:url';
import {verifyInstalledStatisticsPreferenceRevisionSchema} from './verify-account-assistant-schema.mjs';
if(process.argv[1] && fileURLToPath(import.meta.url)===process.argv[1]) {
  try {
    if(process.argv.length!==2 || process.env.GITHUB_EVENT_NAME!=='workflow_dispatch'
      || process.env.GITHUB_REF!=='refs/heads/main' || process.env.GITHUB_RUN_ATTEMPT!=='1') {
      throw new Error('STATISTICS_PREFERENCE_REVISION_CALLER_REQUIRED');
    }
    console.log(JSON.stringify(await verifyInstalledStatisticsPreferenceRevisionSchema({
      accessToken:process.env.SUPABASE_ACCESS_TOKEN,
    })));
  } catch {
    // Never print response content, raw SQL exception, credentials or user data.
    console.error('STATISTICS_PREFERENCE_REVISION_SCHEMA_READBACK_FAILED');process.exitCode=1;
  }
}
