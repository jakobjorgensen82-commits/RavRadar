# RavRadar – levende faglig og teknisk håndbog

**Håndbogsversion:** 4.0.60  
**Opdateret:** 1. august 2026  
**Status:** Levende dokument; kodepåstande er auditeret mod release 4.0.60, mens fysiske tærskler fortsat kræver ekspertvalidering.

## Sådan bruges håndbogen
Hvert kapitel beskriver først den faglige mekanisme, derefter den aktuelle implementering og til sidst de vigtigste usikkerheder. Ekspertpunkter med ID `E-xx` er den prioriterede valideringsliste. Håndbogen må ikke bruges som argument for, at en hypotese allerede er bevist.

## 1. Formål, målgruppe og fagligt løfte
RavRadar er et beslutningsstøttesystem til ravjagt langs danske kyster. Systemet samler prognoser, lokale kystdata, en forklarlig procesmodel og kontrollerbare ekspertregler. Det skal hjælpe med at vælge **sted og tidspunkt**, men må aldrig fremstille en høj score som et løfte om fund.

Håndbogen er skrevet til tre målgrupper: ejeren, eksterne rav-/sediment-/kysteksperter og fremtidige udviklere. En ekspert skal kunne læse dokumentet uden at kende koden og forstå både den faglige hypotese, de konkrete tærskler og hvor systemet er usikkert.

> **Fagligt løfte:** Alle væsentlige antagelser skal kunne spores til enten forskning, praktisk observation, projektbeslutning eller eksplicit hypotese. Systemets egne tærskler må aldrig præsenteres som naturkonstanter.

Håndbogen beskriver den aktive version. RDKS er autoritativt for bindende beslutninger, aktive krav og kendte åbne problemer. Koden er autoritativ for, hvad systemet faktisk beregner i den aktuelle release. Ved uoverensstemmelse skal uoverensstemmelsen registreres og rettes – ikke bortforklares.

## 2. Evidensklasser, kildekritik og usikkerhed
RavRadar bruger fire evidensklasser. De skal fremgå både i håndbogen og i regelmotoren, når en faglig påstand omsættes til scorelogik.

| Klasse | Betydning | Må bruges til | Må ikke bruges til |
|---|---|---|---|
| Dokumenteret viden | Understøttet af relevant forskning, officiel måling eller veletableret kystfysik | Procesforklaring, forsigtige generelle regler | Lokale numeriske tærskler uden lokal validering |
| Ekspertobservation | Gentagen praktisk erfaring fra kendt område og jagtform | Regelkladde, lokal prioritering, testhypotese | Automatisk landsdækkende regel |
| RavRadar-hypotese | Plausibel mekanisme eller arbejdsværdi | Simulering, eksperimentel regel, audit | Skjult produktionsregel uden markering |
| RavRadar-valideret | Understøttet af kontrollerede projektdata og hold-out-test | Modeljustering med versionshistorik | Universel naturvidenskabelig sandhed |

En kilde skal vurderes efter relevans, målemetode, skala og overførbarhed. Forskning i plastpartikler kan være nyttig som analogi, fordi visse plasttyper og rav har lav densitet og kan kobles til organisk opskyl, men plast og rav er ikke identiske. Form, størrelse, overflade, biofilm, vandmætning og bundkontakt kan ændre transporten væsentligt.

Når ekspertens udsagn strider mod nuværende kode, skal udsagnet registreres som en ændringshypotese. Først når mekanisme, geografi, betingelser, effekt og test er beskrevet, kan det blive en aktiv regel.

## 3. Ravets fysiske egenskaber og hvorfor densitet alene ikke er nok
Rav er fossil harpiks med en densitet, der typisk ligger tættere på havvand end mineraler som kvarts. Det betyder ikke, at alt rav flyder frit. Mange stykker synker i almindeligt havvand, men kræver mindre løfte- og transportkraft end sand, grus og sten af samme størrelse. Saltindhold, temperatur, luftlommer, porøsitet, indlejret materiale, størrelse og form påvirker den effektive opførsel.

Den relevante model er derfor ikke 'rav flyder' versus 'rav synker', men et kontinuum:

1. Rav kan ligge skjult og mekanisk låst i sand, grus, ler, tørv, tang eller revner.
2. Bølger og strøm kan løsne materialet og reducere bundkontakten.
3. Stykket kan rulle, hoppe, glide eller blive kortvarigt suspenderet.
4. Det kan transporteres sammen med let organisk materiale eller andre lavdensitetspartikler.
5. Når energien falder eller vandet trækker sig tilbage, kan det aflejres i en opskylslinje, lavning, revlebagkant, tangvold eller på en ny blotlagt kant.

Større og uregelmæssige stykker kan reagere anderledes end små flade stykker. RavRadar har i dag ingen partikelstørrelsesmodel. Scoren beskriver derfor et generelt potentiale for jagtbart rav, ikke transporten af en bestemt ravstørrelse.

