const COPERNICUS_SOURCES = new Set(['copernicus-baltic-nemo', 'copernicus-nws-amm15']);
const REGIONAL_SOURCE = 'dmi-dkss-lf-regional-proxy';
const SOURCE_ORDER = new Map([
  ['copernicus-baltic-nemo', 0],
  ['copernicus-nws-amm15', 1],
  [REGIONAL_SOURCE, 2],
]);

const finite = value => value === null || value === undefined || value === '' || typeof value === 'boolean'
  ? null
  : (Number.isFinite(Number(value)) ? Number(value) : null);
const rounded = (value, digits) => Number(Number(value).toFixed(digits));
const canonicalTime = value => {
  const parsed = Date.parse(value ?? '');
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
};

function point(value) {
  if (!Array.isArray(value) || value.length < 2) return null;
  const longitude = finite(value[0]);
  const latitude = finite(value[1]);
  return longitude === null || latitude === null ? null : [longitude, latitude];
}

function samePoint(first, second, tolerance = 1e-7) {
  const a = point(first);
  const b = point(second);
  return Boolean(a && b && Math.abs(a[0] - b[0]) <= tolerance && Math.abs(a[1] - b[1]) <= tolerance);
}

function haversineKm(first, second) {
  const a = point(first);
  const b = point(second);
  if (!a || !b) return Infinity;
  const radians = degrees => degrees * Math.PI / 180;
  const dLat = radians(b[1] - a[1]);
  const dLon = radians(b[0] - a[0]);
  const lat1 = radians(a[1]);
  const lat2 = radians(b[1]);
  const term = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(term), Math.sqrt(Math.max(0, 1 - term)));
}

export function controlledLiveCurrentEnabled(document) {
  return Number(document?.schemaVersion) === 1
    && document?.controlledLivePilot === true
    && document?.mode === 'controlled-live'
    && document?.enabled === true
    && document?.credentialsIncluded === false;
}

export function verifiedLivePilotSource(source, expectedSamplingPoint, { requireStatus = false } = {}) {
  if (!source || (requireStatus && source.status !== 'verified')) return null;
  if (source.controlledLivePilot !== true || Number(source.vectorSemanticsVersion) !== 4) return null;
  if (source.componentPair !== 'same-time-cell-layer' || source.interpolation !== false || !source.verticalLayer) return null;
  if (!samePoint(source.samplingPoint, expectedSamplingPoint)) return null;
  const gridPoint = point(source.gridPoint);
  const distanceKm = finite(source.distanceKm);
  if (!gridPoint || distanceKm === null) return null;

  let maximumDistanceKm;
  let arrowSource;
  if (
    source.sourceClass === 'supplemental-local-current'
    && String(source.provider ?? '').toLowerCase() === 'copernicus'
    && COPERNICUS_SOURCES.has(source.source)
  ) {
    maximumDistanceKm = 5;
    arrowSource = 'copernicus-current-grid';
  } else if (
    source.sourceClass === 'owner-approved-regional-proxy'
    && String(source.provider ?? '').toLowerCase() === 'dmi'
    && source.source === REGIONAL_SOURCE
    && source.collection === 'dkss_lf'
  ) {
    maximumDistanceKm = 15;
    arrowSource = 'dmi-regional-proxy-grid';
  } else {
    return null;
  }
  if (distanceKm > maximumDistanceKm || haversineKm(expectedSamplingPoint, gridPoint) > maximumDistanceKm + 0.01) return null;
  return { gridPoint, distanceKm, maximumDistanceKm, arrowSource };
}

