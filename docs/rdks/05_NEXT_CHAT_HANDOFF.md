# NYESTE CHECKPOINT – 2026-09-02 – Feggesund direct-first wave-only proxy

- Denne topstatus superseder ældre direct-only-/proxy-pensioneringsresumeer nedenfor; de bevares som revisionsspor.
- Direkte lokal DMI WAM vinder altid. Kun `DK-B05-11`, kun ved hel lokal `(Hs, period, mean FROM direction)`-missing, må komplette direkte DMI-tuples fra både `DK-B05-10` og `DK-B05-12` ved samme time/run danne den faste 50/50 energikonsistente bølgeproxy.
- Proxytimer bærer `LOW`/`MODERATE`/`HIGH`, tydeligt DA/DE/EN-varsel og `calibrationEligible=false` gennem mode, zone, public, tur og observation, også ved ellers `FULL_HISTORY`. Direkte DMI følger normal historikregel.
- Undtagelsen er wave-only: ingen current, historik, recovery-backfill, kunstig state, geometri-, land-/vandpunkt- eller kystnormalændring. Ingen lokal surfzone- eller empirisk fundpræcisionspåstand.
- Release kræver privacy-sikkert 3 × 118-bevis med direct + proxy = 354 og missing = 0. Exact-head, merge, frisk fuld produktion og offentlig desktop-/mobilverifikation afventer fortsat; Candidate G er stadig offentlig.
- Slutbundles er forseglet og lokalt måltestet: integrated `a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b`/`8f723615a4ec0c0809c83caadfb843de2c5811e213d29518e1d60d9baa973807` over 44 filer og 8 deklarerede forbrugere; Candidate G-rollback `c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8`/`1efabdda91d8ba491b10d406bfc325079a75e75b7c84807d8c24dfdf4f9e6fc3` over 56 filer. Exact-head, slutligt 118-timers/Feggesund-bevis, merge, frisk fuld produktion og offentlig browserkontrol afventer; hashes i eksplicit historiske 4.0.317/4.0.318-afsnit er revisionsspor.

# NYESTE CHECKPOINT – 2026-08-31 – PR #241 merged; legacy-profilattestering lokalt rettet

- Denne topstatus superseder ældre topresumeer nedenfor, men bevarer dem som revisionsspor.
- PR #241 bestod exact-head-kildegaten i run `33397737159` og blev merged som `origin/main a1ce7632b4262d742ec4a8a59746a61241c3b79a`.
- Mergeproduktion `33400836760` passerede den tidligere Højbjerg/bearing-gate og beviste dermed den smalle `360→0`-rettelse. Den stoppede derefter fail-closed i den lokale legacy-kildeattestering, før DMI, beskyttede writes, artifact og Pages; Candidate G og den offentlige side blev ikke ændret.
- Rodårsagen er reproduceret: attesteringens testfixture tillod kun 11 profilfelter, mens den fastlåste 4.0.316-producent og den aktive offentlige Candidate G-manifestform har 20. Den lokale branch `codex/ravscore-legacy-profile-attestation` validerer nu den fulde eksakte feltmængde, readiness/advisory-konsistens og bit-for-bit samme profil i manifest og conditions. Ukendte felter og blandede profiler stopper fortsat.
- Målrettet legacy-, activation-, workflow-, deploy- og cutover-matrix samt privacy-sikker offentlig manifest/payload/53-fils source-closure-verifikation er grøn. Ingen private conditions-payloads, koordinater, rå U/V, geometri eller land-/vandpunkter er læst eller ændret.
- Candidate G/4.0.316 er fortsat eneste offentlige model. Ny exact-head, sikker merge, én frisk 4.0.319-produktion og offentlig desktop-/mobilverifikation udestår.

# NYESTE CHECKPOINT – 2026-08-31

- Denne topstatus superseder ældre topresumeer nedenfor.
- PR #238 (modelkilden) er merged som `origin/main 57f76d716310060e0d629c9f9d3691d386a2dd58`. Workflowfixes fra PR #239/#240 er merged videre til `origin/main be81005b50294f54367f154c393bb27910e16c6f`.
- Produktion `33391418061` og `33393684620` stoppede sikkert før DMI, beskyttede writes, artifact og Pages, fordi én aktiv offentlig Højbjerg-del i `DK-B04-01` / `dk-b04-01-national-part-03` stod med bearing `360`, selv om aktiv kontrakt kræver `[0,360)`.
- PR #241 er den smalle opfølgning: kun normalisering af afrundet `360` til `0`, ingen geometri-, zone-, land-/vandpunkt- eller kystnormalændring. Første CI `33394343851` stoppede ved stale bundle-/binding-consumers; senere gates blev derfor ikke bevist. Bundle-/binding-consumerne er nu regenereret og målrettet lokalt verificeret; opdateret exact-head afventer.
- De lokale bundle-hashes er nu integrated `e880d5425e6f7b93d8afc99cddf491e58ad5a4a2ab055f8e4455193609c90a73` og rollback `4ccc2081982677aadbb47a5ee7d6f2b99fdcb7e42113e73029d5c60323a5ee96`.
- Candidate G er fortsat offentlig. Næste chat skal ikke overclaim: opdateret exact-head, merge, frisk produktion og offentlig desktop-/mobilbrowserverifikation udestår fortsat.
# RavRadar – overlevering til næste chat

> **Historikregel:** 4.0.319-afsnittet nedenfor styrer modelarbejdet; 4.0.316/Candidate G er den offentlige produktionsbaseline. 4.0.317-afsnittet og alle senere sektioner mærket historisk er revisionsspor. Gamle rekonstruktionsordrer må ikke udføres.

## Nyeste checkpoint – 2026-08-31

- Nyeste offentlige Candidate G-bevis er produktion `33368963614` på uændret `origin/main 8c03e25d`; build, frisk fuld validate, releasegate, protected sync/artifact og Pages er grønne, og `rr-20260831074016-210` er komplet 210/673. Det er ikke state-6-bevis.
- Offentlig source er exact 4.0.316/Candidate G efter PR #236 på `origin/main c58deb78`; exact-head `33342157517` og post-merge `33342219152` er grønne. `33345476979`/`rr-20260831010337-210` var første recoverybevis. Det tidligere external-watchdog-`workflow_dispatch` `33347230240`/`rr-20260831012407-210` bestod fuld DMI/validate/releasegate/storage/Pages og er 210/673, `VERIFIED_ONLY`, uden syntetiske samples; Candidate G er 0/210 aktiv på grund af historikmemory. Visuel browserkontrol er åben. `33343469247`/`33344823000` var transient-503-stop uden deploy; bounded retry-hotfixen er produktionsverificeret gennem PR #237, exact-head `33352520408`, merge `8c03e25d`, backend `33352661061` og fuld produktion `33352634365`; automatisk run `33354263148` publicerede `rr-20260831034128-210` komplet 210/673.
- 4.0.319 har lokalt grønne måltests for controller-v4, historical Candidate/integrated H0→H1, direct historical Candidate→integrated og exact-target recovery. Orchestrator/build/deploy, alle 40 direkte workflowreaders, role-aware workflowkontrakter, public-integrated 210/673 + 78 browsermoduler, profil/cutover og 8-consumer-binding er grønne; slutreviewet fandt ingen P0/P1. Schemaet forbliver 30 felter/4 statusser/6 transitionstyper; ordinary maintenance er exact-current.
- Source-abort kræver NOT_STARTED-bevis. Ambiguous Pages source-visible går til exact-target writer + separat finalizer. `pages-recovery-*` er næste source-lineage. Third/mixed/reversed/stale/tampered/missing plan stopper.
- Outcome er lokalt løftet til `ravradar-production-workflow-outcome-v2`; P2-assistent-/DA/DE/EN-tests for HISTORY_INCOMPLETE vs direct missing og firetimers energivægtet/maks 15 % plain language er grønne.
- Slutbindingen er integrated `a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b`/`8f723615a4ec0c0809c83caadfb843de2c5811e213d29518e1d60d9baa973807` over 44 filer/8 consumers og Candidate G-rollback `c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8`/`1efabdda91d8ba491b10d406bfc325079a75e75b7c84807d8c24dfdf4f9e6fc3` over 56 filer.
- Ét aktivt 15-minutters kontroljob diagnosticerer vejr-/GitHubfejl og reparerer sikkert; det må ikke duplikere scheduler/watchdog eller blindt redispatche. Næste rækkefølge: slutdocs/version → fuld `validate:source` → exact-head/merge → frisk fuld state-6-produktion/Pages → Feggesund 3 × 118 → offentlig 210/673/current/fem døgn/desktop/mobil.

## Aktuelt modelspor – 2026-08-30 lokal 4.0.319 first-cutover-hærdning

- PR #235 bestod exact-head `33332106627`, blev merged som `a584d1cf`, og første push-produktion `33333490853` stoppede sikkert: 0 READY/673 kanoniske Candidate G-warmupstates blev fejlagtigt krævet migrationsklare. Ingen DMI/Copernicus, scorebygning, protected writes, artifact, Pages, deploy eller activation blev nået; Candidate G er stadig offentlig.
- 4.0.319 validerer public manifest/conditions/source-register samlet på en isoleret sti og materialiserer det aktive centralt godkendte register separat. Alle 673 source-states bindes til deres source-stateKey; active context valideres for sig. Ingen geometri, kystnormal eller land-/vandpunkter flyttes.
- 673 READY + samme context + ét target giver `candidate-g-migration`. Komplet kanonisk warmup eller legitim source→active-contextændring giver ét nationalt `genuine-cold-start`; invalid/tampered source stopper. Explicit cold start kræver `source_validated=true` og må ikke maskere en afvist integreret continuation/checkpoint.
- Integrated replay bruger kun faktisk tilgængelige private, verificerede 0–48 timer plus reel target og forbliver `HISTORY_INCOMPLETE`. Candidate G-rollback cold-replayes særskilt measured-only, må ikke hybridiseres og skal selv nå 48-timers READY før companion/checkpoint/release. Ingen syntetisk historik, interpolation, zonelån eller carry-forward.
- Resolverens UTC-target er canonical `YYYY-MM-DDTHH:00:00Z` og roundtriptestes gennem Python. En reel delvis DMI-zonecache bevares privat efter et ikke-annulleret producentforsøg, men slutgaterne lempes ikke.
- Bot-/watchdogrun `33334709027` stoppede før produktionsarbejde/Pages; pilot `33335078275` stoppede ved privat DMI-gapmatrix før pilot/Copernicus/artifact. Det er forklaringen på fejlmails, ikke skjulte deploys. Ikke-push vejrdrift vedligeholder Candidate G; første integrerede activation er fortsat push-only.
- DEC-0113 og fem first-cutover-krav er bindende. Den endelige modelbinding er regenereret. Næste sikre rækkefølge: afslut kode-/testreview → version 4.0.319 og dokumentation → målrettede/samlede gates → egen exact-head/merge → frisk fuld produktion/releasegate/artifact/Pages → Feggesund 3 × 118 → offentlig 210/673/current/fem døgn/desktop/mobil. Ingen empirisk fundpræcisionspåstand.

## Historisk præ-hærdningsmodelspor – 2026-08-30 4.0.317/PR #235

- Offentlig drift er 4.0.316/Candidate G. Den lokale 4.0.317-kandidat er `RRS-COASTAL-PROCESS-INTEGRATED-1.1.0`, state `6.0.0`; kontraktdigest `778db7aa3946f925607a8304daa42ed17dd30294e4a51bf6d895d7293e84c4e7`, bundle `74bfc42bb008f6743f374fc35201d3ea6f81f6e360c99873541fed83eeadcbae`, præcis 43 transitive filer. Candidate G-helrollbacken er separat forseglet som `c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8`/`fd3f7e70ec3706818c153c26140ae592e4f0ad2acc6c157183984689f74a2207` over 54 filer.
- Candidate G-kildebaselinen er eksakt produktionsverificeret 4.0.316 på head `49dd4cb454656bdf629e5df760176705e38d2cb0`, tree `975c3e9432cea7780564ffd56766bc1f0a0a9763` og central switch `RAVSCORE-PROFILE-SWITCH-4.0.316`. Kildekontrakten er `2f888a16190e9e43e44536536029f1b0021a1b850195524aa2312664ca74810b`, og den kanoniske 53-filers kildelukning er `a366b4a64fc3ccc8f1b94f3fed24b3ce03ea23d906396bc8bea183338c5d2606`; PR-, build- og deploykontrol skal hente og verificere den eksakte pinnede kildehead.
- Same-reference-checkpointkontrollen sammenligner både `generationSha256` og hele den validerede `candidateGRollbackCompanion` før nogen mutation; enhver divergens stopper fail-closed.
- State 6 viser current+fem døgn som konservativ `HISTORY_INCOMPLETE` ved gyldige direkte input; direct missing er `UNAVAILABLE`. Sekundære tider og alternative dele bærer egen kvalitet/bounds/coverage/reasons; incomplete får markør/interval, unavailable ingen score.
- Point-staging schema 3 parrer atomisk integreret state 6 med eksakt Candidate G-rollback-companion via separate hashes og parhash. Kun `POINT_ACTIVATION` må vælge companionen; mismatch/tamper/privacy fejler lukket.
- Native-hold-slutrevisionen fandt ingen P1/P2/P3: kun eksakt ejerautoriseret regional native cadence attesterer højst tre timer; almindelige >1h-spring bliver unknown bounds, t0→t3 lukker ikke retroaktivt hul, og normal DMI/Copernicus tilbagekalder hold. Syv måltests er grønne.
- Workflow-outcome er eksakt og payloadfrit `NOOP`/`DEFERRED`/`BUILT`/`DEPLOYED`/`FAILED`; ghost proof afvises, og FAILED holder runnet rødt.
- Historisk 4.0.317-bevis: den daværende proportionale matrix var grøn. Det er ikke et 4.0.319-slutbevis efter historical/recovery/outcome/P2-deltaet.
- PR #235's første exact-head `33324239464`/job `99291456658` stoppede korrekt i `validate:source` på en stale state-6-feedbackfixture uden merge, produktionsbuild/artifact eller deploy. Den efterfølgende samlede lokale gennemgang fandt yderligere stale public-fixtures, en resterende adaptiv observationsskrivning og bundle-drift. Remediationen er samlet, den aktive 43-filers bundle er `74bfc42bb008f6743f374fc35201d3ea6f81f6e360c99873541fed83eeadcbae`, og en ny fuld lokal `validate:source` inklusive kildekontekstens releasegate er grøn; frisk centralt hydreret produktionsvalidate/releasegate udestår.
- Anden exact-head `33329919843`/job `99306529711` på `7bc848610794b87f62a6a3763564ca46a0d7528e` bestod de forudgående model-/runtime-/rollback-/DMI-dele, men stoppede fail-closed på manglende `xarray`, fordi sourcegate-workflowet ikke installerede de ejede geometry-/Copernicus-requirements. Det var CI-infrastruktur, ikke model/runtime/data; ingen merge, produktionsbuild/artifact, deploy eller offentlig ændring skete. Alle sourcegate-workflows installerer nu de tre ejede requirements-sæt med samme betingelse umiddelbart før gaten, regressionen låser dette, PR-timeout er 45 minutter, og målrettede workflow-/Copernicus-/bundletests er grønne.
- Resterende gates: dependency-paritetscommit/push → ny PR #235 exact-head → merge → frisk fuld produktion/releasegate/artifact/Pages → Feggesund 3 × 118 → offentlig 210/673/current/fem døgn/desktop/mobil. Candidate G forbliver eneste offentlige model indtil da.
- Geodata er uændret bortset fra autoriseret topversion 4.0.316→4.0.317; ingen geometri, zoner eller land-/vandpunkter er ændret.

