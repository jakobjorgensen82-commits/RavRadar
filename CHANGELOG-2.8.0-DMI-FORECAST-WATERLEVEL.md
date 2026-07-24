# RavRadar 2.8.0 — DMI Forecast Store og Water Level Engine

## Implementeret

- DMI er fortsat autoritativ førsteprioritet.
- Ny 120-timers (5 døgn) DMI Forecast Store i `data/live/dmi-forecast-cache.json`.
- Routing er nu: DMI live → gyldig DMI-prognosecache → Open-Meteo → MET Norway → seneste almindelige cache.
- Open-Meteo og MET Norway bruges kun, når både DMI live og DMI-prognosecachen er utilgængelige.
- DMI-prognoser indeholder timeværdier for vind, bølger, vandstand, strøm og vandtemperatur, når DMI leverer parameteren.
- Water Level Engine interpolerer aktuelle DMI-vandstandsobservationer fra op til tre nærmeste stationer med invers afstandsvægtning.
- DMI-modelvandstand korrigeres mod den interpolerede observation. Korrektionen videreføres gennem den cachede prognoseserie og gemmes som `waterLevelBiasCm`.
- Hver cachepost indeholder genereringstid, gyldighedsinterval, modelreferencer, stationsgrundlag og 120 timepunkter.
- Weather Health indeholder dækning og resterende horisont for DMI-prognosecachen.

## Test

- Ny test: `scripts/test-dmi-forecast-store.mjs`.
- Tester 120 timers dækning, cacheudløb, tidsopslag, observationstilpasset modelvandstand og stationinterpolation.
- Hele `npm run validate` består.
