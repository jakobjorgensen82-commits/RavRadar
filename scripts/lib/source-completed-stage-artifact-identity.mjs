import { createHash } from 'node:crypto';

const utc = value => typeof value === 'string'
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const numericId = value => typeof value === 'string' && /^[1-9][0-9]*$/.test(value)
  && Number.isSafeInteger(Number(value));

// A locator for the encrypted artifact, not proof that B or S was published.
// Including the attempt avoids a stable private-bundle fingerprint.
export function sourceCompletedStageArtifactName({repository,sourceHead,runId,runAttempt,generation}){
  const {datasetId,productionReferenceAt,generatedAt,bundleContentSha256}=generation;
  if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository??'')
    || !/^[a-f0-9]{40}$/.test(sourceHead??'') || !numericId(runId) || !numericId(runAttempt)
    || !/^[a-z0-9][a-z0-9._-]{0,127}$/.test(datasetId??'')
    || !utc(productionReferenceAt) || !/T\d{2}:00:00[.]000Z$/.test(productionReferenceAt)
    || !utc(generatedAt) || !/^[a-f0-9]{64}$/.test(bundleContentSha256??'')){
    throw new Error('SOURCE_COMPLETED_ARTIFACT_IDENTITY_INVALID');
  }
  const digest=createHash('sha256').update(JSON.stringify([
    'ravradar-source-completed-stage-v1',repository,sourceHead,runId,runAttempt,
    datasetId,productionReferenceAt,generatedAt,bundleContentSha256,
  ])).digest('hex');
  return 'ravradar-private-build-stage-'+runId+'-'+runAttempt+'-source-'+digest;
}
