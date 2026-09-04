# Helhedsrevision af vejropbygningen – 2026-09-04

Status: skrivefri drifts-/kodeanalyse og én syntetisk prioriteringsprøve; ingen runtimeændring, dispatch, cancellation, databaseoperation, cache-/punktændring eller ny release. Denne analyse supplerer og præciserer `WEATHER_PIPELINE_ROOT_CAUSE_2026-09-04.md`.

## Ejerens korrektion og konklusion

### Nyeste præcisering: gennemløbstid og sammenlignelig gammel opbygning

Ejeren har efterfølgende korrekt afvist, at omfordeling af det samme arbejde alene forklarer eller løser den langsomme samlede opbygning. Ejeren oplyser også, at den oprindelige cacheopstart fra nul var hurtig. Den tidligere konklusion nedenfor om scheduler/opbygningsrammen er derfor **et påvist delproblem, ikke en afsluttet rodårsagsanalyse eller et tilstrækkeligt løsningsbevis**. Et tidligere estimat på 1–2 timer til komplet vejr var ikke underbygget og må ikke gentages som forventning. Den konkrete oprindelige cold-start-kørsel er endnu ikke identificeret; en varm gammel kørsel må ikke bruges til at afvise ejerens observation.

Der er nu målt reelt nyt download-/behandlingsarbejde både før modellen og på den aktuelle main. Kun faste statusfelter, optællinger og tidsstempler er udlæst; ingen private værdier eller rå logs er gemt.

| Kørsel/job | DMI-trin | Nyt arbejde og genbrug | Observeret behandling |
| --- | --- | --- | --- |
| Gammel `33149656953` / `98778481117`, 28. august | 13m14s | 485.851.456 bytes download; 39 tidligere assets sprunget over | 32 IDW-assets startet, 31 markeret behandlet; efterfølgende Copernicus og central vejrbygning grønne |
| Gammel `33153271907` / `98790063641`, 28. august | 13m16s | 322.105.680 bytes download; 38 tidligere assets sprunget over | 36 NSBS-assets startet, 35 markeret behandlet; efterfølgende Copernicus og central vejrbygning grønne |
| Ny `33856228257` / `100970258157` | 13m55s | 940.394.060 bytes; 118 LF- og 18 IDW-assets | 473,5s i den målte asset-behandling efter download; resten er download, init, mellemtrin og afslutning |
| Ny `33857274983` / `100984647170` | 13m58s | 626.316.502 bytes; 136 tidligere assets sprunget over | 70 NSBS-assets, 462,6s målt asset-behandling; ca. 674,4s fra første processing-start til sidste færdigmelding |
| Ny `33862230453` / `100989379658` | Budgetbegrænset | 43 nye IDW-assets | 537,7s målt asset-behandling; ca. 687,6s fra første start til sidste færdigmelding |
| Ny `33863878600` / `100994407583` | 13m53s | 728.777.184 bytes; 246 tidligere assets sprunget over, 0 incomplete retries, 0 strict-recovery-discarded steps | 48 IDW-assets, 464,4s målt asset-behandling; ca. 691,2s fra første start til sidste færdigmelding |

De fire nye jobs har **ingen overlappende behandlede collection/valid-time-par** i de normale asset-loops, og alle tre DKSS beholdt samme 06Z-modelrun. I dette interval gentages de færdige normale timefiler altså ikke. Dette beviser ikke fravær af sidecar/research-replay eller genarbejde ved senere modelrunskift. En påstand om konstant tab/genstart af netop den seneste DMI-cache er ikke understøttet.

De gamle målinger er ikke tomme-cacheruns og ikke kontrollerede benchmarks på identiske filer. Men de viser heller ikke en klar forværring i antal nye assets behandlet pr. minut: gammel IDW ca. 31 færdige på 13 minutter mod senest 48, gammel NSBS ca. 35 mod nu 70. Det er derfor ikke bevist, at selve DMI-downloadet eller den enkelte fils behandling generelt er blevet langsommere. Den samlede opgave og acceptkontrakten er blevet væsentligt større.