## Afsluttet offentlig P0 – 2026-08-30 optional fallback i 4.0.316

- PR #233/exact-head `33299676128` var grøn og blev merged som `63d789a4`. Post-merge-run `33299747300` frigav 4.0.315-D1-gaten og startede build; retirementen virkede.
- Runnet stoppede rødt ved **“Stage audited last verified Candidate G public fallback”**, fordi ingen measured-only fallback var inden for både 72 timer og prognosehorisonten. Intet nyt artifact/Pages blev publiceret.
- 4.0.316 gør fallback valgfri for en frisk measured-only primary. Gammel/udløbet fallback må aldrig vises og skal fjernes fra manifest/public files; forventet fravær må ikke blokere current+fem døgn. Uventet primary accounting/audit forbliver fail-closed.
- Ingen syntetiske data, interpolation, backfill eller zonelån. DEC-0111-retirementen består.
- DEC-0112 binder også den senere DEC-0102-model: `HISTORY_INCOMPLETE` scorer current+fem døgn ved gyldige direkte input med auto-forsvindende DA/DE/EN-advarsel ved score/detalje/fem døgn/admin/ekspert og `calibrationEligible=false`; manglende direkte input er `UNAVAILABLE`.
- Arkitekturproblemerne workflowmonolit, grøn-no-op og spredt version/docs/string-testkobling hører til modelleverancens roadmap, ikke denne P0-diff.
- 4.0.316/Candidate G er offentlig som frisk `rr-20260830091913-210` med 210/673. Candidate G gav 0 aktive zoner/210 `UNAVAILABLE` på grund af utilstrækkelig sammenhængende currenthistorik; dette er state-6-regressionsevidens, ikke state-6-releasebevis.
- Ingen private data, joblogs, geometri, zoner eller land-/vandpunkter må indgå.

## Historisk P0 – 2026-08-30 stale interlock pensioneret i 4.0.315

- 4.0.314's tilbagetrukne one-time operation efterlod normal produktion afhængig af et umuligt descriptorbundet apply+Pages-bevis. Jobs kunne være grønne, mens build, artifact og Pages var skipped.
- Offentlig primary passerede otte timer og measured-only recovery 72 timer; siden viser korrekt fail-closed tekst, men aktuelle og femdøgnsprognoser mangler.
- Ingen descriptor blev forseglet, ingen apply/rollback/cleanup blev kørt, og ingen syntetiske data blev anvendt eller deployet.
- DEC-0111 erstatter DEC-0109 operationelt. 4.0.315 pensionerer operationsinput/jobs, actuator, descriptor og apply+Pages-attestationen. Historical exact-D1-jobbet bevares for 4.0.311–4.0.314, men 4.0.315 går eksplicit `ready=true`. Measured-only recovery, defensive trust-/turkvalitetslæsere og alle normale fulde releasegates består.
- Næste sikre rækkefølge er målrettede lokale gates → exact-head sourcegate → merge → frisk normal production med build/validate/releasegate/artifact/Pages faktisk kørt → offentlig 210/673 og prognosekontrol. Grøn topstatus alene er ikke bevis.
- Ingen private data, joblogs, geometri, zoner eller land-/vandpunkter skal indgå.

## Supplerende fagligt modelcheckpoint – DEC-0110/0112 state 6

Den afsluttede 4.0.316-blok ovenfor er autoritativ for den offentlige Candidate G-baseline.

- Offentlig sandhed er 4.0.316/Candidate G. Den lokale 4.0.317-kandidat er `RRS-COASTAL-PROCESS-INTEGRATED-1.1.0`, state `6.0.0`, bounds-v5, med den fastlåste 11-feltsbinding dokumenteret ovenfor. Exact-head, merge, frisk produktion/deploy og offentlig 210/673 desktop-/mobilkontrol udestår. Schema 5 er kun aldrig-offentlig eksakt migrationskilde.
- Last mile bruger en kausal energivægtet bølgeapproach med fire timers halveringstid og en ældre hale, én `FROM`→`TOWARD`-rotation og én 0,85–1-faktor på eksisterende supply. Fysisk levering er fortsat uopløst; DDM er ikke scoreinput, Rainville 2026 er ikke ravkalibrering, og geometri/punkter flyttes ikke.
- V5-migrationen genvægter signeret afledt Candidate G-currentevidens uden rå U/V og kræver 673/common target samt 40 private coherent same-cell WAM-positioner. State 6 skelner direkte inputmissing (`UNAVAILABLE`) fra historikmissing (`HISTORY_INCOMPLETE`) og rangerer altid numerisk score først; `FULL_HISTORY` bryder kun eksakt tie før eksisterende regler.
- Feggesund/`DK-B05-11`: `rr-20260830104132-210` viser 118/118 parent-wave-missing, men de tre aktive part-id'er findes, har `marineCoverage=full`, og Candidate G-current er tilgængelig i begge modes. Frisk integrated produktion skal først bevise de tre deles 118 timer, fordi modellen producerer fra 673 part-level-serier. Kun ved et reelt part-level-hul og dokumenteret umulig korrekt direkte DMI/egnet officiel data må den ejerautoriserede konservative nabozonehypotese for netop denne ene zone vurderes. Den er ikke implementeret/generel fallback; faktisk direct missing er `UNAVAILABLE`.
- State-løs cold replay bruger `bounded-private-48h-history-cold-replay-v3`, bærer de versionsbundne count-/transitionfelter og forbliver `HISTORY_INCOMPLETE` ved 0–48 timer; selv 48/48 (`VERIFIED_CAUSAL_HISTORY_WINDOW`) kræver 288 timers tail closure eller attestert migration/continuation før `FULL_HISTORY`, mens kortere/gappede forløb er `UNKNOWN_HISTORY_INTERVAL`. Candidate G-rollback v3 bruger samme target uden dobbelt credit. Checkpoint-only recovery og point-staging parrer schema-6-state atomisk med en READY Candidate G-companion; serializer-, protected-storage-, cross-part/-target/-generation-, tamper- og privacytests er grønne. Under manuel rollback må kun den eksakte `READY`/`memoryReady` Candidate G-runtime projicere sin egen exact full-history mode-score; `calibrationEligible=false` består. Trip-bounds-persistens og secondary-scoresemantik er lukket lokalt. Same-model-nøddrift er højst 72 timer; cross-model fallback er forbudt.
- DEC-0109/DEC-0111 og morgenhullets aldrig anvendte operation er alene historisk sikkerheds-/trustdokumentation og indgår ikke i 4.0.317-releasegates.
- Fortsæt Sol/Ultra: luk den konkrete offline-evidence-fixture og dokumentationsgates → exact-head PR/merge → frisk fuld produktion/deploy → Feggesund 3 × 118 → offentlig browserkontrol. Rør ikke private payloads, rå U/V, koordinater, geometri eller land-/vandpunkter.

## Historisk P0 – 2026-08-29 D1 grøn; inspect stoppet før descriptor

- Offentlig 4.0.310 er fortsat komplet målt nøddrift; morgenhullet er ikke lukket.
- 4.0.313 er exact-head-valideret/merged som `ff62ba11`; push `33269584236` var no-op, og D1-backend `33269631305`/`99145677813` er helt grøn.
- Read-only inspect `33269849748`/`99146287609` stoppede uden descriptor eller mutation på `ONE_TIME_GAP_AFTER_EVIDENCE_COUNT`.
- 4.0.314 accepterer ét målt afteranker kun for uafhængigt bevist 3-timerskadence og bevarer alle øvrige fail-closed gates. PR #227/exact-head `33272564543`/`99153577550`, merge `d1369d88` og no-op push `33272676071` er grønne.
- Ældre produktion `33271863449`/`99151692515` stoppede før releasegate/Pages på en stale marine-first-test, som ikke var med i PR-sourcegaten. Same-version-branchen `codex/candidate-g-concurrency-contract-4.0.314` retter assertionen og gør testen obligatorisk i `test:workflow-action-contracts`/`validate:source`.
- PR #229/exact-head `33275025105`/`99160126852`, merge `9291250c` og no-op push `33275147023` er grønne. D1 `33275218540`/`99160622956` er helt grøn. Inspect `33275438494`/`99161265720` stoppede derefter i planforseglingen; descriptorupload, build og Pages blev skipped, og ingen mutation skete.
- Hent ikke hele jobloggen eller artifacts. Diagnostikhotfixet gør kun allowlistede `ONE_TIME_GAP_*`-koder synlige som annotation og maskerer alt andet. Fortsæt Sol/Ultra: exact-head/merge/no-op → nyt final-SHA D1 → ny inspect → luk den sanitiserede årsag → CAS-apply → frisk produktion → offentlig 210/673 desktop/mobil.

## Historisk P0 – 2026-08-29 lokal 4.0.313 replay-roll-forward

- Offentlig drift er fortsat 4.0.310 i komplet målt nøddrift; morgenhullet er ikke rekonstrueret.
- 4.0.312: PR #225, exact-head `33266087776`/job `99136292810`, merge `a5ece10d`, korrekt no-op push `33266184326`.
- Backend `33266229687`/`99136669571` fejlede idempotent sync efter tidlige D1/Edge/Worker-led. Failure-roll-forward er ikke readiness.
- Lokal 4.0.313 retter kun 4.0.310-nullblade mod 4.0.311-leafprojektion, migration-only og uden at omskrive row/hash/registry. Strict stored/readback, bounded schema-v1 og safe errors er syntetisk og uafhængigt grønne.
- Næste: full source/RDKS/release/version/geodata, PR exact-head, merge, no-op push, helt grøn exact-main D1-kæde. Først derefter ny inspect/CAS, apply, frisk produktion og offentlig 210/673.
- Genbrug ikke en gammel descriptor efter flyttet main/target. Lad ikke 4.0.314 overhale gate. Fortsæt Sol/Ultra.
- Efter P0 integreres grøn main i DEC-0102-modelworktree; last-mile skal være retningsbestemt på eksisterende bølgehistorik, mens Candidate G forbliver eneste offentlige model indtil samlet release.

## Historisk P0 – 2026-08-29 lokal 4.0.312-roll-forward efter 4.0.311-backendstop

- Offentlig drift er fortsat 4.0.310. Morgenhullet er ikke rekonstrueret i produktion endnu.
- Ejerautoriteten gælder kun incident `RRGAP-2026-08-29-CANDIDATE-G-01`; se DEC-0109. Interpolér kun allerede afledt kystnormal strength mellem eksakte run-/artifactankre. Vejr, bølger, vandstand, rå U/V, koordinater, geometri, punkter og private payloads er forbudt.
- Bevar schema 2.1/trust, calibration/hard-observed false, measured-only fallback, tripflags, inspect/apply/rollback/cleanup og alle normale releasegates.
- 4.0.311-head `4c4699fe` bestod PR #224 exact-head `33263734108`/job `99129959870` og blev merged som `7c168b00`. Push `33263858078` var korrekt no-op uden build/artifact/Pages.
- Backend `33263892151`/job `99130384780` modtog HTTP 201 for én atomisk CHECK-transaktion, men stoppede bagefter på en formatteringsfølsom katalogverifier. CHECK'en er med høj sandsynlighed fuldt committed/valideret/kommenteret; eneste alternativ er fuld rollback. `VALIDATE` kan have scannet rækker internt, men runneren hentede/loggede ingen observationspayload, og der skete ingen rækkemutation.
- Kæden nåede ikke D1-prepare/capacity, Edge-predeploy, maintenance, Worker, sync, mode/reconcile, vejr, artifact eller Pages. Storage-intent-/lease-/roll-forward-kontrakten er derfor sourcebevis, ikke livebevis.
- Lokal branch `codex/candidate-g-constraint-verifier-4.0.312` bruger nu balanceret, deparser-tolerant exact-JSONPath-verifikation. Positiv deparserform samt reordered, duplicate og ambiguous negatives er målrettet grønne.
- Fuld lokal 4.0.312-source-/RDKS-/håndbogs-/versions-/releasegate og separat geodatabevis var grønne. PR #225/exact-head `33266087776`, merge `a5ece10d` og no-op push `33266184326` lukkede dette historiske trin.
- Den efterfølgende `[d1]`-backend `33266229687` passerede verifier/D1/Edge/Worker, men fejlede migrationssynken og åbnede ikke inspect/apply eller Pages. Den operative fortsættelse er afløst af det aktuelle 4.0.314-handoff øverst.
- Efter produktionsverificeret recovery hentes nyeste `main` ind i den separate DEC-0102-modelworktree. Dens næste beslutningsnummer skal ligge efter DEC-0109, og den må ikke gøre interpolation til generel missingregel. Modellen skal selv levere en målt-only atomisk 210/673-nødstate med eksakt model/state/hash, højst 72 timer og kortere forecastudløb, DA/DE/EN-advarsel, non-calibration trips og automatisk frisk primary.
- Åbent P2: schema-v2/`calibration_eligible` er ikke serverbevist mod signeret public manifest. Aktivér ingen global koefficientlæring og kald ikke feltet empirisk evidens, før en særskilt server-side snapshotbinding findes.

Anbefalet model/indsats: GPT-5.6 Sol/Ultra.

## Nyt øverste checkpoint – 4.0.310 hurtigere ekstern overtagelse

- 4.0.309 er merged/produktionsverificeret via PR #221, exact-head `33244011544`, merge `aba3d669`, produktion `33244062982` og offentligt `rr-20260829085521-210`.
- Ét aktivt cron-job, id `8348098`, gav manuel 204 samt automatiske no-op-runs `33245204517`/`33245798817`. Intet native produktionsschedule fandtes omkring 09:29 UTC.
- 09:49-vagt `33246369618` bestilte den første virkelige redningsproduktion `33246376992`; den bestod 09:00 UTC, målrettet Copernicus, 210/673, fulde gates og Pages og publicerede komplet `rr-20260829095610-210`. Cirka en time mellem produktionsstarterne var korrekt efter 45-minuttersreglen, men for langsomt som vedvarende erstatning for manglende native schedules.
- 4.0.310 sænker kun `external_watchdog=true` til mere end 15 minutters dual staleness. Intern native vagt beholder 45 minutter; active/recent/manifest/concurrency og alle fulde data-/releasegates er uændrede.
- PR #222/exact-head `33247789054`, merge `792648c3`, post-merge-produktion `33247839121` og offentlig `rr-20260829103233-210` er grønne. Automatisk run `33248692042` bestod den mergede 15-minuttersgren og bestilte normal produktion `33248699516`.
- Ingen kunstig/interpoleret historik, model-, state-, recovery-, geometri- eller punktændring i 4.0.310. Se DEC-0108.

## Nyt øverste checkpoint – produktionslukket 4.0.306 og to isolerede Codex-worktrees

