# RavScore forskning - evidensbase og kodeaudit

**Status:** Fase A-B igangsat score-neutralt 2026-08-20  
**Beslutning:** DEC-0029  
**Produktionspåvirkning:** Ingen. Dette dokument ændrer ingen score, vægt, tærskel, datakilde eller geometri.

## Formål og stopregel

Målet er at vurdere RavRadars fysiske årsagskæde før en ny scoremodel overvejes. Analysen holder fem forhold adskilt:

1. kilde og tilgængeligt ravlager;
2. frigivelse og mobilisering;
3. transporthistorik;
4. nærkystlevering, koncentration og aflejring;
5. jagtbarhed, synlighed og sikkerhed.

Fase A-B leverer kodeaudit, systemmodel og første evidensmatrix. Ingen anbefaling her giver tilladelse til produktionskode. Nye signaler, vægte eller tærskler kræver senere fase C-D, valideringsresultater og en særskilt ejerbeslutning.

## Verificeret aktiv kodevej

Den aktive score kommer ikke fra rodfilen `ravscore.js`. Den fil er en historisk prototype uden import i den aktive app.

Den aktive kæde er:

- `app.js` importerer `calculateRavScore` fra `js/core/score-engine.js` og vælger normalt den centralt beregnede lokale kystdel gennem `js/core/local-zone-score.js`.
- `scripts/update-weather.mjs` bruger samme `calculateRavScore` ved produktion af vejrdatasættet.
- `js/core/score-engine.js` beregner de tre komponenter jagtbarhed, transport og mobilisering/tilgængelighed.
- `js/core/direction-anchors.js` omsætter lokal strømretning og kystretning til ind-/udtransport.
- `js/core/coastal-process-model.js` beregner en forklarende transporthændelse og shadow-state. Dens eventindeks indgår ikke direkte i den aktive vægtede score.
- `js/core/adaptive-model.js` kan ændre vægte og give browserlokale justeringer. Standardmodellen er fortsat 40/35/25.
- `js/core/rule-engine.js` kan blokere, overskrive eller justere en score, når en aktiv regel udtrykkeligt anvendes af kaldestedet.

## Aktiv score som kodefakta

| Del | Aktiv kode | Input og centrale spring | Maksimal direkte betydning | Evidensstatus nu |
|---|---|---|---|---|
| Jagtbarhed | Grundscore 60 | Jagtform, aktuel vindhastighed og bølgehøjde | 40 % standardvægt | Brugerrelevant, men tærsklerne er ikke videnskabeligt kalibreret mod sikkerhed, synlighed eller fund |
| Transport | Grundscore 34 | Aktuel strømstyrke/-retning, lokal kystretning, vindretning, 3-timers vandstandstrend og statiske kysttags | 35 % standardvægt | Retningslogikken er fysisk plausibel og lokalt sporbar; hastighedsbånd, bonusser og lofter mangler direkte ravvalidering |
| Mobilisering/tilgængelighed | Stærkeste af to spor | 24-timers maksimumvind/-bølge, tid siden høj energi, aktuel bølge/strøm, vandstandstrend og kysttags | 25 % standardvægt plus 7-points samspilsbonus inde i komponenten | Mekanismerne er plausible, men summering, tærskler og maksimumvalg er arbejdshypoteser |
| Adaptive justeringer | Normaliserede vægte og op til +/-25 slutpoint | Global, zone- og metrikjustering i browserlager | Kan ændre både vægte og slutscore | Skal auditeres særskilt mod ejerautoritet, reproducerbarhed og valideringsdata |
| Regler | Gate, override, bonus, penalty eller persistence | Geografi, jagtform, basisscore og udvalgte vejr-/historikfelter | Kan blokere eller overskrive hele scoren | Forklarlig mekanisme, men hver aktiv regel kræver separat faglig evidens |

### Konkrete aktive tærskler, som endnu ikke er valideret som ravtærskler

