// Only the real credential-free Python byte verifier can construct authority.
// A self-signed projection or an arbitrary spatial certificate cannot do so.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  verifyCopernicusComponentProjection, sealCopernicusComponentProjection,
} from './copernicus-component-projection.mjs';

const POLICY = JSON.parse(await fs.readFile(new URL('./copernicus-component-spatial-policy.json', import.meta.url), 'utf8'));
const authorities = new WeakMap();
const indexes = new WeakMap();
const RUNNER = fileURLToPath(new URL('../run-copernicus-weather-components.py', import.meta.url));
const ROOT = path.dirname(path.dirname(RUNNER));
const HASH = /^sha256:[0-9a-f]{64}$/;
const finite = value => typeof value === 'number' && Number.isFinite(value);
const samePoint = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === 2 && b.length === 2
  && a.every((value, i) => finite(value) && finite(b[i]) && Math.abs(value - b[i]) <= 1e-7);
const PINNED = {
  'nws-wave': ['wave', 'NWSHELF_ANALYSISFORECAST_WAV_004_014', 'cmems_mod_nws_wav_anfc_1.5km_PT1H-i', '202511'],
  'baltic-wave': ['wave', 'BALTICSEA_ANALYSISFORECAST_WAV_003_010', 'cmems_mod_bal_wav_anfc_PT1H-i', '202311'],
  'nws-level': ['waterLevel', 'NWSHELF_ANALYSISFORECAST_PHY_004_013', 'cmems_mod_nws_phy-ssh_anfc_1.5km-2D_PT1H-i', '202511'],
  'baltic-level': ['waterLevel', 'BALTICSEA_ANALYSISFORECAST_PHY_003_006', 'cmems_mod_bal_phy_anfc_PT1H-i', '202411'],
  'nws-temperature': ['waterTemperature', 'NWSHELF_ANALYSISFORECAST_PHY_004_013', 'cmems_mod_nws_phy-sst_anfc_1.5km-2D_PT1H-i', '202511'],
  'baltic-temperature': ['waterTemperature', 'BALTICSEA_ANALYSISFORECAST_PHY_003_006', 'cmems_mod_bal_phy_anfc_PT1H-i', '202411'],
};

export function copernicusComponentUtcHour(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:00:00(?:\.000)?Z$/.test(value)) return null;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 19) !== value.slice(0, 19)) return null;
  return new Date(ms).toISOString();
}

