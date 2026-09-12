# 4.0.345-mainbevis og 4.0.346-konklusion – 2026-09-12

4.0.345 bestod exact-head-sourcegate `34666410182`, blev merged som `64d2f23f`, og oneoff `34667430392` genbrugte sourceproofet uden en ny fuld gate. Oneoffen var fail-closed efter 1h41m38s: current 79.230/79.414, 184 rester, intet handoff/artifact/deploy/cutover.

DMI-planen var 673 × 118 og omfattede alle par. Faktisk behandling startede i rækkefølgen NSBS 1, WAM DW 5, WAM NSB 5, IDW 21 og LF 29 assets; WAM lukkede native. DMI-current var 64.400, egenrest 15.014, spatialt utilgængelig 1.126 og upstream-fravær 3.365. Terminalen `DMI_LOCALLY_SKIPPED_DKSS_ASSET; RUNTIME_BUDGET_REACHED` betyder her, at officielle assets i den valgte katalogmatrix stadig var lokalt ubehandlede ved passets runtimegrænse, ikke at DMI kun søgte gamle positive par.

Copernicus gennemførte 73 sourceforsøg på 39m25s og efterlod 3.396 efter CP. Durable journalwrite var cirka 0,006–0,067 sekunder; tolv fulde konsolideringer var cirka 66–67 sekunder, og candidate-admission fortsat cirka 19–20 sekunder pr. segment. Den gamle 31-gange-fulde checkpointdominans er brudt, selv om konsolidering stadig kan optimeres senere. Regional dækkede 928. Open-Meteo skulle løse 2.468, bevarede/hentede 2.284 og efterlod 184. Alle 184 var provider-negative efter isoleret retry; der var 14 grid-distance-afvisninger og 280 null speed/direction-værdier på tværs af forsøg, men intet runtime-, attempt-, kø- eller globalt providerstop.

Den kontrollerbare næste årsag ligger i oneoff-wrapperen. De historiske højst tre pass delte én 3.000-sekundersramme, og exit 2 ved en ufuldstændig currentledger returnerede før læsning af den atomiske progresscache. Derfor var flerpassagen utilgængelig netop ved sikkert runtimebegrænset DMI-fremgang. 4.0.346 giver højst tre separate pass med stram progress-/fejlklassifikation og kræver stigende verifiedPairCount før et tredje strict-current-runtimepass; den eksisterende exit-0-downloadbudgetvej er særskilt. Der ændres ikke Open-Meteo-grid, afstand, interpolation, geometri, sourceorder eller closure.

# Residualaudit efter 4.0.343 – 2026-09-11, opdateret efter 4.0.344-runtime 2026-09-12

## Nyeste 4.0.344-resultat og 4.0.345-konklusion

4.0.344 blev merged som `f2cc2a77`. Normalrun `34635781802` og oneoff `34642214559` afløser de ældre resttal som nyeste driftsbevis. Normalrunnet nåede 74.093/79.414 før Copernicus og sluttede med 1.335 mangler. 976 var terminalt negative i tidligere/aktuelle fallbackforsøg, mens 359 ikke var terminalt afklarede i dette run. Det betyder, at de første var forsøgt hos den konkrete fallback uden gyldigt resultat; det er ikke et permanent DMI-/CP-fraværsbevis.

Oneoffen startede Copernicus med 2.274 mangler, tilføjede 965 og sluttede efter Open-Meteo med 1.033 terminalt provider-negative par, altså 78.381/79.414. WAM og Feggesund var grønne; intet handoff/cutover blev produceret. DMI roterede alle seks collections og planlagde mod det fulde autoritative register. Hypotesen om, at DMI kun søgte blandt tidligere fund, er afvist. Hypotesen om, at en længere oneoff alene sikkert lukker resten, er også afvist.

Den dominerende kontrollerbare flaskehals var Copernicus' 31 gentagne fulde checkpoints: cirka 2.376 sekunder/78,2 % af CP-fasen. 4.0.345 løser dette med durable per-segment receipts og seks-segment-consolidation uden ændring af sourceorder eller admission. En 40.120-record fixture er byteidentisk og reducerer seks segmenters efterbehandling 115,905 → 46,438 sekunder. Exact-content PR-proof fjerner samtidig kun den dobbelte kildegate; post-data-gates består. Se DEC-0127 og den opdaterede CP-profil.

De 1.033 er fortsat ægte launchblokeringer for oneoffens eksakte targettime. Først en ny main-kørsel kan vise, om den forbedrede CP-kapacitet lader DMI/CP lukke flere, om en ny providerkørsel ændrer upstream-tilgængeligheden, eller om yderligere source-/gridårsager består. Ingen afstands-, geometri-, fysik- eller completenessregel lempes på forhånd.

Dette er et analysecheckpoint, ikke en ny release eller en erklæring om løst drift. Ejerens ordre er dybere samlet analyse, historisk sammenligning og ekstern verifikation før endnu en rettelse. Astra / Ultra er valgt af ejeren til dette arbejde.

## Verificeret udgangspunkt

- Main er `5587001b45ffea056addaf6cd20084719540336a` / 4.0.343. PR #277 havde grøn sourcegate `34585808228` på PR-head `66bd6061e746239df77a9e2e545d089421e38856`; main-sourcegaten kørte derefter i oneoff `34588002366`.
- Oneoff `34588002366` sluttede failure 11. september 12:44 UTC. Den stoppede på `missing_pair_count = 1658`, før friskhedskontrollen. Handoff og modelcutover blev ikke udført.
- Før Copernicus var den validerede union 76.455/79.414, altså 2.959 huller. DMI havde 61.027 egne par. CP øgede sin valgte dækning med 592; OM genbrugte 4.145 og hentede 709, hvorefter slutresten var 1.658 (77.756/79.414 dækket).
- OM rapporterede 1.606 providernegative par, 2.424 observationer af null speed/direction, 16 grid-distance-afvisninger og 11 transporttimeouts. Ingen af runtime-, attempt- eller queuebudgetterne blev ramt. Gentagne fejlobservationer er ikke ekstra unikke huller.
- Native WAM-inspektøren accepterede 79.060 par; Feggesunds endelige 354-par-closure og integreret runtime/handoff er ikke bevist af dette resultat alene.
- Provider-saves lykkedes. Seneste banker blev gendannet fra foregående run `34565347360`; seneste DMI-active-generation kom fra `34056999485`. Restore/save-metadata beviser ikke, at alle ønskede rækker findes eller bliver udvalgt.

## Ejerens spørgsmål om gamle data

Friskhedsgaten kan ikke forklare dette runs stop, da den ikke blev udført. CP/OM's positive bankudvælgelse har ikke en generel udløbsgrænse for hentetid; den bruger part/validTime, integritet, kildebevis og konfliktmasker. Dette udelukker ikke, at en fysisk bevaret række kan overses af anden cache-, proof- eller udvælgelseslogik.

Det validerede, udvalgte sæt i oneoffen mangler 1.658 par. Den nu afsluttede femgenerationsundersøgelse nedenfor fandt 240 rå sample-identiteter i den private shadowcache i denne rest, men ingen yderligere accepterede par. Shadowen indeholder både research og regional fallback; de 240 er ikke dokumenteret policygodkendte regionale samples. Det er hverken bevis for en skjult komplet cache eller for, at samtlige 1.658 timer kræver genhentning: regionalt afledte holdtimer tælles ikke som rå eksakte samples. En rå recordtæller eller et gammelt grønt target kan ikke afgøre det.

