# Integreret RavScore — datasikkert offline-evidensspor 2026-08-29

## Status og afgrænsning

Dette spor tester den integrerede RavScore mod Candidate G og mod relevante parameteralternativer før offentlig cutover. Auditkoden er `scripts/audit-ravscore-integrated-offline-evidence.mjs`. Candidate G er fortsat eneste offentlige model; den produktionsverificerede offentlige baseline er 4.0.316. PR #236 gendannede exact Candidate G på `c58deb78`; `33345476979`/`rr-20260831010337-210` var første grønne recoverybevis, og seneste external-watchdog-`workflow_dispatch` `33347230240`/`rr-20260831012407-210` bestod fuld DMI/validate/releasegate/storage/Pages og er komplet 210/673, `VERIFIED_ONLY`, uden syntetiske samples. Candidate G er 0/210 aktiv på grund af historikmemory. 4.0.317 bestod PR #235-exact-head og blev merged som `a584d1cf`, men mergeproduktion `33333490853` stoppede sikkert før DMI/cachebyg, beskyttede writes, artifact og Pages ved den for strenge antagelse, at alle 673 Candidate G-states allerede var `READY`. 4.0.318 er en lokal, endnu ikke produktionsverificeret first-cutover-remediation.

Candidate G-oraklets eksakte kilde er den produktionsverificerede 4.0.316-head `49dd4cb454656bdf629e5df760176705e38d2cb0`, tree `975c3e9432cea7780564ffd56766bc1f0a0a9763` og central switch `RAVSCORE-PROFILE-SWITCH-4.0.316`. Source contract `2f888a16190e9e43e44536536029f1b0021a1b850195524aa2312664ca74810b` og den kanoniske 53-filers source closure `a366b4a64fc3ccc8f1b94f3fed24b3ce03ea23d906396bc8bea183338c5d2606` verificeres mod en eksakt pinned fetch i PR, build og deploy. Lukningen er lokal releasekandidatevidens; exact-head-, produktions- og offentlig state-6-verifikation udestår.

Den lokale state-6-kandidats elleve bindingsfelter omfatter:

- model-id `RRS-COASTAL-PROCESS-INTEGRATED-1.1.0`,
- stateversion `6.0.0`,
- variant `COASTAL-SUPPLY-MOBILISATION-BOUNDED-WAVE-APPROACH-HUNTABILITY-2`,
- profil `cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-historybounds12d-lastmileewma4-tail40-atten15-v5`,
- komponentskema `ravscore-components-huntability-delivery-mobilisation-bounds-v5`,
- forklaringsskema `ravscore-explanation-integrated-bounds-v5`,
- rangering `direction-broad-19-history-tie-v2`,
- bedste tidspunkt `score-history-water-tie-earliest-v3`,
- aktivt `modelContractSha256=778db7aa3946f925607a8304daa42ed17dd30294e4a51bf6d895d7293e84c4e7`, som binder parameterkontrakten,
- aktivt `modelBundleSha256=3aede43fee8e2054ffd1bf81b098ef2713033b16a10d3234414f6306c31f5fa6`, som binder præcis 43 kanonisk normaliserede transitive implementeringsfiler og 8 bindingsforbrugere.

### Historisk 4.0.317-proportionalmatrix

Den tidligere pre-split-selvtest og de numeriske scenarier længere nede blev kørt mod den historiske state-5-releasekandidat, som aldrig blev offentlig. Dens kontrakthash var `0cd7c263727721696253ae57c45aa3485b4081ff2cbb5b01a1f022b31b1aa7da`, og dens bundlehash var `27a744e820038d5e508597d02fd0a600479f160a5a5a4a66bdc252e7ea8b3bcd`. Resultaterne er analytisk genbrug og regressionsevidens, ikke state-6-slutbevis. Den viste proportionale audit-/testmatrix nedenfor er tydeligt historisk 4.0.317-output; 4.0.318's genererede slutbinding står ovenfor og valideres i slutmatrixen:

```text
OK: PASSED_SYNTHETIC_OFFLINE_CONTRACT_AND_SENSITIVITY_AUDIT;
24 paired chronological comparisons/48 individual model evaluations;
24 frozen-component pairs;
model RRS-COASTAL-PROCESS-INTEGRATED-1.1.0;
modelContractSha256 778db7aa3946f925607a8304daa42ed17dd30294e4a51bf6d895d7293e84c4e7;
modelBundleSha256 74bfc42bb008f6743f374fc35201d3ea6f81f6e360c99873541fed83eeadcbae;
43 transitive files; local proportional matrix passed
```

Resultatet er et syntetisk kontrakt-, regressions- og følsomhedsbevis. Det er ikke fundkalibrering, måler ikke fundpræcision og dokumenterer ikke, at modellen empirisk finder rav bedre. Auditsporet læser eller lagrer ikke private produktionspayloads, koordinater, geometri eller rå U/V.

### Aktiv state-6-evidenskontrakt

State 6 skal ud over de historiske scenarier bevise følgende:

