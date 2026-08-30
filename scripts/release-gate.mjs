import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  RAVSCORE_BEST_TIME_POLICY_ID,
  RAVSCORE_COMPONENT_SCHEMA_ID,
  RAVSCORE_CURRENT_SUPPLY_POLICY,
  RAVSCORE_EXPLANATION_SCHEMA_ID,
  RAVSCORE_HUNTABILITY_POLICY,
  RAVSCORE_LAST_MILE_POLICY,
  RAVSCORE_MODEL_BUNDLE_SHA256,
  RAVSCORE_MODEL_CONTRACT_SHA256,
  RAVSCORE_MODEL_CONTRACT,
  RAVSCORE_MODEL_ID,
  RAVSCORE_PRESENTATION_POLICY,
  RAVSCORE_PRESENTATION_POLICY_ID,
  RAVSCORE_PROFILE_ID,
  RAVSCORE_RANKING_POLICY_ID,
  RAVSCORE_STATE_SCHEMA_VERSION,
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

const root=process.cwd();
const read=rel=>fs.readFile(path.join(root,rel),'utf8');
const exists=async rel=>{try{await fs.access(path.join(root,rel));return true}catch{return false}};
const pkg=JSON.parse(await read('package.json'));
const version=pkg.version;
const errors=[];
const ok=(cond,msg)=>{if(!cond)errors.push(msg)};

const publicLearningTest=spawnSync(process.execPath,['scripts/test-public-learning-module-4.0.268.mjs'],{cwd:root,stdio:'inherit'});
ok(publicLearningTest.status===0,'Det offentlige læringsmodul eller sproggaten fejlede');
const publicScoreExplanationTest=spawnSync(process.execPath,['scripts/test-public-score-explanations-4.0.269.mjs'],{cwd:root,stdio:'inherit'});
ok(publicScoreExplanationTest.status===0,'De offentlige RavScore-forklaringer eller den forenklede zonevisning fejlede');
for(const rel of [
  'scripts/build-ravscore-model-bundle.mjs',
  'scripts/test-ravscore-model-bundle.mjs',
  'scripts/test-candidate-g-rollback-bundle.mjs',
  'scripts/test-ravscore-candidate-g-operational-rollback.mjs',
  'scripts/test-prepare-candidate-g-operational-rollback.mjs',
  'scripts/test-candidate-g-rollback-public-stage.mjs',
  'scripts/test-candidate-g-rollback-trip-backend.mjs',
  'scripts/test-candidate-g-rollback-assistant-local.mjs',
  'scripts/test-ravscore-operational-pages-deployment.mjs',
  'scripts/test-ravscore-active-explanation-presenter.mjs',
  'scripts/test-ravscore-operational-activation.mjs',
  'scripts/sync-ravscore-model-binding.mjs',
  'scripts/test-ravscore-integrated-model.mjs',
  'scripts/test-ravscore-integrated-state-pipeline.mjs',
  'scripts/test-ravscore-integrated-generator.mjs',
  'scripts/test-ravscore-public-model.mjs',
  'scripts/test-ravscore-public-runtime-contract.mjs',
  'scripts/test-ravscore-public-data-service-binding.mjs',
  'scripts/test-ravscore-profile-transition.mjs',
  'scripts/test-ravscore-continuation-checkpoint.mjs',
  'scripts/test-protected-ravscore-continuation-checkpoint.mjs',
  'scripts/test-private-production-runtime-bundle.mjs',
  'scripts/test-private-production-runtime-workflow.mjs',
  'scripts/test-pages-artifact-privacy.mjs',
  'scripts/test-hydrated-atomic-dataset-4.0.67.mjs',
  'scripts/test-hydrate-deployed-weather-fail-closed-4.0.272.mjs',
]){
  const result=spawnSync(process.execPath,[rel],{cwd:root,stdio:'inherit'});
  ok(result.status===0,`Den integrerede RavScore-releasekontrakt fejlede: ${rel}`);
}

