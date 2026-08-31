# DEC-0110 — RavScore Integrated Coastal Process Model

- **Status:** Aktiv lokal 4.0.318-releasekandidat, numerisk udvidet til state 6 af DEC-0112. Orchestrator/build/deploy, 40 readers, workflow/outcome, public-integrated 210/673 + 78 browsermoduler, profil/cutover/8-consumer-binding og state-6-assistentfixture er grønne; slutreviewet fandt ingen P0/P1. Fuld slut-sourcegate, kandidatens exact-head, merge, frisk produktion, Feggesund 3 × 118 samt offentlig desktop-/mobilverifikation mangler. Candidate G/4.0.316 er fortsat eneste offentlige model
- **Dato:** 2026-08-29
- **Ejer:** RavRadar
- **Erstatter ved sikker cutover:** Candidate G som offentlig RavScore-model
- **Kildekontrakt:** `js/core/ravscore-model-contract.js`

## Bindende operationelt tillæg 2026-08-31

Controller `ravscore-operational-model-activation-v4` forbliver et exact-key-dokument med præcis 30 felter, fire statusser og seks transitionstyper. Der indføres ingen ny status eller transitionstype til head-move. En aktiv H0-Candidate kan føres til checkoutets H1-Candidate gennem action `candidate-historical-maintenance` og `historical-refresh-begin/complete/abort`; en aktiv H0-integrated kan føres til H1-integrated gennem `integrated-historical-maintenance` og `integrated-historical-maintenance-begin/complete/abort`. Begge genbruger deres eksisterende transitionstype og kræver en immutable plan. Direct historisk Candidate H0→integrated H1 forbliver en `INITIAL_INTEGRATED_CUTOVER`/`INTEGRATED_RETURN` med immutable `IntegratedReturnPlan`; den må ikke fortolkes som Candidate-historical refresh.

Historical begin kræver én atomisk central snapshot med exact ACTIVE controller og schema-3-profil, der matcher samme fulde 11-felts H0-binding. `bindingCurrent` må kun eksponere det privacy-sikre booleanresultat. Candidate-målprofilen og dens digest ligger i Candidate-planen, ikke som to nye controllerfelter. Begin bevarer exact H0 source/profil aktiv og skriver PENDING. Complete kræver exact H1 Pages-verifikation og skifter controller/profil i ét CAS. Abort kræver terminalt sourcebevis og gendanner exact H0 source/profil/deployment. Missing/tampered plan, profile/binding/manifest/closure-mismatch, stale CAS og tredje hash stopper fail-closed. Ordinary Candidate-/integrated-maintenance kræver fortsat exact current binding og er identitetsneutral.

En synlig source er ikke i sig selv abortbevis. Kun `FAILED_BEFORE_PAGES_ACCEPTANCE`/ikke-accepteret Pages-anmodning må vælge `SAFE_SOURCE_ABORT`. En tvetydig Pages-start med source stadig synlig kræver `EXACT_TARGET_REDEPLOY` af de oprindelige forseglede bytes og en separat non-Pages-finalizer. Artifact-id/-navn/-digest/-størrelse, rå ZIP-hash, sikker arkivstruktur, targetbinding/-contract/-bundle/-public closure samt repo/run/attempt/head/ref og udløb verificeres. 2–12 ordnede unikke observationer med stabil targethale kan give `TARGET_RECONCILE`; mixed/reversed/third hash eller ustabilitet er `FAIL_CLOSED`. Den eksakte `pages-recovery-*`-deployment er gyldig næste source-lineage.

Produktions-outcome for 4.0.318 er `ravradar-production-workflow-outcome-v2`. Den payloadfri nested exact-key-kontrakt omfatter historical actions og recovery writer/finalizer/gate; kode og releasegate skal matche før exact-head.

## Beslutning

RavRadars næste RavScore bygges og frigives som én samlet kystprocesmodel. Modellen genbruger de Candidate G-dele, der fortsat er fagligt og teknisk forsvarlige, men samler dem under én ny modelidentitet, statekontrakt, forklaringskontrakt, migration og rollback.

Den integrerede score bevarer vægtningen 20/50/30:

```text
rawScore =
  0,20 × huntability
  + 0,50 × deliveryPotential
  + 0,30 × mobilisationPotential
```

Formlen er et additivt evidensindeks, ikke en ravmassebalance. `mobilisationPotential` er en betinget mulighed for mobilisering, **hvis materiale er tilgængeligt**; den er ikke et observeret eller estimeret lokalt lager. En klar, verificeret `transportPotential = 0` er ikke missing strømstate og er heller ikke bevis for, at lokalt eller sekundært lager er nul. Manglende direkte input i scoretimen gør scoren utilgængelig; manglende ældre historik omsluttes derimod numerisk efter DEC-0112 og mærkes `HISTORY_INCOMPLETE`. Ved en klar nulværdi er det teoretiske loft `20 + 30 = 50`, så scoren kan være dårlig eller højst svag, aldrig middel eller god; waders-cappen kan sænke den yderligere.

Den obligatoriske syntetiske lagerkoblingsablation sammenligner aktiv additivitet med fuld kobling `M × T/100`, kvadratrodskobling `M × sqrt(T/100)`, en eksplicit 50 %-lagerprior `M × (0,5 + 0,5 × T/100)` og minimumsbottleneck `min(M,T)`. Ingen variant er fundkalibreret. Fuld-, kvadratrods- og minimumskoblingen gør strømtilførslen til proxy eller øvre grænse for alt uobserveret mobiliserbart lager; 50 %-varianten opfinder en konkret lagerandel. Aktiv additivitet bevares derfor som den mindst ekstra lagerstrukturerende af de afprøvede skalarregler. Den er ikke antagelsesfri: separabilitet, kompensation og 20/50/30 er fortsat transparente, ukalibrerede indekspriorer. Beslutningen må ikke bruges til at påstå lager, ravmasse, fundchance eller empirisk optimalitet.

`transportPotential` er den verificerede aktuelle strømtilstand. Den sidste nærkystlevering er fortsat fysisk uafklaret med de data RavRadar faktisk har. Modellen bruger derfor en begrænset, ensrettet bølgeretningsprior, som kun kan dæmpe allerede eksisterende tilførsel:

```text
W = kausal energivægtet EWMA af bølgeaktivitet med fire timers halveringstid og en ældre hale
approach = clamp((normalAlignment - (-0,25)) / (1 - (-0,25)), 0, 1)
factor = clamp(1 - 0,15 × W × (1 - approach), 0,85, 1)
delivery = transportPotential × factor
```