- obligatorisk direkte inputmissing giver `UNAVAILABLE`, `score=null` og `scoreBounds=null`; ingen interpolation, carry eller nabolån må skabe en score,
- ufuldstændig historik med gyldige direkte input giver `HISTORY_INCOMPLETE`, hvor vist `score` er `scoreBounds.lower`, `upper >= lower`, faste reason-id'er/coverage følger resultatet og `calibrationEligible=false`,
- det aktive currentvindue er 48 timer; op til 168 timers forskningsretention ændrer ikke score eller readiness,
- bølgemobiliseringens ukendte hale lukkes først efter 288 timer, mens last-mile-approachens usikkerhedshale og migrationsreplay afgrænses ved 40 timer med højst `1/1024` udeladt momentandel,
- ved 288 timers bølgemobiliserings-closure nulstilles scoringens wave-mobilisation-track konservativt til lower-bound-sporet; ved 40 timers last-mile-closure vælges minimum-factor-sporet. Den separate fysiske/rollback-point-state bevares,
- `conservativeResetAt` gør closure synlig. Senere historikhuller åbner nye bounds fra dette konservative scoringsspor,
- `FULL_HISTORY` kan derfor have semantikken `EXACT_POINT_SCORE` eller `CONSERVATIVE_TAIL_RESET_POINT_SCORE`. Begge har kollapsede bounds og kan være kalibreringsegnede, men sidstnævnte er en fast konservativ modelpolitik — ikke fysisk eksakt state,
- state-løs recovery skal bevise `bounded-private-48h-history-cold-replay-v3` med `expectedCausalPositionCount=48`, faktisk complete/unknown-count og `historyTransition`; 48/48 giver `VERIFIED_CAUSAL_HISTORY_WINDOW`, kortere/gappede forløb `UNKNOWN_HISTORY_INTERVAL`, men alle er `HISTORY_INCOMPLETE` indtil 288-timers closure,
- manuel Candidate G-rollback må kun projicere en eksakt `READY`/`memoryReady` Candidate G-ejet mode-score som `FULL_HISTORY` + `EXACT_POINT_SCORE` med collapsed bounds/coverage 48; non-READY/mismatch skal afvises, og `calibrationEligible=false` skal bestå,
- numerisk score sorteres altid først; `FULL_HISTORY` vinder kun ved eksakt scorelighed, før de eksisterende retnings-/vand-/tidsregler,
- schema-5 accepteres kun gennem `integrated-schema5-ready-point-to-schema6-history-bounds-v1` fra den eksakte historiske, aldrig offentlige releasekandidat; aktiv state/cache/checkpoint er schema 6.

### 4.0.318 first-cutover-regressionsmatrix

De følgende cases er obligatoriske udviklingsbeviser for remediationen. De er kontrakt- og sikkerhedsevidens, ikke empirisk fundpræcision:

| Case | Forventet udfald |
|---|---|
| 673 kanoniske Candidate G-states er `READY`, source- og active-register giver identisk samplingkontekst, og alle giver ét fælles target | `candidate-g-migration`; source attesteret; kanonisk UTC-target uden millisekunder |
| Alle 673 kildestates er kanoniske, men alle eller nogle er i legitim warmup/missing-status | Én national `genuine-cold-start` ved produktionstarget; ingen per-part modelmix |
| Kildestates er kanoniske `READY`, men det eksakte offentlige kilderegister og den centralt materialiserede aktive kontekst afviger legitimt | `genuine-cold-start`; legacy state genbruges kun som valideret rollback-orakel, aldrig som kompatibel integreret continuation |
| Source registry er manipuleret, part-/zonesæt afviger, stateKey/model/schema er forkert, state er reconstructed/malformed/fremtidig, status er ukendt, en tidligere integreret continuation/checkpoint er afvist som ugyldig, eller cold-start mangler source-attestation | Fast fejl før DMI, statevalg og mutation; intet GitHub-output med state/delidentitet/evidens/punkter/rå U/V |
| READY-populationen giver blandede migrationstargets uden en legitim cold-start-årsag | Fail-closed; Candidate G forbliver offentlig |
| Node-resolverens target gives direkte til Python-WAM-parseren | Eksakt `YYYY-MM-DDTHH:00:00Z` accepteres; `.000Z`-drift er udelukket |
| Genuine cold start med faktisk målt 48-timers rollbackreplay | Candidate G-rollback bruger `VERIFIED_MEASURED_COLD_START` og må først blive companion ved faktisk `READY` |
| Genuine cold start indeholder en interpoleret WAM-time | Fast `INTERPOLATED_COLD_START`; `maximum_interpolation_hours=0`; den højst fire timers same-run-regel forbliver kun migration/generisk acquisition; ingen mutation |
| Measured-cold-flag kombineres med legacy/private continuation, eller det målte replay er ikke `READY` | Hybrid afvises; cutover/checkpoint stopper uden mutation |
| DMI/WAM-producenten skriver brugbar delvis cache og fejler senere | Progressiv cache bevares til næste forsøg; cancellation eller manglende cachefil gemmes ikke |
| First cutover afventer, controlleren er rowless, central profil er eksakt legacy Candidate G, og triggeren er schedule/watchdog eller manuelt vejr | Action `candidate-legacy-maintenance`; `LEGACY_CANDIDATE_G_REFRESH_BEFORE_INITIAL_CUTOVER`; begin bruger `CANDIDATE_G_PENDING` med active/source legacy, requested current Candidate og bevaret legacyprofil. Complete/target-reconcile efter exact 210/673 giver current Candidate aktiv/profil, `initialCutoverRequired=true`, `legacySourceRequired=false`; abort/source-reconcile bevarer legacy public/profile og `legacySourceRequired=true`; aldrig integreret PENDING/state 6 |
| Legacybroen er complete, og næste pre-cutover Candidate→Candidate maintenance starter | Samme `LEGACY_CANDIDATE_G_REFRESH_BEFORE_INITIAL_CUTOVER`, exact current Candidate og alle fire returnfelter `null` arves; `legacySourceRequired=false` følger sourcebindingen; ordinær refresh må ikke relabeles til markøren |
| First cutover afventer efter et sikkert afbrudt current-Candidate-forsøg | `CANDIDATE_G_REFRESH_BEFORE_INITIAL_CUTOVER`: source-bevarende `CANDIDATE_G_PENDING`, CAS complete/abort/reconcile, uændret Candidate G-profil og bevarelse af `returnPlanSha256`, `integratedReadinessSha256`, `integratedPublicAuditSha256` og `integratedManifestSha256`; aldrig `INTEGRATED_PENDING` eller state-6-aktivering |

Hydreringstesten skal samtidig bevise, at Candidate G-manifest, conditions og eksakt source-`coastal-parts-v2.json` valideres som samme kildeenhed, at kilderegisteret kun skrives til den isolerede cache, og at den centralt materialiserede aktive registryfil ikke overskrives af legacyhydreringen. Alle fejlscenarier skal bevare eksisterende filer/state; der må ikke opstå syntetisk historik, geometri-/punktændring eller privat output.

