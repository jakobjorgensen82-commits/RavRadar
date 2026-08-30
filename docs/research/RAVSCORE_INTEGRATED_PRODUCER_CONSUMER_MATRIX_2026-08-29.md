# Integreret RavScore — producent-/forbrugermatrix

- **Dato:** 2026-08-29
- **Status:** Den samlede kæde og begge hashes i den fulde 11-feltsbinding er lokalt implementeret og mismatchtestet; slutdigests er bevidst ulåste, og samlet exact-head-, frisk-produktions- og offentlig browservalidering er fortsat cutovergate
- **Princip:** Den integrerede model må ikke udgives, før alle producenter, adapters og forbrugere er bundet til samme model og de åbne slutgates er grønne
- **Offentlig model indtil cutover:** Candidate G

## Fælles modelbinding

Alle rækker i matrixen bruger denne kanoniske binding fra `js/core/ravscore-model-contract.js`:

| Felt | Værdi |
|---|---|
| Model-id | `RRS-COASTAL-PROCESS-INTEGRATED-1.0.0` |
| Stateversion | `4.0.0` |
| Variant | `COASTAL-SUPPLY-MOBILISATION-STRUCTURAL-LAST-MILE-HUNTABILITY-1` |
| Profil | `cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-coldrestart-gapcredit1-lastmileneutral-v3` |
| Komponentskema | `ravscore-components-huntability-transport-mobilisation-v3` |
| Forklaringsskema | `ravscore-explanation-integrated-v3` |
| Parameterkontrakt | `modelContractSha256`; endelig værdi afventer regeneration på afsluttet head |
| Transitiv implementeringsbundle | `modelBundleSha256`; endelig værdi afventer regeneration over 34+ kanonisk normaliserede transitive implementeringsfiler |

Et match på model-id eller parameterhash uden resten af bindingen er inkompatibelt. Producenter og forbrugere kontrollerer både parameterkontrakten og den transitive implementeringsbundle. Dual-hash-red-team-fundet er lukket lokalt: `modelContractSha256` og `modelBundleSha256` følger den fulde 11-feltsbinding transitivt og afvises særskilt ved mismatch. Endelige værdier afventer regeneration på afsluttet head, og matrixen er ikke produktionsbevis.

## Input, state og scoreproduktion

