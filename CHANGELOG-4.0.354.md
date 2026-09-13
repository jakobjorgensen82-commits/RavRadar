# RavRadar 4.0.354 – privat runtime fordelt på flere Storage-filer

## Målt årsag

- PR #290-head `d0748d9e495c0b69cb9c7dcb490ccac27635182c` bestod exact-head-sourcegate `34754075158` og blev merged som main `6305dd823775a05425f1c6f3113b85cc2d06f2e1` med identisk filtræ.
- Cachefortsættelse `34755365967` gendannede de fire eksakte cacher og genbyggede runtime uden providerhentning eller ny 210/673-audit.
- 2-GiB-rågrænsen virkede. Kørselen stoppede bagefter, fordi den samlede komprimerede runtime var større end Supabases tekniske 50-MiB-grænse for én Storage-fil.
- Gennemgangen fandt også et bogstaveligt `+` i den næste `jq`-kommando. Det ville have stoppet handoffet efter en grøn måling og er rettet i samme version.

## Rettelse

- Det deterministiske arkiv deles i højst otte immutable dele på højst 50.000.000 byte hver.
- En hel generation må højst være 350.000.000 komprimerede byte. To bevarede generationer er dermed højst 700.000.000 byte, svarende til den allerede besluttede 70-procentsgrænse af 1 GB Storage.
- Hver del har eget content-addressed path, byteantal og SHA-256. Descriptoren binder desuden rækkefølge, samlet byteantal og hele arkivets SHA-256.
- Alle dele uploades og læses byteeksakt tilbage, før én compare-and-swap-pegepind kan gøre generationen gældende. Delvis upload kan ikke blive aktiv.
- Restore henter kun den valgte generation, genopbygger og hashkontrollerer det samlede komprimerede arkiv og bruger derefter den eksisterende sekventielle, bounded filudpakning til et atomisk stageområde.
- Rollback bevarer current og previous som komplette generationer. Oprydning må kun slette dele, der ikke længere refereres af nogen af dem. Schema 1-enkeltobjekter kan fortsat læses.

## Afgrænsning og næste trin

- Den tekniske Supabase-grænse på 50 MiB pr. objekt hæves ikke. Højst 2 GiB råt, 768 MiB pr. fil, 768 MiB legacy samlet, privacy, integritet, CAS og fulde cutovergates består.
- Vejrdata, RavScore, modelhashes, migrationer, geometri og offentlig 210/673/118-kontrakt er uændrede.
- Næste trin er én exact-head 4.0.354-sourcegate, merge og samme cachefortsættelse uden oneoff. Ved grønt handoff følger den eksisterende samlede cutover, offentlig kontrol og derefter almindelig weather-drift.
