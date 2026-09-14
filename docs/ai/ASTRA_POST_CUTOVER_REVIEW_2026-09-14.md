# Astra-review efter offentlig cutover – 2026-09-14

Status: Analysecheckpoint, ikke en ny release og ikke en erklæring om fejlfri drift. Gennemført på ejerens udtrykkelige ønske om grundig helkædeanalyse før næste almindelige vejrkørsel. Ingen providerkørsel, sourcegate, bred testsuite eller produktionskodeændring er foretaget af dette review.

**Implementeringsopfølgning 2026-09-15:** De bekræftede rettelser A–D og de afgrænsede UI-/dæknings-/EDR-fejl er implementeret i lokal 4.0.366 sammen med DEC-0148's separate kode-only-deploy. Den latente dublet/kilde-parringsrisiko forbliver åben. PR, offentlig deploy og normal driftsmåling mangler; reviewets ældre formuleringer om “endnu ikke implementeret” er historiske efter dette punkt.

## 1. Faktisk produktion og arbejdskontekst

- PR #306 er admin-squash-merget efter ejerens specifikke godkendelse uden PR-gaten. Main: `fa418f43bbd070c446ed19b6587541b93af89599`; tree: `2a7ad3a8e9a169a93ccd06b36fd31c67c78e495f`.
- Cutover `34877443841` lykkedes. Pages-deployment `6443326182` og privat runtime-publicering lykkedes; Supabase-overgangen blev afsluttet. Sourcegate, providerhentning og de brede valideringer blev sprunget over. Cutoveren skal IKKE køres igen.
- Offentlig model er `RRS-COASTAL-PROCESS-INTEGRATED-1.1.0`, state-schema `6.0.0`. Modellen er online, men leverer endnu ingen tilgængelige scorer i det gennemgåede dataset.
- Dataset: `rr-20260914180039-210`, genereret `2026-09-14T18:00:39.839Z`, vejrreference `2026-09-12T08:00:00Z`, gyldigt til `2026-09-17T05:00:00Z`.
- Offentlig struktur: 210 zoner, 673 kystdele, 118 timer, begge modes. Alle 49.560 zone/time/mode-resultater er `UNAVAILABLE`, alle med `validPartCount:0`.
- `manifest.complete:true` og `scoredPartCount:673` er struktur-/evalueringsantal. De er IKKE bevis for numerisk komplette vejrdata eller 673 gyldige scorer. Historiske formuleringer om et komplet datasæt var for vidtgående.
- Workflow `318363965` er fortsat `disabled_manually`. Reviewet har ikke startet eller genaktiveret vejret.
- Checkpoint-build/save/publish blev alle sprunget over som `NOT_APPLICABLE_DURING_MEASURED_WARMUP`. Privat runtime blev derimod gemt. Antag derfor ikke, at et nyt separat checkpoint findes.

Arbejd i `C:/Users/Lenovo T14/.codex/visualizations/2026/09/11/01a0921c-8963-7280-9acf-5b5cc32b61c5/RavRadar-4.0.366`, branch `codex/nonblocking-preflight-cache`, HEAD `40c2ff2434c4f9186f712f3a2def2c0371782ba5`. Træet var byteidentisk med merged main før dette dokumentationscheckpoint. Mappeendelsen er ikke releasebevis: den reelle appversion er stadig 4.0.365. Bevar den beskidte oprindelige `cb79/RavRadar`-worktree urørt.

## 2. Ejerbeslutninger, som erstatter ældre launchinstruktioner

Ejeren har gentagne gange krævet online-først, genbrug af allerede udført arbejde, ingen kildegate eller brede test-/kontrolrunder, fortsættelse gennem installationens uafhængige trin og samlet fejlrapportering. PR #306's admin-merge uden PR-gate blev specifikt godkendt. En lokalt utilgængelig score må ikke i sig selv stoppe offentliggørelsen. Godkendelse til normale scoped rettelser, commit, push og merge er stående givet.

Den aktuelle ekstra instruktion er at analysere grundigt og finde flere fejl FØR vejrkørslen med rettelsen. Det er ikke en tilbagekaldelse af forbuddet mod kildegate/testspiraler. Dette review bruger kode, eksisterende logs, offentlig runtime og små afspilninger af konkrete fejlsteder; ingen projekt-testsuiter er startet. Ukendt måling må stadig ikke omdøbes til nul, grøn kontrol eller fuld dækning. Fejl i en ekstern write kan rapporteres og efterfølges af øvrige mulige trin, men aldrig kaldes en vellykket write.

