# RavRadar 3.1.16

## To-faset DMI-opbygning

- Fase 1 henter kun DMI-havdata: vandstand, strøm og vandtemperatur.
- Fase 2 starter først, når alle aktive zoner har gyldig marin DMI-cache, og beriger derefter zonerne med DMI-vind og DMI-bølger.
- Open-Meteo udfylder manglende vind-, bølge- og havfelter, indtil de tilsvarende DMI-data er tilgængelige.
- DMI-værdier overskriver Open-Meteo komponent for komponent.

## Stabilitet

- DMI-køen kører sekventielt.
- Cursoren flyttes kun efter en succesfuldt gemt DMI-record.
- Første HTTP 429 stopper resten af DMI-køen i samme kørsel.
- Standardbudget: 4 zoner, 6 DMI-kald og 12 sekunders afstand mellem kald.
- DMI-observationer forsøges højst én gang i timen.
- Lokal/Actions-cache sammenflettes med den senest deployede DMI-cache, når den kan hentes.

## Diagnostik

- Viser aktiv DMI-fase, marin cache-status, fallbackpolitik, observationsinterval og sekventiel fremdrift.
