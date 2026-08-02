# RavRadar Håndbog

**Håndbogsversion:** 4.0.73

**Opdateret:** 1. august 2026

Håndbogen er den faglige og tekniske reference for RavRadar. RDKS er bindende for aktive krav og beslutninger; koden er autoritativ for den aktive beregning.


## 1. Formål, målgruppe og fagligt løfte

*Håndbogens rolle som fælles sandhed for ejer, eksperter og udvikling.*

RavRadar er et beslutningsstøttesystem til ravjagt langs danske kyster. Systemet samler prognoser, lokale kystdata, en forklarlig procesmodel og kontrollerbare ekspertregler. Det skal hjælpe med at vælge sted og tidspunkt, men må aldrig fremstille en høj score som et løfte om fund.

Håndbogen er skrevet til tre målgrupper: ejeren, eksterne rav-/sediment-/kysteksperter og fremtidige udviklere. En ekspert skal kunne læse dokumentet uden at kende koden og forstå både den faglige hypotese, de konkrete tærskler og hvor systemet er usikkert.

Fagligt løfte: Alle væsentlige antagelser skal kunne spores til enten forskning, praktisk observation, projektbeslutning eller eksplicit hypotese. Systemets egne tærskler må aldrig præsenteres som naturkonstanter.
Håndbogen beskriver den aktive version. RDKS er autoritativt for bindende beslutninger, aktive krav og kendte åbne problemer. Koden er autoritativ for, hvad systemet faktisk beregner i den aktuelle release. Ved uoverensstemmelse skal uoverensstemmelsen registreres og rettes – ikke bortforklares.


## 2. Evidensklasser, kildekritik og usikkerhed

*En fast klassifikation, så ekspertviden og hypoteser ikke bliver skjult som fakta.*

RavRadar bruger fire evidensklasser. De skal fremgå både i håndbogen og i regelmotoren, når en faglig påstand omsættes til scorelogik.

Klasse | Betydning | Må bruges til | Må ikke bruges til
Dokumenteret viden | Understøttet af relevant forskning, officiel måling eller veletableret kystfysik | Procesforklaring, forsigtige generelle regler | Lokale numeriske tærskler uden lokal validering
Ekspertobservation | Gentagen praktisk erfaring fra kendt område og jagtform | Regelkladde, lokal prioritering, testhypotese | Automatisk landsdækkende regel
RavRadar-hypotese | Plausibel mekanisme eller arbejdsværdi | Simulering, eksperimentel regel, audit | Skjult produktionsregel uden markering
RavRadar-valideret | Understøttet af kontrollerede projektdata og hold-out-test | Modeljustering med versionshistorik | Universel naturvidenskabelig sandhed
En kilde skal vurderes efter relevans, målemetode, skala og overførbarhed. Forskning i plastpartikler kan være nyttig som analogi, fordi visse plasttyper og rav har lav densitet og kan kobles til organisk opskyl, men plast og rav er ikke identiske. Form, størrelse, overflade, biofilm, vandmætning og bundkontakt kan ændre transporten væsentligt.

Når ekspertens udsagn strider mod nuværende kode, skal udsagnet registreres som en ændringshypotese. Først når mekanisme, geografi, betingelser, effekt og test er beskrevet, kan det blive en aktiv regel.


## 3. Ravets fysiske egenskaber og hvorfor densitet alene ikke er nok

*Ravets opdrift, bundkontakt, form og kobling til organisk materiale.*

Rav er fossil harpiks med en densitet, der typisk ligger tættere på havvand end mineraler som kvarts. Det betyder ikke, at alt rav flyder frit. Mange stykker synker i almindeligt havvand, men kræver mindre løfte- og transportkraft end sand, grus og sten af samme størrelse. Saltindhold, temperatur, luftlommer, porøsitet, indlejret materiale, størrelse og form påvirker den effektive opførsel.

Den relevante model er derfor ikke 'rav flyder' versus 'rav synker', men et kontinuum:

- Rav kan ligge skjult og mekanisk låst i sand, grus, ler, tørv, tang eller revner.

- Bølger og strøm kan løsne materialet og reducere bundkontakten.

- Stykket kan rulle, hoppe, glide eller blive kortvarigt suspenderet.

- Det kan transporteres sammen med let organisk materiale eller andre lavdensitetspartikler.

- Når energien falder eller vandet trækker sig tilbage, kan det aflejres i en opskylslinje, lavning, revlebagkant, tangvold eller på en ny blotlagt kant.

Større og uregelmæssige stykker kan reagere anderledes end små flade stykker. RavRadar har i dag ingen partikelstørrelsesmodel. Scoren beskriver derfor et generelt potentiale for jagtbart rav, ikke transporten af en bestemt ravstørrelse.

Ekspertpunkt E-01: Fastlæg hvilke ravstørrelser og -former de nuværende tærskler realistisk repræsenterer, og om der bør findes særskilte profiler for småt strandrav, mellemstort rav og større bundnære stykker.

### 3.1 Densitet, opdrift og reduceret neddykket vægt

Baltisk rav omtales i den relevante kystlitteratur typisk med en materialedensitet omkring 1,05–1,09 g/cm³. Havvandets densitet varierer med saltholdighed og temperatur. Det betyder, at et stykke rav ofte er svagt negativt flydende: det synker, men den neddykkede vægt er langt mindre end for kvarts med densitet omkring 2,65 g/cm³. Den lille densitetsforskel kan gøre rav følsomt over for svage vertikale turbulensimpulser, bølgeorbitaler og kontakt med organisk materiale. Det er dog ikke det samme som neutral opdrift.

### 3.2 Form, orientering og effektiv modstand

To ravstykker med samme masse kan reagere forskelligt. Et fladt stykke har større projiceret areal og kan få større løft og hydrodynamisk modstand end et kompakt stykke. Ruhed, revner, indlejret materiale og biofilm ændrer både modstand og synkehastighed. Derfor er en enkelt densitetsværdi utilstrækkelig som partikelmodel.

### 3.3 Bundkontakt og skjult rav

Et ravstykke, der ligger frit oven på glat sand, er ikke i samme tilstand som et stykke, der er klemt mellem grus, indlejret i tørv eller dækket af et tyndt sandlag. Den kritiske belastning for at frigøre stykket kan derfor være bestemt af mekanisk låsning snarere end af ravets egen masse. RavRadar bruger i dag vejrhistorik som indirekte proxy for denne frigørelse, men beregner ikke lokal bundskærspænding eller begravelsesdybde.

Implementeret i: js/core/score-engine.js og js/core/coastal-process-model.js. Der findes endnu ingen partikelstørrelses- eller synkehastighedsmodel.


## 4. Tilstedeværelse og kildelagre

*Hvor ravet kan komme fra, og hvorfor vejr ikke kan skabe rav.*

En prognose kan kun være god, hvis der findes rav i eller opstrøms for det område, der aktiveres. RavRadar modellerer i øjeblikket ikke et fysisk lager af rav. Det betyder, at systemet vurderer transport- og findeforhold, men ikke kender den reelle mængde rav i sedimentet.

Mulige kildelagre omfatter eroderende geologiske lag, ældre strand- og klitaflejringer, undervandsrevler, lavninger med organisk materiale, tidligere stormdepoter, tangbælter og materiale transporteret langs kysten fra naboområder. En høj energihændelse kan åbne et lager; efterfølgende hændelser kan tømme det.

Gentagne høje scorer uden fund kan derfor skyldes lagerbegrænsning og ikke nødvendigvis fejl i strøm- eller bølgemodellen. Fremtidig læring bør skelne mellem 'forholdene var fysisk gunstige' og 'området leverede faktisk rav'.

Ekspertpunkt E-02: Identificér kysttyper og områder, hvor geologisk ravtilstedeværelse er kendt, sandsynlig eller lav, og vurder om der kan bygges en langsomt skiftende kildelagerfaktor uden at skabe falsk sikkerhed.


## 5. Den samlede proceskæde

*RavRadar opdeler chancen i tilstedeværelse, frigivelse, transport, koncentration, aflejring og jagtbarhed.*

RavRadar bruger proceskæden som den stærkeste forklaringsramme, men ikke som en absolut port. Den fulde kæde giver normalt det største potentiale, fordi flere nødvendige betingelser virker samtidig. Rav kan dog allerede ligge i et sekundært nærkystlager og genmobiliseres uden en ny storm eller ny erosion af et primært lager.

Den klassiske kæde er:

- Tilstedeværelse: rav findes i et tilgængeligt lager.

- Frigivelse/mobilisering: bølger, strøm eller erosion løsner rav og ledsagemateriale.

- Transport: vandbevægelsen flytter materialet mod, langs eller væk fra den relevante kyst.

- Koncentration: forskelle i densitet, form, bundfriktion og strømfelt sorterer materialet.

- Aflejring/retention: faldende energi, kystgeometri, vegetation eller opskyl fastholder materialet.

- Eksponering: vandstand og bølger gør aflejringen synlig eller tilgængelig.

- Jagtbarhed: sigt, sikkerhed, bølgehøjde og adgang gør eftersøgning realistisk.

Den aktive RavScore har tre numeriske hovedkomponenter: jagtbarhed, transport og mobilisering/tilgængelighed. Den sidste komponent vælger nu det stærkeste af ny frigivelse og nærkystnær genmobilisering. Tilstedeværelse og koncentration er endnu ikke selvstændige scoringskomponenter. De optræder kun indirekte gennem kystegenskaber, historik og ekspertregler. Det er en vigtig modelbegrænsning.

Modelkritik: En lineær vægtet sum kan give en pæn score, selv om én nødvendig proces er meget svag. Offshore-caps reducerer denne risiko for transport, men modellen har endnu ikke generelle multiplicative gates for alle procesled.


