# Fuld browserkontrol af zoner og kystdele - 2026-08-20

## Resultat

- 210/210 runtimezoner blev åbnet uden fejl.
- 673/673 kystdele blev optalt uden afvigelser.
- 210/210 aktuelle zonevisninger havde conditions, RavScore, komponentforklaringer, kystforklaring samt vind- og strømpile.
- 0 mismatch i aktuel RavScore, scorelabel, niveau, vindpil, strømpil og kystforklaring.
- 1.050/1.050 prognosedage blev kontrolleret, fem pr. zone.
- 0 mismatch i prognosens valgte RavScore, scorestribe, vindpil, strømpil og forklaring.
- Ingen page errors.

Det fulde maskinlæsbare resultat ligger i `browser-zone-check-final-20260820-0200.json`.

## Rettelser udløst af kontrollen

Den tidligere Spark-kontrol var ikke gyldig som scorebevis. Den havde 0/210 conditions, målte panelet før zonen blev åbnet og rapporterede derfor misvisende 0 mismatch. Auditværktøjet åbner nu zonen før målingen og kræver fuld conditions- og resultatdækning.

Den udvidede kontrol fandt 55 prognosedage, hvor en lokal kystdelsscore var gyldig, men den detaljerede kystforklaring manglede for valget "Lige nu". `js/ui/info-panel.js` viser nu en faktuel fallbackforklaring baseret på den valgte kystdel og dens dækningsresumé, når den detaljerede retningsforklaring ikke findes. RavScore, kilder og model er uændrede.

## Metode og afgrænsning

Browser-pluginet blev forsøgt først, men forbindelsen fejlede i pluginets egen trusted-path-opstart. Den godkendte lokale Chromium/pyppeteer-fallback blev derfor brugt.

Det lokale datasæt `rr-20260815101737-210` var ældre end appens otte-timers friskhedsgrænse. Auditværktøjet ændrede derfor kun `generatedAt` i browserens hukommelse og flettede det matchende `public-condition-details.json` ind. Kildeartefakterne blev ikke ændret. Resultatet beviser UI-sammenhæng på dette datasæt; det er ikke frisk produktions- eller DMI-pipelineevidens.

GeoJSON indeholder 211 parent-features. Den ekstra `DK-B02-14` er en kendt centralt slettet zone og indgår bevidst ikke i de 210 runtimezoner. Der blev ikke flyttet eller ændret land-/vandpunkter.