- Offentlig baseline er produktionsverificeret 4.0.306/Candidate G fra runtimecommit `8ebbd4e7aaafee2a4a840749f35398355fe3fb03`. PR #217/exact-head `33212348031`, produktion `33212435923`, Pages `6148930627` og offentlig desktop-/390 px-kontrol er grønne. Frisk primary modnes ved 0/673 READY under komplet auditeret 673/673-recovery uden dækningshul. Broen bevarede cirka 36/48 timer; forventet primary-READY cirka 2026-08-29T09:00:00Z har omkring 16,5 timers margin til recoverygrænsen 2026-08-30T01:34:48Z. Se DEC-0104.
- **Modelsporet** bygger én ny hel RavScore-model ende til ende. Det skal starte analytisk med en komplet bevaringsmatrix, genbruge Candidate G's veldokumenterede dele og kun erstatte noget med dokumenteret grund. Det er ikke fragmentudgivelser og ikke en ekstra offentlig shadowmodel.
- **Smårettelsessporet** modtager andre ejeropgaver og kan merge dem løbende til `main`, men må ikke ændre Candidate G, RavScore, DMI-/strøm-/bølge-/statekæden eller modelbeslutninger.
- Modelsporet følger `origin/main`, integrerer alle grønne smårettelser før slutvalidering og udgiver først derefter den samlede model gennem normal exact-head-/produktions-/offentlig kæde.
- Plug-and-play er en hård acceptgate: modelsporet skal selv tilpasse kandidaten til RavRadars eksisterende input, state, 210/673-runtime, UI/admin, privacy, cache/recovery, forklaringer og releasegates. Der må ikke afleveres et efterfølgende RavRadar-ombygningsbehov.
- Brug en eksplicit producent-/forbrugermatrix, som mindst dækker DA/DE/EN, lokal/Edge **Spørg RavRadar**, evidens/faste svar, ranglister/tid/detaljer, konto/ture/observationer, admin/ekspert, begge håndbøger, payloads/hashes, central profil, workflows, audits og offentlig browser.
- Ekspertens returstrømsspørgsmål, den faktiske 4.0.306/Candidate G-kode, bevaringskrav, konkrete forbedringspunkter, valideringsgrænser og autonom autoritet står i DEC-0102 og `docs/research/RAVSCORE_NEXT_GENERATION_WORK_BASIS_2026-08-28.md`.
- Brugerfund er ikke en forudsætning. Påstå ikke empirisk bedre fundnøjagtighed uden repræsentative fund/nulfund.
- Rør aldrig rod-worktree, `.recovery-*`, private data, geometri, koordinater eller land-/vandpunkter. Modelsporet fortsætter med Sol/Ultra til forskning, model-, arkitektur- og slutvalideringsarbejde.

## Produktionsverificeret checkpoint – 4.0.305 fjerner rasterflisegitter

- Det synlige gitter er reproduceret som Leaflet-rasterflisesømme ved brøk-pixelplacering, ikke som zoner, geometri eller vejrdata.
- Den valgte løsning rammer kun 256 px-fliser i `leaflet-tile-pane`: 0,5 px overlap og normal blanding. Et overlap med Leaflets additive blanding blev visuelt afvist før commit.
- Standard- og satellitkort, zoom og 211 lokale zonepaths er kontrolleret uden kort-/tilefejl. Målrettede tests er grønne.
- PR #212/exact-head `33188425818`, merge `06ca96e9`, produktion `33190412990`, build `98914205954` og Pages `98916104285` er grønne. Offentlig 4.0.305 viser 210 zoner, fem Bedste områder, fem prognosedage og ingen flisesømme før/efter zoom; satellit og Om-retur er bevaret.
- Rør ikke Leaflet-JavaScript, tileadresser, bounds, vektorlag, zoner, geometri, pile, labels, klikflader eller Sibirien-kandidaten. Se DEC-0101.

## Produktionsverificeret checkpoint – 4.0.304 fælles RavRadar-kontakt

- Kontaktknappen under **Om RavRadar** er ændret til **Skriv til RavRadar** med `mailto:RavRadar@outlook.dk`.
- Tysk og engelsk bruger tilsvarende RavRadar-branding og samme adresse. Kontrakttesten låser alle tre sprog og afviser de tidligere personlige kontaktværdier.
- Kun kontakttekst/destination samt versions- og projekthukommelse ændres. Ingen faglig model, vejr-, score-, bruger- eller geodata ændres; Sibirien forbliver privat staged.
- PR #211/exact-head `33183709302`, merge `e5eed868`, produktion `33183809909`, build `98891543382` og Pages `98893788414` er grønne. Offentlig 4.0.304, 210 + 5 + 5 og DA/DE/EN-kontaktlink er verificeret. Se DEC-0100.

## Øverste checkpoint – produktions- og fysisk verificeret 4.0.303

- Arbejd kun i den isolerede Codex-worktree. Rør ikke rod-worktree, `.recovery-*`, private data, geometri eller punkter.
- 4.0.301 virkede fysisk, men første iPhone-load var cirka 14 sekunder. 4.0.302's parallelle start bestod PR #207/produktion på desktop, men blev fysisk afvist med cirka 30 sekunder koldt, 7–8 sekunder varmt og langsom første Om-navigation.
- PR #208's exact-head rollback var grøn og merged som `e155f42e`; produktion `33177494546` stoppede fail-closed på `INVALID_SWITCH_VERSION`, så offentlig side er fortsat 4.0.302.
- 4.0.303 gendanner sekventiel kort → manifest → conditions, undgår kun reload ved første service-worker-claim og forhåndshenter ikke kortfil/store Om-billeder under installation. DEC-0098-returen er bevaret. Se DEC-0099.
- PR #209/exact-head `33178940206`, merge `19886fc0`, produktion `33179036658`, build `98875217073` og Pages `98877901727` er grønne. Offentlig 210 + 5 × 5 og Om-retur består; varm isoleret desktopstart var cirka 1,6 sekunder.
- Ejeren bekræftede korrekt 4.0.303-version, fungerende Om-retur og 4–5 sekunders både kold og varm start på fysisk iPhone Safari. Problemet er lukket; kun docs-only exact-head/merge af denne lukning mangler.
- Sibirien forbliver privat staged/uaktiveret; ingen kunstig historik eller konkret punktændring.

## Øverste checkpoint – 4.0.301 rigtig historikretur

- 4.0.300 er fuldt CI-/produktionsgrøn, men fysisk afvist på bekræftet version 4.0.300 i iPhone Safari.
- 4.0.292's tidligere bevis brugte browsertilbage, ikke det interne link. 4.0.301 lader derfor Om-knappen kalde `history.back()` ved verificeret samme-origin root-referrer og bevarer `./` som direkte fallback.
- Offentlig referrerforudsætning og målrettede historik-/resume-/startup-/ydelsestests er grønne. Fortsæt med sourcegate, exact-head, produktion, offentlig kontrol og fysisk Safari/Hjemmeskærm. Se DEC-0098.
- Rør ikke rod-worktree, `.recovery-*`, private data, geometri eller punkter. Sibirien forbliver privat staged.

## Øverste checkpoint – 4.0.300 mobilretur

- Start fra branch `codex/restore-mobile-resume-4.0.300` i den isolerede Codex-worktree. Rør ikke rod-worktree, `.recovery-*`, private data, geometri eller punkter.
- 4.0.299 er CI-/produktionsgrøn, men fysisk rød på iPhone. Offentlig desktop viste komplet cirka 1,36 sekunders intern Om-retur; fysisk Safari viste ingen kort/prognoser før lås/oplåsning.
- 4.0.300 gendanner den eksakte 4.0.292-returretning: statisk `./`, ingen nonce/klikoverstyring, ingen mobil hard reload/watchdog og idempotent redraw ved `pageshow.persisted`. Lazy-load-ydelsen fra 4.0.295/296 er bevaret.
- Målrettede tests er grønne. Fortsæt med fuld RDKS/sourcegate, exact-head, merge, fuld produktion/Pages, offentlig 210 + 5 × 5 og fysisk iPhone Safari/Hjemmeskærm. Ingen påstand om fysisk løsning før ejerbevis. Se DEC-0097.

## Kildekandidat 4.0.299 – én hurtig Om-retur

- 4.0.298 blev udgivet gennem PR #203/exact-head `33164570642`, merge `077b6fb9`, produktion `33164639052`, build `98827073610` og Pages `98829261896`, men fysisk iPhone-test var rød.
- Offentlig Om-retur var faktisk komplet efter ét sekund med 210 zonelinjer og 5 + 5 + 5, men værnet så nul linjer i den forkerte standard-overlay-pane, genindlæste ved cirka seks sekunder og endte `failed`.
- 4.0.299 beholder den unikke versions-/noncebaserede navigation, men fjerner hele det ekstra synkrone head-værn, timeren, service-worker-cacheposten og den automatiske reload. Den eksisterende hurtige appopstart skal kun køre én gang.
- Målrettet test og fuld lokal source-/releasegate er grønne. Kør PR exact-head, frisk produktion og offentlig cirka ét-sekundsretur uden senere URL-skift. Få derefter ejeren til at teste Safari først og Hjemmeskærm bagefter; kald intet løst før begge er grønne. Se DEC-0096.
- Rør ikke Sibirien, koordinater, geometri, private data eller Candidate G-state. Den private staged punktrevision kræver fortsat separat modning og ejer-go.

## Produktionsverificeret 4.0.296 – minimal Candidate G-startpakke

- 4.0.295 bestod PR #198/exact-head `33153155088`, merge `6c0602d7`, produktion `33153271907`, build `98790063641` og Pages `98794513908`. Den fjernede 90–132 MB-detaljehentningen fra normal opstart og gav cirka 3,67 sekunders varm offentlig start.
- Offentlig cold-måling fandt dog, at den aktive READY-nødvisnings startup stadig var 3.562.253 byte/23,36 sekunder mod primærens 694.288 byte/4,09 sekunder. Resten er fulde aktuelle scoreposter og komplette vinderobjekter, ikke HTML eller Spørg RavRadar.
- 4.0.296 beholder kun score/status, dækningsfelter, tre komponenttal, kompakt vejr, minimale labels og det lille `flowPoints`-bevis i startup. Detaljer og state forbliver i den behovshentede fil; recovery ændrer kun startup-hash.
- PR #199/exact-head `33156988524` var grøn og blev merged som `bdd23cc0`. Produktion `33157055276`/build `98802272478` stoppede fail-closed før deploy, fordi den gamle zoomtest fangede manglende DMI-pilproveniens. Korrektionen bevarer kun `current`, `wind` og `sources` under `flowPoints`; målrettet score-/rangeringsparitet, uændret detalje/hash, piltesten og 591.295 → 29.670 byte er grøn.
- PR #200 bestod exact-head `33158782786`/job `98807893242` på `5dad21c6`, blev merged som `f1cd5868` og gennemførte grøn produktion `33158840203`, build `98808126976` og Pages `98814032394`.
- Offentlig startpakke er 399.801 byte og tog 1,37 sekunder ved no-cache HTTP-kontrol; varm komplet browservisning tog cirka 1,31 sekunder. Version, farvet kort, fem aktuelle områder og fem resultater på alle fem prognosedage er grønne. Candidate G er stadig tydeligt i sund recovery, mens ægte 48-timersstate modnes. Se DEC-0092/0093.
- Sibirien har en ny privat staged punktrevision fra ejeren. Læs eller publicér ikke koordinater, aktivér intet, og opfind ingen historik. Lad samme DMI-grid-, 96-timers- og 48-timerskrav modne; en senere promotion kræver særskilt ejer-go.
- Rod-worktree, `.recovery-*`, private data og faktisk geometri må ikke røres. Geodatafilerne ændrer kun topversionen 4.0.295 → 4.0.296.

## Driftsverificeret 2026-08-28 – Cloudflare-tokenrotation lukket

- Fra ren 4.0.294-baseline på `origin/main` `989211265d0f338027452b5935d5def16dff3108` blev et nyt mindst-muligt Workers AI-token oprettet med Read + Edit på den eksakte konto. Credentialværdien blev aldrig vist, læst ud eller skrevet i output/repository.
- Kun Supabase-secret `CLOUDFLARE_WORKERS_AI_TOKEN` blev erstattet gennem dashboardets secret-kanal; kontrakten krævede intet Edge-redeploy.
- Den nye vej bestod DA/DE/EN-fjernsvar, fast rouladeafvisning, tilladt CORS, fremmed Origin `403`, seks `200` og `429` på syvende minutkald samt offentlig lokal fallback. Efter særskilt ejer-go blev alle fire gamle **Workers AI**-tokens tilbagekaldt.
- Første post-revoke-probe ramte fail-closed `503 RATE_LIMIT_UNAVAILABLE` før provider; ét afgrænset retry bestod `200` og beviste det nye token efter tilbagekaldelsen. Ingen kode, version, artifact, privat data, geometri eller land-/vandpunkt blev ændret.
- Målrettede dokumentations-, håndbogs-, privacy-, Edge- og fallbacktests samt fuld lokal `validate:source`/releasegate er grønne på Sol/Ekstra høj. Næste trin er den korte docs-only PR, exact-head-kildegate og mergekontrol. Bevar den eksisterende Candidate G-overvågning uden dublet eller kunstig historik.

## Produktionsverificeret 4.0.294 – naturlig formulering om ravets dannelse

- 4.0.293 bestod PR #194 exact-head `33130341973`, merge `25722abc`, produktion `33130425262`, build `98718434389` og Pages `98721765768`.
- Offentlig kort-, rangliste-, femdøgns- og konsolkontrol var grøn, men **Hvordan opstod rav?** blev fejlagtigt afvist trods eksisterende oprindelsesviden.
- 4.0.294 genkender almindelige dannelsesformuleringer på DA/DE/EN og låser dem med tre ekstra lokale nul-netværkscases. Ingen svar-, Edge-, score-, vejr-, data- eller geokontrakt ændres.
- Målrettede tests samt fuld lokal sourcegate/releasegate er grønne. PR #195/exact-head `33131976433`, head `80866ba8`, merge `a3eb4ac5`, produktion `33132053882`, build `98723615102`, Pages `98725082313` og privat shadow `33132055561` er grønne.
- Offentlig 4.0.294 viser farvet kort, fem aktuelle områder og fem prognosedage. De tre naturlige DA/DE/EN-formuleringer giver lokale oprindelsessvar uden kvote; kvoteteksten er korrekt på alle tre sprog.
- Den 23-fakta Edge-kilde er live. DA/DE/EN, rouladeafvisning, CORS/origin og reel 6/minut-browsergrænse med lokal fallback er verificeret. Ingen assistentvej kan ændre score-, vejr-, bruger- eller geodata.
- Cloudflare quick-start-tokenet er efterfølgende roteret og liveverificeret som beskrevet ovenfor. Candidate G-nøddriften modnes fortsat naturligt og må ikke fremskyndes med kunstig historik.

## 4.0.293 – klogere Spørg RavRadar uden kvoteafhængighed

- 17 almindelige ravemner har faste grundbogsbaserede DA/DE/EN-svar og bruger ingen AI-kvote eller netværk.
- Åbne specialspørgsmål bruger fortsat GPT-OSS, hvis kvoten og Edge er tilgængelig. Dens godkendte viden er udvidet fra 10 til 23 evidens-ID'er.
- 51 lokale og 66 samlede balancerede evalcases samt fuld lokal sourcegate/releasegate, exact-head og produktion er grønne. Den første offentlige kontrol udløste den afgrænsede 4.0.294-formuleringsrettelse ovenfor.
- Fast afvisning, server-only credential, dataminimering, CORS, rate limits, timeout, gratis kvoteloft, fallback og rollback er uændrede.
- Begge assistentveje er read-only. Rør ikke RavScore, vejr, prognoser, sortering, konto-/turdata, privatliv, geometri eller land-/vandpunkter. Se DEC-0091.

## Produktionsverificeret 4.0.292 – staged land-/vandpunkter uden driftsudfald

