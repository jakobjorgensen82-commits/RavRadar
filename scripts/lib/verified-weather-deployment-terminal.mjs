import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SUCCESS = 'success';
const DIAGNOSTIC_OUTCOMES = new Set(['success', 'failure']);

function normalized(value) {
  return String(value ?? '').trim();
}

/**
 * One terminal contract shared by scheduled/normal production and the bounded
 * manual weather entry. Full validation and release checks are diagnostics
 * after DEC-0193: they must have run and remain visible, but a reported
 * finding cannot turn an already sealed and publicly verified deployment into
 * a false delivery failure. Every actual artifact/privacy/deployment boundary
 * remains mandatory.
 */
export function classifyVerifiedWeatherDeployment(input = {}) {
  const requiredSuccess = [
    'targetOutcome',
    'buildOutcome',
    'weatherOutcome',
    'pagesBuildOutcome',
    'pagesPrivacyOutcome',
    'pagesArtifactSealOutcome',
    'deployJobOutcome',
    'deploymentOutcome',
    'publicVerificationOutcome',
  ];
  const failedBoundary = requiredSuccess.find(key => normalized(input[key]) !== SUCCESS);
  if (failedBoundary) {
    return Object.freeze({
      status: 'FAILED',
      reasonCode: 'VERIFIED_WEATHER_DEPLOYMENT_BOUNDARY_INCOMPLETE',
      failedBoundary,
      diagnosticFindings: false,
    });
  }
  if (input.shouldDeploy !== true && input.shouldDeploy !== 'true') {
    return Object.freeze({
      status: 'FAILED',
      reasonCode: 'VERIFIED_WEATHER_DEPLOYMENT_BOUNDARY_INCOMPLETE',
      failedBoundary: 'shouldDeploy',
      diagnosticFindings: false,
    });
  }
  if (input.artifactBuilt !== true && input.artifactBuilt !== 'true') {
    return Object.freeze({
      status: 'FAILED',
      reasonCode: 'VERIFIED_WEATHER_DEPLOYMENT_BOUNDARY_INCOMPLETE',
      failedBoundary: 'artifactBuilt',
      diagnosticFindings: false,
    });
  }
  if (input.deployedVerified !== true && input.deployedVerified !== 'true') {
    return Object.freeze({
      status: 'FAILED',
      reasonCode: 'VERIFIED_WEATHER_DEPLOYMENT_BOUNDARY_INCOMPLETE',
      failedBoundary: 'deployedVerified',
      diagnosticFindings: false,
    });
  }
  const fullValidationOutcome = normalized(input.fullValidationOutcome);
  const releaseGateOutcome = normalized(input.releaseGateOutcome);
  if (!DIAGNOSTIC_OUTCOMES.has(fullValidationOutcome)
    || !DIAGNOSTIC_OUTCOMES.has(releaseGateOutcome)) {
    return Object.freeze({
      status: 'FAILED',
      reasonCode: 'WEATHER_DIAGNOSTICS_NOT_COMPLETED',
      failedBoundary: null,
      diagnosticFindings: false,
    });
  }
  const diagnosticFindings = fullValidationOutcome === 'failure'
    || releaseGateOutcome === 'failure';
  return Object.freeze({
    status: 'DEPLOYED',
    reasonCode: diagnosticFindings
      ? 'PUBLIC_DEPLOYMENT_VERIFIED_WITH_DIAGNOSTIC_FINDINGS'
      : 'PUBLIC_DEPLOYMENT_VERIFIED',
    failedBoundary: null,
    diagnosticFindings,
  });
}

function cliInput(env) {
  return {
    targetOutcome: env.TARGET_RESULT,
    buildOutcome: env.BUILD_RESULT,
    shouldDeploy: env.SHOULD_DEPLOY,
    weatherOutcome: env.WEATHER_OUTCOME,
    fullValidationOutcome: env.FULL_VALIDATION_OUTCOME,
    releaseGateOutcome: env.RELEASE_GATE_OUTCOME,
    pagesBuildOutcome: env.PAGES_BUILD_OUTCOME,
    pagesPrivacyOutcome: env.PAGES_PRIVACY_OUTCOME,
    pagesArtifactSealOutcome: env.PAGES_ARTIFACT_SEAL_OUTCOME,
    artifactBuilt: env.ARTIFACT_BUILT,
    deployJobOutcome: env.DEPLOY_RESULT,
    deploymentOutcome: env.DEPLOYMENT_OUTCOME,
    publicVerificationOutcome: env.PUBLIC_VERIFICATION_OUTCOME,
    deployedVerified: env.DEPLOYED_VERIFIED,
  };
}

function main() {
  const result = classifyVerifiedWeatherDeployment(cliInput(process.env));
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `\n- Terminal: \`${result.status}\` / \`${result.reasonCode}\`\n`, 'utf8');
  }
  process.stdout.write(`${result.status} ${result.reasonCode}\n`);
  if (result.status !== 'DEPLOYED') process.exitCode = 1;
}

if (process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main();
}