## 3. Bekræftede input-/modeldefekter til én samlet rettelse

### A. Gyldig DKSS-vind tabes i en senere sammenfletning

`scripts/update-weather.mjs:2879`, især `tupleSource` omkring 2898–2905, spørger den strenge kildeverifikator efter `wind`. DKSS-vinden ligger korrekt under `sources.wind`, men har deklareret komponent `windTail`. Verifikatoren afviser derfor gyldig vind, og merge overskriver vindhastighed/-retning med null ved 2930–2931.

Tidligere rettelser i `bulkZoneToForecastRecord` (1045–1048), DMI-builderen og `ravscore-production-adapters.mjs` accepterer allerede den korrekte deklaration; de kan ikke genoprette tal, der er slettet imellem dem.

Rettelse: vælg kun `windTail`, når det efterspurgte felt er wind OG den pågældende kilde selv deklarerer windTail; ellers behold wind. Bevar samme time-, komponent-, identitets- og proveniensverifikation. Ingen generel lempelse.

Direkte replay med den virkelige builder, kildeverifikator, merge og efterfølgende sanitizer: 4 gyldige vindtimer før merge; gammel merge 0; rettet merge og sanitizer 4. Strøm og bølger er uændrede. HARMONIE accepteres fortsat; forkert identitet, forkert komponent og grid-relative vind afvises fortsat. Kildeobjektet ændres ikke. Den eksisterende integrationsfixture stubber verifikatoren og kunne derfor ikke fange denne fejl.

### B. Afrunding af kompasretning kan gøre gyldige data ugyldige

`scripts/lib/dmi-forecast-store.mjs:693`, `:695`, `:705` afrunder normaliseret vind-, bølge- og strømretning. 359,6 grader bliver 360. Den næste atomiske inputfunktion kræver retning under 360 og afviser derfor hele komponenten, ikke blot visningen.

Reproduceret gennem samme faktiske merge-/sanitizerkæde: alle tre komponenter går fra 4 til 0 timer ved denne grænse, også efter vindrettelsen. Normaliseres den afrundede retning fra 360 til 0 hos producenten, overlever alle tre igen 4/4 timer. Offentlige parent-data indeholder også to strømretninger på 360; det beviser ikke, at denne fejl forklarer alle resterende strømhuller.

Rettelse: normaliser EFTER afrunding for alle tre retninger, med eksplicit numerisk guard, så null ikke bliver 0. Bevar den strenge intervalkontrakt hos forbrugerne.

### C. Et ukendt strømtrin bliver fejlagtigt attesteret som dækket interval

`js/core/ravscore-integrated-state-pipeline.js:1930`: `nativeCadenceIntervalAttested` kan bruge seneste gyldige måling og et senere hold, selv om en eksplicit null ligger imellem dem. Validatoren i `ravscore-current-supply-memory.js` afviser korrekt dette falske interval.

Offentlig evidens: 8 kystdele ved `2026-09-12T09:00:00Z`, begge modes, i alt 16 `CURRENT_HISTORY_STATE_INVALID`. Delene er B05-12 part01; B05-17 part02/03/04; B05-18 part02/03/05; B05-20 owner-approved01.

Minimal rettelse: attestér kun et nyt interval, når sidste element i `currentEvidence` også er `lastVerified`, foruden de eksisterende betingelser. Null skal blive stående. Validatoren skal ikke lempes.

Virkelig produktionskode er afspillet med måling06 → null07 → dokumenteret H0-hold08 → måling09 → måling10. Før rettelsen bliver09 `INVALID_NATIVE_HOLD_INTERVALS`/utilgængelig og den serialiserede evidence tom; efter rettelsen bevares null,09 bliver ærligt `HISTORY_INCOMPLETE` med konservativ scoremulighed. De første tre trin er identiske, og et legitimt sammenhængende holdforløb er uændret.

Denne rettelse ændrer model- og continuationbinding; se afsnit6. Den er ikke blot en UI- eller workflowændring.

## 4. Bekræftede visnings-/rapportfejl

