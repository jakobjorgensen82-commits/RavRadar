// Private normal-caller observations only. This module grants no runtime authority.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { writeBoundedJsonAtomic } from './bounded-json-writer.mjs';

const LF7 = new Set(['DK-B01-01','DK-B01-02','DK-B02-08','DK-B02-09','DK-B02-11','DK-B03-01','DK-B03-02']);
const FUR = 'dk-b05-17-national-part-04';
const HOUR = 3_600_000;
const CURRENT_COMPONENT_FIELDS = ['dkssLf','otherVerified','notUsed','unknown','stateOnly','stateOnlyDkssLf'];
const TEMPERATURE_COMPONENT_FIELDS = ['dkssLf','otherVerified','notUsed','unknown'];
const PUBLIC_HOURS = 118;
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const sha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const BRANCHES = ['ESTABLISHED_NATIVE_BS_PAIR','OWNER_PERMITTED_HISTORY_REBUILT',
  'STRICT_NATIVE_DECODER_TRANSITION','MEASURED_COLD_REESTABLISHED','POINT_ACTIVATION_REESTABLISHED','OTHER_OR_UNKNOWN'];
const zoneOf = part => part?.sourceZoneId ?? part?.parentZoneId ?? part?.zoneId;
const publicHour = (time, reference) => Number.isFinite(Date.parse(reference))
  && Date.parse(time) >= Math.floor(Date.parse(reference)/HOUR)*HOUR
  && Date.parse(time) < (Math.floor(Date.parse(reference)/HOUR)+118)*HOUR;

export function beginLf7WaterObservation({ zoneId, partId = null, stream, referenceAt, rows }) {
  try {
  if ((!LF7.has(zoneId) && !(zoneId === 'DK-B05-17' && (!partId || partId === FUR)))
    || !Number.isFinite(Date.parse(referenceAt))) return null;
  return { zoneId, partId, stream, referenceAt,
    selectionSha256: hash(rows.map(row => [row.sourceKey ?? row.stationId, row.point, row.weight])),
    selectedSourceCount: rows.length, hoursObserved: 0, noSelection: 0,
    sourceUnavailableOrDenied: 0, numericMissing: 0, applied: 0,
    trendKnown: 0, trendUnknown: 0, admittedLfWaterEndpoints: 0,
    admittedLfT3Endpoints: 0, endpointSeriesSha256: hash([]),
    tailSupport: Array.from({ length: 3 }, () => [false, 'UNKNOWN', null, null]) };
  } catch { console.warn('LF7_FUR_CONSUMER_OBSERVATION_NOT_RECORDED'); return null; }
}

// The caller supplies its ALREADY TAKEN branch and trendKnown decision.
// No source choice, proof verification, weights or numeric trend is recalculated.
export function observeLf7WaterDecision(observation, { time, branch, sourceRows = [], futureRows = [], trendKnown = false }) {
  if (!observation || observation.invalid) return;
  try {
  if (!publicHour(time, observation.referenceAt)) return;
  observation.hoursObserved++;
  recordTailSupport(observation, time, branch, futureRows, trendKnown);
  if (branch !== 'APPLIED') { observation[branch]++; return; }
  observation.applied++;
  observation[trendKnown ? 'trendKnown' : 'trendUnknown']++;
  observation.admittedLfWaterEndpoints += sourceRows.filter(row => row.sources.waterLevel.collection === 'dkss_lf').length;
  if (trendKnown) observation.admittedLfT3Endpoints += futureRows.filter(row => row.sources.waterLevel.collection === 'dkss_lf').length;
  const identity = row => { const s = row?.sources?.waterLevel; return s
    ? [s.provider,s.entityId,s.collection,s.modelRun,s.gridDefinitionSha256,s.gridPoint,s.nativeValidTime,s.assetIdentitySha256] : null; };
  observation.endpointSeriesSha256 = hash([observation.endpointSeriesSha256,time,
    sourceRows.map(identity),futureRows.map(identity),trendKnown]);
  } catch { observation.invalid = true; console.warn('LF7_FUR_CONSUMER_OBSERVATION_NOT_RECORDED'); }
}


function recordTailSupport(observation, time, branch, futureRows, trendKnown) {
  const offset = (Date.parse(time) - Math.floor(Date.parse(observation.referenceAt)/HOUR)*HOUR)/HOUR;
  const slot = observation.tailSupport[offset - 115];
  if (!slot) return;
  if (slot[0]) throw new Error('Duplicate LF7 tail observation');
  if (branch !== 'APPLIED') {
    const notUsed = ['noSelection','sourceUnavailableOrDenied','numericMissing'].includes(branch);
    observation.tailSupport[offset - 115] = [true, notUsed ? 'NOT_USED' : 'UNKNOWN', null, null];
    return;
  }
  const sources = futureRows.map(row => row?.sources?.waterLevel);
  const verified = trendKnown === true && sources.length > 0
    && sources.length === observation.selectedSourceCount
    && sources.every(source => source?.provider === 'dmi' && typeof source.collection === 'string'
      && source.collection.length > 0);
  observation.tailSupport[offset - 115] = verified
    ? [true, 'VERIFIED', sources.length, sources.filter(source => source.collection === 'dkss_lf').length]
    : [true, 'UNKNOWN', null, null];
}

