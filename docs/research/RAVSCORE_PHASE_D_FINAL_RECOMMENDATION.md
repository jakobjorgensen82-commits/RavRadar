# RavScore fase D: samlet anbefaling før lancering

Status: afsluttende forskningsanbefaling. Den beskriver den model, som bør implementeres og verificeres før offentlig lancering; den aktiverer den ikke.

## Beslutning

RavRadar skal ikke vente på et halvt års turrapporter med at forbedre RavScore. Den nuværende B0-model bygger på for grove tærskler og utilstrækkeligt dokumenterede vægte. Før lancering bør den erstattes af den bedste forsvarlige forskningsbaserede procesmodel, og modellen skal derefter genkalibreres, når der findes tilstrækkeligt brede ture med både fund og nul-fund.

Den anbefalede foreløbige model er fase D-proceskandidaten med:

- 25 procent jagtbarhed,
- 40 procent transport og levering,
- 35 procent mobilisering,
- en mild gradvis begrænsning på højst 25 procent, når det svageste nødvendige led er under 50,
- glidende kurver i stedet for store spring ved små vejrændringer,
- bølgeretning og bølgeperiode som forsigtige diagnostiske bidrag,
- og lav eksplicit modelsikkerhed, indtil observationer kan kalibrere modellen.

Vægtene er en foreløbig faglig prioritering. De er ikke målt som naturkonstanter og må ikke omtales som endeligt bevist.

## Hvorfor denne struktur er bedst

Ravets vej til et fund er en kæde:

1. Der skal findes rav i et tilgængeligt lager.
2. Ravet skal mobiliseres fra bund, sediment eller et tidligere kystnært lager.
3. Bølger og strøm skal give en nettotransport mod eller langs den relevante kyst.
4. Ravet skal leveres og tilbageholdes i et område, hvor det kan findes.
5. Forholdene skal være praktisk søgbare med den valgte metode.

En ren vægtet sum er for svag, fordi ét meget højt led kan skjule et næsten manglende andet led. En fuld multiplikation eller harmonisk middelværdi er for hård, fordi usikre nulværdier kan knuse hele scoren. Den milde svageste-led-begrænsning er det mest robuste kompromis, indtil observationer kan bestemme en bedre form.

## Foreløbig modelspecifikation

### Mobilisering: 35 procent af totalscoren

Foreløbig intern prioritering:

- 55 procent bølgeenergi og periode,
- 25 procent relevant strøm eller anden forskydningskraft,
- 20 procent varighed, gentagelse og nylig hændelseshistorik.

Vind er primært en årsag til bølger og strøm. Når de bedre havdata findes, må vinden ikke samtidig gives fuld selvstændig stormvægt og dermed tælles flere gange.

Modellen skal kunne skelne mellem:

- frisk stærk mobilisering,
- kystnær genmobilisering under mindre aktuelle bølger eller strøm,
- og et ældre hændelseslager, som gradvist mister relevans.

### Transport og levering: 40 procent af totalscoren

Transport og levering beregnes separat og samles foreløbigt som:

- 65 procent transport mod det relevante kystafsnit,
- 35 procent levering og sandsynlig tilbageholdelse.

Transport skal bruge:

- strømhastighed og retning i forhold til kysten,
- bølgeretning og en forsigtig relativ bølgeenergiproxy,
- varighed og sammenhængende indadrettede eller udadrettede forløb,
- samt tydelig proveniens for strømlag og tidspunkt.

Bølge og strøm må gerne trække i hver sin retning. Det er en reel procesuoverensstemmelse, som forklaringen skal vise, ikke skjule i ét gennemsnitligt retningsord.

Levering skal bruge hændelsens alder, faldende energi og lokale tilbageholdelsesindikatorer. Vandstandsfasen må foreløbigt være score-neutral, fordi stigende og faldende vand ikke kan omsættes til en enkel universel ravregel.

### Jagtbarhed: 25 procent af totalscoren

Jagtbarhed beskriver, hvor praktisk det er at lede med strand eller vadning. Den bruger glidende vind- og bølgekurver og skal kunne reducere en ellers stærk fysisk mulighed.

Jagtbarhed er ikke en sikkerhedsgodkendelse. Sikkerhed skal vises separat og kan fraråde vandadgang uanset scoren.

## Bølgeinput

DMI leverer bølgehøjde, bølgeretning og bølgeperiode. Fase D-bølgekandidaten bruger foreløbigt `bølgehøjde² × periode` som en relativ energiproxy og sammenholder bølgens bevægelsesretning med hav-til-land-retningen.

Proxyen påvirker kun transport og levering mærkbart ved aktuel bølgeaktivitet. Næsten rolige bølger må ikke slette leveringssignalet fra en nylig stærk hændelse.

I 57.600 syntetiske scenarier ændrede bølgekandidaten gennemsnittet med +0,517 point. Blandt 24.000 fysisk sammenhængende scenarier var gennemsnitsændringen -0,036 point, med yderpunkter på -8 og +14. Kandidaten ændrer dermed primært rangeringen, ikke hele skalaens niveau.

Et aktuelt offentligt snapshot med 225 offentliggjorte kystdelsposter og begge søgemåder gav en gennemsnitsændring på +0,042 point, yderpunkter på -1 og +3 samt nul ændrede scorekategorier. Snapshot­tet var roligt og kan ikke validere stormadfærd.

## Vandstand