> **Ekspertpunkt E-01:** Fastlæg hvilke ravstørrelser og -former de nuværende tærskler realistisk repræsenterer, og om der bør findes særskilte profiler for småt strandrav, mellemstort rav og større bundnære stykker.

## 4. Tilstedeværelse og kildelagre
En prognose kan kun være god, hvis der findes rav i eller opstrøms for det område, der aktiveres. RavRadar modellerer i øjeblikket ikke et fysisk lager af rav. Det betyder, at systemet vurderer **transport- og findeforhold**, men ikke kender den reelle mængde rav i sedimentet.

Mulige kildelagre omfatter eroderende geologiske lag, ældre strand- og klitaflejringer, undervandsrevler, lavninger med organisk materiale, tidligere stormdepoter, tangbælter og materiale transporteret langs kysten fra naboområder. En høj energihændelse kan åbne et lager; efterfølgende hændelser kan tømme det.

Gentagne høje scorer uden fund kan derfor skyldes lagerbegrænsning og ikke nødvendigvis fejl i strøm- eller bølgemodellen. Fremtidig læring bør skelne mellem 'forholdene var fysisk gunstige' og 'området leverede faktisk rav'.

> **Ekspertpunkt E-02:** Identificér kysttyper og områder, hvor geologisk ravtilstedeværelse er kendt, sandsynlig eller lav, og vurder om der kan bygges en langsomt skiftende kildelagerfaktor uden at skabe falsk sikkerhed.

## 5. Den samlede proceskæde
RavRadar bør forstås som en kæde. Et svagt led kan begrænse hele resultatet:

1. **Tilstedeværelse:** rav findes i et tilgængeligt lager.
2. **Frigivelse/mobilisering:** bølger, strøm eller erosion løsner rav og ledsagemateriale.
3. **Transport:** vandbevægelsen flytter materialet mod, langs eller væk fra den relevante kyst.
4. **Koncentration:** forskelle i densitet, form, bundfriktion og strømfelt sorterer materialet.
5. **Aflejring/retention:** faldende energi, kystgeometri, vegetation eller opskyl fastholder materialet.
6. **Eksponering:** vandstand og bølger gør aflejringen synlig eller tilgængelig.
7. **Jagtbarhed:** sigt, sikkerhed, bølgehøjde og adgang gør eftersøgning realistisk.

Den aktive RavScore har tre numeriske hovedkomponenter: jagtbarhed, transport og frigivelse. Tilstedeværelse og koncentration er endnu ikke selvstændige scoringskomponenter. De optræder kun indirekte gennem kystegenskaber, historik og ekspertregler. Det er en vigtig modelbegrænsning.

> **Modelkritik:** En lineær vægtet sum kan give en pæn score, selv om én nødvendig proces er meget svag. Offshore-caps reducerer denne risiko for transport, men modellen har endnu ikke generelle multiplicative gates for alle procesled.

## 6. Bølger, orbitalbevægelse, brydning og turbulens
Bølger påvirker rav på flere skalaer. På dybere vand giver bølgeorbitaler frem-og-tilbage-bevægelse nær bunden. Når bølgerne kommer ind på lavere vand, ændres orbitalerne, bølgerne stejler og bryder. Brydning skaber turbulens, undertow, setup og strømme i surfzonen. Disse processer kan løsne bundmateriale og gøre lette partikler mobile.

Bølger er derfor ikke kun en 'ind mod land'-mekanisme. Den enkelte orbitalbevægelse er oscillerende, og nettotransporten afhænger af bølgeasymmetri, strandhældning, strøm, undertow, Stokes drift, sedimentets respons og hvor i profilen partiklen befinder sig. RavRadar bruger ikke en fuld bølge-resolverende partikelmodel.

I den aktive frigivelsesscore giver historisk maksimal bølgehøjde mindst 1,5 m **+14 point**. I den separate procesindikator giver mindst 1,2 m 22 mobiliseringspoint og mindst 2,0 m 35. Disse tærskler er arbejdsværdier – ikke validerede danske ravgrænser.

Samtidig reducerer store bølger jagtbarheden. For waders giver bølger over 0,7 m et fradrag på 25 point i jagtbarhed, mens bølger på højst 0,3 m giver +12. For strandjagt giver bølger over 2,5 m -12. Det afspejler, at høj fysisk energi kan være positiv for mobilisering og negativ for sikker eftersøgning på samme tidspunkt.

> **Ekspertpunkt E-03:** Valider om bølgehøjde alene er tilstrækkelig, eller om periode, retning, bølgeenergiflux, brydningsindeks og varighed bør indgå.

## 7. Strøm: retning, hastighed og bundnær transport
Strømdata i RavRadar tolkes oceanografisk som den retning, vandet bevæger sig **mod**. Vindretning tolkes meteorologisk som den retning, vinden kommer **fra**. En 180°-fejl i strømkonventionen kan få udtransport til at ligne indtransport og er derfor en kritisk regression.

Strømmen vurderes mod zonens lokale `onshoreDirectionDeg` eller mod flere retningankre for bugtede kyster. Retningsforskellen omsættes i den aktive score til en alignment:

| Retningsforskel | Alignment | Fortolkning | Retningsbidrag |
|---|---:|---|---:|
| 0–25° | 1,00 | stærkt mod land | +30 |
| 26–55° | 0,65 | delvist mod land | ca. +20 |
| 56–90° | 0,20 | skråt/langskyst med mindre indkomponent | +6 |
| 91–130° | -0,35 | overvejende væk | ca. -11 |
| 131–180° | -0,80 | kraftigt væk | -24 |

Strømhastighed mellem 0,15 og 0,65 m/s giver +18 i transportscoren. Over 0,65 m/s giver kun +5, fordi stærk strøm kan være effektiv, men mere uforudsigelig. Under 0,15 m/s giver -12. Hvis strømdata mangler, begrænses transportscoren til højst 52.

Ved strøm mindst 0,15 m/s og alignment højst -0,75 sættes transportloft 28. Ved alignment højst -0,35 sættes loft 42. Det er en vigtig sikkerhedsregel mod den tidligere fejl, hvor en zone kunne blive grøn, selv om strømmen pegede væk fra land.

Modeldata repræsenterer ikke nødvendigvis præcis den bundnære strøm, som et ravstykke oplever i surfzonen. Lodret shear, bølgestrøm, revler, render og lokale hvirvler kan afvige fra modellens gridcelle.

> **Ekspertpunkt E-04:** Valider hastighedsintervallet 0,15–0,65 m/s, retningstrinnene og offshore-lofterne for forskellige kysttyper og vanddybder.

## 8. Vindens direkte og indirekte rolle
Vind påvirker ravtransport indirekte ved at skabe bølger, ændre vandstand og drive overfladelag og organisk opskyl. Den kan også flytte allerede strandet tørt let materiale på stranden. Men vindretningen alene beskriver ikke den bundnære transport.

RavRadar omregner vind 'fra'-retningen til en bevægelsesretning ved at lægge 180°. Hvis denne retning ligger inden for 55° af lokal pålandsretning, får transportscoren +6. Hvis den ligger mere end 90° væk, gives -2. Vindens direkte transportbidrag er med vilje mindre end strømmens.

I frigivelsesscoren bruges historisk maksimal vind over 24 timer: mindst 14 m/s giver +35, 9–13,99 m/s giver +18 og lavere vind +4. Dette er en grov energiproxy. Varighed, fetch, retning og bølgeopbygning indgår ikke direkte.

Brugerens erfaring fra den nordjyske østkyst – at fralandsvind ofte kan give gode jagtforhold – viser netop, hvorfor vindretning ikke må behandles som en universel indtransportregel. Fralandsvind kan give roligere kystvand samtidig med, at tidligere bølger eller lokal strøm fortsat har flyttet materiale.

> **Ekspertpunkt E-05:** Beskriv hvilke situationer hvor fralandsvind forbedrer jagtbarhed uden at stoppe bundnær indtransport, og hvor længe den mekanisme realistisk kan bestå.

## 9. Vandstand, setup, tidevand og den aktive kystzone
Vandstand er ikke blot et antal centimeter. Den flytter brydningszonen, oversvømmer eller blotlægger revler og tanglinjer, ændrer hvilke render der er aktive og bestemmer hvor bølgerne afleverer materiale.

Den aktive transportscore bruger ændringen over tre timer. Stigning på mindst 8 cm giver +8. Fald på mindst 8 cm giver +3. Næsten stabilt niveau under 2 cm ændring giver -4. Logikken antager, at stigende vand kan føre let materiale ind over lavt vand, mens faldende vand kan samle eller eksponere materiale ved nye kanter.

Vadehavet kræver særbehandling. Store sekventielle ændringer kan være ægte tidevand og må ikke automatisk udglattes. Et mønster, der skifter unaturligt mellem datakilder time for time, er derimod en dataintegritetsfejl.

Aktuel observation og prognose er forskellige produkter. Observationen kan bruges til 'nu' og modelkontrol; prognosen bruges til fremtid. Cache kan være gyldig, selv om en ny observation midlertidigt mangler.

> **Ekspertpunkt E-06:** Valider om absolut vandstand, ændringshastighed, forudgående maksimum/minimum og lokal referencehøjde bør indgå særskilt.

## 10. Langs- og tværkysttransport
Bølger, der rammer kysten skråt, kan skabe en langskyst strøm og transportere materiale parallelt med stranden. Rav kan derfor komme fra en nabozone, selv når den lokale strøm ikke peger direkte mod land. Odder, bugter, havne, revler og indløb kan ændre eller afbryde transportvejen.

Den aktive RavScore giver et mindre positivt retningsbidrag ved 56–90° forskel til pålandsretningen. Det er en grov repræsentation af skrå/langskyst transport, ikke en fuld beregning af transportkonvergens.

