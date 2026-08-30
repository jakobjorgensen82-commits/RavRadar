import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

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
for(const marker of ['0,03 m/s','0,15 m/s','13 timers fuld udtransport','48 timers','20 % søgeforhold','Chubarenko','GitHub Actions-kørsel','Shields-parameteren','bundskærspænding','hypoteseregister','annoteret faglig bibliografi','størrelsen på et ravlager','én bølgeenergistyret mobiliseringstilstand']){
  ok(handbookTextLower.includes(marker.toLowerCase()),`Håndbogen mangler obligatorisk sporbarhedsmarkør: ${marker}`);
}
const scoreEngine=await read('js/core/score-engine.js');
for(const marker of ['huntability: 0.25','transport: 0.40','release: 0.35','current >= .15 && current <= .65','max: 28','max: 42','hours >= 3 && hours <= 18','nearshore-remobilisation','dominantPathway']){
  ok(scoreEngine.includes(marker),`Den historiske sammenligningsmotors forventede auditkonstant mangler: ${marker}`);
}
const candidateG=await read('js/core/ravscore-candidate-g.js');
for(const marker of ['huntability: 0.20','transportAndDelivery: 0.50','mobilisation: 0.30','physicalBottleneckGate','actualOutboundTransport === true','transportPotential === 0','wadersHuntabilityLimit']){
  ok(candidateG.includes(marker),`Den aktive Candidate G-motor mangler auditkonstanten: ${marker}`);
}
ok(await exists('docs/rdks/10_DECISIONS/DEC-0015-HANDBOOK-EVIDENCE-TRACEABILITY.md'),'RDKS mangler DEC-0015 om håndbogens sporbarhed');
ok(await exists('docs/rdks/10_DECISIONS/DEC-0016-HANDBOOK-REFERENCE-WORK.md'),'RDKS mangler DEC-0016 om håndbogens substans');
ok(await exists('docs/rdks/10_DECISIONS/DEC-0017-MULTIPLE-AMBER-PATHWAYS.md'),'RDKS mangler DEC-0017 om flere ravveje');
ok(await exists('docs/rdks/10_DECISIONS/DEC-0018-ADMIN-PERSISTENCE-AND-AREA-INTEGRITY.md'),'RDKS mangler DEC-0018 om områdeintegritet og Supabase-persistens');

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
ok(pythonAdminSync.includes('is_candidate_g_only_selection')&&pythonAdminSync.includes('preserved-owner-approved-candidate-g-only-contract'),'Central adminhydrering kan genindføre en gammel offentlig RavScore-konfiguration');
ok(sync.includes('assertCandidateGOnlySelection')&&sync.includes('candidate-g-local-fail-closed'),'Central adminpersistens mangler Candidate G-only-kontrakten');
const publicApp=await read('app.js');
const publicI18n=await read('js/i18n.js');
const publicAssistant=await read('js/services/rav-assistant.js');
const publicInfoPanel=await read('js/ui/info-panel.js');
ok(!/calculateRavScore|selectBestTimeForDay|scoreFor\(/.test(publicApp),'Den offentlige app indeholder stadig en vej til den gamle RavScore-motor');
ok(!/calculateRavScore|score-engine\.js/.test(publicAssistant),'Spørg RavRadar indeholder stadig en vej til den gamle RavScore-motor');
ok(!/calculateRavScore|selectBestTimeForDay|bestHourForDay/.test(publicInfoPanel),'Informationspanelet indeholder stadig en vej til den gamle RavScore-motor');
const workflow=await read('.github/workflows/update-and-deploy.yml');
const workflowUserAgentVersions=[...workflow.matchAll(/RavRadar\/(\d+\.\d+\.\d+)/g)].map(match=>match[1]);
ok(workflowUserAgentVersions.length>0,'Produktionsworkflowet mangler en versionsbåret RavRadar User-Agent');
for(const workflowVersion of workflowUserAgentVersions){
  ok(workflowVersion===version,`Produktionsworkflowets User-Agent viser ${workflowVersion}, men releaseversionen er ${version}`);
}
for(const marker of [
  'node scripts/restore-candidate-g-gap-checkpoint.mjs',
  'run-id: ${{ steps.candidate-g-gap-checkpoint.outputs.source_run_id }}',
  'candidate-g-continuation-checkpoint-v2-',
  'candidate-g-continuation-checkpoint-v1-',
  'node scripts/candidate-g-continuation-checkpoint.mjs',
  'node scripts/candidate-g-public-recovery-fallback.mjs',
  '--stage',
  '--publish',
  'candidate-g-last-ready-public-v2-',
  'candidate-g-last-ready-public-v1-',
  'Audit actual Candidate G public runtime before deploy',
]){
  ok(workflow.includes(marker),`Produktionsworkflowet mangler Candidate G-selvrecovery: ${marker}`);
}
const targetRegistry=await read('scripts/build-copernicus-target-registry.py');
const boundedCopernicusRetry=await read('scripts/run-copernicus-current-pilot-with-retry.py');
const continuationCheckpoint=await read('scripts/candidate-g-continuation-checkpoint.mjs');
const productionWatchdog=await read('scripts/check-production-watchdog.mjs');
const heartbeatWorkflow=await read('.github/workflows/preserve-copernicus-current-shadow.yml');
ok(targetRegistry.includes('if candidate > requested_hour:'),'DMI-timeopløseren kan ikke bevise, at fremtidige modeltimer afvises');
for(const marker of ['python scripts/run-copernicus-current-pilot-with-retry.py','--attempts 2','--timeout-seconds 360','--backoff-seconds 20']){
  ok(workflow.includes(marker),`Produktionsworkflowet mangler den bundne Copernicus-kontrakt: ${marker}`);
}
for(const marker of ['attempts > 3','timeout_seconds > 600','backoff_seconds > 120','subprocess.run(command','timeout=timeout_seconds']){
  ok(boundedCopernicusRetry.includes(marker),`Copernicus-wrapperen mangler hard bound: ${marker}`);
}
for(const marker of ['expectedPartCount: 673','maximumCheckpointAgeHours: 72','weatherIncluded: false','scoresIncluded: false','rawVectorsIncluded: false','coordinatesIncluded: false','privateDataIncluded: false','stateSha256']){
  ok(continuationCheckpoint.includes(marker),`Candidate G-checkpointet mangler integritets-/privatlivskontrakten: ${marker}`);
}
for(const marker of ['production-run-active','recent-production-run','public-production-fresh','production-silent-and-public-manifest-stale']){
  ok(productionWatchdog.includes(marker),`Produktions-watchdoget mangler fail-safe tilstanden: ${marker}`);
}
for(const marker of ['types: [requested, completed]','retry-failed-production:',`contains(fromJSON('["failure","timed_out","startup_failure"]'), github.event.workflow_run.conclusion)`,'external_watchdog:','default: false',"github.event_name == 'schedule' || (github.event_name == 'workflow_dispatch' && inputs.external_watchdog == true)",'production-watchdog:',"external_watchdog == true && '15' || '45'",'--maximum-silence-minutes "$MAXIMUM_SILENCE_MINUTES"']){
  ok(heartbeatWorkflow.includes(marker),`Produktionsorkestreringen mangler selvrecovery: ${marker}`);
}
const candidateGMemory=await read('js/core/ravscore-regime-memory.js');
const candidateGStatePipeline=await read('js/core/ravscore-candidate-g-state-pipeline.js');
const publicRecovery=await read('scripts/candidate-g-public-recovery-fallback.mjs');
const publicDataService=await read('js/services/data-service.js');
const gapRetirementTest=await read('scripts/test-candidate-g-gap-reconstruction-retired.mjs');
const tripEvidenceContract=await read('js/services/trip-evidence-contract.js');
const tripStorageWorkflow=await read('.github/workflows/deploy-trip-storage.yml');
const tripQualityMigration=await read('supabase/migrations/20260829_candidate_g_reconstructed_trip_exclusion.sql');
const tripStorageShared=await read('supabase/functions/_shared/trip-storage.js');
const tripStore=await read('supabase/functions/_shared/trip-store.ts');
const tripGatewayWorker=await read('cloudflare/trip-gateway/worker.js');
const tripGatewayMigration=await read('cloudflare/trip-gateway/migrations/001_trip_observations.sql');
const tripGatewayVerification=await read('scripts/verify-cloudflare-trip-gateway.mjs');
const tripEdgeVerification=await read('scripts/verify-trip-storage-edge.mjs');
const tripEdgeReadiness=await read('scripts/lib/trip-storage-edge-readiness.mjs');
const tripStorageMigration=await read('scripts/migrate-trip-storage-to-cloudflare.mjs');
const tripStorageProjection=await read('supabase/functions/_shared/trip-source-projection.js');
const tripStoragePreparation=await read('scripts/prepare-cloudflare-trip-storage.mjs');
const tripStorageActivationMarker=await read('scripts/mark-cloudflare-trip-storage-activation.mjs');
const tripStorageLegacyClassification=await read('scripts/lib/trip-storage-legacy-classification.mjs');
const tripStorageBoundedFetch=await read('scripts/lib/bounded-fetch.mjs');
const tripStorageAudit=await read('scripts/audit-cloudflare-trip-storage.mjs');
const hybridTripStorageTest=await read('scripts/test-hybrid-trip-storage-4.0.287.mjs');
const gapCheckpoint=JSON.parse(await read('data/admin/candidate-g-gap-checkpoint-recovery.json'));
ok(candidateGMemory.includes('restartAfterVerifiedTimeGap = false')&&candidateGMemory.includes('VERIFIED_TIME_GAP_SUFFIX_RESTART'),'Candidate G-hukommelsen mangler eksplicit opt-in til verificeret suffixgenstart');
ok(candidateGStatePipeline.includes('restartAfterVerifiedTimeGap: true')&&candidateGStatePipeline.includes('VERIFIED_TIME_GAP_RECOVERY'),'Candidate G-statepipelinen genstarter ikke sikkert efter et verificeret tidsgab');
ok(publicRecovery.includes('maximumAgeHours: 72')&&publicRecovery.includes('FALLBACK_FORECAST_EXPIRED')&&publicRecovery.includes('active-last-verified')&&publicRecovery.includes('unavailable-no-valid-fallback')&&publicRecovery.includes('inactive-no-valid-fallback'),'Candidate G-nødvisningen mangler 72-timers hard cap, prognoseudløb eller sikker frakobling fra frisk measured-only primary');
ok(workflow.includes("steps.candidate-g-public-fallback-stage.outputs.fallback_available == 'true'"),'Workflowet må ikke gemme en tom eller udløbet Candidate G-fallbackcache');
ok(publicDataService.includes('recoveryFallbackActive:true')&&publicDataService.includes('maximumAgeHours'),'Offentlig dataindlæsning mangler den bundne Candidate G-nøddrift');
const retiredGapPaths=[
  'scripts/one-time-candidate-g-gap-reconstruction.mjs',
  'scripts/test-one-time-candidate-g-gap-reconstruction-4.0.311.mjs',
  'scripts/test-one-time-candidate-g-gap-workflow-4.0.311.mjs',
  'data/admin/candidate-g-one-time-gap-reconstruction-20260829.json',
];
for(const retiredPath of retiredGapPaths){
  ok(!(await exists(retiredPath)),`Den pensionerede engangsrekonstruktionssti findes stadig: ${retiredPath}`);
}
for(const marker of ['candidate_g_gap_reconstruction_mode','inspect-candidate-g-one-time-gap','one-time-candidate-g-gap-reconstruction.mjs','.cache/candidate-g-gap-reconstruction','RRGAP-2026-08-29-CANDIDATE-G-01']){
  ok(!workflow.includes(marker),`Produktionsworkflowet genåbner den pensionerede DEC-0109-sti: ${marker}`);
}
ok(pkg.scripts?.['test:candidate-g-gap-retirement']==='node scripts/test-candidate-g-gap-reconstruction-retired.mjs','Pensionsregressionen mangler package-binding');
ok(String(pkg.scripts?.['test:candidate-g-public-recovery']||'').includes('test:candidate-g-gap-retirement'),'Fuld Candidate G-recoverytest mangler pensionsregressionen');
ok(String(pkg.scripts?.['test:workflow-action-contracts']||'').includes('test:candidate-g-gap-retirement'),'Workflowkontrakten mangler pensionsregressionen');
ok(gapRetirementTest.includes('Historical read/quality compatibility remains intentionally available'),'Pensionsregressionen må ikke fjerne historisk trust-/læsekompatibilitet');
for(const marker of ['ravscore-reconstructed-derived-evidence','public-emergency-last-complete','ravscore-evidence-trust-unattested']){
  ok(tripEvidenceContract.includes(marker),`Turkontrakten mangler Candidate G-kvalitetsmarkøren: ${marker}`);
  ok(tripQualityMigration.includes(marker),`Databasemigrationen mangler Candidate G-kvalitetsmarkøren: ${marker}`);
}
ok(tripQualityMigration.includes('schema_version = 2 and')&&tripQualityMigration.includes('DEC-0109-v2'),'Tripdatabasens schema-2-/reason-order-attestation mangler');
ok(tripStorageWorkflow.includes('apply-candidate-g-trip-quality-migration.mjs')&&tripStorageWorkflow.includes('verify-trip-storage-edge.mjs'),'Trip-storage-workflowet mangler migration eller live Edge-verifikation');
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
for(const marker of [
  "steps.d1_edge_predeploy_intent.outputs.edge_predeploy_intent == 'true'",
  "steps.fresh_edge_predeploy_intent.outputs.edge_predeploy_intent == 'true'",
  "steps.d1_repair_intent.outputs.d1_repair_intent == 'true'",
  "steps.activation_intent.outputs.d1_activation_intent == 'true'",
]){
  ok(tripStorageWorkflow.includes(marker),`Trip-storage-workflowet mangler current-run intentbinding: ${marker}`);
}
ok(!tripStorageWorkflow.includes('inputs.storage_mode')
  &&!tripStorageWorkflow.includes('kontrolleret Supabase-rollback')
  &&tripStorageWorkflow.includes('run-name: "Deploy RavRadar trip storage [d1]"'),
  'Trip-storage-workflowet må ikke tilbyde Supabase-rollback efter D1 og skal bevare exact-head run-titlen');
const tripStorageMainCasCount=(tripStorageWorkflow.match(/git fetch --no-tags --prune origin \+refs\/heads\/main:refs\/remotes\/origin\/main/g)||[]).length;
ok(tripStorageMainCasCount>=16,`Trip-storage-workflowet har kun ${tripStorageMainCasCount} exact-main CAS-gates`);
const cutoverOrder=[
  'Prepare ten EU-restricted D1 shards, schema and durable phase',
  'Require safe D1 storage headroom',
  'Record current-run existing-D1 Edge predeployment intent',
  'Record current-run fresh-Supabase Edge predeployment intent',
  'Deploy exact maintenance-capable Edge functions while Worker and mode stay unchanged',
  'Attest both exact Edge boundaries in unchanged D1 mode before leasing maintenance',
  'Record current-run D1 repair intent immediately before quiescence',
  'Enter fail-closed expiring maintenance for every existing D1 installation',
  'Attest both Edge boundaries in fail-closed maintenance',
  'Drain every bounded request from the preceding Edge generation',
  'Require enough maintenance lease for bounded Worker replacement',
  'Install deploy and attest the private D1 gateway after Edge quiescence',
  'Idempotently synchronize existing Supabase trips into D1',
  'Record local fail-closed intent before a genuinely fresh D1 marker',
  'Persist the point of no return immediately before fresh D1 activation',
  'Activate normal Cloudflare D1 mode after verified Worker readiness',
  'Attest both Edge write and read boundaries in live D1 mode before final reconciliation',
  'Drain the last bounded pre-D1 requests before final reconciliation',
  'Reconcile every trip written before both Edge boundaries attested D1',
  'Reverify both public Edge boundaries in live D1 mode',
].map(marker=>tripStorageWorkflow.indexOf(marker));
ok(cutoverOrder.every((index,i)=>index>=0&&(i===0||index>cutoverOrder[i-1])),'Trip-storage-workflowets normale maintenance-/D1-roll-forward står i usikker rækkefølge');
const failureRollforwardOrder=[
  'Restore Supabase only for a proven fresh pre-activation installation',
  'Redeploy exact Edge functions for the restored fresh Supabase bridge',
  'Attest the restored genuinely fresh Supabase bridge',
  'Persist or reconfirm the D1 boundary during failure roll-forward',
  'Redeploy exact maintenance-capable Edge functions before failure maintenance',
  'Enter fail-closed expiring maintenance during D1 failure roll-forward',
  'Attest both Edge boundaries in failure roll-forward maintenance',
  'Drain the preceding Edge generation before failure Worker replacement',
  'Require enough failure maintenance lease for bounded Worker replacement',
  'Reinstall and redeploy the exact Worker after failure Edge quiescence',
  'Preserve D1 after the point of no return and repair forward',
  'Redeploy exact Edge functions during D1 failure roll-forward',
  'Attest both Edge boundaries in D1 mode before failure reconciliation',
  'Drain bounded pre-D1 requests during failure roll-forward',
  'Reconcile the Supabase source during failure roll-forward',
  'Reattest both Edge boundaries after failure roll-forward',
].map(marker=>tripStorageWorkflow.indexOf(marker));
ok(failureRollforwardOrder.every((index,i)=>index>=0&&(i===0||index>failureRollforwardOrder[i-1])),'Trip-storage-workflowets fresh-rollback/D1-roll-forward står i usikker rækkefølge');
const standardWorkerDeployCount=(tripStorageWorkflow.match(/wrangler@4\.28\.1 deploy --config/g)||[]).length;
ok(standardWorkerDeployCount===2&&!/wrangler(?:@[^\s]+)? versions deploy/.test(tripStorageWorkflow),'Worker-cutover skal bruge præcis to almindelige 100 %-deploys og må ikke kunne efterlade delt trafik');
for(const marker of [
  'Check exact-head D1 trip-storage readiness',
  'Deploy RavRadar trip storage [d1]',
  'EXPECTED_TRIP_STORAGE_MODE: d1',
  'node scripts/verify-trip-storage-edge.mjs',
  'node scripts/verify-cloudflare-trip-gateway.mjs',
]){
  ok(workflow.includes(marker),`Pages-interlocken mangler exact/live D1-bevis: ${marker}`);
}
for(const marker of ['projectLegacyExternalTripPayload','isLegacyCompatibleTripReplay','assertExternalTripNestedContract','assertNoPrivateLocation']){
  ok(tripStorageShared.includes(marker),`Den fælles turlagergrænse mangler sikker legacy/current-kontrakt: ${marker}`);
}
for(const marker of ['trip_observation_registry','trip_owner_erasure_tombstones','ownerErased','purgeOwnerTrips','on conflict do nothing','TRIP_IDEMPOTENCY_CONFLICT','TRIP_STORED_RECORD_INTEGRITY_INVALID']){
  ok(tripGatewayWorker.includes(marker),`D1-Workeren mangler atomisk idempotens-/readbackkontrakt: ${marker}`);
}
for(const marker of ['trip_observation_registry','trip_observation_registry_trip_unique','trip_observation_registry_owner_client_unique','trip_owner_erasure_tombstones','trip_storage_control']){
  ok(tripGatewayMigration.includes(marker)&&tripStorageShared.includes(marker),`D1-skemaet mangler payloadfri global idempotens-/erasure-/fasekontrakt: ${marker}`);
}
ok(tripGatewayWorker.includes("contract_version: '4.0.311'")
  &&tripGatewayWorker.includes('idempotency_registry_schema_version: 2')
  &&tripGatewayWorker.includes('owner_erasure_tombstone_schema_version: 1')
  &&tripGatewayVerification.includes("body?.contract_version === '4.0.311'")
  &&tripGatewayVerification.includes('body?.idempotency_registry_schema_version === 2')
  &&tripGatewayVerification.includes('body?.owner_erasure_tombstone_schema_version === 1'),
  'Worker-health mangler eksakt registry-/erasure-versionsattestation');
ok(tripStoragePreparation.includes('d1ActivationAttempted')
  &&tripStoragePreparation.includes('GITHUB_OUTPUT')
  &&tripStorageActivationMarker.includes('insert into trip_storage_control')
  &&tripStorageActivationMarker.includes('d1_activation_attempted=true'),
  'Den varige D1-fase kan ikke læses, skrives og genattesteres');
for(const marker of [
  'TRIP_STORAGE_SHARD_COUNT = 10',
  '`ravradar-trips-${index}`',
  'ravradar-trips-0..9',
  'jurisdiction !== \'eu\'',
  '33024408547',
  '5c7f774d3f09a527628d97e08c3900d49eb41a89',
  'workflow_dispatch',
  '.github/workflows/deploy-trip-storage.yml',
  '/jobs?filter=latest&per_page=100',
  'Validate, migrate and deploy trip storage',
  'Configure normal Cloudflare D1 mode',
  'Configure explicit Supabase rollback mode',
  'payload?.total_count !== 1',
  'job?.run_attempt !== 1',
  "rollback?.conclusion !== 'skipped'",
  '/rel="next"/i',
]){
  ok(tripStorageLegacyClassification.includes(marker),`Legacy-D1-klassifikationen mangler bundet evidens: ${marker}`);
}
ok(tripStoragePreparation.includes('classifyExistingTripStorageDatabases')
  &&tripStoragePreparation.includes('verifyLegacyActivationEvidence')
  &&tripStoragePreparation.includes('fetchImpl: boundedFetch')
  &&tripStoragePreparation.includes('legacy_d1_detected'),
  'Prepare-trinnet klassificerer eller runverificerer ikke den eksakte legacy-D1-installation med en bundet request');
for(const marker of ['resolution=ignore-duplicates,return=minimal','SUPABASE_IDEMPOTENCY_TIMESTAMPS','SUPABASE_IDEMPOTENCY_UUIDS','sameOwnerBinding','TRIP_IDEMPOTENCY_CONFLICT']){
  ok(tripStore.includes(marker),`Supabase-fallback mangler no-overwrite/idempotensparitet: ${marker}`);
}
ok(tripStore.includes('Deno.env.get("TRIP_STORAGE_MODE")?.trim() || ""')
  &&!tripStore.includes('Deno.env.get("TRIP_STORAGE_MODE") || "supabase"'),
  'Manglende storage-mode må ikke stiltiende falde tilbage til Supabase efter D1-grænsen');
ok(tripStore.includes('TRIP_STORAGE_MAINTENANCE_MAX_LEASE_MS = 30 * 60_000')
  &&tripStore.includes('value.startsWith("maintenance:")')
  &&tripStore.includes('if (now >= deadline) return "d1"')
  &&tripStore.includes('TRIP_STORAGE_MAINTENANCE_LEASE_INVALID')
  &&tripStore.includes('TRIP_STORAGE_MAINTENANCE')
  &&tripEdgeReadiness.includes("['d1', 'supabase', 'maintenance']")
  &&tripEdgeReadiness.includes('TRIP_STORAGE_EDGE_FETCH_TIMEOUT_MS = 5_000')
  &&tripStoragePreparation.includes('legacy_d1_detected')
  &&tripStoragePreparation.includes('classifyExistingTripStorageDatabases'),
  'Eksisterende D1-installation kan ikke quiesces med en udløbende fail-closed lease før Worker-opgradering');
for(const marker of ['EXPECTED_TRIP_STORAGE_MODE=d1|supabase|maintenance','x-ravradar-trip-contract-version','x-ravradar-trip-storage-mode']){
  ok(tripEdgeVerification.toLowerCase().includes(marker.toLowerCase()),`Live Edge-verifikationen mangler mode-/versionskontrakt: ${marker}`);
}
ok(tripEdgeReadiness.includes('requiredConsecutiveSuccesses = 2')
  &&tripEdgeReadiness.includes('consecutiveSuccesses += 1')
  &&tripEdgeReadiness.includes('consecutiveSuccesses = 0')
  &&tripEdgeReadiness.includes('cache: \'no-store\''),
  'Edge-readiness kræver ikke to sammenhængende no-cache-beviser fra begge funktioner med femsekunders request-bound');
for(const marker of ['AbortSignal.timeout(milliseconds)','AbortSignal.any([callerSignal, deadlineSignal])','TRIP_STORAGE_NETWORK_TIMEOUT_CODE']){
  ok(tripStorageBoundedFetch.includes(marker),`Den fælles trip-storage-request-bound mangler: ${marker}`);
}
for(const [name,source] of [
  ['audit',tripStorageAudit],
  ['activation marker',tripStorageActivationMarker],
  ['migration',tripStorageMigration],
  ['prepare',tripStoragePreparation],
  ['Worker verification',tripGatewayVerification],
  ['Edge verification',tripEdgeVerification],
  ['Edge readiness',tripEdgeReadiness],
]){
  ok(source.includes('bounded-fetch.mjs'),`Trip-storage ${name} bruger ikke den fælles hårde netværkstimeout`);
}
ok(tripStorageProjection.includes('SUPABASE_OBSERVATION_LEAF_PROJECTIONS')
  &&tripStorageProjection.includes('SUPABASE_IDEMPOTENCY_SELECT')
  &&tripStorageProjection.includes('assertIdempotencySourceRow')
  &&tripStorageMigration.includes('SAFE_MIGRATION_PAYLOAD_COLUMNS')
  &&tripStorageMigration.includes('SUPABASE_OBSERVATION_LEAF_PROJECTIONS')
  &&tripStorageMigration.includes("endpoint.searchParams.set('select', SUPABASE_OBSERVATION_SELECT)")
  &&!tripStorageMigration.includes("endpoint.searchParams.set('select', '*')")
  &&!tripStorageMigration.includes('select=*'),'Supabase→D1-migrationen er ikke låst til en eksplicit dataminimeret bladprojektion');
ok(String(pkg.scripts?.['test:hybrid-trip-storage']||'').includes('test-trip-storage-migration-projection-4.0.311.mjs')
  &&String(pkg.scripts?.['test:hybrid-trip-storage']||'').includes('test-trip-storage-legacy-classification-4.0.311.mjs'),
  'Migrations-privacytesten og legacy-D1-evidenstesten indgår ikke begge i den obligatoriske lagergate');
for(const marker of ['tripInputFieldNames4010','externalTripRecord4010','ravscore-evidence-trust-unattested']){
  ok(hybridTripStorageTest.includes(marker),`Krydsversionstesten ny Edge→4.0.310 Worker mangler: ${marker}`);
}
ok(candidateGStatePipeline.includes('CANDIDATE_G_RECONSTRUCTED_STATE_SCHEMA_VERSION'),'Candidate G-statepipelinen mangler særskilt rekonstrueret schema 2.1');
ok(publicApp.includes("t('data.emergency'")&&publicI18n.includes('Dataene er ikke aktuelle')&&publicI18n.includes('Die Daten sind nicht aktuell')&&publicI18n.includes('The data is not current'),'Den offentlige brugerflade advarer ikke på DA/DE/EN om nøddriftens aktualitet');
ok(String(gapCheckpoint.sourceRunId)==='33059522170'&&gapCheckpoint.sourceArtifactName==='RavRadar-support-3633'&&gapCheckpoint.maximumResumeGapHours===3,'Det engangs-godkendte Candidate G-gapcheckpoint er ikke låst til den verificerede kilde og tre timer');
ok(await exists('docs/rdks/10_DECISIONS/DEC-0084-CANDIDATE-G-AUTOMATIC-GAP-RECOVERY.md'),'RDKS mangler DEC-0084 om Candidate G-selvrecovery');
ok(await exists('docs/rdks/10_DECISIONS/DEC-0085-CAUSAL-PRODUCTION-AND-BOUNDED-RECOVERY.md'),'RDKS mangler DEC-0085 om årsagstro produktion og bundet selvrecovery');
ok(await exists('docs/rdks/10_DECISIONS/DEC-0109-ONE-TIME-CANDIDATE-G-GAP-RECONSTRUCTION.md'),'RDKS mangler DEC-0109 om den afgrænsede engangsrekonstruktion');
for(const protectedPath of ['handbook.html','documentation.html','data/diagnostics/','data/geometry-v2/','.geometry-v2-work/','data/live/weather-health.json','data/live/ravradar-runtime-diagnostics.json','data/live/dmi-water-stations.json']){
  ok(workflow.includes(`--exclude '${protectedPath}'`)||workflow.includes(`--exclude \"${protectedPath}\"`),`Pages-workflow udelukker ikke ${protectedPath}`);
}
ok(!workflow.includes("--exclude 'js/services/handbook-review-store.js'"),'Pages-workflow må ikke udelukke et browsermodul som admin importerer');
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
ok(adminDashboard.includes('Siden ændrer aldrig Candidate G eller den offentlige RavScore'),'Kalibreringsgrundlaget skal være tydeligt skrivebeskyttet');
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
const report={version,checkedAt:new Date().toISOString(),status:'passed',checks:{versionConsistency:true,handbook:true,rdks:true,supabase:true,protectedPagesArtifact:true,domainReadiness:true,secretsScan:true,packagingPolicy:true}};
await fs.mkdir('release',{recursive:true});
await fs.writeFile('release/RELEASE-REPORT.json',JSON.stringify(report,null,2)+'\n');
await fs.writeFile('release/RELEASE-REPORT.md',`# Release-rapport ${version}\n\n- Status: **BESTÅET**\n- Kontrolleret: ${report.checkedAt}\n- Versionskonsistens: OK\n- Håndbog og RDKS: OK\n- Supabase- og rettighedskæde: OK\n- Beskyttede Pages-filer: OK\n- Domæneberedskab: OK\n- Hemmelighedsscanning: OK\n- Pakningspolitik: OK\n\nBemærk: Rapporten dokumenterer lokale kontroller. En faktisk grøn GitHub Actions-kørsel skal stadig verificeres efter push.\n`);
console.log(`Release gate bestået for RavRadar ${version}.`);
