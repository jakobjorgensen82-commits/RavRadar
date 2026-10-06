# Jordrav – model og kortprototype 0.1

> Historisk kortstatus: denne rapport blev udført med model 0.1.
> Nationale farver og klasseregler er siden revideret i
> [model 0.2](JORDRAV_NATIONAL_MODEL_0_2.md). Rapportens kildeobservationer
> bevares; udsagn om frosne regler, guide-only levering og åbne nationale
> farveændringer er supersederet. Gamle regelbundne audits reproduceres
> fra commit eee7b08e.

**Status:** lokal forskningsprototype, endnu ikke en offentlig RavRadar-release.
**Dato:** 2026-10-04. **Evidensklasse for ravslutningerne:** eksplicitte geologiske hypoteser.

Den dybe [faglige analyse](JORDRAV_POTENTIALE_DANMARK_2026-10-04.md) omsættes her til gennemgåelige regler og faktiske kildepolygoner. Modellen udpeger muligheder uden at kræve tidligere ravfund. Den beregner hverken fundprocenter, ravmængde eller RavScore.

## Seneste genovervejelse: tidligere kystmarker

Ejerens Asaa–Voerså-eksempel er generaliseret gennem en national native
diagnose og fem nye mark-/kystcases. [Analysen](JORDRAV_TIDLIGERE_KYSTMARKER_DANMARK_2026-10-04.md)
viser relevante marine flader uden særskilt udpegning og forskelle mellem
Hals–Hou, Jerup–Ålbæk, Lammefjord, Rødbyfjord og Hjardemål. Alle seks nye
cases har DA/DE/EN-guide, så der nu er 11 guides. De flytter kortet og
forklarer muligheder; de giver ingen regionale klassebonusser.

**Generel geologi · ingen særskilt udpegning** erstatter den grønne
standardflade som ufarvet/klikbar visning. Den angiver hverken hvor dybt
området er undersøgt eller fravær af rav. Frosne regler klassificerer
stadig kategorien som `possible`. Dette er en ændring af visning og
forklaring, ikke en efterfølgende modelbygning. En mere komplet national
prioritering er fortsat åben, og orange kan ikke bruges som komplet
markravudvalg. Jagtbarhed, finere modtagere og senere dække vurderes særskilt.

Seneste lokal kontrol: 18 faktiske browserchecks med 11 guides og begge
baggrunde, fem data-/modulkontroller, 11 modelcases og source-critical
109 browserfiler PASS. Desktop, ufarvede klik, luftfoto og 390 px mobil er
visuelt læst; skærmbilleder venter på synlige fliser. Tidligere tal i
daterede afsnit nedenfor beskriver tidligere kontrolforløb, ikke dette head.

## Jagtbarhed og dybe lag – seneste ejerbeslutning

Ejeren ønsker også dybe geologiske muligheder på kortet, når de tydeligt
adskilles fra jagtbart materiale. Det erstatter det foregående ønske om at
udelade dem. **Kortfarver** skifter mellem geologisk potentiale og
jagtbarhed uden at omklassificere eller flytte geometri. I jagtbarhedsvisningen
er alle eksisterende materialeflader gråblå/uafklarede; ingen er verificeret
som aktuelt blotlagt eller tilgængelig ved pløjning. Klikpanelet gør denne
usikkerhed synlig også i den almindelige potentialevisning.

Lilla punkter viser to tidligere kontrollerede Jupiterprofiler: Åsted Vest
82–89 m og Ålbæk Lyngshede 80–90,5 m; 107–112 m under boringens historiske
terræn. De vises som **ikke umiddelbart jagtbare**, uden ravfund eller antaget
udbredelse. Separat checkbox styrer dybe punkter; hovedvalget styrer alle
geologiske lag. Fokus på forhøjet procespotentiale filtrerer materialeflader,
mens dybe punkter styres særskilt. Kode: `js/jordrav/accessibility.js` og
`js/jordrav/map.js`. Ingen ny live boringsservice eller ændring af frosne
producentfiler, regelsæt, manifest eller fladedata.