Et fagligt bedre system bør skelne mellem: (a) lokal indtransport, (b) langskyst tilførsel, (c) konvergens hvor transporten bremser eller mødes, og (d) bypass hvor materialet fortsætter forbi zonen.

> **Ekspertpunkt E-07:** Udpeg zoner hvor langskyst transport sandsynligvis er vigtigere end direkte tværkysttransport, og hvilke nabozoner der bør forbindes i et transportnetværk.

## 11. Undertow, returstrøm og ripstrømme
Når bølger fører vand ind i surfzonen, skal vandmassen returnere. Returtransport kan foregå som undertow, feeder currents og ripstrømme. Det betyder, at store indkommende bølger ikke automatisk giver netto indtransport af alle partikler.

Et ravstykke kan påvirkes af indgående swash i den øvre strandzone, men af udadgående returstrøm nær bunden længere ude. Nettoretningen afhænger af, hvornår stykket er suspenderet, hvor højt i vandsøjlen det befinder sig, og hvor hurtigt det aflejres.

RavRadar har i dag ingen eksplicit undertow- eller ripstrømsmodel. Offshore-caps på den modellerede strøm er den vigtigste beskyttelse mod at overvurdere en situation, men lokale surfzoneprocesser kan stadig afvige.

> **Ekspertpunkt E-08:** Vurder om kombinationen høj bølgeenergi + modelleret udadgående strøm bør give særskilt faseafhængig logik i stedet for et enkelt transportloft.

## 12. Hydrodynamisk sortering og ledsagematerialer
Kysttransport sorterer materiale efter mere end densitet. Størrelse, form, ruhed, løfteareal, bundfriktion og synkehastighed påvirker, hvornår en partikel mobiliseres og aflejres. Rav kan derfor koncentreres sammen med tang, træ, frø, kul, skum, skaller eller bestemte grusfraktioner uden at alle disse materialer følger præcis samme bane.

En frisk tanglinje kan være et nyttigt felttegn, fordi let organisk materiale og rav kan være transporteret og strandet under samme hændelse. Men tang kan også være flyttet uden rav, være gammel, omlejret af vind eller komme fra et andet lag i vandsøjlen.

RavRadar giver i dag kun statiske bonusser for tang/ålegræs, rev og lavt vand – og kun når strømmen allerede har mindst en svag indkomponent. Det forhindrer en statisk egenskab i at skabe en falsk transportsituation.

> **Ekspertpunkt E-09:** Rangér ledsagematerialer efter deres værdi som indikator og beskriv, hvornår de er tegn på frisk aflejring versus gammel omlejring.

## 13. Tang, ålegræs og vegetation som transportør og fælde
Vegetation påvirker rav på mindst fire måder: flydende tang kan transportere eller samle små stykker; nedsunkne tangbælter kan lagre rav; vegetation reducerer lokal strøm og fremmer aflejring; og en ny storm kan genmobilisere tidligere lagret materiale.

Forskning i retention af lavdensitetspartikler i marine vegetationskanopier støtter mekanismen som analogi, men RavRadar har ingen måling af vegetationens tæthed, sæson eller tilstand. Feltet `seagrass` er statisk og groft.

I aktiv transportscore gives +3 for tang/ålegræs, når strøm-alignment er mindst 0,20. I procesindikatoren giver vegetation 12 retentionpoint. Disse to tal er arbejdsværdier og kan dobbeltrepræsentere samme mekanisme i forklaringen, selv om kun transportscoren påvirker RavScore direkte.

> **Ekspertpunkt E-10:** Beskriv sæson-, dybde- og stormafhængig retention i tang/ålegræs og om statisk zoneflag bør erstattes af dynamisk observation.

## 14. Kystmorfologi, revler, render, odder og menneskeskabte strukturer
Kystformen bestemmer, hvordan bølger bryder, hvor strømmen accelererer, og hvor materiale kan aflejres. Revler kan beskytte en indre zone, skabe kanaler og flytte brydningslinjen. Render kan fokusere udadgående strøm. Odder kan skabe læ, konvergens eller bypass. Havne og høfder kan afbryde langskyst transport og skabe ophobning på den ene side og underskud på den anden.

RavRadar klassificerer heuristisk vestkyst, østkyst, fjordsystemer, odder, rev, lavt vand, vegetation og flere kystretninger. Klassifikationen er ikke en detaljeret morfodynamisk model.

Aktive statiske transportbonusser er +4 for lavt vand, +3 for rev og +3 for vegetation – kun ved indgående/skrår indtransport. Frigivelsesscoren giver +5 til `coastType === west`. Procesindikatoren giver yderligere retentionpoint, men påvirker ikke den numeriske RavScore direkte.

> **Ekspertpunkt E-11:** Auditér om de statiske zoneegenskaber er korrekt registreret, og om de bør påvirke transport, frigivelse, retention eller kun forklaring.

## 15. Storm, efterstorm og tidslig persistens
Ravjagt efter en storm kan være bedre end under stormens maksimum. Høj energi kan først frigøre materiale; derefter kan fortsat strøm transportere det; til sidst kan faldende energi og vandstand gøre det synligt og jagtbart.