| Område | Producent / sandhed | Forbruger | Implementeret kontrakt | Lukningsbevis / resterende gate |
|---|---|---|---|---|
| DMI vind, bølger, strøm og vandstand | DMI schema-2 bulk-/forecastcaches og tidsbundet vejrworkflow | 166-timers gapmatrix, statepipeline, generator, forklaringer og UI | Mindst 54 timers privat replayretention. Hvert native endpoint binder collection/familie, component/kind/fieldset, modelrun/lead, item/asset/acquisition, griddefinition/-celle/-afstand og eksakt `PART::<id>`/forælder/samplingkontekst. Afledte forecasttimer genverificerer samtlige native endpoints og tillader kun kontraktens tidsgeometri. Et bevist current-U/V-par er autoritativt: fart afrundes kanonisk til 0,01 m/s, toward-retning afledes fra samme par, og 360° normaliseres til 0°. Modstridende cachede fart-/retningsfelter ignoreres. | Python/JS-producer-verifier-paritet, cross-entity/grid/acquisition-forgeries, interpolation, contradictory-cache og zero/vector-wrap plus frisk exact-head-produktion. |
| Copernicus strøm-supplement | Privat schema-2 range-cache; DMI er altid førstevalg | Eksakte DMI-gap-par i kystdelsgenerator, cold bridge og strømstate | Semantisk interval er låst til `productionReferenceAt−48h … +117h` (166 UTC-timer). COMPLETE collection binder targetregistry, DMI-inputdigest, required-pair-hash, recordrefs og acquisitions; samme tid/celle/lag U/V, intet hold eller interpolation. Historisk forseglet evidens kan genbruges, mens current/future acquisition skal ligge højst fire timer fra produktionsreferencen. Samme U/V-afledte kanoniske fart-/toward-retning gælder som for DMI. Rå U/V og koordinater forbliver i privat otte-fils runtimebundle. | Exact-range/COMPLETE-seal, +117, stale-future, old-history-reuse, missing/ref-tamper, canonical-vector, spatial, protected-restore og privacygates. |
| Numeriske inputtyper | Alle aktive model-/state-/runtimeproducenter | Evaluator, migration, recovery og offentlig projektion | Fysiske tal skal være endelige JSON-tal. Numeriske strenge, booleans, arrays og objekter afvises som missing/invalid; ingen implicit `Number(...)`-reparation må skabe evidens eller score. | Type-poison-regressioner på adapter, model, state, recovery, runtime og public projection. |
| 210 zoner / 673 kystdele | Central adminkonfiguration og eksisterende kystdelskontrakt | Generator, rangering, kort, state, checkpoint og releasegate | Eksakt 210/673. Ingen geometri eller land-/vandpunkter ændres i modelsporet. | 210/673-integrationsaudit og frisk produktion. |
| Samplingkontekst | Del-id og godkendt eksisterende samplingkontekst | Statekompatibilitet, migration og restore | Stabil `samplingContextKey` bindes til afledt state; inkompatibel kontekst afvises. | State-, migration- og checkpointtests. |
| Kystnormal strøm-evidens | Integreret statepipeline | Replay, continuation og rollback | Kun afledt tid + styrke `[-1,1]`; højst 49 punkter inklusive eventuelt præ-grænse-bropunkt. Missing/gap fejler lukket. | Deterministisk replay, over-cap/gap/missing negative tests. |
| Aktuel transportstate | `ravscore-current-supply-memory` | Integreret evaluator | `0,03–0,15`, `+10/−8`, fuld 24 timer + hævet cosinus til 48, 3 timers maxgap, native hold uden bevægelse. | 12/13/14-, kernel-, cadence- og split-run-tests. |
| Bølgemobilisering | `ravscore-wave-mobilisation-state` | Integreret evaluator og forklaring | `Hs² × T`, 4/48, højst 1 times kontinuerligt trin, 3 timers friskhedsgap og højst 1 times opbygning efter missing/gap. | Opbygnings-/aftrapnings-, missing-, cold-start- og restarttests. |
| Last mile / partikelstate | Ingen lokal batymetri eller bølgeopløst surfzonemodel; `ravscore-integrated` markerer fraværet | Score og forklaring | Strukturelt uopløst og score-neutral: `delivery = transportPotential × 1`; intet fysisk interval. Modelgridstrøm, vandstandstrend eller bølger alene kan ikke give lokalt fortegn. Aagaard 2002, Jalón-Rojas 2025 og Lofty 2023 bruges som mekanistisk kildekritik, ikke som dansk kalibrering. | Retningsinvarians, `physicalDeliveryResolved=false`, `null` interval, missing og forbidden-`5.25` tests. |
| Jagtbarhed | Fælles modelkontrakt | Strand/waders-score og forklaring | Eksisterende kurver; gyldig vind og bølgehøjde påkrævet; waders-cap bevares. Bølgeuroens metodefradrag beskriver synlighed/søgemulighed og er adskilt fra `Hs² × T`-mobilisering, så samme procesbidrag ikke tælles positivt to gange. | 72 parity-evalueringer, cap-/missingtests. |
| Vandstand | DMI-vandstand + fælles best-time-politik | Forklaring og waders tie-break | Direkte scoreeffekt 0. Faldende/stigende/stabil er kontekst; waders vælger lavere, ikke-stigende og derefter tidligste ved scorelighed. | Water-neutrality- og tie-breaktests. |
| Central scoreevaluator | `ravscore-integrated` | Lokal kystdelsgenerator | Én evaluator og én 20/50/30-formel uden skjult Phase-D-base eller numerisk last-mile-faktor. | Kanoniske invariants og score-rekonstruktion. |
| Modelprofil | Versionsstyret kildekontrakt og valideret central konfiguration | Generator, admin og releasegate | Den centrale profilselection skal bære og matche den fulde 11-feltsbinding, inklusive separat kontrakt- og bundlehash. Den må ikke ommærke eller genaktivere Candidate G/adaptiv model under den nye binding. | Admin-sync/protection, exact-11-field og identity audit. |

## Migration, continuation, private runtime og recovery

