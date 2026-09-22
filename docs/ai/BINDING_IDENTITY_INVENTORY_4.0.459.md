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
  `20260922170000_integrated_model_binding_successor.sql` er database-
  producenter; `20260922100000_integrated_trip_binding_repair.sql` bevares som
  immutable historik;
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
7. **Modelbundle-drift (4.0.464):** PR-gaten fandt, at ny runtimekode havde
   fået en ny transitive `modelBundleSha256`, mens den seneste historiske SQL-
   migration stadig bar forgængerens hash. Den gamle migration måtte ikke
   redigeres; et append-only successor-led blev den nye producent, og schema,
   installer, Edge, admin, fixtures og gates blev synkroniseret.

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

## Procesmatrix – også de processer der ikke må blandes ind i production identity

| Proces | Skal bindes til runtime identity | Skal have separat identity |
| --- | --- | --- |
| `run-current-weather-once.yml` / `update-and-deploy.yml` | main-head, targettime, checkpoint, provider-plan, runtime, artifact, deploy | run/attempt og scheduler-watchdog evidence |
| `deploy-code-only-repair.yml` | current public target, predecessor identity, model/DB/Pages views | code-only purpose, repair-id og no-provider proof |
| `reusable-weather-build.yml` | component plan, source/provenance, cache ledger, full/partial disposition | provider request IDs, retry attempt og per-provider logs |
| `validate-copernicus-current-pilot.yml` | centralt geometry-/pointfingeraftryk og targettime | pilot purpose, private credentials scope og 168-timers cache |
| national geometry/admin workflows | godkendt geometri-version når inputtet bliver produktionsaktivt | candidate source-run, QA-artifact og owner-review |
| `reusable-operational-reentry.yml` / Pages recovery | public manifest, sealed target, source-head, run/attempt | reconciliation attempt og terminal recovery evidence |
| `deploy-trip-storage.yml` / observations | aktiv schema- og RLS-kontrakt | migration/run identity for tabellen; aldrig score-datahash |
| assistant Edge og auth | aktiv public modelbinding, API contract og user/RLS context | provider request/response, rate-limit og secret scope |
| browser/data-service | public identity view, display-context, zone/part/time | browser session, locale og local UI state |
| private research/legacy Candidate G | eksplicit source/geometry/target og `scoreImpact=false` | research candidate/rollback identity; må ikke blive production identity |
| tests/sourcegate | exact commit og kontraktfixture | test-run/fixture identity; testfejl må ikke ændre runtime-manifest |

Denne opdeling forhindrer, at fx en pilotkørsel, en testfixture eller en
recoveryattempt bliver behandlet som en ny offentlig vejr-generation.

## Tredje helikopterkontrol: fire slags bindinger, som ikke må blandes

Den anden gennemgang fandt en vigtig afgrænsning, som den første inventory
stadig manglede: en SHA eller et tidsstempel er ikke nødvendigvis en aktiv
produktionsbinding. Hver forekomst skal derfor også have en **bindingklasse**.

| Klasse | Eksempler | Regel |
| --- | --- | --- |
| `LIVE_RUNTIME` | den nuværende protected runtime, vejrbygningens target, public manifest og browserens identitets-view | Må kun produceres ét sted og skal læses af alle consumers via manifest/view. En gammel literal her er en fejl. |
| `IMMUTABLE_HISTORY` | append-only Supabase-migrationer, `schema.sql`'s historiske funktioner og gamle releaseposter | Må ikke omskrives for at få nutiden til at passe. Historien valideres som historik og får sin egen migrations-/funktionsidentitet. |
| `EXACT_RECOVERY` | `recover-live-ravscore-central.yml` og missed-cutover-grenen i `deploy-code-only-repair.yml` | Må godt indeholde en gammel SHA, men kun når den er en eksplicit, navngiven og uforanderlig recovery-måldokumentation med artifact-, run-, manifest- og offentlighedsbevis. Den må aldrig blive normal runtime-default. |
| `FIXTURE_OR_RESEARCH` | måltests, Candidate G/private research og pilot-artefakter | Skal være tydeligt mærket som fixture/research, have `scoreImpact=false` hvor det er relevant og må ikke kunne levere public production identity. |

Den konkrete kontrol fandt derfor ikke en ny produktionsfejl i de historiske
SHA'er alene. Den fandt i stedet to steder, der skal klassificeres eksplicit
før en fremtidig centralisering:

1. `deploy-code-only-repair.yml` bruger `fa418f43...` i den eksakte missed-
   cutover-verifikation. Det er en `EXACT_RECOVERY`-binding til den allerede
   offentlige 4.0.410-generation, ikke den aktuelle main-head. Den skal blive
   stående, men kun sammen med recovery-run/artifact/manifest-beviset; den må
   ikke flyttes ind i den normale predecessor- eller weather-path.
