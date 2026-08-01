# RavRadar 4.0.65

## Hydreret vejrdata respekterer slettede zoner

- Den deployede `conditions.json` renses nu mod det aktuelle aktive zoneregister, før den får lov at erstatte den lokale fil.
- Pensionerede eller ukendte zone-id'er, herunder `DK-B04-09`, fjernes ved hydrering.
- Rensningen logges i dokumentets `hydrationSanitization`-metadata og i hydratorens resultatrapport.
- En ny regressionstest sikrer, at en gammel deployet cache ikke kan genoprette en slettet zone og blokere GitHub Actions.
- Ekspertreview og Rømø-korrektionen fra 4.0.64 er uændret bevaret.