Den aktive frigivelsesscore starter på 22. Historisk vind og bølger kan hæve den. Hvis der er gået 3–18 timer siden høj energi, gives +12. Mere end 48 timer giver -8. Den separate procesindikator klassificerer under 3 timer som højenergifase, 3–18 timer som efterstorm/transportfase, 18–48 timer som aflejringsfase og senere som sen efterfase.

Der er ikke i dag en aktiv landsdækkende persistence-regel i `rules/national-rules.json` eller `rules/local-rules.json`. Den eneste skabelon ligger som inaktiv hypotese. Det er vigtigt: håndbogen beskriver en plausibel proces, men systemet fastholder ikke automatisk høje scorer i et bestemt antal timer ud over den indbyggede frigivelseshistorik.

> **Ekspertpunkt E-12:** Fastlæg hændelsesfaser for forskellige kysttyper og hvilke betingelser der afbryder persistens – eksempelvis stærk udstrømning, ny stormretning eller meget lav vandstand.

## 16. Aflejring, opskylslinjer og genmobilisering
Aflejring sker, når transportkapaciteten falder eller partiklen møder en fælde. Det kan være ved swashgrænsen, bag en revle, i en tanglinje, i læ af en odde, ved en strandvold eller i en lavning. Flere opskylslinjer kan repræsentere forskellige vandstande og hændelser.

Efter aflejring kan rav flyttes igen af næste bølge, faldende vand, vind på stranden, fodtrafik eller ny storm. En synlig tanglinje er derfor et øjebliksbillede af en dynamisk proces.

RavRadar modellerer ikke eksplicit strandingsposition eller sandsynlig højde på stranden. Vandstandsændring og jagtform bruges som indirekte signaler.

> **Ekspertpunkt E-13:** Beskriv hvilke kombinationer af faldende vand, bølgeaftagning og kystprofil der bedst forudsiger synlige opskylslinjer.

## 17. Jagtbarhed, sigt og sikkerhed
Jagtbarhed er den højst vægtede komponent i den aktive score (40 %). Den skal afspejle, om brugeren realistisk kan se og nå ravet. RavRadar har to jagtformer: `waders` og `beach`.

For waders starter jagtbarhed på 60. Vind højst 3 m/s giver +28; 3–6 m/s +8; 6–8 m/s -35; over 8 m/s -60. Bølger højst 0,3 m giver +12, mens over 0,7 m giver -25. For strandjagt giver vind højst 8 m/s +15, 8–13 m/s +5 og over 13 m/s -25; bølger over 2,5 m giver -12.

Disse tærskler er hovedsageligt sikkerheds- og observationsarbejdsværdier. Lokal bund, mørke, strømstyrke, temperatur, is, adgang og brugerens erfaring indgår ikke fuldt. Appen må ikke erstatte egen sikkerhedsvurdering.

> **Ekspertpunkt E-14:** Valider wadersgrænserne for forskellige kyster og vurder om strøm, temperatur og bølgeperiode skal kunne blokere anbefalingen helt.

## 18. Præcis implementering i RavScore 4.0.60
Den aktive beregning findes i `js/core/score-engine.js`. Den gamle rod-fil `ravscore.js` er historisk/sekundær og må ikke bruges som beskrivelse af den aktive app uden at bekræfte importkæden.

### 18.1 Hovedformel
`rå score = jagtbarhed × 0,40 + transport × 0,35 + frigivelse × 0,25`

Vægtene kan ændres af den godkendte adaptive model, men normaliseres altid til 1,0. Hver vægt begrænses til 0,05–0,80. Derefter lægges et adaptivt justeringsled på -25 til +25. Til sidst anvendes aktive ekspertregler.

### 18.2 Niveauer
| Score | Visning |
|---:|---|
| 90–100 | God + exceptionel markering |
| 75–89 | God |
| 55–74 | Middel |
| 35–54 | Svag |
| 0–34 | Dårlig |

### 18.3 Transportberegning
Transport starter på 34. Strømhastighed, strømretning, vindretning og tre-timers vandstandstrend tilføjes. Statiske kystegenskaber kan kun tilføjes ved alignment mindst 0,20. Derefter anvendes manglende-data- og offshore-caps.

### 18.4 Frigivelsesberegning
Frigivelse starter på 22. Maksimal vind over 24 timer, maksimal bølge over 24 timer, tid siden høj energi og vestkystflag påvirker resultatet.

### 18.5 Regelrækkefølge
Regelmotoren sorterer aktive regler efter prioritet. `gate` kan blokere anbefaling; `override` kan sætte en bestemt score; `bonus`, `penalty` og `persistence` summerer point. Slutresultatet begrænses til 0–100.

### 18.6 Forklarbarhed
Resultatet indeholder råvejr, historik, zonegeometri, delscorer, vægte, bidrag, retningankre, caps, adaptive matches, regelmatches, baseScore og finalScore. Debugsporet er nødvendigt for faglig audit.