Det offentlige datasæt `rr-20260830091913-210` var frisk og komplet som 210/673, men Candidate G havde 0 aktive zoner og 210 `unavailable`, fordi 673/673 dele manglede tilstrækkelig sammenhængende strømhistorik. Det er reel regressionsevidens for den gamle kontrakts prognoseudfald. Det er ikke bevis for state 6, fordi datasættet fortsat kørte Candidate G.

To P1-type-/proveniensfund indgår nu som negative regressionskrav. Et verificeret DMI- eller Copernicus-U/V-par skal selv danne den kanoniske fart til 0,01 m/s og toward-retning; modstridende cached fart/retning må ikke påvirke score, og afrundet 360° bliver 0°. Desuden skal numeriske strenge, booleans, arrays og objekter afvises gennem model, state, migration, recovery, privat runtime og offentlig projektion. Disse er integritetsbeviser, ikke fysisk fundvalidering. Den endelige binding er regenereret; den samlede slutgate skal stadig genkøre hele pakken på exact head.

## Metode og to adskilte evidensniveauer

Auditten skelner nu eksplicit mellem to forskellige slags syntetisk evidens:

1. **Historisk parret kronologisk state-replay:** Candidate G's schema-2-pipeline og den aldrig offentlige integrerede schema-5-releasekandidat blev kørt over de samme syntetiske timeobservationer med identiske tidsstempler. Denne del tester faktisk kronologi, 48-timershukommelse, migration og continuation og genbruges som regression, men er ikke state-6-slutbevis.
2. **Frosne komponent-kontrafaktiske sammenligninger:** 12 scenarier × strand/waders giver 24 par, men her indsprøjtes på forhånd fastlagte syntetiske transport- og mobiliseringspotentialer. De er nyttige til isoleret score- og vægtanalyse, men er **ikke** et kronologisk state-replay og tælles ikke som sådan.

Kun den første del dokumenterer old-vs-new-adfærd gennem begge statepipelines. Ingen del bruger fund eller nul-fund.

Den automatiske audit omfatter:

- et parret state-replay med 24 checkpoints/48 individuelle modelevalueringer,
- præcis 47-/48-timersgrænse for strømvinduet,
- historisk Candidate G schema 2 → aldrig offentlig integreret schema 5 v4-migration med genvægtning af forseglet, signeret kystnormal currentevidens og en afgrænset privat 40-timers wave-approach-bootstrap; state 6 bruger v5-migrationen og den særskilte eksakte 5→6-ready-migration,
- ét samlet run og et delt run med byte-identisk continuation-state,
- eksakt Candidate G-mobiliseringsoracle mod den historiske schema-5-releasekandidats felt `rollbackCandidateGMobilisationPotential` på hver behandlet replayrække,
- 1-, 3- og 4-timers verificerede gap,
- eksplicit missing og efterfølgende recovery,
- strømstyrker ved `±0,030`, lige over deadband ved `±0,031` og fuld styrke ved `±0,150 m/s`,
- 12 almindelige, ekstreme og indbyrdes modstridende frosne komponentscenarier,
- strand og waders i begge relevante spor,
- 24 frosne Candidate G-/integrerede par, altså yderligere 48 individuelle evalueringer,
- fem syntetiske koblinger mellem strømtilførsel, mobilisering og uobserveret lokalt/sekundært lager,
- vægtene 20/50/30, 25/40/35, 20/45/35 og 15/50/35,
- fire strømkerner, tre styrkegrænsepar og fire ind-/udgående rater,
- præcis kontrol af 12, 13 og 14 effektive timers stærk fralandsstrøm,
- bølgeopbygning 3/4/6 timer og aftrapning 24/48/72 timer,
- aktiv 0–15 % bounded wave-approach med kausal energivægtet `W/N/T`-EWMA, fire timers halveringstid og en ældre hale, samt historiske kontrafaktiske korrektioner tydeligt adskilt,
- vandstand med nul scoreeffekt,
- missing, native cadencehold, internt hul og langt gap,
- positive og nul transportpotentialer, normalalignment `−1/−0,25/0/0,5/1`, `waveHeightM=0` exact calm, positiv højde/nulperiode som `INVALID`/fail-closed og aktiv missing retning.

## Parret kronologisk replay gennem begge statepipelines

Det generelle parrede kronologireplay starter med 49 ægte syntetiske timepunkter over præcis 48 timer. Candidate G og den integrerede model modtager samme strømstyrke, verificeringsstatus, bølgehøjde, bølgeperiode, bølgeretning, vind og tidsstempel ved hvert parret checkpoint. Det er et datasikkert state-/score-replay, ikke migrationskilden i produktion.

Den historiske v4-migrationstest validerer i stedet Candidate G's forseglet signerede, allerede afledte kystnormale currentstyrke og genvægter den gennem den aldrig offentlige schema-5-releasekandidats currentkerne. Rå U/V læses eller kopieres ikke, og testen påstår ikke lighed med en genberegning fra rå strømvektorer. Wave-approach bygges af præcis 40 private præ-target-positioner. Den udeladte EWMA-hale er højst `1/1024`, og den konservative rå-scorefejl er højst `0.01171875` før afrunding. Acquisitionkontrakten kræver ét coherent WAM-run pr. anvendt collection, same-cell native provenance og tillader kun et WAM-gap mellem native endepunkter højst fire timer fra hinanden inden for samme run, collection, gitter og celle. Aggregate-gaten kræver 673 gyldige schema-2-states og ét fælles kanonisk target; ellers forbliver Candidate G offentlig. Der dannes ingen syntetisk eller offentlig migrationshistorik. Den aktive state-6-migration er v5 og skal genbevise de samme privacy-/proveniensinvariants.

