# DEC-0072 – Candidate G er eneste offentlige scoremodel

**Status:** GODKENDT TIL 4.0.273 – AFVENTER PRODUKTIONSVERIFIKATION

**Dato:** 2026-08-24

**Berører:** offentlig RavScore, lokale datahuller, rangeringer, profilkonfiguration, adminstatus og releasekontrol

**Ændrer ikke:** Candidate G's 20/50/30-formel, vejrfysik, zoner, kystgeometri eller land-/vandpunkter

## Problem

Den hidtidige profilgate kunne skifte hele Danmark tilbage til den gamle 25/40/35-model, hvis blot én nødvendig Candidate G-række manglede. Det gav et sammenhængende, men fagligt misvisende landsbillede: den gamle model havde de samme underliggende datahuller og behandlede dem blot på en anden måde. En lokal mangel kunne derfor ændre scoremotoren for alle zoner.

## Beslutning

1. **Candidate G med 20/50/30 er den eneste offentlige scoremodel.** Den gamle 25/40/35-model er historik og må ikke vælges som offentlig reserve, rollback eller automatisk fallback.
2. Manglende eller usammenhængende Candidate G-evidens lukkes **lokalt** for den konkrete zone, søgemåde og tid. Den berørte score er `null`/utilgængelig og får ikke et opdigtet tal.
3. En lokalt utilgængelig score udelades fra **Bedste områder** og **5-dages RavRadar**. Andre zoner og søgemåder fortsætter uændret på Candidate G.
4. En manglende score må ikke udfyldes fra den gamle model, moderzonen, en nabozone, en anden kystdel eller en anden time.
5. Den centrale profilkonfiguration skal afvise enhver konfiguration, der forsøger at aktivere legacyfallback eller en anden offentlig profil.
6. Offentlig runtime fører en dataminimeret `scoreAvailability`-oversigt med antal aktive og utilgængelige zoner samt forståelige årsager. Den viser ikke rå strømvektorer, koordinater eller private payloads.
7. Adminforsiden viser, om alle zoner har aktive Candidate G-scorer. Hvis ikke, listes de berørte zoner, søgemåder og forklaringer, mens det samtidig fremgår, at resten af landet fortsætter normalt.
8. Produktionshydrering, state-recovery og releasegates forbliver fail-closed. Denne beslutning fjerner kun den fagligt svage modelomskiftning; den lemper ikke krav til ægte data eller tilstandsfortsættelse.

## Erstattet historik

Denne beslutning erstatter alle aktive bestemmelser om offentlig global 25/40/35-rollback i DEC-0058, DEC-0060, DEC-0061, DEC-0062, DEC-0068 og DEC-0071. De dokumenter beskriver fortsat det historiske forløb, men deres rollbackdele er ikke længere gældende. Den gamle motor kan bevares internt til historisk sammenligning, men den er ikke en offentlig driftsvej.

## Kontrol

- Profiltesten kræver Candidate G, lokal fail-closed-politik, `legacyPublicFallbackAllowed=false` og hård afvisning af rollbackforsøg.
- Pipeline- og UI-test kræver, at en utilgængelig lokal række forbliver uden score og ikke låner en parent-/naboscore.
- Nationale tests kræver, at tilgængelige Candidate G-zoner fortsætter, mens kun berørte zoner/søgemåder skjules.
- Adminstatus skal kunne vise både fuld aktivitet og en dataminimeret liste over lokale mangler.
- Geodatadiff skal vise, at `data/kystdata.json` og `data/zones.geojson` kun har versionsfeltet 4.0.272 → 4.0.273.
- Exact-head-kildegate, frisk central produktion, fuld validering, releasegate og målrettet offentlig kontrol skal bestå før status ændres til produktionsverificeret.
