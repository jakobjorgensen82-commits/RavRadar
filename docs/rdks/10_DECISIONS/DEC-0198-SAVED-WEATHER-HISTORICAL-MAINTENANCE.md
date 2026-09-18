# DEC-0198 – gemt vejr fortsætter gennem sikker historisk vedligeholdelse

**Status:** Aktiv
**Dato:** 2026-09-18
**Version:** 4.0.415

## Beslutning

Den providerfri saved-weather-fortsættelse må køre, når den aktive model er
integreret og handlingen er enten almindelig `integrated` eller
`integrated-historical-maintenance`. Den historiske variant betyder her kun,
at den aktive offentlige binding skal føres append-only frem til den aktuelle
kode; den er ikke et modelskift.

Candidate-handlinger, integreret retur og første cutover forbliver afvist.
Public source må fortsat ikke være en reparationskilde, det gemte target skal
være nyere end live, friskt, have en source-head som er forgænger til current
main og bestå den eksakte private-runtime-kontrakt.

Run `35346790218` installerede og læste den korrekte append-only migration
tilbage, men stoppede derefter før private runtime-, artifact- og Pages-write,
fordi den gamle saved-weather-grænse kun accepterede ordet `integrated`.
Migrationplanen accepterer allerede eksakt nul pending migrations som en
sikker genkørsel; næste forsøg genbruger derfor den allerede installerede
binding uden at kræve en ny migration.
