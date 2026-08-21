# RavScore før lancering: videnskabeligt prior for vægtning

**Status:** Forskningsanbefaling til næste private kandidat. Ingen aktiv score, offentlig visning eller produktionsdata ændres af dette dokument.

## 1. Beslutningen vi skal kunne træffe

RavRadar skal før lancering have en mere rimelig startmodel end tre historisk valgte tal. Vi kan ikke få et endeligt statistisk facit uden mange ensartede ture med både fund, nul-fund og søgeindsats. Vi kan derimod vælge et bedre, tydeligt mærket **videnskabeligt prior** nu og senere korrigere det med danske observationer.

Anbefalingen her er derfor ikke "sandheden om rav". Den er den mindst misvisende startfordeling, som følger den bedst understøttede fysiske årsagskæde og kan testes uden at vente på fremtidigt vejr.

## 2. Hvad forskningen samlet siger

### 2.1 Rav er normalt ikke et frit flydende overfladeobjekt

Baltisk rav har en massefylde tæt på flere almindelige plasttyper. Chubarenko og Stepanova beskriver en hypotese, hvor stormskabte bølger, strøm og rullestrukturer sammen flytter negativt flydende rav mellem undervandsskråningen og stranden; materialet kan også føres tilbage til havet efter få dage. Forfatterne understreger selv behovet for direkte observationer, så kilden støtter proceskæden, men ikke bestemte RavScore-grænser. [Chubarenko og Stepanova 2017](https://pubmed.ncbi.nlm.nih.gov/28215582/)

Ravets opdrift kan variere med stykke, porøsitet og vandets massefylde. Østersøens brakvand har en anden og geografisk varierende densitet end oceanisk saltvand. Derfor er det usikkert at behandle alt rav som enten altid synkende eller altid flydende i hele Danmark. [Feistel et al. 2010](https://os.copernicus.org/articles/6/3/2010/os-6-3-2010.html)

**Konsekvens:** Modellen bør arbejde med et ensemble af typisk svagt synkende til næsten neutralt rav. Salinitet og partikelegenskaber er en relevant senere følsomhedsanalyse, men ikke en løs bonus nu.

### 2.2 Bølger mobiliserer, sorterer og kan drive både ind- og udtransport

Laboratorieforsøg med ikke-flydende partikler viser, at bølger kan flytte dem ved bunden, og at bevægelsen afhænger af overskydende bundstress, tæthed, form og bølgefase. [Bonanno et al. 2026](https://www.sciencedirect.com/science/article/pii/S0378383926000220)

Andre forsøg med forskellige partikeltyper viser ophobning ved strand, revle, plateau og ydre side af revlen afhængigt af partiklernes egenskaber og brydende bølger. Det betyder, at "bølger mod land" ikke automatisk er det samme som "rav på tør strand". [Goral et al. 2022](https://www.sciencedirect.com/science/article/pii/S0025326X22005847) og [Kerpen et al. 2020](https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2020.590565/full)

Sedimentstudier viser samtidig, at skæve og asymmetriske bølger kan bidrage væsentligt til transport mod land, mens bundgående returstrøm, brydningsturbulens og faseforsinkelse kan give transport udad. [Rafati et al. 2022](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2022JC018686)

**Konsekvens:** Bølgehøjde er ikke nok. Retning, periode, brydning, hændelsesfase og lokal kystretning skal indgå. En simpel bølgebonus vil være fagligt for grov.

### 2.3 Strøm er vigtig for nettransport, men må ikke stå alene

Feltmålinger under både rolige og bølgerige forhold viser, at bølger og strøm sammen bestemmer bundstress, bundformer og suspenderet sediment, og at empiriske modeller ikke virker lige godt i alle energiregimer. [Bolaños-Sanchez, Thorne og Wolf 2012](https://nora.nerc.ac.uk/id/eprint/3660/)

Danske kystforklaringer viser samme arbejdsdeling i mere tilgængeligt sprog: bølger sætter sediment i bevægelse, skråt indfald skaber kystparallel transport, og opskyl og tilbageskyl sorterer materialet. [Kystdirektoratet](https://kyst.dk/klimatilpasning/kystdynamik/sedimenttransport/boelger-og-stroem-flytter-sand)

**Konsekvens:** Strømretning er stærk evidens for nettoretning, når materialet allerede er mobilt. Den bør ikke alene kunne skabe en høj score efter en stille periode.

### 2.4 Hændelsesforløbet betyder mere end et enkelt maksimum

En analyse af observeret beach-cast i den sydøstlige Østersø fandt, at forholdene i de foregående tre døgn, bølgehøjde og indfaldsretning var relevante. Store patches optrådte efter storme, ofte i den sene fase, hvor vinden var aftagende, men bølgerne stadig høje. Det er en analog til opskyl og ikke direkte dansk ravkalibrering. [Chubarenko et al. 2023](https://www.sciencedirect.com/science/article/pii/S0272771423000094)

Studier af strandet organisk materiale i Rigabugten fandt sammenhæng med høje vandstande og bølgehændelser, men materialet var hovedsageligt lokalt. [Suhhonen et al. 2014](https://www.sciencedirect.com/science/article/pii/S0078323414500413)

**Konsekvens:** Mobilisering, transport og aflevering skal følge en tidslig tilstand: opbygning, top, tidlig aftagen, sen aftagen og gammel hændelse. Stigende eller faldende vand må ikke give universelle point uden denne kontekst.

### 2.5 Lokal geometri og kysttype ændrer processen

Højopløste studier fra Rigabugten viser, at små ændringer i kystretning, næs, havne og transportceller kan ændre retning og konvergens. Studiet understreger også usikkerhed fra utilstrækkelig nærkyst-batymetri. [Soomere et al. 2025](https://os.copernicus.org/articles/21/619/2025/)

Opskyl på en gennemtrængelig strand kan miste vand ned i stranden og dermed svække tilbageskyllet; sedimentstudier finder derfor en mulig nettoeffekt mod land, især på grovere strande. Det er en mekanistisk analog, ikke en dokumenteret ravbonus. [Turner og Masselink 1998](https://agupubs.onlinelibrary.wiley.com/doi/10.1029/98JC02606)

**Konsekvens:** Revler, høfder, vegetation, hældning og strandtype må foreløbig forklare usikkerhed og foreslå lokale forsøg. De må ikke give universelle statiske point.

## 3. Hvorfor en ren additiv model er utilstrækkelig

Den fysiske kæde er omtrent:

`lager -> mobilisering -> transport -> aflevering/fastholdelse -> synlighed`

En høj værdi sent i kæden kan ikke fuldt ud erstatte et manglende tidligere led. Roligt, sikkert og klart vejr skaber ikke rav på stranden, hvis intet nyligt er mobiliseret eller leveret. Omvendt kan en storm mobilisere meget materiale, mens stranden endnu er farlig og materialet ligger ved revlen.

Derfor bør RavRadar bruge:

- en vægtet hovedmodel, så usikre delprocesser ikke bliver kunstigt absolutte;
- en mild fysisk flaskehals, så et meget svagt nødvendigt led ikke skjules;
- separat modelsikkerhed, så manglende data ikke forveksles med dårlige forhold;
- separat sikkerhedsadvarsel, som aldrig kan opvejes af ravmulighed.

## 4. Anbefalet foreløbig vægtning før lancering

### 4.1 Næste private kandidat

Den næste private kandidat bør afprøve dette centrum:

| Del | Nuværende aktiv vægt | Anbefalet prior | Forsvarligt testinterval |
|---|---:|---:|---:|
| Jagtbarhed/søgeforhold | 25 % | **15 %** | 10-20 % |
| Transport og aflevering | 40 % | **50 %** | 45-55 % |
| Mobilisering/tilgængelighed | 35 % | **35 %** | 30-40 % |

Det er kandidat **F = 15/50/35**. Den er ikke godkendt til produktion endnu.

### 4.2 Begrundelse

- **Jagtbarhed 15 %:** Den har stor praktisk værdi, men mindre betydning for om rav fysisk er kommet til stedet. Den skal også vises separat, så brugeren kan forstå forskellen mellem ravmulighed og en nem tur.
- **Transport/aflevering 50 %:** Dette er det sidste nødvendige fysiske led før ravet bliver søgbart og den vigtigste geografiske skelner mellem kystdele under samme storm.
- **Mobilisering 35 %:** Uden nylig energi er der mindre sandsynlighed for en ny tilførsel, men høj mobilisering alene kan ikke fortælle, hvor materialet ender.

Vægtene er et startprior, ikke målte sandsynligheder. Intervallet skal testes systematisk; vi bør ikke lede efter et kunstigt præcist facit som 48,7 %.

## 5. Fysisk flaskehals

Kandidat F bør videreføre kandidat E's forsigtige princip:

- beregn først den vægtede score;
- mål derefter det svageste af `mobilisering` og `transport/aflevering`;
- lad kun en tydelig fysisk mangel reducere slutscoren;
- lad jagtbarhed være uden for flaskehalsen;
- lad aldrig timing alene skabe en leveringsvej;
- lad ukendte data påvirke sikkerhed, ikke ligne et sikkert nul.

Før historisk sammenligning bør flaskehalsen fortsat være mild, cirka 0-15 % reduktion. Hårde lofter kan senere blive nødvendige, men er ikke tilstrækkeligt underbygget endnu.

## 6. Bølger og strøm skal have roller, ikke universelle procenter

Inde i mobilisering og transport bør modellen skifte efter fysisk situation:

| Situation | Bølgernes hovedrolle | Strømmens hovedrolle | Modelhandling |
|---|---|---|---|
| Stille/ingen nylig hændelse | Lav bundpåvirkning | Eventuel langsom advektion | Lav mobilisering; strøm alene må ikke give høj samlet score |
| Opbygning/stormtop | Mobilisering, turbulens, erosion | Retning og spredning af mobilt materiale | Høj mobilisering, men aflevering og jagtbarhed kan stadig være lave |
| Tidlig aftagen | Fortsat bevægelse og opskyl | Nettoind-/langs-/udtransport | Potentielt bedste afleveringsvindue, hvis retningerne støtter det |
| Bølger og strøm enige mod/langs kyst | Samvirkende transportvej | Samvirkende nettoretning | Højere tillid til transport |
| Bølger og strøm uenige | Opskyl og returcirkulation kan konkurrere | Lag og dybde bliver afgørende | Middel/lav modelsikkerhed; undgå skråsikker høj score |
| Gammel hændelse | Begrænset ny mobilisering | Kan omfordele rester | Tidsnedskrivning; ingen permanent stormbonus |

Det løser den konkrete D/E-usikkerhed bedre end blot at ændre `55 % strøm / 45 % bølge` til et andet fast par tal.

## 7. Sådan validerer vi uden at vente på vejret

### Trin 1: faste fysiske scenarier

Kør F og vægtintervallet på de 15 eksisterende scenarier over alle 673 kystdele. Kræv mindst:

- pålandshændelse over tilsvarende fralandshændelse;
- frisk hændelse over gammel hændelse;
- ingen venstre/højre-bias langs kysten;
- stormtop må ikke automatisk være bedste søgetid;
- rolige søgeforhold uden fysisk hændelse må ikke blive høj ravmulighed;
- uenige bølge-/strømretninger skal give lavere sikkerhed eller forsigtig score;
- stigende/faldende vand alene må ikke ændre score.

### Trin 2: historiske hændelsesvinduer

Brug bølgereanalyse til at finde storme i Nordsøen og Østersøen, og hent kun strøm/vandstand omkring 12 på forhånd udvalgte vinduer. Vinduerne vælges efter vejr og geografi, ikke efter enkelte kendte ravfund. Dermed kan vi undersøge opbygning, top og aftagen nu uden at vente måneder på naturlige scenarier.

### Trin 3: national privat shadow

Kør gammel, aktiv og kandidater parallelt på det naturligt tilgængelige danske datasæt. Mål fordeling, geografiske skævheder, manglende data, kildeblanding og forklaringskonflikter. En grøn teknisk kørsel er ikke nok; ekstreme eller systematisk optimistiske resultater skal forklares.

### Trin 4: bruger- og ekspertkontrol

Vis få, repræsentative forløb med enkel tekst: hvad blev løsnet, hvordan blev det flyttet, om det blev afleveret, og om det er søgbart. Eksperten skal korrigere et forståeligt forslag, ikke analysere rå datasæt manuelt.

## 8. Aktiveringsregel

F må først anbefales som aktiv før-lanceringsmodel, når:

- alle faste kontrakter er bestået;
- historiske hændelser ikke viser en klar fysisk modsigelse;
- kandidatens fordeling er rimelig på tværs af danske kystregimer;
- score, pile og forklaring bruger samme retning, tidsfase og datakilde;
- søgeforhold og sikkerhed ikke skjuler eller forveksles med ravmulighed;
- manglende data vises som usikkerhed;
- den præcise kodeversion er testet og produktionsverificeret efter de relevante gates.

Hvis resultaterne er blandede, beholder vi 25/40/35 midlertidigt og retter først reglerne under komponenterne. Vi aktiverer ikke et nyt tal blot for at kunne sige, at vægtene er ændret.

## 9. Enkel brugerforklaring

Brugeren behøver ikke se hele forskningsmodellen. En senere visning kan sige:

> **God ravmulighed, middelgode søgeforhold.** En nylig bølgehændelse har kunnet løsne materiale, og den efterfølgende transport har været mod eller langs denne kyst. Bølgerne er nu aftagende. Kig i den friskeste mørke opskylslinje. Modelsikkerhed: middel, fordi bølger og strøm ikke er helt enige.

Det vigtige er, at hovedscore, pile, forklaring og læringskort kommer fra samme beregnede tilstand.

## 10. Foreløbig beslutning

- Bevar aktiv 25/40/35, mens F testes privat.
- Brug F = 15/50/35 som næste konkrete vægtkandidat.
- Bevar kandidat E's milde fysiske flaskehals.
- Erstat ikke bølge-/strømrollen med ét nyt fast internt vægtpar.
- Brug faste scenarier og historisk reanalyse i stedet for at vente på kommende storme.
- Tag først en offentlig ændringsbeslutning efter samlet scenario-, historik- og national shadow-sammenligning.
