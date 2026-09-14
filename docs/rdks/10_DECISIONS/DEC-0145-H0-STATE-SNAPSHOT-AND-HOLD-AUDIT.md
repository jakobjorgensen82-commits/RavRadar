# DEC-0145 – H0-state er et uforanderligt snapshot, og auditen følger den virkelige holdreference

**Status:** Aktiv
**Dato:** 2026-09-14
**Besluttet af:** Ejerens online-først-beslutning kombineret med konkret produktionsbevis
**Berører:** Integreret continuation state, Candidate G measured warmup, runtimeaudit, første cutover og append-only databasebinding
**Supplerer:** DEC-0144; dens online-først-retning og forbud mod oneoff før launch består

## Kontekst

4.0.362 bestod exact-head-sourcegate og blev merged gennem PR #299 som main `8f5d818f5e0ee558984e3d75a1ef136f3cd73def`. Handoff `34830877368` gendannede og forseglede de eksisterende cacher uden providerhentning. Cutover `34832259268` byggede hele den private og offentlige runtime for 210 zoner og 673 kystdele, men runtimeauditen stoppede før database og deploy.

Alle fejl samlede sig om de samme otte H0-currentholds: 8 replay, 8 last-mile-metadata, 8 Candidate G-state, 8 Candidate G-orakel og 16 afledte mode-rekonstruktioner. Det var derfor ét lille antal fælles årsager, ikke 48 uafhængige modelproblemer.

## Beslutning

1. Hver times integrerede continuation state er et uforanderligt kausalt snapshot. Mutable lister eller objekter, som kan ændres af senere forecasttimer, må ikke deles med et tidligere snapshot.
2. Candidate G må ved et eksakt H0-state-only hold beholde den virkelige ældre `transportReferenceAt`. Auditen må ikke kræve en opdigtet reference i selve måltimen.
3. En ældre Candidate G-reference accepteres kun, når integreret state og model begge er bundet til samme produktions- og kildetid, transitionen er `NATIVE_CADENCE_HOLD`, det kanoniske regionale kildebevis findes, og alderen er større end nul og højst tre timer.
4. Direkte targetreferencer forbliver uændret gyldige. Manglende bevis, forskellig reference, forkert transition eller mere end tre timers alder forbliver rødt.
5. Runtimeauditen omgås ikke. Den kendte modelstatefejl og den for snævre auditregel rettes, hvorefter den samme runtimeblok skal være grøn før beskyttede writes og deploy.
6. Ingen oneoff eller almindelig vejrproduktion køres før modellen er online. Same-head-handoff må alene genbruge de allerede forseglede cacher.

## Konsekvenser og bevis

- Integreret state kopierer holdinterval-listen ved hver time. Regressionen beviser både fravær af fremtidig mutation og byteidentisk genåbning.
- Candidate G's egen forseglede oracle accepterer det to timer gamle H0-hold. Den opdaterede audit kræver samtidig den integrerede, kanoniske holdautorisation.
- Den syntetiske runtimeaudit består 210/673 og 1.346 mode-rekonstruktioner. Negative fixtures uden bevis og over tre timer forbliver røde.
- Integrated bundle er `327b989b731e6e84bf05bdb6bd54707d47c04d5bdf80038d437332e84a4c8e01`; Candidate G bundle er `1ccbb10ed3e89f9c8336539a2c566d7ab6efd099bf3e9d1598dbb31e84d5c3a1`.
- Migration `20260914020000_h0_state_snapshot_binding.sql` er en ren append-only bindingsfremføring. Migration 1–14 forbliver urørte og kan ikke genkøres som en del af fortsættelsen.

## Næste trin

Én exact-head sourcegate på 4.0.363, byteidentisk merge, kort same-head cache-handoff, cutover fra begyndelsen af den nye head, offentlig gennemgang og derefter kontrolleret normal weather.
