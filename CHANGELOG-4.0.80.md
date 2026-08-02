# RavRadar 4.0.80

## Kritisk rettelse af offentlig opstart

- Dagens rangliste og 5-dages prognose renderes nu, før vind- og strømpile opbygges.
- Vind- og strømpile installeres i ledig browser-tid og kan derfor ikke længere blokere de centrale prognosevisninger.
- Leaflet-markører bygges på et afkoblet lag og monteres samlet. Det undgår en dyr DOM-opdatering for hver enkelt pil.
- Den gemte jagtform vælges før første scorecache opbygges, så den første scoring ikke udføres og kasseres igen.
- Fejlen blev identificeret fra sitetestens produktionsmålinger: zonefarver var klar efter ca. 3,7 sekunder, mens ranglisten først blev markeret klar efter ca. 21,1 sekunder. Tidsrummet lå i den synkrone pilinstallation.

## Validering

- JavaScript-syntaks kontrolleret.
- Offentlig runtime, mobil live-cache, bedste-tidspunkt-konsistens og samlet sitetest er kontrolleret.
- Fuld projektvalidering og release gate køres før pakning.