## 6. Bølger, orbitalbevægelse, brydning og turbulens

*Bølgernes dobbelte rolle som mobilisering og jagtbarhedsproblem.*

Bølger påvirker rav på flere skalaer. På dybere vand giver bølgeorbitaler frem-og-tilbage-bevægelse nær bunden. Når bølgerne kommer ind på lavere vand, ændres orbitalerne, bølgerne stejler og bryder. Brydning skaber turbulens, undertow, setup og strømme i surfzonen. Disse processer kan løsne bundmateriale og gøre lette partikler mobile.

Bølger er derfor ikke kun en 'ind mod land'-mekanisme. Den enkelte orbitalbevægelse er oscillerende, og nettotransporten afhænger af bølgeasymmetri, strandhældning, strøm, undertow, Stokes drift, sedimentets respons og hvor i profilen partiklen befinder sig. RavRadar bruger ikke en fuld bølge-resolverende partikelmodel.

I den aktive frigivelsesscore giver historisk maksimal bølgehøjde mindst 1,5 m +14 point. I den separate procesindikator giver mindst 1,2 m 22 mobiliseringspoint og mindst 2,0 m 35. Disse tærskler er arbejdsværdier – ikke validerede danske ravgrænser.

Samtidig reducerer store bølger jagtbarheden. For waders giver bølger over 0,7 m et fradrag på 25 point i jagtbarhed, mens bølger på højst 0,3 m giver +12. For strandjagt giver bølger over 2,5 m -12. Det afspejler, at høj fysisk energi kan være positiv for mobilisering og negativ for sikker eftersøgning på samme tidspunkt.

Ekspertpunkt E-03: Valider om bølgehøjde alene er tilstrækkelig, eller om periode, retning, bølgeenergiflux, brydningsindeks og varighed bør indgå.

### 6.1 Energi, periode og orbitalhastighed

Signifikant bølgehøjde er kun én del af den fysiske belastning. Bølgeenergi pr. overfladeareal vokser omtrent med kvadratet på bølgehøjden, mens bølgeperioden påvirker bølgelængde, gruppehastighed og hvor dybt orbitalbevægelsen mærkes. To prognoser med samme bølgehøjde, men forskellig periode, kan derfor give forskellig bundpåvirkning og surfzonebredde.

### 6.2 Shoaling, refraktion og brydning

Når bølger bevæger sig mod lavere vand, falder gruppehastigheden, bølgen bliver stejlere og retningen kan drejes af dybdekonturerne. Brydningen frigiver energi og driver både langs- og tværkyststrømme. Lokale revler og render kan koncentrere brydning eller skabe læzoner. RavRadars punktdata ved et havanker kan ikke fuldt beskrive denne rumlige struktur.

### 6.3 Swash og backwash

På strandfladen kommer vandet ind som uprush og løber tilbage som backwash. De to faser er ikke symmetriske: vanddybde, hastighed, infiltration, turbulens og sedimentkoncentration ændres gennem cyklussen. Rav kan føres op i swash og efterlades, men kan også genmobiliseres af backwash. Aflejring kræver derfor ikke blot pålandsgående bølger; den kræver en kombination af timing, faldende energi, strandhældning og partikelegenskaber.

Evidens: Generel bølge- og sedimentfysik er veletableret. De konkrete RavRadar-grænser på 1,2 m, 1,5 m og 2,0 m er arbejdsværdier og skal valideres mod danske funddata.


## 7. Strøm: retning, hastighed og bundnær transport

*Hvordan strøm tolkes, og hvorfor en 180°-fejl er kritisk.*

Strømdata i RavRadar tolkes oceanografisk som den retning, vandet bevæger sig mod. Vindretning tolkes meteorologisk som den retning, vinden kommer fra. En 180°-fejl i strømkonventionen kan få udtransport til at ligne indtransport og er derfor en kritisk regression.

Strømmen vurderes mod zonens lokale onshoreDirectionDeg eller mod flere retningankre for bugtede kyster. Retningsforskellen omsættes i den aktive score til en alignment:

Retningsforskel | Alignment | Fortolkning | Retningsbidrag
0–25° | 1,00 | stærkt mod land | +30
26–55° | 0,65 | delvist mod land | ca. +20
56–90° | 0,20 | skråt/langskyst med mindre indkomponent | +6
91–130° | -0,35 | overvejende væk | ca. -11
131–180° | -0,80 | kraftigt væk | -24
Strømhastighed mellem 0,15 og 0,65 m/s giver +18 i transportscoren. Over 0,65 m/s giver kun +5, fordi stærk strøm kan være effektiv, men mere uforudsigelig. Under 0,15 m/s giver -12. Hvis strømdata mangler, begrænses transportscoren til højst 52.

Ved strøm mindst 0,15 m/s og alignment højst -0,75 sættes transportloft 28. Ved alignment højst -0,35 sættes loft 42. Det er en vigtig sikkerhedsregel mod den tidligere fejl, hvor en zone kunne blive grøn, selv om strømmen pegede væk fra land.

Modeldata repræsenterer ikke nødvendigvis præcis den bundnære strøm, som et ravstykke oplever i surfzonen. Lodret shear, bølgestrøm, revler, render og lokale hvirvler kan afvige fra modellens gridcelle.

Ekspertpunkt E-04: Valider hastighedsintervallet 0,15–0,65 m/s, retningstrinnene og offshore-lofterne for forskellige kysttyper og vanddybder.

### 7.1 Hvilken strøm måler modellen?

En numerisk havmodel leverer strøm i en gridcelle og på bestemte modelniveauer. Den værdi er ikke nødvendigvis identisk med strømmen få centimeter over bunden i brændingszonen. Vindstress, trykgradient, tidevand, densitetsforskelle, bølgeinducerede strømme og bundfriktion kan skabe lodret shear. Derfor skal en prognosticeret strømretning fortolkes som en repræsentativ vandbevægelse – ikke som en direkte observation af et ravstykke.

### 7.2 Strøm som transportør efter mobilisering

Bølger kan øge koncentrationen af mobile partikler ved at løfte dem fra bunden; middelstrømmen kan derefter advectere materialet. Denne arbejdsdeling er vigtig: en moderat strøm kan være effektiv, hvis bølgerne allerede har mobiliseret materialet, mens samme strøm under helt rolige bundforhold kan have ringe effekt.

### 7.3 Retningsusikkerhed ved buede kyster

Én pålandsretning er kun en lokal normalvektor. Ved bugter, odder og uregelmæssige kystlinjer kan samme strøm være ind mod én del af zonen og væk fra en anden. RavRadar bruger derfor flere retningsankre og vælger den mindst offshore-prægede relevante vurdering, men dette kan også overvurdere et lille gunstigt delområde. Eksperten bør vurdere, hvornår minimum-, middel- eller arealvægtet alignment er mest fysisk korrekt.

Implementeret i: js/core/direction-anchors.js og js/core/score-engine.js.


## 8. Vindens direkte og indirekte rolle

*Vind skaber bølger og overfladedrift, men er ikke lig med bundstrøm.*

Vind påvirker ravtransport indirekte ved at skabe bølger, ændre vandstand og drive overfladelag og organisk opskyl. Den kan også flytte allerede strandet tørt let materiale på stranden. Men vindretningen alene beskriver ikke den bundnære transport.

RavRadar omregner vind 'fra'-retningen til en bevægelsesretning ved at lægge 180°. Hvis denne retning ligger inden for 55° af lokal pålandsretning, får transportscoren +6. Hvis den ligger mere end 90° væk, gives -2. Vindens direkte transportbidrag er med vilje mindre end strømmens.

I frigivelsesscoren bruges historisk maksimal vind over 24 timer: mindst 14 m/s giver +35, 9–13,99 m/s giver +18 og lavere vind +4. Dette er en grov energiproxy. Varighed, fetch, retning og bølgeopbygning indgår ikke direkte.

Brugerens erfaring fra den nordjyske østkyst – at fralandsvind ofte kan give gode jagtforhold – viser netop, hvorfor vindretning ikke må behandles som en universel indtransportregel. Fralandsvind kan give roligere kystvand samtidig med, at tidligere bølger eller lokal strøm fortsat har flyttet materiale.

Ekspertpunkt E-05: Beskriv hvilke situationer hvor fralandsvind forbedrer jagtbarhed uden at stoppe bundnær indtransport, og hvor længe den mekanisme realistisk kan bestå.


## 9. Vandstand, setup, tidevand og den aktive kystzone

*Vandstand ændrer både transportvej, aflejring og adgang.*

Vandstand er ikke blot et antal centimeter. Den flytter brydningszonen, oversvømmer eller blotlægger revler og tanglinjer, ændrer hvilke render der er aktive og bestemmer hvor bølgerne afleverer materiale.

Den aktive transportscore bruger ændringen over tre timer. Stigning på mindst 8 cm giver +8. Fald på mindst 8 cm giver +3. Næsten stabilt niveau under 2 cm ændring giver -4. Logikken antager, at stigende vand kan føre let materiale ind over lavt vand, mens faldende vand kan samle eller eksponere materiale ved nye kanter.

Vadehavet kræver særbehandling. Store sekventielle ændringer kan være ægte tidevand og må ikke automatisk udglattes. Et mønster, der skifter unaturligt mellem datakilder time for time, er derimod en dataintegritetsfejl.

Aktuel observation og prognose er forskellige produkter. Observationen kan bruges til 'nu' og modelkontrol; prognosen bruges til fremtid. Cache kan være gyldig, selv om en ny observation midlertidigt mangler.

Ekspertpunkt E-06: Valider om absolut vandstand, ændringshastighed, forudgående maksimum/minimum og lokal referencehøjde bør indgå særskilt.