| Område | Producent / sandhed | Forbruger | Implementeret kontrakt | Lukningsbevis / resterende gate |
|---|---|---|---|---|
| Schema-2-migration | `candidate-g-schema2-to-integrated-schema4-v1` | Første integrerede run | Kompatibel afledt evidens og mobiliseringsseed genbruges; gamle scorer kopieres ikke, og historik opfindes ikke. | Migration-oracle, 673-dele-fixture og first-cutover-test. |
| Recoveryprioritet | `selectRavScoreInitialState` | Atomisk per-part generator | Eksakt point-aktivering → gyldig integreret continuation fra privat runtime → gyldigt integreret checkpoint → dybt valideret Candidate G schema-2. Hver integreret continuation/checkpoint skal matche alle 11 bindingsfelter. Ugyldig exact point-aktivering stopper straks; en ugyldig ordinær kandidat må ikke skygge for en gyldig lavere prioritet. Hvis kun ugyldige kilder findes, fejler recovery lukket. | Exact-point fatal, exact-11-field, invalid-higher/valid-lower, all-invalid og mutually-exclusive selection tests. |
| Migrationens aktiveringsregel | Workflow/private runtime restore | Første integrerede run | Candidate G-import må kun ske, når hverken gyldig point-aktivering, gyldig integreret privat continuation eller gyldigt integreret checkpoint findes. | Workflow-order og mutually-exclusive restore-tests. |
| State-løs kystdel ved første target | `buildRavScoreRecoveryReplay` + allerede hentet privat cache | Atomisk per-part generator | Når ingen statekilde findes, genafspilles præcis de 48 verificerede private kildetimer target−48 h til target−1 h med strøm/bølge. Native current-hold må ikke opfinde bevægelse. Offentlige eller syntetiske pre-target-rækker udelukkes som historik. Komplette data giver `READY` ved første offentlige target; manglende eller ugyldige sources stopper med `RAVSCORE_RECOVERY_REPLAY_BRIDGE_MISSING`. | Cold-start 48 h, first-target READY, public/synthetic-row-poison og missing/invalid-bridge negative tests. |
| Candidate G-rollback | `integrated-schema4-to-candidate-g-schema2-v1` | Eksplicit manuel hel rollback | Den varme projektion findes kun som `ravScoreCandidateGRollback` i den beskyttede fulde runtime. Den bruges ikke af den integrerede score og er aldrig Pages-fil, offentlig shadowmodel eller automatisk fallback. Candidate G har separat kontrakt-SHA og transitiv bundle-SHA; slutværdier afventer regeneration. | Roundtrip på 12/13/14, gap, neutral og mobilisering samt separat Candidate G-bundleaudit. |
| Operationel modelcontroller | Beskyttet `admin_documents`-nøgle `ravscore-operational-model-activation`, schema `ravscore-operational-model-activation-v3` | Første cutover, manuel rollback/return og normal scheduler | Fire statusser (`INTEGRATED_ACTIVE`, `CANDIDATE_G_PENDING`, `CANDIDATE_G_ACTIVE`, `INTEGRATED_PENDING`) og fire overgangstyper binder source/requested/active 11-feltsbinding, source/requested manifesthash, deploy-id'er, private planer/readiness/audit, tilladelsesflag og afgrænset fejlstatus. Hver transition går source-observation → `PENDING` med bevaret central source-profil → Pages-target → eksakt offentlig implementation+210/673 → atomisk `ACTIVE`+central target-profil-RPC. Retry fuldfører ved targethash, aborterer/rekonsoliderer ved sourcehash og forbliver fail-closed ved tredje hash. | Pure transition/reconcile-, CAS-, stale-version-, pending-stop-, source/requested/third-manifest-, initiator- og exact-210/673-tests; samlet produktionsbevis udestår. |
| Privat produktionsbundle | `private-production-runtime-bundle.mjs` + workflowadapter | Næste produktionsrun før ny vejrbygning | Schema `1.0.0`, kind `RAVRADAR_PRIVATE_PRODUCTION_RUNTIME_BUNDLE`, 210/673, modelbinding og tre kontrakthashes; canonical hashes, path-/symlinkværn og atomisk restore. | Bundle create/verify/restore og corruption/cross-model negative tests. |
| Privat bundleinventory | `private-production-runtime-workflow.mjs` | Vejrbygning og driftsdiagnostik | Præcis otte filer: fulde conditions, DMI forecastcache, DMI bulkcache, forseglet Copernicus-current-range-cache, aktuel pilot history, weather health, runtime diagnostics og DMI-vandstandsstationer. Range-cachen forbliver privat og gør historisk acquisition-/coveragebevis genbrugeligt ved næste run. | Exact-inventory-, contract-drift- og missing/extra-file-tests. |
| Beskyttet fuld runtime | Privat Supabase Storage-bucket `ravradar-private-production-runtime` + pointerdokument | Bundle restore før build og publish efter gates | Komprimeret bundle ligger uden for repository/Pages. Kun service-role har adgang; pointeren bevarer kun current + previous, og restore vælger nyeste kompatible generation. Den eventuelle `ravScoreCandidateGRollback`-projektion forbliver inde i denne beskyttede runtime. | Protected create/restore/rollback, anon-denial og frisk run. |
| Kompakt continuation-checkpoint | `ravscore-continuation-checkpoint.mjs` | Næste integrerede statebuild | Policy schema 1, status `ravscore-schema4-compact-continuation`, nøjagtigt 673 stateposter, max alder 72 timer og eksakt fuld 11-felts schema-4-modelbinding for hver state samt checkpointet. | Compactness, exact-11-field, tamper, too-old/future og exact-part tests. |
| Beskyttet checkpointbackup | `protected-ravscore-continuation-checkpoint.mjs` | Restore når Actions-cache mangler | Beskyttet `admin_documents`-nøgle `ravscore-continuation-checkpoint`; validering før publish/restore; payload logges ikke. Fremtidige opdateringer kopieres ikke til `admin_document_versions`, men alle eksisterende versionsrækker bevares; ingen destruktiv cleanup. | Protected storage self-test, no-history/no-delete-migrationstest og workflow fallbacktest. |
| Checkpointprivacy | Checkpointserializer | Cache og beskyttet storage | Kun kompakt afledt state, current evidence tid+styrke, lineage og rollbackmobilisering; ingen vejrpayload, scorer, rå vektorer, koordinater eller private data. | Exact-key allowlist og negativ privacytest. |
| Ugyldig gendannelse | Exact-point-, continuation-, checkpoint- og Candidate-validatorer | Workflow | Exact point mismatch fejler straks. En ugyldig ordinær højere prioritet må ikke vælge en truthy state eller skygge for en gyldig lavere prioritet; hvis ingen tilstedeværende kilde validerer, fejler kæden lukket. Kun fravær af statekilder kan gå til den afgrænsede private koldstartsbro. | Negative fixtures og invalid-higher/valid-lower-regression. |
| Save-rækkefølge | Produktionsworkflow | Næste run | Checkpoint og privat bundle gemmes først efter endelig mål-/referencetid og fulde slutgates. | Statisk workflow-order-test og exact-head-run. |

