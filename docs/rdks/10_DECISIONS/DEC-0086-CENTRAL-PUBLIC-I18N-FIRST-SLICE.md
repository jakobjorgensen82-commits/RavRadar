# DEC-0086 – én central offentlig DA/DE/EN-kontrakt

**Status:** Godkendt og produktionsverificeret i offentlig 4.0.290
**Dato:** 2026-08-27
**Scorepåvirkning:** Ingen
**Data-/geometripåvirkning:** Ingen ud over den stående rene versionsfeltsynkronisering ved release

## Problem

Den offentlige RavRadar-flade var dansk og bestod af både statiske og dynamiske tekster fordelt over hovedside, kort, prognoser, zonepanel, konto og turflow. Tre kopier af siden eller ordret udskiftning af færdige danske sætninger ville gøre fallback og videre vedligeholdelse usikker.

## Beslutning

1. Den eksisterende offentlige applikation bruger ét centralt fladt tekstkatalog med stabile nøgler og navngivne parametre.
2. Dansk er standard og sikker fallback. Tysk og engelsk vælges øverst gennem flag plus tydelige sprognavne; valget gemmes kun lokalt som `ravradar-language`.
3. Første leverance omfattede hovedside, aktuelle og femdøgnsstatusser, kort-/områdepanel, konto, login, turformularer og den lokale Spørg RavRadar-overflade.
4. Datoer, tal, statusser, fejltekster, tilgængelighedstekster og afledte offentlige scoreforklaringer følger sproget. Stednavne og andre egennavne bevares.
5. Manglende nøgle eller ukendt locale falder tilbage til dansk. Ukendt tekst må ikke blive til en tom flade.
6. Admin-, ekspert-, PIN-, debug- og øvrige interne flader forbliver danske.
7. Ejeren godkendte efterfølgende det brede scope. **Om RavRadar** og alle 12 sektioner i **Grundbog i ravjagt** indgår derfor også i 4.0.290; den oprindelige udsættelse er erstattet.
8. Oversættelsen må ikke ændre RavScore, Candidate G, vejrværdier, sortering, konto-/turdata, privatliv, geometri eller land-/vandpunkter.

## Evidens

- `js/i18n.js` ejer DA/DE/EN-katalog, parametre, localeformatering, lokal lagring og dansk fallback.
- `scripts/test-public-i18n-assistant-4.0.290.mjs` låser standardsprog, husket valg, parametre, fallback, dataminimering og den danske interne flade.
- Lokal browserkontrol har verificeret DA/DE/EN på hovedside, Om-side og Grundbog ved desktop og 390 px, husket valg mellem sider, kortkreditering, konto, QR, syv faglige links, stabile CSS-flag og fast afvisning af en tysk rouladeforespørgsel uden fjernkald.
- De eksisterende 210/673/2.100 offentlige præsentations- og Candidate G-regressioner består uden scoreændring. PR #185, produktion `33107232593`, build `98640417925`, Pages `98643230518` og offentlig DA/DE/EN-browserkontrol er grønne.
