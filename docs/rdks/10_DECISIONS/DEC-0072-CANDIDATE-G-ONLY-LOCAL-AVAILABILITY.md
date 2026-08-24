# DEC-0072 – Candidate G er eneste offentlige scoremodel

**Status:** GODKENDT OG PRODUKTIONSVERIFICERET I 4.0.275

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

## Implementeringsfund efter første merge

PR #134 bestod exact-head-kildegaten `32772324736` og blev merged som `10fd989682f8658e603194e11363d861c489a166`. Den efterfølgende produktion `32772470050` stoppede før vejrbyg og deploy. Årsagen var ikke Candidate G-beregningen: central adminhydrering overskrev det nye lokale profildokument med et historisk centralt dokument, der tillod legacyfallback og rollback. Kildegaten opfangede uoverensstemmelsen. 4.0.273 nåede derfor ikke den offentlige side.

Følgende er herefter en bindende del af beslutningen:

1. En fuldt gyldig lokal Candidate G-only-kontrakt må ikke overskrives af en central legacykonfiguration, selv om legacydokumentet har samme eller et højere versionsnummer.
2. En central konfiguration kan kun være autoritativ over den lokale, når den selv opfylder hele Candidate G-only-kontrakten og ikke er ældre.
3. Beskyttet central persistence skal validere kontrakten både før skrivning og efter readback.
4. Forsiden, informationspanelet og Rav-assistenten må ikke importere eller kalde den gamle offentlige scoremotor. De skal bruge lokal Candidate G og vise utilgængelighed ved manglende evidens.
5. Releasegaten skal afvise central legacykonfiguration, manglende lokal fail-closed-politik og offentlige legacyberegningsveje.

## Erstattet historik

Denne beslutning erstatter alle aktive bestemmelser om offentlig global 25/40/35-rollback i DEC-0058, DEC-0060, DEC-0061, DEC-0062, DEC-0068 og DEC-0071. De dokumenter beskriver fortsat det historiske forløb, men deres rollbackdele er ikke længere gældende. Den gamle motor kan bevares internt til historisk sammenligning, men den er ikke en offentlig driftsvej.

## Kontrol

- Profiltesten kræver Candidate G, lokal fail-closed-politik, `legacyPublicFallbackAllowed=false` og hård afvisning af rollbackforsøg.
- Pipeline- og UI-test kræver, at en utilgængelig lokal række forbliver uden score og ikke låner en parent-/naboscore.
- Nationale tests kræver, at tilgængelige Candidate G-zoner fortsætter, mens kun berørte zoner/søgemåder skjules.
- Adminstatus skal kunne vise både fuld aktivitet og en dataminimeret liste over lokale mangler.
- Geodatadiff skal vise, at `data/kystdata.json` og `data/zones.geojson` kun har versionsfeltet 4.0.273 → 4.0.274.
- Exact-head-kildegate, frisk central produktion, fuld validering, releasegate og målrettet offentlig kontrol skal bestå før status ændres til produktionsverificeret.
