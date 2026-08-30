# AI Architecture Map – RavRadar

## 4.0.314 source merged; same-version sourcegate-hotfix

- `one-time-candidate-g-gap-reconstruction.mjs` accepterer ét målt evidenspunkt kun for rollen `AFTER`; før, target, rollback og cleanup beholder minimum to.
- Singletonen kan kun fortsætte, når før- og targetserien uafhængigt beviser enstemmig 3-timerskadence. Eksakt state-replay, målanker, bracket, sourcebindings, descriptor og CAS er uændrede.
- `update-and-deploy.yml` kræver exact-main D1 på den endelige merge-SHA også for 4.0.314 og før inspect. Normal push/schedule/`none` forbliver no-op, indtil GitHub-metadata på samme SHA beviser både succesfuldt descriptorbundet apply-step og Pages-job; apply/rollback/cleanup er fortsat mulige efter D1.
- Den fælles produktions-concurrency annullerer aldrig et igangværende apply; køede normale runs genkontrollerer freshness. Hele hvert run-/jobsvar parse- og shapevalideres samlet, så delvist parseroutput ikke kan åbne gaten.
- `test:dmi-marine-first-recovery` kræver præcis én `cancel-in-progress: false` og ligger i `test:workflow-action-contracts`, som `validate:source` kører. Dermed kan en stale fuld-produktionsassertion ikke igen passere PR-sourcegaten ubemærket.
- 4.0.315 er ulåst i regressionen. Låsen er incident- og releaseafgrænset, ikke en ny permanent managementafhængighed.

## Historisk lokal 4.0.313 – bounded legacy-replay mellem Supabase og D1

- `trip-source-projection.js` materialiserer kun eksplicitte PostgREST-blade; JSON-nullblade bliver bevidst ikke hentet.
- `trip-storage.js` komprimerer kun kendte nullblade/tomme underobjekter for historisk replay, efter schema-v2 stored top/nested/privacy er valideret. Schema-v1 går gennem bounded weather/calibrationprojektion.
- `worker.js` åbner forskellig-hash-kompatibilitet kun for migration→migration. Den gamle D1-row og registryhash forbliver canonical; missing registry backfilles med gammel stored hash.
- Readback bruger samme schema-v2 stored-gate. Gatewayklienten oversætter ubetroede/malformed svar til faste kategorier uden bodytekst.
- `update-and-deploy.yml` holder 4.0.313 Pages som no-op, indtil samme exact main har et helt grønt `[d1]`-backendbevis.

## Historisk lokal 4.0.312 roll-forward – én incidentlåst Candidate G-rekonstruktion

