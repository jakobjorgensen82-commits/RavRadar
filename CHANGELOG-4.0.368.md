# RavRadar 4.0.368 – bevar boolske false-værdier i code-only-fortsættelsen

**Dato:** 2026-09-15
**Status:** Lokal releasekandidat; exact-head PR-gate, merge og code-only-fortsættelse mangler.

## Produktionsresultat før rettelsen

PR #309 bestod sourcegate `34914010157` og blev merged som main `d25dfe8e`.
Code-only-run `34914399119` gennemførte derefter den fastlåste recovery:
Supabase er nu `INTEGRATED_ACTIVE` central version 1 med den historiske
integrerede binding. Ingen vejrprovider, migration eller nyt Pages-artifact
kørte efter recoveryen.

## Fejl og rettelse

Read-trinnet omsatte feltnavne til workflowoutputs med jq-udtrykket
`.[$field] // ""`. I jq vælger `//` også højre side ved boolsk `false`.
De tre korrekte værdier `bindingCurrent=false`,
`initialCutoverRequired=false` og `legacySourceRequired=false` blev derfor
tomme, og klassifikationen stoppede.

4.0.368 bruger `if has($field) then .[$field] else "" end`. Dermed skelnes
der mellem et manglende felt og et eksisterende `false`-felt. En søgning viste
ingen andre forekomster af det fejlbehæftede mønster i workflows eller scripts,
og code-only-kontrakten afviser nu en tilbagevenden.

## Næste kørsel

Den centrale recovery må ikke gentages. Næste providerfri code-only-run læser
version 1, springer recoveryen over og fortsætter direkte som
`integrated-historical-maintenance` til migration 16, privat runtime, Pages og
central/offentlig 4.0.368-verifikation.
