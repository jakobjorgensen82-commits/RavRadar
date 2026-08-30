# AI Architecture Map – RavRadar

## Offentlig GPT-OSS-assistent i 4.0.291

- `config.js` – offentlig aktivering gennem `ravAssistantRemoteEnabled=true`; `false` er kill switch/rollback.
- `js/services/rav-assistant.js` – afviser uvedkommende/sikkerhedsfølsomme spørgsmål og ruter bedste sted/tid/score lokalt før ethvert fjernkald. Kun ravrelevant ukendt fri tekst bliver remote-kandidat.
- `supabase/functions/ravradar-assistant/index.ts` – server-side Cloudflare-kald med Workers AI-token, rate limits, timeout og fail-closed svarvalidering.
- `supabase/functions/_shared/rav-assistant-contract.ts` – fælles GPT-OSS-model, offentlige fakta, DA/DE/EN-afvisninger, domænegate, kontekstminimering, prompt og femfeltsvalidering.
- `supabase/functions/_shared/public-gateway.ts` – fælles origin-/CORS-, request-, timeout-, fejl- og databasebaseret rate-limitgrænse.
- `index.html` og `js/i18n.js` – synlig DA/DE/EN-kvotetekst. Kvote-/providerfejl returnerer ikke et browsersvar fra Edge, men falder gennem klienten til lokal tekst uden at påvirke prognosen.

Cloudflare-kontoen skal forblive Workers Free / $0 uden prepaid overflow. Kun `CLOUDFLARE_ACCOUNT_ID` og `CLOUDFLARE_WORKERS_AI_TOKEN` findes som Supabase Edge-secrets; ingen providercredential må findes i Pages eller repository. Se DEC-0088.

## Integreret RavScore-model, state og continuation

- `js/core/ravscore-model-contract.js` – kanonisk model-, state-, variant-, profil-, komponent- og forklaringskontrakt samt krav om separat parameterkontrakt- og transitiv bundlehash for `RRS-COASTAL-PROCESS-INTEGRATED-1.0.0` / state `4.0.0`.
- `js/core/ravscore-integrated.js` – samlet 20/50/30-beregning, strukturel score-neutral sidste led, adskilt datakomplethed/modelusikkerhed og forklaringer uden empirisk fundpåstand.
- `js/core/ravscore-current-supply-memory.js` – +10/-8, 0,03→0,15 m/s, 24 timers fuld vægt og cosinusfade til 0 ved 48 timer med højst tre timers gap og 49 afledte evidenspunkter.
- `js/core/ravscore-wave-mobilisation-state.js` – relativ `Hs² × T`, fire timers build, 48 timers decay, missing-/restart-/migrationkontrakt og højst én times recovery-credit.
- `js/core/ravscore-huntability.js`, `best-time-policy.js` og `score-presentation.js` – jagtform, score-neutral vandstandstie-break og ensartet offentlig præsentation.
- `js/core/ravscore-integrated-state-pipeline.js` – fortsætter kun kompatibel model-/profil-/kystkontekst og producerer state 4 uden kunstig historik.
- `scripts/lib/ravscore-profile-transition.mjs`, `scripts/lib/ravscore-candidate-g-rollback-runtime.mjs` og `scripts/prepare-candidate-g-operational-rollback.mjs` – præcis engangs Candidate G schema-2→integreret schema-4-migration, deterministisk rollback-orakel og forseglet manuel Candidate G-plan. Ingen af dem kører to offentlige modeller samtidig.
- `scripts/private-production-runtime-bundle.mjs` og `private-production-runtime-workflow.mjs` – atomisk privat otte-fils bundle med mål-, model-, hash-, sti- og integritetsbinding; den forseglede Copernicus-range-cache og varme Candidate G-projektion ligger kun her, og fuld runtime er aldrig et Pages-input.
- `scripts/ravscore-continuation-checkpoint.mjs` og `protected-ravscore-continuation-checkpoint.mjs` – kompakt schema-4-state i privat Actions-cache eller det beskyttede operationelle `admin_documents`-dokument. Højst 72 timer; fremtidige checkpointopdateringer versionskopieres ikke, men eksisterende `admin_document_versions` bevares uden destruktiv oprydning; fatal ved mismatch/fremtid/tidsregression.
- `scripts/audit-ravscore-integrated-public-runtime.mjs`, `audit-pages-artifact-privacy.mjs` og `.github/workflows/update-and-deploy.yml` – auditerer de faktisk genererede fire livefiler, 210/673, model-/hashbinding og fravær af private bundlefingeraftryk før deploy.
- `scripts/ravscore-operational-activation.mjs` – beskyttet v3-controller med fire statusser og overgangstyper. Alle skift observerer source Pages, skriver `PENDING` med bevaret central source-profil, deployer/verificerer target og atomiserer derefter `ACTIVE` + central target-profil. Crash/retry reconcilerer source/requested/third manifest fail-closed. Første cutover er push-only; rollback/return manual-only; scheduler må kun refreshe allerede `CANDIDATE_G_ACTIVE`. Assistentens Edge skiftes ikke til en Candidate-version.
- `.github/workflows/deploy-trip-storage.yml` – læser migrationshistorik og dry-run skrivefrit, genhenter derefter `origin/main` og kræver `HEAD == origin/main == GITHUB_SHA` umiddelbart før første eksterne backendskrivning. Hele post-write-rækken fortsætter fra samme checkout og isolerede migrationssnapshot.

Candidate G forbliver eneste offentlige model indtil den atomiske DEC-0108-cutover. Mens integreret er aktiv, er Candidate G kun privat migration-/offline-/rollback-orakel. Kun controllerens manuelle hel-rollback kan igen gøre Candidate G til den ene offentlige scoremodel; den gamle offentlige Candidate G-recovery/shadow er ikke en automatisk sidevej. Der deployes ingen særskilt Candidate G-assistent-Edge: den integrerede Edge svarer `409`, klienten bruger deterministiske lokale DA/DE/EN-svar, og schema-3-ture lagres Candidate G-bundet med `calibration_eligible=false`. Ingen continuation må kopiere rå U/V, koordinater, geometri, punkter eller private payloads. Checkpointmigrationen bevarer eksisterende `admin_document_versions` og udfører ingen destruktiv cleanup. Se DEC-0108.

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
- `scripts/hydrate-deployed-weather.py` – kun den eksakte `--legacy-candidate-g-bootstrap` ved første DEC-0108-cutover; generisk hydrering fra deployet offentlig weather state er pensioneret.
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
- `js/core/ravscore-integrated.js`, `ravscore-current-supply-memory.js`, `ravscore-wave-mobilisation-state.js` og `ravscore-huntability.js` – autoritativ integreret RavScore og state.
- `js/core/score-engine.js` og `coastal-process-model.js` – historisk kode/reference; må ikke eje den aktive offentlige DEC-0108-score.
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
- `js/services/data-service.js` – læser kun hashbundne schema-4-primærfiler; ingen offentlig recovery-/shadowmodel eller blandet datasæthydrering.
- `js/ui/admin-app.js`, `admin-dashboard.js`, `admin-coastline-editor.js` – synlige adminarbejdsgange.

## Historisk state
- `scripts/lib/current-transport-history.mjs` – pipelinehistorik og transportregimer.
- `scripts/test-current-transport-history-4.0.115.mjs` og state-reference-tests – beskytter skyggetilstanden.
- Candidate G-regime-, state- og recoveryfiler bevares som migrations-/rollback- og regressionsreference, men er ikke aktiv offentlig DEC-0108-runtime.

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
