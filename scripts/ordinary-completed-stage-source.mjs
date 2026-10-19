// Source comparison only. This cannot authenticate a staged payload or permit
// publication. The caller must separately authenticate the original producer,
// GCM envelope, model contracts, current predecessor and every delivery gate.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const SHA = /^[a-f0-9]{40}$/;
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const BUILD = '.github/workflows/reusable-weather-build.yml';
const ONCE = '.github/workflows/run-current-weather-once.yml';
const BOOK = 'docs/handbook/content.json';
const INSTALL = 'supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql';
const wiring = JSON.parse(fs.readFileSync(new URL('./lib/ordinary-completed-stage-workflow-review.json', import.meta.url), 'utf8'));
const DELIVERY_ONLY = new Set([
  'scripts/ordinary-completed-stage-artifact.mjs',
  'scripts/extract-ordinary-completed-stage.py',
  'scripts/ordinary-completed-stage-lineage.mjs',
  'scripts/ordinary-completed-stage-source.mjs',
  'scripts/ordinary-completed-stage-admission.mjs',
  'scripts/test-ordinary-completed-stage-artifact.mjs',
  'scripts/test-ordinary-completed-stage-lineage.mjs',
  'scripts/test-ordinary-completed-stage-source.mjs',
  'scripts/test-ordinary-completed-stage-admission.mjs',
  'scripts/test-last-mile-enclosure-restart-archive-origin.mjs',
  'scripts/lib/ordinary-completed-stage-workflow-review.json',
  'scripts/lib/completed-private-runtime-workflow-review.mjs',
  'scripts/test-completed-private-runtime-workflow-inverse.mjs',
  'scripts/test-workflow-validation-order-4.0.108.mjs',
  'scripts/test-native-postgres-evidence.mjs',
  'CHANGELOG-4.0.508.md',
  'HANDBOOK-RAVRADAR.md',
  'docs/handbook/content.json',
  'docs/ai/CODEX_START_HERE.md',
  'docs/rdks/00_READ_FIRST.md',
  'docs/rdks/01_AI_OPERATING_RULES.md',
  'docs/rdks/10_DECISIONS/DEC-0249-WEATHER-CACHE-AND-BOUNDED-COPERNICUS.md',
  'docs/rdks/20_REQUIREMENTS/ACTIVE-REQUIREMENTS.md',
  'docs/rdks/40_KNOWN_ISSUES/KNOWN-ISSUES.md',
  'docs/rdks/90_INDEX/CURRENT_TRUTH.md',
  'docs/rdks/90_INDEX/IMPLEMENTATION_STATUS.md',
  'docs/rdks/MASTER_LOG.md',
]);

function fail(code) {
  throw Object.assign(new Error(code), { code });
}

// The existing source gate requires the installer's handbook seed to equal
// the complete web handbook. Normalize ONLY that exact JSON value, using the
// actual handbook blob from the same commit. SQL outside that single value
// must remain byte-identical; this grants no migration/installation authority.
function documentationSql(bytes, handbookBytes) {
  let text, handbook;
  try {
    text = bytes.toString('utf8');
    const bookText = handbookBytes.toString('utf8');
    if (!Buffer.from(text).equals(bytes) || !Buffer.from(bookText).equals(handbookBytes))
      fail('ORDINARY_STAGE_SOURCE_DOCUMENTATION_SQL');
    handbook = JSON.parse(bookText);
  } catch { fail('ORDINARY_STAGE_SOURCE_DOCUMENTATION_SQL'); }
  const payload = JSON.stringify(handbook).replaceAll("'", "''");
  const seed = `values('handbook','${payload}'::jsonb,null)`;
  if (text.split(seed).length !== 2) fail('ORDINARY_STAGE_SOURCE_DOCUMENTATION_SQL');
  return Buffer.from(text.replace(seed, () => "values('handbook','DOCUMENTATION_VALUE_ONLY'::jsonb,null)"));
}