- `data/admin/candidate-g-one-time-gap-reconstruction-20260829.json` – statisk allowlist for incident, eksakte source-runs/artifacts/head, 210/673, 665/8-kadence og forbudte dataklasser.
- `scripts/one-time-candidate-g-gap-reconstruction.mjs` – read-only inspect, forseglet descriptor, source-/mål-CAS, apply, privat rollback, øjeblikkelig rollback og kausal cleanup.
- `js/core/ravscore-regime-memory.js` + `ravscore-candidate-g-state-pipeline.js` – markeret derived evidence, schema 2.1 under aktiv markør, schema 2.0 for measured-only og fail-closed normalisering.
- `scripts/update-weather.mjs`, `public-conditions-lib.mjs` og Candidate G-audit – trustprojektion, public hashbinding og suppression af rekonstruktionsafhængig hard observed-outflow.
- Continuation-checkpoint/-restore – cache schema 2 med payloadhash og trust; snæver read-bridge for gamle measured-only schema-1-caches.
- `candidate-g-public-recovery-fallback.mjs` – measured-only last-verified fallback; legacybro kræver oprindelige hashes, 210/673/1.346 og 673 målte schema-2.0-states.
- `app.js`, `trip-evidence-public-adapter.js`, `trip-evidence-contract.js`, observationservice og Edge/D1/Supabase/schema/installer – hele `activeManifest` føres til turkonteksten; startup-/kystdels-/manifest-trust skal være til stede og identiske før eksakt `ravscore-reconstructed-derived-evidence`/`public-emergency-last-complete`-binding og `calibration_eligible=false`. Pre-4.0.311 aktive/pending schema-v2-ture uden trust bevares gennem den fail-closed `ravscore-evidence-trust-unattested`-migration.
- Den lokale prediction-/kalibreringsforbruger – udelukker databasebevarede schema-v2-observationer fail-closed, medmindre appversionen er mindst 4.0.311, eligibility er eksplicit sand, og kvalitetsflaglisten er den eksakte attesterede tomme liste. Migreringen skriver ikke tilbage til observationstabellen.
- `.github/workflows/update-and-deploy.yml` – manuelle `inspect`/`apply`/`cleanup`-modes i samme produktions-concurrency og med uændrede fulde deploygates.
- `scripts/migrate-trip-storage-to-cloudflare.mjs` + shared source projection – eksplicit PostgREST top-/nested bladselect; ingen `select=*`, hele fri-form-JSON, GPS/koordinater, rå U/V, fri tekst/billeder eller ukendte kolonner i runner-memory. Owner-id lever kun længe nok til HMAC og logges ikke.
- `supabase/functions/_shared/trip-storage.js` + `cloudflare/trip-gateway/worker.js` – type-/intervalallowlist, recursive privacygate, canonical readback, global atomisk `trip_observation_registry` på control-sharden og `trip_owner_erasure_tombstones` før sletning.
- `.github/workflows/deploy-trip-storage.yml` – efter capacity/CAS sættes `d1_edge_predeploy_intent` eller `fresh_edge_predeploy_intent` før første Edge-deploy. Existing D1 bruger 20-/30-minutters lease, femsekunders probes, dobbeltattestation/drain, 600 sekunders restlease og samlet syvminutters Worker-gate; partial deploy går D1 roll-forward. Fresh partial deploy går exact-main/Supabase-secret/eksakt Edge/dobbelt Supabase-attestation. Intet intent ved capacity/pre-CAS-fejl betyder nul recoverymutation. Den præcise live-rækkefølge læses altid fra workflowbyten; dokumentet er ikke livebevis.
- `scripts/apply-candidate-g-trip-quality-migration.mjs` – 4.0.312-verifieren udtrækker strukturelt præcis én JSONPath-literal fra PostgreSQLs deparserede constraint, tolererer ekstra parentesering, kræver den eksakte kanoniske path og afviser reorder, duplicate, extra og ambiguous. Den ændrer ikke trip protocol/header 4.0.311.
- `ravscore-public-runtime-contract.js`, data-service og `app.js` – målt-only atomisk 210/673-emergency med eksakt model/state/hash, maksimum 72 timer og kortere forecastudløb, DA/DE/EN-status, automatisk frisk primary og non-calibration tripbinding. Denne kontrakt er en bindende acceptgate for DEC-0102-modellen og må ikke bruge interpolation.

Ingen geometri, punkt, koordinat, rå U/V, vejr-, bølge- eller vandstandsrekonstruktion indgår. `calibration_eligible` er kun en fail-closed klientattestation, ikke serverbevist manifestproveniens eller empirisk evidens; global koefficientlæring er P2-låst.

Historisk status for dette arkitekturtrin: 4.0.311 bestod PR #224 exact-head CI `33263734108` og blev merged som `7c168b00af535415117c968a8c021a493b083137`; push `33263858078` var en korrekt no-op. Backend `33263892151` fejlede efter atomisk SQL HTTP 201 i den gamle `pg_get_constraintdef`-regex. 4.0.312 lukkede verifieren gennem PR #225/exact-head `33266087776` og merge `a5ece10d`; backend `33266229687` passerede D1/Edge/Worker, men fejlede migrationssynken. Den blev derfor ikke readiness, rekonstruktion eller offentlig release. Se det aktuelle 4.0.314-afsnit øverst samt DEC-0109 og DEC-0102-addendum.

## Offentlig GPT-OSS-assistent i 4.0.291

- `config.js` – offentlig aktivering gennem `ravAssistantRemoteEnabled=true`; `false` er kill switch/rollback.
- `js/services/rav-assistant.js` – afviser uvedkommende/sikkerhedsfølsomme spørgsmål og ruter bedste sted/tid/score lokalt før ethvert fjernkald. Kun ravrelevant ukendt fri tekst bliver remote-kandidat.
- `supabase/functions/ravradar-assistant/index.ts` – server-side Cloudflare-kald med Workers AI-token, rate limits, timeout og fail-closed svarvalidering.
- `supabase/functions/_shared/rav-assistant-contract.ts` – fælles GPT-OSS-model, offentlige fakta, DA/DE/EN-afvisninger, domænegate, kontekstminimering, prompt og femfeltsvalidering.
- `supabase/functions/_shared/public-gateway.ts` – fælles origin-/CORS-, request-, timeout-, fejl- og databasebaseret rate-limitgrænse.
- `index.html` og `js/i18n.js` – synlig DA/DE/EN-kvotetekst. Kvote-/providerfejl returnerer ikke et browsersvar fra Edge, men falder gennem klienten til lokal tekst uden at påvirke prognosen.