1. `js/ui/info-panel.js:324–326`: `Number(null)` får manglende vandstand med i tabellen og dagens min/max som 0cm. Live: 357 af 24.780 zone-timer har null vandstand, heraf21 efter Sep14 18Z. Brug den eksisterende `hasNumber` eller strengt numerisk guard; bevar reel0.
2. `js/ui/account-panel.js:67`: uoplyst fundvægt vises som 0g. `observation-service.js:106` producerer legitimt null ved blank vægt. Ret rendererens guard lokalt; ingen global formatomskrivning. Ingen privat kontohistorik blev læst.
3. `local-zone-score.js:327`, `:346` og `app.js:166`: `abs(time-now)<1h` kan mærke næste prognosetime som nu, fx19:00 ved kl18:20. Brug samme aktuelle UTC-time og ikke en fremtidig time. Ingen rangering-/scoreændring.
4. `js/i18n.js:138`, `:398`, `:658`: nødteksten lover seneste komplette integrerede prognose alene på baggrund af driftsmode. Skriv senest gemte på DA/DE/EN. Manifestets strukturelle complete-felt må ikke ændres i blinde.
5. `update-weather.mjs:3820`: `expected=Math.min(hours,hourly.length)` kan kalde én gyldig time for en komplet118-timersprognose. Kræv det faktisk efterspurgte tidsraster i numerisk dækning; manglende timer tælles som manglende, ikke reduceret nævner.
6. `componentForecastHorizonHours:3071–3078` og atomic-varianten måler sidste gyldige endepunkt, ikke hulfri dækning. Faktisk funktion giver 96 timer for én række ved +96h, selv om de første 96 timer mangler. `completeZones:3869` må ikke bruge dette som komplethed. Funktionen bruges også til `recordHasMarine`/`recordHasAtmosphere`. **Bekræftet faktisk følge:** parent-zoner med indvendige vind/bølge/vandstandshuller kan udelades af EDR-reparationens `targetFeatures` ved 3675–3678, eller atmosfæredelen kan udelades ved 3701. Ret disse forbrugerbeslutninger sammen med rapporten til et eksplicit påkrævet UTC-tidsraster med atomiske komponenter; et fjernt endepunkt er ikke dækkende. Bevar eventuelt separat endepunktsstatistik. Rækkeantal/dubletter og manglende første time må ikke give falsk dækning. Lad ikke denne afgrænsede EDR-rettelse ændre den separate Python-strømrotation.
7. Diagnostisk bølgedækning omkring3800/3818 bruger kun højde; brug den kanoniske atomiske bølgekontrakt. Latent fejl: ingen konkret live-højde/periode/retningskonflikt blev fundet.

Ovenstående er forskellige steder/følger, ikke et løfte om et endeligt antal fejl i hele systemet. UI-rettelser kræver rigtig versionssynkronisering: serviceworkerens cache-first bruger versionsmærkede assets, så uændret version kan skjule rettet kode for tilbagevendende brugere.

## 5. Normalt vejr, rotation og resterende numeriske huller

Normal DMI-producent har900sekunders budget og3kollektioner pr. kørsel. Strikt DKSS-strømplan sorteres efter gemt `lastStrictCurrentTurnAt`; kun det faktisk førende led stemples, og rotation checkpointes før providerarbejdet. De øvrige kollektioner får reserveret tid. Kritiske DKSS-led er undtaget den produktive kollektionsgrænse. Restore bevarer nyere checkpointrotation frem for blot at vælge cache med størst volumen.

Det er positiv kodeevidens, ikke bevis for at tre kommende normale produktionskørsler vedligeholder alle data. Der er ikke fundet en regel, der kun lader DMI søge på tidligere succesfulde kystdele. Rene topversionsændringer ændrer heller ikke samplingregisterets hash.

### D. Supplerende EDR-reparation er ikke reelt uafhængig

`update-weather.mjs:2748–2757` kaster ved fejl i hav-/vandstandskaldet, før `includeAtmosphere`-blokken ved 2762 kan forsøge vind og bølger. Det modsiger filens egen hensigt om uafhængig reparation ved 3673. Direkte afspilning: hav-503 gav ét DKSS-kald og nul vind/bølgekald; tom havrespons gav to DKSS-kald og nul vind/bølgekald. Bevar havfejlen i komponentrapporten og fortsæt med de andre efterspurgte komponenter; beslut først efter de uafhængige forsøg, om der overhovedet er brugbare resultater. Omdøb ikke et fejlet havkald til succes.

