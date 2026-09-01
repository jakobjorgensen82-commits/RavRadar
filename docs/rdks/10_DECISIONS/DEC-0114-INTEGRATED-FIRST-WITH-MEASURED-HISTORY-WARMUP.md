# DEC-0114 – integreret model frigives før den målte historik er fuldt opbygget

- **Status:** Ejerbesluttet og bindende. Den afgrænsede 4.0.319-implementering og dens måltests er lokalt grønne; exact-head, særskilt 118-timers data-preflight, merge, frisk fuld produktion og offentlig verifikation er endnu ikke afsluttet
- **Dato:** 2026-09-01
- **Ejer:** RavRadar
- **Supplerer:** DEC-0102, DEC-0110, DEC-0112 og DEC-0113
- **Erstatter snævert:** DEC-0113 punkt 10's krav om, at en non-READY Candidate G-rollback-companion stopper selve første integrerede release; DEC-0110's eventuelle læsning af 40 timers coherent historisk WAM som krav til `genuine-cold-start`; den åbne Feggesund-nabozoneproxy i DEC-0112 for denne release

## Ejerbeslutning og formål

Den nye integrerede model skal frigives, når dens egne direkte input, operationelle prognoseakse og samlede releasekontrakter er grønne. Den skal ikke vente på, at en fuld historisk WAM-matrix eller Candidate G's 48-timers rollbackhukommelse først er blevet naturligt komplet.

Efter aktivering samler den integrerede drift fortsat reelle, provenanceverificerede vejrdata. Manglende fortid håndteres numerisk og synligt som `HISTORY_INCOMPLETE`; den må ikke fjerne de scorer, som har gyldige direkte input, og den må ikke fjerne den fulde aktuelle/femdøgnsprognose.

Beslutningen lemper ikke kravene til aktuelle eller fremtidige input. Den tillader heller ikke syntetisk historik, rekonstruktion, interpolation, carry-forward eller lån fra nabozoner eller kystdele.

## Bindende operationel first-cutover-kontrakt

1. Første integrerede cutover kræver en eksakt, sammenhængende offentlig akse fra `productionTarget` til `productionTarget+117 h`: 118 UTC-timer for alle 210 zoner, 673 kystdele og begge jagtformer.
2. Hver scoretime kræver sine egne gyldige direkte strøm-, bølge- og jagtbarhedsinput under de eksisterende provenance-, celle-, felt-, type-, target- og registergates. Manglende eller ugyldigt direkte input er fortsat `UNAVAILABLE` for den berørte time og kan ikke maskeres af `HISTORY_INCOMPLETE`.
3. Det operationelle WAM-handoff er fortsat en hård gate: eksakt kausal lagbro til target samt ét coherent, same-run/same-cell-proveniensverificeret WAM-forløb gennem alle 118 operationelle timer. En fejl i run, celle, felt, retning, bytekontrol, register eller target/future-dækning stopper fail-closed.
4. Ved `genuine-cold-start` er `NO_COHERENT_RUN`, `MISSING_HOUR` eller `INTERPOLATION_GAP` i den ældre historiske WAM-matrix ikke i sig selv en releasefejl, når source-attestation og den operationelle gate i punkt 1–3 er grønne. Kun faktisk tilgængelige, målte og provenanceverificerede historiske positioner genafspilles. Ukendte positioner forbliver ukendte.
5. Candidate G-migration er uændret streng. `candidate-g-migration` kræver fortsat den attesterede fælles migrationsstate og det coherent 40-timers historiske WAM-forløb, som DEC-0110 fastlægger. Den migration-only gate må ikke anvendes på `genuine-cold-start`.
6. Ved gyldige direkte input publiceres `HISTORY_INCOMPLETE` over hele 118-timersfladen med lower/upper, span, coverage og reasons. DA/DE/EN viser en tydelig advarsel, som forsvinder automatisk ved senere `FULL_HISTORY`. `calibrationEligible=false` gælder i alle forbrugere, mens den aktuelle scorekvalitet ikke er `FULL_HISTORY`.
7. Den private Copernicus-currentkontrakt adskiller operationel og historisk dækning i schema 3. Status `OPERATIONAL_COMPLETE` kræver eksakt DMI-first-gapdækning for alle 673 dele fra `productionTarget` til `productionTarget+117 h`; den rådgivende measured-only historik fra `productionTarget−48 h` til `productionTarget−1 h` må være ufuldstændig og føres med egne counts, hashes og missingfelter. Den rådgivende mangel kan kun åbne `HISTORY_INCOMPLETE`; den må ikke svække den operationelle gate eller opfinde en strømposition.

