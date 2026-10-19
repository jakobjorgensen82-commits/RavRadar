// Read-only native prewrite/readback and strict normal runtime audit.
// No installer, metadata-only transition, bool receipt or numerical waiver.
import assert from 'node:assert/strict';
import {requireLastMileEnclosureBinding,requireLastMileEnclosureOutput,LAST_MILE_ENCLOSURE_BEFORE}
  from './lib/last-mile-enclosure-successor-source.mjs';
import {assertVerifiedUnpairedWeatherRestartArchive} from './lib/weather-state-epoch-archive.mjs';
import {prepareArchivedCurrentOriginRestart} from './lib/established-native-current-origin.mjs';
import {verifyLastMileEnclosurePlan,assertLastMileEnclosurePlanCaller} from './verify-last-mile-enclosure-plan.mjs';
import {verifyIntegratedDatabaseReadback} from './integrated-cutover-readiness.mjs';
import {verifyInstalledStatisticsPreferenceRevisionSchema} from './verify-account-assistant-schema.mjs';
import {ravScoreModelBinding,assertRavScoreModelBinding} from '../js/core/ravscore-model-contract.js';
import {ravScoreModelBinding as candidateBinding,assertRavScoreModelBinding as assertCandidateBinding}
  from './rollback-assets/ravscore-model-contract.js';
import {privateRuntimeContractHashes} from './private-production-runtime-workflow.mjs';
import {auditIntegratedRavScorePublicRuntime} from './audit-ravscore-integrated-public-runtime.mjs';
import {hydratePrivateConditionsHourly} from './lib/private-conditions-hourly.mjs';
function exact(value,required,optional=[]){assert(value&&Object.getPrototypeOf(value)===Object.prototype);
  const keys=Object.keys(value);assert(required.every(key=>keys.includes(key))
    &&keys.every(key=>[...required,...optional].includes(key)),'LAST_MILE_ENCLOSURE_FIXED_READINESS_ARGUMENTS');}