/** Runs offline original-byte admission; no transport/provider path is enabled. */
export async function loadCopernicusComponentAuthority({ planPath, bankPath, cacheDirectory,
  pythonExecutable = process.env.PYTHON ?? 'python', timeoutMs = 120_000, previousTargetsPath,
  planInputPath, transportBudget,
} = {}) {
  if (![planPath ?? planInputPath, bankPath, cacheDirectory].every(value => typeof value === 'string' && value)
    || Boolean(planPath) === Boolean(planInputPath)
    || !finite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 3_600_000) {
    throw new Error('CP_COMPONENT_AUTHORITY_ARGUMENTS_INVALID');
  }
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-cp-component-authority-'));
  try {
    const output = path.join(temporary, 'authority.json');
    const args = [RUNNER, planInputPath ? '--plan-input' : '--plan', path.resolve(planInputPath ?? planPath), '--bank', path.resolve(bankPath),
      '--cache-directory', path.resolve(cacheDirectory), '--output', output];
    if (transportBudget) {
      const { budgetMs, requestTimeoutMs, maximumRequests, maximumDownloadBytes } = transportBudget;
      if (!finite(budgetMs) || budgetMs <= 0 || budgetMs > 3_300_000 || !finite(requestTimeoutMs)
        || requestTimeoutMs <= 0 || requestTimeoutMs > budgetMs || !Number.isInteger(maximumRequests)
        || maximumRequests < 1 || !Number.isSafeInteger(maximumDownloadBytes) || maximumDownloadBytes < 1) {
        throw new Error('CP_COMPONENT_TRANSPORT_BUDGET_INVALID');
      }
      args.push('--budget-seconds', String(budgetMs / 1000), '--request-timeout-seconds', String(requestTimeoutMs / 1000),
        '--maximum-requests', String(maximumRequests), '--maximum-download-bytes', String(maximumDownloadBytes));
    } else args.push('--verify-only');
    if (previousTargetsPath) args.push('--previous-targets', path.resolve(previousTargetsPath));
    await new Promise((resolve, reject) => {
      const child = spawn(pythonExecutable, args, { cwd: ROOT, windowsHide: true, detached: process.platform !== 'win32',
        stdio: 'ignore', env: { ...process.env, PYTHONUTF8: '1' } });
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        // Kill the owned worker subtree as well, never leave a subset request
        // running after the normal-weather budget has ended.
        if (process.platform === 'win32' && child.pid) {
          const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
          killer.once('error', () => child.kill());
        } else if (child.pid) {
          try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
        }
      }, timeoutMs);
      child.once('error', () => { clearTimeout(timer); reject(new Error('CP_COMPONENT_BYTE_VERIFIER_UNAVAILABLE')); });
      child.once('close', code => {
        clearTimeout(timer);
        if (timedOut) reject(new Error('CP_COMPONENT_BYTE_VERIFICATION_TIMEOUT'));
        else if (code === 0) resolve();
        else reject(new Error('CP_COMPONENT_BYTE_VERIFICATION_FAILED'));
      });
    });
    const document = JSON.parse(await fs.readFile(output, 'utf8'));
    if (document.kind !== 'RAVRADAR_PRIVATE_CP_COMPONENT_AUTHORITY' || document.schemaVersion !== 1
      || document.originalBytesVerified !== true || document.spatialPolicy?.policyId !== POLICY.policyId
      || !Array.isArray(document.targets) || !Array.isArray(document.stage?.candidates)
      || !Array.isArray(document.stage?.privateSupportCandidates)) {
      throw new Error('CP_COMPONENT_BYTE_AUTHORITY_INVALID');
    }
    const handle = Object.freeze({});
    authorities.set(handle, document);
    return Object.freeze({ authority: handle,
      candidates: structuredClone(document.stage.candidates),
      privateSupportCandidates: structuredClone(document.stage.privateSupportCandidates),
      status: document.stage.status, remainingNeeds: structuredClone(document.stage.remainingNeeds),
      recordFailures: structuredClone(document.recordFailures), attempts: structuredClone(document.attempts ?? []),
      bankSha256: document.persistedBankSha256 ?? null,
      invalidOriginalRecordsReleasedForRetry: document.invalidOriginalRecordsReleasedForRetry ?? 0 });
  } finally {
    // Only this newly created, explicit temporary directory is removed.
    await fs.rm(temporary, { recursive: true, force: true });
  }
}

function valuesValid(candidate) {
  const v = candidate.values, units = candidate.source?.units;
  if (!v || !units) return false;
  if (candidate.component === 'wave') return Object.keys(v).sort().join(',') === 'waveDirectionDeg,waveHeightM,wavePeriodS'
    && finite(v.waveHeightM) && v.waveHeightM >= 0 && finite(v.wavePeriodS) && v.wavePeriodS >= 0
    && (v.waveHeightM === 0 || v.wavePeriodS > 0)
    && (v.waveHeightM === 0 && v.waveDirectionDeg === null
      || finite(v.waveDirectionDeg) && v.waveDirectionDeg >= 0 && v.waveDirectionDeg < 360)
    && units.waveHeightM === 'm' && units.wavePeriodS === 's' && units.waveDirectionDeg === 'degree-from-true-north'
    && candidate.source.wavePeriodSemantics === 'peak' && candidate.source.wavePeriodField === 'VTPK';
  if (candidate.component === 'waterTemperature') return Object.keys(v).join(',') === 'waterTemperatureC'
    && finite(v.waterTemperatureC) && v.waterTemperatureC >= -5 && v.waterTemperatureC <= 45
    && units.waterTemperatureC === 'degC';
  return false;
}