Denne private gendannelseskæde og den eksakte 48-timers koldstartsbro er den konkrete plug-and-play-løsning på kravet om, at modellen skal kunne bruge allerede hentede vejrdata og være køreklar ved cutover uden offentlig warmup.

## Offentlig projektion, cache og privacy

| Område | Producent / sandhed | Forbruger | Implementeret kontrakt | Lukningsbevis / resterende gate |
|---|---|---|---|---|
| Offentlig runtime-envelope | `ravscore-public-runtime-contract.js` | Data service, startup og detaljer | Runtime schema `1.0.0`; kinds `RAVSCORE_PUBLIC_STARTUP` og `RAVSCORE_PUBLIC_DETAILS`; dataset, reference, body-hash og fuld modelbinding kontrolleres. | Public-runtime contract tests. |
| Kompakt startup | `public-conditions-lib.mjs` | Første kort-/listevisning | Eksisterende payload schema 3 med eksakt allowlist og runtime-envelope; kun nødvendige aktuelle vindere og sikre felter. | Startup schema/hash/size og privacytest. |
| Lazy detaljer | `public-conditions-lib.mjs` | Zonedetalje, femdøgn, komponenter og forklaring | Eksisterende detail schema 2 med nested allowlist; ingen continuation/state/evidence/rå U/V. | Detail schema, lazy-load og rekursiv negative-key-test. |
| Schema-4-manifest | Offentlig runtimebygger | Data service, cache og releasegate | `schemaVersion: 4`, complete; dataset/reference/modelbinding, filhashes, body-hashes og bytes bindes atomisk. | Manifest mixing/hash/atomicity tests. |
| Pages live-allowlist | Produktionsworkflow | Offentlig desktop/mobil | Hele `data/live/` ekskluderes; kun `manifest.json`, `public-conditions.json`, `public-condition-details.json` og `coastal-parts-v2.json` installeres. | Exact-file audit af `_site/data/live`. |
| Pages privacy | `audit-pages-artifact-privacy.mjs` | Deploygate | Rekursiv audit af hele artifactet afviser private conditions, DMI-caches, pilot history, checkpoint, state/evidence, rå U/V, private stier og modelmix. | Privacy self-test plus artifactaudit med privat manifest. |
| Offentlig kystprojektion | `coastal-parts-v2.json` under eksisterende public allowlist | Kort og lokale scoreadapters | Eksisterende udtrykkeligt tilladte kystdel-/flowpointfelter bevares. Modelsporet ændrer ikke geometri eller land-/vandpunkter. | Offentlig kystprojektions- og 673-dels-test. |
| Data service/cache | Manifestbundet loader | App startup, detaljer og resume | Afviser blandet dataset, reference, model eller hash; kan ikke hente private runtimefiler. | Cold-start, resume, fallback og cross-model rejection. |
| Fuld conditions | Privat produktionsruntime | Generator og beskyttet drift | Må aldrig hentes eller downloades af offentlig/adminbrowser. Admins sikre overblik bruger den offentlige conditionsprojektion; privat status kommer fra beskyttede dokumenter. | Admin source/security tests og Pages privacy-audit. |

