# RavRadar 4.0.361 – strøm-audit følger den integrerede produktionsruntime

**Dato:** 2026-09-14
**Status:** Lokal kandidat; exact-head-CI, merge, cachebaseret SHA-handoff, cutover og offentlig verifikation mangler.

## Observeret produktionsbevis

- 4.0.360 bestod exact-head-sourcegate `34795741830` og blev merged gennem PR #297 som main `cbb56fcb00b9ce654b51768b3df23d7add2e8904` med samme filtræ.
- Handoff `34797345624` brugte ingen provider eller oneoff. Det forseglede 79.414/79.414 currentpar over 118 timer, missing 0, target `2026-09-12T08:00:00Z`.
- Cutover `34798027472` brugte handoffet og gennemførte alle fem hovedkontroller og 272/272 underkontroller. Runtime/model, referencezoner, releasegate og vejrdata var grønne. Fuld validering havde præcis én rød underkontrol, nummer 221, og derfor blev intet deployet eller skrevet eksternt.
- Samme produktionsbygning dokumenterede 673/673 scoreklare kystdele: 621 DMI, 44 Copernicus og 8 godkendte regionale DMI-forløb. Den særskilte integrerede runtimekontrol bestod 210/210 zoner, 673/673 dele og 1.346 aktuelle modes.

## Rodårsag

Den rumlige kontrol genbrugte nu produktionsprojektionen, men to resterende dele af dens egen kontrolvej fulgte stadig ikke den færdige integrerede runtime:

1. Fem DMI-dele blev vist korrekt ud fra U/V-værdierne, efter at forecastbuilderen havde afrundet hver komponent til fem decimaler. Kontrollen beregnede derimod vist hastighed og retning fra den tidligere rå højpræcision. De fem lå netop ved en afrundingsgrænse og fik derfor en falsk forskel.
2. Fjorten kystdele stod lovligt i en vektorfri `NATIVE_CADENCE_HOLD` ved den valgte runtime-time. Den integrerede model gemmer dette under `ravScoreModel` med `currentReferenceAt` og current-memoryfelter. Kontrollen ledte kun efter den pensionerede Candidate G-form under `candidateG` og genkendte derfor ikke de gyldige holds.

Det samlede tal 654/673 var altså ikke 19 vejrhuller. Det var fem forkert genberegnede DMI-visninger og fjorten gyldige rotationstilstande, som en gammel auditgren ikke kunne læse.

## Rettelse

1. Audit-adapteren returnerer nu både den produktionsdannede kilde og præcis de femdecimalers U/V-værdier, som den integrerede vejr-/scoreadapter bruger.
2. Den fælles rumlige kontrol reproducerer vist hastighed og retning fra de produktionsdannede værdier. Den rå række skal stadig bestå den eksisterende strenge DMI-identitetskontrol først.
3. En fælles hold-kontrol læser først den aktive integrerede `ravScoreModel`-form og accepterer kun den historiske `candidateG`-form som rollbackkompatibilitet. Scoretime, kildereference, memory-status, højst tre timer og eksakt verificeret historikrække kontrolleres fortsat.
4. Enhver kystdel, som hverken har eksakt strømprojektion eller en gyldig hold, giver nu sin egen forklaring i rapporten i stedet for kun at ende i et samlet antal.
5. Regressioner dækker både en reel femdecimalers retningsgrænse og en integreret hold under `ravScoreModel`.

## Sikkerhedsafgrænsning

- Ingen fejl ignoreres, og ingen tolerance udvides.
- Alle fem hovedkontroller og alle 272 underkontroller forbliver bindende før eksterne writes.
- Integrated-bundlen er fortsat `79d5118a1b37b542532721ebe1b943df00b646e1625b991d5a9ad597d36d0ae8`; Candidate G-rollback er fortsat `84311c920b3f2697f31fe32ebef4d7932f59f5fe784b2b7d1dbf679d9007a28c`.
- Ingen ændring af scoreformel, modelstate, vejrdata, sourceorder, rotation, cache, geometri, land-/vandpunkter, migrationer, database eller privacy.
- Ingen oneoff og ingen almindelig weather før modellen er online og offentligt verificeret.

## Lokal evidens

- `scripts/test-ravscore-production-adapters.mjs`
- `scripts/test-current-operational-live-adapter.mjs`
- Integrated bundle, Candidate G-rollback bundle og alle otte modelbindinger er byteuændrede og grønne.

## Næste

Kør én exact-head GitHub-sourcegate, merge kun den eksakte grønne kode, genskab det korte SHA-bundne handoff fra samme cacher uden provider og kør cutover. Ved grønt gennemløb verificeres den offentlige model og hele siden; derefter genaktiveres almindelig weather kontrolleret for at bevise cachevedligeholdelse og DMI-rotation.