// This one reviewed operation changes storage placement, not a calculation
// input. Invert the entire four-step move; an arbitrary workflow edit is NOT
// allowed simply because it belongs to a delivery file.
export function ordinaryStageCalculationWorkflow(bytes) {
  let source = bytes.toString('utf8');
  for (const row of Object.values(wiring)) {
    if (digest(bytes) !== row.afterSha256) continue;
    if (bytes.length !== row.afterBytes) fail('ORDINARY_STAGE_SOURCE_WORKFLOW_INVERSE');
    for (const [offset, actual, original] of row.edits) {
      if (source.slice(offset, offset + actual.length) !== actual) fail('ORDINARY_STAGE_SOURCE_WORKFLOW_INVERSE');
      source = source.slice(0, offset) + original + source.slice(offset + actual.length);
    }
    bytes = Buffer.from(source);
    if (bytes.length !== row.beforeBytes || digest(bytes) !== row.beforeSha256)
      fail('ORDINARY_STAGE_SOURCE_WORKFLOW_INVERSE');
    break;
  }
  if (digest(bytes) !== '05665749cefb5f210a7542cb6fab06e2900be0fd9bb8326cab9b1dcc7b432f73') return bytes;
  const begin = '      # The expensive weather/score build is already complete. Save its exact\n';
  const next = '      - name: Generate and strictly validate production reference zones\n';
  const destination = '      - name: Build dataminimized weather preflight state after final gates\n';
  for (const marker of [begin, next, destination]) {
    if (source.split(marker).length !== 2) fail('ORDINARY_STAGE_SOURCE_WORKFLOW_INVERSE');
  }
  const block = source.slice(source.indexOf(begin), source.indexOf(next));
  if (Buffer.byteLength(block) !== 3399
    || digest(block) !== '712d300b49902e52d89f7fdbe383106fdfc692eb93a531ef7ec57101a8b3d22a')
    fail('ORDINARY_STAGE_SOURCE_WORKFLOW_INVERSE');
  const previous = source.replace(block, '').replace(destination, () => block + destination);
  if (digest(previous) !== 'f0254a092c0baa188370c207b218e15ad7c9e616138d15234e6f323f101178c6')
    fail('ORDINARY_STAGE_SOURCE_WORKFLOW_INVERSE');
  return Buffer.from(previous);
}

/** Compare actual committed Git objects, not a storage-ABI hash or a marker.
 * Explicit delivery/test/document changes are non-computational. ALL remaining
 * tracked paths, modes and objects must be identical, including new/deleted
 * paths. No general scripts/, data/, workflow or model exclusion exists.
 * New workflow wiring must obtain its own precise reviewed inverse before it
 * can be reused here; until then that drift is refused, never assumed safe. */
export function assertOrdinaryCompletedStageSource(input = {}) {
  return compareSource(input, true);
}

// Called again after the normal, inventory-constrained runtime installation.
// Re-read actual committed objects, not a serialized source receipt. Runtime
// hydration is not a source edit and does not make a dirty-tree marker proof.
// This still grants NO payload, origin, restore or publication authority.
export function assertOrdinaryCompletedStageCommittedSource(input = {}) {
  return compareSource(input, false);
}

