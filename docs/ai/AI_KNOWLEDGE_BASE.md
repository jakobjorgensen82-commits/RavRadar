# AI Knowledge Base – RavRadar

## Nyeste sandhed 2026-09-03 – reel integrated public closure

- Backendrun `33736292211` stoppede sikkert før eksterne writes og offentlig ændring: 44-filers bundlen manglede de direkte public consumers `rav-assistant.js` og `trip-evidence-public-adapter.js`. Candidate G er fortsat den eneste offentlige model.
- Begge er nu direkte bundleentrypoints. Integrated er lokalt `a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b`/`d5796289f645f1bcab6b4fe822c5ed6b0e919321013687302feb2139e814a286` over 55 filer, og actual-source-testen attesterer den faktiske 78-modulers browserclosure. Måltests er grønne. Candidate G-rollback `7c7f2b…`/56 er uændret; `3192db…`/44 er historisk.
- En læsende live Supabase-kontrol gav `false/false/false` for migration ledger og begge nye RPC'er. Migrationerne er ikke live. Linked migrationsliste/dry-run forbliver stopgate før writes. Secretværdien er ikke læst; passwordet må ikke gættes eller nulstilles uden konkret authfejl/ejerhandling.

## Nyeste sandhed 2026-09-03 – tofasede første aktivering

- Fase A merger 4.0.320-koden med Candidate G fortsat som eneste offentlige model. Push, schedule, watchdog og almindelig manuel vejrdrift vedligeholder kun Candidate G; legacy føres gennem den eksisterende bro til current moderne Candidate G på samme head. Fase A må ske før 673 × 118-beviset, så cron kan opbygge den korrigerede cache på den mergede kode.
- Fase B er en særskilt manuel operation med både `ravscore_integrated_first_cutover=true` og `EXECUTE-INTEGRATED-RAVSCORE-FIRST-CUTOVER-AFTER-CAPACITY-GATE`. Før DMI kræves den forseglede centrale Fase-A-identitet med exact current Candidate G-binding, manifesthash, dataset/reference, deployment-id, implementation closure og `sourceHead`; live public manifest/implementation genverificeres først i deployleddet før begin-CAS eller central modelmutation.
- 673 × 118, Feggesund og DEC-0114's live Supabase før/efter-bevis med mindst 30 procent reserve blokerer Fase B, ikke Fase A. Tokenen er kun operationsautorisation. Gamle forseglede planer/recovery bevares; nye direkte rowless/legacy→integrated-planer er forbudt.
- Låsen er lokalt implementeret og måltestet, men endnu ikke commit'et, pushet, exact-head-verificeret, merged eller live. Candidate G er fortsat offentlig; modelbundles/hashes, geometri og punkter er uændrede.

## Nyeste sandhed 2026-09-02 – 4.0.320 DMI-gridgenbrug

- Exact-head `33627490090` er grøn. Preflight `33632361928` beviste DMI-terminalen og afgrænsede 7.889 operationelle Copernicus-restpar, men eksponerede all-or-nothing shardpersistens. Validerede shards checkpointes nu privat og uforseglet; ét 1.200-sekunders forsøg pr. run efterlader tid til failure-save, og næste run fortsætter kun resten. Frisk 673 × 118-bevis mangler.

- DMI leverede DKSS-assets i de isolerede preflights. Flaskehalsen var lokal: high-level nearest-opslag genopbyggede samme messagegrid titusinder af gange. 4.0.320 genbruger ét low-level ecCodes-handle pr. GRIB-message og aktiverer først `SAME_GRID` efter et vellykket første opslag.
- Intern processed cache bindes til gridgeneration 9, `md5GridSection` samt ecCodes API-/bindingsversion. Den offentlige legacy-griddefinition, målt historik, provenance, state, checkpoint og recovery beholder deres identitet. Required U/V+vandstand er fortsat timevis; optional DKSS-felter tretimers.
- Bounded checkpoint sker ved afsluttede assets senest 8/60 sekunder og forced ved interruption, collectionslut og exception. Spatial-first, fælles celle/lag, 5 km, missing, DMI-first og Copernicus exact-gap er uændrede. Main-run `33591129416` stoppede før deploy på gammel main's tekstlige gridmetadata; lokal numeric-only parser og måltests er grønne.
- Åbne beviser er exact-head, 673 kystdele × 118 timers currentpreflight, separat Feggesund tre dele × 118 timers wave-ledger, merge, fuld produktion/aktivering og offentlig desktop/mobil. Candidate G er fortsat offentlig.

## Nyeste sandhed 2026-09-02 – Feggesund

- DEC-0114 har nu én fast, lokalt implementeret direct-first bølgeundtagelse for `DK-B05-11`: direkte lokal DMI-WAM vinder altid; kun når hele `Hs`/periode/mean-FROM-tuplen mangler, må komplette same-run DMI-tuples fra både `DK-B05-10` og `DK-B05-12` danne en 50/50 energikonsistent proxy. En delvis lokal tuple eller én manglende/afledt nabo stopper fail-closed.
- Proxyen bærer `LOW`/`MODERATE`/`HIGH` usikkerhed og fast DA/DE/EN-advarsel. Enhver score, som faktisk bruger den, har `calibrationEligible=false` gennem mode, zone, public, tur og observation, også ved ellers `FULL_HISTORY`. Direkte timer følger den normale historikregel.
- Dette er hverken current-, historik- eller recovery-backfill, en ændring af geometri/punkter/kystnormal eller en lokal surfzonemodel. Release kræver privacy-safe 3 × 118 med direct + proxy = 354 og missing = 0; fuld produktion og offentlig kontrol afventer. Gældende 4.0.320-slutbundles er forseglet og lokalt måltestet: integrated `a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b`/`3192db304a6e613059cd66d1ae983583c3aaff832293bda978cdc03991bb49c3` over 44 filer/8 deklarerede forbrugere; Candidate G-rollback `c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8`/`7c7f2b4950b4ce7a04d560dde15dd93e408e045ca5e9ed4f9be33eac0255e89d` over 56 filer. Exact-head `33577887262` fandt en sikker Candidate G-rollbackregression på den historiske 4.0.319-head; fem-validator-rettelsen og fire måltests blev grønne, mens ny 4.0.320-exact-head afventer.

## Nyeste sandhed 2026-08-31

