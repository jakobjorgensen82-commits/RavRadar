# RavRadar 4.0.103

## Sikkerhed
- `_support/` og `RavRadar-support-*.zip` udelukkes eksplicit fra det offentlige GitHub Pages-artifact. Den private GitHub Actions-supportpakke bevares.

## Vandstandskilder
- Automatisk routing bevarer det eksisterende topologiske kandidatvalg, men beregner nu interpolationens vægte efter reel geografisk haversineafstand, samme metode som administratoroverride.
- DMI-prognosepunkter hentes fra den dokumenterede OceanObs-collection `tidewaterstation` (ental). Det fejlagtige plurale endpoint er fjernet.
- Kildediscovery dokumenterer endpoint, resultat, antal og fejl.
- Hver vejrproduktion skriver den beskyttede `data/diagnostics/water-source-audit.json` med alle målestationer og prognosepunkter, deres type, femdøgnshorisont, gyldighed og routingberettigelse.

## Test
- Ny samlet produktionstest kontrollerer Pages-sikkerhed, geografiske vægte, automatisk routing, administratoroverride, forecastStore, aktuel vandstand og zonens time-for-time-serie.
- RDKS og begge håndbogsformater er opdateret.

## Uændret
- Kandidatvalgets kysttopologi, manuel override, DMI STAC/GRIB-data, RavScore, ranglister, femdøgnsvisning, kortfarver og service worker-logik er ikke ændret ud over versionsnummer.
