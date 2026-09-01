# RavScore — integreret modeldesign

**Dato:** 2026-08-29

**Status:** Candidate G/4.0.316 er fortsat eneste offentlige model. Emergency PR #236 gendannede exact tree på `origin/main c58deb78`; exact-head `33342157517` og post-merge `33342219152` er grønne. `33345476979`/`rr-20260831010337-210` var første recoverybevis. Det tidligere external-watchdog-`workflow_dispatch` `33347230240`/`rr-20260831012407-210` bestod fuld DMI/validate/releasegate/storage/Pages og er komplet 210/673, `VERIFIED_ONLY`, uden syntetiske samples; Candidate G er 0/210 aktiv på grund af historikmemory. Visuel desktop-/mobilkontrol er åben. `33343469247`/`33344823000` var transient-503-stop uden deploy; bounded retry-hotfixen er produktionsverificeret gennem PR #237, exact-head `33352520408`, merge `8c03e25d`, backend `33352661061` og fuld produktion `33352634365`; automatisk run `33354263148` publicerede `rr-20260831034128-210` komplet 210/673. 4.0.319 er lokal; historical-maintenance/recovery, outcome-v2 og P2-assistent/plain-language-måltests er grønne, men fuld slut-sourcegate, exact-head, frisk state-6-produktion og offentlig verifikation afventer.

**Autoritativ kode:** `js/core/ravscore-model-contract.js` og den integrerede evaluator/stateimplementering

## 0.0. 4.0.319 operationel head-move- og recoveryprotokol

Controller-v4 forbliver præcis 30 felter, fire statusser og seks transitionstyper. Historical Candidate H0→H1 og integrated H0→H1 bruger eksplicitte actions, immutable planer og tofaset begin/complete/abort; direct Candidate H0→integrated H1 bruger immutable IntegratedReturnPlan. Candidate targetprofilen er forseglet i planen, ikke i controlleren. Atomic central ACTIVE controller+schema-3-profil skal matche samme komplette 11-felts sourcebinding. Ordinary maintenance er exact-current og identitetsneutral.

Source kan kun aborteres med terminalt bevis for, at Pages ikke accepterede requesten. Ved ambiguous Pages genudgiver en isoleret writer exact targetartifact; non-Pages-finalizer kræver stabil targethale, exact main/PENDING/CAS og skifter først derefter controller/profil. Third/mixed/reversed/stale/tampered/missing plan stopper. Recoverydeploymentet er næste source-lineage. Outcome-kontrakten er schema v2 og inkluderer historical actions samt writer/finalizer/gate.

State 6 publicerer hele target..+117h-aksen som `HISTORY_INCOMPLETE`, når direkte timeinput er gyldige. Direct missing er `UNAVAILABLE` kun for den konkrete time. Spørg RavRadar skelner de to kvaliteter, og offentlig DA/DE/EN beskriver den energivægtede firetimers-halvering og maksimum 15 % dæmpning uden W/N/T/EWMA-jargon. Måltests er grønne; exact-head og offentlig release er fortsat gate.

## 0. 4.0.319: sikker første opstart uden opfundet historik

Første cutover har præcis to tilladte, populationsdækkende grene:

1. **Eksakt migration:** Alle 673 offentlige Candidate G/schema-2-states er kanoniske, `READY`, bundet til det eksakte offentlige kilderegister og giver ét fælles target. Kilde- og aktiv samplingkontekst er identiske. Først da må `candidate-g-migration` genvægte den signerede, allerede afledte currentevidens og genopbygge wave-approach ved dette target.
2. **Ægte målt koldstart:** Alle 673 kildestates skal stadig bestå Candidate G-oraklets state-/stateKey-/trustvalidering, men mindst én kanonisk state er i en legitim warmup/missing-status, eller den centralt autoritative aktive samplingkontekst afviger legitimt fra den eksakte historiske kildekontekst. Resolveren vælger da samlet `genuine-cold-start` ved produktionens target. State 6 og den separate Candidate G-rollbackgren genafspilles kun fra faktisk tilgængelige, proveniensverificerede målinger. WAM-timer i denne gren skal være eksakte native timer; den maksimalt tilladte interpolation er `0`. Den allerede dokumenterede højst fire timers WAM-interpolation er alene en migrations-/generisk acquisitionregel og må ikke sive ind i genuine cold start. Der indsættes ingen syntetiske timer, neutral nulstrøm, nabozonelån eller kunstig readiness.

De to registre har forskellige roller og må ikke blandes. Det eksakte offentlige Candidate G-manifest, conditions og dets `coastal-parts-v2.json` hydreres som én valideret kildeenhed; kilderegisteret gemmes isoleret i `.cache/ravscore-legacy-candidate-g-source/coastal-parts-v2.json`. Det aktive `data/live/coastal-parts-v2.json` materialiseres separat fra den nyeste centralt hydrerede adminkonfiguration **før** targetvalget. Kilderegisteret beviser, hvad de gamle states faktisk var bundet til; det aktive register ejer den aktuelle produktion. Dette flytter eller omskriver ingen geometri, land-/vandpunkter eller kystnormaler.

Resolveren udsender kun `mode`, `target_hour`, `part_count` og `source_validated`. Target er kanonisk UTC i formen `YYYY-MM-DDTHH:00:00Z`, så Node-valget og Python-WAM-parseren har én fælles tidskontrakt. Malformed, reconstructed, manipuleret, fremtidig eller forkert identificeret state, ukendt status, part-/zonesætmismatch, ugyldigt register, en tidligere afvist ugyldig integreret continuation/checkpointkilde eller uattesteret cold-start stopper før DMI og før mutation. En cutovermode fra miljøet kan ikke alene attestere kilden.

Ved den målte koldstart initialiseres Candidate G-rollback eksklusivt fra sin egen målte replaygren. Den må ikke hybridiseres med en tidligere continuation, bruge integreret state eller få samme targettime som ekstra credit. Den senere rollback-/checkpointgate kræver fortsat 673/673 reelt `READY` Candidate G-companions; kan de faktiske målinger ikke opfylde det, stopper cutoveret. Candidate G forbliver offentlig.

Den private WAM-opbygning skriver checkpoints undervejs, og workflowet bevarer den progressive DMI-/WAM-cache efter både fuld succes og en reel producerfejl, når en cachefil findes; en annulleret kørsel gemmes ikke. Dermed kan næste forsøg genbruge verificeret arbejde uden at lempe den fulde WAM-, DMI-, provenance-, 210/673- eller releasegate. Planlagte, watchdog-/botudløste og manuelle vejrjobs vedligeholder fortsat Candidate G, mens første integrerede cutover afventer. Fra en rowless, eksakt legacy-Candidate G-profil vælger scheduler/manuelt vejr action `candidate-legacy-maintenance` og den særskilte transition `LEGACY_CANDIDATE_G_REFRESH_BEFORE_INITIAL_CUTOVER`; CLI'en bruger `legacy-refresh-begin`, `legacy-refresh-complete` og `legacy-refresh-abort`. Begin skriver `CANDIDATE_G_PENDING` med active/source på legacy schema 2, requested på current Candidate G schema 4 og uændret legacyprofil. Complete kræver offentlig exact implementation+210/673 og sætter først da current `CANDIDATE_G_ACTIVE` samt current Candidate-profil; `initialCutoverRequired=true` består, og `legacySourceRequired=false`, fordi den faktiske sourcebinding nu er current Candidate. Abort eller source-reconcile bevarer legacy public/profile og `legacySourceRequired=true`; target-reconcile svarer til complete. Markøren `LEGACY_CANDIDATE_G_REFRESH_BEFORE_INITIAL_CUTOVER` er varig lineage: efter complete og i senere Candidate→Candidate pre-cutover maintenance bevares samme marker, exact current Candidate-binding og alle fire returnfelter som eksakt `null`. Den må kun arves fra denne allerede valide marker og må aldrig opstå ved relabel af en ordinær refresh. Et andet, separat forløb gælder current Candidate G efter et sikkert afbrudt integreret first-cutover-forsøg: `CANDIDATE_G_REFRESH_BEFORE_INITIAL_CUTOVER` bevarer da de fire forseglede returnbeviser `returnPlanSha256`, `integratedReadinessSha256`, `integratedPublicAuditSha256` og `integratedManifestSha256`. `legacySourceRequired` udledes altid af den faktiske sourcebinding, aldrig af markørens navn. Ingen vedligeholdelsesgren må skrive `INTEGRATED_PENDING`, aktivere state 6, skabe historik eller forsøge modelskiftet; kun et push må vælge `integrated-cutover`. Ved fejl forbliver beskyttet state og den senest verificerede offentlige Candidate G-kilde uændret.

## 1. Formål og påstandsgrænse

Den nye RavScore er ét modelleret indeks for kystnær rav- og søgemulighed. Den er ikke en sandsynlighed for at finde rav. Den skal forklare og holde følgende årsagsled adskilt:

```text
muligt lager/tilførsel
        ↓
mobilisering
        ↓
transport mod kystzonen
        ↓
sidste nærkystlevering, aflejring og retention
        ↓
jagtbarhed
        ↓
score med eksplicit data- og modelusikkerhed
```