Cloudflare-kontoen skal forblive Workers Free / $0 uden prepaid overflow. Kun `CLOUDFLARE_ACCOUNT_ID` og `CLOUDFLARE_WORKERS_AI_TOKEN` findes som Supabase Edge-secrets; ingen providercredential må findes i Pages eller repository. Se DEC-0088.

## Integreret RavScore-model, state og continuation

- `js/core/ravscore-model-contract.js` – kanonisk kontrakt for `RRS-COASTAL-PROCESS-INTEGRATED-1.1.0` / state `5.0.0`, variant `COASTAL-SUPPLY-MOBILISATION-BOUNDED-WAVE-APPROACH-HUNTABILITY-2`, profil `cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-coldrestart-gapcredit1-lastmileewma4-atten15-v4`, komponent `ravscore-components-huntability-delivery-mobilisation-v4`, forklaring `ravscore-explanation-integrated-v4` samt separat parameterkontrakt- og transitiv bundlehash.
- `js/core/ravscore-integrated.js` – samlet 20/50/30-beregning, hvor de 50 % ejes af `delivery=supply×factor` præcis én gang, adskilt datakomplethed/modelusikkerhed og forklaringer uden empirisk fundpåstand.
- `js/core/ravscore-current-supply-memory.js` – +10/-8, 0,03→0,15 m/s, 24 timers fuld vægt og cosinusfade til 0 ved 48 timer med højst tre timers gap og 49 afledte evidenspunkter.
- `js/core/ravscore-wave-mobilisation-state.js` – relativ `Hs² × T`, fire timers build, 48 timers decay, missing-/restart-/migrationkontrakt og højst én times recovery-credit.
- `js/core/ravscore-wave-approach-state.js` – kausal energivægtet `W/N/T`-EWMA med fire timers halveringstid og en ældre hale; DMI `FROM` roteres én gang +180° til `TOWARD` mod uændret kystnormal; `factor=clamp(1-0.15×W×(1-approach),0.85,1)`. Aktiv direction-missing fejler lukket. Kun `waveHeightM=0` er eksakt calm og neutral; `wavePeriodS` skal stadig være finit og ikke-negativ. `waveHeightM>0` med `wavePeriodS=0` er `INVALID` og fejler lukket. Bølger kan aldrig skabe eller øge supply.
- `js/core/ravscore-evidence-trust-contract.js` – fælles `VERIFIED_ONLY`/reconstructed/emergency-grænse. Kun verified er kalibreringsegnet; rekonstrueret/emergency og ture er ikke i sig selv kalibreringsgrundlag.
- `js/core/ravscore-huntability.js`, `best-time-policy.js` og `score-presentation.js` – jagtform, score-neutral vandstandstie-break og ensartet offentlig præsentation.
- `js/core/ravscore-integrated-state-pipeline.js` – fortsætter kun kompatibel model-/profil-/kystkontekst og producerer state 5 uden kunstig historik.
- `scripts/lib/ravscore-recovery-replay.mjs`, `scripts/resolve-candidate-g-wave-bootstrap-target.mjs` og `scripts/lib/dmi_wave_history_bootstrap.py` – migration `candidate-g-schema2-signed-current-reweight-bounded40h-wave-approach-to-integrated-schema5-v4`: én ren targetfunktion, aggregate-only 673/common-target-gate, signed coast-normal current-reweight uden rå U/V og 40 private WAM-præ-target-positioner fra coherent run pr. collection med same-cell provenance. Højst fire timers same-run/same-cell-interpolation er WAM-specifik; tail-/rå-scoregrænserne er `1/1024` og `0.01171875`. Fejl bevarer Candidate G offentlig.
- `scripts/lib/ravscore-profile-transition.mjs`, `scripts/lib/ravscore-candidate-g-rollback-runtime.mjs` og `scripts/prepare-candidate-g-operational-rollback.mjs` – rollback `integrated-schema5-to-candidate-g-schema2-v2` og forseglet manuel Candidate G-plan. Ægte cold start kræver særskilt eksakt 48 private verificerede timepositioner plus reel target; rollback bruger samme targettid uden dobbelt recovery-credit. Ingen af dem kører to offentlige modeller samtidig.
- `scripts/private-production-runtime-bundle.mjs` og `private-production-runtime-workflow.mjs` – atomisk privat otte-fils bundle med mål-, model-, hash-, sti- og integritetsbinding; den forseglede Copernicus-range-cache og varme Candidate G-projektion ligger kun her, og fuld runtime er aldrig et Pages-input.
- `scripts/ravscore-continuation-checkpoint.mjs` og `protected-ravscore-continuation-checkpoint.mjs` – kompakt state-5 i privat Actions-cache eller det beskyttede operationelle `admin_documents`-dokument. Kun samme-model atomisk nøddrift i højst 72 timer eller kortere forecastudløb; ingen cross-model fallback eller interpolation. Fremtidige checkpointopdateringer versionskopieres ikke, men eksisterende `admin_document_versions` bevares uden destruktiv oprydning; fatal ved mismatch/fremtid/tidsregression.
- `scripts/audit-ravscore-integrated-public-runtime.mjs`, `audit-pages-artifact-privacy.mjs` og `.github/workflows/update-and-deploy.yml` – auditerer de faktisk genererede fire livefiler, 210/673, model-/hashbinding og fravær af private bundlefingeraftryk før deploy.
- `scripts/ravscore-operational-activation.mjs` – beskyttet v3-controller med fire statusser og overgangstyper. Alle skift observerer source Pages, skriver `PENDING` med bevaret central source-profil, deployer/verificerer target og atomiserer derefter `ACTIVE` + central target-profil. Crash/retry reconcilerer source/requested/third manifest fail-closed. Første cutover er push-only; rollback/return manual-only; scheduler må kun refreshe allerede `CANDIDATE_G_ACTIVE`. Assistentens Edge skiftes ikke til en Candidate-version.
- `.github/workflows/deploy-trip-storage.yml` – læser migrationshistorik og dry-run skrivefrit, genhenter derefter `origin/main` og kræver `HEAD == origin/main == GITHUB_SHA` umiddelbart før første eksterne backendskrivning. Hele post-write-rækken fortsætter fra samme checkout og isolerede migrationssnapshot.

