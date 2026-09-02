# NYESTE CHECKPOINT – 2026-09-02 – Feggesund direct-first wave-only proxy

- Denne topstatus superseder ældre direct-only-/proxy-pensioneringsresumeer nedenfor; de bevares som revisionsspor.
- Direkte lokal DMI WAM vinder altid. Kun `DK-B05-11`, kun ved hel lokal `(Hs, period, mean FROM direction)`-missing, må komplette direkte DMI-tuples fra både `DK-B05-10` og `DK-B05-12` ved samme time/run danne den faste 50/50 energikonsistente bølgeproxy.
- Proxytimer bærer `LOW`/`MODERATE`/`HIGH`, tydeligt DA/DE/EN-varsel og `calibrationEligible=false` gennem mode, zone, public, tur og observation, også ved ellers `FULL_HISTORY`. Direkte DMI følger normal historikregel.
- Undtagelsen er wave-only: ingen current, historik, recovery-backfill, kunstig state, geometri-, land-/vandpunkt- eller kystnormalændring. Ingen lokal surfzone- eller empirisk fundpræcisionspåstand.
- Release kræver privacy-sikkert 3 × 118-bevis med direct + proxy = 354 og missing = 0. Exact-head, merge, frisk fuld produktion og offentlig desktop-/mobilverifikation afventer fortsat; Candidate G er stadig offentlig.
- Slutbundles er forseglet og lokalt måltestet: integrated `a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b`/`db475a1bbb1b85fe3e0277b8687d6f1edd6dd8d74e0d6fb4df748f955d5bafe1` over 44 filer og 8 deklarerede forbrugere; Candidate G-rollback `c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8`/`ea22921e298a03ed1ef8787a4dbd79fd4fdf1a9b8e188d3c4b44e03f16fdceb0` over 56 filer. Exact-head `33577887262` stoppede i Candidate G-rollbackens public stage på calibration-ceiling; fem-validator-rettelsen og fire måltests er grønne. Exact-head `33580532775` kom gennem hele model-/rollbackkæden og stoppede kun på to forældede DMI-testassertions; test-only-rettelsen er grøn 21/21 og ændrer ingen runtime. Ny exact-head, slutligt 118-timers/Feggesund-bevis, merge, frisk fuld produktion og offentlig browserkontrol afventer; hashes i eksplicit historiske 4.0.317/4.0.318-afsnit er revisionsspor.

# NYESTE CHECKPOINT – 2026-08-31 – PR #241 merged; legacy-profilattestering lokalt rettet

- Denne topstatus superseder ældre topresumeer nedenfor, men bevarer dem som revisionsspor.
- PR #241 bestod exact-head-kildegaten i run `33397737159` og blev merged som `origin/main a1ce7632b4262d742ec4a8a59746a61241c3b79a`.
- Mergeproduktion `33400836760` passerede den tidligere Højbjerg/bearing-gate og beviste dermed den smalle `360→0`-rettelse. Den stoppede derefter fail-closed i den lokale legacy-kildeattestering, før DMI, beskyttede writes, artifact og Pages; Candidate G og den offentlige side blev ikke ændret.
- Rodårsagen er reproduceret: attesteringens testfixture tillod kun 11 profilfelter, mens den fastlåste 4.0.316-producent og den aktive offentlige Candidate G-manifestform har 20. Den lokale branch `codex/ravscore-legacy-profile-attestation` validerer nu den fulde eksakte feltmængde, readiness/advisory-konsistens og bit-for-bit samme profil i manifest og conditions. Ukendte felter og blandede profiler stopper fortsat.
- Målrettet legacy-, activation-, workflow-, deploy- og cutover-matrix samt privacy-sikker offentlig manifest/payload/53-fils source-closure-verifikation er grøn. Ingen private conditions-payloads, koordinater, rå U/V, geometri eller land-/vandpunkter er læst eller ændret.
- Candidate G/4.0.316 er fortsat eneste offentlige model. Ny exact-head, sikker merge, én frisk 4.0.319-produktion og offentlig desktop-/mobilverifikation udestår.

# NYESTE CHECKPOINT – 2026-08-31

- Denne topstatus superseder ældre topresumeer nedenfor.
- PR #238 er merged som `origin/main 57f76d716310060e0d629c9f9d3691d386a2dd58`; workflowfixes PR #239/#240 er merged videre til `origin/main be81005b50294f54367f154c393bb27910e16c6f`.
- Produktion `33391418061` og `33393684620` stoppede fail-closed før DMI, beskyttede writes, artifact og Pages på én aktiv offentlig Højbjerg-del i `DK-B04-01` / `dk-b04-01-national-part-03` med bearing `360`, mens aktiv kontrakt kræver `[0,360)`.
- PR #241 er den aktuelle smalle remediation: afrundet `360` normaliseres til `0` uden geometri-, zone-, land-/vandpunkt- eller kystnormalændring. Første CI `33394343851` stoppede ved stale bundle-/binding-consumers; senere gates blev derfor ikke bevist. Bundle-/binding-consumerne er nu regenereret og målrettet lokalt verificeret; opdateret exact-head afventer.
- Lokale bundle-hashes er nu integrated `e880d5425e6f7b93d8afc99cddf491e58ad5a4a2ab055f8e4455193609c90a73` og rollback `4ccc2081982677aadbb47a5ee7d6f2b99fdcb7e42113e73029d5c60323a5ee96`. Candidate G er fortsat offentlig. Exact-head, merge, frisk produktion og offentlig browserverifikation af PR #241 udestår.
# Codex – start her

Dette er den obligatoriske indgang til RavRadar for Codex og andre kodeassistenter. Projektet må ikke behandles som en samling isolerede filer. Hver ændring skal forstås som et træk i et sammenhængende system.

## Nyeste P0-checkpoint 2026-09-01 – DMI-currentfasefejl lokalt rettet; ny frisk preflight afventer

