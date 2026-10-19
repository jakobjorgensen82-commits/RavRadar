// A once-only score INPUT selection for authentic, separately archived B/S.
// It never admits an old state or a weather row. The normal PART pipeline
// still verifies every selected weather component and brands actual COLD work.
import crypto from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { assertVerifiedUnpairedWeatherRestartArchive } from './weather-state-epoch-archive.mjs';
import { prepareArchivedCurrentOriginRestart } from './established-native-current-origin.mjs';
import { RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODES } from './ravscore-recovery-replay.mjs';

const views = new WeakMap();
const canonical = value => JSON.stringify(value, (_key, item) =>
  item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const digest = value => crypto.createHash('sha256').update(canonical(value)).digest('hex');
const same = (left, right) => isDeepStrictEqual(left, right);
const plain = value => value !== null && typeof value === 'object'
  && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
function refuse(code) {
  const name = 'ARCHIVED_WEATHER_RESTART_INPUT_' + code;
  throw Object.assign(new Error(name), { code: name });
}
function exactOptions(options, keys) {
  if (!plain(options) || !same(Object.keys(options).sort(), [...keys].sort())) refuse('ARGUMENTS');
}
function immutableEmptyMap() {
  const value = new Map();
  for (const name of ['set', 'delete', 'clear']) Object.defineProperty(value, name, {
    value() { refuse('MUTATION'); }, enumerable: false,
  });
  return Object.freeze(value);
}

export async function createArchivedWeatherRestartInputView(options) {
  if (arguments.length !== 1) refuse('ARGUMENTS');
  exactOptions(options, ['archive', 'registry', 'targetReferenceAt']);
  const { archive, targetReferenceAt } = options;
  // FIRST: a JSON receipt, copied facts or callback cannot supply authority.
  const original = assertVerifiedUnpairedWeatherRestartArchive(archive);
  if (original.paired !== false || original.admission !== 'NO_ADMISSION'
    || targetReferenceAt !== original.targetReferenceAt
    || !same(options.registry, original.registry.value)
    || digest(options.registry) !== original.registry.canonicalSha256) refuse('SCOPE');
  // The issuer independently authenticates live B/S, physical original bytes,
  // current source/Git and central registry. No caller origin handle is accepted.
  const origin = await prepareArchivedCurrentOriginRestart(archive, {
    centralContract: original.registry.value, targetReferenceAt,
  });
  const empty = Object.freeze({});
  const rows = immutableEmptyMap();
  const scoreInputs = Object.freeze({
    previousCoastalParts: null,
    previousCandidateGRollbackRuntime: null,
    pointStateInjections: empty,
    checkpointStates: empty,
    checkpointCandidateGRollbackStates: empty,
    deployedBulkCache: null,
    historicalDmiBulkCache: null,
    persistedDmiPartRows: rows,
    previousCurrentSourceDomainTransitions: null,
    candidateGBootstrapMode: RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODES.integratedStateLessRecovery,
    candidateGSourceValidated: false,
    stateLessRecovery: true,
    establishedNativeCurrentOrigin: origin,
  });
  const boundary = Object.freeze({
    schemaVersion: 1,
    kind: 'ARCHIVE_ISOLATED_NEW_FAMILY_WEATHER_INPUT_BOUNDARY',
    admission: 'NO_NUMERICAL_ADMISSION',
    pairedOriginals: false,
    targetReferenceAt,
    archiveId: original.archiveId,
    archiveCatalogSha256: original.archiveCatalogSha256,
    originalBundleContentSha256: original.B.description.bundleContentSha256,
    originalBundleReferenceAt: original.B.description.productionReferenceAt,
    originalPointerVersion: original.B.pointerRow.version,
    originalCentralCheckpointVersion: original.S.version,
    originalCentralCheckpointPayloadSha256: original.S.payloadSha256,
    originalCentralCheckpointReferenceAt: original.S.productionReferenceAt,
    originalPublicManifestSha256: original.public.manifestSha256,
    originalPublicReferenceAt: original.public.productionReferenceAt,
    registryCanonicalSha256: original.registry.canonicalSha256,
    initialIntegratedStateCount: 0,
    initialCandidateStateCount: 0,
    initialPointInjectionCount: 0,
  });
  const view = Object.freeze({});
  views.set(view, { archive, original, scoreInputs, boundary });
  return view;
}

function qualify(view, scope) {
  exactOptions(scope, ['registry', 'targetReferenceAt']);
  const selected = view && typeof view === 'object' ? views.get(view) : null;
  if (!selected) refuse('UNVERIFIED_VIEW');
  if (assertVerifiedUnpairedWeatherRestartArchive(selected.archive) !== selected.original
    || !same(scope.registry, selected.original.registry.value)
    || digest(scope.registry) !== selected.boundary.registryCanonicalSha256
    || scope.targetReferenceAt !== selected.boundary.targetReferenceAt
    || selected.scoreInputs.persistedDmiPartRows.size !== 0) refuse('CHANGED');
  return selected;
}

export function archivedWeatherRestartScoreInputs(view, scope) {
  if (arguments.length !== 2) refuse('ARGUMENTS');
  return qualify(view, scope).scoreInputs;
}

export function archivedWeatherRestartBoundary(view, scope) {
  if (arguments.length !== 2) refuse('ARGUMENTS');
  return qualify(view, scope).boundary;
}