Candidate G forbliver eneste offentlige model indtil den atomiske DEC-0110-cutover. Mens integreret er aktiv, er Candidate G kun privat migration-/offline-/rollback-orakel. Kun controllerens manuelle hel-rollback kan igen gøre Candidate G til den ene offentlige scoremodel; den gamle offentlige Candidate G-recovery/shadow er ikke en automatisk sidevej. Der deployes ingen særskilt Candidate G-assistent-Edge: den integrerede Edge svarer `409`, klienten bruger deterministiske lokale DA/DE/EN-svar, og Candidate G-ture lagres med `calibration_eligible=false`. Ingen continuation må kopiere rå U/V, koordinater, geometri, punkter eller private payloads. DDM 50 m er alene statisk forskningskontekst og flytter ingen eksisterende kystnormal/geometri/punkter. Checkpointmigrationen bevarer eksisterende `admin_document_versions` og udfører ingen destruktiv cleanup. Se DEC-0110.

## Sikkerhedsgrænser og offentlige Edge-funktioner

- `js/services/html-sanitizer.js` – allowlist for dynamisk, centralt HTML før DOM-visning.
- `js/services/permissions-service.js` + `js/ui/admin-dashboard.js` – smallere ekspertprofil-/rettighedsflade; databasen er fortsat autoritativ.
- `js/services/observation-service.js` – lokal outbox og dataminimeret klientpayload til Edge, aldrig direkte browserinsert.
- `supabase/functions/_shared/public-gateway.ts` – fælles origin/CORS, JSON-grænse, timeout, sikre fejl og rate limiting.
- `supabase/functions/submit-observation/index.ts` – observationens server-side felt-, privatlivs-, bruger- og tidskontrakt.
- `supabase/functions/ravradar-assistant/index.ts` – afgrænset offentlig assistentgateway; den historiske deaktivering er erstattet af ejerens 4.0.291-aktivering.
- `knowledge/rav-assistant-public-v1.json` – versionsbundet offentlig vidensallowlist og faste svar uden private eller interne felter; dynamisk scorekontekst bindes til den aktive model.
- `scripts/fixtures/rav-assistant-evals-v1.json` + `scripts/run-rav-assistant-model-evals.mjs` – 45-case balanceret DA/DE/EN-kontrakt og eksplicit Free Tier-only live-eval; ingen providerkald i normal self-test, og standard-live kalder kun remote-kandidatcases.
- `supabase/migrations/20260826_security_hardening.sql` – RLS, privilege-revokes, smallere permissions-RPC og rate-limit-tabel/RPC.