const exactVersionFiles=['version.json','data/kystdata.json','data/zones.geojson','docs/handbook/content.json'];
for(const rel of exactVersionFiles){
  const doc=JSON.parse(await read(rel));
  const value=rel.includes('handbook')?doc.handbookVersion:doc.version;
  ok(value===version,`${rel}: forventede ${version}, fandt ${value}`);
}
for(const rel of ['index.html','admin.html','service-worker.js','app.js','js/ui/admin-dashboard.js','HANDBOOK-RAVRADAR.md','docs/rdks/MASTER_LOG.md',`CHANGELOG-${version}.md`]){
  const text=await read(rel); ok(text.includes(version),`${rel} mangler releaseversion ${version}`);
}
const handbook=JSON.parse(await read('docs/handbook/content.json'));
ok(Array.isArray(handbook.sections)&&handbook.sections.length>=51,'Håndbogen skal indeholde mindst 51 kapitler');
for(const id of ['rav-egenskaber','tilstedevaerelse','boelger','stroem','vind','vandstand','langskyst','undertow','sortering','vegetation','kystmorfologi','stormforloeb','aflejring','jagtbarhed','score-implementering','procesindikator','retninger','regler','eksperimentdesign','stationer','admin-sikkerhed','release','domaene','ekspertmatrix','scenarier','kilder','fluidmekanik','dimensionsloese-tal','boelgespektrum','strandtilstande','kildelager-model','organisk-opskael','regional-oceanografi','datamaaling-usikkerhed','hypoteseregister','valideringsdesign','feltprotokol','fejlscenarier','kodematrix','kildekritik-detaljer','bibliografi','ekspertarbejdsgang','ordliste','flere-transportveje']){
  ok(handbook.sections.some(s=>s.id===id),`Håndbogen mangler obligatorisk afsnit ${id}`);
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
ok(handbookTextLower.includes('schema 4')||handbookTextLower.includes('stateversion 4.0.0'),'Håndbogen mangler den integrerede state-/migrationskontrakt');
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
'Schema-4-pipelinen mangler bundet Candidate G-migration og rollbackspor');
ok(RAVSCORE_MODEL_ID==='RRS-COASTAL-PROCESS-INTEGRATED-1.0.0','Den aktive integrerede RavScore mangler sit faste model-id');
ok(RAVSCORE_STATE_SCHEMA_VERSION==='4.0.0','Den aktive integrerede RavScore skal bruge state schema 4');
ok(RAVSCORE_VARIANT_ID==='COASTAL-SUPPLY-MOBILISATION-STRUCTURAL-LAST-MILE-HUNTABILITY-1','Den integrerede RavScore-variant er ikke låst');
ok(RAVSCORE_PROFILE_ID==='cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-coldrestart-gapcredit1-lastmileneutral-v3','Den integrerede RavScore-profil er ikke låst');
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
ok(RAVSCORE_LAST_MILE_POLICY.deliveryFactor===1
  && RAVSCORE_LAST_MILE_POLICY.scoreEffect==='NONE'
  && RAVSCORE_LAST_MILE_POLICY.waveCanCreateSupply===false
  && RAVSCORE_LAST_MILE_POLICY.structuralUncertaintyAlways===true
  && RAVSCORE_LAST_MILE_POLICY.numericPhysicalUncertaintyIntervalProvided===false
  && RAVSCORE_LAST_MILE_POLICY.missingDirectionPolicy==='SCORE_NEUTRAL_DIRECTION_UNCERTAINTY',
'Det uopløste sidste-nærkystled skal være score-neutralt og må ikke opfinde et numerisk fysisk interval');
ok(RAVSCORE_HUNTABILITY_POLICY.waterLevelScoreEffect===0
  && RAVSCORE_HUNTABILITY_POLICY.wadersFinalScoreCap===true
  && RAVSCORE_HUNTABILITY_POLICY.beachFinalScoreCap===false
  && RAVSCORE_HUNTABILITY_POLICY.requiredPhysicalInputs.windSpeedMps==='FINITE_NON_NEGATIVE_SCALAR'
  && RAVSCORE_HUNTABILITY_POLICY.requiredPhysicalInputs.waveHeightM==='FINITE_NON_NEGATIVE_SCALAR'
  && RAVSCORE_WAVE_MOBILISATION_POLICY.requiredPhysicalInputs.wavePeriodS==='FINITE_NON_NEGATIVE_SCALAR',
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
ok(decisionFiles.includes('DEC-0108-RAVSCORE-INTEGRATED-COASTAL-PROCESS-MODEL.md'),
'RDKS mangler den eksakte DEC-0108 om den integrerede RavScore-release');

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
ok(sync.includes('assertIntegratedRavScoreSelection')
  && sync.includes('ravScoreProfileWriteAction')
  && sync.includes('withExpectedAdminVersion')
  && sync.includes('version=eq.${action.expectedVersion}')
  && sync.includes('action.expectedVersion+1')
  && sync.includes('Central RavScore compare-and-swap blev afvist eller ændret samtidigt'),
'Central RavScore-persistens mangler valideret versionsbundet CAS-cutover');
const ravScoreProfileSelection=JSON.parse(await read('data/admin/ravscore-profile-selection.json'));
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
const workflow=await read('.github/workflows/update-and-deploy.yml');
const workflowUserAgentVersions=[...workflow.matchAll(/RavRadar\/(\d+\.\d+\.\d+)/g)].map(match=>match[1]);
ok(workflowUserAgentVersions.length>0,'Produktionsworkflowet mangler en versionsbåret RavRadar User-Agent');
for(const workflowVersion of workflowUserAgentVersions){
  ok(workflowVersion===version,`Produktionsworkflowets User-Agent viser ${workflowVersion}, men releaseversionen er ${version}`);
}
const integratedTestChain=pkg.scripts['test:ravscore-integrated']??'';
for(const marker of [
  'test:ravscore-integrated-core',
  'test:ravscore-integrated-generator',
  'test:ravscore-integrated-public',
  'test:ravscore-integrated-profile',
  'test:ravscore-continuation-checkpoint',
  'test:protected-ravscore-checkpoint',
]){
  ok(integratedTestChain.includes(marker),`Den samlede integrerede RavScore-testkæde mangler ${marker}`);
}
for(const [scriptName,required] of [
  ['test:score',['test:ravscore-integrated','test:ravscore-rollback-oracle']],
  ['validate',['test:score','test:hydrated-atomic-dataset','test:production-runtime-privacy']],
  ['validate:source',['test:ravscore-integrated','test:ravscore-rollback-oracle','test:legacy-bootstrap-hydration','test:production-runtime-privacy','release:gate']],
]){
  const chain=pkg.scripts[scriptName]??'';
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
  ok(!Object.hasOwn(pkg.scripts,retiredScriptName),
  `Den pensionerede Candidate G/public-hydration-kontrakt må ikke være et aktivt package-script: ${retiredScriptName}`);
}
ok((pkg.scripts['hydrate:legacy-candidate-g-bootstrap']??'').includes('--legacy-candidate-g-bootstrap'),
'Den offentlige hydration skal kun være tilgængelig som eksplicit Candidate G-engangsbootstrap');
for(const [scriptName,markers] of [
  ['test:protected-ravscore-checkpoint',['test-protected-ravscore-continuation-checkpoint.mjs']],
  ['test:private-production-runtime',['test-private-production-runtime-bundle.mjs','test-private-production-runtime-workflow.mjs','test-protected-private-production-runtime.mjs','audit-tracked-runtime-privacy.mjs']],
  ['test:pages-artifact-privacy',['test-pages-artifact-privacy.mjs']],
  ['test:legacy-bootstrap-hydration',['test-hydrated-atomic-dataset-4.0.67.mjs','test-hydrate-deployed-weather-fail-closed-4.0.272.mjs']],
  ['test:production-runtime-privacy',['test:private-production-runtime','test:pages-artifact-privacy']],
]){
  const chain=pkg.scripts[scriptName]??'';
  for(const marker of markers)ok(chain.includes(marker),`${scriptName} mangler ${marker}`);
}
const rollbackOracleChain=pkg.scripts['test:ravscore-rollback-oracle']??'';
ok(rollbackOracleChain.includes('test-ravscore-candidate-g.mjs')
  && rollbackOracleChain.includes('test-ravscore-candidate-g-state-pipeline.mjs')
  && rollbackOracleChain.includes('test:candidate-g-operational-rollback'),
'Candidate G skal bevares som eksplicit testet rollback-orakel');
const operationalRollbackChain=pkg.scripts['test:candidate-g-operational-rollback']??'';
for(const marker of [
  'build-candidate-g-rollback-bundle.mjs --check',
  'test-candidate-g-rollback-bundle.mjs',
  'test-ravscore-candidate-g-operational-rollback.mjs',
  'test-prepare-candidate-g-operational-rollback.mjs',
  'test-candidate-g-rollback-public-stage.mjs',
  'test-candidate-g-rollback-trip-backend.mjs',
  'test-candidate-g-rollback-assistant-local.mjs',
  'test-ravscore-operational-pages-deployment.mjs',
  'test-ravscore-active-explanation-presenter.mjs',
  'test-ravscore-operational-activation.mjs',
])ok(operationalRollbackChain.includes(marker),`Den operationelle Candidate G-rollbackgate mangler ${marker}`);
for(const forbidden of ['central-runtime','profile-switch','public-shadow','public-recovery']){
  ok(!rollbackOracleChain.includes(forbidden),`Rollback-oraklet må ikke genaktivere Candidate G ${forbidden}`);
}
ok(!(pkg.scripts['test:workflow-action-contracts']??'').includes('test-ravscore-active-shadow-workflow'),
'Workflowkontrakten må ikke bevare Candidate G som aktiv shadowmodel');
ok(!(pkg.scripts['test:coastal-geometry-v2']??'').includes('test-ravscore-active-shadow-workflow'),
'Geometritesten må ikke genaktivere Candidate G-shadowjobbet');
const targetRegistry=await read('scripts/build-copernicus-target-registry.py');
const boundedCopernicusRetry=await read('scripts/run-copernicus-current-pilot-with-retry.py');
const continuationCheckpoint=await read('scripts/ravscore-continuation-checkpoint.mjs');
const protectedContinuationCheckpoint=await read('scripts/protected-ravscore-continuation-checkpoint.mjs');
const privateRuntimeBundle=await read('scripts/private-production-runtime-bundle.mjs');
const privateRuntimeWorkflow=await read('scripts/private-production-runtime-workflow.mjs');
const protectedPrivateRuntime=await read('scripts/protected-private-production-runtime.mjs');
const trackedRuntimePrivacy=await read('scripts/audit-tracked-runtime-privacy.mjs');
const pagesArtifactPrivacy=await read('scripts/audit-pages-artifact-privacy.mjs');
const legacyHydration=await read('scripts/hydrate-deployed-weather.py');
const productionWatchdog=await read('scripts/check-production-watchdog.mjs');
const heartbeatWorkflow=await read('.github/workflows/preserve-copernicus-current-shadow.yml');
ok(targetRegistry.includes('if candidate > requested_hour:'),'DMI-timeopløseren kan ikke bevise, at fremtidige modeltimer afvises');
for(const marker of ['python scripts/run-copernicus-current-pilot-with-retry.py','--attempts 2','--timeout-seconds 360','--backoff-seconds 20']){
  ok(workflow.includes(marker),`Produktionsworkflowet mangler den bundne Copernicus-kontrakt: ${marker}`);
}
for(const marker of ['attempts > 3','timeout_seconds > 600','backoff_seconds > 120','subprocess.run(command','timeout=timeout_seconds']){
  ok(boundedCopernicusRetry.includes(marker),`Copernicus-wrapperen mangler hard bound: ${marker}`);
}
for(const marker of [
  "status: 'ravscore-schema4-compact-continuation'",
  'expectedPartCount: 673',
  "cacheNamespace: 'ravscore-continuation-schema4-v2'",
  'compactDerivedStateOnly: true',
  'weatherIncluded: false',
  'scoresIncluded: false',
  'rawVectorsIncluded: false',
  'coordinatesIncluded: false',
  'privateDataIncluded: false',
  'stateSha256',
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
  'createSupabaseAdminRequester',
  'loadRavScoreContinuationCheckpointForTarget',
  '?document_key=eq.${encodeURIComponent(key)}&select=document_key,payload,version&limit=2',
  "reason: 'protected-checkpoint-not-found'",
  'targetUnchanged: true',
  'await fs.rename(temporary, checkpointPath)',
  'payloadLogged: false',
]){
  ok(protectedContinuationCheckpoint.includes(marker),`Protected checkpoint-kontrakten mangler ${marker}`);
}
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
  'maximumArchiveBytes:',
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
for(const marker of ['production-run-active','recent-production-run','public-production-fresh','production-silent-and-public-manifest-stale']){
  ok(productionWatchdog.includes(marker),`Produktions-watchdoget mangler fail-safe tilstanden: ${marker}`);
}
for(const marker of ['types: [requested, completed]','retry-failed-production:',`contains(fromJSON('["failure","timed_out","startup_failure"]'), github.event.workflow_run.conclusion)`,'external_watchdog:','default: false',"github.event_name == 'schedule' || (github.event_name == 'workflow_dispatch' && inputs.external_watchdog == true)",'production-watchdog:','--maximum-silence-minutes 45']){
  ok(heartbeatWorkflow.includes(marker),`Produktionsorkestreringen mangler selvrecovery: ${marker}`);
}
ok(publicDataService.includes('sameRavScoreModelBinding')
  && !/fallbackRuntime|recoveryFallback/.test(publicDataService),
'Offentlig dataindlæsning skal være atomisk schema-4 og må ikke omdirigeres til en public recoveryruntime');
ok(!/recoveryFallbackActive|recoveryFallback\?/.test(publicApp),
'Den offentlige app må ikke have en skjult Candidate G-/recoveryfallbackgren');
ok(publicI18n.includes('Ældre prognoser vises ikke')
  && publicI18n.includes('Ältere Prognosen werden nicht angezeigt')
  && publicI18n.includes('Older forecasts are not shown'),
'Den offentlige brugerflade mangler DA/DE/EN fail-closed-tekst for en uverificeret atomisk datapakke');
const workflowPositions={
  privateRuntimeExpected:workflow.indexOf('name: Build current private-runtime restore expectation'),
  privateRuntimeRestore:workflow.indexOf('name: Restore newest compatible private runtime from protected storage'),
  privateRuntimeVerify:workflow.indexOf('name: Verify and restore the private production runtime bundle'),
  privateRuntimeInstall:workflow.indexOf('name: Install only the allowlisted restored private runtime files'),
  checkpointRestore:workflow.indexOf('name: Restore the latest compact schema-4 RavScore checkpoint'),
  protectedCheckpointRestore:workflow.indexOf('name: Restore protected compact RavScore checkpoint when cache is absent'),
  legacyBootstrapGate:workflow.indexOf('name: Resolve the one-time Candidate G bootstrap gate'),
  legacyBootstrapImport:workflow.indexOf('name: Import exact public Candidate G runtime only for first cutover'),
  preflight:workflow.indexOf('name: Decide whether weather needs updating'),
  resolvedTarget:workflow.indexOf('name: Bind production to resolved DMI current hour'),
  weather:workflow.indexOf('name: Update central weather cache'),
  runtime:workflow.indexOf('name: Rebuild deterministic public weather runtime before validation and deploy'),
  runtimeAudit:workflow.indexOf('name: Audit actual integrated RavScore public runtime before deploy'),
  validate:workflow.indexOf('name: Validate full project after fresh weather and current provenance'),
  releaseGate:workflow.indexOf('name: Run release governance gate after refreshed data validation'),
  validateData:workflow.indexOf('name: Validate updated weather cache'),
  checkpointBuild:workflow.indexOf('name: Build compact schema-4 RavScore continuation checkpoint after final gates'),
  checkpointSave:workflow.indexOf('name: Save compact schema-4 RavScore continuation checkpoint after final gates'),
  protectedCheckpointPublish:workflow.indexOf('name: Publish compact RavScore checkpoint to protected admin storage'),
  privateRuntimeSpec:workflow.indexOf('name: Build private production runtime bundle specification'),
  privateRuntimeCreate:workflow.indexOf('name: Create the next private production runtime bundle atomically'),
  privateRuntimeSave:workflow.indexOf('name: Publish bounded private runtime with one protected rollback generation'),
  privateRuntimeAnonAudit:workflow.indexOf('name: Prove the private runtime object is not anonymously readable'),
  artifact:workflow.indexOf('name: Build lean GitHub Pages artifact'),
  pagesPrivacyAudit:workflow.indexOf('name: Audit the complete Pages artifact for private runtime material'),
  pagesUpload:workflow.indexOf('name: Upload GitHub Pages artifact'),
};
for(const [step,position] of Object.entries(workflowPositions)){
  ok(position>=0,`Produktionsworkflowet mangler integreret RavScore-trin: ${step}`);
}
const workflowOrder=[
  'privateRuntimeExpected','privateRuntimeRestore','privateRuntimeVerify','privateRuntimeInstall',
  'checkpointRestore','protectedCheckpointRestore','legacyBootstrapGate','legacyBootstrapImport','preflight',
  'resolvedTarget','weather','runtime','runtimeAudit','validate','releaseGate','validateData',
  'checkpointBuild','checkpointSave','protectedCheckpointPublish',
  'privateRuntimeSpec','privateRuntimeCreate','privateRuntimeSave','privateRuntimeAnonAudit','artifact','pagesPrivacyAudit','pagesUpload',
];
for(let index=1;index<workflowOrder.length;index+=1){
  const before=workflowOrder[index-1];
  const after=workflowOrder[index];
  ok(workflowPositions[before]<workflowPositions[after],`Produktionsworkflowets rækkefølge er ugyldig: ${before} skal ligge før ${after}`);
}
const privateRuntimeRestoreSection=workflow.slice(workflowPositions.privateRuntimeExpected,workflowPositions.checkpointRestore);
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
for(const marker of [
  'RAVRADAR_PRIVATE_RUNTIME_ROOT: /tmp/ravradar-private-production-runtime',
  'RAVRADAR_PRIVATE_RUNTIME_BUNDLE: /tmp/ravradar-private-production-runtime/bundle',
  'RAVRADAR_PRIVATE_RUNTIME_RESTORE: /tmp/ravradar-private-production-runtime/restored',
]){
  ok(workflow.includes(marker),`Workflowets private runtime-miljø mangler ${marker}`);
}
ok(!privateRuntimeRestoreSection.includes('path: .cache/private-production-runtime'),
'Det private produktionsbundle må ikke gendannes i repositoryets cachetræ');
ok(!workflow.includes('private-production-runtime-v1-')
  && !/actions\/cache\/(?:restore|save)@v6[\s\S]{0,240}path: \/tmp\/ravradar-private-production-runtime\/bundle/.test(workflow),
'Det fulde private runtimebundle må ikke lagres i GitHub Actions cache');
const checkpointRestoreSection=workflow.slice(workflowPositions.checkpointRestore,workflowPositions.legacyBootstrapGate);
for(const marker of [
  'uses: actions/cache/restore@v6',
  'path: .cache/ravscore-continuation-checkpoint',
  'ravscore-continuation-schema4-v2-',
  "if: steps.private-runtime-state.outputs.available != 'true'",
  "if: steps.private-runtime-state.outputs.available != 'true' && steps.ravscore-checkpoint-cache.outputs.cache-matched-key == ''",
  'node scripts/protected-ravscore-continuation-checkpoint.mjs',
  '--restore',
  '--target-reference "$RAVRADAR_PRODUCTION_TARGET_HOUR"',
  'SUPABASE_URL: ${{ secrets.SUPABASE_URL }}',
  'SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}',
]){
  ok(checkpointRestoreSection.includes(marker),`Protected schema-4 RavScore-restoren mangler ${marker}`);
}
ok(!checkpointRestoreSection.includes('node scripts/ravscore-continuation-checkpoint.mjs')
  && !checkpointRestoreSection.includes('--target data/live/conditions.json'),
'Schema-4 checkpoint-restoren må ikke mutere conditions direkte');
const legacyBootstrapSection=workflow.slice(workflowPositions.legacyBootstrapGate,workflowPositions.preflight);
for(const marker of [
  'PRIVATE_RUNTIME_AVAILABLE: ${{ steps.private-runtime-state.outputs.available }}',
  'test -f .cache/ravscore-continuation-checkpoint/checkpoint.json',
  "if: steps.legacy-bootstrap.outputs.required == 'true'",
  'python scripts/hydrate-deployed-weather.py --legacy-candidate-g-bootstrap',
  'RAVRADAR_DEPLOYED_BASE_URL:',
]){
  ok(legacyBootstrapSection.includes(marker),`Candidate G-engangsbootstrap mangler ${marker}`);
}
ok((workflow.match(/python scripts\/hydrate-deployed-weather\.py/g)||[]).length===1
  && !workflow.includes('name: Hydrate latest deployed weather state'),
'Generisk offentlig hydration skal være pensioneret; kun Candidate G-engangsbootstrap må findes');
const runtimeAuditSection=workflow.slice(workflowPositions.runtimeAudit,workflowPositions.validate);
for(const marker of [
  "if: steps.preflight.outputs.should_run == 'true'",
  'node scripts/audit-ravscore-integrated-public-runtime.mjs',
  '--input data/live/conditions.json',
]){
  ok(runtimeAuditSection.includes(marker),`Den integrerede public runtimeaudit mangler ${marker}`);
}
ok(!runtimeAuditSection.includes('continue-on-error'),'Den integrerede public runtimeaudit må ikke være vejledende');
const checkpointSaveSection=workflow.slice(workflowPositions.checkpointBuild,workflowPositions.privateRuntimeSpec);
for(const marker of [
  "if: steps.preflight.outputs.should_run == 'true' && steps.weather.outcome == 'success'",
  'node scripts/ravscore-continuation-checkpoint.mjs',
  '--save',
  '--source data/live/conditions.json',
  'uses: actions/cache/save@v6',
  'ravscore-continuation-schema4-v2-${{ github.run_id }}-${{ github.run_attempt }}',
  'node scripts/protected-ravscore-continuation-checkpoint.mjs',
  '--publish',
  '--target-reference "$RAVRADAR_PRODUCTION_TARGET_HOUR"',
  'SUPABASE_URL: ${{ secrets.SUPABASE_URL }}',
  'SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}',
]){
  ok(checkpointSaveSection.includes(marker),`Schema-4 RavScore-checkpointbevaringen mangler ${marker}`);
}
ok(!checkpointSaveSection.includes('continue-on-error'),'Protected checkpoint-publicering må ikke skjule fejl');
const privateRuntimeSaveSection=workflow.slice(workflowPositions.privateRuntimeSpec,workflowPositions.artifact);
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
ok(!workflow.slice(workflowPositions.privateRuntimeSpec,workflowPositions.privateRuntimeSave).includes('continue-on-error'),
'Det private runtimebundle skal bygges fail-closed');
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
  ok(!workflow.includes(forbidden),`Den aktive produktionsvej må ikke indeholde Candidate G-checkpoint/shadow/fallback: ${forbidden}`);
}
for(const protectedPath of ['handbook.html','documentation.html','data/diagnostics/','data/geometry-v2/','.geometry-v2-work/','data/live/']){
  ok(workflow.includes(`--exclude '${protectedPath}'`)||workflow.includes(`--exclude \"${protectedPath}\"`),`Pages-workflow udelukker ikke ${protectedPath}`);
}
const pagesArtifactSection=workflow.slice(workflowPositions.artifact,workflowPositions.pagesPrivacyAudit);
const expectedPagesLiveFiles=['coastal-parts-v2.json','manifest.json','public-condition-details.json','public-conditions.json'];
const installedPagesLiveFiles=[...pagesArtifactSection.matchAll(/install -m 0644 data\/live\/([^\s]+) _site\/data\/live\/([^\s]+)/g)]
  .map(match=>{
    ok(match[1]===match[2],`Pages-installationen må ikke omdøbe ${match[1]} til ${match[2]}`);
    return match[1];
  })
  .sort();
