import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RELEASE_GATE_TEST_FILES } from './lib/release-gate-test-plan.mjs';
import { createRequiredFileReader } from './lib/release-gate-required-files.mjs';
import {
  PRODUCTION_WORKFLOW_SOURCES,
  readProductionWorkflowSources,
} from './lib/production-workflow-sources.mjs';
import {
  RAVSCORE_BEST_TIME_POLICY_ID,
  RAVSCORE_COMPONENT_SCHEMA_ID,
  RAVSCORE_CURRENT_SUPPLY_POLICY,
  RAVSCORE_EXPLANATION_SCHEMA_ID,
  RAVSCORE_HUNTABILITY_POLICY,
  RAVSCORE_HISTORY_UNCERTAINTY_POLICY,
  RAVSCORE_LAST_MILE_POLICY,
  RAVSCORE_MODEL_BUNDLE_SHA256,
  RAVSCORE_MODEL_CONTRACT_SHA256,
  RAVSCORE_MODEL_CONTRACT,
  RAVSCORE_MODEL_ID,
  RAVSCORE_PRESENTATION_POLICY,
  RAVSCORE_PRESENTATION_POLICY_ID,
  RAVSCORE_PROFILE_ID,
  RAVSCORE_PUBLIC_FORECAST_HOURS,
  RAVSCORE_RANKING_POLICY_ID,
  RAVSCORE_STATE_SCHEMA_VERSION,
  RAVSCORE_SCORE_QUALITY,
  RAVSCORE_VARIANT_ID,
  RAVSCORE_WAVE_MOBILISATION_POLICY,
  RAVSCORE_WEIGHTS,
} from '../js/core/ravscore-model-contract.js';
import {
  CANDIDATE_G_ROLLBACK_MODEL_ID,
  PUBLIC_RAVSCORE_PROFILE_SELECTION,
} from '../js/core/ravscore-public-model.js';
import { assertIntegratedRavScoreSelection } from './lib/ravscore-profile-transition.mjs';
import {
  RAVSCORE_MODEL_BUNDLE_SHA256 as CANDIDATE_G_MODEL_BUNDLE_SHA256,
  RAVSCORE_MODEL_CONTRACT_SHA256 as CANDIDATE_G_MODEL_CONTRACT_SHA256,
} from './rollback-assets/ravscore-model-contract.js';

const errors=[];
const ok=(cond,msg)=>{if(!cond)errors.push(msg)};
const root=process.cwd();
const {readText:read,readJson}=createRequiredFileReader(root,errors);
const exists=async rel=>{try{await fs.access(path.join(root,rel));return true}catch{return false}};
const pkg=await readJson('package.json',{scripts:{}});
const packageScripts=pkg&&typeof pkg.scripts==='object'&&pkg.scripts!==null?pkg.scripts:{};
const version=typeof pkg.version==='string'?pkg.version:'';
ok(Boolean(version),'package.json mangler en gyldig releaseversion');

for(const rel of RELEASE_GATE_TEST_FILES){
  const result=spawnSync(process.execPath,[rel],{cwd:root,stdio:'inherit'});
  ok(result.status===0,`Den integrerede RavScore-releasekontrakt fejlede: ${rel}`);
}

const exactVersionFiles=['version.json','data/kystdata.json','data/zones.geojson','docs/handbook/content.json'];
for(const rel of exactVersionFiles){
  const doc=await readJson(rel,{});
  const value=rel.includes('handbook')?doc.handbookVersion:doc.version;
  ok(value===version,`${rel}: forventede ${version}, fandt ${value}`);
}
for(const rel of ['index.html','admin.html','service-worker.js','app.js','js/ui/admin-dashboard.js','HANDBOOK-RAVRADAR.md','docs/rdks/MASTER_LOG.md',`CHANGELOG-${version}.md`]){
  const text=await read(rel); ok(text.includes(version),`${rel} mangler releaseversion ${version}`);
}
const handbook=await readJson('docs/handbook/content.json',{sections:[]});
const handbookSections=Array.isArray(handbook.sections)?handbook.sections:[];
ok(handbookSections.length>=51,'Håndbogen skal indeholde mindst 51 kapitler');
for(const id of ['rav-egenskaber','tilstedevaerelse','boelger','stroem','vind','vandstand','langskyst','undertow','sortering','vegetation','kystmorfologi','stormforloeb','aflejring','jagtbarhed','score-implementering','procesindikator','retninger','regler','eksperimentdesign','stationer','admin-sikkerhed','release','domaene','ekspertmatrix','scenarier','kilder','fluidmekanik','dimensionsloese-tal','boelgespektrum','strandtilstande','kildelager-model','organisk-opskael','regional-oceanografi','datamaaling-usikkerhed','hypoteseregister','valideringsdesign','feltprotokol','fejlscenarier','kodematrix','kildekritik-detaljer','bibliografi','ekspertarbejdsgang','ordliste','flere-transportveje']){
  ok(handbookSections.some(s=>s.id===id),`Håndbogen mangler obligatorisk afsnit ${id}`);
}

const handbookText=await read('HANDBOOK-RAVRADAR.md');
const handbookTextLower=handbookText.toLowerCase();
for(const expertId of Array.from({length:22},(_,i)=>`E-${String(i+1).padStart(2,'0')}`)){
  ok(handbookText.includes(expertId),`Håndbogen mangler ekspertpunkt ${expertId}`);
}
for(const marker of ['0,03 m/s','0,15 m/s','48 timers','20 % søgeforhold','Chubarenko','GitHub Actions-kørsel','Shields-parameteren','bundskærspænding','hypoteseregister','annoteret faglig bibliografi','størrelsen på et ravlager','én bølgeenergistyret mobiliseringstilstand']){
  ok(handbookTextLower.includes(marker.toLowerCase()),`Håndbogen mangler obligatorisk sporbarhedsmarkør: ${marker}`);
}
ok(handbookText.includes(RAVSCORE_MODEL_ID),'Håndbogen mangler den aktive integrerede RavScore-modelidentitet');
ok(handbookTextLower.includes('schema 6')||handbookTextLower.includes('stateversion 6.0.0'),'Håndbogen mangler den integrerede state-/migrationskontrakt');
const scoreEngine=await read('js/core/score-engine.js');
for(const marker of ['huntability: 0.25','transport: 0.40','release: 0.35','current >= .15 && current <= .65','max: 28','max: 42','hours >= 3 && hours <= 18','nearshore-remobilisation','dominantPathway']){
  ok(scoreEngine.includes(marker),`Den historiske sammenligningsmotors forventede auditkonstant mangler: ${marker}`);
}
const candidateG=await read('js/core/ravscore-candidate-g.js');
for(const marker of ['huntability: 0.20','transportAndDelivery: 0.50','mobilisation: 0.30','physicalBottleneckGate','actualOutboundTransport === true','transportPotential === 0','wadersHuntabilityLimit']){
  ok(candidateG.includes(marker),`Candidate G-rollback-oraklet mangler auditkonstanten: ${marker}`);
}
const integratedEngine=await read('js/core/ravscore-integrated.js');
const integratedStatePipeline=await read('js/core/ravscore-integrated-state-pipeline.js');
const integratedPublicModel=await read('js/core/ravscore-public-model.js');
for(const marker of ['evaluateIntegratedLastMile','RAVSCORE_LAST_MILE_POLICY','ravScoreModelBinding','scoreCalculation']){
  ok(integratedEngine.includes(marker),`Den aktive integrerede RavScore-motor mangler ${marker}`);
}
ok(!/physicalBottleneckGate|actualOutboundTransport|outboundEpisodeEffectiveHours\s*>=\s*13/.test(integratedEngine),
'Den integrerede RavScore må ikke genindføre Candidate Gs 13-timers helscoregate');
ok(integratedPublicModel.includes('outflowWholeScoreGateApplied: false'),
'Den offentlige integrerede forklaring skal eksplicit afvise helscoregaten');
ok(integratedStatePipeline.includes('CANDIDATE_G_STATE_SCHEMA_VERSION')
  && integratedStatePipeline.includes('migrationApplied')
  && integratedStatePipeline.includes('rollbackCandidateGMobilisationPotential'),
'Schema-6-pipelinen mangler bundet Candidate G-migration og rollbackspor');
ok(RAVSCORE_MODEL_ID==='RRS-COASTAL-PROCESS-INTEGRATED-1.1.0','Den aktive integrerede RavScore mangler sit faste model-id');
ok(RAVSCORE_STATE_SCHEMA_VERSION==='6.0.0','Den aktive integrerede RavScore skal bruge state schema 6');
ok(RAVSCORE_VARIANT_ID==='COASTAL-SUPPLY-MOBILISATION-BOUNDED-WAVE-APPROACH-HUNTABILITY-2','Den integrerede RavScore-variant er ikke låst');
ok(RAVSCORE_PROFILE_ID==='cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-historybounds12d-lastmileewma4-tail40-atten15-v5','Den integrerede RavScore-profil er ikke låst');
ok(/^[0-9a-f]{64}$/.test(RAVSCORE_MODEL_BUNDLE_SHA256),'Den integrerede RavScore mangler et gyldigt modelbundle-hash');
ok(/^[0-9a-f]{64}$/.test(RAVSCORE_MODEL_CONTRACT_SHA256)
  && RAVSCORE_MODEL_CONTRACT_SHA256!==RAVSCORE_MODEL_BUNDLE_SHA256,
'RavScore skal have adskilte, gyldige kontrakt- og implementeringsbundle-hashes');
ok(/^[0-9a-f]{64}$/.test(CANDIDATE_G_MODEL_CONTRACT_SHA256)
  && /^[0-9a-f]{64}$/.test(CANDIDATE_G_MODEL_BUNDLE_SHA256)
  && CANDIDATE_G_MODEL_CONTRACT_SHA256!==CANDIDATE_G_MODEL_BUNDLE_SHA256,
'Candidate G-rollback skal have adskilte kontrakt- og transitive implementeringsbundle-hashes');
const publicDataService=await read('js/services/data-service.js');
const publicManifestProducer=await read('scripts/public-conditions-lib.mjs');
const pagesPrivacyAudit=await read('scripts/audit-pages-artifact-privacy.mjs');
for(const marker of ['zoneRegistryPath','zoneRegistrySha256','zoneRegistryBytes']){
  ok(publicDataService.includes(marker)
    && publicManifestProducer.includes(marker)
    && pagesPrivacyAudit.includes(marker),
  `Den offentlige 210/673-pakke mangler atomisk zoneregisterbinding: ${marker}`);
}
ok(!publicDataService.includes('loadActiveZoneCollection()')
  && !(await read('js/services/zone-registry.js')).includes("v=3.1.6"),
'Zoneregisteret må ikke hentes ubundet ved siden af schema-4-manifestet');
ok(JSON.stringify(RAVSCORE_WEIGHTS)===JSON.stringify({huntability:0.20,transport:0.50,mobilisation:0.30}),'Den integrerede RavScore mangler 20/50/30-prioren');
ok(RAVSCORE_CURRENT_SUPPLY_POLICY.deadbandNormalSpeedMps===0.03
  && RAVSCORE_CURRENT_SUPPLY_POLICY.fullStrengthNormalSpeedMps===0.15
  && RAVSCORE_CURRENT_SUPPLY_POLICY.inboundPointsPerEffectiveHour===10
  && RAVSCORE_CURRENT_SUPPLY_POLICY.outboundPointsPerEffectiveHour===8
  && RAVSCORE_CURRENT_SUPPLY_POLICY.fullWeightHours===24
  && RAVSCORE_CURRENT_SUPPLY_POLICY.windowHours===48
  && RAVSCORE_CURRENT_SUPPLY_POLICY.maximumGapHours===3,
'Den integrerede RavScore mangler den låste strøm-/hukommelseskontrakt');
ok(RAVSCORE_WAVE_MOBILISATION_POLICY.buildHalfLifeHours===4
  && RAVSCORE_WAVE_MOBILISATION_POLICY.decayHalfLifeHours===48
  && RAVSCORE_WAVE_MOBILISATION_POLICY.maximumBuildCreditAfterMissingOrGapHours===1,
'Den integrerede RavScore mangler den låste 4/48-timers mobiliseringskontrakt');
ok(RAVSCORE_LAST_MILE_POLICY.minimumDeliveryFactor===0.85
  && RAVSCORE_LAST_MILE_POLICY.maximumDeliveryFactor===1
  && RAVSCORE_LAST_MILE_POLICY.maximumAttenuationShare===0.15
  && RAVSCORE_LAST_MILE_POLICY.deliveryEquation
    ==='DELIVERY_EQUALS_SUPPLY_TIMES_ONE_MINUS_0_15_TIMES_W_TIMES_ONE_MINUS_APPROACH'
  && RAVSCORE_LAST_MILE_POLICY.scoreEffect==='BOUNDED_SUPPLY_ATTENUATION_ONLY'
  && RAVSCORE_LAST_MILE_POLICY.waveCanCreateSupply===false
  && RAVSCORE_LAST_MILE_POLICY.waveCanIncreaseSupply===false
  && RAVSCORE_LAST_MILE_POLICY.structuralUncertaintyAlways===true
  && RAVSCORE_LAST_MILE_POLICY.numericPhysicalUncertaintyIntervalProvided===false
  && RAVSCORE_LAST_MILE_POLICY.physicalDeliveryResolved===false
  && RAVSCORE_LAST_MILE_POLICY.coherenceScoreEffect==='NONE_UNCERTAINTY_AND_EXPLANATION_ONLY'
  && RAVSCORE_LAST_MILE_POLICY.missingDirectionPolicy
    ==='ACTIVE_SCORE_HOUR_FAIL_CLOSED_HISTORICAL_DIRECTION_ENCLOSED_EXACT_CALM_NEUTRAL',
'Det uopløste sidste-nærkystled skal være begrænset til 0,85–1, fail-closed og må ikke opfinde et numerisk fysisk interval');
ok(RAVSCORE_SCORE_QUALITY.FULL_HISTORY==='FULL_HISTORY'
  && RAVSCORE_SCORE_QUALITY.HISTORY_INCOMPLETE==='HISTORY_INCOMPLETE'
  && RAVSCORE_SCORE_QUALITY.UNAVAILABLE==='UNAVAILABLE'
  && RAVSCORE_PUBLIC_FORECAST_HOURS===118
  && RAVSCORE_MODEL_CONTRACT.publicForecastHours===RAVSCORE_PUBLIC_FORECAST_HOURS
  && RAVSCORE_HISTORY_UNCERTAINTY_POLICY.shownIncompleteScore==='LOWER_BOUND'
  && RAVSCORE_HISTORY_UNCERTAINTY_POLICY.activeCurrentWindowHours===48
  && RAVSCORE_HISTORY_UNCERTAINTY_POLICY.researchRetentionHours===168
  && RAVSCORE_HISTORY_UNCERTAINTY_POLICY.researchRetentionScoreEffect==='NONE'
  && RAVSCORE_HISTORY_UNCERTAINTY_POLICY.directInputMissingPolicy
    ==='UNAVAILABLE_NO_INTERPOLATION_CARRY_OR_LOAN'
  && RAVSCORE_HISTORY_UNCERTAINTY_POLICY.calibrationEligibleByQuality.FULL_HISTORY===true
  && RAVSCORE_HISTORY_UNCERTAINTY_POLICY.calibrationEligibleByQuality.HISTORY_INCOMPLETE===false
  && RAVSCORE_HISTORY_UNCERTAINTY_POLICY.calibrationEligibleByQuality.UNAVAILABLE===false,
'Den integrerede RavScore mangler den låste, konservative historikhulskontrakt');
ok(RAVSCORE_HUNTABILITY_POLICY.waterLevelScoreEffect===0
  && RAVSCORE_HUNTABILITY_POLICY.wadersFinalScoreCap===true
  && RAVSCORE_HUNTABILITY_POLICY.beachFinalScoreCap===false
  && RAVSCORE_HUNTABILITY_POLICY.requiredPhysicalInputs.windSpeedMps==='FINITE_NON_NEGATIVE_SCALAR'
  && RAVSCORE_HUNTABILITY_POLICY.requiredPhysicalInputs.waveHeightM==='FINITE_NON_NEGATIVE_SCALAR'
  && RAVSCORE_WAVE_MOBILISATION_POLICY.requiredPhysicalInputs.wavePeriodS
    ==='FINITE_NON_NEGATIVE_SCALAR_AND_POSITIVE_WHEN_WAVE_HEIGHT_IS_POSITIVE',
'Den integrerede jagtbarheds-/vandstandskontrakt er ændret');
ok(RAVSCORE_MODEL_CONTRACT.componentSchemaId===RAVSCORE_COMPONENT_SCHEMA_ID
  && RAVSCORE_MODEL_CONTRACT.explanationSchemaId===RAVSCORE_EXPLANATION_SCHEMA_ID
  && RAVSCORE_MODEL_CONTRACT.rankingPolicyId===RAVSCORE_RANKING_POLICY_ID
  && RAVSCORE_MODEL_CONTRACT.bestTimePolicyId===RAVSCORE_BEST_TIME_POLICY_ID
  && RAVSCORE_MODEL_CONTRACT.presentationPolicyId===RAVSCORE_PRESENTATION_POLICY_ID
  && RAVSCORE_PRESENTATION_POLICY.id===RAVSCORE_PRESENTATION_POLICY_ID,
'Den integrerede model er ikke samlet bundet til komponenter, forklaringer, rangering, bedste tidspunkt og scorepræsentation');
ok(RAVSCORE_MODEL_CONTRACT.uncertainty.localBathymetryIncluded===false
  && RAVSCORE_MODEL_CONTRACT.uncertainty.resolvedSurfZoneIncluded===false
  && RAVSCORE_MODEL_CONTRACT.uncertainty.localAmberInventoryObserved===false,
'Den integrerede model må ikke foregive lokal batymetri, bølgeopløst surfzone eller observeret ravlager');
ok(CANDIDATE_G_ROLLBACK_MODEL_ID==='RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3',
'Candidate G skal være et eksplicit rollback-orakel, ikke en alternativ runtimeprofil');
ok(await exists('docs/rdks/10_DECISIONS/DEC-0015-HANDBOOK-EVIDENCE-TRACEABILITY.md'),'RDKS mangler DEC-0015 om håndbogens sporbarhed');
ok(await exists('docs/rdks/10_DECISIONS/DEC-0016-HANDBOOK-REFERENCE-WORK.md'),'RDKS mangler DEC-0016 om håndbogens substans');
ok(await exists('docs/rdks/10_DECISIONS/DEC-0017-MULTIPLE-AMBER-PATHWAYS.md'),'RDKS mangler DEC-0017 om flere ravveje');
ok(await exists('docs/rdks/10_DECISIONS/DEC-0018-ADMIN-PERSISTENCE-AND-AREA-INTEGRITY.md'),'RDKS mangler DEC-0018 om områdeintegritet og Supabase-persistens');
const decisionFiles=await fs.readdir(path.join(root,'docs/rdks/10_DECISIONS'));
ok(decisionFiles.includes('DEC-0110-RAVSCORE-INTEGRATED-COASTAL-PROCESS-MODEL.md'),
'RDKS mangler den eksakte DEC-0110 om den integrerede RavScore-release');

