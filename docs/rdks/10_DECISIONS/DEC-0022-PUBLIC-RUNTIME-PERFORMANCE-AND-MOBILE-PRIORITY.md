# DEC-0022 – Slank offentlig runtime, sikker live-cache og kortet som mobil prioritet

**Status:** Aktiv og implementeret fra 4.0.74  
**Dato:** 2. august 2026

## Beslutning
Den offentlige side må ikke hente den fulde tekniske `conditions.json`. Vejrpipelinen skal samtidig generere en kompakt `public-conditions.json`, der bevarer alle brugerrettede vejrdata og giver identiske RavScore-resultater. Den fulde fil bevares til admin, audit og diagnostik.

Live-data må ikke lagres som et ubegrænset antal service-worker-poster med tilfældige query-parametre. Livefiler hentes netværksfriskt og dataset-id kontrolleres atomisk. Gamle app-caches ryddes ved aktivering.

På mobil er kortet den primære funktion. Konto vises som personikon, GPS-knappen fjernes, og browserens GPS-tilladelse udløses først ved `Start ravtur`. `Start ravtur` og `Spørg RavRadar` placeres ved siden af hinanden. Jagtformsvælgeren komprimeres, og farveforklaringen placeres under kortet. Zoom- og lagkontroller ændres ikke, og bedste zoner markeres ikke særskilt på kortet.

## Ikke-forhandlingsbart
- Ingen score, prognosetime, pil, zone, rangliste eller assistentfunktion må gå tabt.
- Den offentlige projektion skal regressionstestes mod den fulde fil.
- En hurtig tom skal tæller ikke som brugbar side; zonefarver og zoneklik skal virke.
- Performanceændringer skal dokumenteres i håndbog og release-noter.
