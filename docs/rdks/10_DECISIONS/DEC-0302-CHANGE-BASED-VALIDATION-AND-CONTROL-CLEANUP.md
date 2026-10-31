# DEC-0302 – Ændringsbaseret validering og oprydning i kontroller

**Dato:** 2026-10-30
**Status:** Afgrænset kontrolvej kildeleveret; faktisk målrettet levering og tidsvirkning åbne
**Besluttet af:** Ejeren gennem direkte instruktioner i den aktuelle samtale

## Beslutning

Testomfanget skal følge ændringens faktiske påvirkning og relevante afhængigheder. Uændrede, uvedkommende områder skal ikke automatisk udløse dybe prøver. Korte prøver af den normale kæde kommer tidligt; overflødige, gentagne og erstattede kontroller fjernes fra den normale leveringsvej.

Princippet gælder hele forløbet: kildekontrol, databasekontrol, nationale prøver, build, upload og deploy. En kontrol skal beskytte et konkret krav og være relevant for den aktuelle ændring. Mængden af grønne kontroller er ikke et selvstændigt kvalitetsmål.

## Konkret testplan for hver levering

1. Vurdér hele den faktiske kildeændring og dens reelle direkte og indirekte afhængigheder. En lille diff er ikke automatisk lille risiko.
2. Vælg de relevante eksisterende mål og nødvendige korte fælles integritetskontroller. En ny regression skal faktisk være registreret i leveringsvejen.
3. Kør en kort prøve gennem den normale berørte kalder tidligt, før de dyre kontroller. Brug eksisterende gyldige gemte data eller relevante syntetiske fixtures uden at fabrikere produktionsproveniens.
4. SQL, model-, state- og checkpointændringer får relevante dybe prøver. Et ikke-berørt databasedomæne markeres ikke relevant for denne ændring; det påstås aldrig udført eller genbrugt uden bevis.
5. Ukendt eller fælles påvirkning udvider omfanget. En kendt relevant fejl forbliver rød.
6. Samlet tidsforbrug og den normale prøves faktiske dækning skal kunne vurderes. Mål i de nødvendige kørsler frem for ekstra fulde prøver kun til måling.

## Historik og oprydning

Gennemgå og fjern eller flyt aktuelle prøver, der er gentagelser, forældede eller erstattet af bedre beskyttelse. Historiske uforanderlige kildebanker, SQL-originaler og deres autenticitet bevares. De er forskellige fra en aktuel test, der alene kræver gammel package-tekst eller en gammel workflowstreng ved en legitim ombygning. En gammel nyttig beskyttelse må først udgå, når det er konkret dokumenteret, hvordan kontrakten fortsat dækkes.

Gyldig tidligere evidens kan bruges for uændrede relevante input og forudsætninger. Udførelse, genbrug og ikke-berørt scope er tre forskellige udsagn og skal beskrives ærligt. Gamle V1-receipts ommærkes ikke til V2; et nyt testvalg er ikke et nyt SQL-bevis.

### Konkret afgrænsning af privat eksportprøve — 31. oktober 2026

En privat eksporttest skal beskytte den normale installations-/export-/adgangs- og renderkontrakt. Den må ikke kræve historiske hele dashboardfiler gennem flere versions-, label-, kontotæller- og vejrauditinverser, når disse bytes ikke er eksportens kontrakt. Workflowets præcise installationsarm, publisherens destination/adgang og deres konkrete negative mutationer bevares. Den aktuelle normale learning/render/mount-kobling testes i stedet med samme host og aktuelle adgangsobjekt, alle aktuelle faneskift og negative mutationer for fjernet, duplikeret eller ubetinget mount, forkert adgang/host/import og forkert routing. En ægte relevant fejl forbliver rød.

En eksisterende målprøve er først en del af leveringsbeviset, når den faktisk er kaldt i den normale CI-vej. Den allerede forberedte initial-dashboard-prøve kobles derfor én gang til den eksisterende callers-deltest; der oprettes ikke et nyt bredt workflow eller en ekstra dyb suite. Dens normale loading/failure/retry/draft-adfærd skal faktisk udføres i den næste præcise sourcekvalifikation. Historiske model-/SQL-orakler i andre tests, metadata- og produktgates, gamle originaler og uforanderlige kildebanker ændres ikke. Lokal Node-afprøvning er fortsat ikke GitHub-/Linux-/offentlig leveringsbevis.