Ved 47 timers dækning var begge strømstates ikke klar. Ved 48 timer var begge klar med potentiale 100. Den gamle evaluator kan teknisk returnere et tal fra en ikke-klar Candidate G-state, men auditten tæller det ikke som en pipelinebundet offentlig score; readiness er en separat nødvendig gate.

| Kronologisk checkpoint | Candidate G transport | Integreret tilførsel | Candidate G score | Integreret score | Pipelinebemærkning |
|---|---:|---:|---:|---:|---|
| 47 timers dækning | 100, men ikke klar | `null`, ikke klar | Ikke pipelinebundet | Ikke tilgængelig | Begge: vindue ufuldstændigt |
| 48 timers dækning | 100 | 100 | 92 | 92 | Begge klar |
| 12 timers fuld fralandsvending | 4 | 4 | 38 | 44 | Samme strømstate; ingen gammel helscoregate endnu |
| 13 timers fuld fralandsvending | 0 | 0 | 0 | 41 | Candidate G's helscoregate aktiveres |
| 14 timers fuld fralandsvending | 0 | 0 | 0 | 42 | Den integrerede model nulstiller ikke andre led |
| 1 time efter pålandsvending | 10 | 10 | 43 | 48 | Begge strømstates reagerer kausalt |
| 4 timer efter pålandsvending | 40 | 40 | 62 | 63 | Fortsat identiske strømstates |
| 1 timers verificeret gap | 100 | 100 | 88 | 88 | Begge klar |
| 3 timers verificeret gap | 100 | 100 | 90 | 88 | Historisk schema-5-releasekandidat: `RECOVERED_SHORT_GAP` og højst én bølgetime |
| 4 timers verificeret gap | Ikke klar | `null`, ikke klar | Ikke pipelinebundet | Ikke tilgængelig | Historisk schema-5-releasekandidat: `WINDOW_HAS_TIME_GAP` og `RESTARTED_AFTER_GAP`; state 6 skal i stedet skelne historikgap fra direkte inputmissing |
| Missing strøm og bølge | Ikke klar | `null`, ikke klar | Ikke pipelinebundet | Ikke tilgængelig | Historisk schema-5-releasekandidat: `MISSING_INPUT`; state 6 bevarer `UNAVAILABLE` for direkte missing |
| Første gyldige time efter missing | Ikke klar | `null`, ikke klar | Ikke pipelinebundet | Ikke tilgængelig | Bølgen er `RECOVERED_SHORT_GAP`; strømmen forbliver lukket, mens missing ligger i vinduet |

Ved `0,030 m/s` var styrken nul på begge sider af kystnormalen. Ved `0,031 m/s` begyndte en lille kontinuert effekt, og ved `0,150 m/s` var styrken fuld. Candidate G og den integrerede strømstate gav samme potentiale i alle seks grænsecheckpoints.

Det ubrudte 18-timers vending/reversal-forløb blev desuden delt efter otte samples. Både Candidate G's og den integrerede models afsluttende continuation-state var byte-for-byte identisk med det respektive ubrudte run. Det viser deterministisk continuation for de syntetiske inputs; det er ikke et løfte om fysisk fundpræcision.

### Mobiliseringsoracle for rollback

Den historiske, aldrig offentlige schema-5-state fører en særskilt, score-neutral rollbackværdi. Auditgaten kræver med eksakt numerisk lighed — ikke afrundet lighed eller tolerance — at hver Candidate G-rækkes `mobilisationPotential` svarer til schema-5-rækkens `rollbackCandidateGMobilisationPotential`. State 6 bevarer samme rollbackoracle under den nye v3-rollbackkontrakt.

Gaten kontrollerede 96 producerede rækkesammenligninger. Tallet omfatter både one-shot- og split-run-gennemløb og derfor bevidste gentagelser af det samme syntetiske forløb. Dækningen omfatter specifikt:

- den allerførste kolde time, hvor Candidate G's gamle første-timescredit skal bevares i rollbacksporet,
- alle efterfølgende timer frem til og over 48-timersgrænsen,
- placeholder-missing og den første gyldige time efter missing,
- 4-timers langt gap uden indskudte placeholdertimer,
- den historiske schema-2 → aldrig offentlig schema-5-migration,
- begge segmenter af split-run og den afsluttende continuation-state.

Som negativ kontrol blev den første migrerede række i den historiske schema-5-releasekandidat ændret syntetisk med `0,001`. Den samme rollbackgate afviste mutationen. Kontrollen ændrer kun et lokalt syntetisk auditobjekt og aldrig produktionsstate.

### Operationel rollback er en særskilt releasegate

Det numeriske rollbackoracle er ikke i sig selv tilladelse til at skifte offentlig model. Den varme Candidate G-projektion ligger kun i den beskyttede fulde runtime som `ravScoreCandidateGRollback`. Et manuelt skift kræver controlleren `ravscore-operational-model-activation` med schema `ravscore-operational-model-activation-v4`; dens præcis 30 felter omfatter også `sourceImplementationClosureSha256` og `requestedImplementationClosureSha256`. `CANDIDATE_G_ROLLBACK` skriver `CANDIDATE_G_PENDING` med kilde-/målmanifest- og closure-hash og bevarer den integrerede centrale profil under Candidate G-Pages-deploy; først efter eksakt offentlig implementation+210/673 sætter én RPC samtidigt `CANDIDATE_G_ACTIVE` og central Candidate G-profil. Manuel `INTEGRATED_RETURN` bruger `INTEGRATED_PENDING` efter samme source/target/reconcile. Retry completer ved targethash, aborterer/rekonsoliderer ved sourcehash og forbliver fail-closed ved en tredje hash. Fra rowless exact legacyprofil bruger scheduler/manuelt vejr `candidate-legacy-maintenance`/`LEGACY_CANDIDATE_G_REFRESH_BEFORE_INITIAL_CUTOVER`; markøren består efter current Candidate-complete med fire `null`-returnfelter og må kun arves fra valid lineage. `legacySourceRequired` er da false, fordi den faktiske source er current Candidate. En separat current Candidate-lineage efter afbrudt integreret cutover bruger `CANDIDATE_G_REFRESH_BEFORE_INITIAL_CUTOVER` og bevarer de fire ikke-null return-evidence-hashes; normal drift bruger `CANDIDATE_G_REFRESH`. Direkte rowless integrated cutover bruger `expectedVersion=0`/`legacySourceRequired=true`; efter bridge-complete bruges exact current Candidate-marker, den aktuelle CAS-version og `legacySourceRequired=false`. Ingen marker må skabes ved relabel, og ingen vedligeholdelsesgren må skrive `INTEGRATED_PENDING` eller aktivere state 6. Kun den eksakte `READY`/`memoryReady` Candidate G-runtime må i den manuelle rollbacktilstand projicere sin egen mode-score som exact full-history med collapsed bounds, coverage 48 og tomme reasons; non-READY/mismatch afvises, og `calibration_eligible=false` består. Der deployes ingen særskilt Candidate G-assistent-Edge; den integrerede Edge svarer `409`, og klienten bruger deterministiske lokale DA/DE/EN-svar.

