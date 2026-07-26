# RavRadar 3.1.11 – guidet geografisk retningskontrol

## Nyt i administrationen

- Ny fane **Geografisk retningskontrol**.
- Guidet kontrol af, om `onshoreDirectionDeg` peger fra havet ind mod land.
- Kort viser zone, gemt kystlinje, marint datapunkt, strandpunkt og den valgte retning.
- Retningen kan justeres med skyder eller præcist gradtal.
- Godkendelser og noter gemmes lokalt i browseren.
- Zoner kan markeres til senere kontrol.
- Filtrering efter ikke-kontrollerede, mistænkelige og godkendte zoner.
- Download af komplet korrigeret `zones.geojson` og separat kontrolrapport.
- Eksporterede godkendelser dokumenteres med tidspunkt, status og kilde.

## Sikkerhed

Adminværktøjet ændrer ikke projektfiler direkte. Først når den eksporterede `zones.geojson` kopieres til projektets `data`-mappe, bliver rettelserne en del af RavRadar.