- PR #236: exact 4.0.316/Candidate G på `c58deb78`; exact-head `33342157517` og post-merge `33342219152` er grønne. `33345476979`/`rr-20260831010337-210` var første recoverybevis. Det tidligere external-watchdog-`workflow_dispatch` `33347230240`/`rr-20260831012407-210` bestod fuld DMI/validate/releasegate/storage/Pages og er 210/673, `VERIFIED_ONLY`, uden syntetiske samples; Candidate G er 0/210 aktiv på grund af historikmemory. Visuel mobil/desktop er ikke afsluttet. `33343469247`/`33344823000` var transient-503-stop uden deploy; bounded retry-hotfixen er produktionsverificeret gennem PR #237, exact-head `33352520408`, merge `8c03e25d`, backend `33352661061` og fuld produktion `33352634365`; automatisk run `33354263148` publicerede `rr-20260831034128-210` komplet 210/673.
- Controller-v4 = exact 30 felter, fire statusser, seks transitionstyper. Historical Candidate/integrated H0→H1 kræver atomic ACTIVE controller+profil, exact 11-feltsbinding, immutable plan og begin/complete/abort. Direct Candidate→integrated bruger IntegratedReturnPlan. Ordinary paths accepterer kun current binding.
- Pages source-abort kræver NOT_STARTED. Ambiguous source-visible = exact sealed target-redeploy + non-Pages finalizer; recoverydeployment er næste source-lineage. Unknown/mixed/third/tamper/stale/missing plan stopper.
- State 6: 118 timer scorebare som `HISTORY_INCOMPLETE` ved gyldige direct inputs, timevis `UNAVAILABLE` ved direct missing. Outcome v2 og P2-assistent/plain-language er lokalt implementeret og måltestet; ny exact-head/produktion/browser er åbne releasegates. Gældende 4.0.320-slutbinding er integrated `a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b`/`3192db304a6e613059cd66d1ae983583c3aaff832293bda978cdc03991bb49c3` over 44 filer/8 consumers; Candidate G-rollback er `c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8`/`7c7f2b4950b4ce7a04d560dde15dd93e408e045ca5e9ed4f9be33eac0255e89d` over 56 filer. 4.0.320 er lokal og ikke offentlig.
- Ét aktivt 15-minutters kontroljob er diagnose-/reparationsspor for vejrdrift, ikke ny scheduler eller dubletvagthund; ingen blind redispatch af kendt fejl.

## Aktuelt DEC-0113-checkpoint – 4.0.319 attesteret measured-only first cutover

- Offentlig model er fortsat 4.0.316/Candidate G. PR #235/exact-head `33332106627` blev merged som `a584d1cf`, men produktion `33333490853` stoppede sikkert før DMI, protected writes, artifact og Pages, fordi 0 READY/673 kanoniske warmupstates blev behandlet som invalid migration. Det er ikke et modeldeploy.
- Source-attestation, migrationsegnethed og aktiv samplingkontekst er separate. Public Candidate G manifest/conditions/source-register valideres som én 210/673-enhed på isoleret sti. Det aktive register materialiseres efter central adminhydrering og må ikke omskrive source eller flytte geometri/punkter.
- 673 READY + samme source/active stateKey-context + ét target giver migration. Komplet canonical warmup eller legitim contextændring giver national `genuine-cold-start`. Invalid/tampered/ukendt source stopper. Cold start kræver aggregate `source_validated=true`, og en afvist integreret continuation/checkpoint må ikke maskeres.
- Integrated cold replay bruger kun faktiske private, verificerede 0–48 timer plus reel target og giver `HISTORY_INCOMPLETE`; Candidate G-rollback bygges separat measured-only og skal selv blive 48-timers READY. Ingen syntetisk historik, interpolation, zonelån eller carry-forward.
- Bootstrap-UTC er canonical uden millisekunder og Node→Python-testet. Ikke-annulleret reel DMI-cacheprogression bevares privat. **Initiatorleddet i dette ældre 4.0.319-checkpoint er supersederet 2026-09-03:** alle almindelige jobs, også push, vedligeholder Candidate G; kun den særskilte manuelle Fase B kan initiere first cutover.
- Botrun `33334709027` og pilot `33335078275` var sikre røde stop uden Pages/offentlig mutation. 4.0.319's endelige transitive modelbinding og releasebevis er pending; brug ikke 4.0.317-hashene som bevis for den færdige hærdede head, før bindingsgeneratoren er kørt.
- Der påstås ikke empirisk bedre fundpræcision, og ingen geometri, kystnormal, land-/vandpunkt, private payload, koordinat eller rå U/V ændres eller eksponeres.

## Aktuelt DEC-0110/0112-modelarbejde – state 6 er ikke udgivet

- Offentlig 4.0.316 bruger fortsat Candidate G. Den lokale efterfølger er `RRS-COASTAL-PROCESS-INTEGRATED-1.1.0`/state `6.0.0` med bounds-v5, direkte input→`UNAVAILABLE`, historikmissing→konservativ `HISTORY_INCOMPLETE`, 48 h aktiv currenthistorik, 168 h score-neutral researchretention og 288/40 h conservative tail closure. Den gældende 4.0.320-binding er `a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b`/`3192db304a6e613059cd66d1ae983583c3aaff832293bda978cdc03991bb49c3` over 44 filer og 8 bindingsforbrugere. Candidate G migreres via v5, schema 5 er kun den aldrig-offentlige eksakte 5→6-kilde, og rollback er v3 med separat READY companion samt forseglet 56-filers binding `c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8`/`7c7f2b4950b4ce7a04d560dde15dd93e408e045ca5e9ed4f9be33eac0255e89d`.
- Ejeren opgav den fiktive morgenhulsrekonstruktion før descriptor, apply, mutation eller publicering. DEC-0109 bevares kun historisk; bestil ikke ny incident-inspect/apply og overfør aldrig interpolation til den integrerede model.
- Kandidaten er pending exact-head, merge, frisk produktion/deploy og offentlig 210/673 desktop-/mobilkontrol. Den må ikke kaldes offentlig eller empirisk mere fundpræcis. Offentlig `rr-20260830091913-210` var frisk 210/673, men Candidate G gav 0 aktive/210 `UNAVAILABLE` på grund af utilstrækkelig currenthistorik; det er regressionsevidens, ikke state-6-bevis.
- State-løs recovery bruger `bounded-private-48h-history-cold-replay-v3` med eksakte expected/complete/unknown-counts og transition. 48/48 dokumenterer et fuldt currentvindue, men er stadig `HISTORY_INCOMPLETE` indtil 288-timers wave-tail closure. Checkpointschema 4/cache-v2 med atomisk READY companion er implementeret. Under manuel Candidate G-rollback må kun eksakt `READY`/`memoryReady` Candidate G projicere sin egen mode-score som exact full-history med collapsed bounds/coverage 48; `calibrationEligible=false` består. Trip-bounds-persistens er lukket lokalt gennem klient/DTO/Edge/SQL. Den daværende 4.0.317-matrix var grøn; 4.0.319-deltaet kræver en ny fuld slutmatrix.
- Feggesunds tidligere direct-only hypotese er supersederet af DEC-0114's eksakte, lokalt implementerede bølgeadapter. Den ændrer ikke hovedreglen om direkte input: kun hele den lokale tuple må mangle, begge faste DMI-naboer skal være komplette og same-run, og alle andre mangler forbliver `UNAVAILABLE`/fail-closed. 3 × 118 er stadig et åbent releasebevis, ikke en påstand om empirisk fundpræcision.

## 4.0.316 – fraværende fallback er ikke det samme som ugyldig primary

- PR #233/exact-head `33299676128` og merge `63d789a4` pensionerede den stale D1-interlock. Run `33299747300` startede build og stoppede først ved fallbackstaging; det er rødt årsagsbevis, ikke et deploybevis.
- En fallback er en valgfri reserve for en frisk measured-only primary. Ingen kandidat inden for 72 timer og prognosehorisonten skal give eksplicit fravær, ikke blokere current+fem døgn.
- Gammel/udløbet fallback må aldrig vises eller blive hængende i manifest/public files. Malformed fallback eller uventet primary accounting/audit er fortsat fejl og må ikke forveksles med forventet fravær.
- `HISTORY_INCOMPLETE`, public fallback og direct-input-availability er tre separate akser. Den kommende model scorer current+fem døgn ved gyldige direkte input med tydelig DA/DE/EN-advarsel og `calibrationEligible=false`; manglende direkte input er `UNAVAILABLE`.
- Optional recovery må aldrig skabe interpolation eller syntetiske data. 4.0.316 er den produktionsverificerede offentlige baseline; den friske offentlige regression `rr-20260830091913-210` beviser 210/673 med 0 aktive zoner og 210 `UNAVAILABLE` under utilstrækkelig sammenhængende currenthistorik, ikke state-6-adfærd.

