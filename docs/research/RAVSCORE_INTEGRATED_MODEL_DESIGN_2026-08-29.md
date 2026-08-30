# RavScore — integreret modeldesign

**Dato:** 2026-08-29

**Status:** Designet beskriver den implementerede kandidatkontrakt; offentlig cutover afventer alle releasegates

**Autoritativ kode:** `js/core/ravscore-model-contract.js` og den integrerede evaluator/stateimplementering

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
| Model-id | `RRS-COASTAL-PROCESS-INTEGRATED-1.0.0` |
| Stateversion | `4.0.0` |
| Variant-id | `COASTAL-SUPPLY-MOBILISATION-STRUCTURAL-LAST-MILE-HUNTABILITY-1` |
| Profil-id | `cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-coldrestart-gapcredit1-lastmileneutral-v3` |
| Komponentskema | `ravscore-components-huntability-transport-mobilisation-v3` |
| Forklaringsskema | `ravscore-explanation-integrated-v3` |
| Rangering | `direction-broad-19-v1` |
| Bedste tidspunkt | `score-water-tie-earliest-v2` |
| Præsentation | `score-bands-35-55-75-exceptional90-v1` |
| Migration | `candidate-g-schema2-to-integrated-schema4-v1` |
| Rollback | `integrated-schema4-to-candidate-g-schema2-v1` |
| Parameterkontrakt | `modelContractSha256`; endelig værdi afventer regeneration på afsluttet head |
| Transitiv implementeringsbundle | `modelBundleSha256`; endelig værdi afventer regeneration over 34+ kanonisk normaliserede transitive implementeringsfiler |

Den serialiserede runtimebinding følger state, checkpoints, central profilselection, offentlige payloads, ture/observationer, releasegates og forklaringer. Den består af model-, state-, variant-, profil-, komponent-, forklarings-, rangerings-, best-time- og præsentations-id samt både `modelContractSha256` og `modelBundleSha256`: 11 felter i alt. Den første hash binder parameterkontrakten; den anden binder den transitive implementeringslukning. Hver continuation-state, hvert checkpoint og den centrale profilselection skal bære og matche alle 11 felter. Migration og rollback er særskilte overgangskontrakter. Et match på model-id eller én hash alene er ikke nok.

## 3. Samlet score

For hvert tidspunkt og hver visning beregnes:

```text
rawScore =
  0,20 × huntability
  + 0,50 × transportPotential
  + 0,30 × mobilisationPotential
```

Alle tre komponenter ligger på skalaen 0–100. Den afrundede slutscore begrænses til 0–100. Wadersvisningen anvender desuden den eksisterende søgeforholds-/metodecap; den er ikke sikkerhedsråd. Strand og waders er to projektioner af samme modeltilstand og modelbinding.

Vægtene 20/50/30 bevares, fordi den integrerede offline-følsomhed ikke gav grundlag for at erstatte dem. Det er en modelprior, ikke en fundkalibreret sandhed.

### 3.1 Additivt indeks, ukendt lager og transport 0

Formlen er et additivt evidensindeks, ikke en seriel massebalance. `mobilisationPotential` betyder derfor en **betinget mulighed** for, at allerede tilgængeligt materiale kan være mobiliseret; komponenten må ikke læses som et observeret eller estimeret lokalt ravlager. `transportPotential` er tilsvarende den verificerede aktuelle strømtilførselskomponent, ikke en måling af alt rav, der kan ligge lokalt, bag revler eller i en sekundær beholdning.

En klar, verificeret `transportPotential = 0` er ikke det samme som manglende strømdata. Manglende eller ikke-klar strømstate gør hele scoren utilgængelig. Ved en **klar nulværdi** kan jagtbarhed og den betingede mobiliseringsmulighed fortsat bidrage, men 20/50/30 giver et matematisk loft på `20 + 30 = 50`. En sådan score kan derfor kun ligge i præsentationsbåndet dårlig eller højst svag; den kan aldrig blive middel eller god. Waders-cappen kan reducere loftet yderligere.

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