- Isoleret run `33520738058` på `3a26ba0c` nåede producenten, men hard gate stoppede payloadfrit med `DMI_STRICT_CURRENT_ANCHOR_MISSING`. Runnet er negativt runtimebevis, ikke grønt 673 × 118-bevis eller bevis for bred upstream-DMI-mangel.
- Den yderligere lokale rodårsag var en faseforskel: tidlig cache-health kunne være grøn, før den senere autoritative sampling-/gridvektoroprydning fjernede et uforeneligt `samplingPoint` eller top-level `current-u`/`current-v`-par. Working-tree-rettelsen gør `coastal_part_current_cache_reusable` fasekonsistent med begge kontroller. Direkte provenance-test, bulk-test, scheduler-test og Python-syntakskontrol er grønne lokalt; ny eksakt GitHub-kørsel er endnu ikke kørt eller grøn.
- DMI er bindende primærkilde i både nuværende drift og den nye integrerede model. Copernicus må kun udfylde eksakte, dokumenterede manglende DMI-tuples efter grøn DMI-terminalgate og må aldrig skjule eller erstatte en systemisk DMI-fejl.

- De isolerede 118-timers runs `33510636195` og `33512163102` nåede DMI-producenten, men den payloadfri logoptælling viste nul behandlede trin i `dkss_idw`, `dkss_nsbs` og `dkss_lf`, mens HARMONIE og WAM blev behandlet. `DMI_STRICT_CURRENT_ANCHOR_MISSING` er derfor ikke bevis for, at DMI generelt manglede currentdata; fejlen lå i RavRadars lokale cache-/runvalg før DKSS-behandlingen.
- Den progressive cachelinje førte tilbage til det negative run `33498108421`. En foretrukken ældre run kunne blive fastholdt og derefter afvist som stale uden skift til en nyere moden run. Preflightens såkaldte deployed donor var samtidig blot en kopi af den samme progressive cache, og gamle DKSS-`processedSteps` kunne undertrykke en nødvendig genbehandling uden strict current anchor.
- Den lokale rettelse binder ét eksakt jobtarget før DMI og genbruger det gennem hele beviset, også hvis væguret krydser en UTC-time under kørslen. En ældre preferred run må kun beholdes foran en nyere moden run, når en kendt observeret cadence viser, at den højst er én cadence bagud; ved ukendt cadence vælges den nyere modne run. Mens strict current anchor mangler, står de tre DKSS-familier først i den normale collection-loop, og netop deres gamle stepmarkører genbruges ikke.
- Preflighten forsøger valgfrit at hydrere en uafhængig offentlig Candidate G-DMI-donor under `RUNNER_TEMP`. Kun en donor, der består den strenge kompatibilitetskontrol, må bruges; er den fraværende eller ugyldig, fortsætter det friske officielle DMI-forsøg uden deployed fallback.
- Den samme beskyttelse gælder den nye model: den særskilt checkpointede WAM-historikbootstrap ligger fortsat før den normale collection-loop og kan fortsætte over flere cutoverforsøg. I selve seks-collection-loopet står DKSS foran WAM, når strict current anchor mangler; med et gyldigt anchor kan WAM igen stå først. Normal vedligeholdelse behandler fortsat højst to collections. Copernicus er uændret sidste led og må kun supplere de eksakte resterende DMI-huller pr. kystdel og time efter grøn DMI-terminalgate.
- Ingen scoreformel, geometri, kystnormal, land-/vandpunkt, private payloads, koordinater eller rå U/V er ændret. Frisk isoleret 673 × 118-preflight på den nye kodehead, exact-head, merge, fuld produktion og offentlig kontrol er fortsat åbne beviser. Candidate G er fortsat den eneste offentlige model.

## Nyeste P0-checkpoint 2026-08-31

- Nyeste offentlige Candidate G-bevis er produktion `33368963614` på uændret `origin/main 8c03e25d`; build, frisk fuld validate, releasegate, protected sync/artifact og Pages er grønne, og `rr-20260831074016-210` er komplet 210/673. Det er ikke state-6-bevis.
- Offentlig sandhed er exact 4.0.316/Candidate G efter PR #236 på `origin/main c58deb78`; exact-head `33342157517` og post-merge fuld produktion `33342219152` er grønne. `33345476979`/`rr-20260831010337-210` var første recoverybevis. Det tidligere external-watchdog-`workflow_dispatch` `33347230240`/`rr-20260831012407-210` bestod fuld DMI/validate/releasegate/storage/Pages og er komplet 210/673, `VERIFIED_ONLY`, uden syntetiske samples; Candidate G er 0/210 aktiv på grund af historikmemory. Visuel browserkontrol er åben. `33343469247`/`33344823000` stoppede på transient 503 uden deploy; bounded retry-hotfixen er produktionsverificeret gennem PR #237, exact-head `33352520408`, merge `8c03e25d`, backend `33352661061` og fuld produktion `33352634365`; automatisk run `33354263148` publicerede `rr-20260831034128-210` komplet 210/673.
- 4.0.319 er lokal. Historical Candidate/integrated H0→H1 er immutable-plan/two-phase under controller-v4's 30 felter/4 statusser/6 kinds; direct Candidate→integrated bruger IntegratedReturnPlan; ordinary maintenance er exact-current.
- Source-visible er ikke abortbevis. Kun NOT_STARTED må `SAFE_SOURCE_ABORT`; ambiguous går til exact-target writer og separat non-Pages-finalizer. Third/mixed/reversed/stale/tampered/missing plan er fail-closed, og `pages-recovery-*` er næste source-lineage.
- `HISTORY_INCOMPLETE` publicerer alle 118 timer ved gyldige direct inputs; direct missing er timevis `UNAVAILABLE`. Outcome er lokalt schema v2, og Spørg RavRadar/plain-language-P2-måltests er grønne. Workflowet er opdelt i orchestrator/build/deploy, alle 40 direkte readers er migreret, public-integrated 210/673 og 78 browsermoduler er grønne, og slutreviewet fandt ingen P0/P1. Slutbindingen er integrated `a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b`/`db475a1bbb1b85fe3e0277b8687d6f1edd6dd8d74e0d6fb4df748f955d5bafe1` over 44 filer/8 consumers og Candidate G-rollback `c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8`/`ea22921e298a03ed1ef8787a4dbd79fd4fdf1a9b8e188d3c4b44e03f16fdceb0` over 56 filer. Assistentens state-6-fixture er fast sourcegate. Ny exact-head/merge/frisk produktion/Feggesund/browser mangler.