## Historisk 4.0.315 – en grøn no-op er ikke frisk produktion

- En workflowstatus kan være grøn, selv om et readiness-job har sat `ready=false` og alle produktionsjobs er skipped. Verificér derfor altid build, fuld validate, releasegate, artifact og Pages som faktisk kørte trin.
- Den tilbagetrukne DEC-0109-operation efterlod et umuligt apply+Pages-prerequisite. Det gjorde normale 4.0.314-kørsler grønne no-ops, mens public primary blev >8 timer og measured-only recovery >72 timer.
- Ingen descriptor, apply eller syntetisk data fandtes. DEC-0111 pensionerer aktuator, descriptor og interlock i 4.0.315; normal drift er measured-only, og manglende historik forbliver manglende.
- Bevar defensive reconstruction-trust/schema/turkvalitetslæsere fail-closed. De er inputklassifikation og kompatibilitet, ikke en actuator.
- Et P0-retirement er først lukket efter exact-head sourcegate, merge, faktisk frisk produktion med fulde gates og offentlig kontrol af aktuelle og femdøgnsprognoser.

## Historisk 4.0.314 – cadenceidentitet kommer fra policy, ikke suffixafstand

- Candidate G's maksimumsgab på tre timer er en continuityregel. På en autoritativ 1h-del kan observerede eksakte 2/3h-afstande være manglende native slots; de er ikke en ny cadence og må ikke automatisk udfyldes.
- Den eksisterende regionale proxy-policy identificerer præcis de otte ejerautoriserede `dkss_lf`-dele med native 3h. Brug per-del-identiteten og behold 665/8 som separat populationgate; en total alene kan ikke opdage et identitetsbytte.
- Inspect må kun hashbinde en koordinatfri projektion af de relevante policyfelter og sorterede del-id'er. Apply genberegner både policyprojektion og hele planen og kræver kanonisk descriptor-/target-CAS.
- En policyklassificeret 3h-del kræver mindst to eksakte 3h-intervaller på både før- og targetkanten. Kun derefter er singleton-`AFTER` tilladt. En 1h-del kræver eksakte heltalsafstande i `{1,2,3}`; nonintegral eller >3h stopper.
- Interpolationens domæne er fortsat kun incidentets forseglede venstre/højre bracket. Et andet manglende punkt i en ellers lovlig suffix forbliver manglende, og finalt 48h non-restart replay skal stadig være `READY`.
- Live-inspect `33279639424` viste kun `ONE_TIME_GAP_AMBIGUOUS_NATIVE_CADENCE` og stoppede før descriptor/mutation. Det er årsagsevidens, ikke bevis for gennemført rekonstruktion.

## Historisk 4.0.314 – et højreanker er ikke et cadencebevis

- En gyldig målt after-state kan have ét punkt og stadig reproduceres som schema-2.0 `WINDOW_INCOMPLETE`; punktet kan være det eksakte højre bracket uden at bevise kadencen alene.
- Tillad aldrig globalt minimum ét. Kun `AFTER` kan bruge singleton, og kun når before+target hver leverer mindst to enstemmige intervaller og uafhængigt beviser native 3-timerskadence.
- Target skal indeholde samme målte afteranker med eksakt tid og strength. State-replay, seks-timers bracket, sourceartifact, descriptor og apply-CAS er separate beviser og må ikke sammenblandes.
- Backend-readiness og rekonstruktionsreadiness er forskellige. 4.0.313's grønne D1-run gjorde ikke det efterfølgende fejlede inspect til succes.
- En normal schedule kan overhale inspect/apply, hvis D1 alene åbner Pages. Kræv derfor et vedvarende exact-head apply+Pages-bevis for normal produktion, men lad inspect/apply passere efter D1, og bevis en eksplicit senere version uden permanent lås.
- Hele hvert GitHub run-/jobsvar skal parse- og shapevalideres samlet før id-iteration, og fælles concurrency må aldrig lade et indkommende push annullere en kørende apply.
- En fuld-produktionsregression er også en PR-gatekontrakt. Hvis testen kun findes i `npm run validate`, kan exact-head source være grøn og frisk produktion stadig stoppe. Gør derfor testen direkte nåelig fra `validate:source` og lås semantikken — her præcis én `cancel-in-progress: false` — frem for en historisk tekstliteral.
- Inspect `33275438494` beviste, at exit 1 alene ikke er en brugbar privacykompatibel domænefejl. Under GitHub Actions må rekonstruktions-CLI'en kun annotere /^ONE_TIME_GAP_[A-Z0-9_]+$/ ved fejl; alt andet bliver `ONE_TIME_GAP_SANITIZED_FAILURE_UNAVAILABLE`. Ved succes er kun descriptor-SHA og de validerede affected/synthetic/1h/3h-optællinger tilladt. Hent ikke fuld joblog eller artifact for at omgå dette.

## 4.0.313 – nullable JSON og bladprojektion er en versionsgrænse

- Et JSON-dokument med kendte `null`-blade og et PostgREST-bladselect uden disse blade kan være samme historiske kilde, men får forskellig kanonisk hash.
- Denne lighed må aldrig løses med generel tolerant JSON-sammenligning. Kun migration→migration må bruge en eksplicit versioneret projektion efter stored selvhash, ejer/id/shard, schema, privacy og eksakt non-null/core-lighed.
- D1-row og registry er historisk evidens og omskrives ikke for at matche den nye projection. Missing registry må kun repareres med gammel verified hash.
- Privacy gælder både input og readback. Et ukendt schema-v2-topfelt må ikke bortfiltreres, heller ikke når det er null.
- Response-body er ubetroet data. Både fejlede og succesfulde malformed gateway-svar skal blive faste lokale fejl uden bodyudsnit.

## Historisk DEC-0109 – aldrig anvendt og operationelt erstattet af DEC-0111

Ejeren opgav udførelsen, før der fandtes descriptor, apply, mutation, artifact eller offentliggørelse. Afsnittet nedenfor beskriver derfor kun den bevarede negative trust-/rollbackkontrakt, ikke en åben operationsplan.

