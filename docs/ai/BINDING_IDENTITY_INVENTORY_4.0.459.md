# Binding-inventar – 4.0.459

Dette er arbejdslisten til den efterfølgende oprydning. Den beskriver de
identiteter, der skal bindes til én fælles, versioneret runtime-manifestkilde.
Dokumentet ændrer ikke den nuværende drift endnu.

## Den fælles identitet, der skal være ét sted

En fremtidig `runtime-identity` skal mindst indeholde disse felter:

| Gruppe | Felter | Hvorfor |
| --- | --- | --- |
| Kilde | `sourceHead`, repository/ref, implementation-closure | Sikrer at alle trin bruger samme main-kode. |
| Datasæt | `datasetId`, `productionReferenceAt`, `generatedAt`, `zoneCount`, `partCount` | Skelner en vejrpakke fra en anden og låser tidsaksen. |
| Model | hele `modelBinding`: model/state/variant/profile/component/explanation/ranking/best-time/presentation samt `modelContractSha256` og `modelBundleSha256` | Forhindrer at score, runtime og forklaring blandes fra forskellige modeller. |
| Filer/bundles | `bundleContentSha256`, integrated-bundle, Candidate G-reserve-bundle, private contract hashes | Dokumenterer præcis hvilke filer og private contracts der blev bygget. |
| Vejr/proveniens | per-component/source asset, modelRun, grid/lag, U/V-par, current/wave/water source proofs og retention status | Binder hvert felt til den faktiske leverandør- og kildeidentitet. |
| Geometri | geometry/schema-version, land-/vandpunkter, 210 zoner, 673 kystdele og geometri-/point-pair-hashes | Forhindrer at vejrdata lægges på andre kystdele eller punkter. |
| Database | applied migration list, canonical migration hashes, trip-binding-policy, checkpoint-CAS, active central RavScore binding og Edge-readiness | Forhindrer at kode og Supabase-funktioner taler forskellige kontrakter. |
| Drift | deploymentId, repairId, run/attempt, checkpoint disposition/audit, Pages upload/deployment seal og public-manifest-hash | Binder artifact, deploy og offentligt manifest til samme kørsel. |

Manifestet skal være den eneste producent af disse værdier. Kontroller må
stadig læse og sammenligne dem, men må ikke have egne historiske kopier af de
samme SHA'er, tider eller IDs.

## Nuværende producenter og forbrugere

- `scripts/integrated-cutover-readiness.mjs` producerer og læser model- og
  database-readiness, migration-/checkpoint-kontrakter og source-head.
- `scripts/private-production-runtime-workflow.mjs`,
  `scripts/private-production-runtime-bundle.mjs` og
  `scripts/protected-private-production-runtime.mjs` ejer den private bundle,
  contract-hashes, datasæt/tider og runtime-pointer.
- `scripts/migrate-post-cutover-private-runtime.mjs` bruger den beskyttede
  predecessor-identitet og må kun ændre de udpegede modelbindinger; den skal
  fremover læse identiteten fra manifestet i stedet for en lokal historisk
  konstant.
- `scripts/ravscore-operational-activation.mjs`,
  `scripts/ravscore-continuation-checkpoint.mjs` og
  `scripts/protected-ravscore-continuation-checkpoint.mjs` binder aktiv model,
  checkpoint, rollback-status og source-head.
- `scripts/prepare-code-only-public-runtime.mjs`,
  `scripts/audit-ravscore-integrated-public-runtime.mjs`,
  `scripts/audit-pages-artifact-privacy.mjs` og Pages-workflows binder det
  offentlige artifact til samme model-, datasæt- og privacy-identitet.
- `scripts/lib/dmi-*`, `scripts/lib/copernicus-*`,
  `scripts/lib/open-meteo-*`, `scripts/public-conditions-lib.mjs` og
  `scripts/lib/weather-component-selection.mjs` ejer de enkelte
  leverandør-/komponent- og provenance-bindinger. De skal referere til
  manifestets dataset/tidsakse og komponentpolicy, men beholde deres lokale
  feltvalidering.
- `js/core/ravscore-model-contract.js`, `js/core/ravscore-public-model.js`,
  `js/core/public-delivery-contract.js`, `js/services/data-service.js` og
  `js/core/ravscore-public-runtime-contract.js` er browserens modtagere. De
  skal kun acceptere en public pakke, hvis manifestets samlede identitet passer.
- Supabase-migrationerne fra `20260829020000` til
  `20260922100000_integrated_trip_binding_repair.sql` er databaseproducenter;
  `schema.sql`, `supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql` og workflowets
  readback er deres forbrugere.

## Fejl, der viser hvorfor samlingen er nødvendig

1. **Checkpoint-readback (4.0.456):** Supabase havde successorens hash, mens
   kontrolkoden stadig forventede den gamle migrationsfil.