## Tidligere P0-checkpoint 2026-08-30 – 4.0.318 first-cutover-hærdning under DEC-0113

- Offentlig sandhed er fortsat 4.0.316/Candidate G. PR #235 bestod exact-head `33332106627`, blev merged som `a584d1cf`, men push-produktion `33333490853` stoppede sikkert før DMI, protected writes, artifact og Pages: den gamle resolver afviste 0 READY/673 kanoniske Candidate G-warmupstates som invalid migration.
- 4.0.318 adskiller tre beviser: eksakt public Candidate G-source, migrationsegnethed og den aktive centralt hydrerede samplingkontekst. Source manifest/conditions/register valideres samlet på en isoleret sti; det aktive 210/673-register materialiseres separat. Ingen geometri, kystnormal eller land-/vandpunkter flyttes.
- 673 READY + identisk source/active context + ét target giver `candidate-g-migration`. Komplet kanonisk warmup eller legitim contextændring giver national `genuine-cold-start`. Invalid, tampered, ukendt eller bindingsforkert source stopper. Cold start kræver `source_validated=true` og må ikke maskere en afvist integreret continuation/checkpoint.
- State 6 replay'er kun faktisk tilgængelige private, verificerede 0–48 timer plus reel target og bliver `HISTORY_INCOMPLETE`. Candidate G-rollback cold-replayes separat fra egne reelle timer, må ikke hybridiseres og skal selv være 48-timers READY før companion/checkpoint/release. Ingen syntetisk historik, interpolation, zonelån eller carry-forward.
- UTC-bootstrapmålet er canonical `YYYY-MM-DDTHH:00:00Z` og roundtriptestes Node→Python. Ikke-annulleret reel DMI-cacheprogression bevares privat på fejl; slutgaterne lempes ikke.
- Watchdog/bot `33334709027` og separat pilot `33335078275` stoppede begge rødt før deploy/offentlig mutation. De forklarer fejlmails; de er ikke skjulte modelreleasebeviser. Ikke-push drift vedligeholder Candidate G, mens første integrerede activation fortsat er push-only.
- Læs DEC-0113 og de fem nye aktive first-cutover-krav før videre arbejde. 4.0.318 har en regenereret endelig binding, men mangler versions-/docs-/testlukning, egen exact-head/merge, frisk fuld produktion/releasegate/artifact/Pages samt offentlig 210/673/current/femdøgns-/desktop-/mobilkontrol. Påstå ikke empirisk bedre fundpræcision.
- Det efterfølgende state-6-afsnit er det tidligere 4.0.317-checkpoint og må læses som præ-hærdningshistorik, ikke som livebevis.

## Historisk P0-checkpoint 2026-08-30 – integreret RavScore state 6

- 4.0.315 bestod PR #233 exact-head `33299676128` og blev merged som `63d789a4`. Run `33299747300` frigav D1-/reconstruction-readiness og startede build; den gamle grøn-no-op-interlock er ikke længere blockeren.
- Runnet stoppede rødt ved **“Stage audited last verified Candidate G public fallback”**, fordi ingen measured-only fallback var inden for både 72 timer og prognosehorisonten. Intet nyt artifact/Pages blev publiceret.
- 4.0.316 må lade en frisk measured-only primary publicere current+fem døgn uden fallback. Gammel/udløbet fallback skal være fraværende i manifest/public files og må aldrig vises. Kun forventet fallbackfravær er ikke-blokerende; uventet primary accounting/audit stopper fortsat.
- Ingen syntetiske data, interpolation, backfill eller zonelån. DEC-0111-retirementen består.
- DEC-0112 binder state `6.0.0` til konservativ `HISTORY_INCOMPLETE` lower/upper ved gyldige direkte input, tydelig auto-forsvindende DA/DE/EN-advarsel og `calibrationEligible=false`. Manglende direkte input er separat `UNAVAILABLE`/`null`. Current scorer kun 48 timer; 168 timers researchretention har ingen scoreeffekt; bølge- og last-mile-usikkerhedshaler lukkes efter henholdsvis 288 og 40 timer.
- Workflowmonolit, grøn-no-op-semantik og spredt version/docs/string-testkobling skal reduceres i modelleverancen, ikke i P0-hotfixen.
- Offentlig 4.0.316/Candidate G er observeret som `rr-20260830091913-210` med 210/673, men 0 aktive/210 `UNAVAILABLE` ved utilstrækkelig strømhistorik. Dette er regressionsevidens, ikke state-6-releasebevis. Kald ikke state 6 live før exact-head, merge, frisk fuld produktion, artifact/Pages og offentlig 210/673/current/femdøgnskontrol er bevist. Rør ikke geometri, zoner, punkter eller private data.
- Feggesund-parenten er 118/118 wave-missing i sanitiseret `rr-20260830104132-210`, men de tre aktive part-id'er findes, har `marineCoverage=full`, og Candidate G-current er tilgængelig i begge modes. Kræv frisk integrated 3 × 118 part-level-bevis før kildeændring. Kun ved et reelt part-hul og dokumenteret umulig korrekt direkte data må den ejerautoriserede konservative nabozonehypotese for præcis `DK-B05-11` vurderes særskilt; den er ikke implementeret eller generel fallback.
- Historisk 4.0.317-binding: `778db7aa3946f925607a8304daa42ed17dd30294e4a51bf6d895d7293e84c4e7`/`74bfc42bb008f6743f374fc35201d3ea6f81f6e360c99873541fed83eeadcbae` over 43 filer og Candidate G-rollback `c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8`/`fd3f7e70ec3706818c153c26140ae592e4f0ad2acc6c157183984689f74a2207` over 54 filer. Den daværende matrix var grøn; gældende 4.0.319-binding står i det nyeste checkpoint øverst.

