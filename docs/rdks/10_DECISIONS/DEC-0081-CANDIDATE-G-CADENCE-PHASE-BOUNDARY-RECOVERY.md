# DEC-0081 – Candidate G-cadencefase ved 48-timersgrænsen

**Status:** Besluttet; 4.0.285 er strukturelt produktionsudgivet, men funktionelt afvist. Den rullende kontinuitetsrettelse og den faktiske predeploy-runtimegate er lokalt verificeret i kandidat 4.0.286; exact-head-, produktions- og offentlig lukning afventer.

## Problem

4.0.284 bestod kilde- og produktionsgates, men den offentlige aktuelle rangliste var fail-closed. Det deployede datasæt havde 0/210 aktive zoner og kun 8/673 `READY`-kystdele, selv om den umiddelbart foregående offentlige 4.0.283-produktion havde 209/210 aktive zoner og 672/673 `READY`-kystdele.

Den kompakte 48-timershukommelse accepterede tidligere kun et vindue, hvis første bevarede måling lå præcis på vinduets starttid. Da den fælles aktuelle reference flyttede én time væk fra den native tretimersfase, blev målingen umiddelbart før grænsen fjernet. De næste 665 forløb havde reelt sammenhængende verificeret kadence, men blev fejlagtigt mærket som kun 46 timers dækning.

## Beslutning

1. Et komplet 48-timersvindue må begynde mellem to verificerede kompakte strømbeviser, når der findes ét verificeret bevis umiddelbart før grænsen, første bevis i vinduet følger samme sammenhængende kadence, og hele afstanden er højst den eksisterende grænse på tre timer.
2. Randtilstanden er fortsat fast 0 ved den eksakte 48-timersgrænse. Beviset før grænsen dokumenterer kun sammenhæng; det kopieres ikke ind som en opdigtet måling i det aktive vindue.
3. Et reelt 47-timersdatasæt uden et verificeret bevis før grænsen er fortsat `WINDOW_INCOMPLETE`. Et internt hul over tre timer, missing eller manglende seneste bevis forbliver fail-closed.
4. Den allerede deployede fejllinje genoprettes én gang fra det eksakte offentlige Pages-artifact fra workflow `32978542594`, datasæt `rr-20260826142942-210`. Kun de kompakte Candidate G-transportbeviser sammenflettes med målets nyere kompakte state.
5. Kilden kræver 673 dele, identiske del-ID'er og model-/profil-/variant-/stateKey-binding samt SHA-256 `d5877f8a0945619b700efa3a97807ac9552033d244ab117e92d8fea87f1877d5`. Modstridende beviser stopper, og mindst 99 % skal blive `READY` før skrivning.
6. Recoveryen må ikke kopiere vejr, rå U/V, koordinater, geometri, land-/vandpunkter, scoreoutput eller private payloads. En lokal prøve mod de to virkelige offentlige artifacts genskabte 672/673 `READY`; den ene tidligere umodne del forblev korrekt lukket.
7. Grænsebeviset før vinduet skal bevares kompakt i den publicerede transporthukommelse, når det var nødvendigt for en faseskudt `READY`-beregning. Det må fortsat ikke afspilles i det aktuelle vindue eller tælle med i de 48 timers dækning; det eksisterer kun, så næste rullende reference kan bevise den samme virkelige sammenhæng.
8. Produktionsworkflowet skal auditere den faktisk genererede `data/live/conditions.json` med Candidate G-shadowkontrakten efter runtimegenerering og før fuld validering, Supabase-sync, artifact og Pages. `--self-test` alene er ikke produktionsbevis.

## Produktions- og auditkrav

- Målrettede tests skal dække faseskift, opdelt statefortsættelse, et ægte kort vindue og hul over tre timer.
- Exact-head-kildegaten og den fulde friske produktionskæde skal bestå på samme commit.
- Offentlig efterkontrol skal ud over 210/673-struktur kontrollere, at den aktuelle rangliste faktisk er befolket. Onlineaudits kræver mindst én aktiv zone, og Candidate G-shadowgaten afviser en accepteret 45–48-timers `WINDOW_INCOMPLETE`-fejlsignatur på mindst 98 % af delene.
- En regressionstest skal køre mindst to efterfølgende forskudte referencer og bevise, at den næste rullende reference fortsat er `READY` med 48 timers dækning.
- Candidate G 20/50/30, +10/-8-/13-timersfysikken, mobilisering, zoner, geometri og land-/vandpunkter er uændrede.

## Driftskontekst

PR #155 og produktion `32987875007` beviste 4.0.284-sikkerhedskæden. En GitHub Actions/Pages-driftsforstyrrelse forsinkede events og lod den første manuelle produktion blive afløst af den senere pushproduktion, men artifact-sammenligningen beviser, at Candidate G-faldet allerede opstod i det første 4.0.284-build og ikke skyldtes deploy-kapløbet.

PR #156 bestod exact-head `32993055324`, blev merged som `de6b78444bf1d9bd19beb6100ceb193fe40a8d85`, og produktion `32993270783` bestod recovery, frisk runtime, fuld validering, releasegate, Supabase-sync og Pages. Den skærpede offentlige efterkontrol afviste derefter 4.0.285 korrekt: 0/210 aktive zoner og 665/673 `WINDOW_INCOMPLETE`. Rodårsagen var, at faseskiftets virkelige grænsebevis blev brugt i samme beregning, men ikke bevaret til næste rullende reference. 4.0.286 retter denne fortsættelse og flytter den faktiske shadowaudit ind før deploy.
