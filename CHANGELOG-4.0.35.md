# RavRadar 4.0.35 – entydigt zonesystem

- Fjernet de 21 brede første-generationszoner fra `data/zones.geojson`.
- Arkiveret deres fulde geometri i `docs/archive/legacy-zones-v2.2.geojson`.
- Prunet dem fra medfølgende conditions- og forecastcache.
- Ændret app, admin, audits og pipelines til kun at acceptere `zoneStatus: active`.
- Tilføjet regressionstest: det officielle register skal indeholde præcis 210 aktive zoner.
- Dokumenteret Git-historisk bevis og afhængighedsaudit i `ANALYSIS-4.0.35.md`.