const areaModel=await read('js/core/geographic-areas.js');
for(const marker of ['Nordjyske østkyst','auditGeographicAreas','matchingZoneIds'])ok(areaModel.includes(marker),`Områdemodellen mangler ${marker}`);
const persistenceUi=await read('js/services/persistence-test-service.js');
for(const marker of ['runFullPersistenceTest','__ravradarPersistenceProbe','Originalen kunne ikke gendannes'])ok(persistenceUi.includes(marker),`Persistenstesten mangler ${marker}`);
const permissions=await read('js/services/permissions-service.js');
ok(permissions.includes("handbook_view")&&permissions.includes('Læs håndbogen'),'Rettigheden Læs håndbogen mangler');
ok(permissions.includes("handbook_review"),'Separat håndbogs-reviewrettighed mangler');
const sql=await read('supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql');
ok(/select\s+oid\s*,\s*conname\s+from\s+pg_constraint/i.test(sql),'Supabase SQL mangler oid-rettelsen');
ok(sql.includes(`\"handbookVersion\":\"${version}\"`)||sql.includes(`\"handbookVersion\": \"${version}\"`),'Supabase-installationsscriptets håndbog er forældet');
const sync=await read('scripts/sync-protected-admin-assets.mjs');
const operationalActivation=await read('scripts/ravscore-operational-activation.mjs');
const activeWeatherGenerator=await read('scripts/update-weather.mjs');
const operationalCasMigration=await read('supabase/migrations/20260829010000_ravscore_operational_documents_no_history.sql');
const checkpointMetadataCasMigration=await read('supabase/migrations/20260905090000_open_meteo_current_fallback_binding.sql');
const supabaseAdminRest=await read('scripts/lib/supabase-admin-rest.mjs');
const pythonAdminSync=await read('scripts/sync-admin-config.py');
ok(sync.includes('createSupabaseAdminRequester'),'Supabase sync bruger ikke den fælles fail-closed requester');
ok(sync.includes('mergeProtectedHandbook')&&sync.includes('handbook-source-baseline'),'Beskyttet håndbog mangler tabsfri trevejsfletning ved deploy');
ok(supabaseAdminRest.includes("startsWith('sb_secret_')")&&supabaseAdminRest.includes('headers={apikey:key'),'Supabase requester mangler korrekt sb_secret_-apikey-kontrakt');
ok(supabaseAdminRest.includes("parseJson(body)?.code==='PGRST303'")&&supabaseAdminRest.includes('attempt===1'),'Supabase requester mangler snæver én-gangs PGRST303-genprøvning');
ok(supabaseAdminRest.includes("status===500&&parseJson(body)?.code==='57014'")&&supabaseAdminRest.includes('statement-timeout 57014'),'Supabase requester mangler snæver én-gangs statement-timeout-genprøvning');
ok(pythonAdminSync.includes('fetch_admin_rows')&&pythonAdminSync.includes('PGRST303')&&pythonAdminSync.includes('GITHUB_ACTIONS'),'Python-adminhydrering mangler fail-closed PGRST303-kontrakt');
ok(pythonAdminSync.includes('is_integrated_selection')
  && pythonAdminSync.includes('preserve-local-integrated-candidate-g-cutover')
  && pythonAdminSync.includes('use-central-integrated-runtime-truth')
  && pythonAdminSync.includes('preserve-newer-local-integrated-release'),
'Central adminhydrering mangler den integrerede cutover-/runtimekontrakt');
ok(/ACCEPTED_FORECAST_HOURS\s*=\s*RAVSCORE_PUBLIC_FORECAST_HOURS/.test(activeWeatherGenerator)
  && /normalizeForecastHourly\(merged,\s*\{\s*limit:\s*ACCEPTED_FORECAST_HOURS\s*\}\)/.test(activeWeatherGenerator)
  && /result\.scoreQuality\s*!==\s*'HISTORY_INCOMPLETE'/.test(activeWeatherGenerator)
  && /result\.calibrationEligible\s*!==\s*false/.test(activeWeatherGenerator)
  && /result\.historyReasonCodes\.length\s*===\s*0/.test(activeWeatherGenerator)
  && /providerLabel:\s*'[^']*5-day forecast'/.test(activeWeatherGenerator),