[Metoden](JORDRAV_JAGTBARHED_DYBDE_2026-10-04.md) forklarer registreret dybde,
ukendt dække og nødvendig lokal lagforbindelse. Mulighed for ravtilførsel
kræver fortsat ikke et tidligere ravfund.

## Hvad kortet gør

En senere [native Stenstrup-diagnose](JORDRAV_STENSTRUP_KONTAKTER_2026-10-04.md)
viser, at fokus på forhøjet kun viser 0,43 % af den undersøgte issøflade.
Brug alle klasser ved undersøgelse af egnen. TS/TL-kontakter, yngre dække og
modtagere/JH-012–014 er forskningsspor; denne diagnose ændrer ingen klasser.

En ny **Jordrav**-fane åbner `jordrav.html` med sin egen Leaflet-instans. Navigationen går mellem to selvstændige kortsider. Jordravsidens modulgraf importerer ikke kystapp, vejrservice, Supabase eller produktionskonfiguration. Den almindelige kystside registrerer kun fanens tre oversatte tekster; den henter ikke jordravdata.

**Almindeligt kort** og **Luftfoto** er synlige baggrundsvalg. Skift ændrer kun baggrunden, mens farveflader, valgt flade, forklaring, kortcentrum og zoom bevares. Luftfoto bruger den eksisterende World Imagery-tjenestetype. En særskilt GeoDanmark-adgang er ikke oprettet. Begge leverandørers attribution og Esris vilkårslink vises.

Overblikket viser landsdækkende, generaliserede potentialeflader. Fra zoom 11 hentes statiske lokale udsnit. Et klik viser øvre kortlagte aflejring, materiale omkring én meter, landskabsproces, mulig ravhistorie, separat sikkerhed, overfladerelevans og kilder. Farvestyrken kan ændres, og laget kan skjules.

Fokusvalget viser kun **forhøjet procespotentiale** og kan gendanne alle klasser. Det skjuler også mulige bassin- og marine miljøer; deres klassifikation ændres ikke. En særskilt [regional guide](JORDRAV_REGIONALE_KAEDER_2026-10-04.md) uddyber de første fire ravkæder. [Den dybere transport- og markanalyse](JORDRAV_TRANSPORT_PLOEJELAG_2026-10-04.md) tilføjer Vendsyssels tidligere kyster som femte case. Alle fem har kilder, undersøgelsesretning og modargumenter. Regionsvalget flytter kun kortudsnittet; det tegner ingen ravgrænse og giver ingen klassebonus. Kode: `js/jordrav/regional-hypotheses.js` og `initialiseRegionalGuide()` i `js/jordrav/map.js`.

Markguiden adskiller rav i det bearbejdede jordlag, pløjningens blotlægning og regnens afvaskning/synlighed. GEUS kortlægger oprindelige aflejringer under pløjelaget, omkring én meters dybde. `jsym1` beskriver en øvre geologisk aflejring, ikke det aktuelle pløjelags ravindhold. Ens symboler dokumenterer ikke pløjerelevans; forskellige symboler angiver ikke præcis dæklagstykkelse. Tidligere UI-label **Ved overfladen** er erstattet med **Øvre kortlagte aflejring** på DA/DE/EN. Intern modelkategori `near-surface` og det frosne datasæt er uændrede.

## Regler og deres faglige betydning

Den supplerende [boringsanalyse](JORDRAV_BORINGER_LAGFORBINDELSE_2026-10-04.md)
efterprøver to offentlige profiler mod de eksisterende visningsflader. Den
ændrer ingen kortregler eller geografiske punktcirkler. De udvalgte dybe
intervaller vises nu som statiske punkter efter seneste ejerbeslutning. JH-010–011 præciserer
spørgsmål om lagkontakter; de indgår ikke som nye regionsknapper.

Reglerne står i `data/jordrav/model-rules.json`; de eksekveres af `scripts/lib/jordrav_model.py` og bruges af `scripts/build-jordrav-prototype.py`. Jordartens øvre symbolfelt, ikke blot visningsfarven eller den dybere jordart, er det primære materialegrundlag. Regelsættets ord overflade beskriver den øvre geologiske aflejring; det må ikke læses som en særskilt prøve af nutidens jordoverflade. Blandede GEUS-symboler behandles som blandinger. `DS-DG` er kompatibelt sand/grus; `DS-DL` bliver ikke stiltiende gjort til rent sand.

