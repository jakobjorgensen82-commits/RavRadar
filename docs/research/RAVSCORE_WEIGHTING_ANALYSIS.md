# RavScore: analyse af jagtbarhed, transport og mobilisering

Status: forsknings- og valideringsplan. Dokumentet ændrer ikke de nuværende produktionsvægte.

## 1. Beslutningen, der skal træffes

RavScore B0 bruger i dag omtrent følgende hovedvægte:

- jagtbarhed: 40,
- transport: 35,
- mobilisering/frigivelse: 25.

Vægtene er en forståelig første arbejdshypotese, men ikke et videnskabeligt eller empirisk dokumenteret facit. Målet er ikke blot at finde tre “mere rigtige” tal. Først skal vi afgøre:

1. om de tre dele er rigtigt defineret,
2. om de bruger de rigtige tidsvinduer og data,
3. om de overlapper og tæller samme vejrsignal flere gange,
4. om de overhovedet bør lægges lineært sammen,
5. og hvilket observerbart resultat RavScore skal forudsige.

Først derefter giver det mening at estimere deres relative betydning.

## 2. Hvad de tre dele betyder

### Mobilisering

Spørgsmålet er: **Er der tilstrækkelig energi til at gøre relevant materiale tilgængeligt og sætte rav i bevægelse?**

Mobilisering bør blandt andet forholde sig til:

- bølgepåvirkning og bundens orbitalbevægelse,
- strøm og bundforskydningsspænding,
- vanddybde over den mulige kilde,
- bundtype, ruhed og begravelse,
- ravets størrelse, form, tæthed og synkehastighed,
- varighed og forløb af energihændelsen,
- samt om tidligere storme allerede kan have tømt eller flyttet den lettest tilgængelige pulje.

Vindhastighed alene er ikke mobilisering. Den er et indirekte input til bølger, strøm og vandstand.

### Transport og aflevering

Spørgsmålet er: **Hvis rav er i bevægelse, øger de samlede processer så sandsynligheden for, at det kommer til og bliver i et søgbart område?**

Transport bør blandt andet forholde sig til:

- strømretning og hastighed i et relevant dybdelag,
- bølgernes retning, asymmetri og brænding,
- kystnormal og langs-kyst-retning,
- ændring i vandstand og bølgeenergi,
- revler, render, høfder, bugter og lokal kystform,
- mulig aflejring, fastholdelse, begravelse og tilbageskyl,
- samt tidsforsinkelsen fra mobilisering til aflevering.

En overfladenær strømpil er ikke automatisk en ravtransportpil. I lagdelte farvande kan overflade og bund bevæge sig forskelligt.

### Jagtbarhed

Spørgsmålet er: **Kan brugeren sikkert og effektivt undersøge det relevante område nu?**

Jagtbarhed bør blandt andet forholde sig til:

- bølger og brænding ved søgetidspunktet,
- vandstand og om afleveringszonen er tilgængelig,
- lys og sigtbarhed,
- vind, skum, uklart vand og eventuel begravelse,
- adgang og sikkerhed,
- samt om aktuelle forhold ødelægger eller flytter et nyligt aflejret spor.

Jagtbarhed påvirker sandsynligheden for at opdage rav, men skaber ikke i sig selv rav på stranden.

## 3. Hvorfor en simpel vægtet sum kan være forkert

En lineær sum lader en meget høj delscore kompensere for en meget lav delscore. Det kan give fysisk misvisende situationer:

- høj jagtbarhed kan opveje manglende mobilisering,
- høj stormenergi kan opveje transport væk fra den relevante kyst,
- og en gunstig strøm kan opveje, at der ikke findes eller er adgang til en ravførende pulje.

Den fysiske proces er i højere grad en kæde:

> tilgængeligt rav -> mobilisering -> transport -> aflevering/fastholdelse -> observation