Windows Application Control må ikke omgås for Edge-deploy. Brug en godkendt browser-, CI- eller CLI-kanal. Se DEC-0080.

Den offentlige fjernassistent router fast afvisning og deterministiske, aktivt modelbundne dataintents før providerkald. Kun øvrige ravrelevante kandidater må nå GPT-OSS med den lille offentlige kontekst; modellen skal også afvise åbne uvedkommende emner, og svar valideres mod locale, disposition og kendte evidens-ID'er. Gemini Flash-Lite er kun historisk reference. Gratis kvoteudløb er normal lokal fallback, ikke en prognose- eller turflowfejl. Se DEC-0083/0087/0088/0107.

## Data- og buildpipeline
- `.github/workflows/update-and-deploy.yml` – samlet produktionsorkestrering og eneste repositoryworkflow med Pages-deploy. Den anvender `20260829010000_ravscore_operational_documents_no_history.sql` før `20260829020000_integrated_trip_calibration_binding.sql` og skriver først protected readiness efter samlet database-/Edge-readback. Per kystdel vælges exact point-aktivering, gyldig integreret continuation, gyldigt checkpoint og først ved cutover dybt valideret Candidate G-state; ugyldig exact point stopper, mens en ugyldig ordinær kandidat ikke skygger for en gyldig lavere prioritet. Uden statekilde bygger allerede hentet privat, proveniensverificeret strøm/bølge en eksakt 48-timers pre-target-bro eller stopper med `RAVSCORE_RECOVERY_REPLAY_BRIDGE_MISSING`. Ny Edge giver eksakt `409` ved manglende/forkert modelbinding, så gammel klient bruger lokal Candidate G. Efter frisk DMI/Copernicus/runtime kører fuld validering og releasegate før checkpoint/bundle gemmes og de fire offentlige livefiler kan blive artifact/Pages.
- `.github/workflows/validate-copernicus-current-pilot.yml` og `preserve-copernicus-current-shadow.yml` – privat, score-neutral strømopsamling og read-only cacheheartbeat. Piloten må kun bruge privat cache med matchende centralt vandpunktsfingeraftryk og komplet recordmanifest; manglende cache er score-neutralt skip, ikke offentlig hydrering. Ingen af dem har Pages-rettigheder.
- De øvrige workflowfiler er registrerede private, manuelle QA-/recoveryjobs uden Pages-deploy. `scripts/test-workflow-validation-order-4.0.108.mjs` er det bindende aktive inventar. `pages-build-deployment` er GitHubs egen Pages-mekanisme, ikke en repositoryfil.
- `scripts/sync-admin-config.py` – henter central admin-konfiguration.
- `scripts/apply-central-zone-reviews.py` – anvender godkendte zone-/geometriændringer.
- `scripts/hydrate-deployed-weather.py` – kun den eksakte `--legacy-candidate-g-bootstrap` ved første DEC-0110-cutover; generisk hydrering fra deployet offentlig weather state er pensioneret.
- `scripts/update-dmi-bulk.py` – DMI STAC/GRIB bulk, scheduler, sampling, vektorkandidater og autoritativ native komponentproveniens (`collection`, `modelRun`, `nativeValidTime`).
- `scripts/update-water-source-registry.mjs` – DMI-vandstandskilderegister.
- `scripts/lib/dmi-forecast-store.mjs` – UTC-timebygning, komponentvis interpolation inden for samme model-run samt lead time/prognosealder.
- `scripts/update-weather.mjs` – bygger den centrale weather-cache, fortsætter integreret state og bevarer komponentproveniens gennem DMI/fallback-merge.
- `scripts/enrich-current-provenance.mjs` – videnskabelig current-proveniens og rå U/V/gridpunkter.
- `scripts/generate-public-conditions.mjs` + `scripts/public-conditions-lib.mjs` – deterministisk schema-4-runtime med manifest, kompakt startup, detaljer og kystdele som eneste offentlige livefiler.
- `scripts/generate-state-reference-report-4.0.113.mjs` – referencezoner/statekontrol.
- `scripts/release-gate.mjs` og `scripts/validate-*.mjs` – release-/integritetsgates.