## Historisk P0-checkpoint 2026-08-30 – 4.0.315 retirement og frisk produktion

- 4.0.314's tilbagetrukne one-time Candidate G-operation efterlod en aktiv readiness, som krævede et apply+Pages-bevis, der aldrig kunne eksistere. Normale vejrjobs blev grønne no-ops uden build, artifact eller Pages.
- Offentlig primary er observeret mere end otte timer gammel, og den målte recovery er over sin absolutte 72-timersgrænse. RavRadar viser derfor ærligt **“Aktuelle data kunne ikke hentes. Gamle data vises ikke.”**, men kan ikke vise prognoser.
- Ingen descriptor blev forseglet, ingen apply/rollback/cleanup blev kørt, og ingen syntetiske eller interpolerede data blev anvendt eller deployet.
- DEC-0111 tilbagetrækker DEC-0109 uden anvendelse. 4.0.315 fjerner operationsinput/jobs, actuator og apply+Pages-attestationen. `trip-storage-readiness` bevares for historical exact-D1 på 4.0.311–4.0.314, men returnerer eksplicit `ready=true` for 4.0.315.
- Bevar measured-only gap-checkpoint, continuation og senest-komplet recovery samt defensive trust-/schema-/turkvalitetslæsere. De defensive læsere kan ikke skabe data og er ikke en operationel tilladelse.
- P0 er ikke lukket ved lokal eller grøn topstatus. Kræv exact-head sourcegate, merge, en frisk normal produktion hvor fuld validate/releasegate, artifact og Pages faktisk kører, og offentlig 210/673-kontrol af aktuelle og femdøgnsprognoser.
- Rør ikke geometri, zoner, land-/vandpunkter, private data eller geodata ud over den særskilt autoriserede rene topversionssynk.

## Historisk modelcheckpoint 2026-08-30 – integreret RavScore state 6 under DEC-0110/DEC-0112

- Offentlig produktionssandhed er 4.0.316 med Candidate G som eneste offentlige model. `RRS-COASTAL-PROCESS-INTEGRATED-1.1.0`/state `6.0.0` er lokal releasekandidat og mangler exact-head, merge, frisk produktion/deploy og offentlig 210/673 desktop-/mobilkontrol. Schema 5 er kun en aldrig-offentlig eksakt 5→6-migrationskilde.
- Kandidaten bruger afgrænset kausal energivægtet wave-approach med fire timers halveringstid og en ældre hale, én DMI `FROM`→`TOWARD`-rotation og én 0,85–1-dæmpning af eksisterende supply. Fysisk levering er uopløst; DDM er kun statisk kontekst, Rainville 2026 kun buoyant-object-analogi, og ingen geometri eller punkter flyttes.
- Candidate G-cutover bruger `candidate-g-schema2-signed-current-reweight-bounded40h-wave-approach-to-integrated-schema6-v5`: signeret afledt kystnormal currentevidens genvægtes uden rå U/V; alle 673 schema-2-states skal give ét fælles target; wave-approach bruger 40 private præ-target-positioner fra coherent WAM-run pr. collection med same-cell provenance og kun højst fire timers same-run/same-cell-interpolation. Grænserne er `1/1024` udeladt EWMA-hale og `0.01171875` rå scorepoint før afrunding. Fejl bevarer Candidate G offentlig; ingen syntetisk/offentlig historik.
- Ægte state-6-cold start bruger 0–48 faktisk tilgængelige private verificerede timer plus reel target og forbliver `HISTORY_INCOMPLETE`, indtil 288 timers kausal tail closure eller attestert migration/continuation. Candidate G-rollback bruger samme target uden dobbelt credit; checkpoint-only recovery kræver en separat beskyttet READY companion fra samme generation. Nøddrift er kun same-model og atomisk i højst 72 timer; WAM-bootstrapinterpolation gælder ikke nøddrift, og cross-model fallback er forbudt.
- Ejeren opgav den fiktive morgenhulsrekonstruktion før descriptor/apply/mutation/publicering. DEC-0109 er kun historisk incident-/trustkontrakt. Kør ikke ny incident-inspect eller apply; de følgende 4.0.311–4.0.314-afsnit er revisionsspor.
- Fortsæt Sol/Ultra gennem dokumentationslukning, uafhængig helhedsrevision, integration af seneste grønne `origin/main`, releaseversion, fulde gates, egen PR/merge, frisk produktion og offentlig browserkontrol. Genbrug det historiske 4.0.317-bevis; de regenererede 4.0.319-digests står i nyeste checkpoint, og den fulde slutmatrix skal fortsat køres. Læs eller vis aldrig private payloads, rå U/V eller koordinater.

## Historisk P0-checkpoint 2026-08-30 – før-primary-gate lokalt afgrænset

- Offentlig produktionssandhed er stadig 4.0.310-nøddrift; morgenhullet er ikke lukket.
- PR #230 bestod exact-head `33277107562`/`99165644953` på `7ad1a98b`, blev merged som `228725ea`, og push `33277217412` var korrekt no-op.
- Første D1 `33277253662` stoppede fail-closed på en forbigående unauth-trip-probe-503 efter Edge med grøn roll-forward og nul inspect. Idempotent genkørsel `33277510537`/`99166722076` bestod hele backendkæden på samme SHA.
- Read-only inspect `33277738135`/`99167394284` stoppede før descriptor/apply/build/Pages og viste kun `ONE_TIME_GAP_BEFORE_NOT_UNIFORMLY_READY`. Ingen data eller cache blev ændret.
- Før-supportfilen er den ærlige primary; den komplette målte nødvisning blev publiceret separat. Før-primary må derfor være eksakt replaybar measured-only schema 2.0 `WINDOW_INCOMPLETE`. Kun det samlede target-reference-replay må åbne `READY` efter den ene forseglede interpolation.
- Lokal same-version-hotfix fjerner kun blanket-READY-gaten. Alle minimum-, replay-, cadence-, bracket-, targetanker-, source-, descriptor-, CAS-, privacy- og slut-READY-gates består. Ældre hul, for kort suffix, schema 2.1, ukendt status eller tampering stopper før descriptor.
- Syntetisk 210/673-test bruger 673 ærlige 24-timers `WINDOW_INCOMPLETE`-før-suffixer og består begge parentmiljøer. Næste rækkefølge er lokale gates/review → exact-head/merge/no-op → nyt D1 → ny inspect → eventuelt CAS-apply/frisk produktion/offentlig 210/673.
- Hent aldrig fuld inspectjoblog eller source-/descriptor-/rollbackartifacts. Brug kun allowlistet checkannotation. Ingen vejr, rå U/V, koordinater, geometri eller punkter ændres. Brug Sol/Ultra.

