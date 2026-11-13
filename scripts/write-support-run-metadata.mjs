// Fixed diagnostic metadata only; never read the working project or a recovery payload.
import assert from 'node:assert/strict';
import fs from 'node:fs';
assert.equal(process.argv.length, 2, 'Support metadata accepts no arguments');
const identity = {
  repository: process.env.GITHUB_REPOSITORY,
  run_number: process.env.GITHUB_RUN_NUMBER,
  sha: process.env.GITHUB_SHA,
  ref: process.env.GITHUB_REF,
  generated_at: new Date().toISOString(),
};
assert.match(identity.repository ?? '', /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
assert.match(identity.run_number ?? '', /^[1-9][0-9]*$/);
assert.match(identity.sha ?? '', /^[a-f0-9]{40}$/);
assert(typeof identity.ref === 'string' && identity.ref.length <= 256
  && /^refs\/[A-Za-z0-9_./-]+$/.test(identity.ref));
const runText = Object.entries(identity).map(([key, value]) => key + '=' + value).join('\n') + '\n';
const descriptor = JSON.stringify({
  schemaVersion: 'ravradar-support-metadata-v1',
  kind: 'RUN_IDENTITY_ONLY',
  sourceCommit: identity.sha,
  sourceUrl: 'https://github.com/' + identity.repository + '/tree/' + identity.sha,
  projectSnapshotIncluded: false,
  weatherPayloadIncluded: false,
  privatePayloadIncluded: false,
  recoveryArtifact: false,
}, null, 2) + '\n';
assert(Buffer.byteLength(runText) + Buffer.byteLength(descriptor) <= 8192);
fs.mkdirSync('_support/run-metadata', { recursive: true });
fs.writeFileSync('_support/run-metadata/github-run.txt', runText);
fs.writeFileSync('_support/run-metadata/support-format.json', descriptor);
