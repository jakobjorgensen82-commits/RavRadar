## 4.0.350 – lokal utilgængelighed og samlet cutoverkontrol (2026-09-12, lokal kandidat)

- Cache-only-run `34706453561` viste den konkrete scorefejl: 659 dele fik gyldig `windTail`-vind afvist af en adapter, som kun tillod navnet `wind`; 14 dele manglede direkte current ved H0, heraf otte regionale fastholdelser uden synligt privat præ-H0-kildebevis.
- Adapteren validerer nu både `wind` og `windTail`, og live-current fører closure-bundne regionale kildereferencer sikkert ind i den private scorebygning. Det gælder også kommende almindelige vejrdata.
- Direkte inputmangel gør kun berørt del, jagtform og time `UNAVAILABLE` med null-score. Resten af den strukturelt komplette 210/673-pakke kan publiceres, og utilgængelige dele kan ikke vinde en rangering.
- Conditions, manifest, Pages, audit, browser, administration, ture og nødruntime deler én eksakt availabilitykontrakt.
- `integrated-cutover` gennemfører fem uafhængige kontroller og samler resultaterne. Ved fejl stopper den én gang før ekstern skrivning; hvis alle er grønne, fortsætter cutover automatisk.
- En ny append-only tolvte migration fører kun model-/continuationforseglinger og readbackversion frem. Én exact-head GitHub-kildegate og alle post-data-gates består. Se `CHANGELOG-4.0.350.md` og DEC-0132.

## 4.0.349 – fælles v2-kontrakt for state-only-strømhold (2026-09-12, lokal kandidat)

- 4.0.348 blev exact-head-valideret, merged som `c86cc2a0`, og backendrun `34697586057` genbrugte kildebeviset uden dobbelt fuld gate, anvendte alene 4.0.348-bindingen og bestod readback.
- Cachekontrol `34697760571` beviste, at de gemte vejrdata kunne genbruges uden providerhentning: DMI/Copernicus blev sprunget over, Open-Meteo var reuse-only, og current-, WAM- og freshnessgates var grønne.
- Modelbygningen stoppede bagefter, fordi live-current udstedte den gældende closuremarkør v2, mens RavScore-recovery og fixtures stadig krævede v1. Intet handoff, artifact, cutover eller deploy blev dannet; Candidate G er fortsat offentlig.
- Producent og forbruger deler nu én v2-konstant, den virkelige live-adapter testes gennem RavScore-tillidsgrænsen, og v1 afvises stadig eksplicit. Ingen score-, fysik-, vejr-, grid-, afstands- eller geometriregel ændres.
- Ny append-only `20260912141641_state_only_hold_closure_v2_binding.sql` ændrer kun tre model-/continuationforseglinger og readbackversion. Den anvendte 4.0.348-migration forbliver immutable; begge builders er versionsfastlåste og reproducerbare.
- Exact-head-CI, merge, backendapply/readback, ny cache-only-kontrol, fulde post-data-gates/handoff, cutover, offentlig 210/673-verifikation og kontrolleret normal drift afventer. Se `CHANGELOG-4.0.349.md` og DEC-0131.

## 4.0.348 – målbar model-warmup og låst cachekontrol (2026-09-12, lokal kandidat)

- Main-oneoff `34682428800` genbrugte PR #281's exact-head-kildebevis uden en anden fuld kildegate. De 193 var en rest før Copernicus; den afsluttende currentclosure var 79.414/79.414 med missing 0, og native WAM var grøn 79.060.
- Modelbygningen stoppede bagefter, fordi Candidate G-rollback krævede READY 48 timer under en tilladt målt koldstart. Intet handoff, artifact, cutover eller deploy blev dannet.
- Rollback-oraklet kan nu opbygge privat numerisk state under attesteret koldstart eller valideret `BUILDING_MEASURED_ONLY`, mens offentlige/valgbare modes forbliver unavailable/null til READY. Ukendt og legacy non-READY stopper fortsat.
- Den allerede centralt anvendte WAM-migration forbliver checksumlåst. Ny append-only migration `20260912122607_measured_rollback_warmup_binding.sql` fører kun de nye integrated-, rollback- og continuationhashes samt readbackversionen frem; backendapply/readback skal være grøn før cachekontrollen.
- En eksplicit cachekontrol fastholder target `2026-09-12T08:00:00Z`, springer DMI og Copernicus over, bruger Open-Meteo reuse-only og stopper skjulte providerkald. Ufuldstændig cache stopper uden automatisk lang genopfyldning.
- PR'ens exact-content-kildebevis må også genbruges af backendworkflowet efter live GitHub-kontrol; enhver ukendt eller modstridende evidens udløser sikkert en fuld kildegate. Alle current-, WAM/Feggesund-, provenance-, freshness-, privacy-, post-data-, handoff-, cutover- og offentlig-verifikationsgates består. Ét DMI-pass er standard for senere acquisition; runnet beviste kun pass 1, så multipass og normal rotation er fortsat åbne driftsbeviser.
- PR #282's første head `cc06fa37` bestod alle model-/privacy-/runtimeled, men exact-head-run `34695465328` stoppede sent, fordi releasegatens statiske testinventar endnu ikke indeholdt den nye migrationsbygger. Intet sourceproof blev dannet. Inventaret, packageforventningen og en ny målregression er lokalt rettet; ny head og ny exact-head-gate kræves.
- Se `CHANGELOG-4.0.348.md` og DEC-0130.

## 4.0.347 – terminalbevist DMI-fortsættelse og frisk Pages-write (2026-09-12, lokal kandidat)

- Main-oneoff `34675040245` genbrugte sourceproofet uden dobbelt kildegate og gemte alle providerfremskridt, men 4.0.346 startede kun DMI-pass 1. Open-Meteo sluttede med 42 provider-negative par efter 21 isolerede genforsøg; der var intet handoff eller cutover.
- En intern opt-in-terminalkode adskiller nu forventet, fuldt finaliseret DMI-partial fra generisk exit 2. Post-cache-exception, finalize-only og tidligere watchdoghistorik kan derfor ikke åbne næste pass.
- DKSS/HARMONIE-runtime klassificeres efter eksakte beskeder og feltformer; downloadbudget, WAM og ukendte fejl stopper. Kun dette kalds færdigbehandlede assets tæller som fremgang, og pass 3 kræver fortsat voksende DMI-pardækning.
- Pages genkontrollerer target+117h-horisonten både før begin-CAS og umiddelbart før deployment, med eksisterende reconciliation ved fejl efter begin. De bløde 90/150/240-minuttersgrænser er fortsat kun advarsler.
- Kilde-, grid-, afstands-, score- og closurekrav er uændrede. Én exact-head PR-sourcegate kan genbruges på byteidentisk main; fulde post-data-gates kan ikke. Se `CHANGELOG-4.0.347.md` og DEC-0129.
- Første PR #281-gate `34680013012` bestod releasegaten og nåede WAM-integrationssuiten, men én statisk test ledte stadig efter de gamle direkte exitlinjer. Testen følger nu den nye terminalhelper og er grøn 63/63; produktionskoden er uændret, og en ny exact head kræver en ny gate.

## 4.0.346 – reelle bounded DMI-multipass (2026-09-12, lokal kandidat)

- 4.0.345-sourceproof blev live genbrugt uden dobbelt kildegate, men oneoff `34667430392` stoppede sikkert med 184 gennemprøvede Open-Meteo-null/grid-rester og intet handoff/cutover.
- Helkædeaudit viste, at DMI roterede hele 79.414-registeret, men at oneoff-wrapperen aldrig kunne starte pass 2 efter en runtime-uafsluttet ledger: producentens korrekte exit 2 blev returneret før den gemte fremgang blev klassificeret, og alle pass delte én 3.000-sekundersramme.
- Oneoff kan nu bruge højst tre særskilte 3.000-sekunders/4-GiB-pass. Exit-2-fortsættelse kræver exact target, valideret slutcache, kun allowlistet runtime-/lokal-skip-evidens og faktisk fremgang; et tredje strict-current-runtimepass kræver vækst i verificerede DMI-par.
- Normal drift, kilder, grids, afstande, score, geometri og fuld closure er uændrede. Se `CHANGELOG-4.0.346.md` og DEC-0128.

## 4.0.345 – varige Copernicus-segmenter og én exact-content kildegate (2026-09-12, lokal kandidat)

- Hvert afsluttet Copernicus-segment fsync'es/readback-hashes nu straks mod eksakt donorbase/reference/targets; seks receipts konsolideres gennem uændret strict bank→shadow→stage, og restart replayes uden at journalen selv kan autorisere data.
- 40.120-record benchmark reducerer seks segmenters efterbehandling 115,905 → 46,438 sekunder med byteidentisk bank, shadow og stage. Nulresultater bevarer attempt uden at opfinde native provider-tid.
- PR-sourcegaten kører én gang på exact head. Main må kun genbruge et SHA-256-identisk tracked tree efter live GitHub-verificeret PR/merge/artifact/run/job/step; enhver uvished falder tilbage til fuld gate. Post-data validate/releasegate består.
- 4.0.344-main/oneoff var negative: senest 78.381/79.414 current med 1.033 provider-negative OM-rester; WAM/Feggesund grøn, intet handoff/cutover. 4.0.345 er ikke CI-valideret, merged eller lanceret. Se `CHANGELOG-4.0.345.md` og DEC-0127.

## 4.0.344 – regionalt genbrug og målrettet vejrarbejde (2026-09-11, merged men negativ runtime)

- Originalt regionalt source/outcome-proof følger de konkrete samples; migration før recovery-write og no-loss EOF bevarer gyldige data ved native ejerskifte.
- DMI-leadbookkeeping, fair tidsdeling, LF's direkte/regionale hulgevinst og venstre kildekant er rettet. Katalogets nødvendige +120-terminal observeres separat uden at udvide 118-timerskravet.
- Copernicus genbruger præcist valideret internt checkpointarbejde med uændret streng admission/readback/recovery. Kørotationen fungerer ved time- og kvarterskadence; store tomme native-tidsrum segmenteres i fair pass med lokale fejl og immutable forsøgsbeviser.
- Faktisk læsende cache-replay beviste +656/−0 i en fast 1.658-rest. PR #278 bestod siden exact-head-sourcegaten og blev merged som `f2cc2a77`; geometri, afstande, fysik, score, SQL-migrationer og fulde artifact-/launchkrav var uændrede.
- Main-run `34635781802` sluttede med 1.335 currentrester, og oneoff `34642214559` sluttede 78.381/79.414 med 1.033 provider-negative Open-Meteo-rester. WAM/Feggesund var grøn, men intet handoff eller cutover blev dannet. DEC-0127/4.0.345 følger op på den målte checkpointflaskehals; se `CHANGELOG-4.0.344.md` og DEC-0126.

## 4.0.343 – fair providerbetjening og eksakt WAM-ejerskab (2026-09-11, lokal kandidat)

- Retter den systemiske køfejl fra oneoff `34565347360`: uløste DMI-currentfamilier får bounded fair service med vedvarende rotation, og prefetch flytter dokumenteret refresh-only arbejde efter reelle huller.
- Giver Baltic og AMM15 separate roterede Copernicus-køer med round-robin. AMM15-only kan starte straks, overlap kræver kun eksakt same-pair Baltic-bevis, og en lokal shardfejl blokerer ikke senere arbejde.
- Indfører én fælles WAM-owner-policy på tværs af plan, staging, salvage, historik og slutvalidering. Præcis to auditerede vestlige dele flyttes til `wam_dw`; samlet ejerskab er 458 DW og 212 NSB blandt 670 native dele.
- Binder owner-policy til targetregister, receipts og privat runtime. Gamle partielle receipts invalideres uden cache-reset; forkert gammel ejerproveniens ommærkes ikke og må ikke blokere korrekt ny data.
- Normal og oneoff bruger samme producentlogik. DMI → Copernicus → Open-Meteo, reelle huller før kvalitet, op til 48 timers verificeret historik og de fulde 79.414-closures består.
- Målrettede DMI-, Copernicus-, WAM-, workflow-, runtimebinding- og syntaxkontroller er grønne lokalt. Exact-head-CI, main-providerclosure, handoff, cutover og offentlig modelkontrol mangler fortsat. Se `CHANGELOG-4.0.343.md` og DEC-0125.

## 4.0.342 – granulær WAM- og Copernicus-admission (2026-09-11, lokal kandidat)

- Bevarer 4.0.341's isolerede WAM-candidate og alle promotions-/lineage-/slutgates, men erstatter whole-asset-rollback af uafhængigt gyldige søskende med complete, exact-asset-provenancebundne part/time-tuples efter fuldt assetgennemløb.
- Rejected WAM-slices forbliver uændrede; global fil-/tidsakse-/parserfejl og risiko for blandet komplet native lineage ruller fortsat hele stagen tilbage. Privat partial er cacheprogression, aldrig locked/history-complete eller launchbevis.
- Copernicus checkpoint'er eksakte returnerede native U/V-par fra et strukturelt validt shard, mens manglende bestilte timer går videre som rest. Hvert attempt gemmer de faktisk observerede native tider i det eksplicitte nested v2-contract; legacy-attempts fra 4.0.341 kan stadig læses, og Baltic-prerequisiten kan valideres efter pruning af sidste Baltic-søskende.
- Tom provider-timeakse og native tider med subsekunder er retryable malformed, aldrig no-record. Tidsinterpolation/hold, dubletter og out-of-request-rækker forbliver forbudt; den varige schema-3 seamtest beviser, at kun den eksakte rest går videre til Open-Meteo.
- Slutkravene er uændrede: current 79.414/79.414; bølger 79.060 native WAM + Feggesund 354/354; nul mangler/overlap/uløste lineage-konflikter før handoff/cutover.
- Den samlede aktuelle WAM-suite er grøn `63/63`; WAM-historik er grøn `35/35`, checkpoint er grøn `21/21`, de tre Copernicus-måltests er grønne, og Python compile samt code diff-check er grønne. Exact-head-CI, main-runtime, closure og produktion er fortsat åbne.
- DEC-0124 registrerer kontrakten, og DEC-0122's stående godkendte first-cutover-undtagelse flyttes snævert til exact-release 4.0.342. Se `CHANGELOG-4.0.342.md`.

## 4.0.341 – atomisk WAM-kandidat og kanonisk Open-Meteo-donor (2026-09-10, lokal kandidat)

- Bevarer den persistente cache uden reset og fastholder hele `673 × 118 = 79.414`-domænet, native WAM for 670 dele, Feggesund `3 × 118 = 354` samt op til 48 timers verificeret historik.
- Bygger WAM isoleret pr. collection/modelrun og accepterer kun en fil med fuld required denominator. Delvise filer kan ikke flytte aktiv cache, positive tællere, processed steps eller checkpointstate.
- Promoverer kun samme target med eksakt pair-superset og uden nye lineage-konflikter. Reelle huller/hale kan gemmes straks efter en fuldt accepteret fil; ved komplet cache promoveres ren kvalitetsrefresh samlet ved terminal faseafslutning for at undgå tretimers-seams.
- Tillader højst en bounded ældre kausal/akseopløselig WAM-fallback efter terminal primærfase, aldrig efter budget-/reserve-/interruptionsstop, og fører hvert assets egen modelrun-proveniens gennem hele behandlingskæden.
- Sorterer Open-Meteos required-par kanonisk som `(validTime, partId)`, så donorvalidering og henteplan bruger samme kontrakt, og føjer WAM-bootstrap til private-runtimens hashbinding.
- Bevarer kildeprioriteten DMI → Copernicus → Open-Meteo, gamle horizon-gyldige rækker indtil atomisk bedre erstatning og fallback uden permanent kildelås.
- Lokal evidens: WAM 52/52, historik 35/35, vejrplan 17/17, Open-Meteo-donor 32/32 samt grønne DKSS-, scheduler- og private-runtimekontroller. Exact-head-CI, merge, main-vejr, fulde gates, handoff, cutover og offentligt proof mangler. Normalworkflow og watchdog/shadow-dispatch forbliver deaktiveret; Candidate G er offentlig.
- Afstemmer tre gamle testforudsætninger med den allerede gældende parsergeneration 20, produktionsmodulets copy-on-write-type og den nye helper-baserede WAM-completenessgate. Rettelserne er test-only og lemper ingen runtime- eller releasekontrakt.
- DEC-0122's afgrænsede first-cutover er overført til exact-release 4.0.341 uden ændring af størrelse, storage, checkpoint, integritet, privacy, readback, closure eller kadence. Se `CHANGELOG-4.0.341.md` og DEC-0123.

## Lokal udvidelse 2026-09-10 – samlet vejrlivscyklus, måltestet; CI og drift afventer

- Exact-head-CI `34420641243` på `f44b7c9c` bestod bindingspreflight, fuld releasegate og de nye vejrlivscyklustests, men stoppede derefter på et forældet workflowtrinnavn i handoff-testen. Det gamle trin slettede source-stage; den nye godkendte kontrakt bevarer originalt Copernicus-bevis til kontrolleret donorbankmigration. Test-only-rettelsen følger og styrker denne kontrakt. Den isolerede test og alle 14 efterfølgende workflowtests er grønne; ingen produktionskode, workflow, migration, cache eller geodata ændres.
- Den foregående exact-head-CI `34417094732` bestod også bindingspreflight og fuld releasegate, men fandt én forældet target-registry-fixture. Testen forventede, at nyere `PROCESSED` metadata alene kasserede en ældre attesteret cachetuple. Den blev rettet test-only til både at bevare metadata-only-winneren og afvise gammelt proof efter reel nyere tuple+attestation.

- Bevarer hele den eksisterende 4.0.340 WAM-/bindingspakke og PR #274. Nye lokale ændringer er ikke dækket af de tidligere grønne måltests eller backendbeviser.
- Adskiller vedvarende private CP-/OM-reserver fra dagens restprojektion; bevarer originale acquisitioner og recordbundne positive beviser ved referenceskift og senere kvalitetsopdateringer.
- Tilføjer en fælles, eksakt target-/registerbundet arbejdsplan fra valideret kildeunion. Den prioriterer reelle huller, ikke blot mangler i en leverandørs egne data, uden at ændre kildeadgang eller DMI-klassifikation.
- Bevarer DMI's gyldige gamle tuple/proof til faktisk ny erstatning, fjerner dobbeltkontrol inden for samme checkpoint og lader genuine-cold-start beholde ufuldstændig historik uden obligatorisk fuld historikhentning før operationel WAM.
- Tilføjer fejlstyret OM-retry, private bank-recoverygrænser og sikker aggregeret diagnosedata. Legacycachekompatibilitet, alle writerkaldesteder og postbuild-kvalitetsforbedring indgår i integrationen.
- Afsluttende review 10. september: begge banker får originalmanifest og vedvarende konfliktmasker; CP bevarer canonical bankpointer til atomisk replace; lokale succesflag eksporteres før efterfølgende projection/reportfejl. OM-planen anvender samme in-memory-recovery som indsamlingen.
- En forkert lokal antagelse om obligatorisk parent-strøm er trukket tilbage før produktion: reelle PART-huller forbliver kritiske, mens de dokumenterede geografiske parenthuller ikke genåbner samme asset. De berørte måltests er grønne; faktisk tids-/RAM-/bankvækst er uverificeret.
- Den samlede målmatrix for plan, DMI/checkpoint/WAM, CP-/OM-banker, recovery, workflow og privat runtime er bestået. Fire testfixtures er tilpasset den besluttede rækkefølge, acquisition-, target- og handoffkontrakt; ingen produktionsregel er lempet i testfasen. Se WEATHER_LIFECYCLE_TEST_EVIDENCE_2026-09-10 i docs/ai.
- Modelbindingen er fortsat konsistent uden ny SQL-/modelhash alene fra Pythonændringerne. Ny runtimepakke skal dannes på endelig kode. Ny exact-head-CI, merge, backend, faktisk komplet vejr/handoff, vedligeholdelse og modelcutover mangler. Den gamle annullerede gate genstartes ikke.
- Ejer har godkendt Sol Ultra, autonom fortsættelse og launchovervågning. Udskudte opgaver revideres mod det, denne pakke faktisk løser; cachetransport og bæredygtig drift er ikke automatisk bevist af donorbankerne.
- Se `docs/ai/WEATHER_COLLECTION_SYSTEM_REVIEW_2026-09-09.md` og tillæggene til DEC-0118/0119/0114. De konkrete 535 rester, WAM MISSING_HOUR og bæredygtig normaldrift er åbne bevisgrænser, ikke erklæret løst.

## 4.0.340 – ens WAM-semantik fra producent til RavScore (2026-09-09)

- Samlet Astra-review retter desuden valg af nærmeste endepunkter pr. serie og fuld bølgetuple/retning før rangering, så et ugyldigt alternativ ikke skjuler et gyldigt.
- Synkroniserer integrated-/rollbackbundles og alle SQL-/profil-/Edge-/releasebindinger med append-only migration 9. Alle otte allerede anvendte migrationer er uændrede; readiness genoptager kun det præcise pending suffix.
- Flytter fem hurtige eksisterende bindingskontroller foran de tunge sourcefixtures, uden at fjerne eller svække den fulde gate.
- Den grønne backend fra 4.0.339 dækker ikke de nye hashes: efter merge kræves nyt backendbevis parallelt med corrected-main oneoff. Candidate G forbliver offentlig indtil hele launchkæden består. Se `docs/ai/RELEASE_4_0_340_ASTRA_REVIEW_2026-09-09.md`.

- Retter en dokumenteret kontraktforskel: DMI-planlæggeren kunne se en sikker WAM-interpolation inden for samme modelkørsel, mens slutvalidatoren og Forecast Store kun så de to nærmeste rækker og derfor kunne afvise ved et modelkørselsskifte.
- Eksakte WAM-rækker vinder fortsat. Kun hvis de nærmeste naboer ikke må blandes, vælges den smalleste validerede bracket fra samme collection, modelkørsel, gitter og fysiske celle; firetimersloftet består absolut.
- Bevarer fail-closed afvisning af interpolation på tværs af modelkørsel, collection, gitter eller celle. Ingen DMI→Copernicus→Open-Meteo-prioritet, cacheidentitet, geometri, scoreparameter eller offentlig model er ændret.
- Oneoff `34371642565` gemte providerprogression, men stoppede med 324 Open-Meteo-strømpar og den falske WAM-klassifikation `MIXED_RUN_INTERPOLATION`; intet handoff eller deploy blev produceret. Efterfølger `34387410217` fortsætter på den bevarede cache, mens rettelsen gøres klar.
- Backend `34371639398` forsøg 2 er grøn. Candidate G forbliver offentlig, indtil 4.0.340 har exact-head-kildegate, merge, komplet main-handoff, fulde post-data-gates, deploy og offentlig verifikation.
- DEC-0122's allerede ejerautoriserede first-cutover-binding flyttes snævert til exact-release 4.0.340; øvrige integritets-, privacy-, størrelse-, storage-, readback-, closure- og releasekrav er uændrede.
- Målrettede validator-, producent-, målbindings-, Forecast Store- og RavScore-adaptertests er grønne. Se `CHANGELOG-4.0.340.md` og `docs/ai/WAM_SAME_RUN_RESOLUTION_REVIEW_2026-09-09.md`.

## 4.0.339 – sikker genoptagelse af den integrerede backendpakke (2026-09-09)

- Bevarer 4.0.338's tre allerede anvendte migrationer og genoptager kun det eksakte pending suffix 4–8.
- Retter PostgreSQL-syntaksen i det fælles `historyTransition`-udtryk med en semantisk neutral parentes i fem pending migrationer, schemaet og installationskopien.
- Tilføjer en regressionstest, som afviser den oprindelige bare `IS DISTINCT FROM CASE`-form og kræver identiske rettede SQL-kopier.
- Dokumenterer isoleret PostgreSQL 16-bevis for migration 4–8 i rækkefølge samt grønne måltests for partial recovery, installer, readiness, releasepolicy og workflows.
- Flytter DEC-0122's uændrede one-shot-undtagelse til exact-release 4.0.339 og registrerer ejerens udtrykkelige autorisation til nødvendige successors med samme snævre grænser.
- Præciserer efter ejerens godkendelse, at den ene first-cutover må bruge Supabases officielle Free-grænse på højst 52.428.800 archive-byte; oneoffens strengere 50.000.000-byte-kontrol og alle øvrige sikkerheds-, kapacitets- og releasekrav består.
- Retter per-pair-testens forældede hash med bevis for kun to parentesers ændring; SQL-regressionen må ikke fejle på håndbogstekst. Supplerer installationsbeviset med faktiske positive/negative PostgreSQL 16.4-funktionskald.
- Dokumenterer den ekstra Astra-helkædekontrol: same-reference-handoff og backendbinding hænger sammen; aktuelle strøm-/WAM-huller samt OM-historik og bæredygtig cachetransport er fortsat åbne og må ikke skjules af et grønt build.
- Candidate G er fortsat offentlig. Exact-head, merge, produktionsbackend, komplet 4.0.339-weather-handoff, fulde gates og offentlig integreret model er åbne.
- Se `CHANGELOG-4.0.339.md` og DEC-0122.

## 4.0.338 – robust Supabase CLI-output før første backendwrite (2026-09-09)

- Fastlåser Supabase CLI til 2.117.0 og accepterer kun balancerede whole-cell-backticks før den eksakte migrationsversionskontrol.
- Bevarer fail-closed kontrol af header, kolonner, local/remote-entydighed, dubletter, rækkefølge samt dry-runnens no-write-markør og præcise filnavne.
- Bruger `--skip-vault` i både dry-run og apply, så backendplanen kun kan omfatte de otte migrationer og ikke Supabase CLI's separate Vault-secret-opdatering.
- Flytter DEC-0122's uændrede engangsundtagelse til exact-release 4.0.338 og binder policyversionen til `package.json`, så et 4.0.337-handoff afvises og 4.0.339 ikke arver undtagelsen lydløst.
- Backend `34333553305` forsøg 1 stoppede read-only på `SQLSTATE 28P01`; passwordsecretet blev rettet kl. 09:54Z. Forsøg 2 bestod auth, men stoppede lokalt på CLI-formatet. Begge stoppede før DB-, D1-, Edge-, readiness- og publicwrites.
- 4.0.337 er exact-head-grøn og merged som `af03659a`. Oneoff `34333689292` fortsætter; cachematerialiseringen er bestået, men komplet vejr, handoff og modelcutover er endnu ikke bevist.
- Parser-, workflow- og versionsbindingen er lokalt måltestet, og 4.0.338 er versionssat. Commit, exact-head-CI, merge, ny backendkørsel og live-readback mangler.
- Efter launch forbliver readiness-versioninterval, stale queued run `34228112413`, cachetransport/cron-hold og test-lane-refaktorering åbne P0-opgaver.
- Se `CHANGELOG-4.0.338.md`.

## 4.0.337 – tabsfri vejrcache og kontrolleret direkte modelcutover (2026-09-09)

- Fastlåser ecCodes og genbruger kompatible verificerede currentproofs granulært uden at omskrive original kildeidentitet.
- Bevarer gode proofs ved én defekt række og udfylder kun komplette validerede vejrkomponenter atomisk fra en kompatibel donor.
- Indfører fælles tabsfri Python/Node-codec for den store DMI-cache, retter alle fem fejl fra den afsluttende helhedsaudit og fører også oneoff-wrapperens progresskontrol gennem codec'en.
- Normaliserer en afgrænset stor legacycache til et separat kompakt output før første strenge DMI-reader i pilot, normal vedligeholdelse, oneoff og betinget punktaktivering. Originalen bevares ved fejl, mens en overstor allerede kodet fil fortsat afvises.
- Tillader direkte første integrerede cutover fra den fastlåste offentlige legacy Candidate G-kilde med ærlig manglende historik.
- Binder legacy-cutover til én eksakt succesfuld komplet oneoff. Ejerundtagelsen gælder kun archive højst 50 MB og ikke tilbagevendende automatisk drift.
- Registrerer cachetransport uden nulstilling som åben P0 før højfrekvent normal cron/watchdog.
- Opdaterer releasegatens og DMI/WAM-integrationstestens statiske bindinger til first-cutover-undtagelsen og den fælles codec-aware READY-/writevej samt gør begge tunge 210/673-public-runtime-tests hukommelsesbegrænsede uden at fjerne assertions.
- Den tidligere lokale målmatrix er grøn; read-only job `34288231609` beviser exact-codec på 760.487.472 byte/578.063 sourceposter til 94.150.151 byte med identisk logisk indhold og Node-readback. Basecommitten `bce970af` er pushet, mens den afsluttende legacy-normalisering fortsat er lokal og mangler ny samlet slutgate. GitHub exact-head, merge, main-runtime og offentlig modelaktivering er åbne.
- Se CHANGELOG-4.0.337.md og DEC-0122.