Hvis et nødvendigt led er tæt på nul, kan resten ikke uden videre gøre den samlede hændelse god. Det taler for at teste modeller med porte, minimumsled eller multiplikative dele, ikke kun nye additive procenter.

## 4. Den vigtigste produktbeslutning

Der er to forskellige mål, som i dag risikerer at blive blandet:

- **Fysisk ravmulighed:** tegn på at rav kan være blevet mobiliseret, transporteret og afleveret.
- **Aktuelle søgeforhold:** tegn på at brugeren kan lede effektivt og sikkert nu.

Den fagligt reneste løsning er foreløbig at vise dem særskilt. En samlet RavScore kan stadig bruges som rangering, men brugerfladen skal fortælle, om en høj eller lav værdi primært skyldes den fysiske mulighed eller jagtbarheden.

Fordelen er, at systemet kan sige:

> Lovende fysisk hændelse, men dårlige søgeforhold nu. Vent til bølger og vandstand falder.

Det er mere præcist og mere handlingsrettet end at skjule konflikten i et gennemsnit.

## 5. Kandidater, der skal sammenlignes

### Kandidat A: nuværende B0

- Bevar `40/35/25` uændret som låst reference.
- Formål: vise om en ny model faktisk forbedrer noget.

### Kandidat B: lige additive vægte

- De tre dele får samme vægt.
- Formål: teste om kompleks vægtning slår en neutral og letforståelig baseline.

### Kandidat C: nye additive vægte

- Vægtene estimeres på træningsdata med begrænset fleksibilitet.
- Formål: undersøge om delene har stabil forskellig betydning.
- Risiko: kan skjule en forkert processtruktur og overtilpasse få storme.

### Kandidat D: fysisk mulighed plus særskilt jagtbarhed

- Mobilisering og transport/aflevering danner den fysiske mulighed.
- Jagtbarhed vises som en selvstændig vurdering og påvirker handlingsrådet.
- Formål: undgå at let søgning forveksles med ravlevering.

### Kandidat E: kæde med bløde porte

- Hvert nødvendigt procesled kan begrænse det samlede resultat.
- Et lavt led sænker helheden uden nødvendigvis at gøre den præcis nul.
- Formål: afspejle proceskæden og samtidig rumme måleusikkerhed.

### Kandidat F: hændelsesmodel

- Mobilisering vurderes for den forudgående storm eller energihændelse.
- Transport og aflevering følger hændelsens udvikling.
- Jagtbarhed vurderes separat for det aktuelle tidspunkt.
- Formål: undgå at blande “hvad der skete i går” med “hvordan stranden er nu”.

Kandidat F er fagligt mest lovende, men kræver mere arbejde og flere observationer. Kandidat D kan være et billigere mellemskridt med stor forklaringsgevinst.

## 6. Hvad litteraturen kan og ikke kan bestemme

Forskningen kan begrunde:

- hvilke fysiske mekanismer der bør indgå,
- hvilke retninger og tærskeltyper der er plausible,
- hvilke variable der er sted-, dybde- og hændelsesafhængige,
- hvorfor ravets tæthed, form og synkehastighed betyder noget,
- og hvorfor stormtop, aflevering og godt søgetidspunkt ikke nødvendigvis falder samtidig.

Forskningen kan ikke alene bestemme, at jagtbarhed eksempelvis skal vægte 31 % i Danmark. Der findes ikke et tilstrækkeligt direkte datasæt med danske zone-, vejr-, indsats- og fundobservationer til at udlede det tal. Et præcist procenttal uden sådan validering ville være falsk præcision.

## 7. Udfaldet skal defineres før vægtene

Mulige udfald er ikke ens:

- mindst ét ravfund på en tur,
- antal fund pr. søgetime,
- samlet vægt pr. søgetime,
- størrelsen af største fund,
- observeret rav eller ravførende strandmateriale,
- eller ekspertens vurdering af lovende forhold.

Anbefalet første primære udfald:

> **Mindst ét sikkert ravfund pr. standardiseret søgetime i en på forhånd valgt kystdel og periode.**