4.0.318's Candidate G-rollbackbundle har sin egen `modelContractSha256=c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8` og transitive 55-filers `modelBundleSha256=dcbd8d72aa9794dc7dc24eae52f23d25914af61a49c5fcd73742818f4ca77bb4`. Same-reference protected-checkpointtests beviser lokalt, at både `generationSha256` og hele den validerede `candidateGRollbackCompanion` sammenlignes før mutation, og at divergens stopper fail-closed med bevaret eksisterende state. Lokal kontrakt- og fault-injection-evidens må ikke kaldes exact-head-, central-, deploy- eller offentlig produktionsverifikation.

Af de 24 kronologiske par havde 20 en pipelinebundet score fra begge modeller. Fire par var bevidst utilgængelige ved 47-timers warmup, 4-timers gap, missing og den efterfølgende strøm-recovery, hvor det manglende punkt stadig lå i 48-timersvinduet. For de 20 sammenlignelige par var den syntetiske middelændring `+5,150`, minimum `−2` og maksimum `+42`. Disse tal beskriver kun de valgte syntetiske checkpoints.

## Frossen komponent-kontrafaktisk: Candidate G mod den integrerede model

De 24 frosne komponentpar — 48 individuelle modelevalueringer — gav en gennemsnitlig scoreændring på `+8,792`, minimum `0` og maksimum `+41`. Fire individuelle Candidate G-evalueringer blev nulstillet af den gamle 13-timers helscoregate; ingen af de fire tilsvarende integrerede evalueringer blev nulstillet.

Dette spor holder transport- og mobiliseringspotentialerne fast som syntetiske input til evaluatorerne. Det isolerer scorekontrakten, men beviser ikke, at de to statepipelines ville producere de indsprøjtede potentialer fra et bestemt vejrhistorikforløb. Det kronologiske bevis står i afsnittet ovenfor.

| Syntetisk situation | Jagtform | Candidate G | Integreret | Forskel | Integreret transport |
|---|---|---:|---:|---:|---:|
| Balanceret påland | Strand | 71 | 72 | +1 | — |
| Balanceret påland | Waders | 72 | 72 | 0 | — |
| Positiv strømtilførsel 70, aktive fralandsbølger | Strand | 70 | 71 | +1 | 70 |
| Positiv strømtilførsel 70, aktive fralandsbølger | Waders | 73 | 74 | +1 | 70 |
| Lav strømtilførsel, pålandsbølger | Strand | 43 | 46 | +3 | — |
| Lav strømtilførsel, pålandsbølger | Waders | 46 | 49 | +3 | — |
| 12 effektive timer ud | Strand | 37 | 43 | +6 | 4 |
| 12 effektive timer ud | Waders | 37 | 43 | +6 | 4 |
| 13 effektive timer ud | Strand | 0 | 41 | +41 | 0 |
| 13 effektive timer ud | Waders | 0 | 41 | +41 | 0 |
| 14 effektive timer ud | Strand | 0 | 41 | +41 | 0 |
| 14 effektive timer ud | Waders | 0 | 41 | +41 | 0 |
| Høj energi, transport 0, påland eller fraland | Strand | 31 | 37 | +6 | 0 |
| Høj energi, transport 0, påland eller fraland | Waders | 37 | 43 | +6 | 0 |
| Maksimal transport, høj energi, påland | Strand | 87 | 87 | 0 | 100 |
| Maksimal transport, høj energi, påland | Waders | 80 | 80 | 0 | 100 |
| Maksimal transport, høj energi, fraland | Strand | 86 | 87 | +1 | 100 |
| Maksimal transport, høj energi, fraland | Waders | 80 | 80 | 0 | 100 |
| Efterfølgende roligt forløb | Strand | 71 | 72 | +1 | — |
| Efterfølgende roligt forløb | Waders | 71 | 71 | 0 | — |
| Ekstremt dårlige wadersforhold | Strand | 85 | 85 | 0 | — |
| Ekstremt dårlige wadersforhold | Waders | 0 | 0 | 0 | — |

Tabellen viser to vigtige egenskaber:

1. 13 timers stærk fralandsstrøm kan fortsat reducere **transportpotentialet** til 0.
2. En **klar, verificeret** transportkomponent på 0 bruges ikke længere som bevis for, at mobilisering, jagtbarhed og et ukendt lokalt/sekundært lager også er 0. Manglende strømstate er en anden tilstand og gør fortsat scoren utilgængelig.

Det store løft på 41 point i gate-scenarierne er derfor tilsigtet kontraktadfærd, men fortsat en ukalibreret ændring — ikke evidens for flere fund.