Vigtig begrænsning: `dmiPosition` afleverer rå egenskaber og skaber ikke selv den native proveniens, forecast-builderen kræver. At vind/bølgekald nu bliver forsøgt er derfor ikke i sig selv bevis for gyldige scoreinput. Bevar verifikationen; opfind ikke GRIB-/vektorbevis til EDR-rådata. Rapportér forsøg og faktisk accepterede komponenter separat.

`recordHasMarine` kræver samtidig strøm, selv om EDR-kaldet udtrykkeligt aldrig må hente strøm. Et rent strømhul kan derfor udløse EDR-budgetforbrug uden mulighed for at rette det. Adskil EDR-reparerbare behov (vandstand/temperatur og efterspurgt vind/bølge) fra den generelle marine-helbredsstatus. Bevar nuværende requestbudget, timeout og rate-limit-regler. Dette ændrer ikke strømproviderkæden eller dens trekollektionsrotation.

Endpoint-fejlen fra afsnit 4 kan springe EDR-reparation over, men kan ikke direkte springe den autoritative lokale strøm-closure over: den bygges tidligere i workflowet, og EDR udelukker strøm. De to årsager må ikke blandes sammen.

Ved H0: 673/673 mangler accepteret vind; bølgehøjde673; numerisk direkte strøm659; vandstand669. Otte andre currentforløb er dokumenterede holds, som ikke skal have opdigtede direkte vektorer. Seks har `no-time-specific-verified-water-column`.

Over alle118timer findes967unikke part-timer med `CURRENT_DIRECT_INPUT_NOT_READY`, fordelt over126kystdele, cirka1,22% af79.414par. Der er ingen kystdel, som mangler strøm i alle118timer. De967 kan IKKE alle henføres til en bestemt upstreamårsag ud fra den offentlige projektion alene. Vindfejlen kan desuden skjule andre scoreinputårsager. Lov derfor ikke alle scorer alene efter vindfix.

Python-closure READY betyder, at alle par er tildelt en verificeret kilde eller et tilladt hold. JS-kæden kan stadig tabe data bagefter. Fremtidig driftsrapport skal tælle faktisk accepterede post-sanitizer-tal, kilde, hold og lokalt manglende komponent hver for sig. `complete`/`scoredPartCount` er ikke stedfortrædere.

Afvist hypotese: CP/OM/regional U/V-afrunding er ikke generelt inkonsistent; de gennemgåede producenter bruger samme femdecimalsgrundlag. Ingen ny generel upstream- eller rotationsfejl er bevist af dette review.

### E. Latent dubletfejl: tal og kildemærkning kan komme fra forskellige rækker

`dmi-forecast-store.mjs:622–630`, `normalizeForecastHourly`, bevarer tal fra første række på en time, men overskriver dens sources med den anden rækkes sources. Afspilning med to hver for sig gyldige syntetiske modelkørsler reproducerede blandingen for vind, strøm og bølger, og den faktiske verifier/sanitizer accepterede den. Dette er en reel helper-integritetsfejl, men der er ikke fundet en aktiv kanonisk producent, som afleverer disse dubletter: builderen producerer unikke tider; merge normaliserer sine input hver for sig; replay afviser dubletter. Derfor er det **ikke** bevis for årsagen til de aktuelle strømhuller.

Afgrænset rettelsesprincip, hvis medtaget i samme DMI-builderændring: ved dublettid vælges hver komponent atomisk fra én og samme række, inklusive dens tilhørende kilde. Tal fra A må aldrig få kilde B. En komplet gyldig senere tuple kan udfylde en manglende tuple, men delvise rækker må ikke tilsammen fremstille en ny udokumenteret tuple. Unikke inputrækker og legitime nul-/calm-værdier skal være uændrede. Undgå en ny generel exception på hele datasættet for en dublet; behold deterministisk dokumenterbar komponent eller lokal mangel. En bred normalizerombygning uden afgrænset virkning er ikke et nyt deploykrav; registrér i så fald dette eksplicit som udestående risiko.

## 6. Undgå kendte stop før den normale reparationskørsel

### Gemt runtime og modelovergang

Ændring i updateren ændrer full-runtime-kontrakten. H1-fixet ændrer desuden modelbundle og continuationkontrakt; DMI-builderen indgår transitivt i modelafhængighederne. En almindelig restore under ny kode vil afvise den gamle modelbinding, før selv eksplicit forventede gamle hashes kan hjælpe. To steder binder globalt til aktuel kode: `protected-private-production-runtime.mjs:364` og `private-production-runtime-bundle.mjs:218`.

