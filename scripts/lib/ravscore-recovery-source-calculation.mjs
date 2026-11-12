import { classifyWavePhysicalTuple } from '../../js/core/ravscore-mobilisation-memory.js';
import {
  dmiExpectedIdentityForPart, verifiedControlledLiveCurrentSource,
  eligibleDmiForecastComponentSource as verifiedDmiForecastComponentSource,
} from './ravscore-input-classification.mjs';
import { verifyCompactFeggesundWaveProxy } from './feggesund-wave-calculation.mjs';
import { selectQualifiedWeatherComponent, preferQualifiedDmiComponentSource, responseBoundModelRun } from './weather-component-selection.mjs';

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

function componentRevisionSource(row, component) {
  return component === 'current'
    ? (row?.currentProvenance?.status === 'verified'
      ? row.currentProvenance
      : row?.sources?.current)
    : row?.sources?.wave;
}

function componentProvider(row, component) {
  return componentRevisionSource(row, component)?.provider ?? null;
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


function withoutComponent(row, component) {
  return component === 'current' ? withoutCurrent(row) : withoutWave(row);
}

// Source-carried originals are the unchanged codec wrapper for ONE PART.
// This is an input/domain check, not native proof, authentication or admission.

export { finite, canonicalTime, hasVerifiedCurrent, hasVerifiedWave, componentModelRun, componentRevisionSource, componentProvider, comparableDmiRevision, withoutSourceComponent, withoutCurrent, withoutWave, uniqueRowsByTime, withoutComponent };

// Replay admission precedes this actual static physical classification and policy.
// No private source is authenticated and no capability is minted here.
export function calculateRavScoreRecoveryComponentPreference({
  fallbackRow, preferredRow, component,
  allowPreferredEqualModelRun = false, productionReferenceAt = null, part = null,
}) {
  const choice = side => ({ side, sameRunDmiRetention: null });
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
      && isVerifiedRegionalCurrent(preferredRow, part)) return choice('fallback');
    if (verifiedProtectedDmiComponent(preferredRow, component, part)
      && isVerifiedRegionalCurrent(fallbackRow, part)) return choice('preferred');
  }
  if (component === 'current' && fallbackProvider !== preferredProvider) {
    const fallbackRegional = isVerifiedRegionalCurrent(fallbackRow, part);
    const preferredRegional = isVerifiedRegionalCurrent(preferredRow, part);
    if (fallbackRegional || preferredRegional) {
      const reserve = fallbackRegional ? preferredRow : fallbackRow;
      if (!isControlledLiveReserve(reserve, component, part)) return choice(null);
      // Existing order: local DMI, CP, regional DMI, OM. The 96-hour
      // response-bound challenge applies to direct DMI, not this reserve.
      const reserveWins = componentProvider(reserve, component) === 'copernicus';
      return choice(fallbackRegional === reserveWins ? 'preferred' : 'fallback');
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
      || !verifiedWaveForPriority(preferredRow, part)) return choice(null);
    const fallbackSource = componentRevisionSource(fallbackRow, component);
    const preferredSource = componentRevisionSource(preferredRow, component);
    const fallbackProxy = fallbackProvider === 'ravradar-derived'
      && fallbackSource?.sourceClass === 'owner-approved-neighbor-wave-proxy';
    const preferredProxy = preferredProvider === 'ravradar-derived'
      && preferredSource?.sourceClass === 'owner-approved-neighbor-wave-proxy';
    if (fallbackProxy || preferredProxy) {
      // The approved Feggesund proxy is retained before an unknown-age
      // reserve, while a directly verified DMI wave supersedes the proxy.
      if (fallbackProvider === 'dmi') return choice('fallback');
      if (preferredProvider === 'dmi') return choice('preferred');
      if (fallbackProxy !== preferredProxy) return choice(fallbackProxy ? 'fallback' : 'preferred');
      const fallbackRun = componentModelRun(fallbackRow, component);
      const preferredRun = componentModelRun(preferredRow, component);
      if (!Number.isFinite(fallbackRun) || !Number.isFinite(preferredRun)
        || fallbackRun === preferredRun) return choice(null);
      return choice(preferredRun > fallbackRun ? 'preferred' : 'fallback');
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
          fallbackSource[key] === preferredSource[key])) return choice(null);
      return choice(nextRun > previousRun ? 'preferred' : 'fallback');
    }
    const candidates = [
      { side: 'fallback', source: fallbackSource, previouslySelected: true },
      { side: 'preferred', source: preferredSource },
    ];
    const admitted = new Map(candidates.map(candidate => [candidate, candidate.source]));
    return choice(selectQualifiedWeatherComponent(candidates, {
      component: 'wave', productionReferenceAt,
      admit: candidate => admitted.get(candidate) ?? null,
    })?.candidate?.side ?? null);
  }
  if (component === 'current' && fallbackProvider === preferredProvider
    && isControlledLiveReserve(fallbackRow, component, part)
    && isControlledLiveReserve(preferredRow, component, part)) {
    // A real previous winner is required for same-provider reserve retention;
    // arbitrary peer order must not acquire that permission.
    if (!allowPreferredEqualModelRun || canonicalTime(productionReferenceAt) === null) return choice(null);
    const candidates = [
      { side: 'fallback', source: componentRevisionSource(fallbackRow, component), previouslySelected: true },
      { side: 'preferred', source: componentRevisionSource(preferredRow, component) },
    ];
    const admitted = new Map(candidates.map(candidate => [candidate, candidate.source]));
    return choice(selectQualifiedWeatherComponent(candidates, {
      component, productionReferenceAt,
      admit: candidate => admitted.get(candidate) ?? null,
    })?.candidate?.side ?? null);
  }
  if (component === 'current' && fallbackProvider !== preferredProvider) {
    const eligible = row => verifiedProtectedDmiComponent(row, component, part)
      || isControlledLiveReserve(row, component, part);
    if (!eligible(fallbackRow) || !eligible(preferredRow)
      || canonicalTime(productionReferenceAt) === null) return choice(null);
    const candidates = [
      { side: 'fallback', source: componentRevisionSource(fallbackRow, component), previouslySelected: true },
      { side: 'preferred', source: componentRevisionSource(preferredRow, component) },
    ];
    const admitted = new Map(candidates.map(candidate => [candidate, candidate.source]));
    return choice(selectQualifiedWeatherComponent(candidates, {
      component, productionReferenceAt,
      admit: candidate => admitted.get(candidate) ?? null,
    })?.candidate?.side ?? null);
  }
  if (!Number.isFinite(fallbackModelRun) || !Number.isFinite(preferredModelRun)) return choice(null);
  if (fallbackModelRun === preferredModelRun) {
    if (!allowPreferredEqualModelRun) return choice(null);
    const fallbackRevision = componentRevisionSource(fallbackRow, component);
    const preferredRevision = componentRevisionSource(preferredRow, component);
    // Official revision clocks order only comparable source identities. A
    // timestamp on a different collection/grid/layer cannot prove that it
    // revises the protected component, even when its modelRun is identical.
    if (comparableDmiRevision(fallbackRevision, preferredRevision)) {
      if (preferQualifiedDmiComponentSource(fallbackRevision, preferredRevision, component)) return choice('preferred');
      if (preferQualifiedDmiComponentSource(preferredRevision, fallbackRevision, component)) return choice('fallback');
    }
    if (!part || !verifiedProtectedDmiComponent(fallbackRow, component, part)
      || !verifiedProtectedDmiComponent(preferredRow, component, part)) return choice(null);
    // Both independently verified DMI components describe the same model run,
    // target part/hour, but their native time support or source identity does
    // not prove a later official revision. The authenticated prior component
    // is the protected previous winner, including a different valid grid:
    // keep it rather than making a different interpolation (or provenance-only
    // change) an unresolvable peer in the strict replay. This does not admit an
    // invalid candidate or weaken replay for unrelated sources.
    const physicalKeys = component === 'current'
      ? ['currentUMps', 'currentVMps', 'currentSpeedMps', 'currentDirectionDeg']
      : ['waveHeightM', 'wavePeriodS', 'waveDirectionDeg'];
    const valueClass = physicalKeys.every(key => fallbackRow[key] === preferredRow[key])
      ? 'SAME_VALUES' : 'DIFFERENT_VALUES';
    return { side: 'fallback', sameRunDmiRetention: valueClass };
  }
  return choice(preferredModelRun > fallbackModelRun ? 'preferred' : 'fallback');
}

export function preferredDecoderSuccessorSide() {
  return 'preferred';
}

export function projectRavScoreRecoverySourceRows(source, side, decisions) {
  return Array.isArray(source?.record?.hourly)
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

}

const SHA256 = /^(?:sha256:)?[0-9a-f]{64}$/;
const samePoint = (left, right) => Array.isArray(left) && Array.isArray(right)
  && left.length === 2 && right.length === 2
  && left.every((value, index) => finite(value) && finite(right[index])
    && Math.abs(value - right[index]) <= 1e-7);

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

export { verifiedWaveForPriority, verifiedProtectedDmiComponent, isControlledLiveReserve, isVerifiedRegionalCurrent };
