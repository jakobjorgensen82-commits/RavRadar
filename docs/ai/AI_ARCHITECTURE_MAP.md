# AI Architecture Map – RavRadar

## Lokal 4.0.312 roll-forward – én incidentlåst Candidate G-rekonstruktion

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

Operationel status: 4.0.311 bestod PR #224 exact-head CI `33263734108` og blev merged som `7c168b00af535415117c968a8c021a493b083137`; push `33263858078` var en korrekt no-op. Backend `33263892151` fejlede efter atomisk SQL HTTP 201 i den gamle `pg_get_constraintdef`-regex. CHECK/validering/kommentar er derfor med høj sandsynlighed committed samlet, mens det eneste atomiske alternativ er fuld rollback. Ingen observationspayload blev hentet til runneren eller logget, ingen rækkemutation skete, og D1, Edge, Worker, sync, vejr, artifact eller Pages blev ikke nået. Offentlig version er fortsat 4.0.310. 4.0.312's målrettede tests, fulde lokale source/release/RDKS/håndbog/version og geodatakontrol er grønne, og exact-D1-interlocken omfatter versionen; PR/exact-head, merge, backend, rekonstruktion og offentlig verifikation mangler. Se DEC-0109 og DEC-0102-addendum.

## Offentlig GPT-OSS-assistent i 4.0.291

- `config.js` – offentlig aktivering gennem `ravAssistantRemoteEnabled=true`; `false` er kill switch/rollback.
- `js/services/rav-assistant.js` – afviser uvedkommende/sikkerhedsfølsomme spørgsmål og ruter bedste sted/tid/score lokalt før ethvert fjernkald. Kun ravrelevant ukendt fri tekst bliver remote-kandidat.
- `supabase/functions/ravradar-assistant/index.ts` – server-side Cloudflare-kald med Workers AI-token, rate limits, timeout og fail-closed svarvalidering.
- `supabase/functions/_shared/rav-assistant-contract.ts` – fælles GPT-OSS-model, offentlige fakta, DA/DE/EN-afvisninger, domænegate, kontekstminimering, prompt og femfeltsvalidering.
- `supabase/functions/_shared/public-gateway.ts` – fælles origin-/CORS-, request-, timeout-, fejl- og databasebaseret rate-limitgrænse.
- `index.html` og `js/i18n.js` – synlig DA/DE/EN-kvotetekst. Kvote-/providerfejl returnerer ikke et browsersvar fra Edge, men falder gennem klienten til lokal tekst uden at påvirke prognosen.

Cloudflare-kontoen skal forblive Workers Free / $0 uden prepaid overflow. Kun `CLOUDFLARE_ACCOUNT_ID` og `CLOUDFLARE_WORKERS_AI_TOKEN` findes som Supabase Edge-secrets; ingen providercredential må findes i Pages eller repository. Se DEC-0088.

## Candidate G-cadencefase og state-recovery

- `js/core/ravscore-regime-memory.js` – fast 48-timersrand, højst tre timers verificeret kompakt kadence og fail-closed ved manglende forgænger eller internt hul. Når en virkelig forgænger kræves for et faseskudt komplet vindue, bevares den kompakt til næste rullende reference, men holdes ude af aktuelt replay og dækningssum.
- `js/core/ravscore-candidate-g-state-pipeline.js` – fortsætter kun kompatibel model-/profil-/kystkontekst og gemmer den dataminimerede transportstate.
- `scripts/restore-candidate-g-continuation.mjs` – eksakt artifact-/hash-låst engangsrecovery; 4.0.285-strategien sammenfletter kun compact transport evidence og kræver mindst 99 % `READY`.
- `data/admin/candidate-g-continuation-recovery.json` – tids-, datasæt-, run-, delantal- og SHA-256-binding for den aktuelle engangshændelse.
- `scripts/test-ravscore-regime-memory.mjs`, `test-ravscore-candidate-g-state-pipeline.mjs` og `test-candidate-g-continuation-recovery-4.0.272.mjs` – fase-, kort-vindue-, to-rullende-reference-, split-run- og recoverykontrakter.
- `scripts/audit-ravscore-candidate-g-public-shadow.mjs` + `.github/workflows/update-and-deploy.yml` – syntetisk selftest og obligatorisk audit af den faktisk genererede public runtime før deploy.

Se DEC-0081. Recoveryen må ikke kopiere rå strøm, vejr, scoreoutput, koordinater, geometri, punkter eller private payloads.

## Sikkerhedsgrænser og offentlige Edge-funktioner

- `js/services/html-sanitizer.js` – allowlist for dynamisk, centralt HTML før DOM-visning.
- `js/services/permissions-service.js` + `js/ui/admin-dashboard.js` – smallere ekspertprofil-/rettighedsflade; databasen er fortsat autoritativ.
- `js/services/observation-service.js` – lokal outbox og dataminimeret klientpayload til Edge, aldrig direkte browserinsert.
- `supabase/functions/_shared/public-gateway.ts` – fælles origin/CORS, JSON-grænse, timeout, sikre fejl og rate limiting.
- `supabase/functions/submit-observation/index.ts` – observationens server-side felt-, privatlivs-, bruger- og tidskontrakt.
- `supabase/functions/ravradar-assistant/index.ts` – afgrænset offentlig assistentgateway; den historiske deaktivering er erstattet af ejerens 4.0.291-aktivering.
- `knowledge/rav-assistant-public-v1.json` – versionsbundet, offentlig Candidate G-vidensallowlist uden private eller interne felter.
- `scripts/fixtures/rav-assistant-evals-v1.json` + `scripts/run-rav-assistant-model-evals.mjs` – 45-case balanceret DA/DE/EN-kontrakt og eksplicit Free Tier-only live-eval; ingen providerkald i normal self-test, og standard-live kalder kun remote-kandidatcases.
- `supabase/migrations/20260826_security_hardening.sql` – RLS, privilege-revokes, smallere permissions-RPC og rate-limit-tabel/RPC.

