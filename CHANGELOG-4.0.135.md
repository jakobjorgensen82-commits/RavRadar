# RavRadar 4.0.135

Produktionsverificeret i #1976 på commit `47f88a3` med frisk data, fuld Linux-validering, release-gate, Pages-artifact og deploy. Privat pilot #1974 verificerede den reproducerbare ortofotoadgang og artifactet.

## Officiel ortofoto-review
- Genbruger den eksisterende `DATAFORDELER_API_KEY` som den officielle moderniserede API-key til den gratis GeoDanmark Ortofoto forår Web Mercator WMTS.
- Henter kun i det isolerede manuelle geometri-v2-pilotjob.
- Danner tre private zoom-17-overlays ved norddelen, Blåvands Huk og den sydøstlige del.
- Viser fysisk GeoDanmark-kyst, privat 15-meterslinje, land-/vandpunktkandidater og score-neutrale høfter oven på 2025-ortofoto.
- Stopper sikkert ved manglende/afvist adgang og gemmer aldrig key eller credential-bærende request-URL.

Ingen produktionsgeometri, central admin-sandhed, DMI-sampling eller RavScore aktiveres eller ændres. Ortofoto-artifactet er gennemgået og gav no-go ved hukløkken; DMI-gridvalidering må først følge efter rettelse og nyt visuelt go.

## Resultat
- #1974 hentede 108 officielle tiles og genererede tre private overlays; build og Pages var skipped, og artifactsøgning fandt ingen credentialmatch.
- Nord- og sydøststrækningerne passer overordnet med ortofotoet.
- Ved Blåvands Huk følger kilden en indadgående sandtange-/laguneløkke. Ortofotogaten er derfor samlet no-go, indtil løkken er rettet privat og genkontrolleret.
- #1973 stoppede sikkert før release/deploy på et Pillow-importlæk. Importen blev isoleret bag self-testen, hvorefter #1976 bestod hele produktionskæden.
