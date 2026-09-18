# DEC-0196 – recovery validerer den aktuelle auditprofil

**Status:** Aktiv
**Dato:** 2026-09-18
**Version:** 4.0.413

## Beslutning

Den eksakte recovery skal acceptere både den historiske auditform uden
`profile` og den nyere produktionsform med `profile`. Hvis blokken findes,
valideres dens eksakte struktur, boolske readinessfelter, sikre unikke
advisories, deklareret/forventet lighed, migration readiness og sammenhængen
med historiens antal utilgængelige current-scorer.

Den allerede fastlåste fuldrapporthash og alle artifact-, Pages-, binding-,
deployment- og CAS-grænser består. Run `35342779550` nåede ikke databasekaldet,
så genkørslen starter fortsat fra central version 23 og er idempotent ved en
eventuel allerede præcis version 24.
