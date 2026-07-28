# RavRadar 4.0.17 – Forecast-integritet og station-routing

- Canonical UTC-timer og oprydning af minutforskudte forecastrecords.
- Komponentfiltrering før DMI-interpolation, så null-rækker fra andre collections ikke blokerer strøm/vandstand.
- Kortbaseret administratorvalg af vandstandsmålestationer pr. zone.
- Eksportérbar `data/water-level-station-routing.json` med primær/sekundær station og vægte.
- Vejrpipelinen bruger eksplicit station-routing før automatisk kystinterpolation og falder sikkert tilbage.
- DMI-stationsinventar gemmes i `data/live/dmi-water-stations.json` til admin-kortet.
- Falsk observationsadvarsel ved planlagt skip er rettet.
- Nye regressionsprøver for forecastintegritet og station-routing.