## Privat measured-only warmup og strikt rollbackcheckpoint

1. Candidate G-rollback-oraklet fortsætter privat fra sine egne reelle, målte timer under status `BUILDING_MEASURED_ONLY`. Statussen er en privat runtime-/auditklassifikation, ikke en ny model, controllerstatus eller transitionstype.
2. `BUILDING_MEASURED_ONLY` skal dække det eksakte kanoniske 673-delsregister, samme generation/target/binding og må ikke hybridiseres med legacy-state eller tidligere continuation. Den må aldrig betegnes `rollback-companion`, `READY` eller `memoryReady`, projiceres offentligt eller anvendes til manuel rollback.
3. Den private otte-fils runtimebundle skal bevares og publiceres gennem sin beskyttede, privacy-auditerede vej, så både integreret continuation og Candidate G's målte warmup kan fortsætte ved næste produktion.
4. Det eksisterende schema-4-checkpoint forbliver 100 % strengt: status `ravscore-schema6-with-candidate-g-rollback-companion` må kun bygges, gemmes eller publiceres, når den parrede Candidate G-companion er 673/673 `READY`/`memoryReady` og består target-, generation-, bindings-, hash- og privacyparitet.
5. Mens rollback-oraklet er `BUILDING_MEASURED_ONLY`, skal checkpoint-build, checkpoint-save og protected checkpoint-publish være eksplicit `NOT_APPLICABLE_DURING_MEASURED_WARMUP`. Workflowets outcome/releaseaudit skal attestere netop denne tilladte årsag. Et tilfældigt `skipped`, manglende jobresultat eller ghost proof er en fejl.
6. Første `INITIAL_INTEGRATED_CUTOVER` og senere same-binding integrated maintenance må fortsætte uden schema-4-checkpoint, når runtimebundlen, alle integrerede gates og den eksplicitte checkpoint-N/A-attestation er grønne.
7. Manuel `CANDIDATE_G_ROLLBACK`, Candidate-return og Candidate G's collapsed `FULL_HISTORY`-projektion er fortsat utilgængelige, indtil en senere frisk produktion faktisk beviser og forsegler 673/673 `READY`. Non-READY må aldrig ommærkes eller syntetiseres til rollbackberedskab.

## Isoleret 118-timers data-preflight og DMI-terminalgrænse

1. En særskilt branch-valgt `workflow_dispatch` med inputtet `operational_118_preflight` må bevise data- og runtimekæden før release. Den kører DMI, persistente saves, terminalgate, operationel Copernicus-selector/rangechecker, `update:weather` og den integrerede 210/673/118-audit. Den må ikke køre `validate:source`, fuld `npm run validate`, `release:gate`, adminsync, Pages, deploy eller browserkontrol og kan derfor aldrig være release- eller produktionsbevis.
2. Preflighten må uploade præcis én syv-dages GitHub Actions-rapport, `.geometry-v2-work/ravscore-integrated-118h-preflight-safe.json`, efter en fast privacyprojektion. Original audit, conditions, DMI-/Copernicus-cache, koordinater, rå U/V og andre private payloads må ikke uploades.
3. En nyere progressionscache og en ældre datacache må kun kombineres ved eksakt samme samplingregistergeneration. Den nyere cache ejer collection-rotation og progression; kun en særskilt strict-verificeret kompatibel donor må udfylde manglende data. En vejrtime er atomisk: en donor-række kopieres kun som helhed, når primærrækken mangler eller kun indeholder `time`. Felter fra ikke-tomme rækker, modelruns, acquisitions eller kildeattesteringer må aldrig blandes til et kunstigt U/V-par eller bølgesæt.
4. DMI-producenten må fortsat være `continue-on-error` frem til de eksisterende GRIB-, zone- og current-field-saves, så reelt progressivt arbejde ikke mistes. Derefter skal en payloadfri terminalgate kræve producer-success, allowlistet status, `DMI_READY` og et strict current anchor. Copernicus-selector og alle efterfølgende forbrugere må kun køre efter denne gate. Stale-run-, null-, zero-pair-, provenance- og targetgates er uændrede.
5. GitHub-run `33498108421` er fortsat negativ driftsevidens, ikke 118-timersbevis: alle forsøgte DMI-collections blev klassificeret med stale katalogplan, og der blev ikke etableret operationel currentdækning. Den tidligere selectorfejl var sekundær og er nu afskåret af terminalgaten, men upstream-katalogtilstanden skal stadig bevises frisk i den isolerede preflight.

