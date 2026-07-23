# RavRadar 2.6.12 – tydelige kystzoner på landsoversigten

- Kystzoner tegnes nu med en lys kontrastkant under scorefarven.
- Linjerne er bevidst kraftigere ved lav zoom, så farverne fortsat kan aflæses på Danmarkskortet.
- Ved indzoomning bliver linjerne gradvist finere og følger zonens kystgeometri mere præcist.
- Valgt zone fremhæves uden at skjule nabozoner.
- Klikfladen skalerer med zoom og er fortsat mobilvenlig.
- Arkitekturen er datadrevet: alle nuværende og kommende zoner får automatisk samme visning.

## Kystdatakilde

RavRadar gemmer hvert zoneudsnit som en separat kystlinje i `data/zones.geojson`.
Kystudsnit kan importeres fra en færdig vektorkystlinje (GeoJSON/ArcGIS/WFS) i stedet
for at blive håndtegnet. OSM-kystlinjen er kompatibel med appens eksisterende OSM-
attribution. Officielle GeoDanmark-linjer kan bruges i samme format, hvor licens og
adgang tillader distribution.