## Offentlige og beskyttede forbrugere

| Forbruger | Producent / adapter | Implementeret binding | Lukningsbevis / resterende gate |
|---|---|---|---|
| Aktuelt kort og zoneliste | 673-dels offentlig projektion | Samme lokale vinder, score, tidspunkt, vejr og modelbinding i ét datasetsnapshot. | Local-display consistency og offentlig browseraudit. |
| Nationale ranglister | `direction-broad-19-v1` | Samme comparator i generator, UI og assistenter; rå score adskilles fra ranking score. | Mode/ranking consistency. |
| Bedste tidspunkt | `score-water-tie-earliest-v2` | Samme tidsvalg i zonedetalje, femdøgn og assistent; ingen skjult beach-vandregel. | Tie/missing/future-only tests. |
| Zonedetaljer | Public details + lokal vinder | Viser del, komponenter, vandkontekst, strukturel last-mile-status og begrænsninger. | Detail schema og desktop/mobil. |
| Femdøgn | Offentlig runtimebygger | Beregnes fra samme integrerede lokale model for begge jagtformer over den eksakte sammenhængende 118-timers UTC-akse fra `productionReferenceAt` til +117 h. | 210 × 118 × 2 modes; manglende time og fem-isolerede-timer-negative fixtures; top-5. |
| Strand/waders | Public modeladapter | Komponentnøglen `release` er den sikre offentlige projektion af mobilisering; waders-cap og metode holdes synlige. | Mode-, copy- og score-rekonstruktionstests. |
| DA/DE/EN | `js/i18n.js` og fælles facts | Samme modelnavn, nul vandstandspoint, ingen helscore-13h-påstand, ingen numerisk last-mile-faktor. | Exact-string/forbidden-copy og browseraudit. |
| Lokal Spørg RavRadar | Faste facts + lokalt datasetsnapshot | Samme lokale vinder, vejr, ranking og best-time; forklarer uopløst last mile uden fundpræcisionspåstand. | Lokale fixtures i tre sprog. |
| Edge Spørg RavRadar | Delte sikre facts/evidens-id’er og requestens modelbinding | Ingen rå data, koordinater, privat runtime eller falsk surfzonepræcision. Manglende/forkert modelbinding giver eksakt HTTP `409`; en gammel klient bruger derefter sin lokale Candidate G. Ved operationel rollback afviser den fortsat integrerede Edge også den eksakte Candidate G-binding med `409`, hvorefter klienten bruger deterministiske lokale DA/DE/EN-svar. Der returneres aldrig et blandet serversvar. | Fixed-answer/evidence/privacy-, gammel-klient/ny-Edge-, rollback-local-only- og cross-binding-tests. |
| Turstart | Atomisk lokalt scoresnapshot | Binder faktisk model/state/profil/bundle, dataset, tid, del og metode. | Trip model-binding contract. |
| Afsluttet tur | Turstore/adapter | Startbinding forbliver immutable og må ikke overskrives af senere appstate. | Storage roundtrip/parity. |
| Manuel historisk observation | Brugerformular/store | Opfinder ikke historisk modelbinding; ukompatibel indberetning er ikke kalibreringsevidens. | Flexible reporting test. |
| Observation/model mapping | Tur-/observationsadapter | Top-level modelversion er den faktiske RavScore-binding, aldrig appversion eller adaptiv version. Schema 3 accepterer kun den eksakte integrerede 11-feltsbinding eller den forseglede eksakte Candidate G-11-feltsbinding. Integrated er kun eligible ved zone-/kystdelsparitet; Candidate G er altid `calibration_eligible=false`. Ukendt/forfalsket binding afvises. | Mapping/privacy-, exact-binding-, forged-binding- og rollback-calibration-test. |
| Konto/turlog | Konto-DTO og modelbundet turadapter | DTO'en bærer kun privacy-sikker eksakt `model_binding`. Pages udleder status mod det aktive kanoniske overlay og ignorerer en stale serverlabel uden at ommærke den gemte tur. Under integreret drift er integrerede ture current og Candidate G historiske/ineligible; under Candidate G-rollback er Candidate G current-ineligible og integrerede ture historiske. | `test-user-account-trip-log-4.0.264.mjs` samt tur-DTO-/modelbindingstest med begge overlays. |
| Supabase parity | Shared trip store/database | Bevarer modelbinding og tilladte kalibreringsfelter uden at lække private felter. Shared submit-validator og SQL håndhæver samme eksakte integrated/Candidate G-allowlist og afviser enhver tredje binding. | Parity/RLS/exact-binding tests. |
| Admin conditions-overblik | `public-conditions.json` | Browseren bruger kun den offentlige projektion. Fuld conditions-download og private Pages-stier findes ikke. | Admin source/security tests. |
| Admin runtime/health/staging | Beskyttede `admin_documents`-/runtime-/health-assets | Privat driftsstatus hentes beskyttet og fejler lukket, hvis den ikke er tilgængelig. | Admin loader/fail-closed tests. |
| Ekspertflade | Versionsstyrede forslag og beskyttet admin | Forslag ændrer ikke direkte den aktive model; modelmodenhed og strukturel usikkerhed vises. | Reachability/permission tests. |
| Markdown- og webhåndbog | Fælles dokumentationssandhed | Samme årsagskæde, missing, vandstand, migration, privacy og last-mile-begrænsning. | RDKS/handbook merge/language tests. |