Faktoren er ikke et fysisk estimat af, hvor stor en andel der når stranden. DMI WAM-retning er en **FROM**-retning og roteres præcis én gang `+180°` til bevægelsesretning, før den projiceres mod den eksisterende, uændrede kystnormal. `W`, normalmoment og tangentmoment udglattes kausalt over fire timer. Prioren `-0,25` er en transparent, konservativ og ikke fundkalibreret neutralgrænse. Faktoren ligger altid mellem `0,85` og `1`, kan aldrig skabe eller øge tilførsel og anvendes præcis én gang i 50 %-komponenten. Maksimal påvirkning af den rå totalscore før slutafrunding er derfor `0,50 × 15 = 7,5` point. Den viste heltalsscore kan på grund af slutafrunding ændres 8 point.

Den tidligere arbejdshypotese om en fast `5,25 %`-korrektion er forkastet. Den aktive 0–15 %-dæmpning afhænger af den faktiske kausale, energivægtede bølgeaktivitet og retning med fire timers halveringstid og en ældre hale, men er fortsat en begrænset fysisk prior — ikke et målt ravinterval eller en empirisk landingsandel. `physicalDeliveryResolved=false`, et numerisk fysisk usikkerhedsinterval er `null`, og modellen må ikke kaldes empirisk mere fundpræcis.

## Autoritative kontrakt-id'er og runtimebinding

Følgende værdier skal hentes fra kodekontrakten og må ikke kopieres ind i parallelle offentlige modeller:

| Binding | Aktiv værdi |
|---|---|
| Model-id | `RRS-COASTAL-PROCESS-INTEGRATED-1.1.0` |
| Stateversion | `6.0.0` |
| Variant-id | `COASTAL-SUPPLY-MOBILISATION-BOUNDED-WAVE-APPROACH-HUNTABILITY-2` |
| Profil-id | `cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-historybounds12d-lastmileewma4-tail40-atten15-v5` |
| Komponentskema | `ravscore-components-huntability-delivery-mobilisation-bounds-v5` |
| Forklaringsskema | `ravscore-explanation-integrated-bounds-v5` |
| Rangering | `direction-broad-19-history-tie-v2` |
| Bedste tidspunkt | `score-history-water-tie-earliest-v3` |
| Præsentation | `score-bands-35-55-75-exceptional90-v1` |
| Candidate G-migration | `candidate-g-schema2-signed-current-reweight-bounded40h-wave-approach-to-integrated-schema6-v5` |
| Eksakt aldrig-offentlig state-5-migration | `integrated-schema5-ready-point-to-schema6-history-bounds-v1` |
| Rollback | `integrated-schema6-to-candidate-g-schema2-v3` |
| Parameterkontrakt | `modelContractSha256=778db7aa3946f925607a8304daa42ed17dd30294e4a51bf6d895d7293e84c4e7` |
| Transitiv implementeringsbundle | `modelBundleSha256=978415fd2b0a739b80b71c78134a79101113481817212811644b24262b6ddbd9`; 43 kanonisk normaliserede transitive implementeringsfiler; 8 deklarerede forbrugere |

Den serialiserede runtimebinding består præcist af model-, state-, variant-, profil-, komponent-, forklarings-, rangerings-, best-time- og præsentations-id samt de to adskilte hashes: 11 felter i alt. `modelContractSha256` binder den kanoniske parameterkontrakt. `modelBundleSha256` binder den transitive implementering, så en ændring i en indlæst evaluator, adapter, policy eller anden kanonisk modelafhængighed ikke kan gemme sig bag uændret parameter-JSON. Migration og rollback er særskilte overgangskontrakter. Hver continuation-state, hvert checkpoint og den centrale profilselection skal bære og matche alle 11 felter; det samme gælder payload, cache, forklaring og release. Et model-id eller én hash alene er aldrig nok. Ovenstående state-6-værdier er reproduceret af bundlegeneratoren over præcis 43 filer og otte deklarerede forbrugere på den lokale 4.0.318-kandidat; de er ikke i sig selv exact-head- eller produktionsbevis. DEC-0112 er autoritativ for den numeriske `HISTORY_INCOMPLETE`-kontrakt og for 5→6-overgangen.

Candidate G-kilden er låst til den produktionsverificerede 4.0.316-baseline: head `49dd4cb454656bdf629e5df760176705e38d2cb0`, tree `975c3e9432cea7780564ffd56766bc1f0a0a9763`, central switch `RAVSCORE-PROFILE-SWITCH-4.0.316`, source contract `2f888a16190e9e43e44536536029f1b0021a1b850195524aa2312664ca74810b` og kanonisk 53-filers source closure `a366b4a64fc3ccc8f1b94f3fed24b3ce03ea23d906396bc8bea183338c5d2606`. PR-, build- og deploygaten skal hente og verificere netop denne pinnede source head; en lokal eller shallow checkout uden den eksakte kilde er ikke bevis.

## Årsagskæde og begrebsgrænser

Modellen beskriver seks adskilte led:

1. muligt lager eller tilførsel,
2. mobilisering fra hvile,
3. transport mod den relevante kystzone,
4. sidste nærkystlevering, aflejring og retention,
5. jagtbarhed,
6. usikkerhed og datatilgængelighed.

Modellen må ikke slå følgende mekanismer sammen:

- bølgeorbitaler og mobiliseringsenergi,
- verificeret modelgridstrøm ved RavRadars havpunkt,
- surfzonens undertow,
- feeder- og langskyststrøm,
- ripstrømme,
- tidevands- eller vinddreven ændring af hele vandsøjlen,
- faldende vandstands blotlægning og mulig retention bag revler.

RavRadar har ikke lokal batymetri eller en bølgeopløst surfzonemodel. Retention bag revler og mulig udadgående transport ved faldende vandstand er fysisk plausible scenarier, men de kan ikke omsættes til en generel lokal scorekorrektion ud fra de nuværende input. Vandstand bruges derfor som kontekst og til valg mellem scorelige tidspunkter, ikke som skjult transport- eller last-mile-bonus.

## Bevarede og forbedrede delkontrakter

### Aktuel strømtilstand

