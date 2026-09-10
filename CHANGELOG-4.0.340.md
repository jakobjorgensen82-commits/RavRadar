# RavRadar 4.0.340 – sikker WAM-seam

## Lokal udvidelse 2026-09-10 – samlet vejrlivscyklus, måltestet; CI og drift afventer

- Exact-head-CI `34417094732` bestod bindingspreflight og fuld releasegate, men fandt derefter én forældet target-registry-fixture. Testen forventede, at nyere `PROCESSED` metadata alene kasserede en ældre attesteret cachetuple. Den er rettet test-only til både at bevare metadata-only-winneren og afvise gammelt proof efter reel nyere tuple+attestation. De to relevante måltests er grønne; ingen producentkode, binding eller migration ændres.

- Exact-head-CI `34417094732` bestod bindingspreflight og fuld releasegate, men fandt derefter én forældet target-registry-fixture. Testen forventede, at nyere `PROCESSED` metadata alene kasserede en ældre attesteret cachetuple. Den er rettet test-only til både at bevare metadata-only-winneren og afvise gammelt proof efter reel nyere tuple+attestation. De to relevante måltests er grønne; ingen producentkode, binding eller migration ændres.

- Bevarer hele den eksisterende 4.0.340 WAM-/bindingspakke og PR #274. Nye lokale ændringer er ikke dækket af de tidligere grønne måltests eller backendbeviser.
- Adskiller vedvarende private CP-/OM-reserver fra dagens restprojektion; bevarer originale acquisitioner og recordbundne positive beviser ved referenceskift og senere kvalitetsopdateringer.
- Tilføjer en fælles, eksakt target-/registerbundet arbejdsplan fra valideret kildeunion. Den prioriterer reelle huller, ikke blot mangler i en leverandørs egne data, uden at ændre kildeadgang eller DMI-klassifikation.
- Bevarer DMI's gyldige gamle tuple/proof til faktisk ny erstatning, fjerner dobbeltkontrol inden for samme checkpoint og lader genuine-cold-start beholde ufuldstændig historik uden obligatorisk fuld historikhentning før operationel WAM.
- Tilføjer fejlstyret OM-retry, private bank-recoverygrænser og sikker aggregeret diagnosedata. Legacycachekompatibilitet, alle writerkaldesteder og postbuild-kvalitetsforbedring indgår i integrationen.
- Afsluttende review 10. september: begge banker får originalmanifest og vedvarende konfliktmasker; CP bevarer canonical bankpointer til atomisk replace; lokale succesflag eksporteres før efterfølgende projection/reportfejl. OM-planen anvender samme in-memory-recovery som indsamlingen.
- En forkert lokal antagelse om obligatorisk parent-strøm er trukket tilbage før produktion: reelle PART-huller forbliver kritiske, mens de dokumenterede geografiske parenthuller ikke genåbner samme asset. De berørte måltests er grønne; faktisk tids-/RAM-/bankvækst er uverificeret.
- Den samlede målmatrix for plan, DMI/checkpoint/WAM, CP-/OM-banker, recovery, workflow og privat runtime er bestået. To testfixtures er tilpasset den besluttede rækkefølge/targetkontrakt; ingen produktionsregel er lempet i testfasen. Se WEATHER_LIFECYCLE_TEST_EVIDENCE_2026-09-10 i docs/ai.
- Modelbindingen er fortsat konsistent uden ny SQL-/modelhash alene fra Pythonændringerne. Ny runtimepakke skal dannes på endelig kode. Ny exact-head-CI, merge, backend, faktisk komplet vejr/handoff, vedligeholdelse og modelcutover mangler. Den gamle annullerede gate genstartes ikke.
- Ejer har godkendt Sol Ultra, autonom fortsættelse og launchovervågning. Udskudte opgaver revideres mod det, denne pakke faktisk løser; cachetransport og bæredygtig drift er ikke automatisk bevist af donorbankerne.
- Se `docs/ai/WEATHER_COLLECTION_SYSTEM_REVIEW_2026-09-09.md` og tillæggene til DEC-0118/0119/0114. De konkrete 535 rester, WAM MISSING_HOUR og bæredygtig normaldrift er åbne bevisgrænser, ikke erklæret løst.

## Problem

Oneoff `34371642565` gemte DMI-, Copernicus- og Open-Meteo-progress, men WAM-handoff stoppede med `MIXED_RUN_INTERPOLATION`. Producenten kunne finde en gyldig interpolation inden for samme native WAM-serie, mens slutvalidatoren og Forecast Store kun prøvede de to tidsmæssigt nærmeste rækker. En eksakt nyere modelrække kunne dermed skjule en stadig gyldig bracket fra den forrige kørsel.

## Rettelse

- Eksakte rækker vinder uændret.
- Alternative brackets kræver samme collection, modelkørsel, gitterdefinition og fysiske celle.
- Den smalleste bracket vælges deterministisk; ved lighed vælges nyeste kausale run.
- Fire timer er et absolut bølgeloft, også hvis en forkert cadence-værdi sendes ind.
- Ingen leverandørprioritet, cacheidentitet, geometri, scoreparameter eller offentlig model ændres.

## Samlet Astra-review

- Samlet Astra-review retter desuden valg af nærmeste endepunkter pr. serie og fuld bølgetuple/retning før rangering, så et ugyldigt alternativ ikke skjuler et gyldigt.
- Synkroniserer integrated-/rollbackbundles og alle SQL-/profil-/Edge-/releasebindinger med append-only migration 9. Alle otte allerede anvendte migrationer er uændrede; readiness genoptager kun det præcise pending suffix.
- Flytter fem hurtige eksisterende bindingskontroller foran de tunge sourcefixtures, uden at fjerne eller svække den fulde gate.
- Den grønne backend fra 4.0.339 dækker ikke de nye hashes: efter merge kræves nyt backendbevis parallelt med corrected-main oneoff. Candidate G forbliver offentlig indtil hele launchkæden består. Se `docs/ai/RELEASE_4_0_340_ASTRA_REVIEW_2026-09-09.md`.

## Bevis og status

Python-validator 35/35, DMI-producentintegration 24/24, Forecast Store, bootstrap-target og RavScore-produktionsadapter er grønne lokalt. Negative regressioner bevarer stop ved mixed-run og over-fire-timers interpolation. Bundles, migration, readiness, installation, releasekontrakt og sourceplanens måltests er også grønne. Exact-head GitHub-sourcegate, merge, nyt backendbevis, komplet 4.0.340-main-oneoff, fulde post-data-gates, deploy og offentlig verifikation mangler. Candidate G forbliver offentlig indtil da.
