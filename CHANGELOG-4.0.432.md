# RavRadar 4.0.432 – komplet kompatibilitetslukning for forgænger-restore

Dato: 2026-09-19

## Hvad produktionskørslen beviste

- 4.0.431 bestod exact-head-kildegaten `35448032367`, PR #376 og blev
  merged som `686ebec4`.
- Den providerfri code-only-kørsel `35448284914` afsluttede den tidligere
  PENDING-overgang: den centrale status er nu `INTEGRATED_ACTIVE` version 31,
  og profilversionen er 73.
- Migration `20260919020000` blev anvendt og læst tilbage. Der blev hverken
  startet DMI, Copernicus eller Open-Meteo eller lavet et nyt Pages-deploy.

## Fejlen efter den centrale afslutning

Kørslen fandt korrekt, at de gemte private generationer tilhører
forgængerens modelbinding. Den pakkede derfor den eksakte historiske kilde ud,
men kopierede kun den nye restore-wrapper ind i den. Wrapperen importerede to
nyere modeluafhængige hjælpefiler, som ikke fandtes i forgængerkilden. Først
manglede komponentinventaret; derefter ville Supabase-transporthelperens nye
eksport have manglet. Stoppet skete før anonym-læseaudit, artifact og deploy.
Det er derfor ikke bevis for et offentligt privatdatabrud.

## Samlet rettelse

- Den historiske forventning forsegles fortsat mod den urørte forgængerkilde.
- Derefter installeres præcis restore-wrapperen, Supabase-transporthelperen og
  komponentinventaret som én kompatibilitetslukning.
- Forgængerens modelkontrakt og private bundleverifier overskrives ikke.
- Hele wrapperen importeres før Storage- og privacyarbejde. Kildetesten
  klassificerer alle relative imports og stopper, hvis en kopieret hjælpefil
  senere får en ukendt lokal underafhængighed.
- Den eksakte forgængercommit `4bee5b0d` er pakket ud lokalt, har fået de tre
  filer og kan importere restore-wrapperen uden fejl.

Rettelsen ændrer ingen scoreformel, vejrdata, kildeprioritet, gyldighed,
geometri eller land-/vandpunkter. Almindelige vejrkørsler skal fortsat bevise
hele 4.0.430-matricen i virkelig drift, før den kaldes komplet og stabil.
