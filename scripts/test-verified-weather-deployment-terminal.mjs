import assert from 'node:assert/strict';
import { classifyVerifiedWeatherDeployment } from './lib/verified-weather-deployment-terminal.mjs';

const base = () => ({
  targetOutcome: 'success',
  buildOutcome: 'success',
  shouldDeploy: true,
  weatherOutcome: 'success',
  fullValidationOutcome: 'success',
  releaseGateOutcome: 'success',
  pagesBuildOutcome: 'success',
  pagesPrivacyOutcome: 'success',
  pagesArtifactSealOutcome: 'success',
  artifactBuilt: true,
  deployJobOutcome: 'success',
  deploymentOutcome: 'success',
  publicVerificationOutcome: 'success',
  deployedVerified: true,
});

assert.deepEqual(classifyVerifiedWeatherDeployment(base()), {
  status: 'DEPLOYED',
  reasonCode: 'PUBLIC_DEPLOYMENT_VERIFIED',
  failedBoundary: null,
  diagnosticFindings: false,
});
for (const key of ['fullValidationOutcome', 'releaseGateOutcome']) {
  assert.deepEqual(classifyVerifiedWeatherDeployment({ ...base(), [key]: 'failure' }), {
    status: 'DEPLOYED',
    reasonCode: 'PUBLIC_DEPLOYMENT_VERIFIED_WITH_DIAGNOSTIC_FINDINGS',
    failedBoundary: null,
    diagnosticFindings: true,
  });
  assert.equal(
    classifyVerifiedWeatherDeployment({ ...base(), [key]: 'skipped' }).reasonCode,
    'WEATHER_DIAGNOSTICS_NOT_COMPLETED',
  );
}
for (const key of [
  'targetOutcome', 'buildOutcome', 'weatherOutcome', 'pagesBuildOutcome',
  'pagesPrivacyOutcome', 'pagesArtifactSealOutcome', 'deployJobOutcome',
  'deploymentOutcome', 'publicVerificationOutcome',
]) {
  const result = classifyVerifiedWeatherDeployment({ ...base(), [key]: 'failure' });
  assert.equal(result.status, 'FAILED');
  assert.equal(result.failedBoundary, key);
}
for (const key of ['shouldDeploy', 'artifactBuilt', 'deployedVerified']) {
  const result = classifyVerifiedWeatherDeployment({ ...base(), [key]: false });
  assert.equal(result.status, 'FAILED');
  assert.equal(result.failedBoundary, key);
}

const sourceSaved = { ...base(), sourceSavedPair:true, sourceSavedPairOutcome:'success',
  completedRuntimeOutcome:'success', weatherOutcome:'skipped' };
assert.equal(classifyVerifiedWeatherDeployment(sourceSaved).status,'DEPLOYED');
for (const key of ['sourceSavedPairOutcome','completedRuntimeOutcome','fullValidationOutcome','releaseGateOutcome']) {
  const result=classifyVerifiedWeatherDeployment({...sourceSaved,[key]:'skipped'});
  assert.equal(result.status,'FAILED');
  assert.equal(result.failedBoundary,key);
}
assert.equal(classifyVerifiedWeatherDeployment({...sourceSaved,weatherOutcome:'success'}).failedBoundary,'weatherOutcome');
assert.equal(classifyVerifiedWeatherDeployment({...sourceSaved,completedPrivateRuntime:true}).reasonCode,'SOURCE_SAVED_RUNTIME_REQUEST_CONFLICT');
assert.equal(classifyVerifiedWeatherDeployment({...sourceSaved,fullValidationOutcome:'failure'}).status,'FAILED');
console.log('Verified weather deployment terminal tests passed.');