> **Kendt begrænsning:** Procesindikatoren `transportEvent.index` vises som forklaring, men indgår ikke direkte i RavScore. Det kan forvirre, hvis indikator og score peger forskelligt.

## 19. Procesindikatoren for hændelsesfase
`js/core/coastal-process-model.js` beregner en hændelsesindikator med mobilisering 45 %, timing 25 %, fortsættelse 20 % og retention 10 %. Den klassificerer kysten heuristisk og giver en fasebeskrivelse.

Indikatoren kan være fagligt nyttig, fordi den gør hændelsesforløbet synligt. Men den påvirker i dag ikke scoretallet. En ekspert kan derfor se høj mobilisering og samtidig en lav score, hvis jagtbarhed eller transport er dårlig.

Fremtidig ændring skal vælge én af tre retninger: (a) indikator forbliver ren forklaring, (b) indikator bliver en kontrolleret gate/bonus, eller (c) hovedscoren ombygges til en egentlig procesmodel. Den må ikke snige sig ind som skjult dobbeltvægtning.

## 20. Retningskonventioner, kystankre og geometrisk audit
Vind er 'fra'; strøm er 'mod'; `onshoreDirectionDeg` er retningen fra hav mod land. UI-pile, rå komponentvektorer og scoreretning skal testes som én kæde.

Bugtede zoner kan have flere retningankre. Systemet vælger den mindst offshore / mest gunstige relevante kystdel og dokumenterer valgmetoden. Det er en pragmatisk løsning, men kan overvurdere en stor zone, hvis kun en lille kystdel rammes gunstigt.

Land- og havpunkter, kystlinje, ankre og `onshoreDirectionDeg` skal auditeres visuelt. Als Odde og Helberskov nord for Mariager Fjord er en fast regressionskontrol.

> **Ekspertpunkt E-15:** Vurder om flere kystankre skal vægtes efter kystlængde, eksponering og transportforbindelse i stedet for at vælge bedste alignment.

## 21. Fra faglig viden til aktive regler
En ekspertregel skal indeholde: påstand, mekanisme, geografi, jagtform, målbare betingelser, tidsvindue, effekt, evidensklasse, tillid, kilde, testeksempler, modbeviser og rollbackplan.

Arbejdsgangen er:

1. Registrér rå observation som viden – uden scoreeffekt.
2. Formulér en testbar hypotese.
3. Opret regelkladde med konkret geografi og betingelser.
4. Simulér positive, negative og grænsetilfælde.
5. Kontrollér konflikter og maksimal samlet effekt.
6. Aktivér kun med relevant rettighed og versionshistorik.
7. Evaluer mod nye fund og nul-fund.
8. Tilbagetræk eller justér ved manglende effekt.

Fri tekst-assistenten må kun oprette kladder. Den må ikke aktivere regler. En regel uden geografi, med ekstrem effekt eller med betingelser der altid er sande skal give advarsel.

Der er aktuelt ingen aktive nationale eller lokale fagregler i JSON-filerne. Det betyder, at eksperten starter med at validere basismodellen og derefter kan opbygge et kontrolleret regelsæt.

## 22. Hvordan ekspertudsagn og feltdata skal testes
En god test skal på forhånd definere hvad der forventes. Eksempel: 'Efter mindst 12 timer med bølger over X og derefter 3–12 timer med strøm mod land, stiger fundraten i zonegruppe Y sammenlignet med tilsvarende perioder uden indgående strøm.'

Testdata skal indeholde både fund og nul-fund, jagtindsats, tidspunkt, zone, jagtform, vejrsnapshot, modelversion og eventuelle lokale observationer. Uden indsats kan et nul-fund ikke fortolkes sikkert.

Data bør opdeles i udvikling og hold-out. En regel må ikke vurderes på de samme observationer, som blev brugt til at opfinde den. Små datasæt skal rapporteres med stor usikkerhed.

Før en scoreændring bør man kontrollere kalibrering, rangering mellem zoner, falske toppe, geografisk bias og om forbedringen kun skyldes sæson eller brugeradfærd.

## 23. Datakilder, forecastintegritet og tidsserier
DMI er autoritativ dansk kilde, når data er tilgængelige og brugbare. Open-Meteo og andre kilder er fallback. Fallback skal være komponentvis og transparent.

Vind, bølger, strøm, vandstand og temperatur behandles som separate tidsserier. De filtreres før interpolation og canonicaliseres til faste UTC-timer. Kildeskift DMI → fallback → DMI time for time er forbudt, fordi det kan skabe kunstige spring.

En horisont på cirka 118–119 sammenhængende timer er acceptabel. Det er bedre end at gentage sidste værdi for at ramme 120.

Hver scoreforklaring bør vise datakilde, modelkørsel, forecasttid, alder, fallback og mangler. Dataældre end friskhedsgrænsen må ikke vises som aktuelle.

## 24. DMI-vandstandsstationer, observationer og cachelivscyklus
En station har mindst tre statuslag:

