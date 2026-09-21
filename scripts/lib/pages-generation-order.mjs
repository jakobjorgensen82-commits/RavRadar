import crypto from 'node:crypto';
import { sha256CanonicalJson } from '../ravscore-operational-pages-recovery.mjs';

const hash = text => crypto.createHash('sha256').update(text).digest('hex');

export async function readBoundedPublicManifest(response, maxBytes = 1024 * 1024) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Public manifest response has no readable body');
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error('Public manifest exceeds generation admission bound');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, total));
}

function reference(manifest) {
  const value = manifest?.productionReferenceAt;
  if (manifest?.complete !== true || manifest?.zoneCount !== 210
    || typeof manifest?.datasetId !== 'string' || !manifest.datasetId
    || !/^\d{4}-\d\d-\d\dT\d\d:00:00(?:\.000)?Z$/.test(value ?? '')
    || !Number.isFinite(Date.parse(value))) throw new Error('Invalid public generation identity');
  return Date.parse(value);
}

// Admission is performed while the caller owns the shared production lock,
// before durable begin and again directly before Pages, never after publication.
export function assertMonotonicPagesGeneration({ targetText, publicText, reuseReport = null,
  recoverySourceSha256 = null }) {
  const target = JSON.parse(targetText), current = JSON.parse(publicText);
  const nextTime = reference(target), priorTime = reference(current);
  if (nextTime < priorTime) throw new Error('Pages target is older than the public weather generation');
  if (recoverySourceSha256 !== null) {
    if (!/^[a-f0-9]{64}$/.test(recoverySourceSha256)
      || (sha256CanonicalJson(current) !== recoverySourceSha256
        && sha256CanonicalJson(current) !== sha256CanonicalJson(target))) {
      throw new Error('Recovery no longer has its sealed public predecessor or target');
    }
    return 'EXACT_RECOVERY_GENERATION';
  }
  if (reuseReport) {
    if (reuseReport.sourcePublicManifestSha256 !== hash(publicText)
      || reuseReport.generatedPublicManifestSha256 !== hash(targetText)
      || reuseReport.sourceDatasetId !== current.datasetId
      || reuseReport.datasetId !== target.datasetId
      || reuseReport.productionReferenceAt !== target.productionReferenceAt
      || reuseReport.providerRequestsPerformed !== false
      || reuseReport.privatePayloadIncluded !== false) {
      throw new Error('Pages reuse no longer has its exact public predecessor');
    }
    if (nextTime === priorTime && reuseReport.publicRuntimeAdvanced !== false) {
      throw new Error('Saved weather must advance the production hour');
    }
    return 'EXACT_REUSE_PREDECESSOR';
  }
  if (nextTime === priorTime) {
    const nextGenerated = Date.parse(target.generatedAt), priorGenerated = Date.parse(current.generatedAt);
    if (!Number.isFinite(nextGenerated) || !Number.isFinite(priorGenerated)
      || nextGenerated <= priorGenerated || target.datasetId === current.datasetId) {
      throw new Error('Same-hour weather must be a strictly newer generation; code-only needs exact reuse proof');
    }
  }
  return 'FORWARD_WEATHER_GENERATION';
}
