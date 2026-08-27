# DEC-0084 – Candidate G skal overleve fejlhentninger atomisk

**Status:** Godkendt og produktionsverificeret i 4.0.288
**Dato:** 2026-08-27  
**Scorepåvirkning:** Ingen  
**Offentlig runtimepåvirkning:** Ja, afgrænset nøddrift ved et landsdækkende datagab

## Problem

Den senest fuldt verificerede produktion `rr-20260827013448-210` var komplet med 210 zoner og 673 `READY` kystdele ved 00 UTC. En senere produktion byggede et nyt datasæt ved 09 UTC efter et reelt nitimers hul. Den kompakte Candidate G-hukommelse bevarede korrekt hullet og blev derfor afvist med 673 `WINDOW_HAS_TIME_GAP`. Det fejlede checkpoint blev kun gemt i supportartefaktet, mens næste kørsel igen hydrerede den gamle 00-state. Kæden kunne derfor ikke selv komme videre.

Den offentlige datalæser kasserede samtidig hele det mere end otte timer gamle, men komplette datasæt. Det gjorde zonerne sorte og tømte **Bedste områder** og **5-dages RavRadar**, selv om der fandtes et sammenhørende, tidligere verificeret prognosegrundlag.

## Beslutning

1. Et mislykket, ufuldstændigt eller ikke-auditeret nyt datasæt må aldrig erstatte den seneste komplette offentlige produktion.
2. Den offentlige nødvisning bruger ét helt, hashkontrolleret og Candidate G-auditeret datasæt med præcis 210 zoner, 673 kystdele, 673 `READY` memories og 1.346 modeevalueringer. Gamle og nye dataset-id'er må aldrig blandes.
3. Nødvisningen mærkes tydeligt med tidspunkt, alder og teksten, at dataene ikke er aktuelle. Den må højst bruges i 48 timer; derefter går siden fail-safe i stedet for at fremstille gamle data som friske.
4. Produktionskæden bygger den nye Candidate G-state i baggrunden. Et verificeret hul over tre timer starter en ny sammenhængende suffixlinje fra de reelle prøver efter hullet. Timer opfindes, interpoleres eller backfilles ikke.
5. Den nye runtime bliver først normal offentlig sandhed, når hele den nationale runtime har bestået den faktiske predeploy-audit og alle 673 kystdele igen er `READY`. Skiftet sker atomisk; nødvisningsfilerne fjernes samtidig.
6. Et hul på højst tre timer følger fortsat den eksisterende native-kadencekontrakt og udløser ikke landsdækkende genstart.
7. Uventet delvis national recovery, hashfejl, forkert delantal, forkert dataset-id, udløbet fallback eller fejlet runtimeaudit stopper fail-closed.
8. Kandidaten indeholder en tidsbegrænset engangsrecovery fra workflow `33059522170`/`RavRadar-support-3633`. Den er låst til den kendte 00→09-lineage, 673 dele, den eksakte statehash og højst tre timers genoptagelse efter 09 UTC.
9. Engangsrecoveryen kopierer kun den verificerede kompakte suffixstate efter hullet. Vejr, scoreoutput, rå U/V-vektorer, koordinater, geometri, land-/vandpunkter, konto-/turdata og private payloads kopieres ikke.
10. Candidate G's 20/50/30, +10/-8-/13-timersfysik, vejrberegning, sortering og lokale datakrav ændres ikke.

## Verifikation

- Regime-memory-testen beviser, at standardkald fortsat afviser et reelt hul, mens kun statepipelinen kan vælge den eksplicitte suffixgenstart.
- Statepipeline-testen følger et nitimers hul gennem ærlig warmup til `READY` efter 48 virkelige timer uden opdigtede prøver.
- Fallbacktests låser 210/673/1.346, dataset- og hashidentitet, 48-timersgrænsen, nyeste-verificerede-valg, aktivering og atomisk deaktivering.
- Data-service-testen beviser, at startup og detaljer kommer fra samme fallbackdataset, og at udløbet fallback ikke bruges.
- Engangsrecoverytesten beviser tretimersgrænsen, statehashen og fravær af kopieret vejr, score og rå vektorer.
- En dataminimeret prøve mod de virkelige artifacts genskabte alle 673 kompakte suffixstates fra 09-checkpointet uden vejr-, score- eller vektorkopi. Det seneste sunde offentlige 00-datasæt bestod samtidig den nye fallbackaudit.
- PR #176 bestod exact-head `33066322196` og blev merged som `16ad8300`. Produktion `33066416034` gendannede checkpointet, men stoppede før DMI/deploy, fordi fallbackstage derefter auditerede warmup-staten. Den afgrænsede opfølgning låser sourcegate → komplet fallbackstage → checkpointrecovery.
- PR #178 bestod exact-head `33066897710` og blev merged som `5f9ee093`. Produktion `33066980965` beviste den nye rækkefølge samt frisk DMI/Copernicus/runtime, men stoppede før deploy, fordi auditten krævede en rå kandidatscore samtidig med, at 0/673 `READY` korrekt lukkede alle offentlige scorer.
- Auditkontrakten skelner nu eksplicit: `READY` kræver fortsat kandidatens score, vægtede bidrag og fysiske gate; ikke-`READY` accepteres kun med `available=false`, `score=null`, en ikke-tom fejlårsag og fortsat utilgængelig offentlig mode. Det eksakte `RavRadar-support-3635` består derefter med 210/673, 673 accepterede states, nul replaymismatch og nul modeevalueringer. En lokal prøve publicerer det komplette fallback `rr-20260827013448-210` mod den separate primære warmup `rr-20260827113739-210`.

PR #179 bestod exact-head `33069307854` og blev merged som `653a9811`. Produktion `33069384084`, build `98507461295` og Pages `98512392768` bestod hele den friske kæde. Live manifestet binder primær `rr-20260827121030-210` og fallback `rr-20260827013448-210` uden blanding; fallbackens startup-/detaljehashes matcher, og den har 210/673/1.346 komplet dækning.

Den offentlige browserkontrol viser 210 farvede zoner uden sorte zoner, fem **Bedste områder**, fem udfyldte prognosedage, fungerende områdedetaljer, tydelig ikke-aktuel nødtekst og nul konsolfejl/advarsler. 4.0.288 er derfor produktionsverificeret.
