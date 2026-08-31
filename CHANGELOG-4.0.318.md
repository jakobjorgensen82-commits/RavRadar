# Nyeste checkpoint – 2026-08-31

- Denne topstatus superseder ældre topresumeer i dette versionsnotat, men erstatter ikke historikken nedenfor.
- PR #238 (modelkilden) er merged som `origin/main 57f76d716310060e0d629c9f9d3691d386a2dd58`; workflowfixes fra PR #239/#240 er derefter merged til `origin/main be81005b50294f54367f154c393bb27910e16c6f`.
- Produktion `33391418061` og `33393684620` stoppede sikkert før DMI, beskyttede writes, artifact og Pages, fordi én aktiv offentlig Højbjerg-del i `DK-B04-01` / `dk-b04-01-national-part-03` stod med afrundet bearing `360`, mens den aktive kontrakt kræver `[0,360)`.
- PR #241 normaliserer kun afrundet `360` til `0` uden geometri-, zone-, land-/vandpunkt- eller kystnormalændring. Første CI `33394343851` stoppede ved stale bundle-/binding-consumers; senere gates blev derfor ikke bevist. Bundle-/binding-consumerne er nu regenereret og målrettet lokalt verificeret; opdateret exact-head afventer.
- Endelige lokale bundle-hashes er integrated `978415fd2b0a739b80b71c78134a79101113481817212811644b24262b6ddbd9` og rollback `4ccc2081982677aadbb47a5ee7d6f2b99fdcb7e42113e73029d5c60323a5ee96`. Candidate G er stadig offentlig; opdateret exact-head, merge, frisk produktion og offentlig browserverifikation afventer.
# RavRadar 4.0.318 – source-attesteret målt first-cutover

**Dato:** 2026-08-31
**Status:** Lokal kandidat. Orchestrator/build/deploy-opdelingen, 40 reader-migrationer, role-aware workflowkontrakter, public-integrated 210/673 + 78 browsermoduler, profil/cutover/8-consumer-binding og state-6-assistentfixture er grønne; slutreviewet fandt ingen P0/P1. Fuld slut-`validate:source`, exact-head, merge, frisk 4.0.318-produktion, Feggesund 3 × 118 og offentlig desktop-/mobilverifikation af state 6 afventer. Candidate G/4.0.316 er fortsat eneste offentlige model.

## Aktuel offentlig baseline og nye operationelle kontrakter

- Seneste offentlige baselinebevis er produktion `33368963614` på uændret `origin/main 8c03e25d`, grøn gennem build, frisk fuld validate, releasegate, protected sync/artifact og Pages. `rr-20260831074016-210` er komplet 210/673; det er Candidate G-bevis, ikke state-6-bevis.
- Produktionsworkflowet er lokalt opdelt i eksplicitte orchestrator/build/deploy-roller. Alle 40 direkte readers bruger rollegrænsen, releasekontraktmetadata er centraliseret, og role-aware tests er grønne. Den separate P2 om en aggregerende `validate:source`-DAG forbliver efter cutover.
Nødrollback PR #236 gendannede den eksakte 4.0.316/Candidate G-tree på `origin/main` `c58deb78`. Exact-head `33342157517` var grøn, post-merge-run `33342219152` gennemførte fuld validate, releasegate, artifact og Pages, og normal produktion `33345476979`/`rr-20260831010337-210` var første grønne recoverybevis. Det tidligere external-watchdog-`workflow_dispatch` `33347230240` gennemførte fuld DMI, validate, releasegate, storage gate og Pages og publicerede `rr-20260831012407-210` komplet 210/673, `VERIFIED_ONLY`, uden syntetiske samples; Candidate G er 0/210 aktiv på grund af historikmemory. Den visuelle desktop-/mobilkontrol er stadig åben; evidensen siger intet om, at 4.0.318/state 6 er offentlig.

Runs `33343469247` og `33344823000` stoppede begge sikkert i build/prepare på en forbigående HTTP 503; deploy var skipped, og live Candidate G blev ikke ændret. Den snævre bounded-retry-hotfix bestod PR #237 exact-head `33352520408`, blev merged som `8c03e25d`, og backend-/fuld produktion `33352661061`/`33352634365` samt senere normal vejrdrift var grøn. Ét aktivt 15-minutters kontroljob følger vejrproduktion og offentlig friskhed som diagnose-/reparationsspor. Det må ikke være en ekstra scheduler/dubletvagthund, blindt redispatche et kendt fejlet build eller skabe parallel produktion.

4.0.318 tilføjer to eksplicitte H0→H1-broer uden at ændre controller-v4's præcis 30 felter, fire statusser eller seks transitionstyper. `candidate-historical-maintenance` bruger en immutable Candidate-plan og `historical-refresh-begin/complete/abort`; `integrated-historical-maintenance` bruger en immutable historical-integrated-plan og `integrated-historical-maintenance-begin/complete/abort`. Direct historical Candidate→integrated bruger den forseglede `IntegratedReturnPlan`. Ordinary maintenance accepterer kun checkoutets aktuelle 11-feltsbinding. En atomisk central read skal have ACTIVE controller og schema-3-profil med samme eksakte aktive binding; PENDING, mismatch, tamper, stale CAS, tredje hash eller manglende plan stopper.

