# DEC-0138 – genbrugte produktionsworkflows skal have samme read-only tilladelser i caller og callee

**Status:** Aktiv lokal beslutning for 4.0.356. Exact-head-CI og live cutover afventer.

## Baggrund

4.0.355 bestod sourcegate `34759300669`, blev merged som main `5bcd5fb2`, og cachefortsættelse `34760554781` gendannede de fire eksakte cacher, bestod kapacitetsmålingen og forseglede handoff uden provider, oneoff eller ny 210/673-audit.

Cutover `34761090699` blev derefter afvist som `startup_failure`, før GitHub oprettede et job. Det genbrugte buildworkflow kræver read-only `pull-requests` til exact-content-kildebeviset. Det ydre `build-and-prepare`-job begrænsede selv sine tilladelser til `contents` og `actions` og gav derfor ikke den tredje krævede tilladelse videre. Repositoryets topniveau kunne ikke reparere den smallere jobkontrakt.

## Beslutning

1. Caller-jobbet giver `pull-requests: read` videre sammen med de eksisterende `contents: read` og `actions: read`.
2. Ingen write-tilladelse tilføjes.
3. Den eksisterende test for genbrugte produktionsworkflows kræver eksakt tilladelsesparitet for både build- og deploy-caller/callee.
4. Vejr, RavScore, private runtimefiler, kapacitetsgrænser, database, geometri og offentlig 210/673/118-kontrakt ændres ikke.
5. Det allerede grønne vejrgrundlag fra `34760554781` genbruges. Fordi handoff er SHA-bundet, genskabes kun handoffet på den nye main før cutover; providere, oneoff og den store 210/673-audit må ikke gentages.

## Konsekvens

GitHub kan oprette workflowgrafen og starte de uafhængige cutoverkontroller. Eventuelle efterfølgende fejl samles i den eksisterende cutoverrapport i stedet for at blive forvekslet med denne startup-fejl.
