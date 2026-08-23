# DEC-0062: Candidate G's aktiveringsgate følger den aktuelle fælles zonereference

**Status:** IMPLEMENTERET; målrettede tests og samlet lokal source-/RDKS-/releasegate er grønne; exact-head, frisk produktion, aktiv shadow og browserkontrol afventer

**Dato:** 2026-08-23

**Scorepåvirkning:** Ja. Rettelsen genaktiverer den allerede ejerbesluttede Candidate G-profil, når den faktisk viste aktuelle referencetime har en sammenhængende opvarmning. Selve scorefysikken ændres ikke.

## Produktionsevidens fra 4.0.262

PR #100 bestod exact-head `32642456123`, blev merged som `586fbd184f68c6445acfb38a39814f6348f14bd0`, og fuld produktion `32642532892` bestod central hydrering, frisk vejr/state, samlet `validate`, releasegate, Supabase og Pages. Live `rr-20260823134605-210` viste, at DEC-0061's cadence-rettelse virker: 673/673 states blev accepteret uden nulstilling, replaymismatch var 0, og transportpotentialet fordelte sig på 110 positive og 563 fysisk fortsat nul.

Den offentlige profil faldt alligevel tilbage til legacy. Alle 673 faktisk valgte aktuelle kystdelsreferencer var lovlig `WINDOW_INCOMPLETE` med et til to sammenhængende beviser, men `candidateWarmupEligible` var falsk. Rodårsagen var, at gaten krævede `WINDOW_INCOMPLETE` eller `READY` i samtlige fremtidige femdøgnsrækker. Et senere prognosehul blev dermed fejlagtigt fortolket som et hul i den aktuelle opvarmning.

## Beslutning

1. Komplet Candidate G-scorecoverage kræves fortsat for alle publicerede tider, kystdele og begge jagtformer. En manglende kandidatscore giver fortsat global rollback.
2. `candidateMemoryReady` og `candidateWarmupEligible` bedømmes ved den scoretid, der ligger nærmest produktionsreferencen og er fælles for alle kystdele i den enkelte zone. Det er samme tidsbetydning som den aktuelle lokale sammenligning og den publicerede kompakte fortsættelsestilstand.
3. Ved denne aktuelle fælles reference er kun `READY` eller ejerens pre-public `WINDOW_INCOMPLETE` tilladt. `LATEST_SAMPLE_MISSING`, `WINDOW_HAS_MISSING_EVIDENCE` og `WINDOW_HAS_TIME_GAP` udløser fortsat global legacyrollback.
4. Et senere hul i femdøgnsprognosen må ikke retroaktivt slå en sund aktuel reference fra. Den fremtidige state forbliver fail-closed: missing opfindes ikke som neutral strøm, det kontinuerte suffix brydes, og replayet starter fra den faste rand 0 efter hullet.
5. Runtime mærker kontrakten `CURRENT_COMMON_ZONE_REFERENCE`, og den aktive 210/673-shadow kræver dette felt samt eksakt state-replay.

## Regressionstest

- To kystdele med fælles aktuel `WINDOW_INCOMPLETE` og senere forskellige gapstatusser skal være warmup-berettigede.
- Et gap ved den fælles aktuelle reference skal fortsat blokere.
- En fælles aktuel `READY`-reference skal give `candidateMemoryReady=true`, selv om senere prognoser ikke ændrer den aktuelle modenhed.
- Manglende fælles reference, manglende del eller ugyldig tid fejler lukket.

## Uændrede grænser

- Candidate G er fortsat `20/50/30`; legacy `25/40/35` er eksakt global rollback.
- Tre-timers native cadence, faktisk tidsintegration, 48-timers rand, 0,03→0,15 m/s, +10/-8, 13 timers udtransport, mobilisering 4/48 og wadersregler er uændrede.
- Ingen geometri, land-/vandpunkter, bund-/dybdemodel, private caches, artifact eller protected-dirty-data ændres. Geodatafiler må kun få versionsfeltet 4.0.263.