Sekundære udfald bør være antal, samlet vægt, største stykke og fundmiljø. Fundmængde er stærkt skæv og bør ikke være det eneste mål.

## 8. Observationer, der er nødvendige

Hver tur bør mindst registrere:

- start- og sluttid,
- valgt kystdel før turens resultat kendes,
- omtrentligt gennemsøgt område eller rute med privatlivsbeskyttelse,
- søgemetode,
- brugerens erfaringsniveau,
- antal deltagere,
- fund og nul-fund,
- antal, vægtklasse og gerne størrelsesklasse,
- om ravet lå i tang, skaller, grus, sand, vandkant eller lavt vand,
- samt usædvanlige adgangs- eller observationsforhold.

Appen kan automatisk koble turen til de allerede gemte vejr-, bølge-, strøm- og vandstandsdata. Det mindsker brugerens arbejde og forhindrer efterrationalisering.

## 9. Skævheder, der skal håndteres

- Erfarne brugere finder mere under samme forhold.
- Brugere besøger oftere kendte og lettilgængelige strande.
- Gode fund rapporteres oftere end nul-fund.
- Flere personer og længere søgetid øger fundmuligheden.
- Brugeren kan vælge sted efter at have set RavScore, hvilket påvirker datasættet.
- Flere ture efter samme storm er ikke uafhængige observationer.
- En zone uden fund kan stadig have indeholdt rav, som ikke blev opdaget.

Derfor skal observation og fysisk forekomst modelleres så adskilt som praktisk muligt. Erfaring, indsats og søgeforhold hører til opdagelsesdelen; vejr og kystprocesser hører primært til leveringsdelen.

## 10. Valideringsdesign

### Lås modellen før testen

Regler, vægte og tærskler fryses, før en uafhængig testperiode begynder. Ellers bliver efterfølgende tilpasning til kendte fund fejlagtigt kaldt validering.

### Del efter hændelse, tid og kysttype

Tilfældig opdeling af individuelle ture er utilstrækkelig, fordi ture efter samme storm ligner hinanden. Testblokke bør omfatte:

- hele storm- eller energihændelser,
- sammenhængende fremtidige tidsperioder,
- og kysttyper eller geografiske områder, som modellen ikke er tilpasset på.

### Sammenlign mod simple baselines

En ny model skal slå:

- B0 med `40/35/25`,
- samme score i alle zoner,
- lokal historisk fundhyppighed,
- en enkel stormregel,
- og en enkel jagtbarhedsregel.

Hvis den komplekse model ikke gør det stabilt, er kompleksiteten ikke tjent hjem.

### Mål flere egenskaber

- **Rangering:** kommer observerede fund oftere højt på listen?
- **Kalibrering:** svarer en vist kategori til en stabil observeret fundhyppighed?
- **Opløsning:** kan modellen skelne lovende fra mindre lovende ture?
- **Stabilitet:** ændrer små inputforskelle urimeligt meget på resultatet?
- **Geografisk robusthed:** virker forbedringen på flere kysttyper?
- **Hændelsesrobusthed:** virker den på nye storme og ikke kun én kendt hændelse?
- **Forklaringskonsistens:** stemmer score, pil, årsag og handling sammen?

## 11. Hvordan vægtene kan estimeres

Når der er tilstrækkelige observationer, bør kandidaterne tilpasses med:

- få på forhånd valgte dele frem for mange frie variable,
- begrænsning mod ekstreme koefficienter,
- fagligt begrundede monotone sammenhænge, hvor de faktisk er gyldige,
- hændelses-, område- og brugereffekter,
- korrektion for søgetid og erfaring,
- og usikkerhedsintervaller for hver vægt og præstation.

En estimeret vægt skal ikke rundes til et autoritativt tal og låses for altid. Vi skal undersøge, om dens fortegn og størrelse er stabile på tværs af blokke. Hvis transport eksempelvis ser vigtig ud på vestkysten, men skifter voldsomt på indre farvande, er én national vægt sandsynligvis forkert.

