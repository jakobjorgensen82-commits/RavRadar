import { directionFromComponents } from '../../js/core/current-direction-audit.js';
import {
  operationalLiveCurrentClosureEnabled,
  verifiedLivePilotSource,
  verifiedNativeCadenceReferenceForPart,
} from './live-current-pilot.mjs';

const INTERNAL_CURRENT_PROVENANCE_FIELDS = Object.freeze([
  'status',
  'reason',
  'provider',
  'source',
  'sourceClass',
  'collection',
  'modelRun',
  'leadTimeHours',
  'forecastAgeHours',
  'temporalResolution',
  'fallback',
  'controlledLivePilot',
  'vectorSemanticsVersion',
  'vectorSelection',
  'verticalLayer',
  'verticalLayerRankM',
  'distanceKm',
  'componentPair',
  'interpolation',
  'physicalScope',
  'scoreInputPolicyId',
  'calibrationEligible',
]);

const PUBLIC_CURRENT_PROVENANCE_FIELDS = Object.freeze([
  'status',
  'reason',
  'provider',
  'collection',
  'source',
  'sourceClass',
  'controlledLivePilot',
  'temporalResolution',
  'verticalLayer',
  'vectorSelection',
  'vectorSemanticsVersion',
  'method',
  'fallback',
  'distanceKm',
]);

const FORBIDDEN_PUBLIC_VECTOR_FIELDS = Object.freeze([
  'currentUMps',
  'currentVMps',
  'uMps',
  'vMps',
]);

const finite = value => value !== null
  && value !== undefined
  && value !== ''
  && typeof value !== 'boolean'
  && Number.isFinite(Number(value));

const canonicalTime = value => {
  const parsed = Date.parse(value ?? '');
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
};

const samePoint = (first, second, tolerance = 1e-7) => Array.isArray(first)
  && first.length >= 2
  && Array.isArray(second)
  && second.length >= 2
  && first.slice(0, 2).every(finite)
  && second.slice(0, 2).every(finite)
  && Math.abs(Number(first[0]) - Number(second[0])) <= tolerance
  && Math.abs(Number(first[1]) - Number(second[1])) <= tolerance;

const canonicalJson = value => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => (
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`
    )).join(',')}}`;
  }
  return JSON.stringify(value);
};

const sameValue = (first, second) => canonicalJson(first) === canonicalJson(second);

const pickDefined = (value, fields) => Object.fromEntries(fields
  .filter(field => value?.[field] !== undefined)
  .map(field => [field, value[field]]));

function internalCurrentProvenance(source) {
  const projected = pickDefined(source, INTERNAL_CURRENT_PROVENANCE_FIELDS);
  if (Array.isArray(source?.nativeValidTimes)) {
    projected.nativeValidTimes = source.nativeValidTimes
      .map(canonicalTime)
      .filter(Boolean);
  }
  return projected;
}

const publicCurrentProvenance = source => pickDefined(
  source,
  PUBLIC_CURRENT_PROVENANCE_FIELDS,
);

const pairKey = (partId, validTime) => {
  const canonical = canonicalTime(validTime);
  return typeof partId === 'string' && partId.length > 0 && canonical
    ? `${partId}\u0000${canonical}`
    : null;
};

const fail = reason => ({ ok: false, reason });

/**
 * Prove that a vector-free current score is the integrated model's bounded
 * native-cadence hold. Candidate G field names remain accepted only for the
 * historical rollback runtime; integrated production uses ravScoreModel.
 */