### 9.1 Absolut niveau versus ændring

Den samme stigning på 8 cm kan have forskellig betydning, afhængigt af om den sker fra meget lavt til normalt niveau eller fra normalt til højvande. Absolut niveau bestemmer hvilke revler, render og tanglinjer der er oversvømmet; ændringen beskriver bevægelsen mellem tilstandene. Den aktive score bruger primært ændringen og mangler derfor en zoneafhængig vertikal reference.

### 9.2 Meteorologisk vandstand og tidevand

I danske farvande kan vindstuvning, atmosfærisk tryk, bassinresonans og tidevand bidrage forskelligt. Vadehavet har en tydelig tidevandsdynamik, mens andre områder kan være mere domineret af vindstuvning. En landsdækkende regel bør derfor ikke antage samme tidsmønster overalt.

### 9.3 Observation, prognose og cache

En station kan midlertidigt mangle en ny observation, mens dens senest hentede prognose stadig er gyldig. RavRadar skelner derfor mellem observationsstatus og prognose-/cachestatus. Det reducerer unødvendige kildeskift, men kræver tydelig visning af alder og gyldighed.


## 10. Langs- og tværkysttransport

*Rav kan ankomme fra siden og aflejres ved ændringer i kystretning.*

Bølger, der rammer kysten skråt, kan skabe en langskyst strøm og transportere materiale parallelt med stranden. Rav kan derfor komme fra en nabozone, selv når den lokale strøm ikke peger direkte mod land. Odder, bugter, havne, revler og indløb kan ændre eller afbryde transportvejen.

Den aktive RavScore giver et mindre positivt retningsbidrag ved 56–90° forskel til pålandsretningen. Det er en grov repræsentation af skrå/langskyst transport, ikke en fuld beregning af transportkonvergens.

Et fagligt bedre system bør skelne mellem: (a) lokal indtransport, (b) langskyst tilførsel, (c) konvergens hvor transporten bremser eller mødes, og (d) bypass hvor materialet fortsætter forbi zonen.

Ekspertpunkt E-07: Udpeg zoner hvor langskyst transport sandsynligvis er vigtigere end direkte tværkysttransport, og hvilke nabozoner der bør forbindes i et transportnetværk.


## 11. Undertow, returstrøm og ripstrømme

*Hvorfor store indkommende bølger også kan skabe udadgående bundnær transport.*

Når bølger fører vand ind i surfzonen, skal vandmassen returnere. Returtransport kan foregå som undertow, feeder currents og ripstrømme. Det betyder, at store indkommende bølger ikke automatisk giver netto indtransport af alle partikler.

Et ravstykke kan påvirkes af indgående swash i den øvre strandzone, men af udadgående returstrøm nær bunden længere ude. Nettoretningen afhænger af, hvornår stykket er suspenderet, hvor højt i vandsøjlen det befinder sig, og hvor hurtigt det aflejres.

RavRadar har i dag ingen eksplicit undertow- eller ripstrømsmodel. Offshore-caps på den modellerede strøm er den vigtigste beskyttelse mod at overvurdere en situation, men lokale surfzoneprocesser kan stadig afvige.

Ekspertpunkt E-08: Vurder om kombinationen høj bølgeenergi + modelleret udadgående strøm bør give særskilt faseafhængig logik i stedet for et enkelt transportloft.


## 12. Hydrodynamisk sortering og ledsagematerialer

*Hvorfor rav ofte findes i bestemte fraktioner, men indikatorerne ikke er entydige.*

Kysttransport sorterer materiale efter mere end densitet. Størrelse, form, ruhed, løfteareal, bundfriktion og synkehastighed påvirker, hvornår en partikel mobiliseres og aflejres. Rav kan derfor koncentreres sammen med tang, træ, frø, kul, skum, skaller eller bestemte grusfraktioner uden at alle disse materialer følger præcis samme bane.

En frisk tanglinje kan være et nyttigt felttegn, fordi let organisk materiale og rav kan være transporteret og strandet under samme hændelse. Men tang kan også være flyttet uden rav, være gammel, omlejret af vind eller komme fra et andet lag i vandsøjlen.

RavRadar giver i dag kun statiske bonusser for tang/ålegræs, rev og lavt vand – og kun når strømmen allerede har mindst en svag indkomponent. Det forhindrer en statisk egenskab i at skabe en falsk transportsituation.

Ekspertpunkt E-09: Rangér ledsagematerialer efter deres værdi som indikator og beskriv, hvornår de er tegn på frisk aflejring versus gammel omlejring.


## 13. Tang, ålegræs og vegetation som transportør og fælde

*Vegetation kan både flyde, synke, fange og senere frigive rav.*

Vegetation påvirker rav på mindst fire måder: flydende tang kan transportere eller samle små stykker; nedsunkne tangbælter kan lagre rav; vegetation reducerer lokal strøm og fremmer aflejring; og en ny storm kan genmobilisere tidligere lagret materiale.

Forskning i retention af lavdensitetspartikler i marine vegetationskanopier støtter mekanismen som analogi, men RavRadar har ingen måling af vegetationens tæthed, sæson eller tilstand. Feltet seagrass er statisk og groft.

I aktiv transportscore gives +3 for tang/ålegræs, når strøm-alignment er mindst 0,20. I procesindikatoren giver vegetation 12 retentionpoint. Disse to tal er arbejdsværdier og kan dobbeltrepræsentere samme mekanisme i forklaringen, selv om kun transportscoren påvirker RavScore direkte.

Ekspertpunkt E-10: Beskriv sæson-, dybde- og stormafhængig retention i tang/ålegræs og om statisk zoneflag bør erstattes af dynamisk observation.


## 14. Kystmorfologi, revler, render, odder og menneskeskabte strukturer

*Hvordan geometri fokuserer, blokerer eller omdirigerer transport.*

Kystformen bestemmer, hvordan bølger bryder, hvor strømmen accelererer, og hvor materiale kan aflejres. Revler kan beskytte en indre zone, skabe kanaler og flytte brydningslinjen. Render kan fokusere udadgående strøm. Odder kan skabe læ, konvergens eller bypass. Havne og høfder kan afbryde langskyst transport og skabe ophobning på den ene side og underskud på den anden.

RavRadar klassificerer heuristisk vestkyst, østkyst, fjordsystemer, odder, rev, lavt vand, vegetation og flere kystretninger. Klassifikationen er ikke en detaljeret morfodynamisk model.

Aktive statiske transportbonusser er +4 for lavt vand, +3 for rev og +3 for vegetation – kun ved indgående/skrår indtransport. Frigivelsesscoren giver +5 til coastType === west. Procesindikatoren giver yderligere retentionpoint, men påvirker ikke den numeriske RavScore direkte.

Ekspertpunkt E-11: Auditér om de statiske zoneegenskaber er korrekt registreret, og om de bør påvirke transport, frigivelse, retention eller kun forklaring.


## 15. Storm, efterstorm og tidslig persistens

*En hændelse er et forløb, ikke et øjebliksbillede.*

Ravjagt efter en storm kan være bedre end under stormens maksimum. Høj energi kan først frigøre materiale; derefter kan fortsat strøm transportere det; til sidst kan faldende energi og vandstand gøre det synligt og jagtbart.

Den aktive frigivelsesscore starter på 22. Historisk vind og bølger kan hæve den. Hvis der er gået 3–18 timer siden høj energi, gives +12. Mere end 48 timer giver -8. Den separate procesindikator klassificerer under 3 timer som højenergifase, 3–18 timer som efterstorm/transportfase, 18–48 timer som aflejringsfase og senere som sen efterfase.

Der er ikke i dag en aktiv landsdækkende persistence-regel i rules/national-rules.json eller rules/local-rules.json. Den eneste skabelon ligger som inaktiv hypotese. Det er vigtigt: håndbogen beskriver en plausibel proces, men systemet fastholder ikke automatisk høje scorer i et bestemt antal timer ud over den indbyggede frigivelseshistorik.

Ekspertpunkt E-12: Fastlæg hændelsesfaser for forskellige kysttyper og hvilke betingelser der afbryder persistens – eksempelvis stærk udstrømning, ny stormretning eller meget lav vandstand.

### 15.1 Stormen er en sekvens – ikke et enkelt maksimum

Et højt bølge- eller vindmaksimum kan mobilisere materiale, men det bedste jagttidspunkt kan komme senere. Under den kraftigste fase kan rav være i transport, ligge under uroligt vand eller blive ført forbi et område. Når energien falder eller retningen ændres, kan materialet koncentreres og aflejres. Derfor skelner RavRadar mellem højenergifase, efterstorm/transportfase, aflejringsfase og sen efterfase.

### 15.2 Hysterese og hukommelse

Kystsystemet har hukommelse: bundprofil, sedimentkoncentration og ravlager ved tidspunkt t afhænger af timerne og dagene før. Den aktive model bruger 24-timers maksimum og tid siden høj energi som en enkel hukommelse. Den modellerer ikke den faktiske energiintegral, gentagne stormpulser eller hvor meget lager der allerede er tømt.

### 15.3 Retningsskift

Litteraturen om baltisk rav peger på stærke og langvarige storme samt en efterfølgende vindsvækkelse eller retningsændring som relevante for opskyl. Det er fysisk plausibelt, fordi mobilisering og strandaflejring kan kræve forskellige hydrodynamiske faser. RavRadar bør på sigt registrere selve sekvensen af retninger og energi, ikke kun maksimumværdier.


## 16. Aflejring, opskylslinjer og genmobilisering

*Hvor ravet ender, og hvorfor fundstedet kan flytte sig efter hændelsen.*