Dette historiske pre-1.1.0-resultat havde retningsinvarians ved både transport 0 og transport 100. Det er **erstattet** af den aktive bounded wave-approach-kontrakt: bølger kan fortsat ikke skabe transport fra nul, men et aktivt energirigt felt med svag landværts approach kan dæmpe et eksisterende transportpotentiale med højst 15 %. Den gamle invarians må ikke bruges som slutbevis for releasekandidaten.

## Ablation af kobling til uobserveret lager

RavRadar observerer hverken lokalt ravlager eller sekundære beholdninger bag revler, på strandfladen eller i den nære kystzone. Auditten afprøvede derfor fem **kontrafaktiske skalarregler** på de samme 24 frosne scenario-/jagtformpar. `M` er den modellerede mobiliseringsmulighed og `T` den klare, verificerede strømtilførselskomponent; ingen af dem er ravmasse.

| Variant | Effektivt mobiliseringsled | Syntetisk middel | Middelforskel fra aktiv | Største absolutte forskel | Observeret scoreinterval ved `T=0` | Balanceret strand | 13 timer ud, strand | Høj bølge/`T=0`, strand |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Aktiv additivitet | `M` | 56,500 | 0 | 0 | 37–43 | 72 | 41 | 37 |
| Fuld kobling | `M × T/100` | 43,000 | −13,500 | 27 | 10–19 | 66 | 18 | 10 |
| Kvadratrodskobling | `M × sqrt(T/100)` | 44,500 | −12,000 | 27 | 10–19 | 68 | 18 | 10 |
| Eksplicit 50 %-lagerprior | `M × (0,5 + 0,5 × T/100)` | 49,750 | −6,750 | 14 | 23–30 | 69 | 30 | 23 |
| Minimumsbottleneck | `min(M,T)` | 44,292 | −12,208 | 27 | 10–19 | 72 | 18 | 10 |

Tallene er syntetiske kontraktresultater, ikke fundkalibrering. Den aktive variants observerede 37–43 er heller ikke dens matematiske maksimum. Ved `T=0` kan 20/50/30 højst give `0,20 × 100 + 0,30 × 100 = 50`; scoren kan dermed være dårlig eller højst svag under præsentationsgrænserne 35/55/75, aldrig middel eller god. Waders-cappen kan sænke den yderligere. Dette loft gælder kun en klar nulkomponent. Ikke-klar eller manglende strømstate fejler lukket og giver ingen score.

Fuld-, kvadratrods- og minimumsvarianten gør alle den aktuelle strømtilførsel til proxy eller hård øvre grænse for hele det mobiliserbare lokale/sekundære lager. Ved `T=0` undertrykker de derfor mobiliseringsleddet, selv om RavRadar ikke har observeret, at dette lager er nul. 50 %-varianten undgår hard-zero, men indfører i stedet en konkret, udokumenteret antagelse om, at halvdelen af lageret er uafhængigt af strømtilførslen.

Aktiv additivitet tilfører mindst ekstra **lagerstruktur** blandt disse alternativer, fordi `T` ikke omfortolkes som lagermåling. Det gør ikke additiviteten antagelsesfri: den bevarer en ukalibreret prior om indeksmæssig separabilitet og kompensation, og `M` skal altid forklares som en betinget mulighed — “hvis materiale er tilgængeligt” — aldrig som bevis for lager eller forventet fund. Uden repræsentative fund/nul-fund kan ablationen ikke vælge en empirisk optimal kobling. Der blev derfor ikke fundet en kontradiktionsfejl, som begrunder ændring af den aktive formel.

## Vægtfølsomhed

20/50/30 reproducerede den faktiske integrerede score i alle evaluerede scenario-/jagtformpar.

| Vægtning | Syntetisk middel | Middelforskel fra 20/50/30 | Største absolutte forskel | 12 timer ud minus balanceret strand |
|---|---:|---:|---:|---:|
| 20/50/30 | 56,500 | 0 | 0 | −29 |
| 25/40/35 | 60,333 | +3,833 | 9 | −21 |
| 20/45/35 | 58,417 | +1,917 | 5 | −25 |
| 15/50/35 | 56,667 | +0,167 | 4 | −29 |

20/50/30 og 15/50/35 bevarer den største syntetiske kontrast mellem balanceret tilførsel og det næsten udtømte 12-timers strømspor. Auditsporet kan ikke afgøre, om 20/50/30 er empirisk optimalt; vægtene forbliver en transparent prior.

## Strømhukommelse

### 12/13/14 timer og +10/−8

Med fuldt udgangspunkt, fuld fralandsstyrke og kontraktens `−8` gav replay potentialerne 4, 0 og 0 efter henholdsvis 12, 13 og 14 effektive timer. Den integrerede transportkomponent kan dermed nå nul på samme tidsskala som Candidate G. Kun den separate helscoregate er fjernet.

| Rateprior | Seks moderate timer ind | Tolv fulde timer ud efter mætning |
|---|---:|---:|
| +8/−8 | 24 | 4 |
| +10/−8 | 30 | 4 |
| +10/−10 | 30 | 0 |
| +12/−8 | 36 | 4 |

`+10/−8` er en asymmetrisk prior med 0/100-klipning, ikke en estimeret massebalance.

### Alderskerner

| Syntetisk forløb | Fuld 24 + cosinus til 48 | Ens 48 | Lineær til 48 | Eksponentiel halvering 24 |
|---|---:|---:|---:|---:|
| Vedvarende ind | 100 | 100 | 100 | 100 |
| Seks timers vending ud | 52 | 52 | 55 | 55,929 |
| Tolv timers vending ud | 4 | 4 | 16 | 18,869 |
| Ældre ind, senest neutral | 100 | 100 | 60 | 86,562 |

Den valgte kernel reagerer stærkere på en nyere kraftig vending end de lineære og eksponentielle alternativer, men bevarer dokumenteret indgående evidens fuldt i det første døgn. Det er modeladfærd, ikke et fundresultat.

### Styrkegrænser