function selectedComponent(provenance, values) {
  if (values.every(value => value === null || value === undefined))
    return provenance?.status === 'verified' ? 'unknown' : 'notUsed';
  if (!values.every(Number.isFinite) || provenance?.status !== 'verified') return 'unknown';
  if (provenance.collection === 'dkss_lf')
    return provenance.provider === 'dmi' ? 'dkssLf' : 'unknown';
  if (provenance.provider === 'dmi')
    return typeof provenance.collection === 'string' && provenance.collection.length > 0 ? 'otherVerified' : 'unknown';
  return ['copernicus','open-meteo'].includes(provenance.provider) ? 'otherVerified' : 'unknown';
}

function observeSelectedPartComponents(recovery) {
  const target = Date.parse(recovery?.scoreStartAt);
  const rows = new Map();
  if (Number.isFinite(target) && target % HOUR === 0 && Array.isArray(recovery.hourly)) {
    for (const row of recovery.hourly) {
      const offset = (Date.parse(row?.time) - target)/HOUR;
      if (Number.isInteger(offset) && offset >= 0 && offset < PUBLIC_HOURS)
        rows.set(offset, rows.has(offset) ? null : row);
    }
  }
  const current = { dkssLf: 0, otherVerified: 0, notUsed: 0, unknown: 0, stateOnly: 0, stateOnlyDkssLf: 0 };
  const waterTemperature = { dkssLf: 0, otherVerified: 0, notUsed: 0, unknown: 0 };
  let observedHours = 0;
  for (let offset = 0; offset < PUBLIC_HOURS; offset++) {
    const row = rows.get(offset);
    if (!row) { current.unknown++; waterTemperature.unknown++; continue; }
    observedHours++;
    const currentFields = [row.currentSpeedMps, row.currentDirectionDeg];
    const hold = row.currentStateOnlyHold;
    if (hold) {
      if (currentFields.every(value => value === null || value === undefined)
        && typeof hold.collection === 'string' && hold.collection.length > 0) {
        current.stateOnly++;
        if (hold.collection === 'dkss_lf') current.stateOnlyDkssLf++;
      } else current.unknown++;
    } else current[selectedComponent(row.currentProvenance, currentFields)]++;
    waterTemperature[selectedComponent(row.waterTemperatureProvenance, [row.waterTemperatureC])]++;
  }
  return [observedHours, CURRENT_COMPONENT_FIELDS.map(key => current[key]),
    TEMPERATURE_COMPONENT_FIELDS.map(key => waterTemperature[key])];
}

export function captureLf7MemoryObservation({ part, initialSelection, previousCandidateGContinuation,
  productionSeries, hasEstablishedOrigin }) {
  try {
  const zoneId = zoneOf(part);
  if (!LF7.has(zoneId)) return null;
  const transition = productionSeries.currentSourceDomainTransition;
  const branch = transition?.kind === 'PRIVATE_OWNER_CURRENT_SOURCE_TRANSITION' ? 'OWNER_PERMITTED_HISTORY_REBUILT'
    : transition?.kind === 'PRIVATE_CURRENT_DECODER_TRANSITION' ? 'STRICT_NATIVE_DECODER_TRANSITION'
    : hasEstablishedOrigin && ['EXISTING_INTEGRATED','INTEGRATED_CHECKPOINT'].includes(initialSelection.source)
      ? 'ESTABLISHED_NATIVE_BS_PAIR'
    : hasEstablishedOrigin && initialSelection.source === 'COLD_START' ? 'MEASURED_COLD_REESTABLISHED'
    : hasEstablishedOrigin && initialSelection.source === 'POINT_ACTIVATION' ? 'POINT_ACTIVATION_REESTABLISHED' : 'OTHER_OR_UNKNOWN';
  return { result: productionSeries, observation: { partId: part.partId, zoneId, branch,
    initialPairSha256: hash([initialSelection.state,previousCandidateGContinuation]),
    contextSha256: hash([part.partId,zoneId,part.waterPoint,part.landPoint,part.onshoreDirectionDeg]),
    provedCurrentHours: Number.isSafeInteger(transition?.provedCurrentHours) ? transition.provedCurrentHours : null,
    unknownCurrentHours: Number.isSafeInteger(transition?.unknownCurrentHours) ? transition.unknownCurrentHours : null,
    perContributionNativeProvenance: 'NOT_EXPOSED_BY_COMPACT_MEMORY',
    selectedPartComponents: observeSelectedPartComponents(productionSeries.recovery) } };
  } catch { console.warn('LF7_FUR_CONSUMER_OBSERVATION_NOT_RECORDED'); return null; }
}

