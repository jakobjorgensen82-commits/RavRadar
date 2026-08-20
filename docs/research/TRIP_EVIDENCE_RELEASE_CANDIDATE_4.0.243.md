# Releasekandidat 4.0.243: komplette ture

Dato: 2026-08-21  
Branch: codex/trip-evidence-contract-4.0.243  
Status: lokal kandidat; ikke produktion

## Leveret

- versioneret v2-kontrakt og maskinlæsbar JSON Schema,
- bagudkompatibel migration til public.observations,
- eksplicit zone/kystdel og søgemetode før turstart,
- uforanderlig prognosereference og kompakt kalibreringssnapshot,
- rigtig start, slut, varighed og midtpunktstid,
- faktisk kystdel, søgegrundighed og fund/ikke-fund ved afslutning,
- tabsikker lokal kø og idempotent observations-outbox,
- særskilt v2-upload uden GPS/rute,
- bro til eksisterende start/stop-ur og beskyttelse mod dobbelt prompt.

## Kontrolleret

- målrettet kontrakttest: grøn,
- eksisterende observations-/databaseprivatlivstest: grøn,
- app.js syntaks: grøn,
- fuld validate:source: grøn,
- release:gate for 4.0.243: grøn,
- isolerede dialoger på 390 x 844: ingen overflow og nul browserfejl,
- integreret Browser-plugin-flow: 210 zoner, start, stop, samme zone/kystdel og nul browserfejl,
- ingen testsvar blev sendt til Supabase,
- ingen land-/vandpunkter blev flyttet.

## Åben releasegate

Supabase-migrationen skal anvendes og verificeres før PR-merge. Efter det kræves fulde gates, PR, exact-commit produktion og fuld 210/673-kontrol. Indtil da er 4.0.242 fortsat produktionssandhed.
