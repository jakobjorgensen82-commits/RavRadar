import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  TRACKED_PUBLIC_LIVE_ALLOWLIST,
  auditTrackedRuntimePaths,
} from './audit-tracked-runtime-privacy.mjs';

assert.deepEqual(auditTrackedRuntimePaths([...TRACKED_PUBLIC_LIVE_ALLOWLIST]), {
  passed: true,
  trackedLiveFileCount: 4,
  maximumAllowedLiveFileCount: 4,
  privateRuntimeTracked: false,
});
assert.equal(auditTrackedRuntimePaths([
  'data/live/manifest.json',
  'app.js',
]).passed, true);

for (const privatePath of [
  'data/live/conditions.json',
  'data/live/dmi-bulk-cache.json',
  'data/live/dmi-forecast-cache.json',
  'data/live/dmi-water-stations.json',
  'data/live/weather-health.json',
  'data/live/ravradar-runtime-diagnostics.json',
  'data/live/coastal-point-staging-status.json',
  'data/live/new-private-file.json',
]) {
  assert.throws(
    () => auditTrackedRuntimePaths([...TRACKED_PUBLIC_LIVE_ALLOWLIST, privatePath]),
    /Private runtime files are tracked/,
    privatePath,
  );
}
assert.throws(
  () => auditTrackedRuntimePaths(['data\\live\\manifest.json']),
  /unsafe path/,
);
assert.throws(
  () => auditTrackedRuntimePaths(['data/live/manifest.json', 'data/live/manifest.json']),
  /duplicates/,
);

console.log('Tracked data/live privacy allowlist passes.');

const assistantRoundtrip='scripts/test-rav-assistant-main-edge-roundtrip.mjs';
const fixedAssistantInvocations=Object.freeze([
  ['--source-catalog456-da'],['--source-catalog456-de'],['--source-catalog456-en'],
  ['--source-default-without-catalog456'],
]);
const catalogueReceipts=[];
const finiteChildFailure=result=>({
  errorCode:result.error==null?null:['ETIMEDOUT','ENOBUFS','ENOENT','EACCES','EPERM'].includes(result.error.code)?result.error.code:'OTHER',
  signal:result.signal==null?null:['SIGTERM','SIGKILL','SIGABRT','SIGSEGV','SIGINT'].includes(result.signal)?result.signal:'OTHER',
});

// Keep the bounded source group while checking the actual public-facing
// private-data queue and assistant guards in isolated, network-free processes.
for (const script of [
  'scripts/test-observation-production-mapping.mjs',
  'scripts/test-rav-assistant-edge-cloudflare-4.0.290.mjs',
  'scripts/test-public-page-resume-4.0.292.mjs',
  'scripts/test-rav-assistant-main-edge-roundtrip.mjs',
  'scripts/test-auth-bootstrap-4.0.66.mjs',
  'scripts/test-user-account-trip-log-4.0.264.mjs',
  'scripts/test-profile-permission-owner-epoch.mjs',
  'scripts/test-delete-trip-owner-data-readback.mjs',
  'scripts/test-trip-evidence-controller-active-intent.mjs',
  'scripts/test-assistant-ui-error-boundary.mjs',
  'scripts/test-trip-evidence-upload-receipt.mjs',
  'scripts/test-trip-evidence-storage-interruption.mjs',
  'scripts/test-trip-storage-edge-transient-retry.mjs',
]) {
  const invocations=script===assistantRoundtrip?fixedAssistantInvocations:[[]];
  for(const args of invocations){
    const result = spawnSync(process.execPath, [script,...args], { cwd: process.cwd(), encoding: 'utf8', timeout: 30_000, maxBuffer: 1024 * 1024 });
    assert.equal(result.status, 0, `${script} ${args.join(' ')} failed ${JSON.stringify(finiteChildFailure(result))}:\n${result.stdout}\n${result.stderr}`);
    process.stdout.write(result.stdout);
    if(args[0]?.startsWith('--source-catalog456-')){
      const rows=String(result.stdout).split('\n').filter(line=>line.startsWith('{')).map(line=>JSON.parse(line))
        .filter(row=>row.contract==='whole456 current app/service/local follow-up plus unchanged39 Edge');
      assert.equal(rows.length,1);catalogueReceipts.push(rows[0]);
    }
  }
}
assert.deepEqual(catalogueReceipts.map(row=>row.selectedLocales),[['da'],['de'],['en']]);
for(const row of catalogueReceipts){
  assert.equal(row.status,'PASS');assert.equal(row.authoredUnits,456);assert.equal(row.locales,1);
  assert.equal(row.authoredPositive,456);assert.equal(row.paraphrases,456);assert.equal(row.followups,456);
  assert.equal(row.unknownNegative,456);assert.equal(row.privateNegative,912);assert.equal(row.controlledEdge,1);assert.equal(row.realNetwork,0);
}
for(const args of [['--source-catalog456-fr'],['--unknown-roundtrip-flag'],['--source-catalog456-da','--source-catalog456-de']]){
  const result=spawnSync(process.execPath,[assistantRoundtrip,...args],{cwd:process.cwd(),encoding:'utf8',timeout:30_000,maxBuffer:1024*1024});
  assert.equal(result.status,1,JSON.stringify(finiteChildFailure(result)));
  assert.match(result.stderr,/Unknown assistant roundtrip test flag or locale/);assert.equal(result.stdout,'');
}
console.log('Assistant source partitions: all456 x DA/DE/EN plus every non-catalogue default block; unsupported test flags refused.');
