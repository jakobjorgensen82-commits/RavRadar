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

function componentPreference(fallbackRow, preferredRow, component) {
  const hasFallback = component === 'current'
    ? hasVerifiedCurrent(fallbackRow)
    : hasVerifiedWave(fallbackRow);
  const hasPreferred = component === 'current'
    ? hasVerifiedCurrent(preferredRow)
    : hasVerifiedWave(preferredRow);
  if (!hasFallback || !hasPreferred) return null;

  const fallbackModelRun = componentModelRun(fallbackRow, component);
  const preferredModelRun = componentModelRun(preferredRow, component);
  if (!Number.isFinite(fallbackModelRun) || !Number.isFinite(preferredModelRun)
    || fallbackModelRun === preferredModelRun) return null;
  return preferredModelRun > fallbackModelRun ? 'preferred' : 'fallback';
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
 * valid value remains. Equal or uncomparable model runs are deliberately left
 * to the downstream fail-closed conflict gate.
 */
export function buildNewestValidRavScoreRecoverySources({
  fallbackSource = null,
  preferredSource = null,
} = {}) {
  if (!fallbackSource && !preferredSource) return [];
  if (!fallbackSource) return [preferredSource];
  if (!preferredSource) return [fallbackSource];

  const fallbackByTime = uniqueRowsByTime(fallbackSource);
  const preferredByTime = uniqueRowsByTime(preferredSource);
  const decisions = new Map();
  for (const [time, fallbackRow] of fallbackByTime) {
    const preferredRow = preferredByTime.get(time);
    if (!preferredRow) continue;
    decisions.set(time, {
      current: componentPreference(fallbackRow, preferredRow, 'current'),
      wave: componentPreference(fallbackRow, preferredRow, 'wave'),
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
