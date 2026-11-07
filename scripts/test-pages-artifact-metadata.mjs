import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { PagesArtifactVisibilityExhausted, PAGES_ARTIFACT_VISIBILITY_EXIT,
  readPagesArtifactMetadata } from './read-pages-artifact-metadata.mjs';

const repository = 'owner/forecast';
const artifactId = '12345678901';
const token = 'synthetic-test-token';
const metadata = JSON.stringify({ id: Number(artifactId), name: 'github-pages' });

function fixture(statuses) {
  const calls = [];
  const delays = [];
  const options = { repository, artifactId, token,
    pause: async delay => delays.push(delay),
    fetchImpl: async (url, options) => {
      const status = statuses[calls.length];
      assert.equal(url, 'https://api.github.com/repos/' + repository + '/actions/artifacts/' + artifactId);
      assert.equal(options.redirect, 'error');
      assert.equal(options.headers.Authorization, 'Bearer ' + token);
      assert.equal(options.signal.aborted, false);
      calls.push(status);
      return new Response(status === 200 ? metadata : '{}', { status });
    },
  };
  return { calls, delays, options };
}

test('ordinary Pages artifact metadata becomes visible after the reported upload ID initially returns 404', async () => {
  const { calls, delays, options } = fixture([404, 404, 200]);
  assert.equal(await readPagesArtifactMetadata(options), metadata);
  assert.deepEqual(calls, [404, 404, 200]);
  assert.deepEqual(delays, [1000, 2000]);
});

test('ordinary Pages artifact metadata fails closed at the 404 bound and does not retry other responses', async () => {
  const missing = fixture(Array(6).fill(404));
  await assert.rejects(readPagesArtifactMetadata(missing.options), PagesArtifactVisibilityExhausted);
  assert.equal(missing.calls.length, 6);
  assert.deepEqual(missing.delays, [1000, 2000, 4000, 8000, 16000]);
  for (const status of [401, 403, 429, 500]) {
    const unavailable = fixture([status]);
    await assert.rejects(readPagesArtifactMetadata(unavailable.options), error =>
      !(error instanceof PagesArtifactVisibilityExhausted) && error.message === 'PAGES_ARTIFACT_METADATA_HTTP_' + status);
    assert.deepEqual(unavailable.calls, [status]);
    assert.deepEqual(unavailable.delays, []);
  }
  const mixed = fixture([404, 403]);
  await assert.rejects(readPagesArtifactMetadata(mixed.options), error =>
    !(error instanceof PagesArtifactVisibilityExhausted) && error.message === 'PAGES_ARTIFACT_METADATA_HTTP_403');
  assert.deepEqual(mixed.calls, [404, 403]);
});

test('ordinary Pages uses bounded metadata before the unchanged exact identity and digest checks', () => {
  const workflow = fs.readFileSync(new URL('../.github/workflows/reusable-weather-build.yml', import.meta.url), 'utf8');
  const section = workflow.split('      - name: Resolve and seal the exact uploaded Pages artifact')[1]
    .split('      - name: Upload privacy-safe operational handoff evidence after Pages artifact seal')[0];
  assert.equal(workflow.split('node scripts/read-pages-artifact-metadata.mjs').length, 2);
  assert.match(section, /node scripts\/read-pages-artifact-metadata\.mjs "\$artifact_id"[\s\S]*\.id == \$artifactId and \.name == "github-pages" and \.expired == false and \.workflow_run\.id == \$runId and \.workflow_run\.head_sha == \$headSha[\s\S]*normalizeArtifactDigestSha256/);
  assert.match(section, /targetPublicManifestSha256:\$targetPublicManifestSha256/);
  assert.ok(section.includes('if [[ "$status" == ' + PAGES_ARTIFACT_VISIBILITY_EXIT + ' ]]'));
  const marker = section.split('      - name: Confirm exhausted exact Pages artifact metadata visibility')[1];
  assert.match(marker, /failure\(\)[\s\S]*steps\.pages-upload\.outcome == 'success'[\s\S]*steps\.pages-artifact-seal\.outcome == 'failure'[\s\S]*metadata_visibility_exhausted == 'true'/);
  assert.match(marker, /GH_TOKEN: \$\{\{ github\.token \}\}[\s\S]*gh api --method GET[\s\S]*artifacts\?per_page=100[\s\S]*jq -e/);
});