## Historisk P0-checkpoint 2026-08-29 – D1 grøn; sanitiseret diagnostikhotfix

- Offentlig produktionssandhed er stadig 4.0.310-nøddrift; morgenhullet er ikke lukket.
- 4.0.313 bestod PR #226 exact-head `33269501339`/job `99145314693`, blev merged som `ff62ba116d08a7894d206d350ea5bdde199fe433`, og push `33269584236` var korrekt no-op uden artifact/Pages.
- Exact-main D1-backend `33269631305`/job `99145677813` bestod hele kæden inklusive begge syncs, slutreconciliation, Edge, Worker, registry og SQL. Det er backendbevis for 4.0.313, ikke exact-head-bevis for en ny 4.0.314-head.
- Read-only inspect `33269849748`/job `99146287609` stoppede før descriptor/apply med den faste kode `ONE_TIME_GAP_AFTER_EVIDENCE_COUNT`. Ingen data eller cache blev ændret, og intet nyt descriptor-/releaseartifact eller Pages-deploy blev oprettet.
- Rodårsagen er snæver: de otte native 3-timersdele kan have præcis ét gyldigt målt højreanker i after-kilden. 4.0.314 tillader singleton kun i `AFTER`, kun når før+aktuelt mål uafhængigt beviser enstemmig 3-timerskadence, og fortsat kun efter fuldt state-replay, eksakt target-anker og alle source-/CAS-gates. Nul punkter samt singleton i før/mål/1-timesdele afvises.
- 4.0.314-kilden bestod PR #227 exact-head `33272564543`/`99153577550`, blev merged som `d1369d88`, og push `33272676071` var tilsigtet grøn no-op uden build/artifact/Pages.
- Den ældre 4.0.313-produktion `33271863449`/`99151692515` stoppede før releasegate/Pages, fordi en stale marine-first-test stadig forventede den tidligere dynamiske concurrencytekst. Same-version-hotfixet kræver nu præcis én `cancel-in-progress: false` og gør testen obligatorisk i `test:workflow-action-contracts`/`validate:source`.
- Docs-checkpoint PR #229 bestod exact-head `33275025105`/`99160126852`, blev merged som `9291250c`, og push `33275147023` var korrekt no-op uden build/inspect/Pages. Exact-main D1 `33275218540`/`99160622956` bestod hele storage-/Edge-/Worker-/sync-/slutattestationskæden.
- Read-only inspect `33275438494`/`99161265720` hydrerede mål og kilder, men stoppede i planforseglingen. Descriptorrefusal/-upload, build og Pages blev sprunget over; ingen descriptor, apply, data-/cachemutation eller publicering forekom.
- Den sikre Actions-annotation viste kun exit 1, mens domænekoden kun fandtes i hele jobloggen. Hent ikke den log. Den lokale diagnostikhotfix annoterer kun /^ONE_TIME_GAP_[A-Z0-9_]+$/ ved fejl og maskerer alt andet; ved succes kun descriptor-SHA samt validerede affected/synthetic/1h/3h-optællinger. Målrettet 210/673-black-box-test er grøn. Efter exact-head/merge kræves nyt exact-main D1 på den nye final-SHA før ny inspect. Normal produktion forbliver no-op indtil descriptorbundet apply+Pages; 4.0.315 er ulåst.
- PR #230's første head `e8f579ba` stoppede source-run `33276791132`/`99164804850` kun i testharnessen: normale child-cases arvede runnerens `GITHUB_ACTIONS=true`. Harnessen fjerner nu flaget for normale cases og sætter det kun eksplicit i annotationstests; 210/673-testen er grøn med begge forældremiljøer. Ingen produktion eller data blev rørt; ny exact-head afventer.
- Trip protocol/header og Candidate G model/formel/state-/trustsemantik forbliver 4.0.311/2.0–2.1. Ingen vejr, rå U/V, koordinater, geometri eller punkter ændres. Brug Sol/Ultra.

## Historisk P0-checkpoint 2026-08-29 – lokal 4.0.313 replay-roll-forward

## Historisk P0-checkpoint 2026-08-29 – lokal 4.0.312 roll-forward