## 4.0.336 – kompakt WAM-cache og verificeret handoff fra normal kørsel (2026-09-08)

- Skriver DMI/WAM-cachen atomisk som kompakt UTF-8-JSON på alle persistensveje, så formatering ikke alene kan sprænge den uændrede hårde grænse på 256 MiB.
- Tillader, at præcis de godkendte source-steps i normal- og oneoff-workflowet genbruger ét live-verificeret grønt sourceproof på samme uændrede `main`-commit. Kildegaten er ikke fjernet, og en senere fejl invaliderer beviset på tværs.
- Gør den manuelle normale vejrkørsel til en eksplicit handoff-producent ved korrekt bekræftelse. Handoff forsegles først efter komplet providerclosure, WAM/Feggesund, fuld validate, releasegate og fornyet exact-main-kontrol.
- Bevarer partial providercacher før terminale stop. Mangler eller fejl skaber intet handoff og nulstiller ikke den validerede progression.
- Lokal målmatrix og uafhængigt P0/P1-review er grønne. Exact-head GitHub-kildegate, merge, positiv normal main-runtime, fulde produktionsgates og offentlig modelcutover er åbne.
- Se `CHANGELOG-4.0.336.md` og DEC-0121.

## 4.0.335 – vedvarende WAM-cache og sen completeness-gate (2026-09-08)

- Bevarer alle uafhængigt gyldige vejrdata og salvager kun den konkrete ugyldige bølgerække; ingen bred PART-bølgenulstilling.
- Tillader eksakte verificerede WAM-rækker på tværs af modelkørsler, men holder interpolation strengt inden for samme run, gitter og celle.
- Genbruger kun WAM-assets med eksakt kilde- og cachedækningsbevis og lader currentfallback gemme progression før den endelige fail-closed WAM-gate.
- Feggesunds tre dele afgøres fortsat af den særskilte direct/proxy-kontrakt og kræver 354/354 i slutproofet.
- Lokal målmatrix er grøn; exact-head CI, merge, main-oneoff, fulde gates og offentlig modelcutover er åbne.
- Se `CHANGELOG-4.0.335.md` og DEC-0120.

## 4.0.334 – lokal WAM-readiness-kandidat (2026-09-08)

- Fair runtime-reserve til begge kritiske WAM-familier og genbrug af allerede behandlede assets.
- Candidate G-bridge begrænset til højst fire inklusive timer; ældre ensartet target rebases til source-attesteret cold start.
- Eksakt 118-timersakse med `MISSING`, atomiske tuples, hashbundet Feggesund 3 × 118 og konkret runbundet første cutover.
- Oneoff `34161930631` beviste 79.414/79.414 strømpar, men stoppede korrekt på Feggesund; 4.0.334 er endnu kun lokal og måltestet.
- Se `CHANGELOG-4.0.334.md`.

## 4.0.333 – exact-unresolved Open-Meteo og adaptiv isolation (2026-09-07, lokal kandidat)

- 4.0.332 bestod exact-head sourcegate `34125927405` og blev merged via PR #265 som `1e1093de…`. Main-oneoff `34127986853` genbrugte cache og sluttede 79.132/79.414; Open-Meteo required 472, retained 76, fetched 114, filled 190 og missing 282. Ingen artifact/deploy/cutover.
- Open-Meteo checkpoint'er hvert succespar straks og genbestiller kun eksakte uløste `(partId, validTime)` gennem en bounded FIFO/BFS-kø. Binært split har fan-out højst to og fortsætter til singleton, så én defekt del/time ikke strander raske søskende.
- Transport er max tre forsøg pr. exact work, content ét same-work retry, total requests max 1.024, pending queue max 2.048 og én fælles monotonic deadline. Alle stop bevarer `required − selected` ærligt.
- Retrybar HTTP bruger provider-wide cooldown, også efter sidste work-forsøg. Numerisk/HTTP-date Retry-After begrænses til 15 sekunder. HTTP 400 og ukendt permanent status stopper globalt; kun 413/414 isoleres ved split.
- Privacy-safe diagnostik viser alene aggregater og budgetbooleans. Uændret gælder 15 km, target..+117, UTC/GMT, m/s/grader, combined-current-only, ingen syntese, `calibrationEligible=false` og hard 79.414/79.414 closure.
- Py_compile, udvidet Open-Meteo-test, den målrettede DMI/Copernicus/regional/closure-kæde og live builder/adapter/runtime er grønne; to uafhængige reviews er GO. Exact-head CI, merge og runtimebevis mangler endnu.

Se `CHANGELOG-4.0.333.md` og DEC-0118's bindende 4.0.333-tillæg.

## 4.0.332 – horizon-gyldigt vejr og run-bundet modelcutover (2026-09-07, lokal kandidat)

- En komplet prognoserække er brugbar uanset acquisition-/genereringsalder, så længe den eksakte forespurgte time ligger i pakkens forseglede horizon. 90/150/240-minuttersgrænserne giver nu `STALE_TARGET_VALID`-advarsel i stedet for missing/deploystop; præcis `validUntil` er gyldig, og +1 ms er udløbet.
- Den absolutte 72-timersgrænse for same-model emergency/continuation og det gamle generelle rå 72-timershistorikkrav er supersederet. Alder er fortsat nød-/confidence-/trip-/kalibreringsadvarsel, mens horizon, model, registry, hashes, completeness og trust stadig stopper fail-closed.
- Første integrerede cutover kan genbruge fem private weather-source-cacher fra ét eksakt grønt 118h-`main`-run via repository/head/run/attempt/cache/artifact/hashbundet, privacy-safe handoff og genbygget identisk closure. Det omgår ingen source-, kapacitets-, full validate-, release-, artifact-, Pages- eller offentlig gate, og `update:weather` forbliver bounded.
- DMI, Copernicus og Open-Meteo salvager parsebare cacher pr. proof-enhed: ugyldige leaves bliver ærlige huller, mens uafhængige verificerede positive par og canonical genopbygning bevares. Topidentitet, target/registry/control plane og manipulation er fortsat fatale.
- Exact `79.414/79.414`, én kilde pr. par og nul overlap/missing består. Ufuldstændig 48h historik holder alle zoner aktive med numerisk `HISTORY_INCOMPLETE`, advarsel, konservative bounds og kalibreringslås.
- 4.0.331-run `34083611297` endte 78.856/79.414 med 558 missing og intet deploy. Run `34093354004` sluttede sikkert med Copernicus success og Open-Meteo 2.735 required / 1.873 retained / 750 fetched / 2.623 filled; præcis 112 critical missing stod tilbage. Run `34104536681` på eksakt `main` `c2ce63ff` genbrugte DMI-cachen til 67.897/79.414 på 5m24s, fik 8.372 Copernicus-par og efterlod 3.145, men stoppede før første Open-Meteo-request på den lokalt rettede null-run-source-index-fejl. Copernicus-fremgangen blev gemt; ingen closure/artifact/deploy. Normal workflow er fortsat deaktiveret.
- Provider-overgangens overlap/hysterese og durable immutable multi-artifact-historik er eksplicit separate post-launch-issues.

Se `CHANGELOG-4.0.332.md` og `DEC-0119`.

## 4.0.331 – historisk sourceprecondition før kildegaten (2026-09-07, lokalt implementeret og målrettet valideret)

- Oneoff `34077360903` på eksakt `main`-head `8020cdfe539df0841246714c22705d78927c8bdb` stoppede før vejrhentning: releasegaten bestod, men `validate:source` kunne ikke slå det fastlåste historiske Candidate G-head `49dd4cb454656bdf629e5df760176705e38d2cb0^{tree}` op i workflowets shallow checkout.
- Fejlen er en sourceprecondition, ikke en provider-/cachefejl. Adminhydrering, alle vejrcacher, DMI, Copernicus, Open-Meteo, closure, runtime, kapacitet, artifact, deploy og modelcutover blev skipped; ingen vejrcachedata blev ændret. Den efterfølgende røde Open-Meteo-slutkontrol var alene sekundær til det skipped fill-trin.
- Alle vejrworkflows, som kan køre `validate:source`, materialiserer og verificerer nu det eksakte historiske sourcehead før gaten, også når operationen ikke er et modelcutover. PR-gatens fulde checkout bevares, og trip-storage harmoniseres fra eksakt HEAD-fetch til samme fail-closed HEAD+TREE-forhåndskontrol; dermed er alle sourcegate-workflows beskyttet. Checkout-head, private caches og centrale data ændres ikke af den målrettede fetch. Den fokuserede lokale matrix er grøn; exact-head-CI og runtimebevis mangler.
- 4.0.330 er supersederet før runtime, men dens provider-/cache-/fallbacklogik består uændret. Normal workflow er fortsat deaktiveret under den kontrollerede opfyldning. Frisk main-oneoff, 79.414/79.414, Feggesund 354/354, spatial audit, live kapacitet, fulde post-data gates, deploy og særskilt Phase B er fortsat åbne; Candidate G er offentlig.

Se `CHANGELOG-4.0.331.md`.

## 4.0.330 – vedligeholdelig vejrcache gennem hele fallbackkæden (2026-09-07, lokal kandidat)

- DMI prioriterer manglende/ugyldige/udløbne rækker og hale før bounded vedligeholdelsesrefresh af stadig gyldige rækker; en nyere currenttuple erstatter først atomisk efter fuld validering.
- Copernicus isolerer fejl pr. shard, bevarer genbrugelig incomplete progress uden stale residualudvidelse og sletter ikke validerede records ved rollover. Primærkørslen genbruger kun eksisterende 48t-historik; al history/advisory-netværksrefresh ligger i et ikke-blokerende, kandidat-atomisk postbuild-job.
- Et gyldigt Baltic-forudsætningsforsøg kan ved reference-rebase fortsat bære et overlappende AMM15-par inden for højst fire timer, men kun exact-current-reference-forsøg må undertrykke frisk Baltic-retry/upgrade; fallback er ikke kildelåst.
- Valgfri regional shadowevidens kan isoleres som pair-level missing, mens policy, targets, registry, DMI-ledger/attestation og gapmatrix fortsat stopper fail-closed.
- Open-Meteo schema v2 deler durable cache mellem normal/oneoff, checkpoint'er løbende, bruger fair bounded batchretry og opfrisker først mindst to timer gamle records, når den kritiske rest er nul.
- Normal og oneoff har samme sikkerhedskontrakt. Eksakt main-write-authority beskytter shared cache, den planlagte Copernicus-pilot fjernes, ekstern cron forbliver primær og GitHub-schedule reserve.
- Slutkravet er uændret 79.414/79.414; 48 timers historik er rådgivende. Candidate G forbliver offentlig, indtil frisk vejr, alle produktionsgates og særskilt Phase B-cutover er bevist.

Se `CHANGELOG-4.0.330.md`.

## 4.0.329 – DMI-modelrun-kontinuitet uden kunstig restgrænse (2026-09-06, planlagt hotfix)

- 4.0.328 bestod exact-head-kildegaten i run `34040547841`, blev merged via PR #261 som `31b98428dea163c11ded1fc1e428e27a0218a8f2` og nåede derefter DMI på `main`. Produktionsruns `34041885030` og `34044178502` stoppede imidlertid før Copernicus/Open-Meteo, fordi DMI's aktuelle attestation og assetbaserede outcome-proof divergerede.
- Første run havde 8.918 faktisk attesterede DMI-par mod 9.541 proof-klassificerede par, en forskel på 623. Efter det næste observerede kanoniske modelrunskift havde næste run 22.357 mod 25.826, en forskel på 3.469. De progressive DMI-cachetrin blev gemt; tallene er derfor bevis for brudt attestationskontinuitet og skjult genbrug, ikke for at cachebytes blev nulstillet.
- Gammel-main runs `34049794693` og `34051318868` på head `31b9842` nåede DMI og Copernicus, men Open-Meteo fejlede deterministisk med `OPEN_METEO_RESIDUAL_PLAN_INVALID_SHADOW_NATIVE_CADENCE_INVALID` henholdsvis `2026-09-06 18:16:28Z` og `18:42:49Z`; artifact/deploy blev korrekt skipped. Producenten havde gemt en hourly off-phase regional `dkss_lf`-prøve, mens consumeren gjorde selected-run `lead % 3 != 0` fatal. Det er præcis negativ runtimeevidens for regional producer/consumer off-phase-mismatch, ikke for retained-proof-admission og ikke positivt hotfixbevis. Retained-proof-kontinuiteten er alene lokalt fokustestet.
- Hotfixdesignet lader hvert genbrugt cached par beholde og genvalidere sit oprindelige per-pair/source-proof på tværs af modelruns. Genbrug kræver kompatibel processing-signatur og højst 120 timers native source-lead. Et nyt valgt assets generelle spatial-proof må ikke i sig selv ommærke en ældre cached række som aktuelt DMI-bevist.
- En active-donor valideres ved donorledgerens egen `productionReferenceAt` og dens eksakte +117-timersvindue, før kompatible rækker vælges til det nye target. Inden for DMI prioriteres reelt manglende, udløbne, interne huller og hale før sekundær refresh. En revideret officiel asset i samme modelrun må ikke fastholde den gamle revision som dækning; currenttuple skiftes først atomisk efter nyt asset-, outcome- og provenancebevis.
- Den tidligere absolutte whole-row-donorregel er supersederet. Kun en exact-proof-gated currenttuple må genbruges komponentatomart: U, V og `sources.current` flyttes samlet, primary-proof vinder, og et halvt eller uattesteret donorpar afvises. Bølge, vind, alle øvrige felter og deres kilder samt `processedSteps` bevares. En komplet donor-current-summary erstatter current-summary; ellers bevares en komplet same-grid primary-summary, mens kun partial eller grid-mismatchet current-summary fjernes.
- Den tidligere selected-run off-phase blanket-fatal-regel er scoped supersederet. Producenten skriver ikke en kanonisk off-phase regional prøve. Consumeren fastslår off-phase først efter dict og eksakt collection/modelRun/validTime samt `run <= validTime`, ignorerer den derefter før `capturedAt`/hash/`sampleKey`/spatial/vector og afleverer det eksakte par som missing til Open-Meteo. Legacybytes prunes ikke fysisk. Malformed collection/time/run og alle on-phase hash-/binding-/spatial-/vektorbeviser forbliver fail-closed.
- Den tidligere `RETAIN_PREFERRED_NATIVE_RUN`-regel, som blev udledt af `ledger.ready`, er supersederet. Exact retained per-pair/source-proofs bærer nu kontinuiteten, så både normal og oneoff skal vælge selectorens nyeste modne, native-complete run med `RETAIN_PREFERRED_NATIVE_RUN=false`, også når kandidaten er non-READY. Det fjerner 96-timers-pinningen, som ellers kunne forsinke refresh op til cirka 24 timer og skabe en unødvendig fallback-hale; selectorens `true`-path er kun dormant test/helper, ikke driftsregel.
- Hvert progressivt bulkcheckpoint forsegles før write med en ny availability-ledger bygget af allerede validerede retained proofs samt aktuelle kanoniske `processedStep`-poster og det officielle katalog. Den persistente kandidat er dermed selvkonsistent og valideres som helhed efter timeout/crash; ledgerløst checkpoint må ikke rekonstrueres til betroet state. `processedValidTimes` eller en tidligere complementliste er ikke i sig selv tillid.
- DMI's positive mængde skal være præcis de faktiske cached rækker, som den kanoniske attestation kan validere mod enten aktuelt eller bevaret kildebevis. Fallbackresten er derefter den matematiske inverse i det fulde 79.414-pars register. Der findes ingen maksimumgrænse, minimumsdækning eller fast antal, som må blokere Copernicus, regional DMI eller Open-Meteo.
- En availability-ledger med retained par forbliver `ready=false` og kan aldrig promovere active eller udgives, men dens eksakte residual må fortsætte til fallback. Public/runtime/deploy kræver fortsat præcis 79.414/79.414, én kildeklasse pr. par, nul overlap/missing og alle fulde gates.
- Lokal implementering og den endelige fokustestmatrix er grøn: `py_compile` for otte produktionsscripts; provenance, current-field-shadow, regional-current-operational, Open-Meteo-fallback og targetregistry; transactional 19/19 samt diff-check. Ny GitHub exact-head-kildegate, merge, frisk main-runtime, 79.414/79.414, fuld validate/releasegate og deploy afventer. Candidate G er fortsat offentlig.

## 4.0.328 – per-pair-verificeret vejrfallback (2026-09-06, lokalt)

- DMI-kandidatcachen genbruger alle kompatible verificerede currentpar. En separat availability-ledger afleverer den eksakte inverse rest, inklusive interne huller, hale, lokalt assetsvigt og registrybundet schema-3 total outage, uden at partial ommærkes som `DMI_READY`. En strukturelt ugyldig kandidat digest-karantæneres og genoprettes atomisk fra separat strict READY-active-donor.
- DMI download-/parse-/processingfejl ruller kun det konkrete asset tilbage og lader senere assets fortsætte. Supervisoren kan bounded genstarte med kun en collection/run/time/item/URL-/revisionsbundet asset sprunget over, håndhæver tidsgrænsen selv under kontinuerligt logoutput, og en malformed markør kan aldrig autorisere skip.
- Copernicus `READY` eller target/DMI/shadow-bound `IN_PROGRESS`, også med nul attempts, kan aflevere sin eksakte rest til regional DMI/Open-Meteo uden at påstå kildeudtømning. Ugyldige afledte private Copernicus shadow-/stagefiler kan karantæneres; centrale targets, registry og DMI-ledger forbliver fail-closed.
- Open-Meteo forbliver sidste target-only `open-meteo-combined-current`, højst 15 km, UTC/m/s/grader og altid `calibrationEligible=false`. 48h historik er rådgivende, mens public/runtime/deploy fortsat kræver præcis 673 × 118 = 79.414, nul overlap/missing og alle fulde gates.
- DMI-supervisor 11/11, transactional checkpoint/recovery 17/17, WAM-integration 21/21 samt ledger-, Copernicus-stage-/registry-, regional-, Open-Meteo-, closure-/diagnostik- og live-adaptermåltests er grønne lokalt. Den indekserede 673-opslagsregression undgår gentagen helscanning af 79.414 entries, og spatial slutgate reproducerer public strøm fra privat closurebundet U/V uden at publicere rå vektorer. Fuld GitHub exact-head sourcegate, merge, frisk main-oneoff, komplet closure, fulde produktionsgates og offentlig verifikation mangler; Candidate G er fortsat offentlig.
- Modelclosures er deterministisk genforseglet og verificeret: integrated `4346bf2d…`/55 og Candidate G rollback `71a093a4…`/56.
- Ekstern cron forbliver primær dispatcher, GitHub-schedules reserve og normal drift den varige updater. Oneoff er kun genopfyldning. Leverandørrækkefølge/tid/friskhed eftermåles efter stabilisering og model-online; pipelineoptimering er udskudt.

## 4.0.327 – run-afgrænset shadow og verificeret Open-Meteo-enhed (2026-09-06, lokalt)

- Oneoff 34017809629 attempt 1 gjorde DMI og Copernicus READY, men Open-Meteo stoppede før request, fordi en bevaret prøve fra et ikke-valgt regionalt modelrun stadig blev cadencevalideret som aktuel.
- Ikke-valgte runs sorteres nu fra før run-specifik cadence/asset/vektorkontrol; valgte runs forbliver fuldt fail-closed.
- Open-Meteo bruger nu wind_speed_unit=ms og kræver eksplicit GMT/UTC, m/s og grader. Live-prober bekræftede model, 118 timer og 50-punktsbatch; tre måltests er grønne.
- Active/candidate, historik, kildeorden, cron, geometri, punkter og model er uændrede. Exact-head, merge og frisk komplet main-oneoff afventer.

## 4.0.326 – regional shadow-rollover åbner korrekt Open-Meteo-rest (2026-09-06, lokalt)

- Oneoff `34004697179` gjorde DMI og Copernicus READY og efterlod 1.104 eksakte currentpar, men Open-Meteo stoppede før netværkskald, fordi den syv-dages regionale shadow fejlklassificerede prøver fra ældre modelruns som aktuelle asset-hashkonflikter.
- En gammel modelrun-prøve er nu fortsat utilgængelig for den aktuelle closure, men blokerer ikke næste fallback. Samme-run hashmismatch forbliver fatal, og reviderede assets kræver fortsat en eksakt ledgerbundet erstatningsprøve.
- En allowlistet versal domænekode kan nu følge den generiske residualplanfejl uden del-id''er, koordinater, rå U/V, payloads eller fritekst. Tre korte måltests er grønne; exact-head, merge og frisk main-oneoff afventer.
- Normalrun `34004873418` gemte DMI-fremgang, men stoppede korrekt før supplement/deploy, da DMI-producenten ikke var terminal success. Kildeorden, 673 × 118, historik, cron, geometri, punkter og model er uændrede.

## 4.0.325 – terminalbevist active-bootstrap uden hardkodet cache (2026-09-05)

- Når active-familien er tom, vælger workflowet den nyeste bevisbare main-scopede legacycache og genverificerer dens immutable exact-attempt, entydige key/version samt grøn DMI-producent, progressiv zonecache-save og terminaltrin via GitHub.
- Kun resolverens eksakte key må restores på main, uden wildcard. Strict READY, eksakt registry, active/candidate-isolation og promotionkrav er uændrede. En kandidat-404 prøver næste cache; øvrige API-/inventar-/evidensfejl stopper fail-closed.
- Samme resolver bruges i normal drift, 118h-oneoff og den private pilot. Kortlivet hardkodning er fjernet, og manuel pilot/oneoff kan ikke restore private caches fra en feature-branch.
- Skipped DMI-producenttrin må ikke længere re-save GRIB-, kandidat- eller researchcache under en ny run-key. Run `33991952081` bekræftede den gamle fejl og den unødvendige 2.778.397.542-byte GRIB-kopi efter cachemiss; sourcegaten i runnet var grøn.
- Den skærpede liveprøve valgte entydigt cache-id `7369179233`, version `2f5a0598…`, `33990516150` attempt 1 og 48.847.855 byte. DMI-leddet er terminalgrønt, mens det samlede run fejlede senere i Copernicus; cachen er derfor donor, ikke komplet produktionsbevis.
- PR #257/4.0.324 bestod exact-head `33989875253` og blev merged `948ba60b`. Den ventende kørsel `33991028274` blev stoppet under checkout uden DMI-, cache-, protected-write- eller deployeffekt.

## 4.0.324 – active/candidate-cache uden modelrun-nulstart (2026-09-05, lokalt)

- Normal vejrhentning og 118h-oneoff materialiserer begge seneste strict READY-active som donor, men skriver alt nyt DMI-arbejde til den samme `dmi-zone-candidate-v1`-familie. Fælles production-concurrency serialiserer writers; normalen er den fremtidige updater, mens oneoffen kun accelererer samme kandidat.
- Ikke-annulleret partial kandidat gemmes før terminalen. Active og deploykæden fortsætter først efter producer-success, allowlistet status, `DMI_READY`, strict current-anchor, `candidate_promoted=true` og eksakt registryvalidering.
- Partial kandidat kan beholde sit native run over seks timers modelskift alene med mindst normalt 96 timers moden/komplet fremtidshorisont og ikke-stale katalog. Manglende eller READY kandidat vælger nyeste komplette run, så retention ikke kan pinne til cirka +120 timers alder.
- Hele target..+117 scannes for interne huller, ugyldige/udløbne trin og hale; normal DKSS-ramme er tre collections. Historikvinduer, DMI → Baltic → AMM15 → regional DMI → Open-Meteo, ekstern cron/watchdog og GitHub-reserveschedules bevares.
- Den målrettede lokale matrix er grøn. Run `33986893042` fejlede alene på manglende `CHANGELOG-4.0.324.md`. Ejeren beordrede derefter et admin-bypass, men Codex-sikkerhedslaget afviste handlingen, så ingen bypass eller merge skete. Run `33988058582` bestod releasegaten, men stoppede senere alene på håndbogs-/installationspariteten. Den officielle synk retter én genereret SQL-payloadlinje; ny exact-head, merge, runtime, fuld produktionsgate og komplet 210/673/118 afventer.

## 4.0.323 – sidste operationelle currentfallback og friskhed (2026-09-05)

- DMI → Baltic → AMM15 → regional DMI → Open-Meteo lukker nu eksakte target..+117-currenthuller efter terminalt READY.
- Open-Meteo er combined-surface-current-only, højst 15 km, uden historiksyntese og altid `calibrationEligible=false`; fejl/null/stale target stopper før artifact.
- Regional residualpartition, bounded normal/oneoff-budgetter, targetfriskhed og append-only modelbinding `20260905090000` er tilføjet. Exact-head og frisk runtime afventer.

## 4.0.322 – et fastlåst HARMONIE-asset kan ikke blokere hele vejrjobbet (2026-09-05, lokalt)

- Engangsrun `33918250039` blev dræbt ved DMI-trinnets 55-minuttersgrænse, mens ét downloadet HARMONIE-forecasttrin havde været i ecCodes-behandling i mere end 52 minutter. De tre cache-save-trin bestod; færdige assets blev bevaret, men Copernicus blev ikke nået.
- Normal drift og engangsopfyldning bruger nu samme supervisor. Kun et igangværende HARMONIE-asset får en 180-sekunders watchdog; efter stop genvaliderer og finaliserer den eksisterende producent den atomiske cache inden for yderligere 420 sekunder. Downstream åbnes kun ved den eksisterende strenge DMI-terminalgate.
- Supervisoren er med i runtimehashen. Fem nye syntetiske tests samt de berørte oneoff-, workflow- og runtimekontrakter er grønne. DMI-first, Copernicus exact-gap, 673 × 118, historik, score, model-id/state, geometri og punkter er uændrede. Exact-head, merge og frisk main-kørsel afventer.

## 4.0.321 – bounded fortsættelse af engangsopfyldning (2026-09-04, lokalt)

- Gemte downloadbudgetstop kan fortsættes i højst tre DMI-blokke under samme samlede tidsramme og råcacheloft. Kun engangsjobbet ændres; normal produktion og scheduler er urørte. Ni måltests og workflowkontrakten består; ny CI/runtime afventer.

## 4.0.321 – kildekontrol uden dubletter og rettet testregistrering (2026-09-04, merged PR #252)

- Fælles current-closure får sikker restoptælling efter prognosetime og mangelstype, uden private id-lister/værdier eller ændret fejlstop. Præcis runtime-restfordeling afventer; fem måltests og eksisterende closure-test er grønne.
- Outcome-testen kontrollerer sin registrering i den fælles udførelsesliste, ikke en flyttet tekstmarkør i gatefilen; øvrige krav bevares.
- Fuld releasegate køres først i kildekontrollen; efterfølgende identiske tests gentages ikke. Alle oprindelige kontroller bevares, 33 gentagne starter undgås, og enhver fejl stopper stadig. Standalone produktionsgate er fortsat fuld.
- Releasekontrollens gamle forventning til testkommandoen er opdateret til både metadata- og append-only-migrationskontrol. Begge udføres også i standalone gate. Plan-, fejlstop-, workflow-, bindings- og migrationsmåltests er grønne; faktisk CI-tid afventer.

## 4.0.321 – HARMONIE-filformat og korrekt geografisk vind (2026-09-04, lokalt)

- PR #252-opfølgning: rollbackens backendtest kontrollerer nu den gældende migration fra produktionskædens liste. Den gamle historiske fil bevares; eksisterende assertions består. Dette lukker den konkrete kildekontrolfejl uden ændring af runtime eller SQL.
- Alle beslægtede migrations-, rollback-, installations-, release- og workflowtests er gennemgået og bestået samlet; øvrige gamle migrationsreferencer er bevidste historikkontroller.

