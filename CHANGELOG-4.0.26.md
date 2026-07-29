# RavRadar 4.0.26 — DMI recovery og synkron diagnostik

## Rettet
- HARMONIE-atmosfære bruger nu ét direkte ecCodes nearest-opslag pr. zone/grid i stedet for den dyre marine probe-søgning.
- Den udvidede 16-kandidat-søgning bevares kun for marine grids.
- DMI-vind og DMI-marine repareres uafhængigt; manglende marine i én zone blokerer ikke længere vindberigelse.
- Atmosfæremangler prioriteres i live-EDR-reparationskøen.
- ForecastEDR HTTP 429 blokerer ikke længere OceanObs-vandstand.
- Alle `data/live/`- og `data/diagnostics/`-filer hentes network-first af service workeren.
- Runtime-diagnostik skrives til sidst sammen med conditions og weather-health.
- Runtime-diagnostik indeholder aktuel appversion, generatedAt, healthGeneratedAt og pipelineRunId.
- Den endelige retry-status er nu med i runtime-filen.

## Formål
Rettelserne adresserer den observerede 14-minutters fastlåsning i første HARMONIE forecast-step, tab af DMI-vinddækning og download af en gammel runtime-diagnostik fra browsercachen.
