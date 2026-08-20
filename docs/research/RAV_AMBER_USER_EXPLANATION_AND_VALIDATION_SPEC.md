# RavRadar: forklaring, læring og validering

Status: produktspecifikation afledt af den systematiske rav- og transportanalyse. Ingen produktionsændring må gennemføres alene på baggrund af dokumentet. Først skal forslagene omsættes til testbare kontrakter, sammenlignes med B0 og godkendes efter RavRadars releasekrav.

## 1. Produktløftet

RavRadar skal hjælpe brugeren med fem enkle spørgsmål:

1. Hvor lovende er stedet lige nu?
2. Hvad er den vigtigste grund?
3. Hvad er sandsynligvis sket med ravet?
4. Hvad skal jeg kigge efter, og hvornår?
5. Hvor sikker er vurderingen?

Brugeren skal ikke kunne læse en høj score, en pil væk fra stranden og en tekst om indtransport uden at få forklaret forskellen. Score, pile og forklaring skal komme fra samme versionsstyrede modeltilstand og have klare semantiske kontrakter.

## 2. Fire ting må ikke blandes sammen

| Produktværdi | Spørgsmål | Eksempel |
| --- | --- | --- |
| Ravmulighed | Hvor sandsynligt er nyligt tilgængeligt rav? | Lav, middel, god, meget god |
| Søgeforhold | Hvor nemt er det at lede nu? | Roligt vand, dagslys, synligt opskyl |
| Modelsikkerhed | Hvor meget ved vi om netop dette sted og denne hændelse? | Høj, middel, lav |
| Sikkerhed | Er forholdene forsvarlige for en strandtur? | Separat vejr-/vandadvarsel, aldrig skjult i ravscore |

En solrig dag kan give gode søgeforhold og lav ravmulighed. En voldsom storm kan give høj mobilisering, dårlige og farlige søgeforhold samt endnu ingen aflevering. De situationer skal fremstå tydeligt forskellige.

## 3. Et enkelt læringssprog

Den tekniske proces oversættes konsekvent til fem verber:

- **Løsner**: Bølger eller strøm gør ravet mobilt på bunden.
- **Flytter**: Ravet ruller, hopper eller svæver gennem vandet.
- **Afleverer**: Ravet passerer revler og brændingszone mod stranden.
- **Fastholder**: Opskyl, berm, tang eller faldende vand gør det mindre sandsynligt, at ravet straks skylles ud igen.
- **Synliggør**: Ravet ligger, så en bruger realistisk kan se og finde det.

Fagord kan vises i et “læs mere”-lag, men første forklaring skal bruge disse ord. Brugeren lærer dermed den rigtige årsagskæde uden at skulle forstå Rouse-tal, Shields-tal eller bølgeasymmetri.

## 4. Scorekontrakten

### 4.1 Hvad scoren er

Indtil RavRadar er kalibreret mod tilstrækkelige fund og nul-søgninger, er 0-100 et **Ravindeks**, ikke en procentchance. UI og håndbog må ikke kalde 72 for “72 % chance”.

Indekset skal være monotont i sin produktbetydning: højere værdi betyder, at den samlede evidens for tilgængeligt og findbart rav er bedre under samme sikkerhedsniveau. Det må ikke betyde “mere ekstremt vejr”.

### 4.2 Nødvendige deltilstande

En forklarlig vurdering bør mindst indeholde:

- lager/tilgængelighed,
- nylig mobilisering,
- transportmåde og retning,
- aflevering/fastholdelse,
- søgeforhold,
- datakvalitet og friskhed.

Hvis et nødvendigt led er meget lavt eller ukendt, skal det fremgå som begrænsning. En høj værdi i et andet led må ikke skjule det.

### 4.3 Score og sikkerhed

Lav modelsikkerhed må ikke bare trækkes fra scoren, fordi det får “ukendt” til at ligne “dårligt”. Vis i stedet vurdering og sikkerhed separat:

- “God ravmulighed, middel sikkerhed.”
- “Middel ravmulighed, lav sikkerhed på grund af manglende bølgedata.”