Eksakt kendt forgænger:

- producer/head: `fa418f43bbd070c446ed19b6587541b93af89599`
- dataset: `rr-20260914180039-210`
- bundle content: `033fd85bf79776256083da4e5bca8e8164c8056350b2bb9b1acb7b57cac5ef6b`
- integrated model bundle: `327b989b731e6e84bf05bdb6bd54707d47c04d5bdf80038d437332e84a4c8e01`
- model contract: `a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b`
- continuation contract: `e272bd48de768e593904a362df92f40b5e5ab2c3dac0263216518d04b8bf4ea1`
- full runtime contract: `8de96f0a37a0411a8e65173f864f297eb8ea02108c5261ab3e073219562d74f9`
- public projection contract: `0c31005b572bb9e3cf93e83e055bc6976e83e0bb9be5a2a3c7c11284dc172ab5`

Hashes ovenfor er beregnet på gitblob/produktionsbytes, ikke Windows-CRLF-filer.

Afgrænset implementeringsvej:

1. Gendan den præcise forgængers allerede gemte pakke med dens eksisterende restorekode i isoleret, fastlåst checkout. Den kontrollerer arkiv-/filhashes, binding, inventar og72timersalder. Ingen generel allow-incompatible og ingen ommærkning af gammelt arkiv.
2. Bevar alle9private filer, især fulde conditions, gammel DMI-cache og Candidate G-warmup-roden. Der er ikke et bekræftet separat nyt checkpoint at erstatte dem med.
3. Overfør kun kopier af de gamle H0-continuationstates. Kræv præcis gammel bundle/schema/model/partidentitet og state.time lig gammel reference. Den gennemgåede forskel vedrører fremtidig intervalattestation, ikke ny fysisk betydning af gyldig H0-state. Bevar alle tal, nuller, evidens, referencer, intervalbeviser, historikgrænser, bølgetilstand og lineage. Ændr kun eksplicit gennemgået ny binding i kopien.
4. Den gamle validator skal kunne læse originalen; den nye `assertIntegratedCoastalPointContinuation` (`coastal-point-staging-contract.mjs:220`) skal kunne rekonstruere den oversatte kopi. Den eksisterende funktion udfører allerede canonical state-rekonstruktion. Gennemgå alle states i én opsamling; ikke én ny workflowstart pr. fejl. Bevar ugyldige originaler til diagnose og brug ærlig lokal recovery/utilgængelighed frem for at opfinde historik.
5. Candidate G-warmup kan også få ændret bundle transitivt. Bevar dens målte historik og gennemgå den gamle/nye statebinding eksplicit. Et gammelt resultat må aldrig blot skifte modelnavn.
6. Den normale bygning skal lave nye scorer og metadata. Eksisterende `ravscore-recovery-replay.mjs:363` kan føre state frem fra næste time, højst72timer. Updateren bevarer gammel DMI-cache før oprydning og kombinerer den med ny cache som særskilte verificerede replaykilder ved2248–2325. Manglende mellemtimer skal bevare ukendt historik.

**Resterende implementeringsevidens:** De673 private H0-states er ikke alle prøvet mod den kommende, endnu uskrevne rettelse. Ovenstående er en konkret overgangsplan, ikke en påstand om gennemført migration. Brug det allerede gemte input under implementeringen; ingen ny oneoff. Ved overskredet72timersafstand følges eksisterende kausale recoveryregler; ændr ikke tidsstempler for at omgå grænsen.

### Backend og workflow

- Brug næste normale `workflow_dispatch` med `force=true`, uden first-cutover-, return- eller gamle handoff-inputs. Med ny modelbinding vælger policyen `integrated-historical-maintenance`; den integrerede model forbliver aktiv.
- Backend kræver append-only bindingsmigration, opdateret Edge-kontrakt og readiness på præcis kommende main. Genbrug nødvendige deploy-trip-storage-trin i en binding-only-vej; genstart ikke gamle D1-/kildekontroller. Ingen ændring af historisk anvendt migration15.
- `reusable-weather-build.yml:768–827` har stadig sourcegate; reference/full validate/release/data-undtagelser dækker kun første cutover, ikke historical-maintenance. Den aktuelle ejerbeslutning skal gælde den planlagte reparation, ikke kun den allerede afsluttede cutover.
- Copernicus-postbuild kræver kildeproof-markør ved2536 og kalder endnu en sourcekontrol i caller ved2052. Spring det redundante postbuild-led over i reparationsvejen; normal primær Copernicus-fallback må stadig køre. Fremstil aldrig en fiktiv grøn sourceproof-markør.
- Callerens `operational_action || integrated-cutover`-fallbacks må ikke give en normal kørsel cutoveridentitet, blot fordi et output mangler. Hold direkte-cutover-undtagelsen til den faktisk valgte cutovervej; behold synlige trinresultater og ærlige fejl.
- Storagegrænser50MBprdel,350MBsamlet og8dele er allerede globale; ingen ny normalrestore-størrelsesspærring blev fundet.

