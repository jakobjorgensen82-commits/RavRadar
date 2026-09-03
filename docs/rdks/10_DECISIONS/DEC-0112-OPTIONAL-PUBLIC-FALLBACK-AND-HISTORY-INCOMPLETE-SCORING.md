# DEC-0112 – frisk primary må publiceres uden gyldig fallback; HISTORY_INCOMPLETE er en særskilt scorekvalitet

**Status:** Ejerbesluttet og bindende. Publiceringsdelen er aktiv for Candidate G, som fortsat er den eneste offentlige model. State-6-koden på sourcehead `cbc4639af411ee741be938980b2d7a8c08b6b79d` indgår nu i den mergede Fase A efter PR #246, grøn exact-head-kildegate `33706215425` og merge `7198b685f4bc9d86bd6432b049380f4279ab797c`, men state 6 er ikke aktiveret eller offentligt verificeret. Den lokale 4.0.321-checkpointlukning er heller ikke pushet, exact-head-verificeret, anvendt mod live Supabase eller merged.

**Dato:** 2026-08-30

## Operativ status 2026-09-03

Fase A er afsluttet for den samlede modelkode, mens den offentlige profil bevidst forbliver Candidate G. Det lokale 4.0.321-delta reducerer checkpointets normale database-egress med version-only read efterfulgt af server-side CAS og højst 4 KiB metadataresponse; en fuld checkpointpayload på højst 16 MiB læses kun ved restore, når Actions-cachen mangler. Databasen validerer eksakt 673 integrerede states og 673 `READY` Candidate G-companionstates samt privacy/envelope/binding, men JavaScript er fortsat eneautoritet for replay og kanoniske hashes. Checkpointet skaber ingen nye historikrækker, og direkte læsning/funktionsudførelse er låst af RLS/ACL til den afgrænsede service-role-vej.

Dette ændrer ikke `HISTORY_INCOMPLETE`-matematikken og gør ikke state 6 live. Den lokale deltas egen exact-head/merge, live kapacitetsmåling og cache-miss-rate samt 673 × 118, Feggesund 3 × 118, Fase B, frisk produktion og offentlig browserverifikation er fortsat åbne.

## Præcisering 2026-08-31 – fuld prognoseakse og forklaring

Ved gyldige direkte obligatoriske input for hver time skal state 6 publicere den eksakte akse `productionTarget..productionTarget+117 h`: 118 timer, current og fem kalenderdage, også når ældre historik er ufuldstændig. Hver sådan time er `HISTORY_INCOMPLETE` med vist lower bound, upper bound, spænd, coverage/reasons, synlig DA/DE/EN-advarsel og `calibrationEligible=false`. Advarslen forsvinder automatisk ved `FULL_HISTORY`. Manglende eller ugyldigt direkte strøm-, bølge- eller jagtbarhedsinput gør kun den berørte time `UNAVAILABLE`/`null`; det må ikke maskeres af interpolation, hold/carry eller nabozonelån.

Startup, detaljer, femdøgnsvisning, rangering/beste tidspunkt, admin/ekspert og lokal/Edge-baseret Spørg RavRadar skal skelne `HISTORY_INCOMPLETE` fra direkte inputmangel. Den offentlige DA/DE/EN-forklaring beskriver i almindeligt sprog, at nyere bølgeenergi vejer mest, at vægten halveres over fire timer, og at last-mile-leddet højst dæmper eksisterende leveringssignal 15 %. W/N/T/EWMA er intern notation og må ikke kræves af brugeren. De målrettede P2-tests og Fase A's exact-head-kildegate er grønne; state-6-produktion, aktivering og offentlig verifikation af fladen udestår.

## Hændelse og bevis

4.0.315-retirementen bestod PR #233 exact-head `33299676128` og blev merged som `63d789a4`. Post-merge-run `33299747300` frigav den tidligere D1-/reconstruction-readiness og startede det normale build. Dermed er den stale grøn-no-op-interlock ikke længere den aktuelle blocker.

Runnet stoppede rødt ved **“Stage audited last verified Candidate G public fallback”**. Der fandtes ingen komplet measured-only fallback, som både var højst 72 timer gammel og stadig lå inden for sin egen prognosehorisont. Stoppet beskyttede korrekt mod at vise gamle data, men gjorde samtidig en gyldig frisk primary afhængig af, at et ældre reservedatasæt fandtes. Aktuelle og femdøgnsprognoser blev derfor ikke publiceret. Ingen syntetiske eller interpolerede data blev skabt eller anvendt.