- Strøm giver højeste hastighedsbonus mellem 0,15 og 0,65 m/s; stærkere strøm giver mindre bonus.
- Strømretning kan flytte transportkomponenten med cirka -24 til +30 point før lofter.
- Waders-jagt skifter kraftigt ved 3, 6 og 8 m/s vind samt 0,3 og 0,7 m bølger.
- Strandjagt skifter ved 8 og 13 m/s vind samt 2,5 m bølger.
- Ny frigivelse skifter ved 9 og 14 m/s maksimumvind, 1,5 m maksimumsbølge og 3-18/48 timers hændelsesalder.
- Genmobilisering bruger 0,25-1,2 m aktuelle bølger og 0,12-0,65 m/s strøm som særligt gunstige intervaller.
- Vestkyst giver fem ekstra frigivelsespoint. Lavt vand, rev og vegetation kan påvirke både transport og genmobilisering.
- Den endelige standardvægt er 40 % jagtbarhed, 35 % transport og 25 % mobilisering/tilgængelighed.

Disse værdier er kodefakta, ikke dokumenterede naturkonstanter.

## Første systemiske auditfund

### Risiko for dobbelt-tælling

- Aktuel vind påvirker jagtbarhed og transport, mens maksimumvind påvirker mobilisering. Det kan være korrekt, hvis de repræsenterer forskellige tider og mekanismer, men overlap er ikke målt.
- Aktuel bølgehøjde påvirker jagtbarhed og genmobilisering; maksimumsbølge påvirker ny frigivelse.
- Aktuel strømstyrke og samme lokale retningsalignment påvirker både transport og genmobilisering.
- Lavt vand, rev og vegetation kan give bonus i både transport og retention/genmobilisering.
- Høj vind skaber ofte høje bølger. At bruge begge som uafhængige point uden korrelationskontrol kan tælle samme stormenergi flere gange.

### Vigtige data, der findes, men ikke bruges direkte i aktiv score

- Bølgeretning og bølgeperiode bruges ikke, selv om de er tilgængelige i forecastet.
- Hændelsesvarighed, verificeret strømvarighed, persistens og shadow-state vises i forklaring, men påvirker ikke den aktive score direkte.
- Rumlige strømfelter, opstrøms tilførsel og konvergens/divergens er score-neutrale forskningsdata.
- Absolut vandstand bruges ikke i grundscoren; kun 3-timers trend bruges. Aktive ejerregler kan dog matche absolut vandstand.
- Vandtemperatur er ikke scoreinput, og der er foreløbig ingen begrundelse for at gøre den til et.

### Modelrisici

- En additiv 40/35/25-model forudsætter, at en høj jagtbarhed kan kompensere for svag fysisk ravtilførsel. Det er ikke valideret.
- `max(freshRelease, remobilisation)` vælger det bedste spor og kan være optimistisk, især når begge spor bygger på overlappende input.
- Valg af den mest gunstige retningsanchor i bugtede hovedzoner kan give optimistisk udvælgelse. Den lokale 673-delsmodel reducerer denne risiko, men den skal måles.
- Manglende strøm begrænser transport, men manglende bølger begrænser ikke scoren med et tilsvarende eksplicit loft.
- Kun vind er et absolut tilgængelighedskrav. En score kan derfor stadig vises med andre manglende fysiske input.
- Der er ingen dokumenteret kalibrering fra RavScore-niveauer til faktisk fundrate. Den separate prediction-model må ikke bruges som bagudrettet bevis for scoretærskler uden korrekt validering.

## Konceptuel fysisk systemmodel

Den fremtidige analyse bør behandle fund som et produkt af flere nødvendige led, ikke som én sum af vejrtal:

`observeret fund = tilgængeligt lager x mobilisering x transport x levering/aflejring x søgeindsats x detektion`

- **Lager:** Hvor findes ravet før hændelsen, i hvilket sediment/tangmiljø, størrelse og densitet?
- **Mobilisering:** Overskrider kombineret bølge- og strømstress den lokale tærskel, og hvor længe?
- **Transport:** Hvilken retning, dybde, persistens og forsinkelse har strøm, bølgedrift og eventuel opdrift/synkning?
- **Levering:** Når materialet surfzonen, og giver swash, vandstand, kystorientering og morfologi netto strandning eller tilbageskyl?
- **Aflejring/retention:** Koncentreres materialet ved tanglinjer, revler, læzoner, konvergens eller bestemte strandtyper?
- **Jagtbarhed:** Kan brugeren sikkert se og nå materialet? Dette er et andet udfald end fysisk tilstedeværelse.

Denne opdeling gør det muligt at teste, om en faktor er en nødvendig gate, en sandsynlighedsændring eller blot en forklaring.

## Evidensklasser