Kodeforskellen er konkret: den gamle `dmi-forecast-store.mjs` havde tidsbracketing med højst fire timers mellemrum og kontrolleret interpolation i samme native serie, for strøm også samme celle og dybdelag. Dermed kunne den gamle tre-timers producent understøtte en timeinddelt prognose med færre native filer. Den nye current-ledger kræver hver eksakt native time og et særskilt source-/outcome-bevis, mens sluttildelingen nu standser hele kæden før vind/fallback/central vejrbygning. Interpolations- eller releasekrav ændres **ikke** på grundlag af denne analyse. Den gamle tidsinterpolation er heller ikke en ny tilladelse til den tilbagekaldte fiktive historikreparation.

#### Ærligt restregnskab, ikke nyt ETA-løfte

Seneste afsluttede run `33863878600` sluttede rødt 2026-09-04T10:51:59Z (12.51.59 dansk sommertid) på main `61575559`. Target var 10Z med sidste time 2026-09-09T07:00:00Z. Der var 59.053/79.414 verificerede current-par. De tre officielle DKSS-lister havde hver 117 tilgængelige timer og én `UPSTREAM_ABSENT` time; lokalt manglende behandling var IDW 9 og NSBS 48, LF 0. `UPSTREAM_ABSENT` her er en collection-timeklassifikation, ikke en endeligt bevist samlet Copernicus-restmatrix: ledgeren var endnu ikke afsluttet.

For **netop de 57 eksisterende DKSS-filer**, ved samme modelrun og samme restliste, giver de senest målte samlede asset-loop-rater:

`9 × (691,2 / 48) + 48 × (674,4 / 70) = ca. 592 sekunder ≈ 10 minutters aktivt looparbejde`.

Dette er hverken en øvre grænse eller tid til komplet vejr. Start, cache, katalogkontrol, første gridopslag og afslutning er ikke fuldt dækket af en lineær ekstrapolation; fordelingen mellem filtyper varierer. Ved det almindelige ca. 17–18 minutter lange workflow er 1–2 yderligere uforstyrrede jobs et betinget skøn for denne begrænsede DMI-rest, ikke et klokkeslæt eller et færdigbevis. Nyt target/modelrun ændrer opgaven.

Der mangler fortsat et målt rest-/hastighedsregnskab for samlet valgt vind, fuld bølgetuple, vandstand, Copernicus-rest og den efterfølgende 673 × 118-validering. Seneste hovedvindstæller var 0/210, men DKSS-vindreserve findes; bølgehøjde var 671/673 med ca. 109,8 timers gennemsnit, ikke fuld tuple. Intet forsvarligt tidspunkt for **komplet vejr eller modelaktivering** kan udledes af currenttælleren alene. En ny øvre grænse må først gives, når de resterende nødvendige led er målt og deres progression er verificeret. De tidligere 36–40 minutters gentagne sourcegates er allerede fjernet for identisk, live-verificeret main; de skal ikke tælles som en endnu uafhjulpet årsag i de nye jobs.

Næste arbejde er at lukke gennemløbs-/restanalysen og vælge den mindste dokumenterede ændring, der reducerer eller pålideligt afslutter det nødvendige samlede arbejde. Det tidligere forslag om alene scheduler/3.000s-opbygning er ikke vedtaget som en tilstrækkelig løsning. Ingen ny dispatch, runtimeændring, cacheændring eller publicering er udført i dette analyseafsnit.

Ejeren afviser, at stigende strømoptællinger alene kan forklare dage uden en brugbar samlet prognose. Hele inputkæden skal vurderes: primær vind, DMI-vindreserve, bølger, vandstand, strøm, temperatur, fallback, historik, cache, scheduler og publicering. Det er ikke tilstrækkeligt at kalde en rød produktionskørsel vellykket, fordi cache-save er grøn.

Der er nu konkret evidens for et lokalt fordelings-/opbygningsproblem: større native-current-arbejde og strengere frigivelseskrav er lagt ind i en lille vedligeholdelsesramme. Et krav om fuldt, eksakt tidsbundet currentbevis anvendes også som prioriteringssignal og kan tilsidesætte balanceringen mellem vejrtyper. Vind og bølger modtager faktisk budgetstop. Dette er ikke dokumentation for generelt fravær af DMI-filer.

## Aktuel kode og afgrænsning