Aflejring sker, når transportkapaciteten falder eller partiklen møder en fælde. Det kan være ved swashgrænsen, bag en revle, i en tanglinje, i læ af en odde, ved en strandvold eller i en lavning. Flere opskylslinjer kan repræsentere forskellige vandstande og hændelser.

Efter aflejring kan rav flyttes igen af næste bølge, faldende vand, vind på stranden, fodtrafik eller ny storm. En synlig tanglinje er derfor et øjebliksbillede af en dynamisk proces.

RavRadar modellerer ikke eksplicit strandingsposition eller sandsynlig højde på stranden. Vandstandsændring og jagtform bruges som indirekte signaler.

Ekspertpunkt E-13: Beskriv hvilke kombinationer af faldende vand, bølgeaftagning og kystprofil der bedst forudsiger synlige opskylslinjer.


## 17. Jagtbarhed, sigt og sikkerhed

*Fysisk transportpotentiale er ikke det samme som et godt eller sikkert jagttidspunkt.*

Jagtbarhed er den højst vægtede komponent i den aktive score (40 %). Den skal afspejle, om brugeren realistisk kan se og nå ravet. RavRadar har to jagtformer: waders og beach.

For waders starter jagtbarhed på 60. Vind højst 3 m/s giver +28; 3–6 m/s +8; 6–8 m/s -35; over 8 m/s -60. Bølger højst 0,3 m giver +12, mens over 0,7 m giver -25. For strandjagt giver vind højst 8 m/s +15, 8–13 m/s +5 og over 13 m/s -25; bølger over 2,5 m giver -12.

Disse tærskler er hovedsageligt sikkerheds- og observationsarbejdsværdier. Lokal bund, mørke, strømstyrke, temperatur, is, adgang og brugerens erfaring indgår ikke fuldt. Appen må ikke erstatte egen sikkerhedsvurdering.

Ekspertpunkt E-14: Valider wadersgrænserne for forskellige kyster og vurder om strøm, temperatur og bølgeperiode skal kunne blokere anbefalingen helt.


## 18. Præcis implementering i RavScore 4.0.60

*Den faktiske kodevirkning, trin for trin.*

Den aktive beregning findes i js/core/score-engine.js. Den gamle rod-fil ravscore.js er historisk/sekundær og må ikke bruges som beskrivelse af den aktive app uden at bekræfte importkæden.

18.1 Hovedformel
rå score = jagtbarhed × 0,40 + transport × 0,35 + mobilisering/tilgængelighed × 0,25

Vægtene kan ændres af den godkendte adaptive model, men normaliseres altid til 1,0. Hver vægt begrænses til 0,05–0,80. Derefter lægges et adaptivt justeringsled på -25 til +25. Til sidst anvendes aktive ekspertregler.

18.2 Niveauer

Score | Visning
90–100 | God + exceptionel markering
75–89 | God
55–74 | Middel
35–54 | Svag
0–34 | Dårlig
18.3 Transportberegning
Transport starter på 34. Strømhastighed, strømretning, vindretning og tre-timers vandstandstrend tilføjes. Statiske kystegenskaber kan kun tilføjes ved alignment mindst 0,20. Derefter anvendes manglende-data- og offshore-caps.

18.4 Frigivelsesberegning
Frigivelse starter på 22. Maksimal vind over 24 timer, maksimal bølge over 24 timer, tid siden høj energi og vestkystflag påvirker resultatet.

18.5 Regelrækkefølge
Regelmotoren sorterer aktive regler efter prioritet. gate kan blokere anbefaling; override kan sætte en bestemt score; bonus, penalty og persistence summerer point. Slutresultatet begrænses til 0–100.

18.6 Forklarbarhed
Resultatet indeholder råvejr, historik, zonegeometri, delscorer, vægte, bidrag, retningankre, caps, adaptive matches, regelmatches, baseScore og finalScore. Debugsporet er nødvendigt for faglig audit.

Kendt begrænsning: Procesindikatoren transportEvent.index vises som forklaring, men indgår ikke direkte i RavScore. Det kan forvirre, hvis indikator og score peger forskelligt.


## 19. Procesindikatoren for hændelsesfase

*En separat diagnostisk model, som ikke må forveksles med RavScore.*

js/core/coastal-process-model.js beregner en hændelsesindikator med mobilisering 45 %, timing 25 %, fortsættelse 20 % og retention 10 %. Den klassificerer kysten heuristisk og giver en fasebeskrivelse.

Indikatoren kan være fagligt nyttig, fordi den gør hændelsesforløbet synligt. Men den påvirker i dag ikke scoretallet. En ekspert kan derfor se høj mobilisering og samtidig en lav score, hvis jagtbarhed eller transport er dårlig.

Fremtidig ændring skal vælge én af tre retninger: (a) indikator forbliver ren forklaring, (b) indikator bliver en kontrolleret gate/bonus, eller (c) hovedscoren ombygges til en egentlig procesmodel. Den må ikke snige sig ind som skjult dobbeltvægtning.


## 20. Retningskonventioner, kystankre og geometrisk audit

*Sådan undgår systemet vendte pile og forkert lokal kystretning.*

Vind er 'fra'; strøm er 'mod'; onshoreDirectionDeg er retningen fra hav mod land. UI-pile, rå komponentvektorer og scoreretning skal testes som én kæde.

Bugtede zoner kan have flere retningankre. Systemet vælger den mindst offshore / mest gunstige relevante kystdel og dokumenterer valgmetoden. Det er en pragmatisk løsning, men kan overvurdere en stor zone, hvis kun en lille kystdel rammes gunstigt.

Land- og havpunkter, kystlinje, ankre og onshoreDirectionDeg skal auditeres visuelt. Als Odde og Helberskov nord for Mariager Fjord er en fast regressionskontrol.

Ekspertpunkt E-15: Vurder om flere kystankre skal vægtes efter kystlængde, eksponering og transportforbindelse i stedet for at vælge bedste alignment.


## 21. Fra faglig viden til aktive regler

*En kontrolleret vej fra ekspertudsagn til produktion.*

En ekspertregel skal indeholde: påstand, mekanisme, geografi, jagtform, målbare betingelser, tidsvindue, effekt, evidensklasse, tillid, kilde, testeksempler, modbeviser og rollbackplan.

Arbejdsgangen er:

- Registrér rå observation som viden – uden scoreeffekt.

- Formulér en testbar hypotese.

- Opret regelkladde med konkret geografi og betingelser.

- Simulér positive, negative og grænsetilfælde.

- Kontrollér konflikter og maksimal samlet effekt.

- Aktivér kun med relevant rettighed og versionshistorik.

- Evaluer mod nye fund og nul-fund.

- Tilbagetræk eller justér ved manglende effekt.

Fri tekst-assistenten må kun oprette kladder. Den må ikke aktivere regler. En regel uden geografi, med ekstrem effekt eller med betingelser der altid er sande skal give advarsel.

Der er aktuelt ingen aktive nationale eller lokale fagregler i JSON-filerne. Det betyder, at eksperten starter med at validere basismodellen og derefter kan opbygge et kontrolleret regelsæt.


## 22. Hvordan ekspertudsagn og feltdata skal testes

*Fra anekdote til reproducerbar forbedring.*

En god test skal på forhånd definere hvad der forventes. Eksempel: 'Efter mindst 12 timer med bølger over X og derefter 3–12 timer med strøm mod land, stiger fundraten i zonegruppe Y sammenlignet med tilsvarende perioder uden indgående strøm.'

Testdata skal indeholde både fund og nul-fund, jagtindsats, tidspunkt, zone, jagtform, vejrsnapshot, modelversion og eventuelle lokale observationer. Uden indsats kan et nul-fund ikke fortolkes sikkert.

Data bør opdeles i udvikling og hold-out. En regel må ikke vurderes på de samme observationer, som blev brugt til at opfinde den. Små datasæt skal rapporteres med stor usikkerhed.

Før en scoreændring bør man kontrollere kalibrering, rangering mellem zoner, falske toppe, geografisk bias og om forbedringen kun skyldes sæson eller brugeradfærd.


## 23. Datakilder, forecastintegritet og tidsserier

*DMI-prioritet, fallback og hvorfor kontinuitet er vigtigere end kunstige 120 timer.*

DMI er autoritativ dansk kilde, når data er tilgængelige og brugbare. Open-Meteo og andre kilder er fallback. Fallback skal være komponentvis og transparent.

Vind, bølger, strøm, vandstand og temperatur behandles som separate tidsserier. De filtreres før interpolation og canonicaliseres til faste UTC-timer. Kildeskift DMI → fallback → DMI time for time er forbudt, fordi det kan skabe kunstige spring.

En horisont på cirka 118–119 sammenhængende timer er acceptabel. Det er bedre end at gentage sidste værdi for at ramme 120.

Hver scoreforklaring bør vise datakilde, modelkørsel, forecasttid, alder, fallback og mangler. Dataældre end friskhedsgrænsen må ikke vises som aktuelle.


## 24. DMI-vandstandsstationer, observationer og cachelivscyklus

*Tre separate statuslag for hver station.*

En station har mindst tre statuslag:

- Registerstatus: kendt, aktiv, historisk/inaktiv eller ukendt i DMI-registeret.

- Observationsstatus: seneste måling, leverer nu, midlertidigt tavs eller aldrig observeret.

- Prognose-/cachestatus: gyldig prognosecache, gyldig til, udløbet eller mangler.

Samlet anvendelighed må ikke sættes til falsk, blot fordi en ny observation mangler. Hvis gyldig prognosecache findes, kan stationen fortsat anvendes til prognosen. Friske observationer har forrang; cache må kun bruges til dokumenteret udløb.

Stationsregisteret er persistent. Opdagede stationer fjernes ikke ved en tom kørsel. Admin viser automatisk primær/sekundær station, afstand, vægt, valgmetode og eventuel override.

