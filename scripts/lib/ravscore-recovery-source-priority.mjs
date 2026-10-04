import {
  preferQualifiedDmiComponentSource,
  responseBoundModelRun,
  selectQualifiedWeatherComponent,
} from './weather-component-selection.mjs';
import { classifyWavePhysicalTuple } from '../../js/core/ravscore-mobilisation-memory.js';
import {
  dmiExpectedIdentityForPart,
  verifiedControlledLiveCurrentSource,
  eligibleDmiForecastComponentSource as verifiedDmiForecastComponentSource,
} from './ravscore-production-adapters.mjs';
import { verifyCompactFeggesundWaveProxy } from './feggesund-wave-proxy.mjs';
import { buildRavScoreRecoveryReplay } from './ravscore-recovery-replay.mjs';

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function canonicalTime(value) {
  if (typeof value !== 'string'
    || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
    || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

function hasVerifiedCurrent(row) {
  return finite(row?.currentUMps)
    && finite(row?.currentVMps)
    && row?.currentProvenance?.status === 'verified';
}

function hasVerifiedWave(row) {
  return finite(row?.waveHeightM)
    && finite(row?.wavePeriodS)
    && ['verified', 'verified-derived'].includes(row?.waveProvenance?.status)
    && row?.sources?.wave
    && typeof row.sources.wave === 'object';
}

function componentModelRun(row, component) {
  const source = component === 'current'
    ? (row?.currentProvenance?.status === 'verified'
      ? row.currentProvenance
      : row?.sources?.current)
    : row?.sources?.wave;
  const modelRun = canonicalTime(source?.modelRun);
  return modelRun === null ? null : Date.parse(modelRun);
}

const SHA256 = /^(?:sha256:)?[0-9a-f]{64}$/;
const samePoint = (left, right) => Array.isArray(left) && Array.isArray(right)
  && left.length === 2 && right.length === 2
  && left.every((value, index) => finite(value) && finite(right[index])
    && Math.abs(value - right[index]) <= 1e-7);

// This is a non-mutating precondition for priority, not a substitute for the
// replay validator. Both rows came through verifiedIntegratedPartHourly, but
// a priority decision may suppress one, so re-check the exact source shape
// before making that decision. Any ambiguity stays visible to strict replay.
function verifiedWaveForPriority(row, part) {
  if (!hasVerifiedWave(row) || !part) return false;
  const physical = classifyWavePhysicalTuple(row);
  if (!physical.available) return false;
  const source = row.sources.wave;
  const direction = row.waveDirectionDeg;
  const validDirection = finite(direction) && direction >= 0 && direction < 360;
  if (direction !== null && direction !== undefined && !validDirection) return false;
  const dmi = verifiedDmiForecastComponentSource(
    source, row.time, 'wave', dmiExpectedIdentityForPart(part),
  );
  if (dmi) {
    const directionAttested = Array.isArray(dmi.optionalFieldSet)
      && dmi.optionalFieldSet.length === 1
      && dmi.optionalFieldSet[0] === 'mean-wave-dir';
    return validDirection ? directionAttested
      : !physical.active && (dmi.optionalFieldSet?.length ?? 0) === 0;
  }
  if (source?.sourceClass === 'owner-approved-neighbor-wave-proxy') {
    return row.waveProvenance?.status === 'verified-derived'
      && verifyCompactFeggesundWaveProxy({
        targetEntityId: `PART::${part.partId}`,
        targetParentZoneId: part.sourceZoneId ?? part.parentZoneId ?? part.zoneId,
        time: row.time,
        projection: {
          waveHeightM: row.waveHeightM,
          wavePeriodS: row.wavePeriodS,
          waveDirectionDeg: direction,
          proxy: source,
        },
      });
  }
  const expectedEntityId = `PART::${part.partId}`;
  const parentZoneId = part.sourceZoneId ?? part.parentZoneId ?? part.zoneId;
  return row.waveProvenance?.status === 'verified'
    && ['copernicus', 'open-meteo'].includes(source?.provider)
    && source.fallback === true
    && source.component === 'wave'
    && source.sourceClass === 'response-bound-official-component'
    && SHA256.test(String(source.componentRecordId ?? ''))
    && source.entityId === expectedEntityId
    && source.parentZoneId === parentZoneId
    && source.entityType === 'coastal-part'
    && source.samplingContext === 'coastal-part-water-point'
    && samePoint(source.samplingPoint, part.waterPoint)
    && canonicalTime(source.validTime) === canonicalTime(row.time)
    && (validDirection || !physical.active);
}

// The locked replay does not export its component reducers. Run that same
// validator on one isolated, real hour instead of maintaining a weaker copy
// of its U/V, direction, distance and native-evidence admission rules here.
// This is validation only: no values, native times or interpolation are changed.
// A failed probe leaves the original row visible to the eventual strict replay.
function verifiedReplayComponentForPriority(row, component, part) {
  if (!part || (component === 'current' ? !hasVerifiedCurrent(row)
    : !verifiedWaveForPriority(row, part))) return false;
  try {
    const at = canonicalTime(row.time);
    if (at === null) return false;
    const target = new Date(Date.parse(at) + 3_600_000).toISOString();
    const replay = buildRavScoreRecoveryReplay({
      part,
      initialState: null,
      targetReferenceAt: target,
      sourceRecords: [{ record: {
        point: part.waterPoint,
        hourly: [component === 'current' ? withoutWave(row) : withoutCurrent(row)],
      } }],
      publicHourly: [{ time: target }],
    });
    const admitted = replay.hourly.find(item => item.time === at);
    return replay.replayedHourCount === 1 && (component === 'current'
      ? finite(admitted?.currentSpeedMps) && finite(admitted?.currentDirectionDeg)
      : finite(admitted?.waveHeightM) && finite(admitted?.wavePeriodS));
  } catch {
    return false;
  }
}

function componentRevisionSource(row, component) {
  return component === 'current'
    ? (row?.currentProvenance?.status === 'verified'
      ? row.currentProvenance
      : row?.sources?.current)
    : row?.sources?.wave;
}

function verifiedProtectedDmiComponent(row, component, part) {
  const expectedIdentity = dmiExpectedIdentityForPart(part);
  const source = componentRevisionSource(row, component);
  return expectedIdentity !== null
    && source?.provider === 'dmi'
    && Boolean(verifiedDmiForecastComponentSource(
      source, row?.time, component, expectedIdentity,
    ))
    && (component === 'current' ? hasVerifiedCurrent(row)
      : verifiedWaveForPriority(row, part));
}

function componentProvider(row, component) {
  return componentRevisionSource(row, component)?.provider ?? null;
}

function isControlledLiveReserve(row, component, part) {
  const source = componentRevisionSource(row, component);
  return component === 'current'
    && ['copernicus', 'open-meteo'].includes(source?.provider)
    && source?.controlledLivePilot === true
    && source?.vectorSemanticsVersion === 4
    && Boolean(verifiedControlledLiveCurrentSource(
      source, row.time, part, row.currentUMps, row.currentVMps,
    ));
}

function isVerifiedRegionalCurrent(row, part) {
  const source = componentRevisionSource(row, 'current');
  return source?.provider === 'dmi'
    && source?.sourceClass === 'owner-approved-regional-proxy'
    && Boolean(verifiedControlledLiveCurrentSource(
      source, row.time, part, row.currentUMps, row.currentVMps,
    ));
}

function comparableDmiRevision(left, right) {
  return left?.provider === 'dmi' && right?.provider === 'dmi'
    && ['entityId', 'parentZoneId', 'entityType', 'samplingContext', 'collection',
      'component', 'gridDefinitionSha256', 'verticalLayer', 'verticalLayerRankM'].every(key =>
      left[key] === right[key])
    && ['samplingPoint', 'gridPoint'].every(key =>
      Array.isArray(left[key]) && left[key].length === 2
      && Array.isArray(right[key]) && right[key].length === 2
      && left[key].every((value, index) => finite(value) && value === right[key][index]));
}

function withoutSourceComponent(sources, component) {
  if (!sources || typeof sources !== 'object' || Array.isArray(sources)) return sources;
  const next = { ...sources };
  delete next[component];
  return next;
}

function withoutCurrent(row) {
  return {
    ...row,
    sources: withoutSourceComponent(row?.sources, 'current'),
    currentUMps: null,
    currentVMps: null,
    currentSpeedMps: null,
    currentDirectionDeg: null,
    currentCoastNormalSpeedMps: null,
    currentProvenance: {
      status: 'unverified',
      reason: 'superseded-by-newer-verified-recovery-component',
    },
  };
}

function withoutWave(row) {
  return {
    ...row,
    sources: withoutSourceComponent(row?.sources, 'wave'),
    waveHeightM: null,
    wavePeriodS: null,
    waveDirectionDeg: null,
    waveProvenance: {
      status: 'unverified',
      reason: 'superseded-by-newer-verified-recovery-component',
    },
    waveInputSource: null,
    waveInputUncertainty: null,
    waveInputNoticeId: null,
  };
}

function uniqueRowsByTime(source) {
  const rows = new Map();
  const duplicates = new Set();
  for (const row of source?.record?.hourly ?? []) {
    const time = canonicalTime(row?.time);
    if (time === null) continue;
    if (rows.has(time)) duplicates.add(time);
    else rows.set(time, row);
  }
  for (const time of duplicates) rows.delete(time);
  return rows;
}

function componentPreference(
  fallbackRow,
  preferredRow,
  component,
  {
    allowPreferredEqualModelRun = false,
    productionReferenceAt = null,
    part = null,
    onProtectedSameRunDmiRetention = null,
    admit = () => false,
  } = {},
) {
  const hasFallback = component === 'current'
    ? hasVerifiedCurrent(fallbackRow)
    : hasVerifiedWave(fallbackRow);
  const hasPreferred = component === 'current'
    ? hasVerifiedCurrent(preferredRow)
    : hasVerifiedWave(preferredRow);
  if (!hasFallback || !hasPreferred) return null;

  // No priority rule may erase an invalid loser (or an invalid winner).
  // This includes newer model runs and official revisions, not only ties.
  if (!admit(fallbackRow, component) || !admit(preferredRow, component)) return null;

  const fallbackModelRun = componentModelRun(fallbackRow, component);
  const preferredModelRun = componentModelRun(preferredRow, component);

  // DMI is the authoritative current-data source. A controlled live reserve
  // can legitimately overlap a later DMI rebuild, but it must not win merely
  // because it has no comparable model-run timestamp. Allow the reserve to
  // replace DMI only when it carries a newer bound model run and the DMI run
  // is at least the established four-day challenge age.
  const fallbackProvider = componentProvider(fallbackRow, component);
  const preferredProvider = componentProvider(preferredRow, component);
  if (component === 'current' && fallbackProvider === 'dmi' && preferredProvider === 'dmi') {
    // Regional continuity is a separate reserve, not a revision of the local
    // DMI column. Its newer model clock cannot displace direct local DMI.
    if (verifiedProtectedDmiComponent(fallbackRow, component, part)
      && isVerifiedRegionalCurrent(preferredRow, part)) return 'fallback';
    if (verifiedProtectedDmiComponent(preferredRow, component, part)
      && isVerifiedRegionalCurrent(fallbackRow, part)) return 'preferred';
  }
  if (component === 'current' && fallbackProvider !== preferredProvider) {
    const fallbackRegional = isVerifiedRegionalCurrent(fallbackRow, part);
    const preferredRegional = isVerifiedRegionalCurrent(preferredRow, part);
    if (fallbackRegional || preferredRegional) {
      const reserve = fallbackRegional ? preferredRow : fallbackRow;
      if (!isControlledLiveReserve(reserve, component, part)) return null;
      // Existing order: local DMI, CP, regional DMI, OM. The 96-hour
      // response-bound challenge applies to direct DMI, not this reserve.
      const reserveWins = componentProvider(reserve, component) === 'copernicus';
      return fallbackRegional === reserveWins ? 'preferred' : 'fallback';
    }
  }
  if (component === 'wave' && (fallbackProvider !== 'dmi' || preferredProvider !== 'dmi')) {
    // Both rows were already sanitized by the production adapter. Re-check
    // the exact replay admission before allowing a source to suppress its
    // peer, then use the same DMI-first/96-hour rule as the public forecast.
    // Previous ownership orders revisions within its own provider. An
    // independently admitted Copernicus wave may replace Open-Meteo;
    // acquisition time alone still proves no same-provider revision.
    if (!verifiedWaveForPriority(fallbackRow, part)
      || !verifiedWaveForPriority(preferredRow, part)) return null;
    const fallbackSource = componentRevisionSource(fallbackRow, component);
    const preferredSource = componentRevisionSource(preferredRow, component);
    const fallbackProxy = fallbackProvider === 'ravradar-derived'
      && fallbackSource?.sourceClass === 'owner-approved-neighbor-wave-proxy';
    const preferredProxy = preferredProvider === 'ravradar-derived'
      && preferredSource?.sourceClass === 'owner-approved-neighbor-wave-proxy';
    if (fallbackProxy || preferredProxy) {
      // The approved Feggesund proxy is retained before an unknown-age
      // reserve, while a directly verified DMI wave supersedes the proxy.
      if (fallbackProvider === 'dmi') return 'fallback';
      if (preferredProvider === 'dmi') return 'preferred';
      if (fallbackProxy !== preferredProxy) return fallbackProxy ? 'fallback' : 'preferred';
      const fallbackRun = componentModelRun(fallbackRow, component);
      const preferredRun = componentModelRun(preferredRow, component);
      if (!Number.isFinite(fallbackRun) || !Number.isFinite(preferredRun)
        || fallbackRun === preferredRun) return null;
      return preferredRun > fallbackRun ? 'preferred' : 'fallback';
    }
    if (fallbackProvider === preferredProvider && !allowPreferredEqualModelRun) {
      // Array order is not previous ownership. Unauthenticated reserve peers
      // need a comparable response-bound chronology; ties stay in replay.
      const referenceAt = canonicalTime(productionReferenceAt);
      const previousRun = responseBoundModelRun(fallbackSource);
      const nextRun = responseBoundModelRun(preferredSource);
      if (referenceAt === null || previousRun === null || nextRun === null
        || previousRun === nextRun || previousRun > Date.parse(referenceAt)
        || nextRun > Date.parse(referenceAt)
        || !['model', 'productId', 'datasetId'].every(key =>
          fallbackSource[key] === preferredSource[key])) return null;
      return nextRun > previousRun ? 'preferred' : 'fallback';
    }
    const candidates = [
      { side: 'fallback', source: fallbackSource, previouslySelected: true },
      { side: 'preferred', source: preferredSource },
    ];
    const admitted = new Map(candidates.map(candidate => [candidate, candidate.source]));
    return selectQualifiedWeatherComponent(candidates, {
      component: 'wave', productionReferenceAt,
      admit: candidate => admitted.get(candidate) ?? null,
    })?.candidate?.side ?? null;
  }
  if (component === 'current' && fallbackProvider === preferredProvider
    && isControlledLiveReserve(fallbackRow, component, part)
    && isControlledLiveReserve(preferredRow, component, part)) {
    // A real previous winner is required for same-provider reserve retention;
    // arbitrary peer order must not acquire that permission.
    if (!allowPreferredEqualModelRun || canonicalTime(productionReferenceAt) === null) return null;
    const candidates = [
      { side: 'fallback', source: componentRevisionSource(fallbackRow, component), previouslySelected: true },
      { side: 'preferred', source: componentRevisionSource(preferredRow, component) },
    ];
    const admitted = new Map(candidates.map(candidate => [candidate, candidate.source]));
    return selectQualifiedWeatherComponent(candidates, {
      component, productionReferenceAt,
      admit: candidate => admitted.get(candidate) ?? null,
    })?.candidate?.side ?? null;
  }
  if (component === 'current' && fallbackProvider !== preferredProvider) {
    const eligible = row => verifiedProtectedDmiComponent(row, component, part)
      || isControlledLiveReserve(row, component, part);
    if (!eligible(fallbackRow) || !eligible(preferredRow)
      || canonicalTime(productionReferenceAt) === null) return null;
    const candidates = [
      { side: 'fallback', source: componentRevisionSource(fallbackRow, component), previouslySelected: true },
      { side: 'preferred', source: componentRevisionSource(preferredRow, component) },
    ];
    const admitted = new Map(candidates.map(candidate => [candidate, candidate.source]));
    return selectQualifiedWeatherComponent(candidates, {
      component, productionReferenceAt,
      admit: candidate => admitted.get(candidate) ?? null,
    })?.candidate?.side ?? null;
  }
  if (!Number.isFinite(fallbackModelRun) || !Number.isFinite(preferredModelRun)) return null;
  if (fallbackModelRun === preferredModelRun) {
    if (!allowPreferredEqualModelRun) return null;
    const fallbackRevision = componentRevisionSource(fallbackRow, component);
    const preferredRevision = componentRevisionSource(preferredRow, component);
    // Official revision clocks order only comparable source identities. A
    // timestamp on a different collection/grid/layer cannot prove that it
    // revises the protected component, even when its modelRun is identical.
    if (comparableDmiRevision(fallbackRevision, preferredRevision)) {
      if (preferQualifiedDmiComponentSource(fallbackRevision, preferredRevision, component)) return 'preferred';
      if (preferQualifiedDmiComponentSource(preferredRevision, fallbackRevision, component)) return 'fallback';
    }
    if (!part || !verifiedProtectedDmiComponent(fallbackRow, component, part)
      || !verifiedProtectedDmiComponent(preferredRow, component, part)) return null;
    // Both independently verified DMI components describe the same model run,
    // target part/hour, but their native time support or source identity does
    // not prove a later official revision. The authenticated prior component
    // is the protected previous winner, including a different valid grid:
    // keep it rather than making a different interpolation (or provenance-only
    // change) an unresolvable peer in the strict replay. This does not admit an
    // invalid candidate or weaken replay for unrelated sources.
    if (typeof onProtectedSameRunDmiRetention === 'function') {
      const physicalKeys = component === 'current'
        ? ['currentUMps', 'currentVMps', 'currentSpeedMps', 'currentDirectionDeg']
        : ['waveHeightM', 'wavePeriodS', 'waveDirectionDeg'];
      const valueClass = physicalKeys.every(key => fallbackRow[key] === preferredRow[key])
        ? 'SAME_VALUES' : 'DIFFERENT_VALUES';
      onProtectedSameRunDmiRetention(component, valueClass);
    }
    return 'fallback';
  }
  return preferredModelRun > fallbackModelRun ? 'preferred' : 'fallback';
}

function isAcceptedProgressiveDmiRevision(fallbackSource, preferredSource, protectedPreviousSource) {
  return protectedPreviousSource === fallbackSource
    && fallbackSource?.source === 'deployed-private-runtime'
    && preferredSource?.source === 'progressive-private-dmi';
}

function withoutComponent(row, component) {
  return component === 'current' ? withoutCurrent(row) : withoutWave(row);
}

/**
 * Production weather precedence before generic recovery validation.
 *
 * The generic recovery union must continue to reject ambiguous peers. Normal
 * maintenance is different: two valid values can be revisions from different
 * DMI model runs. For each component and exact time, retain the value from the
 * newest proved model run. If the newer run lacks that component, the older
 * valid value remains. An equal modelRun may refresh the explicit protected
 * deployed/progressive DMI pair only with a proved newer official revision;
 * otherwise its previously selected, independently verified value survives.
 * A same-run collection/grid/layer change is not proof of a newer revision.
 * Only the caller's authenticated previous source may win that ambiguity;
 * unrelated sources still reach the strict replay gate.
 */
export function buildNewestValidRavScoreRecoverySources({
  fallbackSource = null,
  preferredSource = null,
  // Pass the identical fallbackSource object only after authenticating its
  // protected baseline/history and sampling context. Labels are not proof.
  protectedPreviousSource = null,
  productionReferenceAt = null,
  part = null,
  onProtectedSameRunDmiRetention = null,
} = {}) {
  if (!fallbackSource && !preferredSource) return [];
  if (!fallbackSource) return [preferredSource];
  if (!preferredSource) return [fallbackSource];

  const fallbackByTime = uniqueRowsByTime(fallbackSource);
  const preferredByTime = uniqueRowsByTime(preferredSource);
  const decisions = new Map();
  const correctSamplingPoints = samePoint(fallbackSource?.record?.point, part?.waterPoint)
    && samePoint(preferredSource?.record?.point, part?.waterPoint);
  // Invocation-local cache: rows can be mutable outside this function, so a
  // module-global cache could accept changed/tampered evidence on a later call.
  const admissions = new WeakMap();
  const admit = (row, component) => {
    if (!correctSamplingPoints || !row || typeof row !== 'object') return false;
    let components = admissions.get(row);
    if (!components) {
      components = new Map();
      admissions.set(row, components);
    }
    if (!components.has(component)) {
      components.set(component, verifiedReplayComponentForPriority(row, component, part));
    }
    return components.get(component);
  };
  const allowPreferredEqualModelRun = isAcceptedProgressiveDmiRevision(
    fallbackSource,
    preferredSource,
    protectedPreviousSource,
  );
  for (const [time, fallbackRow] of fallbackByTime) {
    const preferredRow = preferredByTime.get(time);
    if (!preferredRow) continue;
    decisions.set(time, {
      current: componentPreference(fallbackRow, preferredRow, 'current', {
        allowPreferredEqualModelRun,
        productionReferenceAt,
        part,
        onProtectedSameRunDmiRetention,
        admit,
      }),
      wave: componentPreference(fallbackRow, preferredRow, 'wave', {
        allowPreferredEqualModelRun,
        productionReferenceAt,
        part,
        onProtectedSameRunDmiRetention,
        admit,
      }),
    });
  }

  const projectRows = (source, side) => Array.isArray(source?.record?.hourly)
    ? source.record.hourly.map(row => {
      const decision = decisions.get(canonicalTime(row?.time));
      let next = row;
      for (const component of ['current', 'wave']) {
        if (decision?.[component] && decision[component] !== side) {
          next = withoutComponent(next, component);
        }
      }
      return next;
    })
    : [];

  return [
    {
      ...fallbackSource,
      record: {
        ...fallbackSource.record,
        hourly: projectRows(fallbackSource, 'fallback'),
      },
    },
    {
      ...preferredSource,
      record: {
        ...preferredSource.record,
        hourly: projectRows(preferredSource, 'preferred'),
      },
    },
  ];
}

// Failure-only evidence. These fixed labels describe *possible* DMI overlaps
// after priority projection; they are not an authorization to select a
// current/wave value and must never contain source values, identifiers or times.
function sameRunDmiRevisionEvidence(leftRow, rightRow, component) {
  const left = componentRevisionSource(leftRow, component);
  const right = componentRevisionSource(rightRow, component);
  const scalarFields = ['entityId', 'parentZoneId', 'entityType',
    'samplingContext', 'collection', 'component', 'gridDefinitionSha256',
    'verticalLayer', 'verticalLayerRankM'];
  const mismatchFields = scalarFields.filter(field => left?.[field] !== right?.[field]);
  for (const field of ['samplingPoint', 'gridPoint']) {
    if (!Array.isArray(left?.[field]) || !Array.isArray(right?.[field])
      || left[field].length !== 2 || right[field].length !== 2
      || !left[field].every((value, index) => finite(value)
        && value === right[field][index])) mismatchFields.push(field);
  }
  if (!comparableDmiRevision(left, right)) {
    return { code: 'SOURCE_IDENTITY_NOT_COMPARABLE', mismatchFields };
  }
  const rightWins = preferQualifiedDmiComponentSource(left, right, component);
  const leftWins = preferQualifiedDmiComponentSource(right, left, component);
  if (rightWins !== leftWins) {
    return { code: rightWins ? 'RIGHT_OFFICIAL_REVISION_PROVED'
      : 'LEFT_OFFICIAL_REVISION_PROVED', mismatchFields: [] };
  }
  if (rightWins && leftWins) {
    return { code: 'CONTRADICTORY_REVISION_ORDER', mismatchFields: [] };
  }
  const leftSteps = Array.isArray(left.nativeSteps) ? left.nativeSteps : [left];
  const rightSteps = Array.isArray(right.nativeSteps) ? right.nativeSteps : [right];
  if (leftSteps.length === 0 || leftSteps.length !== rightSteps.length) {
    return { code: 'NATIVE_STEP_COUNT_NOT_COMPARABLE', mismatchFields: [] };
  }
  const rightByTime = new Map(rightSteps.map(step => [step.nativeValidTime, step]));
  if (rightByTime.size !== rightSteps.length
    || leftSteps.some(step => !rightByTime.has(step.nativeValidTime))) {
    return { code: 'NATIVE_STEP_TIME_NOT_COMPARABLE', mismatchFields: [] };
  }
  const revisionKey = [...leftSteps, ...rightSteps].some(step => step.itemUpdatedAt != null)
    ? 'itemUpdatedAt' : 'itemCreatedAt';
  let hasChangedAsset = false;
  let hasMissingRevisionTime = false;
  let hasEqualTimeChangedAsset = false;
  let hasNewerRight = false;
  let hasNewerLeft = false;
  for (const oldStep of leftSteps) {
    const newStep = rightByTime.get(oldStep.nativeValidTime);
    if (oldStep.itemId === newStep.itemId
      && oldStep.assetIdentitySha256 === newStep.assetIdentitySha256
      && oldStep[revisionKey] === newStep[revisionKey]) continue;
    hasChangedAsset = true;
    const oldAt = canonicalTime(oldStep[revisionKey]);
    const newAt = canonicalTime(newStep[revisionKey]);
    if (oldAt === null || newAt === null) hasMissingRevisionTime = true;
    else if (newAt === oldAt) hasEqualTimeChangedAsset = true;
    else if (newAt > oldAt) hasNewerRight = true;
    else hasNewerLeft = true;
  }
  const prefix = revisionKey === 'itemUpdatedAt' ? 'UPDATED_AT' : 'CREATED_AT';
  const code = !hasChangedAsset ? 'SAME_OFFICIAL_ASSET_PROOF'
    : hasMissingRevisionTime ? `${prefix}_MISSING`
      : hasEqualTimeChangedAsset ? `${prefix}_EQUAL_FOR_CHANGED_ASSET`
        : hasNewerRight && hasNewerLeft ? `${prefix}_MIXED_ENDPOINT_ORDER`
          : 'REVISION_SELECTION_UNRESOLVED';
  return { code, mismatchFields: [] };
}

/**
 * Failure-only, payload-free diagnostic for the exact part being rebuilt.
 * It describes overlapping *candidates*, not the replay validator's winning
 * pair. It must never be used to choose or suppress a weather component.
 */
export function summarizeRavScoreWaveRecoveryConflictCandidates({
  sourceRecords = [], part = null, startAt = null, targetAt = null,
} = {}) {
  const startMs = Date.parse(startAt ?? '');
  const targetMs = Date.parse(targetAt ?? '');
  if (!Number.isFinite(startMs) || !Number.isFinite(targetMs) || startMs >= targetMs) {
    return { status: 'INVALID_WINDOW' };
  }
  const byTime = new Map();
  for (const [sourceIndex, source] of sourceRecords.entries()) {
    for (const row of source?.record?.hourly ?? []) {
      const time = canonicalTime(row?.time);
      const timeMs = Date.parse(time ?? '');
      if (!Number.isFinite(timeMs) || timeMs < startMs || timeMs >= targetMs
        || !finite(row?.waveHeightM) || !finite(row?.wavePeriodS)
        || !row?.sources?.wave || typeof row.sources.wave !== 'object') continue;
      const entries = byTime.get(time) ?? [];
      entries.push({ row, sourceIndex,
        priorityAdmitted: verifiedWaveForPriority(row, part) });
      byTime.set(time, entries);
    }
  }
  const counts = new Map();
  const sameRunDmiRevisionClasses = new Map();
  const sameRunDmiValueRevisionClasses = new Map();
  const sameRunDmiIdentityMismatchFields = new Map();
  let candidatePairCount = 0;
  let withinRecordPairCount = 0;
  for (const entries of byTime.values()) {
    for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
        const left = entries[leftIndex];
        const right = entries[rightIndex];
        candidatePairCount += 1;
        const withinRecord = left.sourceIndex === right.sourceIndex;
        if (withinRecord) withinRecordPairCount += 1;
        const provider = entry => {
          const value = componentProvider(entry.row, 'wave');
          return ['dmi', 'copernicus', 'open-meteo', 'ravradar-derived']
            .includes(value) ? value : 'unknown';
        };
        const providers = [provider(left), provider(right)];
        const providerPair = providers.every(value => value === 'dmi') ? 'DMI_DMI'
          : providers.includes('dmi') ? 'DMI_OTHER'
            : providers[0] === providers[1] ? 'SAME_OTHER' : 'DIFFERENT_OTHERS';
        const leftRun = componentModelRun(left.row, 'wave');
        const rightRun = componentModelRun(right.row, 'wave');
        const runRelation = leftRun === null || rightRun === null ? 'UNBOUND_RUN'
          : leftRun === rightRun ? 'SAME_RUN' : 'DIFFERENT_RUN';
        const sameValues = ['waveHeightM', 'wavePeriodS', 'waveDirectionDeg']
          .every(key => left.row[key] === right.row[key]);
        const admission = left.priorityAdmitted && right.priorityAdmitted
          ? 'BOTH_PRIORITY_ADMITTED' : 'PRIORITY_ADMISSION_GAP';
        const category = [withinRecord ? 'WITHIN_RECORD' : 'ACROSS_RECORDS',
          providerPair, runRelation, admission,
          sameValues ? 'SAME_VALUES' : 'DIFFERENT_VALUES'].join('_');
        counts.set(category, (counts.get(category) ?? 0) + 1);
        if (providerPair === 'DMI_DMI' && runRelation === 'SAME_RUN'
          && admission === 'BOTH_PRIORITY_ADMITTED') {
          const evidence = sameRunDmiRevisionEvidence(left.row, right.row, 'wave');
          sameRunDmiRevisionClasses.set(evidence.code,
            (sameRunDmiRevisionClasses.get(evidence.code) ?? 0) + 1);
          const valueRevisionClass = `${sameValues ? 'SAME_VALUES' : 'DIFFERENT_VALUES'}_${evidence.code}`;
          sameRunDmiValueRevisionClasses.set(valueRevisionClass,
            (sameRunDmiValueRevisionClasses.get(valueRevisionClass) ?? 0) + 1);
          for (const field of evidence.mismatchFields) {
            sameRunDmiIdentityMismatchFields.set(field,
              (sameRunDmiIdentityMismatchFields.get(field) ?? 0) + 1);
          }
        }
      }
    }
  }
  return {
    status: 'CANDIDATES_ONLY',
    candidatePairCount,
    withinRecordPairCount,
    classes: Object.fromEntries([...counts].sort(([left], [right]) => left.localeCompare(right))),
    sameRunDmiRevisionClasses: Object.fromEntries(
      [...sameRunDmiRevisionClasses].sort(([left], [right]) => left.localeCompare(right))),
    sameRunDmiValueRevisionClasses: Object.fromEntries(
      [...sameRunDmiValueRevisionClasses].sort(([left], [right]) => left.localeCompare(right))),
    sameRunDmiIdentityMismatchFields: Object.fromEntries(
      [...sameRunDmiIdentityMismatchFields].sort(([left], [right]) => left.localeCompare(right))),
  };
}