export function verifyCoastalPartNativeCadenceHold({
  part,
  runtimePart,
  pilotHistory,
} = {}) {
  const weather = runtimePart?.current?.weather;
  if (finite(weather?.currentSpeedMps) || finite(weather?.currentDirectionDeg)) {
    return fail('native-cadence-tilstanden indeholder en delvis eller fuld strømprojektion');
  }
  const state = runtimePart?.ravScoreModel ?? runtimePart?.candidateG;
  if (state?.currentTransition !== 'NATIVE_CADENCE_HOLD') {
    return fail('den vektorfri scoretime er ikke markeret som native-cadence-fastholdelse');
  }
  const memoryReady = state?.currentMemoryReady ?? state?.transportMemoryReady;
  const memoryStatus = state?.currentMemoryStatus ?? state?.transportMemoryStatus;
  if (!((memoryReady === true && memoryStatus === 'READY')
    || (memoryReady === false && memoryStatus === 'WINDOW_INCOMPLETE'))) {
    return fail('native-cadence-fastholdelsen mangler en tilladt hukommelsestilstand');
  }
  const currentAt = canonicalTime(runtimePart?.current?.time);
  const referenceAt = canonicalTime(
    state?.currentReferenceAt ?? state?.transportReferenceAt,
  );
  if (!currentAt || !referenceAt) {
    return fail('native-cadence-fastholdelsen mangler gyldig score- eller referencetid');
  }
  const ageHours = (Date.parse(currentAt) - Date.parse(referenceAt)) / 3_600_000;
  if (!(ageHours > 0 && ageHours <= 3)) {
    return fail('native-cadence-fastholdelsen ligger uden for den tilladte tretimersgrænse');
  }
  if (!verifiedNativeCadenceReferenceForPart(part, pilotHistory, referenceAt)) {
    return fail('native-cadence-fastholdelsen mangler sin eksakte verificerede kilderække');
  }
  return { ok: true, referenceAt, ageHours };
}

/**
 * Prove an honest local MISSING state. Missing current is allowed to disable
 * only that local score; it may never be presented as calm water, borrow an
 * arrow from another hour, or claim verified provenance.
 */
export function verifyCoastalPartMissingCurrent({
  part,
  runtimePart,
  publicPart,
} = {}) {
  const selectedTime = canonicalTime(runtimePart?.current?.time);
  if (!selectedTime || canonicalTime(publicPart?.current?.time) !== selectedTime) {
    return fail('intern og offentlig MISSING er ikke bundet til samme scoretime');
  }
  const runtimeWeather = runtimePart?.current?.weather;
  const publicWeather = publicPart?.current?.weather;
  if (!runtimeWeather || !publicWeather) {
    return fail('MISSING mangler intern eller offentlig vejrprojektion');
  }
  if ([runtimeWeather, publicWeather].some(weather => (
    finite(weather.currentSpeedMps) || finite(weather.currentDirectionDeg)
    || FORBIDDEN_PUBLIC_VECTOR_FIELDS.some(field => Object.hasOwn(weather, field))
  ))) {
    return fail('MISSING indeholder alligevel en hel eller delvis strømvektor');
  }
  const runtimeProof = runtimeWeather.currentProvenance;
  const publicProof = publicWeather.currentProvenance;
  if (runtimeProof?.status !== 'unverified'
    || publicProof?.status !== 'unverified'
    || typeof runtimeProof?.reason !== 'string' || !runtimeProof.reason
    || publicProof?.reason !== runtimeProof.reason) {
    return fail('MISSING mangler ens eksplicit ikke-verificeret proveniens');
  }
  for (const projection of [runtimePart, publicPart]) {
    if (!samePoint(projection?.flowPoints?.current, part?.waterPoint)
      || projection?.flowPoints?.sources?.current !== 'zone-marine-anchor'
      || projection?.flowPoints?.sourceMetadata?.current != null) {
      return fail('MISSING udgiver en strømpil eller et strømgrid som måling');
    }
    for (const mode of ['waders', 'beach']) {
      const result = projection?.current?.[mode];
      if (result?.available === true || finite(result?.score)) {
        return fail('MISSING er alligevel udgivet som en tilgængelig lokal score');
      }
    }
  }
  return { ok: true, reason: runtimeProof.reason };
}

/**
 * Validate the independent operational closure once and index only its entries.
 * Optional history has separate proofs and cannot invalidate these rows.
 * Consumers can then prove 673 displayed parts without repeatedly hashing the
 * full 79,414-pair document.
 */
export function buildOperationalCurrentEntryIndex(pilotHistory) {
  if (!operationalLiveCurrentClosureEnabled(pilotHistory)) return null;
  const entriesByPair = new Map();
  for (const entry of pilotHistory.entries ?? []) {
    const key = pairKey(entry?.partId, entry?.validTime);
    if (!key || entriesByPair.has(key)) return null;
    entriesByPair.set(key, entry);
  }
  return Object.freeze({ pilotHistory, entriesByPair });
}