- Ingen faktisk geometri eller land-/vandpunkt er flyttet. Sibirien er kun den kommende bruger-case.
- Punktredigering gemmes som kandidat og påvirker ikke offentlig sampling. Privat DMI-cache kræver eksakt fælles U/V-grid ≤5 km, 96 timers fuld horisont og 48 timers Candidate G-memory.
- READY kræver en særskilt ejeraktivering. Den eksakte runtime bygges med varm DMI/state, fulde gates kører, og central promotion sker derefter med version-CAS. Gammel active override bevares til rollback.
- Senest verificeret hel-datasæt-fallback må dække 0/673 global warmup eller højst seks lokale warmups; intet blandet datasæt.
- Målrettede tests, samlet kildevalidering og fuld produktion er grønne. PR #192 bestod exact-head `33127353135`, blev merged som `d22d0867` og gennemførte produktion `33127437790`, build `98708851478` samt Pages `98711255270`. Se DEC-0089/0090.
- PR #189/exact-head `33124945636` blev merged som `8b3668b7`; første produktion `33125043019` stoppede før DMI/deploy på en testfixture, der arvede workflowets produktionstime. Den afgrænsede hotfix tilføjer en eksplicit referenceparameter og miljøisoleret regression; den samlede opfølgning er lukket gennem PR #190–#192.
- PR #190/exact-head `33125466599` blev merged som `6906ee5a`. Produktion `33125529746` nåede gennem frisk DMI/Copernicus/runtime, men fuld validate stoppede på en gammel scheduler-regex, der ikke kendte private punktkandidater. Den rettede kontrakt kræver nu eksplicit, at `privateStage` holdes ude af offentlig nævner, og kører også på PR-head.
- PR #191/exact-head `33126975042` blev merged som `01c443b8`. Produktion `33127032179` stoppede før DMI/deploy, fordi den fremrykkede scheduleradfærdstest krævede `requests` før produktionsworkflowets afhængighedsinstallation. Testen stubber nu kun de ubrugte netværksklasser og importerer fortsat den virkelige schedulerkode.
- Den offentlige stagingstatus er saniteret og tom: ingen kandidat, ingen koordinater/U/V og ingen automatisk aktivering. Promotionen i den grønne produktionskørsel var derfor en kontrolleret no-op.

## Produktionsverificeret 4.0.292 – mobil retur genopretter forsiden

- Safari/WebKit kan gendanne forsiden fra back/forward-cache, mens tidligere asynkron opstart er halvfærdig eller afbrudt. Den manglende livscyklushåndtering passer til ejerens samlede symptom: kort, **Bedste områder** og **5-dages RavRadar** mangler efter retur fra **Om RavRadar**.
- Et bootstrapværn genindlæser ved retur før app-import. Appens resumecontroller genindlæser ved ufuldstændig/afbrudt dataopstart og genoptegner ellers Leaflet, zonefarver, rangliste, valgt zone og femdøgnsvisning idempotent.
- Målrettede kontrakter, exact-head, produktion og offentlig 390 × 844-returkontrol er grønne. Efter **Om RavRadar** → tilbage er kortet synligt med alle 210 farvede zoner, og både **Bedste områder** og **5-dages RavRadar** viser fem færdige resultater uden konsolfejl/advarsler. Fysisk iPhone-efterkontrol hos ejeren er stadig ønskelig.
- Live primær `rr-20260827235556-210` er fortsat 0/673 `READY` med 673 warmups. Den komplette fallback `rr-20260827013448-210` leverer derfor fortsat atomisk og tydeligt markeret som ikke aktuel, indtil den virkelige 48-timers Candidate G-state er moden.
- Næste godkendte spor efter lukning er konkret evalscope for en markant bredere lokal DA/DE/EN-ravvidensbase. Den er read-only og må aldrig ændre prognoser, RavScore eller andre runtime-data.
- Rør ikke rod-worktree, `.recovery-*`, private data, geometri eller land-/vandpunkter. Se DEC-0089.

## Produktionsverificeret 4.0.291 – offentlig gratis Spørg RavRadar

- Ejeren gav det særskilte aktiverings-go. Offentlig 4.0.291 viser en rolig DA/DE/EN-tekst om den begrænsede daglige AI-kvote og præciserer, at den kun gælder Spørg RavRadar uden indflydelse på kort, prognoser, RavScore eller øvrige funktioner.
- Cloudflare-kontoen er verificeret som Workers Free / $0 med 10.000 neuroner pr. døgn og fejl efter loftet. Betalt overflow er forbudt.
- Offentlig `ravAssistantRemoteEnabled=true` er udgivet; `false` er rollback. Domænegate, lokale Candidate G-dataintents, dataminimering, CORS, rate limits, syv sekunders timeout og lokal fallback er liveverificeret.
- PR #187/exact-head `33114501539`, merge `c6c9998c`, produktion `33114598957`, build `98665953481`, Pages `98668455689` og offentlig desktop-/390 px-kontrol er grønne. Vejrvisningen forbliver ærligt i bounded nøddrift, mens frisk Candidate G modnes.
- Næste rækkefølge er mobil returfejlen for kort/**Bedste områder**/**5-dages RavRadar**, derefter det evaldrevne scope for en væsentligt klogere lokal assistent. Rør ikke rod-worktree, `.recovery-*`, private data, geometri eller land-/vandpunkter. Se DEC-0088.

## Produktionsverificeret 4.0.290 – komplet offentlig DA/DE/EN og deaktiveret, hærdet GPT-OSS Edge

- Hele den offentlige sprogflade er implementeret centralt: dansk standard/fallback, stabile CSS-flag+sprognavne, lokalt valg og stabile parameteriserede nøgler for hovedside, prognoser, områdepanel, konto/login, ture, lokal assistent, **Om RavRadar** og alle 12 afsnit i **Grundbog i ravjagt**.
- Admin-, ekspert- og interne flader forbliver danske. Kandidaten ændrer ingen faglig model, vejr-, score-, sorterings-, konto-/tur-, privatlivs- eller geografidata.
- Fast emnegate afviser bl.a. roulade før provider; bedste sted/tid/score forbliver deterministisk Candidate G. Ekstern AI er fortsat slukket.
- Ejeren har valgt Cloudflare `@cf/openai/gpt-oss-20b`; Gemini Flash-Lite 27/27 er kun kvalitetsreference under de aktuelle EØS-vilkår. GLM/Gemma blev stoppet efter ikke-evaluerbare smoke-svar. GPT-OSS bestod 1/1 smoke, 4/4 mål-gate og 25/26 evaluerbare fuldtests med median/p95 1.406/2.933 ms og estimeret mindst 623,63 neuroner.
- Brugbare Cloudflare-svar krævede `json_object`, kontrolleret rekursiv svarudtrækning, fem faste outputfelter, 800 completion-tokens/low reasoning, konkrete disposition-/evidenseksempler og en smoke → mål-gate → fuld-eval-rækkefølge. Edge skal fejle lukket på længdeafvigelsen og timeoutcasen.
- Den hærdede GPT-OSS Edge-kandidat er implementeret med server-secrets, domænegate, dataminimering, CORS, 6/minut, 40/time og 300/dag, syv sekunders timeout, eksakt JSON/evidensvalidering og lokal fallback. `ravAssistantRemoteEnabled=false` er uændret; deploy/aktivering er ikke godkendt.
- Målrettede tests, lokal desktop-/390 px-browserkontrol for alle tre offentlige sider og sprog samt fuld lokal `validate:source`/releasegate er grønne.
- PR #183/exact-head `33104575862` blev merged som `4d6e0f6`. Produktion `33104888405` og efter PR #184 produktion `33106063695` stoppede sikkert før deploy på tre gamle tests, som stadig søgte flyttede danske tekster direkte i `app.js`. De snævre opfølgninger binder nu runtime til stabile i18n-nøgler og tester dansk fallback separat.
- PR #185 bestod exact-head `33107136733` og blev merged som `50c1fc5`. Produktion `33107232593`, build `98640417925` og Pages `98643230518` er grønne gennem frisk vejr, fuld validering, releasegate, artifact og deploy.
- Offentlig 4.0.290-browserkontrol består DA/DE/EN og husket sprog på forside, Om-side og Grundbog. **Bedste områder** og femdøgnsvisningen har fem færdige rækker. Den markerede Candidate G-fallback leverer fortsat, mens den friske primærserie modnes; systemet er derfor funktionelt, men endnu ikke helt ude af nødstatus. Se DEC-0086/0087 og `docs/research/RAV_ASSISTANT_CLOUDFLARE_GEMINI_COMPARISON_2026-08-27.md`.

## Afsluttet P0 – produktionsverificeret 4.0.289

- Ny logevidens viser DMI-success med 622/673 i fejlkørsel `33051959643`; den korrigerbare systemfejl var et fremtidigt 09 UTC-valg fra en 07:58-run efterfulgt af en transient Copernicus-timeout.
- Kandidaten forbyder fremtidig produktionstime, bruger to procesisolerede Copernicus-forsøg og bevarer et generisk hash-/modelbundet checkpoint med præcis 673 kompakte Candidate G-states mellem runs.
- Komplet fallback er højst 72 timer og aldrig efter egen prognosehorisont. En fejlet, timeoutet eller før-start-fejlet schedule-run får ét retry; watchdoget dispatch'er først efter 45 minutters verificeret stilhed og ingen aktiv produktion. Total GitHub-schedulerstilhed er fortsat en ekstern overvågningsrisiko.
- PR #181/exact-head `33076656266`, merge `6c8acf08`, produktion `33076772432`, build `98532962269` og Pages `98538133039` er grønne. Liveauditten består 4.0.289, 210 aktive zoner, 673 dele, 420 aktuelle og 2.100 prognosevisninger uden fejl.
- Primær `rr-20260827133918-210` modner med 0/673 `READY`; komplet fallback `rr-20260827013448-210` leverer fortsat med tydelig aktualitetsadvarsel. P1 kan genoptages efter konkret ejerscope. Se DEC-0085.
- Rod-worktree, `.recovery-*`, geometri, land-/vandpunkter og private data er urørte.

## Tidligere afsluttet P0 – produktionsverificeret automatisk Candidate G-genopretning i 4.0.288

- Offentlig 4.0.287-baseline `rr-20260827013448-210` er komplet ved 00 UTC, men browseren kasserer den efter otte timer. Derfor blev zoner sorte, og **Bedste områder** samt **5-dages RavRadar** tomme.
- Fejlkørsel `33059522170` nåede 09 UTC med et reelt nitimers hul. Candidate G afviste korrekt alle 673 states; det fejlede checkpoint blev ikke deployet, så næste run kunne ikke fortsætte fra suffixen.
- Kandidaten publicerer kun det seneste hele, auditerede dataset som tydeligt markeret nødvisning i højst 48 timer. Den nye warmup-runtime ligger separat, og der skiftes først atomisk ved 673/673 `READY` og grøn faktisk runtimeaudit.
- Et hul over tre timer genstarter fra reelle prøver efter hullet. Ingen interpolation, backfill eller opdigtet strøm er tilladt. Et hul på højst tre timer følger den eksisterende native-kadencekontrakt.
- Engangsrecoveryen er låst til det kendte 09-checkpoint og højst tre timers genoptagelse. Den faktiske 673-deles prøve kopierede ingen vejr-, score- eller rå vektordata.
- Lokal releasegate og separate kode-/artifactprøver er grønne, og geodatakontrollen viser kun topversionen 4.0.287 → 4.0.288.
- PR #176/exact-head `33066322196` er merged som `16ad8300`. Produktion `33066416034` beviste den eksakte 09-recovery, men stoppede før DMI/deploy ved korrekt fallbackaudit, fordi checkpointet var indlæst før fallbackkopien. Opfølgningen flytter kun checkpointblokken efter den sunde 00-fallbackstage og bevarer kildegaten før begge.
- PR #178/exact-head `33066897710` er merged som `5f9ee093`. Produktion `33066980965` nåede gennem fallbackstage, checkpoint, DMI/Copernicus og frisk runtime, men den sidste audit havde et modstridende krav om rå kandidatscore under national fail-closed warmup. Artifact `RavRadar-support-3635` består den snævert korrigerede audit på 210/673 med 673 accepterede states, nul replaymismatch og 0/673 `READY`; den efterfølgende lokale publiceringsprøve aktiverede det komplette 00-fallbackdataset.
- PR #179/exact-head `33069307854`, merge `653a9811` og produktion `33069384084` er grønne gennem build `98507461295` og Pages `98512392768`. Live primær `rr-20260827121030-210` er 0/673 `READY`, mens fallback `rr-20260827013448-210` er hashverificeret 210/673/1.346 og højst 48 timer gammel.
- Offentlig browserkontrol viser 210 farvede zoner uden sorte zoner, fem **Bedste områder**, fem færdigberegnede prognosedage, fungerende zonedetaljer, tydelig nødtekst og nul konsolfejl/advarsler. P0 er lukket; P1 kan genoptages efter konkret ejerscope. Se DEC-0084.

## Aktiv afgrænset leverance – gratis Spørg RavRadar-evals

- DEC-0083 låser ejerkravet: nul betaling, Free Tier uden billing eller betalt overflow, ravrelevant domæne og lokal fallback ved kvote-/providerfejl.
- Den nuværende Edge er auditeret, men ikke ændret eller aktiveret. Dens mangler er almindelig emneafvisning, DA/DE/EN, struktureret output og deterministisk routing før fjernmodel.
- Den versionsbundne `rav-assistant-public-v1`-videnspakke og 45 balancerede DA/DE/EN-cases er oprettet. Offline self-test er grøn og adskiller fast afvisning, lokal deterministisk routing og remote-kandidat.
- Gemini-liveevalen er nu historisk reference: `gemini-3.7-flash` gav fem 12/30-sekunders-timeouts, mens `gemini-3.5-flash-lite`/low bestod 27/27 med median/p95 1.329/1.896 ms. DEC-0087 erstatter Gemini-produktionsvalget på grund af de aktuelle EØS-vilkår.
- Ejeren vælger GPT-OSS 20B til næste, fortsat deaktiverede implementeringskandidat. Næste trin er providerintegration i den eksisterende Edge med server-side credential, struktureret validering, CORS/rate limit/timeout, lokal fallback og rollback.
- Spørg RavRadars versionsbundne viden/evalgrundlag forbliver 4.0.287 og local-only, indtil det afgrænsede P1-scope bekræftes; den offentlige app er produktionsverificeret i 4.0.288. Beskyttet rod-worktree, `.recovery-*`, geometri, land-/vandpunkter og private data er urørte.

## Nyt planlagt P1-spor – flersproget UI og Spørg RavRadar

- `docs/ai/AI_ROADMAP.md` registrerer nu den ejer-godkendte plan for én central dansk/tysk/engelsk offentlig brugerflade og en separat modernisering af **Spørg RavRadar**. Dette er dokumentation og scope, ikke implementeret produktadfærd.
- Dansk er standard. Sprogvælgeren skal vise flag og sprognavne øverst og huske valget lokalt. Tekster styres gennem stabile nøgler med parametre og sikker dansk fallback; der må ikke vedligeholdes tre sidekopier.
- Første UI-scope er hovedside, aktuelle og femdøgnsprognoser, områdevindue, konto, login og turformularer: cirka 4–8 aktive timer. Komplet offentligt scope tilføjer **Om RavRadar**, hele **Grundbog i ravjagt** og **Spørg RavRadar**: cirka 8–16 aktive timer samlet.
- Admin-, ekspert- og interne udviklerflader forbliver danske. Score, vejr, sortering, bruger-/turdata, privatliv, geometri og land-/vandpunkter må ikke ændres som følge af oversættelsen.
- Assistenten skal først auditeres mod den aktuelle Candidate G-viden og evalueres reproducerbart på dansk, tysk og engelsk. Sammenlign aktuelle modeller på faglig korrekthed, sikkerhed, privatliv, latenstid, pris, rate limits og drift; vælg ikke den nuværende model alene af historiske grunde.
- Implementationen skal fortsat bruge den hærdede server-side Edge-gateway uden browsercredential og bevare sikker lokal fallback, CORS, rate limiting, grænser, rollback og fail-safe adfærd.
- Start næste opgave fra ren `main` efter dokumentations-PR'en. Læs AGENTS.md og hele den obligatoriske startkæde før analyse. Brug Sol/Høj til assistentarkitektur/evals/modelvalg og Sol/Ekstra høj til tværgående slutvalidering.
- Rod-worktree, `.recovery-*`, geometri, land-/vandpunkter og private data er fortsat beskyttede og må ikke berøres.