1. **Registerstatus:** kendt, aktiv, historisk/inaktiv eller ukendt i DMI-registeret.
2. **Observationsstatus:** seneste måling, leverer nu, midlertidigt tavs eller aldrig observeret.
3. **Prognose-/cachestatus:** gyldig prognosecache, gyldig til, udløbet eller mangler.

Samlet anvendelighed må ikke sættes til falsk, blot fordi en ny observation mangler. Hvis gyldig prognosecache findes, kan stationen fortsat anvendes til prognosen. Friske observationer har forrang; cache må kun bruges til dokumenteret udløb.

Stationsregisteret er persistent. Opdagede stationer fjernes ikke ved en tom kørsel. Admin viser automatisk primær/sekundær station, afstand, vægt, valgmetode og eventuel override.

Historiske/inaktive stationer skal være tydeligt markeret og må normalt ikke vælges uden advarsel. Hele registeret skal periodisk sammenholdes med DMI's officielle liste.

## 25. Brugerfeedback, adaptiv model og AI
Feedback gemmer et uforanderligt vejrsnapshot, score, modelversion, zone, jagtform og resultat. Både fund og nul-fund er nødvendige. Persondata og samtykke skal håndteres separat.

Den adaptive model kan ændre hovedvægte, global justering, zonejusteringer og metrikjusteringer. Forslag skal godkendes manuelt. Ændringer versionsstyres og kan rulles tilbage.

AI må strukturere fri tekst, forklare score, finde mønstre og foreslå hypoteser. AI må ikke selv aktivere regler eller ændre produktionsmodellen. En AI-konklusion er ikke faglig evidens.

## 26. Administration, Supabase og ekspertrettigheder
GitHub Pages kan udlevere den statiske admin-skal, men uden gyldig Supabase-session og rettigheder må den ikke vise eller hente beskyttede data. Sikkerheden ligger i Supabase JWT/secret-serverflow og Row Level Security – ikke i at skjule et link.

Håndbogen er et beskyttet admin-dokument. Eksperten skal have `admin_access` og den særskilte rettighed `handbook_view`. Indsendelse af faglige kommentarer kræver `handbook_review`.

Læsning, redigering, publicering, rå diagnostik, systemadministration og ekspertadministration er adskilte rettigheder. Ejerrollen har fuld adgang. Service role / `sb_secret` må kun findes som GitHub Secret og aldrig i browserkode eller ZIP.

## 27. Diagnostik, sundhed og faglig audit
RavRadar skelner mellem brugerprognosens komplethed, DMI-dækning, acquisition, konvertering, horisont, observationer, cache og fallback. En grøn brugerprognose kan eksistere samtidig med degraderet DMI-status.

Runtime-diagnostik, stationaudit, cacheaudit og implementeringsaudit er beskyttede admindokumenter. De må ikke ligge som offentlige JSON-adresser.

En faglig scoreaudit skal kunne følge: rå komponenter → enheder → retning → lokal geometri → delscore → caps → adaptiv justering → regeljustering → slutscore.

## 28. Release Governance og RDKS-gate
En version er ikke installationsklar, før præcis det pakkede indhold har bestået hele valideringen og Release Gate. Kodegennemgang alene er ikke nok.

Obligatorisk rækkefølge:

1. Brug seneste uploadede projekt som eneste arbejdskilde.
2. Kortlæg samtaledelta, aktive RDKS-krav og nuværende implementering.
3. Opdater kode, håndbog, RDKS, changelog og versionsfelter samlet.
4. Kør generatorer i samme rækkefølge som GitHub Actions.
5. Kør hele `npm run validate`.
6. Kør `npm run release:gate`.
7. Byg ZIP med `npm run release:package`.
8. Auditér ZIP for `.git`, secrets, caches og manglende workflowfiler.
9. Efter push: verificér den faktiske GitHub Actions-kørsel som grøn.
10. Ved fejl: gennemgå hele den resterende pipeline samlet; undgå manuelle lapninger én fejl ad gangen.

GitHub Secrets og Supabase-installation bevares uden for ZIP. En ny ZIP må ikke kræve genoprettelse af eksisterende secrets, medmindre en bevidst nøglemigration er dokumenteret.

## 29. Overgang til ravradar.dk
Brugerne skal besøge `ravradar.dk`, selv hvis GitHub Pages fortsat hoster frontend. Projektet skal derfor bruge relative appstier, korrekt manifest og service worker, og undgå hardcodede GitHub Pages-adresser.

Før domænet aktiveres skal DNS, GitHub Pages custom domain, HTTPS, `www`-strategi, Supabase Site URL og redirect-URLs være afklaret. Admin- og loginflow skal testes på både primært domæne og valgt redirectdomæne.

`CNAME` må først tilføjes, når DNS og Supabase redirects er klar. Ellers kan login eller deployment låses i en halvkonfigureret tilstand.