Historiske/inaktive stationer skal være tydeligt markeret og må normalt ikke vælges uden advarsel. Hele registeret skal periodisk sammenholdes med DMI's officielle liste.


## 25. Brugerfeedback, adaptiv model og AI

*Menneskekontrolleret læring med versionshistorik.*

Feedback gemmer et uforanderligt vejrsnapshot, score, modelversion, zone, jagtform og resultat. Både fund og nul-fund er nødvendige. Persondata og samtykke skal håndteres separat.

Den adaptive model kan ændre hovedvægte, global justering, zonejusteringer og metrikjusteringer. Forslag skal godkendes manuelt. Ændringer versionsstyres og kan rulles tilbage.

AI må strukturere fri tekst, forklare score, finde mønstre og foreslå hypoteser. AI må ikke selv aktivere regler eller ændre produktionsmodellen. En AI-konklusion er ikke faglig evidens.


## 26. Administration, Supabase og ekspertrettigheder

*Hele den værdifulde adminfunktionalitet ligger bag adgangskontrol.*

GitHub Pages kan udlevere den statiske admin-skal, men uden gyldig Supabase-session og rettigheder må den ikke vise eller hente beskyttede data. Sikkerheden ligger i Supabase JWT/secret-serverflow og Row Level Security – ikke i at skjule et link.

Håndbogen er et beskyttet admin-dokument. Eksperten skal have admin_access og den særskilte rettighed handbook_view. Indsendelse af faglige kommentarer kræver handbook_review.

Læsning, redigering, publicering, rå diagnostik, systemadministration og ekspertadministration er adskilte rettigheder. Ejerrollen har fuld adgang. Service role / sb_secret må kun findes som GitHub Secret og aldrig i browserkode eller ZIP.


## 27. Diagnostik, sundhed og faglig audit

*Fra datakilde til slutscore uden skjulte spring.*

RavRadar skelner mellem brugerprognosens komplethed, DMI-dækning, acquisition, konvertering, horisont, observationer, cache og fallback. En grøn brugerprognose kan eksistere samtidig med degraderet DMI-status.

Runtime-diagnostik, stationaudit, cacheaudit og implementeringsaudit er beskyttede admindokumenter. De må ikke ligge som offentlige JSON-adresser.

En faglig scoreaudit skal kunne følge: rå komponenter → enheder → retning → lokal geometri → delscore → caps → adaptiv justering → regeljustering → slutscore.


## 28. Release Governance og RDKS-gate

*Den bindende proces, som skal forhindre gentagelse af 4.0.56-forløbet.*

En version er ikke installationsklar, før præcis det pakkede indhold har bestået hele valideringen og Release Gate. Kodegennemgang alene er ikke nok.

Obligatorisk rækkefølge:

- Brug seneste uploadede projekt som eneste arbejdskilde.

- Kortlæg samtaledelta, aktive RDKS-krav og nuværende implementering.

- Opdater kode, håndbog, RDKS, changelog og versionsfelter samlet.

- Kør generatorer i samme rækkefølge som GitHub Actions.

- Kør hele npm run validate.

- Kør npm run release:gate.

- Byg ZIP med npm run release:package.

- Auditér ZIP for .git, secrets, caches og manglende workflowfiler.

- Efter push: verificér den faktiske GitHub Actions-kørsel som grøn.

- Ved fejl: gennemgå hele den resterende pipeline samlet; undgå manuelle lapninger én fejl ad gangen.

GitHub Secrets og Supabase-installation bevares uden for ZIP. En ny ZIP må ikke kræve genoprettelse af eksisterende secrets, medmindre en bevidst nøglemigration er dokumenteret.


## 29. Overgang til ravradar.dk

*Eget domæne foran GitHub Pages og Supabase.*

Brugerne skal besøge ravradar.dk, selv hvis GitHub Pages fortsat hoster frontend. Projektet skal derfor bruge relative appstier, korrekt manifest og service worker, og undgå hardcodede GitHub Pages-adresser.

Før domænet aktiveres skal DNS, GitHub Pages custom domain, HTTPS, www-strategi, Supabase Site URL og redirect-URLs være afklaret. Admin- og loginflow skal testes på både primært domæne og valgt redirectdomæne.

CNAME må først tilføjes, når DNS og Supabase redirects er klar. Ellers kan login eller deployment låses i en halvkonfigureret tilstand.


## 30. Ekspertens valideringsmatrix

*En prioriteret arbejdsplan for faglig gennemgang.*

ID | Emne | Nuværende antagelse | Højeste værdi af ekspertinput
E-01 | Ravstørrelse/form | Én generel partikelprofil | Størrelsesafhængige transportregimer
E-02 | Kildelagre | Ikke modelleret | Geologisk/geomorfologisk lagerkort
E-03 | Bølgeenergi | Højde som proxy | Periode, retning, varighed og brydning
E-04 | Strøm | 0,15–0,65 m/s gunstigt | Bundnære tærskler pr. kysttype
E-05 | Vind | Lille direkte transporteffekt | Fralandsvind og efterstormmekanismer
E-06 | Vandstand | 3-timers trend | Absolut niveau og lokale referencer
E-07 | Langskyst | Indirekte i alignment | Transportnet mellem nabozoner
E-08 | Undertow/rip | Ikke eksplicit | Faseafhængig offshorelogik
E-09 | Ledsagemateriale | Kvalitativt | Indikatorhierarki og friskhed
E-10 | Vegetation | Statisk zoneflag | Sæson og dynamisk retention
E-11 | Kystmorfologi | Grove statiske flags | Lokale fælder, bypass og render
E-12 | Persistens | 3–18 timer bonus | Kystspecifik fase og afbrydelse
E-13 | Aflejring | Ikke lokaliseret | Opskylshøjde og timing
E-14 | Sikkerhed | Generelle grænser | Kyst-/mode-specifik gate
E-15 | Flere ankre | Bedste alignment vælges | Areal-/længde-/eksponeringsvægtning
Eksperten bør kommentere hvert punkt med: enig/uenig, begrundelse, geografisk rækkevidde, foreslåede målelige betingelser, forventet effekt og hvilke observationer der kan modbevise påstanden.


## 31. Gennemregnede faglige scenarier

*Eksempler der viser modelens styrker og svagheder.*

Scenario A – stærk indgående strøm efter storm, roligt nu
Historisk vind 15 m/s og bølger 1,8 m giver høj frigivelse. Strøm 0,3 m/s næsten mod land giver høj transport. Vind og bølger er nu lave, så waders-jagtbarhed er høj. Dette er den type situation, modellen er bygget til at rangere højt.

Scenario B – stor storm nu, strøm væk fra land
Frigivelse kan være høj, men waders-jagtbarhed falder kraftigt. Ved stærk offshore-strøm sættes transportloft 28. Slutscoren bør ikke blive grøn alene på stormenergi.

Scenario C – roligt vejr uden nylig energi
Jagtbarhed kan være meget høj, men transport og frigivelse er moderate/lave. Scoren bør være middel eller svag. Der kan stadig findes gammelt rav; modellen vurderer ikke lageret.

Scenario D – skrå/langskyst strøm ved odde
Alignment kan give et mindre positivt bidrag. Hvis transporten faktisk konvergerer i læsiden, kan modellen undervurdere zonen; hvis materialet bypasser odden, kan den overvurdere den. Dette kræver lokal ekspertregel eller forbedret netværksmodel.

Scenario E – gammel browsercache
Data ældre end friskhedsgrænsen må ikke vises som aktuelle. Siden skal hente friske data eller vise tydelig utilgængelighed. Gamle scores må ikke stå som om de er nuværende.


## 32. Faglige hovedkilder, analogier og læsevej

*Kilder bag procesforståelsen og deres begrænsninger.*

Følgende kilder understøtter den generelle procesforståelse. De validerer ikke automatisk RavRadars numeriske tærskler:

- Chubarenko, I. m.fl. (2017), *Microplastics in sea coastal zone: Lessons learned from the Baltic amber*. Marine Pollution Bulletin. Vigtig analogi mellem rav, lavdensitetspartikler, stormmobilisering og strandingsprocesser. https://www.sciencedirect.com/science/article/abs/pii/S0269749116316402

- Davidson, B. m.fl. (2023), *Beaching model for buoyant marine debris in bore-driven swash*. Flow. Laboratorie-/modelarbejde om partikelstranding i swash og betydningen af partikelinerti og indgangsbetingelser. https://www.cambridge.org/core/journals/flow/article/beaching-model-for-buoyant-marine-debris-in-boredriven-swash/DBBD345FD31CCA10CC21F29744EA1A57

- Isachenko, I. m.fl. (2023), *Beach-cast appearance on the tide-less sea shore*. Estuarine, Coastal and Shelf Science. Relevant for post-storm beach-cast i det sydøstlige Østersøområde. https://www.sciencedirect.com/science/article/abs/pii/S0272771423000094

- Kim, S. m.fl. (2024), *Short-term buoyant microplastic transport patterns driven by surf zone processes*. Marine Pollution Bulletin. Understøtter betydningen af brydning, orbitalbevægelse og surfzoneprocesser for lavdensitetspartikler. https://www.sciencedirect.com/science/article/abs/pii/S0025326X2400225X

- Kerpen, N.B. m.fl. (2024), *Microplastic retention in marine vegetation canopies under oscillatory flow*. Science of the Total Environment. Analogikilde for retention i vegetation. https://www.sciencedirect.com/science/article/pii/S004896972307910X

- Chen, W. m.fl. (2023), *A review of practical models of sand transport in the swash zone*. Coastal Engineering. Oversigt over swashturbulens, sedimentadvektion, infragravitetsbølger, infiltration og strandhældning. https://research.utwente.nl/en/publications/a-review-of-practical-models-of-sand-transport-in-the-swash-zone/