## Produktionsverificeret 4.0.287 – lagerarkitekturens udgangspunkt

- Den færdige lagerarkitektur er Supabase Auth/Edge og ti EU-låste Cloudflare D1-shards; rå ID, mail, navn, JWT, GPS og rute forlader ikke Supabase-grænsen.
- Historisk 4.0.287-kontrakt var grøn for service-HMAC, pseudonymisering, idempotens, turlog, ejer-sletning, pre/post-cutover-migration, kapacitetskontrol og daværende eksplicit Supabase-rollback. Rollbackdelen er afløst af det aktuelle 4.0.314-roll-forward-handoff øverst, mens trust-/tripprotokollens kompatibilitetsgrænse forbliver 4.0.311.
- Infrastruktur-PR #162/#163, dedikeret Cloudflare-konto, mindst-mulige tokens, krypterede GitHub-secrets og rollback-Edge-deploy `33014772035` er grønne. Værdier og private ture blev ikke vist eller logget. Cloudflare-token er uden udløb; det installerede Supabase-PAT har udløb 25. august 2027, men må efter den aktuelle behovsstyrede politik nedenfor udløbe uden fornyelse.
- PR #164/exact-head `33019055639` blev merged som `e9cd20ee`. Første D1-run `33019198166` oprettede ti EU-shards og deployede Workeren, men stoppede sikkert før migration/Edge på den korte health-udbredelsesforsinkelse.
- PR #166 bestod exact-head `33019805663` og blev merged som `2d12c085`. Cutover `33019868542` bestod privat Worker-grænse, pre-/post-migration, D1-Edge og ikke-skrivende CORS/login/feltkontrol; fire kilderækker blev migreret og genkørslen var idempotent.
- Produktion `33019856228` og Pages-job `98351206091` udgav offentlig `rr-20260826224651-210` med 210/210 aktive zoner, befolket **Bedste områder**, 210/673/420/2.100 og nul fejl. Read-only monitor `33021364240` viste ti shards og 0 % lagerforbrug uden turlæsning.
- Supabase-PAT-rotationen blev historisk ende-til-ende-verificeret i `33024408547`; først derefter blev de to gamle PAT'er tilbagekaldt. Cloudflare-audit `33024621109` bestod efter **No expiration**-ændringen. Det daværende credential-varsel bestod PR #169/exact-head `33025102301`, merge `1e402834` og manuel main-prøve `33025289153`.
- Ejerens endelige driftsbeslutning 27. august erstatter kalenderrotationen: normal Auth/Edge-/D1-drift bruger ikke `SUPABASE_ACCESS_TOKEN`, tokenet må udløbe uden varsel, og et kortlivet PAT oprettes kun til en konkret Edge-deploy, migration eller rollback-deploy og tilbagekaldes efter grøn verifikation. Det kalenderbaserede GitHub-workflow er pensioneret.
- Produktion `33025210517`/Pages `98367528389` og offentlig `rr-20260827000855-210` er grønne på 210/210 aktive zoner, fem ranglisterækker og fuld 210/673/420/2.100-audit.
- Supabase-varslet 9. september 2026 forbliver en aktiv driftsopgave; ingen sikkerheds- eller releasegate må lempes. Cloudflare-token roteres kun ved kompromittering eller rettighedsændring.
- Ravudsigten-sammenligningen er aktiv med første internt dokumenterede snapshot og er fortsat score-neutral og longitudinel: kun RDKS/roadmap/changelog, `scoreImpact=false`, `publicRuntime=false`, ingen app-, håndbogs-, ekspert-, admin- eller public-runtime-visning.
- PR #171 bestod exact-head `33029393300` og blev merged som `f15f5892`. Produktion `33029447510` stoppede fail-closed før Supabase/artifact/Pages på den globale kildeneutralitetstest. Opfølgningen må kun undtage den eksakte interne analysefil og skal testkræve dens interne, score-neutrale og ikke-offentlige markører, før ny exact-head og produktion.
- Opfølgningen bestod PR #172 exact-head `33030112665`, merge `7a234653` og produktion `33030166104`/Pages `98382359708`. Offentlig `rr-20260827013448-210` er komplet med 210/210 aktive zoner, 673/673 scoreklare kystdele og fem rangliste-/prognoserækker i begge søgemåder uden synlig runtimefejl.
- Se DEC-0082 og øverste checkpoint i `docs/ai/CURRENT_SESSION_HANDOFF.md`.

## Produktionsverificeret 4.0.286 – faktisk runtimegate og native-hold-score

- Offentlig 4.0.285 er funktionelt afvist med sorte zoner og tom aktuel rangliste. Den må ikke kaldes grøn.
- PR #157/exact-head `32995801418` blev merged som `2f2fd148`; produktion `32995888183` beviste, at den nye gate stopper den faktisk genererede runtime før deploy.
- PR #158/exact-head `32997043974` blev merged som `ca784210`; produktion `32997118162` stoppede sikkert med 672/673 `READY`, én warmup, nul replaymismatch og 1.328/1.344 modes.
- De sidste 16 modes var de otte godkendte `dkss_lf`-dele ved en gyldig to timer gammel `NATIVE_CADENCE_HOLD`. Den ældre Phase D-base krævede et nyt aktuelt strømfelt, før Candidate G-memory blev nået.
- Kandidaten bruger nu den eksisterende `READY` transport- og mobiliseringstilstand kun ved allowlist-afledt eksakt tre-timers hold, referencealder over 0/højst 3 timer og tomme aktuelle U/V-, fart-, retnings- og alignmentfelter. Almindelig unverified, for gammel, ikke-allowlisted og ikke-READY forbliver fail-closed.
- Målrettede kontrakter og et dataminimeret replay af de otte faktiske offentlige fejlpunkter giver 16/16 modes uden rå vektorer eller udskrevne identifikatorer.
- PR #159 bestod exact-head `33001615758`, blev merged som `c0f42b33956e3d2af361da1366ab552b9e2a33ef`, og produktion `33001743118` bestod runtimegate, fuld validering, releasegate, Supabase-sync, artifact og Pages.
- Offentlig `rr-20260826185603-210` viser 210/210 aktive zoner, 673 kystdele, 420 aktuelle og 2.100 prognosevisninger uden fejl. **Bedste områder** er befolket; første område var **Lønstrup og Nørlev** med områdescore 77.
- 4.0.286 er den aktuelle grønne baseline. Åbne driftsforhold er Supabases mulige begrænsning fra 9. september 2026 og det endnu uløste `ravradar.dk`; GitHub Pages er kanonisk. Se DEC-0081.

## Kandidat 4.0.283 – slutkontrollen bevarer moderzonen

- Produktion `32912103679` byggede 673/673 scoreklare kyststrækninger, inklusive de otte ejer-godkendte native-kadencereferencer, men den afsluttende videnskabelige kontrol rapporterede 665/673 og stoppede sikkert før deploy.
- Rodårsagen var ikke manglende strøm eller historik. Kontrollen foldede de 210 zonegrupper ud til 673 kystdele uden at bevare den autoritative moderzone fra JSON-nøglen.
- `flattenCoastalPartsWithParentZoneId` bevarer nu zonekoblingen, og både regressionen og slutkontrollen bruger den samme hjælpefunktion.
- Kravet til verificeret strøm er uændret. Der tilføjes ingen måling, mellemtime, retning, pil eller mobilisering.
- Candidate G 20/50/30, scorekurver, zoner, geometri, land-/vandpunkter, admin-data og brugerdata er uændrede. De beskyttede geodatafiler ændrer kun topversionsfelt 4.0.282 → 4.0.283. Se DEC-0079.
- Næste trin er målrettede kontroller, exact-head, fuld produktion og offentlig kontrol af alle 673 kyststrækninger.

## Kandidat 4.0.282 – eksakt native reference ved nyt beregningsvindue

- Den fulde produktion `32907678721` stoppede korrekt ved 665/673: de otte ejer-godkendte `dkss_lf`-regionalproxyer havde en ægte verificeret tretimersmåling umiddelbart før det aktuelle Candidate G-beregningsvindue, men den var endnu ikke en del af vinduets kompakte state.
- Rettelsen sender kun denne eksakte foregående kilderække ind som reference, når den er verificeret, ligger før vinduet og højst er tre timer gammel.
- Referencen reduceres straks til tidspunkt og kystrelativ transportstyrke. Den skaber ingen ny rå måling, mellemtime, pil, bevægelse eller mobilisering og fører ingen U/V, koordinater eller punkt-id'er videre.
- Er referencen for gammel eller ugyldig, forbliver den konkrete kystdel lokalt fail-closed.
- Målrettede tests for state-pipelinen og live-current-piloten er grønne. Versionen er 4.0.282; de beskyttede geodatafiler ændrer kun topversionsfelt 4.0.281 → 4.0.282.
- Candidate G 20/50/30, scorekurver, 48-timershukommelse, zoner, geometri, land-/vandpunkter, admin-data og brugerdata er uændrede. Se DEC-0078.
- Næste trin er kilde- og RDKS-kontrol, exact-head, merge, fuld produktion og offentlig 673-kystdelskontrol.

## Kandidat 4.0.280 – korrekt orienteret Om RavRadar-billede

- Offentlig kontrol af 4.0.279 viste, at familiebilledet stod på siden, fordi den tidligere konvertering ikke indarbejdede EXIF-orienteringen i pixels.
- Originalen er urørt. Tre nye komprimerede JPEG-varianter er fysisk vendt korrekt: 540 × 720, 900 × 1200 og 1350 × 1800.
- Pc viser billedet ved siden af teksten; mobil viser det over teksten uden vandret rulning.
- HTML, appskal og målrettet test bruger kun de nye varianter. Lokal pc-/mobilkontrol er grøn.
- Versionen er 4.0.280. De beskyttede geodatafiler må kun ændre topversionsfelt 4.0.279 → 4.0.280.
- Candidate G, score, vejr, zoner, geometri, land-/vandpunkter, admin-data og brugerdata er urørte.
- Næste trin er exact-head, merge, fuld produktion og offentlig kontrol.

## Produktionslukket 4.0.279 – offentlig Om RavRadar-side

- Ny offentlig side er implementeret og linket i topmenuen ved konto, tur og Rav-assistent.
- Siden forklarer ejer, formål, scorebegrænsning, landsdelsforskel, modelkompromiser, kontakt og frivillig støtte.
- MobilePay Box `4214MX` og den godkendte betalingsadresse bruges som tekstlink og klikbar QR-kode.
- Begge ejerbilleder ligger som responsive billedvarianter; siden er tospaltet på pc og enspaltet på mobil.
- Siden og aktiverne ligger i appskallen. Målrettet kontrakttest er grøn.
- Versionen er sat til 4.0.279. Særskilt diff viser kun topversionsfelt 4.0.278 → 4.0.279 i `data/kystdata.json` og `data/zones.geojson`.
- Ejeren har stående godkendt fremtidige rene versionsfeltsynkroniseringer i de samme to filer, når diffkontrollen beviser, at intet andet geodata ændres. Der skal derfor ikke spørges igen ved en ren versionssynkronisering.
- Candidate G, score, vejr, zoner, geometri, land-/vandpunkter, admin-data og brugerdata er urørte. Se DEC-0076.
- PR #148 blev merged som `12db45a8`, og produktion `32881278351` var grøn. Familiebilledets efterfølgende konstaterede orienteringsfejl lukkes i 4.0.280.

## Produktionslukket 4.0.278 – Regelværksted pensioneret og zonestatus rettet

- Regelværkstedet var ikke en sikker vej til offentlig score: dets øjeblikstest kunne ikke validere Candidate G's 48-timersstate, lokale datagater, transport-nul, wadersloft eller øvrige invariants.
- Regelværksted, Vidensbase, regelrettigheder og den offentlige regelfil fjernes fra den aktive kæde. Historiske centrale og lokale kladder bevares urørt uden runtimeeffekt.
- Eksperten indsender fortsat faglige kommentarer i håndbogen. Accepterede scoreændringer går gennem Candidate G-kode, RDKS, målrettede tests, exact-head, produktion og offentlig kontrol.
- Hele ekspert-håndbogen er rettet mod Candidate G 20/50/30, aktiv 48-timersstate, lokal fail-closed og fraværet af legacyfallback. Se DEC-0075.
- PR #146 bestod exact-head `32844951668` på `432de975`, blev merged som `8facd2d8`, og produktion `32845130587` bestod fuld validering, releasegate, artifact og Pages.
- Live `rr-20260825120459-210` viser 205/210 aktive zoner. Fem zoner er korrekt lokalt utilgængelige; 657/673 kyststrækninger er READY, 16 er `WINDOW_INCOMPLETE`, og alle 673 statefortsættelser er accepteret uden reset.
- Candidate G 20/50/30 er eneste offentlige profil uden rollback eller legacyfallback. Landsstatus bruger den fælles aktuelle reference, så senere lokale prognosehuller ikke lukker current-status globalt.
- Aktuel liste og alle fem prognosedage er kontrolleret for strand og waders. Alle bruger særskilte værdier; tre prognosedage har forskellig top-5-rækkefølge. Stor overlapning er forventelig, fordi transport og rav i bevægelse er fælles.
- De offentlige topfelter i `data/kystdata.json` og `data/zones.geojson` er 4.0.278. Opfølgningen ændrer ingen score, geodata, geometri eller land-/vandpunkter.

## Produktionslukket 4.0.277 – native tretimerskadence

- Den seneste naturlige produktion stoppede sikkert på 666/673 ved en mellemtime. Historikken var ikke tabt.
- Rodårsagen var todelt: readiness talte en fremtidig regionalproxyprøve som aktuel, mens Candidate G skrev den naturlige mellemtime som manglende evidens.
- 4.0.277 gør alle valg årsagstro. DMI/Copernicus kræver eksakt tid; kun de otte godkendte `dkss_lf`-proxyer må fastholde den seneste afledte transporttilstand i højst tre timer.
- Fastholdelsen tilføjer ingen bevægelse, evidens, U/V, hastighed, retning eller pil. Næste ægte prøve bruger den faktiske tidsafstand. Over tre timer stoppes lokalt.
- Candidate G 20/50/30 er eneste offentlige profil. Scorekurver, zoner, geometri, punkter og central admin er urørte.
- PR #140 bestod exact-head `32816129342` og blev merged som `d3b4542f`. Produktion `32816237198` byggede historik, vejr og runtime grønt, men stoppede før deploy på en forældet statisk dæknings-test.
- PR #141 rettede kun testkontrakten, bestod exact-head `32817501003` på `128c71ce` og blev merged som `81e9b891`. Produktion `32817626537` bestod frisk vejr, fuld validering, releasegate, artifact og Pages.
- Offentlig 4.0.277 viser 673/673 Candidate G-states, 673 accepterede fortsættelser, nul resets og 12–45 timers naturlig historik. Candidate G 20/50/30 er eneste profil uden rollback eller legacyfallback.
- Ved kontrollen var 0/210 zoner aktive, fordi den længste kæde var 45 timer. Næste handling er kun naturlig overvågning af passage over 48 timer; der må ikke bygges kunstig historik eller ændres score, geometri eller punkter. Se DEC-0074.