- Offentlig sandhed er fortsat produktionsverificeret 4.0.310. 4.0.311 bestod PR #224's exact-head CI `33263734108` og blev merged som `7c168b00af535415117c968a8c021a493b083137`; push-run `33263858078` var en korrekt grøn no-op uden nyt artifact eller Pages-deploy.
- Backend-run `33263892151` stoppede ved den efterfølgende katalogverifikation, efter at den atomiske SQL-forespørgsel havde svaret HTTP 201. `pg_get_constraintdef` havde deparseret den kanoniske JSONPath med ekstra parenteser, som den flade regex ikke accepterede. Den sandsynlige tilstand er derfor, at CHECK-constraint, validering og kommentar blev committed samlet; transaktionens eneste atomiske alternativ er fuld rollback. Ingen observationpayloads blev hentet til runneren, logget eller ændret, ingen row mutation forekom, og D1, Edge, Worker, sync, vejr, artifact og Pages blev ikke nået.
- Den lokale 4.0.312-roll-forward erstatter den skrøbelige tekstregex med strukturel udtrækning af præcis én JSONPath-literal. Den tolererer deparserens parentesering, kræver den eksakte kanoniske path og afviser reorder, duplicate, extra og ambiguous. Målrettede regressioner, fuld lokal source/release/RDKS/håndbog/version og geodatakontrol er grønne, og exact-D1-interlocken omfatter 4.0.312; PR/exact-head, merge, backend, rekonstruktions-inspect/apply, frisk produktion og offentlig verifikation mangler fortsat.
- 4.0.312 er en app-/verifier-roll-forward og ændrer ikke trip protocol/header 4.0.311 eller den eksisterende `>=4.0.311`-migrationsgrænse.
- Ejeren har godkendt præcis én rekonstruktion af Candidate G-morgenhullet som incident `RRGAP-2026-08-29-CANDIDATE-G-01`. Kun allerede afledt kystnormal strength mellem eksakte artifacts må interpoleres; ingen vejr, bølger, vandstand, rå U/V, koordinater, geometri, punkter eller private payloads.
- Rekonstrueret state er schema 2.1 med eksplicit trust, ikke kalibreringsegnet og ikke gyldigt observeret udtransportbevis. Normal measured-only state/fallback er schema 2.0 og uændret.
- Inspect/apply/rollback/cleanup, measured-only fallback, tripflags og releasekæden er bindende. Storagekandidaten sætter existing-D1/fresh Edge-predeploy-intent efter capacity/CAS. Existing D1 bruger 20-/30-minutters lease, femsekunders prober, 600 sekunders restlease og samlet syvminutters Worker-gate; partial Edge går D1 roll-forward. Fresh partial Edge går exact-main/Supabase-secret/eksakt Edge/dobbelt attest. Uden intent ingen recoverymutation. Dette historiske næste-trin blev afløst, da 4.0.312 blev merged og dens backend fejlede migrationssynken; fortsæt kun fra det aktuelle 4.0.314-checkpoint ovenfor med Sol/Ultra.
- Den integrerede næste model er fortsat separat under DEC-0102 og skal efter recovery integrere den nye grønne `main` samt bevare DEC-0109's trust-/provenancekontrakt uden generel interpolation. Den skal selv bevare én målt-only atomisk 210/673-nødstate i højst 72 timer og aldrig efter kortere forecastudløb. `calibration_eligible` er ikke serverbevist empirisk evidens; global koefficientlæring forbliver låst.

## Historisk arbejdscheckpoint 2026-08-24 – 4.0.273

- **Candidate G er den eneste tilladte offentlige scoremodel.** Den aktive formel er `20 % søgeforhold`, `50 % transport mod kysten` og `30 % rav i bevægelse`. `25/40/35` må kun bruges til historisk analyse og kan ikke vælges som offentlig reserve.
- Manglende eller usammenhængende Candidate G-grundlag håndteres lokalt: den konkrete zone, søgemåde og time får ingen score og udelades fra aktuelle og femdøgns-ranglister. Andre zoner fortsætter på Candidate G. Der må ikke lånes score fra en gammel model, moderzone, nabozone eller anden time.
- Adminforsiden viser, om alle zone-/søgemådekombinationer har en aktiv Candidate G-score. Hvis ikke, listes de berørte zoner, søgemåder og almindeligt forståelige årsager uden private payloads, rå strømvektorer eller koordinater.
- Produktionshydrering, tidligere state, kildeproveniens og releasegates er fortsat fail-closed. En mangelfuld produktion må stadig stoppe før publicering; lokal utilgængelighed er ikke tilladelse til at opfinde data eller svække gates.
- Ændringen er implementeret og målrettet lokalt valideret. Exact-head CI, frisk produktion og offentlig runtime er endnu ikke verificeret. Se DEC-0072. Ingen geometri eller land-/vandpunkter er ændret.

## Historisk produktionscheckpoint 2026-08-23