Den tidligere brug af den absolutte tre-timers vandstandsændring skal ikke videreføres. Fortegnet skal bevares, og en senere diagnostisk fase skal kunne skelne mellem stigende, top, tidligt faldende, sent faldende, bund og stormrecession.

Indtil dette kan beregnes på en tidsserie og vurderes regionalt, giver vandstand ingen selvstændige fase D-point. Det er bedre at være ærligt neutral end præcist forkert.

## Modelsikkerhed

RavScore er et mulighedsindeks, ikke en procentvis fundchance.

Den foreløbige model skal som udgangspunkt markeres med lav modelsikkerhed, fordi den ikke direkte kender:

- mængden og placeringen af ravlageret,
- partikelstørrelse, form og massefylde,
- lokal bunddybde, bundruhed, revler og brændingsmønster,
- den faktiske nære bundstrøm ved ravet,
- alle lokale fælder og adgangsforhold,
- eller brugerens søgeindsats og erfaring.

Datadækning og modelsikkerhed er forskellige. Komplette DMI-felter kan give høj datadækning, mens den fysiske model stadig har lav sikkerhed.

## Forkastede eller erstattede antagelser

Følgende må ikke videreføres som modelgrundlag:

- B0-vægtene 40/35/25 som om de var dokumenterede.
- En rent additiv score uden hensyn til det svageste nødvendige led.
- En hård fuld-kæde-formel, hvor ét usikkert nul næsten udsletter hele scoren.
- Store scorehop ved ubetydelige ændringer omkring en tærskel.
- Den absolutte vandstandsændring uden forskel på stigning og fald.
- At en overflade- eller lagstrøm automatisk beskriver ravets bundtransport.
- At almindeligt rav flyder frit, blot fordi vandet er koldt.
- At enkelte offentlige ravfund kan kalibrere modellen.
- At en høj RavScore betyder, at det er sikkert at gå i vandet.

## Krav før offentlig aktivering

Den foreløbige model bør implementeres før lancering, men må først aktiveres når alle nedenstående krav er opfyldt:

1. Den diagnostiske model er samlet i én kanonisk beregningsvej for score, delresultater og forklaring.
2. Alle 673 kystdele får bølgehøjde, retning og periode fra en dokumenteret, tidsmæssigt sammenhængende kilde eller markeres tydeligt som manglende.
3. Lokal strømpil, transportretning, score og tekst bruger samme tidspunkt og samme kystdel.
4. Vandstandens fortegn bevares, men giver ikke point gennem en skjult absolutværdi.
5. Jagtbarhedsteksten lover ikke sikkerhed, og sikkerhed kan vises separat.
6. De største bølge-/strømuoverensstemmelser er faste regressionstests.
7. De relevante enhedstests, følsomhedstests, nationale datagates og fulde release-gates er grønne.
8. Den systematiske browserkontrol bekræfter alle 210 zoner og 673 kystdele for begge søgemåder, inklusive at score, pile og forklaring passer sammen.
9. Produktionsdeployet verificeres på den faktiske commit; en grøn GitHub-status alene er ikke nok.
10. Ingen land- eller vandpunkter flyttes som del af scorearbejdet.

## Prioriteret implementeringsrækkefølge

### P1: afslut og merge forskningsgrundlaget

Den nuværende PR indeholder kun forskning, diagnostiske kandidater og kontroller. Den kan merges, når den aktuelle commit har bestået PR-gaten, fordi ingen offentlig score importerer kandidatmodulerne.

### P1: ret jagtbarhed og sikkerhedssprog

Lav en lille særskilt produktions-PR, der fjerner ordet “sikkert” fra jagtbarhed, viser at RavScore ikke er en sikkerhedsgodkendelse og opdaterer håndbog og forklaringstests. Fordi brugerforklaringen ændres, skal den målrettede browserkontrol køres.

### P1: gør alle 673 kystdeles bølgeinput sammenhængende

Sørg for, at lokal bølgehøjde, retning og periode kommer fra samme lokale tidspunkt og kilde, eller at mangler bevares. Brug ikke stille zone-fallback uden tydelig proveniens.

### P1: integrér den foreløbige fase D-model

Erstat B0 gennem en kontrolleret produktions-PR. Bevar en sammenligningsrapport mellem B0 og fase D, men lad kun én motor levere den offentlige score, pilreference og forklaring efter aktivering.

### P1: fuld før-lancering-validering

Kør hele releasekæden og den systematiske browserkontrol én gang for den egentlige scoreændring. Browserkontrollen skal ikke køres ved hver efterfølgende dokumentationsændring; derefter kører den ugentligt eller efter ændringer i score, UI, pile eller datakontrakt.

## Efter lancering

Turrapporter skal indsamle både fund og nul-fund samt søgetid, metode og tilstrækkeligt afgrænset sted. Efter omtrent et halvt år, eller når datamængden er stor og geografisk bred nok, genvurderes:

- hovedvægtene 25/40/35,
- svageste-led-begrænsningen,
- hændelsens henfaldstid,
- forskellen mellem strand og vadning,
- vandstandsfaser,
- og lokale kysttypeeffekter.

Validering skal deles i tid og geografi, så modellen ikke kun lærer de mest aktive brugere eller de mest besøgte strande. Den forskningsbaserede før-lancering-model er startpunktet; observationerne skal forbedre den, ikke undskylde en svag model i de første måneder.