## Fjernet offentlig adaptiv model

| Led | Faktisk kontrakt |
|---|---|
| Offentlig app | Importerer ikke den adaptive model som RavScore-ejer. |
| Pages-artifact | Ekskluderer `js/core/adaptive-model.js`, `js/core/prediction-engine.js` og den pensionerede `js/ui/admin-app.js`. |
| Score og modelversion | Må kun komme fra den kanoniske integrerede binding efter cutover. |
| Historisk/intern kode | Kan fortsat eksistere til regression, datahistorik eller interne værktøjer, men er ikke en offentlig model, fundchance eller fallback. |
| Admin | Kalibreringsvisning er read-only og kan ikke aktivere en lokal/adaptiv offentlig model. |

Det er derfor forkert at beskrive den adaptive model som “supplerende offentlig vurdering”. Den er fjernet fra den offentlige runtimekontrakt.

## Workflow, audits og release

| Område | Producent / sandhed | Forbruger | Implementeret kontrakt | Lukningsbevis / resterende gate |
|---|---|---|---|---|
| Central konfiguration | Admin-sync og beskyttede assets | Workflow/generator | Stale Candidate G-konfiguration må ikke ommærke den integrerede model; eksakt schema/modelvalidering. | Sync/protected merge tests. |
| Supabase-migrationsrækkefølge | `20260829010000_ravscore_operational_documents_no_history.sql` og `20260829020000_integrated_trip_calibration_binding.sql` | Database, privat runtime og trip-schema | Operationelle private runtime-dokumenter/bucket anvendes først, derefter schema-3-tur-/kalibreringsbinding. Første migration stopper kun fremtidig versionskopiering for allowlistede driftsdokumenter og bevarer eksisterende historikrækker uden destruktiv cleanup. Protected readiness binder begge id'er og skrives først efter samlet migrationsmetadata-, database- og Edge-readback. Dublet versionsprefix og alfabetisk tilfældighed er forbudt. | Migrationsinventory/order/no-delete-test, DB-/Edge-readback og protected readiness. |
| Backend exact-head write-lock | `deploy-trip-storage.yml` | Supabase-migration, D1/Edge-cutover og protected readiness | Efter migrationshistory/dry-run genhentes `origin/main`; `origin/main`, checkout `HEAD` og `GITHUB_SHA` skal være ens umiddelbart før første eksterne backendskrivning. Alle post-write-trin fortsætter fra samme checkout og isolerede migrationssnapshot. | Workflow-order-test med main-moved-negativ fixture samt exact-head-run. |
| Backend/Edge-forberedelse | Bindingsbevidste serverkontrakter | Gammel Candidate G-klient og kommende integreret klient | Forberedes før offentlig Pages-aktivering. Requesten behandles kun under sit datasets fulde modelbinding; ingen ommærkning, modelmix eller alternativ score. Manglende/forkert binding giver eksakt `409`, hvorefter gammel klient bruger lokal Candidate G. | Gammel-klient/ny-backend, ny-klient/ny-backend, exact-409 og cross-binding negative tests. |
| Første integrerede aktivering | Controller `INITIAL_INTEGRATED_CUTOVER` + versions-CAS `expectedVersion=0` | Produktionsworkflow, central profil og offentlig modelidentitet | Push-only. Observer Candidate G-kildemanifest; skriv `INTEGRATED_PENDING` uden at ændre central Candidate-profil; deploy exact integrated Pages; verificér implementation+210/673; sæt derefter `INTEGRATED_ACTIVE` og central integrated 11-feltsprofil samtidigt via service-role-RPC. | Initial-no-row, source-profile-held, public-target-verify, RPC-atomicity og crash/reconcile-tests. |
| Candidate G rollback og integreret return | Forseglede private planer + operationel controller | Offentlig score, central profil, Pages-klient, Spørg RavRadar og schema-3-turlagring | `CANDIDATE_G_ROLLBACK` og `INTEGRATED_RETURN` er manual-only og bruger samme PENDING/source-target-reconcile. Candidate Pages giver integreret Edge-`409`, lokale DA/DE/EN-svar og eksakt Candidate G-bundne schema-3-ture med `calibration_eligible=false`. Kontoen viser dem `current-ineligible` under Candidate-overlayet og integrerede ture historisk uden at omskrive bindinger. | Fault-injection ved source/target/third manifest, CAS, Pages og offentlig audit; exact-409/lokale svar, exact-/forged-binding, DTO-reklassifikation og returntests. |
| Scheduler/workflow | `update-and-deploy.yml` + operationel controllerreadback | Privat build, offentlig projektion og deploy | Restore privat bundle/checkpoint før build; validering/releasegate før save og deploy; lean Pages-artifact med fire livefiler. Enhver `PENDING` stopper fail-closed. Scheduler må hverken førstegangsaktivere, rollbacke eller returnere; den kan kun udføre `CANDIDATE_G_REFRESH` for allerede `CANDIDATE_G_ACTIVE` med uændret eksakt Candidate G-binding. | Statisk workflow-/pending-/initiator-/bindingstest og frisk exact-head-run. |
| Integreret runtimeaudit | `audit-ravscore-integrated-public-runtime.mjs` | Workflow/releasegate | Kontrollerer eksakt 210/673, alle 118 sammenhængende timer, begge modes uden unavailable rows, score-rekonstruktion, modelkonsistens og private-key-fravær. Fem brugbare kalenderpunkter er ikke dækning. | 210×118×2-self-test, hole-/isolated-five-negative fixtures plus frisk produktion. |
| Releasegate | `release-gate.mjs` og privacy-audit | Deploy | Afviser mixed model/hash, unavailable state, privat runtime i Pages og uafklaret artifactintegritet. | Negative fixtures og grøn exact-head-run. |
| Browseraudit | Offentlig app | Releasebevis | Desktop 1440×900 og mobil 390×844: score, farver, detaljer, femdøgn, assistent, console og overflow. | Exact-merge offentlig audit. |
| RDKS/version/dokumentation | Versionskæden | Mennesker og gates | Beslutning, status, issues, changelog og begge håndbøger skal være synkroniseret med kode og release-id. | `validate:rdks`, source gate og versionsdiff. |