function enrichedOperationalSource(entry, pilotHistory) {
  const validTime = canonicalTime(entry?.validTime);
  if (!validTime) return null;
  const provider = String(entry?.provider ?? '').toLowerCase();
  return {
    ...entry,
    productionReferenceAt: entry?.productionReferenceAt
      ?? pilotHistory?.copernicusRangeSeal?.productionReferenceAt,
    status: 'verified',
    controlledLivePilot: true,
    vectorSelection: 'dmi-local-then-copernicus-local-then-owner-approved-regional-proxy-then-open-meteo-combined-current',
    temporalResolution: 'native',
    nativeValidTimes: [entry?.sourceValidTime ?? validTime],
    fallback: provider === 'open-meteo',
  };
}

function displayedCurrentProvenance(source) {
  if (source?.provider === 'dmi'
    && source?.sourceClass === 'owner-approved-regional-proxy'
    && source?.classification === 'REGIONAL_DMI_NATIVE') {
    return {
      status: 'verified',
      sourceClass: source.sourceClass,
      source: source.source,
      collection: source.collection,
      distanceKm: source.distanceKm,
    };
  }
  return internalCurrentProvenance(source);
}

function flowProjectionFailures(flowPoints, expected) {
  const metadata = flowPoints?.sourceMetadata?.current;
  const failures = [];
  if (!samePoint(flowPoints?.current, expected.gridPoint)) failures.push('gridPoint');
  if (flowPoints?.sources?.current !== expected.arrowSource) failures.push('source');
  if (metadata?.source !== expected.arrowSource) failures.push('metadata.source');
  if (metadata?.sourceClass !== expected.flowSourceClass) failures.push('metadata.sourceClass');
  if (!finite(metadata?.distanceKm)
    || Number(metadata.distanceKm) !== Number(expected.distanceKm)) failures.push('metadata.distanceKm');
  return failures;
}

/**
 * Prove one displayed coastal-part current from its private exact U/V row.
 * The displayed runtime is intentionally vector-free; speed, direction,
 * provenance and arrow location must all be reproducible from the bound row.
 */