- Fælles normal/engangs-DMI-læser håndterer Lambert-formatets fire ikke-anvendelige angular keys og omregner den faktiske samme-celle vindreference korrekt. Ukendte/mismatchede referencer afvises; HARMONIE source v2 følger gennem Python/JS.
- Kun HARMONIE får ny processing-markør; gemt DKSS/WAM/Copernicus/regional progression bevares. Scoreformel, model-id/stateversion, cron, geometri og punkter ændres ikke.
- Begge reelle modelbundles, continuation og forbrugere er synkroniseret via append-only hashmigration `20260904140000`; gamle migrationer er urørte. Syntetisk ecCodes-, uafhængig PROJ- og kontraktmåltest er grønne. Exact-head, merge, ny stor opfyldning og produktion afventer.

## 4.0.321 – sikker tidsramme og fuld cacheoverdragelse i engangsopfyldning (2026-09-04)

- Kun den manuelle, ikke-deployerende 118-timers engangsvej ændres. Samlet loft 110 → 180 minutter, eksplicit Copernicus-trinloft 47 minutter over wrapperens eksisterende 45 minutter, og mindst 60 minutters reserve ud over 55 + 47 + 17 minutters tunge trin. Normal indsamling, balance, kildeorden, score og datakrav er uændrede.
- Den regionale DMI-sidecache får samme restore/save-familie som normal drift. DMI-råfiler, behandlede DMI-data og regionalt grundlag gemmes før terminalkontrol; Copernicus' eksisterende tofil-progression gemmes fortsat før samlet closure og vejrbygning.
- Den målrettede workflowtest kontrollerer både budgetregnestykket, soft/hard-reserve, den regionale cachebinding og hele gemme-/kontrolrækkefølgen. Markdown-/webhåndbog og RDKS opdateres. Ingen model-/state-/geometri-/punktændring eller kildegate i engangsjobbet.
- Ejerens første engangsrun `33866679219` blev annulleret, mens det stod i kø: GitHub bekræfter cancelled og nul jobs, derfor intet dataarbejde tabt. Ny start sker først på rettet main. Lokal kontrol er ikke et nyt data-/releasebevis; fuld opfyldning og derefter målt vedligeholdelse afventer.

## 4.0.321-kandidat – PR #249 merged og pilotens tidsbinding lukket lokalt (2026-09-03)

- PR #249 bestod exact-head-kildegaten `33743253873` på `5879f5fdd71a1db5a2895b4ac3acadeafb2865e8` og blev merged som `a331e0dbb08a9ab9ffff26632a708828574bdcd8`. Dermed ligger den monotone, genoptagelige Copernicus-restopfyldning nu på `main`; Candidate G er fortsat offentlig.
- Den planlagte pilot `33766716934` stoppede før acquisition og publicering, fordi en gendannet DMI-ledger havde en anden starttime end pilotens implicitte nye target. Den lokale rettelse validerer hele den gendannede ledger og binder targetregistry til dens eksakte `productionReferenceAt`; en legitim uafsluttet ledger springes neutralt over.
- Målrettede workflow-, 55-filers bundle-, 78-modulers browserclosure-, releasebinding-, checkpoint-, assistent-, RDKS-, sikkerheds- og håndbogstests er grønne. Ingen scoreformel, state, geometri, kystnormal, land-/vandpunkt eller private data er ændret.
- Post-merge-vejrkørsel `33775957133` er startet på den eksakte mergecommit. Den er runtimeevidens under opbygning, ikke endnu et terminalt 673 × 118-, produktions- eller deploybevis.

## 4.0.321-kandidat – reel offentlig implementeringslukning (2026-09-03)

- Backendrun `33736292211` nåede den eksakte integrerede public-implementation-seal og stoppede sikkert før Supabase-, Edge-, database-, artifact- eller Pages-skrivning. Årsagen var, at den hidtidige 44-filers bundle ikke bandt de to direkte offentlige forbrugere `js/services/rav-assistant.js` og `js/services/trip-evidence-public-adapter.js`. Candidate G forblev offentlig, og state 6 blev ikke aktiveret.
- Bundlegeneratoren behandler nu begge filer som direkte entrypoints. Den uændrede parameterkontrakt `a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b` bindes til den reelle 55-filers implementeringsbundle `d5796289f645f1bcab6b4fe822c5ed6b0e919321013687302feb2139e814a286`. Browserlukningstesten bruger nu den faktiske genererede binding og actual-source closure over 78 offentlige moduler i stedet for en syntetisk bundlefixture. Begge måltests er grønne.
- Candidate G-rollback er uændret `c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8`/`7c7f2b4950b4ce7a04d560dde15dd93e408e045ca5e9ed4f9be33eac0255e89d` over 56 filer. Den tidligere integrated-hash `3192db304a6e613059cd66d1ae983583c3aaff832293bda978cdc03991bb49c3` bevares kun som revisionsspor for den ufuldstændige 44-filers lukning.
- En læsende live Supabase-kontrol gav `false/false/false`: migration-ledgerrelationen fandtes ikke, og hverken den nye trip-binding-RPC eller checkpointets integrated-state-RPC var installeret. Migrationerne er derfor fortsat ikke live. Den linkede migrationsliste og dry-run er den definitive stopgate før første write; fraværet må ikke omgås med gæt eller manuel ommærkning.
- GitHub-secretet `SUPABASE_DB_PASSWORD` er kun verificeret ved navn. Værdien er ikke læst, vist eller testet ved at gætte den, og Supabase-passwordet må ikke nulstilles som rutine. Hvis link/autentificering fejler, skal backend stoppe før writes og årsagen afklares.

## 4.0.321-kandidat – metadata-CAS og bounded RavScore-checkpoint (2026-09-03)

- PR #248 bestod exact-head-kildegate `33732430804` på `bc80821257c4f3c374df3135d98360ca9b02e836` og blev merged som `771dc75cb05b0c65e13ce63d8e737b250e0dc17d`. Det rettede backendworkflow henter den pinnede Candidate G-sourcecommit før kildegaten; frisk backendrun `33736292211` afventer terminalt bevis.
- Operational preflight `33729216244` beviste DMI-first `70.904/79.414` eksakte par og afgrænsede `8.510` reelle Copernicus-restpar. Den nåede 616 par før 1.200-sekundersgrænsen. Produktion `33729043877` gendannede præcis den generation, gjorde DMI READY og voksede den private progresscache 48.015 → 62.228 byte før samme kendte timeout; ingen central write, artifact eller deploy skete.
- Rodårsagen var intern: positive records blev checkpointet pr. shard, men gennemførte nul-resultatforsøg fandtes kun i RAM; 118-preflight og produktion kunne desuden skrive parallelle, divergerende immutable cacher, og keepalive brugte en anden én-fils cacheversion. Fire DMI-GRIB-cacher fyldte samtidig cirka 9,46 GB, så den ubeskyttede lille progresscache var udsat for LRU-udskiftning.
- Den lokale rettelse gemmer en hashbundet privat `IN_PROGRESS`-journal efter hver færdig shard, også ved nul records, og skriver altid shadow før journal. Kun eksakte dokumenterede product/pair-forsøg på samme reference springes over. `IN_PROGRESS` kan genoptages, men kan aldrig bestå `READY`, closure eller release.
- Alle Copernicus-writers deler nu den serielle `ravradar-weather-production`-kø og én kanonisk to-fils `copernicus-current-progress-v3`-cachefamilie; gamle prefixes er migrationsfallback. Keepalive og current-hour-gaten bruger samme to paths. Kun den isolerede 118-preflight får 2.700 sekunder; normal pilot og produktion beholder 1.200.
- De målrettede source-stage-, runner-, checker-, timeout-, keepalive-, workflow-, cachepreservation- og rollbacktests er grønne. Integrated bundlehash forbliver `3192db304a6e613059cd66d1ae983583c3aaff832293bda978cdc03991bb49c3`; score, modelbinding, geometri, punkter og offentlige data er uændrede. Ny exact-head og frisk 673 × 118/Feggesund-kørsel afventer.
- PR #247 bestod exact-head-kildegate `33725769649` på `88dab9f9db02132a92538ebf0f8fae7206ae0d5c` og blev merged som `1c05c03939083c635f7acc02690ee5d741f08df5`. Candidate G forbliver offentlig, indtil den særskilte Fase B-gate er lukket.
- Første exact-main-backendforsøg `33729278888` stoppede før eksterne writes, fordi det shallow checkout ikke indeholdt den pinnede Candidate G-sourcecommit. Turlagerworkflowet henter nu præcis den autoritative 40-tegns commit med depth 1 og attesterer `FETCH_HEAD` før `validate:source`; måltesten låser rækkefølge og eksakt én fetch.
- PR #246 bestod exact-head `33706215425` og blev merged som `7198b685f4bc9d86bd6432b049380f4279ab797c`; det er Phase A-kodegrundlaget med Candidate G fortsat som eneste offentlige model.
- Protected checkpointpublicering bruger nu service-role-only compare-and-swap med højst 16 MiB kanonisk checkpointpayload og højst 4 KiB metadatarespons. HTTP-wrapperen kan være lidt større. Normal post-write-verifikation læser ikke længere hele payloaden; fuld GET bruges kun ved reel restore/cache-miss.
- Same-payload retry er idempotent. Stale version, targetregression, invalid central state eller binding/privacydrift stopper fail-closed. Andet indhold på samme target stoppes også, med én eksakt overgang: 4.0.320-hash `082a5187…` fra sourcehead `7198b685…` må genattesteres til den platformsnormaliserede `utf8-bomless-lf-v2`-hash `35c45f8f…`, når kun continuation-hash og top-/companion-generation ændres, og resten er identisk.
- Checkpointet er føjet til den eksisterende no-history-trigger uden oprydning af gamle rækker. Restriktiv RLS afviser authenticated direkte læsning af current og historiske checkpointpayloads; CAS, validatorer og metadata-readback er service-role-only med låst `search_path`.
- Migration `20260903010000`, `supabase/schema.sql` og sikkerhedsinstalleren deler én eksakt genereret kontrakt. Readiness attesterer migrationsversion, funktionskroppe, trigger, RLS, ACL og security mode uden payloadread.
- Databasen validerer eksakt schema-6/Candidate G-envelope, 673 + 673 unikke dele, READY-paritet, kanoniske tider, bindinger, continuation-hash og privacy. JavaScript beholder replaymatematik og generationshash.
- Måltests for checkpoint, protected storage, private runtime, readiness, installer, release metadata og workflowrækkefølge er grønne. Geodata ændrer kun topversion 4.0.320 → 4.0.321; ingen zone, geometri, kystnormal eller land-/vandpunkt er ændret.
- Uafhængig read-only SQL-review fandt ingen P0/P1. Åbent før live state 6: remote Supabase dry-run/apply/readback, exact-head, 673 × 118, Feggesund 3 × 118, live Supabase før/efter-egress/database/lager med mindst 30 procent reserve, sikker merge, frisk fuld produktion, særskilt manuel Fase B og offentlig mobil-/desktopkontrol.

## 4.0.320-kandidat – deterministisk DMI-gridgenbrug (2026-09-02)

- Første integrerede aktivering er nu adskilt fra kode-/Candidate G-merget. Fase A må merge før 673 × 118, så cron kan opbygge den korrigerede cache med Candidate G fortsat offentlig. Et merge/push, schedule, watchdog eller almindeligt manuelt vejrjob kan kun vedligeholde Candidate G; legacy-Candidate føres gennem den eksisterende bro til current moderne Candidate G på samme head.
- State 6 kræver bagefter et særskilt manuelt `workflow_dispatch` med både `ravscore_integrated_first_cutover=true` og `EXECUTE-INTEGRATED-RAVSCORE-FIRST-CUTOVER-AFTER-CAPACITY-GATE`. Før DMI kræves forseglede central Phase-A-complete Candidate G med eksakt binding/manifesthash, dataset/reference, deployment-id, sourceHead, implementation closure og profil. Live public source/manifest/implementation genverificeres i deployleddet før begin-CAS. Wrong/orphan token og blandede operationer afvises.
- Bekræftelsen er kun operationsautorisation. Live Supabase før/efter, øvrig egress/lager og mindst 30 procent reserve skal være dokumenteret grønne før dispatch. Gamle forseglede planer/recovery bevares; controllerens 30/4/6-kontrakt og begge modelbundles/hashes er uændrede.
- Tofaselåsen og de direkte tests er lokale. Preflight `33695730459` attempt 2 nåede grøn DMI-terminal med 71.526/79.414 DMI-direct og gemte 364 Copernicus-par, men timeout gav intet 673 × 118-artifact; attempt 3 var endnu ikke terminal. Deltaet er ikke commit'et, pushet, exact-head-verificeret, merged eller live; Candidate G er fortsat offentlig.

- Hjemmeskærmsfunktionen er gjort robust med 192/512-pixels manifestikoner, 180-pixels Apple-touch-ikon, relative appgrænser og manifest-/ikonlinks på både forsiden og den eksisterende **Om RavRadar**-side. Om-siden forklarer trin for trin installation på iPhone/Safari og Android/Chrome på DA/DE/EN; ingen ny popup, model-, vejr-, geodata- eller brugerdataadfærd er tilføjet.
- Main-runs `33682062077` og `33687215451` opdaterede og gemte DMI-bulk-/zone-/GRIB-/researchcache og bevarede Copernicus-cachen; gammel main stoppede derefter ved exact-gap-selector før Copernicus-fill, 673 × 118 og deploy. Cacheprogressionen blev ikke mistet.
- Source-stage v2 binder hvert valgt Baltic-/AMM15-par til det valgte pinned produkts eget domæne. AMM15 kræver for samme eksakte par et komplet resultatløst Baltic-forsøg eller deterministisk target-/registry-/hashbundet `NOT_APPLICABLE`; timeout, manglende stage eller uafsluttet shard er ikke udtømning.
- Regionalt 1–3 timers derived hold er reduceret til en state-only markør bundet til præcis del, forecasttime, kildetime og alder. Den skaber ingen U/V, fart, retning, kystnormal strøm, gridprojektion eller pil, kan ikke autorisere nabotimer og er forbudt i target−48..−1-historikken. De relevante måltests er grønne, og den uafhængige exact-time-revision fandt ingen P0/P1.
- Beskyttet private-runtime-publicering rydder efter en CAS-fejl kun sit eksakte nyoprettede objekt, når frisk pointer-readback beviser, at objektet hverken er current eller previous. Ukendt readback sletter intet; rollbackretention og den oprindelige fejl bevares.
- Begge modelbundles og bindingsforbrugerne er nu synkroniseret: integrated `a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b`/`3192db304a6e613059cd66d1ae983583c3aaff832293bda978cdc03991bb49c3` over 44 filer/8 forbrugere og Candidate G-rollback `c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8`/`7c7f2b4950b4ce7a04d560dde15dd93e408e045ca5e9ed4f9be33eac0255e89d` over 56 filer. Den fokuserede slutmatrix er grøn; næste gate er commit/push og GitHubs exact-head.

- Fortsættelsesrun `33645673684` gendannede shardcachen, men initialinspektionen afviste korrekt uforseglet state, før fill kunne fortsætte. Checkeren accepterer nu en fuldt valideret partial cache kun under `--allow-nonmatching-seal`; strict og terminal `--require-complete` kræver uændret et activation-complete seal. Måltesten dækker alle tre udfald.

- Exact-head `33627490090` bestod. Preflight `33632361928` nåede grøn DMI-terminalgate og fandt 7.889 eksakte operationelle Copernicus-restpar; gammel all-or-nothing-persistens tabte færdige spatialshards ved timeout.
- Copernicus-rangeproducenten checkpoint'er nu hver valideret shard som uforseglet privat state. Ét hard-bounded 1.200-sekunders forsøg pr. workflowrun gemmer progression ved failure, og senere runs henter kun resten. Kun komplet target..+117 kan forsegles `OPERATIONAL_COMPLETE`; DMI-first, model, score, geometri og punkter er uændrede.

- Isolerede preflights viste, at DMI leverede DKSS-filer, mens titusinder af high-level nearest-kald genopbyggede samme grid-søgestruktur. Producenten genbruger nu ét message-lokalt ecCodes-nearest-handle med `CODES_GRIB_NEAREST_SAME_GRID`; smoketesten kræver low-level API'et, så den gamle langsomme vej ikke kan passere.
- `GRID_LOOKUP_VERSION=9`, `md5GridSection`, ecCodes API-version og bindingsversion invaliderer kun processed cache. Den offentlige legacy-`gridDefinitionSha256`, målte historik, provenance, state, recovery, sampling-/lagvalg og 5 km-grænse er uændrede.
- Eksakte currenttimer behandler fortsat U/V og vandstand; valgfrie DKSS-felter følger tretimersstride. Checkpoint sker senest efter otte afsluttede assets eller 60 sekunder og tvinges ved interruption, collectionslut og exception.
- Main-run `33591129416` hentede DMI-assets, men den gamle parser stoppede på tekstlig gridmetadata og deployede intet. Den lokale 4.0.320-parser accepterer kun finite tal og fejler fortsat lukket ved ugyldig metadata.
- DMI-first, exact-gap Copernicus, 118-timersgaten, Feggesund-reglen, model-id/state, `HISTORY_INCOMPLETE`, scoresemantik, geometri og punkter ændres ikke. Exact-head, frisk 673 × 118-currentpreflight, særskilt Feggesund 3 × 118-wavebevis, merge, fuld produktion og offentlig desktop-/mobilverifikation afventer.

## 4.0.319-kandidat – integrated-first med measured-only historikopbygning (2026-09-02)

- Den afsluttende lokale releasegate fandt to stale tekstmarkører fra før de stærkere DMI-refaktoreringer. Kildegaten binder nu den faktiske cache-key/row/native-time-kontrol og den gældende nested `resetWaveRowCount`-registrering; runtimekode og dataadfærd er uændret.
- Slutbundles er forseglet og lokalt måltestet: integrated `modelContractSha256=a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b`/`modelBundleSha256=db475a1bbb1b85fe3e0277b8687d6f1edd6dd8d74e0d6fb4df748f955d5bafe1` over 44 filer/8 deklarerede forbrugere; Candidate G-rollback `modelContractSha256=c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8`/`modelBundleSha256=ea22921e298a03ed1ef8787a4dbd79fd4fdf1a9b8e188d3c4b44e03f16fdceb0` over 56 filer. Exact-head `33577887262` fandt en Candidate G-rollbackregression i calibration-ceiling; den symmetriske fem-validator-rettelse og fire måltests er grønne. Exact-head `33580532775` passerede derefter hele model-/rollbackkæden og stoppede kun på to stale DMI-testassertions; den runtime-neutrale testrettelse er grøn 21/21. Restkontrollen fandt desuden én gammel syntetisk live-current-fixture uden den nyere downloadindholdsbinding; fixture-only-rettelsen er grøn og ændrer ingen produktion. En samtidig hydreringstest var kun lokalt startet med WindowsApps-Python og er grøn med projektets bundled Python. Ny exact-head, slutligt 118-timers/Feggesund-bevis, merge, produktion og offentlig browserkontrol afventer.
- Supersederer den tidligere regel om, at en privat Candidate G-rollback skulle være 673/673 READY før første integrerede cutover. State 6 må gå online, når den direkte og operationelle akse er komplet med præcis 118 timer fra current til +117 for 673 kystdele og begge modes.
- Manglende ældre præ-target-historik giver fortsat score som `HISTORY_INCOMPLETE` med konservativ lower/upper, dækning, tydelig DA/DE/EN-advarsel og `calibrationEligible=false`. Manglende direkte eller operationelt input er fortsat `UNAVAILABLE` og stopper releasen.
- Den private Candidate G-side er eksklusivt enten 673/673 `READY` eller `BUILDING_MEASURED_ONLY`/`MEASURED_ONLY` med 673 målte fortsættelser og `activationReady=false`. Warmup er ikke offentlig, shadow, controllerstatus, automatisk fallback eller rollbackbevis; manuel Candidate G-rollback åbner først ved reelt READY.
- Checkpointschema 4 og den parrede READY companion er uændret. Under measured warmup skal build, save og protected publish være eksplicit `NOT_APPLICABLE_DURING_MEASURED_WARMUP`; tilfældigt skip eller ghost proof er en fejl.
- Aktiv integreret drift kan ved faktisk fraværende eller legitimt udløbet privat state bruge state-less same-model cold replay fra verificerede målinger. En tilstedeværende ugyldig eller manipuleret state er fatal, og Candidate G-only state kan ikke bruges som integreret continuation.
- Cold replay og warmup må ikke bruge syntese, carry, neutral nulstrøm eller generelt nabolån. Migrationens 40-timers sammenhængende WAM-bro forbliver migration-only. Den eneste operationelle nabo-undtagelse er Feggesund/`DK-B05-11`: direkte lokal DMI-WAM vinder; kun når hele den direkte bølgetuple mangler, må samtidige direkte verificerede `DK-B05-10` + `DK-B05-12` danne en 50/50 energikonsistent wave-only-proxy uden geometri-, punkt-, kystnormal-, current-, history- eller recoveryændring.
- Feggesund-proxyen fører `LOW|MODERATE|HIGH` uenighed, tydelig DA/DE/EN-advarsel og `calibrationEligible=false` gennem public/tur/observation — også ved `FULL_HISTORY`. Release kræver en privat, hashbundet 3 × 118-ledger med præcis 354 accepterede direkte/proxyinput, nul manglende og ingen offentlig proof-/koordinat-/råværdilæk.
- Schema 3 forsegler `OPERATIONAL_COMPLETE` med den hårde target..+117-akse, mens målt direkte target−48..target−1 er rådgivende warmuphistorik. Den rådgivende del må være ufuldstændig uden at fjerne score, men skal give `HISTORY_INCOMPLETE`, offentlig advarsel og `calibrationEligible=false`.
- Et særskilt branch-`workflow_dispatch` kan nu lokalt køre en afgrænset 118-timers data-preflight: DMI, tre save-trin, payloadfri terminalgate, operationel selector/checker, weather-update og integreret audit. Det kører ikke source/full/release/admin/Pages/deploy/browser og må kun gemme én privacy-safe rapport.
- Historisk 4.0.320-regel, supersederet af 4.0.329: DMI-cache-backfill kopierede kun en hel donor-time fra samme kompatible registry ind i en manglende eller strukturelt tom time. Gældende regel tillader alene exact-proof-gated, komponentatomar currenttuple-merge af samlet U+V+`sources.current`; øvrige felter, kilder og `processedSteps` bevares, og et halvt/uattesteret donorpar afvises. Alle saves sker fortsat før `DMI_READY`/strict-anchor-terminalgaten.
- Run `33520738058` fandt en efterfølgende lokal fasefejl: tidlig current-cache-health kunne være grøn, selv om den senere sampling-/gridvektoroprydning ville fjerne strømparret. Health-kontrollen bruger nu samme autoritative `samplingPoint` og top-level U/V-gridpar som slutoprydningen, så en beskadiget cache udløser DKSS-recovery i både Candidate G-drift og den nye model.
- Runs `33510636195` og `33512163102` behandlede HARMONIE/WAM, men nul trin i `dkss_idw`, `dkss_nsbs` og `dkss_lf`. `DMI_STRICT_CURRENT_ANCHOR_MISSING` var derfor ikke bevis for bred upstream-DMI-mangel. Cachelinjen førte tilbage til det negative run `33498108421`; den lokale rodårsag var stale preferred-run-fastholdelse uden fremskift, en “deployed donor” der blot kopierede samme progressive cache, og gamle DKSS-`processedSteps` uden strict anchor.
- Rettelsen binder ét jobtarget før DMI og bevarer snapshotet over UTC-timeskifte. En ældre preferred run må kun beholdes foran en nyere moden run ved kendt cadence og højst én cadences lag; ukendt cadence vælger den nyere modne run. Uden strict anchor prioriteres/genbehandles DKSS i den normale loop. En uafhængig offentlig Candidate G-DMI-donor under `RUNNER_TEMP` er valgfri og strict-valideret; frisk officiel DMI fortsætter uden donor.
- Den nye models første `integrated-cutover` bevarer den særskilt checkpointede WAM-historikbootstrap før den normale loop, hvor den kan fortsætte over flere forsøg. Den efterfølgende loop får seks collectionpladser og sætter DKSS foran WAM alene uden strict anchor; normal drift bevarer to. DMI-first og Copernicus alene som exact-gap-supplement er uændret. Ingen score-, geometri-, kystnormal-, punkt- eller private dataændringer indgår.
- Warmup bærer `calibrationEligible=false` gennem controller, tur-/observationsbindinger, admin, central hydration og reconciliation. `true` kræver en forseglet full-history-audit med komplet 210/673-, privacy- og modelbinding.
- Der tilføjes ingen ny controllerstatus, transition eller offentlig shadowmodel. De eksisterende integrated-first-måltests samt `test-dmi-scheduler-active-zones`, `test-dmi-bulk-model-download`, `test-workflow-validation-order` og Python-`py_compile` er grønne; frisk 118-timers preflight, exact-head, merge, frisk fuld produktion/releasegate/artifact/Pages, aktivering, Feggesund 3 × 118-ledger og offentlig desktop-/mobilverifikation afventer. Candidate G/4.0.316 er fortsat den eneste offentlige model.

## 4.0.318-kandidat – PR #244 merged; målt legacy-WAM-rebuild og sikker produktionskø (2026-09-01)

- PR #244 bestod den opdaterede exact-head-kildegate `33452730102` og blev merged som `27906d7d83883622d87d66b141869302b016d6c6`.
- Push-run `33471225980` blev annulleret før jobs, da den daværende enkelt-pending-concurrency lod et watchdog-dispatch erstatte det. Efterfølgeren `33471276238` stoppede derefter sikkert i legacy-WAM-kæden på manglende same-cell-bølgeproveniens og efterfølgende manglende strengt verificeret DMI-currentpar. Der blev ikke skrevet central vejrcache eller andre beskyttede data, og der blev ikke bygget artifact eller deployet Pages.
- Den lokale remediation behandler cache-first som optimering: afviste legacy-`PART::`-bølgerækker fjernes alene fra den private cache, et partial checkpoint gemmes, og bølgerne genhentes målt gennem den normale DMI STAC/GRIB-vej. Strøm, vind, vandstand, temperatur og punktidentitet bevares; manglende live-WAM stopper fortsat fail-closed.
- Den integrerede wave-bootstrap-resolver, forlænget runtime, force-refresh og first-cutover-attestering kan nu kun aktiveres af den eksakte action `integrated-cutover`. Schedule, watchdog og manuel Candidate G-vedligehold kan ikke starte den integrerede bootstrapvej.
- Produktionsworkflowet bruger `queue: max` sammen med `cancel-in-progress: false`. Watchdoggen henter den ufiltrerede runliste, filtrerer `main` lokalt, fejler lukket ved ukendt historik og gentager hele kontrollen umiddelbart før dispatch; begge beslutninger skal være positive.
- DMI/WAM-regressionerne er grønne 20/20, wave-validatoren 26/26 samt integreret generator, watchdog og workflowkontrakter er grønne. Ny exact-head, frisk fuld produktion/Pages og offentlig browserverifikation udestår. Candidate G er fortsat sidste offentlige model; state 6 er ikke live.

## 4.0.318-kandidat – strict DMI-kystdelscache og stabil dansk forecastkalender (2026-09-01)

- Retter en UTC-midnatsflaky Spørg RavRadar-test, så GitHubs kildegate bruger samme `Europe/Copenhagen`-kalender som appen.
- En DMI-cache kan kun genbruges, når dens aktive `PART::`-set er eksakt, og mindst ét finite U/V-par på samme række har fuld native provenance i `target−48..target+117`.
- Den valgte fallbackcache skrives atomisk til den fil, targetregistryen faktisk læser; normal og WAM kan ikke rapportere producentsucces med nul strict par.
- Ingen scoreformel, modelbinding, geometri, land-/vandpunkt eller privat data ændres. Exact-head, merge og frisk produktions-/Pagesbevis udestår.
- Første PR #244 exact-head `33450446237` fandt én forældet releasegate-assertion efter helperudtrækket. Attesten følger nu den fælles registry→helper-kontrakt; målrettet releasegate er grøn, og opdateret exact-head afventer.