## Tværgående fejl, der ikke må genindføres

1. Detailprojektionen må ikke shallow-copy private felter som rå U/V, state eller evidence.
2. Strømevidensloftet må ikke dokumenteres eller implementeres som 50; det er 49 inklusive eventuel bro.
3. Ture må ikke bruge `ravscore-<appVersion>` eller en adaptiv version som model-id.
4. Observationer må ikke bruge en adaptiv modelversion som RavScore-binding.
5. Lokal assistent må ikke sortere rå score anderledes end den offentlige rangering.
6. Assistentens snapshot må ikke kombinere én kystdels score med en anden zones vejr.
7. Den offentlige komponentnøgle `release` må ikke føre til en ny separat mobiliseringsmodel; den projekterer samme integrerede mobiliseringskomponent.
8. Vandstandstie-break må ikke omsættes til skjulte scorepoint.
9. `data/model.json`, adaptiv 25/40/35 eller historisk predictionkode må ikke fremstå som alternativ offentlig RavScore/fundchance.
10. Adminbrowseren må ikke hente `conditions.json`, DMI-caches, pilot history eller checkpoint fra Pages.
11. Checkpoint/bundle må ikke gemmes før slutgates eller bruges på tværs af model/hash.
12. Candidate G-import må ikke fortsætte som normal schema-4-recovery efter første cutover.
13. `5,25 %` må ikke genindføres som aktiv faktor, midpoint eller fysisk interval.
14. To Supabase-migrationer må ikke dele versionsprefix eller få semantisk rækkefølge fra filnavnets alfabetiske rest.
15. Ved ethvert modelskift skal central profil forblive source under `PENDING` og først blive target samtidigt med `ACTIVE`, efter at target Pages er offentligt verificeret. Source/requested/third-manifest-reconciliation må aldrig efterlade en falsk aktiv profil; ved Candidate G-rollback afviser assistentens integrerede Edge bindingen med `409` og udløser lokal klientbesvarelse.
16. En rollback må ikke deploye en særskilt Candidate G-assistent-Edge eller lade Candidate G-ture indgå i integreret kalibrering.
17. Backendcutover må ikke begynde at skrive efter dry-run, hvis `origin/main` er flyttet fra `GITHUB_SHA`, og post-write-rækken må ikke skifte snapshot.
18. Et verificeret U/V-par må ikke kombineres med parallel cached fart/retning; de kanoniske afledninger skal komme fra samme beviste par, inklusive 360°→0°.
19. Numeriske strenge eller andre coercible værdier må ikke passere som fysiske JSON-tal i nogen aktiv model-, state-, recovery-, runtime- eller public-projektionsgrænse.