## Beslutning for 4.0.316

1. En last-verified Candidate G-fallback er valgfri, når den nye primary er frisk, measured-only og består alle egne current-hour-, input-, provenance-, 210/673-, accounting-, audit-, validate-, release-, artifact- og Pages-gates.
2. En fallback må fortsat kun stages, hvis den er én komplet, auditeret, measured-only 210/673-pakke, er højst 72 timer gammel og ikke har overskredet sin kortere prognose-/produktudløbsgrænse.
3. Hvis ingen sådan fallback findes, er det en forventet **ingen-fallback**-tilstand, ikke en fejl i en ellers gyldig frisk primary. Gammel, udløbet, ufuldstændig, ukendt, blandet, rekonstrueret eller manipuleret fallback må aldrig vises. Den skal være fraværende i manifestet og fjernes fra de publicerede fallbackfiler, så en tidligere kopi ikke kan genbruges.
4. Fravær af gyldig fallback må ikke blokere offentliggørelse af frisk current- og femdøgnsvejr. Det lemper ikke primary: uventede optællinger, inkonsistent manifest/fil-accounting, auditafvigelser, manglende current/future-input eller andre primaryfejl stopper fortsat fail-closed.
5. Hotfixen må ikke interpolere, backfille, låne fra andre zoner eller skabe syntetisk Candidate G-state. Manglende historik og manglende fallback forbliver ærligt manglende.
6. Gaten var bindende før release og er nu lukket for publiceringsdelen: 4.0.316/Candidate G er offentligt observeret som frisk `rr-20260830091913-210` med 210/673. Candidate G gav 0 aktive/210 `UNAVAILABLE` på grund af utilstrækkelig sammenhængende currenthistorik; det er regressionsevidens for state-6-kravet, ikke state-6-produktionsbevis.

## Bindende modelbeslutning under DEC-0102

1. `HISTORY_INCOMPLETE` er en scorekvalitet, ikke det samme som manglende aktuelle eller fremtidige input. Når de direkte, tidsbundne current/future-input for en scoretime er gyldige, skal den kommende model fortsat levere scores over hele den aktuelle og femdøgns tidsflade, selv om det rullende historikvindue endnu ikke er komplet.
2. `HISTORY_INCOMPLETE` må ikke skjules som normal fuld historik. Score, detaljer, femdøgnsvisning, admin og ekspertflade skal vise en tydelig, stabil og meningsmæssigt ens advarsel på dansk, tysk og engelsk. Advarslen skal forsvinde automatisk, når den nødvendige sammenhængende historik igen er komplet; der må ikke kræves manuel nulstilling.
3. Enhver tur, observation eller anden læringsevidens bundet til en `HISTORY_INCOMPLETE`-score skal have `calibrationEligible=false` gennem alle klient-, Edge-, lager-, manifest- og auditgrænser.
4. Manglende eller ugyldigt current/future-input er en separat `UNAVAILABLE`-tilstand for den berørte time. `HISTORY_INCOMPLETE` må aldrig udfylde, bære frem, interpolere eller omklassificere sådanne input.
5. Beslutningen kræver fuld producent-/forbrugermatrix og modeltests under DEC-0102. Den fastsætter tilgængelighed, mærkning og kalibreringsgrænse, men godkender ikke en utestet numerisk erstatning for historikafhængige komponenter.

## Bindende numerisk state-6-kontrakt

DEC-0112 udvider og præciserer DEC-0110. Den aktive lokale releasekandidat er fortsat den ene integrerede model `RRS-COASTAL-PROCESS-INTEGRATED-1.1.0`, men dens continuation-state er nu `6.0.0` med følgende eksakte aktive id'er:

- profil `cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-historybounds12d-lastmileewma4-tail40-atten15-v5`,
- komponent `ravscore-components-huntability-delivery-mobilisation-bounds-v5`,
- forklaring `ravscore-explanation-integrated-bounds-v5`,
- rangering `direction-broad-19-history-tie-v2`,
- bedste tidspunkt `score-history-water-tie-earliest-v3`,
- Candidate G-migration `candidate-g-schema2-signed-current-reweight-bounded40h-wave-approach-to-integrated-schema6-v5`,
- eksakt state-5-migration `integrated-schema5-ready-point-to-schema6-history-bounds-v1`,
- rollback `integrated-schema6-to-candidate-g-schema2-v3`,
- usikkerhedspolicy `conservative-enclosing-history-bounds-current48-wave12d-lastmile40-v1`.