'Den aktive 118-timers/5-dages prognose mangler fail-closed HISTORY_INCOMPLETE-validering');
ok(sync.includes('assertIntegratedRavScoreSelection')
  && sync.includes('payload=central')
  && sync.includes('Central RavScore-profil verificeret read-only; skrivning ejes af operationel atomisk CAS')
  && operationalActivation.includes('writeCentralCas')
  && operationalActivation.includes('ravradar_ravscore_operational_cas')
  && operationalActivation.includes('p_expected_operational_version')
  && operationalActivation.includes('p_expected_profile_version')
  && operationalActivation.includes('p_operational_payload')
  && operationalActivation.includes('p_profile_payload')
  && operationalActivation.includes('Atomic RavScore operation/profile compare-and-swap lost a concurrent update')
  && operationalCasMigration.includes('where document_key=\'ravscore-operational-model-activation\'')
  && operationalCasMigration.includes('where document_key=\'ravscore-profile-selection\'')
  && operationalCasMigration.includes('version=p_expected_operational_version')
  && operationalCasMigration.includes('version=p_expected_profile_version')
  && operationalCasMigration.includes('for update;'),
'Central RavScore-persistens mangler den validerede atomiske operation/profil-CAS-cutover');
const ravScoreProfileSelection=await readJson('data/admin/ravscore-profile-selection.json',{});
try{
  assertIntegratedRavScoreSelection(ravScoreProfileSelection,'Release RavScore profile');
}catch(error){
  ok(false,error.message);
}
ok(ravScoreProfileSelection.sourceVersion===version,'Den integrerede RavScore-profil følger ikke releaseversionen');
ok(ravScoreProfileSelection.activeModelId===PUBLIC_RAVSCORE_PROFILE_SELECTION.activeModelId
  && ravScoreProfileSelection.runtimeFallbackModelId===null
  && ravScoreProfileSelection.crossModelRuntimeFallbackAllowed===false,
'Den aktive RavScore-profil må ikke have en Candidate G- eller anden tværmodel-runtimefallback');
const publicApp=await read('app.js');
const publicI18n=await read('js/i18n.js');
const publicAssistant=await read('js/services/rav-assistant.js');
const publicInfoPanel=await read('js/ui/info-panel.js');
ok(!/calculateRavScore|selectBestTimeForDay|scoreFor\(/.test(publicApp),'Den offentlige app indeholder stadig en vej til den gamle RavScore-motor');
ok(!/calculateRavScore|score-engine\.js/.test(publicAssistant),'Spørg RavRadar indeholder stadig en vej til den gamle RavScore-motor');
ok(!/calculateRavScore|selectBestTimeForDay|bestHourForDay/.test(publicInfoPanel),'Informationspanelet indeholder stadig en vej til den gamle RavScore-motor');
ok(!/Candidate G|isCandidateG|candidateG/.test(publicInfoPanel),'Informationspanelet må ikke vise Candidate G som den aktive offentlige RavScore');
const productionWorkflows=await readProductionWorkflowSources({root});
const orchestratorWorkflow=productionWorkflows.orchestrator;
const buildWorkflow=productionWorkflows.build;
const deployWorkflow=productionWorkflows.deploy;
const dmiBulkProducer=await read('scripts/update-dmi-bulk.py');
const candidateOperationalPlanBuilder=await read('scripts/prepare-candidate-g-operational-rollback.mjs');
const workflowContractTest=await read('scripts/test-workflow-validation-order-4.0.108.mjs');
const operationalPagesRecovery=await read('scripts/ravscore-operational-pages-recovery.mjs');
const workflowUserAgentVersions=[...buildWorkflow.matchAll(/RavRadar\/(\d+\.\d+\.\d+)/g)].map(match=>match[1]);
ok(workflowUserAgentVersions.length>0,'Produktionsworkflowet mangler en versionsbåret RavRadar User-Agent');
for(const workflowVersion of workflowUserAgentVersions){
  ok(workflowVersion===version,`Produktionsworkflowets User-Agent viser ${workflowVersion}, men releaseversionen er ${version}`);
}
for(const marker of [
  'LEGACY_CANDIDATE_G_REFRESH_BEFORE_INITIAL_CUTOVER',
  'operationalLegacyCandidateRefreshTransition',
  'legacy-refresh-begin',
  'legacy-refresh-complete',
  'legacy-refresh-abort',
]){
  ok(operationalActivation.includes(marker),`Den operationelle legacy→current Candidate G-bro mangler ${marker}`);
}
for(const marker of [
  'action="candidate-legacy-maintenance"',
  'source_model="legacy-candidate-g"',
]){
  ok(buildWorkflow.includes(marker),`Produktionsworkflowets build-rolle mangler legacy→current Candidate G-broen ${marker}`);
}
for(const marker of [
  'ravscore-operational-activation.mjs legacy-refresh-begin',
  'ravscore-operational-activation.mjs legacy-refresh-complete',
  "steps.candidate-legacy-refresh-begin.outcome == 'success'",
]){
  ok(deployWorkflow.includes(marker),`Produktionsworkflowets deploy-rolle mangler legacy→current Candidate G-broen ${marker}`);
}
ok(candidateOperationalPlanBuilder.includes("'legacy-candidate-g'")
  && candidateOperationalPlanBuilder.includes('Legacy Candidate G'),
'Candidate G-planbyggeren mangler den forseglede dry-run-only legacy-kildebinding');
for(const marker of [
  'assertHistoricalCandidateRefreshPlan',
  'historical-refresh-begin',
  'historical-refresh-complete',
  'historical-refresh-abort',
  'prepareIntegratedHistoricalMaintenance',
  'prepare-integrated-historical-maintenance',
  'integrated-historical-maintenance-begin',
  'integrated-historical-maintenance-complete',
  'integrated-historical-maintenance-abort',
]){
  ok(operationalActivation.includes(marker),`Den operationelle H0→H1-tofasekontrakt mangler ${marker}`);
}
for(const marker of [
  "'historical-candidate-g'",
  "argument === '--source-binding'",
  'sourceModelBinding',
  'assertSealedSourceModel',
  'sourceImplementationClosureSha256',
  'requestedImplementationClosureSha256',
]){
  ok(candidateOperationalPlanBuilder.includes(marker),`Den historiske Candidate-plan/source-binding mangler ${marker}`);
}
for(const marker of [
  'is_sealed_candidate_g_selection_for_binding',
  'is_sealed_integrated_selection_for_binding',
  'is_exact_active_operational_controller',
  'claims_historical_integrated_return',
  'historical_selection_binding',
  'preserve-local-integrated-for-historical-',
]){
  ok(pythonAdminSync.includes(marker),`Central adminhydrering mangler historisk exact-binding: ${marker}`);
}
for(const marker of [
  'action="candidate-historical-maintenance"',
  'action="integrated-historical-maintenance"',
  'source_model="historical-candidate-g"',
  '--source-binding "$RAVRADAR_OPERATIONAL_WORK/source-binding.json"',
  'prepare_command="prepare-integrated-historical-maintenance"',
]){
  ok(buildWorkflow.includes(marker),`Produktionsworkflowets build-rolle mangler historisk H0→H1-routing ${marker}`);
}
for(const marker of [
  'ravscore-operational-activation.mjs historical-refresh-begin',
  'ravscore-operational-activation.mjs historical-refresh-complete',
  'ravscore-operational-activation.mjs integrated-historical-maintenance-begin',
  'ravscore-operational-activation.mjs integrated-historical-maintenance-complete',
]){
  ok(deployWorkflow.includes(marker),`Produktionsworkflowets deploy-rolle mangler historisk H0→H1-routing ${marker}`);
}
for(const marker of [
  'node scripts/ravscore-operational-activation.mjs classify-pending',
  'node scripts/ravscore-operational-activation.mjs reconcile',
  'python scripts/sync-admin-config.py',
]){
  ok(orchestratorWorkflow.includes(marker),`Produktionsworkflowets orchestrator-rolle mangler historisk H0→H1-routing ${marker}`);
}
for(const marker of [
  'action="candidate-historical-maintenance"',
  'action="integrated-historical-maintenance"',
  '--source-binding "$RAVRADAR_OPERATIONAL_WORK/source-binding.json"',
  'prepare_command="prepare-integrated-historical-maintenance"',
  "steps.candidate-historical-refresh-begin.outcome == 'success'",
  "steps.integrated-historical-maintenance-begin.outcome == 'success'",
]){
  ok(workflowContractTest.includes(marker),`Den dybe statiske workflowtest mangler historisk kontraktbevis: ${marker}`);
}
for(const marker of [
  'ravscore-operational-pages-recovery-classification-v1',
  'ravscore-operational-pages-pending-identity-v1',
  'ravscore-operational-pages-artifact-seal-v1',
  'ravscore-operational-pages-artifact-evidence-v1',
  'ravscore-operational-pages-terminal-evidence-v2',
  'ravscore-operational-pages-public-observation-v1',
  "SAFE_SOURCE_ABORT: 'SAFE_SOURCE_ABORT'",
  "EXACT_TARGET_REDEPLOY: 'EXACT_TARGET_REDEPLOY'",
  "TARGET_RECONCILE: 'TARGET_RECONCILE'",
  "FAIL_CLOSED: 'FAIL_CLOSED'",
]){
  ok(operationalPagesRecovery.includes(marker),`Pages-recoveryhelperen mangler schema/action ${marker}`);
}
const operationalRecoveryPositions={
  reconcile:orchestratorWorkflow.indexOf('\n  reconcile-operational-pending:'),
  writer:orchestratorWorkflow.indexOf('\n  recover-operational-pages-target:'),
  finalizer:orchestratorWorkflow.indexOf('\n  finalize-operational-pages-recovery:'),
  gate:orchestratorWorkflow.indexOf('\n  operational-recovery-gate:'),
  currentHour:orchestratorWorkflow.indexOf('\n  current-hour-readiness:'),
};
for(const [job,position] of Object.entries(operationalRecoveryPositions)){
  ok(position>=0,`Pages-recoverykæden mangler job: ${job}`);
}
ok(operationalRecoveryPositions.reconcile<operationalRecoveryPositions.writer
  && operationalRecoveryPositions.writer<operationalRecoveryPositions.finalizer
  && operationalRecoveryPositions.finalizer<operationalRecoveryPositions.gate
  && operationalRecoveryPositions.gate<operationalRecoveryPositions.currentHour,
'Pages-recovery skal være classifier → isoleret writer → finalizer → gate → current-hour');
const operationalReconcileSection=orchestratorWorkflow.slice(operationalRecoveryPositions.reconcile,operationalRecoveryPositions.writer);
const operationalWriterSection=orchestratorWorkflow.slice(operationalRecoveryPositions.writer,operationalRecoveryPositions.finalizer);
const operationalFinalizerSection=orchestratorWorkflow.slice(operationalRecoveryPositions.finalizer,operationalRecoveryPositions.gate);
const operationalRecoveryGateSection=orchestratorWorkflow.slice(operationalRecoveryPositions.gate,operationalRecoveryPositions.currentHour);
const operationalTripStoragePosition=orchestratorWorkflow.indexOf('\n  trip-storage-readiness:',operationalRecoveryPositions.currentHour);
const operationalCurrentHourSection=orchestratorWorkflow.slice(operationalRecoveryPositions.currentHour,operationalTripStoragePosition);
ok(operationalTripStoragePosition>operationalRecoveryPositions.currentHour
  && operationalCurrentHourSection.includes('needs: operational-recovery-gate')
  && operationalCurrentHourSection.includes("if: ${{ !cancelled() && needs.operational-recovery-gate.result == 'success' }}"),
'Current-hour skal genoptage efter bevidst skipped recovery-grene, men kun når terminalgaten er grøn');
const operationalDownstreamResumeContracts=[
  {job:'trip-storage-readiness',next:'build-and-prepare',needs:'needs: current-hour-readiness',condition:"if: ${{ !cancelled() && needs.current-hour-readiness.result == 'success' && needs.current-hour-readiness.outputs.ready == 'true' }}"},
  {job:'build-and-prepare',next:'geometry-v2-national',needs:'needs: [validate-dispatch, current-hour-readiness, trip-storage-readiness]',condition:"if: ${{ !cancelled() && needs.validate-dispatch.result == 'success' && needs.current-hour-readiness.result == 'success' && needs.trip-storage-readiness.result == 'success' && needs.validate-dispatch.outputs.geometry_v2_pilot != 'true' && needs.validate-dispatch.outputs.geometry_v2_national != 'true' && needs.current-hour-readiness.outputs.ready == 'true' && needs.trip-storage-readiness.outputs.ready == 'true' }}"},
  {job:'geometry-v2-national',next:'geometry-v2-pilot',needs:'needs: [validate-dispatch, current-hour-readiness]',condition:"if: ${{ !cancelled() && needs.validate-dispatch.result == 'success' && needs.current-hour-readiness.result == 'success' && github.event_name == 'workflow_dispatch' && needs.validate-dispatch.outputs.geometry_v2_national == 'true' && needs.validate-dispatch.outputs.geometry_v2_pilot != 'true' }}"},
  {job:'geometry-v2-pilot',next:'deploy-pages',needs:'needs: [validate-dispatch, current-hour-readiness]',condition:"if: ${{ !cancelled() && needs.validate-dispatch.result == 'success' && needs.current-hour-readiness.result == 'success' && github.event_name == 'workflow_dispatch' && needs.validate-dispatch.outputs.geometry_v2_pilot == 'true' }}"},
  {job:'deploy-pages',next:'production-outcome',needs:'needs: build-and-prepare',condition:"if: ${{ !cancelled() && needs.build-and-prepare.result == 'success' && github.ref == 'refs/heads/main' && needs.build-and-prepare.outputs.should_deploy == 'true' }}"},
];
for(const contract of operationalDownstreamResumeContracts){
  const start=orchestratorWorkflow.indexOf('\n  '+contract.job+':');
  const end=orchestratorWorkflow.indexOf('\n  '+contract.next+':',start+1);
  const section=start>=0&&end>start?orchestratorWorkflow.slice(start,end):'';
  ok(section.includes(contract.needs)&&section.includes(contract.condition),
  'Downstream recovery routing contract failed: '+contract.job);
}
ok(operationalWriterSection.includes("needs.reconcile-operational-pending.outputs.recovery_action == 'EXACT_TARGET_REDEPLOY'")
  && operationalWriterSection.includes('pages: write')
  && operationalWriterSection.includes('id-token: write')
  && operationalWriterSection.includes('uses: actions/deploy-pages@')
  && !operationalWriterSection.includes('SUPABASE_SERVICE_ROLE_KEY')
  && !operationalWriterSection.includes('ravscore-operational-activation.mjs'),
'Den særskilte exact-target Pages-writer mangler bounded routing/permissions eller har central state-adgang');
for(const [label,section] of [
  ['classifier',operationalReconcileSection],
  ['finalizer',operationalFinalizerSection],
  ['terminal gate',operationalRecoveryGateSection],
]){
  ok(!section.includes('pages: write')&&!section.includes('id-token: write'),
  `Pages-recovery ${label} må ikke have Pages-skriverettigheder`);
}
const rawZipHashPosition=operationalWriterSection.indexOf('downloaded_zip_sha256=');
const sealedZipProofPosition=operationalWriterSection.indexOf('test "$downloaded_zip_sha256" = "$sealed_artifact_digest_sha256"');
const zipExtractionPosition=operationalWriterSection.indexOf('unzip -q');
ok(rawZipHashPosition>=0
  && rawZipHashPosition<sealedZipProofPosition
  && sealedZipProofPosition<zipExtractionPosition,
'Pages-writeren skal verificere den rå originale ZIP mod den forseglede digest før extraction');
for(const marker of [
  'ravscore-operational-recovery-handoff-v1',
  'pages-recovery-$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT',
]){
  ok(orchestratorWorkflow.includes(marker),`Pages-recovery-lineage i orchestrator-rollen mangler ${marker}`);
}
for(const marker of [
  '^pages-recovery-([0-9]+)-([0-9]+)$',
  'ravscore-operational-recovery-handoff-$source_run_id-$source_attempt',
]){
  ok(deployWorkflow.includes(marker),`Pages-recovery-lineage i deploy-rollen mangler ${marker}`);
}
for(const marker of [
  "orchestratorWorkflow.indexOf('\\n  reconcile-operational-pending:')",
  "orchestratorWorkflow.indexOf('\\n  recover-operational-pages-target:')",
  "orchestratorWorkflow.indexOf('\\n  finalize-operational-pages-recovery:')",
  "orchestratorWorkflow.indexOf('\\n  operational-recovery-gate:')",
  "if: ${{ !cancelled() && needs.operational-recovery-gate.result == 'success' }}",
  "if: ${{ !cancelled() && needs.current-hour-readiness.result == 'success' && needs.current-hour-readiness.outputs.ready == 'true' }}",
  "if: ${{ !cancelled() && needs.validate-dispatch.result == 'success' && needs.current-hour-readiness.result == 'success' && needs.trip-storage-readiness.result == 'success' && needs.validate-dispatch.outputs.geometry_v2_pilot != 'true' && needs.validate-dispatch.outputs.geometry_v2_national != 'true' && needs.current-hour-readiness.outputs.ready == 'true' && needs.trip-storage-readiness.outputs.ready == 'true' }}",
  "if: ${{ !cancelled() && needs.validate-dispatch.result == 'success' && needs.current-hour-readiness.result == 'success' && github.event_name == 'workflow_dispatch' && needs.validate-dispatch.outputs.geometry_v2_national == 'true' && needs.validate-dispatch.outputs.geometry_v2_pilot != 'true' }}",
  "if: ${{ !cancelled() && needs.validate-dispatch.result == 'success' && needs.current-hour-readiness.result == 'success' && github.event_name == 'workflow_dispatch' && needs.validate-dispatch.outputs.geometry_v2_pilot == 'true' }}",
  "if: ${{ !cancelled() && needs.build-and-prepare.result == 'success' && github.ref == 'refs/heads/main' && needs.build-and-prepare.outputs.should_deploy == 'true' }}",
  'assertMarkersOrdered(operationalWriterSection',
  'downloaded_zip_sha256=',
  'EXACT_TARGET_REDEPLOY',
  'TARGET_RECONCILE',
  'SAFE_SOURCE_ABORT',
  '^pages-recovery-([0-9]+)-([0-9]+)$',
]){
  ok(workflowContractTest.includes(marker),`Den dybe statiske workflowtest mangler Pages-recoverybevis: ${marker}`);
}
const integratedTestChain=packageScripts['test:ravscore-integrated']??'';
for(const marker of [
  'test:ravscore-integrated-core',
  'test:ravscore-integrated-generator',
  'test:ravscore-integrated-public',
  'test:ravscore-integrated-profile',
  'test:ravscore-continuation-checkpoint',
  'test:protected-ravscore-checkpoint',
  'test:ravscore-model-binding',
]){
  ok(integratedTestChain.includes(marker),`Den samlede integrerede RavScore-testkæde mangler ${marker}`);
}
const integratedCoreChain=packageScripts['test:ravscore-integrated-core']??'';
for(const marker of [
  'test-ravscore-wave-approach-state.mjs',
  'test-ravscore-last-mile-integrated-state.mjs',
  'test-ravscore-last-mile-candidate-migration.mjs',
]){
  ok(integratedCoreChain.split(marker).length-1===1,
  `Den integrerede core-kæde skal køre ${marker} præcis én gang`);
}
for(const [scriptName,required] of [
  ['test:score',['test:ravscore-integrated','test:ravscore-rollback-oracle']],
  ['validate',['test:score','test:hydrated-atomic-dataset','test:production-runtime-privacy','test:candidate-g-gap-retirement']],
  ['validate:source:checks',['test:ravscore-integrated','test:ravscore-rollback-oracle','test:legacy-bootstrap-hydration','test:production-runtime-privacy','test:workflow-action-contracts','release:gate']],
]){
  const chain=packageScripts[scriptName]??'';
  for(const marker of required)ok(chain.includes(marker),`${scriptName} mangler ${marker}`);
  for(const forbidden of [
    'test:candidate-g-public-recovery',
    'test:ravscore-candidate-g-state-pipeline',
    'test:ravscore-national-shadow-contract',
    'audit-ravscore-candidate-g-public-shadow',
    'test-ravscore-candidate-g-central-runtime',
    'test-ravscore-profile-switch',
  ]){
    ok(!chain.includes(forbidden),`${scriptName} må ikke aktivere historisk Candidate G public runtime/shadow/recovery: ${forbidden}`);
  }
}
for(const retiredScriptName of [
  'hydrate:deployed-weather',
  'test:candidate-g-public-recovery',
  'test:ravscore-candidate-g-state-pipeline',
  'test:ravscore-national-shadow-contract',
]){
  ok(!Object.hasOwn(packageScripts,retiredScriptName),
  `Den pensionerede Candidate G/public-hydration-kontrakt må ikke være et aktivt package-script: ${retiredScriptName}`);
}
ok((packageScripts['hydrate:legacy-candidate-g-bootstrap']??'').includes('--legacy-candidate-g-bootstrap'),
'Den offentlige hydration skal kun være tilgængelig som eksplicit Candidate G-engangsbootstrap');
for(const [scriptName,markers] of [
  ['test:protected-ravscore-checkpoint',['test-protected-ravscore-continuation-checkpoint.mjs']],
  ['test:private-production-runtime',['test-private-production-runtime-bundle.mjs','test-private-production-runtime-workflow.mjs','test-protected-private-production-runtime.mjs','audit-tracked-runtime-privacy.mjs']],
  ['test:pages-artifact-privacy',['test-pages-artifact-privacy.mjs']],
  ['test:legacy-bootstrap-hydration',['test-hydrated-atomic-dataset-4.0.67.mjs','test-hydrate-deployed-weather-fail-closed-4.0.272.mjs']],
  ['test:production-runtime-privacy',['test:private-production-runtime','test:pages-artifact-privacy']],
]){
  const chain=packageScripts[scriptName]??'';
  for(const marker of markers)ok(chain.includes(marker),`${scriptName} mangler ${marker}`);
}
const rollbackOracleChain=packageScripts['test:ravscore-rollback-oracle']??'';
ok(rollbackOracleChain.includes('test-ravscore-candidate-g.mjs')
  && rollbackOracleChain.includes('test-ravscore-candidate-g-state-pipeline.mjs')
  && rollbackOracleChain.includes('test:candidate-g-operational-rollback'),
'Candidate G skal bevares som eksplicit testet rollback-orakel');
const operationalRollbackChain=packageScripts['test:candidate-g-operational-rollback']??'';
for(const marker of [
  'build-candidate-g-rollback-bundle.mjs --check',
  'test-candidate-g-rollback-bundle.mjs',
  'test-ravscore-candidate-g-operational-rollback.mjs',
  'test-prepare-candidate-g-operational-rollback.mjs',
  'test-candidate-g-rollback-public-stage.mjs',
  'test-candidate-g-rollback-trip-backend.mjs',
  'test-candidate-g-rollback-assistant-local.mjs',
  'test-ravscore-operational-pages-deployment.mjs',
  'test-ravscore-operational-pages-recovery.mjs',
  'test-ravscore-active-explanation-presenter.mjs',
  'test-ravscore-operational-activation.mjs',
])ok(operationalRollbackChain.includes(marker),`Den operationelle Candidate G-rollbackgate mangler ${marker}`);
for(const forbidden of ['central-runtime','profile-switch','public-shadow','public-recovery']){
  ok(!rollbackOracleChain.includes(forbidden),`Rollback-oraklet må ikke genaktivere Candidate G ${forbidden}`);
}
ok(!(packageScripts['test:workflow-action-contracts']??'').includes('test-ravscore-active-shadow-workflow'),
'Workflowkontrakten må ikke bevare Candidate G som aktiv shadowmodel');
const workflowActionChain=packageScripts['test:workflow-action-contracts']??'';
ok(workflowActionChain.includes('node scripts/test-source-validation-once.mjs'),
'Kildeplanens fulde dækning og fejlstop skal indgå i workflowtesten');
ok(workflowActionChain.includes('test:ravscore-dispatch-contract')
  && workflowActionChain.includes('test:candidate-g-gap-retirement')
  && workflowActionChain.includes('test:reusable-production-workflows')
  && workflowActionChain.includes('test-workflow-validation-order-4.0.108.mjs')
  && workflowActionChain.includes('test-ravscore-operational-pages-recovery.mjs')
  && workflowActionChain.includes('test:production-workflow-outcome')
  && workflowActionChain.includes('test-release-gate-error-aggregation.mjs'),
'Workflowkontrakten skal teste reusable rollegrænser, dispatchmatrix, historical/recovery-routing, Pages-recovery, DEC-0109-pensionering, maskinlæsbar terminalstatus og releasegate-fejlaggregering');
ok(packageScripts['test:production-workflow-outcome']==='node scripts/test-production-workflow-outcome.mjs',
'Den maskinlæsbare produktionsslutstatus mangler sin isolerede kontrakttest');
ok(packageScripts['test:release-contract-metadata']==='node scripts/test-release-contract-metadata.mjs && node scripts/test-harmonie-binding-migration.mjs && node scripts/test-open-meteo-binding-migration.mjs',
'Release metadata mangler sin kontrakttest eller kontrollen af den uforanderlige migrationsfremføring');
for(const retiredScript of [
  'test:candidate-g-gap-reconstruction',
  'test:candidate-g-gap-workflow',
  'test:candidate-g-gap-contract',
]){
  ok(packageScripts[retiredScript]===undefined,`Det pensionerede script ${retiredScript} må ikke kunne køres`);
}
ok((packageScripts['test:candidate-g-gap-retirement']??'').includes('test-candidate-g-gap-reconstruction-retired.mjs'),
'DEC-0109 skal være beskyttet af den negative pensionsgate');
ok(packageScripts['validate:source']==='node scripts/validate-source-once.mjs',
'Kildekontrollen skal bruge den fælles plan, som altid kører fuld releasegate først');
ok((packageScripts['validate:source:checks']??'').includes('test:workflow-action-contracts'),
'Kildegaten skal nå DEC-0109-pensionsgaten gennem workflowkontrakten');
const tripEvidenceChain=packageScripts['test:trip-evidence-contract']??'';
ok(tripEvidenceChain.includes('test-trip-evidence-contract.mjs')
  && tripEvidenceChain.includes('test-candidate-g-trip-quality-storage-4.0.311.mjs'),
'Turgrundlaget skal direkte teste både schema-3-modelbinding og trip-quality-lagringskontrakten');
const hybridTripChain=packageScripts['test:hybrid-trip-storage']??'';
for(const marker of [
  'test-hybrid-trip-storage-4.0.287.mjs',
  'test-trip-storage-edge-transient-retry.mjs',
  'test-trip-storage-migration-projection-4.0.311.mjs',
  'test-trip-storage-legacy-classification-4.0.311.mjs',
]){
  ok(hybridTripChain.includes(marker),`Hybrid turlagring mangler direkte D1-/migrationsbevis: ${marker}`);
}
ok((packageScripts['test:ravscore-integrated-public']??'').includes('test:ravscore-public-browser-closure'),
'Den integrerede public-kæde mangler browserclosure-kontrakten');
const integratedProfileChain=packageScripts['test:ravscore-integrated-profile']??'';
ok(integratedProfileChain.includes('test-integrated-cutover-install-contract.mjs')
  && integratedProfileChain.includes('test:integrated-cutover-readiness'),
'Den integrerede profilkæde mangler SQL-/RPC-paritet eller cutover-readiness-kontrakten');
ok(!(packageScripts['test:coastal-geometry-v2']??'').includes('test-ravscore-active-shadow-workflow'),
'Geometritesten må ikke genaktivere Candidate G-shadowjobbet');
const targetRegistry=await read('scripts/build-copernicus-target-registry.py');
const dmiNativeProvenance=await read('scripts/lib/dmi_native_provenance.py');
const boundedCopernicusRetry=await read('scripts/run-copernicus-current-pilot-with-retry.py');
const copernicusRangeRunner=await read('scripts/run-copernicus-current-pilot.py');
const copernicusCurrentLib=await read('scripts/lib/copernicus_current.py');
const currentOperationalClosure=await read('scripts/lib/current_operational_closure.py');
const openMeteoFallback=await read('scripts/lib/open_meteo_current_fallback.py');
const openMeteoFill=await read('scripts/fill-open-meteo-current-fallback.py');
const liveCurrentPilot=await read('scripts/lib/live-current-pilot.mjs');
const integratedRavScore=await read('scripts/lib/ravscore-integrated-runtime.mjs');
const productionTargetFreshness=await read('scripts/check-production-target-freshness.mjs');
const continuationCheckpoint=await read('scripts/ravscore-continuation-checkpoint.mjs');
const protectedContinuationCheckpoint=await read('scripts/protected-ravscore-continuation-checkpoint.mjs');
const privateRuntimeBundle=await read('scripts/private-production-runtime-bundle.mjs');
const privateRuntimeWorkflow=await read('scripts/private-production-runtime-workflow.mjs');
const protectedPrivateRuntime=await read('scripts/protected-private-production-runtime.mjs');
const trackedRuntimePrivacy=await read('scripts/audit-tracked-runtime-privacy.mjs');
const pagesArtifactPrivacy=await read('scripts/audit-pages-artifact-privacy.mjs');
const legacyHydration=await read('scripts/hydrate-deployed-weather.py');
const productionWatchdog=await read('scripts/check-production-watchdog.mjs');
const productionWorkflowOutcome=await read('scripts/production-workflow-outcome.mjs');
const tripStorageWorkflow=await read('.github/workflows/deploy-trip-storage.yml');
const tripGatewayWorker=await read('cloudflare/trip-gateway/worker.js');
const tripGatewayVerification=await read('scripts/verify-cloudflare-trip-gateway.mjs');
const tripEdgeVerification=await read('scripts/verify-trip-storage-edge.mjs');
const tripEdgeReadiness=await read('scripts/lib/trip-storage-edge-readiness.mjs');
const tripEdgeContractProbe=await read('supabase/functions/_shared/trip-storage-contract-probe.js');
const tripLogEdge=await read('supabase/functions/trip-log/index.ts');
const publicGatewayEdge=await read('supabase/functions/_shared/public-gateway.ts');
for(const marker of [
  "'candidate-legacy-maintenance'",
  "'candidate-historical-maintenance'",
  "'integrated-historical-maintenance'",
  "'SAFE_SOURCE_ABORT'",
  "'TARGET_RECONCILE'",
  "'EXACT_TARGET_REDEPLOY'",
]){
  ok(productionWorkflowOutcome.includes(marker),`Den maskinlæsbare produktionsslutstatus mangler actionen ${marker}`);
}
const heartbeatWorkflow=await read('.github/workflows/preserve-copernicus-current-shadow.yml');
for(const marker of [
  'hours = matrix_hours(reference)',
  'return verified_part_current_pair(document, target, valid_time)',
  '"schemaVersion": 3',
  '"rangeEndAt": utc_iso(hours[-1])',
  '"operationalRangeStartAt": utc_iso(reference)',
  '"operationalRangeEndAt": utc_iso(hours[-1])',
  '"operationalRequiredPairsSha256": required_pairs_sha256(operational_required_pairs)',
  '"advisoryHistoryRequiredPairsSha256": required_pairs_sha256(',
]){
  ok(targetRegistry.includes(marker),`Copernicus' eksakte operationelle DMI-gapmatrix mangler native-timebindingen: ${marker}`);
}
for(const marker of [
  'def _matching_verified_part_current_rows(',
  'key_time = canonical_time(key)',
  'row_time = canonical_time(row.get("time"))',
  'key_time is None or row_time is None or key_time != row_time or row_time in seen',
  'or parsed < start',
  'or parsed > end',
  'or not _verified_part_current_row(row, target, row_time)',
  'def verified_part_current_pair(',
  'complete_native_source_for_hour(',
]){
  ok(dmiNativeProvenance.includes(marker),`Den delte DMI-provenienshelper mangler strict native-timebindingen: ${marker}`);
}
const targetRegistryTestChain=packageScripts['test:copernicus-target-registry']??'';
for(const marker of [
  'test-copernicus-target-registry-4.0.244.py',
  'test-copernicus-range-runner-v2.py',
  'test-copernicus-range-checker-v2.py',
  'test-open-meteo-current-fallback.py',
]){
  ok(targetRegistryTestChain.includes(marker),`Copernicus' eksakte DMI-gapmatrix mangler måltesten: ${marker}`);
}
for(const marker of ['python scripts/run-copernicus-current-pilot-with-retry.py','--attempts 1','--timeout-seconds 360','--backoff-seconds 20']){
  ok(buildWorkflow.includes(marker),`Produktionsworkflowets build-rolle mangler den bundne Copernicus-kontrakt: ${marker}`);
}
for(const marker of [
  'attempts > 3',
  'timeout_seconds > 3300',
  'backoff_seconds > 120',
  'SOFT_DEADLINE_EPOCH_ENV',
  'BOUNDED_PROGRESS_EXIT_CODE = 75',
  '"reason": "bounded-progress"',
  'completed = subprocess.run(',
  'timeout=timeout_seconds',
  'env=child_environment',
]){
  ok(boundedCopernicusRetry.includes(marker),`Copernicus-wrapperen mangler hard bound: ${marker}`);
}
for(const marker of ['atomic_write_shadow_checkpoint(','remainingOperationalPairs=']){
  ok(copernicusRangeRunner.includes(marker),`Copernicus-rangeproducenten mangler resumérbart shard-checkpoint: ${marker}`);
}
for(const marker of ['collections=[]','require_collection=False']){
  ok(copernicusCurrentLib.includes(marker),`Copernicus-cachelageret mangler uforseglet partial state: ${marker}`);
}
for(const marker of [
  'Save non-cancelled private Copernicus source-stage progress',
  "steps.copernicus-fill.outcome != 'cancelled'",
  "steps.copernicus-fill.outcome != 'skipped'",
  '.cache/copernicus-current-shadow.json',
  '.cache/copernicus-current-source-stage.json',
  'copernicus-current-progress-v3-',
  'Remove only invalid production Copernicus source disposition',
  'rm -f .cache/copernicus-current-source-stage.json',
  'Require completed Copernicus source stage before combined current closure',
  '--require-source-stage-ready',
  'Save validated private Copernicus progress before downstream closure',
]){
  ok(buildWorkflow.includes(marker),`Produktionsworkflowet mangler privat Copernicus-progressave: ${marker}`);
}
for(const marker of [
  'Fill only the exact remaining current gaps from Open-Meteo',
  '--runtime-seconds 240',
  'Refuse a stale target after the bounded supplier chain',
  '--maximum-age-minutes 90',
  'Refuse stale weather before protected writes and Pages artifact',
  '--maximum-age-minutes 150',
]){
  ok(buildWorkflow.includes(marker),`Produktionsworkflowet mangler bounded fallback/friskhed: ${marker}`);
}
for(const marker of [
  'regional_candidates = [row for row in residual if row["partId"] in regional_ids]',
  'outside_regional = [row for row in residual if row["partId"] not in regional_ids]',
  '[*outside_regional, *regional_missing]',
  'OPEN_METEO_COMBINED_CURRENT',
  'calibrationEligible": False',
]){
  ok(currentOperationalClosure.includes(marker),`Den operationelle current-closure mangler Open-Meteo-partitionen: ${marker}`);
}
for(const marker of [
  'MODEL = "meteofrance_currents"',
  'PHYSICAL_SCOPE = "eulerian-waves-and-tides-combined-surface-current"',
  'SCORE_INPUT_POLICY_ID = "combined-current-single-channel-no-wave-or-tide-reprojection-v1"',
  'copernicus_source_stage_status not in {"READY", "NOT_APPLICABLE"}',
  'copernicus_bounded_progress_accepted is not False',
]){
  ok(openMeteoFallback.includes(marker),`Open-Meteo-kontrakten mangler fysisk/READY-only binding: ${marker}`);
}
for(const marker of [
  'stage.get("status") != SOURCE_STAGE_STATUS',
  'plan = build_regional_residual_plan(',
  '"boundedProgressAccepted": False',
]){
  ok(openMeteoFill.includes(marker),`Open-Meteo-fyldningen mangler eksakt residual/READY-only gate: ${marker}`);
}
for(const marker of [
  'OPEN_METEO_SCORE_INPUT_POLICY_ID',
  'entry.calibrationEligible !== false',
  'SOURCE_ORDER.get(candidate.entry.source)',
]){
  ok(liveCurrentPilot.includes(marker),`Live-current-runtime mangler Open-Meteo-prioritet eller scopeværn: ${marker}`);
}
for(const marker of [
  "current.physicalScope !== 'eulerian-waves-and-tides-combined-surface-current'",
  'current.calibrationEligible !== false',
]){
  ok(integratedRavScore.includes(marker),`RavScore mangler Open-Meteo-kalibreringsværnet: ${marker}`);
}
for(const marker of [
  "throw new Error('PRODUCTION_TARGET_STALE')",
  'maximumAgeMinutes < 15 || maximumAgeMinutes > 360',
]){
  ok(productionTargetFreshness.includes(marker),`Produktionsfriskhedsgaten mangler ${marker}`);
}
ok((packageScripts['test:live-current-pilot']??'').includes('test-open-meteo-live-runtime.mjs'),
'Live-current-testkæden mangler Open-Meteo-runtimeværnet');
for(const marker of [
  "status: 'ravscore-schema6-with-candidate-g-rollback-companion'",
  'expectedPartCount: 673',
  "cacheNamespace: 'ravscore-continuation-schema6-v2'",
  "candidateGRollbackCompanionStatus: 'candidate-g-rollback-ready-companion'",
  'compactDerivedStateOnly: true',
  'weatherIncluded: false',
  'scoresIncluded: false',
  'rawVectorsIncluded: false',
  'coordinatesIncluded: false',
  'privateDataIncluded: false',
  'stateSha256',
  'generationSha256',
  'candidateGRollbackCompanion',
  'assertCandidateGRollbackContinuation',
  "initialStateSource !== 'INTEGRATED_CONTINUATION'",
  'checkpointMs > targetMs',
  'checkpointMs <= deployedMs',
]){
  ok(continuationCheckpoint.includes(marker),`Schema-4 RavScore-checkpointet mangler integritets-/privatlivskontrakten: ${marker}`);
}
for(const marker of [
  "'ravscore-continuation-checkpoint'",
  "'.cache/ravscore-continuation-checkpoint/checkpoint.json'",
  'PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_ALLOWLIST',
  'buildSupabaseAdminHeaders',
  'loadRavScoreContinuationCheckpointForTarget',
  'PROTECTED_RAVSCORE_CHECKPOINT_RPC_MAXIMUM_RESPONSE_BYTES',
  'PROTECTED_RAVSCORE_CHECKPOINT_RESTORE_MAXIMUM_RESPONSE_BYTES',
  'createProtectedRavScoreCheckpointVersionRequester',
  'createProtectedRavScoreCheckpointRpcRequester',
  'serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY',
  'const endpoint = `${url}/rest/v1/rpc/${PROTECTED_RAVSCORE_CHECKPOINT_RPC}`',
  '`?document_key=eq.${encodeURIComponent(key)}&select=document_key,version&limit=2`',
  'await invokeProtectedCheckpointRpc(rpcRequest, {',
  'p_expected_version: expectedVersion',
  'p_target_reference: local.checkpointAt',
  'p_payload: payload',
  'createProtectedRavScoreCheckpointRequester',
  '`?document_key=eq.${encodeURIComponent(key)}&select=document_key,payload,version&limit=2`',
  "const request = options.mode === 'publish'",
  '? createProtectedRavScoreCheckpointVersionRequester()',
  ': createProtectedRavScoreCheckpointRequester()',
  "const rpcRequest = options.mode === 'publish'",
  '? createProtectedRavScoreCheckpointRpcRequester()',
  ': null',
  "reason: 'protected-checkpoint-not-found'",
  'targetUnchanged: true',
  'await fs.rename(temporary, checkpointPath)',
  'payloadLogged: false',
]){
  ok(protectedContinuationCheckpoint.includes(marker),`Protected checkpoint-kontrakten mangler ${marker}`);
}
ok(/readResponseTextBounded\(\s*response,\s*PROTECTED_RAVSCORE_CHECKPOINT_RPC_MAXIMUM_RESPONSE_BYTES,/s.test(protectedContinuationCheckpoint)
  && /readResponseTextBounded\(\s*response,\s*PROTECTED_RAVSCORE_CHECKPOINT_RESTORE_MAXIMUM_RESPONSE_BYTES,/s.test(protectedContinuationCheckpoint),
'Protected checkpoint-klienten mangler separate response bounds for metadata/RPC og restore-payload');
const protectedCheckpointPublishSource=protectedContinuationCheckpoint.slice(
  protectedContinuationCheckpoint.indexOf('export async function publishProtectedRavScoreContinuationCheckpoint('),
  protectedContinuationCheckpoint.indexOf('export async function restoreProtectedRavScoreContinuationCheckpoint('),
);
const protectedCheckpointRestoreSource=protectedContinuationCheckpoint.slice(
  protectedContinuationCheckpoint.indexOf('export async function restoreProtectedRavScoreContinuationCheckpoint('),
  protectedContinuationCheckpoint.indexOf('function parseArgs('),
);
ok(protectedCheckpointPublishSource.includes('readExactProtectedCheckpointVersion(')
  && protectedCheckpointPublishSource.includes('invokeProtectedCheckpointRpc(rpcRequest, {')
  && !protectedCheckpointPublishSource.includes('readExactProtectedCheckpointRow('),
'Protected checkpoint-publish skal bruge version-only metadata-GET efterfulgt af RPC-CAS');
ok(protectedCheckpointRestoreSource.includes('readExactProtectedCheckpointRow(')
  && !protectedCheckpointRestoreSource.includes('readExactProtectedCheckpointVersion(')
  && !protectedCheckpointRestoreSource.includes('invokeProtectedCheckpointRpc('),
'Fuld protected checkpoint-payload-GET må kun bruges af restore-vejen');
ok((protectedContinuationCheckpoint.match(/readResponseTextBounded\(\s*response,\s*PROTECTED_RAVSCORE_CHECKPOINT_RPC_MAXIMUM_RESPONSE_BYTES,/gs)??[]).length===2,
'Protected checkpoint version-GET og RPC-CAS skal begge have metadata-response bound');
for(const marker of [
  'begin;',
  "set local lock_timeout = '5s';",
  'create or replace function public.ravradar_ravscore_checkpoint_cas(',
  'create or replace function public.ravradar_ravscore_checkpoint_contract()',
  'p_expected_version bigint',
  'p_target_reference timestamptz',
  'p_payload jsonb',
  'returns jsonb',
  'security definer',
  "v_key constant text := 'ravscore-continuation-checkpoint';",
  "if auth.role() is distinct from 'service_role' then",
  "where document_key = v_key",
  "'centralVersion', v_version",
  "'productionReferenceAt', p_payload ->> 'productionReferenceAt'",
  'v_result := pg_catalog.jsonb_build_object(',
  "pg_catalog.octet_length(pg_catalog.convert_to(v_result::text, 'UTF8')) > 4096",
  'return v_result;',
  'revoke all on function public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb)',
  'from public, anon, authenticated;',
  'grant execute on function public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb)',
  'to service_role;',
  "notify pgrst, 'reload schema';",
  'commit;',
]){
  ok(checkpointMetadataCasMigration.includes(marker),`Checkpoint metadata-CAS-migrationen mangler ${marker}`);
}
ok(/\bbegin;\s*set local lock_timeout = '5s';/i.test(checkpointMetadataCasMigration)
  && /notify pgrst, 'reload schema';\s*commit;\s*$/i.test(checkpointMetadataCasMigration),
'Checkpoint metadata-CAS-migrationen skal være transaktionel med bounded lock og afsluttende PostgREST-reload');
const checkpointCasStart=checkpointMetadataCasMigration.indexOf(
  'create or replace function public.ravradar_ravscore_checkpoint_cas(',
);
const checkpointCasEnd=checkpointMetadataCasMigration.indexOf(
  'create or replace function public.ravradar_ravscore_checkpoint_contract()',
);
const checkpointCasSql=checkpointMetadataCasMigration.slice(checkpointCasStart,checkpointCasEnd);
const checkpointCasResultSql=checkpointCasSql.slice(
  checkpointCasSql.indexOf('v_result := pg_catalog.jsonb_build_object('),
  checkpointCasSql.indexOf("raise exception 'protected RavScore checkpoint CAS metadata exceeds response bound'"),
);
ok(checkpointCasStart>=0
  && checkpointCasEnd>checkpointCasStart
  && checkpointCasSql.includes('return v_result;')
  && !/\breturn\s+(?:p_payload|v_payload)\s*;/i.test(checkpointCasSql)
  && !/[\"']payload[\"']\s*,/i.test(checkpointCasResultSql)
  && !/\bv_payload\b/i.test(checkpointCasResultSql)
  && !/[\"'][^\"']+[\"']\s*,\s*p_payload\s*[,)]/i.test(checkpointCasResultSql),
'Checkpoint metadata-CAS-RPC må kun returnere bounded metadata, aldrig hele checkpoint-payloaden');
for(const marker of ['expectedPartCount: 673','bundleContentSha256','modelBinding']){
  ok(privateRuntimeBundle.includes(marker),`Det private runtimebundle mangler ${marker}`);
}
for(const marker of [
  'Date.parse(target) - 72 * 3_600_000',
  'Restored private runtime must remain outside the repository tree',
  'privateDataLogged: false',
]){
  ok(privateRuntimeWorkflow.includes(marker),`Private runtime-workflowkontrakten mangler ${marker}`);
}
for(const marker of [
  "documentKey: 'ravscore-private-production-runtime-pointer'",
  "bucketId: 'ravradar-private-production-runtime'",
  'maximumRawPayloadBytes:',
  'maximumArchiveBytes: 50 * 1024 * 1024',
  'uploadImmutable',
  'compare-and-swap',
  'previous: existing?.payload.current ?? null',
  'removeExact',
  'anonymousReadDenied: true',
  'No compatible protected private runtime generation is available',
]){
  ok(protectedPrivateRuntime.includes(marker),`Protected private runtime mangler ${marker}`);
}
for(const marker of ['TRACKED_PUBLIC_LIVE_ALLOWLIST','git','ls-files','Private runtime files are tracked']){
  ok(trackedRuntimePrivacy.includes(marker),`Tracked runtime-privacygaten mangler ${marker}`);
}
for(const marker of ['EXPECTED_LIVE_FILES','PRIVATE_FIELD','RAW_VECTOR_FIELD','loadPrivateRuntimeFingerprints']){
  ok(pagesArtifactPrivacy.includes(marker),`Pages-privacygaten mangler ${marker}`);
}
for(const marker of ['--legacy-candidate-g-bootstrap','generic-public-private-runtime-hydration-retired','assert_legacy_candidate_g_cutover_source']){
  ok(legacyHydration.includes(marker),`Legacy-only hydration mangler ${marker}`);
}
for(const marker of ['production-run-active','recent-production-run','public-production-fresh','production-silent-and-public-manifest-stale','head_branch','malformed ${branch} workflow-run history']){
  ok(productionWatchdog.includes(marker),`Produktions-watchdoget mangler fail-safe tilstanden: ${marker}`);
}
for(const marker of ['types: [requested, completed]','retry-failed-production:',`contains(fromJSON('["failure","timed_out","startup_failure"]'), github.event.workflow_run.conclusion)`,'external_watchdog:','default: false',"github.event_name == 'schedule' || (github.event_name == 'workflow_dispatch' && inputs.external_watchdog == true)",'production-watchdog:','MAXIMUM_SILENCE_MINUTES:',"external_watchdog == true && '15' || '45'",'--maximum-silence-minutes "$MAXIMUM_SILENCE_MINUTES"','runs?per_page=100','--branch main','id: watchdog-recheck',"steps.watchdog.outputs.dispatch == 'true' && steps.watchdog-recheck.outputs.dispatch == 'true'"]){
  ok(heartbeatWorkflow.includes(marker),`Produktionsorkestreringen mangler selvrecovery: ${marker}`);
}
ok((heartbeatWorkflow.match(/node scripts\/check-production-watchdog\.mjs/g)||[]).length===2,'Produktions-watchdoggen skal have inspect og fail-closed recheck');
ok(!heartbeatWorkflow.includes('runs?branch=main'),'Produktions-watchdoggen må ikke bruge GitHubs forbigående branch-filtrerede runindeks');
const productionConcurrency=orchestratorWorkflow.slice(orchestratorWorkflow.indexOf('\nconcurrency:'),orchestratorWorkflow.indexOf('\njobs:'));
ok(productionConcurrency.includes('queue: max')&&productionConcurrency.includes('cancel-in-progress: false'),'Produktionskøen skal bevare ventende push-runs uden at afbryde aktive transitioner');
for(const marker of [
  'Object.freeze([0, 250, 750])',
  'Object.freeze([429, 502, 503, 504])',
  'assertRetrySafeDescriptor',
  'TRIP_STORAGE_EDGE_SIGNED_LOGIN_PROBE_KIND',
  'noWriteRequestDescriptor',
  'tripGatewaySignature',
  "url.searchParams.set('_rr_trip_attestation'",
  "cache: 'no-store'",
  "'cache-control': 'no-cache, no-store'",
  'TRIP_STORAGE_EDGE_WRITE_CAPABLE_RETRY_FORBIDDEN',
]){
  ok(tripEdgeReadiness.includes(marker),`Trip-storage Edge-retry mangler fail-closed no-write-markøren: ${marker}`);
}
ok(tripEdgeVerification.includes('runTripStorageNoWriteContractProbe')
  &&tripEdgeVerification.includes("'trip-log-signed-login-response'"),
  'Trip-storage Edge-verifikation mangler den præcise signerede response-contract-probe');
ok(!/\brequest\s*:/.test(tripEdgeReadiness),'Retryhelperen må ikke acceptere en vilkårlig request-closure');
ok(tripEdgeContractProbe.includes('signed-login-response-v1')
  &&tripEdgeContractProbe.includes("TRIP_STORAGE_SIGNED_LOGIN_METHOD = 'GET'")
  &&tripEdgeContractProbe.includes('hasBody !== false'),
  'Den signerede Edge-probe mangler eksakt GET-/no-body-/domænebinding');
ok(publicGatewayEdge.includes('request.method !== "POST"')
  &&publicGatewayEdge.includes('GatewayError(405, "METHOD_NOT_ALLOWED")'),
  'Gammel/current normalrute skal afvise signed GET med 405 før rate-limit, så rollout er statefri');
ok(publicGatewayEdge.includes('throw new GatewayError(401, TRIP_STORAGE_LOGIN_REQUIRED_CODE)'),
  'Normal auth skal dele den eksakte LOGIN_REQUIRED-kode uden at blive omgået af almindelige kald');
const tripProbeIndex=tripLogEdge.indexOf('const contractProbeHeader');
const tripNormalJsonIndex=tripLogEdge.indexOf('const payload = await readJsonObject');
const tripRateIndex=tripLogEdge.indexOf('await enforceRateLimits');
const tripAuthIndex=tripLogEdge.indexOf('await requireAuthenticatedUserId');
const tripStorageIndex=tripLogEdge.indexOf('await listOwnTripObservations');
ok(tripProbeIndex>=0&&tripProbeIndex<tripNormalJsonIndex&&tripNormalJsonIndex<tripRateIndex
  &&tripRateIndex<tripAuthIndex&&tripAuthIndex<tripStorageIndex,
  'Trip-log skal holde den signerede statefri probe før normal rate/auth/storage og normalruten i oprindelig rækkefølge');
const signedTripProbeBlock=tripLogEdge.slice(tripProbeIndex,tripRateIndex);
ok(signedTripProbeBlock.includes('verifyTripGatewaySignature')
  &&signedTripProbeBlock.includes('tripStorageReadinessHeaders')
  &&!/enforceRateLimits|requireAuthenticatedUserId|listOwnTripObservations/.test(signedTripProbeBlock),
  'Den signerede Edge-probe må ikke forbruge rate limit, auth-resolve eller storage');
const activeTripGateStart=buildWorkflow.indexOf('name: Verify active trip-storage Edge and D1 read contracts without creating data');
const protectedWritesStart=buildWorkflow.indexOf('name: Reconfirm current origin/main before protected writes and Pages artifact');
const activeTripGate=activeTripGateStart>=0&&protectedWritesStart>activeTripGateStart
  ?buildWorkflow.slice(activeTripGateStart,protectedWritesStart):'';
ok(activeTripGate.includes('node scripts/verify-trip-storage-edge.mjs')
  &&activeTripGate.includes('node scripts/verify-cloudflare-trip-gateway.mjs')
  &&activeTripGate.includes('CLOUDFLARE_TRIP_GATEWAY_URL: ${{ secrets.CLOUDFLARE_TRIP_GATEWAY_URL }}')
  &&activeTripGate.includes('TRIP_GATEWAY_SHARED_SECRET: ${{ secrets.TRIP_GATEWAY_SHARED_SECRET }}'),
  'Den aktive pre-write gate skal køre både signed Edge-liveness og separat Worker/D1-readiness med env-bundne secrets');
ok(!/\$\{\{\s*secrets\./.test(activeTripGate.slice(0,activeTripGate.indexOf('env:'))),
  'Den aktive trip-storage-gate må ikke interpolere secrets i run-scriptet');
for(const marker of [
  'WORKER_COUNT_RETRY_DELAYS_MS = Object.freeze([0, 250, 750])',
  'WORKER_COUNT_TRANSIENT_HTTP_STATUSES = Object.freeze([429, 502, 503, 504])',
  "const WORKER_COUNT_METHOD = 'POST'",
  "const WORKER_COUNT_PATH = '/v1/trips/count'",
  "const WORKER_COUNT_BODY = '{}'",
  'runWorkerCountReadProbe',
  'nextWorkerCountTimestamp',
  'tripGatewaySignature',
  'response.status !== 200',
  'Object.keys(body).sort()',
  'body.trip_count >= 0',
  'discardWorkerCountResponse',
  "cache: 'no-store'",
]){
  ok(tripGatewayVerification.includes(marker),`Worker-count-retry mangler fail-closed kontraktmarkøren: ${marker}`);
}
const workerCountProbeParameters=tripGatewayVerification.match(
  /export async function runWorkerCountReadProbe\(\{([\s\S]*?)\}\) \{/,
)?.[1]||'';
ok(!/\b(?:route|path|body|request|descriptorFactory|requestFactory)\b/.test(workerCountProbeParameters),
  'Worker-count-helperen må ikke acceptere vilkårlig route, body eller request-closure');
const workerCountFunction=tripGatewayWorker.match(
  /async function countTrips\(env\) \{[\s\S]*?(?=\nasync function deleteOwnerTrips)/,
)?.[0]||'';
ok(/select count\(\*\) as trip_count from trip_observations/i.test(workerCountFunction)
  &&!/\b(?:insert|update|delete|replace|upsert|run)\b/i.test(workerCountFunction),
  'D1-count-readiness skal forblive en ren SELECT uden DML');
ok(/if \(url\.pathname === '\/v1\/trips\/count'\) \{[\s\S]*?return json\(503, \{ ok: false, error: 'COUNT_UNAVAILABLE' \}\);/.test(tripGatewayWorker),
  'Kun intern count-read-fejl skal blive en fast datasikker 503, så bounded retry kan skelne den fra kontraktfejl');
ok(String(pkg.scripts?.['test:hybrid-trip-storage']||'').includes('test-trip-storage-edge-transient-retry.mjs'),'Trip-storage Edge-retrytesten mangler package-binding');
for(const marker of [
  'Prepare ten EU-restricted D1 shards, schema and durable phase',
  'Require safe D1 storage headroom',
  'Record fail-closed intent for the already-live legacy D1 installation',
  'Persist the D1 boundary before quiescing the legacy installation',
  'Record current-run existing-D1 Edge predeployment intent',
  'Record current-run fresh-Supabase Edge predeployment intent',
  'Deploy exact maintenance-capable Edge functions while Worker and mode stay unchanged',
  'Attest both exact Edge boundaries in unchanged D1 mode before leasing maintenance',
  'Record current-run D1 repair intent immediately before quiescence',
  'Enter fail-closed expiring maintenance for every existing D1 installation',
  'TRIP_STORAGE_MODE="maintenance:$maintenance_until"',
  'Preserve the initial Supabase bridge only for a genuinely fresh D1 installation',
  'Require enough maintenance lease for bounded Worker replacement',
  'Install deploy and attest the private D1 gateway after Edge quiescence',
  'Record local fail-closed intent before a genuinely fresh D1 marker',
  'Persist the point of no return immediately before fresh D1 activation',
  'Activate normal Cloudflare D1 mode after verified Worker readiness',
  'Restore Supabase only for a proven fresh pre-activation installation',
  'Redeploy exact Edge functions for the restored fresh Supabase bridge',
  'Persist or reconfirm the D1 boundary during failure roll-forward',
  'Redeploy exact maintenance-capable Edge functions before failure maintenance',
  'Enter fail-closed expiring maintenance during D1 failure roll-forward',
  'Reinstall and redeploy the exact Worker after failure Edge quiescence',
  'Preserve D1 after the point of no return and repair forward',
]){
  ok(tripStorageWorkflow.includes(marker),`Trip-storage-workflowet mangler envejs/fasebevidst cutovermarkør: ${marker}`);
}
const unsafePublicRecoveryUse=/\bfallbackRuntime\b|\brecoveryFallbackActive\b|(?:manifest|data)\.recoveryFallback\b|function\s+recoveryFallbackUrl\b|active-last-verified|last-verified-public/.test(publicDataService);
ok(publicDataService.includes('sameRavScoreModelBinding')
  && publicDataService.includes("'recoveryFallback' in manifest")
  && publicDataService.includes("'emergencyFallback' in manifest")
  && !unsafePublicRecoveryUse,
'Offentlig dataindlæsning skal være atomisk schema-4 og må ikke omdirigeres til en public recoveryruntime');
ok(!/recoveryFallbackActive|recoveryFallback\?/.test(publicApp),
'Den offentlige app må ikke have en skjult Candidate G-/recoveryfallbackgren');
ok(publicApp.includes("t('data.couldNotLoad')")
  && publicI18n.includes('Aktuelle data kunne ikke indlæses. Gamle prognoser vises ikke.')
  && publicI18n.includes('Aktuelle Daten konnten nicht geladen werden. Alte Prognosen werden nicht angezeigt.')
  && publicI18n.includes('Current data could not be loaded. Old forecasts are not shown.')
  && publicI18n.includes('Den aktuelle atomiske prognosepakke kunne ikke verificeres. Ældre prognosedage vises ikke.')
  && publicI18n.includes('Das aktuelle atomische Prognosepaket konnte nicht verifiziert werden. Ältere Prognosetage werden nicht angezeigt.')
  && publicI18n.includes('The current atomic forecast bundle could not be verified. Older forecast days are not shown.'),
'Den offentlige brugerflade mangler DA/DE/EN fail-closed-tekst for en uverificeret atomisk datapakke eller startup');
const workflowPositions={
  preflightCache:buildWorkflow.indexOf('name: Restore dataminimized weather preflight metadata'),
  publicPreflightManifest:buildWorkflow.indexOf('name: Fetch only the deployed public manifest for weather preflight'),
  preflight:buildWorkflow.indexOf('name: Decide whether weather needs updating before private runtime download'),
  privateRuntimeExpected:buildWorkflow.indexOf('name: Build current private-runtime restore expectation'),
  privateRuntimeRestore:buildWorkflow.indexOf('name: Restore newest compatible private runtime from protected storage'),
  privateRuntimeVerify:buildWorkflow.indexOf('name: Verify and restore the private production runtime bundle'),
  privateRuntimeInstall:buildWorkflow.indexOf('name: Install only the allowlisted restored private runtime files'),
  checkpointRestore:buildWorkflow.indexOf('name: Restore the latest atomic schema-6 and Candidate G rollback checkpoint'),
  protectedCheckpointRestore:buildWorkflow.indexOf('name: Restore protected atomic RavScore checkpoint when cache is absent'),
  legacyBootstrapGate:buildWorkflow.indexOf('name: Resolve the one-time Candidate G bootstrap gate'),
  legacyBootstrapImport:buildWorkflow.indexOf('name: Import exact public Candidate G runtime only for first integrated bootstrap'),
  resolvedTarget:buildWorkflow.indexOf('name: Bind production to resolved DMI current hour'),
  weather:buildWorkflow.indexOf('name: Update central weather cache'),
  runtime:buildWorkflow.indexOf('name: Rebuild deterministic public weather runtime before validation and deploy'),
  runtimeAudit:buildWorkflow.indexOf('name: Audit actual integrated RavScore public runtime before deploy'),
  checkpointDisposition:buildWorkflow.indexOf('name: Create and validate exactly one checkpoint disposition before release gate'),
  validate:buildWorkflow.indexOf('name: Validate full project after fresh weather and current provenance'),
  releaseGate:buildWorkflow.indexOf('name: Run release governance gate after refreshed data validation'),
  validateData:buildWorkflow.indexOf('name: Validate updated weather cache'),
  checkpointBuild:buildWorkflow.indexOf('name: Build atomic schema-6 and Candidate G rollback checkpoint after final gates'),
  checkpointSave:buildWorkflow.indexOf('name: Save atomic schema-6 and Candidate G rollback checkpoint after final gates'),
  protectedCheckpointPublish:buildWorkflow.indexOf('name: Publish atomic RavScore checkpoint to protected admin storage'),
  preflightStateBuild:buildWorkflow.indexOf('name: Build dataminimized weather preflight state after final gates'),
  preflightStateSave:buildWorkflow.indexOf('name: Save dataminimized weather preflight state'),
  privateRuntimeSpec:buildWorkflow.indexOf('name: Build private production runtime bundle specification'),
  privateRuntimeCreate:buildWorkflow.indexOf('name: Create the next private production runtime bundle atomically'),
  privateRuntimeSave:buildWorkflow.indexOf('name: Publish bounded private runtime with one protected rollback generation'),
  privateRuntimeAnonAudit:buildWorkflow.indexOf('name: Prove the private runtime object is not anonymously readable'),
  artifact:buildWorkflow.indexOf('name: Build lean GitHub Pages artifact'),
  pagesPrivacyAudit:buildWorkflow.indexOf('name: Audit the complete Pages artifact for private runtime material'),
  pagesUpload:buildWorkflow.indexOf('name: Upload GitHub Pages artifact'),
};
for(const [step,position] of Object.entries(workflowPositions)){
  ok(position>=0,`Produktionsworkflowet mangler integreret RavScore-trin: ${step}`);
}
const workflowOrder=[
  'preflightCache','publicPreflightManifest','preflight','checkpointRestore','protectedCheckpointRestore',
  'privateRuntimeExpected','privateRuntimeRestore','privateRuntimeVerify','privateRuntimeInstall',
  'legacyBootstrapGate','legacyBootstrapImport',
  'resolvedTarget','weather','runtime','runtimeAudit','checkpointDisposition','validate','releaseGate','validateData',
  'checkpointBuild','checkpointSave','protectedCheckpointPublish','preflightStateBuild','preflightStateSave',
  'privateRuntimeSpec','privateRuntimeCreate','privateRuntimeSave','privateRuntimeAnonAudit','artifact','pagesPrivacyAudit','pagesUpload',
];
for(let index=1;index<workflowOrder.length;index+=1){
  const before=workflowOrder[index-1];
  const after=workflowOrder[index];
  ok(workflowPositions[before]<workflowPositions[after],`Produktionsworkflowets rækkefølge er ugyldig: ${before} skal ligge før ${after}`);
}
const lightweightPreflightSection=buildWorkflow.slice(workflowPositions.preflightCache,workflowPositions.checkpointRestore);
for(const marker of [
  'uses: actions/cache/restore@v6',
  'path: .cache/weather-preflight-state',
  'weather-preflight-state-v1-${{ runner.os }}-',
  'name: Fetch only the deployed public manifest for weather preflight',
  '--max-filesize 131072',
  'node scripts/private-production-runtime-workflow.mjs materialize-preflight',
  '--state "$state"',
  '--public-manifest "$RAVRADAR_PREFLIGHT_WORK/public-manifest.json"',
  '--output-root "$input_root"',
  'cp scripts/check-weather-update.py "$input_root/scripts/check-weather-update.py"',
  '(cd "$input_root" && python scripts/check-weather-update.py)',
  'reason=verified-light-preflight-unavailable',
]){
  ok(lightweightPreflightSection.includes(marker),`Tidlig dataminimeret vejrpreflight mangler ${marker}`);
}
ok(!lightweightPreflightSection.includes('protected-private-production-runtime.mjs')
  && !lightweightPreflightSection.includes('/tmp/ravradar-private-production-runtime/bundle'),
'Den tidlige vejrpreflight må ikke hente eller inspicere det fulde private runtimebundle');
const privateRuntimeRestoreSection=buildWorkflow.slice(workflowPositions.privateRuntimeExpected,workflowPositions.legacyBootstrapGate);
for(const marker of [
  'node scripts/private-production-runtime-workflow.mjs expected',
  '--target-reference "$RAVRADAR_PRODUCTION_TARGET_HOUR"',
  'node scripts/protected-private-production-runtime.mjs',
  '--restore',
  'node scripts/private-production-runtime-bundle.mjs restore',
  '--private-root "$RAVRADAR_PRIVATE_RUNTIME_ROOT"',
  '--bundle "$RAVRADAR_PRIVATE_RUNTIME_BUNDLE"',
  '--expected .cache/private-production-runtime-expected.json',
  '--output "$RAVRADAR_PRIVATE_RUNTIME_RESTORE"',
  'node scripts/private-production-runtime-workflow.mjs install',
  '--restored "$RAVRADAR_PRIVATE_RUNTIME_RESTORE"',
  '--repository-root "$GITHUB_WORKSPACE"',
  'SUPABASE_URL: ${{ secrets.SUPABASE_URL }}',
  'SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}',
]){
  ok(privateRuntimeRestoreSection.includes(marker),`Private produktionsruntime-restore mangler ${marker}`);
}
for(const step of ['privateRuntimeExpected','privateRuntimeRestore','privateRuntimeVerify','privateRuntimeInstall']){
  const start=workflowPositions[step];
  const end=buildWorkflow.indexOf('\n      - name:',start+1);
  const block=buildWorkflow.slice(start,end<0?buildWorkflow.length:end);
  ok(block.includes("if: steps.preflight.outputs.should_run == 'true'"),
    `${step} må ikke køre før den lette preflight har krævet en reel build`);
}
for(const marker of [
  'RAVRADAR_PRIVATE_RUNTIME_ROOT: /tmp/ravradar-private-production-runtime',
  'RAVRADAR_PRIVATE_RUNTIME_BUNDLE: /tmp/ravradar-private-production-runtime/bundle',
  'RAVRADAR_PRIVATE_RUNTIME_RESTORE: /tmp/ravradar-private-production-runtime/restored',
]){
  ok(buildWorkflow.includes(marker),`Workflowets private runtime-miljø mangler ${marker}`);
}
ok(!privateRuntimeRestoreSection.includes('path: .cache/private-production-runtime'),
'Det private produktionsbundle må ikke gendannes i repositoryets cachetræ');
ok(!buildWorkflow.includes('private-production-runtime-v1-')
  && !/actions\/cache\/(?:restore|save)@v6[\s\S]{0,240}path: \/tmp\/ravradar-private-production-runtime\/bundle/.test(buildWorkflow),
'Det fulde private runtimebundle må ikke lagres i GitHub Actions cache');
const checkpointRestoreSection=buildWorkflow.slice(workflowPositions.checkpointRestore,workflowPositions.privateRuntimeExpected);
for(const marker of [
  'uses: actions/cache/restore@v6',
  'path: .cache/ravscore-continuation-checkpoint',
  'ravscore-continuation-schema6-v2-',
  "if: steps.preflight.outputs.should_run == 'true'",
  "if: steps.preflight.outputs.should_run == 'true' && steps.ravscore-checkpoint-cache.outputs.cache-matched-key == ''",
  'node scripts/protected-ravscore-continuation-checkpoint.mjs',
  '--restore',
  '--target-reference "$RAVRADAR_PRODUCTION_TARGET_HOUR"',
  'SUPABASE_URL: ${{ secrets.SUPABASE_URL }}',
  'SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}',
]){
  ok(checkpointRestoreSection.includes(marker),`Protected schema-6 RavScore-restoren mangler ${marker}`);
}
ok(!checkpointRestoreSection.includes('node scripts/ravscore-continuation-checkpoint.mjs')
  && !checkpointRestoreSection.includes('--target data/live/conditions.json'),
'Schema-4 checkpoint-restoren må ikke mutere conditions direkte');
const legacyBootstrapSection=buildWorkflow.slice(workflowPositions.legacyBootstrapGate,workflowPositions.resolvedTarget);
for(const marker of [
  "if: steps.preflight.outputs.should_run == 'true'",
  'PRIVATE_RUNTIME_AVAILABLE: ${{ steps.private-runtime-state.outputs.available }}',
  'OPERATIONAL_ACTION: ${{ steps.operational-action.outputs.action }}',
  'test -f .cache/ravscore-continuation-checkpoint/checkpoint.json',
  'elif test "$OPERATIONAL_ACTION" = "integrated-cutover"; then',
  'echo "required=true" >> "$GITHUB_OUTPUT"',
  'elif test "$OPERATIONAL_ACTION" = "integrated"; then',
  'echo "stateless_integrated_recovery=true" >> "$GITHUB_OUTPUT"',
  'No protected continuation exists; active integrated scoring will use measured state-less recovery.',
  'No protected continuation exists; this non-integrated action remains fail-closed.',
  "if: steps.legacy-bootstrap.outputs.required == 'true'",
  'python scripts/hydrate-deployed-weather.py --legacy-candidate-g-bootstrap',
  'RAVRADAR_DEPLOYED_BASE_URL:',
]){
  ok(legacyBootstrapSection.includes(marker),`Candidate G-engangsbootstrap mangler ${marker}`);
}
ok((legacyBootstrapSection.match(/stateless_integrated_recovery=true/g)||[]).length===1
  &&(legacyBootstrapSection.match(/stateless_integrated_recovery=false/g)||[]).length===3
  &&(legacyBootstrapSection.match(/required=true/g)||[]).length===1
  &&(legacyBootstrapSection.match(/required=false/g)||[]).length===3,
'Legacy-bootstrap skal have præcis én first-cutover-gren og én exact-integrated state-less recoverygren');
const activeIntegratedRecoveryBranch=legacyBootstrapSection.slice(
  legacyBootstrapSection.indexOf('elif test "$OPERATIONAL_ACTION" = "integrated"; then'),
  legacyBootstrapSection.indexOf('\n          else',legacyBootstrapSection.indexOf('elif test "$OPERATIONAL_ACTION" = "integrated"; then')),
);
ok(activeIntegratedRecoveryBranch.includes('echo "required=false" >> "$GITHUB_OUTPUT"')
  &&activeIntegratedRecoveryBranch.includes('echo "stateless_integrated_recovery=true" >> "$GITHUB_OUTPUT"')
  &&!activeIntegratedRecoveryBranch.includes('required=true'),
'Kun exact active integrated må vælge measured state-less recovery uden legacy bootstrap');
const firstCutoverGuard="steps.operational-action.outputs.action == 'integrated-cutover' && steps.legacy-bootstrap.outputs.required == 'true'";
const waveResolverStart=buildWorkflow.indexOf('name: Resolve one aggregate Candidate G wave-bootstrap target');
const dmiBulkStart=buildWorkflow.indexOf('name: Update DMI bulk model cache');
const waveResolverSection=buildWorkflow.slice(waveResolverStart,dmiBulkStart);
const dmiBulkSection=buildWorkflow.slice(dmiBulkStart,workflowPositions.weather);
const weatherSection=buildWorkflow.slice(workflowPositions.weather,workflowPositions.runtime);
ok(waveResolverStart>=0&&dmiBulkStart>waveResolverStart
  && waveResolverSection.includes(`if: ${firstCutoverGuard}`),
'Candidate G-maintenance må aldrig starte den integrerede WAM-resolver');
for(const marker of [
  `DMI_BULK_MAX_DOWNLOAD_MB: \${{ ${firstCutoverGuard} && '4096' || '2048' }}`,
  `DMI_BULK_MAX_RUNTIME_SECONDS: \${{ ${firstCutoverGuard} && '3000' || '900' }}`,
  `DMI_BULK_FINALIZE_RESERVE_SECONDS: \${{ ${firstCutoverGuard} && '180' || '120' }}`,
  `DMI_BULK_PRIVATE_WAVE_BOOTSTRAP_MODE: \${{ ${firstCutoverGuard} && steps.ravscore-wave-bootstrap-target.outputs.mode || 'none' }}`,
]){
  ok(dmiBulkSection.includes(marker),`DMI-producenten mangler actionbundet first-cutover-miljø: ${marker}`);
}
for(const marker of [
  `RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODE: \${{ ${firstCutoverGuard} && steps.ravscore-wave-bootstrap-target.outputs.mode || 'auto' }}`,
  `RAVSCORE_FIRST_CUTOVER_SOURCE_VALIDATED: \${{ ${firstCutoverGuard} && steps.ravscore-wave-bootstrap-target.outputs.source_validated || 'false' }}`,
  "RAVSCORE_STATELESS_INTEGRATED_COLD_START_ALLOWED: ${{ steps.operational-action.outputs.action == 'integrated' && steps.legacy-bootstrap.outputs.stateless_integrated_recovery == 'true' && 'true' || 'false' }}",
]){
  ok(weatherSection.includes(marker),`Vejrgeneratoren mangler actionbundet first-cutover-attestering: ${marker}`);
}
for(const marker of [
  'def reset_private_part_wave_cache(',
  'reset_rows = reset_private_part_wave_cache(result, parts)',
  'aggregate["cacheFirst"]["resetWaveRowCount"] = reset_rows',
  'def process_grib_transactionally(',
  'restore_mapping(diagnostics, diagnostics_snapshot)',
  'commit_asset_stage_document(output, output_stage)',
  'def write_checkpoint(',
  '"validation": "pending-finalization"',
  'atomic_write_bulk_cache(result, pretty=False)',
  'def write_finalized_cache(',
  'atomic_write_bulk_cache(result, pretty=True)',
  'write_ocean_diagnostics(result)',
  'class ProgressCheckpointController:',
]){
  ok(dmiBulkProducer.includes(marker),`DMI asset-/checkpointkæden mangler atomisk progression: ${marker}`);
}
ok((buildWorkflow.match(/python scripts\/hydrate-deployed-weather\.py/g)||[]).length===2
  && legacyBootstrapSection.includes('--root "$RAVRADAR_LEGACY_SOURCE_ROOT"')
  && !buildWorkflow.includes('name: Hydrate latest deployed weather state'),
'Generisk offentlig hydration skal være pensioneret; kun Candidate G-engangsbootstrap og den isolerede attesterede legacy-kilde må findes');
const runtimeAuditSection=buildWorkflow.slice(workflowPositions.runtimeAudit,workflowPositions.validate);
for(const marker of [
  'id: ravscore-integrated-runtime-audit',
  "if: steps.preflight.outputs.should_run == 'true'",
  'audit_path=.geometry-v2-work/ravscore-integrated-public-runtime-audit.json',
  'node scripts/audit-ravscore-integrated-public-runtime.mjs',
  '--input data/live/conditions.json',
  '--output "$audit_path"',
  '.rollback.status | select(. == "READY" or . == "BUILDING_MEASURED_ONLY")',
  '.rollback.activationReady | select(type == "boolean")',
  '.history.allCurrentScoresFullHistory | select(type == "boolean")',
  'echo "rollback_status=$rollback_status" >> "$GITHUB_OUTPUT"',
  'echo "rollback_activation_ready=$rollback_activation_ready" >> "$GITHUB_OUTPUT"',
  'echo "all_current_scores_full_history=$all_current_scores_full_history" >> "$GITHUB_OUTPUT"',
]){
  ok(runtimeAuditSection.includes(marker),`Den integrerede public runtimeaudit mangler ${marker}`);
}
ok(!runtimeAuditSection.includes('continue-on-error'),'Den integrerede public runtimeaudit må ikke være vejledende');
const checkpointDispositionSection=buildWorkflow.slice(
  workflowPositions.checkpointDisposition,
  workflowPositions.validate,
);
for(const marker of [
  'id: checkpoint-disposition',
  "if: steps.preflight.outputs.should_run == 'true'",
  'disposition_path=.geometry-v2-work/ravscore-continuation-checkpoint-disposition.json',
  'READY_PUBLISHED',
  'NOT_APPLICABLE_DURING_MEASURED_WARMUP',
  'checkpoint_required="true"',
  'checkpoint_required="false"',
  'dataset_id="$(jq -er \'.datasetId | select(type == "string" and length > 0)\' data/live/manifest.json)"',
  'runtime_audit_sha256=',
  'sha256CanonicalJson',
  'ravscore-continuation-checkpoint-disposition-v1',
  'sourceHead:$sourceHead',
  'datasetId:$datasetId',
  'runtimeAuditSha256:$runtimeAuditSha256',
  'rollbackStatus:$rollbackStatus',
  'rollbackActivationReady:$rollbackActivationReady',
  'checkpointRequired:$checkpointRequired',
  'privatePayloadIncluded:false',
  'bindingSha256',
  'Unexpected checkpoint disposition fields',
  'Checkpoint disposition binding mismatch',
  'echo "disposition=$disposition" >> "$GITHUB_OUTPUT"',
  'echo "disposition_sha256=$disposition_sha256" >> "$GITHUB_OUTPUT"',
  'echo "dataset_id=$dataset_id" >> "$GITHUB_OUTPUT"',
  'echo "runtime_audit_sha256=$runtime_audit_sha256" >> "$GITHUB_OUTPUT"',
]){
  ok(checkpointDispositionSection.includes(marker),`Den obligatoriske hashbundne checkpointdisposition mangler ${marker}`);
}
ok(!checkpointDispositionSection.includes('continue-on-error'),
  'Checkpointdispositionen må ikke skjule en kontraktfejl');
ok(!buildWorkflow.includes('ravscore-continuation-checkpoint-applicability'),
  'Den valgfri applicability-ghostfil må ikke længere findes i produktionsworkflowet');
const checkpointSaveSection=buildWorkflow.slice(workflowPositions.checkpointBuild,workflowPositions.privateRuntimeSpec);
for(const marker of [
  "if: steps.preflight.outputs.should_run == 'true' && steps.weather.outcome == 'success'",
  'node scripts/ravscore-continuation-checkpoint.mjs',
  '--save',
  '--source data/live/conditions.json',
  'uses: actions/cache/save@v6',
  'ravscore-continuation-schema6-v2-${{ github.run_id }}-${{ github.run_attempt }}',
  'node scripts/protected-ravscore-continuation-checkpoint.mjs',
  '--publish',
  '--target-reference "$RAVRADAR_PRODUCTION_TARGET_HOUR"',
  'SUPABASE_URL: ${{ secrets.SUPABASE_URL }}',
  'SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}',
]){
  ok(checkpointSaveSection.includes(marker),`Schema-4 RavScore-checkpointbevaringen mangler ${marker}`);
}
ok(!checkpointSaveSection.includes('continue-on-error'),'Protected checkpoint-publicering må ikke skjule fejl');
for(const name of [
  'Build atomic schema-6 and Candidate G rollback checkpoint after final gates',
  'Save atomic schema-6 and Candidate G rollback checkpoint after final gates',
  'Reconfirm current main before protected RavScore write',
  'Publish atomic RavScore checkpoint to protected admin storage',
]){
  const start=buildWorkflow.indexOf(`name: ${name}`);
  const end=buildWorkflow.indexOf('\n      - name:',start+1);
  const block=buildWorkflow.slice(start,end<0?buildWorkflow.length:end);
  ok(block.includes("steps.ravscore-integrated-runtime-audit.outputs.rollback_activation_ready == 'true'"),
    `${name} må kun køre med attesteret READY rollback-aktivering`);
}
const preflightStateSaveSection=buildWorkflow.slice(workflowPositions.preflightStateBuild,workflowPositions.privateRuntimeSpec);
for(const marker of [
  "if: steps.preflight.outputs.should_run == 'true' && steps.weather.outcome == 'success' && steps.operational-action.outputs.action != 'candidate-dry-run'",
  'node scripts/private-production-runtime-workflow.mjs create-preflight',
  '--repository-root "$GITHUB_WORKSPACE"',
  '--output .cache/weather-preflight-state/state.json',
  'uses: actions/cache/save@v6',
  'path: .cache/weather-preflight-state',
  'weather-preflight-state-v1-${{ runner.os }}-${{ github.run_id }}-${{ github.run_attempt }}',
]){
  ok(preflightStateSaveSection.includes(marker),`Dataminimeret vejrpreflight-bevaring mangler ${marker}`);
}
ok(!preflightStateSaveSection.includes('continue-on-error'),
'Dataminimeret vejrpreflight-state skal bygges og gemmes fail-closed efter slutgates');
const privateRuntimeSaveSection=buildWorkflow.slice(workflowPositions.privateRuntimeSpec,workflowPositions.artifact);
for(const marker of [
  'node scripts/private-production-runtime-workflow.mjs create-spec',
  '--repository-root "$GITHUB_WORKSPACE"',
  '--output .cache/private-production-runtime-create-spec.json',
  'node scripts/private-production-runtime-bundle.mjs create',
  '--private-root "$RAVRADAR_PRIVATE_RUNTIME_ROOT"',
  '--bundle "$RAVRADAR_PRIVATE_RUNTIME_BUNDLE"',
  '--spec .cache/private-production-runtime-create-spec.json',
  'name: Reconfirm current main before protected private-runtime write',
  'node scripts/protected-private-production-runtime.mjs',
  '--publish',
  '--expected .cache/private-production-runtime-expected.json',
  '--source-head "$GITHUB_SHA"',
  'name: Prove the private runtime object is not anonymously readable',
  '--audit-anon',
  'SUPABASE_URL: ${{ secrets.SUPABASE_URL }}',
  'SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}',
]){
  ok(privateRuntimeSaveSection.includes(marker),`Private produktionsruntime-bevaring mangler ${marker}`);
}
ok(!buildWorkflow.slice(workflowPositions.privateRuntimeSpec,workflowPositions.privateRuntimeSave).includes('continue-on-error'),
'Det private runtimebundle skal bygges fail-closed');
for(const name of [
  'Build private production runtime bundle specification',
  'Create the next private production runtime bundle atomically',
  'Reconfirm current main before protected private-runtime write',
  'Publish bounded private runtime with one protected rollback generation',
  'Prove the private runtime object is not anonymously readable',
]){
  const start=buildWorkflow.indexOf(`name: ${name}`);
  const end=buildWorkflow.indexOf('\n      - name:',start+1);
  const block=buildWorkflow.slice(start,end<0?buildWorkflow.length:end);
  ok(!block.includes('rollback_activation_ready'),
    `${name} skal bevare measured-only warmup uafhængigt af checkpoint-readiness`);
}
const operationalHandoffSection=buildWorkflow.slice(
  buildWorkflow.indexOf('name: Seal privacy-safe operational deploy handoff'),
  buildWorkflow.indexOf('name: Decide whether this sealed artifact may deploy'),
);
for(const marker of [
  'cp .geometry-v2-work/ravscore-continuation-checkpoint-disposition.json "$RAVRADAR_OPERATIONAL_HANDOFF/checkpoint-disposition.json"',
  'cp .geometry-v2-work/ravscore-integrated-public-runtime-audit.json "$RAVRADAR_OPERATIONAL_HANDOFF/checkpoint-runtime-audit.json"',
  'checkpoint_disposition="${{ steps.checkpoint-disposition.outputs.disposition }}"',
  'checkpoint_disposition_sha256="${{ steps.checkpoint-disposition.outputs.disposition_sha256 }}"',
  'checkpoint_build_outcome="${{ steps.checkpoint-build.outcome }}"',
  'checkpoint_save_outcome="${{ steps.checkpoint-save.outcome }}"',
  'checkpoint_publish_outcome="${{ steps.checkpoint-publish.outcome }}"',
  'ravscore-continuation-checkpoint-disposition-v1',
  'recomputed_runtime_audit_sha256=',
  'Checkpoint disposition binding mismatch',
  'READY_PUBLISHED)',
  'NOT_APPLICABLE_DURING_MEASURED_WARMUP)',
  'test "$checkpoint_build_outcome" = "success"',
  'test "$checkpoint_save_outcome" = "success"',
  'test "$checkpoint_publish_outcome" = "success"',
  'checkpointDisposition:$checkpointDisposition',
  'checkpointDispositionSha256:$checkpointDispositionSha256',
  'checkpointDatasetId:$checkpointDatasetId',
  'checkpointRuntimeAuditSha256:$checkpointRuntimeAuditSha256',
  'checkpointBuildOutcome:$checkpointBuildOutcome',
  'checkpointSaveOutcome:$checkpointSaveOutcome',
  'checkpointPublishOutcome:$checkpointPublishOutcome',
]){
  ok(operationalHandoffSection.includes(marker),`Det privacy-sikre handoff mangler obligatorisk checkpointdisposition: ${marker}`);
}
ok(!operationalHandoffSection.includes('if [ -f .geometry-v2-work/ravscore-continuation-checkpoint-disposition.json ]; then'),
  'Checkpointdispositionen må ikke være et valgfrit ghost proof i handoffet');
for(const forbidden of [
  'ravscore_active_shadow',
  'ravscore-active-shadow:',
  'Restore last verified Candidate G public fallback',
  'Stage audited last verified Candidate G public fallback',
  'Save last verified Candidate G public fallback',
  'candidate-g-last-ready-public-v1-',
  'candidate-g-public-recovery-fallback.mjs',
  'Audit actual Candidate G public runtime before deploy',
  'audit-ravscore-candidate-g-public-shadow.mjs',
  'Publish bounded Candidate G recovery fallback',
  'restore-candidate-g-continuation.mjs',
  'restore-candidate-g-gap-checkpoint.mjs',
  'candidate-g-continuation-checkpoint-v1-',
  'candidate-g-continuation-checkpoint.mjs',
]){
  ok(!buildWorkflow.includes(forbidden),`Den aktive produktionsvej må ikke indeholde Candidate G-checkpoint/shadow/fallback: ${forbidden}`);
}
for(const protectedPath of ['handbook.html','documentation.html','data/diagnostics/','data/geometry-v2/','.geometry-v2-work/','data/live/']){
  ok(buildWorkflow.includes(`--exclude '${protectedPath}'`)||buildWorkflow.includes(`--exclude \"${protectedPath}\"`),`Pages-workflow udelukker ikke ${protectedPath}`);
}
const pagesArtifactSection=buildWorkflow.slice(workflowPositions.artifact,workflowPositions.pagesPrivacyAudit);
const expectedPagesLiveFiles=['coastal-parts-v2.json','manifest.json','public-condition-details.json','public-conditions.json'];
const installedPagesLiveFiles=[...pagesArtifactSection.matchAll(/install -m 0644 "\$pages_source\/data\/live\/([^"\s]+)" "\$pages_destination\/data\/live\/([^"\s]+)"/g)]
  .map(match=>{
    ok(match[1]===match[2],`Pages-installationen må ikke omdøbe ${match[1]} til ${match[2]}`);
    return match[1];
  })
  .sort();
ok(JSON.stringify(installedPagesLiveFiles)===JSON.stringify(expectedPagesLiveFiles),
`Pages-artifactets live-allowliste skal være præcis fire filer: ${installedPagesLiveFiles.join(', ')||'(ingen)'}`);
const pagesLiveWriteLines=pagesArtifactSection.split('\n').map(line=>line.trim()).filter(line=>line.includes('$pages_destination/data/live'));
ok(pagesLiveWriteLines.length===5
  && pagesLiveWriteLines[0]==='mkdir -p "$pages_destination/data/live"'
  && pagesLiveWriteLines.slice(1).every(line=>line.startsWith('install -m 0644 "$pages_source/data/live/')),
'Pages-workflowet må kun oprette live-mappen og installere de fire allowlistede filer');
const pagesPrivacyAuditSection=buildWorkflow.slice(workflowPositions.pagesPrivacyAudit,workflowPositions.pagesUpload);
for(const marker of [
  'node scripts/audit-pages-artifact-privacy.mjs',
  '--site _site',
  '--private-manifest "$RAVRADAR_PRIVATE_RUNTIME_BUNDLE/manifest.json"',
  '--require-private-manifest',
]){
  ok(pagesPrivacyAuditSection.includes(marker),`Pages-privacygaten mangler ${marker}`);
}
ok(!pagesPrivacyAuditSection.includes('continue-on-error'),'Pages-privacygaten skal være fail-closed før upload');
for(const marker of [
  "'NOOP'",
  "'DEFERRED'",
  "'BUILT'",
  "'DEPLOYED'",
  "'FAILED'",
  "PRODUCTION_WORKFLOW_OUTCOME_SCHEMA = 'ravradar-production-workflow-outcome-v2'",
  'privatePayloadIncluded: false',
  "'READY_PUBLISHED'",
  "'NOT_APPLICABLE_DURING_MEASURED_WARMUP'",
  'checkpointProofIsDeploymentReady',
  "CHECKPOINT_DISPOSITION_MISSING_OR_INCONSISTENT",
  "return result('DEPLOYED', 'PUBLIC_DEPLOYMENT_VERIFIED')",
  "return result('FAILED', 'DEPLOYMENT_NOT_VERIFIED')",
]){
  ok(productionWorkflowOutcome.includes(marker),`Produktionsslutstatuskontrakten mangler ${marker}`);
}
const deployWorkflowPositions={
  checkpointBegin:deployWorkflow.indexOf('name: Validate checkpoint disposition before any Pages begin CAS'),
  deploy:deployWorkflow.indexOf('name: Deploy to GitHub Pages'),
  verify:deployWorkflow.indexOf('name: Verify deployed exact model, implementation and 210/673 artifact'),
  checkpointComplete:deployWorkflow.indexOf('name: Revalidate checkpoint disposition before Pages completion CAS'),
  terminal:deployWorkflow.indexOf('name: Seal exact verified deployment terminal'),
};
for(const [step,position] of Object.entries(deployWorkflowPositions)){
  ok(position>=0,`Deploy-workflowet mangler terminaltrin: ${step}`);
}
ok(deployWorkflowPositions.checkpointBegin<deployWorkflowPositions.deploy
  && deployWorkflowPositions.deploy<deployWorkflowPositions.verify
  && deployWorkflowPositions.verify<deployWorkflowPositions.checkpointComplete
  && deployWorkflowPositions.checkpointComplete<deployWorkflowPositions.terminal,
'DEPLOYED må først forsegles efter checkpointvalidering ved begin/complete samt offentlig exact model/210/673-verifikation');
for(const marker of [
  'id: checkpoint-disposition-begin',
  'id: checkpoint-disposition-complete',
  "read('checkpoint-disposition.json')",
  "read('checkpoint-runtime-audit.json')",
  'sha256CanonicalJson(binding)',
  'sha256CanonicalJson(runtimeAudit)',
  "handoff.checkpointBuildOutcome !== 'success'",
  "handoff.checkpointPublishOutcome !== 'skipped'",
]){
  ok(deployWorkflow.includes(marker),`Pages-workflowets obligatoriske checkpointvalidering mangler ${marker}`);
}
const orchestratorDeployJob=orchestratorWorkflow.indexOf('\n  deploy-pages:');
const outcomeJob=orchestratorWorkflow.indexOf('\n  production-outcome:');
ok(orchestratorDeployJob>=0&&outcomeJob>orchestratorDeployJob,
'Orchestratoren skal afslutte den genbrugelige deployrolle før terminalstatus klassificeres');
const outcomeSection=orchestratorWorkflow.slice(outcomeJob);
for(const marker of [
  'if: always()',
  'node scripts/production-workflow-outcome.mjs',
  'name: ravradar-production-outcome-${{ github.run_id }}-${{ github.run_attempt }}',
  'path: .workflow-outcome/production-outcome.json',
  'RAVRADAR_OUTCOME_CHECKPOINT_DISPOSITION:',
  'RAVRADAR_OUTCOME_CHECKPOINT_DISPOSITION_SHA256:',
  'RAVRADAR_OUTCOME_CHECKPOINT_DATASET_ID:',
  'RAVRADAR_OUTCOME_CHECKPOINT_RUNTIME_AUDIT_SHA256:',
  'RAVRADAR_OUTCOME_CHECKPOINT_BUILD:',
  'RAVRADAR_OUTCOME_CHECKPOINT_SAVE:',
  'RAVRADAR_OUTCOME_CHECKPOINT_PUBLISH:',
  "if: always() && steps.classify.outputs.status == 'FAILED'",
  'exit 1',
]){
  ok(outcomeSection.includes(marker),`Workflowets terminalstatus mangler ${marker}`);
}
for(const forbidden of ['secrets.','SUPABASE_','data/live/','currentUMps','currentVMps','waterPoint','landPoint','coordinates']){
  ok(!outcomeSection.includes(forbidden),`Det payloadfri terminalstatusjob må ikke indeholde ${forbidden}`);
}
ok(!buildWorkflow.includes("--exclude 'js/services/handbook-review-store.js'"),'Pages-workflow må ikke udelukke et browsermodul som admin importerer');
for(const retiredGpsRuntime of ['js/services/trip-service.js','js/services/trip-evidence-legacy-bridge.js']){
  ok(buildWorkflow.includes(`--exclude '${retiredGpsRuntime}'`),`Pages-workflow skal udelukke pensioneret GPS-runtime: ${retiredGpsRuntime}`);
}
ok(buildWorkflow.includes("--exclude 'data/admin/'"),'Pages-workflow skal udelukke rå centrale adminfiler');
ok(buildWorkflow.includes("--exclude '_support/'"),'Pages-workflow skal udelukke supportmappen fra det offentlige artifact');
ok(buildWorkflow.includes("--exclude 'RavRadar-support-*.zip'"),'Pages-workflow skal udelukke support-ZIP fra det offentlige artifact');
for(const retiredPublicPath of ['js/ui/admin-app.js','js/core/rule-engine.js','js/services/rule-service.js','rules/']){
  ok(buildWorkflow.includes(`--exclude '${retiredPublicPath}'`),`Pages-workflow skal holde det pensionerede regelværksted ude af det offentlige artifact: ${retiredPublicPath}`);
}
ok(!buildWorkflow.includes('generate-public-admin-rules.mjs'),'Workflowet må ikke publicere historiske administratorregler');
ok(!await exists('scripts/generate-public-admin-rules.mjs'),'Et pensioneret udgivelsesværktøj må ikke kunne genaktivere administratorregler');
const publicRuleService=await read('js/services/rule-service.js');
ok(!publicRuleService.includes('admin-active-rules.json'),'Offentlig regelservice må ikke indlæse centralt gemte administratorregler');
ok(!publicRuleService.includes("localStorage.getItem('ravradar-admin-rules-v1')"),'Offentlig RavScore må ikke afhænge af lokale administratorregler');
const adminHtml=await read('admin.html');
ok(!adminHtml.includes('data-tab="rules"')&&!adminHtml.includes('data-tab="knowledge"'),'Det pensionerede Regelværksted må ikke kunne åbnes i administrationen');
ok(!/ruleDialog|ruleTestDialog|ruleImportInput/.test(adminHtml),'Skjulte dialoger fra Regelværkstedet må ikke ligge i adminfladen');
ok(adminHtml.includes('>Kalibreringsgrundlag<')&&!adminHtml.includes('>Model-forslag<'),'Admin skal vise et skrivebeskyttet kalibreringsgrundlag, ikke en lokal scoremodel');
const adminDashboard=await read('js/ui/admin-dashboard.js');
ok(!/renderRules|renderKnowledge|openRuleEditor|queueAdminDocumentSave\('rules'|rules_(edit|publish)/.test(adminDashboard),'Skjult Regelværksted-kode må ikke være en aktiv del af adminmodulet');
ok(!/adaptive-model|activateAdaptiveModel|rollbackAdaptiveModel|localModel/.test(adminDashboard),'Kalibreringsgrundlaget må ikke kunne aktivere eller tilbagerulle en lokal scoremodel');
ok(adminDashboard.includes('Siden ændrer aldrig')
  && adminDashboard.includes('den offentlige RavScore')
  && !adminDashboard.includes('Siden ændrer aldrig Candidate G'),
'Kalibreringsgrundlaget skal være tydeligt skrivebeskyttet uden at kalde Candidate G aktiv');
const serviceWorker=await read('service-worker.js');
ok(!/rule-engine|rule-service|(?:national|local|experimental)-rules\.json/.test(serviceWorker),'Regelværkstedets gamle motor og regelsæt må ikke ligge i den offentlige offlinepakke');
const moduleClosureTest=await read('scripts/test-pages-module-closure-4.0.68.mjs');
ok(moduleClosureTest.includes('Pages-artifact mangler browsermodul')&&moduleClosureTest.includes('handbook-review-store.js'),'Release mangler Pages-modullukningstest');
for(const [role,source] of Object.entries(productionWorkflows)){
  ok(source.includes('SUPABASE_URL')&&source.includes('SUPABASE_SERVICE_ROLE_KEY'),`${role}-workflowet mangler Supabase-secretinterfacet`);
  ok(!source.includes('sb_secret_'),`${role}-workflowet indeholder en konkret sb_secret_-værdi`);
}
const manifest=await readJson('manifest.webmanifest',{});
ok(String(manifest.start_url||'').startsWith('.'),'Manifest start_url skal være relativ for domæneskift');
ok(manifest.display==='standalone'&&manifest.scope==='.'+'/'&&manifest.id==='.'+'/',
'Manifestet skal installere RavRadar som en afgrænset standalone-webapp');
ok(Array.isArray(manifest.icons)
  && manifest.icons.some(icon=>icon?.src==='assets/icons/ravradar-192.png'&&icon?.sizes==='192x192'&&icon?.type==='image/png')
  && manifest.icons.some(icon=>icon?.src==='assets/icons/ravradar-512.png'&&icon?.sizes==='512x512'&&icon?.type==='image/png'),
'Manifestet mangler de installerbare 192- og 512-pixels appikoner');
ok(!await exists('CNAME'),'CNAME må først aktiveres, når DNS og Supabase redirects er klar');
const decision=await read('docs/rdks/10_DECISIONS/DEC-0013-RELEASE-GOVERNANCE.md');
ok(decision.includes('Obligatorisk Release Governance'),'RDKS release-governance mangler');
const rules=await read('docs/rdks/01_AI_OPERATING_RULES.md');
ok(rules.includes('Bindende release-gate'),'AI operating rules mangler bindende release-gate');
const trackedSecretPatterns=[/SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["']?(sb_secret_|eyJ)/i,/DMI_API_KEY\s*[:=]\s*["'][^$]/i,/DATAFORDELER_API_KEY\s*[:=]\s*["'][^$]/i];
for(const rel of ['config.js',...Object.values(PRODUCTION_WORKFLOW_SOURCES),'scripts/sync-admin-config.py','scripts/sync-protected-admin-assets.mjs','scripts/lib/supabase-admin-rest.mjs']){
  const text=await read(rel); for(const rx of trackedSecretPatterns)ok(!rx.test(text),`${rel} ser ud til at indeholde en konkret hemmelig nøgle`);
}
if(errors.length){console.error('\nRELEASE GATE FEJLEDE:\n- '+errors.join('\n- '));process.exit(1)}
const report={version,checkedAt:new Date().toISOString(),status:'passed',checks:{versionConsistency:true,handbook:true,rdks:true,supabase:true,ravScoreIntegratedModel:true,ravScoreSchema6Continuation:true,activeHistoryIncompleteForecast:true,protectedRavScoreCheckpoint:true,privateProductionRuntime:true,legacySourceTransition:true,historicalBindingMaintenance:true,atomicSchema4PublicRuntime:true,pagesArtifactPrivacy:true,operationalPagesRecovery:true,productionWorkflowOutcome:true,protectedPagesArtifact:true,domainReadiness:true,secretsScan:true,packagingPolicy:true}};
await fs.mkdir('release',{recursive:true});
await fs.writeFile('release/RELEASE-REPORT.json',JSON.stringify(report,null,2)+'\n');
await fs.writeFile('release/RELEASE-REPORT.md',`# Release-rapport ${version}\n\n- Status: **BESTÅET**\n- Kontrolleret: ${report.checkedAt}\n- Versionskonsistens: OK\n- Håndbog og RDKS: OK\n- Supabase- og rettighedskæde: OK\n- Integreret RavScore + schema-6 continuation: OK\n- Aktiv 118-timers/5-dages HISTORY_INCOMPLETE-prognose: OK\n- Protected checkpoint og privat runtimebundle: OK\n- Attesteret legacy-kilde, afgrænset Candidate G-bro og første cutover: OK\n- Historisk Candidate/integrated exact-binding-vedligeholdelse: OK\n- Atomisk schema-4 public runtime uden offentlig shadowmodel: OK\n- Fire-fils Pages-allowliste og privacy-audit: OK\n- Operationel exact-target Pages-recovery med delt writer/finalizer: OK\n- Maskinlæsbar NOOP/DEFERRED/BUILT/DEPLOYED/FAILED-produktionsstatus: OK\n- Domæneberedskab: OK\n- Hemmelighedsscanning: OK\n- Pakningspolitik: OK\n\nBemærk: Rapporten dokumenterer lokale kontroller. En faktisk grøn GitHub Actions-kørsel skal stadig verificeres efter push.\n`);
console.log(`Release gate bestået for RavRadar ${version}.`);
