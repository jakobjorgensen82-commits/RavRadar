# RavRadar-håndbogen

**Håndbogsversion:** 4.0.58

**Opdateret:** 1. august 2026

Denne fil er Markdown-spejlet af den adgangsbeskyttede håndbog i Supabase. Webversionen genereres fra `docs/handbook/content.json`.


## 1. Formål, målgruppe og fagligt løfte

_Hvad RavRadar er, hvem håndbogen er skrevet til, og hvilke påstande systemet ikke må fremsætte._

RavRadar er et beslutningsstøttesystem til ravjagt langs danske kyster. Det kombinerer prognoser, lokale kystdata, en forklarlig procesmodel og kontrollerbare ekspertregler. Systemet kan prioritere steder og tidspunkter, men kan aldrig love et fund.

Håndbogen er skrevet til ejeren, eksterne rav- og kysteksperter samt fremtidige udviklere. Den skal gøre det muligt at efterprøve både den faglige antagelse og den konkrete kodevirkning.

Grundregel: En høj RavScore betyder, at de målte og modellerede forhold passer bedre til RavRadars nuværende hypotese. Den betyder ikke, at rav med sikkerhed er til stede eller synligt.


## 2. Evidensklasser og usikkerhed

_Sådan skelnes der mellem forskning, erfaring, hypotese og valideret RavRadar-viden._

Alle faglige udsagn bør placeres i én af fire klasser:

KlasseBetydningHvordan den må bruges

DokumenteretUnderstøttet af faglitteratur eller officielle kilder.Kan indgå som generelt princip, men lokale tærskler kræver stadig validering.

ObserveretGentagne erfaringer fra ravjægere eller feltobservationer.Kan oprettes som ekspertregel med tydelig kilde og usikkerhed.

HypoteseFagligt plausibel, men endnu ikke dokumenteret for RavRadar.Må ikke aktiveres direkte som stærk produktionsregel.

Valideret i RavRadarTestet mod tilstrækkelige, versionsbundne observationer.Kan vægtes højere, men skal fortsat kunne tilbagerulles.

Hvor litteraturen omhandler mikroplast, drivgods eller almindeligt sediment, bruges den kun som analogi. Rav har egne egenskaber og er ikke en neutral vandpartikel.


## 3. Ravets fysiske egenskaber

_Hvorfor rav kan være bundnært, midlertidigt suspenderet eller koblet til let organisk materiale._

Baltisk rav har typisk en massefylde tæt på, men oftest lidt højere end, naturligt brak- og havvand. Variationer i porøsitet, indeslutninger, forvitring, form og størrelse betyder, at stykker ikke reagerer ens. Almindeligt rav synker derfor normalt i Østersøens og de danske farvandes vand, men kræver langt mindre løft og turbulens end mineralske partikler med samme størrelse.

Det er afgørende at skelne mellem positiv opdrift og lav effektiv synkehastighed. Rav kan transporteres med bundnære hvirvler, bølgeorbitaler og strøm, selv om det ikke flyder permanent i overfladen. Stykker kan også blive fanget i tang, ålegræs, træstykker og andet opskyl, hvilket ændrer den samlede pakkes opdrift, ruhed og strandingsadfærd.

- Små, flade og porøse stykker forventes lettere mobiliseret end store, kompakte stykker.
- Form og orientering kan påvirke drag, løft, rullebevægelse og strandingschance.
- Rav kan sorteres sammen med let organisk materiale uden at være fysisk identisk med det.


## 4. Den samlede ravproces

_RavRadar opdeler chancen i tilstedeværelse, frigivelse, transport, koncentration, aflejring og jagtbarhed._

- Tilstedeværelse: Rav skal findes i eller opstrøms for det aktive sediment- og opskylssystem.
- Frigivelse/mobilisering: Bølger, strøm eller erosion skal løsne materialet fra bund, brink, tang eller ældre aflejring.
- Transport: Materialet skal flyttes mod eller langs den relevante kyst.
- Koncentration: Hydrodynamisk sortering, tanglinjer, rev, render, odder eller læzoner kan samle materialet.
- Aflejring/stranding: Energiniveau, vandstand og timing skal føre materialet ind i en zone, hvor det bliver liggende.
- Tilgængelighed: Ravet skal kunne ses og findes sikkert med den valgte jagtform.

En statisk kystegenskab kan ikke alene skabe høj sandsynlighed. Den kan højst forstærke en aktiv transport- eller aflejringsproces.


## 5. Bølger, turbulens og mobilisering

_Hvordan bølger både kan frigøre rav og forringe jagtbarheden._