2. `recover-live-ravscore-central.yml` bruger `ca2735af...` og de tilhørende
   artifact-id'er, run-id'er, størrelser og digests til én historisk
   maintenance-recovery. Det er ligeledes `EXACT_RECOVERY` og skal testes som
   en lukket historisk operation, ikke behandles som en live identitet.

Det samme princip gælder de begrænsede forgænger-heads i
`reusable-weather-build.yml` (`4bee5b0d...`/`d4e8844e...`): de er kun lovlige
som en eksakt, auditerebar gammel reader under den målte wave-overgang. En
statisk linter må derfor ikke blot forbyde alle SHA-literals; den skal afvise
u-klassificerede literals i live paths og kræve en eksplicit klasse for
historie, recovery og fixtures.

### Processer, der også skal med i bindingstabellen

For at undgå at centraliseringen kun dækker de synlige weather-/deploytrin
skal den endelige tabel også have en række for hver af disse processer:

- normal scheduler, watchdog, concurrency-lås, target registry og rotation;
- DMI HARMONIE/IFS, marine-reserve, Copernicus og Open-Meteo med deres egne
  modelrun-, collection-, celle-, lag- og retry-identiteter;
- private cachejournaler, durable checkpoint, bank/shadow/IN_PROGRESS og
  terminal READY, inklusive resume efter timeout eller netværksfejl;
- geometry/admin-hydrering, water-/land-point-par, 210/673-closure og den
  lokale Feggesund-3×118 disposition;
- component merge/retention, old-valid-data preservation, DMI-first og
  fallback-gap-only for hver vejrkomponent;
- current U/V-valg, interpolation, bundlag, kortpil, display-context,
  historik/state og lokal unavailable/partial-zone-status;
- Supabase migration/function/RLS/readback, Edge/auth/assistant og trip-
  snapshots, som har separate security-/schemaidentiteter men samme aktive
  runtime identity hvor de viser produktionsdata;
- public runtime, Pages upload/terminal readback, service worker, browser-
  cache, version-/manifest-synkronisering og mobil/desktop-data service;
- code-only repair, operational reentry, missed-cutover recovery, Copernicus-
  pilot, geometry/admin-run, private research og sourcegate som separate
  procesidentiteter.

Hvis en af disse rækker både producerer og læser sin egen historiske identitet,
skal den enten flyttes til manifest/view-modellen eller mærkes som en af de
fire klasser ovenfor. Ellers kan en korrekt runtime stadig blive afvist af en
forældet kontrol, eller en gammel recoveryværdi blive brugt som om den var
aktuel.

### Sådan tilføjes en binding, som vi opdager senere

Inventaret skal være udvideligt. Et nyt fund får en ny stabil register-nøgle,
fx `weather.current.interpolationPolicy`, og registreres med:

1. bindingklasse og scope;
2. præcis producent og alle consumers;
3. source-of-truth og identitet, som den skal arve;
4. den målrettede validator/fixture og den proces, hvor den kører;
5. om den er påkrævet for live runtime, recovery, historie eller kun research.

Først når den post er klassificeret, må den kobles til manifestet. Det gør det
muligt at udvide listen uden at kopiere en ny literal til 10–20 workflows.
En ny post må heller ikke automatisk ændre den aktive model- eller
dataset-hash; den skal enten være en separat view-binding eller have en
eksplicit schema-/manifestændring med sin egen måltest.

## Konkret kontrol mod de kendte fejlklasser

Før centralisering skal en statisk audit finde og klassificere alle forekomster
af disse felter:

`sourceHead`, `datasetId`, `productionReferenceAt`, `generatedAt`,
`modelContractSha256`, `modelBundleSha256`, `bundleContentSha256`,
`candidateBundleSha256`, `contractHashes`, `implementationClosureSha256`,
`deploymentId`, `repairId`, `publicManifestSha256`, `currentReferenceAt`,
`zoneId`, `partId`, `waterPoint`, `landPoint`, `gridDefinitionSha256`,
`collection`, `modelRun`, `validTime`, `level`, `u/v`, `source`, `status`,
`identitySha256`, `migrationHash`, `checkpointDispositionSha256` og
`requestedModelBinding`.

For hver forekomst skal auditten markere én af tre roller:

1. **Producer:** må sætte feltet én gang og skal skrive det til manifest/view.
2. **Consumer:** må kun læse feltet fra manifest/view og validere det.
3. **Local evidence:** må have lokal værdi, men skal være eksplicit bundet til
   parent identity (`identitySha256`, zone/part/time eller provider asset).

En forekomst uden rolle er en fejl i selve centraliseringsarbejdet. En
forekomst med samme felt som både producer og consumer er et potentielt stale
bindingpunkt og skal have en konkret overgangstest.

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