[DMI beskriver DKSS](https://www.dmi.dk/friedata/dokumentation/data/forecast-data-storm-surge-model-dkss) som en tredimensional HBM-cirkulationsmodel, der er atmosfærisk tvunget, har tidevands-sealevel ved de åbne rande og leverer current-U/V i modellag. [Copernicus Baltic NEMO](https://data.marine.copernicus.eu/product/BALTICSEA_ANALYSISFORECAST_PHY_003_006/description) leverer ligeledes tredimensionelle hastighedsfelter og skelner blandt andet mellem øjeblikkelige og detidede produkter. Det valgte gridfelt er derfor et samlet fysisk modeludfald, ikke en procesopdeling eller dokumentation af, at hele den lokale vandsøjle bevæger sig ens.

Når provenance har bevist et bestemt U/V-par, er netop dette par den eneste autoritative numeriske strømkilde. Den private state afleder det kystnormale signal direkte og uden 0,01-kvantisering fra dette par og den godkendte kystnormal. Kun den offentlige visningsfart afrundes med `hypot(U,V)` til 0,01 m/s, og movement-toward-retningen afrundes fra samme par; en afrundet `360°` normaliseres til `0°`. Parallelle cachefelter for fart eller retning kan være stale eller modstridende og må derfor ikke overstyre det beviste par. Rå U/V forlader ikke den private producent eller den envejshashede recoverykontrol.

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

Bølger kan mobilisere materiale, men kan ikke skabe et ikke-observeret ravlager. Mobiliseringskomponenten er derfor udtrykkeligt betinget af, at materiale faktisk er tilgængeligt, uden at modellen forsøger at sætte en numerisk lagerprior. Retning bruges ikke som last-mile-scorekorrektion i den aktive kontrakt.

Samme bølgehøjde bruges også i jagtbarhed, men til et andet kausalt spørgsmål. Den tidslige `Hs² × T`-state repræsenterer, om allerede tilgængeligt rav kan være sat i bevægelse og bidrager gennem modellens 30 %-mobiliseringsled. Den aktuelle bølgehøjde i jagtbarhed beskriver derimod metode-/sigtbarhed: ved waders kan den kun reducere vindscoren blødt, og strand bruger den eksisterende søgeforholdskurve. Jagtbarhedsvejen bygger ikke mobiliseringsstate og giver ingen transport- eller last-mile-kredit. En ru sø kan således samtidig øge fysisk mobilisering og gøre søgning sværere; det er to adskilte udfald, ikke samme positive procesbidrag to gange.

## 6. Last mile: strukturelt uopløst og score-neutral

Den implementerede policy er `last-mile-score-neutral-structural-uncertainty-v2`:

```text
delivery = transportPotential × 1
```

Det giver følgende invariants:

- `deliveryFactor` er altid 1,
- `delivery` er identisk med `transportPotential`,
- scoreeffekten er `NONE`,
- ydre bølge-/retningkontekst ændrer ikke scoren,
- manglende retning ændrer ikke scoren, men markeres som retningsusikkerhed,
- `physicalDeliveryResolved` er falsk,
- strukturel last-mile-usikkerhed er altid sand,
- et numerisk fysisk usikkerhedsinterval leveres ikke; værdien er `null`.

Gyldige bølgehøjde- og periodeinput kræves fortsat af mobiliserings- og jagtbarhedskæden. Hvis de mangler, er den samlede score ikke klar. Det må ikke forveksles med, at bølgerne har en selvstændig last-mile-scorefaktor.

### 6.1 Hvorfor faktoren er 1

Faktoren 1 betyder ikke “100 % af ravet når stranden”. Den betyder “ingen estimeret numerisk last-mile-virkning”. En faktor under 1 ville uden lokale procesdata blande transportpotentiale sammen med en uobserveret leveringsandel og give falsk præcision.

Den tidligere `5,25 %`-idé er derfor fjernet fra aktiv kode og design. Offline-audit beholder `0 %`, `5,25 %` og `10 %` som kontrafaktiske følsomhedseksempler for at vise, hvor meget en antaget korrektion kunne flytte slutscoren. `5,25 %` er ikke midpoint, fysisk interval, observation eller anbefalet parameter.

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
- [Aagaard m.fl. (2018), DOI 10.1029/2018JF004636](https://doi.org/10.1029/2018JF004636) observerede ved Vejers bølgebrydning og samtidig netto landværts sandtransport med landværts migration af en intertidal revle. Sand er ikke rav, men feltresultatet er et direkte dansk modeksempel til reglen “brydning eller returstrøm betyder altid netto udtransport”.
- [Moulton m.fl. (2017), DOI 10.1002/2016JC012222](https://doi.org/10.1002/2016JC012222) knytter rip-/undertowfeltet til lokal revle-/kanalgeometri, bølgebrydning, setup og batymetri. Resultatet afviser modelgridstrøm som stedfortræder for lokal surfzonecirkulation.
- [Haller m.fl. (2002), DOI 10.1029/2001JC000955](https://doi.org/10.1029/2001JC000955) er et laboratorieforsøg på en fast revlestrand med periodiske ripkanaler. Det dokumenterer morfologiafhængig bølgebrydning, feederstrømme og ripcirkulation, men er ikke feltbevis for en lavvandsregel.
- [Mouragues m.fl. (2020), DOI 10.1029/2020JC016259](https://doi.org/10.1029/2020JC016259) er et treugers feltstudie på en bestemt revle-/forbjergskyst. En deflektions-rip kunne være stærkest omkring lavvande under moderate bølger, mens andre bølgeretninger gav landværts flow eller lokale hvirvler. Vandstand kan altså ændre lokal eksport sammen med morfologi og bølgefelt, men giver ingen universel regel.
- [Jalón-Rojas m.fl. (2025), DOI 10.5194/gmd-18-319-2025](https://doi.org/10.5194/gmd-18-319-2025) brugte en bølgeopløst 2DV-partikelmodel og viste, at vertikal position, densitet og stigende/synkende adfærd ændrer eksponeringen for landværts Stokes-drift, bølgeasymmetri og søværts undertow. Mikropartiklerne er analogi, ikke ravkalibrering.
- [Rainville m.fl. (2026), DOI 10.1029/2025JC022422](https://doi.org/10.1029/2025JC022422) viste, at brydende bølger kan give flydende objekter en særskilt landværts “surfing”-transport ud over almindelig Stokes-drift, og at resultatet afhænger af objektets størrelse, form og opdrift. Det er endnu en grund til ikke at behandle rav som en passiv vandpakke eller udlede nettobanen fra ét strømled alene.
- [Lofty m.fl. (2023), DOI 10.1016/j.watres.2023.120329](https://doi.org/10.1016/j.watres.2023.120329) målte 5 mm-rav til cirka 1 041 kg/m³ og fulgte rav som lavdensitets naturlig partikel i bedload-/saltationsforsøg. Det viser, at rav ikke generelt kan behandles som en frit flydende overfladetracer; åbent-kanal-forsøget fastsætter dog ingen dansk surfzonefunktion.
- [Chubarenko m.fl. (2017), DOI 10.1016/j.envpol.2017.01.085](https://doi.org/10.1016/j.envpol.2017.01.085) understreger manglen på systematisk ravmonitorering og opstiller gentagen migration mellem strand og undervandsskråning med mulig tilbageførsel over dage som hypotese.

Kilderne støtter den tosidede og stedafhængige konklusion, ikke et universelt fortegn. Søværts bevægelse kan være et led i gentagen migration og mulig senere tilbageførsel og beviser derfor ikke, at alt rav er væk. Hverken gridstrøm, vandstand eller bølger alene kan afgøre nettoretningen. En numerisk last-mile-faktor kræver lokal batymetri, bølgeopløst brydning/cirkulation, relevante tidsfrekvenser og et valideret ravspecifikt partikel-/retentionsled, som RavRadar ikke har. Vandstand har 0 direkte scorepoint.

## 7. Jagtbarhed

Jagtbarhed bevarer de eksisterende strandkurver og den vindledte waderskontrakt:

- Strand kombinerer vind og bølger gennem den eksisterende minimum-/vægtede struktur.
- Waders vægter vind med 80 % og bølgestraf med højst 20 %.
- Waders har fuld vindscore til 6 m/s og nul ved 15 m/s.
- Waders-slutscoren begrænses af søgeforholdene som en metode-/effektivitetskontrakt; det er ikke en sikkerhedsmekanisme eller sikkerhedsgodkendelse.
- Vandstand har nul direkte scoreeffekt.

Både vindhastighed og bølgehøjde skal være endelige, ikke-negative tal. Mangler et obligatorisk input, fejler beregningen lukket i stedet for at levere en misvisende score.

## 8. Forklaring og usikkerhed

Forklaringsskemaet `ravscore-explanation-integrated-v3` skal mindst kunne skelne mellem:

- faktisk strømtransport og dens retning,
- bølgeenergiens mobilisering,
- score-neutral last-mile-kontekst,
- strandens eller waders’ jagtbarhed,
- missing-/hold-/migrationsstatus,
- strukturel last-mile-usikkerhed,
- manglende lokal batymetri og opløst surfzone,
- og at den lokale ravbeholdning ikke observeres.

Lav modelconfidence er forventet for last mile og er en sand egenskab ved modellen, ikke en midlertidig UI-fejl.

## 9. Bedste tidspunkt, rangering og præsentation

- Aktuelle ranglister følger `direction-broad-19-v1`.
- Bedste tidspunkt følger højeste RavScore; for waders brydes scorelighed med lavere vandstand, derefter ikke-stigende fremadrettet 3-timers modelændring og derefter tidligste tidspunkt. Strand vælger tidligste ved scorelighed.
- Udvælgelsen returnerer den eksakte afgørende regel. Lavere vand mellem samme RavScore er alene en søgbarhedsprioritet, fordi et mindre eller mere blotlagt område kan være lettere at afsøge; det betyder ikke mere rav og er ikke en sikkerhedsvurdering.
- Vandstandens scoreeffekt er fortsat nul.
- Præsentationsgrænserne er 0/35/55/75 og “exceptional” fra 90.

Disse politikker er del af modelbindingen og skal være ens i startup, detaljer, femdøgn, ranglister, lokale svar, Edge-svar, admin og lagrede ture/observationer.

## 10. State, migration og rollback

### 10.1 Schema 4 continuation-state

Schema 4 holder den minimale afledte state, der skal til for deterministisk fortsættelse. Hver state og checkpointet bindes til den fulde 11-felts modelbinding, inklusive `modelContractSha256` og `modelBundleSha256`. Den må ikke indeholde rå vejrserier, rå U/V, offentliggjorte private koordinater eller fulde scorepayloads.

Continuation-checkpointet:

- har status `ravscore-schema4-compact-continuation`,
- forventer alle 673 kystdele,
- er højst 72 timer gammelt,
- accepterer kun præcist allowlistede felter,
- kan ligge i privat Actions-cache og beskyttet `admin_documents` under `ravscore-continuation-checkpoint`,
- valideres før både publicering og restore,
- logger ikke payloadindhold,
- fejler lukket, hvis et tilstedeværende checkpoint er ugyldigt, fremtidigt eller for gammelt.

### 10.2 Migration

`candidate-g-schema2-to-integrated-schema4-v1` importerer kun kompatibel, allerede afledt Candidate G-state og evidens. Migrationen opfinder ikke timer eller målinger. Recoveryprioriteten er eksakt point-aktivering → gyldig integreret continuation fra den private runtime → gyldigt integreret checkpoint → dybt valideret Candidate G schema-2-state. En ugyldig point-aktivering stopper straks. En ugyldig ordinær statekandidat må ikke skygge for en gyldig kilde med lavere prioritet; hvis der kun findes ugyldige kilder, fejler recovery lukket. Første produktionscutover må kun bruge Candidate G-import, når der hverken findes en gyldig point-aktivering, en gyldig integreret continuation eller et gyldigt integreret checkpoint.

### 10.3 Rollback

`integrated-schema4-to-candidate-g-schema2-v1` bevarer en separat Candidate G-kompatibel rollbackgren. Den varme projektion ligger kun som `ravScoreCandidateGRollback` i den beskyttede fulde runtimebundle. Den gren bruges ikke i den nye score og kopieres aldrig til Pages, en offentlig shadowmodel eller en automatisk fallback.

Operationelle skift styres af controllerdokumentet `ravscore-operational-model-activation`, schema `ravscore-operational-model-activation-v3`, og versions-CAS. Statusserne er `INTEGRATED_ACTIVE`, `CANDIDATE_G_PENDING`, `CANDIDATE_G_ACTIVE` og `INTEGRATED_PENDING`; overgangstyperne er `CANDIDATE_G_ROLLBACK`, `CANDIDATE_G_REFRESH`, `INTEGRATED_RETURN` og `INITIAL_INTEGRATED_CUTOVER`. Den vedvarende kontrakt binder kilde-, aktiv- og anmodet 11-feltsmodelbinding, kilde-/målmanifesthash, deploy-id'er, privat plan/bundle, dataset/reference, tilladelsesflag, tidsstempler og afgrænset fejlstatus.

Alle skift er tofaset: observer kildens kanoniske Pages-manifest, skriv `PENDING` atomisk mens central profil fortsat peger på kilden, deploy målets Pages-artifact, verificér eksakt implementeringsbinding og 210/673, og brug derefter én service-role-RPC til samtidigt at sætte målets `ACTIVE`-status og målets centrale 11-feltsprofil. Ved retry fuldføres kun, hvis live manifest matcher målet; live kildehash aborterer/rekonsoliderer til kildens `ACTIVE`-status med bevaret kildeprofil; en tredje hash efterlader `PENDING` og stopper fail-closed.

Candidate G-rollback (`CANDIDATE_G_ROLLBACK`) og integreret tilbagevenden (`INTEGRATED_RETURN`) er manual-only. Første `INITIAL_INTEGRATED_CUTOVER` er push-only og starter med `expectedVersion=0` fra Candidate-profil uden eksisterende controller-række. Scheduleren må kun udføre `CANDIDATE_G_REFRESH` for en allerede `CANDIDATE_G_ACTIVE` drift med samme eksakte binding; den må ikke aktivere, rulle tilbage eller returnere en model. Rollbackplanens `calibrationEligible` er `false`, og persistente schema-3-ture/-observationer er Candidate G-bundne med `calibration_eligible=false`. Candidate G har sin egen parameterkontrakt-SHA og sin egen transitive implementeringsbundle-SHA; de endelige værdier fastsættes først efter regeneration på afsluttet head.

## 11. Privat runtime og øjeblikkelig køreklarhed

Den fulde produktionshistorik er privat og håndteres af en versioneret privat bundle. Workflowet kan restore allerede hentet og valideret historik før build, så modellen ikke behøver flere dages ny cacheopbygning efter cutover. Den varme Candidate G-rollbackprojektion er et beskyttet felt i den fulde runtime, ikke en del af den offentlige filinventory.

Hvis ingen statekilde er til stede for en kystdel, gennemfører produktionsstien en eksakt, afgrænset koldstartsbro før den første offentlige targettime: præcis de 48 allerede hentede, private og proveniensverificerede kildetimer target−48 h til target−1 h genafspilles med strøm og bølger. For de otte godkendte native 3-timers proxyer må én eksakt, verificeret og dataminimeret prøve umiddelbart før 48-timersranden bruges alene som kontinuitetsbevis, når randen ligger mellem to native prøver. Den giver ingen ekstra bevægelse eller opfundet mellemtime, og alle tre mulige timefaser testes. Offentlige eller syntetiske rækker før target filtreres væk og kan ikke fungere som historik; kun target og senere offentlige rækker scores. Komplette data giver `READY` ved første offentlige target. En manglende eller ugyldig kilde fejler lukket med `RAVSCORE_RECOVERY_REPLAY_BRIDGE_MISSING`, så ingen kystdel udgives med en ny 48-timers offentlig opvarmning.

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

## 12. Offentlig schema-4-projektion

Den offentlige runtimekontrakt har version `1.0.0`, startup- og detailprojektioner samt et manifest i schema 4. De eksisterende offentlige dokumenters indholdsskemaer er startup schema 3 og details schema 2; manifest schema 4 binder dem til den integrerede model.

Pages-artifactet må kun installere disse livefiler:

1. `data/live/manifest.json`,
2. `data/live/public-conditions.json`,
3. `data/live/public-condition-details.json`,
4. `data/live/coastal-parts-v2.json`.

Manifestet binder dataset/reference, modelbinding, fil- og body-hashes samt byteantal. Privacy-audit afviser blandt andet state/evidens, rå U/V, private filstier, private caches/checkpoints og fremmede modelbindinger. Eksisterende, udtrykkeligt allowlistede offentlige kystdel-/flowpointfelter kontrolleres af den offentlige kontrakt; designet påstår derfor ikke et generelt koordinatforbud.

## 13. Offentlig model- og forbrugerarkitektur

Candidate G er eneste offentlige model under udviklingen. Den integrerede kandidat må kun sammenlignes offline, indtil hele producent-/forbrugerkæden er klar til atomisk cutover.

Efter cutover er der fortsat én offentlig RavScore-model. Den tidligere adaptive model er fjernet fra den offentlige runtime og må ikke beregne offentlig score, fundchance, model-id eller forklaring. Historisk/intern kode og regressionsfixtures kan bevares, hvis de ikke bliver en alternativ offentlig model.

Alle adapters og projektioner for startup, detaljer, ranglister, bedste tidspunkt, femdøgn, sprog, Spørg RavRadar, konto/tur/observation, admin, ekspertflader og håndbøger hører til denne samlede leverance.

### 13.1 Observationsatomisk cutover på tværs af backend, Edge og Pages

De tre deployflader deler ikke én fysisk transaktion. Cutoveret gennemføres derfor som en låst tofaset overgang:

1. **Forberedelse uden offentligt modelskift:** `20260829010000_ravscore_operational_documents_no_history.sql` etablerer private driftsdokumenter/bucket og stopper fremtidig versionskopiering for de allowlistede operationelle dokumenter. Den bevarer alle eksisterende `admin_document_versions`-rækker og udfører ingen destruktiv oprydning. Først derefter anvendes `20260829020000_integrated_trip_calibration_binding.sql` for schema-3-tur-/kalibreringsbindingen. Efter migrationshistorik og dry-run genhenter `deploy-trip-storage` `origin/main` og kræver `origin/main == GITHUB_SHA` umiddelbart før første eksterne backendskrivning; resten af skriverækken fortsætter fra samme validerede checkout og migrationssnapshot. Protected readiness binder begge migrations-id'er og skrives først efter samlet migrationsmetadata-, database- og Edge-readback. Backend og Edge gøres bindingsbevidste og verificeres mod både den fortsat offentlige Candidate G-klient og den kommende integrerede klient. De må aldrig ommærke eller blande modeller. Ved manglende eller forkert modelbinding svarer den nye Edge eksakt HTTP `409`; en gammel klient fortsætter da på sin lokale Candidate G i stedet for at få et blandet serversvar.
2. **Én offentlig aktivering:** den integrerede runtime vælges eksklusivt fra point-aktivering → gyldig bundle → gyldigt checkpoint → engangs-Candidate G-import. Exact-head-artifactet valideres, og controlleren observerer Candidate G-kildemanifestet før den atomisk skriver `INTEGRATED_PENDING` med `transitionKind=INITIAL_INTEGRATED_CUTOVER`, `expectedVersion=0` og kilde-/målhashes. Den centrale profil bevares som Candidate G, mens det integrerede Pages-artifact publiceres. Efter eksakt offentlig implementerings- og 210/673-verifikation sætter én service-role-RPC samtidigt `INTEGRATED_ACTIVE` og den integrerede centrale 11-feltsprofil. Første cutover er push-only.
3. **Deterministisk resume/reconcile:** ved crash eller retry betyder live målmanifest fuld genverifikation og CAS-complete; live kildemanifest betyder abort/rekonsolidering til kildens `ACTIVE`-status med kildens centrale profil; enhver tredje hash bevarer `PENDING` og blokerer normal drift. Samme mekanik bruges ved manuel Candidate G-rollback og manuel integreret tilbagevenden. Assistentens integrerede Edge-funktion rulles ikke tilbage til en særskilt Candidate G-version.

Ved operationel Candidate G-rollback bærer Pages-klienten den eksakte Candidate G-binding. Assistentens fortsat integrerede Edge-funktion afviser den binding med eksakt HTTP `409`, og klienten bruger de eksisterende deterministiske lokale svar på dansk, tysk eller engelsk. Schema-3-ture kan fortsat lagres Candidate G-bundet, men altid med `calibration_eligible=false`. Denne local-only assistentadfærd er fail-closed; den er ikke en skjult dualmodel eller serverbaseret Candidate G-fallback.

To migrationsfiler må ikke dele samme versionsprefix. Den besluttede rækkefølge ligger i de to eksakte monotone versionsidentiteter og kontrolleres før management-deploy. Den midlertidige backendkompatibilitet er en protokolbro, ikke en offentlig shadowscore: hvert request accepteres kun med den fulde modelbinding fra sit eget offentlige datasæt.

## 14. Testbare invariants

Den integrerede kandidat er ikke klar, medmindre mindst disse egenskaber holder:

1. Samme strøm- og mobiliseringsstate giver samme resultat på tværs af generator og offentlige projektioner.
2. `delivery === transportPotential` for alle gyldige last-mile-retninger.
3. Manglende retning ændrer ikke score; forklaringen viser usikkerhed.
4. Der findes intet numerisk fysisk last-mile-interval i aktiv output.
5. Manglende obligatorisk bølge-, vind- eller strømevidens fejler lukket.
6. Højst 49 aktuelle strømevidenspunkter accepteres og beholdes under cadencekontrakten.
7. Vandstand ændrer ikke score, men kan bryde scorelighed for waders.
8. Migration og restore skaber ingen kunstig historik.
9. Bundle-, checkpoint-, state- og offentlige payloads afvises ved forkert model/hash.
10. Pages indeholder kun de fire allowlistede livefiler og ingen private runtimefiler.
11. Offentlige svar og UI kan ikke falde tilbage til en adaptiv offentlig model.
12. Ingen test- eller produkttekst hævder empirisk højere fundpræcision.
13. Supabase-migrationerne har unikke, monotone versionsidentiteter og anvendes i den besluttede rækkefølge.
14. Gammel klient/ny backend, ny klient/ny backend og rollback af central binding + Candidate G-Pages-overlay kan ikke skabe eller acceptere et blandet offentligt modeludsagn.
15. Gammel klient uden modelbinding får eksakt `409` fra ny Edge og bruger lokal Candidate G; den får aldrig et ommærket eller blandet serversvar.
16. `ravScoreCandidateGRollback` findes kun i den beskyttede fulde runtime og aldrig i de fire Pages-livefiler.
17. Operational-controlleren accepterer kun de fire låste statusser og overgangstyper; hvert modelskift går source-observation → `PENDING` med bevaret source-profil → Pages-mål → eksakt offentlig verifikation → atomisk `ACTIVE` + central målprofil.
18. Retry kan kun fuldføre ved requested manifesthash, abortere ved source manifesthash eller forblive fail-closed `PENDING` ved en tredje hash. Scheduleren kan kun refreshe allerede aktiv Candidate G, og Candidate G-observationer er ikke kalibreringsegnede.
19. Der findes ingen særskilt Candidate G-Edge-deploy; Candidate G-klienten får `409` fra assistentens integrerede Edge og bruger deterministiske lokale DA/DE/EN-svar.
20. Schema-3-ture under Candidate G-rollback er eksakt Candidate G-bundne og har `calibration_eligible=false`.
21. Checkpointpublisering sletter ingen `admin_document_versions`; migrationen ændrer kun fremtidig versionskopiering for den operationelle allowlist.
22. Første backendskrivning må kun ske efter en ny exact-main-kontrol efter dry-run; alle post-write-trin bruger samme validerede checkout/snapshot.

## 15. Beslutninger, der bevidst ikke er taget

Følgende er ikke en del af den aktive model:

- en `5,25 %` last-mile-faktor,
- et numerisk last-mile-usikkerhedsinterval,
- en antagelse om, at faldende vand altid transporterer rav ud,
- en antagelse om, at faldende vand altid forbedrer retention,
- lokale rip-, feeder-, langskyst- eller undertowfelter uden data,
- en offentlig shadowmodel,
- en adaptiv offentlig fundchance,
- kunstig opbygning af state ved missing eller kold start.

Disse fravalg er nødvendige for at holde modeludsagnene inden for det observerbare datagrundlag.
