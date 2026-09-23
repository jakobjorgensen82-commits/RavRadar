# DEC-0243 – manglende målinger må gemmes ærligt; vejrkæden bevises samlet

**Dato:** 2026-09-23
**Status:** Implementeret lokalt i 4.0.472; produktionsbevis afventer

## Målt hændelse

4.0.471 blev merged som `9927d09c`. Providerfri levering `35855497915`
anvendte og læste migration `20260923110000` tilbage, genbrugte den
nyeste private vejrpakke og byggede checkpoint for 673 kystdele. Den
beskyttede database afviste stadig checkpointet med den sikre kode
`HTTP_400_22023_INPUT_INVALID`; der kom ikke et nyt Pages-deploy.
DEC-0242's rettelse var dermed nødvendig, men ikke tilstrækkelig.

Sammenligning af scoreproducent, lokal checkpointkontrol og SQL viser to
yderligere modstridende regler. En integreret tilstand uden måling eller
uden måling på sidste time kan være lovlig, ærligt utilgængelig historik.
SQL krævede ubetinget mindst én række og en række på sidste time. Den
private, inaktive Candidate G-fortsættelse kan tilsvarende gemme
`LATEST_SAMPLE_MISSING`, mens SQL ubetinget krævede dens sidste række
på referencetimen. Ingen af disse tilstande er bevis for en score.

## Beslutning

- Ret kun de afgrænsede ikke-READY-tilstande i append-only migration
  `20260923120000`; tidligere anvendt SQL er urørt. Schema, sikkerheds-
  installer, migrationsliste, kode-only-plan og releasebinding spejles.
- Bevar strenge krav om gyldig, ordnet, tidsafgrænset evidens, eksakt
  sidste time og fuld 48-timershistorik for enhver READY-tilstand.
  Manglende data må aldrig blive til opdigtede eller godkendte data.
- Ved endnu en `INPUT_INVALID` rapporteres kun summerede statusantal,
  tomme/for tidlige sidste målinger og antal dele. Ingen ID, tider,
  vektorer, målinger, payload eller credentials logges.
- Lever først den gemte aktuelle vejrpakke providerfrit. Derefter én
  normal vejrkørsel med kilde- og komponentopdelt før/efter: DMI,
  Copernicus, Open-Meteo, havstrøm, lokal vind, bølger, vandstand og
  temperatur samt cache/historik/Pages. Grøn workflowstatus er ikke
  bevis for fulde data eller ønsket DMI-first-fordeling.

Sidste normalrun `35823773587` havde 25.793 direkte DMI-, 424 regional
DMI-, 0 Copernicus-, 47.996 Open-Meteo- og 5.201 manglende
havstrømspar af 79.414. Disse tal må ikke kaldes alle vejrtyper. Cron
forbliver pauset, indtil flere almindelige kørsler faktisk beviser
stabil, selvstændig vedligeholdelse af den seneste korrekte cache.
