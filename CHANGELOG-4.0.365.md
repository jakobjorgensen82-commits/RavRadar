# RavRadar 4.0.365 – auditrapporten bærer sit dataset-id

**Dato:** 2026-09-14
**Status:** Lokal releasekandidat; exact-head-CI, merge, same-head-handoff, cutover og offentlig verifikation mangler.

## Faktisk produktionsbevis

- 4.0.364 bestod exact-head-sourcegate `34846130189`, blev merged gennem PR #301 som main `273cb052026e9f3b5b15fb9e0314ae8c032b0233`, og providerfrit handoff `34848494028` blev grønt.
- Cutover `34849662988` forsøg 1 stoppede på en midlertidig Supabase 502. Forsøg 2 genbrugte samme data og fortsatte efter retry.
- Den integrerede runtimeaudit bestod med 0 fejl. Dermed er de tidligere otte H0-last-mile- og seksten følgefejl væk, og 4.0.364-rettelsen er bevist i den virkelige kæde.
- Installationen stoppede derefter i checkpoint-dispositionen før database- og Pages-write.

## Rodårsag og rettelse

- Checkpoint-leddet krævede `.datasetId` i den genererede runtimeaudit for at binde audit, manifest og deploy-handoff til samme datasæt.
- Auditproducenten kontrollerede allerede `conditions.datasetId`, men udelod feltet fra sin returnerede rapport. `jq -e` stoppede derfor lydløst på et felt, producenten aldrig skrev.
- 4.0.365 skriver det allerede validerede `full.datasetId` som topniveau i auditrapporten. Ingen værdi udledes eller ændres i checkpoint-leddet.

## Uændret model og fortsættelse

- Integrated bundle `327b989b731e6e84bf05bdb6bd54707d47c04d5bdf80038d437332e84a4c8e01`, Candidate G bundle `1ccbb10ed3e89f9c8336539a2c566d7ab6efd099bf3e9d1598dbb31e84d5c3a1` og migration 15 er uændrede.
- Score, modelstate, vejrdata, rotation, cache, geometri, databasekontrakt og privacy er uændrede.
- De fire brede first-cutover-suiter forbliver sprunget over. Der køres ingen oneoff eller almindelig weather før modellen er online.
- Næste trin er én exact-head sourcegate, merge, et kort providerfrit same-head-handoff og cutover til offentlig deploy.

Se DEC-0147.