## Core browserlogik
- `js/core/ravscore-public-model.js` og `ravscore-public-runtime-contract.js` – browserens kanoniske model-/state-/manifestbinding og fail-closed validering.
- `js/core/ravscore-integrated.js`, `ravscore-current-supply-memory.js`, `ravscore-wave-mobilisation-state.js`, `ravscore-wave-approach-state.js` og `ravscore-huntability.js` – autoritativ integreret RavScore og dens fysiske deltilstande.
- `js/core/ravscore-integrated-state-pipeline.js` og `ravscore-evidence-trust-contract.js` – state 5, migration/rollback, missing samt VERIFIED_ONLY/reconstructed/emergency-grænser.
- `js/core/score-engine.js` og `coastal-process-model.js` – historisk kode/reference; må ikke eje den aktive DEC-0110-score.
- `js/core/direction-anchors.js` – lokale retningsankre.
- `js/core/water-station-routing.js` – vandstandsrouting.
- `js/core/current-direction-audit.js` – strømretning/audit.
- `js/core/best-time-selector.js` + `best-time-policy.js` – modelbundet bedste tidspunkt, inklusive score-neutral vandstandstie-break.
- `js/core/rule-engine.js` – pensioneret historisk regelmotor; ingen aktiv offentlig RavScore må afhænge af den.

## Services og central admin
- `js/services/admin-document-store.js` – centrale admindokumenter.
- `js/services/zone-registry.js` – aktivt zoneregister.
- `js/services/handbook-review-store.js` – ekspert/håndbogsreviews.
- `js/services/persistence-test-service.js` – persistenskontroller.
- `js/services/site-function-test-service.js` – sitetest.
- `js/services/data-service.js` – vælger én hashbundet schema-4-firefilspakke atomisk: frisk primary eller en komplet VERIFIED_ONLY-nødpakke fra præcis samme modelbinding. Ingen privat recovery, cross-model-shadow eller blandet datasæthydrering.
- `js/ui/admin-app.js`, `admin-dashboard.js`, `admin-coastline-editor.js` – synlige adminarbejdsgange.

## Historisk state
- `scripts/lib/current-transport-history.mjs` – pipelinehistorik og transportregimer.
- `scripts/test-current-transport-history-4.0.115.mjs` og state-reference-tests – beskytter skyggetilstanden.
- Candidate G-regime-, state- og recoveryfiler bevares som migrations-/rollback- og regressionsreference, men er ikke den aktive DEC-0110-releasekandidats offentlige runtime.

## Kritiske regressionstests
- `scripts/test-dmi-vector-grid-integrity-4.0.116.py` – U/V-grid- og lagintegritet.
- `scripts/test-dmi-scheduler-active-zones-4.0.117.mjs` – schedulerens aktive zoner/familier/geografiske recovery.
- `scripts/test-current-spatial-scientific-audit-4.0.76.mjs` – spatial currentintegritet.
- `scripts/test-admin-editable-zone-contract-4.0.93.mjs` og `test-zone-admin-propagation-4.0.89.mjs` – dynamiske adminzoner/propagation.
- `scripts/test-missing-weather-null-safety-4.0.116.mjs` – missing er ikke nul.
- `scripts/test-water-*` og `test-water-station-*` – vandstandskilders routing/lifecycle.
- `scripts/test-public-runtime-*` og startup-tests – offentlig runtime/performancekontrakter.
- `scripts/test-ravscore-integrated-*`, `test-ravscore-*-memory.mjs`, `test-ravscore-profile-transition.mjs`, `test-*-continuation-checkpoint.mjs`, `test-private-production-runtime-*.mjs`, `test-candidate-g-rollback-bundle.mjs`, `test-prepare-candidate-g-operational-rollback.mjs`, `test-ravscore-operational-activation.mjs` og `test-pages-artifact-privacy.mjs` – model-, state-, migration-, operationel rollback-, continuation-, 210/673- og privacygates.

Kortet er en indgang, ikke en erstatning for at læse den faktiske kode. Filnavne med historiske versionsnumre kan stadig være aktive regressionstests; vurder deres kontrakt frem for versionsnavnet alene.