- USGS, *Sediment Transport in Coastal Environments*. Officiel oversigt over bølge-, strøm- og strukturpåvirket kysttransport. https://www.usgs.gov/centers/pcmsc/science/sediment-transport-coastal-environments

- USGS glossary, definition af longshore current/transport. https://pubs.usgs.gov/of/2008/1206/html/glossary.html

Kilder om plast bruges kun som mekanistisk analogi. Ravets egen transport skal så vidt muligt valideres med ravspecifik litteratur og lokale feltobservationer.


## 33. Ordbog og faste begreber

*Centrale ord, som skal bruges ens i UI, kode og ekspertkommunikation.*

- Alignment: matematisk mål for hvor godt en bevægelsesretning passer med lokal pålandsretning.

- Canonical UTC-time: fast time uden minutforskydning, brugt ved merge.

- Cap/loft: maksimal tilladt delscore ved en begrænsende tilstand.

- Fallback: sekundær datakilde ved manglende/ugyldig primær kilde.

- Frigivelse: mobilisering fra bund, sediment, vegetation eller depot.

- Jagtbarhed: sikker og praktisk mulighed for at finde rav.

- OnshoreDirectionDeg: lokal retning fra hav mod land.

- Observation: faktisk måling.

- Prognose: modelberegnet fremtidig værdi.

- Cache: tidligere hentet data, som stadig er dokumenteret gyldig.

- Retention: midlertidig eller længerevarende fastholdelse.

- RDKS: RavRadar Decision & Knowledge System.

- Swash: området der gentagne gange overskylles og tørlægges af bølgeopskyl.

- Undertow: nettoudadgående returstrøm under bølger i surfzonen.

- Override: administratorens bevidste erstatning af automatik.

- Regression: tidligere løst fejl, som vender tilbage.


## 34. Fluidmekanisk grundlag: kræfter, skærspænding og turbulens

*De fysiske størrelser, der forbinder vejrdata med mulig partikelbevægelse.*

RavRadar bruger i dag empiriske scoregrænser. For at kunne forbedre dem skal man forstå de underliggende kræfter.

### 34.1 Neddykket vægt
Den nedadrettede effektive vægt bestemmes af forskellen mellem partiklens og vandets densitet. For rav er denne forskel lille sammenlignet med mineralsk sand. Derfor kan en mindre hydrodynamisk kraft være tilstrækkelig til at reducere bundkontakten, men form og mekanisk indlejring kan dominere.

### 34.2 Drag og løft
Strøm omkring en partikel giver drag i strømmens retning og kan give løft gennem trykforskelle og turbulente impulser. Kræfterne afhænger omtrent af vandets densitet, det projicerede areal og hastigheden i anden. En fordobling af lokal hastighed kan derfor give en langt større belastning end en lineær score antyder.

### 34.3 Bundskærspænding
Bundskærspænding er den tangentiale belastning, som vandbevægelsen overfører til bunden. Ved kombinerede bølger og strøm kan den maksimale belastning være væsentligt større end bidragene hver for sig. En fysisk mobiliseringsmodel bør sammenligne den kombinerede belastning med en kritisk værdi for den relevante partikel og bundtilstand.

### 34.4 Turbulens
Turbulens skaber kortvarige vertikale og horisontale hastighedsfluktuationer. En timegennemsnitlig strøm på 0,2 m/s fortæller derfor ikke, hvor store de enkelte løfteimpulser er. Bølgebrydning og vortices ved revler kan være afgørende.

Modelhul: RavRadar beregner ikke bundskærspænding, friktionshastighed eller turbulensintensitet. Disse er kandidater til en fremtidig fysisk delmodel, hvis nødvendige input kan skaffes robust.


## 35. Partikelmekanik og dimensionsløse tal

*Hvordan Shields-, Reynolds- og Rouse-tænkning kan bruges uden at foregive falsk præcision.*

### 35.1 Shields-parameteren
Shields-parameteren sammenholder bundskærspænding med partiklens neddykkede vægt og størrelse. Den bruges normalt til mineralsk sediment. For rav kan den give en struktureret ramme, men standardkurverne er ikke direkte valideret for uregelmæssige, lavdensitetsstykker.

### 35.2 Partikel-Reynolds-tal og dragregime
Dragkoefficienten afhænger af strømregimet omkring partiklen. Små glatte stykker og store uregelmæssige stykker kan derfor ikke antages at have samme respons, selv når deres densitet er ens.

### 35.3 Synkehastighed og Rouse-lignende tænkning
For sediment bruges forholdet mellem synkehastighed og turbulent blanding til at vurdere, om partikler holdes i suspension. Ravets lave synkehastighed kan gøre kortvarig suspension sandsynlig, men der mangler systematiske målinger fordelt på størrelse, form, saltindhold og biofilm.

### 35.4 Praktisk anvendelse i RavRadar
Disse tal skal i første omgang bruges til at formulere testbare hypoteser og laboratorieforsøg – ikke til at erstatte scoremotoren med uprøvede formler. En ny fysisk parameter må først aktiveres, når den kan beregnes stabilt og giver bedre hold-out-resultater.

Ekspertpunkt E-16: Definér et realistisk forsøgsprogram for kritisk mobilisering og synkehastighed for repræsentative ravklasser.


## 36. Bølgespektrum, periode, retning og varighed

*Hvorfor signifikant bølgehøjde alene kan skjule væsentlige forskelle.*

En havtilstand består af mange bølgekomponenter. Signifikant bølgehøjde opsummerer højden, men ikke hele spektret.

### 36.1 Periode
Lange bølger påvirker typisk bunden på større dybde og kan give en anden surfzone end korte vindbølger. Periode bør derfor undersøges som forklarende variabel sammen med højde.

### 36.2 Retning og kysteksponering
Den relevante bølgeretning skal sammenholdes med lokal kystnormal, revler og lægivende geometri. En offshore modelretning kan blive refrakteret, før bølgen når stranden. Ét havanker er derfor en approximation.

### 36.3 Fetch og varighed
Lokal vind over kort fetch kan give stejle, korte bølger, mens fjern swell kan ankomme efter at den lokale vind er faldet. Varighed styrer, hvor længe bunden udsættes for mobiliserende belastning. RavRadars nuværende maksimumsregel kan ikke skelne mellem en kort spids og mange timers vedvarende energi.

### 36.4 Kandidat til ny energidosering
En fremtidig indikator kan integrere en bølgeenergi-proxy over tid, vægtet med retning og periode. Den skal testes mod den enklere maksimumsregel, så kompleksitet kun beholdes, hvis den forbedrer prognosen.


## 37. Strandprofiler, revler og morfodynamiske tilstande

*Hvordan bundformen kan ændre den samme vejrprognoses virkning.*

Strande er ikke statiske skrå flader. Revler, render, cusps, erosionskanter og strandhældning ændres under storme og rolige perioder.

### 37.1 Revler som både lager og barriere
En revle kan lagre let materiale, bryde bølger og skabe en roligere landværts zone. Et brud i revlen kan koncentrere udadgående strøm. Derfor kan samme revle både fremme aflejring og skabe eksport afhængigt af placering.

### 37.2 Erosiv og akkretiv profil
Højenergiforhold kan flytte sand offshore og danne eller forstærke revler; roligere bølger kan føre sediment landværts. Rav behøver ikke følge sandets nettotransport, men bundprofilens ændring bestemmer, hvilke gamle lag og lommer der åbnes.

### 37.3 Databehov
RavRadar har i dag statisk kystgeometri og generelle kystegenskaber. Dynamisk bathymetri er ikke tilgængelig i prognoseopløsning. Brugerobservationer af nye render, erosionskanter og tanglinjer kan derfor være værdifulde som kortlivede zonetilstande.

Ekspertpunkt E-17: Angiv hvilke morfologiske observationer en ravjæger realistisk kan registrere, og hvor længe de bør påvirke modellen.


## 38. Kildelager, udtømning og genopfyldning

*En konceptuel model for noget den nuværende score ikke kan se.*

Vejr beskriver transportkapacitet, men fund kræver tilgængeligt rav. Derfor bør RavRadar på sigt skelne mellem en hurtig hydrodynamisk tilstand og et langsomt latent kildelager.

### 38.1 Mulige lagre

- Geologiske ravførende lag og eroderende klinter.
- Ældre strandaflejringer og stormvolde.
- Undervandslommer med tørv, træ og organisk materiale.
- Revler og render, som midlertidigt opsamler lette partikler.
- Langskyst tilførsel fra naboceller.

### 38.2 Udtømning
Et område kan levere godt efter første storm og dårligt efter næste, selv om vejret ligner, fordi det lettilgængelige lager er tømt. Gentagne fund og nul-fund skal derfor tolkes som information om både model og lager.

### 38.3 Forsigtig implementering
En lagerindikator bør være probabilistisk og langsomt skiftende. Den må ikke skjule dårlig hydrodynamik eller skabe en permanent favoritliste. Den bør opdateres af kvalitetssikrede observationer med negativ-evidens-vægtning, der tager højde for søgeindsats og sigt.

Ekspertpunkt E-18: Vurder om en latent lagerfaktor er fagligt meningsfuld, og hvilke observationer der kan opdatere den uden cirkelslutning.


## 39. Tang, ålegræs og beach-cast som fysisk system

*Organisk opskyl kan transportere, fange og skjule rav – men er ikke et entydigt signal.*

### 39.1 Samtransport
Rav og organisk materiale kan begge have lav effektiv neddykket vægt og optræde i samme strandingshændelse. Det gør frisk tang til en plausibel indikator. Men tangens store fleksible form, opdrift og overfladeorientering betyder, at den kan reagere meget anderledes end et kompakt ravstykke.

