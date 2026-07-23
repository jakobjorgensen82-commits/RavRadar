# RavRadar 2.6

RavRadar er en mobilvenlig dansk PWA til planlægning af ravjagt.

## Centrale funktioner

- Standardkort og Esri-satellitkort med løbende lag-skift.
- Én farvet strandpin pr. zone; zonepolygoner er skjult og forbeholdt beregninger/geofencing.
- Aktuel RavScore og forklarlige delscorer for jagtbarhed, transport og frigivelse.
- 5-dages farveprognose under hver zone.
- Vandstand time for time, opdelt i fem klikbare ugedage.
- 5-dages oversigt på forsiden over de bedste zoner pr. dag.
- Valgfri Supabase-login, lokal ravtur med GPS kun mens appen er åben og anonym fundregistrering.
- Udviklertilstand: tryk logoet 10 gange, PIN 1931.

## Vejrdata

Den centrale GitHub Action forsøger aktuelle data i denne rækkefølge:

1. DMI Open Data
2. Open-Meteo Marine
3. MET Norway
4. Seneste cache

5-dages timeprognosen hentes fra Open-Meteo og Open-Meteo Marine og gemmes sammen med zonecachen. Den aktuelle vejr-cache deployes direkte til GitHub Pages og committes ikke tilbage til `main`.

## Lokal kontrol

```bash
npm run validate
node --check app.js
node --check scripts/update-weather.mjs
```

## GitHub Pages

Workflowen `.github/workflows/update-and-deploy.yml` validerer projektet, opdaterer vejrcachen og deployer direkte til Pages. Tilføj eventuelt `DMI_API_KEY` som repository secret.
