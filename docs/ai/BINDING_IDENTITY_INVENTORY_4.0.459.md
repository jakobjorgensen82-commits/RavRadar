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