- Indadgående bidrag bruger grænsen `0,03 m/s` og maksimal styrke ved `0,15 m/s`.
- Indadgående ændring er højst `+10` point pr. effektiv time; udadgående ændring er højst `-8` point pr. effektiv time. Et native tre-timers hold tæller ikke som tre nye bevægelsestimer.
- Transportpotentialet kan nå 0 efter mindst 13 timers stærk, sammenhængende udadgående påvirkning; Candidate G's særskilte gate, der nulstillede hele RavScore, bevares ikke.
- State-målet bruger 24 timers fuld kredit og et hævet cosinusforløb til 48 timer.
- Evidensgabet må højst være 3 timer. Manglende eller for tæt, ikke-justeret evidens må ikke udfyldes ved opfundet historik. Hvis scoretimens direkte input er gyldigt, omslutter state 6 de ukendte historiske intervaller med stærkest tilladt ud- og indstrømning under den samme 48-timerskerne; direkte inputmangel er fortsat `UNAVAILABLE`.
- Højst 49 evidenspunkter opbevares i vinduet, inklusive et eventuelt reelt præ-grænse-bropunkt. En tættere række, der ikke kan bevares uden at bryde kontrakten, fejler lukket.
- Ved et ægte hold fortsætter state uden opfundet bevægelse.
- Et provenanceverificeret DMI/Copernicus-U/V-par er den eneste autoritative numeriske currentkilde. Den private state bruger den præcise kystnormalprojektion fra parret før afrunding. Kun offentlig visningsfart afrundes til 0,01 m/s; movement-toward-retning afledes fra samme par, og 360° normaliseres til 0°. Parallel cached fart/retning kan ikke overstyre parret, og rå U/V forlader ikke den private producent/envejshashkontrol.
- Den aktive spatiale strømprøve forbliver bundet til det eksisterende centralt godkendte havpunkt, den nærmeste gyldige fælles U/V-gridcelle inden for afstandspolitikken og den uændrede land→vand-kystnormal. Modelsporet flytter ingen land-/vandpunkter og vælger ikke et nyt afstandsbånd for at ændre signalet.
- Den eksisterende private, roterende 0/5/15-km-flerlagscache bevares i højst 168 timer til datasikre offline lag-, afstands-, tidslags-, ablations- og følsomhedsanalyser med `scoreEffect=NONE`. 5/15-km- og ekstra lagprøver bliver ikke et aktivt scoreled i denne generation: der mangler eksakt landsdækkende 673 × 166-dækning og en valideret kausal rum-/tidskobling til den lokale kystdel, og et ekstra led kan dobbelt-tælle currentforcing. Ingen ny fetch eller warmup er derfor releasekrav.
- `productionReferenceAt` låser en eksakt 166-timers privat inputmatrix fra target−48 h til target+117 h. Target gennem +117 h skal blive præcis 118 sammenhængende offentlige UTC-timer for alle 210/673 og begge modes. DMI er førstevalg på hvert del/time-par; Copernicus må kun udfylde den eksakte resterende gapmatrix uden hold, interpolation eller ændring af referencepunktet.
- DMI-native og afledt provenance skal binde collection/component, run/lead, item/asset/acquisition, grid/celle/afstand og eksakt del/forælder/samplingkontekst. Copernicus-supplementet skal komme fra en privat schema-2 `COMPLETE` range-collection med target-, DMI-input-, required-pair-, recordref- og acquisitionbinding. Current/future Copernicus-acquisition må højst være fire timer fra `productionReferenceAt`; kompatibel forseglet historik kan genbruges inden for retentionvinduet.
- Fysiske input og afledt state skal være endelige JSON-tal. Numeriske strenge, booleans, arrays og objekter må ikke coerces til evidens eller score i model, migration, recovery, privat runtime eller offentlig projektion.

### Bølgemobilisering

- Mobiliseringsenergi repræsenteres ved `Hs² × T`.
- 4 timer er opbygningshalveringstiden; 48 timer er aftrapningshalveringstiden.
- Sammenhængende intervaller må højst have 1 times afstand; overordnet evidensgab må højst være 3 timer.
- Manglende bølgehøjde eller periode gør input utilgængeligt. Kold start må ikke opfinde varighed eller opbygning.
- Gyldig tidligere afledt state kan holdes ved manglende nyt input, men der gives ingen ny opbygningskredit.
- Bølgehøjde har to adskilte, synlige roller: `Hs² × T` bygger den tidslige mobilisering af allerede tilgængeligt rav i 30 %-komponenten, mens den aktuelle bølgehøjde indgår i søgeforhold som metode-/sigtbarhedsbegrænsning i 20 %-komponenten. Jagtbarhedsvejen giver ingen ny mobiliserings-, transport- eller last-mile-kredit; den kan kun beskrive, hvor effektivt der kan søges. Det er derfor to forskellige kausale udfald af samme vejrinput, ikke det samme procesbidrag lagt til to gange.

### Jagtbarhed

- Strand- og wadersvisning er projektioner af samme model og samme state, ikke separate modeller.
- Jagtbarhed kræver gyldige, endelige, ikke-negative vind- og bølgeinput.
- Waders-score følger den eksisterende søgeforholds-/metodecap; den er ikke en sikkerhedsvurdering.
- Bølgeleddet i jagtbarhed er øjeblikkelig metodeeffektivitet og må ikke læse eller forstærke mobiliseringstilstanden.

### Vandstand