Bølger skaber oscillerende bevægelse helt ned mod bunden, når vanddybden er lille nok i forhold til bølgelængden. Nær brændingszonen tilføjes turbulens, undertow, bølgeinducerede strømme og hurtige skift mellem acceleration og afbremsning. Det kan løsne lavdensitetsmateriale, flytte tangbælter og omarbejde de øverste sedimentlag.

Den samme høje energi, som mobiliserer materiale, kan gøre det umuligt at se eller sikkert opsamle rav. Derfor er RavRadars faglige arbejdshypotese ofte en todelt sekvens: først høj energi, derefter en roligere transport- eller aflejringsfase.

Den nuværende frigivelsesmodel giver ekstra potentiale ved historiske bølger på mindst 1,5 m og ved kraftig vind. Tærsklerne er foreløbige modelparametre, ikke universelle naturkonstanter.


## 6. Strøm: retning, hastighed og bundnær transport

_Hvorfor strømretningen skal tolkes som bevægelse mod, langs eller væk fra den lokale kyst._

Strøm er RavRadars vigtigste direkte transportindikator. Oceanografisk strømretning angiver, hvor vandet bevæger sig hen. Den sammenlignes med zonens lokale retning fra hav mod land.

Den nuværende model belønner omtrent 0,15–0,65 m/s som et foreløbigt brugbart interval. Svagere strøm vurderes som begrænset transport; stærkere strøm kan mobilisere meget, men bliver mindre forudsigelig. Intervallet skal ekspertvalideres efter kysttype og vanddybde.

En kraftig strøm væk fra land udløser et hårdt loft over transportscoren. Det er bevidst: andre positive signaler må ikke skjule, at den aktuelle nettotransport går den forkerte vej. Ved bugtede kyster bruges flere retningsankre, så én grov retning ikke repræsenterer hele zonen.

Vigtig begrænsning: DMI-modellens strømværdi er ikke nødvendigvis identisk med den helt bundnære strøm i surfzonen. RavRadar bruger den som bedste tilgængelige indikator og skal vise denne usikkerhed.


## 7. Vindens indirekte rolle

_Vind kan drive overfladevand og bølger, men må ikke forveksles med lokal bundstrøm._

Meteorologisk vindretning angiver, hvor vinden kommer fra. RavRadar omregner den til bevægelsesretning, før den sammenlignes med pålandsretningen.

Vind kan påvirke overfladedrift, vandstand, bølgeopbygning og den overordnede cirkulation. Den kan derfor understøtte en indtransport, men er ikke bevis for, at bundnært rav bevæger sig samme vej. I den nuværende transportscore giver vindretningen derfor kun en mindre bonus eller et lille fradrag sammenlignet med strømretningen.

Pålandsvind kan samtidig gøre vandet uklart og farligt. Fralandsvind kan lokalt give roligt vand og god sigtbarhed, selv om den ikke driver materiale direkte ind. Det er årsagen til, at transport og jagtbarhed beregnes separat.


## 8. Vandstand, tidevand og kystens aktive zone

_Stigende og faldende vand ændrer både transportveje, aflejring og hvor ravet kan findes._

Stigende vandstand kan føre flydende eller let mobiliseret materiale længere ind over lavvandede flader og ind i tanglinjer. Faldende vand kan blotlægge nye kanter og samle materiale i render eller langs den tilbagegående vandlinje. Effekten afhænger af bølger, strøm, strandprofil og timing.

RavRadar bruger aktuelt ændringen over tre timer som et beskedent transportbidrag: tydeligt stigende vand belønnes mere end faldende vand, mens næsten stabil vandstand giver et mindre fradrag. Det er en modelhypotese, som bør vurderes særskilt for Vadehavet, fjorde og åbne kyster.

Store regelmæssige udsving i Vadehavet kan være ægte tidevand. Datakvalitetskontrol må derfor ikke automatisk udglatte dem som fejl.


## 9. Langs- og tværkysttransport

_Rav kan ankomme fra siden, ikke kun direkte fra havet._

Skråt indfaldende bølger skaber langs-kysten-transport. I opskylszonen går swash ofte skråt op på stranden, mens backwash søger mere direkte ned ad hældningen. Gentagelsen giver en nettoforskydning langs kysten. Strøm kan samtidig transportere materiale parallelt med strandlinjen over langt større afstande.

En tværgående strøm mod land er en stærk kandidat til direkte indtransport. En langsrettet strøm kan være neutral eller positiv, hvis der længere fremme findes en odde, revkant, havnearm, læside eller kurvet kyst, der ændrer strømmen og skaber en samlingszone.