En særskilt normal rollback-kontrol skal afvise gennem sine allerede eksisterende små metadata, før den åbner store payloads. Den konkrete lokale CLI-ændring flytter den uændrede afvisningsblok til en helper og læser tre små metadata før de seks kendte negative afvisninger og fem store payloads. Den fulde positive auditkrop, no-loss-/SQL-/modelgates og deres konkrete krav bevares byteuændret; en afvisning bliver ikke en accept. Den eksisterende normale målprøve er faktisk gennemført. Før-/efter-tidsgevinst er ikke målt og må ikke påstås. Det er en konkret failfast-forbedring, ikke tilladelse til at springe positiv kvalifikation eller datakontrol over.

### Deterministisk normal reserveprøve — 31. oktober 2026

Den afgrænsede ændringsbaserede kontrolvej har bestået sin fulde kildekvalifikation og er lagt i main. Det er ikke bevis for en faktisk senere TARGETED-levering, automatisk nativegenbrug eller målt tidsbesparelse. De første korte profiler er fortsat afgrænsede; ukendt eller fælles påvirkning vælger fuldt omfang. Vejrhentningens separate originalovergang er ikke løst af denne kontrollevering.

En efterfølgende kildekontrol fandt en tidsfølsom antagelse i Open-Meteo-PART-prøven: den krævede mindst én HTTP-start inden for 80 ms, selv om normal banklæsning og første checkpoint indgår i samme frist. Den lokale testrettelse styrer alene testens monotone ur under rigtig bank-I/O. Setup på 0/79/80/81 ms kræver præcist 1/1/0/0 starter; uændret pacing afviser næste start. Requests, udskudte opgaver, bank og cursor skal følge faktisk start. Produktkode, 800-loft, 150-ms-pacing, samlet deadline og parameterafslag ændres ikke.

Førfejlen er reproduceret gennem normal forsinket banklæsning; den rettede normale prøve og konkrete negative mutationer består lokalt. Den præcise nye GitHub-kvalifikation og offentlig effekt er åbne. Ingen SQL- eller national produktionsprøve påstås udført eller genbrugt af dette lokale testbevis. Se DEC-0302; detaljeret drifts- og testbevis føres privat.

## Produktion og leveringsgrænser

Nye friske produktionsartifact bevarer relevante fulde data-, original-, modelbindings-, privacy-, no-loss-, release- og deploykontroller. Source-/SQL-testvalg må ikke give adgang til datatab, falsk provenance, ændret kildeprioritet, admin/geometri, scoreformel eller omgåelse af konkrete afvisninger. Ingen produktionsændring under aktiv writer.

Denne beslutning erstatter ældre blanketformuleringer om samme brede source-/databasepakke ved enhver rettelse som arbejdsprincip. Den er ikke i sig selv en teknisk ændring af eksisterende gateprotokoller og giver ikke ret til at kalde en uafsluttet eller rød kvalifikation grøn. Den tekniske ændring får egen gennemgået integration og relevant kvalifikation; det igangværende vejrrettelsesforløb fortsætter på sin allerede igangsatte kvalifikation.

## Aktuel implementeringsstatus

Lokalt implementeret er stop efter ugyldig bindingpreflight, normale tidsrækker, den tidlige normale overgangsprøve samt en ændringsplan på hele den faktiske Git-diff. De første korte profiler omfatter navngivne dokumenter og præcist afgrænsede tekstfelter i Om RavRadar og læringsmodulet; fælles, ukendte og blandede ændringer vælger fuld kontrol. Dette er endnu ikke installeret testudvælgelse.

Den lokale FULL-baselinekvalifikator kræver faktisk grøn fuld kildekontrol, native- og nationaltrin, hashbundne rapporter, samme repositories/PR/merge og en rigtig Git-forfader. Den særskilte TARGETED-rapport bevarer præcist det valgte testomfang og mærker database/national som ikke relevante og ikke udført. En historisk nationalprøve bliver ikke til bevis for aktuel national drift. Producenten genberegner hele sin Git-plan; forbrugeren kræver selvstændig kvalifikation af den faktiske merge og tilsvarende kildeindhold.

Producentkoordinatoren er også implementeret lokalt. Den afleder selv PR, HEAD, job og den komplette kumulative diff, opdager og kvalificerer en fuld forfader og afvikler kun planens faste kommandoer uden shell eller caller-valgte spring. Ren kilde og identitet kræves før og efter. Utilstrækkelige forudsætninger vælger den eksisterende fulde vej; et fejlet valgt mål eller drift under prøven stopper rødt. Den lokale normale kalderprøve bruger ægte små Git-repositories og syntetiske transport-/målprocesser; den er ikke et live GitHub- eller produktbevis.