### 39.2 Retention
Vegetationsmåtter og tangvolde reducerer lokale hastigheder, øger ruhed og skaber hulrum. Laboratorieforskning på lavdensitetspartikler viser, at vegetation kan tilbageholde partikler under bølger. Overførbarheden til rav afhænger af skala, vegetationstype og hvor materialet befinder sig i vandsøjlen.

### 39.3 Tidsalder
Frisk, våd tang ved den aktive opskylslinje er et andet signal end tør tang flyttet af vind. RavRadar bør derfor ikke nøjes med en permanent zoneegenskab; feltobservationer bør indeholde friskhed, højde på stranden, dominerende materiale og tidspunkt.

Ekspertpunkt E-19: Definér en praktisk klassifikation af opskyl, som kan bruges konsistent af ikke-eksperter.


## 40. Dansk regional oceanografi og hvorfor én landsregel er utilstrækkelig

*Nordsø, Skagerrak, Kattegat, Bælter, Øresund og Vadehav har forskellige dynamikker.*

Danmarks kyster ligger i flere hydrodynamiske regimer. En regel, der virker på en åben Nordsøkyst, kan være forkert i et beskyttet farvand eller tidevandspræget vadeområde.

### 40.1 Åbne vestkyster
Stor fetch, kraftig bølgeenergi, stormsurge og markant profilændring gør mobilisering og sikkerhed centrale. Bølgeretning og periode kan være vigtigere end lokal vind i det konkrete øjeblik.

### 40.2 Skagerrak og Kattegat
Komplekse forbindelser mellem Nordsøen og Østersøen, tæthedsstrømme, vindstuvning og lokal kystgeometri kan give forskel mellem overflade- og bundstrøm. Nordjyske østvendte kyster kan få rolige jagtforhold under fralandsvind, mens tidligere eller fjern bølgeenergi stadig har påvirket bunden.

### 40.3 Indre farvande
Bælter, fjorde og smalle passager kan være strømstyrede og stærkt afhængige af lokale indløb. Et groft modelgrid kan overse nærkystlige hvirvler og strømkonvergens.

### 40.4 Vadehavet
Tidevand, render, vadeflader og hurtig vandstandsændring kræver særregler. Jagtbarhed og adgang kan ændres hurtigere end den generelle timeprognose antyder.

Ekspertpunkt E-20: Definér regionale modelprofiler og hvilke tærskler der ikke bør være landsdækkende.


## 41. Måleusikkerhed, modelopløsning og repræsentativitet

*Hvorfor præcise tal ikke nødvendigvis er præcise beskrivelser af stranden.*

### 41.1 Gridpunkt versus zone
Vejr- og havmodeller giver værdier for en celle eller interpoleret position. En RavRadar-zone strækker sig langs en uregelmæssig kyst og kan rumme flere revler, læzoner og orienteringer. Dataene skal derfor opfattes som repræsentative signaler med usikkerhed.

### 41.2 Tidsopløsning
Timeværdier kan skjule korte bølgegrupper, vindstød, tidevandsvendinger og ripstrømme. Omvendt kan en kort lokal hændelse være for lille til at have betydning for hele zonen.

### 41.3 Prognosefejl og kildeblanding
En fysisk model kan være god, men prognosen forkert. RavRadar skal derfor skelne mellem modelusikkerhed, datakvalitet og faglig scoreusikkerhed. Kildeskift inden for samme tidsserie kan skabe kunstige spring og skal undgås.

### 41.4 Visning til brugeren
En score bør ledsages af datadækning, alder og centrale usikkerheder. Et tal uden forklaring kan skabe større falsk sikkerhed end en mere forsigtig kvalitetsklasse.


## 42. Hypoteseregister: hvad RavRadar antager lige nu

*Et falsificerbart register over de vigtigste arbejdshypoteser.*

ID | Hypotese | Nuværende implementering | Kan afkræftes ved

H-01 | Historisk høj vind og bølgeenergi øger sandsynligheden for frigivelse. | 24-timers maksimum og bonusser. | Systematiske nul-fund ved god søgeindsats og kendt lager.

H-02 | Moderat strøm med indkomponent er mere gunstig end meget svag eller stærkt offshore strøm. | 0,15–0,65 m/s bonus og offshore-caps. | Funddata viser andet optimum eller kysttypeafhængighed.

H-03 | 3–18 timer efter høj energi er ofte en gunstig transport-/aflejringsfase. | Frigivelsesbonus. | Tidsstemplede fund topper konsekvent uden for intervallet.

H-04 | Frisk organisk opskyl øger sandsynligheden for ravkoncentration. | Statiske zonebonusser og ekspertregler. | Kontrollerede observationer viser ingen merværdi efter vejrkontrol.

H-05 | Flere retningsankre beskriver uregelmæssige kyster bedre end én normal. | Mindst-offshore relevant anker. | Metoden giver systematisk for høje scorer i bugter/odder.

Hypoteseregisteret skal opdateres, når scorelogik ændres. En hypotese må ikke slettes, blot fordi den afvises; den skal arkiveres med resultat og version.


## 43. Faglig validering: fra anekdote til test

*Hvordan RavRadar kan lære uden at overtilpasse til enkelte ture.*

### 43.1 Prospektiv registrering
Den stærkeste test er at gemme prognosen, før udfaldet kendes. Efterfølgende registreres søgetid, dækket strækning, metode, sigt, fundmængde og kvalitet. Det forhindrer, at modellen omskrives ud fra hukommelse alene.

### 43.2 Negative observationer
Et nul-fund er kun informativt, hvis der faktisk blev søgt tilstrækkeligt og forholdene var observerbare. Ti minutters søgning i uklart vand bør ikke vægte som to timers systematisk søgning.

### 43.3 Hold-out og geografisk generalisering
Nye tærskler skal vurderes på perioder og zoner, som ikke blev brugt til at udlede dem. Ellers kan modellen lære lokale tilfældigheder.

### 43.4 Kalibrering
En score på 80 behøver ikke betyde 80 % fundchance. Scoren er en relativ indeksværdi. På sigt kan man undersøge kalibrering: hvor ofte og hvor meget rav findes ved forskellige scoreintervaller, betinget af søgeindsats.

### 43.5 Før/efter-test af regler
En ekspertregel bør have en tydelig forventet effekt, testperiode og rollback-kriterium. Ændringer skal versionsmærkes, så forbedring kan adskilles fra ændret datakvalitet.


## 44. Feltprotokol for ravjægere og eksperter

*Et minimumsdatasæt, der kan gøre observationer brugbare for modellen.*

Feltdata bør registreres ensartet. Følgende minimum foreslås:

- Præcis zone og start/sluttid.
- Jagtform: strand, vandkant, waders, UV nat.
- Aktiv søgetid og omtrentligt dækket strækning.
- Antal og samlet masse af rav; eventuelt størrelsesklasser.
- Friskhed og placering af tang/ålegræs/andet opskyl.
- Observeret bølgehøjde, uklarhed, strømretning og sikkerhedsforhold.
- Ny erosionskant, revle, rende, udløb eller anden morfologisk ændring.
- Fotodokumentation med frivillig positionssløring.
Observationen skal markere, om vurderingen er direkte set, estimeret eller hentet fra appen. Ellers risikerer man at bruge modellens egen prognose som uafhængig bekræftelse.

Ekspertpunkt E-21: Gennemgå protokollen og fjern felter, der ikke kan registreres pålideligt i praksis.


## 45. Kendte fejlscenarier og hvordan de skal opdages

*Konkrete situationer hvor en høj eller lav score kan være misvisende.*

### 45.1 Høj score, intet lager
Vejret er ideelt, men området er udtømt eller har lav ravtilstedeværelse. Diagnosen er ikke nødvendigvis forkert transport; den kan være kildelager.

### 45.2 Grøn score ved offshore strøm
Andre komponenter kan tidligere overdøve en ugunstig strøm. Offshore-caps blev indført for at forhindre dette. Retningskonvention og pilesymbol skal stadig auditeres.

### 45.3 God lokal lomme skjult af zonegennemsnit
En lille bugt eller havnelæ kan være god, selv om zonens repræsentative modelpunkt er middelmådigt. Dette taler for flere ankre eller finere zoner – men også mod overfortolkning af små modeldetaljer.

### 45.4 Datakildeskift
Skift mellem DMI og fallback time for time kan skabe kunstige vandstandsspring eller retningsskift. Kontinuitet og kildeproveniens skal kontrolleres før scoring.

### 45.5 Gammel browsercache
Gamle prognoser må ikke fremstå som aktuelle. Dataalder valideres, og for gammel cache skal give en tydelig fejltilstand frem for normal visning.


## 46. Sporbarhed fra faglig påstand til kode og data

*Hvor eksperten og udvikleren finder den konkrete implementering.*

Emne | Aktiv fil | Kontrol

Hovedscore og vægte | js/core/score-engine.js | scripts/test-score-engine.mjs

Procesfase | js/core/coastal-process-model.js | scripts/test-process-model-4.0.33.mjs

Retningsankre | js/core/direction-anchors.js | scripts/test-direction-anchors.mjs

Ekspertregler | js/core/rule-engine.js | scripts/test-rule-engine.mjs

Adaptiv model | js/core/adaptive-prediction.js | scripts/test-adaptive-prediction.mjs

Vejrdata | scripts/update-weather.mjs | Forecast- og datakvalitetstests

Stationsrouting | data/water-level-station-routing.json | Stationstopologi og cachetests

Håndbog | docs/handbook/content.json | scripts/release-gate.mjs
Historiske rodfiler kan stadig findes i projektet af kompatibilitets- eller dokumentationsgrunde. Håndbogen skal altid pege på den aktive fil og tydeligt mærke historiske implementeringer.