- Et komplet aktuelt vejrdatasæt kan godt have ufuldstændig Candidate G-memory; aktuelle vejrdata og 48-timers transportbevis er forskellige sandheder.
- Den historisk godkendte rekonstruktion for incident `RRGAP-2026-08-29-CANDIDATE-G-01` blev trukket tilbage før descriptor/apply og må ikke eksekveres. De følgende punkter beskriver kun den defensive klassifikation, som ældre eller ukendt input fortsat skal møde fail-closed.
- Målt state er schema 2.0.0. State med levende rekonstrueret prøve er schema 2.1.0 og skal bære trust helt ud i mode, diagnostik, startup/detaljer, manifest/hash og turbinding. Ældre/ukendt kode skal afvise den fail-closed.
- Rekonstrueret transportmemory kan være teknisk READY, men `calibrationEligible=false` og `hardObservedOuttransportEligible=false`. En rekonstrueret passage af +10/-8/13-timersmekanikken er ikke observeret bevis for faktisk udtransport.
- Inspect er read-only og descriptorforseglet. Apply er source-/mål-CAS-bundet og skriver privat rollback først. Cleanup fjerner kun incidentets syntetiske prøver, bevarer nyere målinger og vender tilbage til schema 2.0/warmup.
- Last-verified offentlig nødvisning er målt-only. Ture fra nødvisning eller rekonstrueret score gemmes som erfaring, men må aldrig indgå i kalibrering.
- Fravær af de nye trustfelter er ikke bevis for measured-only. Aktive/pending schema-v2-ture fra før 4.0.311 bevares som `ravscore-evidence-trust-unattested` med `calibrationEligible=false`; migrationen må ikke slette brugerens tur eller lade den fail-open til kalibrering.
- Allerede persistérede pre-4.0.311 schema-v2-observationer backfilles, omskrives eller slettes ikke. Prediction-/kalibreringsforbrugeren er den konservative migrationsgrænse: en række kan kun medtages ved `calibration_features.appVersion >= 4.0.311`, eksplicit `calibration_eligible=true` og eksakt attesteret `data_quality_flags=[]`; alt andet udelukkes lokalt uden databaseændring.
- Tripmigration/readback må kun se en eksplicit server-side bladprojektion. `select=*`, hele fri-form-JSON, lokation/GPS, geohash/UTM, rå U/V, fri tekst/billeder og ukendte/private ekstrakolonner må ikke komme ind i runner-memory. Owner-id bruges kun kortvarigt til HMAC og logges ikke.
- Ti D1-shards deler én atomisk global registry for id/ejer/hash/målshard. Ejer-sletning skriver en global tombstone før rows/registry fjernes, så samtidige og senere writes stoppes.
- Efter capacity/CAS identificerer current-run Edge-predeploy-intent installationstypen. Existing D1 bruger 20-minutters lease/30-minutters max, femsekunders prober, dobbeltattestation, drain, 600 sekunders restlease og samlet syvminutters Worker-gate; partial Edge går D1 roll-forward. Fresh partial Edge før activation går exact-main-bundet til Supabase-secret, eksakt Edge-redeploy og dobbelt Supabase-attestation. Uden intent ved capacity/pre-CAS-fejl sker nul recoverymutation.
- `calibration_eligible=true` er ikke et serverbevis mod signeret public manifest. Det er en udelukkelseslås, ikke empirisk evidens, og må ikke åbne global koefficientlæring.
- Den næste samlede RavScore-model skal bevare provenance, trust, migration, tripbinding og cleanup, men interpolation må ikke blive dens normale missingregel.
- Den næste models nødvej skal være målt-only og atomisk 210/673 med eksakt model/state/hash, højst 72 timer og kortere forecastudløb, DA/DE/EN-advarsel, non-calibration trips og automatisk frisk primary.

### Historisk 4.0.312-roll-forward-checkpoint 2026-08-29

4.0.311 bestod PR #224 exact-head CI `33263734108` og blev merged som `7c168b00af535415117c968a8c021a493b083137`. Push-run `33263858078` var en korrekt grøn no-op uden artifact eller Pages. Backend-run `33263892151` nåede den atomiske SQL-forespørgsel, fik HTTP 201 og fejlede derefter på en flad `pg_get_constraintdef`-regex, som ikke tolererede PostgreSQLs ekstra parenteser omkring den kanoniske JSONPath.

Den højt sandsynlige databasetilstand er samlet commit af CHECK, validering og kommentar; transaktionens eneste atomiske alternativ er fuld rollback. Ingen observationpayloads blev hentet til runneren, logget eller ændret, ingen row mutation forekom, og D1, Edge, Worker, sync, vejr, artifact og Pages blev ikke nået. Offentlig version er fortsat produktionsverificeret 4.0.310, og incident-rekonstruktionen er ikke anvendt.

Den lokale 4.0.312-verifier udtrækker strukturelt præcis én JSONPath-literal, tolererer parentesering, kræver den eksakte kanoniske path og afviser reorder, duplicate, extra og ambiguous. Dette historiske checkpoint blev efterfølgende lukket gennem PR #225/exact-head `33266087776`, merge `a5ece10d` og no-op push `33266184326`. Backend `33266229687` bestod verifier-, D1-, Edge- og Workerleddene, men fejlede migrationssynken og er ikke readiness. Det resterende arbejde er operationelt flyttet til det aktuelle 4.0.314-checkpoint øverst; rekonstruktions-inspect/apply, frisk produktion og offentlig verifikation er stadig ikke udført. Trip protocol/header og den konservative observationsgrænse forbliver 4.0.311.

## Produktions- og driftsverificeret 4.0.310 – ekstern og intern stilhedsgrænse er bevidst forskellige

4.0.309's første virkelige redningsgren blev udløst af vagt `33246369618` kl. 09:49 UTC og bestilte produktion `33246376992`. Da den foregående produktionsstart lå cirka en time tidligere, var den fælles 45-minuttersgrænse for konservativ som vedvarende erstatning for helt manglende native schedules.

Kun det autentificerede eksterne `external_watchdog=true` bruger derfor fra 4.0.310 mere end 15 minutters samtidig gammel runhistorik og gammelt offentligt manifest. GitHubs interne schedule-vagt beholder DEC-0085's 45 minutter. Begge veje afviser præcis grænsealder, aktiv/queued produktion, frisk runhistorik og friskt manifest og bestiller kun normal `force=false` under den fælles tunge concurrency. Datagates og Candidate G er urørte. Se DEC-0108.

PR #222/exact-head `33247789054`, merge `792648c3`, post-merge-produktion `33247839121` og offentlig `rr-20260829103233-210` er grønne. Det automatiske eksterne run `33248692042` beviste den mergede 15-minuttersgren og bestilte præcis én normal produktion `33248699516` efter fortsat native schedulerstilhed.

## 4.0.309-kandidat – ekstern schedule-vagthund uden dataadgang

GitHub forbliver normal scheduler. Den eksterne tjeneste kender kun repository, workflow, `main` og et boolsk watchdogintent og kan ikke se vejr, Candidate G-state, koordinater, rå U/V eller private data. Keepalive-workflowet foretager selv den eksisterende 45-minutters kontrol mod ufølsom workflowhistorik og det offentlige manifest. Direkte eksterne produktions- og pilotkald er fravalgt for at bevare eventsemantik, retry, cache og concurrency. Se DEC-0107.

## Historisk, aldrig offentlig modelstatus – state-5/4.0.315-releasekandidaten

Dette afsnit bevares kun som revisionsspor for state 5, som aldrig blev offentlig. Den aktive state-6-sandhed står øverst; de gamle v4-, schema-5-, exact-48- og rollback-v2-identiteter nedenfor må kun bruges som historisk regressions- og eksakt migrationskilde.

Den senest produktionsverificerede offentlige baseline er 4.0.310 med Candidate G som eneste offentlige model. Den lokalt implementerede efterfølger under DEC-0110 er én samlet 4.0.315-releasekandidat: `RRS-COASTAL-PROCESS-INTEGRATED-1.1.0`, state `5.0.0`, variant `COASTAL-SUPPLY-MOBILISATION-BOUNDED-WAVE-APPROACH-HUNTABILITY-2`, profil `cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-coldrestart-gapcredit1-lastmileewma4-atten15-v4`, komponent `ravscore-components-huntability-delivery-mobilisation-v4` og forklaring `ravscore-explanation-integrated-v4`. Slutdigests fastlåses først på den afsluttede head; exact-head, merge, frisk produktion og offentlig kontrol mangler, så lokal dokumentation eller test er ikke produktionsbevis.