## Definition af lukket plug-and-play-gate

Matrixen er først samlet lukket, når:

- alle input, stateproducenter, private recoveryled og offentlige projektioner bruger den samme fulde modelbinding,
- private bundle og schema-4-checkpoint beviser øjeblikkelig køreklarhed uden ny historikopbygning,
- Pages-artifactet indeholder præcis den fire-filers live-allowlist og består rekursiv privacy-audit,
- startup, detaljer og manifest er dataset-, reference-, hash- og modelatomiske,
- Supabase-migrationerne har unikke monotone identiteter, og gammel-klient/ny-backend samt central-/Pages-rollback er bevist,
- første integrerede cutover, Candidate G-rollback, Candidate-refresh og integreret tilbagevenden bruger samme durable source/requested-manifest-reconcile, bevarer source-profil under `PENDING` og atomiserer `ACTIVE` med central target-profil; assistent-Edge-`409`, lokale DA/DE/EN-svar og Candidate G-bundet schema-3-lagring er bevist,
- alle 210 zoner og 673 dele er READY under den samme model eller releasen stopper,
- ranglister, bedste tidspunkt, zonedetaljer, femdøgn, strand/waders, DA/DE/EN, lokal/Edge Spørg RavRadar, evidens-id’er, ture/observationer, admin og ekspertflader er regressionsbevist,
- den adaptive model ikke kan blive offentlig scoreejer eller fallback,
- exact-head-kildegate, frisk fuld produktion, releasegate og offentlig desktop/mobil er grønne,
- dokumentationen siger faktor 1, intet fysisk last-mile-interval og ingen empirisk fundpræcision,
- og konkret modstridende evidens er lukket før merge.
