# RavRadar 4.0.138

- Tilføjer en privat weather-shadow-kontrakt for de to DMI-gridvaliderede Blåvand-kystdele.
- Giver hver del stabil serieidentitet, eget samplingpunkt/grid, nødvendige provenancefelter og separat fremtidig historiknøgle.
- Forbyder krydsmerge, spatial interpolation, fallback og genbrug af parent-historik.
- Bevarer den eksisterende Blåvand-zoneserie, historik og RavScore som autoritativ runtime.
- Aktiverer ikke sampling, state, part-score, UI, public projection, admin-write, geometri eller RavScore.

Status ved kandidat: lokal kontrakt-self-test bestået; privat CI-pilot, artifactreview og normal produktionsverifikation afventer.