## 12. Foreløbig faglig vurdering uden nye tal

Før dataindsamlingen kan vi allerede sige:

- Mobilisering er et nødvendigt hændelsesled, men bør ikke belønne høj energi ubegrænset eller monotont.
- Transport skal være knyttet til relevant lag, kystretning og tidsforsinkelse; den nuværende datatolkning giver væsentlig usikkerhed tæt på land.
- Aflevering og fastholdelse mangler som tydelig selvstændig proces og risikerer at blive gemt inde i transport eller jagtbarhed.
- Jagtbarhed er afgørende for brugerens resultat, men er ikke det samme som fysisk tilstedeværelse.
- Inventar eller kildepotentiale varierer geografisk og er en nødvendig usikkerhed, selv om vi ikke bør opfinde præcise zoneværdier uden evidens.
- De nuværende tre hoveddele kan dele vind-, bølge- og vandstandssignaler og dermed komme til at dobbelttælle samme hændelse.

Det mest sandsynlige resultat er derfor ikke blot en ændring fra `40/35/25` til tre andre procenter. Det er en tydeligere procesopdeling og en særskilt behandling af fysisk ravmulighed, jagtbarhed og modeltillid.

## 13. Cost/benefit-trin

### Trin 1: næsten gratis

- Dokumentér B0 som baseline.
- Vis delscore og årsager tydeligt i diagnostik.
- Definér udfald og observationsfelter.
- Stop med at omtale vægtene som dokumenterede.

### Trin 2: lav til moderat omkostning

- Saml jagtbarhed og fysisk mulighed i hver sin forklaringsdel.
- Etabler maskinlæsbar forklaringskontrakt.
- Registrér strukturerede ture med nul-fund og indsats.
- Beregn kandidater parallelt uden at ændre offentlig score.

### Trin 3: moderat omkostning

- Genberegn historiske hændelser med de nye regler.
- Kør blokeret sammenligning mellem kandidater.
- Udfør følsomheds- og stabilitetsanalyse.

### Trin 4: kun hvis gevinsten er bevist

- Skift offentlig model og vægte.
- Kalibrér kategorier eller sandsynligheder.
- Overvåg ny produktion mod låst B0 og simple baselines.

Dyre hydrodynamiske simuleringer eller fuld partikelsporing bør først overvejes, hvis de billigere kandidater og observationer viser en konkret restfejl, som sådanne modeller realistisk kan løse.

## 14. Stopregler

En ny vægtning må ikke frigives, hvis:

- den kun forbedrer træningsdata,
- den ikke slår B0 og simple baselines på nye hændelser,
- gevinsten kun findes på én kysttype,
- vægtene skifter voldsomt mellem testblokke,
- jagtbarhed forveksles med fysisk levering,
- forklaringerne ikke følger de beregnede bidrag,
- eller datamængden er for lille til den påståede præcision.

## 15. Foreløbig vægtning før RavRadar har egne ture

RavRadar skal ikke beholde en kendt svag vægtning i et halvt år, mens observationsgrundlaget opbygges. Den bedste tilgængelige faglige model skal bruges nu og tydeligt beskrives som modelbaseret og foreløbig, ikke som empirisk kalibreret fundprocent.

Den anbefalede første arbejdshypotese efter regelrevisionen er:

- **jagtbarhed: 25 point,**
- **transport, aflevering og fastholdelse: 40 point,**
- **mobilisering og frigivelse: 35 point.**

Begrundelsen er:

- Jagtbarhed er vigtig for et faktisk fund, men gode søgeforhold kan ikke skabe rav, som ikke er blevet gjort tilgængeligt og afleveret.
- Transportdelen skal vælge mellem kystdele og rumme både retning, aflevering og lokal fastholdelse. Den er derfor den største geografiske skelner.
- Mobilisering er en nødvendig hændelsesudløser og bør vægte højere end i B0, men høj energi må ikke i sig selv give høj score, hvis transporten er ugunstig.