function verifiedEntry(entry, part) {
  const validTime = canonicalTime(entry?.validTime);
  const uMps = finite(entry?.uMps);
  const vMps = finite(entry?.vMps);
  if (!validTime || uMps === null || vMps === null) return null;
  if (entry?.partId !== part?.partId || entry?.parentZoneId !== part?.zoneId) return null;
  const source = {
    ...entry,
    status: 'verified',
    controlledLivePilot: true,
    vectorSemanticsVersion: 4,
    vectorSelection: 'dmi-local-then-copernicus-local-then-owner-approved-regional-proxy',
    temporalResolution: 'native',
    nativeValidTimes: [validTime],
    fallback: false,
  };
  const proof = verifiedLivePilotSource(source, part.waterPoint, { requireStatus: true });
  return proof ? { entry, source, validTime, uMps, vMps, proof } : null;
}

/**
 * The owner-approved DKSS Limfjord proxy is published on its native
 * three-hour cadence. Candidate G may retain the last derived transport state
 * between those native samples, but this function deliberately returns no
 * permission for Copernicus or unverified/mismatched entries.
 */
export function nativeCadenceHoldHoursForPart(part, document) {
  if (!controlledLiveCurrentEnabled(document)) return 0;
  const approvedRegionalEntry = (document.entries ?? []).some(raw => {
    const candidate = verifiedEntry(raw, part);
    return candidate?.entry?.sourceClass === 'owner-approved-regional-proxy'
      && candidate.entry.source === REGIONAL_SOURCE
      && candidate.entry.collection === 'dkss_lf';
  });
  return approvedRegionalEntry ? 3 : 0;
}

export function verifiedNativeCadenceReferenceForPart(part, document, referenceAt) {
  const reference = canonicalTime(referenceAt);
  if (!reference || nativeCadenceHoldHoursForPart(part, document) !== 3) return false;
  return (document.entries ?? []).some(raw => {
    const candidate = verifiedEntry(raw, part);
    return candidate?.validTime === reference
      && candidate.entry.sourceClass === 'owner-approved-regional-proxy'
      && candidate.entry.source === REGIONAL_SOURCE
      && candidate.entry.collection === 'dkss_lf';
  });
}

export function mergeLiveCurrentPilotIntoRecord(record, part, document, { primaryCurrentVerified = () => false } = {}) {
  if (!record || !Array.isArray(record.hourly) || !controlledLiveCurrentEnabled(document)) return record;
  const candidates = new Map();
  for (const raw of document.entries ?? []) {
    const candidate = verifiedEntry(raw, part);
    if (!candidate) continue;
    const previous = candidates.get(candidate.validTime);
    if (!previous || (SOURCE_ORDER.get(candidate.entry.source) ?? 99) < (SOURCE_ORDER.get(previous.entry.source) ?? 99)) {
      candidates.set(candidate.validTime, candidate);
    }
  }
  if (!candidates.size) return record;

  let supplementalHours = 0;
  const hourly = record.hourly.map(row => {
    if (finite(row?.currentUMps) !== null && finite(row?.currentVMps) !== null && primaryCurrentVerified(row)) return row;
    const candidate = candidates.get(canonicalTime(row?.time));
    if (!candidate) return row;
    supplementalHours += 1;
    const currentSpeedMps = Math.hypot(candidate.uMps, candidate.vMps);
    const currentDirectionDeg = ((Math.atan2(candidate.uMps, candidate.vMps) * 180 / Math.PI) + 360) % 360;
    return {
      ...row,
      currentUMps: rounded(candidate.uMps, 5),
      currentVMps: rounded(candidate.vMps, 5),
      currentSpeedMps: rounded(currentSpeedMps, 2),
      currentDirectionDeg: rounded(currentDirectionDeg, 0),
      temporalResolution: row?.temporalResolution ?? 'native',
      sources: { ...(row?.sources ?? {}), current: candidate.source },
      currentProvenance: candidate.source,
    };
  });
  if (!supplementalHours) return record;
  return {
    ...record,
    hourly,
    model: {
      ...(record.model ?? {}),
      completeness: {
        ...(record.model?.completeness ?? {}),
        current: true,
        controlledLiveCurrentPilot: true,
        controlledLiveCurrentPilotMode: document.mode,
        supplementalCurrentHours: supplementalHours,
      },
    },
  };
}