Den numeriske kontrakt er:

1. **Direkte input og historik er to forskellige akser.** Mangler eller er scoretimens direkte strøm-, bølge- eller jagtbarhedsinput ugyldigt, er den berørte score `UNAVAILABLE` og `null`. Der må ikke interpoleres, bæres frem eller lånes fra andre timer, zoner eller kystdele. Kun når de direkte input er gyldige, må manglende ældre historik håndteres som `HISTORY_INCOMPLETE`.
2. **Strøm har fortsat præcis 48 timers aktivt scorevindue.** Verificerede intervaller bruger den ordinære 0,03/0,15 m/s-, +10/-8- og 24/48-timerskerne. Et ukendt historisk interval får ingen opdigtet måleværdi; i stedet beregnes en omsluttende nedre bane med stærkest tilladt udstrømning og en øvre bane med stærkest tilladt indstrømning under samme kerne og samme grænsebetingelse.
3. **Bølgemobilisering omsluttes deterministisk.** Ukendt historisk bølgeenergi føres gennem en nedre bane med mål 0 og en øvre bane med mål 100. Ved 288 timer, hvor den størst mulige resterende påvirkning af den rå totalscore er højst `0,46875` point, lukkes scoringens wave-track eksplicit til lower-bound-sporet. Den separate fysiske/rollback-point-state bevares. De 288 timer ændrer ikke strømvinduet og er ikke et krav om 12 døgns offentlig historik.
4. **Last mile omsluttes særskilt.** Ukendt historisk bølgeretning føres gennem minimums- og maksimumsbaner for de kausale aktivitets- og normalmomenter. Ved 40 timer, hvor den udeladte momentandel er højst `1/1024`, lukkes scoringens last-mile-track til minimum-factor-sporet, mens fysisk/rollback-point-state bevares. Manglende retning ved aktiv bølgeenergi i selve scoretimen er stadig `UNAVAILABLE`; kun eksakt roligt bølgefelt er neutralt.
5. **Den viste score er konservativ.** `scoreBounds.lower` og `scoreBounds.upper` beregnes gennem hele 20/50/30-kæden; både nedre og øvre bane får den samme relevante waders-cap. Ved `HISTORY_INCOMPLETE` er den viste heltalsscore den nedre grænse, mens den øvre grænse, spændet, årsagskoderne og historikdækningen følger med som forklaring. Det er et beregningsmæssigt omsluttende interval, ikke et fysisk konfidensinterval og ikke en påstand om fundchance.
6. **Fuld historik er en beviselig modeltilstand.** `FULL_HISTORY` kræver kollapsede bounds og ingen åben historikårsag, men har to tilladte `scoreSemantics`: `EXACT_POINT_SCORE` og `CONSERVATIVE_TAIL_RESET_POINT_SCORE`. `conservativeResetAt` markerer 288-/40-timersclosure eksplicit; senere huller åbner bounds fra det konservative scoringstrack. Closure er en fast, kalibreringsegnet modelpolitik og må ikke beskrives som fysisk eksakt state. `direction-broad-19-history-tie-v2` og `score-history-water-tie-earliest-v3` bruger numerisk score først; `FULL_HISTORY` vinder kun et eksakt tie, før eksisterende retnings-, vandstands-, trend- og tidsregler.
7. **Retention er ikke scorehukommelse.** Der må opbevares 168 timers datasikker researchhistorik til replay, audit og senere analyse, men `researchRetentionScoreEffect=NONE`: ingen score, rangering eller bedste-tid må afhænge af mere end de aktive procesvinduer. Retention må ikke blive en skjult syvdøgnsvægtning.
8. **Kalibrering forbliver lukket.** `HISTORY_INCOMPLETE` og `UNAVAILABLE` har altid `calibrationEligible=false` i browser, lokale og Edge-baserede Spørg RavRadar-svar, konto/tur/observation, D1/Supabase, admin, ekspertflader, manifest og audits. Kun `FULL_HISTORY` kan være kalibreringsegnet, og det er ikke i sig selv et fundbevis.

## Historisk Feggesund-konklusion – snævert supersederet af DEC-0114