`25/40/35` er ikke et færdigt facit. Det er en fysikbaseret prior, som først bliver meningsfuld, når reglerne under hver del er rettet. Den må ikke blot indsættes i den nuværende B0, fordi fejlagtige eller overlappende delregler ellers får større eller mindre indflydelse uden at blive bedre.

### Bløde porte er nødvendige

Den additive score bør suppleres med begrænsninger, så et manglende nødvendigt procesled ikke kan skjules af de øvrige point. Den konkrete form skal scenarietestes, men princippet er:

- meget lav mobilisering begrænser den mulige fysiske ravscore,
- tydelig transport væk fra eller forbi søgeområdet begrænser leveringsscoren,
- manglende eller usikker geografi sænker modeltilliden frem for at opfinde præcise lokale point,
- og farlige forhold tilsidesætter handlingsrådet uden at omskrive den fysiske historie.

Portene bør være gradvise frem for hårde nulgrænser, fordi både data og processer er usikre.

### Sådan kvalificeres vægtene uden egne indberetninger

Før første produktionsændring skal `25/40/35` sammenlignes med B0 og andre kandidater ved hjælp af:

- offentliggjorte direkte ravforsøg,
- analogforsøg med tætheds-, størrelses- og formmæssigt relevante partikler,
- dokumenterede historiske strandings- og stormhændelser,
- DMI-hindcasts eller gemte prognosedata, hvor de er tilgængelige,
- kysttype- og følsomhedsanalyse,
- fagligt konstruerede modscenarier, der bør give lav, mellem og høj score,
- samt automatiske kontroller af dobbelttælling, monotoni, tidsvinduer og pil/forklaring.

En kandidat behøver ikke være empirisk perfekt for at erstatte B0. Den skal være mere fysisk sammenhængende, forklare kendte hændelser mindst lige så godt, undgå åbenlyse modscenarier og bevare rimelig stabilitet ved små inputændringer.

## 16. Beslutningsanbefaling

Bevar `40/35/25` som låst reference, men ikke nødvendigvis som offentlig produktionsmodel under hele observationsperioden.

Den anbefalede rækkefølge er:

1. færdiggør reglerne under mobilisering, transport/aflevering og jagtbarhed,
2. test `25/40/35`, B0, lige vægte og en kædemodel mod samme scenarier og historiske hændelser,
3. vælg den mest fysisk sammenhængende og robuste kandidat som foreløbig produktionsmodel,
4. vis jagtbarhed og modeltillid tydeligt, selv hvis én samlet RavScore bevares,
5. etabler struktureret observation med nul-fund og indsats,
6. kør den valgte model og alternativer parallelt i diagnostik,
7. og efterkalibrér regler og vægte, når et tilstrækkeligt uafhængigt datasæt foreligger.

Et første planlagt eftersyn efter cirka seks måneders dataindsamling er fornuftigt, men tidspunktet skal også afhænge af antal ture, fund, nul-fund, uafhængige storme og dækkede kysttyper. Seks kalendermåneder med få eller stærkt skæve observationer er ikke i sig selv nok.

## 17. Generelt princip for alle RavScore-regler

Samme arbejdsform gælder for regler, tærskler og tidsvinduer:

1. brug den bedste samlede fysik og evidens til en foreløbig regel nu,
2. dokumentér hvilke dele der er direkte evidens, analogi og faglig antagelse,
3. afprøv reglen mod kendte hændelser og bevidste modscenarier,
4. frigiv kun hvis den samlet er bedre og ikke skaber nye alvorlige fejl,
5. kald resultatet modelbaseret frem for empirisk bevist,
6. mål det løbende mod observationer,
7. og ret det, når data giver et bedre grundlag.

Dermed får brugerne den bedst mulige model fra start, uden at RavRadar foregiver en sikkerhed, som først kan opbygges over tid.
