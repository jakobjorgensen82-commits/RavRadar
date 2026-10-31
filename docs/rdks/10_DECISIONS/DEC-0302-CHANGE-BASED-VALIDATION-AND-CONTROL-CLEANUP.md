# DEC-0302 – Ændringsbaseret validering og oprydning i kontroller

En negativprøve for Git-filers executable-mode skal have samme mode på arbejdsfilen og i indeks/commit samt bevise rent checkout, før den forventer afvisning af en leveringsfils mode. Kun at ændre indekset efterlader på Linux en anden, tidligere afvisningsgrund. Testfixturen følger nu denne rækkefølge; produktets clean-head-kontrol og forventede modeafvisning bevares.

Den normale forberedelse af historiske kildepins henter kun en manglende commit og bruger ikke depth-begrænsning. En lokal Git-reproduktion påviser, at det tidligere ubetingede depth=1-kald gjorde et fuldt checkout shallow og brød forfaderkontrollen trods tilstedeværende objekter. De konkrete commit-/trækontroller består. Kun den gennemgåede hele workflowovergang er registreret; dette er ingen generel kort godkendelse af senere workflowændringer.

De syntetiske kildeprøver får nu et afgrænset host-/CI-miljø frem for vejrhentningens produktionsindstillinger og leverandørnøgler. Den normale CLI-prøve påviser arvet miljø som rødt og det samme forløb med isoleret miljø som grønt; en faktisk fejl i et valgt mål forbliver rød. Historiske updaterprøver får kun den præcise ydre helfilinverse for READY-kalderrettelsen, før deres uændrede gamle orakler. De konkrete PostgreSQL- og modelinput ændres ikke; kontrolkodens egen kvalifikation og uafhængige review består. Den uændrede Python-provenanceprøves observerede timeout er et særskilt åbent FULL-testbudgetproblem, ikke en bestået prøve eller et bevis for en produktregression.

Den korte PR-kontrol er faktisk kvalificeret. Den almindelige vejrkalder faldt imidlertid tilbage til den brede kildekontrol, fordi dens egen Git-adapter kasserede batch-input. Den afgrænsede efterfølger ændrer kun adapterens stdin til pipe. Den eksisterende integrationsprøve udfører nu også den faktiske top-level check-indgang og kræver både required=false og den skrevne præcise locator. Den normale CLI er rød før og grøn efter rettelsen; ny præcis GitHub-kvalifikation og virkning i en almindelig vejrhentning er fortsat åbne. Et vellykket kald med en injiceret Git-læser beviser ikke den normale kalder, når den ejer sin egen adapter. Bevar eksisterende byte-/tidsgrænser, offline-Git, kildekontrol og alle afslag.

De valgte mål køres fortsat én ad gangen, men producenten venter nu asynkront på hver proces’ faktiske close. Dermed kan forælderens timere og netforbindelser arbejde under prøverne. Program, argumenter, timeout og den strenge PASS-betingelse bevares. Den normale timerregression påviser den tidligere blokering; netfejlens konkrete årsag er endnu ikke bevist.

Den første faktiske målrettede Linux-kørsel gennemførte de valgte prøver uden ny native SQL, men stoppede i den efterfølgende GitHub-genlæsning før udstedelse af kvitteringen. Den afgrænsede slutdiagnose skelner nu faste transport-/HTTP-kategorier uden rå fejltekst, nøgler eller svarindhold. Samme to læsninger, grænser og røde udfald bevares; ingen automatisk gentagelse eller påstand om offentlig levering. Den oprindelige transportårsag er fortsat ukendt; en ikke-reproduceret forbindelseshypotese giver ingen rettelsesautoritet.

### Afgrænset rettelse af genoptaget beregning

Den normale beregning kan få et nyt hul i strømhistorikken, selv om den forrige gyldige tilstand var fuldt klar. Updaterens kalder skal derfor give de tre allerede validerede kompagnonkilder mulighed for den eksisterende lokale vurdering af ufuldstændig historik. Den må ikke kræve, at alle senere timer stadig er READY. Legacy-, kold- og manglende initialisering bevarer deres særskilte grænser. Den strenge rollbackkontrol, numeriske state, scoreformel og 48 reelle timers modning ændres ikke.

