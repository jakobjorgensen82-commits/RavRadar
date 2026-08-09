# RavRadar 4.0.135

Kandidat til privat, reproducerbar ortofotokontrol. Produktionsbaseline er fortsat den verificerede 4.0.134, indtil fuld release-gate og produktion er grøn.

## Officiel ortofoto-review
- Genbruger den eksisterende `DATAFORDELER_API_KEY` som den officielle moderniserede API-key til den gratis GeoDanmark Ortofoto forår Web Mercator WMTS.
- Henter kun i det isolerede manuelle geometri-v2-pilotjob.
- Danner tre private zoom-17-overlays ved norddelen, Blåvands Huk og den sydøstlige del.
- Viser fysisk GeoDanmark-kyst, privat 15-meterslinje, land-/vandpunktkandidater og score-neutrale høfter oven på 2025-ortofoto.
- Stopper sikkert ved manglende/afvist adgang og gemmer aldrig key eller credential-bærende request-URL.

Ingen produktionsgeometri, central admin-sandhed, DMI-sampling, RavScore eller Pages-output aktiveres eller ændres. Ortofotogaten kræver stadig CI-artifact og manuelt visuelt go/no-go; DMI-gridvalidering følger derefter.