| Klasse | Konkret regel i prototypen | Hvad slutningen betyder |
|---|---|---|
| Forhøjet procespotentiale | Smeltevandssand/grus i hedeslette, ås, issøbakke, erosions-/tunneldal eller randmoræne; marint sand/grus i strandvold; ferskvands-/deltasand og grus i dal eller modtagerbassin | Materiale og landskabsproces passer til en mulig transport-/omlejringskæde. Lokal ravtilførsel er ikke påvist. |
| Muligt potentiale | Andre vurderbare naturlige sedimenter, herunder moræne, fine bassinaflejringer, marine flader og dæklag | Omlejring eller lagring er mulig, men kæden og overfladerelevansen er svagere belyst. |
| Begrænset ved overfladen | Kortlagt fast bjergart/kalk ved overfladen | Begrænset støtte til den vurderede kæde af løse, overfladenære sedimenter; små yngre lommer kan være udeladt. |
| Uafklaret | Manglende/ikke vurderbart materiale, kildekonflikt eller landskab uden for markravvurderingen | Datagrundlaget kan ikke afgøre muligheden. Det er ikke negativ ravviden. |

**Forhøjet procespotentiale er en bevidst snævrere betegnelse end en færdig, regionalt verificeret ravprioritering.** Analysens foreslåede endelige klasse “forhøjet geologisk potentiale” omfattede en mere sammenhængende tilførsels- og bevaringshistorie. Første prototype synliggør den kortbaserede proceshypotese, mens lokal tilførsel og bevaring er åbne. Den gør ikke ukendte lag til dokumenterede ravlag.

Alle ravslutninger har **svag sikkerhed** i denne version. Det er en positiv udpegning af muligheder med en eksplicit begrænset sikkerhed, ikke et krav om at vente på nye fund. Jordartskortets detaljeringsgrad og ravslutningens sikkerhed vises hver for sig. Det grovere supplement udgiver sig ikke for at være 1:25.000.

Flyvesand, tørv eller gytje kan dække og omlejre et ældre lager. Sand omkring én meters dybde giver derfor ikke automatisk overfladen den forhøjede klasse. Forskellige overflade-/dybdefelter markeres som lagdelte; kortet opfinder ikke en præcis dæklagstykkelse. By, fyld og råstofgrav bliver ikke erstattet med en historisk naturlig jordart.

Israndslinjerne bruges ikke som bonusinput. Geografisk overlap er ingen kronologi. Der indgår heller ikke fundcirkler, afstandsbonus, en automatisk brunkulsbonus eller antagelsen om én fælles skandinavisk/baltisk ravoprindelse.

## Hypoteser til faglig efterprøvning

| ID | Hypotese | Relevant primærevidens og afgrænsning | Hvad kan svække eller ændre reglen? |
|---|---|---|---|
| JH-001 | Kompatible overfladenære sand-/gruslag i smeltevands- eller erosionsmiljø er interessante modtagere for omlejret rav | Pedersen 2005 beskriver ravpindelag og en kompleks glaciotektonisk/smeltevandskæde ved Rubjerg. Overførsel til andre polygoner er en hypotese. | Regional stratigrafi viser manglende tilførsel, fjernet lager eller sortering uden relevante organiske letfraktioner. |
| JH-002 | Sandede strandvoldsmiljøer kan være gentagne marine koncentrationssteder | Bennike & Jensen 1998 dokumenterer rav og ældre organisk materiale i flere baltiske marine sedimenter. Det er ikke dansk markfundkalibrering. | Tilførselsveje, strandvoldens alder eller yngre dæklag gør den formodede sammenhæng usandsynlig. |
| JH-003 | Yngre ferske bassiner kan modtage rav fra ældre sedimenter | Hartz 1909, især s. 107, viser, at yngre ferskvandsaflejringer og ler ikke må afvises alene på alder eller finkornet materiale. | Et bassin har isoleret tilførsel eller et tykt dæklag, som fjerner den overfladenære relevans. |
| JH-004 | Glaciotektonik kan flytte og bevare ravførende sedimentpakker uden at gøre hele morænelandskabet til et hotspot | Rubjerg, de historiske sjællandske sandflager og den regionale kvartærgeologi støtter mekanismen. | Det konkrete sandlag kan ikke forbindes med den foreslåede ældre pakke; en ny isoverskridelse har eroderet den. |

