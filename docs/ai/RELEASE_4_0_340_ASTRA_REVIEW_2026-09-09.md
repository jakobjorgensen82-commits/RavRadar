# 4.0.340 – samlet Astra-review, 2026-09-09

## Afgrænsning og ærlig status

Dette er det samlede review af PR #274, ikke produktionsgodkendelse. De oprindelige WAM-måltests var ikke tilstrækkeligt bevis for releasepakkens afledte bindinger. Kildegate 34391930353 på 8f752334 fandt stale bundles. Efter opdatering af kun bundles fandt 34393986579 på 2c71ac0f stale SQL-/profil-/Edge-/releasebindinger. Begge er reel mangelfuld releaseforberedelse, ikke ligegyldige testfejl.

## Samlet rettelse

1. Python-finalvalidator og JavaScript Forecast Store vælger samme sikre WAM-serie: eksakt række først; ellers nærmeste endepunkter pr. collection/modelkørsel/gitter/celle og højst fire timers afstand. Hele bølgetuplen og retningen skal være gyldig før rangering af alternativer. Reviewet reproducerede en ugyldig antipodal serie, der skjulte et gyldigt alternativ. Eksisterende delvise Hs/T-input med ukendt retning bevares, når intet fuldt alternativ findes.
2. Integrated- og Candidate G-rollbackbundles genbygges. WAM-inputadapteren indgår i kontrolsummerne selv om scoreformlen er uændret.
3. Migration `20260909194000_wam_same_run_resolution_binding.sql` er en reproducerbar append-only videreføring af den allerede anvendte horizon-migration. Kun tre integrated-, to rollback-, én continuationhash samt to readbackversionsreferencer ændres; derudover en kommentar. Ingen gammel migration ændres, og der er ingen cache-/rækkeomskrivning eller ændring af SQL-beslutningslogik.
4. Modelsync forbinder schema, installer, seneste migration, lokal profilskabelon, assistentkontrakt, fixture, vidensfil og releaseversion. Backend/readiness/workflow og testinventarer følger alle ni migrationer og accepterer kun et eksakt applied prefix/pending suffix.
5. Kildekontrollen starter med fem eksisterende hurtige bindingschecks. Fuld releasegate og alle øvrige sourcechecks består. Fejl stopper tidligt; testens acceptkriterier er ikke lempet.

## Fastlåst bindingsbevis

- Integrated: `8a94a4ef1f33c7e9714ac5b634037ae3a4b5d9b7c2861230f32e766696d02c80`.
- Rollback: `1e6d4e747dc89be971dc01f3cc51a0710fadda4bb49920b597b359d6ca520ad5`.
- Forgængerens LF-normaliserede SHA-256: `f22ce2b3ee2e45c4fc86ce6a71b7a48543aef47dbbe014ecf41bd95558421c0d`.
- `build-wam-same-run-binding-migration.mjs --check` og den eksisterende migrationstest beviser hele afledningen. Tidligere SQL-kørselsbevis overføres kun for uændret beslutningslogik; den nye migration er endnu ikke kørt i produktion.

## Målrettet evidens

Grønne efter endelige bundles:

- WAM Python 35/35, producentintegration 24/24, Forecast Store, bootstrap-target og RavScore-produktionsadapter.
- Begge bundlegeneratorchecks, modelsync-check, release-metadata-check og append-only migrationstest.
- Integrated readiness (inklusive 8 applied/1 pending, alle prefixes, no-op og negative mismatch), installationskontrakt og checkpoint-CASE-syntaks.
- Releasekontrakt, Candidate G rollback/tripbackend, operationel aktivering, offentlig model og profiltransition.
- Sourceplanens inventar, rækkefølge, fail-fast og præcis én fuld gate. Workflowrækkefølge inkl. ni migrationsfiler.

Den fulde lokale sourcegate gentages ikke. PR'ens endelige head skal have en grøn GitHub-kildegate før merge. Dokumentations-, versions- og RDKS-kontrol afslutter den lokale pakke.

## Uafhængig helkædekontrol

De afgrænsede WAM-, bindings- og releasekædereviews fandt ingen yderligere konkret launchblokering efter rettelserne. DMI-decoder, parameter-/gitterversioner, retained-proof-kompatibilitet og providercacheformater er uændrede. En ændret modelbundlehash nulstiller derfor ikke genbrugelig vejrdata.

Handoff binder alle fem kildecacher til filhash, target, registry, run/attempt og samme commit. Installation kontrollerer inventaret før udskiftning og har rollback ved fejl. Cutover genbygger og sammenligner closure. Readiness binder commit, ni migrationer, model, Edge og frontend; Pages beholder CAS, offentlig readback og complete/abort/reconciliation.

Central admin-konfiguration er fortsat runtime-sandhed. Den eksplicitte first-cutover-vej bevarer den godkendte integrerede lokale launchprofil, mens den offentlige centrale profil stadig er Candidate G. Backendinstallationen erstatter ikke den centrale profil; selve overgangen sker i den kontrollerede cutover.

## Næste konkrete sekvens

1. Færdiggør dokumentation, målchecks og commit/push på samme PR. Kræv grøn exact-head-CI.
2. Main må først flyttes, når gammel oneoff 34387410217 har afsluttet provider-saves.
3. Efter merge køres backend og corrected-main oneoff parallelt. Den gamle grønne 4.0.339-backend attesterer ikke den nye commit/binding; nyt readback er nødvendigt. Forvent otte applied og kun migration ni pending.
4. Oneoff er valgt som første launchproducent, fordi den bygger den integrerede runtime med godkendt bootstrap, tester Feggesund 354/354 og måler engangskapaciteten. Det er ikke en generel syntaktisk afvisning af normale handoffs.
5. Kræv komplet 79.414/79.414, WAM/Feggesund, gyldigt same-main handoff og ny protected backendreadiness. Derefter godkendt first-cutover uden samtidig force, fulde post-data/privacy/capacity/release/artifact/CAS/Pages-kontroller og offentlig 210/673-modelverifikation.

Ingen datakomplethed, deploy eller bæredygtig automatik er endnu bevist. Providerbudget og faktisk leverance kan fortsat efterlade huller. Efter launch skal cachetransport bygges tabsfrit i shadow sammen med kildeattesteret 48h-Open-Meteo-historik; normal cron/watchdog-budget skal derefter verificeres. Dette må ikke glemmes eller udlægges som allerede løst.

Astra/Ultra afsluttes efter dette samlede review og pakkeverifikation/push. Sol/Ekstra høj er tilstrækkelig til den efterfølgende CI-, backend-, vejr- og cutoveropfølgning, med ny kritisk vurdering ved konkret fejl.