RavRadar modellerer i dag primært den lokale retning og kun indirekte den regionale tilførsel. Dette er et vigtigt ekspertområde: systemet mangler endnu en egentlig Lagrange-/partikelhistorik, der følger materiale mellem zoner.


## 10. Sortering, tang og andre indikatorer

_Hvorfor rav ofte findes sammen med bestemte opskylsfraktioner – og hvorfor sammenhængen ikke er entydig._

Hydrodynamisk sortering afhænger ikke kun af massefylde. Størrelse, form, ruhed, opdriftsreserve, synkehastighed og partiklens respons på accelererende strøm er mindst lige så vigtige. Rav kan derfor optræde sammen med træ, frø, bark, lette skaller, kulstykker og tang, når deres effektive transportegenskaber overlapper.

Tang og ålegræs kan både være transportbærer, fælde og synlig indikator. En tanglinje er dog ikke i sig selv bevis for rav. RavRadar giver kun bonus for tang/ålegræs, når en gunstig dynamisk strømretning allerede er påvist.

Eksperten bør især hjælpe med at afklare hvilke opskylstyper, kornfraktioner og biologiske materialer der bedst indikerer aktiv ravsortering ved forskellige danske kysttyper.


## 11. Kystmorfologi, rev, render og odder

_Statiske former kan styre, fokusere eller fastholde en eksisterende transport._

Revler og rev kan bryde bølger, skabe lokale cirkulationsceller og ændre, hvor materiale krydser brændingszonen. Render kan koncentrere returstrøm og transportere materiale væk. Odder og krumme kyster kan adskille strømregimer og skabe læ- eller konvergenszoner.

Lavt vand kan øge samspillet mellem bølgeorbitaler og bundmateriale, men kan også skabe stor turbulens. RavRadar behandler derfor rev, lavt vand og vegetation som små forstærkere og kun ved dokumenteret delvis eller stærk indtransport.

Den lokale geometri er kritisk. En korrekt matematisk retningsformel giver et forkert resultat, hvis zonens havpunkt, landpunkt eller pålandsretning er placeret forkert.


## 12. Storm, efterstorm og tidslig persistens

_Hvorfor den bedste jagt ofte kan ligge efter, ikke under, den højeste energi._

En storm kan mobilisere materiale, men samtidige bølger, skum, uklart vand og farlige forhold kan reducere muligheden for at finde det. Når energien aftager, kan strøm og vandstandsændring fortsætte transporten, mens sigtbarheden forbedres.

RavRadars nuværende frigivelsesmodel giver størst tidsbonus 3–18 timer efter en registreret højenergifase og et fradrag efter 48 timer. Procesmodellen klassificerer højenergifase, efterstorm/transportfase, aflejringsfase og sen efterfase.

Dette er en bevidst, testbar hypotese. Det præcise vindue forventes at variere mellem åben vestkyst, Kattegat, fjorde og beskyttede østkyster. Persistensregler skal derfor oprettes lokalt, have udløbstid og være dokumenteret med fund samt ture uden fund.


## 13. Jagtbarhed og sikkerhed

_En fysisk gunstig transport kan stadig give et dårligt tidspunkt at lede._

Jagtbarhed omfatter sigtbarhed, bølger, vind, stabilitet, adgang og sikkerhed. Ved wadersjagt straffes vind over cirka 6 m/s kraftigt, og bølger over cirka 0,7 m reducerer scoren. Ved strandjagt tolereres mere vind, men ekstremt vejr belønnes ikke automatisk.

Disse grænser er operationelle standarder – ikke individuelle sikkerhedsgarantier. Brugeren skal altid vurdere strøm, temperatur, lokale revler, mørke, redningsmuligheder og egne færdigheder.

Jagtbarhed vægter 40 % af grundscoren, netop for at undgå høje anbefalinger under forhold, hvor materialet måske flyttes, men ikke kan eftersøges forsvarligt.


## 14. Præcis implementering i RavScore 4.0.58

_Den faktiske kodevirkning – ikke kun den ønskede teori._

Grundscoren beregnes som:
40 % jagtbarhed + 35 % transport + 25 % frigivelse.

Transport
- Grundværdi 34.
- Strøm 0,15–0,65 m/s: +18; over 0,65 m/s: +5; svagere: −12.
- Strømretning: op til cirka +30 ved stærk indtransport og negativt bidrag ved fralandstransport.
- Vind mod land: +6; tydeligt væk: −2.
- Vandstandstrend ≥ +8 cm/3 t: +8; ≤ −8: +3; næsten stabil: −4.
- Lavt vand +4, rev +3 og vegetation +3 – kun når strømmen mindst delvist går ind.
- Tydelig fralandsstrøm kan sætte loft på 42; meget stærk fralandsretning loft på 28.