async function actualTuple(){
  const next=requireLastMileEnclosureBinding(),I=ravScoreModelBinding(),C=candidateBinding();
  assertRavScoreModelBinding(I);assertCandidateBinding(C);
  const contracts=await privateRuntimeContractHashes();
  assert.equal(I.modelBundleSha256,next.I);assert.equal(C.modelBundleSha256,next.C);
  assert.equal(contracts.continuationStateContractSha256,next.T);return {I,C};
}
async function schema2({accessToken,fetchImpl}){
  const result=await verifyInstalledStatisticsPreferenceRevisionSchema({accessToken,...(fetchImpl===undefined?{}:{fetchImpl})});
  assert.equal(result.status,'ACCOUNT_STATISTICS_REVISION_SCHEMA_MATCH');assert.equal(result.schemaVersion,2);return result;
}
export async function verifyLastMileEnclosurePrewriteReadiness(options){
  requireLastMileEnclosureOutput(); // FIRST before archive, paths, environment or credentials.
  assert.equal(arguments.length,1);
  exact(options,['archiveCapability','centralContract','targetReferenceAt','migrationListText','dryRunText',
    'migrationsDirectory','environment','url','serviceRoleKey','accessToken'],['fetchImpl']);
  const value=assertVerifiedUnpairedWeatherRestartArchive(options.archiveCapability); // Not a JSON/callback receipt.
  assertLastMileEnclosurePlanCaller(options.environment);
  assert.equal(options.environment.RAVRADAR_LAST_MILE_ENCLOSURE_UPGRADE_OPT_IN,'true');
  assert.equal(options.environment.RAVRADAR_WEATHER_CACHE_ONLY,'true');
  await verifyLastMileEnclosurePlan({phase:'before',migrationListText:options.migrationListText,
    dryRunText:options.dryRunText,migrationsDirectory:options.migrationsDirectory,environment:options.environment});
  await actualTuple();
  assert.equal(value.B.description.modelBinding.modelBundleSha256,LAST_MILE_ENCLOSURE_BEFORE.I);
  assert.equal(value.S.modelBinding.modelBundleSha256,LAST_MILE_ENCLOSURE_BEFORE.I);
  const oldCandidate=value.S.payload.candidateGRollbackCompanion?.modelBinding;
  assert.equal(oldCandidate?.modelBundleSha256,LAST_MILE_ENCLOSURE_BEFORE.C);
  await verifyIntegratedDatabaseReadback({url:options.url,serviceRoleKey:options.serviceRoleKey,
    modelBinding:value.S.modelBinding,candidateModelBinding:oldCandidate,
    sourcePhase:'established-native-current-origin',...(options.fetchImpl===undefined?{}:{fetchImpl:options.fetchImpl})});
  await schema2(options);
  // LAST: this genuine factory rechecks live B/S, old producer Git, original B
  // bytes, actual source and registry after the metadata reads. Its opaque
  // handle is NOT serialized. The normal final prewrite process must call this
  // function itself immediately before its controlled sole SQL application.
  await prepareArchivedCurrentOriginRestart(options.archiveCapability,{centralContract:options.centralContract,
    targetReferenceAt:options.targetReferenceAt});
  // Capability identity alone is NOT a live-pointer revalidation.
  assert.equal(assertVerifiedUnpairedWeatherRestartArchive(options.archiveCapability),value);
  return Object.freeze({kind:'LAST_MILE_ENCLOSURE_NATIVE_PREWRITE_READINESS',admission:'NO_ADMISSION',
    predecessorVersion:LAST_MILE_ENCLOSURE_BEFORE.version,archiveId:value.archiveId,
    archiveCatalogSha256:value.archiveCatalogSha256,targetReferenceAt:value.targetReferenceAt,
    actualCheckpointTripAndSchema2Readback:true,sqlExecuted:false,originalPairsAdmitted:false});
}
export async function verifyLastMileEnclosureInstalledReadiness(options){
  requireLastMileEnclosureOutput();assert.equal(arguments.length,1);
  exact(options,['migrationListText','dryRunText','migrationsDirectory','environment','url','serviceRoleKey','accessToken'],['fetchImpl']);
  assertLastMileEnclosurePlanCaller(options.environment);
  assert.equal(options.environment.RAVRADAR_LAST_MILE_ENCLOSURE_UPGRADE_OPT_IN,'false');
  await verifyLastMileEnclosurePlan({phase:'installed',migrationListText:options.migrationListText,
    dryRunText:options.dryRunText,migrationsDirectory:options.migrationsDirectory,environment:options.environment});
  const {I,C}=await actualTuple();
  await verifyIntegratedDatabaseReadback({url:options.url,serviceRoleKey:options.serviceRoleKey,
    modelBinding:I,candidateModelBinding:C,sourcePhase:'last-mile-enclosure',
    ...(options.fetchImpl===undefined?{}:{fetchImpl:options.fetchImpl})});
  await schema2(options);
  return Object.freeze({kind:'LAST_MILE_ENCLOSURE_INSTALLED_READBACK',admission:'NO_ADMISSION',
    actualCheckpointTripAndSchema2Readback:true,sqlExecuted:false,weatherPublished:false});
}
export function assertLastMileEnclosureRuntimeAudit(options){
  requireLastMileEnclosureOutput();assert.equal(arguments.length,1);
  exact(options,['full','startup','startupText','details','detailsText','coastalPartsText','zoneRegistryText','manifest','targetReferenceAt']);
  assertRavScoreModelBinding(options.manifest.ravScoreModelBinding);
  assert.equal(options.full.productionReferenceAt,options.targetReferenceAt);
  assert.equal(options.manifest.productionReferenceAt,options.targetReferenceAt);
  assert.equal(options.full.datasetId,options.manifest.datasetId);
  // Execute the actual existing audit; a caller's saved {status:'passed'} is
  // deliberately NOT an accepted input or a saved-weather warning exception.
  const report=auditIntegratedRavScorePublicRuntime(hydratePrivateConditionsHourly(options.full),{
    startup:options.startup,startupText:options.startupText,details:options.details,detailsText:options.detailsText,
    coastalPartsText:options.coastalPartsText,zoneRegistryText:options.zoneRegistryText,manifest:options.manifest});
  assert.equal(report.status,'passed','LAST_MILE_ENCLOSURE_ACTUAL_RUNTIME_AUDIT_REQUIRED');
  assert.equal(report.coverage.zoneCount,210);assert.equal(report.coverage.partCount,673);
  return report;
}
