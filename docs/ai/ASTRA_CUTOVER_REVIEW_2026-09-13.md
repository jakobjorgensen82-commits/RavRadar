# Astra Ultra – cutovergennemgang 2026-09-13

Status: både første cutoverreview og ejerens efterfølgende udvidelse til hele den nye modelkæde er afsluttet; lokal rettelse er **ikke releaseklar**. Fortsæt på GPT-5.6 Sol / Indsats Ekstra høj. Ingen ny PR, merge, oneoff, providerhentning eller deploy er udført i reviewet.

## Formål og ejerens seneste retning

Få RavRadar online. Ret allerede kendte fejl og fejlopsamling i samme version. Gennemgå mistænkelige gamle tests før næste lange kørsel. Gennemfør alle selvstændige kontroller og saml resultaterne; undgå gentagen opstart på grund af én skjult fejl ad gangen. Produktkritiske fejl vurderes efter deres faktiske betydning. Beviseligt ufarlige test-/dokumentationsfejl må ikke i sig selv holde modellen offline. Det er ikke tilladelse til at kalde uafprøvede eller defekte produktdata godkendte.

## Faktisk driftsstatus

- PR #294, head `58f9ceb2b5d63c039cb43da48e4ac325d8169715`, sourcegate `34767862281`: grøn. Merge på main `2c243d9e4c8448b924f3c0ee13ad259679ce2549`, 4.0.357. PR og main har samme tree `367d29a70b37e4ebfd5e2681086c3958726850de`.
- Handoff `34768997271`: grønt, cirka 10m40s, fra de samme fire gemte cacher via den eksisterende fortsættelse fra `34738698219`. Ingen provider-oneoff eller gentaget stor 210/673-audit.
- Cutover `34769550035`: fejlede før offentliggørelse. Payloadfri rapport ligger i `.tmp-run-34769550035-safe-inspect/ravscore-integrated-cutover-validation-report.json`.
- Runtimeaudit, referencezoner, releasegate og datavalidering var grønne. Fuld validering stoppede i `test-forecast-integrity-4.0.17.mjs`. Ingen deploy blev udført. Dette beviser ikke, at alle senere installationstrin allerede virker.
- Live GitHub jobmetadata læst under reviewet: build 16:46:45–17:43:30 UTC = 56m45s. Hele femkontrolblokken 17:00:30–17:43:25 = 42m55s. De 43 minutter var **ikke alene npm validate**.

## Fund der skal løses samlet

### 1. Den gamle strømtest havde to forældede forventninger

`scripts/test-forecast-integrity-4.0.17.mjs` brugte ufuldstændig DMI-proveniens samt en forkert afstand. Den stramme native-verifier afviste dette korrekt. Efter komplet fixture kunne testen interpolere strøm; derefter fejlede en forældet tekstmatch på `rows.filter(...)`, som nu er en verificeret map/filter-projektion. Begge er rettet lokalt. Produktets strømkrav er ikke svækket.

Bevar dette fix. Ret også beskedens påstand om "unrelated null component rows": den konkrete fixture indeholder ikke sådanne rækker. Et præcist numerisk interpolationsresultat og en negativ fixture med manglende kildebevis er mere meningsfuldt end kun `!== null`. Station-routing er dækket af de eksisterende dedikerede routingtests; de fjernede tekstsøgninger beviste ikke adfærd.

### 2. Endnu en gammel test bruger den forkerte scoremodel

`scripts/test-public-runtime-4.0.74.mjs:18–24` kalder `calculateRavScore` fra den gamle `js/core/score-engine.js`. Den sammenligner privat og offentlig vejrhistorik, selv om den nye offentlige projektion med vilje udelader `maxWind24hMps`. Den gamle motor bruger feltet; et lovligt syntetisk eksempel gav 84 privat mod 74 offentligt. Dette kan give en falsk blokering af den integrerede model.

Samme test sammenligner `transportScore`, `huntabilityScore` og `mobilisationScore`, som motoren ikke returnerer. De er alle undefined, så deltesten giver intet bevis. Ret til den integrerede publicerede scorekontrakt. Bevar deterministisk projektion, dataset-/zoneidentitet og offentlig payloadkontrol. Før ikke privat vindhistorik tilbage til den offentlige pakke for at tilfredsstille en gammel test.