export function verifyCoastalPartCurrentProjection({
  part,
  runtimePart,
  publicPart,
  bulkZone,
  operationalEntryIndex,
  verifyBulkRow,
} = {}) {
  const selectedTime = canonicalTime(runtimePart?.current?.time);
  if (!selectedTime || canonicalTime(publicPart?.current?.time) !== selectedTime) {
    return fail('intern og offentlig kystdel er ikke bundet til samme gyldige scoretime');
  }
  const currentWeather = runtimePart?.current?.weather;
  const publicWeather = publicPart?.current?.weather;
  if (!currentWeather || !publicWeather) {
    return fail('den viste lokale strøm mangler intern eller offentlig vejrprojektion');
  }
  if ([currentWeather, publicWeather].some(weather => (
    FORBIDDEN_PUBLIC_VECTOR_FIELDS.some(field => Object.hasOwn(weather, field))
  ))) {
    return fail('den viste lokale strøm eksponerer rå U/V-felter');
  }
  if (!finite(currentWeather.currentSpeedMps)
    || !finite(currentWeather.currentDirectionDeg)
    || !finite(publicWeather.currentSpeedMps)
    || !finite(publicWeather.currentDirectionDeg)) {
    return fail('den viste lokale strøm mangler afledt hastighed eller retning');
  }
  const currentProof = currentWeather.currentProvenance;
  const publicProof = publicWeather.currentProvenance;
  if (currentProof?.status !== 'verified' || publicProof?.status !== 'verified') {
    return fail('den viste lokale strøm mangler verificeret intern eller offentlig proveniens');
  }

  let source;
  let rawRow;
  let sourceClass;
  let arrowSource;
  let flowSourceClass;
  const provider = String(currentProof.provider ?? '').toLowerCase();
  if (provider === 'dmi' && Number(currentProof.vectorSemanticsVersion) === 3) {
    if (!bulkZone || typeof verifyBulkRow !== 'function') {
      return fail('den viste DMI-strøm mangler sin bundne bulkpost');
    }
    const matches = Object.values(bulkZone.hourly ?? {}).flatMap(row => {
      if (canonicalTime(row?.time) !== selectedTime) return [];
      const projected = verifyBulkRow(bulkZone, part?.waterPoint, row);
      const verifiedSource = projected?.source;
      if (!verifiedSource || !finite(projected?.currentUMps)
        || !finite(projected?.currentVMps)) return [];
      const expected = internalCurrentProvenance({
        ...verifiedSource,
        status: 'verified',
        sourceClass: verifiedSource.sourceClass ?? 'local-model-grid',
      });
      return sameValue(currentProof, expected) ? [{
        row: projected,
        source: {
          ...verifiedSource,
          status: 'verified',
          sourceClass: verifiedSource.sourceClass ?? 'local-model-grid',
        },
      }] : [];
    });
    if (matches.length !== 1) {
      return fail('den viste DMI-strøm matcher ikke præcis én verificeret privat bulk-række');
    }
    ({ row: rawRow, source } = matches[0]);
    sourceClass = 'dmi-local';
    arrowSource = 'dmi-marine-grid';
    flowSourceClass = 'local-model-grid';
  } else {
    const key = pairKey(part?.partId, selectedTime);
    const entry = key ? operationalEntryIndex?.entriesByPair?.get(key) : null;
    if (!entry || operationalEntryIndex?.pilotHistory == null) {
      return fail('den viste supplerende strøm mangler sin eksakte operationelle closure-række');
    }
    source = enrichedOperationalSource(entry, operationalEntryIndex.pilotHistory);
    const sourceProof = source
      ? verifiedLivePilotSource(source, part, { requireStatus: true })
      : null;
    if (!sourceProof) {
      return fail('den private closure-række består ikke kilde-, celle-, lag- og afstandskontrollen');
    }
    if (!sameValue(currentProof, displayedCurrentProvenance(source))) {
      return fail('den viste supplerende proveniens matcher ikke sin closure-bundne kilderække');
    }
    rawRow = entry;
    arrowSource = sourceProof.arrowSource;
    flowSourceClass = arrowSource === 'dmi-regional-proxy-grid'
      ? 'owner-approved-regional-proxy'
      : 'supplemental-local-current';
    if (source.provider === 'copernicus') sourceClass = 'copernicus-local';
    else if (source.provider === 'open-meteo') sourceClass = 'open-meteo-combined-current';
    else if (source.provider === 'dmi'
      && source.sourceClass === 'owner-approved-regional-proxy'
      && source.classification === 'REGIONAL_DMI_NATIVE') {
      sourceClass = 'dmi-regional-proxy';
    } else {
      return fail('den closure-bundne række har en ikke-tilladt operationel kildeklasse');
    }
  }

  const uMps = Number(
    rawRow?.currentUMps ?? rawRow?.uMps ?? rawRow?.['current-u'],
  );
  const vMps = Number(
    rawRow?.currentVMps ?? rawRow?.vMps ?? rawRow?.['current-v'],
  );
  if (!finite(uMps) || !finite(vMps)) {
    return fail('den private kilderække mangler et eksakt U/V-par');
  }
  const expectedSpeedMps = Number(Math.hypot(uMps, vMps).toFixed(2));
  const expectedDirectionDeg = ((Number(directionFromComponents(uMps, vMps).toFixed(0)) % 360) + 360) % 360;
  if (Number(currentWeather.currentSpeedMps) !== expectedSpeedMps
    || Number(currentWeather.currentDirectionDeg) !== expectedDirectionDeg
    || Number(publicWeather.currentSpeedMps) !== expectedSpeedMps
    || Number(publicWeather.currentDirectionDeg) !== expectedDirectionDeg) {
    return fail('intern eller offentlig hastighed/retning kan ikke reproduceres fra privat U/V');
  }

  const expectedInternalProof = displayedCurrentProvenance(source);
  if (!sameValue(currentProof, expectedInternalProof)
    || !sameValue(publicProof, publicCurrentProvenance(expectedInternalProof))) {
    return fail('intern eller offentlig proveniens matcher ikke den eksakte private kilderække');
  }
  const flowExpectation = {
    gridPoint: source.gridPoint,
    arrowSource,
    flowSourceClass,
    distanceKm: source.distanceKm,
  };
  const internalFlowFailures = flowProjectionFailures(runtimePart.flowPoints, flowExpectation);
  if (internalFlowFailures.length) {
    return fail(`den interne strømpil matcher ikke kilderækken: ${internalFlowFailures.join(', ')}`);
  }
  const publicFlowFailures = flowProjectionFailures(publicPart.flowPoints, flowExpectation);
  if (publicFlowFailures.length) {
    return fail(`den offentlige strømpil matcher ikke kilderækken: ${publicFlowFailures.join(', ')}`);
  }
  return {
    ok: true,
    sourceClass,
    expectedArrowSource: arrowSource,
    expectedSpeedMps,
    expectedDirectionDeg,
  };
}