- `origin/main` er live-kontrolleret som `61575559b82ad22ca3d3fa3f86b43d846f0f7581`, PR #250 merged. Lokal branch/head er fortsat `codex/ravscore-real-bundle-closure`/`917d926e`; den hentede main har samme indhold som det testede head.
- Kildegenbrug er bevist i run `33857274983`: live source-proof grøn, lang kildekontrol skipped. Copernicus-journalens nye genbrug er endnu ikke bevist i produktion, fordi de første nye main-kørsler stoppede før supplementet.
- Run `33862230453` var allerede startet af den eksisterende workflow-dispatch-kæde og hentede DMI ved seneste kontrol. Der er ikke startet ekstra job under analysen. Scheduled pilot `33858739097` er grøn, men grøn pilotstatus alene er ikke et 673 × 118-bevis.
- Sidste kendte offentlige deployment er `6178736387`, run `33378344817`, source `8c03e25d`, dataset `rr-20260831093917-210`. Den kendte offentlige 210/673-pakke har 0 aktive scorezoner. Ingen state-6-release påstås.

## Målinger på hele inputkæden

Afsluttende frisk kontrol: `33862230453` sluttede også rødt med `DMI_LOCALLY_SKIPPED_DKSS_ASSET`. Ved det nye target 2026-09-04T10:00:00Z var current 42.445/79.414, primær vind fortsat 0/210, DKSS-vindreserve 210/210 med mindst 96 timer og bølgehøjde 671/673 med ca. 110,2 timers gennemsnit. Begge WAM, HARMONIE, IDW og NSBS fik budgetstop. Nyt target betyder, at differencen fra forrige currenttal ikke er en ren downloadtæller. Dette bekræfter all-family-problemet efter endnu en faktisk genoptagelse; ingen ekstra kørsel blev startet af analysen.

Seneste færdige måling: run `33857274983`, job `100984647170`, target 2026-09-04T09:00:00Z. Tallene er eksisterende komponentoptællinger, ikke et nyt fuldt model-/proveniensbevis.

| Input | Observeret status | Præcis begrænsning |
| --- | --- | --- |
| Primær HARMONIE-vind | 0/210 zoner og 0/673 dele med brugbar sammenhængende fremtidig hovedvinddækning | Må ikke oversættes til, at al vind er fraværende |
| DMI-vindreserve fra DKSS | 210/210 zoner med mindst 96 timers scalar-vinddækning; gennemsnit ca. 110,4 timer | Den faktiske forbruger vælger primær vind først og DKSS-reserven ved manglende primær; dette tal beviser ikke alene fuld 118-timers tuple/proveniens |
| Bølger | 671/673 dele med mindst 96 timers bølgehøjdedækning; gennemsnit ca. 110,5 timer over alle dele | Ikke 118/118; højdemålingen beviser ikke komplet højde/periode/retning eller Feggesund-proxy |
| Samlet marine | 198/210 zoner og 622/673 dele med mindst 96 timers kombineret vandstand/currentdækning | Samlemålet må ikke beskrives som en selvstændig vandstandstæller |
| Eksakt current | 28.189/79.414 verificerede del/time-par, mod 12.724 i forrige run på samme target | 15.465 flere verificerede par, men ingen samlet closure |
| Vandstand og vandtemperatur | DKSS-processoren genkender begge parametre | En særskilt fuld 118-timers optælling for hver er ikke udlæst i denne analyse; må ikke kaldes komplet |
| Stationsvandstand, Open-Meteo/MET og central prognose | Ligger i senere `update-weather.mjs`-trin | Trinet blev ikke nået; eksisterende fallback hjælper ikke, når orkestreringen stopper før det |
| Historik | Ingen frisk samlet offentlig produktion | Ingen ny komplet historik påstås; den tilbagetrukne kunstige reparation genoptages ikke |

Alle tre DKSS-kataloger havde 118 officielle assettimer. IDW var 18 færdige/100 lokalt uafsluttede; LF 118/0; NSBS 70/48. Det er assettimer pr. model, ikke kystdele. DMI-update downloadede 626.316.502 bytes og sprang 136 allerede behandlede assets over. GRIB- og zonecache-save var grønne.

