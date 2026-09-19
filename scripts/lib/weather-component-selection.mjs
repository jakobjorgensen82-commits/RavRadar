// Selection is downstream of provider admission. This module cannot turn a
// candidate into verified input: the caller must validate values, exact target
// time/entity and provider proof before comparing these sources.
const finite = value => typeof value === 'number' && Number.isFinite(value);
const timestamp = value => typeof value === 'string'
  && /(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;
const samePoint = (left, right) => Array.isArray(left) && Array.isArray(right)
  && left.length === 2 && right.length === 2
  && left.every((value, index) => finite(value) && finite(right[index])
    && Math.abs(value - right[index]) <= 1e-7);
const COLLECTION_ORDER = ['dkss_idw', 'dkss_nsbs', 'dkss_lf', 'wam_dw', 'wam_nsb', 'harmonie_dini_sf'];
const SHA256 = /^(?:sha256:)?[0-9a-f]{64}$/;
export const DMI_RESERVE_CHALLENGE_AGE_HOURS = 96;

// The model reference must be extracted from the actual response/subset by
// admission. Current CP/OM records without such evidence remain useful gap
// fillers, but a new download time never grants them overwrite permission.
export function responseBoundModelRun(source) {
  if (source?.provider === 'dmi') return timestamp(source.modelRun);
  const proof = source?.modelReference;
  const payloadHash = proof?.kind === 'response-forecast-reference-time'
    ? source?.sourceResponseSha256
    : proof?.kind === 'subset-forecast-reference-time' ? source?.subsetSha256 : null;
  if (!SHA256.test(payloadHash ?? '') || proof?.payloadSha256 !== payloadHash
    || proof?.modelRun !== source?.modelRun) return null;
  return timestamp(proof.modelRun);
}

function sameConsumer(left, right) {
  return ['entityId', 'parentZoneId', 'entityType', 'samplingContext'].every(key =>
    typeof left?.[key] === 'string' && left[key].length > 0 && left[key] === right?.[key])
    && samePoint(left?.samplingPoint, right?.samplingPoint);
}

function newerOfficialRevision(existing, candidate) {
  const oldSteps = Array.isArray(existing.nativeSteps) ? existing.nativeSteps : [existing];
  const newSteps = Array.isArray(candidate.nativeSteps) ? candidate.nativeSteps : [candidate];
  if (oldSteps.length === 0 || oldSteps.length !== newSteps.length) return false;
  const newByTime = new Map(newSteps.map(step => [step.nativeValidTime, step]));
  if (newByTime.size !== newSteps.length) return false;
  // A derived tuple contains all interpolation endpoints. Comparing just the
  // selected endpoint would permit another endpoint to regress silently.
  const revisionKey = [...oldSteps, ...newSteps].some(step => step.itemUpdatedAt != null)
    ? 'itemUpdatedAt' : 'itemCreatedAt';
  let newer = false;
  for (const oldStep of oldSteps) {
    const newStep = newByTime.get(oldStep.nativeValidTime);
    if (!newStep || timestamp(oldStep.nativeValidTime) === null) return false;
    if (oldStep.itemId === newStep.itemId
      && oldStep.assetIdentitySha256 === newStep.assetIdentitySha256
      && oldStep[revisionKey] === newStep[revisionKey]) continue;
    const oldAt = timestamp(oldStep[revisionKey]);
    const newAt = timestamp(newStep[revisionKey]);
    if (oldAt === null || newAt === null || newAt <= oldAt) return false;
    newer = true;
  }
  return newer;
}

/** Same-source cache repair; never a cross-provider overwrite permission. */
export function preferQualifiedDmiComponentSource(existing, candidate, component) {
  if (existing?.provider !== 'dmi' || candidate?.provider !== 'dmi'
    || !sameConsumer(existing, candidate)) return false;
  const oldRun = timestamp(existing.modelRun);
  const newRun = timestamp(candidate.modelRun);
  if (oldRun === null || newRun === null) return false;
  if (component === 'current') {
    if (!samePoint(existing.gridPoint, candidate.gridPoint)) {
      if (!finite(existing.distanceKm) || !finite(candidate.distanceKm)
        || !samePoint(existing.gridPoint, existing.gridPoint)
        || !samePoint(candidate.gridPoint, candidate.gridPoint)) return false;
      if (Math.abs(existing.distanceKm - candidate.distanceKm) > 1e-6) {
        return candidate.distanceKm < existing.distanceKm;
      }
      return candidate.gridPoint[1] < existing.gridPoint[1]
        || (candidate.gridPoint[1] === existing.gridPoint[1]
          && candidate.gridPoint[0] < existing.gridPoint[0]);
    }
    if (candidate.verticalLayerRankM !== existing.verticalLayerRankM) {
      return finite(candidate.verticalLayerRankM) && finite(existing.verticalLayerRankM)
        && candidate.verticalLayerRankM > existing.verticalLayerRankM;
    }
  } else if (existing.collection !== candidate.collection
    || existing.gridDefinitionSha256 !== candidate.gridDefinitionSha256
    || !samePoint(existing.gridPoint, candidate.gridPoint)
    || existing.verticalLayer !== candidate.verticalLayer
    || existing.component !== candidate.component) return false;
  if (newRun !== oldRun) return newRun > oldRun;
  if (candidate.collection !== existing.collection) {
    const oldRank = COLLECTION_ORDER.indexOf(existing.collection);
    const newRank = COLLECTION_ORDER.indexOf(candidate.collection);
    return oldRank >= 0 && newRank >= 0 && newRank < oldRank;
  }
  return newerOfficialRevision(existing, candidate);
}

/**
 * A shared selection policy for independently ADMITTED atomic candidates.
 * `previouslySelected` means the actual previous winner, not merely a record
 * found somewhere in a provider bank. Caller admission remains mandatory and
 * must bind values, row time, component, entity, units, grid and source proof.
 * This policy alone does not change the current closure's DMI-only partition.
 */
export function selectQualifiedWeatherComponent(candidates, {
  component, productionReferenceAt, admit,
} = {}) {
  const referenceMs = timestamp(productionReferenceAt);
  if (referenceMs === null || typeof admit !== 'function') {
    throw new Error('WEATHER_COMPONENT_SELECTION_REQUIRES_LOCKED_TIME_AND_ADMISSION');
  }
  const admitted = [];
  for (const candidate of candidates ?? []) {
    const source = admit(candidate, component);
    if (source && ['dmi', 'copernicus', 'open-meteo'].includes(source.provider)
      && (component !== 'waterLevel' || source.provider === 'dmi')) {
      admitted.push({ candidate, source });
    }
  }
  let dmi = null;
  for (const entry of admitted.filter(entry => entry.source.provider === 'dmi')) {
    if (!dmi || preferQualifiedDmiComponentSource(dmi.source, entry.source, component)) dmi = entry;
  }
  const reserves = admitted.filter(entry => entry.source.provider !== 'dmi');
  // A filled reserve slot is not a general permission for CP to overwrite OM.
  // Same-provider revision refresh is allowed only with comparable model proof.
  const selectReserve = entries => {
    let winner = entries.find(entry => entry.candidate.previouslySelected === true)
      ?? entries.find(entry => entry.source.provider === 'copernicus')
      ?? entries[0] ?? null;
    for (const entry of entries) {
      if (!winner || entry.source.provider !== winner.source.provider) continue;
      if (!['model', 'productId', 'datasetId'].every(key =>
        entry.source[key] === winner.source[key])) continue;
      const oldRun = responseBoundModelRun(winner.source);
      const newRun = responseBoundModelRun(entry.source);
      if (oldRun !== null && newRun !== null && newRun > oldRun && newRun <= referenceMs) winner = entry;
    }
    return winner;
  };
  if (!dmi) {
    const reserve = selectReserve(reserves);
    return reserve ? { candidate: reserve.candidate, reason: 'GAP_FILLED_BY_RESERVE' } : null;
  }
  const dmiRun = responseBoundModelRun(dmi.source);
  if (dmiRun !== null && referenceMs - dmiRun >= DMI_RESERVE_CHALLENGE_AGE_HOURS * 3_600_000) {
    const newerReserves = reserves.filter(entry => {
      const run = responseBoundModelRun(entry.source);
      return run !== null && run > dmiRun && run <= referenceMs;
    });
    const replacement = selectReserve(newerReserves);
    if (replacement) return { candidate: replacement.candidate, reason: 'AGED_DMI_REPLACED_BY_NEWER_RESERVE' };
  }
  return { candidate: dmi.candidate, reason: 'VALID_DMI_RETAINED' };
}