RavRadar observerer ikke det lokale ravlager. Systemet har heller ikke lokal batymetri eller en bølgeopløst surfzonemodel. Derfor kan implementeringen ikke afgøre, hvor meget rav der passerer revler, fastholdes bag dem, føres langs kysten eller returneres gennem undertow, feeder- eller ripstrømme.

Modellen må beskrives som mere sammenhængende og kontraktmæssigt mere robust end Candidate G, hvor tests understøtter det. Uden et repræsentativt fundgrundlag må den ikke beskrives som empirisk mere fundpræcis.

## 2. Én identitet på tværs af hele produktet

| Felt | Implementeret værdi |
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
| Eksakt schema-5-kilde | `integrated-schema5-ready-point-to-schema6-history-bounds-v1`; kun migration fra den aldrig offentlige releasekandidat |
| Rollback | `integrated-schema6-to-candidate-g-schema2-v3` |
| Parameterkontrakt | Aktiv 4.0.319-værdi `modelContractSha256=778db7aa3946f925607a8304daa42ed17dd30294e4a51bf6d895d7293e84c4e7`; historisk state-5-værdi `0cd7c263727721696253ae57c45aa3485b4081ff2cbb5b01a1f022b31b1aa7da` |
| Transitiv implementeringsbundle | Aktiv 4.0.319-værdi `modelBundleSha256=e880d5425e6f7b93d8afc99cddf491e58ad5a4a2ab055f8e4455193609c90a73` over 43 filer og 8 bindingsforbrugere; historisk state-5-værdi `27a744e820038d5e508597d02fd0a600479f160a5a5a4a66bdc252e7ea8b3bcd` |

Den serialiserede runtimebinding følger state, checkpoints, central profilselection, offentlige payloads, ture/observationer, releasegates og forklaringer. Den består af model-, state-, variant-, profil-, komponent-, forklarings-, rangerings-, best-time- og præsentations-id samt både `modelContractSha256` og `modelBundleSha256`: 11 felter i alt. Den første hash binder parameterkontrakten; den anden binder den transitive implementeringslukning. Hver continuation-state, hvert checkpoint og den centrale profilselection skal bære og matche alle 11 felter. Migration og rollback er særskilte overgangskontrakter. Et match på model-id eller én hash alene er ikke nok.

Det migrations- og rollbackorakel, som betegnes Candidate G, er kildebundet til den produktionsverificerede 4.0.316-baseline på head `49dd4cb454656bdf629e5df760176705e38d2cb0`, tree `975c3e9432cea7780564ffd56766bc1f0a0a9763` og central switch `RAVSCORE-PROFILE-SWITCH-4.0.316`. Source contract er `2f888a16190e9e43e44536536029f1b0021a1b850195524aa2312664ca74810b`, og den kanoniske 53-filers source closure er `a366b4a64fc3ccc8f1b94f3fed24b3ce03ea23d906396bc8bea183338c5d2606`. PR-, build- og deploykontrollen henter og verificerer den eksakte pinnede source head; dette lokale lukningsbevis erstatter ikke de udestående exact-head-, produktions- og offentlige releasebeviser.

## 3. Samlet score

For hvert tidspunkt og hver visning beregnes:

```text
rawScore =
  0,20 × huntability
  + 0,50 × deliveryPotential
  + 0,30 × mobilisationPotential
```

Alle tre komponenter ligger på skalaen 0–100. Den afrundede slutscore begrænses til 0–100. Wadersvisningen anvender desuden den eksisterende søgeforholds-/metodecap; den er ikke sikkerhedsråd. Strand og waders er to projektioner af samme modeltilstand og modelbinding.

Vægtene 20/50/30 bevares, fordi den integrerede offline-følsomhed ikke gav grundlag for at erstatte dem. Det er en modelprior, ikke en fundkalibreret sandhed.

### 3.1 Additivt indeks, ukendt lager og transport 0

Formlen er et additivt evidensindeks, ikke en seriel massebalance. `mobilisationPotential` betyder derfor en **betinget mulighed** for, at allerede tilgængeligt materiale kan være mobiliseret; komponenten må ikke læses som et observeret eller estimeret lokalt ravlager. `transportPotential` er tilsvarende den verificerede aktuelle strømtilførselskomponent, ikke en måling af alt rav, der kan ligge lokalt, bag revler eller i en sekundær beholdning.

En klar, verificeret `transportPotential = 0` er ikke det samme som manglende direkte strømdata eller manglende historik. Et manglende obligatorisk direkte input for den time gør udfaldet `UNAVAILABLE`. Manglende tidligere historie giver derimod `HISTORY_INCOMPLETE` med en numerisk konservativ score og et omsluttende interval. Ved en **klar nulværdi** kan jagtbarhed og den betingede mobiliseringsmulighed fortsat bidrage, men 20/50/30 giver et matematisk loft på `20 + 30 = 50`. En sådan score kan derfor kun ligge i præsentationsbåndet dårlig eller højst svag; den kan aldrig blive middel eller god. Waders-cappen kan reducere loftet yderligere.

### 3.2 Numerisk konservativ historikkontrakt

State 6 skelner mellem tre kvaliteter:

- `FULL_HISTORY`: nedre og øvre scoregrænse er ens og ingen historikårsag står tilbage. `scoreSemantics` er enten `EXACT_POINT_SCORE` eller `CONSERVATIVE_TAIL_RESET_POINT_SCORE`,
- `HISTORY_INCOMPLETE`: alle obligatoriske direkte input for scoretimen er gyldige, men en eller flere historikafhængigheder er ufuldstændige; scoren vises fortsat som den konservative nedre grænse,
- `UNAVAILABLE`: et obligatorisk direkte input er missing/invalid, så der beregnes ingen score og heller ingen lånt, interpoleret eller videreført erstatningsværdi.

Det aktive strømhukommelsesvindue er fortsat 48 timer. Ukendt kystnormal currentevidens omsluttes fysisk konservativt med maksimal udadgående effekt (`-1`, `-8`) i den nedre gren og maksimal indadgående effekt (`+1`, `+10`) i den øvre gren. Mobiliserings- og wave-approach-state beregner tilsvarende nedre/øvre grene uden at opfinde målinger. Resultatet bærer `scoreBounds.lower`, `scoreBounds.upper`, coverage, faste reason-id'er og `calibrationEligible=false`; den viste `score` er `scoreBounds.lower`.

Der kan opbevares op til 168 timers verificeret forskningshistorik, men timer ældre end det aktive 48-timersvindue har eksakt nul effekt på score og readiness. Bølgemobiliseringens usikkerhedshale lukkes efter 288 timer, hvor den størst mulige resterende rå scoreeffekt er `0,46875`: scoringens wave-track sættes da konservativt til lower-bound-sporet. Last-mile-momenter lukkes efter 40 timer med højst `1/1024` udeladt andel ved at vælge minimum-factor-sporet. `conservativeResetAt` gør begge closures eksplicitte; senere historikhuller åbner bounds fra det konservative scoringstrack. Den særskilte fysiske point-state og Candidate G-rollbackstate bevares. `CONSERVATIVE_TAIL_RESET_POINT_SCORE` er derfor kalibreringsegnet fast modelpolitik med kollapsede bounds, men må aldrig kaldes fysisk eksakt state. Halerne må heller ikke fremstilles som ekstra scorehistorik eller som bevis for bedre fundpræcision.

Den syntetiske lagerkoblingsablation sammenlignede aktiv additivitet med `M × T/100`, `M × sqrt(T/100)`, `M × (0,5 + 0,5 × T/100)` og `min(M,T)`. Ingen af alternativerne kan vælges empirisk uden repræsentative fund/nul-fund eller et observeret lokalt lager. Fuld-, kvadratrods- og minimumskoblingen gør strømtilførslen til henholdsvis proxy eller hård grænse for **alt** mobiliserbart lokalt/sekundært lager og tvinger derfor bølgeleddet mod nul ved transport 0. Halvkoblingen opfinder i stedet en numerisk 50 %-prior for uafhængigt lager.

Den aktive additivitet er dermed den mindst ekstra lagerstrukturerende af de afprøvede skalarregler: den undlader at omsætte strømkomponenten til et skjult lagermål. Den er ikke antagelsesfri; separabilitet, kompensation og de faste 20/50/30-vægte er fortsat ukalibrerede indekspriorer. Valget er en transparent begrænsning under manglende lagerdata, ikke dokumentation for optimalitet eller fundpræcision.

## 4. Transport: aktuel kystnormal strømtilstand

Transportpotentialet genbruger Candidate G’s kontinuerlige kystnormale strømstate, men med en strammere evidens- og missingkontrakt.

### 4.1 Øjeblikkelig styrke

Kystnormal styrke afledes uden at offentliggøre eller gemme rå U/V i den offentlige kontrakt. Dødzone og fuld styrke er:

- `0,03 m/s`: ingen retningsbestemt styrke under eller ved grænsen,
- `0,15 m/s`: fuld retningsbestemt styrke,
- lineær interpolation mellem de to grænser.

Den fortegnede afledte styrke er positiv indadgående og negativ udadgående. Det er en verificeret modelgridstrøm ved RavRadars valgte havpunkt — ikke en lokal bundstrømsmåling, surfzonens undertow, tidevand som separat proces eller en direkte observation af ravbevægelse.