## 7. Afklarede ikke-fejl og resterende UX-risiko

- Tom `forecast.hourly` i startup er tilsigtet; detaljepakken har118timer. Ret ikke startup-schema for at fylde dem ind igen.
- All-parts-reglen er ikke årsag til et landsdækkende udfald: alle de undersøgte zoner har0gyldige dele. Lokal availability må ikke gøres til en global gate.
- Aktuel tidsprojektion bruger rigtig UTC-time fra detaljepakken, ikke Sep12H0 som nutid. Projektionen nulstiller bevidst ikke-vindende deles aktuelle felter; dette beviser ikke rå cachehuller.
- Detaljepakken er117.820.378bytes ukomprimeret. Med ældreH0 kræver første aktuelle score hele pakkens download/hash/parse. Dette er en konkret omkostning, ikke et bevist browsercrash eller en bevist bytegrænse. Undlad stor schemaombygning som nyt launchkrav.
- Browserautomation kunne ikke starte på grund af lokal ACL-fejl. HTTP-/payloadlæsning lykkedes. Ingen visuel210/673-browserkontrol er gennemført, og det må ikke påstås.
- Gamle jobløse runs34613079069 og34228112413 er ikke slettet: cancel/force-cancel gav409, delete403. Tidligere successprint var forkert. Undgå gentagne identiske forsøg; genundersøg når GitHub-tilstand/adgang ændres. En yderligere gammel jobløs post34868901509 blev set.

## 8. Evidens, rækkefølge og afslutningskriterium

Eksisterende lokalt analyseinput: siblingmappen `astra-live-20260914` indeholder manifest, public startup/details og supportzip `support/RavRadar-support-4075.zip`. ZIP'en indeholder kun kodesnapshot, statiske konfigurationer og run-metadata; ikke privat conditions/bulk/closure/pilot. Den kan derfor ikke årsagsfordele de 967 strømhuller eller bevise den planlagte private migration. Scratchfiler `reproduce-wind-merge.mjs` og `reproduce-current-history-h1.mjs` indeholder de små konkrete afspilninger. De er ikke produktionsfiler og skal ikke stages som private artifacts.

Foreslået næste arbejdsgang: implementér A–D, de små relevante UI-/rapport-/EDR-udvælgelsesrettelser og den nødvendige cache-/backend-/workflowovergang samlet. Ingen ny first-cutover og ingen sourcegate. Versionsløft derefter reelt alle relevante steder, inklusive serviceworkerassets, modelbindinger og dokumentationskopier. Geodata må kun få topversion ændret; separat diff skal bevise det. Byg ikke endnu en version blot på grund af dette reviewdokument.

Genbrug eksisterende input til én samlet konkret afprøvning af rettelsernes påvirkning under implementeringen; ingen brede suitegentagelser. Deploy rettelserne og kør almindeligt vejr. Mål accepteret numerisk input og faktiske scorer bagefter samt vedligeholdelse over fuld DMI-rotation. Hold resterende lokale datamangler synlige. Opdater derefter roadmap og fortsæt websitegennemgang på kørende system.

De tre parallelle delreviews er afsluttet: input-/fallbackkæden, offentlig model/UI og normal opgraderings-/cachevej. Root har sammenholdt dem og afspillet de væsentlige vind-, retnings- og holdkanter. Gennemgangen har et afgrænset slutpunkt; ingen garanti om at alle mulige systemfejl er fundet.

Anbefalet implementeringsmodel efter afsluttet analyse: Sol / Ekstra høj. Reviewet afslutter ikke det overordnede mål: numeriske scorer, normal vejrvedligeholdelse, websitegennemgang, roadmap og gamle runs er fortsat arbejde.
