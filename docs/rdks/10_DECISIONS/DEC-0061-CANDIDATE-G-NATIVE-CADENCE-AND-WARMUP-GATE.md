# DEC-0061: Candidate G følger native tre-timers strømbevis og afviser ægte warmup-gab

**Status:** CADENCE PRODUKTIONSVERIFICERET; warmup-gatens referencescope er efterfølgende rettet i DEC-0062

**Dato:** 2026-08-23

**Scorepåvirkning:** Ja. Rettelsen gør den allerede ejeraktiverede Candidate G-transport beregnelig under den faktiske produktionscadence. Vægtene `20/50/30` og de faglige +10/-8-/13-timersregler ændres ikke.

## Problem og reproduceret årsag

Den aktive 4.0.261-runtime `rr-20260823121818-210` havde transportpotentiale og transportkomponent 0 i alle 673 kystdele. 658 states havde to gyldige, dataminimerede strømbeviser med præcis tre timers afstand; 15 havde ét. DEC-0059-implementeringen tillod kun én time mellem beviser. Derfor blev det kontinuerte suffix reduceret til den seneste prøve, som har nul forløbstid og ikke kan bygge transport.

Fejlen er et mismatch mellem stategaten og produktionskædens dokumenterede native marine stride på tre timer. Den er ikke en normal startværdi, og den forsvinder ikke ved blot at vente.

## Valgte og afviste rettelser

1. Candidate G accepterer nu højst tre timer mellem to verificerede, kystrelative transportbeviser. Replayet bruger fortsat den faktiske tidsafstand, så fuld styrke over tre dokumenterede timer tæller som tre effektive timer.
2. Der opfindes ikke mellemliggende timeprøver, og rå U/V, retning, fart eller koordinater rekonstrueres ikke. En kunstig timeinterpolation blev afvist, fordi fallbackkilder kan have native tre-timers trin, og en skjult interpolation ville ændre evidensbetydningen.
3. Gabet må ikke være vilkårligt. Mere end tre timer er fortsat `WINDOW_HAS_TIME_GAP`; manglende eller ikke-verificeret strøm er fortsat missing. Begge dele bryder det brugbare suffix og holder memory ikke-klar.
4. DEC-0060's ejeraccepterede pre-public opvarmning må kun bruge `WINDOW_INCOMPLETE`, altså et kort, men ellers sammenhængende vindue. `LATEST_SAMPLE_MISSING`, `WINDOW_HAS_MISSING_EVIDENCE` og `WINDOW_HAS_TIME_GAP` er ikke opvarmning ved den aktuelle fælles zonereference og udløser global rollback til legacy. DEC-0062 præciserer referencescopet, så senere prognosehuller ikke retroaktivt klassificeres som et aktuelt warmup-gab.
5. Den globale omskifter får derfor den særskilte gate `candidateWarmupEligible`. Candidate G kan kun være aktiv med ufuldstændig memory, når komplet scorecoverage og sammenhængende opvarmning begge er sande.
6. Den dataminimerede public-shadow genafspiller nu hver kompakt transportstate med den aktuelle kode og kræver identisk potentiale, udtransporttimer, readiness, status og coverage. Den rapporterer kun aggregater og fejlkoder.
7. Stateformat, model-id og profil-id ændres ikke. De gemte `time`/`strength`-beviser har samme betydning og genafspilles fortsat fra fast rand 0; persistéret transportoutput er stadig ikke startinput. Rettelsen ændrer kun den fejlagtige cadenceaccept og kan derfor sikkert bruge den allerede indsamlede dataminimerede evidens.

## Lokal evidens

- Målrettede tests dækker første tre-timers fortsættelse, komplet 17-punkts/48-timers native vindue, split mod ubrudt replay og et fire-timers hul, som fortsat fejler lukket.
- Replay af den offentlige 673-state med rettelsen ændrer den gamle artifacts 673 nuller til 110 positive og 563 fortsat nul efter de faktiske strømforhold. Gennemsnittet bliver 1,71 og maksimum 30; 658 states afviger som forventet fra det gamle fejlberegnede artifact.
- Samme audit markerer det gamle artifact rødt med `CANDIDATE_MEMORY_GAP` og `COMPACT_BOUNDED_TRANSPORT_REPLAY_MISMATCH`. Der vises ingen del-id'er, rå strømstyrker, koordinater eller private payloads.
- Samlet lokal `scripts/validate-source.ps1`, inklusive RDKS, tværgående kildekontrakter og releasegate, er grøn for 4.0.262.

## Leverancegates

PR #100 bestod exact-head `32642456123`, blev merged som `586fbd184f68c6445acfb38a39814f6348f14bd0`, og produktion `32642532892` bestod alle fulde gates og Pages. Live `rr-20260823134605-210` beviste cadence-rettelsen med 673/673 accepterede states, nul replaymismatch, 110 positive og 563 fysisk fortsat nul. Den aktive shadow fandt samtidig en særskilt referencescopefejl i profilgaten; derfor lukkes den samlede P0 først gennem DEC-0062/4.0.263.

P0 er først produktionslukket, når den efterfølgende 4.0.263 har bestået:

1. målrettede state-, score-, profil- og shadowtests samt RDKS/source-validering;
2. GitHub exact-head-kildegate;
3. frisk fuld produktion med central hydrering, `npm run validate`, `npm run release:gate`, profil-readback, artifact og Pages;
4. dataminimeret aktiv 210/673-shadow med nul state-replaymismatch;
5. hændelseskrævet fuld browserkontrol, fordi den offentlige score ændres.

## Uændrede grænser

- Candidate G forbliver `20/50/30`; legacy `25/40/35` er eksakt global rollback.
- 0,03→0,15 m/s, +10/-8 point pr. effektiv time, udtransport fra 13 effektive timer, mobilisering 4/48 og waders-jagtbarhed er uændrede.
- Ingen geometri, land-/vandpunkter, bund-/dybdemodel, private caches, artifact eller protected-dirty-data ændres. 4.0.262 ændrede kun versionsfeltet i geodatafilerne.
