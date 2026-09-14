# DEC-0142 – den rumlige audit projekterer verificeret native DMI til runtimeformen

**Status:** Aktiv lokal beslutning for 4.0.360. Exact-head-CI, merge og ny cutover afventer.

## Baggrund

4.0.359 blev exact-head-valideret i `34788388836` og merged gennem PR #296 som main `8ec6b8be`. Cache-handoff `34789764309` genbrugte de eksisterende cacher uden provider eller oneoff og forseglede 79.414/79.414 currentpar, missing 0.

Cutover `34790416354` gennemførte alle fem hovedkontroller og alle 272 deklarerede underkontroller. Runtime/modelaudit, referencezoner, releasegate og datavalidering var grønne. Fuld validering havde præcis ét rødt blad: `test-current-spatial-scientific-audit-4.0.76.mjs` afviste 617 DMI-lokaldele med, at runtimekilden ikke matchede præcis én privat bulkrække. Alle efterfølgende kontroller bestod. Cutoveren stoppede samlet før eksterne writes.

Producenten `update-dmi-bulk.py` gemmer en native kilderække med blandt andet item, assethash, modelrun, collection, grid, gridpunkt og native valid time. Den offentlige runtime bygges i `buildDmiForecastHourly`, hvor `componentSource` deterministisk tilføjer/normaliserer `optionalFieldSet`, `leadTimeHours`, `forecastAgeHours`, `temporalResolution`, `nativeValidTimes`, `nativeSteps` og `fallback`.

Audittens native verifikation var streng og korrekt. Fejlen opstod bagefter, fordi callbacken gav den rå native række direkte til den strenge runtime-sammenligning. Testfixturen havde allerede runtimefelterne og kunne derfor ikke opdage forskellen. De 617 udfald var en kontrolfejl, ikke 617 manglende eller forkerte vejrdele.

## Beslutning

1. Auditlaget eksporterer `projectExactDmiNativeCurrentSourceToForecast`, som kalder den allerede offentlige `buildDmiForecastHourly` med én eksakt native currentrække. Modelkernen ændres eller kopieres ikke.
2. Den rumlige audit skal først bestå `verifiedBulkCurrent` med uændret forventet DMI-identitet. Kun en positiv native verifikation må projiceres.
3. Den projicerede række sammenlignes derefter mod runtimeformen gennem den eksisterende strenge `verifyCoastalPartCurrentProjection`.
4. Projektionen bindes til `conditions.productionReferenceAt`. `conditions.generatedAt` er et senere wall-clock-byggetidspunkt og må ikke ændre den forecastalder, som den fastlåste runtime blev bygget med.
5. Regressionen skal bruge en realistisk native bulkrække uden `temporalResolution`, `nativeValidTimes` og `nativeSteps`, og den skal bevise, at en senere wall-clock-byggetid giver en anden forecastalder.
6. Der indføres ingen tolerance, feltudeladelse, blanket-undtagelse eller advisory-klassifikation. Native og runtime skal stadig matche gennem den fælles produktionsprojektion.
7. DEC-0140's komplette fejlopsamling og alle fem hovedgates forbliver bindende. Ukendt eller materiel fejl stopper samlet før writes.
8. Efter exact-head-sourcegate og merge genskabes kun det SHA-bundne handoff fra samme cacher. Ingen provider-oneoff eller almindelig weather før offentlig modelverifikation.

## Uændret

Vejrværdier, DMI-selection, sourceorder, fallback, rotation, providerbudgetter, scoreformel, modelbundle/hash, modelstate, migrationer, geometri, land-/vandpunkter, database, Storage og privacy ændres ikke. Den eksisterende append-only migrationskæde forbliver byteuændret.

## Beviskrav

Før merge:

- målrettet produktionsadaptertest med realistisk native fixture,
- DMI bulk→forecast og modeldownload,
- integreret generator,
- operationel currentadapter og kanonisk U/V-proveniens,
- workflowrækkefølge, version, RDKS og håndbog,
- én GitHub exact-head-sourcegate.

Efter merge:

- cachebaseret same-head-handoff uden provider/oneoff,
- samlet cutover med fem grønne hovedkontroller og 272/272 grønne underkontroller,
- offentlig 210/673/118- og siteverifikation,
- derefter kontrolleret almindelig weather og bevis for cachevedligeholdelse, fuld DMI-registerrotation, fallback og tidsoverskud.

De to jobløse gamle workflowposter `34613079069` og `34228112413` forbliver ude af drift og slettes, når GitHub gør dem sletbare.