Loggens sikre fejlfelter viste `RUNTIME_BUDGET_REACHED` for både NSBS, IDW, WAM-DW, WAM-NSB og HARMONIE. WAM/HARMONIE havde ingen genkendte parametre i dette forsøg. De blev altså forsøgt i kontrolløkken, men fik ikke udført databehandlingen. Hovedstoppet var `DMI_LOCALLY_SKIPPED_DKSS_ASSET`. Ingen generel netværks-/DMI-mangelforklaring er bevist.

## Sammenligning med fungerende gammel drift

`scripts/update-dmi-bulk.py` er uændret mellem den oprindelige 4.0.305-docsbaseline `9c6e161e` og den senere grønne `8c03e25d`. Den er derfor relevant som tidligere producentbaseline, selv om øvrige app-/workflowfiler udviklede sig.

Run `33378344817`/job `99444895545` gennemførte DMI på 58 sekunder, Copernicus på 25 sekunder og central vejrbygning på 91 sekunder. DMI-download var **0 bytes**, og 210 færdige assets blev sprunget over. Det var varm vedligeholdelse, ikke en ny fuld cacheopbygning; den må ikke sammenlignes direkte med kold downloadhastighed.

Den gamle producent valgte efter de første seks timer hovedsageligt hvert tredje forecasttrin. På det nuværende eksemplificerede 118-timersvindue fra model+3 til model+120 vælger den faktiske stridefunktion 44 assettimer; det nye eksakte currentkrav kræver 118. Det er ca. 2,7 gange så mange timefiler pr. DKSS-domæne, ikke nødvendigvis samme faktor i CPU, bytes eller samlet køretid. Kravet må ikke fjernes for at få grønt.

Den gamle grønne kørsel beholdt brugbare ældre modelruns. Den nye DKSS-native udvælgelse tilsidesætter preferred-run og vælger den nyeste modne native run. I de observerede kørsler skiftede DKSS fra 00Z til 06Z, og det nye runs eget bevis skulle opbygges. DMI udgiver DKSS fire gange i døgnet; systemet skal kunne afslutte og vedligeholde hele pakken inden næste fornyelse, ikke kun vise positive differencer inden for ét snapshot.

## Den kausale kæde i koden

1. `current_operational_cache_ready` bruger `validate_current_operational_ledger`, som kræver fuld ledger og præcis `productionReferenceAt`/sluttid. Ved et nyt target kan forrige times ellers gyldige ledger derfor ikke være READY for det nye target. Det er korrekt for slutgodkendelse.
2. Samme fulde READY-boolean fødes ind i `prioritize_strict_current_recovery`. Når den er false, flyttes **alle tre DKSS-collections foran både vind og bølger**, efter den balancerende `collection_schedule` allerede har bestemt sin rækkefølge.
3. Den almindelige workflowramme er fortsat 900 sekunder inklusive 120 sekunders afslutningsreserve og højst to produktive collections. At workflowtrinnets ydre timeout er 55 minutter ændrer ikke producentens interne ca. 13 minutters arbejdsbudget.
4. Et DKSS-domæne kan forbruge restbudgettet; de senere familier får budgetstop. På nyt target/run kan den skarpe strømprioritering genindtræde. Cache-save bevarer det udførte arbejde, men giver ikke alle familier tilstrækkelig fremgang.
5. Den strenge DMI-terminalgate stopper derefter korrekt før Copernicus, `update:weather`, stationsobservationer/fallback, modelbygning og publicering. Derfor kan en enkelt inputfamilie blokere hele den ellers eksisterende kæde.
6. Før PR #250 forstærkede 36–40 minutters gentaget sourcegate problemet. Dette led er nu konkret afhjulpet. Den separate Copernicus-journalfejl er implementeret, men er ikke endnu live-bevist.

Introducerende spor: `3a26ba0c` tilføjede strict-current-prioriteringen; `1118e8d9` ændrede dens input fra et genbrugeligt currentgrundlag til hele `current_operational_cache_ready`-kontrakten. Det samlede samspil, ikke kun én af linjerne isoleret, skal rettes.

Én skrivefri syntetisk prøve af den faktiske AST-udtrukne prioriteringsfunktion beviste, at en rækkefølge med HARMONIE/WAM på plads 2/3 omdannes til tre DKSS først ved ufuldstændig ledger. Samme prøve ændrede ingen data eller kode. Dette beviser prioriteringseffekten, ikke en færdig rettelse.