## 30. Ekspertens valideringsmatrix
| ID | Emne | Nuværende antagelse | Højeste værdi af ekspertinput |
|---|---|---|---|
| E-01 | Ravstørrelse/form | Én generel partikelprofil | Størrelsesafhængige transportregimer |
| E-02 | Kildelagre | Ikke modelleret | Geologisk/geomorfologisk lagerkort |
| E-03 | Bølgeenergi | Højde som proxy | Periode, retning, varighed og brydning |
| E-04 | Strøm | 0,15–0,65 m/s gunstigt | Bundnære tærskler pr. kysttype |
| E-05 | Vind | Lille direkte transporteffekt | Fralandsvind og efterstormmekanismer |
| E-06 | Vandstand | 3-timers trend | Absolut niveau og lokale referencer |
| E-07 | Langskyst | Indirekte i alignment | Transportnet mellem nabozoner |
| E-08 | Undertow/rip | Ikke eksplicit | Faseafhængig offshorelogik |
| E-09 | Ledsagemateriale | Kvalitativt | Indikatorhierarki og friskhed |
| E-10 | Vegetation | Statisk zoneflag | Sæson og dynamisk retention |
| E-11 | Kystmorfologi | Grove statiske flags | Lokale fælder, bypass og render |
| E-12 | Persistens | 3–18 timer bonus | Kystspecifik fase og afbrydelse |
| E-13 | Aflejring | Ikke lokaliseret | Opskylshøjde og timing |
| E-14 | Sikkerhed | Generelle grænser | Kyst-/mode-specifik gate |
| E-15 | Flere ankre | Bedste alignment vælges | Areal-/længde-/eksponeringsvægtning |

Eksperten bør kommentere hvert punkt med: enig/uenig, begrundelse, geografisk rækkevidde, foreslåede målelige betingelser, forventet effekt og hvilke observationer der kan modbevise påstanden.

## 31. Gennemregnede faglige scenarier
### Scenario A – stærk indgående strøm efter storm, roligt nu
Historisk vind 15 m/s og bølger 1,8 m giver høj frigivelse. Strøm 0,3 m/s næsten mod land giver høj transport. Vind og bølger er nu lave, så waders-jagtbarhed er høj. Dette er den type situation, modellen er bygget til at rangere højt.

### Scenario B – stor storm nu, strøm væk fra land
Frigivelse kan være høj, men waders-jagtbarhed falder kraftigt. Ved stærk offshore-strøm sættes transportloft 28. Slutscoren bør ikke blive grøn alene på stormenergi.

### Scenario C – roligt vejr uden nylig energi
Jagtbarhed kan være meget høj, men transport og frigivelse er moderate/lave. Scoren bør være middel eller svag. Der kan stadig findes gammelt rav; modellen vurderer ikke lageret.

### Scenario D – skrå/langskyst strøm ved odde
Alignment kan give et mindre positivt bidrag. Hvis transporten faktisk konvergerer i læsiden, kan modellen undervurdere zonen; hvis materialet bypasser odden, kan den overvurdere den. Dette kræver lokal ekspertregel eller forbedret netværksmodel.

### Scenario E – gammel browsercache
Data ældre end friskhedsgrænsen må ikke vises som aktuelle. Siden skal hente friske data eller vise tydelig utilgængelighed. Gamle scores må ikke stå som om de er nuværende.

## 32. Faglige hovedkilder, analogier og læsevej
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
- **Alignment:** matematisk mål for hvor godt en bevægelsesretning passer med lokal pålandsretning.
- **Canonical UTC-time:** fast time uden minutforskydning, brugt ved merge.
- **Cap/loft:** maksimal tilladt delscore ved en begrænsende tilstand.
- **Fallback:** sekundær datakilde ved manglende/ugyldig primær kilde.
- **Frigivelse:** mobilisering fra bund, sediment, vegetation eller depot.
- **Jagtbarhed:** sikker og praktisk mulighed for at finde rav.
- **OnshoreDirectionDeg:** lokal retning fra hav mod land.
- **Observation:** faktisk måling.
- **Prognose:** modelberegnet fremtidig værdi.
- **Cache:** tidligere hentet data, som stadig er dokumenteret gyldig.
- **Retention:** midlertidig eller længerevarende fastholdelse.
- **RDKS:** RavRadar Decision & Knowledge System.
- **Swash:** området der gentagne gange overskylles og tørlægges af bølgeopskyl.
- **Undertow:** nettoudadgående returstrøm under bølger i surfzonen.
- **Override:** administratorens bevidste erstatning af automatik.
- **Regression:** tidligere løst fejl, som vender tilbage.


## Versions- og sporbarhedsnotat
Denne håndbog er genereret og auditeret sammen med RavRadar 4.0.60. De konkrete kodekonstanter er aflæst fra `js/core/score-engine.js`, `js/core/coastal-process-model.js`, `js/core/direction-anchors.js`, `js/core/rule-engine.js`, `js/core/adaptive-model.js`, `knowledge/*.json` og `rules/*.json`. Ved senere ændringer skal håndbog, RDKS og kode opdateres i samme release.