Den lokale forbrugerhelper kræver den faktiske main-merge med producenten som direkte forælder, identisk helt Git-træ og kildeindhold samt præcis grøn TARGETED-kvalifikation. Ikke-berørte trin skal faktisk være sprunget over, og den særskilte rapport må ikke kaldes fuld kilde-/SQL-eksekvering. Den fulde baseline kvalificeres på ny, den komplette kumulative plan genberegnes, og den eksisterende kontrol af senere røde eller uafklarede kildeforløb genbruges uændret. Lokale normale Git-/transportprøver er ikke live genbrug.

Workflow, normal CLI og afgrænset locator-opdagelse er nu sammenført lokalt. Den oprindelige digest forbliver skrivefri og uden netkald. Den nye udtrykkelige CI-indgang vælger kun TARGETED efter komplet plan og kvalificeret FULL-forfader; ellers bevares normal FULL. Opdagelse er alene en adresse til beviset og giver ingen selvstændig grøn status. Forbrugeren kvalificerer det fundne bevis på ny. Den normale source-adapter deler én lukket ramme på 64 faktiske HTTP-kald og 60 sekunder gennem opdagelse, forbrug og historisk FULL-kvalifikation; signed ZIP-læsninger tælles med, og bytes, afbrydelse og headeradskillelse bevares. Den almindelige native-reader beholder 24 kald og 60 sekunder. En senere relevant rød eller uafklaret kørsel må ikke skjules af en ældre grøn; den normale manuelle vejrindgang registreres med sin faktiske job-/trinkontrakt.

Historisk kvalifikation og forbrug følger den eksisterende FULL-kontrollers adskillelse mellem committed kilde og centralt hydreret runtime. Hele Git-træet, HEAD, ref-integritet, forfader og den komplette ændringsplan kontrolleres fortsat. Normal central hydrering skal ikke nulstilles eller afvises som en kildeændring. Producentens egne før-/efterkrav om ren kilde består, og friske produktionsdata kræver stadig alle normale runtimegates.

Producentens særskilte FULL-forfaderkvalifikation bruger samme eksisterende lukkede source-adapter og dens præcise callback-par. Den må ikke utilsigtet arve native-læserens mindre ramme, når senere kildeforløb skal kontrolleres. De små bevispakker gennemlæses i kvalifikatorens normale vej; der tilføjes intet cache- eller budgetlag. En normal målprøve med flere legitime senere jobtilsyn reproducerer den tidligere unødige FULL-fallback og består efter rettelsen. Overbudget, ukendt eller negativ evidens bevarer sikker FULL-fallback; ingen SQL-eksekvering påstås af målprøven.

Den lokale V2-native-opfølgning retter en påvist afvisning af en allerede kvalificeret oprindelse efter merge: GitHubs run-projektion kan legitimt have tom pull_requests. PR-nummeret bindes til de hele artifactbytes, og den rigtige PR hentes og kontrolleres selvstændigt både før genbrug og ved slutfriskhed. Manglende eller modstridende identitet afvises; ingen array ommærkes. En lokal før-/efterprøve med de samme autentiske gemte bevisbytes foreligger. Den er ikke et nyt SQL-bevis eller bevis for faktisk automatisk genbrug. De nye kontrolbytes skal selv kvalificeres; et ældre kontrolhash får ingen bagudrettet godkendelse.

De eksisterende 22 runtime-trin bevares. I TARGETED skal trin 6–20 faktisk være sprunget over; kildeidentitet, producentens rene kilde og upload af den særskilte målrapport skal stadig være gennemført. I FULL bevares de eksisterende dybe programmer og deres krav. Gamle whole-workflow-prøver, herunder V1-mutationsførbilleder, får kun deres originale helfil efter en streng inverse af netop den gennemgåede integration; andre forskelle afvises. Assertions og negative mutationer bevares. V2 kontrollerer det faktiske workflow uændret. Nye kontrollere er registreret i den normale FULL-vej.

Samlet gennemgang, den første fulde kildekvalifikation af selve kontrolændringen, sikker levering, en faktisk senere TARGETED-levering og målt tidsvirkning er fortsat åbne. Ukendte eller fælles ændringer får ikke korte profiler. Bredere relevant udtynding af UI-/databaseprøver er heller ikke afsluttet. Den akutte vejrrettelse leveres særskilt og må ikke forsinkes af denne lokale kandidat. Detaljeret, skiftende run- og testbevis føres privat.

## Placering af hukommelse

RDKS er beslutningskilden; AGENTS og CODEX_START_HERE giver kort obligatorisk indgang. Målet behøver kun et stabilt princip og henvisning, ikke kopier af hele den skiftende testplan. Checkpointet gemmer faktisk leveret/forberedt status og næste konkrete trin. Alle fem hovedmål og fristen 18. november 2026 bevares.
