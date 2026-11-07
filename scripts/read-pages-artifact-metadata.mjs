import assert from 'node:assert/strict';
import path from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { readBoundedPublicManifest } from './lib/pages-generation-order.mjs';

const retryDelaysMs = [0, 1000, 2000, 4000, 8000, 16000];
export const PAGES_ARTIFACT_VISIBILITY_EXIT = 42;

export class PagesArtifactVisibilityExhausted extends Error {
  constructor() {
    super('PAGES_ARTIFACT_METADATA_NOT_VISIBLE');
  }
}

export async function readPagesArtifactMetadata({
  repository, artifactId, token, fetchImpl = fetch, pause = wait,
}) {
  assert(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? ''), 'PAGES_ARTIFACT_REPOSITORY');
  assert(/^[1-9][0-9]*$/.test(artifactId ?? ''), 'PAGES_ARTIFACT_ID');
  assert(typeof token === 'string' && /^\S{1,4096}$/.test(token), 'PAGES_ARTIFACT_AUTH');
  const url = 'https://api.github.com/repos/' + repository + '/actions/artifacts/' + artifactId;
  const deadline = AbortSignal.timeout(50_000);
  for (const delay of retryDelaysMs) {
    if (delay) await pause(delay, undefined, { signal: deadline });
    const response = await fetchImpl(url, {
      redirect: 'error',
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28', 'Cache-Control': 'no-cache' },
      signal: AbortSignal.any([deadline, AbortSignal.timeout(6_000)]),
    });
    if (response.status === 200) {
      return readBoundedPublicManifest(response, 64 * 1024);
    }
    await response.body?.cancel();
    if (response.status !== 404) throw new Error('PAGES_ARTIFACT_METADATA_HTTP_' + response.status);
  }
  throw new PagesArtifactVisibilityExhausted();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  readPagesArtifactMetadata({
    repository: process.env.GITHUB_REPOSITORY, artifactId: process.argv[2], token: process.env.GH_TOKEN,
  }).then(metadata => process.stdout.write(metadata)).catch(error => {
    const code = typeof error?.message === 'string' && /^PAGES_ARTIFACT_[A-Z0-9_]+$/.test(error.message)
      ? error.message : 'PAGES_ARTIFACT_METADATA_READ_FAILED';
    console.error(code);
    process.exitCode = error instanceof PagesArtifactVisibilityExhausted ? PAGES_ARTIFACT_VISIBILITY_EXIT : 1;
  });
}
