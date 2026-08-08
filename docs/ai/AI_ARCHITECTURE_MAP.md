# AI Architecture Map – RavRadar

## Data- og buildpipeline
- `.github/workflows/update-and-deploy.yml` – repositoryets eneste aktive workflow; samlet produktionsorkestrering og Pages-deploy. `pages-build-deployment` er GitHubs egen Pages-mekanisme, ikke en fil i repositoryet.
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
