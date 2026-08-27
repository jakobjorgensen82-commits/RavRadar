# AI Architecture Map – RavRadar

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
- `supabase/functions/ravradar-assistant/index.ts` – afgrænset offentlig assistentgateway; Pages bruger den ikke, mens `ravAssistantRemoteEnabled=false`.
- `knowledge/rav-assistant-public-v1.json` – versionsbundet, offentlig Candidate G-vidensallowlist uden private eller interne felter.
- `scripts/fixtures/rav-assistant-evals-v1.json` + `scripts/run-rav-assistant-model-evals.mjs` – 45-case balanceret DA/DE/EN-kontrakt og eksplicit Free Tier-only live-eval; ingen providerkald i normal self-test, og standard-live kalder kun remote-kandidatcases.
- `supabase/migrations/20260826_security_hardening.sql` – RLS, privilege-revokes, smallere permissions-RPC og rate-limit-tabel/RPC.

Windows Application Control må ikke omgås for Edge-deploy. Brug en godkendt browser-, CI- eller CLI-kanal. Se DEC-0080.

En senere fjernassistent skal route fast afvisning og deterministiske Candidate G-dataintents før providerkald. Kun øvrige kandidater må nå provider med den lille offentlige kontekst; modellen skal også afvise åbne uvedkommende emner, og svar valideres mod locale, disposition og kendte evidens-ID'er. `gemini-3.5-flash-lite`/low er valgt til næste deaktiverede Edge-kandidat efter 27/27 live-cases; gratis kvoteudløb er en normal lokal fallback, ikke en fejl i prognose- eller turflow. Se DEC-0083.

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