Dette afsnits oprindelige pensionering af enhver Feggesund-proxy er supersederet af ejerbeslutningen 2026-09-02 i DEC-0114 og må ikke længere læses som aktiv direct-only-kontrakt. DEC-0114 tillader præcis én operationel undtagelse: kun `DK-B05-11`, kun den komplette bølgetuple og kun når direkte lokal DMI-WAM mangler helt, mens både `DK-B05-10` og `DK-B05-12` leverer komplette, direkte og same-run DMI-tuples. Den faste 50/50 energikonsistente proxy skal mærkes med usikkerhed/advarsel, og enhver proxyinvolveret score har `calibrationEligible=false` gennem alle forbrugere.

Alle generelle regler i denne beslutning består: ingen current-, historik- eller recovery-backfill, ingen carry-forward eller generelt zonelån, og ingen ændring af geometri, land-/vandpunkter eller kystnormal. Et privacy-sikkert 3 × 118-bevis og de fulde releasegates er fortsat nødvendige. Den sanitiserede parentserie var årsagsevidens, ikke dokumentation for lokal surfzonefysik eller empirisk højere fundpræcision.

## Migration, checkpoint, recovery og rollback

Schema 5 var en lokal, aldrig-offentlig releasekandidat. Den må ikke længere være aktiv cache-, checkpoint-, publicerings- eller recoverykontrakt. Én state må kun migreres 5→6, hvis den er et eksakt `READY`-punkt med den historiske 11-feltsbinding og de historiske hashes `0cd7c263727721696253ae57c45aa3485b4081ff2cbb5b01a1f022b31b1aa7da` og `27a744e820038d5e508597d02fd0a600479f160a5a5a4a66bdc252e7ea8b3bcd`. Migrationen kollapser nedre og øvre baner til det beviste punkt og opfinder ingen usikkerhed eller historik.

Candidate G kan fortsat importeres én gang fra dybt valideret schema 2 direkte til schema 6. Efter migrationen må privat runtime, kompakt checkpoint, Actions-cache og det beskyttede centrale checkpoint kun fortsætte eksakt schema 6 med den fulde 11-feltsbinding. Et schema-5-checkpoint er alene migrationskilde og aldrig normal recovery. Candidate G forbliver privat migrations-/offline-/rollback-orakel; rollbacken er stadig manuel, hel og observationsatomisk og må aldrig blive samtidig offentlig shadowmodel eller automatisk fallback.

State-løs recovery bruger den versionsbundne politik `bounded-private-48h-history-cold-replay-v3`, genafspiller 0–48 faktisk tilgængelige private, verificerede timer plus reel target og giver altid `HISTORY_INCOMPLETE`, også ved 48 timer: current er da komplet og last-mile-sporet lukket, men wave-mobilisationshalen er først lukket efter 288 timers kausal fortsættelse. Lineage bærer `expectedCausalPositionCount=48`, faktisk `completeCausalPositionCount`, `boundedUnknownPositionCount` og `historyTransition`; 48/48 giver `VERIFIED_CAUSAL_HISTORY_WINDOW`, mens ethvert ufuldstændigt forløb giver `UNKNOWN_HISTORY_INTERVAL`. Overgangen dokumenterer currentvinduet, men ommærker ikke wave-halen til fuld historik. `FULL_HISTORY` kommer fra 288-timersclosure eller en eksakt attestert migration/continuation.

Checkpoint-only recovery bruger atomisk checkpointschema 4 med status `ravscore-schema6-with-candidate-g-rollback-companion` og cachepolicy `ravscore-continuation-schema6-v2`. Det indeholder 673 schema-6-states og en beskyttet READY Candidate G-rollback-companion schema 1/status `candidate-g-rollback-ready-companion` fra samme generation. Companionen skal matche target, 673/673, Candidate G-binding og generation/hash og må aldrig rekonstrueres fra `HISTORY_INCOMPLETE` state 6. Serializer-/protected-storage-tests for paritet, 672, cross-generation, tamper og privacy er grønne; samlet public-runtime-/workflow-regression er fortsat cutovergate.

Under en eksplicit manuel Candidate G-rollback må kun companionens eller den fulde private runtimes egen navngivne, eksakt `READY`/`memoryReady` Candidate G-mode-score projekteres som `FULL_HISTORY` med `scoreSemantics=EXACT_POINT_SCORE`, `scoreBounds.lower=scoreBounds.upper=score`, `span=0`, `historyCoverageHours=48`, tomme reason-koder og `conservativeResetAt=null`/reset false. Dette er en Candidate G-ejet compatibility-projektion, ikke integreret ommærkning eller implicit fallback. Non-READY, bindings-, target-, generation- eller hashmismatch stopper fail-closed. `calibrationEligible=false` består uafhængigt, fordi scoren kommer fra manuel rollback til en pensioneret model; projektionen findes for at bevare gyldige tur-snapshots, ikke for at åbne kalibrering.