I det blandede syntetiske forløb gav grænserne `0,02–0,12`, `0,03–0,15` og `0,05–0,20 m/s` slutpotentialerne henholdsvis 32,8, 52 og 38,4. Den ikke-monotone forskel skyldes styrkeskalering, kronologisk 0/100-klipning og et efterfølgende udgående spor.

Auditten dokumenterer reel følsomhed, men giver ikke evidens for at erstatte den aktive `0,03–0,15`-prior.

## Bølgemobilisering: 3/4/6 og 24/48/72

Auditten brugte 12 timers ens høj energiproxy efterfulgt af 72 timers ro.

| Opbygning | Aftrapning | Efter 12 timer høj energi | Efter 24 timer ro | Efter 48 timer ro | Efter 72 timer ro |
|---:|---:|---:|---:|---:|---:|
| 3 | 24 | 70,312 | 35,156 | 17,578 | 8,789 |
| 3 | 48 | 70,312 | 49,718 | 35,156 | 24,859 |
| 3 | 72 | 70,312 | 55,807 | 44,294 | 35,156 |
| 4 | 24 | 65,625 | 32,812 | 16,406 | 8,203 |
| 4 | 48 | 65,625 | 46,404 | 32,813 | 23,202 |
| 4 | 72 | 65,625 | 52,087 | 41,341 | 32,812 |
| 6 | 24 | 56,250 | 28,125 | 14,062 | 7,031 |
| 6 | 48 | 56,250 | 39,775 | 28,125 | 19,887 |
| 6 | 72 | 56,250 | 44,646 | 35,435 | 28,125 |

Den aktive 4/48-kontrakt ligger midt i den afprøvede matrix: 65,625 efter opbygning og 46,404, 32,813 og 23,202 efter 24, 48 og 72 timers ro. Det gør den moderat i denne syntetiske matrix, men validerer ikke halveringstiderne mod ravfund.

## Last mile: 1.1.0 bounded wave-approach

Den aktive kontrakt er:

```text
movementDirection = normalize360(DMI_WAM_FROM + 180°)
W, N, T = causalEnergyWeightedEwma4h(...)
approach = clamp((normalAlignment + 0,25) / 1,25, 0, 1)
factor = clamp(1 - 0,15 × W × (1 - approach), 0,85, 1)
deliveryPotential = transportPotential × factor
```

Den målrettede 1.1.0-regression skal og kan uden private data bevise:

- FROM→TOWARD roteres præcis én gang og måles mod den uændrede eksisterende kystnormal,
- `factor` er monotont ikke-faldende for normalalignment `−1`, `−0,25`, `0`, `0,5`, `1`,
- aktiv `factor` ligger altid 0,85–1,
- delivery kan aldrig overstige tilførsel eller blive positiv ved tilførsel 0,
- faktorens største mulige rå totalscoreeffekt er 7,5 point før slutafrunding; vist RavScore kan derfor ændres 8 point,
- kun `waveHeightM=0` er eksakt roligt og neutralt; `wavePeriodS` er stadig finit/ikke-negativ, og positiv højde med nulperiode er `INVALID`/fail-closed,
- aktiv energi uden retning fejler lukket,
- normal-, tangent- og aktivitetsmomenter er kausale over fire timer,
  - one-shot og split-run gav byte-identisk continuation i den historiske, aldrig offentlige schema-5-releasekandidat og skal genbevises for schema 6,
- Candidate G-migrationen validerer og genvægter eksakt forseglet signeret kystnormal evidens uden rå U/V, bruger præcis 40 private præ-target-positioner til wave-approach, afgrænser udeladt hale til `1/1024` og konservativ rå-scorefejl til `0.01171875`, kræver 673/common-target og coherent same-cell WAM-proveniens og bruger den virkelige targetrække én gang; ægte state-løs cold start er den særskilte `bounded-private-48h-history-cold-replay-v3` og bliver ikke full efter 48 timer.

`physicalDeliveryResolved` forbliver falsk, strukturel usikkerhed er altid sand, og et numerisk fysisk interval er `null`. 0–15 % er en bounded modelprior, ikke en fysisk rav-landingsandel. Rainville et al. 2026 (`10.1029/2025JC022422`) støtter alene, at brydende bølger kan give flydende objekter landværts surfingtransport; det er en buoyant-object-analogi, ikke ravkalibrering. Aagaard et al. 2002 (`10.1016/S0025-3227(02)00193-7`), Jalón-Rojas et al. 2025 (`10.5194/gmd-18-319-2025`) og Lofty et al. 2023 (`10.1016/j.watres.2023.120329`) viser fortsat, hvorfor lokal morfologi og partikelstate ikke er løst af prioren.

Den tidligere faste `5,25 %`-idé er forkastet. Historiske 0/5,25/10 %-tabeller må kun bruges som mærkede kontrafaktiske eksempler; de er ikke den aktive algoritme og må ikke blandes sammen med den energivægtede 0–15 %-dæmpning.

Geodatastyrelsens 50 m Danmarks Dybdemodel kan senere analyseres som statisk kontekst, men er ikke aktivt scoreinput: delvist interpolerede middel-dybder kan ikke repræsentere dynamiske revler, ripkanaler eller bølgeopløst surfzone. Ingen geometri, hav-/landpunkter eller kystnormaler flyttes.

## Vandstand, missing og cadence

Faldende, stabil og stigende vandstand gav score 72 for både strand og waders. Alle tre havde nul scoreeffekt. Det er foreneligt med, at faldende vand både kan blotlægge eller efterlade rav ved revler og i andre lokale forløb ledsage udadgående vandbevægelse. Uden lokal procesopløsning må scenarierne ikke omsættes til universelle point.

Fail-closed- og cadencekontrollerne bestod:

