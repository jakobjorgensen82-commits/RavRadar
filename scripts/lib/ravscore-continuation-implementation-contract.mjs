import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES = Object.freeze([
  'js/core/ravscore-model-contract.js',
  'js/core/ravscore-mobilisation-memory.js',
  'js/core/ravscore-regime-memory.js',
  'js/core/ravscore-candidate-g-state-pipeline.js',
  'js/core/ravscore-current-supply-memory.js',
  'js/core/ravscore-wave-mobilisation-state.js',
  'js/core/ravscore-integrated-state-pipeline.js',
  'scripts/lib/coastal-point-staging-contract.mjs',
  'scripts/lib/ravscore-candidate-g-rollback-runtime.mjs',
  'scripts/rollback-assets/ravscore-model-contract.js',
  'scripts/rollback-assets/ravscore-model-bundle.generated.js',
  'scripts/ravscore-continuation-checkpoint.mjs',
]);

export const RAVSCORE_CONTINUATION_IMPLEMENTATION_NORMALIZATION_ID =
  'utf8-bomless-lf-v2';

export const RAVSCORE_CONTINUATION_IMPLEMENTATION_REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

export function normalizeRavScoreContinuationImplementationSource(value) {
  return String(value)
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n');
}

function insideOrEqual(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (relative !== '..'
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative));
}

export async function ravScoreContinuationImplementationSha256({
  repositoryRoot = RAVSCORE_CONTINUATION_IMPLEMENTATION_REPOSITORY_ROOT,
} = {}) {
  const root = path.resolve(repositoryRoot);
  const rows = [];
  for (const relativePath of [...RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES].sort(compareText)) {
    const absolute = path.resolve(root, relativePath);
    if (!insideOrEqual(root, absolute)) {
      throw new Error('RavScore continuation implementation path escapes repository');
    }
    const source = normalizeRavScoreContinuationImplementationSource(
      await fs.readFile(absolute, 'utf8'),
    );
    rows.push([relativePath, sha256(source)]);
  }
  return sha256(JSON.stringify(rows));
}