Windows Application Control må ikke omgås for Edge-deploy. Brug en godkendt browser-, CI- eller CLI-kanal. Se DEC-0080.

Den offentlige fjernassistent router fast afvisning og deterministiske Candidate G-dataintents før providerkald. Kun øvrige ravrelevante kandidater må nå GPT-OSS med den lille offentlige kontekst; modellen skal også afvise åbne uvedkommende emner, og svar valideres mod locale, disposition og kendte evidens-ID'er. Gemini Flash-Lite er kun historisk reference. Gratis kvoteudløb er normal lokal fallback, ikke en fejl i prognose- eller turflow. Se DEC-0083/0087/0088.

## Data- og buildpipeline
- `.github/workflows/update-and-deploy.yml` – samlet produktionsorkestrering og eneste repositoryworkflow med Pages-deploy. Det startes normalt eksternt via `workflow_dispatch` og auditerer den faktiske Candidate G-runtime efter generering og før fuld validering, Supabase-sync, artifact og Pages.
- `.github/workflows/validate-copernicus-current-pilot.yml` og `preserve-copernicus-current-shadow.yml` – privat, score-neutral strømopsamling og read-only cacheheartbeat. Heartbeatet kan kun dispatch'e piloten ved manglende aktuel UTC-time; piloten genbruger kun en time med matchende centralt vandpunktsfingeraftryk og komplet recordmanifest. Ingen af dem har Pages-rettigheder.
- De øvrige workflowfiler er registrerede private, manuelle QA-/recoveryjobs uden Pages-deploy. `scripts/test-workflow-validation-order-4.0.108.mjs` er det bindende aktive inventar. `pages-build-deployment` er GitHubs egen Pages-mekanisme, ikke en repositoryfil.
- `scripts/sync-admin-config.py` – henter central admin-konfiguration.
- `scripts/apply-central-zone-reviews.py` – anvender godkendte zone-/geometriændringer.
- `scripts/hydrate-deployed-weather.py` – hydrering af senest deployede weather state.
- `scripts/update-dmi-bulk.py` – DMI STAC/GRIB bulk, scheduler, sampling, vektorkandidater og autoritativ native komponentproveniens (`collection`, `modelRun`, `nativeValidTime`).
- `scripts/update-water-source-registry.mjs` – DMI-vandstandskilderegister.
- `scripts/lib/dmi-forecast-store.mjs` – UTC-timebygning, komponentvis interpolation inden for samme model-run samt lead time/prognosealder.
- `scripts/update-weather.mjs` – bygger den centrale weather-cache og bevarer komponentproveniens gennem DMI/fallback-merge.
- `scripts/enrich-current-provenance.mjs` – videnskabelig current-proveniens og rå U/V/gridpunkter.
- `scripts/generate-public-conditions.mjs` + `scripts/public-conditions-lib.mjs` – deterministisk public runtime.
- `scripts/generate-state-reference-report-4.0.113.mjs` – referencezoner/statekontrol.
- `scripts/release-gate.mjs` og `scripts/validate-*.mjs` – release-/integritetsgates.

## Core browserlogik
- `js/core/score-engine.js` – RavScore.
- `js/core/coastal-process-model.js` – kystproces/state-relateret model.
- `js/core/direction-anchors.js` – lokale retningsankre.
- `js/core/water-station-routing.js` – vandstandsrouting.
- `js/core/current-direction-audit.js` – strømretning/audit.
- `js/core/best-time-selector.js` – bedste tidspunkt skal være konsistent med RavScore.
- `js/core/rule-engine.js` – aktive regler.

## Services og central admin
- `js/services/admin-document-store.js` – centrale admindokumenter.
- `js/services/zone-registry.js` – aktivt zoneregister.
- `js/services/handbook-review-store.js` – ekspert/håndbogsreviews.
- `js/services/persistence-test-service.js` – persistenskontroller.
- `js/services/site-function-test-service.js` – sitetest.
- `js/services/data-service.js` – public/central dataadgang.
- `js/ui/admin-app.js`, `admin-dashboard.js`, `admin-coastline-editor.js` – synlige adminarbejdsgange.

## Historisk state
- `scripts/lib/current-transport-history.mjs` – pipelinehistorik og transportregimer.
- `scripts/test-current-transport-history-4.0.115.mjs` og state-reference-tests – beskytter skyggetilstanden.

## Kritiske regressionstests
- `scripts/test-dmi-vector-grid-integrity-4.0.116.py` – U/V-grid- og lagintegritet.
- `scripts/test-dmi-scheduler-active-zones-4.0.117.mjs` – schedulerens aktive zoner/familier/geografiske recovery.
- `scripts/test-current-spatial-scientific-audit-4.0.76.mjs` – spatial currentintegritet.
- `scripts/test-admin-editable-zone-contract-4.0.93.mjs` og `test-zone-admin-propagation-4.0.89.mjs` – dynamiske adminzoner/propagation.
- `scripts/test-missing-weather-null-safety-4.0.116.mjs` – missing er ikke nul.
- `scripts/test-water-*` og `test-water-station-*` – vandstandskilders routing/lifecycle.
- `scripts/test-public-runtime-*` og startup-tests – offentlig runtime/performancekontrakter.

Kortet er en indgang, ikke en erstatning for at læse den faktiske kode. Filnavne med historiske versionsnumre kan stadig være aktive regressionstests; vurder deres kontrakt frem for versionsnavnet alene.
