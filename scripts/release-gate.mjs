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
  'candidate-g-continuation-checkpoint-v1-',
  'node scripts/candidate-g-continuation-checkpoint.mjs',
  'node scripts/candidate-g-public-recovery-fallback.mjs',
  '--stage',
  '--publish',
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
for(const marker of ['types: [requested, completed]','retry-failed-production:',`contains(fromJSON('["failure","timed_out","startup_failure"]'), github.event.workflow_run.conclusion)`,'external_watchdog:','default: false',"github.event_name == 'schedule' || (github.event_name == 'workflow_dispatch' && inputs.external_watchdog == true)",'production-watchdog:','--maximum-silence-minutes 45']){
  ok(heartbeatWorkflow.includes(marker),`Produktionsorkestreringen mangler selvrecovery: ${marker}`);
}
const candidateGMemory=await read('js/core/ravscore-regime-memory.js');
const candidateGStatePipeline=await read('js/core/ravscore-candidate-g-state-pipeline.js');
const publicRecovery=await read('scripts/candidate-g-public-recovery-fallback.mjs');
const publicDataService=await read('js/services/data-service.js');
const gapCheckpoint=JSON.parse(await read('data/admin/candidate-g-gap-checkpoint-recovery.json'));
ok(candidateGMemory.includes('restartAfterVerifiedTimeGap = false')&&candidateGMemory.includes('VERIFIED_TIME_GAP_SUFFIX_RESTART'),'Candidate G-hukommelsen mangler eksplicit opt-in til verificeret suffixgenstart');
ok(candidateGStatePipeline.includes('restartAfterVerifiedTimeGap: true')&&candidateGStatePipeline.includes('VERIFIED_TIME_GAP_RECOVERY'),'Candidate G-statepipelinen genstarter ikke sikkert efter et verificeret tidsgab');
ok(publicRecovery.includes('maximumAgeHours: 72')&&publicRecovery.includes('FALLBACK_FORECAST_EXPIRED')&&publicRecovery.includes('active-last-verified')&&publicRecovery.includes('Intet komplet, auditeret Candidate G-datasæt'),'Candidate G-nødvisningen mangler 72-timers hard cap, prognoseudløb eller fail-closed audit');
ok(publicDataService.includes('recoveryFallbackActive:true')&&publicDataService.includes('maximumAgeHours'),'Offentlig dataindlæsning mangler den bundne Candidate G-nøddrift');
ok(publicApp.includes("t('data.emergency'")&&publicI18n.includes('Dataene er ikke aktuelle')&&publicI18n.includes('Die Daten sind nicht aktuell')&&publicI18n.includes('The data is not current'),'Den offentlige brugerflade advarer ikke på DA/DE/EN om nøddriftens aktualitet');
ok(String(gapCheckpoint.sourceRunId)==='33059522170'&&gapCheckpoint.sourceArtifactName==='RavRadar-support-3633'&&gapCheckpoint.maximumResumeGapHours===3,'Det engangs-godkendte Candidate G-gapcheckpoint er ikke låst til den verificerede kilde og tre timer');
ok(await exists('docs/rdks/10_DECISIONS/DEC-0084-CANDIDATE-G-AUTOMATIC-GAP-RECOVERY.md'),'RDKS mangler DEC-0084 om Candidate G-selvrecovery');
ok(await exists('docs/rdks/10_DECISIONS/DEC-0085-CAUSAL-PRODUCTION-AND-BOUNDED-RECOVERY.md'),'RDKS mangler DEC-0085 om årsagstro produktion og bundet selvrecovery');
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