Efterprøvningen kan ske mod eksisterende stratigrafi, litteratur og ekspertkritik. En ny funddatabase, brugerindberetning eller læringspipeline er ikke en forudsætning.

## Kildeprioritet og geometri

De tre materialiserede lag er de SHA-kontrollerede GEUS-jordarter v7.1, jordarter v2 og geomorfologi v3 fra forskningsauditen. Nyere klassificerede jordarter har forrang. Ældre geometri skæres til X-områder og geografiske huller. Konflikter mellem ældre kategorier markeres som uafklarede i stedet for at blive dækket af den sidst tegnede polygon. Alle lokale flader har originalt kilde-ID og forklaringstabel-ID. Kilde-ID'erne `n`, `s` og `g` er de nulbaserede postpositioner i henholdsvis nyere jordarter, ældre jordarter og geomorfologi, bundet til kildens SHA; de er ikke universelle GEUS-identifikatorer. Det generaliserede overblik samler klasser, mens lokale detaljer bevarer kildekoblingen.

Kildernes CRS er EPSG:25832. Ringselvskæringer normaliseres med en log over ID, årsag og arealforskel. Der anvendes et målt 0,01 m beregningsgitter. Det ældre kort indeholder også digitale sliver, som kollapser på dette gitter; antal, ID og deres meget små arealer registreres. Det er afledt visningsgeometri, ikke ændringer af originalarkiverne eller RavRadars kystgeometri.

Overlays skæres i 20 km-udsnit, fælles grænser kontrolleres og forenkles samlet. Lokalt anvendes 20 m forenkling; overblikket 100 m. Små øer og huller fjernes ikke som en generel størrelsesregel. Native arealer, overlap, eventuelle kildesammenfald og numeriske normaliseringer registreres. Punktberørende hul-/yderringstilfælde opdeles med begrænset triangulering, så kategorier, kilde-ID og polygonens arealaftryk bevares.

Omregning til WGS84 kræver fælles knudepunkter og punkter på lange rette UTM-segmenter. Detaljer bruger højst 50 m segmenter, normalt otte koordinatdecimaler og en målt ekstra visningsgrænse på 5 mm. Overblikket bruger højst 500 m segmenter, normalt seks decimaler og en ekstra grænse på 0,5 m. Det er særskilte numeriske eksportgrænser, som ikke skal forveksles med 20/100 m generalisering eller geologisk præcision. Smalle flader beholder fuld koordinatpræcision, hvis afrunding ødelægger dem. En nøjagtig eksportdækning og en numerisk søm inden for eksportgrænsen er forskellige auditresultater; sidstnævnte kaldes ikke perfekt dækning.

Det endelige landskort består af klasser samlet **inden for adskilte 20 km-celler**. Alle 192 celler har gyldig native fællesgrænsedækning før og efter generalisering, og klassernes geometri holder sig inden for deres egen celle. Tre cellers efterfølgende klassegruppering har et falsk eksakt dækningsflag ved punktkontakter; dette registreres åbent. Den forudgående partition og den bevarede arealsum er kontrolleret. Der påstås ikke eksakt national eksportdækning. Den største målte ekstra inverse projektionsafvigelse i overblikket er 0,225 m, under 0,5 m-grænsen.

Et tidligere forsøg med én national geometrisk union blev forkastet: fællesgrænsekontrollen gav numeriske sømme og en beregnet overlapforskel på ca. 0,013 m². Grovere beregningsgitre løste ikke fejlen og flyttede kildearealer; de blev ikke anvendt. Et første for tæt segmenteret overblik på 21,2 MB gzip blev også erstattet. Den leverede cellebaserede eksport kræver hverken ændrede kildepolygoner eller hævede browsergrænser.