2. **Predecessor-drift (4.0.457):** pointeren pegede på
   `a6d89798`/`rr-20260921170645-210`, mens migratoren stadig havde den ældre
   14. september-source, dataset, bundle og contract-hashes.
3. **Skjult sti-binding (4.0.458):** workflowmiljøet indeholdt stadig
   `source-fa418f43`, selv om descriptoren var korrekt.
4. **Manglende manifesttider (4.0.459):** source, bundle og dataset var
   korrekte, men `productionReferenceAt` og `generatedAt` manglede i den faste
   identitet, så den eksakte manifestkontrol afviste korrekt.
5. **Backend-drift (4.0.455):** Supabase' trip-policy-funktioner havde en
   anden hash end repositoryets binding og krævede en append-only repair-
   migration.
6. **Readiness-head-drift (4.0.451):** et beskyttet readiness-dokument bar en
   tidligere main-head efter en ellers færdig vejrproduktion.

De første fire er samme arkitekturproblem i forskellige former: én identitet
er blevet kopieret manuelt til flere lag. De sidste to viser, at database- og
deploy-readiness også skal være afledt af den samme manifestkilde.

## Semantiske bindinger, som den første liste ikke dækkede godt nok

Disse er ikke blot hashfelter. De skal enten ligge direkte i manifestets
komponent-/geometri-view eller valideres som en eksplicit relation til det.

### 1. Scheduler, måltime og cacheforløb

- Scheduler/run → `productionReferenceAt` → target registry → alle provider-
  requests. Et UTC-skifte eller et nyt vægur må ikke vælge en anden time midt i
  samme kørsel.
- Forrige checkpoint → samme target, source-head, run-attempt og cachepolicy.
  En continuation må kun gå fremad eller være en dokumenteret same-time
  successor med CAS.
- DMI-rotation → konkret collection/modelRun/område og resterende par. Rotation
  skal måle reelt forsøgt, retained, missing og ikke-forsøgt; den må ikke gøre
  en delvist prøvet leverandør til komplet eller springe et ubearbejdet hul
  over.
- Timeout/retry → samme target og samme durable checkpoint. Et retry må ikke
  starte en ny generation, blande attempts eller overskrive bedre retained
  data med tomme værdier.

### 2. Geometri og lokal identitet

- `zoneId` → `partId` → centralt godkendt landpunkt/vandpunkt →
  hav→land-retning → DMI-samplinganker. Alle fem skal være samme generation og
  samme fingeraftryk af punktbestanden.
- `partId` må aldrig arve parentzonens eller nabodelens point, retning,
  forecast eller state. En lokal del med manglende punkt er `MISSING`, ikke en
  skjult parentfallback.
- Geometriændring → cache/provenance/history/state invalidation for præcis den
  flyttede del; uændrede dele skal kunne genbruges.
- DMI-gridpoint → faktiske kystdelspunkter → afstand/celle/lagsbevis. En
  geometry- eller pointrevision må aldrig læse gamle data som om de var målt på
  det nye punkt.

### 3. Vejrkomponenter og leverandørkæde

- Hver komponent (`wind`, `wave`, `current`, `waterLevel`, `waterTemperature`)
  har sin egen kilde, modelrun, collection, lag, grid/celle, validTime,
  forecast lead, friskhed og fallbackstatus. Et skalarvalg må ikke rydde eller
  omskrive strøm; strøm må ikke rydde bølger/vandstand.
- DMI → Copernicus → Open-Meteo er en komponentvis prioritet. Fallback må kun
  fylde et reelt hul eller udløbet data efter policy; gyldig DMI må ikke
  overskrives af en sekundær leverandør.
- Nye gyldige rækker erstatter gamle; ved hul beholdes gammel række så længe
  dens egen gyldighed ikke er udløbet; først derefter bliver feltet
  `MISSING`. Denne relation skal følge hver komponentrække, ikke kun hele
  zoner.
- Strøm-U og strøm-V bindes atomisk til samme collection/modelRun/time/celle/
  lag. De må ikke sammensættes fra forskellige kilder eller dybder.
- Vandstand er en særskilt DMI-only-komponent i den nuværende policy; dens
  routing må ikke erstatte andre komponenter eller gøre hele zonen missing.
- Feggesunds direkte/proxy/missing-disposition er en lokal binding på præcis
  tre dele × 118 timer; dens lokale `MISSING` må ikke blive national datatab,
  men må heller ikke tælles som fuld dækning.

### 4. Current, interpolation og pile

- Strømvælgeren prioriterer nærmeste gyldige fælles U/V-kolonne før dybeste
  lag; laget vælges selvstændigt pr. native time.
- Interpolation er kun gyldig mellem samme collection, modelRun, punkt,
  gitterkoordinat og lag. Skift i en af dem binder perioden til `MISSING`.
- UI-pilens tid, celle og retning skal komme fra den valgte score-/visningstime
  for den samme lokale del. Byggetid, parentzone eller en anden forecasts celle
  må ikke bruges.