Fejlmekanismen er reproduceret i den normale produktionskalder. Den lokale kalderrettelse og den eksisterende strenge rollbackprøve består; deres PostgreSQL-, C/I/T- og modelbindingsinput er uændrede. En præcis helfilovergang og de to relevante normale mål registreres i den korte kontrolvej. Faktisk GitHub-kvalifikation, sikker genoptagelse, offentlig vejrlevering og tidsgevinst er fortsat åbne. De nye lokale domæne-/producent-/forbrugerkaldere er prøvet med ægte Git og syntetisk transport; det er ikke en ny SQL-eksekvering eller offentlig levering.

**Dato:** 2026-10-30
**Status:** Ejerbeslutning; første afgrænsede kontrolvej er kildeleveret; faktisk målrettet levering og målt tidsgevinst er åbne
**Besluttet af:** Ejeren gennem direkte instruktioner i den aktuelle samtale

## Den konkrete domænekontrakt — lokal integration31. oktober

Den nye særskilte type `weather-source-targeted-domains-v2` bevarer tekst-V1 og dens bevisnavne. Producent og forbruger genberegner selv hele ændringsplanen og de normale direkte/indirekte læse-, import- og kommandoforbindelser på committed Gitobjekter. En sammenligning af de143 gennemgåede PostgreSQL-input er nødvendig, men ikke alene tilstrækkelig: nye eller ukendte modul-/data-/procesforbindelser må ikke falde uden for inventaret. Hele C/I/T og de autentiske frosne ankre består. Nye migrationer og package-scopes skal medregnes. Domæne- og plandigests skal være ens på et PR-head og en faktisk merge med samme hele træ; commitidentiteten bindes særskilt.

PostgreSQL og historisk584-national kan være ikke relevante for en sådan afgrænset ændring. D1 kan samtidig have en faktisk syntetisk SQLite-prøve, og den aktuelle Candidate-G-audit kan have sit eget konkrete syntetiske mål. Disse udsagn holdes særskilt; ikke-relevans, udførelse og genbrug ommærkes ikke. Kun faste normale kommandoer med faktiske beståede resultater giver en kvittering. Parent-/childmål må ikke udføres dobbelt. De korte mål skal kunne køre i deres faktiske tidlige runnerfase uden en skjult afhængighed af senere, oversprungne installationer.

Tillidsændringer giver `CONTROL_QUALIFICATION_REQUIRED`. ROOT gennemgår hele ændringen uafhængigt og skriver en fast reviewreference i den eksisterende kilde-PR. Producent og forbruger genlæser den gennem den allerede benyttede friske GitHub-læser. Referencen binder PR/head, den kvalificerede FULL-forfader, hele inventaret, dependency-closure, planen og det private reviewdigest. Manglende eller modstridende review stopper præcist; det må hverken autorisere et skip eller automatisk starte den samme dybe prøve igen. Reviewreferencen skal være stabil inden for hvert forløb. Ved et senere forbrug kan et nyt frisk ROOT-review af samme præcise kilde og plan bruges; V2-artifactet påstår ikke at bevare et historisk reviewdigest.

Den eksisterende faktiske FULL-forfader, senere negative/ukendte kørsler, præcis PR/merge og hele kildeindholdet genkvalificeres fortsat. De normale22 workflowtrin og den lukkede64-kald/60-sekunders læseramme genbruges; oversprungne trin kaldes ikke udført. Ny kontrolkode kræver sin reelle korte kvalifikation, og en kendt relevant fejl er fortsat rød. Nye offentlige data bevarer de normale data-, privatlivs-, original-, no-loss- og deploykontroller.

Koden er under lokal integration. Første komplette V2-kalderforløb, faktisk GitHub-kvalifikation, levering og tidsgevinst er åbne. En lokal ren inputhelper, et grønt strukturmål eller en beskrevet kort profil afslutter ikke opgaven. Ingen ny service, nøgle, plan, model-/versions-/SQL-udstedelse eller produktionsaktivering følger af denne kontrakt.

## Præcisering31. oktober — tidsforbrug og fremadrettet594-V2

Ejeren afviser flere timers kontrol som acceptabel normal leveringsvej, uanset ændringstype. Det er et krav om konkret forbedring af gennemløbet, ikke tilladelse til falsk test- eller databevis. Mål faktisk tid i de nødvendige normale forløb, fjern gentaget arbejde, og dokumentér hvad en ændring reelt kan påvirke. En forklaring på, hvorfor kontrollen er langsom, afslutter ikke opgaven.

