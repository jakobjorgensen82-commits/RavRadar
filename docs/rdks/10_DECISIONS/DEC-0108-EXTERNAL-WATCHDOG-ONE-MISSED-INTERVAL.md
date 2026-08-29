# DEC-0108 – ekstern vagthund overtager efter ét manglende interval

**Status:** Aktiv og produktions-/driftsverificeret i 4.0.310
**Dato:** 2026-08-29
**Modelpåvirkning:** Ingen

## Evidens

DEC-0107 aktiverede præcis ét eksternt kvartersjob med den eksisterende 45-minutters dobbelte stilhedskontrol. De automatiske prøver kl. 09:19 og 09:34 UTC gav korrekt no-op ved et friskt offentligt manifest, mens GitHubs forventede native produktionsschedule omkring 09:29 fortsat udeblev. Ved 09:49 UTC passerede både seneste produktionsrun og manifest 45-minuttersgrænsen; ekstern vagt `33246369618` bestilte derfor redningsproduktion `33246376992`.

Mekanismen virkede, men den faktiske første redningsstart lå cirka 60 minutter efter den foregående produktionsstart. Redningsproduktionen bestod derefter current-hour, målrettet Copernicus, komplet 210/673, Candidate G-runtimeaudit, fuld validering, releasegate og Pages og publicerede `rr-20260829095610-210` med reference 09:00 UTC. Ejeren besluttede, at vedvarende manglende native schedules ikke må give for få produktioner alene på grund af den eksterne vagts egen konservative grænse.

Den offentlige, aggregerede eftermåling viste samtidig, hvorfor grænsen skal ned: primæren havde 0/673 memory-ready dele, alle 673 var ærligt `WINDOW_INCOMPLETE`, og sammenhængende dækning var kun 5–12 af 48 timer. Redningsproduktionen gendannede komplet aktuelt vejr og en ny sammenhængende suffix, men kunne ikke og måtte ikke opfinde morgenens mistede historik. En tidligere forventning om READY omkring kl. 15 dansk tid er derfor forkastet; uden nye huller ligger tidligste realistiske fulde READY ved første afsluttede produktion efter cirka 2026-08-31 kl. 06 dansk tid.

## Beslutning

1. Det ene aktive cron-job og tiderne `04,19,34,49` UTC bevares uændret.
2. Kun et eksplicit eksternt `workflow_dispatch` med `external_watchdog=true` bruger 15 minutters dobbelte stilhedsgrænse.
3. GitHubs interne native `schedule`-watchdog beholder DEC-0085's 45 minutter. En almindelig manuel keepalive er fortsat ikke en produktionsvagt.
4. Ved begge grænser må produktion kun bestilles, når ingen produktion er aktiv/queued, seneste produktionsrun er ældre end grænsen, og det offentlige manifest er ældre end grænsen.
5. Præcis grænsealder er frisk: ved nøjagtig 15 eller 45 minutter bestilles intet. Først en dokumenteret alder over grænsen må dispatch'e.
6. Redningsproduktionen er fortsat normal `force=false`, deler `ravradar-weather-production`-concurrency og skal bestå de uændrede current-hour-, DMI/Copernicus-, 210/673-, Candidate G-, validate-, release- og deploygates.
7. En lavere orkestreringsgrænse er ikke tilladelse til parallelle builds, kunstig historik, interpolation, nuludfyldning, stale relabeling eller svækket missingsemantik.

## Virkning

Når GitHub ikke opretter de native schedules, undersøger den eksterne tjeneste fortsat hvert kvarter. Efter mere end 15 minutters samtidig run- og manifeststilhed kan den næste eksterne kontrol bestille en redningsproduktion, normalt efter 15–30 minutters dokumenteret stilhed i stedet for 45–60 minutter. Faktisk færdiggørelse afhænger fortsat af køretid og kilder.

Dette fjerner en unødigt lav redningsfrekvens som mulig egenårsag til datahuller. Det garanterer ikke mod samtidige udfald hos cron-job.org, GitHub API/Actions eller datakilder; RavRadar skal fortsat fejle lukket og vise ærlig nød-/missingstatus ved reelle huller.

## Aktiveringsbevis

PR #222 bestod exact-head `33247789054` på `63ab1209f9dbaadfb347fcb6e4577ccd776d4489`, blev merged som `792648c3b179afc0a222ad8f0be54e85ae2aa824`, og post-merge-produktion `33247839121` bestod frisk runtime, fuld validering, releasegate, artifact og Pages. Offentlig `rr-20260829103233-210` er 4.0.310 og komplet 210/673.

Det ene eksisterende cron-job kaldte automatisk den mergede kode kl. 10:49:07 UTC som run `33248692042`. Ingen native produktionsschedule var kommet i mellemtiden. Produktionshistorik og manifest var begge over den eksterne 15-minuttersgrænse; freshnesskontrollen og `Dispatch one production after verified silence` bestod, og præcis én normal `force=false`-produktion `33248699516` blev oprettet kl. 10:49:20 UTC på samme mergecommit. Ejeren vurderede dette sammen med den allerede fuldt grønne post-merge-produktion som tilstrækkeligt levende funktionsbevis og bad om ikke at fortsætte trin-for-trin-overvågning af den nye kørsel.

## Grænser

Candidate G, RavScore, scorevægte/-kurver, bølge-/strøm-/mobiliserings-/leveringssemantik, DMI/Copernicus-scoreinput, state/cache/recovery, modelprofil, geometri og land-/vandpunkter er uændrede. DEC-0108 erstatter kun DEC-0107 punkt 5 og tidsvirkningen for det eksplicitte eksterne intent. DEC-0085's interne 45-minuttersvagt består.