/** This constructor refuses invented authority, even for a correctly sealed row. */
export function validateCopernicusComponentCandidates(candidates, { parts, authority } = {}) {
  const authorized = authorities.get(authority);
  if (!authorized || !Array.isArray(candidates) || !Array.isArray(parts)) {
    throw new Error('CP_COMPONENT_VERIFIED_BYTE_AUTHORITY_REQUIRED');
  }
  const central = new Map(parts.map(part => [part.partId, {
    partId: part.partId, parentZoneId: part.zoneId ?? part.parentZoneId ?? part.sourceZoneId, waterPoint: part.waterPoint,
  }]));
  if (central.size !== parts.length || central.size !== authorized.targets.length
    || authorized.targets.some(t => {
      const p = central.get(t.partId);
      return !p || p.parentZoneId !== t.parentZoneId || !samePoint(p.waterPoint, t.waterPoint);
    })) throw new Error('CP_COMPONENT_CENTRAL_TARGETS_MISMATCH');
  const authorizedHashes = new Set([...authorized.stage.candidates, ...authorized.stage.privateSupportCandidates]
    .map(row => row.projection.projectionSha256));
  const records = new Map();
  for (const candidate of candidates) {
    if (candidate?.component === 'waterLevel') continue;
    const source = candidate?.source, part = central.get(candidate?.partId), pin = PINNED[source?.contractKey];
    const time = copernicusComponentUtcHour(candidate?.time);
    const certificate = source?.spatialAdmission, witness = certificate?.witness;
    const staticEvidence = witness?.static;
    const staticPin = POLICY.contracts[source?.contractKey];
    if (!part || !pin || !time || !verifyCopernicusComponentProjection(candidate)
      || !authorizedHashes.has(candidate.projection.projectionSha256) || !valuesValid(candidate)
      || source.provider !== 'copernicus' || candidate.component !== pin[0] || source.component !== pin[0]
      || source.productId !== pin[1] || source.datasetId !== pin[2] || source.datasetVersion !== pin[3]
      || source.entityId !== `PART::${part.partId}` || source.parentZoneId !== part.parentZoneId
      || source.entityType !== 'coastal-part' || source.samplingContext !== 'coastal-part-water-point'
      || !samePoint(source.samplingPoint, part.waterPoint) || !samePoint(source.gridPoint, staticEvidence?.gridPoint)
      || copernicusComponentUtcHour(source.validTime) !== time || !finite(source.distanceKm)
      || source.distanceKm < 0 || source.distanceKm > Number(POLICY.maximumDistanceKm)
      || source.nativeValidTimes?.length !== 1 || copernicusComponentUtcHour(source.nativeValidTimes[0]) !== time
      || source.timeResolution !== 'native' || certificate.policyId !== POLICY.policyId
      || certificate.policySha256 !== authorized.spatialPolicy.policySha256
      || certificate.recordId !== source.recordId || certificate.targetRegistrySha256 !== source.targetRegistrySha256
      || ![source.recordId, source.requestSha256, source.subsetSha256, source.targetRegistrySha256].every(value => HASH.test(value))
      || !staticPin || staticEvidence.mask !== 1 || !finite(staticEvidence.depthM)
      || !(staticPin.depthComparison === '>=' ? staticEvidence.depthM >= Number(staticPin.minimumDepthM)
        : staticEvidence.depthM > Number(staticPin.minimumDepthM))
      || staticEvidence.request.datasetId !== staticPin.staticDatasetId || staticEvidence.request.datasetVersion !== staticPin.staticVersion
      || staticEvidence.request.datasetPart !== 'bathy' || staticEvidence.receipt.subsetSha256 !== staticEvidence.subsetSha256
      || witness.dynamicRequest.requestSha256 !== source.requestSha256
      || witness.dynamicReceipt.requestSha256 !== source.requestSha256 || witness.dynamicReceipt.subsetSha256 !== source.subsetSha256
      || witness.dynamicSubsetSha256 !== source.subsetSha256 || witness.recordId !== source.recordId
      || certificate.evidenceSha256 !== sealCopernicusComponentProjection({ spatialWitness: witness }).projectionSha256) {
      throw new Error('CP_COMPONENT_CANDIDATE_ADMISSION_FAILED');
    }
    if (candidate.eligibleForRequestedPurpose !== true) continue;
    const key = `${part.partId}\u0000${time}\u0000${candidate.component}`;
    const previous = records.get(key);
    const previousRun = Date.parse(previous?.source?.modelRun ?? '');
    const newRun = Date.parse(source.modelRun ?? '');
    if (!previous || Number.isFinite(newRun) && (!Number.isFinite(previousRun) || newRun > previousRun)) {
      records.set(key, structuredClone(candidate));
    }
  }
  const handle = Object.freeze({});
  indexes.set(handle, { records, central });
  return handle;
}

export function selectedCopernicusComponentRecord(handle, { part, validTime, component } = {}) {
  if (component === 'waterLevel') return null;
  const index = indexes.get(handle), time = copernicusComponentUtcHour(validTime);
  const expected = index?.central.get(part?.partId);
  if (!index || !expected || !time || expected.parentZoneId !== (part.zoneId ?? part.parentZoneId ?? part.sourceZoneId)
    || !samePoint(expected.waterPoint, part.waterPoint)) return null;
  const result = index.records.get(`${part.partId}\u0000${time}\u0000${component}`);
  // Keep original Z times/projection untouched; lookups alone are canonicalised.
  return result ? structuredClone(result) : null;
}