- Vandstand er kontekst og indgår i `score-history-water-tie-earliest-v3`. Numerisk score vælges først; `FULL_HISTORY` vinder kun ved eksakt scorelighed, hvorefter den eksisterende vand-/trend-/tidspolitik anvendes.
- Stigende, stabil eller faldende vandstand må ikke i sig selv ændre RavScore.
- Vandstandstrend må ikke omsættes til en ekstra “hele vandsøjlen”-strøm eller interpoleres med den verificerede modelgridstrøm. [DMI beskriver DKSS](https://www.dmi.dk/friedata/dokumentation/data/forecast-data-storm-surge-model-dkss) som en tredimensional HBM-cirkulationsmodel med atmosfærisk forcing og tidevands-sealevel ved åbne rande, der selv leverer current-U/V. [Copernicus Baltic NEMO](https://data.marine.copernicus.eu/product/BALTICSEA_ANALYSISFORECAST_PHY_003_006/description) leverer tilsvarende fysiske hastighedsfelter, herunder særskilte øjeblikkelige og detidede produkter. Modelstrømmen er et samlet modeludfald, ikke et bevis for hver lokal proces; en ekstra regel afledt af vandstand kan korrelere med eller dobbeltregne det eksisterende signal og opløser stadig ikke surfzonens fortegn.
- Tekster skal skelne mellem mulig nettostrøm i vandsøjlen, blotlægning, retention og uopløst lokal surfzoneadfærd.

## Last mile: begrænset bølge-approach med bevaret strukturel usikkerhed

Den aktive policy er `last-mile-wave-approach-ewma4-attenuation15-v1`:

- DMI WAMs middelbølgeretning fortolkes som **FROM** og roteres præcis én gang `+180°` til bølgernes bevægelsesretning.
- Retningen projiceres mod RavRadars eksisterende `onshoreDirectionDeg`. Kystnormal, geometri og land-/vandpunkter flyttes ikke.
- Den eksisterende bølgeenergikurve leverer aktivitetsvægten `W` på 0–1. Aktivitet samt energi-vægtede normal- og tangentmomenter udglattes kausalt med fire timers halveringstid.
- Retningskoherens påvirker kun forklaring og usikkerhed; den giver ingen ekstra point.
- `approach=0` ved eller under den transparente, konservative neutralprior `normalAlignment=-0,25` og vokser lineært til 1 ved fuldt landværts alignment.
- `factor=clamp(1-0,15×W×(1-approach),0,85,1)` og `deliveryPotential=transportPotential×factor` anvendes præcis én gang.
- Faktoren kan kun dæmpe eksisterende transportpotentiale. Bølger kan aldrig skabe tilførsel, øge tilførsel eller give last-mile-kredit ved `transportPotential=0`.
- Maksimal ændring i den rå totalscore før slutafrunding er 7,5 point, fordi faktoren højst kan fjerne 15 % af den rå 50-point-leveringskomponent. Den viste heltalsscore kan derfor ændres 8 point.
- Kun `waveHeightM=0` er eksakt roligt bølgefelt og neutralt; `wavePeriodS` skal stadig være finit og ikke-negativ. `waveHeightM>0` med `wavePeriodS=0` er `INVALID` og fejler lukket. Manglende retning under aktiv bølgeenergi fejler ligeledes lukket; den er ikke længere en score-neutral missinggenvej.
- `physicalDeliveryResolved=false`, strukturel usikkerhed er altid sand, og et numerisk fysisk usikkerhedsinterval er fortsat `null`.

Prioren forbedrer den kausale brug af et allerede hentet, retningsbestemt bølgefelt, men den opløser ikke danske revler, ripkanaler, undertow eller ravets partikelstate. Den må derfor ikke beskrives som en fysisk landingsandel eller som empirisk fundkalibreret. En ravspecifik numerisk leveringsmodel kræver fortsat lokal morfologi, bølgeopløst cirkulation og repræsentativ felt-/fundvalidering.

Primærkilderne afgrænser prioren uden at levere en dansk ravfaktor. [DMI WAM](https://www.dmi.dk/friedata/dokumentation/data/forecast-data-wave-model-wam) leverer timevis bølgehøjde, periode og middelretning, men har ikke bølge-strøm-kobling; [parameterlisten](https://www.dmi.dk/friedata/dokumentation/data/forecast-data-wave-model-wam-edr-api-parameter-list) er autoriteten for retningsfeltet. [Chubarenko og Stepanova (2017), DOI 10.1016/j.envpol.2017.01.085](https://doi.org/10.1016/j.envpol.2017.01.085) beskriver baltisk rav omkring 1,05–1,10 g/cm³ som normalt synkende i vand og opstiller fælles vind-, bølge-, strøm- og roll-processer samt gentagen strand↔undersøisk-skråning-migration som ravspecifik hypotese; systematisk feltkalibrering mangler. [Ocean Science 16 (2020), DOI 10.5194/os-16-1491-2020](https://doi.org/10.5194/os-16-1491-2020) behandler rav som negativt flydende bed-stock med Shields-lignende mobilisering, ikke som overfladedrifter. [Aagaard, Black og Greenwood (2002), DOI 10.1016/S0025-3227(02)00193-7](https://doi.org/10.1016/S0025-3227(02)00193-7) viser, at nettotransport over revler kan være land- eller søværts alt efter blandt andet undertow, bølgeskævhed, orbitalhastighed, relativ dybde og bundhældning. [Jalón-Rojas m.fl. (2025), DOI 10.5194/gmd-18-319-2025](https://doi.org/10.5194/gmd-18-319-2025) viser i en bølgeopløst 2DV-partikelmodel, at partiklens vertikale position og densitet afgør eksponeringen for landværts Stokes-drift og søværts undertow. [Rainville m.fl. (2026), DOI 10.1029/2025JC022422](https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2025JC022422) observerede stærk landværts surfing/stranding for positivt flydende overfladedriftere og svag undertow ved overfladen. Netop fordi størstedelen af rav er negativt flydende og kan have bundkontakt, er studiet kun procesanalogi, aldrig ravkalibrering eller universel strandingsandel. [Lofty m.fl. (2023), DOI 10.1016/j.watres.2023.120329](https://doi.org/10.1016/j.watres.2023.120329) målte rav omkring 1 041 kg/m³ i deres 5 mm-prøver og brugte rav som lavdensitets naturlig partikel i bedload-/saltationsforsøg. Lofty-studiet er et åbent-kanal-laboratorieforsøg, ikke en dansk surfzonevalidering. Samlet viser kilderne, hvorfor gridstrøm, vandstand eller bølger alene ikke kan bestemme sidste-mile-fortegnet uden lokal morfologi, bølgeopløsning og partikelstate.

[Danmarks Dybdemodel 2024/v2](https://gst.dk/ansvarsomraader/soekort-og-marine-data/soeopmaaling-og-dybdedata/danmarks-dybdemodel) har et 50 × 50 m middel-dybdegrid med dybde-, kilde- og opmålingsårslag, prioriterer moderne søopmåling og tilføjede lavtvandsdata fra satellit/lidar i 2024. Den må derfor ikke beskrives som uden lavtvandsdata. Fravalget som aktivt scoreinput skyldes i stedet, at utilstrækkeligt dækkede celler interpoleres, kystlinjen er generaliseret 1:100.000, og det statiske grid hverken opløser dynamiske revler, aktuelle ripkanaler eller en bølgeopløst surfzone. DDM kan være senere statisk morfologikontekst, men aktiveres ikke i state-6-kandidaten. Eksisterende hav-/landpunkter og deres kystnormaler er uændrede; et dybdedatasæt må aldrig bruges som anledning til at flytte dem i dette modelspor.

## Missing-, recovery- og migrationskontrakt

- Obligatoriske input fejler lukket. Ugyldige tal, bølger eller evidenskæder må ikke blive til normal score.
- Den integrerede model kan migrere eksisterende Candidate G schema-2-state gennem `candidate-g-schema2-signed-current-reweight-bounded40h-wave-approach-to-integrated-schema6-v5`. Den dybt validerede, signerede og allerede afledte kystnormale Candidate G-evidens genvægtes i den integrerede currentkernel. Migrationen læser eller kopierer ikke rå U/V og påstår ikke numerisk eller byte-identisk lighed med en frisk rå-current-genberegning.
- Wave-approach-state findes ikke i schema 2 og genopbygges fra 40 private præ-target-timer. De 40 timer afgrænser den firetimers EWMA-hale til højst `1/1024`; den konservative maksimale rå RavScore-fejl fra den udeladte hale er højst `0,01171875` point før slutafrunding. Dette er en deterministisk trunkeringsgrænse, ikke en empirisk præcisionspåstand.
- Alle præcis 673 Candidate G-states skal validere mod det uændrede kystdelsregister og give ét fælles kanonisk bootstrap-target. DMI-acquisition skal for hver anvendt WAM-collection finde ét `single-coherent-run`, og hver højde-/periode-/retningsrække skal have komplet same-cell native provenance. Kontrolleret tidsinterpolation er kun tilladt mellem native endepunkter højst fire timer fra hinanden inden for samme run, collection, griddefinition og celle; cross-run-, cross-cell- og tvetydig retningsinterpolation fejler lukket. Hvis state-targets er blandede, eller et sammenhængende run ikke kan skaffes og valideres, sker intet modelskift, og Candidate G forbliver den offentlige model.
- Migrationens historiske 40-timers bootstrap-run er adskilt fra det operationelle WAM-handoff. [DMI's STAC-dokumentation](https://www.dmi.dk/friedata/dokumentation/forecast-data-stac-api) angiver `modelRun`-filter, kun de seneste 48 timers modelruns, WAM-horisont til `+132 h` og kontrol af download mod `Content-Length`; [availability-oversigten](https://www.dmi.dk/friedata/dokumentation/data/forecast-data-availability) angiver typisk komplet WAM NSB omkring `+2:45` og WAM DW omkring `+3:00`, mens [WAM-produktbeskrivelsen](https://www.dmi.dk/friedata/dokumentation/data/forecast-data-wave-model-wam) fastlægger fire runs i døgnet, 5½ døgn og timeopløsning. Produktionskoden bruger derfor `+132 h` som lead-cap og kræver pr. collection et særskilt kausalt operationelt run med den eksakte 1–4-timers lagbro og faktisk dækning af `productionTarget..productionTarget+117 h`. De typiske publiceringstider er planlægningskontekst, ikke en lempelse af provenance- eller dækningsgaten. Mangler runnet, lagbroen, bytekontrollen eller horisonten, sker intet cutover, og Candidate G forbliver offentlig.
- Recovery vælger eksklusivt i denne prioritet: eksakt point-aktivering, gyldig integreret continuation fra den private runtime, gyldigt integreret checkpoint og derefter dybt valideret Candidate G schema-2-state. En tilstedeværende, men ugyldig point-aktivering stopper straks. En ugyldig ordinær kilde må ikke skygge for en gyldig kilde med lavere prioritet; hvis ingen tilstedeværende kilde validerer, fejler recovery lukket.
- Første cutover må importere Candidate G-state præcis én gang og kun, hvis hverken gyldig point-aktivering, gyldig integreret privat continuation eller gyldigt integreret checkpoint findes. Kun når ingen statekilde er til stede, må den afgrænsede private 48-timers koldstartsbro anvendes.
- Den historiske schema-5-kandidat blev aldrig offentlig. Kun et eksakt `READY`-punkt med den historiske fulde binding og de to fastlåste historiske hashes må migreres én gang gennem `integrated-schema5-ready-point-to-schema6-history-bounds-v1`; nedre og øvre bane starter da kollapset på det dokumenterede punkt. Schema 5 er ikke aktiv cache eller recoverykilde efter migrationen.
- Rollback bruger `integrated-schema6-to-candidate-g-schema2-v3` og den bevarede rollback-state; rollback må ikke blandes ind i den offentlige integrerede score.
- Den varme Candidate G-projektion findes kun som `ravScoreCandidateGRollback` i den beskyttede fulde runtimebundle. Den må aldrig kopieres til repository, Pages, en offentlig shadowmodel eller en automatisk fallback.
- Kompakt continuation-state, Actions-cache og det beskyttede `admin_documents`-checkpoint `ravscore-continuation-checkpoint` er schema 6 og kan kun fortsætte den eksakte state-6-binding.
- Et eksisterende ugyldigt, inkompatibelt eller fremtidigt checkpoint skal fejle lukket og må ikke maskeres som en kold start. Et strukturelt gyldigt same-model-checkpoint, som er ældre end 72 timer, er derimod eksplicit udløbet: schema-6-continuationen installeres ikke og tæller som fraværende for den afgrænsede cold start, mens den særskilt verificerede READY Candidate G-companion kan bevares til manuel helrollback. Udløbet state må aldrig ommærkes som frisk eller gendannes som continuation.
- Checkpointet er højst 72 timer gammelt, er bundet til nøjagtig model/state/hash og indeholder kun kompakt afledt fortsættelsesstate — ikke rå vejrdata, scorer, koordinater eller rå U/V.
- Ved same-reference publish/restore sammenlignes både `generationSha256` og hele den allerede validerede `candidateGRollbackCompanion`, før noget muteres; enhver divergens stopper fail-closed og bevarer den eksisterende state uændret.

Dermed kan modellen starte på allerede indsamlet og valideret privat vejrhistorik. En state-løs kystdel bruger `bounded-private-48h-history-cold-replay-v3`, genafspiller de 0–48 verificerede private timepositioner, der faktisk findes, og derefter den virkelige targettime. Lineage bærer `expectedCausalPositionCount=48`, faktisk `completeCausalPositionCount`, `boundedUnknownPositionCount` og `historyTransition`; 48/48 er `VERIFIED_CAUSAL_HISTORY_WINDOW`, mens et kortere eller gappet forløb er `UNKNOWN_HISTORY_INTERVAL`. Alle disse cold-replays er `HISTORY_INCOMPLETE`, også ved 48 timer: currentvinduet er da komplet og 40-timers last-mile-sporet kan være konservativt lukket, men wave-mobilisationshalen lukkes først efter 288 timers kausal fortsættelse. `FULL_HISTORY` opnås fra denne conservative tail reset eller fra en særskilt attestert migration/continuation. WAM-timepositioner må kun dannes ved de samme kontrollerede same-run/same-cell-proveniensregler; offentlig, syntetisk eller uattesteret udfyldning er forbudt. Manglende direkte targetinput stopper stadig den berørte score. Candidate G-rollback beregnes for samme targettid uden dobbelt credit.

## Privat og offentlig runtime

Fuld produktionsruntime forbliver privat. Den private bundlekontrakt omfatter nøjagtigt otte godkendte driftsfiler og kan bære den varme, afledte Candidate G-rollbackprojektion under `ravScoreCandidateGRollback`. Ved checkpoint-only recovery bruges atomisk checkpointschema 4/status `ravscore-schema6-with-candidate-g-rollback-companion`/cache `ravscore-continuation-schema6-v2` med 673 schema-6-states og en parret READY Candidate G-companion schema 1/status `candidate-g-rollback-ready-companion` fra samme generation med eksakt target/673/binding/hash-paritet. Den må aldrig rekonstrueres fra `HISTORY_INCOMPLETE`. Serializer-, protected-storage-, dual-state-, tamper- og privacy-måltests er grønne. Den daværende 4.0.317-proportionalmatrix var grøn; 4.0.318's historical/recovery/outcome/P2-delta kræver ny slutmatrix, exact-head og produktion. Bundle, checkpoint og companion er aldrig Pages-input og kontrolleres med modelbindinger, canonical hashes, path-/symlink-værn og atomisk installation i den private Supabase Storage-kæde.

Pages får kun den offentlige manifest-schema-4-projektion og disse fire livefiler; manifestets schema 4 er en offentlig payloadkontrakt og må ikke forveksles med den integrerede continuation-state `6.0.0`:

- `data/live/manifest.json`,
- `data/live/public-conditions.json`,
- `data/live/public-condition-details.json`,
- `data/live/coastal-parts-v2.json`.

Offentlig runtime må ikke kunne hente fulde conditions, private caches, pilot history, checkpoint eller rå U/V. Manifestet binder dataset, reference, model, filhashes, body-hashes og byteantal. Den rekursive privacy-audit er en releasegate.

## Samme-model nøddrift og tillidsgrænse

Den integrerede model har en atomisk nødtilstand inden for **samme** 11-felts modelbinding. Hvis en ny primary ikke er komplet, kan browseren bruge den seneste komplette, hashverificerede 210/673-pakke og vælge den virkelige time på pakkens eksisterende 118-timers akse. Pakken må højst være 72 timer gammel og må aldrig bruges efter sin egen kortere forecastudløbsgrænse. Ved udløb lukker runtime fail-closed.

Nøddrift er ikke en anden offentlig model, interpolation eller scoregenberegning. Startup, detaljer, kystdele og manifest vælges samlet; krydsmodel-, cross-state-, ukendt, rekonstrueret, tampered eller ufuldstændig state afvises. DA/DE/EN viser en tydelig aktualitetsadvarsel, og frisk komplet primary overtager automatisk.

`VERIFIED_ONLY` er den eneste normale målte trustklasse, som kan være kalibreringsegnet. `RECONSTRUCTED_DERIVED_NOT_MEASURED`, `public-emergency-last-complete`, ældre uattesteret trust og enhver ukendt/tampered status er altid `calibration_eligible=false`; de kan bevares som brugerhistorik, men ikke indgå i koefficientlæring eller som hårdt observeret udtransportbevis. Den ejerautoriserede engangsrekonstruktion i DEC-0109 blev senere opgivet før apply og offentliggørelse. Dens snævre incident-, provenance-, rollback-, cleanup- og regressionkontrakt bevares som historisk sikkerhedsgrænse, men den må ikke eksekveres, generaliseres eller blive fallback for DEC-0110.

## En offentlig model

Candidate G forbliver eneste offentlige model indtil den samlede cutover. Den integrerede model må ikke eksponeres som offentlig shadowmodel eller som løse offentlige fragmenter.

Efter cutover må den tidligere adaptive model ikke være offentlig scoreejer, runtime eller alternativ modelidentitet. Historisk eller intern regressionskode kan fortsat eksistere, men må ikke eje den offentlige RavScore, modelversion, forklaring eller fundchance. Mens den integrerede model er aktiv, er Candidate G kun et privat migration-/offline-/rollback-orakel. Kun en særskilt, manuel, fuldt verificeret hel rollback kan igen gøre Candidate G til den ene offentlige model; den er aldrig en samtidig eller automatisk offentlig fallback.

## Atomisk backend-, Edge- og Pages-cutover

Supabase, Edge og GitHub Pages kan ikke ændres i én fysisk databasetransaktion. RavRadar skal derfor gøre modelskiftet **observationsatomisk** med en fast, testbar rækkefølge:

1. `20260829010000_ravscore_operational_documents_no_history.sql` etablerer de operationelle private runtime-dokumenter og den private bucket. Den undlader fremtidig kopiering af de allowlistede operationelle dokumenter til `admin_document_versions`, men bevarer alle eksisterende versionsrækker og udfører ingen destruktiv oprydning. Først derefter anvendes `20260829020000_integrated_trip_calibration_binding.sql` for schema-3-tur-/kalibreringsbindingen. Begge migrations-id'er bindes ind i protected readiness, som først skrives efter samlet migrationsmetadata-, database- og Edge-readback. `deploy-trip-storage` skal efter dry-run genhente `origin/main` og bevise `origin/main == GITHUB_SHA` umiddelbart før den første eksterne backendskrivning; alle efterfølgende skriverier fortsætter fra samme validerede checkout og migrationssnapshot. To migrationsfiler må aldrig dele samme versionsprefix eller være afhængige af alfabetisk filrækkefølge.
2. Additive databaseændringer og kompatibilitetsklar backend/Edge deployes og verificeres, mens Candidate G stadig er den eneste offentlige model. Et kald må kun behandles under den modelbinding, som requestens offentlige dataset faktisk bærer; Edge må aldrig ommærke Candidate G som integreret eller blande felter fra de to modeller. Ny Edge returnerer eksakt HTTP `409` ved manglende eller forkert modelbinding, så en gammel klient bruger sin lokale Candidate G-beregning i stedet for et servergenereret modelmix. Schema-3-turgrænsen accepterer kun den eksakte integrerede 11-feltsbinding eller den forseglede eksakte Candidate G-11-feltsbinding. Integrated kan kun være kalibreringsegnet ved eksakt zone-/kystdelsparitet; Candidate G er altid `calibration_eligible=false`. En ukendt eller forfalsket, men formelt korrekt binding afvises både i den delte submit-validator og i SQL.
3. Den integrerede private runtime gendannes eller migreres i én eksklusiv prioritet: eksakt point-aktivering, gyldig integreret continuation fra privat bundle, gyldigt integreret checkpoint og derefter præcis én dybt valideret Candidate G schema-2-import. Hver continuation/checkpoint skal matche den fulde 11-feltsbinding. En ugyldig point-aktivering stopper straks; en ugyldig ordinær kilde må ikke skygge for en gyldig lavere prioritet. Kilderne må ikke flettes, og Candidate G-import må ikke gentages som normal recovery. Hvis ingen statekilde findes, genafspiller kystdelen de 0–48 private, verificerede kildetimer, som faktisk findes fra target−48 h til target−1 h, og derefter den virkelige targettime. For de otte allowlistede 3-timers proxyer må én eksakt verificeret, dataminimeret prøve umiddelbart før randen alene attestere native kontinuitet, når randen ligger mellem prøver; den giver intet nyt strøminterval. Offentlige, syntetiske eller uattesterede rækker før target må ikke bruges som historisk bro. 48/48 giver `VERIFIED_CAUSAL_HISTORY_WINDOW`, men scoren forbliver `HISTORY_INCOMPLETE`, indtil wave-mobilisationshalen er kausalt lukket efter 288 timer eller en særskilt attestert migration/continuation leverer fuld state. Kortere eller gappede forløb giver `UNKNOWN_HISTORY_INTERVAL` og scorer med konservative bounds, når targettimens direkte input er gyldige; manglende direkte targetinput giver fortsat `UNAVAILABLE` for den berørte score.
4. Ét exact-head Pages-artifact bygges og valideres med én dataset-, reference- og modelbinding. Controlleren observerer først den kanoniske offentlige kildemanifesthash og skriver derefter atomisk `INTEGRATED_PENDING` med `transitionKind=INITIAL_INTEGRATED_CUTOVER`, kilde-/målbindinger, begge manifesthashes og begge implementation-closure-hashes. Den centrale profil **forbliver Candidate G**, mens den integrerede Pages-målversion deployes. Først efter eksakt offentlig implementeringskontrol og 210/673-verifikation må én service-role-RPC samtidigt sætte controlleren til `INTEGRATED_ACTIVE` og den centrale profil til den integrerede 11-feltsbinding. Første cutover er push-only og må starte fra én af to forseglede kilder: en rowless exact legacy/schema-3-Candidate-profil uden controller-række bruger `expectedVersion=0` og `legacySourceRequired=true`; en verificeret legacy→current Candidate-bro bruger den eksakte aktive current Candidate-marker, den aktuelle centrale CAS-version og `legacySourceRequired=false`. Sidstnævnte må aldrig tvinges tilbage til version 0 eller ommærkes som rowless legacy.
5. En afbrudt `PENDING`-overgang genoptages deterministisk. Matcher den kanoniske offentlige manifesthash den anmodede målhash, gentages den fulde offentlige kontrol, hvorefter CAS kan fuldføre. Matcher den kildehashen, aborteres/rekonsolideres overgangen til kildens `ACTIVE`-status og kildens centrale profil bevares. Matcher den hverken kilde eller mål, forbliver controlleren `PENDING`, og normal drift stopper fail-closed. Der deployes ikke en særskilt Candidate G-version af assistentens Edge-funktion.

En kort kompatibilitetsfase i backend er ikke en ekstra offentlig shadowmodel: den beregner ikke en alternativ score, men afviser eller behandler hvert datasæt efter dets eksakte binding. Releasebeviset skal omfatte både gammel-klient/ny-backend og ny-klient/ny-backend, eksakt `409` + lokal Candidate G ved gammel klient uden binding samt negative krydsbindingsprøver.

## Operationel modelcontroller, rollback og tilbagevenden

Et offentligt modelskift er en versions-CAS-styret release, ikke en automatisk fallback. Controllerdokumentet ligger under nøglen `ravscore-operational-model-activation` med schema `ravscore-operational-model-activation-v4`. Det kan kun bruge statusserne `INTEGRATED_ACTIVE`, `CANDIDATE_G_PENDING`, `CANDIDATE_G_ACTIVE` og `INTEGRATED_PENDING` samt overgangstyperne `CANDIDATE_G_ROLLBACK`, `CANDIDATE_G_REFRESH`, `CANDIDATE_G_REFRESH_BEFORE_INITIAL_CUTOVER`, `LEGACY_CANDIDATE_G_REFRESH_BEFORE_INITIAL_CUTOVER`, `INTEGRATED_RETURN` og `INITIAL_INTEGRATED_CUTOVER`.

Controllerdokumentets fulde vedvarende kontrakt har præcis 30 felter: `schemaVersion`, `status`, `transitionKind`, `sourceHead`, `datasetId`, `productionReferenceAt`, `rollbackId`, `activeModelBinding`, `requestedModelBinding`, `sourceModelBinding`, `candidatePlanSha256`, `candidateFullSha256`, `privateBundleContentSha256`, `publicManifestSha256`, `sourcePublicManifestSha256`, `requestedPublicManifestSha256`, `sourceImplementationClosureSha256`, `requestedImplementationClosureSha256`, `sourceDeploymentId`, `deploymentId`, `automaticActivationAllowed`, `schedulerActivationAllowed`, `calibrationEligible`, `requestedAt`, `activatedAt`, `failureCode`, `returnPlanSha256`, `integratedReadinessSha256`, `integratedPublicAuditSha256` og `integratedManifestSha256`. Bindingerne er de fulde 11-feltsbindinger. Hashes og ids skal være ikke-følsomme, eksakte og overgangsbundne.

Alle seks overgangstyper bruger samme tofasemønster:

1. observer den kanoniske offentlige kildemanifesthash og valider kilde, mål, privat plan, central profilversion og tilladt initiator;
2. skriv atomisk `CANDIDATE_G_PENDING` eller `INTEGRATED_PENDING`, mens den centrale profil fortsat er kildens profil;
3. deploy målets eksakte Pages-artifact;
4. verificér den offentlige implementeringsbinding samt 210 zoner og 673 kystdele;
5. fuldfør med én service-role-RPC, som samtidigt sætter målets `ACTIVE`-status og den centrale profil til målets eksakte 11-feltsbinding.

Ved crash/retry gælder manifestbaseret reconciliation: offentlig målhash medfører fuld genverifikation og CAS-complete; offentlig kildehash medfører CAS-abort/rekonsolidering til kildens `ACTIVE`-status med bevaret kildeprofil; enhver tredje hash efterlader `PENDING` og stopper normal drift fail-closed. Central profil kan derfor aldrig stå på målmodellen, mens kildens Pages-manifest fortsat er kanonisk.

Candidate G-rollbacken bruger `transitionKind=CANDIDATE_G_ROLLBACK` og rollback-id `integrated-schema6-to-candidate-g-schema2-v3`; den er manual-only. En senere tilbagevenden bruger `transitionKind=INTEGRATED_RETURN`, går via `INTEGRATED_PENDING` og er også manual-only. Den første integrerede aktivering bruger `INITIAL_INTEGRATED_CUTOVER` og er push-only. Scheduleren må hverken førstegangsaktivere, rulle tilbage eller returnere. Fra rowless exact legacyprofil bruger schedule/watchdog/manuelt vejr action `candidate-legacy-maintenance`, transition `LEGACY_CANDIDATE_G_REFRESH_BEFORE_INITIAL_CUTOVER` og CLI `legacy-refresh-begin/complete/abort`; begin skriver source-bevarende `CANDIDATE_G_PENDING`, complete/target-reconcile aktiverer kun exact current Candidate, og abort/source-reconcile bevarer legacy. Markøren består som lineage efter complete med exact current Candidate, fire `null`-returnfelter og `legacySourceRequired=false` og må kun arves, aldrig skabes ved relabel. En særskilt lineage efter et sikkert afbrudt integreret first-cutover-forsøg bruger `CANDIDATE_G_REFRESH_BEFORE_INITIAL_CUTOVER` og bevarer de fire return-evidence-hashes. Ordinær allerede aktiv Candidate-drift bruger `CANDIDATE_G_REFRESH`. Ingen vedligehold må skrive `INTEGRATED_PENDING`, aktivere state 6 eller skifte til integreret profil. Enhver fremmed eller uafklaret `PENDING`-status stopper normale deploys.

Candidate G-ture og -observationer under en operativ rollback mærkes `calibrationEligible=false`, så de ikke blandes ind i kalibrering af den integrerede model. Konto-DTO'en bærer kun den privacy-sikre eksakte `model_binding`. Klienten udleder visningsstatus på ny mod det aktive kanoniske Pages-overlay og stoler ikke på en ældre serverlabel: under Candidate G-rollback vises eksakt Candidate G som `current-ineligible`, mens integrerede ture er historiske. Den oprindelige turbinding omskrives aldrig.

For at bevare et komplet tur-snapshot må kun den eksakt navngivne `READY`/`memoryReady` Candidate G-runtime under denne manuelle rollback projicere sin egen mode-score som `FULL_HISTORY` + `EXACT_POINT_SCORE`, `lower=upper=score`, span 0, 48 timers coverage, tomme reasons og reset false. Det er ikke en ommærkning af integreret state eller en fallbackregel. Non-READY eller binding/generation/target/hash-mismatch stopper projektionen; `calibrationEligible=false` består uafhængigt på grund af rollback til den pensionerede model.

Rollbacken er bevidst **fail-closed og local-only for Spørg RavRadar**. Candidate G-Pages-overlayet erstatter klientens offentlige modelbinding, mens assistentens integrerede Edge-funktion forbliver deployet og afviser Candidate G-bindingen med eksakt HTTP `409`. Klienten bruger derefter de eksisterende deterministiske lokale DA/DE/EN-svar. Schema-3-ture lagres fortsat under den eksakte Candidate G-binding med `calibration_eligible=false`. Dette er hverken en Edge/backend-helrollback, en skjult dualmodel eller en Candidate G-serverfallback.

4.0.318's endelige Candidate G-rollbackbundle har sin egen `modelContractSha256=c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8` og sin egen transitive 55-filers `modelBundleSha256=4ccc2081982677aadbb47a5ee7d6f2b99fdcb7e42113e73029d5c60323a5ee96`. Begge værdier er regenereret, forseglede og regressionstestede; kontraktdigesten alene er aldrig et gyldigt bundlebevis.

## Evidens- og påstandsgrænse

Offline-evidens skal dække syntetiske scenarier, gamle-mod-nye replays, ablationer, følsomhed, missing, migration, recovery og forbrugerbindinger. Disse kontroller kan dokumentere kontraktmæssig konsistens, fysisk sammenhæng og teknisk forbedring.

De må ikke bruges til at påstå empirisk højere fundpræcision. RavRadar har ikke et repræsentativt, lokalt fundgrundlag, der kan kalibrere eller validere en sådan påstand.

## Accept- og rollbackgate

Cutover er kun tilladt, når:

- kode, state, payloads, forklaringer og dokumentation har de samme autoritative bindinger,
- migration og rollback er deterministisk testet,
- Supabase-migrationerne `20260829010000_ravscore_operational_documents_no_history.sql` og `20260829020000_integrated_trip_calibration_binding.sql` er anvendt i denne rækkefølge, `origin/main == GITHUB_SHA` er genverificeret umiddelbart før første eksterne backendskrivning, og protected readiness binder begge efter samlet database-/Edge-readback,
- backend/Edge-forberedelsen og det integrerede cutover består den observationsatomiske matrix; Candidate G-rollbacken består særskilt central bindings-/Pages-overlay, assistent-Edge-`409`, lokal DA/DE/EN-fallback og schema-3-lagring uden modelmix,
- operational-controlleren består første `INTEGRATED_PENDING`-cutover, manuel Candidate G-rollback, manuel integreret tilbagevenden, afgrænset Candidate-refresh, source/requested-manifest-reconciliation, atomisk `ACTIVE`+central-profil-RPC, fail-closed `PENDING`, initiatorforbud og eksakt 210/673-verifikation,
- private bundle- og checkpointgates er grønne,
- schema-4-manifestet og den fire-filers offentlige allowlist er privacy-auditeret,
- alle 210 zoner og 673 kystdele passerer relevante generator-, projektion- og browsertests,
- aktuelle ranglister, bedste tidspunkt, zonedetaljer, femdøgnsvisning, strand/waders, DA/DE/EN, Spørg RavRadar, evidens-id’er, konto-/tur-/observationsbindinger, admin og ekspertflader er bundet til samme model,
- fuld frisk produktion er grøn på den eksakte mergede head,
- offentlig desktop og mobil er verificeret,
- og der ikke findes konkret modstridende evidens.

Hvis en gate fejler, forbliver Candidate G offentlig. En ufuldstændig integreret model må ikke deludrulles.
