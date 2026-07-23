# RavRadar 2.6.13 – GIS-baserede kystzoner

- Alle 56 aktive zoner er genopbygget fra en sammenhængende, eksisterende kystlinjedatabase i stedet for korte, beregnede streger.
- Hver zone er et sammenhængende udsnit af den samme kystlinje. Nabozoner fordeles langs linjen og overlapper derfor ikke geometrisk.
- Den synlige linje er forskudt 45 meter mod landsiden ud fra zonens marine datapunkt.
- Linjeender er flade, så nabozoner ikke visuelt overlapper ved grænserne.
- Farverne er fortsat tydelige på landsniveau, men linjerne er gjort mindre dominerende.
- `data/coastline-master.geojson` gemmer masterkysten, og `data/coastline-audit.json` dokumenterer hver zone.
- Ny automatisk validering sikrer, at alle zoner har den nye kystlinjeversion.

Datagrundlag: GSHHS intermediate coastline, bearbejdet lokalt og gemt statisk i projektet.