/**
 * Failure-only shadow proof. Replay remains untouched and fail-closed: for
 * each bounded overlap, call the real validator with only that pair's waves.
 * The callback's private inputs and errors never leave this function. A
 * confirmed pair means the same validator rejects it in isolation; it does
 * not identify which conflict was first in the full production replay.
 */
export function summarizeIsolatedRavScoreWaveReplayConflicts({
  sourceRecords = [], startAt = null, targetAt = null,
  replayCandidate = null, maxPairs = 16,
} = {}) {
  const startMs = Date.parse(startAt ?? '');
  const targetMs = Date.parse(targetAt ?? '');
  if (!Number.isFinite(startMs) || !Number.isFinite(targetMs) || startMs >= targetMs
    || !Array.isArray(sourceRecords) || typeof replayCandidate !== 'function'
    || !Number.isSafeInteger(maxPairs) || maxPairs < 1 || maxPairs > 32) {
    return { status: 'INVALID_DIAGNOSTIC_INPUT' };
  }
  const byTime = new Map();
  for (const [sourceIndex, source] of sourceRecords.entries()) {
    for (const [rowIndex, row] of (source?.record?.hourly ?? []).entries()) {
      const time = canonicalTime(row?.time);
      const timeMs = Date.parse(time ?? '');
      if (!Number.isFinite(timeMs) || timeMs < startMs || timeMs >= targetMs
        || !finite(row?.waveHeightM) || !finite(row?.wavePeriodS)
        || !row?.sources?.wave || typeof row.sources.wave !== 'object') continue;
      const entries = byTime.get(time) ?? [];
      entries.push({ sourceIndex, rowIndex, row });
      byTime.set(time, entries);
    }
  }
  const pairs = [];
  for (const entries of byTime.values()) {
    for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
        pairs.push([entries[leftIndex], entries[rightIndex]]);
        if (pairs.length > maxPairs) {
          return { status: 'PAIR_LIMIT_EXCEEDED', candidatePairCountAtLeast: pairs.length };
        }
      }
    }
  }
  const confirmedClasses = new Map();
  const confirmedSameRunDmiReasons = new Map();
  let confirmedPairCount = 0;
  let otherOutcomeCount = 0;
  for (const [left, right] of pairs) {
    const isolated = sourceRecords.map((source, sourceIndex) => ({
      ...source,
      record: {
        ...source.record,
        hourly: (source.record?.hourly ?? []).map((row, rowIndex) => {
          const selected = (sourceIndex === left.sourceIndex && rowIndex === left.rowIndex)
            || (sourceIndex === right.sourceIndex && rowIndex === right.rowIndex);
          return withoutCurrent(selected ? row : withoutWave(row));
        }),
      },
    }));
    let confirmed = false;
    try {
      replayCandidate(isolated);
    } catch (error) {
      confirmed = error?.code === 'RAVSCORE_RECOVERY_REPLAY_CONFLICT'
        && error?.message === 'RavScore recovery replay has a conflicting wave component';
    }
    if (!confirmed) {
      otherOutcomeCount += 1;
      continue;
    }
    confirmedPairCount += 1;
    const leftProvider = componentProvider(left.row, 'wave');
    const rightProvider = componentProvider(right.row, 'wave');
    const providerClass = leftProvider === 'dmi' && rightProvider === 'dmi'
      ? 'DMI_DMI' : 'OTHER';
    const leftRun = componentModelRun(left.row, 'wave');
    const rightRun = componentModelRun(right.row, 'wave');
    const runClass = leftRun !== null && leftRun === rightRun
      ? 'SAME_RUN' : 'OTHER_RUN';
    const valueClass = ['waveHeightM', 'wavePeriodS', 'waveDirectionDeg']
      .every(key => left.row[key] === right.row[key])
      ? 'SAME_VALUES' : 'DIFFERENT_VALUES';
    const category = `${providerClass}_${runClass}_${valueClass}`;
    confirmedClasses.set(category, (confirmedClasses.get(category) ?? 0) + 1);
    if (providerClass === 'DMI_DMI' && runClass === 'SAME_RUN') {
      const reason = sameRunDmiRevisionEvidence(left.row, right.row, 'wave').code;
      const key = `${valueClass}_${reason}`;
      confirmedSameRunDmiReasons.set(key, (confirmedSameRunDmiReasons.get(key) ?? 0) + 1);
    }
  }
  return {
    status: 'ISOLATED_REPLAY_PROOFS_NOT_FULL_REPLAY_ORDER',
    candidatePairCount: pairs.length,
    confirmedPairCount,
    otherOutcomeCount,
    confirmedClasses: Object.fromEntries([...confirmedClasses]
      .sort(([left], [right]) => left.localeCompare(right))),
    confirmedSameRunDmiReasons: Object.fromEntries([...confirmedSameRunDmiReasons]
      .sort(([left], [right]) => left.localeCompare(right))),
  };
}

