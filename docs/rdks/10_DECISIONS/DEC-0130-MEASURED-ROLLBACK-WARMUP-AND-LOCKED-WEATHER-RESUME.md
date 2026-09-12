# DEC-0130 – målt rollback-warmup og låst vejrgenoptagelse

- **Dato:** 2026-09-12
- **Status:** AKTIV; lokal 4.0.348 implementeret og måltestet, exact-head-CI, append-only backendbinding og drift afventer
- **Ejergrundlag:** Ejerens ordre om at få den nye scoremodel online nu, undgå en ny tretimers oneoff og genbruge det allerede låste komplette vejrsæt
- **Præciserer:** DEC-0113, DEC-0114, DEC-0119, DEC-0122 og DEC-0129
- **Bevarer:** én exact-content-kildegate, fulde post-data-gates, target-/cache-/provenancebinding, 79.414-currentclosure, native WAM, Feggesund, privacy, handoff og offentlig verifikation

## Produktionsfund

PR #281-head `c4c70ac7` bestod sourcegaten i run `34681246581` og blev merged som `6868ae04`. Oneoff `34682428800` genbrugte proofet og låste `2026-09-12T08:00:00Z`. DMI leverede 67.686/79.414 direkte currentpar. Den validerede union før Copernicus var 79.221/79.414, altså 193 rester. Efter fallback var exact currentclosure:

- DMI 67.686
- Copernicus 8.668
- regional 944
- Open-Meteo 2.116
- samlet 79.414/79.414, missing 0

WAM-gaten accepterede 79.060 native part/timer i genuine-cold-start. Kørslens providerdata var dermed tilstrækkelige til currentclosure og den native bølgegate. Intet handoff blev dog forseglet, fordi den efterfølgende modelbygning fejlede.

Fejlen var ikke manglende currentdata. Den integrerede model fulgte den godkendte regel og kunne være `HISTORY_INCOMPLETE` under første målte historikopbygning. Det separate Candidate G-rollback-orakel havde samtidig mindre end 48 timers målt transporthukommelse. Adapteren sendte dets private numeriske warmup-resultat gennem en projektor, som med vilje kun accepterede eksakt READY 48 timer. Den kastede derfor `Candidate G rollback score quality requires exact READY 48-hour state` i stedet for at holde rollback-valget utilgængeligt, mens den målte private state voksede.

Runnet loggede kun `DMI one-off pass 1/3`. DEC-0129's multipass er derfor ikke produktionsbevíst af dette run. Det ændrer ikke den positive samlede closure, fordi fallbackkæden lovligt lukkede currentresten, men senere normal vedligeholdelse skal stadig måle DMI-service og rotationsoverskud.

## Beslutning

1. Under en attesteret målt first-cutover-koldstart må Candidate G-rollback beregne og gemme privat numerisk state, selv om transporthukommelsen endnu ikke er READY.
2. Indtil READY skal rollback-oraklets valgbare/offentlige modes være eksplicit utilgængelige med null-score og den præcise lokale warmup-årsag. Den integrerede models ærlige `HISTORY_INCOMPLETE`-score fortsætter uafhængigt.
3. Efter første time må samme regel kun fortsætte, når continuationen kommer fra en valideret tidligere privat runtime med status `BUILDING_MEASURED_ONLY`. Umærket non-READY, legacy-migration, blandet initialisering eller ukendt status stopper fortsat fail-closed.
4. Private numeriske Candidate G-resultater er et internt rollback-orakel under opvarmning; de må ikke blive offentlige eller manuelt valgbare før præcis READY 48 timer.
5. Den isolerede 118-timerspreflight får en eksplicit låst cachetilstand. Den kræver et kanonisk eksakt UTC-target, restaurerer og genvaliderer de gemte caches og må ikke flytte target til aktuel time.
6. I låst cachetilstand springes DMI-vandregister/producer, DMI-plan, Copernicus-plan, credentials og producer over. Open-Meteo må kun køre `--reuse-only`. `update:weather` skal have én central netværksspærre, som stopper ethvert skjult providerkald.
7. Cachetilstanden må aldrig falde automatisk tilbage til acquisition. Manglende, ugyldig, forkert targetbundet eller ufuldstændig cache stopper før handoff og kræver en ny særskilt beslutning.
8. De eksisterende terminalgates genkører stadig exact target/registry, Copernicus source-stage, Open-Meteo residual, WAM, freshness, currentclosure, provenance, 210/673/118-runtime, kapacitet, privacy og handoff. Cachegenbrug er ikke gategenbrug.
9. Fremtidige acquisition-oneoffs bruger ét DMI-pass som workflowstandard. To eller tre pass er et eksplicit diagnostisk valg; de eksisterende højeste grænser og alle fail-closed-krav består.
10. Den allerede anvendte migration `20260909194000_wam_same_run_resolution_binding.sql` er checksum-låst og må ikke omskrives. Ny append-only migration `20260912122607_measured_rollback_warmup_binding.sql` må kun føre de regenererede integrated-, rollback- og continuationforseglinger samt readbackversionen frem; alle state-, række- og valideringsregler skal være identiske med forgængeren.
11. 4.0.348 skal have én ny exact-head PR-sourcegate. Byteidentisk main og backendworkflow må genbruge proofet efter DEC-0127, når GitHub live beviser samme kildeindhold. Ukendt eller modstridende evidens udløser fuld gate. Fuld post-data validate/releasegate og hele cutover-/deploy-/offentlig-verifikationskæden består.

## Bevis og næste kørsel

Modelregressionerne beviser både en målt koldstart med 47/48 timers hukommelse og dens validerede private fortsættelse: privat Candidate G er numerisk, public modes er utilgængelige/null, og den integrerede score er `HISTORY_INCOMPLETE`. Negative tests afviser umarkeret og legacy-omdøbt warmup.

Workflowregressionen beviser skip af DMI/Copernicus, Open-Meteo `--reuse-only`, det eksakte target og at det eneste `fetch` i `update:weather` ligger bag cache-only-værnet. YAML, workflowrækkefølge, DMI-wrapperens 16 tests og begge modelbundles er grønne lokalt.

PR #282's første exact-head-run `34695465328` beviste de lange model-, 210/673-, privacy-, runtime- og migrationsled, men stoppede før sourceproof, fordi releasegatens statiske testinventar ikke var ført frem med den nye migrationsbygger. Opfølgningen gør denne bygger til præcis ét obligatorisk releasegatetrin og binder inventaret til package-aliaset med en måltest. Den røde head er ikke bevis; ny exact-head-CI er påkrævet.

GitHub-run `34564209781` beviser, at den checksum-låste forgænger allerede er anvendt centralt. Efter exact-head-CI og merge anvendes derfor først den nye append-only binding, og dens exact-version/hash-readback skal være grøn. Derefter køres cachetilstanden alene mod `2026-09-12T08:00:00Z`. Hvis de gemte caches igen giver de fulde closures og model/runtime/handoff består, udføres den allerede autoriserede integrerede cutover uden ny providerindsamling. Hvis backendreadback eller cachen ikke kan genvalideres, stopper sekvensen; en ny lang oneoff startes ikke automatisk.

DEC-0122's materielt uændrede first-cutover-undtagelse flyttes under den stående ejerautorisation alene til exact-release 4.0.348. Et ældre handoff må ikke ommærkes eller bruges.
