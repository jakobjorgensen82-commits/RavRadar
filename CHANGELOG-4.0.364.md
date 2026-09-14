# RavRadar 4.0.364 – H0-auditen bruger den virkelige kildetid

**Dato:** 2026-09-14
**Status:** Lokal releasekandidat; exact-head-CI, merge, same-head-handoff, cutover og offentlig verifikation mangler.

## Faktisk produktionsbevis

- 4.0.363 bestod exact-head-sourcegate `34838663036`, blev merged gennem PR #300 som main `b4024371f86022f6071ea8383ba32c460a0135c5`, og handoff `34840938570` blev grønt uden providerhentning.
- Cutover `34842010506` gendannede de forseglede cacher og byggede vejr, provenance og public runtime for 210 zoner, 673 kystdele og 1.346 aktuelle modes. Den ændrede ikke database eller offentlig side.
- 4.0.363 fjernede 32 af de 48 tidligere fejl: state-replay og begge Candidate G-kontroller var grønne. De samme otte H0-holds gav fortsat 8 last-mile-metadatafejl og 16 afledte mode-rekonstruktionsfejl.

## Rodårsag og rettelse

- Producenten gemte korrekt den virkelige ældre currentkildetid i `currentReferenceAt`. Runtimeauditen sendte ved rekonstruktion kun holdmarkøren og intervalenderne videre, men ikke denne kildetid.
- Senere eksplicitte null-svar blev derfor fejlagtigt opfattet som nyere end den virkelige måling. Auditen rekonstruerede current som utilgængelig og rapporterede først en misvisende last-mile-fejl og derefter to modefejl pr. del.
- Auditen sender nu `currentReferenceAt` videre som `nativeHoldReferenceTime`, men kun ved den allerede verificerede transition `NATIVE_CADENCE_HOLD`.
- En direkte regression bygger en rigtig syntetisk H0-holdtilstand og kræver, at auditens rekonstruktion er byteidentisk med producentens gemte resultat for både vaders- og strandsøgning.

## Uændret model og launch

- Integrated bundle `327b989b731e6e84bf05bdb6bd54707d47c04d5bdf80038d437332e84a4c8e01`, Candidate G bundle `1ccbb10ed3e89f9c8336539a2c566d7ab6efd099bf3e9d1598dbb31e84d5c3a1` og migration 15 er uændrede. Der kræves ingen ny databasebinding.
- Scorematematik, modelstate, vejrværdier, rotation, cache, geometri og privacy er uændrede. Kun auditens rekonstruktion og dens direkte regression ændres.
- Ingen oneoff eller almindelig weather køres før modellen er online. Næste trin er én exact-head sourcegate, merge, kort same-head-handoff, cutover og offentlig kontrol.

Se DEC-0146.