## 4.0.318-kandidat – DMI/WAM-progressionscache og privat punktkandidat (2026-08-31)

- PR #242 bestod exact-head `33408976253` og blev merged som `29f39cce44ffe6e3a1c14d5b58e991b61da2faba`. Produktion `33412497717` passerede Candidate G-attesteringen og kildegaten, men stoppede i DMI/WAM før artifact, Pages og activation.
- En inaktiv privat punktkandidat kunne køre efter et fejlet DMI-producentforsøg og dermed forhindre de efterfølgende progressive caches i at blive gemt. Rettelsen kører kun kandidaten efter success og lader den aldrig blokere offentlig produktion.
- Progressive GRIB-, DMI-zone- og current-researchcaches gemmes nu efter ethvert ikke-annulleret producentforsøg. Den hårde WAM-gate er uændret, men dens begrænsede payloadfri fejlkode bliver synlig uden private data.
- DMI/WAM 18/18, integreret generator og reusable-production-workflow er målrettet grønne. Candidate G er fortsat offentlig; exact-head, merge, frisk produktion og browserbevis mangler.

## 4.0.318-kandidat – PR #241 merged; legacy-profilattestering lokalt rettet (2026-08-31)

- Denne topstatus superseder ældre topresumeer nedenfor, men bevarer dem som revisionsspor.
- PR #241 bestod exact-head-kildegaten i run `33397737159` og blev merged som `origin/main a1ce7632b4262d742ec4a8a59746a61241c3b79a`.
- Mergeproduktion `33400836760` passerede den tidligere Højbjerg/bearing-gate og beviste dermed den smalle `360→0`-rettelse. Den stoppede derefter fail-closed i den lokale legacy-kildeattestering, før DMI, beskyttede writes, artifact og Pages; Candidate G og den offentlige side blev ikke ændret.
- Rodårsagen er reproduceret: attesteringens testfixture tillod kun 11 profilfelter, mens den fastlåste 4.0.316-producent og den aktive offentlige Candidate G-manifestform har 20. Den lokale branch `codex/ravscore-legacy-profile-attestation` validerer nu den fulde eksakte feltmængde, readiness/advisory-konsistens og bit-for-bit samme profil i manifest og conditions. Ukendte felter og blandede profiler stopper fortsat.
- Målrettet legacy-, activation-, workflow-, deploy- og cutover-matrix samt privacy-sikker offentlig manifest/payload/53-fils source-closure-verifikation er grøn. Ingen private conditions-payloads, koordinater, rå U/V, geometri eller land-/vandpunkter er læst eller ændret.
- Candidate G/4.0.316 er fortsat eneste offentlige model. Ny exact-head, sikker merge, én frisk 4.0.318-produktion og offentlig desktop-/mobilverifikation udestår.

## 4.0.318-kandidat – nyeste checkpoint efter source-merge, workflowfixes og bearing-360 stop (2026-08-31)

- **Denne topstatus superseder ældre topresumeer nedenfor.** PR #238 (modelkilden) er merged som `origin/main 57f76d716310060e0d629c9f9d3691d386a2dd58`. Workflowfixes fra PR #239/#240 er derefter merged til `origin/main be81005b50294f54367f154c393bb27910e16c6f`.
- **Nyeste sikre produktionsstop:** Produktion `33391418061` og `33393684620` stoppede fail-closed før DMI, beskyttede writes, artifact og Pages. Den konkrete blocker var én aktiv offentlig Højbjerg-del i `DK-B04-01` / `dk-b04-01-national-part-03`, hvor en afrundet bearing stod som `360`, mens den aktive kontrakt kræver intervallet `[0,360)`.
- **Smalt lokalt hotfix:** PR #241 normaliserer kun afrundet `360` til `0` og ændrer ikke geometri, zoner, land-/vandpunkter eller kystnormal. Første exact-head-CI `33394343851` stoppede ved stale bundle-/binding-consumers; senere gates blev derfor ikke bevist. Bundle-/binding-consumerne er nu regenereret og målrettet lokalt verificeret; opdateret exact-head afventer. Ingen produktionsdata blev rørt.
- **Nyeste lokale bindinger:** Integrated `modelBundleSha256=e880d5425e6f7b93d8afc99cddf491e58ad5a4a2ab055f8e4455193609c90a73`; Candidate G-rollback `modelBundleSha256=4ccc2081982677aadbb47a5ee7d6f2b99fdcb7e42113e73029d5c60323a5ee96`. Candidate G er fortsat eneste offentlige model. Opdateret exact-head, merge, frisk produktion og offentlig desktop-/mobilverifikation udestår fortsat.
## 4.0.318-kandidat – source-attesteret målt first-cutover (2026-08-30)

- **Nyeste offentlige baseline:** Produktion `33368963614` på uændret `origin/main 8c03e25d` er grøn gennem build, frisk fuld validate, releasegate, protected sync/artifact og Pages; `rr-20260831074016-210` er komplet 210/673. Det er Candidate G/4.0.316-bevis, ikke state-6-bevis.
- **Lokal slutlukning:** Workflowet er opdelt i orchestrator/build/deploy, alle 40 direkte readers er migreret, role-aware workflowkontrakter og public-integrated 210/673 + 78 browsermoduler er grønne, profil/cutover/8-consumer-binding er grøn, assistentens state-6-fixture er fast i `validate:source`, og slutreviewet fandt ingen P0/P1. Exact-head, merge, frisk state-6-produktion, Feggesund 3 × 118 og offentlig desktop/mobil udestår.
- **Nyeste Candidate G-drift:** Normal produktion `33345476979`/`rr-20260831010337-210` var første grønne recoverybevis på den gendannede `c58deb78`-baseline. Det tidligere external-watchdog-`workflow_dispatch` `33347230240` (01:19–01:28Z) bestod fuld DMI, validate, releasegate, storage gate og Pages og publicerede `rr-20260831012407-210` (genereret 01:24:07Z, reference 00:00Z) komplet 210/673, `VERIFIED_ONLY`, med nul syntetiske samples. Candidate G er 0/210 aktiv på grund af historikmemory. `33343469247` og `33344823000` var transient-503-stop i build/prepare uden deploy; bounded retry-hotfixen er produktionsverificeret gennem PR #237, exact-head `33352520408`, merge `8c03e25d`, backend `33352661061` og fuld produktion `33352634365`; automatisk run `33354263148` publicerede `rr-20260831034128-210` komplet 210/673. Offentlig visuel desktop-/mobilkontrol er fortsat åben.
- **Endelige lokale 4.0.318-bindinger:** Integrated `modelContractSha256=778db7aa3946f925607a8304daa42ed17dd30294e4a51bf6d895d7293e84c4e7`/`modelBundleSha256=e880d5425e6f7b93d8afc99cddf491e58ad5a4a2ab055f8e4455193609c90a73` over 43 filer/8 consumers. Candidate G-rollback `modelContractSha256=c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8`/`modelBundleSha256=4ccc2081982677aadbb47a5ee7d6f2b99fdcb7e42113e73029d5c60323a5ee96` over 55 filer.
- **Lokal kontraktlukning:** `ravradar-production-workflow-outcome-v2`, Spørg RavRadar-skeln mellem historikmangel/direct missing og DA/DE/EN-plain-language om firetimers energivægtning/højst 15 % dæmpning er måltestet. Ét aktivt 15-minutters kontroljob diagnosticerer/reparerer vejrdrift og må ikke duplikere scheduler/watchdog eller blindt redispatche.
- **Første produktionsbase efter nødrollback:** PR #236 gendannede den eksakte 4.0.316/Candidate G-tree på `origin/main` `c58deb78`. Exact-head `33342157517` var grøn, og post-merge-produktion `33342219152` gennemførte fuld validate, releasegate, artifact og Pages. Det daværende første post-merge-manifest var `rr-20260830234144-210` med 210 zoner/673 kystdele; den nyere offentlige sandhed står ovenfor.
- Tilføjer eksplicit, planforseglet historisk vedligehold fra H0 til checkoutets H1 uden nye controllerfelter: `candidate-historical-maintenance` bruger `historical-refresh-begin/complete/abort`, og `integrated-historical-maintenance` bruger `integrated-historical-maintenance-begin/complete/abort`. Direct historisk Candidate H0→integrated H1 bruger fortsat en immutable `IntegratedReturnPlan`. Ordinary Candidate-/integrated-maintenance kræver uændret exact current binding og må ikke brede de historiske undtagelser ud. Controller-v4 forbliver præcis 30 felter, fire statusser og seks transitionstyper.
- Lukker den tvetydige Pages-fejlvej med en todelt exact-target recovery: Kun bevis for `FAILED_BEFORE_PAGES_ACCEPTANCE` må gendanne den forseglede source. Ved tvetydig Pages-start, hvor source stadig er synlig, genudgiver en isoleret writer de eksakte hash-/størrelses-/artifactbundne targetbytes; en separat finalizer uden Pages-rettighed kræver stabil targetobservation, exact main/PENDING/CAS og skriver derefter controller/profil atomisk. Tredje/mixed/reversed hash, manglende eller ændret plan, stale CAS og udløbet evidens stopper fail-closed. Den verificerede `pages-recovery-*`-deployment bevares som næste source-lineage.
- Gør state-6-`HISTORY_INCOMPLETE` operationel gennem hele den offentlige 118-timers akse (aktuel time + 117, fem kalenderdage), når hver times direkte obligatoriske input er gyldige. Brugeren får lower/upper/spænd/dækning og en tydelig DA/DE/EN-advarsel, som forsvinder ved `FULL_HISTORY`; `calibrationEligible=false`. Direkte inputmangel er fortsat `UNAVAILABLE` for den berørte time og må ikke skjules med interpolation, carry eller nabozonelån. Spørg RavRadar skelner disse to situationer. Den offentlige forklaring beskriver fire timers energivægtet halvering og højst 15 % dæmpning i almindeligt sprog uden intern W/N/T/EWMA-jargon; måltests er grønne, mens exact-head/offentlig kontrol udestår.
- Produktions-outcome-kontrakten for 4.0.318 er `ravradar-production-workflow-outcome-v2`: den payloadfri exact-key-kontrakt omfatter også historical actions samt recovery writer/finalizer/gate. Kode, releasegate og måltests er lokalt synkroniseret; dette må ikke overclaims som exact-head-/produktionsverificeret endnu.
- Bevarer 4.0.317 som et merged, men aldrig deployet checkpoint: PR #235 bestod exact-head `33332106627` på `30306a51` og blev merged som `a584d1cf`; mergeproduktion `33333490853` stoppede ved aggregate Candidate G-resolveren før DMI/Copernicus, scorebygning, beskyttet state/cache/checkpoint/adminskrivning, artifact, Pages, deploy eller activation. Den offentlige kilde var komplet 210/673 med 0 `READY` og 673 kanoniske warmupstates. Candidate G/4.0.316 og central profil blev ikke ændret.
- Deler første cutover i præcis to sikre datagrene. `candidate-g-migration` kræver 673 kanoniske `READY` schema-2-states, ét fælles target og identisk source/active samplingkontekst. Kun en samlet source-attesteret kanonisk warmup/missing-population eller et legitimt source→active-kontekstskift må vælge `genuine-cold-start` ved produktionstarget. Det push-only controllercutover kan tilsvarende starte fra én af to forseglede Candidate G-kilder: rowless exact legacy bruger `expectedVersion=0`/`legacySourceRequired=true`, mens en verificeret bridge-complete bruger exact current Candidate-marker, den aktuelle centrale CAS-version og `legacySourceRequired=false`.
- Hydrerer Candidate G-manifest, conditions og kildens eksakte `coastal-parts-v2.json` som én valideret kildeenhed og gemmer kilderegisteret isoleret. Det aktuelle aktive register materialiseres separat fra central adminkonfiguration før targetvalget. Ingen geometri, land-/vandpunkter eller kystnormal flyttes eller omskrives.
- Gør targetoverdragelsen entydig som kanonisk `YYYY-MM-DDTHH:00:00Z` mellem Node-resolver og Python-WAM. Aggregate-output indeholder kun mode, target, antal 673 og source-attestation; ingen state, evidens, koordinater, private payloads eller rå U/V.
- Afviser fortsat malformed, reconstructed, tampered, fremtidig eller ukendt state, forkert stateKey/model/schema, part-/zonesætmismatch, blandet migrationsmål uden legitim cold-årsag, en tidligere afvist ugyldig integreret continuation/checkpoint og uattesteret cold-start før DMI og mutation.
- Lader state 6 genuine cold start genafspille 0–48 faktisk tilgængelige, proveniensverificerede timer plus reel target. Alle WAM-timer i denne gren skal være exact native med `maximum_interpolation_hours=0`; `INTERPOLATED_COLD_START` fejler lukket. Højst fire timers same-run-interpolation forbliver afgrænset til Candidate G-migration/generisk acquisition. Den separate Candidate G-rollbackgren starter eksklusivt fra sit eget målte replay, må ikke hybridiseres med legacy/private continuation eller integreret state og skal selv nå `READY`, før checkpoint/cutover kan passere. Der gives ingen dobbelt targetcredit.
- Bevarer WAM-bootstrapcheckpoints og en eksisterende progressiv DMI-/WAM-cache efter både producersucces og reel producerfejl, men ikke efter cancellation. Genbrug skal stadig bestå byte-, run-, collection-, grid-, celle-, target-, horisont-, provenance-, 210/673-, validate- og releasegates; delvis cache er aldrig readiness.
- Gør Candidate G-vedligehold reachable fra en rowless exact legacyprofil: schedule/watchdog og manuelt vejr vælger `candidate-legacy-maintenance`, transition `LEGACY_CANDIDATE_G_REFRESH_BEFORE_INITIAL_CUTOVER` og CLI `legacy-refresh-begin/complete/abort`. Begin skriver `CANDIDATE_G_PENDING` med active/source legacy og requested current Candidate under bevaret legacyprofil. Complete/target-reconcile kræver exact offentlig implementation+210/673, sætter kun current Candidate aktiv/profil, bevarer `initialCutoverRequired=true` og sætter `legacySourceRequired=false`; abort/source-reconcile bevarer legacy public/profile og `legacySourceRequired=true`. Legacy-markøren består efter complete med exact current Candidate og fire `null`-returnfelter gennem senere pre-cutover maintenance; den må kun arves, aldrig opstå ved relabel, og `legacySourceRequired` følger den faktiske sourcebinding. Den særskilte four-hash-lineage `CANDIDATE_G_REFRESH_BEFORE_INITIAL_CUTOVER` bruges kun efter et sikkert afbrudt integreret first-cutover-forsøg og bevarer Candidate G-profilen samt `returnPlanSha256`, `integratedReadinessSha256`, `integratedPublicAuditSha256` og `integratedManifestSha256`. Controller-schemaet er nu `ravscore-operational-model-activation-v4` med fire statusser, seks transitioner og præcis 30 felter inklusive source/requested implementation-closure-hashes. Kun push må forsøge `integrated-cutover`; vedligehold må aldrig skrive `INTEGRATED_PENDING`, aktivere state 6 eller skabe historik.
- Bevarer state-6-kvaliteterne `FULL_HISTORY`/`HISTORY_INCOMPLETE`/`UNAVAILABLE`, same-model-nøddrift, Candidate G-rollback-READY-gaten og den samlede 20/50/30-model uændret. Ingen syntetisk historik, interpolation af strøm, nabozonelån, geometri-/punktændring eller empirisk præcisionspåstand tilføjes.
- **Status:** De målrettede lokale controller-, historical-maintenance-, exact-target-recovery- og workflowtests er grønne. Fuld `validate:source` på kandidatens endelige træ, egen exact-head, merge, frisk fuld 4.0.318-produktion/releasegate/artifact/Pages, Feggesund 3 × 118 og offentlig 210/673 current/fem døgn desktop-/mobilverifikation udestår. Candidate G/4.0.316 er fortsat eneste offentlige model.

## Historisk 4.0.317-kandidat – integreret RavScore state 6 under DEC-0110/DEC-0112 (2026-08-30)

- Samler næste RavScore under DEC-0110/DEC-0112 som én modelkontrakt: `RRS-COASTAL-PROCESS-INTEGRATED-1.1.0`, state `6.0.0`, variant `COASTAL-SUPPLY-MOBILISATION-BOUNDED-WAVE-APPROACH-HUNTABILITY-2`, profil `cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-historybounds12d-lastmileewma4-tail40-atten15-v5`, komponent `ravscore-components-huntability-delivery-mobilisation-bounds-v5`, forklaring `ravscore-explanation-integrated-bounds-v5` og 20/50/30.
- Fastlåser den lokale 4.0.317-releasekandidats 11-feltsbinding til `modelContractSha256=778db7aa3946f925607a8304daa42ed17dd30294e4a51bf6d895d7293e84c4e7` og den reproducerbare 43-filers transitive bundle `modelBundleSha256=74bfc42bb008f6743f374fc35201d3ea6f81f6e360c99873541fed83eeadcbae`.
- Forsegler migrations-/rollback-oraklets faktiske offentlige Candidate G-kilde som produktionsverificeret 4.0.316 på head `49dd4cb454656bdf629e5df760176705e38d2cb0`/tree `975c3e9432cea7780564ffd56766bc1f0a0a9763`, central switch `RAVSCORE-PROFILE-SWITCH-4.0.316`, source contract `2f888a16190e9e43e44536536029f1b0021a1b850195524aa2312664ca74810b` og 53-filers closure `a366b4a64fc3ccc8f1b94f3fed24b3ce03ea23d906396bc8bea183338c5d2606`. PR-, build- og deployverifikation henter og attesterer denne eksakte pinned kilde, også i shallow checkout.
- Fjerner den historiske 13-timers helscore-gate. Et langt stærkt udgående forløb kan fortsat gøre transportbeviset 0, men det beviser ikke, at ravlageret er tømt, og nulstiller ikke søgeforhold eller mobilisering.
- Tilføjer et afgrænset sidste-mile-led fra den kausale energivægtede bølgeapproach med fire timers halveringstid, afledt som `W/N/T` med en ældre hale. DMI-WAM `FROM` roteres præcis én gang +180° til `TOWARD` mod den uændrede eksisterende kystnormal. `normalAlignment` er det energivægtede normalmoment divideret med aktivitet, `approach=clamp((normalAlignment+0,25)/1,25,0,1)`, `factor=clamp(1-0.15×W×(1-approach),0.85,1)`, og `delivery=supply×factor` anvendes præcis én gang. Bølger kan aldrig skabe eller øge supply; den rå totalscore kan højst dæmpes 7,5 point før slutafrunding; den viste heltalsscore kan derfor ændres 8 point. Aktiv direction-missing fejler lukket. Kun `waveHeightM=0` er eksakt calm og neutral; `wavePeriodS` skal stadig være finit og ikke-negativ. `waveHeightM>0` med `wavePeriodS=0` er `INVALID` og fejler lukket.
- Bevarer erkendelsesgrænsen: `physicalDeliveryResolved=false`, fysisk interval `null` og ingen påstand om empirisk højere fundpræcision. DDM 2024/v2's officielle 50 × 50 m-grid har moderne søopmåling, dybde/kilde/opmålingsår og også lavtvandsdata fra satellit/lidar; det er ikke fravalgt for mangel på lavtvandsdata. Men interpolerede utilstrækkeligt dækkede celler, generaliseret 1:100.000-kystlinje og fravær af dynamiske revler/ripkanaler/bølgeopløst surfzone gør det kun til statisk kontekst, ikke scoreinput. Rainville m.fl. 2026 er kun buoyant-object-analogi og ikke ravkalibrering. Ingen kystnormal, geometri eller land-/vandpunkter flyttes.
- Behandler fortsat faldende vand tosidet og score-neutralt: noget mobilt rav kan føres søværts, mens lavere vand samtidig kan blotlægge eller gøre fastholdt rav bag revler lettere at afsøge. Vandstandstrend bliver ikke en ekstra “hele vandsøjlen”-strøm oven på DMI/Copernicus-U/V.
- Erstatter den foreløbige cutover med `candidate-g-schema2-signed-current-reweight-bounded40h-wave-approach-to-integrated-schema6-v5`. Migrationen validerer og genvægter kun Candidate G's signerede, allerede afledte kystnormale currentevidens; den læser/kopierer ikke rå U/V og påstår ikke lighed med en rå genberegning.
- Genopbygger wave-approach fra 40 private præ-target-positioner i ét sammenhængende DMI WAM-run pr. anvendt collection med same-cell native provenance. Kun WAM-gap mellem native endepunkter højst fire timer fra hinanden i samme run/collection/grid/celle må interpoleres. Udeladt EWMA-hale er højst `1/1024`, og konservativ rå-scorefejl er højst `0.01171875` før afrunding. En aggregate-only gate kræver præcis 673 gyldige schema-2-states og ét fælles kanonisk target; mixed target, invalid state eller utilgængeligt coherent run stopper fail-closed og bevarer Candidate G offentlig. Ingen syntetisk eller offentlig historik dannes.
- Versionerer ægte cold start som `bounded-private-48h-history-cold-replay-v3` med 0–48 private kausale positioner plus reel target og eksakte count-/transitionfelter. Også 48/48 er `HISTORY_INCOMPLETE`, indtil 288-timers wave-tail closure eller attestert migration/continuation. Candidate G-rollback `integrated-schema6-to-candidate-g-schema2-v3` bruger samme targettid uden dobbelt recovery-credit. Den aldrig-offentlige schema-5-kandidat kan kun migreres fra et eksakt historisk `READY`-punkt gennem `integrated-schema5-ready-point-to-schema6-history-bounds-v1`; derefter fortsætter state fra privat hashbundet runtime eller state-6-checkpoint. Offentligheden får kun de fire schema-4-livefiler.
- Tilføjer numerisk konservativ `HISTORY_INCOMPLETE`: gyldige direkte scoretimeinput giver vist lower bound samt upper bound, spænd, årsager og historikdækning gennem hele 20/50/30-kæden; manglende direkte input giver fortsat `UNAVAILABLE`/`null`. Currentvinduet er 48 timer, bølgemobiliseringens usikkerhedshale 288 timer og last-mile-halen 40 timer. 168 timers researchretention har ingen scoreeffekt.
- Binder `FULL_HISTORY`/`HISTORY_INCOMPLETE`/`UNAVAILABLE`, bounds, advarsel og `calibrationEligible=false` til startup/detaljer/hashes, current/fem døgn, rangering/beste tidspunkt, strand/waders, DA/DE/EN, lokal/Edge-assistent, ture/observationer, admin/ekspert, central profil, scheduler, checkpoint/recovery/rollback og audits. Numerisk score rangerer først; full history vinder kun et eksakt tie. Trip-/observationspersistens af lower/upper/span/coverage/reasons er lukket lokalt gennem klient, immutable snapshot, DTO, Edge, SQL og målrettede tests. Sekundære bedste tider og alternative kystdele fører nu deres egen kvalitet, bounds, coverage og reasons: `HISTORY_INCOMPLETE` vises med kompakt markør og interval, mens `UNAVAILABLE` aldrig viser en opdigtet score. Den atomisk checkpointparrede READY rollback-companion er implementeret som checkpointschema 4/cache-v2 med grønne serializer-/protected-storage-tests; same-reference publish/restore sammenligner både `generationSha256` og hele den validerede companion før første mutation og stopper fail-closed ved divergens.
- Gør kystdelsstaging dual-state og atomisk: schema 3 indeholder både den eksakte integrerede state-6-aktivering og en eksakt Candidate G-rollback-companion med hver sin hash samt fælles parhash. Kun `POINT_ACTIVATION` må vælge companionen; cross-part, cross-target, mixed-generation, tamper og privacy-afvigelser fejler lukket.
- Lukker native-hold-slutrevisionen uden P1/P2/P3-fund: kun eksakt ejerautoriseret regional native cadence må attestere hold op til tre timer; et almindeligt spring over én time bliver ukendt historik med bounds, t0→t3 kan ikke retroaktivt lukke et hul, og normal DMI/Copernicus-evidens tilbagekalder holdautorisationen. De syv målrettede regressioner er grønne.
- Tilføjer det payloadfri workflow-outcome `NOOP`/`DEFERRED`/`BUILT`/`DEPLOYED`/`FAILED`. NOOP/DEFERRED må ikke bære falsk build-/deploybevis, BUILT må ikke bære Pages-/offentlig verifikation, DEPLOYED kræver hele den eksakte offentlige kæde, og FAILED holder runnet rødt.
- Binder releasegaten til den faktiske arkitektur frem for pensionerede tekstliteraler: det atomiske to-dokument-RPC/SQL-CAS-ejerskab og dets service-role-rettigheder, den eksakte native-time DMI-matrix fra -48 til +117 timer, den dynamiske 15-minutters eksterne/45-minutters interne watchdog, eksplicit afvisning af public fallbackfelter samt den virkelige DA/DE/EN-startuptekst. Den gamle fresh-startup-regression validerer nu schema-4-envelope, bytes/hash/modelbinding og fail-closed fallback; SQL/RPC-installationsparitet er gjort obligatorisk i `test:ravscore-integrated-profile` og dermed `validate:source`. Krævede filer og ugyldig JSON samles nu som diagnostik i samme slutrapport i stedet for at afbryde ved første filfejl, og dette er dækket af en hurtig sourcegate-test. Dette var grøn 4.0.317-kandidatevidens; efter 4.0.318's historical/recovery/outcome/P2-delta skal den fulde slutreleasegate køres igen.
- Registrerer Feggesund som en åben part-level-gate, ikke en implementeret proxy: `rr-20260830104132-210` har 118/118 parent-wave-missing, men de tre aktive dele findes, har `marineCoverage=full`, og Candidate G-current er tilgængelig i begge modes. Frisk integrated 3 × 118-bevis kommer først. Kun ved et reelt part-level-hul og dokumenteret umulig korrekt direkte DMI/egnet officiel data må den ejerautoriserede konservative nabozonehypotese for præcis `DK-B05-11` vurderes gennem særskilt RDKS/proveniens/usikkerhed/cache/recovery/kapacitet/rollback/test; ingen generel fallback, historieskabelse, strømlån eller punktflytning.
- Tillader kun same-model, komplet, atomisk og hashbundet nøddrift i højst 72 timer eller kortere forecastudløb; cross-model fallback og interpolation er forbudt. Kun VERIFIED_ONLY er kalibreringsegnet; reconstructed/emergency og ture er ikke kalibreringsgrundlag.
- Registrerer, at den planlagte fiktive udførelse af morgenhullets rekonstruktion blev opgivet før descriptor/apply/mutation/publicering. Fjerner de seks workflow-inputs, inspect-/apply-/rollback-/cleanup-vejene, incidentpolicyen, mutatoren og positive eksekveringstests. En negativ source-/releasegate forhindrer genåbning, mens nødvendig historisk read-/quality-kompatibilitet og Candidate G's separate helrollback bevares. DEC-0109 er dokumentation, ikke fallback.
- Binder ranglister, bedste tidspunkt, zonedetaljer, femdøgn, strand/waders, DA/DE/EN, Spørg RavRadar, ture/observationer, konto/turlog, admin, håndbøger, scheduler, audits og releasegates til samme model-/statekontrakt. Schema 3 accepterer kun eksakt integreret eller forseglet Candidate G-11-feltsbinding; Candidate G er altid ikke-kalibreringsegnet, og ukendt/forfalsket binding afvises i validator og SQL. Turloggen bevarer den oprindelige privacy-sikre binding og udleder current/historical/ineligible mod det aktive overlay uden ommærkning. Mens integreret er aktiv, findes Candidate G kun som privat migration-/offline-/rollback-orakel; den kan aldrig være samtidig eller automatisk offentlig fallback.
- Fører både `modelContractSha256=778db7aa3946f925607a8304daa42ed17dd30294e4a51bf6d895d7293e84c4e7` for parameterkontrakten og `modelBundleSha256=74bfc42bb008f6743f374fc35201d3ea6f81f6e360c99873541fed83eeadcbae` for den transitive 43-filers implementeringslukning gennem hele 11-feltsbindingen og afviser hvert felt særskilt ved mismatch.
- Holder bølgernes tre roller adskilt: `Hs² × T` bygger tidslig mobilisering, aktuel bølgehøjde påvirker metode-/sigtbarhed, og retnings-EWMA'en med fire timers halveringstid kan kun dæmpe delivery. Jagtbarhedsvejen giver ingen ekstra mobiliserings-, supply- eller last-mile-kredit.
- Harden strøm- og talkontrakten: verificeret DMI/Copernicus-U/V danner selv kanonisk fart til 0,01 m/s og toward-retning med 360°→0°, så modstridende cachefelter ikke kan blandes ind. Numeriske strenge, booleans og andre coercible typer afvises gennem model, state, migration, recovery, privat runtime og offentlig projektion.
- Låser red-team-kravet om observationsatomisk backend-/Edge-/Pages-cutover: migration `20260829010000_ravscore_operational_documents_no_history.sql` før `20260829020000_integrated_trip_calibration_binding.sql`, samlet protected readiness, eksakt Edge-`409`, eksklusiv point → bundle → checkpoint → engangsimport og durable v3-controller. Første push-only cutover observerer Candidate G-kildemanifestet, skriver `INTEGRATED_PENDING` med source/requested-hash og bevarer central Candidate-profil under integreret Pages-deploy; efter exact implementation+210/673 sætter én RPC samtidigt `INTEGRATED_ACTIVE` og central integrated 11-feltsprofil. Retry completer ved targethash, aborterer/rekonsoliderer ved sourcehash og stopper fail-closed ved tredje hash. Migrationen bevarer eksisterende `admin_document_versions`, og backendworkflowet genverificerer `origin/main == GITHUB_SHA` efter dry-run før første eksterne write.
- Tilføjer operationel Candidate G-helrollback og integreret tilbagevenden med samme source/PENDING/target/reconcile. Rollback/return er manual-only; ordinary schedulermaintenance bruger kun `CANDIDATE_G_REFRESH` på exact current Candidate-binding, mens en dokumenteret H0-binding kun må vedligeholdes gennem den senere planforseglede `candidate-historical-maintenance`-gren. Ingen schedulergren må initiere modelskift. Under manuel rollback må kun en eksakt `READY`/`memoryReady` Candidate G-runtime projicere sin egen mode-score som `FULL_HISTORY` + `EXACT_POINT_SCORE` med collapsed bounds, coverage 48 og tomme reasons; non-READY/mismatch stopper, og `calibration_eligible=false` består separat. Der deployes ingen særskilt Candidate G-assistent-Edge: integreret Edge svarer `409`, klienten bruger deterministiske lokale DA/DE/EN-svar. Det er fail-closed/local-only og ikke en skjult dualmodel. Candidate G-rollbackens separate 54-filers binding er forseglet som `modelContractSha256=c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8` og `modelBundleSha256=fd3f7e70ec3706818c153c26140ae592e4f0ad2acc6c157183984689f74a2207`; exact-head-, produktions- og offentlig bevisførelse er fortsat åben.
- Den lokale kandidat er fysisk motiveret og mekanisk regressionstestet, men må ikke kaldes empirisk mere fundpræcis uden repræsentative fund og nul-fund.
- **Status:** 4.0.317 bestod efter de to dokumenterede safe-fail-runder sin afsluttende PR #235 exact-head `33332106627` på `30306a51c4e360c5054368f1b0167e3aaa3862ee` og blev merged som `a584d1cf1a53692b10b0f01244eab4fb91ca89b1`. Mergeproduktion `33333490853` stoppede derefter sikkert før DMI/Copernicus, protected writes, artifact og Pages ved 0 READY/673 kanoniske warmupstates. Versionen blev aldrig deployet eller offentlig; 4.0.318 overtager den åbne first-cutover-gate. Offentlig 4.0.316 fortsætter på Candidate G. Frisk `rr-20260830091913-210` er regressionsbevis, ikke state-6-releasebevis eller dokumentation for empirisk bedre fundpræcision. Geodata var uændret bortset fra det autoriserede topversionsfelt 4.0.316→4.0.317.