Det er i tråd med forskning i vejrudsigter, hvor brugere ofte foretrækker ærlig usikkerhed, men har brug for klar, konsistent betydning. [Morss et al. 2008](https://journals.ametsoc.org/abstract/journals/wefo/23/5/2008waf2007088_1.xml) og [systematisk review af sandsynlighedskommunikation](https://journals.ametsoc.org/view/journals/wcas/14/2/WCAS-D-21-0034.1.xml)

## 5. Pilekontrakten

### 5.1 Hver pil skal navngive sin fysik

Tilladte betegnelser er eksempelvis:

- “Vind mod”
- “Bølger bevæger sig mod”
- “Overfladenær strøm mod”
- “Strøm i 5-7 m dybde mod”
- “Historisk sandtransport langs kysten”
- “Forventet ravtransport” kun når en valideret sammensat transportmodel findes

En pil må aldrig blot hedde “strøm” eller visuelt ligne “ravretning”, hvis datakilden er et 2-8 m laggennemsnit.

### 5.2 Når retningerne er uenige

Uenighed er fysisk information, ikke nødvendigvis en fejl. UI skal kunne sige:

> Overfladestrømmen går mod nord, men ravet forventes primært at bevæge sig tæt på bunden. Derfor bruges pilen kun som svag støtte i vurderingen.

Eller:

> Bølgerne fører materiale mod stranden, mens returstrømmen ved bunden kan holde noget tilbage ved revlen.

Hvis modellen ikke kan forklare konflikten, må den vise “retning usikker” i stedet for at vælge en skråsikker pil.

### 5.3 Automatisk sammenhængskontrol

For hver vist kystdel skal en maskinlæsbar forklaringskontrakt kontrollere:

- pilens kilde, dybde, tid og enhed,
- om pilen indgår i scoren eller kun er kontekst,
- om teksten påstår ind-, ud- eller langs-kyst transport,
- om scoreårsagen bruger samme fortegn og tidsvindue,
- om fallback har ændret datakilden,
- om sikkerhed og friskhed vises korrekt.

Dette er den præcise kontrol, der skal forhindre, at pil, score og forklaring hver især er teknisk gyldige, men samlet fortæller tre forskellige historier.

## 6. Forklaringens faste struktur

Hver kystdel bør kunne generere en kort forklaring i denne rækkefølge:

1. **Vurdering**: “God ravmulighed.”
2. **Hovedårsag**: “Bølgerne har nyligt været stærke og langperiodiske.”
3. **Fase**: “Energien er nu aftagende, hvilket kan hjælpe afleveringen.”
4. **Lokal begrænsning**: “En revle kan stadig holde noget materiale ude.”
5. **Handling/læring**: “Kig i den friskeste mørke opskylslinje.”
6. **Sikkerhed**: “Middel sikkerhed; strømmen er målt i det øverste model-lag.”

Kun de to-tre vigtigste årsager bør stå i kortet. Resten kan åbnes som “Hvorfor?”. Det begrænser tekstmængden uden at skjule modellen.

## 7. Forklaringseksempler

### 7.1 Stormen er på toppen

> **Middel ravmulighed lige nu.** Bunden påvirkes kraftigt, så rav kan blive løsnet og flyttet. De høje bølger og returstrømmen kan samtidig holde det ude ved revlen eller føre det væk. Vent på sikre, aftagende forhold. Sikkerhed: middel.

### 7.2 Aftagende bølger efter en hændelse

> **God ravmulighed.** Der har været energi nok til at løsne materiale, og bølgerne er nu aftagende, mens der stadig kommer udviklede bølger mod stranden. Kig efter en ny mørk opskylslinje. Sikkerhed: middel.

### 7.3 Gode søgeforhold, men lav fysisk mulighed

> **Lav ravmulighed, men gode søgeforhold.** Stranden er rolig og overskuelig, men der har ikke været en nyere hændelse, som sandsynligvis har løsnet og afleveret rav.

### 7.4 Uenige strømlag

> **Retningen er usikker.** Overfladestrømmen går langs kysten mod nord, men den bundnære strøm kan gå anderledes. Scoren bygger derfor mest på bølgernes forløb og den lokale kysttype.

### 7.5 Manglende data/fallback

> **Foreløbig vurdering.** Bølgedata er friske, men strømdata mangler. Ravmuligheden kan derfor ikke retningsbestemmes sikkert. Sikkerhed: lav.

## 8. Læring uden at overbelaste kortet

RavRadar kan tilbyde korte, kontekststyrede læringskort:

- **Hvorfor en storm ikke altid giver rav med det samme**: Stormen kan først løsne og flytte; afleveringen kan komme senere.
- **Hvad en revle gør**: Den kan samle materiale, ændre bølgernes brud og sende returvand gennem revlehuller.
- **Hvorfor tang er et tegn, ikke et bevis**: Tang og rav kan dele transport, men flyder og formes forskelligt.
- **Hvorfor pilene kan pege forskelligt**: Vind, bølger, overflade og bund er forskellige lag.
- **Hvorfor nul-fund hjælper**: En registreret søgning uden fund lærer modellen mere end tavshed.
- **Hvorfor rav ikke altid flyder**: Det meste rav er lidt tungere end almindeligt havvand og flyttes derfor ofte tæt ved bunden.

Læringskortet skal vælges ud fra den aktive forklaring. Det skal ikke være en generisk artikel, der er løsrevet fra dagens forhold.

## 9. Observationsdesign

### 9.1 Den vigtigste skelnen

Vi skal modellere to sandsynligheder:

- `P(rav tilgængeligt på stedet)`
- `P(fund rapporteret | rav tilgængeligt, søgeindsats og forhold)`

Citizen-science-forskning viser, at erfaring, besøgskarakteristika og indsats påvirker detektion. Fravær af rapport er ikke et nul, og et nul-fund uden søgetid er svagt. [Altwegg og Nichols 2019](https://besjournals.onlinelibrary.wiley.com/doi/full/10.1111/2041-210X.13090) og [Ruffieux et al. 2026](https://www.sciencedirect.com/science/article/pii/S0304380026000025)

### 9.2 Minimumsfelter i en søgerapport

- kystdel/zone-id, ikke krav om præcis privat GPS,
- starttid og omtrentligt sluttidspunkt eller søgeminutter,
- fund: 0, 1, 2-5, 6-20 eller 20+,
- største omtrentlige størrelse,
- strandstrækning gået eller en enkel kort/mellem/lang kategori,
- erfaring: ny, øvet, meget øvet,
- frisk opskylslinje set: ja/nej/ukendt,
- tang/træ/organisk materiale: ingen/lidt/meget,
- rav synligt i tør, våd eller overskyllet zone,
- eventuel strandrensning eller tydelige spor efter mange samlere,
- frivilligt foto og kvalitetsmarkering,
- modelversion, scorekomponenter og inputproveniens gemt automatisk ved rapporttidspunktet.

### 9.3 Databeskyttelse

- Offentlig visning bør aggregeres i tid og rum.
- Rå brugerpositioner må ikke indgå i PR-tekster, logs eller diagnostikpayloads.
- Rapporten skal kunne bruges uden præcis GPS.
- Fotos skal have eksplicit samtykke og metadatahåndtering.

## 10. Valideringsdesign

### 10.1 Baselines

Alle nye modeller skal sammenlignes med:

1. B0 uændret.
2. En sæson-/kyst-klimatologi uden aktuelt vejr.
3. En meget simpel stormreference, for eksempel nylig bølgeenergi plus lokal eksponering.
4. Den nye kædemodel.

En kompleks model har kun værdi, hvis den slår de simple alternativer på data, den ikke er udviklet på.

### 10.2 Opdeling af data

Tilfældig krydsvalidering er ikke nok, fordi nabo-kystdele og timer fra samme storm ligner hinanden. Den kan derfor få modellen til at se bedre ud, end den er. Valideringen skal blokere på:

- hele stormhændelser,
- tidsperioder/sæsoner,
- geografiske kystregimer,
- og udvalgte helt tilbageholdte kyststrækninger.

[Roberts et al. 2017](https://www.wsl.ch/lud/biodiversity_events/papers/Roberts_et_al-2017-Ecography.pdf)

### 10.3 Mål for kvalitet

Vi bør måle flere egenskaber, fordi ét tal kan skjule fejl:

- **Kalibrering**: Når modellen siger samme niveau mange gange, hvor ofte kommer der da fund?
- **Diskrimination/rangering**: Ligger de bedre steder og tidspunkter højere end de dårligere?
- **Skarphed**: Kan modellen skelne tydeligt uden at være overmodig?
- **Top-k nytte**: Hvor ofte er de bedst rangerede realistiske ture faktisk blandt de bedste observationer?
- **Stabilitet**: Skifter score og forklaring rimeligt mellem nabotimer og kystdele?
- **Geografisk robusthed**: Virker den uden for Vestkysten?
- **Forklaringskonsistens**: Passer årsag, pil, fase og score i alle genererede tilstande?

Brier score og reliability-diagram er nyttige til kalibrering, men sjældne fund kræver også rangering, skill mod klimatologi og særskilt vurdering af positive hændelser. [ECMWF Forecast User Guide](https://confluence.ecmwf.int/pages/viewpage.action?navigatingVersions=true&pageId=255095498) og [Benedetti 2010](https://journals.ametsoc.org/view/journals/mwre/138/1/2009mwr2945.1.xml)

### 10.4 Fysisk plausibilitetstest

Før observationskalibrering skal hver modelversion bestå scenarietests:

- høj bølge, kort periode kontra samme højde og lang periode,
- stigende kontra aftagende fase efter samme maksimum,
- overfladestrøm mod land og bundstrøm væk,
- sandbund kontra sten/lag-bund,
- åben vestkyst kontra beskyttet fjord,
- let flydende kontra typisk synkende rav,
- frisk data kontra fallback/manglende data,
- gunstig fysisk mulighed kontra farlige søgeforhold.

Scenarierne skal kontrollere både tal, kategorier, pile og den konkrete forklaringstekst.

## 11. Foreslåede forsøg

### 11.1 Billigt og højt udbytte

1. Mål tre akser, massefylde og synkehastighed på et repræsentativt sæt danske ravstykker.
2. Gentag synkeforsøg ved relevante saliniteter og temperaturer.
3. Registrer formklasse, porøsitet/uklarhed og størrelse.
4. Udfør standardiserede strandtransekter med både fund og nul-fund efter udvalgte hændelser.
5. Fotografer opskylslinje, hældning, berm, revler og tang i faste kategorier.

Dette kan afklare partikelensemblet og detektionsmodellen langt billigere end en fuld bølgeflume.

### 11.2 Mellemtrin

- Kontrollerede bakke-/rende-forsøg med naturligt rav over forskellige sand- og grusstørrelser.
- Sammenlign begyndende rul, glid og hop ved kendte strømhastigheder.
- Brug simple videooptagelser og markerede ravstykker til fastholdelse i opskyl/tilbageskyl.

### 11.3 Dyrt og først senere

- Stor bølgeflume med uregelmæssige bølger, levende bund, revle og dansk saltvand.
- Feltsporere eller sikre rav-analoger på udvalgte kyster.
- Koblet hydrodynamisk partikelmodel.

De dyre forsøg bør først bestilles, når observationerne viser, hvilket usikkert led der faktisk begrænser produktet.

## 12. Release-gates for en senere modelændring

En ny RavScore må ikke erstatte B0, før følgende er dokumenteret:

- modelkontrakt og evidensversion er fastlåst,
- alle input har proveniens, friskhed og fallback-status,
- score, pil og forklaring består automatiske konsistensscenarier,
- ingen land-/vandpunkter er flyttet,
- de fire beskyttede datafiler er urørte,
- skyggeberegning er kørt over relevante hændelser,
- tids- og geografisk blokeret validering slår B0 eller dokumenterer en klar anden gevinst,
- usikkerhed og geografiske begrænsninger er synlige,
- regressioner i data-, cache-, scheduler-, fallback-, UI- og deploykæden er grønne,
- RDKS, håndbog og changelog er opdateret,
- produktionen er verificeret på den præcise merge-commit.

## 13. Effektiv testfrekvens

Den store browserkontrol af alle 210 zoner og 673 kystdele er en periodisk systemkontrol, ikke en standardtest efter enhver dokument- eller backendændring.

| Kontrol | Hvornår |
| --- | --- |
| Små kontrakt-/enhedstests | Ved enhver relevant score-, forklarings- eller pilændring |
| Data- og provenance-check | Ved ændring af DMI, scheduler, cache, fallback eller public payload |
| Målrettet browserkontrol | Ved UI-/forklaringsændring på repræsentative kystregimer |
| Fuld 210/673-browserkontrol | Ugentligt under aktiv udvikling eller efter relevant score/UI/data-kontraktændring |
| Produktionskontrol | Efter merge/deploy af en relevant ændring |

Det sparer tid uden at svække den kontrol, som fandt den oprindelige sammenhængsfejl.

## 14. Roadmap fra analyse til sikkert produkt

### Trin A: afslut evidenspakken

- Færdiggør claims-matrix og kildekvalitet.
- Registrer afviste hypoteser og geografiske begrænsninger.
- Fastlås B0 som benchmark.

### Trin B: observationsgrundlag

- Implementer privacy-sikker søgerapport med indsats og nul-fund.
- Gem score/input-snapshot ved observationen.
- Udarbejd standardiserede felttransekter.

### Trin C: lavrisiko-dataforbedring

- Bevar og eksponer bølgeperiode og mindst 72 timers hændelseshistorik.
- Undersøg relevante DKSS-dybdelag.
- Importer grov kysttype/bund/erosion som versionerede priors.
- Flyt ingen punkter.

### Trin D: skyggekandidat

- Beregn `I-A-M-T-D-O` parallelt med B0.
- Generer forklaring og pile fra samme tilstand.
- Sammenlign på blokerede observationer og scenarier.

### Trin E: produktbeslutning

- Fremlæg gevinst, fejl, usikkerhed, driftspris og rollback.
- Ændr kun produktion ved dokumenteret positiv cost/benefit.
- Bevar skyggekørsel efter lancering, indtil ny model er stabil på tværs af kystregimer.

## 15. Samlet UX-dom

Det bedste produkt er ikke det, der viser flest fysiske detaljer. Det er det, der internt regner på de rigtige led og udadtil svarer enkelt og ærligt:

> **Hvad er chancen, hvorfor, hvad sker der med ravet, hvad bør jeg gøre, og hvor sikkert ved vi det?**

Hvis disse fem svar kommer fra samme modeltilstand, kan RavRadar både blive mere præcis, mere lærende og langt lettere at stole på.