Den integrerede kandidat bevarer 20/50/30, 0,03/0,15 m/s og +10/-8, men bruger 24 timers fuld strømvægt og cosinusfade til nul ved 48 timer. Bølgemobilisering følger `Hs² × T` med 4/48-timers forløb. Et stærkt fralandsforløb kan fortsat gøre supply/transportbeviset 0 efter cirka 13 effektive timer, men nulstiller ikke hele RavScore. Sidste mile bruger en kausal energivægtet `W/N/T`-EWMA med fire timers halveringstid og en ældre hale: DMI-WAM `FROM` roteres præcis én gang +180° til `TOWARD` mod den uændrede eksisterende kystnormal; `normalAlignment` er det energivægtede normalmoment divideret med aktivitet, `approach=clamp((normalAlignment+0,25)/1,25,0,1)`, `factor=clamp(1-0.15×W×(1-approach),0.85,1)`, og `delivery=supply×factor` anvendes præcis én gang. Bølger kan aldrig skabe/øge supply; maksimal rå totalscoredæmpning er 7,5 point før slutafrunding; vist RavScore kan derfor ændres 8 point. Aktiv retningsmissing fejler lukket. Kun `waveHeightM=0` er eksakt calm og neutral; `wavePeriodS` skal stadig være finit og ikke-negativ. `waveHeightM>0` med `wavePeriodS=0` er `INVALID` og fejler lukket.

Modelgridstrøm er ikke lokal bundnær strøm, undertow, feeder-/langskyststrøm eller ripstrøm. Faldende vand kan både ledsage søværts transport af noget mobilt rav og blotlægge eller gøre fastholdt rav bag revler lettere at afsøge; vandstand giver derfor 0 direkte point. Fysisk levering er fortsat uopløst, `physicalDeliveryResolved=false`, og fysisk interval er `null`. DDM's officielle 50 m-grid kan kun være statisk kontekst, fordi det ikke opløser dynamiske revler eller surfzoneprocesser; ingen kystnormal, geometri eller land-/vandpunkter flyttes. Rainville m.fl. 2026 er kun buoyant-object-analogi og ikke ravkalibrering. Modellen må beskrives som fysisk og teknisk forbedret, men ikke som empirisk mere fundpræcis uden repræsentative fund og nul-fund.

Første cutover bruger `candidate-g-schema2-signed-current-reweight-bounded40h-wave-approach-to-integrated-schema5-v4`. Den genvægter kun Candidate G's signerede, allerede afledte kystnormale currentevidens; rå U/V læses/kopieres ikke, og der påstås ingen rå genberegningslighed. Præcis 673 gyldige schema-2-states skal give ét fælles kanonisk target. Wave-approach bygges af 40 private præ-target-positioner fra ét sammenhængende DMI WAM-run pr. anvendt collection med same-cell native provenance; kun et gap på højst fire timer må interpoleres i identisk run/collection/grid/celle. Udeladt EWMA-hale er højst `1/1024`, og konservativ rå-scorefejl er højst `0.01171875` før afrunding. Mixed target, invalid state eller utilgængeligt run stopper fail-closed, så Candidate G forbliver offentlig; der dannes ingen syntetisk/offentlig historik. Ægte cold start er særskilt og kræver præcis 48 sammenhængende private verificerede timepositioner plus den reelle targetrække. Rollback `integrated-schema5-to-candidate-g-schema2-v2` beregnes fra samme targettid uden dobbelt recovery-credit. Normal fortsættelse bruger privat hashbundet runtime eller state-5-checkpoint; Pages får kun de fire offentlige schema-4-livefiler. Nøddrift må kun bruge en komplet atomisk continuation fra samme integrerede model i højst 72 timer eller kortere forecastudløb; cross-model fallback og interpolation er forbudt. Kun `VERIFIED_ONLY` er kalibreringsegnet; reconstructed/emergency og ture er ikke kalibreringsgrundlag. Candidate G bliver efter cutover kun privat migration-/offline-/rollback-orakel og kan kun igen blive offentlig gennem det manuelle, fuldt verificerede controllerforløb. Den tidligere planlagte fiktive morgenhulsudførelse blev opgivet før descriptor/apply/mutation/publicering; DEC-0109 bevares som historisk afgrænset sikkerhedskontrakt. Se DEC-0110 og de integrerede design-, evidens- og producent-/forbrugerdokumenter fra 2026-08-29.

## Produktionsverificeret 4.0.308 – naturlige sikkerhedsformuleringer

Den offentlige prøve viste, at den eksisterende kildebundne viden om hvidt fosfor var for snævert routet: “Hvad er hvidt fosfor på stranden?” manglede ordet rav og blev derfor afvist. DA/DE/EN-emnematchet genkender nu selve stofnavnet og naturlige strand-/fundformuleringer. Svaret, evidensklassen og den officielle Forsvaret-proveniens er uændrede; kun adgangsformuleringen er bredere. Se DEC-0106.

## Produktionsverificeret 4.0.307 – 152 kildeklassificerede lokale emner og rettet scopegrænse

Den ekstra høje audit erstatter antagelsen om, at seks nye emnefamilier var en tilstrækkelig breddeudvidelse. Et deterministisk katalog giver nu 152 DA/DE/EN-emner oven på de 17 eksisterende intent-kontrakter og testes med 456 katalogspørgsmål uden netværk eller AI-kvote. Hvert emne har evidensklasse og kilde-ID. De 27 offentligt registrerede kilder omfatter ekstern ravforskning, fagfællebedømt kystanalogi, officielle kyst-/sikkerheds-/regelkilder, RavRadars større forskningsgrundlag og Rav Jagt som navngiven praktisk ekspert. Specifik lokal viden vælges før brede standardsvar; dynamiske sted-/tid-/scoresvar bevarer deres Candidate G-vej.

Browser og Edge bruger Unicode-helordsgrænser, så `Skagen` ikke rammer det uvedkommende ord `kage`, og relevant specialviden har en bredere domænerute. Edge-pakken er udvidet fra 23 til 38 offentlige fakta, herunder geologi, saltation, koldt vand, identifikation, konservering, sikkerhed og aktuelle regelgrænser. Den versionsbundne Edge-UV-fakta bruger 395 nm. Providercredential, dataminimering, CORS, kvote, timeout, JSON/evidensvalidering og lokal fallback er uændrede. Se DEC-0105 og den eksterne researchaudit.

Den visuelle mobilprøve fandt en skjult afhængighed: UI'en ventede tidligere på prognosedetaljer før alle spørgsmål. `ravQuestionNeedsConditionDetails` begrænser nu denne venten til dynamisk bedste sted, bedste tid og score. Katalogsvar, sikkerhed og generel forskning svarer lokalt, selv når detaljefilen er utilgængelig.

## Historisk 4.0.306-kandidat

Det separate smårettelsesspor ændrer offentlig tekst/UI, Grundbogen og read-only Spørg RavRadar-viden. Aktiv UV-angivelse er 395 nm; koldt vand forklares tydeligere som mobiliseringsfaktor uden nyt scoreinput. Zonesøgning, pilesignatur, Rav Jagt-illustration og synlige BernsteinScore/AmberScore er tilføjet. Candidate G/modelsporet er urørt. Se DEC-0103.