Originale nationale GIS-filer og normaliseringscache ligger i temp. Produktionen får kun afledte statiske filer. `data/kystdata.json` og `data/zones.geojson` ændres ikke.

## Levering, cache og ressourcegrænser

Manifestets SHA er bundet i `js/jordrav/dataset-binding.js`. Manifestet binder geometri, katalog og regelsæt med SHA, modelversion samt komprimeret og dekomprimeret størrelse. Browseren afviser mismatchet indhold. Gzip-dekomprimering bruger browserens standardfunktion.

Afgrænsede `.gitattributes`-regler bevarer de SHA-bundne data og de to producentkilder byte for byte mellem Windows og Linux. Datakontrakten kontrollerer producent-/regelsætsidentiteter, pakkede regler og hvert udsnits faktisk eksporterede featureantal. Git-indeksets bytes efter staging kontrolleres separat mod arbejdsfilerne.

Producentfilens oprindelige CRLF bevares for at fastholde den faktisk udførte scripts SHA. Dens afgrænsede whitespace-regel accepterer CR som linjeskift og bevarer de almindelige blanktegnskontroller; første diffkontrol med en udeklareret CRLF gav en fejl og bruges ikke som PASS. Se [Gits attributdokumentation](https://git-scm.com/docs/gitattributes#_checking_whitespace_errors).

Den færdige bygning har 598 overbliksfeatures, 505.834 lokale features i 192 udsnit og 4.652 forklaringskombinationer. Overblikket er 5.941.601 gzip-bytes (18.046.173 dekomprimerede bytes). Alle lokale udsnit tilsammen er 111.648.298 gzip-bytes; det største er 1.421.147 bytes. Det samlede detailarkiv hentes ikke ved åbning.

De beregnede kildearealer er ca. 5.349 km² forhøjet procespotentiale, 36.481 km² muligt, 89 km² begrænset og 1.867 km² uafklaret. Ældre materiale supplerer ca. 3.148 km². Dette er afledte arealer fra de anvendte kortaldre, **ikke** verificeret nutidigt landareal eller arealer med påvist rav. De bør ikke omregnes til nationale fundchancer.

Der hentes højst tre lokale udsnit samtidigt og højst 12 for et enkelt kortudsnit. Cache er begrænset til 18 udsnit og 24 MiB dekomprimeret JSON. Kun features med en bounding box, som rammer visningen, tegnes; over 12.000 kræves yderligere zoom. Det er ressourcegrænser, ikke geologiske grænser.

Ingen nationale detaljer precaches til kystbrugere. Eksterne baggrundsfliser hentes til den synlige visning; der er ingen massehentning/offlinepakke. Hosting og tiletrafik er stadig reelle ressourcer. Faktiske payloads og lokale browsermålinger skal læses i build-/browserauditen, ikke udledes af arkivernes rå størrelse.

## Validering og resterende arbejde

**Seneste UI-prøve: 15 browserchecks PASS.** Ny jagtbarhed, lilla punktmarkører,
præcise adskilte dybdeintervaller, kildepanel, særskilt/samlet skjul/vis,
baggrundsskift og mobilbredde er kontrolleret. Screenshot af dybe lag venter
på færdige materialeflader og alle synlige OSM-fliser. Desktop/mobil er
visuelt læst. National opstart 1.021 ms/6.050.674 geologi-bytes; det lokale
kontroludsnit yderligere 791 ms/5.099.092 bytes. De faktiske tal er lokale
målinger uden netværksbegrænsning, ikke produktions- eller telefonbevis.
Pages-modulclosure består med 59 browsermoduler. Kilder og deres intervaller
stemmer med de tidligere gemte observationer; ingen adgang eller geografisk
udbredelse opfindes ud fra materialeflader eller boringspunkter.

To nye testharness-forsøg fejlede først: en sammenligning brugte et centrum
fra før mellemliggende kontrolhandlinger, og en evaluate-callback returnerede
et cirkulært Leaflet-objekt. Sammenligningen tager nu snapshot umiddelbart
før farveskift, og callbacken returnerer intet kortobjekt. Disse forsøg er
ikke PASS. En første grøn optagelse viste stadig igangværende indlæsning;
derfor kræver den endelige grønne prøve også færdigindlæst dybdevisning.

**Bestået lokalt:** 11 modelcases og fem data-/modul-/sprogkontroller, som kontrollerer alle afledte filer og model-/manifestbindinger. Casene dækker muligheder uden fundkrav, sand uden proces, dæklag over sand, blandede GEUS-felter, ukendt/kunstigt materiale, brede ældre hovedgrupper, entydige landskabsbetegnelser, fast bjergart og fravær af brunkulsbonus. Source-critical-gaten består med 109 browserfiler; den eksisterende source-kontrakt bevarer sine 47 grupper. RDKS, sikkerhedshærdning, håndbog, offentlig startorden og version-/modulclosure består også.

En uafhængig kontrol genlæste 238.829 cacheposters attributter mod originale DBF-poster og bandt både kilde-SHP/DBF og cachemetadata/geometri med SHA. De 194 kollapsede ældre mikroflader er særskilt auditeret. Bygningen genbrugte 192 allerede kontrollerede detailudsnit; auditens 279 sekunder er kun sidste invocation, ikke en måling af en fuld kold genbygning. Tre tidligere producent-scriptidentiteter er bevaret i checkpointprovenancen. Dette er ikke påstået identisk med en senere komplet kanonisk genbygning fra friske kildearkiver.

**Tidligere browserprøve: 11 kontroller PASS.** Faktiske polygonklik giver en positiv ravhypotese; kortskift bevarer valgt geometri, forklaring, centrum og zoom. Farvestyrke, skjul/vis, mobilbredde 390 px, DA/DE/EN og eksplicit fallback ved manglende lokale filer er kontrolleret. Begge offentlige tileleverandører svarede; 20 luftfotofliser svarede, og alle synlige fliser blev indlæst før den visuelt gennemgåede optagelse. Browseren hentede ingen vejr-/Supabase-data. National opstart måltes til 804 ms og 6.050.674 geologi-bytes; det undersøgte lokale udsnit efter regional navigation til yderligere 735 ms og 5.099.092 bytes. Målingerne er fra lokal Chrome, varm filsystemcache og uden netværksbegrænsning; de er ikke produktions- eller fysisk mobilmålinger.

Detaljeret evidens ligger i `docs/research/jordrav/prototype-build-audit.json`, `prototype-source-cache-audit.json` og `prototype-browser-audit.json`. Skærmbillederne er visuelt gennemgået. Det aktive webhåndbogsafsnit med SQL-installationskopi ændres ikke her; et konkret, gyldigt tillæg ligger i `handbook-supplement.json` til senere koordineret integration.

Før jagtbarhedsændringen havde browserprøven 12 kontroller og dækker også fokus på nationale/lokale flader, gendannelse af alle klasser, fem regionale guides og markguidens pløjelagsforklaring på mobil og DA/DE/EN. Et faktisk tabt regionsvalg under igangværende zoom er rettet med offentlige zoom-/bevægelseshændelser og indgår fortsat som regression. De tidligere fejlslagne forsøg er særskilt beskrevet i den regionale analyse; det er den korrigerede samlede prøve, som er PASS.

En lokal prototype er ikke CI- eller produktionsbevis. Før fælles levering skal nyere main og aktive produktionsskrivere kontrolleres; RDKS-tillæggene integreres med nyere dokumentation. Ingen merge eller deploy foretages, mens den eksisterende produktionsskriver er aktiv. Ingen vejrkørsel dispatches fra denne gren.

Åbne faglige punkter omfatter regional tilførsels-/bevaringskobling, følsomhed ved alternative mekanismer og kildernes forskellige kortaldre langs ændrede kyster. Et særligt luftfoto-abonnement/adgang og måling på fysisk mobilhardware er ikke dokumenteret. Klassernes stærkere, regionalt underbyggede efterfølger kræver mere analyse; den første kortvisning kræver ikke nye ravfund.