## 47. Kildekritik og overførbarhed til rav

*Hvordan litteratur fra sand, plast og vegetation må – og ikke må – bruges.*

### 47.1 Direkte ravlitteratur
Den mest relevante litteratur beskriver baltisk rav som svagt negativt flydende materiale, der kan cirkulere mellem undervandsskråning og strand og vaskes op efter stormforløb. Studierne er geografisk koncentreret i den sydøstlige Østersø. De giver mekanistisk støtte, men ikke direkte danske tærskler.

### 47.2 Sedimentlitteratur
Kystingeniørviden om bølger, strøm, skærspænding, bedload, suspension og morfologi er veletableret. Rav er dog ikke et standard-sandkorn. Formler kan bruges til struktur og størrelsesorden, men kræver nye partikelparametre og validering.

### 47.3 Plast som analogi
Visse plasttyper har densitet tæt på rav og kan vise, hvordan lavdensitetspartikler strander, recirkulerer eller tilbageholdes i vegetation. Plast varierer imidlertid ekstremt i form, fleksibilitet, biofilm og størrelse. Derfor må plaststudier aldrig alene fastsætte en ravregel.

### 47.4 Praktisk ravjægerviden
Langvarig lokal erfaring kan opdage mønstre, som modeller og publikationer overser. Den kan samtidig være påvirket af selektiv hukommelse, skiftende søgeindsats og skjulte variable. RavRadar behandler den som værdifuld ekspertobservation, der skal operationaliseres og testes.


## 48. Annoteret faglig bibliografi

*Kilderne bag den nuværende forståelse og præcis hvad de kan støtte.*

- Chubarenko & Stepanova (2017), “Microplastics in sea coastal zone: Lessons learned from the Baltic amber”, Environmental Pollution 224, 243–254, DOI 10.1016/j.envpol.2017.01.085. Direkte relevant analogi mellem baltisk rav og lavdensitetsplast. Understøtter stormmobilisering, recirkulation og betydningen af tæthed; fastsætter ikke RavRadars danske tærskler.

- Isachenko m.fl. (2023), “Beach-cast appearance on the tide-less sea shore: Parameters of favoring surface waves”, Estuarine, Coastal and Shelf Science 281, 108219. Relevant for bølgeparametre og beach-cast på en mikrotidal Østersøkyst. Geografisk overførbarhed skal vurderes.

- Chardón-Maldonado, Pintado-Patiño & Puleo (2016), “Advances in swash-zone research”, Coastal Engineering 115, 8–25, DOI 10.1016/j.coastaleng.2015.10.008. Grundlag for usikkerheden og kompleksiteten i swash-zone transport.

- USACE Coastal Engineering Manual, EM 1110-2-1100. Autoritativ teknisk reference til bølger, strøm, sedimenttransport og kystmorfologi.

- NOAA Ocean Service: Longshore Currents og Rip Currents. Pædagogisk, autoritativ beskrivelse af bølgedrevne langsstrømme og lokal offshore eksport.

- Kerpen m.fl. (2024), “Microplastic retention in marine vegetation canopies under breaking irregular waves”, Science of the Total Environment 912, 169280, DOI 10.1016/j.scitotenv.2023.169280. Understøtter, at vegetation kan tilbageholde lavdensitetspartikler; er en analogi, ikke direkte ravbevis.

- Coastal Wiki/Van Rijn: Sand transport. Samlet faglig oversigt over bedload, suspension, bølge- og strømkomponenter samt tidsforsinkelse i ikke-stationær transport.

- DMI Frie Data og API-dokumentation. Autoritativ kilde til hvilke observations- og prognoseprodukter RavRadar henter; dokumenterer datakilden, ikke ravfysikken.
Kildelisten skal udvides løbende. Hver ny aktiv regel skal pege på mindst én mekanistisk kilde eller være tydeligt mærket som ekspertobservation/hypotese.


## 49. Ekspertens review-arbejdsgang

*Sådan omsættes faglig kritik til en sporbar og testbar ændring.*

- Find det relevante kapitel og angiv konkret påstand eller tærskel.
- Vælg type: faglig fejl, usikker antagelse, ny forskning, forbedringsforslag eller manglende dokumentation.
- Beskriv hvilke kyster, årstider og vejrforløb udsagnet gælder for.
- Angiv forventet retning og størrelse på modelændringen.
- Vedlæg kilde, data eller gentagne observationer.
- Foreslå en test og et kriterium for accept eller afvisning.
- Ejeren vurderer forslaget; en accepteret ændring bliver først aktiv i en versioneret release.
En ekspertkommentar ændrer aldrig håndbogen eller scoremotoren direkte. Den gemmes i Supabase med versionshistorik og kan accepteres, afvises eller implementeres af ejeren.


## 50. Faglig ordliste

*Ensartede definitioner af de vigtigste begreber.*

**Advektion:** Transport med middelstrømmen.

**Backwash:** Vandets tilbagestrømning ned ad strandfladen efter swash.

**Bedload:** Partikler, der ruller, glider eller hopper tæt ved bunden.

**Bundskærspænding:** Den tangentiale belastning vandbevægelsen overfører til bunden.

**Fetch:** Den frie strækning vinden blæser over vandet og kan opbygge bølger på.

**OnshoreDirectionDeg:** RavRadars lokale retning fra hav mod land; bruges som reference for strøm og vind.

**Refraktion:** Drejning af bølger, når dele af bølgefronten bevæger sig i forskellig dybde.

**Ripstrøm:** Lokal, kanaliseret strøm væk fra stranden gennem surfzonen.

**Saltation:** Partikeltransport i gentagne hop nær bunden.

**Setup:** Forhøjet middelvandstand nær kysten forårsaget af bølgers momentumoverførsel.

**Swash:** Den vekslende op- og nedløbende vandbevægelse på strandfladen.

**Undertow:** Middelreturstrøm, ofte udadgående nær bunden under brændingszonen.


## 51. Flere veje til fundbart rav: primærlager, sekundærlager og genmobilisering

*Hvorfor RavRadar ikke må gøre den fulde stormkæde til en absolut sandhed.*

Den klassiske stormfortælling er vigtig, men ufuldstændig. Rav kan flyttes gennem gentagne korte cyklusser mellem strand, swashzone, revle, rende, tang og helt lavt vand. Derfor skelner modellen nu mellem et **primært lager**, der kræver egentlig frigivelse, og et **sekundært nærkystlager**, hvor rav allerede er hydrodynamisk tilgængeligt.

### 51.1 Primærlager

Rav er begravet, mekanisk låst eller ligger uden for almindelig bølge- og strømpåvirkning. Her er høj energi, erosion eller langvarig bundpåvirkning typisk nødvendig.

### 51.2 Sekundært nærkystlager

Rav er tidligere frigivet og ligger på en revle, i en rende, i tang, i et tidligere opskyl eller umiddelbart uden for brændingszonen. Backwash eller faldende vand kan have trukket det ud, uden at det er ført tilbage til et dybt lager.

### 51.3 Genmobilisering

Moderate bølger kan løfte eller rulle ravet, mens en indgående eller skrå strøm giver nettotransport. Vandstandsændring kan flytte den aktive kant. Hændelsen behøver ikke opfylde stormtærsklerne, men kræver stadig tilstedeværelse, bevægelse og gunstig transport/aflejring.

### 51.4 Aktiv implementering

Komponenten mobilisering/tilgængelighed har to spor:

- **Fresh-release:** historisk vind, historiske bølger, tid siden høj energi og eksponering.
- **Nearshore-remobilisation:** aktuelle bølger, strømstyrke, indkomponent, vandstandsændring og retention.

Det højeste spor bærer komponenten. Begge stærke samtidig giver en begrænset bonus. Den fulde kæde vægter dermed fortsat højest, men er ikke den eneste vej til en meningsfuld score.

Ekspertpunkt E-22: Vurder hvilke kombinationer af bølger, strøm, vandstandsændring og kystmorfologi der realistisk genmobiliserer rav fra sekundære nærkystlagre, og hvor længe sådanne lagre kan bestå.

Implementeret i: **js/core/score-engine.js** og **js/core/coastal-process-model.js**.


## Sproglig standard fra 4.0.69
Hele webhåndbogen er gennemgået med fast læsehjælp, forklaring af centrale fagord og en omskrevet ekspertarbejdsplan i almindeligt dansk. Ekspertens opgave beskrives nu med konkrete spørgsmål og eksempler frem for en teknisk matrix.


## 53. Sådan skal RavRadar forstå fejl, cache og manglende målinger

RavRadar skelner mellem tre forskellige situationer:

1. **En rigtig fejl:** En nødvendig fil mangler, Supabase afviser en skrivning, eller en central brugerfunktion virker ikke. Fejlen skal vises med den konkrete årsag.
2. **En advarsel:** Siden virker, men noget er langsomt eller bør undersøges. Det må ikke blandes sammen med en funktionsfejl.
3. **En forventet mellemtilstand:** Browseren bruger en verificeret cache, eller en DMI-observationskørsel springes bevidst over, fordi sidste kontrol stadig er ny nok. Det er ikke det samme som, at data aldrig har eksisteret.

For vandstandsstationer betyder det, at RavRadar viser separat, om stationen er kendt, hvornår den senest leverede en måling, om en prognosecache stadig er gyldig, og om stationen samlet set kan bruges. En kørsel uden ny observationshentning må aldrig omskrive en tidligere leverende station til “aldrig leveret”.

Den samlede funktionstest viser **fejl**, **advarsler** og **bestået** særskilt. En langsom ressource er en advarsel, mens en manglende kritisk fil er en fejl.