- **A:** Direkte danske eller nært sammenlignelige feltdata med ravfund, tidsbestemt miljødata, negativ evidens og uafhængig validering.
- **B:** Peer-reviewed feltstudie af rav eller samme fysiske proces i Baltic/nærkystmiljø med tydelig overførbarhed.
- **C:** Laboratorie-, model- eller analogstudie af sediment, flydende partikler eller wrack; mekanismen er relevant, men ravoverførsel er usikker.
- **D:** Ekspert-/jægererfaring, ukontrolleret observation eller arbejdshypotese. Bruges kun til at foreslå test.

Ingen kilde i den første runde leverer endnu klasse A for RavRadars numeriske tærskler.

## Første evidensmatrix

| Mekanisme | Primær kilde | Hvad kilden støtter | Begrænsning for RavRadar | Klasse | Foreløbig handling |
|---|---|---|---|---|---|
| Stormerosion og ambertransport | [Kharin & Eroshenko, Amber in sediments of the Baltic Sea](https://bakhtiniada.ru/0024-4902/article/view/162569) | Amberførende shelfaflejringer eroderes især under stormaktivitet; langsstrøm kan flytte fragmenter og skabe sekundære aflejringer | Sydøstlige Østersø, geologisk/depositionel skala; ingen danske timegrænser eller fundkalibrering | B | BEVAR mekanismekæden, men TEST tids- og styrkegrænser |
| Bølgedrevet bundtransport i sydlige Østersø | [Dudkowska & Gic-Grusza 2017](https://pressto.amu.edu.pl/index.php/logos/article/view/logos-2017-0001) | Bølgeinduceret transport behandles gennem bundskærspænding og varierer med vind-/bølgeforhold | Ikke rav; modeller og lokal polsk sandkyst | B/C | TEST kombineret energimål frem for rå maksimumvind alene |
| Kombineret bølge-/strømstress | [Bolanos-Sanchez, Thorne & Wolf 2012](https://nora.nerc.ac.uk/id/eprint/3660/) | 40 dages feltmålinger kobler bølger, strøm, bundformer, skærspænding og suspenderet sediment; empiriske modeller virker forskelligt ved lav/høj bølgeaktivitet | Sand og suspenderet sediment, ikke rav; beskyttet bugt | B/C | TEST interaktion og varighed; undgå uafhængig dobbeltbonus uden ablation |
| Retning, periode, kystorientering og rumlig skala | [Eelsalu et al. 2025, Gulf of Riga](https://os.copernicus.org/articles/21/619/2025/) | Langstransport afhænger af bølgeenergiflux, bølgeretning, peakperiode og lokal kystorientering; divergens/konvergens og transportceller betyder noget | Potentiel sedimenttransport; strøm og varierende vandstand er udeladt i studiets model | B/C | TEST bølgeretning/-periode og lokale transportceller; ingen direkte point endnu |
| Bølgedrift af lette/flydende objekter | [Calvert et al. 2021](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/abs/mechanism-for-the-increased-waveinduced-drift-of-floating-marine-litter/10AD413081A113F51EA617023F4690F8) | Laboratorie og teori viser, at bølgedrift afhænger af objektets størrelse, densitet og neddykning, ikke kun vandets Stokes-drift | Ideelle kugler og dybt vand; ravets tilstand, form og opdrift er ukendt | C | UTILSTRÆKKELIG til score; TEST først partikelegenskaber og relevans |
| Strandaflejring og retention af flydende materiale | [Orr et al. 2005](https://doi.org/10.1890/04-1486) og [Oldham et al. 2014](https://doi.org/10.1215/21573689-2844703) | Felt-/laboratoriearbejde viser betydning af buoyancy, strandtype, bølgeeksponering, transport og retention for wrack | Organisk wrack er en analog, ikke rav | C | BEVAR kyst-/retentionshypoteser som forklaring; TEST bonusser mod funddata |

## Foreløbig vurdering af aktive mekanismer

| Aktiv mekanisme | Vurdering | Begrundelse nu |
|---|---|---|
| Lokalt verificeret strømfelt og kystretning | BEVAR | Fysisk relevant og forklarligt sidste transportled; geografisk og tidslig nøjagtighed er afgørende |
| Explicit `missing` og proveniens | BEVAR | Forhindrer falsk præcision og er nødvendig for senere validering |
| Adskillelse mellem waders og strand | BEVAR | Jagtbarhed og sikkerhed er forskellig, men tærskler skal valideres separat |
| Kombineret bølge-/strømhistorik | TEST | Stærk mekanistisk støtte, men RavRadar bruger i dag simple additive spring |
| Bølgeretning og -periode | TEST | Kilder viser fysisk relevans; selvstændig værdi ud over vind og højde skal måles |
| Hændelsesvarighed og tidsforsinkelse | TEST | Maksimum alene beskriver ikke arbejde/impuls eller transporttid |
| Rumligt/opstrøms strømfelt | TEST | Kan beskrive tilførsel før sidste lokale led, men risiko for overlap og datamangler er stor |
| Strømbånd som generelt scoreinput | UTILSTRÆKKELIG EVIDENS | Fortsat forbud; ingen valideret ikke-redundant mekanisme er vist |
| Aktuelle numeriske tærskler og 40/35/25-vægte | UTILSTRÆKKELIG EVIDENS | De er arbejdshypoteser uden klasse A-kalibrering |
| Vestkyst +5 og dobbelte kysttagsbonusser | TEST | Kan repræsentere eksponering/retention, men kan også være grov geografi og dobbelt-tælling |
| Vandtemperatur i score | UTILSTRÆKKELIG EVIDENS | Ingen identificeret selvstændig ravmekanisme |

## Prioriterede valideringseksperimenter

1. **Deterministisk kodefølsomhed:** Beregn scorekurver omkring alle spring og mål, hvor mange slutpoint hvert input kan flytte alene og sammen. Ingen produktionsændring.
2. **Overlap/ablation:** Sammenlign modeller med vind, bølge, strøm, kysttags og historik enkeltvis og i grupper. Mål korrelation og marginal forklaringsværdi.
3. **Hændelsesstudie:** Definér storm/mobilisering, efterfølgende transport og strandingsvindue separat. Test forsinkelser uden at vælge vinduet ud fra fundene bagefter.
4. **Bølgefysik-kandidat:** Afprøv højde + periode + retning og kombineret bølge-/strømstress som forskningsfeatures. De forbliver score-neutrale.
5. **Rumlig transport:** Sammenlign lokalt punkt, 5/15 km opstrøms og integreret banehistorik. Kræv forbedring på hold-out-kyster og dokumenteret ikke-redundans.
6. **Jagtbarhed separat:** Valider waders-sikkerhed/synlighed mod egne mål, ikke som erstatning for sandsynlig fysisk ravtilstedeværelse.
7. **Funddata med negativ evidens:** Registrér søgt/ikke søgt, indsats, metode, tidspunkt og nulfund. Rene fundrapporter kan ikke skelne høj sandsynlighed fra høj brugeraktivitet.
8. **Geografisk hold-out:** Kalibrér aldrig og test på samme kystdel. Hold hele kystsegmenter og hændelser ude for at måle generalisering.
9. **Kalibrering og rangering:** Mål både sandsynlighedskalibrering, rangering af tid/sted og stabilitet. En høj korrelation alene er ikke tilstrækkelig.

## Databeredskab 2026-08-20

- Aktiv 24-timershistorik er tilstrækkelig til den nuværende kode, men ikke til at validere 24-72 timers transportforløb.
- Produktion #3263 har 43,31 verificerede timer i 198 geografisk verificerbare parentzoner. De 12 reelle huller står ved nul.
- Shadow-cachen spænder cirka 105,75 timer og er fortsat score-neutral. 168-timersvinduet er ikke nået.
- Kontrolleret lokal livepilot dækker 673/673 kystdele, men fallbackkilder må ikke blandes med ensartet DMI-evidens uden stratificering.
- Der findes endnu ikke et struktureret, bias-kontrolleret dansk fund-/nulgrundlag, som kan kalibrere tærskler eller vægte.

## Næste fase C-D

- Udvid kildegrundlaget med ambermaterialets størrelse, densitet/opdrift, lag og transporttilstand samt dansk/nordisk kystfysik.
- Lav den deterministiske kodefølsomheds- og overlapmatrix på den aktuelle score.
- Definér dataformat og etik for fund, nulfund, søgeindsats og ekspertvurdering.
- Design score-neutrale features og hold-out-validering; ingen af dem aktiveres automatisk.
- Fremlæg samlet anbefaling, usikkerheder og forventet cost/benefit før forslag til ny RavScore-arkitektur.