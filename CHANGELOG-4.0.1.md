# RavRadar 4.0.1 – inkrementel DMI-bulk og kontrolleret timeout

## Rettelser

- DMI-bulk gemmer nu et atomisk checkpoint efter hvert færdigbehandlet forecast-step.
- Python kører ubufferet og logger løbende collection, forecast-step, genbrug/download og resterende arbejdstid.
- Tidsbudgettet kontrolleres både mellem GRIB-meddelelser og under zoneudtrækningen.
- Der reserveres afslutningstid, så GitHub ikke dræber processen før cache og outputs er skrevet.
- Færdigbehandlede forecast-steps registreres med `processedValidTimes` og springes over ved næste kørsel af samme modelrun.
- Gridets nærmeste indeks beregnes én gang pr. zone/grid og genbruges på tværs af parametre og tidstrin.
- Delvis fremgang bevares og rapporteres som `partial` i stedet for `unknown`.
- Diagnostikken indeholder nu antal GRIB-meddelelser, zoneopslag og tidligere færdigbehandlede steps, som blev sprunget over.
- Bulk-trinnets arbejdsbudget er tilpasset 10-minutters driften: seks minutters tungt arbejde plus to minutters sikker afslutning inden workflow-timeout.

## Forventet drift

Første kørsel på en ny modelrun kan kun nå en del af forecast-trinene. Efterfølgende kørsler fortsætter fra checkpointet i stedet for at begynde forfra. Dermed vokser DMI-dækningen gradvist uden at skabe en permanent workflow-kø.