### 3. Tre endnu ikke nåede shelludtræk stopper på gyldigt false

`reusable-weather-build.yml:1605,1606,1637` bruger tildeling fra `jq -er` på boolske felter. Ved den tilladte første opstart kan `rollback.activationReady` og `history.allCurrentScoresFullHistory` være false. jq med `-e` giver da exit 1, og GitHubs bash med errexit stopper. `set -uo pipefail` slår ikke et allerede aktivt `-e` fra.

Minimal rettelse: behold boolsk typekontrol og tilføj `| tostring` før raw-output. Så accepteres både true og false som tekst; manglende, null eller forkert type fejler stadig. Ret alle tre steder i samme patch. De senere udtryk `test "$(jq ...)" = "false"` har ikke samme tildelingsfejl og skal ikke ændres mekanisk.

Kilde til jq-exitsemantikken: [officiel jq-manual](https://jqlang.org/manual/#invoking-jq). Linux-shellkontrol af true, false, manglende felt og forkert type skal indgå i den målrettede CI-kontrol; jq/bash var ikke tilgængelige som lokale kommandoer under reviewet.

### 4. Blanket advisory-ændringen er ufærdig og for bred

Den lokale `full-validation|false|...` må **ikke merges som den står**:

- `scripts/release-gate.mjs:1559` forventer fortsat `full-validation|true|...`; det giver et sikkert nyt releasegatestop. Dens øvrige markører skal også afstemmes med collectorkaldet, ikke skjules af delstrengsmatch på validate:data.
- `scripts/production-workflow-outcome.mjs:419–428` kræver fortsat `fullValidationOutcome === 'success'`. En advisory kan ellers tillade faktisk deploy og bagefter give FAILED/INCOMPLETE_BUILD_GATES.
- Hele validate-pakken indeholder også reelle datakontroller, fx current-grid/proveniens og offentlige kontrakter. De øvrige fire hovedkontroller erstatter ikke alle disse.
- Også en collector, der slet ikke starter eller aldrig skriver sin rapport, bliver nu en almindelig advisory.

Minimal anbefaling: behold den fulde fejlopsamling, og fjern den generelle fritagelse for hele pakken. Kendte stale tests rettes i samme release. Hvis en konkret ufarlig kontrol skal være rådgivende, afgræns den eksplicit ud fra dens funktion og bevis; behold rå udfald, og lad slutklassifikation og offentliggørelse bruge samme beslutning. Ukendte fejl er ikke på forhånd ufarlige. Reviewet godkender ikke den nuværende v2-report-ændring som launchklar.

### 5. Fejlopsamling skal bevare resultater og være præcist beskrevet

Den nye collector udvider package.jsons npm/&&-træ og kan fortsætte efter en fejlet child-proces. Aktuel optælling er 271 deklarerede kommandoer; før dens egen test blev tilføjet var det 270 fordelt i 118 grupper under én af fem hovedkontroller. Dette er ikke 271 assertions og ikke samtlige tests i alle processer.

Konkrete mangler:

- Der skrives kun rapport efter sidste kommando. Skriv enkel løbende fremdrift med afsluttede/ikke-kørte trin, så timeout eller afbrydelse ikke taber hele fejllisten.
- Slutkontrollen skal kræve rapportens fuldstændige kommandoplan og korrekte udfald; at top-rapporten findes er ikke bevis. Sammenhold med den aktuelle plan. En afbrudt kørsel må aldrig kaldes fuldført.
- `test-workflow-validation-order-4.0.108.mjs:3599` starter en selvstændig Python-test efter tusindvis af assertions. Flyt dette selvstændige kald til den deklarerede testplan, så en tidligere workflowassertion ikke skjuler Python-testen. Afstem release/source-inventar ved samme ændring.
- Omskriv ikke alle assertions i alle filer. Mange assertions har fælles forudsætninger. Det realistiske løfte er: alle planlagte selvstændige kontroller forsøges, fejl i én stopper ikke de øvrige, og afbrydelse rapporteres ærligt. Det er ikke muligt at love, at enhver tænkelig installationsfejl findes i én kørsel.

### 6. Tidsrammen skal passe til den udvidede kørsel

Build-jobbet har 90 minutter. Det sidste run brugte 56m45s og nåede kun frem til den gamle strømtest inde i full validate. Der var dermed nominelt 33m15s tilbage til de hidtil skjulte underkommandoer samt privat pakning/upload og Pages. Der er ikke målt nok til at konkludere, at resten passer i rammen.

Afgrænset anbefaling: giv kun integreret cutover en rummeligere samlet jobramme (eksempelvis 180 minutter) og bevar løbende rapport. Det er et loft, ikke en ny ventetid eller providerbudget. Almindelige vejrkørslers og DMI-producentens budgetter behøver ikke ændres. Undgå at løse dette ved nye tidsgrænser på hvert testcase uden målegrundlag.

### 7. Ny fejl fundet i anden gennemgang: Pages sammenblander hukommelse og tilgængelige scorer

`scripts/verify-ravscore-operational-pages-deployment.mjs:120–129` kræver `modelMemoryReady=true`, når `historyIncompleteModeCount` er 0. Producentens uafhængige audit i `scripts/audit-ravscore-integrated-public-runtime.mjs:1263–1291` udleder derimod hukommelsen fra alle 673 deles current-/wave-/last-mile-state, uafhængigt af om den aktuelle score kan vises. Det følger DEC-0133 punkt 1 og DEC-0132 punkt 4.

En del med både manglende direkte input og ufuldstændig historik får `UNAVAILABLE`, ikke `HISTORY_INCOMPLETE`. Den tælles derfor ikke i historikscoretallet, men gør fortsat modellens samlede hukommelse ufuldstændig. Pages kan dermed afvise et korrekt datasæt efter selve deployet.

Kort syntetisk reproduktion uden filændringer: den uændrede `assertOperationalProfileControls` blev udtrukket direkte fra kildefilen og kørt med den virkelige `assertIntegratedPublicScoreAvailability`. Availability med 210 zoner, 209 aktive, 1 utilgængelig, 419 FULL_HISTORY-modes og 0 HISTORY_INCOMPLETE-modes accepteres. Den korrekte profil har coverage=false, memory=false, migration=true og begge lokale advisories. Pages afviser med `incompatible integrated history controls`. Dette beviser kontraktfejlen, ikke at det seneste private produktionsdataset rammer netop denne kombination.

Ret i samme 4.0.358: bevar de tre selvstændige facts, den strenge profiltypekontrol, de tilsvarende advisories og eksakt lighed mellem forseglet forventet profil, manifest, startup og details. Udled ikke fuld modelhukommelse alene af fravær af tilgængelige HISTORY_INCOMPLETE-scorer. Den modsatte løgn, hvor en påvist HISTORY_INCOMPLETE-score skjules bag memory=true, skal fortsat afvises. Kontrollér også konservativ tail-reset, før der indføres en anden omvendt slutning fra scorekvalitet til rå hukommelse.

Afsluttende afgrænsning: den minimale ændring er kun at fjerne `(!historyIncomplete && profile.modelMemoryReady !== true)` og beholde `(historyIncomplete && profile.modelMemoryReady !== false)`. Erstat den ikke med et nyt omvendt krav begrænset til all-active. `buildHistoryScoreView` kan lukke scoreusikkerhed via konservativ reset uden at udlede scorekvaliteten fra alle rå readinessflag; en faktisk all-active/FULL_HISTORY/memory=false-producerkombination er dog ikke bevist her. Den fulde audit beviser rå memory, og Pages beviser præcis den auditerede profil/manifest. Candidate G's separate memory=true-krav og eksisterende negative tests består.

Måltest: udvid `installLocallyUnavailableIntegratedState` i `scripts/test-ravscore-operational-pages-deployment.mjs:396` med samme utilgængelige del + memory=false og begge advisories; kald eksisterende `resealPublicDocuments`, og brug den rigtige verifier/mock-fetch. Den nuværende positive fixture har kun memory=true. Den eksisterende negative kombination ved linje 716 har ufuldstændig historik i en anden, tilgængelig zone og dækker derfor ikke fejlen. Ingen fuld national audit er nødvendig for denne isolerede regression.

## Udvidet modelgennemgang efter ejerens præcisering

Ejeren præciserede, at anden gennemgang også skulle omfatte selve den nye scoremodel, ikke blot installation/tests. Tre uafhængige læsende spor og hovedreviewet fulgte input → state/historik → beregning → offentlig projektion/forbrugere. Anbefalingen er fortsat Astra/Ultra til dette afsluttede review, derefter Sol/Ekstra høj til samlet implementering. Ingen scoreformel, fysisk model, data eller produktionskonfiguration er ændret i reviewet.

Undersøgte forbindelser:

- Vind/`windTail`, strict manglende input, verificeret U/V til privat state, attesterede regionale/native hold uden opdigtet ny bevægelse, private præ-H0-referencer og kausal historik før target.
- Eksklusivt valg af point-aktivering, continuation, checkpoint eller migration; lovlig measured-only koldstart; privat Candidate G-warmup uden automatisk offentlig fallback.
- Ind-/udgående strømfortegn og 48-timersvægtning, bølgernes FROM→TOWARD-retning, bølgemobiliseringens opbygning/henfald, særskilte historikgrænser og last-mile-faktor 0,85–1,00.
- 20/50/30-sammenlægningen, konservative scoreintervaller, waders-loftet, direkte inputmangel som null og vandstandens placering uden direkte scorebidrag.
- Timevalg, del-/zoneprojektion, national rangering, infoforklaringer, assistent og offentlig rekonstruktion. Scorer mærket utilgængelige filtreres fra; ufuldstændig historik bevarer konservativ score med interval. Dette var kodegennemgang, ikke en allerede gennemført live-browserkontrol af den kommende release.
- De resterende Pages-/activation-/recoverytrin, schema-2-pakning, deluploads, samlet readback og pointer. Mistanken om at measured-warmup blev afvist af recovery var falsk: `ravscore-operational-activation.mjs:1089–1095` accepterer den eksplicitte first-cutover-vej.

En selvstændig syntetisk kontrol over 61 timer gav samme fortsættelsesstate ved én samlet kørsel og ved opdeling i to. I den valgte fixture gav konstant indgående strøm transportpotentiale 100 og score 88; udgående gav transportpotentiale 0 og score 38. Waders ved 15 m/s gav 0. Manglende direkte strøm og manglende retning ved aktive bølger gav null. Det er syntetiske kontraktprøver, ikke observerede fund- eller produktionsscorer.

Der blev ikke påvist en ny konkret regnefejl i de undersøgte matematiske forbindelser. Score 38 ved transportpotentiale 0 er den bevidste additive kontrakt: søgeforhold og mulig bølgemobilisering kan stadig bidrage, samlet højst 50 uden strømtransport. Den gamle helscore-nulgate er bevidst fjernet. Det er et potentialeindeks, ikke en valideret ravmassebalance eller sandsynlighed for fund. Der er ikke her fremskaffet empirisk feltbevis eller opløst lokale revler, undertow og aflejring.

To åbne forhold, som ikke må forvandles til udokumenterede launchfejl:

1. `buildIntegratedZoneHourlyProjection` i `scripts/lib/ravscore-production-adapters.mjs:614` gør hele zone/mode/time utilgængelig, hvis én forventet del mangler, selv om de øvrige deles egne scorer bevares. Testen ved `scripts/test-ravscore-production-adapters.mjs:1028` låser A=80/B=utilgængelig/C=74 → utilgængelig zone. Det er en eksisterende, eksplicit testet aggregeringsregel, men dens produktvirkning skal afstemmes med DEC-0132's formulering om kun den berørte kystdel. En test er ikke i sig selv en ejerbeslutning. Afklar efter launch sammen med websitegennemgangen; ændr ikke formel/rangering stiltiende i en kontrolrettelse.
2. `scripts/private-production-runtime-workflow.mjs:369` læser conditions med 256 MiB-loft, mens pakningen accepterer op til 768 MiB pr. fil. Den konkrete aktuelle filstørrelse er ikke dokumenteret her. Der er derfor kun en mulig kapacitetskant, ikke bevist fejl eller grundlag for blind grænseforhøjelse. Brug eksisterende sikker størrelsesevidens ved næste naturlige gennemløb.

## Målrettet bevis – samlet plan

Allerede grønne i denne arbejdsgang: collectorens syntetiske fortsættelsestest, repareret strømfixture, DMI forecast store, cutoverreport, workflowrækkefølge med korrekt Python-PATH, bulk→forecast, produktionsadapter og recovery replay. Reviewet kørte også syv korte isolerede eksisterende tests (vandstandskontinuitet, stationstopologi, bedste tidspunkt, cache/station, sitefunktioner, privat shadow-state, missing-weather-null); de var grønne. Der er ikke kørt fuld validering eller hentet produktionspayload til reviewet.

Efter rettelserne behøves kun: kendte ændrede tests, Pages-fixturen for samme lokale datahul + ufuldstændig hukommelse, syntetisk collector med flere fejlede selvstændige kommandoer og et senere grønt trin, manglende/ufuldstændig rapport, boolske shelltilfælde samt én lille kontrol der følger beslutningen gennem workflow/release/slutklassifikation. Tests skal prøve adfærd og aftaler, ikke blot spejle ændrede linjer. Ingen ny generel testplatform.

## Arbejdsmappe og næste handling

- Root-worktree står stadig på `codex/4.0.357-canonical-direction-rounding` med den ældre, indholdsmæssigt identiske 4.0.357-commit. De nye ændringer ligger **i root**, ikke i hjælpe-worktree, pga Windows' apply_patch-læsefejl.
- `.tmp-worktree-4.0.357` står på `codex/4.0.358-cutover-error-collection` fra origin/main. Kontrollér status og før kun de relevante ændringer over; undgå endnu en PR med forkert mergebase. Intet er committed til 4.0.358.
- Bevar de eksisterende ændringer i `js/core/ravscore-public-model.js` og `scripts/test-ravscore-public-model.mjs` samt alle `.tmp-run-*`-mapper. De var til stede før denne rettelse. Stage aldrig diagnosemapperne eller hele hjælpe-worktree.
- Lokale ændringer: collector + test (nye filer), package scripts, forecast-integrity-test, cutoverreport + test, buildworkflow og workflowtesten. V2/advisory-delen er reviewafvist som færdig løsning, men skal redigeres målrettet, ikke slettes med reset.
- Windows: almindelig apply_patch kunne oprette nye filer, men læsning af eksisterende filer fejlede på deny-read ACL. Eskaleret direkte kald til den allerede fundne `codex.exe --codex-run-as-apply-patch` med en single-quoted PowerShell-here-string virkede. `.bat`-wrapper eller stdin virkede ikke. Brug apply_patch-mekanismen; ingen shell-skrivetricks.
- Bundtet Python findes i `C:/Users/Lenovo T14/.cache/codex-runtimes/codex-primary-runtime/dependencies/python`; sæt denne foran PATH for måltests. Node er bundtet tilsvarende under `dependencies/node/bin`.
- Saml ovenstående rettelser i én 4.0.358: RDKS, issues, changelog, begge håndbøger/SQL-kopi, alle versionsfelter samt geodata-only versionsdiff. Opdater også AI-indgang/handoff, hvis toptekst ellers fortsat siger 4.0.351.
- Én GitHub-sourcegate på den færdige PR. Merge med identisk tree. Brug eksisterende same-cache-handofffortsættelse og cutover. Ingen ny oneoff. De midlertidige filer fra den afsluttede runner må genbygges fra cache; et vilkårligt GitHub-trin kan ikke genoptages på den slettede runner. Byg ikke en ny universel resumeplatform nu.
- Efter faktisk offentliggørelse: kontrollér offentlig integreret model/site, genaktivér normal weather kontrolleret, bevis cachevedligeholdelse og rotation, og genvurder de efterfølgende roadmappunkter.

## Afgrænsning

Dette review dækker kendte gentagelser, de lokale rettelser, højrisiko gamle tests, den resterende launchkæde og en tværgående gennemgang af den nye model fra input til offentlig visning. Det er ikke en udtømmende linje-for-linje- eller empirisk revision. Det beviser hverken komplet fejlfri testpakke, empirisk kalibreret scoremodel eller færdig installation. Flere selvstændige kontroller ligger efter femkontrolblokken, og offentlig verification kræver faktisk deploy. Undgå nye løfter om, at hele installationens mulige fejl allerede er samlet.