## Producenter og forbrugere

Den samme kvalitets- og boundskontrakt skal følge inputkæder og DMI/Copernicus-proveniens gennem alle 210 zoner og 673 kystdele, scoregenerator, state/cache/checkpoint/recovery, kompakte startup-/detaljepayloads og hashes, ranglister, bedste tidspunkt, zonedetaljer, femdøgnsvisning, strand/waders, DA/DE/EN-tekster, lokal og Edge-baseret Spørg RavRadar, evidens-id'er og faste svar, konto/tur/observation, admin, ekspertflader, Markdown-/webhåndbog, central profilkonfiguration, scheduler/workflows, audits, releasegates og offentlig desktop-/mobilbrowser. Ingen forbruger må gætte kvaliteten ud fra `score !== null`; den skal læse den eksplicitte kvalitet, bounds og kalibreringsmarkering.

## Offentlig regressionsevidens 2026-08-30

Det friske offentligt observerede datasæt `rr-20260830091913-210` havde 210 zoner og 673 kystdele, men den fortsat offentlige Candidate G-model havde 0 aktive zoner og 210 `UNAVAILABLE`, fordi den sammenhængende strømhistorik var utilstrækkelig. Det er konkret regressionsevidens for den gamle all-or-nothing-adfærd og begrunder acceptkravet. Det er **ikke** produktionsbevis for state 6: Candidate G er fortsat den eneste offentlige model, den integrerede kandidat er ikke en offentlig shadowmodel, og state-6-cutover kræver fortsat exact-head, frisk fuld produktion/deploy, releasegates og offentlig mobil-/desktopverifikation.

Kontrakttests, offline-replays, ablationer og grænsebeviser kan dokumentere determinisme, fysisk sammenhæng og teknisk forbedring. Uden et repræsentativt fundgrundlag må de ikke omtales som bevis for empirisk bedre fundpræcision.

## Systemisk arkitekturroadmap

P0-hændelserne viste tre strukturelle risici: et monolitisk workflow med mange skjulte afhængigheder, grøn topstatus som kan dække over no-op/skipped produktion, og spredt kobling mellem versioner, dokumentation og tekstfølsomme tests. I den lokale 4.0.319-kandidat er produktionen opdelt i eksplicitte orchestrator/build/deploy-roller, alle 40 direkte readers er migreret, terminalstatus er maskinlæsbar, og releasekontraktmetadata er samlet centralt. Role-aware semantiske tests er grønne; exact-head- og produktionsbevis udestår. Arbejdet blev ikke blandet ind i den afgrænsede 4.0.316-P0-hotfix.

Den historiske pre-recovery-implementering brugte schema `ravradar-production-workflow-outcome-v1` med fem terminaler. 4.0.319's bindende releasekontrakt er `ravradar-production-workflow-outcome-v2`, fordi nested exact-key-resultatet også skal omfatte historical actions og recovery writer/finalizer/gate. Terminalerne er fortsat `NOOP`, `DEFERRED`, `BUILT`, `DEPLOYED` og `FAILED`. `DEPLOYED` kræver Pages eller exact-target finalizer, eksakt offentlig model-/implementation-/210/673-verifikation og afsluttet activation/reseal; fejl, cancellation, ukendt action, uventet skipped gate eller inkonsistent bevis er `FAILED`. Kode, releasegate og måltests er lokalt synkroniseret med v2; exact-head-, produktions- og offentligt slutbevis udestår.

Outcome-artifactet indeholder kun run-/SHA-identitet, kanoniske job-/stepresultater og booleanske beviser samt `privatePayloadIncluded=false`; ingen vejrpayload, koordinater, land-/vandpunkter, rå U/V, modelstate eller credentials må indgå. Grøn-no-op-/skipped-semantikken, workflowrolleopdelingen, de 40 reader-migrationer og den centrale releasekontraktmetadata er lokalt lukket som én samlet arkitekturændring og afventer exact-head-/produktionsbevis. Den lange first-fail-`validate:source`-kæde er fortsat en særskilt P2 efter modelcutover.

## Uændrede grænser

Candidate G-formel, RavScore, DMI/Copernicus, storage, geometri, zoner, land-/vandpunkter og private data ændres ikke af 4.0.316-publiceringsbeslutningen. DEC-0111's forbud mod at genåbne den tilbagetrukne rekonstruktionsoperation består.
