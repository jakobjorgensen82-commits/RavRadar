# DEC-0129 – checkpointet HARMONIE-runtime må ikke blokere verificeret DKSS-fortsættelse

- **Dato:** 2026-09-12
- **Status:** AKTIV; lokal 4.0.347 implementeret og måltestet, exact-head-CI og main-runtime afventer
- **Ejergrundlag:** Ejerens ordre om autonom helkædefejlsøgning, genbrug af bevaret cache og en ny oneoff straks efter sikker rettelse
- **Præciserer:** DEC-0128 punkt 2–3
- **Bevarer:** højst tre separate 3.000-sekunderspass, pair-gain før pass 3, 4-GiB-grænser, 5-GiB-diskreserve, alle source-/grid-/afstands-/closure-/launchgates og DEC-0127's ene exact-content-kildegate

## Produktionsfund

**Reviewgrænse og løsning:** [Astra/Ultra-reviewet 2026-09-12](../../ai/ASTRA_HELICOPTER_REVIEW_2026-09-12.md) erstattede antagelsen om, at den første HARMONIE-allowlist alene var tilstrækkelig. Post-cache-exception og forventet partial delte exit 2; watchdoghistorik kunne mangle i sidste childrapport; ydre HARMONIE-stop manglede progressmarkør; downloadbudget delte runtimekode; runmetadata kunne indeholde historiske assettællere. 4.0.347 implementerer nu den afgrænsede terminal-/supervisorprotokol, frisk tæller, eksakte runtimeformer og regressionerne. Producentens dataadmission, normaldriftens exitkontrakt og alle materielle kvalitetsgrænser bevares.

4.0.346 blev exact-head-valideret i PR #280-run `34673860241` og merged som `e912ef9a`. Main-oneoff `34675040245` genbrugte den byteidentiske sourceproof og sprang den dobbelte fulde kildegate over. DMI-passet gemte både GRIB-cachen og den isolerede kandidatcache, men wrapperen startede ikke pass 2.

Den afsluttende producentevidens indeholdt den forventede ufuldstændige strict-current-ledger og et DKSS-`RUNTIME_BUDGET_REACHED`, men også et `RUNTIME_BUDGET_REACHED` for `harmonie_dini_sf`. Diagnostikkens tomme `parametersByCollection.harmonie_dini_sf` er en liste over **genkendte**, ikke planlagte, parametre og kan derfor ikke bruges som bevis for nul arbejde. Den første forklaring om et sikkert tomt HARMONIE-led var for stærk og er erstattet af denne kontrakt.

Producentkoden skelner mellem to tilfælde. Et tidsstop før en collection overhovedet er startet mangler `partialProgressPreserved:true`. Et tidsstop inde i HARMONIEs bounded collectionforløb får markøren for, at al eventuel allerede accepteret fremgang er bevaret; markøren påstår ikke, at et nyt asset blev færdigt. Derefter tvangsflushes sidecars og bulkcheckpoint, hele currentledgeren genbygges, råcachen beskæres til loftet, og en ny afsluttende cache skrives. Wrapperen læser fortsat netop denne nye same-target-slutcache. Et checkpointet HARMONIE-tidsstop er derfor uafsluttet arbejde, som et nyt pass må fortsætte; det er ikke en READY-genvej og ikke datatab, der skal ignoreres.

## Beslutning

1. En ufuldstændig strict-current-ledger kan fortsat kun åbne næste pass, når mindst ét DKSS-runtime-stop findes, ledgerens failure codes er den eksisterende snævre allowlist, samme target og ny afsluttende cache er bevist, mindst ét asset er behandlet, og råcache-/diskgrænserne består.
2. I denne allerede DKSS-berettigede situation må en samtidig HARMONIE-fejl ikke veto fortsættelsen, men kun når collection er præcis `harmonie_dini_sf`, failure code er præcis `RUNTIME_BUDGET_REACHED`, beskeden er en eksakt runtimebesked, og rækken er enten den ydre tre-feltsform før collectionstart eller den indre fire-feltsform med `partialProgressPreserved:true`.
3. HARMONIE kan aldrig alene åbne et nyt strict-current-pass. Manglende/falsk markør på den indre form, ekstra ukendte felter, watchdog, parser, request, katalog, download, kontrakt eller enhver anden HARMONIE-fejl stopper fortsat fail-closed.
4. WAM-runtime og alle øvrige collections forbliver uden for denne præcisering. Den eksisterende negative test med et fuldt markeret WAM-runtime-stop skal fortsat blokere automatisk retry.
5. Pass 3 kræver fortsat stigende `verifiedPairCount` efter pass 2. HARMONIE-fremgang kan ikke erstatte current-pair-fremgang.
6. Producent, scheduler, normal drift, kildeorden, grid, afstande, interpolation, model og slutgates ændres ikke. Kun oneoff-wrapperens klassifikation af den verificerede samtidige fejlkombination ændres.
7. En opt-in intern exit 75 må først udstedes efter hele producentens normale terminalbehandling. Generisk exit 2, exception, `FINALIZE_ONLY` og ethvert supervisorpass med tidligere watchdoghistorik kan ikke åbne cacheklassifikation. Kode 75 normaliseres udadtil til 2, hvis oneoffen slutter ufuldstændig.
8. Fremgang betyder kun producentens nulstillede `assetsProcessedThisInvocation`; historiske run-tællere er ikke bevis. Pending checkpoint afvises eksplicit.
9. Pages genkontrollerer den eksakte target+117h-horisont før begin-CAS og igen umiddelbart før deploy. Et stop efter begin bruger den eksisterende reconciliation/abort; foretrukken alder er fortsat kun en advarsel.

## Bevis og næste kørsel

Regressionerne gengiver DKSS-runtime + ledgergate + indre/ydre HARMONIE, downloadkollision, generic2/post-cache-exception, watchdoghistorik, pending cache, historisk assettæller og serialiseret cache-seam. Lokalt er wrapper 15/15, supervisor 12/12, checkpoint 32/32 samt compile, modeldownload, freshness og workflowrækkefølge grønne. 4.0.347 afviser fortsat HARMONIE uden eksakt form, anden HARMONIE-fejl, HARMONIE uden DKSS-runtime, WAM-runtime, ukendt ledgerkode og manglende pair-gain.

Run `34675040245` sluttede efter alle provider-cachesaves med 42 provider-negative Open-Meteo-par på 21 kystdele efter isolerede genforsøg; ingen handoff eller cutover blev dannet. En ny oneoff må først starte efter exact-head-CI og merge og skal gendanne/genvalidere DMI-, Copernicus-, regional- og Open-Meteo-fremgangen frem for at nulstille den. Runtimebeviset er først positivt, når loggen faktisk viser pass 2; launch kræver fortsat current 79.414/79.414, native WAM 79.060, Feggesund 354/354, freshness, fulde post-data-gates, runbundet handoff, cutover og offentlig modelkontrol.

DEC-0122's materielt uændrede first-cutover-undtagelse flyttes under den stående ejerautorisation alene til exact-release 4.0.347. Et 4.0.346-handoff kan ikke ommærkes eller bruges.