- komplet 48-timers strømspor: `READY`,
- godkendt to timers native hold: `READY_NATIVE_HOLD` uden statebevægelse,
- fire timers hold: `LATEST_SAMPLE_GAP`,
- missing i vinduet: `WINDOW_HAS_MISSING_EVIDENCE`,
- for stort internt gap: `WINDOW_HAS_TIME_GAP`,
- bølger: `COLD_START` → `READY` → `MISSING_INPUT` → `RECOVERED_SHORT_GAP` → `RESTARTED_AFTER_GAP`,
- recovery/restart: højst én times ny buildkredit,
- manglende strandvind: `BEACH_WIND_INPUT_MISSING`,
- manglende klar strøm-, bølge- eller jagtbarhedstilstand: lokal score utilgængelig med specifik årsag.

Strømevidensloftet er 49, ikke 50. Et eventuelt reelt præ-grænse-bropunkt er del af de 49. Den tætte, ujusterede overskridelse fejler lukket.

## Strand og waders

72 kombinationer af jagtform, vind og bølgehøjde blev sammenlignet med Candidate G’s godkendte jagtbarhedsprofil. Største absolutte forskel var 0. Ved 15 m/s var waders-jagtbarheden altid 0, mens strand lå mellem 25,72 og 55,72 afhængigt af bølgerne.

Den integrerede totalscore respekterede waders-cap i alle 15 relevante cap-evalueringer med maksimal overskridelse 0. Strand havde i de 15 tilsvarende kontroller ingen waders-cap og bevarede sin separate semantik.

## Understøttede forbedringer

Auditten understøtter følgende kontraktmæssige forbedringer:

- Candidate G’s helscore-nul ved 13 timer er fjernet, mens transportpotentialet fortsat kan nå 0.
- Aktuel gridstrøm, bølgemobilisering og last mile er adskilte komponenter.
- Last mile bruger én eksplicit, 0–15 % bounded og kun dæmpende wave-approach-faktor; det uopløste fysiske leveringsled skjules ikke som et målt interval.
- Bølger kan ikke skabe eller øge transport ved potentiale 0, og faktorens største mulige rå totalscoreeffekt er 7,5 point før slutafrunding; vist RavScore kan derfor ændres 8 point.
- Missing obligatoriske input fejler lukket; aktiv bølgeenergi uden retning er ikke en score-neutral genvej. Kun `waveHeightM=0` er neutral exact calm; `wavePeriodS` skal stadig være finit/ikke-negativ, og positiv højde med nulperiode er `INVALID`/fail-closed.
- Vandstand forklares uden scorepoint eller dobbelttælling.
- Native cadencehold tilføjer hverken bevægelse eller kunstig historik.
- Candidate G’s godkendte strand-/waders-jagtbarhed er bevaret præcist.
- Den historiske, aldrig offentlige schema-5-releasekandidats særskilte rollbackmobilisering reproducerede Candidate G-oraklet eksakt i hele det kronologiske spor og i split-run; state-6-v3-rollbacken skal bevare dette oracle.
- Det tidligere `5,25 %`-design er fanget og forkastet før cutover.
- Genuine cold start bruger 0–48 private, verificerede pre-target-timer og derefter den virkelige targetrække og er fortsat `HISTORY_INCOMPLETE`, også ved 48 timer, fordi wave-mobilisationshalen først lukkes konservativt efter 288 timers kausal recovery. Alle WAM-timer i cold-start-sporet er exact native (`maximum_interpolation_hours=0`); `INTERPOLATED_COLD_START` er en fast fejl, og højst fire timers WAM-interpolation gælder alene migration/generisk acquisition. `FULL_HISTORY` kommer fra denne closure eller en attestert migration/continuation; Candidate G-rollback beregnes for samme tid uden dobbelt credit.
- Samme-model emergency accepterer kun én atomisk, komplet og hashverificeret 210/673-pakke, højst 72 timer og aldrig efter `validUntil`; cross-model/reconstructed/tampered state afvises, og ture bliver ikke-kalibreringsegnede.
- DEC-0109-apply blev opgivet før mutation/publicering. Den afgrænsede reconstructed-kontrakt bevares kun som negativ trust-/privacy-/rollbackregression.

## Regressionsrisici og uafgjorte områder

- Fjernelsen af helscoregaten løfter de syntetiske 13-/14-timers scenarier med 41 point. Det er tilsigtet, men stort og ikke fundkalibreret.
- Fjernelse af tidligere bottlenecks løfter flere lav-transportscenarier.
- Aktiv additivitet er den mindst ekstra lagerstrukturerende af de afprøvede regler, men separabilitet og kompensation er stadig ukalibrerede priors.
- En ikke-nul score ved klar transport 0 er kun et betinget mulighedsindeks og må aldrig præsenteres som evidens for et lokalt lager.
- Strømkerne, grænser, rater og bølgehalveringstider flytter de syntetiske resultater mærkbart.
- Modellen observerer ikke den lokale ravbeholdning.
- Auditsporet estimerer ikke, hvor meget rav vedvarende fralandsstrøm faktisk fjerner fra strand-/revlesystemet.
- Auditsporet afgør ikke, hvornår faldende vand primært blotlægger/retinerer materiale eller ledsager søværts transport.
- Surfzone, dynamiske revler, lokal tidstro batymetri, undertow, feeder-/langskyststrøm, ripstrømme, aflejring og retention er uopløst. DDMs 50 m middelgrid er derfor ikke scoreinput.
- 20/50/30, `0,03–0,15`, `+10/−8`, 4/48 og wave-approachens `−0,25`/15 % forbliver transparente priors, ikke estimerede optimum.

Ingen af disse uafgjorte områder må omskrives til et numerisk fysisk last-mile-interval eller en påstand om empirisk højere fundpræcision.

## Reproduktion

Kør den datasikre selvtest fra repositoryroden:

```powershell
node scripts/audit-ravscore-integrated-offline-evidence.mjs --self-test
```

Den fulde maskinlæsbare rapport fås uden `--self-test`. Scriptet stopper ved kontrakthash-mismatch, brud på Candidate G-/integreret invariant, hvis den målrettede rollbackmutation ikke afvises, eller ved forbudte rå strømvektor-/koordinatfelter i rapportobjektet.