function compareSource({ root, producerHead, consumerHead }, requireCleanCheckout) {
  if (typeof root !== 'string' || !root || !SHA.test(producerHead ?? '')
    || !SHA.test(consumerHead ?? '')) fail('ORDINARY_STAGE_SOURCE_REQUEST');
  const git = args => {
    try {
      return execFileSync('git', ['-C', root, ...args], {
        maxBuffer: 32 * 1024 * 1024, timeout: 30_000,
        stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
      });
    } catch { fail('ORDINARY_STAGE_SOURCE_GIT'); }
  };
  if (git(['rev-parse', 'HEAD']).toString('utf8').trim() !== consumerHead
    || (requireCleanCheckout && git(['status', '--porcelain', '--untracked-files=no']).length !== 0))
    fail('ORDINARY_STAGE_SOURCE_NOT_CLEAN_HEAD');
  for (const head of [producerHead, consumerHead]) {
    if (git(['rev-parse', `${head}^{commit}`]).toString('utf8').trim() !== head)
      fail('ORDINARY_STAGE_SOURCE_COMMIT');
  }
  git(['merge-base', '--is-ancestor', producerHead, consumerHead]);
  const tree = head => {
    const bytes = git(['ls-tree', '-rz', '--full-tree', head]);
    const source = bytes.toString('utf8');
    if (!Buffer.from(source).equals(bytes)) fail('ORDINARY_STAGE_SOURCE_TREE');
    return new Map(source.split('\0').filter(Boolean).map(line => {
      const match = /^([0-7]{6}) (blob|commit) ([a-f0-9]{40})\t([\s\S]+)$/.exec(line);
      if (!match) fail('ORDINARY_STAGE_SOURCE_TREE');
      return [match[4], { mode: match[1], type: match[2], blob: match[3] }];
    }));
  };
  const before = tree(producerHead), after = tree(consumerHead);
  let unchangedPaths = 0, deliveryPaths = 0, invertedWorkflows = 0;
  for (const name of new Set([...before.keys(), ...after.keys()])) {
    const old = before.get(name), current = after.get(name);
    if (old && current && old.mode === current.mode && old.type === current.type && old.blob === current.blob
      && !(name === INSTALL && before.get(BOOK)?.blob !== after.get(BOOK)?.blob)) {
      unchangedPaths++; continue;
    }
    if (name === INSTALL) {
      const oldBook = before.get(BOOK), currentBook = after.get(BOOK);
      if ([old, current, oldBook, currentBook].some(row => !row
        || row.mode !== '100644' || row.type !== 'blob'))
        fail('ORDINARY_STAGE_SOURCE_DOCUMENTATION_SQL');
      const normalizedBefore = documentationSql(git(['cat-file', 'blob', old.blob]),
        git(['cat-file', 'blob', oldBook.blob]));
      const normalizedAfter = documentationSql(git(['cat-file', 'blob', current.blob]),
        git(['cat-file', 'blob', currentBook.blob]));
      if (!normalizedBefore.equals(normalizedAfter)) fail('ORDINARY_STAGE_SOURCE_CALCULATION_DRIFT');
      deliveryPaths++; continue;
    }
    if (DELIVERY_ONLY.has(name)) {
      if ([old, current].some(row => row && (row.mode !== '100644' || row.type !== 'blob')))
        fail('ORDINARY_STAGE_SOURCE_DELIVERY_MODE');
      deliveryPaths++; continue;
    }
    if ([BUILD, ONCE].includes(name) && old?.mode === '100644' && current?.mode === '100644'
      && old.type === 'blob' && current.type === 'blob') {
      const normalizedBefore = ordinaryStageCalculationWorkflow(git(['cat-file', 'blob', old.blob]));
      const normalizedAfter = ordinaryStageCalculationWorkflow(git(['cat-file', 'blob', current.blob]));
      if (!normalizedBefore.equals(normalizedAfter)) fail('ORDINARY_STAGE_SOURCE_CALCULATION_DRIFT');
      invertedWorkflows++; continue;
    }
    fail('ORDINARY_STAGE_SOURCE_CALCULATION_DRIFT');
  }
  assert(Number.isSafeInteger(unchangedPaths) && unchangedPaths > 0);
  return Object.freeze({ kind: 'ORDINARY_COMPLETED_STAGE_SOURCE_COMPATIBILITY',
    producerHead, consumerHead, unchangedPaths, deliveryPaths, invertedWorkflows,
    storedAbiAloneUsed: false, payloadAuthenticated: false, publicationAuthorized: false });
}