// Invoke ONLY after the existing normal ALL-parts finalizer has completed.
// Matching references below are observation consistency checks, never an origin assertion.
export async function writeLf7FurConsumerObservation({ conditions, partResults, memoryObservations, waterObservations }) {
  const a = conditions.privateEstablishedNativeCurrentOrigin;
  if (!a || !sha(a.attestationSha256) || !sha(a.parent?.bundleContentSha256)
    || !sha(a.parent?.generationSha256) || !(partResults instanceof Map)
    || ![a.producer?.integrated,a.producer?.candidate,a.producer?.continuation,
      a.registrySha256,a.contextRegistrySha256,a.pairsSha256].every(sha)) return false;
  const memory = memoryObservations.filter(Boolean);
  if (memory.some(row => partResults.get(row.observation.partId) !== row.result)) return false;
  const rows = memory.map(row => Object.fromEntries(['partId','zoneId','branch',
    'initialPairSha256','contextSha256','provedCurrentHours','unknownCurrentHours',
    'perContributionNativeProvenance','selectedPartComponents'].map(key => [key,row.observation[key]])));
  const policy = (await fs.readFile(new URL('./dmi-marine-zone-exclusions.json', import.meta.url),'utf8'))
    .replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
  const gitBlob = crypto.createHash('sha1').update(`blob ${Buffer.byteLength(policy)}\0`).update(policy).digest('hex');
  if (gitBlob !== a.producer?.ownerPolicyGitBlob) return false;
  const policyDocument = JSON.parse(policy);
  const branchCounts = Object.fromEntries(BRANCHES.map(branch => [branch,rows.filter(row => row.branch === branch).length]));
  const scopeComplete = rows.length === 17 && new Set(rows.map(row => row.partId)).size === 17
    && new Set(rows.map(row => row.zoneId)).size === 7;
  const report = { schemaVersion: 1, kind: 'PRIVATE_LF7_FUR_CONSUMER_OBSERVATION_V1',
    privacyClass: 'PRIVATE_PRODUCTION_RUNTIME', evidenceClass: 'OBSERVATION_NOT_AUTHORITY',
    status: scopeComplete ? 'OBSERVED_NORMAL_FINALIZER_COMPLETED' : 'SCOPE_INCOMPLETE',
    datasetId: conditions.datasetId, productionReferenceAt: conditions.productionReferenceAt,
    runId: /^\d+$/.test(process.env.GITHUB_RUN_ID ?? '') ? process.env.GITHUB_RUN_ID : null,
    runAttempt: /^\d+$/.test(process.env.GITHUB_RUN_ATTEMPT ?? '') ? process.env.GITHUB_RUN_ATTEMPT : null,
    sourceHead: a.producer.sourceHead, I: a.producer.integrated, C: a.producer.candidate,
    T: a.producer.continuation, policyVersion: policyDocument.schemaVersion,
    policyContract: policyDocument.contractId, policySourceSha256: crypto.createHash('sha256').update(policy).digest('hex'),
    policyGitBlob: gitBlob, originalPins: { B: a.parent.bundleContentSha256, S: a.parent.generationSha256,
      parentAttestation: a.parent.attestationSha256, attestation: a.attestationSha256,
      registry: a.registrySha256, contexts: a.contextRegistrySha256, pairs: a.pairsSha256 },
    observedParts: rows.length, expectedParts: 17, memoryBranchCounts: branchCounts, memory: rows,
    selectedPartComponentFields: { expectedHours: PUBLIC_HOURS,
      fields: ['observedHours','current','waterTemperature'],
      current: CURRENT_COMPONENT_FIELDS, waterTemperature: TEMPERATURE_COMPONENT_FIELDS },
    tailSupportHourOffsets: [118,119,120],
    tailSupportFields: ['observed','status','verifiedEndpointCount','admittedDkssLfEndpointCount'],
    sourceT3: waterObservations.filter(Boolean).map(row => row.invalid
      ? { zoneId: row.zoneId, partId: row.partId, stream: row.stream, status: 'NOT_RECORDED' }
      : { status: 'OBSERVED', ...Object.fromEntries([
      'zoneId','partId','stream','referenceAt','selectionSha256','selectedSourceCount','hoursObserved',
      'noSelection','sourceUnavailableOrDenied','numericMissing','applied','trendKnown','trendUnknown',
      'admittedLfWaterEndpoints','admittedLfT3Endpoints','endpointSeriesSha256','tailSupport'].map(key => [key,row[key]])) }),
    donorBankMembership: 'NOT_EXPOSED_BY_JOINED_VERIFIED_INDEX',
    historicalFurCause: 'NOT_ESTABLISHED_BY_THIS_OBSERVATION' };
  const serialized = JSON.stringify(report)+'\n';
  if (Buffer.byteLength(serialized) > 32768) return false;
  await writeBoundedJsonAtomic('.geometry-v2-work/lf7-fur-consumer-observation-v1.json',report,
    { maximumBytes: 32768, bufferBytes: 32768 });
  return true;
}