Pages-recovery må ikke længere fortolke “source er stadig synlig” som generel aborttilladelse. Source-abort kræver terminalt bevis for, at Pages-anmodningen ikke blev accepteret. Ved tvetydig start genudgiver en isoleret Pages-writer de eksakte forseglede targetbytes; en separat finalizer uden Pages-rettighed verificerer target stabilt og udfører kun derefter CAS. Recoverydeploymentet bliver næste forseglede source-lineage.

Ved gyldige direkte timeinput publicerer state 6 hele den eksakte 118-timersakse som `HISTORY_INCOMPLETE`, selv om ældre historik mangler. Resultatet er en konservativ lower score med upper/spænd/dækning, tydelig DA/DE/EN-advarsel og `calibrationEligible=false`; advarslen forsvinder automatisk ved `FULL_HISTORY`. Mangler et direkte obligatorisk input, er kun den berørte time `UNAVAILABLE`. Spørg RavRadar skelner historikmangel fra direkte inputmangel, og den offentlige forklaring beskriver den energivægtede firetimers-halvering og højst 15 % last-mile-dæmpning uden intern W/N/T/EWMA-jargon. Måltests er grønne; exact-head og offentlig release er fortsat gate.

Release-outcome er lokalt synkroniseret som `ravradar-production-workflow-outcome-v2`, fordi nested exact-key-resultatet nu omfatter historical actions og exact-target writer/finalizer/gate. Kode/releasegate og måltests er grønne; exact-head og frisk produktion udestår.

Den regenererede integrated binding er `modelContractSha256=778db7aa3946f925607a8304daa42ed17dd30294e4a51bf6d895d7293e84c4e7` og `modelBundleSha256=978415fd2b0a739b80b71c78134a79101113481817212811644b24262b6ddbd9` over 43 transitive filer og 8 bindingsforbrugere. Den separate Candidate G-rollbackbinding er `modelContractSha256=c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8` og `modelBundleSha256=4ccc2081982677aadbb47a5ee7d6f2b99fdcb7e42113e73029d5c60323a5ee96` over 55 filer. 4.0.317's tidligere `74bfc42...`/`fd3f7e70...` er kun historisk præ-hærdningsevidens.

## Hvorfor versionen findes

4.0.317/state 6 bestod PR #235's afsluttende exact-head `33332106627` på `30306a51c4e360c5054368f1b0167e3aaa3862ee` og blev merged som `a584d1cf1a53692b10b0f01244eab4fb91ca89b1`. Første mergeproduktion `33333490853` hydrerede en komplet offentlig Candidate G-kilde med 210 zoner/673 kystdele, men 0 states var `READY`, og alle 673 var kanonisk warmup. Den gamle resolver forvekslede en valid kilde med en migrationsegnet kilde og stoppede.

Stoppet var sikkert: DMI/Copernicus, scorebygning, beskyttet state/cache/checkpoint/adminskrivning, artifact, Pages, deploy og activation blev ikke nået. Den efterfølgende WAM-fejl var kun en kaskade fra en `always()`-gate; WAM blev ikke kørt. Candidate G/4.0.316 og central offentlig profil forblev uændrede.

## To tilladte first-cutover-grene

1. **Eksakt Candidate G-migration:** 673/673 kildestates skal være kanoniske `READY`, være bundet til det eksakte offentlige kilderegister, dele ét fælles target og have samme samplingkontekst som det aktuelle aktive register.
2. **Source-attesteret genuine cold start:** Alle 673 kildestates skal stadig bestå den fulde Candidate G-/stateKey-/trustvalidering. Hvis mindst én er i legitim warmup/missing-status, eller det historiske source-register og det centralt materialiserede aktive register afviger legitimt i samplingkontekst, starter hele populationen samlet ved produktionstarget fra faktisk tilgængelige, proveniensverificerede målinger.

Der findes ingen tredje fallback. Malformed, reconstructed, tampered, fremtidig eller ukendt state, forkert model/schema/stateKey, part-/zonesætmismatch, blandede migrationstargets uden legitim cold-årsag, en tidligere afvist ugyldig integreret continuation/checkpoint eller manglende source-attestation stopper før DMI og mutation.

## Register-, tids- og privacykontrakt

- Det offentlige Candidate G-manifest, conditions og dets eksakte `coastal-parts-v2.json` hydreres og valideres som én kildeenhed.
- Source-registeret gemmes kun isoleret i `.cache/ravscore-legacy-candidate-g-source/coastal-parts-v2.json`.
- Det aktive `data/live/coastal-parts-v2.json` materialiseres separat fra den nyeste centrale adminkonfiguration før targetvalget og ejer ny produktion.
- Ingen geometri, land-/vandpunkter eller kystnormaler flyttes eller omskrives.
- Resolveren udsender kun mode, target, part count og `source_validated`. Target er altid kanonisk `YYYY-MM-DDTHH:00:00Z`, så Node og Python deler én timekontrakt.
- Ingen private payloads, koordinater, stateevidens eller rå U/V skrives til output eller dokumentation.