## 4.0.291 – offentlig GPT-OSS kræver en dobbelt fail-safe grænse

Ejeren har givet særskilt aktiverings-go. Cloudflare-kontoen er verificeret som Workers Free / $0 med 10.000 neuroner pr. døgn og fejl efter loftet. RavRadar må ikke aktivere Workers Paid, prepaid AI Gateway eller anden betalt overflow. Den interne dagsgrænse på 300 providerkandidater er en ekstra buffer, ikke en erstatning for Cloudflares eget loft.

Browseren afviser kendte uvedkommende og sikkerhedsfølsomme spørgsmål før netværk og holder bedste sted/tid/score i Candidate G. Edge gentager domænegaten, minimerer konteksten, rate-limiter og validerer fem faste outputfelter. `429`, timeout, upstreamfejl, ugyldigt JSON, forkert locale/evidens eller manglende secrets giver lokal fallback. `ravAssistantRemoteEnabled=false` er øjeblikkelig rollback.

Brugeren skal have en forståelig DA/DE/EN-tekst om den begrænsede dagskvote og om, at prognoser og lokale RavRadar-svar fortsætter. Teksten må ikke love, at der er kvote tilbage. Se DEC-0088.

## 4.0.286 – et faseskudt grænsebevis skal overleve næste rullende reference

Den faktiske predeploy-gate fandt efter kontinuitetsrettelsen en separat 8-delsfejl: 672/673 states var `READY`, men de otte ejerallowlistede `dkss_lf`-dele ved `NATIVE_CADENCE_HOLD` manglede 16 modes, fordi Candidate G-evaluatorens ældre Phase D-fortrin krævede et nyt aktuelt strømfelt. En godkendt native hold må bruge den allerede afledte `READY` transport- og mobiliseringstilstand, men kun med eksakt tre-timers tilladelse, referencealder over 0 og højst 3 timer samt tomme U/V-, fart-, retnings- og alignmentfelter. Den må ikke foregive en aktuel vektor. Ordinary `UNVERIFIED`, for gammel eller ikke-READY forbliver lukket. Se DEC-0081.

4.0.286 er produktionsverificeret via PR #159/exact-head `33001615758`, merge `c0f42b33` og produktion `33001743118`. Offentlig `rr-20260826185603-210` har 210/210 aktive zoner, befolket **Bedste områder**, komplet 210/673/420/2.100-struktur og nul kontrol-, browser-, side- eller HTTP-fejl.

Når `buildBoundedCurrentTransportMemory` bruger en virkelig kompakt forgænger før `referenceAt - 48h` til at dokumentere ubrudt højst tretimerskadence, skal forgængeren bevares i den kompakte state til næste reference. Ellers kan samme beregning blive `READY`, mens næste produktion igen mister én times sammenhæng og bliver `WINDOW_INCOMPLETE`.

Forgængeren er kun kontinuitetsbevis. Det aktuelle replay og dækningsberegningen bruger fortsat kun evidens fra og efter vinduesgrænsen, som starter med fast tilstand 0. Der opfindes ingen måling eller interpolation, og et reelt kort vindue uden forgænger forbliver lukket.

En syntetisk shadow-selftest er ikke bevis for den runtime, produktionen netop har bygget. `data/live/conditions.json` skal auditeres fail-closed efter generering og før Supabase-sync, artifact og Pages. Se DEC-0081.

## 4.0.285 – 48-timersgrænsen skal tåle en dokumenteret cadencefase

`buildBoundedCurrentTransportMemory` må ikke kræve, at første bevarede bevis ligger præcis på `referenceAt - 48h`. Hvis referencen ligger mellem native prøver, er vinduet komplet, når et verificeret compact bevis umiddelbart før grænsen og første bevis efter grænsen sammen dokumenterer højst tre timers kadence. Den faste rand er fortsat 0 ved den eksakte grænse; forgængeren er sammenhængsbevis, ikke en ny måling i vinduet.

Nærhed til grænsen er ikke nok. Et selvstændigt 47-timersdatasæt uden et verificeret bevis før grænsen skal fortsat være `WINDOW_INCOMPLETE`, og et internt hul over tre timer forbliver `WINDOW_HAS_TIME_GAP`.

Den offentlige 4.0.284-state havde allerede mistet forgængeren. Recovery må derfor kun sammenflette de kompakte afledte transportbeviser fra den eksakte hash-låste sunde Pages-kilde med den nyere public state. Den må ikke kopiere vejr, rå vektorer, koordinater, scoreoutput, geometri, punkter eller private data. Se DEC-0081.

## 4.0.284 – sikkerhed ligger på servergrænsen

Dynamisk håndbogs-HTML skal gennem `sanitizeTrustedHtml`; CSP og fravær af inline script er en separat browserbarriere. Ekspertens `experts_manage` er ikke fuld administration: RLS, RPC og UI må kun vise ekspertprofiler og `admin_access`, `handbook_view`, `handbook_review`.

Browserroller må ikke indsætte direkte i `observations`. `submit-observation` er den eneste offentlige skrivevej og skal validere allowlist, størrelse, struktur, privatliv, brugerbinding, tidspunkt, idempotens og rate limit før service-role-insert. Offentlige Edge-funktioner deler `_shared/public-gateway.ts`; CORS er ikke autentifikation, men origin-afvisning, payloadkontrol, rate limiting og brugerbinding skal virke sammen.

Rav-assistentens local-only 4.0.287/4.0.290-tilstand er historisk og erstattet af den ejer-godkendte 4.0.291-aktivering. DEC-0083's nulbetalings-, domæne-, data- og fallbackkrav består; DEC-0087 valgte GPT-OSS 20B og gjorde Gemini til historisk reference; DEC-0088 godkender aktiveringen med `false` som rollback.

Supabase har varslet mulig begrænsning fra 9. september 2026 efter tidligere egressoverskridelse. Kvoteovervågning er drift, men må aldrig lempe sikkerheds- eller releasegates.

## 4.0.283 – moderzonekobling i den afsluttende Candidate G-kontrol

`data/live/coastal-parts-v2.json` gemmer den autoritative moderzone som nøglen i `zones`; de enkelte kystdelsobjekter behøver derfor ikke et eget `zoneId`. Når en kontrol skal bruge en flad liste, skal moderzonen kopieres fra denne nøgle med `flattenCoastalPartsWithParentZoneId`. En almindelig `Object.values(...).flat()` mister koblingen og må ikke bruges, hvor evidens matches på både zone og kystdel.

Fejlen berørte kun slutkontrollens genkendelse af de otte godkendte native-kadencereferencer. Den byggede Candidate G-state og livepiloten havde allerede 673/673 scoreklare kyststrækninger. Kravene til eksakt strøm, godkendt native kadence, dataminimering og lokal fail-closed adfærd er uændrede. Se DEC-0079.

## 4.0.282 – eksakt reference ved native vinduesskift

De otte godkendte `dkss_lf`-regionalproxyer har ægte tretimerskadence. Hvis et Candidate G-beregningsvindue starter efter den seneste verificerede prøve, må state-pipelinen bruge den eksakte prøve som transportreference, men kun når den ligger før vinduet og højst tre timer tilbage. Prøven reduceres straks til `time` og kystrelativ `strength`.

