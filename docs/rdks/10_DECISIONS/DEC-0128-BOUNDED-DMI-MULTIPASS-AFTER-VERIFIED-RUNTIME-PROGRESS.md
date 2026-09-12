# DEC-0128 – Reelle bounded DMI-pass efter verificeret runtimefremgang

- **Dato:** 2026-09-12
- **Status:** AKTIV og lokalt implementeret i 4.0.346; exact-head-CI og main-runtime afventer
- **Ejergrundlag:** Ejerens ordre om autonom helkædefejlsøgning, komplet vejr før integreret model-launch og ingen blind gentagelse af oneoff
- **Supersederer:** Oneoff-antagelsen fra 2026-09-04 om, at højst tre producentkald under én fælles 3.000-sekundersramme kunne fortsætte en runtime-uafsluttet DMI-currentmatrix
- **Bevarer:** DEC-0118–0127, fuldt 673 × 118-register, DMI → Copernicus → Open-Meteo, source-/grid-/afstandskrav, cache/provenance, WAM/Feggesund, privacy, full closure og runbundet cutover

## Nyt produktionsbevis

PR #279's endelige head `47275529` bestod exact-head-sourcegaten i run `34666410182` og udstedte contentdigest-bevis. PR'en blev merged som `64d2f23f`; merged main var byteidentisk med PR-headen. Oneoff `34667430392` genbrugte beviset efter live GitHub-kontrol, og det fulde sourcegatearbejde blev derfor ikke kørt en anden gang. Post-data-gates blev ikke nået, fordi vejrclosure senere stoppede korrekt.

DMI planlagde mod samtlige 79.414 par. Den roterede faktiske rækkefølge var `dkss_nsbs` → `wam_dw` → `wam_nsb` → `dkss_idw` → `dkss_lf`. Der blev startet behandling af henholdsvis 1, 5, 5, 21 og 29 assets; begge WAM-familier opnåede native closure. DMI-current sluttede med 64.400 verificerede par, 15.014 egenrest, 1.126 spatialt utilgængelige par og 3.365 upstream-fraværende par. Den ufuldstændige ledger blev klassificeret `DMI_LOCALLY_SKIPPED_DKSS_ASSET` sammen med `RUNTIME_BUDGET_REACHED`.

Copernicus gennemførte 73 sourceforsøg på 39m25s og efterlod 3.396 par før regional/Open-Meteo. De nye durable writes var billige, og det gamle fuld-checkpoint-for-hvert-segment-mønster var brudt; fulde seks-segment-konsolideringer og candidate-admission er stadig målbare optimeringspunkter. Regionalleddet dækkede 928. Open-Meteo fik 2.468 eksakte restpar og løste 2.284. De sidste 184 var alle forsøgt og singleton-genprøvet; de var provider-negative på grund af null/grid-resultater, ikke runtime-, attempt- eller købudget. Slutgaten stoppede før handoff, artifact, deploy og modelskift.

## Rodårsag i oneoff-wrapperen

`run-dmi-oneoff-fill.py` annoncerede højst tre pass, men gav hele wrapperen én samlet 3.000-sekundersramme og returnerede straks ved enhver producent-exit forskellig fra nul. DMI-producenten returnerer med vilje exit 2, når den eksakte currentledger endnu ikke er READY, også når den atomiske slutcache bevarer reel fremgang og den eneste operative fejl er udløbet runtime. Derfor kunne netop den runtime-uafsluttede situation aldrig få pass 2. Det var ikke et leverandørbevis og ikke blot et spørgsmål om at lade samme proces stå længere.

## Beslutning

1. Oneoff må bruge højst tre separate DMI-pass. Hvert pass beholder uændret 3.000 sekunders producentgrænse, 180 sekunders afslutningsreserve, 4 GiB nyt downloadloft og 4 GiB slutråcache.
2. Et nyt pass efter exit 2 kræver en ny atomisk afsluttende cache på samme låste target, gyldige positive tællere, højst 4 GiB slutråcache, mindst ét behandlet asset og en ufuldstændig ledger, hvis fejlmængde er begrænset til lokal DKSS-skip/retained/systemisk tidsrest plus faktisk `RUNTIME_BUDGET_REACHED` i en DKSS-familie.
3. Prefetch-, request-, parser-, watchdog-, download-, WAM-, kontrakt-, reference-, cache- eller anden ukendt fejl må ikke udløse automatisk exit-2-gentagelse. Ugyldig slutrapport stopper fail-closed.
4. Første verificerede strict-current-runtimebegrænsning kan åbne pass 2. Et tredje strict-current-runtimepass åbnes kun, hvis det foregående runtimebegrænsede pass øger `verifiedPairCount`; nul eller negativ pargevinst stopper `NO_VERIFIED_PAIR_GAIN`. Den særskilte exit-0-downloadbudgetvej i punkt 5 bruger ikke currentpar som fremgangsmål.
5. Den eksisterende exit-0-fortsættelse ved entydigt bevaret downloadbudgetstop består. Disk kontrolleres før hvert pass; under 5 GiB starter intet nyt pass.
6. Oneoff-jobbet får 160 minutter til DMI og 330 minutter samlet. Det rummer højst tre DMI-pass, 57 minutter Copernicus, 17 minutter øvrig provider-runtime og mindst 60 minutter til setup, cachetransport, closure og gates. Tringrænserne er fortsat hårdere end jobbets ydre grænse.
7. Normal DMI-produktion, scheduler, per-pass-algoritme, sourceorder, gridvalg, afstande og slutclosure er uændrede. Flere pass giver den allerede implementerede vedvarende DKSS-leadrotation reelle efterfølgende ture; de giver ikke en ny datakilde eller en READY-genvej.
8. Den ene fulde PR-sourcegate pr. identisk kildeindhold består. Et nyt 4.0.346-sourceindhold kræver sin egen exact-head-PR-gate; main kan derefter kun genbruge beviset efter DEC-0127's live kontrol. Fuld post-data-validate og releasegate springes aldrig over.

## Launchgrænse

4.0.346 garanterer ikke, at DMI eller fallbackleverandører har alle par ved et bestemt modeltidspunkt. En ny oneoff må først køres efter exact-head-CI og merge af denne konkrete rettelse. Den skal fortsat bevise current 79.414/79.414, native WAM 79.060, Feggesund 354/354, freshness, fulde post-data-gates og runbundet handoff før integreret cutover. Candidate G forbliver offentlig indtil da. Normalworkflowet forbliver deaktiveret gennem den kontrollerede sekvens.

DEC-0122's allerede godkendte, materielt uændrede first-cutover-undtagelse følger snævert exact release 4.0.346. Den godkender ikke løbende automatisk kadence, svækkede gates eller cache-reset.