ok(JSON.stringify(installedPagesLiveFiles)===JSON.stringify(expectedPagesLiveFiles),
`Pages-artifactets live-allowliste skal være præcis fire filer: ${installedPagesLiveFiles.join(', ')||'(ingen)'}`);
const pagesLiveWriteLines=pagesArtifactSection.split('\n').map(line=>line.trim()).filter(line=>line.includes('_site/data/live'));
ok(pagesLiveWriteLines.length===5
  && pagesLiveWriteLines[0]==='mkdir -p _site/data/live'
  && pagesLiveWriteLines.slice(1).every(line=>line.startsWith('install -m 0644 data/live/')),
'Pages-workflowet må kun oprette live-mappen og installere de fire allowlistede filer');
const pagesPrivacyAuditSection=workflow.slice(workflowPositions.pagesPrivacyAudit,workflowPositions.pagesUpload);
for(const marker of [
  'node scripts/audit-pages-artifact-privacy.mjs',
  '--site _site',
  '--private-manifest "$RAVRADAR_PRIVATE_RUNTIME_BUNDLE/manifest.json"',
  '--require-private-manifest',
]){
  ok(pagesPrivacyAuditSection.includes(marker),`Pages-privacygaten mangler ${marker}`);
}
ok(!pagesPrivacyAuditSection.includes('continue-on-error'),'Pages-privacygaten skal være fail-closed før upload');
ok(!workflow.includes("--exclude 'js/services/handbook-review-store.js'"),'Pages-workflow må ikke udelukke et browsermodul som admin importerer');
for(const retiredGpsRuntime of ['js/services/trip-service.js','js/services/trip-evidence-legacy-bridge.js']){
  ok(workflow.includes(`--exclude '${retiredGpsRuntime}'`),`Pages-workflow skal udelukke pensioneret GPS-runtime: ${retiredGpsRuntime}`);
}
ok(workflow.includes("--exclude 'data/admin/'"),'Pages-workflow skal udelukke rå centrale adminfiler');
ok(workflow.includes("--exclude '_support/'"),'Pages-workflow skal udelukke supportmappen fra det offentlige artifact');
ok(workflow.includes("--exclude 'RavRadar-support-*.zip'"),'Pages-workflow skal udelukke support-ZIP fra det offentlige artifact');
for(const retiredPublicPath of ['js/ui/admin-app.js','js/core/rule-engine.js','js/services/rule-service.js','rules/']){
  ok(workflow.includes(`--exclude '${retiredPublicPath}'`),`Pages-workflow skal holde det pensionerede regelværksted ude af det offentlige artifact: ${retiredPublicPath}`);
}
ok(!workflow.includes('generate-public-admin-rules.mjs'),'Workflowet må ikke publicere historiske administratorregler');
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
ok(workflow.includes('SUPABASE_URL')&&workflow.includes('SUPABASE_SERVICE_ROLE_KEY'),'Workflow mangler Supabase secrets');
ok(!workflow.includes('sb_secret_'),'En konkret sb_secret_-værdi må aldrig stå i workflowet');
const manifest=JSON.parse(await read('manifest.webmanifest'));
ok(String(manifest.start_url||'').startsWith('.'),'Manifest start_url skal være relativ for domæneskift');
ok(!await exists('CNAME'),'CNAME må først aktiveres, når DNS og Supabase redirects er klar');
const decision=await read('docs/rdks/10_DECISIONS/DEC-0013-RELEASE-GOVERNANCE.md');
ok(decision.includes('Obligatorisk Release Governance'),'RDKS release-governance mangler');
const rules=await read('docs/rdks/01_AI_OPERATING_RULES.md');
ok(rules.includes('Bindende release-gate'),'AI operating rules mangler bindende release-gate');
const trackedSecretPatterns=[/SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["']?(sb_secret_|eyJ)/i,/DMI_API_KEY\s*[:=]\s*["'][^$]/i,/DATAFORDELER_API_KEY\s*[:=]\s*["'][^$]/i];
for(const rel of ['config.js','.github/workflows/update-and-deploy.yml','scripts/sync-admin-config.py','scripts/sync-protected-admin-assets.mjs','scripts/lib/supabase-admin-rest.mjs']){
  const text=await read(rel); for(const rx of trackedSecretPatterns)ok(!rx.test(text),`${rel} ser ud til at indeholde en konkret hemmelig nøgle`);
}
if(errors.length){console.error('\nRELEASE GATE FEJLEDE:\n- '+errors.join('\n- '));process.exit(1)}
const report={version,checkedAt:new Date().toISOString(),status:'passed',checks:{versionConsistency:true,handbook:true,rdks:true,supabase:true,ravScoreIntegratedModel:true,ravScoreSchema4Continuation:true,protectedRavScoreCheckpoint:true,privateProductionRuntime:true,legacyBootstrapOnly:true,atomicSchema4PublicRuntime:true,pagesArtifactPrivacy:true,protectedPagesArtifact:true,domainReadiness:true,secretsScan:true,packagingPolicy:true}};
await fs.mkdir('release',{recursive:true});
await fs.writeFile('release/RELEASE-REPORT.json',JSON.stringify(report,null,2)+'\n');
await fs.writeFile('release/RELEASE-REPORT.md',`# Release-rapport ${version}\n\n- Status: **BESTÅET**\n- Kontrolleret: ${report.checkedAt}\n- Versionskonsistens: OK\n- Håndbog og RDKS: OK\n- Supabase- og rettighedskæde: OK\n- Integreret RavScore + schema-4 continuation: OK\n- Protected checkpoint og privat runtimebundle: OK\n- Kun eksplicit Candidate G-engangsbootstrap: OK\n- Atomisk schema-4 public runtime uden offentlig recoverymodel: OK\n- Fire-fils Pages-allowliste og privacy-audit: OK\n- Domæneberedskab: OK\n- Hemmelighedsscanning: OK\n- Pakningspolitik: OK\n\nBemærk: Rapporten dokumenterer lokale kontroller. En faktisk grøn GitHub Actions-kørsel skal stadig verificeres efter push.\n`);
console.log(`Release gate bestået for RavRadar ${version}.`);