- **Aktuel produktionsverificeret 4.0.265:** Kontoen har **Indberet tur eller fund** uden forudgående turstart. Brugeren skal selv vælge dato og klokkeslæt for turens start samt varighed; dato og tid er ikke forudfyldt. Nutidens vejr bruges aldrig som historisk erstatning, og en efterregistrering uden sikkert snapshot gemmes i den eksisterende `observations`-tabel med `calibration_eligible=false`. **Afslut uden at indberette** rydder kun den lokale aktive tur. Se DEC-0064.
- PR #111 bestod exact-head `32658661075`, blev merged som `cb7d2232`, og produktion `32658724861` bestod frisk vejr, fuld validering, releasegate, Supabase og Pages. Live `rr-20260823184330-210` er version 4.0.265 på 210/673, og den udgivne formulars dato-/tids- og fravalgskontrakt er målrettet kontrolleret. En autentificeret indsendelse kræver fortsat ejerens bevidste handling, fordi den opretter en virkelig række.
- **Tidligere produktionsverificeret 4.0.264:** Kontoen fik **Mine ture og fund** som en begrænset RLS-læsning af de eksisterende `observations`-rækker. Der oprettes ingen ny tabel, serverrække eller kopi. Den direkte v2-tur erstattede den gamle GPS-baserede parallelrejse i UI, og login/magic-link-tekster samt centrale RavScore-ord blev forenklet. Se DEC-0063.
- PR #106 bestod exact-head `32652894729`, blev merged som `23fa89ed`, og produktion `32652970105` bestod hele kæden. PR #107 bestod exact-head `32654048944`, blev merged som `8b758337`, og produktion `32654119745` bestod igen frisk data, fuld validering, releasegate og Pages. Live `rr-20260823171804-210` er 4.0.264 på 210/673. Konto-/loginforklaring, direkte tur uden GPS/rute og offentlig tekst er browserkontrolleret. Den fulde 420/2.100/673-audit er grøn med UI og audit enige om `Vandstandsændring på 3 timer`.
- PR #108 bestod exact-head `32654780774` og blev merged som den rene dokumentationscommit `98621bf9`. Mergecommitten oprettede 0 push-produktionskørsler; den eksakte rodhåndbog er dermed bevist omfattet af docs-only-skip. Den seneste push-produktion er fortsat den fuldt grønne `32654119745`.
- I den produktionsverificerede 4.0.265-baseline er kun versionsfeltet løftet i de to geodatafiler. Geometri og land-/vandpunkter er uændrede.
- **Tidligere produktionsverificeret 4.0.263:** DEC-0062 retter profilgatens referencescope. Memory-/warmup-aktivering bedømmes ved den nærmeste fælles aktuelle scoretid pr. zone; senere prognosegaps må ikke retroaktivt slå den aktuelle Candidate G fra.
- PR #100/exact-head `32642456123`, merge `586fbd18` og produktion `32642532892` beviser DEC-0061's cadence. Live `rr-20260823134605-210` fortsatte 673/673 states uden replaymismatch og gav 110 positive mod 563 fysisk fortsat nul, men 4.0.262 valgte legacy, fordi den for brede gate også inspicerede senere prognoser.
- Pre-public opvarmning var kun gyldig ved aktuel `WINDOW_INCOMPLETE`. I 4.0.263 gav `LATEST_SAMPLE_MISSING`, `WINDOW_HAS_MISSING_EVIDENCE` og `WINDOW_HAS_TIME_GAP` global rollback. Denne historiske offentlige adfærd er erstattet af DEC-0072's lokale utilgængelighed.
- Hele femdøgnets Candidate G-scorecoverage kræves fortsat. PR #101/exact-head `32644701811`, merge `9f5953f6`, fuld produktion `32644772373`, live `rr-20260823142247-210`, aktiv shadow `32645569741` og browserkontrol er grønne. Candidate G er aktiv på 210/673 med 139 positive og 534 aktuelt fysiske nultransporter; replay- og visningsfejl er 0.
- Ejeren besluttede i DEC-0060 at aktivere Candidate G allerede under den første, ikke-offentlige opvarmning. 4.0.261 brugte `RESEARCH-3` med `20/50/30` og bevarede dengang `25/40/35` som global rollback. DEC-0072 har siden fjernet den offentlige rollback.
- Den ufuldstændige, men sammenhængende transporthukommelse blev vist ærligt som `candidate-active-pre-public-warmup`; den måtte ikke kaldes et 48-timersbevis. DEC-0072 erstatter kun fejlhåndteringen: et lokalt hul skjuler nu den konkrete score uden at skifte resten af landet til legacy.
- Profilvalget hydreres og skrives tilbage som det centrale admin-dokument `ravscore-profile-selection`. PR #97 aktiverede modellen; PR #98 lukkede den daværende shadowkontrakt; PR #99 registrerede den grønne browserkontrol. Disse gates fangede ikke cadencefejlen ovenfor og kan derfor ikke længere stå alene som scorebevis.
- Den gældende helhedsmodel er `RESEARCH-3`: `20/50/30`, DEC-0054's vindstyrede waders-jagtbarhed, DEC-0055's strømstyrede transport og DEC-0056's ene bølgeenergistyrede mobiliseringstilstand.
- Mobilisering bruger højde² × periode med fire timers opbygning og 48 timers aftrapning. Direkte vind, aktuel strøm, separat varighed og statisk stedegnethed giver ingen mobiliseringspoint.
- PR #92/exact-head `32628441062`, merge `c5898ce8`, produktion `32628516066` og live `rr-20260823083627-210` er grønne for 210/673/1.346 og browser 420/2.100/673. Statealderen er 9/9 timer uden nulstilling; det er ikke et 48-timersbevis.
- Den tidligere score-neutrale Candidate G-shadow lå væsentligt lavere end legacy, fordi den ubundne start 0 fortsat dominerede efter 65–117 timers historik. Ejeren afviste en vilkårlig startprior og valgte DEC-0059's faste 48-timers evidensvindue. State schema 2 genafspiller afledt kystnormal strøm fra samme rand og markerer missing/tidsgab. DEC-0060 erstattede kun kravet om komplet memory før den første pre-public aktivering; mekanikken er valideret med simulation og historisk replay, og der kræves ikke en ny 48-timers realtidsudviklingstest. Opret ikke en parallel model, og tillad aldrig automatisk aktivering.

## Verificeret startbaseline
- Applikationsversion: **4.0.117**.
- Aktuel `main` ved handoff: `a164b6e52fa18efc7209d90779048bb86bcf870a` (`RavRadar 4.0.117 codex handoff v2`).
- Historiske #1749/#1750 var grønne i deres daværende kontekst, men må **ikke længere bruges som bevis for den aktuelle handoff-baseline**. Efterfølgende fejlsøgning viste, at almindelige automatiske `workflow_dispatch`-kørsler kan springe de to fulde releasegates over og stadig deploye.
- #1760 kørte på `a164b6e…`, opdaterede DMI/weather/provenance/public runtime og deployede succesfuldt, men trinene `Validate full project after fresh weather and current provenance` og `Run release governance gate after refreshed data validation` var begge **skipped**. Derfor er #1760 et deploy-/datakædebevis, ikke et fuldt releasebevis.
- De centrale adminrettelser blev i #1750 hentet fra Supabase, anvendt på zoneregisteret og ført videre gennem vejrproduktionen.
- En senere kørsel skal altid vurderes som nyere evidens, men må ikke automatisk omskrive denne dokumenterede baseline uden analyse.

## Læs i denne rækkefølge før første ændring
1. `AGENTS.md`
2. `docs/rdks/00_READ_FIRST.md` og `docs/rdks/01_AI_OPERATING_RULES.md`
3. `docs/rdks/90_INDEX/CURRENT_TRUTH.md`
4. `docs/rdks/90_INDEX/IMPLEMENTATION_STATUS.md`
5. `docs/rdks/20_REQUIREMENTS/ACTIVE-REQUIREMENTS.md`
6. `docs/rdks/40_KNOWN_ISSUES/KNOWN-ISSUES.md`
7. `docs/ai/AI_KNOWLEDGE_BASE.md`, `AI_ARCHITECTURE_MAP.md`, `AI_WORKING_RULES.md`, `AI_ROADMAP.md` og `AI_LESSONS_LEARNED.md`
8. relevante beslutninger under `docs/rdks/10_DECISIONS/`
9. relevante dele af `HANDBOOK-RAVRADAR.md` og den aktive kode/testkæde
10. historiske chatfiler kun når en beslutnings begrundelse eller regression skal rekonstrueres.