## Målt state 6 og separat Candidate G-rollback

`genuine-cold-start` genafspiller 0–48 faktisk tilgængelige private, verificerede timer plus den reelle targetrække. Gyldige direkte input giver fortsat `HISTORY_INCOMPLETE` med lower/upper-bounds; manglende direkte input er `UNAVAILABLE`. Alle anvendte WAM-timer skal være exact native med `maximum_interpolation_hours=0`; `INTERPOLATED_COLD_START` fejler lukket. Den allerede afgrænsede højst fire timers same-run-WAM-interpolation gælder kun Candidate G-migration og generisk acquisition. Der opfindes ingen time, neutral nulstrøm, carry, cross-model fallback eller nabozonelån.

Candidate G-rollback bygges i cold-grenen eksklusivt fra sit eget målte replay. Den må ikke hybridiseres med en legacy/private continuation eller integreret state, må ikke få targettimen som dobbelt credit og skal selv nå `READY` for alle 673 dele, før rollback-companion/checkpoint/cutover kan passere. Hvis det målte grundlag ikke er nok, stopper releasen og Candidate G forbliver offentlig.

## Progressiv cache og offentlig kontinuitet

Den private WAM-bootstrap skriver checkpoints undervejs. Workflowet bevarer en eksisterende progressiv DMI-/WAM-cache efter både fuld producersucces og en reel producerfejl, men ikke efter cancellation eller uden cachefil. Genbrug er kun tilladt efter de uændrede byte-, run-, collection-, grid-, celle-, target-, horisont-, provenance-, 210/673-, validate- og releasegates; delvis cache er ikke readiness.

Mens first cutover afventer, kan schedule, watchdog/bot og manuel vejrdrift fortsat holde Candidate G frisk. Fra rowless exact legacyprofil vælges action `candidate-legacy-maintenance`, transition `LEGACY_CANDIDATE_G_REFRESH_BEFORE_INITIAL_CUTOVER` og CLI `legacy-refresh-begin/complete/abort`. Begin skriver source-bevarende `CANDIDATE_G_PENDING` med active/source legacy schema 2, requested current Candidate G schema 4 og uændret legacyprofil. Complete eller target-reconcile kræver exact offentlig implementation+210/673, sætter current Candidate aktiv/profil, bevarer `initialCutoverRequired=true` og sætter `legacySourceRequired=false`; abort/source-reconcile bevarer legacy public/profile og `legacySourceRequired=true`. Legacy-markøren består efter complete og skal arves gennem senere Candidate→Candidate pre-cutover maintenance sammen med exact current Candidate og fire `null`-returnfelter; den må aldrig skabes ved relabel, og `legacySourceRequired` følger den faktiske sourcebinding. En separat lineage efter et sikkert afbrudt integreret first-cutover-forsøg bruger `CANDIDATE_G_REFRESH_BEFORE_INITIAL_CUTOVER` og bevarer `returnPlanSha256`, `integratedReadinessSha256`, `integratedPublicAuditSha256` og `integratedManifestSha256` gennem complete, abort og cross-run reconcile. Kun push må forsøge `integrated-cutover`; vedligehold må aldrig skrive `INTEGRATED_PENDING`, aktivere state 6, skabe historik eller ændre til integreret profil.

Det push-only `INITIAL_INTEGRATED_CUTOVER` accepterer præcis to forseglede Candidate G-kilder. Direkte rowless exact legacy bruger controller-CAS `expectedVersion=0` og `legacySourceRequired=true`. Efter en verificeret bridge-complete bruges den eksakte aktive current Candidate-marker, den aktuelle centrale CAS-version og `legacySourceRequired=false`; denne gren må ikke relabeles som legacy eller tvinges tilbage til version 0. I begge tilfælde observeres og fastholdes kildens eksakte binding, profil, manifest og implementation closure gennem `INTEGRATED_PENDING`, indtil exact integrated implementation+210/673 kan aktiveres atomisk.

Controllerdokumentet bruger schema `ravscore-operational-model-activation-v4`, præcis fire statusser og seks overgangstyper. Dets præcis 30 felter omfatter nu også `sourceImplementationClosureSha256` og `requestedImplementationClosureSha256`, så source/target-reconcile er bundet til både manifest og den faktiske implementation closure.

## Påstands- og releasegrænse

Modellen, 20/50/30, state 6, history-bounds, same-model-nøddrift og den tekniske last-mile-policy er uændrede. Rettelsen gør første opstart kontraktmæssigt korrekt og genbruger faktisk downloadet arbejde; den dokumenterer ikke empirisk højere fundpræcision. Det afsluttende integrationscheckpoint den 2026-08-30 cirka 23:55 CEST viste `HEAD=origin/main=a584d1cf1a53692b10b0f01244eab4fb91ca89b1`; der var ingen nyere main at integrere. Før offentlig aktivering kræves fortsat 4.0.318 exact-head, sikker merge, frisk fuld produktion med validate/releasegate/artifact/Pages, Feggesund 3 × 118 samt offentlig 210/673 current/fem døgn desktop-/mobilkontrol.
