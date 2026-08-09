# RavRadar 4.0.129

## Stabil GeoDanmark-pilotkø

- Adskiller den manuelle geometri-pilots concurrency-gruppe fra RavRadars vejrproduktion.
- Forhindrer 15-minutters rutinekørsler i at erstatte en ventende eller igangværende pilot.
- Bevarer muligheden for, at en nyere eksplicit pilot erstatter en ældre pilot.
- Tilføjer regressionstest af køadskillelsen.
- Produktionsverificeret i #1936 med 21/21 komplette råudtræk, seks paginerede datasæt og separat pilot-/vejrdrift.

## Ikke ændret

- Vejrworkflowets normale concurrency-regel, produktionsdata, aktive zoner og RavScore er uændrede.