Den nye lokale594-V2 ligger i de eksisterende tre kontrollere og to normale prøver. Den kræver66 hele moduler, fem datafiler,72 SQL-filer,13 autentiske frosne ankre, egne kontrolbytes, eksplicitte package-scopes samt uændret faktisk runtime og PostgreSQL-programkvartet før og efter. Den oprindelige fase skal være faktisk EXECUTED med efterfølgende upload; en genbrugslocator skal ende dér. Senere negativ/ukendt evidens, ændret kilde, runtime, attempt eller artifact giver ingen genbrugstilladelse. V1 og593-V2 bevares særskilt og bliver ikke bagudrettet594-V2.

Den normale594-producent, nationalrollen og FULL-forbrugeren genlæser den nye type. Nationalkvitteringens syv nativekrav følger den faktiske status/oprindelse; historisk584-national må fortsat aldrig kaldes aktuel594-national. De to eksisterende lokale mål har54 PASS; en ny særskilt transportprøve har1 PASS uden rigtig SQL. Første faktiske Linux-V2-eksekvering, senere faktisk REUSED og målt tidsgevinst er åbne. Selve første dybe kvalifikations lange kæde og den brede kildematrix er ikke løst af genbrugsændringen alene.

Den nye594-læser bruger alene den eksisterende lukkede source-ramme på64 faktiske HTTP-kald og60 sekunder. Gamle593-native24/60, JSON-/ZIP-lofter, streaming og headeradskillelse bevares. En normal fysisk transportprøve viser, at en gyldig genbrugslocator med to senere kørsler kræver25 hop: den gamle24-vej gav unødigt fuld udførelse, den nye594-vej genbruger samme faktisk udførte oprindelse. Reel64-/60s-overskridelse stopper fortsat sikkert. Dette er en særskilt ny lokal prøve, ikke gentaget54-casekørsel eller målt hosted tidsgevinst.

D1-kode og007-forslag, PostgreSQL/modelkode, historisk584-national og en aktuel Candidate-G-auditfixture er forskellige domæner. Tom intersection med modelinput er ikke i sig selv bevis for, at enhver database- eller nationalprøve er irrelevant. Den aktuelle tekstprofil må ikke give blandet kode/DDL en falsk N/A-kvittering. Udvidelse skal følge faktisk normal kalder og relevante afhængigheder uden at bygge et ekstra kontrolbootstrap alene for at flytte samme ventetid.

## Beslutning

Testomfanget skal følge ændringens faktiske påvirkning og relevante afhængigheder. Uændrede, uvedkommende områder skal ikke automatisk udløse dybe prøver. Korte prøver af den normale kæde kommer tidligt; overflødige, gentagne og erstattede kontroller fjernes fra den normale leveringsvej.

Princippet gælder hele forløbet: kildekontrol, databasekontrol, nationale prøver, build, upload og deploy. En kontrol skal beskytte et konkret krav og være relevant for den aktuelle ændring. Mængden af grønne kontroller er ikke et selvstændigt kvalitetsmål.

594-efterfølgeren registrerer additivt de fem faktisk gennemgåede tekstrammer efter normal versionssynk. Hele de gamle 593-rammer bevares. Før og efter skal matche samme præcise ramme; versionsblanding eller ukendt import, selector, kode, markup og escaping giver fuldt omfang. Aktuel releaseversion er ikke i sig selv en godkendelse, og der anvendes ingen generel versionsnormalisering. Lokal rammeprøve og normale producent-/forbrugermål er ikke en faktisk målrettet GitHub-levering eller SQL-eksekvering.

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

Historiske dashboardorakler bevares som særskilte CODE/DATA-prøver fra ét kildefast ægte Git-head/træ/stipar med hele byte-/SHA-kontroller. Ukendt sti, head, træ, ændrede bytes og caller-overrides afvises. Den aktuelle rå UI prøves selvstændigt gennem normal import/render/adgang og den eksisterende initial-dashboard-kalder; historisk kode er ingen native- eller runtimeadgang. Der tilføjes ikke en stor heltekstinverse for irrelevante aktuelle UI-tekster.

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