## 4.0.316 – frisk primary uden gyldig ældre fallback (2026-08-30)

- Same-version driftskandidat 2026-08-31: exact-main-runs `33343469247`, `33344823000` og `33348745681` stoppede alle på HTTP 503 ved det normale ikke-indloggede `trip-log`-kald. Det tredje run nåede dertil efter grøn vejrproduktion, 210/673, fuld validate og releasegate, men før deploy. Kodeaudit viste, at normalruten forbruger rate limit før auth og derfor ikke er no-write eller retryegnet. Der blev ikke skrevet turdata eller publiceret et nyt artifact.
- Fjerde uafhængige livehændelse: grønt external-watchdog `33351078871` oprettede præcis én produktion `33351090164`; den bestod vejr/DMI/Copernicus, 210/673, fuld validate, releasegate og datagates, men gammel step 69 stoppede igen før deploy på HTTP 503 fra normal unauthenticated `trip-log`. Det styrker behovet for hotfixen uden at ændre den fail-closed konklusion.
- Workerens count-read får sin egen faste, descriptor-ejede retry med eksakt `POST {}`, 0/250/750 ms og samme snævre transientliste. Usigneret svar skal være 401; signerede forsøg får frisk timestamp/HMAC og skal være eksakt 200 med kun `ok=true` og et ikke-negativt sikkert heltal. Count-funktionen er ren `SELECT`; kun dens interne readfejl bliver fast datasikker 503, mens andre kontraktfejl fortsat stopper straks.
- Retry er nu teknisk allowlistet til OPTIONS og en privat HMAC-signeret, statefri `trip-log`-GET uden request-body med fast syntetisk signature-path, per-attempt cachebuster og fast minimal 401 `LOGIN_REQUIRED`. Gammel Edge afviser GET med ikke-transient 405 før rate limit; ny Edge håndterer den før rate/auth/storage. Alle normale `trip-log`-kald samt alle `submit-observation`-/400-prober forbliver single-shot.
- Højst tre forsøg bruger deterministisk 0/250/750 ms og kun 429/502/503/504 eller bundet transporttimeout. Eksakt 204/403 eller den signerede faste 401-kontrakt kræves efter retry; forkert ikke-transient kontrakt stopper straks, udmattelse er rød, og transient body/cause logges ikke.
- Den signerede Edge-probe beviser kun liveness, response-kontrakt, modeheader og version—not auth-resolve eller lagerlæsning. Samme pre-write gate kører derfor også eksisterende Worker-health og HMAC-signeret `/v1/trips/count`, som er det faktiske D1-readiness-bevis.
- Patchen ændrer ingen offentlig app, Pages-payload, Candidate G/RavScore, model/state, DMI/Copernicus, turdata, cache/recovery, geometri eller punkter og beholder derfor version 4.0.316. Den er kun lokal kildekandidat; exact-head/merge/livebevis mangler.
- PR #233 bestod exact-head `33299676128` og blev merged som `63d789a4`. Post-merge-run `33299747300` frigav 4.0.315-D1-gaten og startede build, men stoppede rødt ved **“Stage audited last verified Candidate G public fallback”**, fordi ingen measured-only fallback var inden for både 72 timer og sin prognosehorisont. Intet nyt artifact/Pages blev publiceret.
- Gør last-verified fallback valgfri for en frisk measured-only primary, som består egne current-hour-, direkte input/provenance-, 210/673-, accounting-, audit-, validate- og releasegates.
- Gammel, udløbet, ufuldstændig, ukendt, blandet, rekonstrueret eller manipuleret fallback må aldrig vises. Den skal være fraværende i manifestet og fjernes fra publicerede fallbackfiler; forventet fravær må ikke blokere current+fem døgn.
- Uventet primary accounting/audit og manglende direkte input forbliver fail-closed. Ingen syntetiske eller interpolerede data skabes.
- DEC-0112/DEC-0102 binder state-6-kandidaten til numerisk konservativ `HISTORY_INCOMPLETE`-score over current+fem døgn ved gyldige direkte input, auto-forsvindende DA/DE/EN-advarsel og `calibrationEligible=false`; direct-input-mangel er separat `UNAVAILABLE`.
- Workflowmonolit, grøn-no-op/skipped-semantik og spredt version/docs/string-testkobling er bindende modelarkitekturroadmap og udvider ikke P0-hotfixen.
- Offentlig 4.0.316/Candidate G er observeret som `rr-20260830091913-210` med 210/673, men 0 aktive/210 `UNAVAILABLE` på grund af utilstrækkelig sammenhængende strømhistorik. Det beviser den gamle regression, ikke state 6.
- Candidate G, RavScore, DMI/Copernicus, storage, geometri, zoner og land-/vandpunkter er uændrede af hotfixen.

## 4.0.315 – pensioneret stale rekonstruktionsinterlock (2026-08-30)

- Lukker en offentlig P0, hvor 4.0.314's tilbagetrukne one-time Candidate G-operation stadig var prerequisite for normal vejrproduktion. Det umulige apply+Pages-bevis gjorde jobs grønne no-ops uden build, artifact eller Pages.
- Den offentlige primary var mere end otte timer gammel, og measured-only recovery var over sin absolutte 72-timersgrænse. RavRadar viste derfor korrekt **“Aktuelle data kunne ikke hentes. Gamle data vises ikke.”**, men aktuelle og femdøgnsprognoser var utilgængelige.
- Ingen descriptor blev forseglet, ingen apply/rollback/cleanup blev kørt, og ingen syntetiske eller interpolerede Candidate G-data blev anvendt, gemt i offentlig runtime eller deployet.
- DEC-0111 erstatter DEC-0109 operationelt. Operationsinput/jobs, aktuator, admin-descriptor, gamle operationstests og package-/releasegatebindinger pensioneres; apply+Pages-attestationen fjernes. Historical exact-D1-jobbet bevares for 4.0.311–4.0.314, men 4.0.315 returnerer eksplicit `ready=true`.
- Normal drift er fortsat measured-only. Gap-checkpoint, continuation, senest-komplet recovery, current-hour, DMI/Copernicus, 210/673, fuld validate/releasegate, artifact og Pages bevares. Defensive trust-/schema-/turkvalitetslæsere bevares fail-closed, men kan ikke skabe rekonstrueret state.
- Den eksisterende trip-quality workflowtest normaliserer kun CRLF i workflowteksten i hukommelsen, så dens uændrede regexkontrakt også kan køre på Windows; ingen produktionssemantik ændres.
- Kandidaten kræver fortsat målrettede lokale gates, exact-head sourcegate, merge, en frisk normal produktion med de fulde trin faktisk kørt og offentlig kontrol af frisk manifest/startpakke/detaljer samt aktuelle og femdøgnsprognoser. Grøn topstatus alene er ikke releasebevis.
- Candidate G-formel, RavScore, DMI/Copernicus, vejrsemantik, trip-storage-kontrakt, geometri, zoner og land-/vandpunkter er uændrede. Kun de autoriserede topversionsfelter i geodata følger releaseversionen.
## 4.0.314 – cadencepolicy bundet; recovery fortsat gated (2026-08-30)

- Før-primary-hotfixet bestod PR #231 exact-head `33279317463`/`99171645787`, blev merged som `d539fc9d`, og push `33279411885` var korrekt no-op. Exact-main D1 `33279463545`/`99172031927` bestod hele kæden.
- Read-only inspect `33279639424`/`99172534863` stoppede sikkert før descriptor/apply/build/Pages ved `ONE_TIME_GAP_AMBIGUOUS_NATIVE_CADENCE`. Ingen data, cache eller offentlig drift blev ændret.
- Erstatter suffixbaseret cadencegæt med den eksisterende regionale proxy-policy som per-del-identitetsautoritet. Kun en koordinatfri projektionshash bindes i descriptor/apply-CAS; 665/8 bevares som ekstra populationgate.
- Policyklassificerede 1h-dele accepterer eksakte målte 1/2/3h-afstande under Candidate G's eksisterende tre-timers continuitygrænse, uden at de manglende interne slots udfyldes. De otte `dkss_lf`-3h-dele kræver fortsat eksakt 3h på begge kanter og er de eneste med tilladt singleton-`AFTER`.
- Målrettet 210/673 cadence-/descriptor-/CAS-/rollback-/cleanup-/checkpointregression og workflowinterlock, fuld lokal `validate:source`, RDKS/håndbog/security/releasegate og tre slutreviews er grønne. Exact-head/merge, nyt D1, ny inspect/apply og offentlig verifikation afventer; 4.0.310-nøddriften er fortsat offentlig sandhed.
- PR #230 bestod på den korrigerede exact-head `7ad1a98b` i run `33277107562`/job `99165644953`, blev merged som `228725ea98a04e5d34c4bf4c74d40799e94081a0`, og push `33277217412` var en tilsigtet grøn no-op uden inspect, build, artifact eller Pages.
- Første exact-main D1 `33277253662`/`99166039224` stoppede på en forbigående 503 i den uautentificerede trip-log-probe efter Edge-deploy. Hele den kontraktbundne fail-closed roll-forward bestod; der blev ikke kørt inspect. Den idempotente genkørsel `33277510537`/`99166722076` bestod derefter hele source-, storage-, Edge-, Worker-, sync-, reconciliation- og slutattestationskæden på samme `228725ea`.
- Read-only inspect `33277738135`/`99167394284` bestod D1-readiness og stoppede før descriptor, apply, build og Pages med den nye datasikre kode `ONE_TIME_GAP_BEFORE_NOT_UNIFORMLY_READY`. Dermed blev hverken data, cache eller offentlig drift ændret.
- Den bundne før-run publicerede den komplette målte nødvisning separat, mens supportartifactets `data/live/conditions.json` korrekt bevarede den ærlige primary. Før-primary må derfor være målt schema 2.0 og eksakt replaybar `WINDOW_INCOMPLETE`; kun det samlede target-reference-replay efter den ene forseglede bracketinterpolation skal være `READY`. En for kort suffix, et ekstra hul, schema 2.1, ukendt status eller replayafvigelse stopper fortsat før descriptor.
- Den syntetiske positive fixture bruger nu 673 ærlige 24-timers `WINDOW_INCOMPLETE`-før-states. Hele 210/673 inspect/CAS/rollback/cleanup/checkpoint-regressionen består med og uden nedarvet Actions-miljø, mens ældre huller og manipulerede før-states fejler lukket. Same-version-rettelsens exact-head, merge, nye D1, inspect/apply og offentlige verifikation afventer.
- Registrerer 4.0.313 PR #226/exact-head `33269501339`, merge `ff62ba11`, korrekt no-op push `33269584236` og helt grøn exact-main D1-backend `33269631305`/`99145677813`.
- Registrerer read-only inspect `33269849748`/`99146287609`, som stoppede før descriptor/apply med `ONE_TIME_GAP_AFTER_EVIDENCE_COUNT`; ingen data eller cache blev ændret, og intet nyt descriptor-/releaseartifact eller Pages-deploy blev oprettet.
- Accepterer ét målt afteranker kun for de uafhængigt beviste native 3-timersdele. Før, target, rollback og cleanup beholder minimum to, og alle replay-, bracket-, targetanker-, source-, descriptor- og CAS-gates bevares.
- Udvider exact-D1 til 4.0.314, gør inspect D1-afhængig og holder normal produktion i grøn no-op indtil exact-head apply+Pages-bevis. Fælles concurrency annullerer aldrig apply, og hele hvert GitHub API-svar parse- og shapevalideres samlet, før id'er bruges. 4.0.315 er ulåst.
- 4.0.314-kilden bestod PR #227 exact-head `33272564543`/job `99153577550`, blev merged som `d1369d88bfa24d28fa0371fbfa50cff9d3642d58`, og push `33272676071` var en tilsigtet grøn no-op uden build, artifact eller Pages.
- Den ældre 4.0.313-produktion `33271863449`/job `99151692515` stoppede før releasegate og Pages på en stale marine-first-regression, som forventede den afløste dynamiske `cancel-in-progress`-tekst. Det var en test-/sourcegate-dækningsfejl, ikke evidens for fejl i den nye `cancel-in-progress: false`-kontrakt.
- Same-version-hotfixet kræver præcis én `cancel-in-progress:` med værdien `false`, forbyder `true` og føjer `test:dmi-marine-first-recovery` til `test:workflow-action-contracts`, som `validate:source` allerede kører. PR #228 bestod exact-head `33274411880`/`99158510299`, blev merged som `503697425dd107883b34537a6e5eafc46ab5dcc6`, og push `33274505196` var korrekt no-op uden build/inspect/Pages.
- Docs-checkpoint PR #229 bestod exact-head `33275025105`/`99160126852`, blev merged som `9291250cc0809cc4dde9aaf3e20bf5b93c2837f2`, og push `33275147023` var korrekt no-op. Exact-main D1 `33275218540`/`99160622956` bestod alle kritiske storage-, Edge-, Worker-, sync- og slutattestationstrin.
- Read-only inspect `33275438494`/`99161265720` stoppede i planforseglingen efter kildehydrering/-udtræk og før descriptorupload; build og Pages var skipped, så ingen data blev ændret eller publiceret. Den sikre API viste kun exit 1. Diagnostikhotfixet annoterer derfor kun allowlistede `ONE_TIME_GAP_*`-fejlkoder. Ved succes annoteres kun descriptor-SHA og de faste 673-/prøve-/665-/8-optællinger; vilkårlig tekst maskeres, og den målrettede 210/673-black-box-regression er grøn.
- PR #230's første exact-head `e8f579ba`/`33276791132` stoppede kun i testharnessen: normale CLI-cases arvede runnerens `GITHUB_ACTIONS=true` og skrev korrekt på annotationens stdout i stedet for den forventede lokale stderr. Harnessen isolerer nu miljøerne eksplicit, og hele 210/673-regressionen er grøn både med og uden nedarvet Actions-miljø. Ingen produktion eller data blev berørt.
- Candidate G-formel/model/state/trust, DMI/Copernicus, vejr, geometri, punkter og private data er uændrede. Datahullet er fortsat åbent indtil frisk produktion og offentlig 210/673-kontrol.

## 4.0.313 – afgrænset legacy-replay-roll-forward, backendverificeret (2026-08-29)

- Registrerer 4.0.312 PR #225/exact-head `33266087776`, merge `a5ece10d` og korrekt no-op push `33266184326`.
- Registrerer, at backend `33266229687` bestod de tidlige D1-/Edge-/Worker-gates, men fejlede idempotent sync på `TRIP_GATEWAY_UNAVAILABLE`; failure-roll-forward tæller ikke som readiness.
- Reproducerer 4.0.310-nullblade mod 4.0.311's bounded PostgREST-leafprojektion syntetisk og accepterer kun eksakt migration→migration-kompatibilitet.
- Bevarer gamle D1-rækker, hashes og registry byteidentisk, afviser ukendte/core/non-null-forskelle og bruger faste ikke-lækkende gatewayfejl.
- Udvider exact-D1-interlocken præcist til 4.0.313. PR #226/exact-head `33269501339`, merge `ff62ba11`, no-op push `33269584236` og backend `33269631305` er grønne. Det efterfølgende read-only inspect stoppede før descriptor/apply; morgenhullet er fortsat ikke lukket, og offentlig sandhed er 4.0.310.
- Candidate G, RavScore, vejr, state, geometri og punkter er uændrede. Se `CHANGELOG-4.0.313.md`, DEC-0082 og DEC-0109.

## 4.0.312-kandidat – robust PostgreSQL-verifikation før backend og rekonstruktion (2026-08-29)

- Ruller 4.0.311 frem uden at ændre migrations-SQL, schema, Supabase-/Edge-/D1-runtime, Candidate G, RavScore, vejrdata eller rekonstruktionssemantik.
- Erstatter den skrøbelige flade regex mod `pg_get_constraintdef` med en balanceret, quote-bevidst kontrol af præcis ét `jsonb_path_query_array`-kald og den forseglede reason-code-rækkefølge. PostgreSQLs semantisk uvæsentlige venstre- eller højreparentesering accepteres; ombytning, dubletter, ekstra predicates og tvetydige ekstra kald afvises fortsat.
- Udvider de målrettede regressioner med realistisk PostgreSQL-deparsertekst og negative cases. Målrettede tests, hele lokale sourcegate, releasegate, RDKS/håndbog/version og særskilt geodatabevis er grønne; exact-head PR, merge og live backend mangler endnu.
- Bevarer first-release-interlocken for 4.0.312: Pages/vejrproduktion forbliver en grøn no-op, indtil den eksakte `main` har et grønt `[d1]`-backendbevis. Inspect/apply, frisk produktion og offentlig kontrol er ikke kørt.
- Offentlig RavRadar er fortsat produktionsverificeret 4.0.310. Se `CHANGELOG-4.0.312.md` og DEC-0109.

## 4.0.311 – merged kilde; backend stoppet før drift (2026-08-29)

- Tilføjer en manuelt aktiveret, incidentlåst inspect/apply/rollback/cleanup-kæde for `RRGAP-2026-08-29-CANDIDATE-G-01`, inklusive isoleret byteidentisk apply→rollback-bevis og kausal descendant-cleanup.
- Rekonstruerer kun allerede afledt, signeret kystnormal Candidate G-transportstyrke mellem eksakte før-/efterankre; ingen vejr-, bølge-, vandstands-, U/V-, koordinat-, geometri-, punkt- eller privat data interpoleres eller publiceres.
- Løfter kun state med levende rekonstruktionsmarkør til schema 2.1.0, fører trust gennem public payloads og gør den hverken kalibreringsegnet eller gyldig som observeret 13-timers udtransportbevis.
- Bevarer målt-only last-verified nødvisning, karantæner reconstruction-mode fra delte continuation/checkpoint/fallbackcaches og kræver frisk normal 673-delsgenberegning før genåbning.
- Binder ture fra rekonstrueret score eller vist nødvisning til eksakte ikke-kalibrerbare kvalitetsflags gennem klient, Edge, D1/Supabase, schema og installer.
- Bevarer aktive/pending schema-v2-ture fra før 4.0.311, men markerer manglende trust som `ravscore-evidence-trust-unattested` og udelukker dem fail-closed fra kalibrering.
- Ændrer eller sletter ikke allerede gemte pre-4.0.311 schema-v2-observationer. Den lokale prediction-/kalibreringsforbruger medtager kun observationer med `appVersion >= 4.0.311`, `calibration_eligible=true` og eksakt attesteret tom kvalitetsflagliste.
- Lukker nested browser/Edge/D1-privacy med ét testlåst lokationsaliasmønster, type-/intervalallowlist og en deterministisk, no-mutation-kompatibel projektion af historiske fri-form-snapshots.
- Kræver exact-head `[d1]`-backendbevis før Pages. Maintenance-kapabel Edge predeployes under uændret mode/gammel Worker; existing D1 dobbeltattesteres før en 20-minutters lease, drain og den højst syv minutter lange Worker-gate, mens genuine fresh forbliver i Supabase gennem første synk. Partial existing D1 repareres kun fremad; partial fresh genopretter Supabase-secret og eksakt Edge. Legacy-installationen kræver både eksakte ti EU-shards og jobniveau-bevis fra run `33024408547`: alle D1-trin `completed/success`, Supabase-rollback `completed/skipped`. Uverificerbar readiness giver ingen Pages-udgivelse.
- PR #224 på head `4c4699fe` bestod exact-head CI `33263734108` og blev merged som `7c168b00`. Pushkørslen `33263858078` bestod som tilsigtet no-op, fordi first-release-interlocken endnu ikke havde et live exact-head D1-bevis; intet artifact eller Pages-deploy blev bygget.
- Backendkørslen `33263892151` mod den mergede kilde stoppede efter HTTP 201 fra den atomiske CHECK-transaktion, da den efterfølgende read-only katalogverifikation ikke accepterede PostgreSQLs venstreparenteserede `pg_get_constraintdef`. Transaktionen indeholder ingen row writes og kan kun være fuldt committed med valideret constraint og comment eller fuldt rullet tilbage; der findes ingen halv constrainttilstand.
- Ingen private payloads, D1-, Edge-, Worker-, sync-, vejr-, artifact- eller Pagesændringer blev udført. 4.0.311 blev derfor ikke en produktionsrelease, og rekonstruktionens inspect/apply blev ikke kørt. 4.0.312 erstatter kun den fejlslagne verifier/testvej og fører den uændrede kontrakt sikkert frem. Se DEC-0109 og `CHANGELOG-4.0.311.md`.

## 4.0.310 – ekstern overtagelse efter ét manglende interval (2026-08-29)

- 4.0.309-vagt `33246369618` bestilte den første virkelige redningsproduktion `33246376992` efter fortsat native schedulerstilhed og beviste, at 45 minutter kunne give cirka en time mellem produktionsstarterne.
- Sænker kun det eksplicitte eksterne `external_watchdog=true` til mere end 15 minutters samtidig gammel runhistorik og gammelt offentligt manifest. GitHubs interne vagt beholder 45 minutter.
- PR #222/exact-head `33247789054`, merge `792648c3`, post-merge-produktion `33247839121`, offentlig `rr-20260829103233-210` og automatisk 15-minuttersdispatch `33248692042` → `33248699516` er grønne.
- Bevarer aktiv-run-/friskhedsblokering, concurrency, normal `force=false` og alle current-hour-, DMI/Copernicus-, 210/673-, Candidate G-, validate-, release- og deploygates.
- Ingen model-, score-, input-, state-, recovery-, geometri- eller punktændring og ingen kunstig/interpoleret historik. Se DEC-0108 og `CHANGELOG-4.0.310.md`.

## 4.0.309 – ekstern vagthund mod GitHub-schedulerstilhed (2026-08-29)

- Bevarer GitHubs normale 15-minuttersproduktion, Copernicus-pilot og cacheplan.
- Tillader ét eksplicit, payloadfrit eksternt watchdog-kald ved `:04/:19/:34/:49` UTC.
- Starter kun normal `force=false`-produktion efter 45 minutters gammel workflowhistorik, gammelt offentligt manifest og ingen aktiv produktion.
- PR #221/exact-head `33244011544`, merge `aba3d669`, produktion `33244062982` og offentlig `rr-20260829085521-210` er grønne. Ét aktivt cron-job, id `8348098`, har bestået manuel test og de første to automatiske HTTP 204/no-op-kald som runs `33244853536`, `33245204517` og `33245798817`.
- Almindelig manuel cachekørsel udløser ikke watchdoget; Candidate G, RavScore, DMI/Copernicus, state/cache/recovery, geometri og punkter er uændrede. Se DEC-0107 og `CHANGELOG-4.0.309.md`.

## 4.0.308 – naturligt fosforspørgsmål og filtreret zonesøgning (2026-08-29)

- Den offentlige 4.0.307-slutkontrol fandt, at “Hvad er hvidt fosfor på stranden?” blev afvist trods eksisterende kildeviden, og at `lyn` kun hoppede til den første matchende zone.
- Naturlige DA/DE/EN-fosforspørgsmål svarer nu lokalt med den officielle sikkerhedsvejledning.
- Afslut tur og manuel indberetning filtrerer den bevarede rullemenu til alle delstrengsmatches, så tvetydige søgninger kan vælges korrekt.
- Ingen model-, vejr-, state- eller geometriændring. Se DEC-0106 og `CHANGELOG-4.0.308.md`.

## 4.0.307 – ekstra høj genkontrol og større ravviden (2026-08-29)

- Udvider Spørg RavRadar til 152 kildeklassificerede lokale emner med 456 DA/DE/EN-katalogspørgsmål, baseret på ekstern forskning, officielle kilder, RavRadars analyser, Grundbogen og Rav Jagt; svarene kræver hverken netværk eller AI-kvote.
- Udvider den dataminimerede Edge-kontrakt fra 23 til 38 offentlige fakta, ensretter UV til 395 nm og gør domænefilteret bredere med Unicode-helord, så eksempelvis Skagen ikke afvises som `kage`.
- Lader lokale fakta-, forsknings- og sikkerhedsspørgsmål svare uden prognosedetaljefilen; kun dynamisk bedste sted, bedste tid og aktuel score kræver den.
- Filtrerer udløbne femdøgnsdatoer efter dansk kalenderdag uden at give gamle prognoseværdier nye datoer. Ældre nøddrift viser færre gyldige dage eller en tydelig udløbsbesked.
- Bevarer 4.0.306's samlede ejerrettelser og retter Kyst B-pilen på dansk, tysk og engelsk. Candidate G, RavScore, DMI/Copernicus, state/cache/recovery, geometri og land-/vandpunkter er uændrede. Se DEC-0105 og `CHANGELOG-4.0.307.md`.