Frigivelse
- Grundværdi 22.
- Maksvind seneste døgn ≥14 m/s: +35; ≥9 m/s: +18; ellers +4.
- Maksbølge ≥1,5 m: +14.
- 3–18 timer siden høj energi: +12; mere end 48 timer: −8.
- Kysttype west: +5.

Efterbehandling
En adaptiv, versionsstyret model kan justere grundscoren. Derefter anvendes aktive ekspertregler. En regel kan give bonus, fradrag, fast score, blokere vurderingen eller blot vise et råd. Debugsporet gemmer delscorer, retninger, caps, regelmatch og slutscore.


## 15. Fra faglig viden til regler

_Hvordan en ekspertobservation omsættes uden at blive til skjult eller utestet logik._

En regel skal beskrive én tydelig sammenhæng og indeholde: geografi, betingelser, effekt, kilde, evidensklasse, tillid, begrundelse, version og status.

- Beskriv observationen i almindeligt dansk.
- Angiv om den vedrører mobilisering, transport, aflejring eller jagtbarhed.
- Vælg målbare betingelser og et afgrænset geografisk omfang.
- Gem som kladde.
- Test positive og negative eksempler.
- Aktivér kun med rettigheden til publicering.
- Følg effekten i historiske observationer og tilbagerul ved problemer.

Store scoreændringer, regler uden betingelser og kritisk prioritet skal udløse advarsler. AI må gerne foreslå en struktur, men må ikke aktivere reglen.


## 16. Datakilder, retninger og forecastintegritet

_DMI-prioritet, fallback og hvorfor en sammenhængende tidsserie er vigtigere end et kunstigt 120-tal._

DMI er autoritativ dansk kilde. Vind, bølger, strøm, vandstand og temperatur behandles som separate komponentserier, kvalitetssikres og samles på faste UTC-timer. Open-Meteo bruges kun som fallback.

RavRadar må ikke skifte frem og tilbage mellem DMI og fallback time for time, fordi det kan skabe kunstige spring og falske trends. En sammenhængende prognose på 118–119 timer accepteres frem for kunstigt at gentage værdier til 120 timer.

Vind er meteorologisk fra-retning. Strøm er oceanografisk til-retning. Alle forklaringer og pile skal følge denne forskel.


## 17. DMI-vandstandsstationer og cachelivscyklus

_Observation, prognosecache og registerstatus skal holdes adskilt._

En station kan være aktiv i DMI-registeret, midlertidigt mangle en ny observation og stadig være prognosebrugbar, fordi dens cache er gyldig. RavRadar viser derfor observationsstatus, cacheudløb og samlet anvendelighed separat.

Kendte stationer bevares i registeret, også når de er historiske eller midlertidigt inaktive. Automatisk primær/sekundær routing skal vise afstand, vægt og metode. Administratorens override vises særskilt og må ikke ændres automatisk af et forslag.


## 18. Administration, Supabase og ekspertrettigheder

_Hele den værdifulde adminfunktionalitet er adgangskontrolleret._

GitHub Pages kan udlevere den statiske adminskal, men den må være ubrugelig uden gyldig Supabase-session. Beskyttet indhold – håndbog, diagnostik, stationaudit, regler og centrale konfigurationer – hentes gennem Supabase med Row Level Security.

Eksperten skal have både Åbn administrationen og den relevante modulrettighed. Håndbogen kræver Læs håndbogen; indsendelse af faglige rettelser kræver særskilt Indsend faglige rettelser til håndbogen.

Læsning, redigering, publicering, rå download og systemadministration er bevidst opdelt. Ejeren har fuld adgang.


## 19. Release Governance og RDKS-gate

_Den arbejdsgang, som skal forhindre gentagelse af 4.0.56-forløbet._

En version må ikke kaldes færdig eller leveres som ZIP, før den obligatoriske release-gate er grøn. Den kontrollerer versionskonsistens, RDKS, håndbog, sikkerhedsarkitektur, workflow, beskyttede filer, domæneberedskab og hele testpakken.

- Ingen manuelle enkeltrettelser må præsenteres som færdig release.
- En fejl i CI skal udløse en samlet audit af resten af kæden – ikke kun en lapning af første fejl.
- GitHub-secrets må aldrig ligge i ZIP eller kode og skal bevares på repository-niveau.
- SQL-migrationer skal være idempotente eller tydeligt mærket som engangskørsel.
- Leverance-ZIP må ikke indeholde .git, caches, node_modules eller hemmeligheder.
- Release-rapporten skal angive præcis hvilke tests der faktisk er kørt.

