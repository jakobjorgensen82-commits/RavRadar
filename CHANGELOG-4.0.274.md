# RavRadar 4.0.274

## Holdbar Candidate G-only-kontrakt

- Candidate G 20/50/30 er den eneste offentlige scoremodel.
- Central adminhydrering kan ikke genindføre en historisk 25/40/35-profil, rollback eller legacyfallback, heller ikke via et højere versionsnummer.
- Den centrale profil valideres før persistence og efter readback.
- Forsiden, detaljepanelet og Rav-assistenten bruger kun lokal Candidate G. Manglende evidens vises som utilgængelighed og udelades fra rangeringer.
- Adminforsiden viser, om alle zoner er aktive, og ellers hvilke zone-/søgemådepar der mangler score samt hvorfor.
- Releasegaten afviser central legacykonfiguration og offentlige legacyberegningsveje.

## Produktionsforløb

PR #134 bestod exact-head-kildegaten og blev merged, men den første 4.0.273-produktion stoppede sikkert før vejrbyg og deploy, da central legacykonfiguration forsøgte at overskrive den nye kontrakt. 4.0.274 retter denne migrationsgrænse. 4.0.273 nåede ikke den offentlige side.

## Uændret

Candidate G's fysiske regler, vejrfysik, zoner, kystgeometri og land-/vandpunkter er uændrede. `data/kystdata.json` og `data/zones.geojson` ændrer kun versionsfelt fra 4.0.273 til 4.0.274.