## 4.0.306 – ejerrettelser til læring, assistent og betjening (2026-08-28)

- Genopretter Candidate G som eneste offentlige model efter et for tidligt modelmerge og lukker den præcise schema-3→Candidate G-checkpointovergang uden private eller rå data. Se DEC-0104.
- Retter vejrforløb, 395 nm, koldt vands mobiliseringsforklaring, Kyst B og mobilknappen; tilføjer Rav Jagt-video og krediteret kysttværsnit.
- Udvider lokal assistentviden, tilføjer delstrengssøgning med bevaret zonerullemenu, pilesignatur og mørkere strømpil.
- Viser BernsteinScore/AmberScore uden at ændre interne RavScore-/Candidate G-kontrakter.
- Candidate G, DMI/Copernicus, offentlig score/state, geometri og land-/vandpunkter er uændrede. Se DEC-0103/0104.
- PR #217/exact-head `33212348031`, merge `8ebbd4e7`, produktion `33212435923` og Pages-deployment `6148930627` er grønne. Offentlig 4.0.306 består 210/673, desktop/390 px, 5 + 5 x 5 og zonedetalje uden konsolfejl eller mobil overflow. Frisk primary modnes ved 0/673 READY under den komplette auditerede 673/673-recovery; der er intet dækningshul.

## 4.0.305 – kort uden flisegitter (2026-08-28)

- Fjerner hårfine sømme mellem Leaflets rasterkortfliser med et målrettet 0,5 px overlap og normal fliseblanding.
- Standard- og satellitkort samt zoom er visuelt kontrolleret; zoner, pile, klikflader, Candidate G og alle data er urørte.
- 4.0.304's fælles RavRadar-kontakt er produktionsverificeret gennem PR #211 og bevaret. Se DEC-0100/0101 og `CHANGELOG-4.0.305.md`.
- PR #212/exact-head `33188425818`, merge `06ca96e9`, produktion `33190412990`, build `98914205954` og Pages `98916104285` er grønne. Offentlig 4.0.305, standard-/satellitkort, zoom og Om-retur er verificeret uden flisesømme.

## 4.0.304 – fælles RavRadar-kontakt (2026-08-28)

- Kontaktknappen på **Om RavRadar** hedder nu **Skriv til RavRadar** og åbner `RavRadar@outlook.dk`.
- Dansk, tysk og engelsk bruger samme RavRadar-identitet og mailadresse; kontrakttesten afviser de tidligere kontaktværdier.
- Ingen Candidate G-, score-, vejr-, bruger- eller geodata ændres. Se DEC-0100 og `CHANGELOG-4.0.304.md`.
- PR #211/exact-head `33183709302`, merge `e5eed868`, produktion `33183809909`, build `98891543382` og Pages `98893788414` er grønne. Offentlig 4.0.304 og DA/DE/EN-kontaktlink er verificeret.

## 4.0.303 – prioriteret mobilopstart uden første installationsreload (2026-08-28)

- Ruller 4.0.302's fysisk afviste parallelle opstart tilbage: ejerens iPhone viste cirka 30 sekunder koldt og 7–8 sekunder varmt trods grøn desktop-CI.
- Første service-worker-overtagelse genindlæser ikke længere siden, og installationen forhåndshenter ikke kortfilen eller de store Om-billeder.
- DEC-0098's fungerende historikretur bevares. Ingen Candidate G-, score-, vejr-, bruger- eller geodata ændres. Se DEC-0099 og `CHANGELOG-4.0.303.md`.
- PR #209/exact-head, produktion og Pages er grønne; offentlig 210 + 5 × 5 og Om-retur består. Ejeren bekræfter fysisk iPhone Safari med 4–5 sekunders både kold og varm start, fungerende retur og korrekt 4.0.303-version.

## 4.0.302 – parallel opstart, fysisk afvist (2026-08-28)

- Paralleliserede kort-/kystprojektion med manifest/conditions og bestod PR #207/exact-head samt produktion på desktop.
- Fysisk iPhone Safari viste cirka 30 sekunder koldt, 7–8 sekunder varmt og langsom første Om-navigation. Versionen er afvist og erstattet af 4.0.303/DEC-0099.
- PR #208's rollback var exact-head-grøn, men produktion stoppede fail-closed før deploy på `INVALID_SWITCH_VERSION`; offentlig side forblev 4.0.302. Se `CHANGELOG-4.0.302.md`.

## 4.0.301 – Om-knappen udfører rigtig historikretur (2026-08-28)

- Retter den afgørende forskel, som 4.0.300 overså: 4.0.292's tidligere bevis brugte browsertilbage, mens det interne `./`-link lavede en ny navigation.
- Den interne knap bruger nu `history.back()` ved verificeret samme-origin root-referrer og bevarer `./` som sikker fallback ved direkte/fremmed åbning.
- Ingen Candidate G-, score-, vejr-, bruger- eller geodata ændres. Se DEC-0098 og `CHANGELOG-4.0.301.md`.

## 4.0.300 – gendannet mobil sidecache-retur (2026-08-28)

- Fysisk iPhone viste fortsat ingen kort/prognoser efter den interne Om-knap i produktionsgrøn 4.0.299; lås/oplåsning fik visningen frem.
- Gendanner 4.0.292's statiske `./`-link og eksisterende state-redraw. Fjerner nonce-navigation, mobil hard reload, watchdog og DOM-sundhedsreload uden at rulle 4.0.295/296's startupforbedringer tilbage.
- Ingen Candidate G-, score-, vejr-, bruger- eller geodata ændres. Se DEC-0097 og `CHANGELOG-4.0.300.md`.

## 4.0.299 – én hurtig Om-retur uden tvungen reload (2026-08-28)

- Bevarer den unikke versions-/noncebaserede Om-navigation, men fjerner 4.0.298's ekstra synkrone head-script, timer og automatiske reload.
- Offentlig 4.0.298 var komplet efter cirka ét sekund med 210 zonelinjer og 5 + 5 + 5, hvorefter det fejlbehæftede værn genstartede den allerede færdige side. 4.0.299 lader den hurtige appopstart fuldføre præcis én gang.
- Ændringen følger direkte offentlig evidens og ejerens røde fysiske iPhone-test. Ingen Candidate G-, score-, vejr-, bruger- eller geodata ændres. Se DEC-0096 og `CHANGELOG-4.0.299.md`.

## 4.0.298 – sikker direkte retur fra Om RavRadar (2026-08-28)

- RavRadar-linket på **Om RavRadar** laver en entydig ny root-navigation med versionsmarkør og nonce i både Safari og Hjemmeskærm-app.
- Et lille værn i sidens `<head>` kræver synligt kort, fem **Bedste områder**, fem dagsfaner og fem viste prognoserækker og må højst udføre én frisk retry efter seks sekunder.
- Ændringen følger ejerens præcisering: den fejlede fysiske iPhone-rejse brugte den interne knap, ikke browserens tilbageknap. Den eksisterende bfcache-recovery bevares.
- Candidate G, RavScore, vejr, scorer, sortering, konto-/turdata, privatliv, assistent, geometri og land-/vandpunkter er uændrede. Se DEC-0095 og `CHANGELOG-4.0.298.md`.
- PR #203/exact-head `33164570642`, merge `077b6fb9`, produktion `33164639052`, build `98827073610` og Pages `98829261896` var grønne, men den offentlige vagt genkendte ikke de 210 zonelinjer i custom panes og genindlæste derfor fejlagtigt. Fysisk iPhone-test var rød; følg DEC-0096/4.0.299.

## 4.0.297 – mobil bfcache-retur med fail-safe genindlæsning (2026-08-28)

- Reagerer på ejerens fysiske mobilobservation: efter retur fra eksempelvis **Om RavRadar** kunne den genoptagne forside igen mangle kort og prognoser, selv om desktopretur var grøn.
- Installerer et tidligt returværn og genindlæser en persisted mobilside rent. Desktop beholder genoptegning med et tresekunders watchdog og konkret sundhedskontrol af kort, **Bedste områder** og **5-dages RavRadar**.
- PR #201/exact-head `33162270459`, merge `f1adf9b1`, produktion `33162334072`, build `98819572518` og Pages `98821497503` er grønne; offentlig funktion og ydelse bestod.
- Ejerens efterfølgende fysiske iPhone-test af RavRadars eget Om-link var fortsat rød. 4.0.297 ændrer derfor ingen faglig model eller data, men må heller ikke kaldes løsningen på den konkrete rejse. Se DEC-0094/0095 og `CHANGELOG-4.0.297.md`.

## 4.0.296 – minimal Candidate G-startpakke (2026-08-28)

- Lukker restflaskehalsen efter 4.0.295: aktiv READY-nødvisning havde stadig 3.562.253 byte/23,36 sekunders startup trods behovsstyrede detaljer og cirka 3,67 sekunders varm cache.
- Beholder kun aktuel score/status, dækningsfelter, tre komponenttal, kompakt vejr, minimale labels og vinderdelens lille DMI-`flowPoints`-bevis i startup; fulde forklaringer, timeforløb og state forbliver i detaljepakken.
- Bevarer detaljepakke/hash, dataset, tider, scorer, bestetid og national rangering. Den opdaterede READY-lignende test falder 591.295 → 29.670 byte uden scoreafvigelse.
- PR #199's exact-head var grøn og blev merged som `bdd23cc0`; første produktion `33157055276` stoppede fail-closed før deploy på manglende pilproveniens. Den afgrænsede korrektion bevarer kun de tre nødvendige `flowPoints`-felter.
- PR #200/exact-head `33158782786`, merge `f1cd5868`, produktion `33158840203`, build `98808126976` og Pages `98814032394` er grønne. Offentlig startup er 399.801 byte/1,37 sekunder no-cache og cirka 1,31 sekunder varm til komplet visning; farvet kort, fem aktuelle områder og fem resultater på alle fem prognosedage er verificeret. Se DEC-0093 og `CHANGELOG-4.0.296.md`.

## 4.0.295 – hurtig offentlig start og behovsstyrede detaljer (2026-08-28)

- Lader kort, **Bedste områder** og **5-dages RavRadar** bruge en kompakt startpakke med samme Candidate G-bestetid og nationale rangering som før.
- Henter den fulde 90–132 MB detaljepakke først, når område, konto, tur, assistent eller dybt zoom kræver den.
- Genbruger kun liveprognoser, når URL'en er bundet til både dataset-id og manifest-SHA; manifest, geometri og ikke-adresserede livefiler forbliver friske.
- Bevarer fuld detaljepakke, nødvisning, dataset-/tids-/hashgates, scorer og sortering. Ingen geometri eller punkt aktiveres; den nye Sibirien-revision forbliver privat staged. Se DEC-0092 og `CHANGELOG-4.0.295.md`.
- PR #198/exact-head `33153155088`, merge `6c0602d7`, produktion `33153271907`, build `98790063641` og Pages `98794513908` er grønne. Offentlig funktion og varm cache er verificeret; den resterende READY-startpayload følges op i 4.0.296.

## 4.0.294 – driftslukning af Cloudflare-credentialrotation (2026-08-28)

- Roterer Workers AI-credentialen med mindst-mulig kontoafgrænset Read + Edit og erstatter kun den eksisterende Supabase Edge-secret; ingen credentialværdi er vist eller gemt i repositoryet.
- Beviser den nye vej på DA/DE/EN, fast emneafvisning, tilladt CORS, fremmed-origin-afvisning, seks minutkald + `429` på det syvende og offentlig lokal fallback.
- Tilbagekalder efter særskilt ejerbekræftelse fire gamle generisk navngivne tokens. Et post-revoke-retry består `200` efter én fail-closed transient i Supabase-rate-limitlaget.
- Ændrer ingen kode, version, Edge-deploy, produktionsartifact, RavScore, vejr, prognose, brugerdata, privatliv, geometri eller land-/vandpunkter. Se `CHANGELOG-4.0.294.md`.

## 4.0.294 – naturlige oprindelsesspørgsmål i Spørg RavRadar (2026-08-28)

- Den offentlige 4.0.293-kontrol fandt, at den naturlige formulering **Hvordan opstod rav?** faldt uden for den ellers korrekte oprindelses-intent og derfor blev afvist.
- Dansk, tysk og engelsk genkender nu almindelige dannelsesformuleringer som **Hvordan opstod/dannes rav?**, **Wie entsteht Bernstein?** og **How is amber formed?** lokalt uden netværk eller AI-kvote.
- De oprindelige 51 balancerede emnecases er bevaret og suppleres af tre særskilte formuleringregressioner. Assistentens read-only-, privacy-, kvote-, gateway- og Candidate G-grænser er uændrede. Se DEC-0091 og `CHANGELOG-4.0.294.md`.
- PR #195/exact-head `33131976433`, merge `a3eb4ac5`, produktion `33132053882`, build `98723615102` og Pages `98725082313` er grønne. Offentlig DA/DE/EN-kontrol består de tre naturlige oprindelsesspørgsmål sammen med farvet kort, fem aktuelle områder og fem prognosedage; 4.0.294 er produktionsverificeret.

## 4.0.293 – bred read-only Spørg RavRadar-viden (2026-08-28)

- Udvider lokale DA/DE/EN-svar fra ni grove intents til 17 grundbogsbaserede emner, som virker uden netværk og AI-kvote.
- Udvider den offentlige GPT-OSS-viden fra 10 til 23 evidens-ID'er samt evalpakken til 51 lokale og 66 samlede, balancerede cases.
- Bevarer Candidate G for bedste sted/tid/score og alle eksisterende Edge-, privacy-, CORS-, rate-limit-, timeout-, gratis kvote-, fallback- og rollbackgrænser.
- Assistenten forbliver read-only. RavScore, vejr, prognoser, sortering, konto-/turdata, geometri og land-/vandpunkter ændres ikke. Se DEC-0091 og `CHANGELOG-4.0.293.md`.

## 4.0.292 – mobil sidecache- og punktskifte-selvrecovery (2026-08-28)

- CI-hotfix: punktstagingens syntetiske READY-test bruger nu en eksplicit reference og kan ikke overstyres af produktionsworkflowets låste time. Første post-merge-run stoppede sikkert før DMI/deploy; runtimekontrakten er uændret.
- Gatehotfix: den eksisterende DMI-schedulertest accepterer og kræver nu, at private punktkandidater holdes uden for den offentlige dækningsnævner; testen er flyttet ind i punktstagingens PR-kildegate.
- Den samme scheduler-adfærdstest er gjort selvstændig i den tidlige kildegate ved lokalt at stubbe ubrugte netværksafhængigheder; produktions-DMI installerer fortsat de virkelige pakker før dataarbejdet.

- Genopretter forsiden efter Safari/WebKit back/forward-cache: en færdig visning genoptegnes, mens ufuldstændig eller afbrudt opstart genindlæses rent.
- Dækker kort, **Bedste områder**, valgt zone og **5-dages RavRadar** gennem ét idempotent `pageshow`-forløb med dubletværn og fail-safe reload.
- Indfører staged land-/vandpunktkandidater: aktivt punkt bevares, kandidaten DMI-valideres og opvarmes privat, og kun en særskilt ejeraktivering kan skifte atomisk efter fulde gates og central versionskontrol.
- Udvider hel-datasæt-fallbacken til højst seks lokale Candidate G-warmups; gamle og nye zoner blandes aldrig.
- Tilføjer målrettede livscyklus-, privatheds-, DMI-, state-, aktiverings-, versionskonflikt- og recoveryregressioner uden at flytte et faktisk punkt eller ændre score, vejr, sortering, brugerdata eller geometri. Se DEC-0089/0090 og `CHANGELOG-4.0.292.md`.
- PR #192/exact-head `33127353135`, merge `d22d0867`, produktion `33127437790`, build `98708851478` og Pages `98711255270` er grønne. Offentlig 390 × 844-returkontrol viser 210 farvede zoner, fem aktuelle områder og fem færdige prognoserækker uden browserfejl; stagingstatus er tom og saniteret. Den eksisterende Candidate G-nøddrift fortsætter korrekt med 0/673 frisk `READY`, mens den virkelige 48-timersstate modnes.

## 4.0.291 – offentlig gratis Spørg RavRadar (2026-08-27)

- Aktiverer den valgte Cloudflare GPT-OSS 20B gennem den hærdede server-side Edge-gateway efter ejerens udtrykkelige go.
- Tilføjer synlig DA/DE/EN-kvotetekst i assistentdialogen: den begrænsede daglige AI-kvote holder RavRadar gratis og gælder kun Spørg RavRadar uden indflydelse på kort, prognoser, RavScore eller øvrige funktioner.
- Registrerer som næste særskilte leverancer den mobile returfejl for kort/ranglister/femdøgnsvisning og ejerønsket om en væsentligt bredere, versionsbundet lokal ravfaglig assistent.
- Cloudflare-dashboardet er kontrolleret som Workers Free / $0 med 10.000 neuroner/dag og fejl ved overskridelse; betalt overflow, Workers Paid og prepaid AI Gateway er forbudt.
- Bevarer lokal domæneafvisning, deterministiske Candidate G-svar, server-only credentials, dataminimering, CORS, rate limits, timeout, struktureret validering og lokal fallback. Se DEC-0088 og `CHANGELOG-4.0.291.md`.
- PR #187/exact-head `33114501539`, merge `c6c9998c`, produktion `33114598957`, build `98665953481`, Pages `98668455689` og offentlig desktop-/390 px-kontrol er grønne. Den fortsat markerede vejr-nøddrift er uafhængig af assistentaktiveringen.

## 4.0.290 – central DA/DE/EN og sikker assistentgrænse (2026-08-27)

- Tilføjer ét centralt offentligt tekstkatalog med dansk standard/fallback, parameteriserede nøgler, localeformatering og lokalt husket Dansk/Deutsch/English-valg med flag og tydelige navne.
- Oversætter hele den offentlige flade: hovedside, aktuelle/femdøgnsstatusser, områdepanel, konto/login, turformularer, lokal Spørg RavRadar, **Om RavRadar** og alle 12 sektioner i **Grundbog i ravjagt**. Admin-, ekspert- og interne flader forbliver danske.
- Afviser kendte uvedkommende og sikkerhedsfølsomme spørgsmål før provider, holder bedste sted/tid/score deterministisk i Candidate G og reducerer mulig fjernkontekst til en offentlig allowlist.
- Implementerer en fortsat deaktiveret server-side Cloudflare GPT-OSS Edge med credentials kun på serveren, CORS, domænegate, kvotebuffer, timeout, struktureret output-/evidensvalidering og lokal fallback. Gratis Gemini er forkastet som offentlig EØS-produktionskandidat under aktuelle vilkår, men Flash-Lite 27/27 bevares som reference.
- Udvider den reproducerbare DA/DE/EN-runner til Cloudflare Workers Free-kandidaterne GLM-4.7-Flash, Gemma 4 26B og GPT-OSS 20B med samme schema/hårde stop samt latenstids-, token- og neuronmåling. GLM/Gemma blev stoppet efter ikke-evaluerbare smoke-svar; GPT-OSS er valgt som fortsat deaktiveret Edge-kandidat efter 1/1 smoke, 4/4 mål-gate og 25/26 beståede evaluerbare fuldtests. Én længdeafvigelse og én irrelevant timeout skal fejle lukket i gatewayen.
- Målrettede sprog-, fallback-, assistent-, Edge-, sikkerheds-, konto-/tur-, 210/673/2.100-præsentations- og lokale desktop-/390 px-browserkontroller er grønne. Candidate G 20/50/30, vejr, sortering, konto-/turdata, privatliv, geometri og land-/vandpunkter er uændrede. Se DEC-0086/0087.
- PR #183/#184/#185 bestod exact-head CI. To gamle tekstbaserede fuldtests stoppede de første produktionsforsøg sikkert før deploy og er nu bundet til stabile i18n-nøgler med separat dansk fallbackkontrol. Produktion `33107232593`, build `98640417925` og Pages `98643230518` er grønne; offentlig 4.0.290 består DA/DE/EN, husket valg, fem **Bedste områder** og fem prognoserækker. Candidate G-fallbacken er fortsat tydeligt markeret under primærseriens genopbygning.

## 4.0.289 – årsagstro produktion og robust genopretning (2026-08-27)

- Forbyder, at en DMI-prognosetime efter den workflowlåste UTC-time bliver produktionstime; nærmeste fallbacktime vælges kun bagud inden for tre timer.
- Giver målrettet Copernicus to procesisolerede forsøg med seks minutters hard timeout og 20 sekunders pause.
- Gemmer et generisk hash-/modelbundet checkpoint med præcis 673 kompakte Candidate G-states før de sidste gates, uden vejr, scoreoutput, rå vektorer, koordinater eller private data.
- Udvider komplet nødvisning til højst 72 timer, men aldrig efter egen prognosehorisont, så Candidate G's 48-timers genopbygning har et sikkert overlap.
- Tilføjer ét automatisk retry efter fejlet, timeoutet eller før-start-fejlet schedule-run og et payloadfrit 45-minutters watchdog uden parallelle tunge builds; total GitHub-schedulerstilhed kræver fortsat ekstern overvågning.
- PR #181/exact-head `33076656266`, merge `6c8acf08` og produktion `33076772432`/build `98532962269`/Pages `98538133039` er grønne. Liveauditten består 4.0.289 med 210/673/420/2.100 og nul funktions-, konsol-, side- eller HTTP-fejl. Se DEC-0085 og `CHANGELOG-4.0.289.md`.
- Candidate G 20/50/30, fysik, DMI-først, vejr, sortering, konto-/turdata, privatliv, geometri og land-/vandpunkter er uændrede.

## 4.0.288 – automatisk Candidate G-genopretning (2026-08-27)

- Bevarer det seneste komplette, auditerede Candidate G-datasæt ved fejlet eller ufuldstændig ny datahentning og publicerer aldrig en halv ny runtime.
- Viser fallbacken som ét atomisk startup-/detaljedatasæt i højst 48 timer med tydelig besked om, at dataene ikke er aktuelle; **Bedste områder** og **5-dages RavRadar** kan derfor fortsætte sikkert.
- Genstarter Candidate G fra den reelle verificerede suffix efter et hul over tre timer og modner ny state i baggrunden uden interpolation eller backfill. Automatisk skift sker først ved 673/673 `READY` og grøn faktisk runtimeaudit.
- Tilføjer en eksakt hash- og tidslåst engangsrecovery af 09 UTC-checkpointet fra den fejlede produktion `33059522170`; kun kompakt afledt state kopieres.
- Målrettede tests og virkelige, dataminimerede artifactsimulationer er grønne. Exact-head-, produktions- og browserlukning afventer. Se DEC-0084 og `CHANGELOG-4.0.288.md`.
- PR #176 bestod exact-head `33066322196` og blev merged som `16ad8300`. Produktion `33066416034` gendannede den låste 09-state, men stoppede før DMI/deploy, fordi fallbackstage lå efter stateændringen. Opfølgningen flytter kun fallbackkopien før checkpointet og låser rækkefølgen i workflowtesten.
- Candidate G 20/50/30, fysik, vejr, normal sortering, konto-/turdata, privatliv, geometri og land-/vandpunkter er uændrede.

## Historisk forundersøgelse – gratis Gemini-reference til Spørg RavRadar (2026-08-27)

- Auditerer den nuværende lokale/Edge-assistent mod Candidate G og dokumenterer de åbne produktionshuller uden at aktivere fjern-AI.
- Tilføjer en versionsbundet offentlig Candidate G-videnspakke og 45 balancerede dansk/tysk/engelsk evalcases, herunder åbne uvedkommende emner uden fast ordlistematch.
- Tilføjer en offline self-test og en eksplicit live-Gemini-runner, der kræver både lokal API-nøgle og bekræftet Free Tier uden billing.
- Valgte historisk `gemini-3.5-flash-lite`/low efter 27/27 remote-kandidatcases, median/p95 1.329/1.896 ms og DA/DE/EN 9/9. `gemini-3.7-flash` blev afvist efter fem 12/30-sekunders-timeouts. Produktionsvalget er senere erstattet af DEC-0087 på grund af aktuelle EØS-vilkår; resultatet er fortsat kvalitetsreference.
- Låser DEC-0083: kun ravrelevante spørgsmål, deterministiske bedste sted/tid/score-svar, fast afvisning af uvedkommende/interne spørgsmål og lokal fallback uden betalt overflow.
- Ingen offentlig runtime, version, RavScore, vejr, konto-/turdata, geometri, land-/vandpunkter eller private data er ændret.

## 4.0.287 – Supabase-identitet og EU-D1-turlager (2026-08-26)

- Supabase bevarer Auth/Edge, mens normale ture går til ti EU-låste Cloudflare D1-shards med HMAC-pseudonym og uden rå ID, mail, navn, JWT, GPS eller rute.
- Privat service-HMAC, kanonisk payload-hash og klient-/tur-id låser tidsgrænse, idempotens og konfliktstop.
- Migration kører før og efter cutover uden kildesletning. `TRIP_STORAGE_MODE=supabase` er eksplicit rollback uden normal dual-write.
- Daglig payloadfri kapacitetskontrol og eksplicit ejersletning er implementeret. Supabase-varslet 9. september 2026 forbliver åbent.
- Infrastruktur-PR #162/#163 og deres exact-head-gates er merged. Dedikeret Cloudflare-konto, mindst-mulige tokens, krypterede GitHub-secrets og rollback-Edge-deploy `33014772035` er verificeret uden private data.
- Første D1-cutover `33019198166` oprettede ti EU-shards og deployede Workeren, men stoppede sikkert før migration/Edge ved en kort health-udbredelsesforsinkelse. Den efterfølgende health-kontrol var grøn; deployverifikationen har nu bounded retry uden svagere kontrakt.
- PR #166 bestod exact-head `33019805663` og blev merged som `2d12c085`. D1-cutover `33019868542` migrerede fire eksisterende rækker, beviste idempotent genkørsel og aktiverede D1-normaldrift gennem grøn Worker-, Edge- og CORS-kontrol uden payloadlog.
- Produktion `33019856228` og Pages-job `98351206091` udgav `rr-20260826224651-210`: 210/210 aktive zoner, befolket **Bedste områder**, 210/673/420/2.100-struktur og nul browser-/HTTP-fejl. Read-only monitor `33021364240` viste ti shards og 0 % lagerforbrug. Se DEC-0082 og `CHANGELOG-4.0.287.md`.
- Cloudflare deploy-/audit-token er nu uden udløb og med uændrede mindst-mulige rettigheder. Supabase-PAT'et blev historisk udskiftet til udløb 25. august 2027 og ende-til-ende-verificeret i D1-run `33024408547`, før de gamle PAT'er blev tilbagekaldt.
- Det daværende credential-varsel bestod PR #169/exact-head `33025102301`, merge `1e402834` og manuel main-prøve `33025289153` uden for tidlig issue. Ejerens senere driftspræcisering pensionerer varslet: Supabase-PAT er kun et behovsstyret management-token, må udløbe uden normaldriftseffekt og oprettes kortvarigt først ved en konkret verificeret deploy/migration/rollback.
- Produktion `33025210517`/Pages `98367528389` og offentlig `rr-20260827000855-210` er grønne på 210/210 aktive zoner, fem ranglisterækker og den fulde 210/673/420/2.100-browseraudit.
- Den interne, score-neutrale Ravudsigten-sammenligning er startet med en forståelig analysejournal og første tidsstemplede snapshot af aktuelle top-fem, femdøgnssignaler, zonematch og mulige forskelsårsager. Den er fortsat longitudinel og uvalideret efter ét vejrvindue og er forbudt i app, offentlig håndbog, ekspert-/adminflader og public runtime.
- PR #171 bestod exact-head `33029393300` og blev merged som `f15f5892`. Første produktion `33029447510` stoppede sikkert før Supabase-sync/artifact/Pages, fordi den globale kildeneutralitetstest ikke havde den godkendte interne RDKS-undtagelse. Opfølgningen afgrænser undtagelsen til præcis analysefilen og kræver dens interne, score-neutrale og ikke-offentlige sikkerhedsmarkører.
- PR #172 bestod exact-head `33030112665` og blev merged som `7a234653`. Produktion `33030166104`/Pages `98382359708` bestod fuld kæde; offentlig `rr-20260827013448-210` er komplet med 210/210 aktive zoner, 673/673 scoreklare kystdele og fem rangliste-/prognoserækker i begge søgemåder uden synlig runtimefejl.