## Produktionslukket 4.0.275 – Candidate G-only med lokal fail-closed zonestatus

- Ejerbeslutning: Candidate G 20/50/30 er eneste offentlige scoremotor. Der findes ingen offentlig 25/40/35-fallback eller rollback. Manglende evidens gør kun den konkrete zone/søgemåde/tid utilgængelig.
- Adminforsiden viser **ALLE AKTIVE** eller en dataminimeret liste over berørte zone-/søgemådepar og almindelige danske årsager. Resten af Danmark fortsætter Candidate G.
- PR #134 og #135 lukkede først de offentlige legacyveje og den centrale legacyoverskrivning. 4.0.273 og 4.0.274 blev ikke udgivet, fordi deres produktioner stoppede sikkert før deploy.
- PR #136 bestod exact-head `32778118765` på `8103143c018253861a154f9fce5b7d937572a166` og blev merged som `59ea4546f3505ed96d2512a9bf5c9925ff7dff2a`.
- Produktion `32778269487` bestod central hydrering, frisk vejr, fuld validering, releasegate, beskyttet adminsynkronisering, artifact og Pages. Live `rr-20260824211701-210` er 4.0.275 på 210/673.
- Live manifest har Candidate G som ønsket og aktiv profil, `rollbackProfileId: null`, forbud mod legacyfallback og lokal fail-closed availability. Den gamle 25/40/35-model kan ikke vende tilbage automatisk.
- Ved slutkontrollen var 0/210 zoner aktive, fordi den krævede sammenhængende 48-timers strømhistorik endnu ikke var komplet. Adminforsiden viser alle berørte zone-/søgemådepar og årsagen. Der vises ingen gammel eller opdigtet score; hver zone bliver aktiv, når dens eget grundlag er komplet.
- Næste naturlige driftskontrol skal kun følge, at antallet af aktive zoner vokser, når historikken bliver komplet. Et lokalt hul må fortsat kun holde den konkrete zone/søgemåde utilgængelig.
- Geometri og land-/vandpunkter blev ikke ændret.

## Produktionslukket 4.0.272 – scorekollaps efter tabt Candidate G-fortsættelse

- Den landsdækkende lave score skyldes, at en planlagt produktion fortsatte efter timeout i den atomiske hentning af offentligt manifest/conditions. Alle 673 dele startede derefter med `NO_PREVIOUS_STATE`.
- Sidste grønne 4.0.271-artifact har 673/673 accepterede fortsættelser og normal scorevariation. Det er den eneste godkendte recoverykilde.
- Branchen `codex/candidate-g-state-recovery-4.0.272` gør hydreringen fatal, afviser global nulstart og genoptager kun kompakt Candidate G-state fra én eksakt Actions-kørsel efter streng del-/model-/type-/tids-/integritetskontrol. Den aktuelle nulstillede fortsættelseslinje genkendes uden at være låst til ét senere datasæt-id og bliver straks inaktiv, når historikken er genindsat.
- Scoreformel, vægte, vejr, zoner, geometri og land-/vandpunkter er ikke ændret. Kun geodatafilernes versionsfelt følger releasen fra 4.0.271 til 4.0.272.
- Punktpar 2 blev senere flyttet af ejeren. Én efterfølgende kystdel manglede en komplet frisk offentlig vejrrække; det er separat og må ikke løses ved at låne strøm fra moderzone/nabo.
- PR #131/merge `1bbb4cc2` indførte recoveryen. PR #132/merge `392fea15` bevarede den ældre hydratorindgang uden runtimeændring. Produktion `32761751284` bestod den fulde kæde og udgav `rr-20260824183620-210` som 4.0.272 på 210/673.
- Offentlig top-5 varierer igen 76, 74, 72, 72 og 71; femdøgnslisten sorterer 86, 84, 83, 76 og 76. Det tidligere landsdækkende 17/18-kollaps er lukket.
- Runtime har 672 accepterede states, én lovlig lokal kontekstreset efter punktpar 2 og otte aktuelle missing-evidence-huller, som også fandtes før nulstillingen. Den viser derfor midlertidigt den samlede 25/40/35-reserve. Næste naturlige kontrol skal overvåge disse otte huller; ingen ny score- eller geodatarettelse er begrundet af kollapset.

## Produktionslukket 4.0.271 – samlet feltrettelse af grundbogen

Implementeret og offentligt verificeret:
- offentlig grundbog og målrettet test,
- ekspert- og webhåndbog,
- DEC-0070, forskningsnotat, aktive krav, indeks og changelog,
- versionsløft uden ændring af score, vejrdata eller geometri.

- PR #128 bestod exact-head `32742727246` og blev merged som `a723ae8c`.
- Produktion `32743307402` stoppede fail-closed før deploy ved en manglende læsehjælp i det nye eksperthåndbogskapitel.
- PR #129 bestod exact-head `32745213320`, blev merged som `499861e8`, og produktion `32745389504` bestod hele kæden og udgav 4.0.271.
- Den levende `learn.html` er målrettet kontrolleret for pil, opdriftsforklaring, bundnær strøm, revlehuller, fjernet grus, adskilt vind/strøm og speciallygter.
- Ingen score-, vejr-, geometri-, zone- eller land-/vandpunktsdata blev ændret ud over det allerede godkendte versionsfelt.

> Produktionsbevis: PR #126 blev merged som `fda934ae`. Den eksakte mergeproduktion `32730674577` (#3522) bestod hele kæden og udgav Pages-artifact `9521472172` samt supportartifact `RavRadar-support-3522` (`9521463897`).

## Produktionslukket 2026-08-24 – 4.0.270 før-lancering

- Naturlig 210/673-produktion, Supabase Free-plan, admin, eksperthåndbog og rettigheder er kontrolleret. Ingen private payloads, koordinater eller rå strømvektorer er udstillet.
- Den synlige rangering er rettet uden at genindføre ekstra lotterilodder: toplisterne viser den samme afrundede områdescore, som DEC-0049 sorterer efter. Den falske adminstatus for `coastline-overrides` er også rettet.
- Begge håndbøger beskriver den aktive 20/50/30-model, installationsfilen synkroniseres med hele webhåndbogen, og livehåndbogen trevejsflettes, så godkendte centrale ekspertændringer ikke overskrives.
- PR #122 bestod exact-head `32721778498` på `a885bc5b` og blev flettet som `abe10127`. Produktion `32721891349` bestod de fulde kode- og datagates, men stoppede før Supabase- og Pages-deploy ved den første beskyttede håndbogssynkronisering: central håndbog var ændret, og en tidligere kildebaseline fandtes endnu ikke.
- PR #123 bestod exact-head `32724526697`, blev merged som `00f59456`, og produktion `32724616331` bestod alle kode-, data- og releasegates. Den stoppede fortsat sikkert før deploy, fordi den slanke Pages-pakke ikke udgiver håndbogens kildefil.
- PR #124 bestod exact-head `32726897134`, blev merged som `fd7bc868`, og produktion `32727025187` bestod alle øvrige gates, men stoppede fortsat før deploy: hashkontrollen beviste, at manifestet stammer fra den senere produktionsgrønne 4.0.269-dokumentationsmerge.
- PR #125 bestod exact-head `32728525467` på `3fe579ab`, blev merged som `7861079b`, og produktion `32728654553` lukkede den beskyttede første migrering med `source-update`, aktiv Candidate G-readback, fulde gates, supportartifact og Pages.
- PR #126 rettede alene den aktive browseraudits forældede vandstandslabel og bestod exact-head `32730584569` på `01853d21`; offentlig brugerflade, score og data blev ikke ændret.
- Den gentagne fulde 4.0.270-liveaudit bestod 210 zoner, 673 kystdele, 420 aktuelle og 2.100 femdøgnsvisninger med nul kontrol-, konsol-, side- eller HTTP-fejl.
- Efter den tekniske lukning mangler den virkelige eksterne ekspertgennemgang samt domæne-, HTTPS-, Supabase-redirect- og fuld brugerflowprøve på `ravradar.dk`.

## Lukket checkpoint 2026-08-24 – 4.0.268 offentlig grundbog

- **Grundbog i ravjagt** er udgivet i `learn.html`/`learn.css` og tilgængelig fra forsiden. Den lærer ravjagt fra havbund til fund, før RavRadar forklares.
- Normal offentlig tekst i forside, scorepanel, Rav-assistent, login, konto, tur og fejl er gennemgået og gjort mere forståelig. Admin-/debugværktøjer er fortsat bevidst tekniske.
- Målrettede tests låser emnedækning, faglig rækkefølge, aktiv `20/50/30`, waders-kurve, udtransportregel, mobilopsætning, bølge-/strømroller, kilder og almindeligt sprog.
- PR #116 og #117 stoppede to forældede ordrette testkontrakter før deploy. Den samlede rettelse bestod PR #118 exact-head `32672522334` på `8faccce3` og blev merged som `3c22e40b`.
- Produktion `32672578127` bestod hele kæden. Live `rr-20260823230848-210` er version 4.0.268 med 210 zoner og 673 kystdele.
- Den offentlige browseraudit bestod 420 aktuelle, 2.100 femdøgns- og 673 kystdelsvisninger uden kontrol-, konsol-, side- eller HTTP-fejl. Lokal desktop og 390×844-mobilvisning bestod uden vandret overløb.
- Score, Candidate G, vejrdata, Supabase-kontrakt, geometri og land-/vandpunkter er urørte; geodatafilerne ændrer kun versionsfelt til 4.0.268.
- Næste chat skal begynde fra ren `main` efter den afsluttende docs-only-merge. Næste produktarbejde vælges ud fra det aktive roadmap; 4.0.268 skal ikke genåbnes uden ny modstridende evidens.

## Akut checkpoint 2026-08-23 – 4.0.267 uploadhotfix

- Ejerens oprindelige og nye manuelle kontoindberetning var ikke synlige efter 4.0.266. Aggregeret Supabase-kontrol viste 0 nye rækker; turindhold blev ikke læst.
- Første rodårsag var den aktive tabels manglende POST-only-felter `forecast_target_at` og `report_accuracy`. Central databevarende hotfix er anvendt og begge felter er efterkontrolleret.
- Genindlæsningen gav stadig nul ture, og API-loggen viste GET uden POST. Den fælles klientkontrol afviste den krævede tomme værdi `gps=null` før lokal lagring. Det ramte både kontoindberetning og **Start ravtur → Slut ravtur**.
- 4.0.267 tillader kun lokationsfelter med værdien `null`; faktiske GPS-, positions- og rutedata er fortsat blokeret. De to tidligere forsøg nåede ikke outboxen og skal indberettes igen efter udgivelsen.
- 4.0.267-branch versionsstyrer migration, test, RDKS og changelog. Exact-head, merge og produktion skal færdiggøres før lukning, hvis tiden tillader det.

## Nedlukningscheckpoint 2026-08-23 – 4.0.266 login og privat turlog

- PR #113 bestod exact-head `32662085932` på `bd3b4984` og blev flettet som `db4db876`.
- Produktionskørsel `32662155582` bestod central hydrering, frisk vejr, fuld validering, releasegate, artifact og Pages. Den almindelige adresse viser 4.0.266.
- Supabases Site URL og tilladte redirect er den aktuelle GitHub Pages-adresse. Når `ravradar.dk` tages i brug, skal begge auth-adresser ændres i samme deployment og prøves med et nyt magic link.
- Et nyt magic link returnerede til RavRadar uden token i den afsluttende adresse. Kontoen blev indlæst, og **Mine ture og fund** hentede uden fejl gennem den private SELECT-policy.
- Codex-browseren viste nul ture. Det er forventet, fordi ejerens tidligere efterregistrering ligger i den oprindelige Chrome-browsers lokale outbox, som en anden browser ikke kan se.
- Første og eneste resterende P0-trin: genindlæs den oprindelige Chrome-fane, mens brugeren er logget ind, og kontrollér at turen eftersendes og vises i **Mine ture og fund**. Opret ikke en testtur og læs ikke private turdetaljer.
- Score, Candidate G, `20/50/30`, geometri, land-/vandpunkter, artifact, protected-dirty-data og private caches er urørte. Geodatafilerne fik kun versionsfeltet 4.0.266.

## Aktuel 4.0.263-P0 – Candidate G's aktuelle referencegate

- 4.0.262-produktion `32642532892` beviste cadence-rettelsen med 673/673 fortsatte states, nul replaymismatch og 110 positive transportpotentialer. Profilen rullede alligevel tilbage til legacy, fordi en senere prognosegapstatus blev brugt som aktuel warmup-gate.
- DEC-0062 lader memory-/warmup-gaten følge den nærmeste fælles aktuelle scoretid pr. zone. Fuld Candidate G-scorecoverage over hele prognosen består; missing/gap ved den aktuelle reference giver stadig global rollback, mens senere gaps håndteres fail-closed i deres egen state.
- 4.0.263 er produktionslukket gennem PR #101/exact-head `32644701811`, merge `9f5953f6`, fuld produktion `32644772373`, live `rr-20260823142247-210`, aktiv shadow `32645569741` og grøn 420/2.100/673-browserkontrol. Candidate G er aktiv på 210/673 med nul reset, replay-, score- eller visningsfejl.

## Aktuel 4.0.262-arbejdsbaseline – Candidate G cadence-rettelse

- **P0 reproduceret og rettet lokalt:** Den aktive 4.0.261-runtime har transport 0 i 673/673 dele, fordi native tre-timers beviser blev afvist af én-times-gaten. DEC-0061/4.0.262 accepterer højst tre timer, integrerer den faktiske tid uden kunstige mellemtimer og afviser fortsat større eller manglende gab.
- Pre-public opvarmning er kun lovlig med `WINDOW_INCOMPLETE`; latest-missing, missing inde i vinduet og tidsgab giver global legacyrollback gennem `candidateWarmupEligible=false`.
- Målrettede tests er grønne. Dataminimeret gammel-state-replay giver 110 positive og 563 fortsat nul; det gamle artifact får 658 forventede replaymismatch. Exact-head, frisk fuld produktion, aktiv 210/673-shadow og browserkontrol mangler endnu.
- Ejeren har i DEC-0060 godkendt øjeblikkelig Candidate G-aktivering, selv om det første schema-2-vindue endnu ikke har 48 timers naturlig historik. Siden er endnu ikke offentlig, og de foreløbige scoreværdier er accepteret.
- Startbaselinen er `main` på merge `328b4d7c` fra PR #99. Arbejdsbranch er `codex/candidate-g-transport-cadence-fix`. 4.0.262 bruger fortsat `RESEARCH-3` med `20/50/30`; modelreglerne er uændrede, og legacy `RRS-CURRENT-B0-4.0.247` er global rollback.
- Den private centrale konfiguration hedder `ravscore-profile-selection`. Den må promoveres centralt én gang med versions- og ejerbinding; derefter er central samme/nyere konfiguration autoritativ.
- Aktivering under ufuldstændig memory kræver stadig komplette Candidate G-scoreprojektioner for alle nødvendige rækker. Runtime skal vise `candidate-active-pre-public-warmup` og faktisk `WINDOW_INCOMPLETE`; én manglende projektion giver global legacyfallback.
- PR #97/exact-head `32636378576`, merge `0f7a9d5f` og produktion `32636433944` beviser aktivering, central readback og live 210/673. PR #98/merge `fd69f8a0`, produktion `32637387600` og shadow `32637833674` lukkede auditkontrakten. PR #99/merge `328b4d7c` registrerede den fulde 210/673/420/2.100-browserkontrol uden fejl.
- Ingen artifact, protected-dirty-data, private cachedata, geometri eller land-/vandpunkter er rørt. Kun versionsfeltet må ændres i `data/kystdata.json` og `data/zones.geojson`.