## Første kontrol i en lokal Codex-session
Kør `git status`, `git log -5 --oneline` og kontroller `package.json`/`version.json`. Kør mindst `npm run validate:rdks` før dokumentationsarbejde og relevante målrettede tests før kodeændringer. Før release kræves hele den gældende validerings- og releasegate.

Før hvert væsentligt arbejdsafsnit skal Codex desuden anvende DEC-0031: vurder modelbehovet, anbefal aktivt en billigere aktuel model når kvaliteten er den samme, og stop senere for at anbefale Sol igen før kritisk arbejde. Kvote må aldrig sænke analyse- eller valideringskrav.

## Stabilitetsord
Brug ikke ordet **stabil** om noget, der kun er lokalt grønt. Skeln mellem:
- **lokalt valideret** – relevante lokale tests er grønne,
- **CI-valideret** – den relevante GitHub Actions-kørsel er grøn,
- **produktionsverificeret** – frisk produktionsdata, artifact/deploy og den berørte runtimekæde er faktisk verificeret.

## Hovedregel: tænk hele brættet
Når en fejl viser sig i ét led, må Codex ikke straks lappe dette led. Kortlæg først input, central konfiguration, scheduler, tidsbudget, cache, DMI-collection, GRIB-parser, komponentparring, interpolation/routing, provenance, score/state, public runtime, UI/admin, tests, artifact, deployment og browsercache. Sammenlign om nødvendigt med seneste fungerende version og identificér den introducerende ændring.

## Autoritative kilder
Aktuel brugerbeslutning og aktiv RDKS er kravgrundlaget. Git repositoryet er kodegrundlaget. Supabase er autoritativ for centralt gemte administratorændringer. DMI er autoritativ vejr-/havdatakilde. Håndbogen forklarer faglig og driftsmæssig betydning. Chatarkivet er historik.

## Stopklodser
Codex må ikke få tests grønne ved at genindføre stale vejrdata, konstruere manglende værdier som nul, bruge generelle regionale strømbånd, hardcode administratorredigerbare zonedata eller svække videnskabelige audits.

## Praktisk handoff
Brug `docs/ai/CODEX_HANDOFF_CHECKLIST.md` ved første lokale opsætning og før den første Codex-release.

Hvis `docs/ai/CURRENT_SESSION_HANDOFF.md` findes, skal den læses efter de obligatoriske RDKS-indeksfiler. Den beskriver den seneste sikre arbejdsgrænse, men kan aldrig tilsidesætte nyere brugerbeslutning, RDKS eller faktisk kode.

## P0 – første Codex-opgave før al videre udvikling
Workflowrettelsen er implementeret og produktionsverificeret i #1772: begge fulde gates kræver enhver positiv preflight, artifactet ligger efter gates, og samme friske run viste begge gates samt Pages-deploy som `success`.
1. Kontrollér den aktuelle workflowfil og bekræft gatebypasset: de to fulde gates er betinget af `push || force`, mens almindelig `workflow_dispatch` stadig kan nå artifact/deploy.
2. Ret workflowet systemisk, så et nyt produktionsartifact ikke kan deployes efter en frisk dataopbygning uden at de relevante fulde gates faktisk har kørt og bestået. Svæk ikke gates og ændr ikke RavScore/DMI-regler for at få grønt.
3. Kør lokale målrettede tests + `npm run validate` + `npm run release:gate`.
4. Commit/push workflowrettelsen fra Codex.
5. Følg den første friske GitHub-kørsel trin for trin. Den tæller kun, hvis de to gate-trin står som **success**, ikke `skipped`.
6. Hvis den bliver rød, analysér den konkrete runtimekæde og ret årsagen. Ingen ny større featureudvikling før en fuld streng produktionskørsel er grøn.

**Vigtigt:** Handoff-ZIP'en før Codex ændrer med vilje ikke workflowbetingelserne. Det er en midlertidig bootstrapmekanisme, ikke accepteret slutarkitektur.

## Permanent PR- og mergeautoritet
Codex må oprette, opdatere og selv merge datasikre PR'er fra egne RavRadar-branches, når hele den relevante validerings-, regressions-, dokumentations- og produktionskontrakt er verificeret. Grøn topstatus alene er ikke nok ved konkret modstridende evidens, og røde eller uafklarede gates må aldrig omgås. Efter merge følges deploy og produktion uden unødigt stop. Irreversible, destruktive, usædvanligt risikable eller ikke-godkendte produktbeslutninger kræver fortsat ejerens udtrykkelige godkendelse. Se `docs/rdks/01_AI_OPERATING_RULES.md` og `docs/ai/AI_WORKING_RULES.md`.

## Lokal Codex-klargøring og kildekontrol
- På en frisk Windows/Codex-runtime køres scripts/setup-codex.ps1 én gang. Scriptet installerer projektets tre eksisterende Python-afhængighedssæt og ændrer ikke repositorydata.
- Under udvikling køres målrettede tests. Den fulde validate:source skal bestå på PR'ens eksakte head i GitHub; den gentages kun lokalt ved bred risiko, manglende CI eller konkret fejlevidens.
- Push og manuelle produktionsbyg kører fortsat den tidlige kildekodegate. Planlagte vejropdateringer på samme allerede kontrollerede main-kode springer kun denne gentagelse over.
- validate:source er aldrig en erstatning for den fulde npm run validate og npm run release:gate, som fortsat skal køre efter central hydrering og frisk vejr før ethvert deploybart artifact.
- Fuld browserkontrol er hændelsesstyret: ugentligt eller ved ændret UI, score eller offentlig datakontrakt. Se DEC-0045.
- Midlertidige runtime-shims skrives kun i systemets temp-mappe og må ikke stages.
