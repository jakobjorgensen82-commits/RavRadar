# RavRadar 4.0.19 – DMI-integritet, vandstand og sikker cache

## Vandstand
- DMI er autoritativ vandstandskilde.
- Korte interne DMI-huller interpoleres mellem DMI-timer.
- Open-Meteo bruges kun som sammenhængende blok ved reelle længere DMI-huller.
- Fallbackblokke bias-korrigeres mod DMI ved overgangene.
- Vandstandstrend beregnes efter kontinuitetsreparation.
- Diagnostik gemmer kildeskift, største timehop, interpolationer og fallbackjusteringer.

## Prognosehorisont
- 118 timer er nu den accepterede fulde brugerhorisont.
- Diagnostik måler faktisk tilgængelige timer i stedet for at kræve præcis 120.
- Bulkjobbet sigter efter 118 timer for at undgå unødvendig fallback og cache.

## DMI-stationer
- Stationsregisterkaldet bruger et separat metadataflow og forbruger ikke ForecastEDR-requestbudgettet.
- Deployment stopper, hvis den genererede stationsfil mangler eller ikke indeholder gyldige stationer.

## Cache
- GitHub-cache bruger ugentlig generation i stedet for unik cache pr. workflow-run.
- Rå GRIB-cache har en konfigurerbar grænse på 1.400 MB.
- Genbrugte filer markeres som nyligt brugte, før LRU-pruning.
- Cacheinventar og oprydning skrives til `data/diagnostics/dmi-cache-audit.json`.
- Den afledte DMI forecastcache og live-data slettes ikke af råcache-pruning.

## Health
- DMI-fejlperiode knyttes nu til reel DMI-acquisitionfejl og ikke til samlet brugercoverage.