## 4.0.286 – rullende Candidate G-kontinuitet og predeploy-funktionsgate (2026-08-26)

- Den offentlige positive audit afviste 4.0.285 korrekt efter ellers grønne gates: 0/210 aktive zoner og 665/673 `WINDOW_INCOMPLETE`.
- Grænsebeviset før et faseskudt 48-timersvindue bevares nu kompakt til næste rullende reference. Det afspilles ikke i det aktuelle vindue og tæller ikke som måling, interpolation eller ekstra dækning.
- To-trins regressionstests kræver fortsat `READY` og 48 timers dækning ved næste reference.
- Produktionsworkflowet auditerer den faktisk genererede `data/live/conditions.json` før Supabase-sync, artifact og Pages og stopper på den dokumenterede masseregression.
- Den dataminimerede produktion `32997118162` beviste 672 `READY`, én warmup og nul replaymismatch, men kun 1.328/1.344 modes. De sidste 16 var otte godkendte native holds, som en ældre Phase D-forbetingelse afviste før Candidate G-memory.
- En native hold kan nu kun score fra den allerede afledte `READY` memory ved allowlist-afledt eksakt tre-timers tilladelse, alder højst tre timer og uden aktuelle U/V-, fart-, retnings- eller alignmentfelter. Almindelig uverificeret, for gammel og ikke-READY strøm er fortsat fail-closed.
- PR #159/exact-head `33001615758`, merge `c0f42b33` og produktion `33001743118` er grønne. Offentlig `rr-20260826185603-210` viser 210/210 aktive zoner, befolket **Bedste områder**, komplet 210/673/420/2.100-struktur og nul browser-/HTTP-fejl.
- Candidate G 20/50/30, +10/-8-/13-timersfysikken, sikkerhed, vejr, zoner, geometri og land-/vandpunkter er uændrede. Geodatafilerne ændrer kun topversionsfeltet til 4.0.286. Se DEC-0081 og `CHANGELOG-4.0.286.md`.

## 4.0.285 – Candidate G-cadencefase ved 48-timersgrænsen (2026-08-26)

- Den offentlige 4.0.284-strukturaudit var grøn, men den aktuelle rangliste var tom. Pages-artifacts viste 672/673 `READY` og 209/210 aktive zoner i sidste 4.0.283-build mod 8/673 og 0/210 allerede i første 4.0.284-build.
- Et eksakt lighedskrav ved `reference - 48h` fjernede målingen umiddelbart før vinduet, når referencen flyttede én time væk fra native tretimersfasen. 665 sammenhængende forløb blev derfor kunstigt 46 timer.
- 4.0.285 accepterer kun grænsekrydsningen med et verificeret compact bevis før grænsen og højst tre timers sammenhæng til første bevis efter den. Der opfindes ingen måling eller interpolation.
- Et ægte kort vindue uden forgænger og et hul over tre timer er fortsat fail-closed. Den eksisterende bounded-memory-selftest stoppede en første for bred variant og er bevaret sammen med den nye regression.
- En engangsrecovery er låst til workflow `32978542594`, datasæt `rr-20260826142942-210`, 673 del-ID'er og SHA-256 `d5877f8a0945619b700efa3a97807ac9552033d244ab117e92d8fea87f1877d5`. Den fletter kun compact transport evidence.
- Lokal simulation mod de virkelige offentlige source-/target-artifacts genskabte 672/673 `READY`; den ene kendte umodne del forblev lukket, og recoveryen blev straks inaktiv.
- Onlineaudits kræver nu mindst én aktiv aktuel zone, og Candidate G-shadowgaten stopper den brede accepterede 45–48-timers `WINDOW_INCOMPLETE`-fejlsignatur.
- Candidate G 20/50/30, scorekurver, sikkerhedsgrænser, vejr, zoner, geometri og land-/vandpunkter er uændrede. De to beskyttede geodatafiler ændrer kun topversionsfeltet til 4.0.285 som godkendt i DEC-0076. Se DEC-0081.

## 4.0.283 – Moderzonen bevares i Candidate G-slutkontrollen (2026-08-26)

- Retter en afgrænset fejl i den afsluttende videnskabelige kontrol, som mistede kystdelens moderzone, når 210 zoner blev foldet ud til 673 kyststrækninger.
- Produktion `32912103679` dokumenterede allerede 673/673 scoreklare kyststrækninger, heraf otte godkendte native-kadencereferencer, men slutkontrollen kunne kun genkende 665/673 uden moderzonekoblingen og stoppede derfor korrekt før deploy.
- En fælles hjælpefunktion bevarer nu den autoritative zone-nøgle under udfladning. En regressionstest låser, at også en kystdel uden indlejret `zoneId` kan matches til sin verificerede native-kadencereference.
- Datakravene lempes ikke: der opfindes ingen måling, historik, pil eller retning. Candidate G 20/50/30, vejr, zoner, geometri, land-/vandpunkter, admin-data og brugerdata er uændrede. De beskyttede geodatafiler ændrer kun topversionsfelt til 4.0.283. Se DEC-0079.
- PR #153 bestod exact-head `32914734446`, blev merged som `1caad399`, og produktion `32914887586` bestod hele kæden inklusive releasegate og Pages.
- Offentlig kontrol beviser 210 zoner og 673/673 kyststrækninger på Candidate G-only. 657 dele har komplet transporthukommelse; 16 dele er ærligt lokalt utilgængelige med 30–48 timers naturlig historik og nul reset. Den falske **Mangler/Ukendt**-fejl er lukket uden kunstig historik.

## 4.0.282 – Eksakt Candidate G-reference ved native vinduesskift (2026-08-26)

- Lukker de sidste falske **Mangler/Ukendt** for de otte godkendte tretimers-regionalproxyer, når seneste ægte prøve ligger umiddelbart før beregningsvinduet.
- Genbruger kun en eksakt verificeret prøve på højst tre timer og kun som transportreference.
- Dataminimerer til tid og kystrelativ styrke; ingen rå vektorer, koordinater, punkt-id'er, ny pil eller mobilisering.
- Tilføjer målrettede tests. Candidate G 20/50/30, scorekurver, zoner, geometri og land-/vandpunkter er uændrede. Se DEC-0078.

## 4.0.281 – Candidate G-native teknisk diagnostik (2026-08-25)

- Retter den tekniske scorevisning, som fejlagtigt viste **Mangler**, **Ukendt**, `–/100` og **Ikke beregnet**, fordi brugerfladen stadig læste pensionerede felter fra den gamle scoremotor.
- Bevarer Candidate G's faktiske målingsstatus, retning mod den lokale kyst, 48-timers strømhistorik, fase, udgående episode og tab samt transport-, leverings- og mobiliseringsled gennem både kystdels- og zoneaggregationen.
- Native tretimers-mellemtimer beskrives som fastholdt afledt tilstand. De får ikke opdigtet rå måling, retning, klassifikation eller ny evidens.
- Teknisk visning siger udtrykkeligt, at vinden ikke indgår direkte i transportscoren, og forklarer beregningsleddene på almindeligt dansk.
- En landsdækkende kontrakttest låser den samme Candidate G-native forklaring for alle offentlige zoner og kyststrækninger. **Mangler/Ukendt** må kun vises ved reel manglende Candidate G-evidens.
- PR #150 er merged som `1308a07d`, og produktion `32899040618` er grøn. Offentlig audit viser 1.314 komplette tekniske modeforklaringer, 673 accepterede statefortsættelser og nul reset.
- Browserauditten følger nu Candidate G's lokale fail-closed-kontrakt og består 420 aktuelle visninger, 2.100 prognosevisninger og 673 kystdelsreferencer uden fejl. De 16 umodne dele viser utilgængelighed frem for falske felter eller gammel score.
- Candidate G 20/50/30, alle scorekurver, vejrregler, zoner, geometri, land-/vandpunkter, central admin-data og brugerdata er uændrede. De to beskyttede geodatafiler ændrer kun topversionsfelt til 4.0.281. Se DEC-0077.

## 4.0.280 – korrekt orienteret familiebillede (2026-08-25)

- Retter EXIF-orienteringen i familiebilledet på **Om RavRadar** uden at ændre originalen.
- Leverer tre korrekt orienterede, komprimerede billedvarianter og et responsivt layout med opret billede ved siden af teksten på pc og over teksten på mobil.
- PR #149 er merged som `42b7058f`, og ejeren har efter den offentlige udgivelse kontrolleret, at billedet står rigtigt på både mobil og pc.
- Candidate G, RavScore, vejr, zoner, geometri, land-/vandpunkter, admin-data og brugerdata er urørte. Geodatafilerne ændrede kun topversionsfelt til 4.0.280.

## 4.0.277 – årsagstro native tretimerskadence (2026-08-25)

- Retter et sikkert 666/673-stop, hvor en fremtidig regionalproxyprøve kunne tælles som aktuel dækning, mens den timeskarpe audit korrekt afviste den.
- Kun de otte ejerallowlistede `dkss_lf`-proxyer må fastholde den seneste afledte transporttilstand i højst tre timer mellem ægte prøver. Der tilføjes ingen bevægelse, evidens, U/V, hastighed, retning eller pil.
- Næste ægte prøve integrerer den faktiske tidsafstand. Over tre timer eller enhver ændret punkt-/kildekontekst stopper fortsat lokalt.
- Bevarer eksisterende Candidate G-historik uden backfill, interpolation eller rekonstruktion. Candidate G 20/50/30 er fortsat eneste offentlige profil uden rollback.
- Scorekurver, zoner, geometri, land-/vandpunkter og central admin-data er uændrede; geodatafilerne ændrer kun versionsfelt. Se DEC-0074.
- PR #140 bestod exact-head og blev merged. Første produktion byggede historik og runtime grønt, men stoppede sikkert før deploy på en forældet statisk test. Testen kræver nu den samme 673-kontrakt som produktionsauditen; ingen runtime-, score- eller dataadfærd er ændret af opfølgningen.
- Opfølgende PR #141 bestod exact-head `32817501003` på `128c71ce` og blev merged som `81e9b891`. Produktion `32817626537` bestod central hydrering, frisk vejr, 673/673-dækning, fuld validering, releasegate, artifact og Pages-deploy.
- Offentlig 4.0.277 viser 673/673 Candidate G-states, 673 accepterede fortsættelser, nul resets og 12–45 timers naturlig historik. Candidate G 20/50/30 er fortsat eneste profil; rollbackprofilen er `null`, og legacyfallback er forbudt. 0/210 zoner er endnu aktive, fordi ingen lokal kæde ved kontrollen havde nået de krævede 48 timer.

## 4.0.276 – strømhistorik bevares pr. kystpunkt (2026-08-25)

- Retter den private Copernicus-cache, så en dynamisk indsamlingsgruppe eller flytning af ét punkt ikke længere kan ugyldiggøre verificeret historik for uændrede kystpunkter.
- Genindsamling af samme time erstatter kun de valgte punkter. Et ændret punkt mister sin egen gamle historik, mens uændrede søsterpunkter og deres eksakte samlingsbevis bevares.
- Den fulde centrale punktidentitet følger hver opdatering. Ukendte punkter, moderzone-/vandpunktmismatch, dubletter og forkert delmængdefingeraftryk afvises fail-closed.
- Der udføres ingen backfill, interpolation eller rekonstruktion. Candidate G 20/50/30 forbliver eneste offentlige scoremodel, og lokale scorer åbner ved ægte komplet 48-timers historik.
- En dataminimeret audit dokumenterede cirka 36 timers fortsat kompakt state. Den ældre brede cache var ikke sikkert sammenhængende til målreferencen for hele landet og bruges derfor ikke som genvej.
- PR #138 bestod exact-head `32787344926` på `acb59cc6` og blev merged som `72913723`. Fuld produktion `32787715986` og de naturlige produktioner `32788514636`/`32790639192` er grønne.
- Seneste dataminimerede livekontrol viser 673/673 accepterede states, nul resets og 6–39 timers lokale kæder. Et flyttet punkt modner kun sin egen kæde; uændrede punkters historik er bevaret.
- Scoreformel, vejrregler, offentlig runtimekontrakt, zoner, geometri og land-/vandpunkter er uændrede. Se DEC-0073.

## 4.0.274 – holdbar Candidate G-only-kontrakt (2026-08-24)

- Retter den centrale migrationsgrænse, som fik mergeproduktionen for 4.0.273 til at stoppe før deploy: en historisk central rollbackkonfiguration kan ikke længere overskrive den ejerbesluttede Candidate G-only-kontrakt.
- Validerer Candidate G-only både før central persistence og efter readback. En legacyprofil kan ikke vinde på samme eller højere versionsnummer.
- Forsiden, zonepanelet og Rav-assistenten bruger nu kun den lokale Candidate G-beregning. Manglende evidens giver utilgængelighed, ikke en skjult 25/40/35-, parent-, nabo- eller anden-timescore.
- Releasegaten stopper ved central legacykonfiguration eller genindførte offentlige imports af den gamle scoremotor.
- Adminforsiden viser **ALLE AKTIVE** eller berørte zone-/søgemådepar med forståelige årsager; andre zoner fortsætter Candidate G.
- 4.0.273 blev ikke deployet. Geodatafilerne har kun fået versionsfelt 4.0.274; geometri og land-/vandpunkter er uændrede. Se DEC-0072.

## 4.0.273 – Candidate G-only og lokal scoretilgængelighed (2026-08-24)

- Candidate G 20/50/30 er nu den eneste offentlige scoremodel. Den gamle 25/40/35-model kan ikke længere vælges som reserve, rollback eller automatisk fallback.
- Manglende Candidate G-data gør kun den konkrete zone, søgemåde og tid utilgængelig. Der lånes ingen score fra gammel model, moderzone, nabo eller anden time.
- Utilgængelige scorer udelades fra **Bedste områder** og **5-dages RavRadar**, mens resten af landet fortsætter normalt på Candidate G.
- Adminforsiden viser, om alle zoner er aktive, og lister ellers berørte zoner, søgemåder og forståelige årsager.
- Profil-, pipeline-, lands-, UI- og shadowtests er opdateret til den nye kontrakt. Produktionshydrering og releasegates forbliver fail-closed.
- Geodatafilerne har kun fået versionsfelt 4.0.273; geometri og land-/vandpunkter er uændrede. Se DEC-0072.

## 4.0.272 – fail-closed Candidate G-tilstandsrecovery (2026-08-24)

- En ikke-fatal timeout ved hentning af tidligere offentlig tilstand nulstillede kunstigt alle 673 kystdele. 4.0.272 gør hentefejlen fatal, afviser global nulstart og genoptager kun den kompakte tilstand fra den eksakte låste sunde produktion.
- PR #131/merge `1bbb4cc2` indførte rettelsen. PR #132/merge `392fea15` bevarede den ældre hydratorindgang uden runtimeændring.
- Produktion `32761751284` bestod hele kæden og udgav `rr-20260824183620-210` på 210/673. Offentlig top-5 varierer igen 76–71, og femdøgnslisten sorterer 86–76.
- Scoreformel, vejrregler, zoner, geometri og land-/vandpunkter er uændrede. Én lokal punktkontekst opvarmes, og otte ældre aktuelle evidenshuller holder midlertidigt hele runtime på den eksisterende 25/40/35-reserve.

## 4.0.269 – aktuelle scoreforklaringer (2026-08-24)

- De tre RavScore-komponenter forklarer den viste kystdels konkrete vind-, bølge-, strøm- og stateforhold.
- Mobilisering forklares som bølgevirkning, og lavt vand fremstilles ikke længere som selvstændig indtransporthjælp.
- Fundprognose, offentlige scorelofter, rå samlet score-JSON og det tomme kortvalgsfelt er skjult; bagvedliggende data og logik bevares.
- Kilder og licenser er opdateret. Candidate G 20/50/30, global reserve, scoretal, vejr, Supabase, geometri og land-/vandpunkter er uændrede.
- PR #120 bestod exact-head `32703138969`, blev merged som `d745e0ba`, og produktion `32703271897` udgav live `rr-20260824080543-210` som 4.0.269 på 210/673.
- Browserkontrollen bestod 420 aktuelle, 2.100 femdøgns- og 673 kystdelsvisninger uden kontrol-, konsol-, side- eller HTTP-fejl. Se `CHANGELOG-4.0.269.md` og DEC-0068.

## 4.0.267 – komplet uploadskema for kontoindberetninger (2026-08-23)

- Den aktive observationstabel manglede de to POST-only-felter `forecast_target_at` og `report_accuracy`. Desuden afviste klientens privatlivskontrol den krævede tomme værdi `gps=null`, før turen blev gemt lokalt eller sendt.
- En databevarende, idempotent migration tilføjer felterne og genindlæser PostgREST-schemaet uden at ændre eller slette ture.
- Privatlivskontrollen accepterer kun lokationsfelter med værdien `null`; faktiske GPS-, koordinat-, positions-, rute- og spordata forbliver blokeret. Rettelsen dækker både kontoindberetning og **Start ravtur → Slut ravtur**.
- API-loggen viste intet POST-forsøg fra de to ejerprøver. De nåede derfor ikke outboxen og skal indberettes igen efter udgivelsen.
- Score, vejr, Candidate G, geometri og land-/vandpunkter er uændrede; geodatafilerne får kun versionsfeltet 4.0.267.

## 4.0.266 – virkeligt login og privat turlog (2026-08-23)

- Den første interaktive ejerprøve viste, at Supabase sendte magic links til `localhost:3000`, fordi den centrale Site URL var forkert, og ingen produktionsredirect var tilladt. Begge er nu sat til den aktuelle RavRadar-side.
- Den aktive `observations`-tabel manglede `data_quality_flags` og SELECT-policyen for egne ture. Den idempotente migration tilføjer begge dele uden ny tabel, dubletpost, `UPDATE`, `DELETE` eller sletning af historiske rækker.
- En dataminimeret `limit=0`-kontrol accepterer nu hele turloggens feltliste med HTTP 200, og Supabase viser **users can read own observations / SELECT / authenticated**.
- Turloggens fejltekst bruger almindeligt RavRadar-sprog i stedet for leverandørnavnet Supabase.
- Flytning til `ravradar.dk` kræver, at Supabases Site URL og redirect-liste ændres i samme deployment og prøves med et nyt magic link.
- Målrettede konto-, efterregistrerings-, auth- og syntakstests er grønne. PR #113/exact-head `32662085932`, merge `db4db876` og produktion `32662155582` bestod hele kæden.
- Et nyt magic link returnerede rent til 4.0.266, og den private turlog hentede uden fejl. Kun eftersendelsen fra ejerens oprindelige Chrome-outbox mangler at blive bekræftet ved en genindlæsning.
- Score, vejr, Candidate G, geometri og land-/vandpunkter er uændrede; geodatafilerne får kun versionsfeltet 4.0.266.

## 4.0.264 – forståeligt brugerflow og privat turlog (2026-08-23)

- Kontoen får **Mine ture og fund**, som viser brugerens eksisterende Supabase-ture uden en ny tabel, ekstra serverrække eller dobbelt lagring.
- Den aktive turknap bruger nu den komplette v2-rejse direkte og starter ikke længere den gamle GPS-baserede parallelrejse.
- Login forklarer magic link som et engangslink via mail, og callbacken henter den faktiske Supabase-bruger før kontoejerskab bruges.
- Centrale brugerord om RavScore, turen og fund er gjort mere almindelige og forklarende.
- Rodhåndbogen tilføjes til workflowets eksakte docs-only-skip; en separat ren dokumentationsmerge skal senere bevise, at ændringen giver 0 push-produktionskørsler.
- Candidate G, `20/50/30`, scorelogik, vejrruntime, geometri og land-/vandpunkter er uændrede. Versionsløftet må kun ændre versionsfeltet i de to geodatafiler.
- PR #104 bestod exact-head og blev merged. Den første produktionskørsel stoppede før release på en forældet UI-test. PR #105 rettede den, bestod exact-head og blev merged; den næste produktion stoppede før deploy på en anden gammel ordret stjernetest. Stjernetesten og den lokalt fundne gamle mobil-turtest følger nu den nye UI og indgår i kildegaten.
- PR #106 bestod exact-head og produktion `32652970105` udgav 4.0.264 på 210/673. Live konto-/turflowet er kontrolleret, og den fulde 420/2.100/673-audit er grøn efter at audittens gamle `3-timers trend`-opslag blev rettet til UI'ets `Vandstandsændring på 3 timer`.
- PR #107 bestod exact-head `32654048944`, merge `8b758337` og fuld produktion `32654119745`; live `rr-20260823171804-210` er grøn med den låste auditlabel.
- Den rene dokumentations-PR #108 bestod exact-head `32654780774` og blev merged som `98621bf9`. Mergecommitten oprettede 0 push-produktionskørsler, så rodhåndbogens docs-only-skip er bevist.

## 4.0.263 – Candidate G-gate følger den aktuelle zonereference (2026-08-23)

- 4.0.262-produktion `32642532892` beviste, at cadence-rettelsen virker: 673/673 states fortsatte, replaymismatch var 0, og 110 transportpotentialer blev positive mod 563 fysisk fortsat nul.
- Den efterfølgende audit fandt en særskilt profilfejl: et senere hul i femdøgnsprognosen gjorde `candidateWarmupEligible=false`, selv om alle 673 faktisk viste aktuelle referencer var sammenhængende `WINDOW_INCOMPLETE`.
- Candidate G's memory-/warmup-gate vurderer nu den nærmeste fælles aktuelle referencetime pr. zone. Hele femdøgnets Candidate G-scorecoverage kræves fortsat, og et gap ved den aktuelle reference udløser stadig global rollback.
- Fremtidige gaps forbliver fail-closed i deres egen state: der opfindes ingen strøm, og det brugbare suffix genstarter fra den faste rand efter hullet.
- Kontrakten eksponerer `CURRENT_COMMON_ZONE_REFERENCE` og er låst i målrettede tests og public-shadowen.
- Scorefysik, `20/50/30`, rollback `25/40/35`, geometri, land-/vandpunkter og beskyttede/private data er uændrede; kun versionsfeltet i de to geodatafiler løftes til 4.0.263.
- PR #101 bestod exact-head `32644701811`, blev merged som `9f5953f6`, og produktion `32644772373` bestod hele kæden. Live `rr-20260823142247-210` har Candidate G aktiv på 210/673 med 673 fortsatte states, nul reset/replaymismatch, 139 positive og 534 aktuelt fysiske nultransporter.
- Aktiv shadow `32645569741` og browserkontrollen er grønne med 420 aktuelle visninger, 2.100 femdøgnsvisninger, 673 kystdelsreferencer og nul fejl. P0 er produktionslukket.

## 4.0.262 – Candidate G følger produktionens native strømcadence (2026-08-23)

- Candidate G's rullende 48-timers transporthukommelse accepterer nu op til tre timer mellem to verificerede beviser, svarende til produktionens dokumenterede marine stride. Integrationen bruger fortsat den faktiske forløbstid; der opfindes ingen mellemliggende timeprøver.
- Mere end tre timers afstand, manglende seneste bevis eller missing inde i vinduet er fortsat et ægte datagab. DEC-0060's ejeraccepterede pre-public opvarmning må nu kun omfatte et kort, men sammenhængende `WINDOW_INCOMPLETE`-vindue; andre ikke-ready-statusser giver global legacyrollback.
- Den centrale profilgate eksponerer `candidateWarmupEligible`, og public-shadow genafspiller hver kompakt transportstate med aktuel kode og kræver identisk potentiale, udtransporttilstand, readiness, status og coverage.
- Målrettede tests dækker første native tre-timers fortsættelse, et komplet 17-punkts/48-timers vindue, opdelt mod ubrudt replay og fail-closed ved fire timers hul.
- Dataminimeret genafspilning af den fejlramte 4.0.261-runtime ændrer 673 fastlåste nuller til 110 positive og 563 fysisk fortsat nul. Det gamle artifact afvises som forventet med state-replaymismatch; ingen rå strømvektorer, koordinater eller private payloads vises.
- Model-id, state-schema, `20/50/30`, +10/-8-/13-timersreglerne, mobilisering 4/48 og waders-jagtbarhed er uændrede. Artifact, protected-dirty-data, privat cache, geometri og land-/vandpunkter er urørte; kun versionsfeltet i de to geodatafiler løftes til 4.0.262.
- Lokal implementation, målrettede tests og samlet source-/RDKS-/releasegate er grønne. Exact-head, frisk fuld produktion, aktiv 210/673-shadow og hændelseskrævet browserkontrol skal være grønne, før P0 kan kaldes produktionslukket.

## 4.0.261 – Candidate G aktiv og produktionsverificeret under pre-public opvarmning (2026-08-23)

- **Historisk P0 efter release:** Live `rr-20260823121818-210` viste transportpotentiale og transportkomponent 0 i 673/673 dele, fordi tre timers native bevisafstand blev afvist af en én-times-gate. Den lokalt implementerede 4.0.262-rettelse er beskrevet i DEC-0061 og afventer ovenstående produktionsbevis.

- Ejeren har i DEC-0060 valgt Candidate G som RavRadars gældende scoremotor nu og accepteret, at den første ikke-offentlige scoreperiode bruger mindre end 48 timers naturlig schema-2-historik.
- Den aktive profil er `RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3` med `20/50/30`; modelregler, strømgrænser, +10/-8-kurven, 13-timers udtransportgate, mobilisering 4/48 og vindstyret waders-jagtbarhed er uændrede.
- Profilomskifteren skelner nu mellem fuld beregnelig Candidate G-dækning og moden transporthukommelse. Pre-public opvarmning tillades kun med eksakt ejerautoritet; én manglende nødvendig kandidatscore giver fortsat global rollback til `25/40/35`.
- Runtime mærker den første periode `candidate-active-pre-public-warmup` og bevarer faktisk `WINDOW_INCOMPLETE`-/coverage-status. Manglende timer opfindes ikke og kaldes ikke et 48-timersbevis.
- `ravscore-profile-selection` er et nyt privat centralt admin-dokument. En nyere ejer-godkendt repositoryversion kan promoveres én gang, hvorefter central samme/nyere konfiguration er autoritativ. Produktion skriver dokumentet tilbage og kræver identisk readback.
- Den aktive, dataminimerede shadow kontrollerer nu, at den offentlige score er identisk med Candidate G i alle 673 dele, samtidig med at rå U/V, koordinater og private payloads fortsat er forbudt.
- Eksakt legacyrollback, automatisk aktiveringsforbud og global fail-closed-adfærd er bevaret og målrettet testet.
- Ingen artifact, protected-dirty-data, private caches, geometri eller land-/vandpunkter er ændret. I `data/kystdata.json` og `data/zones.geojson` er kun versionsfeltet løftet til 4.0.261.
- PR #97/exact-head `32636378576`, produktion `32636433944` og central readback beviser den aktive profil. PR #98/produktion `32637387600` og shadow `32637833674` lukkede auditkontrakten; PR #99 registrerede den grønne 210/673/420/2.100-browserkontrol.


## Intern Candidate G-rettelse efter 4.0.260 – afgrænset transporthukommelse (2026-08-23)

