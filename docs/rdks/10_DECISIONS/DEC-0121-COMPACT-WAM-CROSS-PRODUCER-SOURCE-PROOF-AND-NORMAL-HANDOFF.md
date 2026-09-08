# DEC-0121 – kompakt WAM-cache, tværgående sourceproof og normalt weather-handoff

- **Status:** Ejerbesluttet, lokalt implementeret, måltestet og reviewet GO i 4.0.336; exact-head CI og runtimebevis åbne
- **Besluttet:** 2026-09-08
- **Ejer:** RavRadar
- **Supplerer:** DEC-0045, DEC-0119 og DEC-0120
- **Supersederer snævert:** DEC-0045-tillæggets formulering om sourceproof alene “fra produktionsworkflowet”. Genbrug er nu begrænset til de præcist allowlistede normal- og oneoff-producenter nedenfor. Selve kildegaten, live-verifikationen og alle senere data-/releasegates består.

## Problem og evidens

Oneoff viste, at den private provenance-rige DMI/WAM-cache kunne vokse alene ved pretty-printet JSON og dermed ramme en rå bytegrænse uden mere information. Exact-main-sourceproof var samtidig bundet til én producentvej, og kun oneoff kunne forsegle det allerede godkendte runbundne weather-handoff.

Normalrun `34229976645` efterlod 2.015 eksakte par til Open-Meteo og bevarede de progressive cacher, men opnåede ikke komplet closure og forseglede intet handoff. Det er cachebevaringsbevis og negativt completenessbevis, ikke produktions- eller cutoverbevis.

## Bindende beslutning

1. Alle writes af den private DMI/WAM-bulkcache – progress, final, READY-promotion og reuse/fast path – sker atomisk som kompakt UTF-8-JSON med afsluttende linjeskift. Pretty-print er ikke en persisted cacheform.
2. WAM-validatorens rå maksimum forbliver hårdt `256 MiB`. Overskridelse stopper fail-closed. Diagnostik må alene vise aggregeret faktisk og tilladt byteantal; filsti, payload, ids, koordinater, rå U/V og cacheindhold må ikke logges.
3. Et live-verificeret grønt source-step kan genbruges på samme uændrede `main`-SHA fra præcis:
   - `.github/workflows/update-and-deploy.yml`: det normale reusable buildjobs eksakte source-step;
   - `.github/workflows/validate-copernicus-current-pilot.yml`: det eksakte `validate`- eller `operational-118-preflight`-source-step.
   Intet andet workflow-, job- eller stepnavn kan producere proof.
4. Cacheposten er kun locator. GitHub skal live bekræfte repository, workflow, job, step, head, branch, run, attempt, status og konklusion samt komplet historik for begge allowlistede workflows. Ukendt, ufuldstændig, omdøbt eller tvetydig evidens kræver ny fuld sourcegate.
5. Et senere udført source-step med failure/cancellation eller en udført producentvej uden forventet source-step invaliderer ældre proof på tværs af begge workflows. Skipped skaber ikke proof og er ikke alene en ny fejl. Ændret attempt genverificeres live.
6. Kildegaten fjernes ikke. Ny/ændret/ukendt kode og enhver invalidering kører fortsat fuld `validate:source`. Central hydrering, frisk vejr/proveniens, fuld `npm run validate`, `npm run release:gate`, artifact/privacy og Pages består.
7. Normalworkflowet må kun producere handoff ved eksplicit `workflow_dispatch` på eksakt `main`, `produce_weather_handoff=true` og bekræftelsen `PRODUCE-VERIFIED-WEATHER-SOURCE-HANDOFF`. Den tidlige tilladte modeltilstand er præcis `candidate-g:true`, `legacy-candidate-g:true` eller `legacy-candidate-g:false`, og den efterfølgende action er præcis `candidate-maintenance` eller `candidate-legacy-maintenance`. Handoff-handlingen er gensidigt udelukkende med force, geometri, rollback, first cutover og integrated return.
8. Et normalt handoff forsegles først efter komplet DMI → Copernicus → regional DMI → Open-Meteo-closure, bestået WAM-/Feggesund-bevis, fuld validate, releasegate og ny kontrol af, at checkout og `origin/main` fortsat er start-SHA. Cache-/attestationsformat og consumerens genverifikation er samme som for oneoff.
9. Partial DMI-, Copernicus-, regional- og Open-Meteo-cacher gemmes før terminale gates. Missing, provider-, WAM-/Feggesund-, validate-/releasegatefejl eller main-SHA-drift giver intet handoff, artifact eller cutover og nulstiller ikke gyldig progression.
10. 4.0.336 ændrer ingen runtime-/modelarkitektur, udfører ingen rollback/nulstilling og ændrer ingen RavScore-formel, geometri, kystnormal eller land-/vandpunkter. Oneoff forbliver accelerator; normal drift er permanent vedligeholder efter reaktivering.

## Bevaret, forkastet og åbent

**Bevaret:** DEC-0120's atomiske tuple-admission, granulære salvage, exact WAM-resume, same-run/grid/cell-interpolation, hårde WAM-/Feggesund-slutgates og cache-save før terminal stop; DEC-0119's eksakte 79.414-closure og runbundne consumerkontrol; DEC-0045's exact-head sourcegate for ny kode.

**Forkastet:** pretty-print som persisted cacheform; hævet WAM-bytegrænse; sourceproof fra vilkårlige workflows; automatisk/scheduled normal handoff-produktion; handoff ved partial data eller fejl.

**Åbent:** GitHub sourcegate på releasekandidatens eksakte head, merged `main`-runtime, 79.414/79.414 current, WAM/Feggesund 354/354, spatial audit, live kapacitet, fulde produktionsgates, artifact/deploy, Phase B og offentlig verifikation. Candidate G forbliver offentlig.