## Cache, kapacitet og usikkerheder

GitHubs cache-usage viste ca. 9,38 GB. Fire rå GRIB-cachegenerationer i inventory optog ca. 2,28–2,32 GB hver. Disse metadata er ikke Supabase-egress. GitHub beskriver automatisk udsmidning af ældre cache ved pladsgrænsen og risiko for gentagen cacheopbygning. Den konkrete repos storage-limit-endpoint svarede HTTP 402, så en særlig konfigureret grænse er ikke verificeret, og der er ikke ændret betaling eller kapacitet.

Cachepresset er en relevant forstærker/kapacitetsrisiko, men **ikke bevist årsag til tab af den seneste DMI-cache**: de observerede restores/saves og 136 oversprungne assets beviser faktisk genbrug. Ingen cache må ryddes blindt. Supabase før/efter-kapacitetsmålingen før modelaktivering består som selvstændig opgave.

## Afgrænset rettelsesretning – endnu ikke implementeret

1. Ret indsamlingens fordeling samlet: fyldning/vedligeholdelsesprioritet skal ikke afgøres af et gammelt snapshots komplette frigivelsesstempel. Beregn faktisk aktuelt underskud og giv alle nødvendige inputfamilier målbar fremgang. Bevar den strenge terminale 118-timers/proveniensgate uændret. Fjern ikke blot DKSS-prioritering uden at bevise, at current selv fortsat afsluttes.
2. Genbrug den eksisterende samlede dataopbygningsvej (`operational_118_preflight`) frem for at bruge almindelige små vedligeholdelseskørsler som eneste opbygningsmetode. Den har allerede 3.000 sekunder, seks collections, samme cachevej og ingen fuld source-/releasegentagelse. En større timeout alene er ikke løsningen: all-family-fremgang, budget og modelrunskift skal følge samme plan.
3. Mål både samlet valgt vind inkl. provenance, bølgetuple, vandstand, current og relevante historikfelter på den samme 210/673/118-akse. Gamle 96-timers scalaroptællinger er diagnostik, ikke acceptbevis. Temperatur og stationsdata klassificeres separat efter deres faktiske produkt-/scorekrav.
4. Mål cachehit/-save og faktisk ny data pr. familie over mindst én genoptagelse og et target-/modelrunskift. Bekræft, at de store GRIB-kopier ikke skubber nødvendig lille progression ud. Ingen ny scheduler, storageplatform, geometriændring eller vilkårlig kildeerstatning.
5. Få måltests skal bevise all-family-liveness, delvis cache/genoptagelse, nyt target, nyt modelrun, uændret streng terminalgate og DMI-først/Copernicus-kun-rest. Derefter én CI-kildekontrol, sikker merge og ét serielt dataopbygningsforsøg; ingen blinde gentagne dispatches.

Dette var den foreløbige rettevej før ejerens indvending. Nyeste præcisering ovenfor har forrang: afslut den kvantitative gennemløbs-/restanalyse før valg af rettelse. Bevar arbejdet fra PR #250 og den samlede integrerede model; ingen rollback, svækkelse af datakrav eller kunstig historikreparation. Sol/Ekstra høj kræves til analysen, en eventuel rettelse og review.

## Kilder og validering

- Lokale kode-/gitreferencer ovenfor; GitHub-runs `33378344817`, `33850491771`, `33856228257`, `33857274983`; kun projekterede optællinger, parameternavne, status, tider og faste fejlkoder blev udlæst. Ingen rå logs blev gemt.
- [DMI DKSS](https://www.dmi.dk/friedata/dokumentation/data/forecast-data-storm-surge-model-dkss): fire modelruns og fem døgns native horisont.
- [GitHub cache-reference](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching): grænser, eviction og risiko for cache thrashing. Repoens konkrete limit er uafklaret, ikke antaget.
- RDKS-kontrollen bestod før dokumentationsændringen; den afsluttende kontrol registreres i handoff. Ingen fuld lokal sourcegentagelse, ingen rå/private data eller lokale caches læst, ingen geodata/punkter ændret.