/**
 * Failure-only current evidence. The original replay validator, not this
 * classifier, decides whether a candidate pair really conflicts. At most one
 * isolated proof is returned; no row, location, timestamp, vector, digest or
 * untrusted exception text can leave this function.
 */
export function summarizeRavScoreCurrentRecoveryConflicts({
  sourceRecords = [], startAt = null, targetAt = null,
  replayCandidate = null, maxPairs = 96,
} = {}) {
  const startMs = Date.parse(startAt ?? '');
  const targetMs = Date.parse(targetAt ?? '');
  if (!Number.isFinite(startMs) || !Number.isFinite(targetMs) || startMs >= targetMs
    || !Array.isArray(sourceRecords) || sourceRecords.length > 4
    || typeof replayCandidate !== 'function'
    || !Number.isSafeInteger(maxPairs) || maxPairs < 1 || maxPairs > 96) {
    return { status: 'INVALID_DIAGNOSTIC_INPUT' };
  }
  const byTime = new Map();
  for (const [sourceIndex, source] of sourceRecords.entries()) {
    for (const [rowIndex, row] of (source?.record?.hourly ?? []).entries()) {
      const time = canonicalTime(row?.time);
      const timeMs = Date.parse(time ?? '');
      if (!Number.isFinite(timeMs) || timeMs < startMs || timeMs >= targetMs
        || !hasVerifiedCurrent(row) || !finite(row.currentSpeedMps)
        || !finite(row.currentDirectionDeg)) continue;
      const entries = byTime.get(time) ?? [];
      entries.push({ sourceIndex, rowIndex, row });
      byTime.set(time, entries);
    }
  }
  const pairs = [];
  const classes = new Map();
  const sameRunDmiReasons = new Map();
  const sameRunDmiIdentityMismatchFields = new Map();
  for (const entries of byTime.values()) {
    for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
        const left = entries[leftIndex];
        const right = entries[rightIndex];
        pairs.push([left, right]);
        const provider = entry => {
          const value = componentProvider(entry.row, 'current');
          return ['dmi', 'copernicus', 'open-meteo'].includes(value) ? value : 'unknown';
        };
        const providers = [provider(left), provider(right)];
        const providerPair = providers.every(value => value === 'dmi') ? 'DMI_DMI'
          : providers.includes('dmi') ? 'DMI_OTHER'
            : providers[0] === providers[1] ? 'SAME_OTHER' : 'DIFFERENT_OTHERS';
        const leftRun = componentModelRun(left.row, 'current');
        const rightRun = componentModelRun(right.row, 'current');
        const runRelation = leftRun === null || rightRun === null ? 'UNBOUND_RUN'
          : leftRun === rightRun ? 'SAME_RUN' : 'DIFFERENT_RUN';
        const valueClass = ['currentUMps', 'currentVMps', 'currentSpeedMps',
          'currentDirectionDeg'].every(key => left.row[key] === right.row[key])
          ? 'SAME_VALUES' : 'DIFFERENT_VALUES';
        const category = [left.sourceIndex === right.sourceIndex
          ? 'WITHIN_RECORD' : 'ACROSS_RECORDS', providerPair,
        runRelation, valueClass].join('_');
        classes.set(category, (classes.get(category) ?? 0) + 1);
        if (providerPair === 'DMI_DMI' && runRelation === 'SAME_RUN') {
          const evidence = sameRunDmiRevisionEvidence(left.row, right.row, 'current');
          const reason = `${valueClass}_${evidence.code}`;
          sameRunDmiReasons.set(reason, (sameRunDmiReasons.get(reason) ?? 0) + 1);
          for (const field of evidence.mismatchFields) {
            sameRunDmiIdentityMismatchFields.set(field,
              (sameRunDmiIdentityMismatchFields.get(field) ?? 0) + 1);
          }
        }
      }
    }
  }
  const sortedCounts = map => Object.fromEntries([...map]
    .sort(([left], [right]) => left.localeCompare(right)));
  let testedPairCount = 0;
  let otherOutcomeCount = 0;
  let confirmedClass = 'NONE';
  let confirmedSameRunDmiReason = 'NONE';
  for (const [left, right] of pairs.slice(0, maxPairs)) {
    const isolated = sourceRecords.map((source, sourceIndex) => ({
      ...source,
      record: {
        ...source.record,
        hourly: (source.record?.hourly ?? []).map((row, rowIndex) => {
          const selected = (sourceIndex === left.sourceIndex && rowIndex === left.rowIndex)
            || (sourceIndex === right.sourceIndex && rowIndex === right.rowIndex);
          return withoutWave(selected ? row : withoutCurrent(row));
        }),
      },
    }));
    testedPairCount += 1;
    let confirmed = false;
    try {
      replayCandidate(isolated);
    } catch (error) {
      confirmed = error?.code === 'RAVSCORE_RECOVERY_REPLAY_CONFLICT'
        && error?.message === 'RavScore recovery replay has a conflicting current component';
    }
    if (!confirmed) {
      otherOutcomeCount += 1;
      continue;
    }
    const leftProvider = componentProvider(left.row, 'current');
    const rightProvider = componentProvider(right.row, 'current');
    const providerClass = leftProvider === 'dmi' && rightProvider === 'dmi'
      ? 'DMI_DMI' : 'OTHER';
    const leftRun = componentModelRun(left.row, 'current');
    const rightRun = componentModelRun(right.row, 'current');
    const runClass = leftRun !== null && leftRun === rightRun
      ? 'SAME_RUN' : 'OTHER_RUN';
    const valueClass = ['currentUMps', 'currentVMps', 'currentSpeedMps',
      'currentDirectionDeg'].every(key => left.row[key] === right.row[key])
      ? 'SAME_VALUES' : 'DIFFERENT_VALUES';
    confirmedClass = `${providerClass}_${runClass}_${valueClass}`;
    if (providerClass === 'DMI_DMI' && runClass === 'SAME_RUN') {
      confirmedSameRunDmiReason = sameRunDmiRevisionEvidence(
        left.row, right.row, 'current',
      ).code;
    }
    break;
  }
  return {
    status: 'CANDIDATES_AND_ISOLATED_REPLAY_PROOF_NOT_FULL_REPLAY_ORDER',
    candidatePairCount: pairs.length,
    testedPairCount,
    truncated: pairs.length > maxPairs,
    otherOutcomeCount,
    classes: sortedCounts(classes),
    sameRunDmiReasons: sortedCounts(sameRunDmiReasons),
    sameRunDmiIdentityMismatchFields: sortedCounts(sameRunDmiIdentityMismatchFields),
    confirmedClass,
    confirmedSameRunDmiReason,
  };
}