RDKS er den bindende proceshukommelse: fremtidige versioner skal stoppe, hvis release-governance ikke er dokumenteret og valideret.


## 20. Overgang til ravradar.dk

_Brugerne skal møde eget domæne, selv om GitHub Pages fortsat kan være hosting._

Målet er, at brugerne besøger ravradar.dk. GitHub Pages kan fortsat bygge og hoste statiske filer, mens et custom domain peger på deploymentet. Supabase forbliver backend.

Før domænet aktiveres skal følgende være klar: DNS og HTTPS, GitHub Pages custom domain, Supabase Site URL og redirect-URL'er for både https://ravradar.dk og eventuelt https://www.ravradar.dk, relative appstier, service-worker-scope, manifest, canonical URL, Open Graph, fejlredirect og en kontrolleret overgang fra den gamle GitHub-adresse.

Der oprettes ikke en CNAME-fil før DNS og Supabase er klar, fordi en for tidlig aktivering kan forstyrre den nuværende side. Koden skal indtil da være domæneagnostisk og bruge relative URL'er.


## 21. Prioriterede spørgsmål til rav- og sedimenteksperten

_De vigtigste steder, hvor ekstern faglig korrektion kan forbedre modellen._

- Er intervallet 0,15–0,65 m/s meningsfuldt som transportindikator på tværs af danske kysttyper?
- Hvordan bør bundnær strøm afvige fra modelstrømmen i surfzone, fjord, revle og lavvandet bugt?
- Hvilke kombinationer af bølgehøjde, periode og vanddybde mobiliserer typisk rav i forskellige størrelser?
- Er 3–18 timers efterstormvindue realistisk, og hvordan varierer det geografisk?
- Hvornår er faldende vand mere gunstigt end stigende vand?
- Hvilke opskylsfraktioner er de bedste indikatorer for ravsortering?
- Hvordan bør langs-kysten-transport og tilførsel fra nabozoner modelleres?
- Hvornår virker tang som transportbærer, fælde eller blot samtidig indikator?
- Hvilke statiske kystformer bør give bonus, fradrag eller slet ingen direkte score?
- Hvilke data og observationer er nødvendige for at kalibrere tærsklerne forsvarligt?


## 22. Faglige hovedkilder og læsevej

_Kilderne bag den generelle procesforståelse – med tydelig adskillelse fra RavRadars egne tærskler._

- Chubarenko m.fl. (2017), Microplastics in sea coastal zone: Lessons learned from the Baltic amber. Bruges især til analogien mellem rav, lavdensitetspartikler, stormmobilisering og gentagen strand–hav-migration.

- van Sebille m.fl. (2020), The physical oceanography of the transport of floating marine debris. Overordnet ramme for strøm, vind, bølger, partikelegenskaber og strandingsprocesser.

- Zhang (2017), Transport of microplastics in coastal seas. Samlet oversigt over betydningen af massefylde, størrelse, form, vind, bølger, tidevand og bentiske processer.

- DHI, Shoreline Management Guidelines, samt TU Delft, Coastal Dynamics. Grundlæggende kysthydrodynamik, sedimenttransport, surfzone og morfologi.

- Davidson, Brenner & Pujara (2023), Beaching model for buoyant marine debris in bore-driven swash. Viser betydningen af partikelinerti og tidspunkt/hastighed ved indtræden i swashzonen.

- RavRadars egne zonedata, DMI-diagnostik, historiske fundregistreringer og ekspertreviews. Disse er nødvendige for lokal validering, men er ikke i sig selv generel naturvidenskabelig dokumentation.

Håndbogen parafraserer kilderne. Konkrete scoretærskler er RavRadar-parametre, medmindre andet er udtrykkeligt dokumenteret.


## 23. Ordbog

_Centrale begreber i systemet._

MobiliseringAt et stykke løsnes eller sættes i bevægelse.TransportNettobevægelse mod, langs eller væk fra kysten.SwashVandets løb op på stranden efter bølgebrud.BackwashVandets returløb ned ad stranden.UndertowBundnær returstrøm væk fra kysten under bølgepåvirkning.ObservationFaktisk måling.PrognoseModelberegnet fremtidig værdi.CacheTidligere hentede data, der kan være gyldige i en afgrænset periode.RDKSRavRadar Decision & Knowledge System.Release-gateAutomatisk og dokumenteret stopklods før udgivelse.