Den naturlige memoryopbygning følges som driftsevidens, ikke som ny implementerings- eller aktiveringsgate. Repræsentative ture og hold-out er senere efterkalibrering.

## Aktuelt checkpoint 2026-08-23 – 4.0.260 score-neutral produktion grøn

- PR #92/exact-head `32628441062`, merge `c5898ce8` og produktion `32628516066` er grønne. Live `rr-20260823083627-210` består 210/673/1.346, manifestintegritet og 420/2.100/673-browseraudit uden fejl.
- Candidate G er ikke aktiveret; legacy `25/40/35` er fortsat ønsket, aktiv og rollbackprofil, og automatisk aktivering er falsk.
- 673/673 tilstande blev videreført uden nulstilling til 09:00Z, svarende til 9/9 timer fra bootstrap 00:00Z. Det er praktisk evidens, ikke et 48-timersbevis.
- Candidate G ligger aktuelt væsentligt lavere end aktiv score. Næste opgave er ejerreview af scorefordelingen og den unge transport-/mobiliseringstilstand, ikke central aktivering.
- Bootstrapauditten viser, at problemet ikke løses ved blot at vente: 65–117 timers eksisterende historik efterlader 607/633 dele med mindst 50 points afhængighed af startprioren. Neutral startprior 50 anbefales til ejerbeslutning; den er ikke implementeret.
- Privat cache, protected-dirty-data, geometri og land-/vandpunkter må fortsat ikke berøres.

## Afslutningscheckpoint 2026-08-20 - online browserkontrol grøn

- Live index og bootstrap er 4.0.237; senest auditerede datasæt er `rr-20260819213342-210` fra grøn naturlig produktion `#3237`.
- Chromium klikkede gennem 210 zoner, 673 kystdele, 420 aktuelle visninger og 2.100 femdøgnsvisninger med 0 mismatch i score, farve, pile, forklaringer, lokal vinderkontekst og debug-ID.
- Browser-pluginet blev forsøgt først og fejlede i trusted-code-path. Chromium-fallbacken var tidligere ejer-godkendt.
- Eneste HTTP-fejl var favicon 404; ingen page errors.
- Evidens: `data/diagnostics/online-browser-audit-4.0.237-20260820.json` og `data/diagnostics/ONLINE_BROWSER_AUDIT_4.0.237_20260820.md`.
- Spark-kørslen i den gamle desktopkopi er forkastet. `codex/browser-zone-audit-20260820`/`526509f2` må ikke flettes.
- Næste driftspunkt er højst daglig syvdøgnseftermåling; fortsæt derefter næste ikke-blokerede roadmappunkt. De fire beskyttede dirty datafiler må fortsat ikke ændres eller stages.
- Dagens cacheeftermaaling er udfoert: pilot `#58` har 37 gyldige timer, 23.273 poster, 625 maal og 629 maal/kilde-par med nul gitter-/lagustabilitet. Planlagt `#59` dubletskippede korrekt uden artifact. Naeste maaling tidligst naeste kalenderdag; 168 timer er ikke naaet.
- Produktion `#3237` bestod readiness, hele `build-and-prepare` og Pages-deploy. Den fulde 420/2.100-browseraudit blev derefter gentaget grønt på det nye datasæt.
- Separat mobil-/desktopaudit er grøn ved 390 × 844 og 1440 × 900 uden overflow, page errors eller funktionelle HTTP-fejl. Evidens: `data/diagnostics/online-responsive-audit-4.0.237-20260820.json`.

## Afslutningscheckpoint 2026-08-19 – GitHub alene, 30 timers cache og browservej

- Ejeren har slettet/deaktiveret RavRadar-jobbene i cron-job.org. Efter denne overdragelse bestod GitHubs egen naturlige produktion `#32272470720`, cachebevaring `#32272473716` og `#32272598725` samt Copernicus-pilot `#32273634626`. GitHub Actions er dermed eneste normale scheduler.
- Den naturlige produktion frigav live datasæt `rr-20260819155614-210` gennem current-hour-readiness, frisk bygning, præcis 673/673, fuld `validate`, releasegate, Supabase og Pages. Sikker liveaudit fandt 210 zoner, 673 dele, 420 aktuelle visninger, 2.100 femdøgnsvalg og 673 pile uden kontraktbrud; 1.956 femdøgnsvisninger havde lokale data, mens 144 var korrekt mærkede mangler/fallbacks.
- Den private cache fra `#32273634626` har nu 30 gyldige timer, 18.870 poster, 625 unikke mål og 629 mål/kilde-par med nul gitter- eller lagustabilitet. `scoreImpact=false`, `publicRuntime=false` og 168 timers retention er bevaret, og cachen har overlevet efterfølgende DMI-cachearbejde. Det fulde naturlige 168-timersvindue er fortsat åbent og kontrolleres højst dagligt.
- Næste chat forsøger først den installerede Browser-plugin og diagnosticerer native-host/trusted-code-path. Hvis den fortsat ikke virker, og diagnostikken ikke giver en konkret reparationsvej, har ejeren udtrykkeligt godkendt Chromium/Playwright som fallback til den systematiske online DOM-/kliktest af kort, pile, vinderområde, beskrivelser, score og debug for alle 210 zoner og 673 dele.
- Arbejd kun i `C:\Users\jakob\AppData\Local\Temp\ravradar-40232-current`. De beskyttede dirty filer `data/diagnostics/current-spatial-audit-4.0.76.json`, `data/diagnostics/state-reference-zones.json`, `data/diagnostics/zone-geometry-audit.json` og `data/live/coastal-parts-v2.json` tilhører ejeren og må ikke ændres eller stages.

## Produktionsverificeret 4.0.237 – én komplet aktuel time pr. zone

- Metadataaudit af det nuværende 210-zone/673-dels livegrundlag viser en komplet fælles række i alle zoner, men den hidtidige runtime havde kun 642/673 dele på deres zones nærmeste komplette time. 31 dele brugte en anden nær-time.
- 673/673-kildegaten er fortsat gyldig og uændret. Den nye særskilte regel er, at den viste lokale sammenligning låses pr. zone til én eksakt komplet time; der kræves ikke én national klokktime for hele landet.
- 4.0.237 beregner `currentReferenceAt`, bygger delens current/flowpunkt på den tid og fører referencen gennem offentlig runtime, manifest, fletning og frontend. Nærzoom viser kun tidsjusterede lokale pile.
- Målrettede regressioner for 210 zoner, 673 dele, 2.100 femdøgnsvisninger, pile, DMI og Copernicus er grønne. Commit `9c971bc1` og `#32264833170` bestod frisk 673/673, fuld `validate`, releasegate, Supabase og Pages.
- Direkte liveaudit af `rr-20260819143933-210` fandt 210/210 komplette zoner og 673/673 dele på zonens valgte `currentReferenceAt`; 196 zoner bruger 15:00Z og 14 bruger 14:00Z. Start-/detailhashes matcher, `controlled-live` er aktivt, og historikken er credentialfri med 168 timers retention.
- Ejerens land-/vandpunkter er ikke flyttet eller omskrevet. De fire kendte dirty datafiler og alle untracked verify/cachefiler må ikke stages.

## Produktionsverificeret 4.0.236 – lås hele schedule-kørslen til readiness-timen

- Naturlig schedule `#32249924919`/`#3217` godkendte den komplette 11:00-time kl. 11:59, men den tunge bygning krydsede kl. 12 og valgte derefter 12:00. De 43 Copernicus-dele manglede på den nye time, så den uændrede gate stoppede sikkert ved 630/673 før releasegate, Supabase og Pages.
- 4.0.236 eksporterer `current-hour-readiness`-timen og sætter den som `RAVRADAR_PRODUCTION_TARGET_HOUR` for hele `build-and-prepare`. Live-pilot og vejrbygning bruger dermed samme eksakte time gennem hele kørslen.
- Push og bevidst manuel release uden readiness-output bruger fortsat nutiden og alle fulde gates. Ingen punkter, geometri, U/V, pile, score, kilder, afstande eller dækningskrav er ændret.
- Ny timegrænseregression og målrettede workflow-/DMI-/heartbeattests er grønne. Den fulde centrale validering er efterfølgende afsluttet, senest i `#32264833170` på 4.0.237.
- GitHubs egne naturlige events er igen leveret og grønne. Ejeren har siden slettet RavRadar-jobbene i cron-job.org, og efter-deaktiveringsbeviset er produktion `#32272470720`, cachebevaring `#32272473716`/`#32272598725` og pilot `#32273634626`.
- De tre allerede dirty diagnostik-/geometrifiler samt `data/live/coastal-parts-v2.json` er ejerens og må ikke stages. Untracked verify/cache-filer må heller ikke medtages.

## Produktionsverificeret 4.0.235 – én sammenhængende lokal visning

- Browser-P1 er implementeret lokalt: én lokal visningskontekst bærer del, tid, score, forklaring, debug og vejr gennem nuvisning og femdøgnsfaner.
- National prognose og zonepanel bruger samme `selectLocalBestForDay`; runtime bevarer vinderdelens kompakte præsentationsfelter pr. fælles time.
- Manglende lokal post låner ikke hovedzoneværdier. En ufuldstændig fælles lokal række vises som tydeligt mærket, samlet hovedzonefallback.
- Syntetisk landsregression består for 210 zoner, 673 dele, begge jagtformer og 2.100 femdøgnsvisninger. `#32249770288`/`#3216` bestod derefter frisk central 673/673, fuld validering, releasegate, Supabase og Pages.
- Live datasæt `rr-20260819115558-210` er metadata-, hash- og runtimeverificeret. Audit af 420 aktuelle og 2.100 femdøgnsvisninger fandt kun komplette lokale kontekster eller eksplicitte samlede hovedzonefallbacks.
- Ingen ejerpunkter, geometri, U/V, pilceller, scoreformel, kildeorden, afstandsgrænser eller dækningskrav er ændret. De tre dirty diagnostik-/geometrifiler samt `data/live/coastal-parts-v2.json` må ikke stages.
- Faktisk DOM-/kliktest af den online side er fortsat åben. Forsøg og diagnosticér Browser-pluginet først; hvis der ikke findes en konkret reparationsvej, bruges den ejer-godkendte Chromium/Playwright-fallback. Der må ikke laves en RavRadar- eller registryomvej.

## Produktionsverificeret 4.0.234-drift

- Begge godkendte driftsrettelser er implementeret lokalt: GitHub-ejet plan `14,29,44,59 * * * *` med fail-closed kontrol af den aktuelle private Copernicus-time, samt tabsfri komprimering og integritetskontrol af den beskyttede Supabase-`runtime-diagnostics`-payload.
- Copernicus-piloten kører ved minut 06, så dens time kan være klar før første produktionsforsøg. Manglende time giver et billigt sikkert skip; den normale produktion må stadig kun frigive præcis 673/673 efter DMI ≤5 km → Baltic ≤5 km → AMM15 ≤5 km → otte ejerallowlistede `dkss_lf`-proxyer ≤15 km.
- Overgangens almindelige cron-job.org-`workflow_dispatch` bruger nu samme current-hour-gate, så et hel-timeskald uden den nye Copernicus-time udsættes uden rød release. Push og en bevidst manuel `force=true`-release bevarer hele kæden.
- Arkivet indeholder hele originalen som deterministisk gzip/base64 med SHA-256 og bytekontrol. Admin-download dekoder og verificerer filen efter sædvanlig adgangskontrol. Den målte repræsentative størrelse er 208.874 bytes mod 4.014.169 bytes kompakt original.
- Lokal RDKS, version, geometri-v2, runtimeuafhængig testmatrix og releasegate er grønne. Commit `7409d461` er fast-forwardet til `main`; pushrun `#32237507059`/`#3202` bestod frisk central geometri, fuld validering, releasegate, 673/673, Supabase på otte sekunder, Pages og deploy. Overgangscommit `4ab7a659` bestod derefter i pushrun `#32242510084`/`#3207` og eksterne gentagelser `#3208`/`#3209`.
- Det første nye naturlige GitHub-`schedule`-event `#32244914347`/`#3210` bestod hele kæden. Ejeren har siden slettet cron-job.org-jobbene, og de efterfølgende native runs `#32272470720`, `#32272473716`, `#32272598725` og `#32273634626` beviser overdragelsen uden ekstern scheduler.
- Eksternt hel-timeskald `#32245473213`/`#3211` beviste samtidig den nye sikre udsættelse: readiness var grøn, mens build, Supabase og Pages blev sprunget over. Dokumentationspush `#32245605472`/`#3212` bestod derefter hele den centrale kæde.
- Der er ikke ændret ejerens land-/vandpunkter eller anden geometri.

## Start her

Læs `AGENTS.md`, `docs/ai/CODEX_START_HERE.md`, den obligatoriske RDKS-kæde samt DEC-0024, DEC-0029, DEC-0030, DEC-0031, DEC-0037, DEC-0038, DEC-0039, DEC-0040, DEC-0041, DEC-0042, DEC-0043 og DEC-0044. Kontrollér derefter gitstatus, seneste commit og GitHub Actions.

## Aktuel sandhed

- **Den åbne browser-P1 er nu kun den faktiske visuelle DOM-/kliktest, ikke projektets data- eller runtimekobling.** En fuld Chromium-audit 2026-08-18 bekræftede 210 zoner, 673 dele, 622 DMI + 43 Copernicus + 8 godkendte proxyer, ejersource = runtimepunkt for 673/673 og korrekte U/V-retninger/pilceller inden for tolerancen. Ingen land-/vandpunkter blev ændret.
- Den tidligere blanding af hovedzonens vejrkort med den lokale vinderdels score, forklaring og debug er rettet og produktionsverificeret i 4.0.235. Zonepanelet, femdøgnspanelet og national prognose bruger nu samme lokale del/tid/vejrpost eller en samlet, eksplicit hovedzonefallback.
- Det historiske 20:00-eksempel med ufuldstændige rækker i `DK-B05-12`, `DK-B05-17` og `DK-B05-18` er nu afklaret som et zonevist udvælgelsesproblem, ikke som behov for én national fælles time. 4.0.237 vælger nærmeste komplette række særskilt pr. zone og bevarer fortsat 673/673-kildegaten.
- **Den zonevise current-reference er afsluttet:** 4.0.237 er centralt og live produktionsverificeret som beskrevet øverst. Næste browsertrin er den faktiske systematiske visuelle kontrol: Browser-plugin og målrettet diagnostik først, derefter Chromium/Playwright hvis der ikke findes en brugbar reparationsvej. Brug fortsat GPT-5.6 Sol med Ekstra høj til slutkontrollen.

