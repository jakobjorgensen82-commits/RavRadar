# DEC-0146 – H0-auditen skal bruge producentens virkelige currentkildetid

**Status:** Aktiv
**Dato:** 2026-09-14
**Besluttet af:** Ejerens online-først-beslutning kombineret med konkret cutoverbevis
**Berører:** Integreret runtimeaudit og direkte H0-regression
**Supplerer:** DEC-0145 og DEC-0144; online-først og forbuddet mod oneoff før launch består

## Kontekst

4.0.363 bestod exact-head-sourcegate `34838663036`, blev merged gennem PR #300 som main `b4024371f86022f6071ea8383ba32c460a0135c5`, og providerfrit handoff `34840938570` blev grønt. Cutover `34842010506` byggede 210 zoner, 673 kystdele og 1.346 modes, men stoppede før database og deploy.

4.0.363 fjernede 32 af de 48 tidligere fejl. State-replay og Candidate G var nu grønne. De samme otte H0-holds gav alene 8 `PART_LAST_MILE_STATE_METADATA_MISMATCH` og 16 `MODE_RECONSTRUCTION_MISMATCH`.

Producenten brugte og gemte korrekt den virkelige ældre currentkildetid i `currentReferenceAt`. Audittens egen rekonstruktion sendte holdmarkør og intervalender videre, men udelod kildetiden. Senere null-svar kom derfor fejlagtigt til at overskygge den virkelige måling. Last-mile-koden var en bred catch-kategori; den beskrev ikke den faktiske årsag.

## Beslutning

1. Ved en allerede verificeret `NATIVE_CADENCE_HOLD` skal runtimeauditen sende continuation states `currentReferenceAt` videre som `nativeHoldReferenceTime` til den samme score-bound-builder, som producenten bruger.
2. Ved alle andre transitions sendes ingen særreference. Manglende, ukendt eller inkonsistent holdbevis forbliver rødt.
3. Audittens rekonstruktion skal kunne testes direkte. Regressionen skal bygge en virkelig H0-holdtilstand og kræve identisk resultat med producentens gemte mode for både vaders- og strandsøgning.
4. Den misvisende catch-kode må ikke bruges som grund til at ændre last-mile-state, scoremodel eller vejrdata. Den fælles manglende auditparameter rettes ved kilden.
5. Integrated bundle, Candidate G bundle, continuation-hash og migration 15 forbliver uændrede; 4.0.364 kræver ingen ny migration.
6. Ingen oneoff eller almindelig weather køres før modellen er online. Efter én exact-head sourcegate, merge og et kort providerfrit same-head-handoff køres cutover igen.

## Konsekvenser og bevis

- Den direkte H0-regression er grøn for begge modes.
- Integrated bundle er fortsat `327b989b731e6e84bf05bdb6bd54707d47c04d5bdf80038d437332e84a4c8e01`; Candidate G bundle er fortsat `1ccbb10ed3e89f9c8336539a2c566d7ab6efd099bf3e9d1598dbb31e84d5c3a1`.
- Scorematematik, modelstate, vejr, cache, rotation, geometri, database og privacy ændres ikke.
- Ukendte eller materielle runtimefejl stopper fortsat før eksterne writes. Ærligt `UNAVAILABLE` er fortsat tilladt online efter DEC-0144.

## Næste trin

Én exact-head sourcegate på 4.0.364, byteidentisk merge, kort same-head cache-handoff, cutover, offentlig gennemgang og derefter kontrolleret normal weather.
