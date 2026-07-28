# RavRadar 4.0.16 – DMI bulk-to-forecast repair

## Kritisk rettelse

Den friske DMI-bulkcache blev tidligere flettet ind i `nextDmiForecastStore`, men zoneopbygningen læste bagefter fra den gamle deployede forecaststore og skrev gamle records tilbage oven på de nye. Det forklarede, at cirka 168 marine bulkzoner kun gav DMI-strøm og vandstand i 8 færdige zoner.

4.0.16 bruger nu den nyflettede store som autoritativ kilde i samme kørsel og forhindrer den gamle cache i at overskrive friske bulkdata.

## Yderligere forbedringer

- Bulk→forecast-statistik tæller faktiske værdier ved aktuelt prognosetidspunkt i stedet for arvede completeness-flag.
- Registrerer `bulkMarineCandidateZones`, `currentZones`, `waterLevelZones`, `conversionLossZones`, `conversionLossPercent` og `conversionHealthy`.
- Health opdeler acquisition- og conversion-status, så en konverteringsfejl ikke fejlagtigt ligner en DMI-downloadfejl.
- Nye records får aktuelt samlingstidspunkt som `generatedAt`; bulkcachens tidspunkt bevares separat som `bulkCacheGeneratedAt`.
- Gamle forecasttimer beskæres før 120-timersgrænsen, så historiske timer ikke fortrænger fremtidige timer.
- En frisk bulkcache genbruges kun, hvis den aktuelle zonefil har samme signatur. Løbende ændringer af hav-/datapunkter udløser derfor ny behandling.
- Ny regressionstest låser den kritiske bulk→forecast-kæde og zone-signaturkontrollen.