- Ejeren har godkendt kontrolleret live-aktivering af Copernicus/regionalproxy på den nuværende ikke-offentlige side. Gyldige U/V-data, fuld provenance og nye pile må publiceres; kun credentials forbliver hemmelige. Syvdøgnsstabiliteten eftermåles live.
- 4.0.237 er gældende produktionsverificeret liveversion. Commit `9c971bc1` og `#32264833170` bestod frisk central geometri, vejrbygning, 673/673, fuld validering, releasegate, Supabase og Pages. Direkte liveaudit af `rr-20260819143933-210` kontrollerede 210/210 komplette zoner og 673/673 tidsjusterede dele; den tidligere 4.0.233-anker-/pilintegritet er bevaret.
- Den aktive runtime bygger en separat online `data/live/current-pilot-history.json`, fletter eksakt DMI-first strøm til RavScore og kort og placerer hver pil på den valgte posts faktiske kildecelle. Normal gate er fortsat 673/673.
- `data/current-live-pilot-control.json` giver en auditerbar `dmi-only-rollback`, som fjerner supplementet fra score/pile og lader berørte strømme være `missing`, mens friske vind-, bølge-, vandstands- og øvrige prognoser fortsætter. Rollback må ikke kalde reduceret dækning fuld.
- Commit `5a7780e4` og central `#32158041877`/support `#3127` har bestået præcis 673/673, fuld validering, releasegate, Supabase, Pages-artifact og deploy. Det første aktiveringsdatasæt `rr-20260818160548-210` blev direkte HTTP-/hashverificeret live med 673 scorede dele og credentialfri historik. Efterkontrol `#32160090899`/support `#3129` bestod igen hele kæden og live artifactmatch.
- Næste operation er at følge den naturlige live-drift i syv døgn uden at tage siden offline. Gentag også den visuelle kliktest af farver, prognoser og pile, når Codex' lokale browser-plugin igen kan starte; artifact-, hash- og HTTP-beviset er allerede grønt.

- Commit `cda7358b` med collectoren, `161ba79e` med liveintegrationen og `5a7780e4` med den kanoniske regionale anchorvalidering er på `main`. Seneste deploy er `controlled-live`, ikke DMI-only.
- #3079 efter ejerens fulde centrale punktgennemgang gav 622/673 lokale DMI-strømpunkter. Alle 51 mangler er auditeret.
- Autentificeret privat Toolbox-run `#32129799346` bekræftede på friske centrale punkter Baltic-par til 39/51 og AMM15-par til yderligere fire. Alle 43 var dybere end øverste lag ved 11:00Z. Samlet potentiale er 665/673; en privat timeplan samler nu op til syv døgns flerruns-bevis.
- DEC-0041 og `data/current-regional-proxy-policy.json` tillader kun otte vestlige Limfjordsdele at bruge nærmeste `dkss_lf`-par op til 15 km. Den aktive pipeline og fulde 673/673-kæde er produktionsverificeret; alle øvrige dele beholder 5-km-grænsen.
- Den aktive kildeorden og de otte regionale proxyer er implementeret bag fulde gates. Pushrun `#32129778162` er historisk bevis for det gamle 622/673-stop; `#32158041877` er det nye produktionsbevis for 673/673-runtime og deploy.
- Run `#32131021153` bekræftede cachegendannelse, deduplikering og rekursivt sikker flerrunsrapport på commit `406353be`: 629 records, én gyldig time, 625 unikke mål, nul mål/kildepar med grid-/lagskift og ingen rå U/V. Første cron-event er siden bevist i #32134686185; to tider i samme cache afventer keepalive og backfill.
- Central `#32134021410`/artifact `#3094` beviste private `dkss_lf`-data til alle otte regionale mål: 32 prøver ved fire forecasttider, 5,416–12,110 km, dybere lag til alle mål, ingen rå U/V i supportrapporten og ingen `.cache` i artifactet. Offentlig dækning forblev 622/673 som tilsigtet.
- #32134021410 stoppede sikkert før deploy, fordi én test stadig forventede workflowets gamle User-Agent 4.0.229. Testen følger nu `package.json`; rettelsen er centralt verificeret i #32135079819.
- Rettelsen er pushed som `d00d55bc`; #32135079819 passerede den og stoppede først ved den uændrede 622/673-gate uden deploy.
- Første faktiske Copernicus-cron #32134686185 var grøn ved 12:00Z, men 11:00Z-råcachen var blevet LRU-fortrængt af cirka 10,2 GB Actions-cache med flere 2,5 GB DMI-generationer. Restore-only keepalive er pushed i `0224ea6a`; #32136328681 ramte 12:00Z, #32136391556 samlede 1.258 records ved 11/12 UTC uden grid-/lagskift eller supportlæk, og #32136642330 ramte den nye cache. Første automatiske keepalive og næste naturlige time skal fortsat kontrolleres. En artifact med råcache er forkastet, fordi repositoryet er offentligt.
- Den faktiske gamle audit brugte stadig 95 %/640. Ejerens nyere 100 %-beslutning er nu kode: alle aktuelle kystdele, aktuelt 673/673, kræves. Den nye statiske regression forbyder 95 %-formlen, og #3094-replay stopper korrekt på 622/673.
- Commit `9e2164b8` og #32139054129 beviser det centralt: regressionen passerer, auditten skriver “622/673; alle 673 kræves”, og releasegate/Supabase/Pages springes over.
- GitHub leverede ingen automatisk keepalive før næste DMI-save; #32139755594 fandt derfor den private Copernicus-cache væk igen. Produktionsworkflowet har nu en restore-only pre-DMI-refresh uden rå log/upload. #32140001424/#32140470201 har genopbygget 11/12 UTC og to-timersbeviset; næste DMI-/pilotkontrol skal bevise, at dette lukker LRU-hullet.
- `b6cf0383`/#32140865173 lukkede DMI-delen af beviset: cache-hit før DMI, ny 2,905-GB DMI-save, Copernicus-cache stadig til stede, begge nye regressioner grønne og fortsat 622/673-stop uden deploy. #32141443152 ramte samme cache bagefter. Næste naturlige pilot skal bevise, at historikken også udvides videre.
- Manuel aktuel-time-pilot #32141772134 har allerede udvidet den sikkert til 1.887 records ved 11/12/13 UTC uden grid-/lagskift eller supportlæk. Første nye naturlige schedule-event efter rettelsen er stadig et særskilt åbent driftsbevis.
- Den private syvdøgnsgrænse er nu også dækket af normal releasevalidering: præcis 168 timer, deduplikering, beskæring af ugyldige restoreposter og fail-closed kontrol af nye lokale samme-tid/celle/lag-U/V-poster. Det naturlige fulde syvdøgnsvindue er fortsat åbent og må ikke erklæres bevist af fixturetesten.
- `7f22e8e1`/`#32143798560` CI-verificerede retentiontesten og den fortsatte 673/673-kontrakt; den faktiske 622/673-audit stoppede før Supabase/Pages, og Copernicus-cachen overlevede DMI. Næste bevis er naturlig schedule-/syvdøgnsdrift.

### Historiske mellemtrin – ikke aktuelle opgaver

- 4.0.230/4.0.228 nedenfor er historiske mellemtrin, som er erstattet af den produktionsverificerede 4.0.233. #2872 viste dengang, at Havknude havde gyldig NSBS-strøm 2,804 km væk, men blev blokeret af det gamle fælles havmodelvalg, fordi IDW var valgt til skalare felter 5,131 km væk.
- Strøm vælges nu pr. native tid på tværs af alle aktive DKSS-collections, uafhængigt af vandstand/temperatur: nærmeste komplette U/V-kolonne først, dybeste lag i samme kolonne bagefter. Parser v18/semantik v3 genopbygger gammel strøm selektivt.
- RavScore, administratorpunkter, 5-km-grænse og geografisk gate er uændrede. Havknude-regressionen og berørte målrettede tests består; fuld lokal og central produktionsvalidering mangler.
- #2872 fortsatte privat rotation til cursor 240 med 873 prøver/469 ankre/179 dele. 36 af 77 offentlige mangler var besøgt: én pipelinefejl ≤5 km, 4 ved 5–6 km, 5 ved 6–8 km, 23 over 8 km og 3 uden observeret U/V; 41 afventer rotation.
- 4.0.229 var den første kandidat, der rettede “dybeste lag globalt” til “nærmeste vandkolonne først, dybeste lag i samme kolonne” og håndhævede højst 5 km, men dens globale havmodelvalg var stadig utilstrækkeligt.
- Samme aktuelle samplingpunkt, U/V-koordinat, forecasttid og dybdelag kræves gennem bulkcache, forecast, score, provenance og pil. Gamle strømdata invalideres, og direkte ForecastEDR-strøm uden samme bevis, Open-Meteos overfladestrøm samt anden fallbackstrøm lukkes ude før historik, scoring og kort.
- Dybdelaget vælges pr. native forecasttid; interpolation kræver samme lag, celle og run. Pilen bruger den valgte times egen celle. Centralt reviewede kystdelspunkter bygges før DMI, og cache genbruges kun for uændrede samplingpunkter.
- En privat syvdøgnscache genbruger DKSS ved 0/5/15 km og flere lag uden score- eller public-runtimepåvirkning. Helhedsmodellen er permanent gemt i DEC-0040 og DEC-0029.
- #2853–#2855 gentager 187/210 verificerede hovedzoner og 596/673 lokale kystdele. #2855 har 20.924 verificerede timer, 3.856 `non-dmi-current`-timer og nul kendt pil/grid-mismatch blandt verificerede poster. De 23/77 rester er `null` uden pil.
- Den private cache har 491 prøver for 153 ankre/58 dele og er fortsat 168 timer, score-neutral og ikke offentlig. #2855 tilføjede ingen dubletter fra det uændrede modelrun.
- #2855 afdækkede, at cursoren ikke gik videre på `unchanged-valid`, og #2859 beviste LRU-gabet ved cursor 90/491 prøver/58 dele. Efterrettelsen er nu bevist: #2863 brugte tre bootstrapfiler/29,8 MB og nåede cursor 105/531 prøver/73 dele; #2864 genbrugte samme tre filer med nul download og nåede cursor 120/573 prøver/88 dele; #2866 fortsatte til cursor 150/667 prøver/118 dele. Alle var score-neutrale og ikke-offentlige. DMI's aktuelle STAC-href er efterkontrolleret som stabil; objektsti-ID er fremtidssikring.
- Rotationens coverage-audit registrerer afstand/koordinat/lag til nærmeste eksakte fælles U/V-kolonne uden at gemme fjerne U/V-værdier. Den private ejeroversigt skelner ≤5 km-pipelinehul, 5–6 km rent manuelt geometrireview, 6–8 km modelhul og >8 km strukturelt modelhul. #2869 beviser nul `uMps`/`vMps`, cursor 195, 755 prøver/157 dele og 11 målte af de 77 aktuelle mangler: 2/4/5 i de tre afstandsklasser; 66 afventer rotation. Den flytter aldrig punkter.
- Produktionsgaten er ikke sænket. 4.0.229 er ikke deployet; næste beslutning er fortsat punktrettelser til fuld dækning eller en udtrykkelig fail-closed deldækningspolitik.

- 4.0.228 er produktionsverificeret i #31913779486/#2835 på commit `93b8c0216821d02bf913f7aab369406ba2365fe9` med central adminhydrering, frisk DMI, fulde gates, Supabase og Pages.
- Fra zoomniveau 9 viser kortet flere lokale vind- og strømpile, men kun ved kystdelenes egne eksakt parrede DMI-U/V-gitterpunkter. Vindkilden kan være HARMONIE eller den faktisk anvendte DKSS-`wind-tail`-serie og mærkes særskilt.
- Fjernzoom bevarer hovedzonernes oversigtspile. Fallbackankre og kunstige kopier må ikke skabe ekstra tæthed.
- Den fulde detaljepakke opdaterer automatisk pilelaget. DMI-værdier, forecast, RavScore, historik og geometri er uændrede.
- Produktcommit `bb1892e4072deb77dbc83a203587221c666013d2` førte først til #2830: forsøg 1 stoppede på en delvis Limfjordshentning med 629/673 lokale strømpunkter; forsøg 2 nåede 670/673, men stoppede før Pages på gentaget Supabase `57014`.
- Artifactauditten fandt derefter, at DKSS-`wind-tail-u/v` ikke blev ført til lokale vindpunkter. Commit `93b8c021` rettede transporten. #2835-artifact og livefiler har 670 eksakte strøm- og vindpunkter uden mismatch, 461/544 unikke gitterpunkter og matchende manifesthashes.
- Livebrowseren havde nul konsolfejl og viste 54 pile på oversigten mod 87 efter to zoomtrin.

## Ejerens parallelle arbejde

- Ejeren har afsluttet den landsdækkende gennemgang af land-/vandpunkter og vandstandskilder. De centralt godkendte værdier er autoritative og hydreres før hvert frisk produktionsbuild.
- Fem-døgnsdækning og historikanalyse er midlertidigt udsat, indtil mere naturligt datagrundlag er opsamlet. Dataopsamling og eksisterende gates fortsætter; intet må bagudfyldes eller skjules.

## Første opgave i næste chat

1. Forsøg Browser-pluginet og diagnosticér native-host/trusted-code-path målrettet. Hvis det fortsat fejler uden en konkret reparationsvej, brug Chromium/Playwright som ejer-godkendt fallback.
2. Gennemfør derefter den systematiske online DOM-/kliktest af kort, farver, pile, vinderområde, beskrivelser, score og debug for alle 210 zoner og 673 kystdele. Flyt eller omskriv ingen land-/vandpunkter som led i testen.
3. Fortsæt samtidig den godkendte syvdøgnsovervågning højst dagligt uden at tage siden offline. Dokumentér kun nye milepæle eller reelle fejl; log aldrig rå U/V eller credentials.
4. Bevar normalrækkefølgen DMI ≤5 km → Baltic ≤5 km → AMM15 ≤5 km → kun otte ejerallowlistede `dkss_lf`-proxyer ≤15 km, eksakt samme tid/celle/lag og præcis 673/673. Ved reproducerbar dataintegritetsfejl bruges `dmi-only-rollback` gennem fulde gates.
5. Når det naturlige 168-timersvindue er afsluttet, dokumentér slutbeviset i RDKS og vælg derefter næste særskilt godkendte roadmapopgave. Fem-døgnsdækning og den store RavScore-/strømfeltsanalyse er fortsat udsat, indtil datagrundlaget er tilstrækkeligt.

## Beskyttede beslutninger

- Ét autoritativt land-/havpunktpar pr. aktiv kyststrækning; bugtede kyster vurderes repræsentativt af ejeren.
- Flere kortpile kræver flere faktiske dokumenterede DMI-gitterpunkter; pile må ikke kopieres eller flyttes.
- Central adminstatus er autoritativ, `missing` forbliver `missing`, og ingen gate må svækkes for at få grønt.
- Kritisk arbejde udføres med GPT-5.6 Sol og Ekstra høj indsats.
# DEC-0030-status 2026-08-20

Aktiv kodekandidat retter verifikationsmaerket i timeskarp historik: brug `productionReferenceAt`, fallback til `generatedAt`. Produktionsbevis `#3242` har 64 raa proever/30,903 timer, men falsk fastlaast verificeret spaend paa 22,563 timer. Maalrettede tests er groenne; frisk central produktion skal eftermaales. Se `docs/research/P1_HISTORY_REFERENCE_FIX_4.0.237.md`.

Kandidaten ligger i draft-PR `#1`. Featuregrenen har ingen automatiske PR-checks; den er ikke paa `main` og ikke produktionsverificeret.

Produktionskoersel `#3237` er maelt read-only. Nye WAM 18Z- og DKSS 12Z-cyklusser er dokumenteret; HARMONIE 12Z er kun delvist indfaset. 4.0.232's kompatible `controlled-live`-historik har 28,903 timer og maa fortsat opbygges naturligt til 72 timer. Ingen kilde-, fallback-, score- eller geometriaendring er godkendt. Se `docs/research/P1_COMPONENT_TRANSITIONS_4.0.237_RUN3237.md`.

