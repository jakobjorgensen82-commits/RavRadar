import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createProtectedRavScoreCheckpointDiagnosticRequester,
  createProtectedRavScoreCheckpointRpcRequester,
  createProtectedRavScoreCheckpointVersionRequester,
  publishProtectedRavScoreContinuationCheckpoint,
} from './protected-ravscore-continuation-checkpoint.mjs';

export function rawCheckpointPublicationOutputs(result, metadata, targetReference) {
  if (!Number.isSafeInteger(result.centralVersion) || result.centralVersion < 1
    || result.checkpointAt !== targetReference
    || metadata?.productionReferenceAt !== targetReference
    || metadata.centralVersion !== result.centralVersion
    || typeof metadata.generationSha256 !== 'string'
    || !/^[a-f0-9]{64}$/.test(metadata.generationSha256)) {
    throw new Error('RAW_PUBLICATION_RECEIPT_UNAVAILABLE');
  }
  return `raw_s_central_version=${result.centralVersion}\n`
    + `raw_s_generation_sha256=${metadata.generationSha256}\n`;
}

async function main() {
  if (process.argv.length !== 3) throw new Error('Exactly one target reference is required');
  const targetReference = new Date(process.argv[2]).toISOString();
  const rpcRequest = createProtectedRavScoreCheckpointRpcRequester();
  let metadata;
  const result = await publishProtectedRavScoreContinuationCheckpoint({
    targetReference,
    request: createProtectedRavScoreCheckpointVersionRequester(),
    diagnosticRequest: createProtectedRavScoreCheckpointDiagnosticRequester(),
    rpcRequest: async (body, operation) => {
      metadata = await rpcRequest(body, operation);
      return metadata;
    },
  });

  try {
    const outputPath = process.env.GITHUB_OUTPUT;
    if (!path.isAbsolute(outputPath ?? '')) throw new Error('Missing GitHub output');
    await fs.appendFile(outputPath, rawCheckpointPublicationOutputs(result, metadata, targetReference));
  } catch {
    // Publication has already been verified. A missing receipt prevents RAW retirement.
    console.warn('RAW_PUBLICATION_RECEIPT_UNAVAILABLE');
  }
  console.log(JSON.stringify(result));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.safeDiagnostic
      ? `${error.message} [${error.safeDiagnostic}]` : error.message);
    if (error.safeShapeSummary) console.error(JSON.stringify(error.safeShapeSummary));
    if (error.safeRejectionReasons) console.error(JSON.stringify(error.safeRejectionReasons));
    process.exitCode = 1;
  });
}
