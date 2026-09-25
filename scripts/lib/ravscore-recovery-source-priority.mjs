import {
  preferQualifiedDmiComponentSource,
  selectQualifiedWeatherComponent,
} from './weather-component-selection.mjs';
import { classifyWavePhysicalTuple } from '../../js/core/ravscore-mobilisation-memory.js';
import {
  dmiExpectedIdentityForPart,
  verifiedDmiForecastComponentSource,
} from './ravscore-production-adapters.mjs';
import { verifyCompactFeggesundWaveProxy } from './feggesund-wave-proxy.mjs';

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

function isControlledLiveReserve(row, component) {
  const source = componentRevisionSource(row, component);
  return source?.provider !== 'dmi'
    && source?.controlledLivePilot === true
    && source?.vectorSemanticsVersion === 4
    && source?.sourceClass === 'supplemental-local-current';
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
  { allowPreferredEqualModelRun = false, productionReferenceAt = null, part = null } = {},
) {
  const hasFallback = component === 'current'
    ? hasVerifiedCurrent(fallbackRow)
    : hasVerifiedWave(fallbackRow);
  const hasPreferred = component === 'current'
    ? hasVerifiedCurrent(preferredRow)
    : hasVerifiedWave(preferredRow);
  if (!hasFallback || !hasPreferred) return null;

  const fallbackModelRun = componentModelRun(fallbackRow, component);
  const preferredModelRun = componentModelRun(preferredRow, component);

  // DMI is the authoritative current-data source. A controlled live reserve
  // can legitimately overlap a later DMI rebuild, but it must not win merely
  // because it has no comparable model-run timestamp. Allow the reserve to
  // replace DMI only when it carries a newer bound model run and the DMI run
  // is at least the established four-day challenge age.
  const fallbackProvider = componentProvider(fallbackRow, component);
  const preferredProvider = componentProvider(preferredRow, component);
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
  if (fallbackProvider !== preferredProvider
    && (fallbackProvider === 'dmi' || preferredProvider === 'dmi')
    && (isControlledLiveReserve(fallbackRow, component)
      || isControlledLiveReserve(preferredRow, component))) {
    const dmiIsPreferred = preferredProvider === 'dmi';
    const dmiModelRun = dmiIsPreferred ? preferredModelRun : fallbackModelRun;
    const otherModelRun = dmiIsPreferred ? fallbackModelRun : preferredModelRun;
    const referenceMs = Date.parse(productionReferenceAt ?? '');
    const dmiAgeHours = Number.isFinite(referenceMs) && Number.isFinite(dmiModelRun)
      ? (referenceMs - dmiModelRun) / 3_600_000
      : null;
    const staleDmiMayYield = Number.isFinite(dmiAgeHours)
      && dmiAgeHours >= 96
      && Number.isFinite(otherModelRun)
      && otherModelRun > dmiModelRun
      && otherModelRun <= referenceMs;
    if (staleDmiMayYield) return dmiIsPreferred ? 'fallback' : 'preferred';
    return dmiIsPreferred ? 'preferred' : 'fallback';
  }
  if (!Number.isFinite(fallbackModelRun) || !Number.isFinite(preferredModelRun)) return null;
  if (fallbackModelRun === preferredModelRun) {
    if (!allowPreferredEqualModelRun) return null;
    const fallbackRevision = componentRevisionSource(fallbackRow, component);
    const preferredRevision = componentRevisionSource(preferredRow, component);
    if (!comparableDmiRevision(fallbackRevision, preferredRevision)) return null;
    if (preferQualifiedDmiComponentSource(fallbackRevision, preferredRevision, component)) return 'preferred';
    if (preferQualifiedDmiComponentSource(preferredRevision, fallbackRevision, component)) return 'fallback';
    return null;
  }
  return preferredModelRun > fallbackModelRun ? 'preferred' : 'fallback';
}

function isAcceptedProgressiveDmiRevision(fallbackSource, preferredSource) {
  return fallbackSource?.source === 'deployed-private-runtime'
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
 * valid value remains. An equal modelRun is accepted only for the explicit
 * progressive-DMI revision pair when its official update time is newer;
 * otherwise it is left to the downstream fail-closed conflict gate.
 */
export function buildNewestValidRavScoreRecoverySources({
  fallbackSource = null,
  preferredSource = null,
  productionReferenceAt = null,
  part = null,
} = {}) {
  if (!fallbackSource && !preferredSource) return [];
  if (!fallbackSource) return [preferredSource];
  if (!preferredSource) return [fallbackSource];

  const fallbackByTime = uniqueRowsByTime(fallbackSource);
  const preferredByTime = uniqueRowsByTime(preferredSource);
  const decisions = new Map();
  const allowPreferredEqualModelRun = isAcceptedProgressiveDmiRevision(
    fallbackSource,
    preferredSource,
  );
  for (const [time, fallbackRow] of fallbackByTime) {
    const preferredRow = preferredByTime.get(time);
    if (!preferredRow) continue;
    decisions.set(time, {
      current: componentPreference(fallbackRow, preferredRow, 'current', {
        allowPreferredEqualModelRun,
        productionReferenceAt,
        part,
      }),
      wave: componentPreference(fallbackRow, preferredRow, 'wave', {
        allowPreferredEqualModelRun,
        productionReferenceAt,
        part,
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
