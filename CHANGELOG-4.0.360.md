# RavRadar 4.0.360 – fælles native→runtime-bevis for DMI-strøm

**Dato:** 2026-09-14
**Status:** Lokal kandidat; exact-head-CI, merge, cachebaseret SHA-handoff, cutover og offentlig verifikation mangler.

## Observeret produktionsbevis

- 4.0.359 bestod exact-head-sourcegate `34788388836` og blev merged som main `8ec6b8be` gennem PR #296.
- Cache-handoff `34789764309` brugte ingen provider eller oneoff. Det forseglede 79.414/79.414 currentpar over 118 timer, missing 0: DMI 67.686, Copernicus AMM15 601, Copernicus Baltic 8.067, regional native 312, regional derived hold 632 og Open-Meteo 2.116.
- Cutover `34790416354` genbrugte handoffet og gennemførte 272/272 underkontroller samt alle fem hovedkontroller.
- Runtime/modelaudit, referencezoner, releasegate og vejrdatavalidering var grønne. Fuld validering havde præcis én fejl: den rumlige videnskabelige audit afviste 617 DMI-lokaldele. Alle senere kontroller fortsatte og bestod. Ingen database-, checkpoint-, privat-runtime- eller Pages-write blev udført.

## Rodårsag

`update-dmi-bulk.py` gemmer den verificerede native DMI-kildeidentitet pr. række. `buildDmiForecastHourly` fører samme identitet ind i den offentlige runtime og tilføjer deterministisk runtime-metadata: `optionalFieldSet`, målberegnet `leadTimeHours`, `forecastAgeHours`, `temporalResolution`, `nativeValidTimes`, `nativeSteps` og `fallback`.

Audittens bulkverifikation var korrekt, men den returnerede den rå native række direkte til en efterfølgende streng sammenligning mod runtimeformen. Derfor blev ægte DMI-data afvist netop fordi runtimebuilderens forventede metadata var til stede. Den gamle enhedstest skjulte kanten ved at bruge en syntetisk bulkrække, som allerede havde runtimefelterne.

Derudover er `conditions.generatedAt` wall-clock-tiden for den senere samlede bygning. Runtimeprojektionen er med vilje bundet til det fastlåste `conditions.productionReferenceAt`. Auditten skal bruge sidstnævnte for at beregne samme forecastalder som produktionen.

## Rettelse

1. En audit-only adapter kalder den allerede eksporterede `buildDmiForecastHourly` med én eksakt native currentrække. Dermed genbruges hele produktionsprojektionen uden at ændre eller kopiere modelkernen.
2. Den rumlige audit kræver fortsat en fuldt verificeret native bulkrække, men projekterer den derefter gennem samme produktionskode før den strenge sammenligning.
3. Auditten bruger `conditions.productionReferenceAt`, ikke den senere wall-clock-byggetid.
4. Regressionen fjerner runtimefelterne fra sin bulkfixture, genopbygger dem gennem den delte adapter og beviser, at en senere wall-clock-tid ville give en anden forecastalder.

## Sikkerhedsafgrænsning

- Ingen fejl ignoreres eller omklassificeres generelt.
- Native identitet, collection, modelrun, grid, gridpunkt, assethash, valid time og øvrige eksisterende DMI-gates består.
- Alle fem hovedkontroller og alle 272 underkontroller forbliver bindende før eksterne writes.
- Ingen ændring af vejrværdier, sourceorder, rotation, scoreformel, modelstate, migrationer, geometri, database eller privacy.
- Integrated- og Candidate G-modelbundle samt deres eksisterende hashbindinger forbliver byteuændrede; der kræves ingen ny migration.
- Ingen oneoff og ingen almindelig weather før modellen er online og offentligt verificeret.

## Lokal evidens

De målrettede tests for produktionsadapter, DMI bulk→forecast, DMI modeldownload, integreret generator, operationel currentadapter, kanonisk U/V-proveniens og workflowrækkefølge er grønne med projektets bundne Python-runtime.

## Næste

Kør én exact-head GitHub-sourcegate, merge kun den eksakte grønne kode, genskab det korte SHA-bundne handoff fra samme cacher og kør cutover. Ved grønt gennemløb følger offentlig 210/673/118- og siteverifikation; derefter genaktiveres almindelig weather for at bevise cachevedligeholdelse, fuld DMI-rotation, fallback og tidsoverskud.