Referencen er ikke en ny måling og må ikke skabe pil, ekstra bevægelse, mobilisering eller en opdigtet mellemtime. Rå U/V, koordinater, punkt-id og private kildefelter må ikke indgå i Candidate G-state. Efter tre timer stopper den konkrete kystdel fortsat lokalt. Se DEC-0078.

## 4.0.277 – årsagstro native kadence og bevaret Candidate G-state

Kun de otte ejerallowlistede `dkss_lf`-regionalproxyer må fastholde den seneste afledte transporttilstand mellem ægte tretimersprøver, højst tre timer. Fastholdelsen er ikke en ny måling og må ikke tilføje bevægelse, evidens, U/V, hastighed, retning eller pil. DMI og Copernicus kræver fortsat eksakt målreference, og fremtidige prøver må aldrig tælle som aktuelle.

PR #141 bestod exact-head `32817501003`, merge `81e9b891` og fuld produktion `32817626537`. Offentlig 4.0.277 har 673/673 Candidate G-states, 673 accepterede fortsættelser, nul resets og 12–45 timers naturlig historik. Candidate G 20/50/30 er eneste offentlige profil uden rollback eller legacyfallback. 0/210 zoner var endnu aktive, fordi ingen lokal kæde ved kontrollen havde nået 48 timer; dette er naturlig modning og ikke et krav om en ny realtidstest. Se DEC-0074.

## 4.0.269 – offentlig forklaringskontekst er ikke ny rådata

De tre offentlige RavScore-forklaringer skal bruge den valgte kystdels faktiske allerede-offentlige værdier og relevante Candidate G-state. Den lille forklaringskontekst er afledt visningsdata, ikke en ny rå strøm- eller privat datakanal: rå U/V, koordinater og private payloads er forbudt. Generiske scoreintervaltekster kan kun være supplement. Tidligere forløb skal mærkes som historik, og faste lokale reserveegenskaber skal mærkes som faste.

Mobilisering betyder bølgevirkning – ofte skabt af vind – på allerede tilgængeligt rav og let materiale. Vind er ikke direkte mobiliseringspoint; strøm transporterer. Et lavt aktuelt vandniveau hjælper ikke i sig selv indtransport, selv om vandstanden samtidig kan være stigende.

Fundprognosen er skjult, indtil et særskilt beslutningspunkt dokumenterer repræsentative afsluttede ture med både fund og intet fund. Observationer og intern læring bevares i den eksisterende datakontrakt. Se DEC-0068.

4.0.269 er produktionsverificeret via PR #120/exact-head `32703138969`, merge `d745e0ba`, produktion `32703271897` og live `rr-20260824080543-210`. Candidate G står globalt på 20/50/30 for 210 zoner og 673 kystdele, og den fulde browseraudit er grøn uden fejl.

## 4.0.125 – proveniens skabes ved indlæsningen
`update-dmi-bulk.py` parsergeneration 14 skriver DMI-identitet på den rå komponenttime: provider, collection, model-run og native valid time. `dmi-forecast-store.mjs` må kun interpolere identificerede trin med samme collection og model-run og fører lead time, forecast age, temporal resolution og native source times videre. To hydrerede pre-v14-trin uden identitet kan midlertidigt bevare tidligere værdiinterpolation, men får ingen opdigtet proveniens og udløser fortsat audit; et identificeret og et uidentificeret trin må ikke blandes. `update-weather.mjs` og vandstandskontinuiteten må ikke erstatte identiteten med en generisk DMI-markør. Public runtime forbliver slank; den fulde sporbarhed ligger i beskyttede conditions/audits.

## 4.0.124 – komponentintervaller og proveniens
Vind er produktionsdækket, og de fem tidligere DKSS-huller er lukket efter kode- og adminrettelser. Den bredere femdøgnsaudit fandt dog særskilte bølge- og marine halehuller i Limfjorden. `audit-implementation-plan-4.0.25.mjs` schema 3 måler derfor komplette feltsæt, sammenhængende providerintervaller, DMI/fallback/missing og manglende DMI-identitetsfelter for fem komponenter. Fuld timeproveniens skal skabes ved STAC/GRIB-indlæsningen; den må ikke gættes ud fra en senere samlet cache.

## 4.0.123 – DKSS-landmasker
Produktionens centralt gemte zonegeometri er bulkjobbets input og kan afvige fra repositoryets historiske datapunkter. Marine U/V-opslag undersøger 64 kandidater ved almindelige kyster og 128 i Limfjorden, men de fysiske afstandsgrænser og kravet om ét fælles U/V-gridpunkt er uændrede. `marineGridSearch.vectorPairs` skelner mellem fejl i strøm og vindhale. De fulde livecacher er vedvarende hydreringstilstand; offentlig browserruntime er fortsat `public-conditions.json`.

## Formål
RavRadar er et dansk kystbeslutningssystem for ravjagt. Systemet producerer en RavScore 0–100 og femdøgns/time-for-time prognoser for kystzoner. Scoren er beslutningsstøtte, ikke en garanti. DMI er den autoritative kilde til de marine og meteorologiske data, som projektet kan hente pålideligt.

Produktets femdøgnsmål skal skelnes fra én models native horisont. En komponentkæde bruger den bedst egnede DMI-kilde til dens sidste valide time, undersøger andre DMI-produkter som forlængelse og anvender først derefter ekstern fallback på den resterende hale. Kæden og skiftetiden fastlægges separat for hver komponent; fallback må ikke skubbe fungerende DMI-data ud. Se DEC-0030.

## Arkitektonisk sandhed
Der findes flere forskellige typer sandhed, som ikke må blandes:
- Git-repository: versioneret kode, tests og dokumentation.
- RDKS: aktuelle krav, beslutninger, status, issues og historik.
- Supabase: centralt gemt administratoropsætning og beskyttede workflows.
- DMI: autoritative vejr-/havdata.
- Genererede caches/public data: afledte snapshots, ikke kravgrundlag.
- Håndbog: faglig og operationel forklaring.
- Chatarkiv: historisk beslutningskontekst.

## Produktionskæde
GitHub-workflowet bygger først/forbereder data og deployer derefter et færdigt Pages-artifact. Tidligt synkroniseres central admin-konfiguration og godkendt zonegeometri. Derefter hydreres eksisterende frisk state, DMI-registre og DMI-bulkdata opdateres efter scheduler/tidsbudget, central weather-cache bygges, strømproveniens tilknyttes, public runtime bygges og valideres, referencezoner kontrolleres, supportpakke genereres og et lean Pages-artifact deployes. `_support` og private adminmellemprodukter må ikke ende offentligt.

Det bindende aktive workflowinventar står i `scripts/test-workflow-validation-order-4.0.108.mjs`. Kun `.github/workflows/update-and-deploy.yml` må deploye Pages; de øvrige registrerede workflows er private QA-, recovery- eller forskningsjobs uden Pages-rettigheder. `schedule-test.yml` og `pages-microtest.yml` blev fjernet i 4.0.121. `pages-build-deployment` er GitHubs platformsmekanisme og tælles ikke som repositoryfil. Den eksterne scheduler udløser fortsat produktionsworkflowet via `workflow_dispatch`. Copernicus-keepalive bruger dette workflows `requested`-event som read-only heartbeat og må kun dispatch'e den private pilot ved manglende aktuel UTC-time. Piloten må kun genbruge en afsluttet time, når dens recordmanifest og SHA-256-fingeraftryk matcher den aktuelle centralt hydrerede vandpunktsbestand; en punktændring kræver samlet genindsamling af timen.