- DEC-0059 erstatter Candidate G's ubundne transportfortsættelse og den forkastede startprior 50 med et fast, rullende 48-timers vindue af sammenhængende, verificeret og afledt kystnormal strømevidens.
- Transporten genafspilles fra en fast rand 0, der betyder “ingen dokumenteret indtransport før vinduet” og ikke fralandsstrøm. Persistéret transportoutput bruges ikke som ny startværdi.
- Fuld pålandsstrøm bygger fortsat 10 point pr. effektiv time; fuld fralandsstrøm trækker 8 point pr. effektiv time og udtømmer transporten fra 13 timer. Mobilisering og waders-jagtbarhed er uændrede.
- Statekontrakten er versionsbundet som schema 2. Missing og tidsgab må ikke foregives at være neutral strøm og holder Candidate G's globale aktiveringsgate lukket, indtil 48-timersvinduet igen er komplet.
- Syntetiske tests beviser samme resultat efter komplet vindue for tænkte starter 0, 50 og 100. En dataminimeret historisk audit finder 582 komplette vinduer og nul startafhængighed uden at udgive rå strømvektorer, koordinater, del-id'er eller private payloads.
- Der kræves ikke en ny 48-timers realtidsudviklingstest. Candidate G er fortsat inaktiv; offentlig `25/40/35`, UI, geometri, land-/vandpunkter, artifact, protected-dirty-data og private caches er uændrede.
- Exact-head `32633533257` bestod på `56824ab0`; PR #95 blev merged som `1d848724`, og fuld post-merge-produktion `32633607166` bestod frisk data, fuld validering, releasegate, Supabase, artifact og Pages.
- Live `rr-20260823102619-210` er integritetskontrolleret mod manifestet med 210 zoner og 673 kystdele. Alle 673 har schema 2 med ét første afledt timebevis, `transportMemoryReady=false` og `WINDOW_INCOMPLETE`; aktiv, ønsket og rollback er fortsat legacy, og Candidate G er aktiveret 0 steder.

## 4.0.259 – central Candidate G-tilstand og 210/673 public shadow (2026-08-23)

- Candidate G beregnes nu centralt for hver kystdel med den anbefalede `20/50/30`-model, men forbliver et adskilt `diagnostic-only`-navnerum. Den aktive offentlige `25/40/35`-score, UI, farver og zonevindere er uændrede.
- Transportpotentiale, effektive udtransporttimer og mobiliseringspotentiale føres videre ved den fælles aktuelle referencetime. Model, profil og kystkontekst er versionsbundet; samme-time-rekørsel og missing holder tilstanden, mens inkompatibel kontekst nulstiller fail-closed.
- Den kompakte tilstand indeholder ingen rå U/V, vind-, bølge- eller koordinatdata. Offentlige Candidate G-resultater viser kun de afledte værdier og de komponenter, der kræves for forklaring og kontrol.
- Den manuelle Candidate G-shadow auditerer nu den faktiske fallback-kompatible public runtime i stedet for at genhente en smallere native-only DMI-prøve. Kontrakten kræver 210 zoner, 673 dele og 1.346 rekonstruerbare modeevalueringer.
- DEC-0057 dokumenterer dataminimering, bootstrap, forklaring og rollback. Exact-head `32609888406`, PR #89/merge `31e50acb`, fuld produktion `32609952992` og read-only shadow `32610281620` er grønne på 210 zoner, 673 dele og 1.346 modeevalueringer. Alle 673 tilstande er første bootstrap og må ikke kaldes en modnet 48-timersfordeling; aktiv scorekobling afventer naturligt videreført state-alder og en frisk slutshadow.
- Første naturlige schedule `32613284735` udgav `rr-20260823023951-210` efter fulde gates. Den dataminimerede audit accepterede 673/673 tidligere tilstande, nulstillede 0 og dokumenterer 3/3 timers yngste/ældste naturlige state-alder; 48-timersslutshadow udestår.
- Artifact, protected-dirty-data, geometri, land-/vandpunkter, bundmodel og sikkerhedsbetydning er urørte.

## Intern RavScore-forskning efter 4.0.258 – Candidate G mobilisering (2026-08-23)

- `RESEARCH-3` samler den foretrukne private Candidate G: `20/50/30`, DEC-0054's jagtbarhed, DEC-0055's strømtransport og DEC-0056's nye mobilisering.
- Mobilisering beregnes som én kausal tilstand fra bølgehøjde² × periode med fire timers opbygning og 48 timers aftrapning. Direkte vind, aktuel strøm, separat varighed og statisk stedegnethed giver ikke ekstra mobiliseringspoint.
- En ny syntetisk audit tester kort spids mod vedvarende hændelse, præcis 48-timers halvering, missing-hold, kørselsfortsættelse og udtransportgate uden private input.
- Den eksisterende Git-ignorerede cache er genafspillet uden nye downloads: 1.460 evalueringer, gennemsnitlig ny mobilisering 73,348 mod 57,651 og samlet scoreændring +3,484 mod den valgte transportrevision.
- De nye mobiliseringstests indgår både i `test:score` og den hurtige kildegate. Samlet lokal `scripts/validate-source.ps1` og releasegate er grønne.
- Den gamle 243/673-shadow beskriver en tidligere snæver native-DKSS-testkontrakt, ikke manglende almindelig vejrdækning. Den aktuelle produktion har 673/673 dokumenterede strømidentiteter; en senere slutshadow skal bruge den endelige fallback-kompatible kontrakt.
- PR #86/merge `5d7d4c2b` og produktion `32606559443` er grøn transportbaseline med fulde gates, 210 zoner og 673 dele. En midlertidig DMI 429/uforandret collection blev håndteret af den godkendte fallback uden gateomgåelse.
- Mobiliseringscheckpointet bestod exact-head `32607989444` på `03083f92`, blev merged via PR #87 som `48240d73` og bestod fuld produktion `32608050112`. Central hydrering, frisk kontrolleret data, fuld validering, releasegate, Supabase, artifact og Pages er grønne; 210/673-kontrakten består.
- Offentlig RavScore `25/40/35`, UI, runtime, geometri, land-/vandpunkter og beskyttede data er uændrede. Næste delmål er samlet pipeline-/forklarings-/rollbackforberedelse før offentlig kobling.

## Intern RavScore-forskning efter 4.0.258 – Candidate G frigivelsesrevision (2026-08-23)

- PR #82 bestod exact-head-kildegate `32602287607` på `74624ac3` og blev merged som `189644a0`.
- Post-merge-produktion `32602328912` bestod frisk vejr/proveniens, fuld validering, releasegate, supportpakke, Supabase og Pages. Live `rr-20260822223539-210` er komplet med 210 zoner, 673 kystdele og samme datasæt-id i manifest, startdata og detaljedata.
- En ny syntetisk, reproducerbar audit låser den godkendte udtransportkurve: transportpotentialet falder 100, 92, 84, 76, 68, 60, 52, 44, 36, 28, 20, 12, 4 og 0 fra 13 effektive fuldstyrketimer.
- Auditten dækker samtidig halv styrke, deadband, neutral strøm, valgfri 24/48-timers halvering, manglende verificering, bølge-only, den begrænsede landingsfaktor og waders-vindstoppet.
- Den nationale shadowkontrakt bruger nu de aktuelle aktiveringsgates og afviser de erstattede waders-/pil-/ekstremmarkører.
- Ejeren har efterfølgende afgjort 13-timersbetydningen. Den nye interne `RESEARCH-2`-revision sætter Candidate G's slutscore til 0, når dokumenteret kraftig fralandsstrøm både har udløst reel udtransport og udtømt transportpotentialet. Mobilisering og jagtbarhed bevares som synlige delscorer.
- Den bindende forklaring er: `På grund af kraftig fralandsstrøm trækkes ravet ud i havet og derfor går scoren i nul, selv om der fortsat kan være mobilisering og god jagtbarhed`.
- Reglen udløses ikke af startpotentiale 0, missing, neutral strøm eller almindelig svag modstrøm. Den tidligere `RESEARCH-1`-betydning med samlet score cirka 35 ved udtømt transport bevares kun som revisionsspor.
- Implementationen bestod exact-head `32604792201` på `f6458f09`, blev merged via PR #84 som `800a93cb` og bestod fuld post-merge-produktion `32604850884`.
- Live `rr-20260822232159-210` er direkte verificeret som komplet med 210 zoner, 673 kystdele og samme datasæt-id i manifest, startfil og detaljefil. Candidate G er fortsat ikke offentligt aktiveret.
- Offentlig RavScore `25/40/35`, UI, produktion, geometri, land-/vandpunkter og beskyttede data er uændrede. Candidate G forbliver privat og kan ikke aktiveres automatisk.

## Intern workflowrettelse efter 4.0.258 – docs-only skip bevist (2026-08-23)

- PR #80 blev merged som `1565e073` med kun `CHANGELOG.md` og intern AI/RDKS-dokumentation.
- GitHub viste 0 workflowkørsler på mergecommitten; `Update weather and deploy RavRadar` blev derfor ikke oprettet.
- Den snævre rod-CHANGELOG-rettelse er dermed både kilde-, produktions- og skip-verificeret uden brede undtagelser.

## Intern workflowrettelse efter 4.0.258 – produktionsbevis på rod-CHANGELOG (2026-08-23)

- PR #79 bestod exact-head-kørsel `32600654326` på `24d944c0` og blev merged som `41f71900`.
- Den forventede fulde produktion `32600714319` bestod frisk vejr/provenance, fuld projektvalidering, release-gate, supportpakke, Supabase-synkronisering og Pages-deploy.
- Live-manifestet er komplet som `rr-20260822215524-210` med 210 zoner og 673 kystdele. Dette rene dokumentationscheckpoint er det særskilte skip-bevis; ingen ny push-produktion må oprettes ved merge.

## Intern workflowrettelse efter 4.0.258 – samlet CHANGELOG i docs-skip (2026-08-22)

- Den selektive dokumentationsregel dækkede versionsfilerne `CHANGELOG-*.md`, men ikke projektets aktuelle samlede `CHANGELOG.md`; derfor udløste PR #78's docs-only merge en unødvendig fuld produktion.
- Den eksakte rod-fil tilføjes til allowlisten ved siden af versionsmønstret. Regressionstesten kræver begge og bevarer forbuddet mod brede Markdown-, docs-, data-, script-, workflow- og HTML-undtagelser.
- Workflowrettelsen kræver én fuld produktionskørsel og derefter et separat docs-only skip-bevis.

## Intern RavScore-forskning efter 4.0.258 – strømstyret hukommelse (2026-08-22)

- Candidate G har fået en score-neutral variant, hvor verificeret kystnormal strøm bygger eller nedbryder transportpotentialet.
- Fuld indgående strøm bygger 10 point pr. effektiv time. Den ejerbesluttede udtransportkurve trækker straks 8 point pr. effektiv time og når 0 fra 13 timer.
- Bølger kan ikke skabe transport; de kan kun påvirke en allerede eksisterende levering med højst 15 procent.
- Privat replay og målrettede self-tests består. Følsomheden viser, at strømgrænse og start-/24–48-timers forældelsesregel skal afklares før aktivering.
- Offentlig RavScore `25/40/35`, UI, data, geometri og land-/vandpunkter er uændret. Candidate G forbliver privat og diagnostic-only.
- PR #75 bestod exact-head-kildegate `32598284279` på `d37d15fe` og blev merged som `4379606e`. Der blev ikke startet et nyt produktionsartifact.
- En efterfølgende score-neutral randkontrol understøtter valgfri neutral halvering på 24/48 timer. Start-0-scoren flytter -1,182/-0,697 point, men alle 12 replayvinduer har kun 24 timers forhistorie, så ingen fysisk levetid vælges.
- Referencegrænsen 0,05→0,20 m/s har ingen fuldstyrkeevalueringer i replayet; lavere profiler har kun sparsom fuldstyrkedækning uden fundlabels. Strømgrænsen er fortsat åben.
- Efterkontrollen bestod exact-head `32599255165`, PR #77/merge `75ed93d6` og fuld produktion `32599309735`. Live `rr-20260822212612-210` har 210 zoner og 673/673 dele; offentlig Candidate G er ikke aktiveret.

## 4.0.258 - vindstyret waders-jagtbarhed i Candidate G (2026-08-22)

- Den private foretrukne forskningsvariant er nu `G-50-50-NO-DIRECT-WIND-WADERS-WIND-LED` med den ejerbesluttede analyseprior `20/50/30`; offentlig RavScore er fortsat `25/40/35`.
- Waders-vindkurven er 100 til og med 6 m/s og falder gennem 7/80, 8/60, 10/35, 13/10 og 15/0. WAM-bølgehøjde kan kun give et blødt fradrag på højst 20 point og kan ikke alene lukke jagtbarheden.
- Replayet på 1.460 evalueringer bevarer alle 730 strandscorer, holder alle waders-scorer under jagtbarheden og giver gennemsnitligt fire points bølgefradrag. Alle replaytilfælde ved mindst 15 m/s ender på 0.
- Den nationale score-neutrale shadowkontrol følger nu også den nye variant gennem central regelkæde og waders-loft. Automatisk aktivering forbliver deaktiveret.
- DEC-0054 erstatter DEC-0053's tidligere `20/45/35`, 18 m/s-stop og mere selvstændige bølgekobling. Ældre modeller bevares som revisions- og følsomhedsspor.
- Ingen offentlig score, UI, data, DMI/fallback, geometri eller land-/vandpunkter er ændret. Private cachepayloads er ikke en del af Git.
- PR #73 bestod exact-head-kildegate `32586707063`, blev merged som `9bdb8de8` og bestod fuld produktion `32586958989`. Live 4.0.258/datasæt `rr-20260822171406-210` er verificeret med 210 zoner, 673 dele og 2.100 femdøgnsvisninger; offentlig `25/40/35` er fortsat aktiv.

## 4.0.257 - Candidate G-coverage uden skjult stedmodel (2026-08-22)

- Frisk central shadow på den produktionsverificerede 4.0.256-merge fandt 243/673 scorede dele; 430 mangler komplet lokal DKSS-familie.
- Den private coveragegate måler nu kun komplette dynamiske scoreinput. Statiske lokale rev-/lavtvands-/ålegræsfelter er diagnostic-only, har nul Candidate G-scorepåvirkning og kræves ikke for aktivering.
- Parentzonens morfologi må fortsat ikke arves som lokal evidens, og automatisk aktivering forbliver deaktiveret.
- Offentlig 25/40/35, Candidate G-beregningen, UI, geometri og land-/vandpunkter er uændrede.
- Efter produktionsverificering og exact-merge-shadow samler DEC-0053 ét ejerreviewspor: `G-50-50-NO-DIRECT-WIND-WADERS-LIMIT`. `20/45/35` er fortsat analysecentrum, mens endelig vægtning afventer komplette ture; ingen ekstra rådata hentes til den aktuelle mekaniske analyse.

## 4.0.256 - Candidate G-vægt og forklaring (2026-08-22)

- Den score-neutrale waders-variant er genafspillet med `15/50/35`, `20/45/35` og `25/40/35`; `20/45/35` bevares som gennemsigtigt analysecentrum.
- Candidate G udstiller nu eksakte komponentbidrag, pil nu, historik før nu, fysisk gate og synligt waders-loft i én maskinlæsbar diagnostic-only forklaring.
- Replay og kanoniske scenarier er grønne uden offentlig score-, UI-, data-, geometri- eller punktændring. Offentlig 25/40/35 er fortsat aktiv.
- Komplet dynamisk scoreinputcoverage og ejerens samlede go/no-go er fortsat nødvendige før aktivering. DEC-0052 erstatter den ældre kombinerede retention-coverageformulering.

## 4.0.255 - national waders-kontrakt i kildegaten (2026-08-22)

- PR #66's fulde post-data-validering stoppede korrekt på den gamle interne markør `candidate-waders-product-decision`; release, Supabase og Pages blev ikke kørt.
- Kontrakttesten følger nu den aktuelle åbne gate `candidate-waders-rule-order-public-product-review` og kører også i `validate:source`, så samme forskel stoppes før merge.
- Waders-kandidat, vindkurve, replayresultater, aktiv 25/40/35-score, geometri og land-/vandpunkter er uændrede.
- PR #67 exact-head-gate `32575697204`, merge `af8f30cf` og produktion `32575740539` er grønne. Live `rr-20260822133041-210` viser 210 zoner/673 dele, komplet `controlled-live`-manifest og byte-/SHA-match for begge offentlige datafiler.


## 4.0.253 - score-neutral Candidate G-produktkontrakt (2026-08-22)

- Kandidatens eksakte komponenter, vægtede bidrag og fysiske gate rekonstruerer nu 1.460/1.460 private scorer uden at ændre nogen scoreværdi.
- Den foretrukne no-direct-wind-variant dokumenterer waders-konflikten: 219 lave jagtbarheder, heraf 7 med mindst 55 point, samt det kanoniske 0/79-forløb.
- Pilen fastholdes som aktuel lokal strøm; historik får en separat forklaringskontrakt, når den modvirker den aktuelle retning.
- Den nationale shadow klassificerer coverage samlet og afviser parentzonens morfologi som lokal kystdelsevidens.
- Aktiv RavScore 25/40/35, offentlig UI, geometri, land-/vandpunkter, DMI/fallback og central admin er uændrede. Kandidat G er fortsat ikke aktiveret.
- PR #62 leverede kode-/analysebaselinen som `b2951d90`; dokumentationscheckpointene PR #63/#64 bestod exact-head-gates. Fuld produktionsverifikation `32570223437`, support `RavRadar-support-3382`, Supabase og Pages-deployment `6036286717` er grønne; det verificerede live-snapshot `rr-20260822112859-210` havde 210 zoner og 673/673 scorede dele.

## 4.0.243 - releasekandidat: komplette ture (2026-08-21)

- Nye læringsdata er komplette søgeture med start, slut, varighed, metode, faktisk zone/kystdel, grundighed og fund/ikke-fund.
- Prognosen ved turstart fastholdes med et dataminimeret kalibreringssnapshot; individuelle fund er ikke fit-enheden.
- GPS, rute, spor og præcis position fjernes fra fjernpayloaden.
- Eksisterende observationer bevares som v1-dækningsdata; RavScore 25/40/35 er uændret.
- Kandidaten er ikke produktion før Supabase-migration, fulde gates, deploy og 210/673-browserkontrol.

## 4.0.252 - fair landsrangering (2026-08-21)

- Begge nationale top-5-lister korrigerer nu for mange forskelligt vendte kystdele med den godkendte `direction-broad-19-v1`-model.
- Bred støtte i zonen beskytter reelt stærke placeringer; ved mindst 50 procent støtte er korrektionen nul.
- Den viste RavScore, lokale resultater, pile, forklaringer, geometri og land-/vandpunkter er uændrede.

## Intern RavScore-forskning efter 4.0.252 (2026-08-21)

- En parret historisk kontrol isolerer nu retning fra styrke og tidspunkt paa 1.460 modelpar.
- Analysen viser, at den aktive score reagerer for ens paa retning ved svag og kraftig flytteevne.
- Kandidat G er registreret som privat arbejdshypotese med historisk stroem-/vindhukommelse og foreloebigt vaegtcentrum 20/45/35.
- Den offentlige RavScore, UI, DMI-first, geometri og alle land-/vandpunkter er uændrede.

## Privat RavScore-regimehukommelse (2026-08-21)

- Nyt score-neutralt analysevaerktoej tester styrke-, varigheds- og historikstyrede vendinger for stroem, boelger og vind.
- 12 historiske 96-timersforloeb peger foreloebigt paa 24 timers aktivt regimespor og 48 timers baggrundsspor som naeste foelsomhedstest.
- Ingen point, produktionsscore, UI, datafelter, geometri eller land-/vandpunkter er ændret.

## Privat RavScore 24/48-matrix og ablation (2026-08-22)

- Et nyt kausalt analysevaerktoej sammenligner 24 timer, 48 timer og tre dobbeltsportsblandinger uden fremtidslaek.
- Separate ablationer maaler stroem, boelgeenergi og alternative vindspor uden at gemme raa vejrdata eller aendre score.
- Naeste replay afgraenses til 24 alene, 50/50 og 48 alene; lineaer vind er hovedanalyse, og vindstress er foelsomhedsgrænse.
- Aktiv RavScore, offentlig runtime, DMI-first, geometri og alle land-/vandpunkter er uændrede.

## Privat RavScore kandidat G replay (2026-08-22)

- Ny diagnostic-only kandidat G bevarer kandidat E's fysiske procesvej og tilføjer kapacitetsbevarende 24/48-timers historik.
- Privat replay dækker 1.460 evalueringer; separate strøm-, bølge-, direkte vind- og totalvindablationer er dokumenteret.
- 24 timer, 50/50 og 48 timer er næsten scoreidentiske. Varianten uden direkte vind er foretrukken til næste shadow, fordi direkte vind kun flytter 0,086 point absolut i gennemsnit.
- Centralt hydreret national shadow kontrollerede 673 aktive dele/210 zoner: 243 dele blev scoret, 430 var eksplicit u-scorede, og ingen offentlig score eller runtime blev ændret.
- G 50/50 lå nationalt i gennemsnit 5,50 point under aktiv model for strand og 3,74 for waders; 24/48 og no-direct-wind var praktisk identiske.
- Waders-jagtbarhed 0 kan sameksistere med høj kandidatscore og er registreret som aktiveringsstopklods før ejer-go/no-go.

## Intern shadowgate-rettelse efter PR #59 (2026-08-22)

- Den private RavScore-shadow må fortsat læse centralt gemte ekspertregler, men må ikke skrive dem tilbage, deploye eller aktivere en score.
- Kildegaten kontrollerer nu denne kontrakt direkte og forbyder konkrete centrale skrive- og Pages-veje.
- Rettelsen ændrer ikke Candidate G, offentlig RavScore 25/40/35, data, geometri eller land-/vandpunkter.

## 4.0.254 - score-neutral waders-vind- og jagtbarhedsvariant (2026-08-22)

- Ny diagnostic-only `G-50-50-NO-DIRECT-WIND-WADERS-LIMIT` bevarer alle strandscorer og begrænser waders-scoren synligt til waders-jagtbarheden.
- Waders-vinddelen er 100 til og med 6 m/s og falder glidende gennem 7/80, 8/60, 10/35, 13/10 og 18/0; bølger indgår fortsat separat.
- 1.460 private replayevalueringer og 132 syntetiske vind-/bølgekombinationer er kontrolleret uden rå vejrdata, U/V, koordinater eller beskyttede payloads i Git.
- Ingen sikkerhedsadvarsel eller automatisk bund-/dybde-/adgangsvurdering er tilføjet. Offentlig RavScore 25/40/35, UI, DMI/fallback, geometri og land-/vandpunkter er uændrede.
## Intern RavScore-forskning efter 4.0.258 – transporttærskel og kørselskontinuitet (2026-08-23)

- Efter ejerreview anbefales `0,03→0,15 m/s` som Candidate G's private kystnormale produktprior. `0,15` matcher RavRadars eksisterende betydning af en velegnet strømstyrke; profilen er ikke fundkalibreret.
- Det opdaterede `RESEARCH-2`-replay på 1.460 evalueringer giver 31,360 i gennemsnit og 213 ændrede scorebånd mod 28,291 for 0,05→0,20. Den mere følsomme 0,02→0,12 ændrer 377 bånd.
- Neutral og missing giver intet passivt tab. 24-/48-timers neutral halvering bevares som følsomhed, ikke produktadfærd.
- Regimemodellen kan nu fortsætte en kompakt afledt tilstand over en pipelinegrænse. En opdelt syntetisk kørsel reproducerer potentiale, effektive udtransporttimer og 13-timers nul-gate eksakt.
- Offentlig RavScore `25/40/35`, UI, produktion, private payloads, artifact, protected-dirty-data, geometri og land-/vandpunkter er uændrede.
# 4.0.260 – versionsbundet RavScore-omskifter uden offentlig aktivering (2026-08-23)

- RavRadar kan nu vælge én eksakt RavScore-profil for hele den lokale 210/673-runtime og rulle deterministisk tilbage til `RRS-CURRENT-B0-4.0.247`.
- Standard, aktiv og rollback er fortsat offentlig `25/40/35`; Candidate G's `20/50/30` er ikke aktiveret.
- Candidate G kræver eksplicit aktivering, komplet global dækning, frisk grøn slutshadow og særskilt ejerbeslutning. Manglende eller ukendt konfiguration falder fail-closed tilbage for hele datasættet.
- Profilkontrakten følger startpakke, detaljepakke og manifest. Nye tests låser legacyidentitet, Candidate G-projektion, udtransportforklaring, forbud mod blandede profiler og eksakt rollback.
- Den naturlige state er dokumenteret videreført i seks timer på alle 673 dele uden nulstilling. Det er praktisk evidens efter ejerbeslutning, ikke et 48-timersbevis.
- Ingen artifact-, cache-, geometri-, punkt-, bund-, sikkerheds- eller offentlig scoreændring indgår.
- PR #92 bestod exact-head `32628441062` på `eabf7e8b` og blev merged som `c5898ce8`. Fuld produktion `32628516066` udgav `rr-20260823083627-210` efter alle gates.
- Den dataminimerede audit består 210/673/1.346 med 673 accepterede tilstande, nul nulstillinger og 9/9 timers alder; browserauditten består 420/2.100/673 uden fejl.
- Candidate G er fortsat ikke aktiv. Den friske scorefordeling er væsentligt lavere end aktiv score og afventer særskilt ejerreview før en eventuel aktiveringsversion.
- En dataminimeret bootstrapaudit af 42.551 eksisterende offentlige historikposter viste under den daværende ubundne regel, at 65–117 timers forløb ikke kunne bestemme startreserven uden passivt neutralt tab. Den historiske anbefaling om neutral startprior 50 er nu erstattet af DEC-0059; 0 og 100 bevares kun som følsomhedsspor, og ingen score aktiveres.
## 4.0.265 – fleksibel kontoindberetning og ærligt fravalg (2026-08-23)

- En indlogget bruger kan vælge **Indberet tur eller fund** fra kontoen uden først at starte en tur.
- Efterregistreringen kræver, at brugeren selv vælger dato og klokkeslæt for turens start samt turens varighed. Dato og klokkeslæt er ikke forudfyldt. Formularen genbruger samme spørgsmål og zoneafhængige kyststrækningsvalg som en almindelig tur.
- Rapporten gemmes i den eksisterende `observations`-tabel uden ny tabel, dubletrække eller databaseændring. Aktuelle vejrforhold bruges aldrig som historisk erstatning.
- Når et sikkert historisk snapshot ikke kan genskabes, gemmes efterregistreringen med tomme forecast-/snapshotfelter og `calibration_eligible=false`; den kan bruges som erfaring, men ikke direkte til scorejustering.
- Den lokale sandsynlighedsberegning filtrerer nu udtrykkeligt rækker med `calibration_eligible=false`, så en efterregistrering uden historisk vejr ikke ændrer brugerens aktuelle fundchance.
- En startet tur kan nu **Afsluttes uden at indberette** efter bekræftelse. Det rydder den lokale aktive tur uden observationspost, outboxpost eller Supabase-række; **Svar senere** bevarer turen lokalt.
- **Mine ture og fund** viser tid og mærker efterregistrering, men viser ikke længere intern tekst om databasekopier.
- Gramfeltets maksimum følger nu databasens eksisterende grænse, så en ellers gyldig rapport ikke kan ende fastlåst i offlinekøen.
- Målrettede kontrakt-, observation-, turlog- og syntakstests er grønne. De tre første PR-kørsler stoppede sikkert på henholdsvis et gammelt profilversionsmærke, to manglende webhåndbogssætninger og den manglende versionsspecifikke changelog. Alle tre afgrænsede mangler blev lukket uden scoreændring. PR #111 bestod derefter exact-head `32658661075`, blev merged som `cb7d2232`, og produktion `32658724861` bestod frisk vejr, fuld validering, releasegate, Supabase og Pages. Live `rr-20260823184330-210` er 4.0.265 på 210/673; den udgivne formular kræver selvvalgt dato og tid uden forudfyldning.
- Candidate G, `20/50/30`, scorelogik, vejrruntime, database, geometri og land-/vandpunkter er uændrede. Versionsløftet må kun ændre versionsfeltet i de to geodatafiler.
## 4.0.284 – Sikkerhedsgrænser og offentlige Edge-gateways (2026-08-26)

- Saniterer dynamisk HTML, indfører CSP og fjerner inline JavaScript fra offentlige sider.
- Begrænser ekspertadministration i RLS, RPC og UI og flytter observationsinsert til en validerende, rate-limited Edge-gateway.
- Samler fælles CORS/gatewaykode. Begge funktioner er live-verificeret uden private testdata; lokal assistent er standard, fordi fjernsecret ikke er installeret.
- Overvåger Supabases varsel om mulig begrænsning fra 9. september 2026. Se `CHANGELOG-4.0.284.md` og DEC-0080.
