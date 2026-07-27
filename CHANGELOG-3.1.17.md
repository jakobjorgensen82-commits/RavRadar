# RavRadar 3.1.17 – DMI bulk modeldownloads

## Ny primær forecastindsamling

RavRadar forsøger nu før den eksisterende EDR-kø at hente hele DMI-modeltrin gennem Forecast Data STAC-API'et og læse GRIB-filer lokalt.

- DKSS bruges til vandstand, strømkomponenter og vandtemperatur.
- HARMONIE DINI bruges til 10 meter vind.
- WAM bruges til bølgehøjde, bølgeretning og bølgeperiode.
- Alle RavRadar-zoner udtrækkes fra de samme downloadede modeltrin.
- Der anvendes nærmeste gyldige originale modelgridpunkt. Der foretages ingen rumlig interpolation og ingen beregning ud fra et reduceret sæt punkter.

## Robust fallback

- Eksisterende DMI-cache bevares og sammenflettes komponentvis.
- EDR-køen reparerer fortsat manglende zoner eller komponenter.
- Open-Meteo forbliver fallback, indtil den tilsvarende DMI-komponent findes.
- Fejl, ukendte GRIB-parametre, downloadbudget eller timeout må ikke forhindre deployment.

## Drift og diagnostik

- Ny fil: `scripts/update-dmi-bulk.py`.
- Ny cache: `data/live/dmi-bulk-cache.json`.
- Rå GRIB-filer caches mellem GitHub Actions-kørsler i `.cache/dmi-grib`.
- Diagnostikken viser modelruns, behandlede assets, downloadmængde, fundne parametre og antal udfyldte zoner.
- Weather engine: 2.13.0.