## DMI bulk og vektorer
Aktive bulkfamilier omfatter DKSS-varianter for marine data, WAM for bølger og HARMONIE for vind. Schedulerens prioritet skal bestemmes af faktiske aktive zoners datagab, ikke kun historisk cacheindhold. Marinegrundlag prioriteres højt, fordi faktisk DMI-strøm ikke må erstattes af regionale antagelser.

Strømvektoren er særlig følsom. U og V må ikke vælges uafhængigt fra forskellige steder. Fra 4.0.116 kræves fælles fysisk gridpunkt. 4.0.117 stabiliserede dette yderligere: DKSS leverer current-komponenter i flere vertikallag, så kandidatcache og parring er lag-isoleret. Vektoren kræver samme forecasttid, samme fysiske gridpunkt og samme vertikallag; blandt gyldige fælles lag vælges deterministisk et fælles lag efter den implementerede policy. Parsergeneration 11 tvinger ældre assets gennem den korrigerede logik.

## Zonegeometri og administrator
Zoner er ikke statiske fixtures. Administratoren kan ændre navn, kystlinje, land-/havpunkter, retning og relevante ankre og kan slette zoner. Godkendte centrale ændringer skal anvendes på det autoritative zoneregister før vejrproduktion. Tests må ikke låse historiske navne, koordinater, antal eller retninger.

Ved Codex-overgangen blev dette produktionsverificeret: tre Limfjordszoner havde forkert geometri, blev korrigeret i admin, og den friske #1750-kørsel viste ændringerne i den centrale geometry-sync og førte dem videre til succesfuld weather-cache. Læringen er, at en datamangelsfejl kan skyldes både parser/scheduler og forkerte autoritative koordinater; begge dele skal kontrolleres før kodeændring.

## Vandstandskilder
Vandstandskilder omfatter observationsstationer og prognosepunkter. Observationsstatus og forecast/cache-status er forskellige begreber. En kilde kan fortsat være prognosebrugbar, mens dens gyldige forecastcache består, selv om nye observationer midlertidigt udebliver. Aktiv adminrouting vinder over auto-routing; auto primær/sekundær, afstande, vægte og metode skal være synlige og konsistente gennem score og prognoser.

## Historisk 4.0.117-grundlag – RavScore og state

Ved 4.0.117 brugte RavScore aktuelle og dokumenterede forhold, mens den daværende historiske state-model fortsat var skyggetilstand og krævede faglig validering før nye numeriske bidrag. Dette er et historisk fundament, ikke den aktuelle modelstatus. Candidate G blev senere offentlig, og DEC-0102/0107 har siden gennemført den planlagte kildekritiske forsknings- og implementeringsrunde som en lokal integreret releasekandidat.

Den vedvarende regel er, at faktisk verificeret DMI-/godkendt Copernicus-gridstrøm er transportgrundlag, mens generelle strømbånd hverken er scoreinput eller fallback. Nye numeriske virkninger kræver fortsat en særskilt evidensbaseret beslutning og får ingen automatisk aktivering.

## Performance
Public klienten skal starte hurtigt. Store råhistorikker, private audits og tunge beregninger må ikke flyttes til browserstartup. Den historiske målsætning/baseline er ca. 2–3,5 sekunder; tidligere regression mod ca. 13 sekunder er en advarsel om at holde pipelinearbejde server-/buildside.

## 4.0.117 – hvad der blev lært
En serie fejl omkring Limfjorden viste, hvorfor lokal symptomrettelse er farlig. Først blev schedulerens DKSS-rækkefølge korrigeret, derefter blev kandidatsøgningen undersøgt, men den dybere parserårsag var vertikallagsoverskrivning. Samtidig viste administratorens efterfølgende korrektioner, at nogle zoners geometri reelt var forkert. Den endelige arbejdsregel er derfor: undersøg hele kæden og alle autoritative inputs før du konkluderer rodårsag.

## Kendt åben kant ved overgangen
I den friske femdøgnsproduktion kan forecastets yderste timer vise `missing` for strøm/vandstand i enkelte zoner. Det er et dæknings-/horisontproblem, ikke tilladelse til at kopiere sidste værdi eller gøre missing til nul. Det skal undersøges som separat aktiv opgave.

## Lokal snapshot-advarsel ved handoff
Den projekt-ZIP, som Codex-handoffet blev bygget fra, består `npm run validate`, men den lokale `test:current-spatial-audit` rapporterer 12 advarsler om aktive zoner uden dokumenteret current-U/V-gridpunkt i netop det bundne datasnapshot. Det er ikke det samme som en frisk produktionsfejl. Ved overgangen har #1750 højere evidens for de senest korrigerede adminzoner, fordi den kørte efter central geometri-sync med friske data. Codex skal derfor altid sammenligne snapshot-tidspunkt, run-tidspunkt og commit før en warning erklæres aktuel regression.

## 4.0.117 – korrigeret releasehistorik før Codex
Efter den første handoff blev det opdaget, at topniveauet `success` på en almindelig automatisk vejropdatering ikke betyder, at hele release governance er kørt. Workflowet betinger `npm run validate` og `npm run release:gate` af `push` eller `force=true`, mens en almindelig `workflow_dispatch` med reel vejropdatering fortsat kan nå Pages-artifact og deployment. #1760 er et konkret eksempel: DMI bulk, central weather-cache, current provenance, public runtime, referencezoner, `validate:data` og Pages deployment var succes, men de to fulde gates var `skipped`.

Konsekvensen er, at de seneste automatiske grønne runs ikke må bruges som stabilitetsbevis. Den aktuelle 4.0.117-kode er på `main` og er deployet, men handoffet skal betragtes som **ikke fuldt release-verificeret**, indtil Codex har lukket gatehullet og en frisk kørsel har vist `success` på begge fulde gate-trin.

### Første Codex-rettelse
Gatehullet er lukket ved at lade både fuld validering og releasegate følge samme positive preflight-kontrakt som produktionsartifactet. En almindelig `workflow_dispatch` kan derfor ikke længere bygge frisk data og nå artifactet med triggerbetinget skipped gates. Negativ preflight stopper fortsat uden artifact/deploy. #1769 beviste korrekt stop ved rød validate; #1772 produktionsverificerede begge gates, artifact og deploy som `success`.

### Endelig admin-geometri før Codex
Efter #1758 blev yderligere fire zoner gennemgået manuelt og konstateret klart geografisk forkerte: **Fur syd**, **Gjøl og Attrup**, **Aalborg vest og Egholm** samt **Aalborg øst og Nørresundby**. Administratoren rettede deres kystlinje og/eller land-/havpunkter centralt. #1760 blev startet efter disse sidste rettelser og viste, at den efterfølgende DMI/weather/provenance/public/deploy-kæde kunne gennemføres. Da de fulde releasegates var `skipped`, er dette bevis for propagation/deployment, ikke fuld releasegodkendelse.

## Turdata v2 - permanent viden

Komplette ture med søgetid, grundighed, faktisk kystdel og startprognose er kalibreringsevidens. Enkeltfund og ældre ufuldstændige svar er kun dækningsdata. Stedskift mellem start og afslutning gør calibrationEligible falsk. Fjernlagring er kystdelsbaseret og må ikke indeholde GPS/rute. 25/40/35 er fortsat foreløbig produktionsvægt.