## Recovery, controller og offentlig model

1. Der oprettes ingen ny controllerstatus eller transitionstype. Controller-v4 beholder præcis fire statusser, seks transitionstyper og 30 vedvarende felter.
2. Før og under cutover bevares den eksisterende source/PENDING/target-reconciliation, så en ikke-accepteret eller sikkert aborterbar overgang kan bevare Candidate G som offentlig kilde.
3. Efter en vellykket aktivering er den integrerede model den eneste offentlige model. Candidate G-warmup er privat og er hverken shadowmodel, automatisk fallback eller offentlig alternativ score.
4. Hvis både privat runtimebundle og et gyldigt checkpoint er fraværende, må samme integrerede model udføre sin eksisterende bounded, measured-only state-less cold replay fra de faktisk tilgængelige verificerede timer plus reel target. Den kan dermed fortsat publicere direct-input-baserede `HISTORY_INCOMPLETE`-scorer og 118-timersprognosen.
5. En tilstedeværende ugyldig, inkompatibel, fremtidig eller manipuleret point-aktivering, runtimebundle eller checkpoint må ikke behandles som fraværende. Den stopper fortsat fail-closed. State-less recovery er kun en fraværsvej, aldrig en tamperbypass.
6. Same-model nødvisning efter DEC-0110/0112 er uændret: kun én komplet, atomisk, hashverificeret integreret pakke inden for både 72 timer og sin kortere forecastgyldighed. Den skaber ingen ny score og ændrer ikke historik.
7. Warmupbindingen fører `calibrationEligible=false` gennem controller, activation, abort, rollback, reconciliation, central adminhydrering, adminvisning og schema-3 tur-/observationslagring. Et senere skift til `true` må kun komme fra en forseglet, hashbundet integreret public-runtimeaudit, hvor alle aktuelle mode-scorer er `FULL_HISTORY`, 210/673/privacykontrakten er grøn, og auditten matcher den operative plan eller aktive state. Tid alene, activation eller en gammel serverlabel må aldrig åbne kalibrering.

## Feggesund og datagrænser

Feggesunds tre aktive kystdele skal fortsat kontrolleres direkte over alle 118 timer i den friske integrerede produktion. Den tidligere åbne mulighed for en zonespecifik nabozoneinterpolation i DEC-0112 er pensioneret for denne release. Hvis korrekt direkte DMI-data eller anden særskilt godkendt officiel direkte kilde ikke kan levere et obligatorisk input, følger timen den almindelige `UNAVAILABLE`-/fail-closed-kontrakt. Der må ikke lånes bølger, strøm eller historik fra en nabo.

Beslutningen ændrer ingen zoner, geometri, kystnormaler eller land-/vandpunkter. Private payloads, private koordinater, rå U/V og credentials må ikke læses, vises, logges eller publiceres.

## Release- og evidenskrav

Før modellen må kaldes live, kræves målrettede kontrakttests for den operationelle WAM-adskillelse, warmup/runtime/checkpoint-N/A, audit, activation, state-less recovery, tamperafvisning, kalibreringslås og Feggesunds direkte 3 × 118-dækning. Derefter kræves RDKS-/håndbogs-/changeloglukning, én exact-head-kildegate, sikker merge, frisk fuld produktion med central hydrering, `npm run validate`, `npm run release:gate`, beskyttet runtime, artifact, Pages og atomisk activation samt offentlig desktop-/mobilverifikation af 210/673, current, fem døgn, begge modes, advarsel og automatisk kvalitetsgrænse.

De beskrevne cutover-, warmup-, calibration-, schema-3-current-, preflight- og DMI-terminalkontrakter er lokalt implementeret og måltestet. Det er ikke i sig selv releasebevis: den isolerede 118-timers preflight har endnu ikke leveret et grønt frisk-databevis, og exact-head, merge, frisk fuld produktion, releasegate, artifact, Pages, activation og offentlig browserkontrol er fortsat åbne. Offline-replays og kontrakttests kan dokumentere determinisme, fysisk sammenhæng og teknisk forbedring, men ikke empirisk højere fundpræcision uden et repræsentativt fund-/nul-fundgrundlag.