### 5. Score, state og lokale resultater

- Weather row → integreret input → state-6 → score bounds/reasons →
  presentation. Hvert led skal bære samme modelbinding, reference-time og
  zone/part-kontekst.
- Historik bruger `productionReferenceAt`/valgt sampletime, ikke senere
  `generatedAt`. `HISTORY_INCOMPLETE` er en legitim kvalitetstilstand; den må
  ikke blive til `UNAVAILABLE`, og missing må ikke opfindes som historik.
- `FULL_HISTORY`, `HISTORY_INCOMPLETE`, `UNAVAILABLE`, `partial-zone` og
  `READY` er forskellige tilstande. De må ikke bindes sammen via et enkelt
  boolfelt eller en gammel scoreprofil.
- En local-zone-score skal føre `status`, score spread, valid/expected part
  count, unavailable parts og aktiv modelbinding samlet til forecast, ranking,
  forklaring og debug.
- Integrated og Candidate G må aldrig blandes på tværs af zoner, timer,
  jagtformer eller filer. Candidate G er privat reserve/orakel, ikke en skjult
  offentlig fallback.

### 6. UI, data-service og brugerkontekst

- Den valgte lokale del, tidspunkt, score, forklaring, debug, vejr og kort-
  fremhævning skal komme fra én display-context. `condition.current` fra
  hovedzonen må ikke vises under en lokal vinder.
- Femdøgnsvisningens `bestForDay`, score, tid, pil og vejr skal genbruge samme
  lokale valg som national prognose; en ny generisk best-time-selector må ikke
  splitte konteksten.
- Public manifest, conditions, detailpakke og coastal-parts-filer skal dele
  dataset, production time, model binding og identity hash. Data-service må
  ikke blande gamle filer fra en anden generation.
- Trip/observation → zone → part → valgt tidspunkt → snapshot/provenance. RLS-
  ejer (`user_id`) er separat fra faglig modelidentitet og må aldrig bruges som
  scorebevis.
- Auth, assistant og Edge headers skal referere til den aktive modelbinding,
  men må ikke eksponere private payloads eller hemmelige kontrakter.

### 7. Database, migrations og drift

- Repository migration → linked Supabase migration → faktisk funktionshash →
  readback. En ny append-only migration skal være canonical kilde for netop
  de funktioner, den genindsætter; en gammel migration må ikke fortsat være
  forventningskilde.
- Trip-policy, checkpoint-CAS, public-hour delivery, current-input,
  fallback-, local-unavailable- og privacyfunktioner har hver deres kontrakt-
  identitet, men skal bindes til samme runtime identity hash.
- Edge/function deployment, central active RavScore og browserens modelheaders
  skal referere til samme model- og source-head. En grøn function deploy med
  gammel modelbinding er ikke produktionsbevis.

### 8. Artifact, Pages og versionskæde

- Private runtime → generated public files → manifest → Pages upload → Pages
  terminal readback. Alle skal bære samme `identitySha256`, source-head,
  dataset, targettime og implementation closure.
- Run ID, attempt, deployment ID, repair ID og public manifest hash er
  operationelle bindinger; de må ikke blandes mellem retries eller recovery-
  runs.
- Versionen skal være ens i releasefelt, datafiler, service worker, admin-
  konfiguration, changelog, RDKS og bundle metadata. Versionssynkronisering må
  ikke ændre geometri eller datapayload.

## Konklusion efter anden gennemgang

Den første liste manglede især relationerne mellem datafelter og processer.
Den udvidede liste dækker nu både identiteter og de semantiske koblinger, som
kan give en forkert, men formelt gyldig, prognose. Centraliseringen skal derfor
have to lag:

1. ét hashbundet runtime-manifest for generationens identitet; og
2. validerede component-/geometry-/display-views, som beviser at data er
   koblet rigtigt til sted, tid, leverandør og brugerflade.

Et enkelt `version`- eller `bindingCurrent`-felt kan ikke erstatte lag 2.

## Plan for oprydningen

1. Kortlæg hver producent og consumer ovenfor til konkrete felter og hash-
   beregninger; ingen ændring i drift endnu.
2. Indfør ét lille, versionsbundet `runtime-identity`-modul/manifest med
   schema- og canonical-hashkontrol.
3. Lad workflow, migrator, private runtime, checkpoint, Pages og browser læse
   manifestet; behold kun kontroller, der validerer inputtet mod det.
4. Fjern historiske hardcodes én gruppe ad gangen, med målrettet regression
   for hver forbruger og én exact-head-kontrol på den samlede PR.
5. Først efter stabil normal vejrdrift må gamle duplikater ryddes ud.

Det betyder ikke, at bindingerne skal fjernes. Det betyder, at de skal have én
autoritet, så en ny model-/vejr-/deploygeneration ikke skal opdateres manuelt
17 steder.