[DMI beskriver DKSS](https://www.dmi.dk/friedata/dokumentation/data/forecast-data-storm-surge-model-dkss) som en tredimensional HBM-cirkulationsmodel, der er atmosfærisk tvunget, har tidevands-sealevel ved de åbne rande og bruger grid fra cirka 3 sømil til 0,1 sømil. Current-U/V leveres som middel over modellag; øverste lag er 8 m i NSBS/Vadehavet og ellers 2 m. RavRadars valgte lagmiddel er derfor ikke en måling af lokal bundnær strøm. [Copernicus Baltic NEMO](https://data.marine.copernicus.eu/product/BALTICSEA_ANALYSISFORECAST_PHY_003_006/description) leverer ligeledes tredimensionelle hastighedsfelter og skelner blandt andet mellem øjeblikkelige og detidede produkter. Det valgte gridfelt er et samlet fysisk modeludfald, ikke en procesopdeling eller dokumentation af, at hele den lokale vandsøjle bevæger sig ens.

Når provenance har bevist et bestemt U/V-par, er netop dette par den eneste autoritative numeriske strømkilde. Den private state afleder det kystnormale signal direkte og uden 0,01-kvantisering fra dette par og den godkendte kystnormal. Kun den offentlige visningsfart afrundes med `hypot(U,V)` til 0,01 m/s, og movement-toward-retningen afrundes fra samme par; en afrundet `360°` normaliseres til `0°`. Parallelle cachefelter for fart eller retning kan være stale eller modstridende og må derfor ikke overstyre det beviste par. Rå U/V forlader ikke den private producent eller den envejshashede recoverykontrol.

Den aktive spatiale sampling er bevidst bundet til hvert eksisterende centralt godkendte havpunkt, den nærmeste gyldige fælles U/V-gridcelle inden for den gældende afstandspolitik og den eksisterende land→vand-kystnormal. Punktparret flyttes ikke: det er både samplingidentitet og RavRadars nødvendige vinkelrette kystreference. Den allerede eksisterende private, roterende forskningscache ved cirka 0, 5 og 15 km søværts og i flere modellag bevares med højst 168 timers retention og `scoreEffect=NONE`. Den kan genbruges offline til lag-, afstands-, tidslags-, ablations- og følsomhedsanalyse uden en ny historikopbygning ved release.

De ydre prøver bliver ikke et ekstra aktivt scoreled i denne modelgeneration. Den roterende cache giver ikke eksakt 673 × 166-dækning, og RavRadar har ingen valideret advektiv kortlægning eller tidslag, som oversætter en 5/15-km-gridstrøm til sidste levering ved den konkrete kystdel. En naiv sammenvægtning kan blande forskellige hydrodynamiske områder og dobbelt-tælle samme strømforcering, der allerede ejer `transportPotential`. En senere aktivering kræver derfor en særskilt modelgeneration med landsdækkende provenance, kausal rum-/tidsmodel, ablation og releasebevis; den er ikke efterladt som et plug-and-play-hul i denne leverance.

Hele den aktive fysiske kæde accepterer kun endelige JSON-tal. Booleans, numeriske strenge, arrays og objekter må ikke coerces til nul eller gyldige input. Det gælder modelinput, state, migration, recovery, privat runtime og offentlig projektion; et forkert typeled bliver missing eller fail-closed efter den konkrete kontrakt.

### 4.2 Statebevægelse

- indadgående bevægelse: højst `+10` point pr. effektiv time,
- udadgående bevægelse: højst `-8` point pr. effektiv time,
- 24 timers evidens får fuld aldervægt,
- 24–48 timer dæmpes med et hævet cosinusforløb,
- grænsepotentialet ved begyndelsen af vinduet er 0,
- en verificeret 13-timers sammenhængende udadgående sekvens kan nå nul,
- et eksplicit native hold viderefører state uden opfundet bevægelse.

Det løser ikke automatisk den fysiske last mile. En stærk udadgående gridstrøm kan reducere transportpotentialet, men siger ikke alene, at rav på landstranden eller bag en revle nødvendigvis føres ud igen.

### 4.3 Evidensintegritet

Det 48-timers vindue må have højst 3 timers evidensgab. Højst 49 evidenspunkter opbevares samlet. Et reelt præ-grænsepunkt kan bruges som cadence-bro, men optager i så fald én af de 49 pladser. En tæt, ujusteret serie, der ikke kan repræsenteres under loftet uden approksimation, fejler lukket.

Kold start, fremtidig evidens, ugyldige fortegn eller manglende påkrævede punkter må ikke omsættes til en tilsyneladende normal transportscore.

### 4.4 Eksakt inputhorisont og genbrug

Den låste `productionReferenceAt` er eneste semantiske anker. Den private inputmatrix omfatter præcis 166 UTC-timer fra target−48 h til target+117 h; de første 48 er koldstartsbro, og target gennem +117 er den eksakte 118-timers offentlige prognose. DMI er førstevalg på hvert `partId × validTime`. Et Copernicus-supplement må kun udfylde den resterende eksakte gapmatrix og må hverken flytte target, holde en prøve eller interpolere mellem timer.

DMI-beviset binder hvert native endpoint til collection/familie, component/kind/fieldset, modelrun/lead, item/asset/acquisition, griddefinition, fysisk afstand og eksakt kystdel/forælder/samplingkontekst. En afledt forecasttime accepteres først, når alle dens native endpoints består samme verifier og tilhører samme run/grid/entity. Den private DMI-cache bevarer mindst 54 timer, så target−48-broen kan genbruges med margin.

Copernicus-cachen har schema 2 og er en forseglet range-cache, ikke den gamle single-hour-pilot. En `COMPLETE` collection binder targetregistry, DMI-inputhash, required-pair-hash, recordrefs og acquisitions. Historiske acquisitioner kan genbruges inden for retentionvinduet; current/future-rækker kræver acquisition højst fire timer fra `productionReferenceAt`. Rå subsetbytes hashes før parsing, U/V skal være samme tid/celle/lag, og alle rå vektorer og punkter forbliver private. Fem isolerede brugbare timer på fem kalenderdatoer er ikke dækning; én manglende time i den eksakte 118-timers offentlige akse stopper release.

### 4.5 Feggesund: parent-gab skal først efterprøves på part-level

Sanitiseret parent-zone-forecast `rr-20260830104132-210` har 118/118 bølgefelter `missing` for `DK-B05-11`/Feggesund. Det beviser ikke i sig selv et hul i den integrerede produktionsvej: de tre aktive part-id'er findes, registry markerer dem `marineCoverage=full`, Candidate G-current er tilgængelig for strand/waders, og den integrerede model producerer fra 673 part-level-serier. Den første gate er derfor en frisk integreret produktion, som beviser eksakt 118-timers direkte bølgedækning for alle tre dele ved de eksisterende uændrede vandpunkter.

Ejeren har kun som betinget sidste udvej autoriseret, at netop denne ene zone må **vurderes** for konservativ nabozoneinterpolation, hvis den friske part-level-kontrol viser et reelt hul, og korrekt direkte data derefter dokumenteret viser sig helt umulig at skaffe fra DMI eller en egnet officiel alternativ kilde. Det er ikke implementeret, ikke en generel fallback og ikke en lempelse af `UNAVAILABLE`. En eventuel proxy kræver særskilt beslutning med eksakt kilde/proveniens, geografisk og tidslig grænse, synlig usikkerhed, cache/recovery, kapacitet, rollback og fulde tests; den må aldrig skabe historik, låne strøm eller flytte geometri, punkter eller kystnormal.

## 5. Mobilisering: bølgeenergi med hukommelse

Mobiliseringsmålet bruger energiproxyen:

```text
E = Hs² × T
```

Hvor `Hs` er signifikant bølgehøjde og `T` er bølgeperiode. Energikurvens ankre er:

| `Hs² × T` | Målpotentiale |
|---:|---:|
| 0 | 0 |
| 0,25 | 8 |
| 1 | 25 |
| 3 | 50 |
| 7 | 75 |
| 14 | 92 |
| 25 | 100 |

State bygger med 4 timers halveringstid og falder med 48 timers halveringstid. Kontinuerlige trin må højst være 1 time. Frisk evidens må højst have 3 timers mellemrum. Efter missing eller et længere gap må højst 1 times buildkredit gives; state genstartes konservativt fra minimum af tidligere state og aktuelt mål.

`waveHeightM` og `wavePeriodS` skal være endelige, ikke-negative tal. Ved missing:

- kold start er utilgængelig og opfinder ikke varighed,
- en eksisterende gyldig afledt state kan holdes,
- der optjenes ingen ny mobiliseringskredit.

Bølger kan mobilisere materiale, men kan ikke skabe et ikke-observeret ravlager. Mobiliseringskomponenten er derfor udtrykkeligt betinget af, at materiale faktisk er tilgængeligt, uden at modellen forsøger at sætte en numerisk lagerprior. Retning bruges særskilt og højst dæmpende i last-mile-leddet; den giver aldrig ny eller større tilførsel.

Samme bølgehøjde bruges også i jagtbarhed, men til et andet kausalt spørgsmål. Den tidslige `Hs² × T`-state repræsenterer, om allerede tilgængeligt rav kan være sat i bevægelse og bidrager gennem modellens 30 %-mobiliseringsled. Den aktuelle bølgehøjde i jagtbarhed beskriver derimod metode-/sigtbarhed: ved waders kan den kun reducere vindscoren blødt, og strand bruger den eksisterende søgeforholdskurve. Jagtbarhedsvejen bygger ikke mobiliseringsstate og giver ingen transport- eller last-mile-kredit. En ru sø kan således samtidig øge fysisk mobilisering og gøre søgning sværere; det er to adskilte udfald, ikke samme positive procesbidrag to gange.

## 6. Last mile: begrænset bølge-approach, fortsat fysisk uopløst

Den implementerede policy er `last-mile-wave-approach-ewma4-attenuation15-v1`:

```text
movementDirection = normalize360(DMI_WAM_FROM + 180°)   // præcis én rotation
W, N, T = causalEnergyWeightedEwma4h(activity, normalMoment, tangentMoment)
approach = clamp((normalAlignment - (-0,25)) / 1,25, 0, 1)
factor = clamp(1 - 0,15 × W × (1 - approach), 0,85, 1)
deliveryPotential = transportPotential × factor
```

`normalAlignment` måles mod den eksisterende `onshoreDirectionDeg`; punkter, geometri og kystnormal flyttes ikke. `W` er den eksisterende bølgeenergikurves score divideret med 100. Normal- og tangentmomenterne bærer retning, mens koherens kun bruges i forklaring/usikkerhed. Neutralgrænsen `-0,25` er en transparent, konservativ forskningsprior, ikke en fundkalibreret konstant.

Det giver følgende invariants:

- `factor` ligger altid i intervallet 0,85–1,
- `deliveryPotential` er aldrig større end `transportPotential`,
- bølger kan ikke skabe tilførsel og kan ikke give positiv kredit ved nul transportpotentiale,
- faktoren anvendes præcis én gang i den 50 %-vægtede leveringskomponent,
- maksimal rå totalscoreeffekt er 7,5 point før slutafrunding; vist RavScore kan derfor ændres 8 point,
- kun `waveHeightM=0` er eksakt roligt og neutralt; `wavePeriodS` er stadig finit/ikke-negativ, og positiv højde med nulperiode er `INVALID`/fail-closed,
- manglende retning under aktiv bølgeenergi gør last-mile-state og samlet score utilgængelig,
- `physicalDeliveryResolved` er falsk,
- strukturel last-mile-usikkerhed er altid sand,
- et numerisk fysisk usikkerhedsinterval leveres ikke; værdien er `null`.

Gyldige direkte bølgehøjde-, periode- og retningsinput er nødvendige for scoretimen; missing giver `UNAVAILABLE`. Manglende tidligere last-mile-historik giver derimod `HISTORY_INCOMPLETE` med konservative bounds. De samme højde-/periodefelter bruges også i mobilisering og jagtbarhed, men hver vej har en særskilt kausal funktion; last-mile-leddet må hverken genopbygge mobilisering eller tælle faktoren mere end én gang.

### 6.1 Hvorfor prioren kun dæmper og er hårdt afgrænset

`factor=1` betyder kun, at den retningsbestemte bølgeprior ikke dæmper eksisterende tilførsel i den konkrete state; det betyder ikke “100 % af ravet når stranden”. En faktor under 1 er heller ikke en målt tabandel. Den er en bounded prior for, at et energirigt bølgefelt med svag landværts approach ikke bør få samme leveringsindeks som et tilsvarende felt med stærk landværts approach.

Den tidligere faste `5,25 %`-idé er fjernet. Aktiv kode kan dæmpe 0–15 % afhængigt af den kausale energivægtede aktivitet og approach med fire timers halveringstid og en ældre hale. Loftet og neutralprioren er ejer-/forskningspriorer, ikke et ravspecifikt usikkerhedsinterval. Følsomhed skal derfor rapportere ændringer og maksimumsvirkning uden at omdøbe dem til fysisk strandingsprocent.

### 6.2 Faldende vand og revler

Faldende vand kan både:

- blotlægge rav eller opsamlingslinjer og gøre dem lettere at søge,
- efterlade eller fastholde materiale bag revler,
- falde sammen med en nettobevægelse i vandsøjlen uden selv at bestemme dens retning,
- under andre lokale forhold ledsage udadgående kanaler eller surfzonestrømme.

Det ejerleverede ekspertinput fra Rav Jagt 29. august 2026 klassificeres som navngiven praktisk erfaring, ikke som en kalibreret naturkonstant: helt inde ved stranden er en ensartet “understrøm” ikke givet; vejen fra strandkant til første revle kan styres af andre lokale processer; og faldende vand kan falde sammen med søværts transport af noget mobilt rav, men også blotlægge rav, som allerede er afleveret eller fastholdt på landsiden af en revle. Den praktiske gevinst er søgeareal: en fastholdt linje eller lomme kan være lettere at afsøge end et stort diffust område. Det beviser ikke, at vandstandsfaldet fysisk har koncentreret ravet. Modellen indarbejder dette som en score-neutral `FALLING × {OUTBOUND, INBOUND, ALONG_OR_WEAK, UNKNOWN_OR_NATIVE_HOLD}`-kontekst og som waders-tie-break, men giver ingen særskilte point eller numerisk ravandel.

Ekspertens forklaring om tidevand som en nettobevægelse i vandsøjlen behandles som en relevant procespåmindelse, men ikke som et ekstra RavRadar-input. `waterLevelTrendCm3h` er den fremadrettede modelændring fra den viste time til tre timer senere; feltet er aldrig en observeret ebbe, flod eller tidevandsfase. DKSS-/Copernicus-gridstrømmen er et samlet modeludfald af flere drivkræfter, og RavRadar har hverken et lokalt tidevandsfluxmål gennem surfzonen eller den batymetri, der skal til for at omsætte vandstandstrenden til et nyt, uafhængigt strømled.

Uden lokal batymetri, revlegeometri og en opløst surfzonemodel kan RavRadar ikke afgøre fortegn eller størrelse generelt. Vandstand er derfor kontekst og tie-break, ikke skjult transport-, mobiliserings- eller deliveryscore.

Vandstandstrenden må heller ikke omsættes til en ekstra “hele vandsøjlen”-strøm eller interpoleres med gridstrømmen. Der er ingen direkte dubletterm i RavScores nuværende DMI-/NEMO-input: strøm-U/V bruges i transportleddet, mens vandstand har nul scoreeffekt. Der er derimod residual korrelation, fordi vandstand og strøm kan dele forcing og dynamik i havmodellen. En ny afledt vandstandsstrøm ville derfor kunne dobbeltregne korreleret information og fortæller stadig ikke fortegnet for de adskilte lokale processer: undertow er den vertikalt fordelte tværkyst-returstrøm, feeder-/langskyststrøm fører vand langs stranden mod en kanal eller langs kysten, og ripstrøm er den lokaliserede søværts jet gennem/ved en kanal eller grænse.

### 6.3 Primærkildekritik af det uopløste led

- [Faria m.fl. (2000), DOI 10.1029/2000JC900084](https://doi.org/10.1029/2000JC900084) målte/modellerede undertow over én revlekyst; de største model-/observationsafvigelser lå over revlen. Det støtter, at grov gridstrøm ikke må udlægges som lokal undertow.
- [Reniers m.fl. (2009), DOI 10.1029/2008JC005153](https://doi.org/10.1029/2008JC005153) krævede Stokes-drift og lavfrekvente bevægelser for at reproducere surfzoneretention. Cirka 20 % observerede exits i studiets opsætning er ikke en universel rav-landings- eller eksportandel.
- [Gallop m.fl. (2018), DOI 10.1016/j.margeo.2018.07.015](https://doi.org/10.1016/j.margeo.2018.07.015) viste, at brydning over revler ændrede ripcirkulation, retention og exit på en dobbelt revlekyst.
- [MacMahan m.fl. (2010), DOI 10.1016/j.margeo.2009.09.011](https://doi.org/10.1016/j.margeo.2009.09.011) viste, at ripflow kan indgå i recirkulerende hvirvler og tilbageholde driftere frem for at være ren udtransport.
- [Landwehr m.fl. (2024), DOI 10.1016/j.coastaleng.2024.104591](https://doi.org/10.1016/j.coastaleng.2024.104591) kombinerede faseopløst nærkystmodel og drifterbaner og viste, at vandstand, bølgeretning og retningsspredning ændrer lokale strøm- og hvirvelmønstre. Det understøtter, at samme ydre gridstrøm ikke giver ét stabilt sidste-mile-fortegn gennem alle vandstande.
- [Aagaard m.fl. (1997), DOI 10.1016/S0025-3227(97)00025-X](https://doi.org/10.1016/S0025-3227(97)00025-X) er feltmålinger fra én revlekyst og observerede en lavvandstærskel med kraftig søværts rip-/sedimenttransport, samtidig med landværts oscillerende transport uden for surfzonen.
- [Aagaard, Black og Greenwood (2002), DOI 10.1016/S0025-3227(02)00193-7](https://doi.org/10.1016/S0025-3227(02)00193-7) parameteriserede tværkyst sedimenttransport over revler ud fra blandt andet undertow, bølgeskævhed, orbitalhastighed, relativ dybde og bundhældning. Feltresultaterne omfattede både land- og søværts nettotransport, så høj bølgeenergi fastsætter ikke fortegnet alene.
- [Bjørnestad m.fl. (2021), DOI 10.1029/2021GL095722](https://doi.org/10.1029/2021GL095722) målte bølge-for-bølge-bevægelse i surfzonen og fandt den lokale middelvandstand relativt til bunden vigtigere for den observerede landværts massetransport end den enkelte bølgehøjde. RavRadars tre-timers vandstandstrend er hverken dette lokale bølge-set-up eller en måling relativt til den lokale bund og kan derfor ikke overtage resultatets fortegn som scoreterm.
- [van der Lugt m.fl. (2026), DOI 10.1029/2025JC023311](https://doi.org/10.1029/2025JC023311) observerede på en lavenergi-strand, at middelstrømmen i det bølgepåvirkede bundgrænselag til tider havde modsat retning af middelstrømmen højere i vandsøjlen, og at bølgeasymmetri samt fasekobling var nødvendige for at gengive tværkyst bedload-retning. Studiets sandtransport er ikke ravkalibrering, men er et direkte modeksempel til at bruge RavRadars ydre gridstrøm som fortegn for den sidste bundnære strækning.
- [Aagaard m.fl. (2018), DOI 10.1029/2018JF004636](https://doi.org/10.1029/2018JF004636) observerede ved Vejers bølgebrydning og samtidig netto landværts sandtransport med landværts migration af en intertidal revle. Sand er ikke rav, men feltresultatet er et direkte dansk modeksempel til reglen “brydning eller returstrøm betyder altid netto udtransport”.
- [Moulton m.fl. (2017), DOI 10.1002/2016JC012222](https://doi.org/10.1002/2016JC012222) knytter rip-/undertowfeltet til lokal revle-/kanalgeometri, bølgebrydning, setup og batymetri. Resultatet afviser modelgridstrøm som stedfortræder for lokal surfzonecirkulation.
- [Haller m.fl. (2002), DOI 10.1029/2001JC000955](https://doi.org/10.1029/2001JC000955) er et laboratorieforsøg på en fast revlestrand med periodiske ripkanaler. Det dokumenterer morfologiafhængig bølgebrydning, feederstrømme og ripcirkulation, men er ikke feltbevis for en lavvandsregel.
- [Mouragues m.fl. (2020), DOI 10.1029/2020JC016259](https://doi.org/10.1029/2020JC016259) er et treugers feltstudie på en bestemt revle-/forbjergskyst. En deflektions-rip kunne være stærkest omkring lavvande under moderate bølger, mens andre bølgeretninger gav landværts flow eller lokale hvirvler. Vandstand kan altså ændre lokal eksport sammen med morfologi og bølgefelt, men giver ingen universel regel.
- [Jalón-Rojas m.fl. (2025), DOI 10.5194/gmd-18-319-2025](https://doi.org/10.5194/gmd-18-319-2025) brugte en bølgeopløst 2DV-partikelmodel og viste, at vertikal position, densitet og stigende/synkende adfærd ændrer eksponeringen for landværts Stokes-drift, bølgeasymmetri og søværts undertow. Mikropartiklerne er analogi, ikke ravkalibrering.
- [Rainville m.fl. (2026), DOI 10.1029/2025JC022422](https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2025JC022422) viste stærk landværts surfing/stranding for positivt flydende overfladedriftere og svag undertow ved overfladen. Det er kun procesanalogi: negativt flydende rav med mulig bundkontakt må ikke ommærkes til overfladedrifter, og studiet kan hverken kalibrere den danske 0–15 %-prior eller gøre det uopløste fysiske leveringsled `resolved`.
- [Lofty m.fl. (2023), DOI 10.1016/j.watres.2023.120329](https://doi.org/10.1016/j.watres.2023.120329) målte 5 mm-rav til cirka 1 041 kg/m³ og fulgte rav som lavdensitets naturlig partikel i bedload-/saltationsforsøg. Det viser, at rav ikke generelt kan behandles som en frit flydende overfladetracer; åbent-kanal-forsøget fastsætter dog ingen dansk surfzonefunktion.
- [Chubarenko og Stepanova (2017), DOI 10.1016/j.envpol.2017.01.085](https://doi.org/10.1016/j.envpol.2017.01.085) angiver baltisk rav omkring 1,05–1,10 g/cm³, normalt synkende i vand, og opstiller fælles vind-, bølge-, strøm- og roll-processer samt gentagen migration mellem strand og undervandsskråning med mulig tilbageførsel over dage som hypotese. Systematisk feltkalibrering af ravmigration mangler.
- [Ocean Science 16 (2020), DOI 10.5194/os-16-1491-2020](https://doi.org/10.5194/os-16-1491-2020) behandler rav som negativt flydende bed-stock og knytter mobilisering til en Shields-lignende tærskel. Det støtter procesopdelingen, ikke en dansk tærskel, last-mile-faktor eller fundpræcision.
- [DMI WAM](https://www.dmi.dk/friedata/dokumentation/data/forecast-data-wave-model-wam) er en spektral bølgemodel med cirka 1 km DW-grid og 5 km NSB-grid. Dybden er konstant gennem et modelrun, og produktbeskrivelsen angiver hverken current interaction eller tide-/stormflodsvandstand som bølgeeffekt. WAM er derfor offshore/nearshore forcing — ikke en bølgeopløst surfzoneresolver.
- [EMODnet Bathymetry DTM 2024](https://emodnet.ec.europa.eu/en/bathymetry) har 1/16 arc-minute grid, omtrent 70 × 115 m i Danmark, og medfølgende kilde-/interpolationsusikkerhed. Det kan supplere statisk strukturkontekst, men viser ikke dynamiske sandrevler eller aktuelle ripkanaler.

Kilderne støtter den tosidede og stedafhængige konklusion, ikke et universelt fortegn. Søværts bevægelse kan være et led i gentagen migration og mulig senere tilbageførsel og beviser derfor ikke, at alt rav er væk. Hverken gridstrøm, vandstand eller bølger alene kan afgøre nettoretningen. En numerisk last-mile-faktor kræver lokal batymetri, bølgeopløst brydning/cirkulation, relevante tidsfrekvenser og et valideret ravspecifikt partikel-/retentionsled, som RavRadar ikke har. Vandstand har 0 direkte scorepoint.

[Geodatastyrelsens Danmarks Dybdemodel 2024/v2](https://gst.dk/ansvarsomraader/soekort-og-marine-data/soeopmaaling-og-dybdedata/danmarks-dybdemodel) leverer et 50 × 50 m middel-dybdegrid med dybde-, kilde- og opmålingsårslag i GeoTIFF/WMS. Modellen prioriterer moderne søopmåling og tilføjede i 2024 også lavtvandsdata fra satellit/lidar; fravalget må derfor ikke begrundes med, at DDM ingen lavtvandsdata har. Men celler med utilstrækkeligt grundlag er interpolerede, kystlinjen er generaliseret 1:100.000, og produktet er et statisk middelgrid uden dynamiske revler, aktuelle ripkanaler eller bølgeopløst surfzone. DDM og det grovere EMODnet 2024-grid kan derfor være senere strukturkontekst, men er utilstrækkelige til aktiv zonetime-score. De aktiveres ikke som scoreinput i state-6-kandidaten. Eksisterende hav-/landpunkter og den kystnormal, som deres vigtigste retningsfunktion afhænger af, ændres ikke.

## 7. Jagtbarhed

Jagtbarhed bevarer de eksisterende strandkurver og den vindledte waderskontrakt:

- Strand kombinerer vind og bølger gennem den eksisterende minimum-/vægtede struktur.
- Waders vægter vind med 80 % og bølgestraf med højst 20 %.
- Waders har fuld vindscore til 6 m/s og nul ved 15 m/s.
- Waders-slutscoren begrænses af søgeforholdene som en metode-/effektivitetskontrakt; det er ikke en sikkerhedsmekanisme eller sikkerhedsgodkendelse.
- Vandstand har nul direkte scoreeffekt.

Både vindhastighed og bølgehøjde skal være endelige, ikke-negative tal. Mangler et obligatorisk input, fejler beregningen lukket i stedet for at levere en misvisende score.

## 8. Forklaring og usikkerhed

Forklaringsskemaet `ravscore-explanation-integrated-bounds-v5` skal mindst kunne skelne mellem:

- faktisk strømtransport og dens retning,
- bølgeenergiens mobilisering,
- kausal energivægtet bølgeaktivitet med fire timers halveringstid og en ældre hale, landværts approach, bounded faktor og retningskoherens,
- strandens eller waders’ jagtbarhed,
- `FULL_HISTORY`, `HISTORY_INCOMPLETE` og `UNAVAILABLE`, inklusive `scoreLower`, `scoreUpper`, coverage, reason-id'er og kalibreringsstatus,
- direkte missing, historikmissing, hold og migrationsstatus som forskellige tilstande,
- strukturel last-mile-usikkerhed,
- manglende lokal batymetri og opløst surfzone,
- og at den lokale ravbeholdning ikke observeres.

Lav modelconfidence er forventet for last mile og er en sand egenskab ved modellen, ikke en midlertidig UI-fejl.

## 9. Bedste tidspunkt, rangering og præsentation

- Aktuelle ranglister følger `direction-broad-19-history-tie-v2`: numerisk score er altid første nøgle; kun ved eksakt scorelighed vinder `FULL_HISTORY` over `HISTORY_INCOMPLETE`, hvorefter den eksisterende retnings-/områdeorden anvendes.
- Bedste tidspunkt følger `score-history-water-tie-earliest-v3`: højeste numeriske RavScore først; kun ved eksakt scorelighed foretrækkes `FULL_HISTORY`; derefter brydes waders-lighed med lavere vandstand, ikke-stigende fremadrettet 3-timers modelændring og tidligste tidspunkt. Strand vælger tidligste efter samme score-/historikkvalitetsrækkefølge.
- Udvælgelsen returnerer den eksakte afgørende regel. Lavere vand mellem samme RavScore er alene en søgbarhedsprioritet, fordi et mindre eller mere blotlagt område kan være lettere at afsøge; det betyder ikke mere rav og er ikke en sikkerhedsvurdering.
- Vandstandens scoreeffekt er fortsat nul.
- Præsentationsgrænserne er 0/35/55/75 og “exceptional” fra 90.

Disse politikker er del af modelbindingen og skal være ens i startup, detaljer, femdøgn, ranglister, lokale svar, Edge-svar, admin og lagrede ture/observationer.

## 10. State, migration og rollback

### 10.1 Schema 6 continuation-state

Schema 6 holder den minimale afledte state, der skal til for deterministisk fortsættelse af nedre/øvre strøm-, mobiliserings- og kausal wave-approach-state. Hver state og checkpointet bindes til den fulde 11-felts modelbinding, inklusive `modelContractSha256` og `modelBundleSha256`. Den må kun bære afledte bounds, coverage, reason-id'er og retningsmomenter — aldrig rå vejrserier, rå U/V, offentliggjorte private koordinater eller fulde scorepayloads.

Continuation-checkpointet:

- har atomisk checkpointschema 4 med 673 schema-6-stateposter og en parret Candidate G-companion schema 1, status `ravscore-schema6-with-candidate-g-rollback-companion`, companionstatus `candidate-g-rollback-ready-companion` og cachepolicy `ravscore-continuation-schema6-v2`,
- er bundet til den aktive schema-6-state og dens eksakte checkpointkontrakt,
- forventer alle 673 kystdele,
- er højst 72 timer gammelt,
- accepterer kun præcist allowlistede felter,
- kan ligge i privat Actions-cache og beskyttet `admin_documents` under `ravscore-continuation-checkpoint`,
- valideres før både publicering og restore,
- logger ikke payloadindhold,
- fejler lukket, hvis et tilstedeværende checkpoint er ugyldigt, inkompatibelt eller fremtidigt; et strukturelt gyldigt same-model-checkpoint ældre end 72 timer installerer ingen schema-6-continuation og tæller som fraværende for bounded cold start, men bevarer sin særskilt verificerede READY Candidate G-companion til manuel helrollback.
- kræver ved same-reference publish/restore, at både `generationSha256` og hele den validerede `candidateGRollbackCompanion` er ækvivalente før mutation; divergens stopper fail-closed og bevarer eksisterende state.

### 10.2 Migration

`candidate-g-schema2-signed-current-reweight-bounded40h-wave-approach-to-integrated-schema6-v5` importerer kun kompatibel Candidate G/schema-2-state. Den signerede, allerede afledte kystnormale current-evidens valideres mod Candidate G's state key og genvægtes gennem den integrerede currentkerne. Migrationen læser eller kopierer ikke rå U/V og hævder derfor heller ikke lighed med en genberegning fra rå strømvektorer.

`integrated-schema5-ready-point-to-schema6-history-bounds-v1` er den eneste schema-5-kilde. Den accepterer kun en eksakt `READY`-state fra den historiske, aldrig offentlige state-5-releasekandidat med de to kendte v4-hashes og migrerer den deterministisk til schema 6. Schema 5 er ikke aktiv state, cache eller checkpoint og må ikke bruges som en generel kompatibilitetsvej.

Wave-approach-state findes ikke i schema 2. Den genopbygges fra 40 private præ-target-timepositioner med same-cell native provenance fra ét sammenhængende DMI WAM-run pr. anvendt collection. Den udeladte ældre EWMA-hale er højst `1/1024`; den konservative afledte rå-scorefejl er højst `0.01171875` point før afrunding. En manglende WAM-time må kun interpoleres mellem to native endepunkter højst fire timer fra hinanden, når run, collection, gitter og celle er identiske. Cross-run-, cross-cell- eller tvetydig retningsinterpolation afvises.

Før acquisition valideres alle præcis 673 Candidate G-states mod det eksakte isolerede offentlige kilderegister, mens det separat materialiserede aktive register validerer den aktuelle samplingkontekst. Er alle kildestates kanoniske `READY`, deler ét fælles target, og konteksterne er identiske, vælges `candidate-g-migration`. Er alle kildestates fortsat kanoniske og source-attesterede, men mindst én har legitim warmup/missing-status, eller source→active-konteksten er legitimt ændret, vælges samlet `genuine-cold-start` ved produktionens target. Malformed/reconstructed/tampered/fremtidig state, ukendt status, identity-/populationsmismatch eller uattesteret cold-start stopper fail-closed, så Candidate G forbliver offentlig. Ingen syntetisk eller offentlig historik dannes. Recoveryprioriteten er eksakt point-aktivering → gyldig integreret continuation fra den private runtime → gyldigt integreret checkpoint → den aggregate-attesterede engangsgren. En ugyldig point-aktivering stopper straks. En ugyldig ordinær statekandidat må ikke skygge for en gyldig kilde med lavere prioritet; hvis der kun findes ugyldige kilder, fejler recovery lukket.

Det historiske 40-timers migrationsrun og det aktuelle operationelle forecastrun er to særskilte, hver for sig sammenhængende beviser. [DMI's STAC-kontrakt](https://www.dmi.dk/friedata/dokumentation/forecast-data-stac-api) dokumenterer `modelRun`-filter, 48 timers run-retention, WAM til `+132 h` og kontrol af downloadens byteantal mod `Content-Length`; [WAM-beskrivelsen](https://www.dmi.dk/friedata/dokumentation/data/forecast-data-wave-model-wam) angiver fire runs pr. døgn, 5½ døgn og timeopløsning. Koden begrænser derfor lead til `+132 h` og vælger pr. collection et kausalt operationelt run, som både indeholder den eksakte 1–4-timers lagbro fra migrationens bootstrap-target til `productionTarget` og hele produktionens 118-timershorisont `productionTarget..productionTarget+117 h`. [DMI's availability-oversigt](https://www.dmi.dk/friedata/dokumentation/data/forecast-data-availability) angiver typisk komplet NSB omkring `+2:45` og DW omkring `+3:00`; tiderne styrer forventet tilgængelighed, men må aldrig erstatte faktisk run-, byte-, lag- eller dækningsvalidering. Hvis et sådant operationelt run ikke kan skaffes, bliver Candidate G offentlig, og transitionen begynder ikke.

### 10.3 Rollback

`integrated-schema6-to-candidate-g-schema2-v3` bevarer en separat Candidate G-kompatibel rollbackgren. Den varme projektion ligger som `ravScoreCandidateGRollback` i den beskyttede fulde runtimebundle. Checkpoint-only recovery kræver desuden en særskilt beskyttet Candidate G-rollback-companion fra samme READY-generation, kryptografisk parret med checkpointets generation, target, 673/673 og fulde bindingshashes. Companionen må aldrig rekonstrueres fra `HISTORY_INCOMPLETE` state 6. Mismatch eller fravær stopper cutover-/rollback-readiness. Grenen bruges ikke i den nye score og kopieres aldrig til Pages, en offentlig shadowmodel eller en automatisk fallback. Ved aggregate-attesteret genuine cold start bygges rollbackgrenen eksklusivt fra sit eget faktisk målte replay; den må ikke hybridiseres med en continuation. Den samme virkelige targetrække behandles på samme targettid i begge spor uden dobbelt tidskredit, og rollbackgrenen skal selv nå `READY`, før checkpoint/cutover kan passere.

Kun mens controlleren udfører en eksplicit manuel Candidate G-rollback må en eksakt navngiven `READY`/`memoryReady` Candidate G-runtime projicere sin egen mode-score som `FULL_HISTORY` med `scoreSemantics=EXACT_POINT_SCORE`, `lower=upper=score`, span 0, 48 timers coverage, tomme reason-koder og ingen conservative reset. Candidate G ejer både scoren og kvalitetsprojektionen; ingen integreret state ommærkes. Binding, generation, target og hashes skal matche, ellers stopper projektionen. `calibrationEligible=false` er en uafhængig modelstatusgrænse og forbliver falsk, så turen kan gemmes uden at blive kalibreringsgrundlag.

Operationelle skift styres af controllerdokumentet `ravscore-operational-model-activation`, schema `ravscore-operational-model-activation-v4`, og versions-CAS. Statusserne er `INTEGRATED_ACTIVE`, `CANDIDATE_G_PENDING`, `CANDIDATE_G_ACTIVE` og `INTEGRATED_PENDING`; overgangstyperne er `CANDIDATE_G_ROLLBACK`, `CANDIDATE_G_REFRESH`, `CANDIDATE_G_REFRESH_BEFORE_INITIAL_CUTOVER`, `LEGACY_CANDIDATE_G_REFRESH_BEFORE_INITIAL_CUTOVER`, `INTEGRATED_RETURN` og `INITIAL_INTEGRATED_CUTOVER`. Den vedvarende 30-feltskontrakt binder kilde-, aktiv- og anmodet 11-feltsmodelbinding, kilde-/målmanifesthash, `sourceImplementationClosureSha256`/`requestedImplementationClosureSha256`, deploy-id'er, privat plan/bundle, dataset/reference, tilladelsesflag, tidsstempler og afgrænset fejlstatus.

Alle skift er tofaset: observer kildens kanoniske Pages-manifest, skriv `PENDING` atomisk mens central profil fortsat peger på kilden, deploy målets Pages-artifact, verificér eksakt implementeringsbinding og 210/673, og brug derefter én service-role-RPC til samtidigt at sætte målets `ACTIVE`-status og målets centrale 11-feltsprofil. Ved retry fuldføres kun, hvis live manifest matcher målet; live kildehash aborterer/rekonsoliderer til kildens `ACTIVE`-status med bevaret kildeprofil; en tredje hash efterlader `PENDING` og stopper fail-closed.

Candidate G-rollback (`CANDIDATE_G_ROLLBACK`) og integreret tilbagevenden (`INTEGRATED_RETURN`) er manual-only. Første `INITIAL_INTEGRATED_CUTOVER` er push-only. Fra rowless exact legacyprofil er scheduler/manuelt vejr reachable gennem action `candidate-legacy-maintenance` og `LEGACY_CANDIDATE_G_REFRESH_BEFORE_INITIAL_CUTOVER`, aldrig gennem integreret PENDING. Efter legacybroens complete fortsætter samme marker med exact current Candidate-binding og fire `null`-returnfelter; den må kun arves, ikke relabeles. Et selvstændigt sikkert afbrudt initialt integreret forsøg bruger derimod `CANDIDATE_G_REFRESH_BEFORE_INITIAL_CUTOVER` med fire forseglede return-evidence-hashes. Normal allerede aktiv drift bruger `CANDIDATE_G_REFRESH`. I alle tilfælde følger `legacySourceRequired` den faktiske sourcebinding. Scheduleren må aldrig skrive `INTEGRATED_PENDING`, aktivere state 6, rulle tilbage eller returnere en model. Rollbackplanens `calibrationEligible` er `false`, og persistente schema-3-ture/-observationer er Candidate G-bundne med `calibration_eligible=false`. 4.0.319's særskilte Candidate G-binding er `modelContractSha256=c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8` og `modelBundleSha256=4ccc2081982677aadbb47a5ee7d6f2b99fdcb7e42113e73029d5c60323a5ee96` over 55 filer.

## 11. Privat runtime og øjeblikkelig køreklarhed

Den fulde produktionshistorik er privat og håndteres af en versioneret privat bundle. Workflowet kan restore allerede hentet og valideret historik før build, så modellen ikke behøver flere dages ny cacheopbygning efter cutover. Den varme Candidate G-rollbackprojektion og den checkpointparrede READY-companion er beskyttede private aktiver, aldrig del af den offentlige filinventory.

Hvis ingen statekilde er til stede for en kystdel, bruger produktionsstien `bounded-private-48h-history-cold-replay-v3` og genafspiller så meget af den allerede hentede, private og proveniensverificerede historik som findes før den virkelige targetrække. Lineage fastlåser `expectedCausalPositionCount=48`, den faktiske `completeCausalPositionCount`, `boundedUnknownPositionCount` og `historyTransition`: 48/48 mærkes `VERIFIED_CAUSAL_HISTORY_WINDOW`, mens ethvert kortere/gappet forløb mærkes `UNKNOWN_HISTORY_INTERVAL`. En 0–48-timers state-løs replay giver fortsat `HISTORY_INCOMPLETE`, selv med alle 48 currenttimer: currentvinduet er da fuldt, og 40-timers last-mile-sporet kan være konservativt lukket, men den ukendte bølgemobiliseringshale lukkes først efter 288 timers kausal recovery. `FULL_HISTORY` opnås derfor først efter den 288-timers konservative tail reset eller fra en eksakt attestert migration/continuation. Hullet eller den korte historik giver omsluttende bounds, så længe alle direkte targetinput er gyldige; der opfindes ingen række, og prognosen forsvinder ikke. Genuine cold start accepterer kun eksakte native WAM-timer (`maxInterpolationHours=0`); cross-run, cross-cell, interpolerede, syntetiske eller offentlige pre-target-rækker afvises. Den afgrænsede højst fire timers WAM-interpolation hører alene til migration/generisk acquisition. Et manglende eller ugyldigt direkte input giver `UNAVAILABLE`. Candidate G-rollback bruger samme targettid og samme virkelige targetrække uden dobbelt credit.

Den private bundle har:

- schema `1.0.0` og kind `RAVRADAR_PRIVATE_PRODUCTION_RUNTIME_BUNDLE`,
- præcis forventning om 210 zoner og 673 kystdele,
- hashes for fortsættelse, fuld runtime og offentlig projektion,
- canonical manifest- og filhashes,
- sti- og symlinkværn,
- atomisk create, verify, restore og installation,
- en eksplicit otte-fils allowlist for fulde conditions, DMI forecast-/bulkcaches, den forseglede private Copernicus-current-range-cache, aktuel pilot history, weather health, runtime diagnostics og DMI-vandstandsstationer.

Den fulde komprimerede bundle ligger ikke i repository, Pages eller en delt Actions-cache. Den opbevares i den private Supabase Storage-bucket `ravradar-private-production-runtime` med service-role-adgang. Det beskyttede pointerdokument `ravscore-private-production-runtime-pointer` holder højst den aktuelle og den foregående kontrollerede generation, så restore kan vælge nyeste kompatible generation og en eksplicit rollbackgeneration uden at gøre Candidate G til offentlig fallback. Anonym bucketadgang skal afvises før deploy.

Private filer installeres aldrig i Pages-artifactet. Hvis bundlen eller checkpointet er inkompatibelt med den kørende modelbinding, skal workflowet stoppe.

## 12. Offentlig manifest-schema-4-projektion

Den offentlige runtimekontrakt har version `1.0.0`, startup- og detailprojektioner samt et manifest i schema 4. De eksisterende offentlige dokumenters indholdsskemaer er startup schema 3 og details schema 2; manifest schema 4 binder dem til den integrerede model. Det offentlige manifestnummer er uafhængigt af continuation-state `6.0.0`.

Pages-artifactet må kun installere disse livefiler:

1. `data/live/manifest.json`,
2. `data/live/public-conditions.json`,
3. `data/live/public-condition-details.json`,
4. `data/live/coastal-parts-v2.json`.

Manifestet binder dataset/reference, modelbinding, fil- og body-hashes samt byteantal. Privacy-audit afviser blandt andet state/evidens, rå U/V, private filstier, private caches/checkpoints og fremmede modelbindinger. Eksisterende, udtrykkeligt allowlistede offentlige kystdel-/flowpointfelter kontrolleres af den offentlige kontrakt; designet påstår derfor ikke et generelt koordinatforbud.

### 12.1 Samme-model nødtilstand og evidenstillid

En ufuldstændig ny primary må ikke erstatte den seneste komplette pakke. Browseren kan bruge den seneste komplette, hashverificerede 210/673-pakke, men kun under nøjagtig samme 11-felts modelbinding og kun ved at vælge den virkelige time på pakkens eksisterende 118-timers akse. Nødtilstanden udløber ved den korteste af 72 timer siden generering og pakkens egen `validUntil`. Der interpoleres ikke, prognosen relabeles ikke, og Candidate G eller en anden model aktiveres ikke automatisk.

Hele fire-filersættet vælges atomisk. DA/DE/EN viser en aktualitetsadvarsel, og en ny komplet primary overtager automatisk. `public-emergency-last-complete` gør tilknyttede ture `calibration_eligible=false`.

Den normale målte trust er den eksakte `VERIFIED_ONLY`-kontrakt. `RECONSTRUCTED_DERIVED_NOT_MEASURED`, ældre `ravscore-evidence-trust-unattested`, emergency og ukendt/tampered trust er aldrig kalibreringsegnede eller hårdt observeret udtransportbevis. Ejeren opgav udførelsen af DEC-0109's engangsrekonstruktion før apply/mutation/publicering. Den afgrænsede incidentkode og dens tests bevares som regression for provenance, rollback, cleanup og privacy; den må ikke blive en normal recoveryvej for den integrerede model.

## 13. Offentlig model- og forbrugerarkitektur

Candidate G er eneste offentlige model under udviklingen. Den integrerede kandidat må kun sammenlignes offline, indtil hele producent-/forbrugerkæden er klar til atomisk cutover.

Det offentlige datasæt `rr-20260830091913-210` havde frisk reference, 210 zoner og 673 kystdele, men Candidate G gav 0 aktive zoner og 210 `unavailable`, fordi ingen af de 673 dele havde tilstrækkelig sammenhængende strømhistorik. Det er konkret regressionsevidens for behovet for state-6-kontrakten. Det er ikke offentlig verifikation af state 6, som endnu ikke var udgivet i datasættet.

Efter cutover er der fortsat én offentlig RavScore-model. Den tidligere adaptive model er fjernet fra den offentlige runtime og må ikke beregne offentlig score, fundchance, model-id eller forklaring. Historisk/intern kode og regressionsfixtures kan bevares, hvis de ikke bliver en alternativ offentlig model.

Alle adapters og projektioner for startup, detaljer, ranglister, bedste tidspunkt, femdøgn, sprog, Spørg RavRadar, konto/tur/observation, admin, ekspertflader og håndbøger hører til denne samlede leverance.

### 13.1 Observationsatomisk cutover på tværs af backend, Edge og Pages

De tre deployflader deler ikke én fysisk transaktion. Cutoveret gennemføres derfor som en låst tofaset overgang:

1. **Forberedelse uden offentligt modelskift:** `20260829010000_ravscore_operational_documents_no_history.sql` etablerer private driftsdokumenter/bucket og stopper fremtidig versionskopiering for de allowlistede operationelle dokumenter. Den bevarer alle eksisterende `admin_document_versions`-rækker og udfører ingen destruktiv oprydning. Først derefter anvendes `20260829020000_integrated_trip_calibration_binding.sql` for schema-3-tur-/kalibreringsbindingen. Efter migrationshistorik og dry-run genhenter `deploy-trip-storage` `origin/main` og kræver `origin/main == GITHUB_SHA` umiddelbart før første eksterne backendskrivning; resten af skriverækken fortsætter fra samme validerede checkout og migrationssnapshot. Protected readiness binder begge migrations-id'er og skrives først efter samlet migrationsmetadata-, database- og Edge-readback. Backend og Edge gøres bindingsbevidste og verificeres mod både den fortsat offentlige Candidate G-klient og den kommende integrerede klient. De må aldrig ommærke eller blande modeller. Ved manglende eller forkert modelbinding svarer den nye Edge eksakt HTTP `409`; en gammel klient fortsætter da på sin lokale Candidate G i stedet for at få et blandet serversvar.
2. **Én offentlig aktivering:** den integrerede runtime vælges eksklusivt fra point-aktivering → gyldig bundle → gyldigt checkpoint → engangs-Candidate G-import. Exact-head-artifactet valideres, og controlleren observerer den forseglede Candidate G-kildes manifest og implementation closure før den atomisk skriver `INTEGRATED_PENDING` med `transitionKind=INITIAL_INTEGRATED_CUTOVER` og eksakte kilde-/målhashes. Direkte rowless legacy-start bruger `expectedVersion=0`/`legacySourceRequired=true`; efter bridge-complete bruges den aktive current Candidate-marker, den aktuelle centrale CAS-version og `legacySourceRequired=false`. Den centrale profil bevares som den valgte Candidate G-kilde, mens det integrerede Pages-artifact publiceres. Efter eksakt offentlig implementerings- og 210/673-verifikation sætter én service-role-RPC samtidigt `INTEGRATED_ACTIVE` og den integrerede centrale 11-feltsprofil. Første cutover er push-only.
3. **Deterministisk resume/reconcile:** ved crash eller retry betyder live målmanifest fuld genverifikation og CAS-complete; live kildemanifest betyder abort/rekonsolidering til kildens `ACTIVE`-status med kildens centrale profil; enhver tredje hash bevarer `PENDING` og blokerer normal drift. Samme mekanik bruges ved manuel Candidate G-rollback og manuel integreret tilbagevenden. Assistentens integrerede Edge-funktion rulles ikke tilbage til en særskilt Candidate G-version.

Ved operationel Candidate G-rollback bærer Pages-klienten den eksakte Candidate G-binding. Assistentens fortsat integrerede Edge-funktion afviser den binding med eksakt HTTP `409`, og klienten bruger de eksisterende deterministiske lokale svar på dansk, tysk eller engelsk. Schema-3-ture kan fortsat lagres Candidate G-bundet, men altid med `calibration_eligible=false`. Denne local-only assistentadfærd er fail-closed; den er ikke en skjult dualmodel eller serverbaseret Candidate G-fallback.

To migrationsfiler må ikke dele samme versionsprefix. Den besluttede rækkefølge ligger i de to eksakte monotone versionsidentiteter og kontrolleres før management-deploy. Den midlertidige backendkompatibilitet er en protokolbro, ikke en offentlig shadowscore: hvert request accepteres kun med den fulde modelbinding fra sit eget offentlige datasæt.

## 14. Testbare invariants

Den integrerede kandidat er ikke klar, medmindre mindst disse egenskaber holder:

1. Samme strøm-, mobiliserings- og wave-approach-state giver samme resultat på tværs af generator og offentlige projektioner.
2. `deliveryPotential === transportPotential × factor`, hvor faktor er 0,85–1 og aldrig anvendes mere end én gang.
3. Aktiv bølgeenergi uden retning fejler lukket. Kun `waveHeightM=0` er eksakt roligt og neutralt; `wavePeriodS` skal stadig være finit og ikke-negativ, mens `waveHeightM>0` med `wavePeriodS=0` er `INVALID`/fail-closed.
4. Der findes intet numerisk fysisk last-mile-interval i aktiv output.
5. Manglende obligatorisk direkte bølge-, vind- eller strømevidens giver `UNAVAILABLE`; manglende historik giver `HISTORY_INCOMPLETE` med scoreLower/scoreUpper og må ikke skjule prognosen.
6. Højst 49 aktuelle strømevidenspunkter accepteres og beholdes under cadencekontrakten.
7. Numerisk score rangeres først, `FULL_HISTORY` bryder kun eksakt scorelighed, og først derefter kan vandstand bryde waders-lighed.
8. Migration og restore skaber ingen offentlig eller syntetisk historik. Candidate G-migrationen bruger 40 private præ-target-positioner fra et sammenhængende same-cell WAM-run med den afgrænsede højst fire timers interpolation; state-løs replay med 0, 5, 47 eller gappede private positioner giver `HISTORY_INCOMPLETE`, mens gyldigt direct input fortsat scorer, og rollbacksporet får ingen dobbelt credit.
9. Bundle-, checkpoint-, state- og offentlige payloads afvises ved forkert model/hash.
10. Pages indeholder kun de fire allowlistede livefiler og ingen private runtimefiler.
11. Offentlige svar og UI kan ikke falde tilbage til en adaptiv offentlig model.
12. Ingen test- eller produkttekst hævder empirisk højere fundpræcision; Rainville 2026 kaldes alene buoyant-object-analogi.
13. Supabase-migrationerne har unikke, monotone versionsidentiteter og anvendes i den besluttede rækkefølge.
14. Gammel klient/ny backend, ny klient/ny backend og rollback af central binding + Candidate G-Pages-overlay kan ikke skabe eller acceptere et blandet offentligt modeludsagn.
15. Gammel klient uden modelbinding får eksakt `409` fra ny Edge og bruger lokal Candidate G; den får aldrig et ommærket eller blandet serversvar.
16. `ravScoreCandidateGRollback` findes kun i beskyttet fuld runtime eller som checkpointparret READY-companion og aldrig i de fire Pages-livefiler; companionen må ikke rekonstrueres fra `HISTORY_INCOMPLETE`.
17. Operational-controlleren accepterer kun de fire låste statusser og overgangstyper; hvert modelskift går source-observation → `PENDING` med bevaret source-profil → Pages-mål → eksakt offentlig verifikation → atomisk `ACTIVE` + central målprofil.
18. Retry kan kun fuldføre ved requested manifesthash, abortere ved source manifesthash eller forblive fail-closed `PENDING` ved en tredje hash. Scheduleren kan kun refreshe allerede aktiv Candidate G, og Candidate G-observationer er ikke kalibreringsegnede.
19. Der findes ingen særskilt Candidate G-Edge-deploy; Candidate G-klienten får `409` fra assistentens integrerede Edge og bruger deterministiske lokale DA/DE/EN-svar.
20. Schema-3-ture under Candidate G-rollback er eksakt Candidate G-bundne. Kun en eksakt `READY`/`memoryReady` Candidate G-ejet mode-score må projiceres som `FULL_HISTORY` + `EXACT_POINT_SCORE` med collapsed bounds/48 timers coverage; `calibration_eligible=false` består separat.
21. Checkpointpublisering sletter ingen `admin_document_versions`; migrationen ændrer kun fremtidig versionskopiering for den operationelle allowlist.
22. Første backendskrivning må kun ske efter en ny exact-main-kontrol efter dry-run; alle post-write-trin bruger samme validerede checkout/snapshot.
23. Samme-model nøddrift kræver én komplet 210/673-pakke, eksakt binding og atomisk firefilvalg, udløber senest efter 72 timer/`validUntil` og gør ture ikke-kalibreringsegnede.
24. DDM er ikke aktivt scoreinput, og ingen geometri, hav-/landpunkter eller kystnormaler flyttes.

## 15. Beslutninger, der bevidst ikke er taget

Følgende er ikke en del af den aktive model:

- en fast `5,25 %` last-mile-faktor,
- et numerisk last-mile-usikkerhedsinterval,
- en antagelse om, at faldende vand altid transporterer rav ud,
- en antagelse om, at faldende vand altid forbedrer retention,
- lokale rip-, feeder-, langskyst- eller undertowfelter uden data,
- en offentlig shadowmodel,
- en adaptiv offentlig fundchance,
- kunstig opbygning af state ved missing eller kold start,
- DDM eller andre statiske dybdeprodukter som skjult surfzone-/revlefacit.

Disse fravalg er nødvendige for at holde modeludsagnene inden for det observerbare datagrundlag.