## Afsluttet læsende undersøgelse – 11. september 14:16 UTC

Run [34608174221](https://github.com/jakobjorgensen82-commits/RavRadar/actions/runs/34608174221), job `103291688190`, gennemførte alle fem generationer på 10m23s. Diagnosecommit er `93922787d61c04955a20b16e0a468987cfbe4bb1`; produktionslæserne er fra eksakt main `5587001b`. Alle fem input-hashkontroller viste uændrede filer; ingen providerhentning, cache-save, upload, deploy eller produktionsændring.

Undersøgelsens faste akse var den fejlede oneoffs `2026-09-11T10:00:00Z` og 118 timer, ikke et fremrykket nutidsvindue. Alle 1.658 undersøgte mangler er bundet til original control, targetfingerprint, dokumenthash og særskilt missing-pair-hash.

| Gemte generationer | DMI rå par i resten | CP rå par i resten | OM bank/projection rå par i resten | Shadow rå eksakte identiteter i resten | Ekstra accepterede par i resten |
|---|---:|---:|---:|---:|---:|
| 34588002366 | 0 | 0 | 0 / 0 | 240 | 0 |
| 34565347360 | 0 | 0 | 0 / 0 | 240 | 0 |
| 34556012813 | 0 | 0 | 0 / 0 | 240 | 0 |
| 34534764449 | 0 | 0 | 0 / 0 | 240 | 0 |
| 34437713821 | 0 | 0 | 0 / 0 | 240 | 0 |
| Union, uden dobbelttælling | 0 | 0 | 0 / 0 | 240 | 0 |

- `1.418` mangler har ingen rå eksakt sample-/paridentitet i disse input. Dette tal er **ikke** et antal bevisligt nødvendige genhentninger: en regional native sample kan efter gældende regler give yderligere holdtimer.
- De 240 rå shadowidentiteter er eksisterende data at undersøge, ikke 240 allerede kvalitetsgodkendte eller automatisk reddede par. Efterreview fandt, at råtælleren ikke filtrerer på regionalt anker, policy, LF-collection eller cadence. Den kan også tælle researchdata; antallet af faktisk regionale samples blandt de 240 er derfor 0–240. Den seneste generation gav 32 accepterede regionale par i alt, men ingen i den resterende mangelliste; alle fire ældre generationer gav nul accepterede regionale par på deres originale ledger.
- DMI råpar tælles efter tabsfri lagerafkodning, før native proof-admission, med krav om to finite U/V-værdier. Lagerlæseren beskærer ikke efter hentningsalder. CP-/OM-råpar tæller eksakt part/time-identitet før donoradmission. Regionalt råtal tæller eksakte samples, ikke afledte holdtimer.
- De fem generationer er en afgrænset undersøgelse af eksisterende cacher, ikke en udtømmende undersøgelse af alle historiske artifacts eller rå GRIB-filer. En tidligere komplet prognoseakse er heller ikke automatisk komplet på denne akse.
- Regionalvejen kan matematisk ikke lukke hele resten: policyen har højst otte dele, dvs. `8 × 118 = 944` positioner. Af dem er 32 allerede accepteret uden for resten, så højst 912 af de 1.658 mangler kan ligge i dette regionale univers; mindst 746 skal løses ad anden vej. Det er et loft, ikke et løfte om at kunne redde 912. Holdtimer udvider ikke policyens geografiske univers.
- **Vigtig diagnosebegrænsning:** Latest OM-reference og alle originale OM-projections bliver afvist med `OPEN_METEO_RECORD_INVALID`. Seneste OM-bank har 10.118 rå par, men diagnosens læser bevarer 5.602 og melder 4.516 dropped records. Det må ikke uden forklaring kaldes produktionsdatatab eller nye huller. Targetrekonstruktion/præcision og recordkontrollen undersøges særskilt. Rå overlapstal på nul blev målt før disse afvisninger og er derfor ikke skabt af den positive recordfiltrering. Diagnosens union på 75.403 må **ikke** erstatte oneoffens rapporterede 77.756 som ny driftstatus.

Undersøgelsen er grøn som diagnose, ikke som vejrclosure eller launch. Den konkrete genbrugsrisiko er fortsat regional autorisation og dens bevislevetid; nul ekstra accepteret overlap alene beviser ikke, at nuværende autorisationsregler er rigtige.

## Nye verificerede forhold og afviste overfortolkninger

1. **DMI-family-start er forbedret, men fler-kørselsrotation skal undersøges.** Dette run behandlede faktisk LF 1, IDW 18 og NSBS 1 unikke assets. Påstanden om nul service til NSBS gælder den tidligere kørsel, ikke denne. Flere currentfamilier kan få identisk `lastStrictCurrentTurnAt` ved afslutning, hvilket kan genskabe samme rækkefølge i næste run.
2. **Slutkomplet WAM betyder ikke startkomplet WAM.** Foregående target var 05 UTC, det nye 10 UTC, og den foregående WAM havde fejl. 49 unikke WAM-assets indgik i denne indsamling. WAM's store tidsandel kan derfor ikke alene kaldes fejlagtig kvalitetsprioritering. En mulig forældet hulplan efter intern bootstrap undersøges særskilt.
3. **Copernicus gentager fuldt bankarbejde efter hvert shard.** Bank, projection og source-stage genbygges, valideres og skrives med flere gentagne fulde gennemløb. Seneste log viser cirka 2m14 fra providerens `Total size` til checkpoint også ved bittesmå datasæt, mod omkring 50 sekunder i den tidligere komplette kørsel. Intervallet omfatter download, parsing, validering og I/O; det er ikke CPU-profileret, og hele intervallet må ikke tilskrives validering. Seneste run nåede 14 checkpoints/+592 par på cirka 55 minutter; historisk `34161930631` nåede cirka 39 checkpoints/+1.979.
4. **Store min..max-downloads er reelle, men ikke hele forklaringen.** Aktuel kode opbygger rumlige shards, men sparsomme timer bliver til ét kontinuerligt tidsinterval. 126,12 MB gav +54 par og 6,70 MB gav +0. Den gamle komplette kørsel havde også et stort 118,55 MB/+45-shard; tidsopdeling alene er derfor ikke dokumenteret tilstrækkelig.
5. **Regional DMI er en vigtig særskilt genbrugshypotese.** Den gamle komplette kørsel brugte 944 regionale par; nu bruges 32, svarende til 8 godkendte dele gange en native time og tre tilladte holdtimer. Regional kode er uændret siden den historiske kørsel. Gamle modelruns kræver præcist part-specifikt retained proof; det er endnu ikke afklaret, om regionale reserver taber adgang ved native-DMI-modelrunskift.
6. **Regional DMI har ingen særskilt målrettet kritisk kø.** De godkendte regionale proxy-targets tilføjes private/research-targets, men deres konkrete LF-behov indgår ikke som collection-specifik rest i den strenge current-assetklassifikation. Den globale hulplan gør familier kritiske, men kan ikke målrette LF-filer til netop disse regionale huller. Det er en verificeret schedulerblindvinkel, ikke bevis for at LF kan udfylde alle 1.658 rester.
7. **CP kan starte et shard uden tilstrækkelig resterende tid.** Budgetkontrollen spørger kun, om soft deadline allerede er passeret. Sidste shard startede cirka 82 sekunder før soft deadline og blev hard-killet før checkpoint. Normal og oneoff bruger samme runner; normalens korte budget gør risikoen større. En samlet rettelse skal kombinere bounded tids-tiles, plads til afslutning og mindre gentaget checkpointarbejde; flere små requests alene kan forværre overhead.
8. **DMI-rotationens produktionsmarkør modsiger testen.** `strict_current_collection_order()` sorterer på `lastStrictCurrentTurnAt`, men afslutningskoden skriver samme `generated` til alle familier, der fik service. Testen fremrykker kun lead. Derved kan produktionsrækkefølgen gentage LF/IDW/NSBS i stedet for at rotere lead. En snæver rettelse kan fremrykke kun reelt betjent lead; kræv test af faktisk produktionsopdatering over tre kørsler.
9. **Regional proof-retention har en strukturel afhængighed af forkert bevisdomæne.** `regional_current_operational.py` omkring 698–724 kræver native part-specifikt retained proof for ældre LF-samples. Regional fallback findes netop ved manglende native punkter. Det kan derfor skjule autentiske regionale samples ved modelskifte; dette er ikke det samme som en almindelig 90/150-minutters friskhedsgrænse. Den præcise påvirkning af de aktuelle 1.658 par skal stadig måles i cachen. Eventuel rettelse skal bevare selvstændigt regionalt kildebevis og må aldrig autorisere native DMI med regional proof.
10. **Andre åbne DMI-risici er ikke målte rodårsager.** Kritisk WAM-plan beregnes før private bootstrap og genberegnes ikke efter; ingen pre/post-måling beviser konsekvensen i dette run. Hele retained-proof-listen kan afvises ved én ugyldig proof; ingen liveevidens viser, at dette skete. Ingen bred proof-salvage eller acceptancelempelse uden bevis.

## Historisk forberedelse af cacheinspektionen

Følgende afsnit bevarer forløbet før de to diagnoser. Aktuel afsluttet status står øverst; formuleringer om ikke dispatched/afventende nedenfor er historiske.

Den eksisterende isolerede branch `codex/weather-cache-forensic` i `.tmp-weather-forensic` bruges kun til diagnostik og må aldrig merges som release. Et nyt script og workflow er forberedt til at læse fem gemte generationer med produktionslæserne fra eksakt main `5587001b`.

- Eksakte immutable cachekeys, ingen restore-prefixfallback.
- Aktuel missingPairs-liste og targetfingerprint valideres mod seneste gemte DMI-ledger og OM-bevis.
- Rå identitet/tilstedeværelse sammenlignes med almindeligt accepterede originale beviser, inklusive regionale data.
- Hver generations oprindelige Open-Meteo-projection undersøges særskilt for data, som ikke genfindes i donorbanken. Historisk projection-proof må ikke automatisk overtrumfe bankens nyere konfliktmasker.
- Generationer holdes adskilt; en intern union beregnes i den midlertidige runner. Historisk proof ophæver ikke automatisk nyere konfliktmasker.
- Kun aggregerede tal logges; ingen værdier, koordinater, part-ID'er, privat artifact, cache-save, providerhentning, secret eller deploy.
- Inputfiler hashes før/efter for at bevise uændrede input.

Diagnosen er endnu ikke committed, pushet eller dispatched ved dette checkpoint. Den sekventielle/regionale version inklusive historisk OM-projection har bestået AST/help, og workflowet har bestået YAML-/ID-/read-only-/filnavnskontrol. Sluttrinnet kræver både alle fem generationsresultater og faktisk succes fra hvert scripttrin, så continue-on-error ikke skjuler en fejl. Historisk OM-projection tælles i en særskilt union uden produktionsautoritet. Ingen diagnose mod de faktiske cachefiler er udført endnu. RDKS-validering er grøn for 4.0.343; ingen ny kildegate, vejrhentning eller release er startet.

Historisk afviste automatisk approval-review staging to gange trods genverificeret stående autorisation. Ejeren har nu eksplicit godkendt netop diagnosecommit/push og én læsende GitHub-undersøgelse samt bestilt dybere analyse. Diagnosecommit `bf70b286e7231d5f5aadfbb1402726d003bcb19d` er committed/pushet på den isolerede branch; run `34607112991` er startet. Kun de to diagnosefiler indgår; ingen produktionsændring eller PR/merge. Første status viste igangværende restore af seneste generations regionale shadow; ingen overlapstal foreligger endnu. Den tidligere afventende status ovenfor beskriver den lokale forberedelse, ikke en fortsat autorisationsblokering.

Supplerende read-only GitHub-kontrol efter checkpointet bekræfter: trin 67 failure, trin 68 success, trin 69 friskhed skipped, trin 70 closure skipped. Dette beviser fejlens placering, ikke fysisk fravær fra alle gemte generationer.

## Næste trin

1. Review den afsluttede femgenerationsundersøgelse og forklar OM-diagnoseafvisningen. Adskil raw, autentisk originalt proof og mulige regionale holdtimer; kald ikke 1.418 et genhentningstal.
2. Lav et årsagsregnskab for hele resten, ikke kun de 240 regionale samples: DMI-asset/outcome, CP planlagt/ikke betjent/providernegativt og OM null/transport/afstand. Eksisterende aggregerede logs beviser ikke hele denne fordeling. Saml DMI-service, regional prooflevetid, CP-checkpointomkostning, shardbudget og OM-providernegativer, og skeln målte rodårsager fra optimeringsmuligheder.
3. Udarbejd én samlet rettelse i fælles normal/oneoff-kode. Bevar gyldige rækker og deres beviser; ingen ændring af geometri, fysik, slutclosure eller kildeprioritet uden en relevant ejerbeslutning.
4. Målrettet regression og ét exact-head-CI-bevis efter gældende testmatrix, derefter kontrolleret runtime på bevarede cacher. Ingen blind gentagelse af oneoff imens.

## Dybere review efter ejerens eksplicitte diagnosegodkendelse

- **Diagnose 1:** `34607112991`/`bf70b286` fandt alle 25 generationskeys, men stoppede i alle fem analyser ved validering af den samme latest OM-reference, før overlapberegningen. Fejlen var fra Open-Meteo-validatoren; den første logsanitering viste kun klasse/fil/linje og mistede den nødvendige faste enumkode. Dette er en fejl i diagnosens afgrænsning/observabilitet, ikke bevis for defekt produktionscache. Intet input blev skrevet eller cache-saved.
- **Diagnose 2:** Ejeren godkendte eksplicit rettelse/genkørsel. `93922787` adskiller reference-mangellistens uændrede whole-document-/pairhash, control og targetbinding fra positiv vejr-recordadmission. Den strenge recordvalidator bruges stadig og rapporteres; afviste positive records bliver aldrig godkendt. Native DMI-proofafvisning isoleres også fra de øvrige providerundersøgelser. Faste fejl-enums kan logges uden private værdier. Seks lokale diagnosekontrakter plus AST/diff er grønne. Run `34608174221` er afsluttet; de faktiske overlapstal og begrænsninger står øverst.
- **CP-regression:** Se [CP_CHECKPOINT_PROFILE_2026-09-11.md](CP_CHECKPOINT_PROFILE_2026-09-11.md). Historiske logmedianer: provider-forberedelse 15,7→19,6 s; efter `Total size` til checkpoint 50,4→134,7 s. Et syntetisk 1.180-record-checkpoint gav 11.800 `_validate_record`-kald, dvs. ti fulde recordgennemløb. En snæver stage-only no-record-vej gav identisk output og uændrede bank/shadow-hashes ved 0,405 s mod 1,115 s. Ingen produktionshastighed eller generel positiv-fastpath er bevist heraf.
- **Regional reproduktion:** Et fuldt canonical retained assetproof må have part A native-attesteret og part B spatialUnavailable. Det må ikke native-attestere B, da det modsiger originalt outcome. Regional core indekserer kun native-attesterede dele, så en ægte old-run-regional B-sample bliver lydløst sprunget over med nul quarantine. Den eksisterende retained-regional test bruger mocked validator og ufuldstændigt proof og dækker ikke dette produktionsforløb.
- **Snæver regional genbrugsmulighed:** Et særskilt regionalt index kan bruge samme fuldt validerede LF-asset/run/time/sourcehash samt originalt spatialUnavailable-partoutcome. Alle sampleKey-, target-, policy-, lag-, afstands-, cadence- og vektorkrav skal bestå. Dette må aldrig tælle som native DMI eller ændre providerorden.
- **Holdbarhedsbegrænsning:** Native retained assetproof forsvinder, når dets sidste native tuple erstattes. Den schemafri regionale vej alene beviser derfor ikke vedvarende regional genbrug. Ved væsentligt sådant proof-tab må en lille selvstændig regional proof-retention vurderes, bundet til allerede validerede samples/assetoutcomes. Native attestedPartIds må aldrig forfalskes eller holdes kunstigt i live for at løse det. Kortsigtet hulredning og langsigtet korrekt prooflevetid skal vurderes samlet.
- **Diagnosens koordinatbegrænsning:** DMI-identitet afrundes til syv decimaler; OM-recordvalidatoren sammenligner eksakte tal, mens targetfingerprint også bruger syv decimaler. En syntetisk test beviser derfor, at samme targetfingerprint ikke altid er nok til at rekonstruere OM's præcise originale samplingPoint fra DMI alene. De 673 lokale targets har alle højst syv decimaler; dette er en mulig diagnose-/genbrugshazard, ikke bevist årsag til den aktuelle OM-referenceafvisning. Hvis OM-admission bliver afvist, må det ikke uden videre tilskrives defekte kilder.

En ren schedulerrettelse er ikke tilstrækkelig, når checkpointprisen stadig er høj; en ren tidsopdeling kan forværre overhead. Omvendt løser hurtigere CP ikke manglende regional autorisation. Den endelige pakke skal følge de målte afhængigheder og bevare cacheværdi OG det nødvendige originale bevis gennem timeskift, modelskift og afbrydelse.

## Ejerens helhedsindvending og accept af en samlet løsning

Ejeren påpegede efter diagnose 2, at shadowfundene kun er en del af det samlede problem. Det er korrekt: 240 eksakte sample-identiteter er 14,5 % af den rapporterede rest, men disse er ikke alle bevist regionale, og sampleantallet er heller ikke lig med mulige afledte timer. Ingen påstand om, at netop regionalrettelsen vil give komplet cache, er begrundet. Ejeren er orienteret om rettelsen af den for kategoriske betegnelse "regionale prøver".

En samlet rettelse skal dokumentere følgende adfærd, ikke blot grønne unit-tests:

1. **Samme faste vindue i hele målingen.** Før/efter hver leverandør opgøres eksakte mangler, nye brugbare par, bevarede par og afviste/ikke forsøgte par. Et nyere referencevindue må ikke forveksles med tab af gammel dækning.
2. **Bevar både værdier og nødvendige beviser.** En stadig gyldig tuple må ikke blive ubrugelig, alene fordi en anden native tuple eller modelkørsel opdateres. Originale regionalbeviser skal overleve lige så længe som de brugbare regionale data; rå data uden bevis må ikke blot omklassificeres til native DMI.
3. **Fair betjening af reelle huller.** DMI's faktisk opdaterede rotationsstate, regionale LF-behov og CP's tids-/rumkøer skal testes over gentagne normale kørsler. En test af en tænkt cursoropdatering er ikke en test af produktionsopdateringen.
4. **Arbejdet skal kunne afsluttes inden budgettet.** Fjern gentagen fuld behandling af samme CP-generation, brug begrænsede requests og afsæt tid til sikker checkpointafslutning. Normalflowet giver CP 360 sekunder mod oneoffs 3300. Et hurtigt syntetisk benchmark er ikke bevis for produktionskapacitet.
5. **Ærlig fallback.** Uspecificeret timeout er ikke bevis for utilgængelighed, og et null-svar er ikke en brugbar strømværdi. Leverandørskifte skal ske på den eksakte resterende mængde med bevaret kildeprioritet; komplet-cache-kvalitetsopgradering kommer bagefter.
6. **Vedligeholdelse skal måles særskilt.** På tværs af runs måles bevaret dækning på fælles stadig-gyldige timer, ny hale, nye reelle huller og faktisk lukning. Mindst en kontrolleret normal kørsel og modelrun-/timeskiftsregression skal dokumentere, at den almindelige vej kan vedligeholde det, før automatikken kaldes stabil. Engangsopfyldning alene er ikke dette bevis.

Åben yderligere kodehazard: `classify_dkss_primary_asset` kontrollerer vandstand og stridevalgte temperatur-/wind-tail-felter mod alle aktive zoner, ikke en dokumenteret collection-specifik rækkevidde. Derved kan ikke-opnåelige eller mindre kritiske komponenter muligvis holde assets i den kritiske kø. Det er endnu ikke målt som årsag i dette run; kontrakten må ikke lempes alene ud fra hypotesen. En sikker videre måling skal tælle `missingComponentKinds` per familie og faktisk behandlede assets uden private værdier.

## Historisk sammenligning efter ejerens spørgsmål om afstand og accept

Sammenligningen er fra `57a4c91405f0fd90353f8655315b42430ad13208` (4.0.333, den dokumenteret komplette **strømserie** i run `34161930631`) til main `5587001b45ffea056addaf6cd20084719540336a` (4.0.343). Komplet strømserie var ikke det samme som fuldt godkendt bølgekæde, integreret runtime eller launch.

| Afstandsregel for strøm | 4.0.333 | 4.0.343 | Historisk kontrol |
|---|---:|---:|---|
| Almindelig DMI, maksimal afstand | 5 km | 5 km | Samme konstant i dmi_native_provenance.py |
| DMI foretrukken afstand | 3 km | 3 km | Samme konstant |
| Copernicus, maksimal afstand | 5 km | 5 km | Samme konstant; nearest_shared_uv og _validate_record er AST-identiske |
| Open-Meteo, maksimal afstand | 15 km | 15 km | Samme konstant; build_record og _validate_record er AST-identiske |
| Regional DMI | Over 5, højst 15 km | Over 5, højst 15 km | Samme policy- og regional-core-blobs |

Open-Meteos afstandsgenberegningstolerance på 0,02 km, eksakte samplingPoint-sammenligning og U/V-validering er også uændrede. Copernicus' target-fingerprint-modul, regionalpolicyen, regional-core og den checked-in `data/live/coastal-parts-v2.json` har identiske git-blobs. Det udelukker en **kodeændret afstandsgrænse** i denne periode; det beviser ikke, at centralt gemte adminpunkter aldrig er ændret. En ændret leverandørgrid kan også få samme gamle grænse til at afvise flere svar.

Det efterfølgende DMI-review bekræftede også uændrede WAM-afstande (DW 2 km, NSB 8 km), regional retention på 168 timer og tre timers native cadence. Regional producent/consumer og `dmi_grid_vector.py` er byteidentiske. DMI-current-retention er i perioden blevet **lempet**: auditeret ecCodes-kompatibilitet, recovery før bladsanitering og fjernelse af reglen, der kunne afvise en ældre faktisk brugbar tuple alene på grund af nyere positiv processeringsmetadata. Disse ændringers hensigt og kodekontrakt er at bevare flere rækker, ikke at indføre aldersudløb. Central runtimebestand kan ændres uden Git-diff, så eksakte runtime-targethashes/snapshotmetadata mellem det komplette og aktuelle run er stadig et særskilt åbent kontrolpunkt.

Det, der faktisk er ændret og skal med i årsagsanalysen:

1. **4.0.340 / e459b826: ny vedvarende donorbank og positivt kildebevis.** Bankens generation er nu autoritet frem for en uafhængigt restored projection. Konfliktmasker og regler for modsatrettede topkandidater er nye; ældre projection må ikke genoplive noget imod nyere mask. Det er en væsentlig ændring i cacheadfærd, ikke en afstandsændring. Latest CP havde 51.950 rå par og samme antal accepterede samt nul masker i slutresten, så direkte CP-maskefiltrering af disse allerede gemte rækker er ikke dokumenteret forklaring på de 1.658. Tab i tidligere migrationer er ikke afklaret alene hermed.
2. **Samme ændring tilføjede dyrt gentaget checkpointarbejde.** Den lokale profil beviser ti fulde recordgennemløb. Produktionen nåede cirka 14 checkpoints/+592 par mod tidligere 39/+1.979 på omtrent samme tid. Dette er et konkret regressionsspor; det beviser ikke, at alle rester ville blive hentet alene ved at optimere CPU.
3. **4.0.343 ændrede providerbetjening og rotation.** Union-huller prioriteres i stedet for kun leverandørens egne huller; hensigten er rigtig. Men faktisk lead-markøropdatering og regional målretning er ikke tilstrækkelige. Nye tests skal bruge den reelle stateopdatering, ikke den idealiserede testopdatering.
4. **4.0.342 lempede CP's hele-svaret-eller-intet-adfærd.** Returnerede eksakte timer må nu bevares selv om andre bestilte timer mangler. Samtidig kom strammere strukturkontrol af timeakse og U/V-dimensioner. Det er en reel kontrolændring, men latest evidens har ikke vist, at denne strukturkontrol kasserer valide leverandørsvar.
5. **WAM og Feggesund har fået særskilt same-run-, tuple- og fuld-horisontkontrol.** Eksakt officiel assetidentitet, komplet Hs/periode/retning, isoleret modelrun-kandidat, atomisk partadmission og DW/NSB-owner-proof er nyere krav. Owner-/proofversionsskift kan gøre gamle progressmarkører ikke-genbrugelige uden at selve bølgerækkerne nødvendigvis er tabt. Dette kan medføre ekstra WAM-arbejde og forklare andre blokeringer, men ikke direkte stoppet på 1.658 strømpar. De to vejrkomponenter må ikke sammenblandes i forklaringen.
6. **Regional old-run-proofproblemet er ikke introduceret af en ny afstandsregel.** Regional-core er uændret. En eksisterende logisk svaghed kan først blive synlig, når modelrun/proofejerskab skifter. Derfor skal både ændret kode og ændret input-/cachelivscyklus undersøges.

### Diagnosens OM-præcision, ikke en bevist ny produktionsfejl

Efterreview verificerede, at de nuværende produktionskald til OM-bankens merge/select loader de autoritative targets fra fil; de rekonstruerer dem ikke fra DMI. Den syvdecimal-rekonstruktion findes i denne diagnose. En syntetisk prøve viser, at et sub-syvdecimal-afvigende punkt kan bestå samme fingerprint, men få en ellers intakt OM-record droppet og masked. Dette er en præcis mulig forklaring på diagnosens afvisninger, ikke et livebevis for, at netop alle 4.516 afvisninger skyldes dette. Den må ikke udløse en ny produktionsrettelse eller tælles som dataødelæggelse uden yderligere evidens. En senere målrettet diagnose skal bruge eksakt authoritative snapshot eller måle canonical-match/exact-mismatch særskilt; OM-manifestets hashbundne pairidentiteter bør også indgå.

Officielle kilder undersøgt: Open-Meteo Marine API-dokumentation (kystbegrænsning ved cirka 8 km-grid), DMI forecast-tilgængelighed og den aktuelle meddelelse om supercomputervedligeholdelse, samt Copernicus Toolbox subset-kontrakt. Disse kan forklare begrænsninger; de beviser ikke alene årsagen til RavRadars aktuelle huller.

## Fortsat helhedsundersøgelse og autoriseret vedligehold 11. september, efter 14:55 UTC

- Ejeren godkendte eksplicit én almindelig `force=false`-opdatering på main, inklusive mulig opdatering af den eksisterende offentlige model efter alle gates. Run `34613079069` blev dispatched 14:55:55 UTC på `5587001b45ffea056addaf6cd20084719540336a`. Workflowet blev straks deaktiveret igen og er verificeret `disabled_manually`. Ved seneste kontrol omkring 15:20 UTC stod runnet fortsat `queued` med ingen jobs; det må ikke beskrives som igangværende vejrhentning. Ingen cutover, rollback eller ny oneoff er startet.
- **Runtime-samplingidentitet er nu sammenlignet:** både den komplette currentkørsel `34161930631` og `34588002366` restorede nøjagtigt den samme immutable aktive cache `dmi-zone-active-v1-Linux-2026-W36-118-preflight-34056999485-1` og bestod bagefter den strenge ledger/target-fingerprint-binding mod de centralt hydrerede targets. Fingerprintmodulet er identisk. Dermed var alle 673 `(partId,parentZoneId,waterPoint@7dec)` identiske i disse to runs. Dette afviser ændret DMI-/CP-samplingidentitet som årsag; det beviser ikke byteidentisk fuld central konfiguration eller OM's sub-syvdecimal-præcision. Den gamle slutcaches egne runkeys og artifacts er ikke længere tilgængelige.
- **OM's netrest kan afstemmes:** 2.367 netværkspar = 709 accepteret + 1.606 efter isoleret gentagelse bekræftet providernegative + 52 øvrige/transportrester. De 1.606 er ikke alle én dokumenteret fejlkategori: null/parværdi og afstand indgår, og de 16 afstandsfejl er payload-observationer, ikke unikke par. Tre tidligere runs havde samme kerne på 30 negative dele; der er ikke registreret UTC-, unit-, timeakse-, cardinality- eller runtimebudgetfejl som forklaring. Negativer undertrykkes inden for processen, ikke permanent.
- **Alternativt CP-spor:** AMM15's datakatalogrektangel er -16..13 grader øst, men vores targetpolitik tillader kun 7,5..9,5. 526 af 673 targets ligger inde i metadatarektanglet men uden for targetpolitikken. Rektanglet beviser ikke en våd U/V-celle. Historisk var grænsen begrundet i Baltic/Kattegat-maskering og for store rektangulære downloads; den må derfor ikke bare fjernes. Først kræves final-rest-intersektion og derefter eventuelt en afgrænset faktisk leverandørprøve. [Officiel AMM15-beskrivelse](https://data.marine.copernicus.eu/product/NWSHELF_ANALYSISFORECAST_PHY_004_013/description) angiver syv døgns forecast og geografisk rektangel; [Open-Meteo](https://open-meteo.com/en/docs/marine-weather-api) beskriver cirka 8 km-strømgrid og begrænset kystnøjagtighed.
- **CP-liveness:** immutable attempts tælles også som schedulerens eksakt-reference-aldrig-prøv-igen-markør, selv ved ingen returneret række. Det er ikke en bevist årsag til denne rest, men kan forhindre et senere forsøg efter katalogopdatering under samme lange run. En senere retryændring skal holde scheduler-hint adskilt fra det originale kildeordensbevis.
- **OM-responseidentitet:** positional mapping af flerpositionssvar er en latent risiko ved et permuteret svar fra nærliggende gridceller. Der er ingen evidens for sådan permutation i runnet, og de isolerede negative genforsøg forklares ikke deraf. Kontrakt for JSON `location_id` skal verificeres før eventuel hardening; dette er ikke påvist root cause.
- **Ny målrettet læsende diagnose:** `34615189896` på isoleret `codex/weather-cache-forensic`/`5e7c485ca37d4b346a8f20006d1ba8ec3e25570f`. Kun seneste faste generation undersøges, med exact CP-ready-journalkey `copernicus-current-progress-v3-118-preflight-ready-34588002366-1`, uændrede øvrige filer og production readers fra 5587001b. Syv syntetiske diagnosetests er grønne lokalt og i runneren. Den måler residualform, DMI-originaloutcomes, regionalt kontrafaktisk proofgenbrug, CP-domain/attempt-ruter og OM-manifest/præcisionsfølsomhed. CP-journal/DMI-filhash-match logges særskilt; journalen giver ikke ny produktionsautoritet. Ingen supplier fetch, cache-save, artifact-upload, secrets eller deploy. En lokal typo i diagnosens håndskrevne DMI-familieliste (`dkss_nsb` i stedet for `dkss_nsbs`) blev opdaget efter dispatch og er rettet lokalt til import af den kanoniske liste; det igangværende run afbrydes ikke, og øvrige probes skal stadig indsamles. DMI-rutetallet fra denne head forventes derfor at være uafklaret, ikke nul. En ny kørsel må først besluttes efter samlet resultatreview.
- **Lokal produktionsrettelse:** DMI-leadmarkøren skrives nu kun på den faktiske leadfamilie via `begin_collection_scheduler_turn`, også hvis det efterfølgende forsøg fejler. Den gamle kode flyttede alle betjente familiers markører til samme timestamp. Måltesten kører fire successive faktiske bookkeeping-opdateringer fra en legacy state med ens markører og beviser NSBS → LF → IDW → NSBS. Kun `scripts/update-dmi-bulk.py` og scheduler-måltesten er ændret; AST, måltest og diffcheck er grønne. Rettelsen er ikke committed, CI-verificeret eller i produktion. Den indgår i den samlede pakke, ikke en selvstændig garanti for komplet cache.

Næste arbejde: færdiglæs liveårsagstællerne, luk den uafklarede DMI-rutedel uden at gentage blindt, afprøv kun nødvendig alternativ kildevej, og saml regional prooflevetid, DMI-fairness og CP-checkpointomkostning i én begrundet rettelse. Main flyttes ikke under en aktiv cache-writer.

## Afsluttet originalrute-diagnose og lokal integration, 11. september efter 15:30 UTC

Den rettede læsende diagnose `34615949813` / job `103317797957` / isoleret head `69a86b78` er grøn. Den bruger præcis de samme cachekeys og production readers som den foregående diagnose; alle inputhashes er uændrede. DMI-regnskabet er nu afklaret:

| Original DMI-outcome i den faste slutrest | Par |
|---|---:|
| Lokalt sprunget over i IDW, LF og NSBS | 1.107 |
| IDW spatialUnavailable; LF/NSBS lokalt sprunget over | 452 |
| IDW/NSBS spatialUnavailable; LF lokalt sprunget over | 23 |
| IDW/LF spatialUnavailable; NSBS lokalt sprunget over | 2 |
| UpstreamAbsent i alle tre familier | 74 |
| I alt | 1.658 |

Dermed er 1.107 restpar ikke dokumenteret utilgængelige hos DMI: relevante assets blev ikke færdigbehandlet af nogen familie. Det er ikke et løfte om, at de kan udfyldes. Det supplerer CP-regnskabet på 1.004 par uden afsluttet registreret forsøg og 654 med returneret native tid uden accepteret par. Familie-/providerkategorier overlapper; de må ikke lægges sammen.

Den regionale kontrafaktiske gevinst er 656 par (216 eksakte + 440 hold), nul tab, nul quarantine. Af de 256 regionale rester ligger 16 i første seks timer og 240 i den sene del af vinduet; 24 har eksakt rå sample uden tilstrækkeligt retained proof. Et faktisk replay med den implementerede migrator mangler fortsat. Alle 4.516 OM-diagnoseafvisninger er nu præcist forklaret af sub-syvdecimal-punktforskellen; tidligere afsnits forbehold om denne specifikke diagnose er dermed afklaret. Ingen produktionscachefejl er påvist af denne tæller.

Efterreview af DMI-loopet forklarer den målte 1/18/1-betjening: kun leadfamilien har ét-asset-loft; første non-lead kan bruge næsten al resterende slack, mens sidste alene beskyttes af 120 sekunder. Den lokale leadrotation er derfor nødvendig, men utilstrækkelig. LF-prioriteten scorer desuden kun hul på assetets egen time, ikke mulig regional holdgevinst på de næste tre timer, og den venstre kildekant ligger før det nuværende listevindue. En samlet rettelse må både fordele tiden og målrette eksisterende regionale huller uden at åbne kvalitetsarbejde foran huller.

Lokalt implementeret: `regionalSourceProofs` i samme shadow som samples, originalt fuldt valideret source/outcome og separate samplebindinger; native attesterede par ændres ikke. Prooflevetid følger samples, ikke sidste native vinder. Migration kan ikke genoplive en kendt invalid binding; ægte EOF-genbehandling kan reparere en defekt regional række/index i en isoleret transaktion. Produceren indsamler originalproof før ny-vindue/native-ejerfiltrering og først efter fuld validering af den originale cache. Finalizer kører efter begge stagevalidatorer og før noget committes. Fejl bevarer bulk/private/shadow og diagnostik. Regional-/shadowtests, 23 transactiontests og native-provenance-test er grønne. Minus-tre-timersgrænsen rettes særskilt mod locked target, så et faktisk startminut ikke gør lovlig randdata ugyldig.

CP's no-record-optimering er måltestet, men er ikke tilstrækkelig: alle 14 checkpoints i sidste run var positive. Den igangværende optimering skal undgå gentagen fuld genvalidering af samme allerede kontrollerede positive generation, men bevare disk-readback, maskering, original source-stage og crashrecovery. Intet af dette er committed, CI-valideret, merged eller produktionsbevist endnu.

## Faktisk regional migrationsprøve, 11. september 16:08 UTC

Isoleret run `34619730789`, job `103330411166`, forensic-head `cc2d1e59b019cea287f3e9f75ad59774d31a7777` er afsluttet grøn. Den frosne fire-filers regionale rettelse blev anvendt på et separat checkout af præcis main `5587001b`. Den faktiske producer-extractor, migrator og strenge consumer blev kørt på en kopi i hukommelsen af den eksisterende cache; den oprindelige referencekæde og cachefiler blev ikke ændret.

- 85 originale proofkandidater gav 224 samplebindinger. Ingen invalid proof/sample, blokeret index eller quarantine.
- Regionalt dækket før/efter: 32 → 688 par. Gevinsten i den faste slutrest var præcis 656; tab af tidligere dækkede par var nul.
- Serialisering/genindlæsning bevarede resultat og proof. Anden migration bandt nul nye samples og var idempotent.
- Den faste 1.658-rest ville dermed være 1.002. Dette er læsende replaybevis, ikke en opdateret produktionscache eller launchbevis.
- De 256 regionale rester fordeler sig på 16 par ved target-offset 0..1 og 240 senere par. De 240 har et relevant, ubearbejdet officielt LF-asset på den godkendte native cadence. LF's valgte modelkørsel havde derfor tilstrækkelig tidsmæssig horisont; den manglende behandling kan ikke forklares med et 30-timers kortere produkt. En brugbar våd U/V-celle er dog ikke dermed bevist. De 16 venstre randpar kræver kildetid før ledgerens T..T+117-akse; denne del af kataloget blev ikke undersøgt og må ikke klassificeres som upstreamAbsent.
- Slutkontrol: alle inputhashes uændrede; ingen providerfetch, cache-save eller deploy.

Det første faktiske replayforsøg `34619473233` stoppede før cache-restore, fordi diagnosens workflowkontrakttest ikke var opdateret fra én til to analysetrin. Testen blev rettet til præcise kommandoer, fælles generation og separate pinned sourcecheckouts, og syv måltests bestod før den grønne kørsel. Dette var en lokal diagnoseforberedelsesfejl, ikke en ny fejl i vejrcachen.

DMI's fair tidsdeling inden for samme kørsel samt regional gap-union, kontrolleret genbrug af GRIB, venstre T−3-kant og positiv replan efter EOF er nu implementeret lokalt. Scheduler-måltest og 26 transaktionstests er grønne. Uafhængig main-flow-review fortsætter. Manglende vandstand/temperatur/vindhale kan stadig gøre en anden familie kritisk; uden faktisk komponentbevis må dette ikke kaldes ren kvalitetsopgradering eller fjernes blindt.

## Katalogets terminalbevis og LF-genbehandling: yderligere main-flow-fund

Den uafhængige gennemgang fandt en reel forespørgsels-/valideringsmodstrid: `list_latest_assets` kræver det eksakte officielle asset på modelRun+120 for at vælge en moden DKSS-modelkørsel, men forespurgte kun kataloget frem til target+117. For en modelkørsel 0–2 timer før target ligger det nødvendige terminalbevis uden for forespørgslen. De tidligere katalogfixtures filtrerede ikke deres svar efter forespørgslens `datetime` og overså derfor fejlen. Dette beviser en kodefejl, ikke at en bestemt nyere livekørsel faktisk var færdigpubliceret.

En snæver lokal rettelse observerer nu frem til højst den kausale modelkørselsgrænse+120, men bevarer producentkøens oprindelige højre kant. Der hentes altså ikke nye GRIB-filer uden for det bestilte vindue. Et separat, sanitiseret `nativeTerminalAsset` bærer original officiel identitet i collection-ledgeren. Det indgår ikke i de 118 official-times, deres count/hash, native tuple-attestation eller forecastnævner. Feltet bindes af den eksisterende samlede ledger-/DMI-filidentitet. Streng validering kræver samme collection/modelRun og præcis +120; ligger terminalen inden for målaksen, skal det separate felt matche dens officielle række. Ældre ledgers uden felt følger fortsat den gamle terminalregel. Tilstedeværende defekt eller usanitiseret terminalevidens afvises også af availability-reader.

Den faktiske selector er nu prøvet med serverlignende datetime-filtrering for alle tre DKSS-familier og modelalder 0, 1 og 2 timer, inklusive ikke-sekstimersbundne modelankre. Den nye komplette model vælges; uden faktisk terminalasset vælges den ikke. Den virkelige ledgerbuilder og strenge reader accepterer 118/118 syntetiske positive par med terminalen udenfor aksen; serialisering bevarer dette. Manglende, forkert tid/model/collection, ekstra privat felt og modstridende in-axis-identitet afvises. Den samlede native-provenance-måltest er grøn.

To yderligere forhold bearbejdes lokalt før samlet release: LF's regionale replan genvaliderede hele konteksten efter også off-phase/nulændringsassets, og et fuldt gennemlæst LF-asset uden regionalt resultat kunne blive genåbnet hver kørsel. Supervisorens timeoutliste stopper ikke normale nulresultater og nulstilles pr. invocation. Afgrænsningen skal bruge faktisk ændring efter valideret EOF og eksakt, bounded schedulerobservation; native 5 km-spatialUnavailable må aldrig opgraderes til regionalt negativt eller positivt 15 km-bevis. Scalar-only-genbehandling er et ældre særskilt mønster og ændres ikke uden selvstændigt evidensgrundlag.

## Afsluttende lokal integration og timeoutafgrænsning, 11. september efter 16:44 UTC

LF-afgrænsningen ovenfor er nu implementeret og måltestet: offphase giver ingen regional proof-/observationsbehandling, tung regional replan sker kun efter ændrede regionale inputs, og en eksakt in-axis schedulerobservation kan undgå gentaget regionalt nulresultat, når det oprindelige native processed-step fortsat er valideret genbrugeligt. Observationen er alene en schedulerhjælp, aldrig positivt eller negativt databevis. Ændret asset/modelkørsel, target, policy, processing-signatur eller relevant sample/proof genåbner arbejdet. 29 transaktionstests og DKSS-primary er grønne. T−3..T−1 kan fortsat give ét gentaget native-cadence-forsøg, og native ejerskifte kan gøre observationen uanvendelig; disse begrænsede ekstra genlæsninger udløser ikke en ny parallel persistent state i denne rettelse.

Uafhængigt afsluttende DMI-review fandt ingen ny konkret P0/P1/P2 i selector→ledger→strict/availability-reader→registry→runtimebinding. Dette er kodereview, ikke bevis for livegennemløb eller komplet cache.

CP's afsluttede checkpointprøve efter uafhængig encoder-/disk-readback gav 27,536 mod 45,926 sekunder på 40.120 syntetiske Baltic-records, tre byteidentiske filer, 2×N recordvalideringer og 77,1 MB ekstra traced peak. Den tidligere 21,450/39,256-måling var før readback-rettelsen og er erstattet. AMM, masks, skrivekorruption, stale snapshot og crashrækkefølge er funktionelt måltestet, men ikke separat storskala-profileret. CP's kørotation er også rettet: `(UTC-timeordinal + floor(kvartal*kølængde/4) + bounded attemptoffset) mod kølængde` undgår den gamle kvartordinal, som ved timekadence kun besøgte 17 af 34 Baltic-hovedpositioner. Faktiske 34/9-køer, begge kadencer, genforsøg, fast medlemskab/ID og produktinterleave er måltestet; range-runner og pilot er grønne.

Læsende run `34623745943` / forensic-head `39a7bfc4e40f52f95c3c0026c2e167f763d75c7e` måler nu den faste post-migrationsrest på 1.002 mod de uændrede CP-shards og forsøgsjournalen. Det skal adskille sammenhængende native timer fra store tomme mellemrum og afklare, om tidsopdeling er begrundet. Logiske target×time-celler er ikke fysiske gridceller eller downloadbytes. Ni syntetiske diagnosetests er grønne; ingen providerfetch, cache-save eller deployment er en del af dette workflow.

Deadline-reviewet bekræfter en selvstændig begrænsning, ikke cache-reset: normal kørsel har hardbudget 360 sekunder og softgrænse 324; oneoff 3300 og 3180, med yderligere stepmargin. Fælles runner kontrollerer kun tiden før det blokkerende subset/hash/parse-forløb og igen efter holdbart checkpoint. Begge workflows bruger ét wrapperforsøg, så wrapperretry er ikke aktivt. Tidligere gennemførte checkpoints bevares ved wrapper-timeout og efterfølgende cache-save; den aktive, endnu ikke gemte NetCDF-/parseenhed tabes. Ekstern cancel/step-kill er særskilt farligere, fordi save ikke udføres ved cancelled. Ingen run er annulleret af dette review.

Pinned subset-API har ikke en samlet operationstimeout; transporttimeout/retries er ikke det samme. En lille mulig forbedring er at måle hele faktisk fuldførte request→checkpoint-transaktioner monotont og kræve tilsvarende resttid før efterfølgende requests, men stadig tillade første request og altid gemme returnerede data før næste tidskontrol. Dette er alene en overvejet risikoreduktion, ikke implementeret og ikke en garanti: en stor tidligere shard kan gøre værnet konservativt for en mindre næste shard. Beslutning skal træffes sammen med sparsitetmålingen, ikke ved at opfinde en ny fast SLA eller bygge subprocess-arkitektur uden behov.

## Post-migrations-sparsitet målt og requestbeslutning, 11. september 16:50 UTC

Run `34623745943`, job `103343715441`, forensic-head `39a7bfc4e40f52f95c3c0026c2e167f763d75c7e` er grøn. Den faktiske regionale migration gentog præcis +656/−0 og idempotens; alle inputfiler inklusive original CP-journal/shadow er uændrede. CP-journalens DMI-filbinding og reference er valideret.

| Måling på de faste 1.002 rester | Baltic | AMM15 |
|---|---:|---:|
| Konfigurerede stabile shards | 34 | 9 |
| Berørte shards | 9 | 5 |
| Eksakte par inden for kildepolitik | 508 | 954 |
| Sum efterspurgte unikke native timer pr. shard | 89 | 149 |
| Sum min..max-envelopetimer pr. shard | 251 | 395 |
| Heraf helt tomme mellemrum | 162 | 246 |
| Største tomme mellemrum | 80 timer | 80 timer |

Produktpar overlapper og må ikke lægges sammen til et nyt totalt antal. To Baltic- og tre AMM15-shards har hver 37 efterspurgte timer over 118; hver har 81 tomme timer fordelt som ét 80-timersgap og ét enkelt timesgap. En anden AMM15-shard har 33 nødvendige timer over 36 med tre enkelte tomme timer. De øvrige requests er korte og sammenhængende. Omkring 71 % af de logiske target×time-envelopeceller i hvert produkt er ikke eksakte requestedPairs; dette er IKKE en måling af fysisk grid-/dybde- eller bytespild.

Den fælles forsøgsfordeling er: 167 uden registreret afsluttet forsøg i begge produkter, 48 uden Baltic-forsøg og uden for AMM15-politik, 461 uden AMM15-forsøg og uden for Baltic-politik, 33 forsøgt i AMM15 uden accepteret par og uden for Baltic-politik samt 293 forsøgt i begge uden accepteret par. Altså 676 uden afsluttet registreret forsøg fra nogen relevant CP-kilde og 326 forsøgt på returneret tid uden accepteret par. Det erstatter det tidligere interval 348..1.002; det er ikke et løfte om, at alle 676 kan leveres.

**Afgrænset implementeringsbeslutning:** Split ved mindst 24 hele tomme native timer; ikke ved de enkelte tomme timer. Det fjerner de målte 80-timersmellemrum uden at fordoble antallet af checkpoints ved ren connected-component-mikroopdeling. På netop denne faste fulde produktrest svarer det strukturelt til fem ekstra segmenter og 400 færre request-envelopetimer før pair-level kildeprerequisites. Det er et planregnskab, ikke netværkstids-/bytegaranti. Ingen ny maksimal parkvote eller blanket 6-/12-/24-timersflisning indføres; alle exact pairs skal fortsat kunne forsøges.

Et segment pr. stable shard får tur i hvert fair pass; resten udskydes til næste pass. Fejlisolation bindes til præcis segment-pair-mængde, og immutable gamle brede attempts pensioneres først ved kollektiv fuld erstatning med aktuelle samme-reference/source/shard-forsøg. Source-order, positive donorcertifikater og selvstændig admission består. Fælles normal/oneoff-main får faktiske aggregerede acquire/parse- og admission/checkpointtider. Den adaptive deadlineidé ovenfor implementeres ikke nu: en stor tidligere request kan ellers stoppe mindre senere arbejde for tidligt, og segmenternes nye tidsfordeling skal først måles. Eksisterende soft/hard-stop og checkpointbevaring består. DEC-0126 registrerer kontrakten.

## Lokal frysning af 4.0.344

De tre samlede CP-måltests er grønne: `test-copernicus-current-pilot.py` (1,6 sekunder), `test-copernicus-current-source-stage.py` (39,6 sekunder) og `test-copernicus-range-runner-v2.py` (20,3 sekunder). Den sidste konkrete subprocess-regression lader AMM-segment A fejle uden attempt/witness, lader et senere Baltic COMPLETE-nulresultat åbne segment B og kræver, at B faktisk køres og optages. Slutstatus er IN_PROGRESS med præcis det fejlede hul. Ingen fejlsucces opfindes, og en kø uden mulig ny service terminerer. Historiske feltnavne `executedShardCount` og `failedShardCount` tæller nu segmentforsøg, ikke unikke geografiske shards; søgning fandt ingen forbruger, der kræver denne øvre shardgrænse.

Samlet DMI/regional/CP-kode er frosset til releasepakning. De allerede grønne måltests samt versions-, RDKS-, runtimebindings-, modelbundle- og browserimportkontroller er lokale beviser. Én exact-head-CI og hele main/provider/closure/handoff/cutover/normalvedligeholdelse er stadig åbne. Den uændrede modelbundle og version-only-browser-/geodatadiffs begrænser denne pakkes UI-/scoreændring til releaseidentiteten.
