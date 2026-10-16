## 16. oktober — isoleret gammel aktiv DMI-cache ved ny start

Den normale kalder havde et betinget hul: den arkiverede aktive DMI-cache kunne blive installeret som arbejdskopi, selv om den nye start ellers holdt gammel strømtilstand adskilt. Det er kildebevist, ikke påvist som fejl i den igangværende vejrhentning. Rettelsen kræver den ægte, uigennemsigtige arkivbundne inputvisning og hele pakkens kontrolsum fra samme faktisk læste filbeskrivelse. Kun den gamle aktive arbejdskopi udelades; dens destination skal være fraværende. Intet flyttes eller slettes. Originale B/S, RAW, alle øvrige filer og normal adfærd uden denne inputvisning bevares.

Én normal prøve reproducerede fejlen og består efter rettelsen på 76,9 sekunder uden skip. Første nye gemning, offentlig levering og almindelige efterfølger er ikke afprøvet. En fremadrettet rettelse reparerer ikke en allerede gemt ny B-pakke: faktisk READY, forfremmet kandidat og den strenge aktive kopi skal kontrolleres før normal genbrug. Den aktuelle vejrhentning er i DMI-fasen. PR633s præcise samlede kildekontrol er faktisk bestået, inklusive PostgreSQL. Den nye cacheisolationsrettelse ovenpå PR633 har endnu ikke sin egen præcise kildekontrol.

Version 4.0.578 og offentlig 4.0.577 er uændrede. Cron er pauset; SOURCE19 aktiveres ikke. Alle fem mål er åbne med frist 18. oktober. Se håndbog 89.240; tidligere dateret tekst bevares som historik.

## 16. oktober — arkiv og database gennemført; ældre kalderrute skal holdes adskilt

Den præcise PR629-kildekontrol, inklusive faktisk PostgreSQL, består. Første engangskørsel har faktisk arkiveret og genlæst de gamle B/S-originaler og seks offentlige filer samt installeret og genlæst den uændrede 230-overgang og den nye native-identitetsbinding. Den efterfølgende autentificerede NEW-arbejdsbaseline bestod også. Disse trin er nu produktionsbeviser og erstatter de ældre afventningsudsagn alene på disse punkter.

Kørslen stoppede derefter før leverandørerne: en gammel 11Z-genopretningsklassifikation forsøgte at læse metadata, som den særskilte nye-start-rute korrekt ikke opretter. Kaldergennemgangen fandt også den gamle engangs-DMI-PART-donor som forkert krav til den nye start. De to lokale selectors udelukker kun disse ældre specialruter ved det eksplicitte epoch-flag. Faktiske inlinekroppe reproducerer begge fejl mod den ægte før-YAML; hele det berørte mål består derefter med syv prøver uden skip, inklusive almindelig/default/native-adfærd og gamle donor-/afvisningsgrene. Den normale reusable-workflowprøve og RDKS består også. Den skrivefri gennemgang af hele kalderen fandt ikke flere konkrete fil-/legacy-rutehuller; den er ikke et nyt produktionsbevis. Ingen nye vejrdata, ny scoregeneration eller nyt offentligt deploy er leveret i det stoppede forsøg.

Version er fortsat 4.0.578; offentlig version er 4.0.577. Cron er pauset med uændret tidsplan. Den nye rettelse kræver præcis kildekontrol og sikker levering før et begrundet nyt forsøg. Et allerede installeret databasetrin må kun genbruges efter faktisk readback; ukendt udfald må ikke gentages blindt. Første nye generation og dens almindelige efterfølger skal verificeres gennem normal gemning, genlæsning, upload og Pages før cron. SOURCE19 og øvrige tilbageholdte leverancer forbliver inaktive, alle fem mål åbne. Se håndbog 89.239 og det private checkpoint.

## 16. oktober — bevaret arkiv og ny fremadrettet historik

Ejeren har nu valgt at bevare det gamle datasæt som et selvstændigt, verificeret arkiv og begynde en ny fremadrettet strøm- og scorehistorik. Det erstatter historikbroen som den primære genopretningsvej. Den gamle fortolkning må ikke levere numerisk initialtilstand til den nye historik. Originale B/S, den faktisk offentliggjorte generation og dens scoreværdier må ikke slettes eller ommærkes. Den almindelige rullende current/previous-opbevaring er ikke i sig selv permanent arkivering.

Den særskilte, som udgangspunkt frakoblede engangsvej skal først autentificere de oprindelige pakker med deres ægte tidligere kode, gemme særskilte private arkivobjekter og genlæse dem. Den nye beregning bruger en særskilt typesikret inputvisning uden gamle scoretilstande, aktiveringsindsprøjtninger eller gamle numeriske strøm-donorer. De oprindelige vejrdata bevares særskilt til den normale databevarelseskontrol. Nye strømværdier skal stadig bestå de normale native-, proveniens- og OWNER-kontroller. Manglende historik er ukendt/opvarmning, ikke nul eller kunstig READY.

Engangskørslen må ikke blot forlænge leverandørtiden. Den eksisterende udvidede profils nominelle led kan overskride dens samlede jobtid allerede før fulde kontroller og upload. Den lokale nye profil forberedes med højst 360 minutter og en målt reserve på 180 minutter til efterbehandling, med fasekontroller før leverandørerne. Almindelige kørsler beholder 230 minutter og deres normale budgetter. Fejlworkerens fire minutter, fysisk proceslukning, kildeprioritet, grænser og alle efterdatagates bevares. Mere tid er ikke garanti for tilgængelige DMI-timer eller fuld dækning.

Lokale prøver viser arkivgemning/genlæsning samt alle 673 kystdele fra ærlig ny opvarmning gennem normal checkpointgemning og genlæsning til en almindelig efterfølger uden nyt startflag. Det er ikke produktionsarkiv, faktisk SQL-installation eller offentlig levering. Normal kalderintegration, samlet præcis kilde-/Linux-/PostgreSQL-kontrol, første nye generation gennem upload/Pages og en faktisk almindelig efterfølger fra gemt ny tilstand skal fortsat verificeres. De seneste to PR629-fejl var kildekontroller, ikke nye fejlede vejrhentninger.

Lokal version er fortsat 4.0.578; offentlig version er 4.0.577. Cron er deaktiveret med bevaret tidsplan og genaktiveres først efter verificeret genopretning. Ingen ny start er udført i produktionen. SOURCE19 og de øvrige tilbageholdte leverancer aktiveres ikke af denne beslutning. Alle fem arbejdsområder er fortsat åbne med frist 18. oktober. Tidligere krav om numerisk videreførelse fra gammel historik er erstattet alene for den udtrykkeligt besluttede, arkivbevarende nye start; øvrige sikkerheds- og databevarelsesgrænser består. Se håndbog 89.238 og privat checkpoint.

## 16. oktober — lokal 4.0.578: native originaler og sikker arbejdsbaseline

De to normale årsager er nu lokalt rettet og frosset: sammenligningen af administratorens fulde punkt med Pythons tekniske punkt afrundet til syv decimaler samt blandingen af et eksisterende eget nyt native endepunkt og et manglende gammelt endepunkt. Kun det hele fulde punkt eller det hele punkt efter Pythons eksakte afrundingsregel accepteres. Egne eksisterende originaler og deres samplingbeviser bevares; kun faktisk manglende gamle endepunkter genafkodes. Dokument, rolle og kystdel må ikke blandes, og normal projektion, fuld præcision, filkontrol og fysisk lukning kræves fortsat. Ingen nærhedstolerance, nye DMI-tal eller omskrivning af administratorpunkter indføres.

Lokal version 4.0.578 er faktisk udstedt med C69 2786145, I71 aa1e364 og T12 15f0eb samt den nye append-only migration 20261016060000_native_sampling_identity_original_bound_successor.sql. Filantallene er uændrede; identiteterne er nye. Bindingen og SQL-kilden er ikke installeret. Gamle 220/230-SQL, deres pins, originale B/S og offentliggjorte historiske scorer bevares byteuændret.

Den typesikre lokale overgang autentificerer den gamle I71-baseline med dens ægte gamle kode og opretter en særskilt ny arbejdsbaseline. Den normale prøve omfatter alle 673 kystdele og viser kun metadataovergang med nul genberegnede zoner, nul genberegnede modelvarianter og nul reparerede fortsættelser. Fem tilstande for kystpunkternes klargøring bevares gennem gamle og nye normale validatorer i en separat arbejdskopi; afventende administratorændringer udføres ikke. Disse beviser er ikke ny numerisk kildeadgang eller faktisk gendannelse fra cloud.

Den særskilte installationsrute kræver rækkefølgen installeret 220, uændret 230 og derpå den nye binding med selvstændig genlæsning efter hvert trin. Ukendt udfald må ikke gentages blindt. Den almindelige readiness- og kodeopdateringsrute må kun se den nye binding som allerede installeret, aldrig bruge gamle tilladelser til at installere den. Gammel krypteret fremgang, originale data og den nye arbejdsbaseline holdes adskilt gennem den normale checkpointvej.

Målrettede lokale prøver af originalidentitet, blandede endepunkter, afrundingsparitet, databevarelse, arbejdsbaseline, installation og historiske/aktuelle readiness-kontrakter består. Den nye præcise samlede CI, Linux/native, PostgreSQL, faktisk SQL-installation, checkpoint-genoptagelse, cachegemning/genbrug, upload, deploy og offentlig effekt er fortsat åbne. Scoreformel, kildeprioritet, administratoropsætning, geometri, storage-ABI, tidsbudgetter og hård no-loss er uændrede.

Offentlig version er fortsat 4.0.577. Cron er deaktiveret med tidsplanen bevaret og må først genaktiveres efter verificeret levering. SOURCE19, samlet statistikaktivering og den separate assistentkandidat aktiveres ikke. Alle fem mål er åbne med frist 18. oktober. Stående autoritet dækker nødvendigt aftalt rutinearbejde uden gentagne spørgsmål; konkrete afvisninger og sikkerhedsgrænser består. Tidligere afventningsstatus er erstattet alene på de faktisk gennemførte lokale trin. Se håndbog 89.237.

## 16. oktober — egne originalfiler og kausal genafkodning

PR626-kontrollen og den autentificerede skrivefri kontrol af normalt valgte strømendepunkter er faktisk gennemført. De rapporterede stop skyldes manglende native endepunkter, ikke påviste ugyldige DMI-tal. Første stop pr. kystdel er fortsat en delvis timegennemgang, ikke en frifindelse af alle øvrige timer.

Den nye lokale plan bruger kun metadata til at finde en entydig, komplet filidentitet i samme autentificerede dokument. Filmetadata kan være registreret ved egen eller en anden kystdel; strømværdier må aldrig lånes fra andre dele. Manglende egne native tal genskabes kun fra egne eksakte RAW-bytes med den fastlagte tidligere afkodningskontekst, fuld præcision, fuld gennemlæsning og bevist fysisk lukning. Korrigeret ny afkodning holdes separat. Uændrede prognosevidner skal stadig bestå normal projektion; OWNER og hård no-loss bevares. Metadata eller en plan er ikke et originalbevis.

En ny gennemgået producent var ikke optaget i den historiske originalmodtagers præcise producentliste og blev derfor sikkert afvist. Det er en reel bindingsfejl i produktet, ikke kun en forældet prøve. Den lokale rettelse optager kun denne eksakte producent og kræver ni faste kildehashes for de seks nye originalmoduler, den normale historikplanlægger, vejropdatereren og genopretningsforberedelsen. Manglende eller ændrede moduler og ukendte byteudgaver afvises fortsat. Gamle familie- og producentbindinger samt hele den tidligere referencefil bevares.

Højst tre timers støtte i hver ende gælder kun egne nødvendige native timepar, ikke en længere scorehorisont eller generel opbevaring. Originale B/S og historiske scorer ændres ikke. Lokale og native delprøver er ikke fuld præcis kildekontrol eller bevis for faktisk originalgendannelse, cachegemning/genbrug, upload, deploy eller offentlig levering. Disse trin, en fungerende ny generation og senere cron-genaktivering er åbne; tidsplanen er uændret.

Version 4.0.577, I71/C69/T12, storage-ABI, SQL, model, scoreformel, kildeprioritet, admin/geometri og budgetter er uændrede. SOURCE19, den bevarede assistentkandidat og statistikaktivering forbliver inaktive. Alle fem mål er fortsat åbne med frist 18. oktober. Stående autoritet dækker nødvendigt rutinearbejde i det godkendte forløb; konkrete afvisninger og sikkerhedsgrænser ophæves ikke. Tidligere status om afventende PR626-kontrol og årsagsaflæsning er erstattet alene på de gennemførte trin. Se håndbog 89.236 og privat checkpoint.

## 16. oktober — kildeleveret originalrettelse og valgt-endepunktskontrol

PR625 er faktisk kildeleveret efter præcis Linux/native/source/PostgreSQL-kontrol. Genopretningen gendannede checkpoint og RAW-cache, men stoppede i valgt-endepunktsforberedelsen før DMI-kald, cachegemning, beregning og deploy. Kildegrønt er ikke offentlig genopretning.

Det samme faste stop dækker to forskellige steder: afvist original-endepunktsbevis eller sanitizertab uden bevist valgt erstatning. Den lokale default-OFF skrivefri kontrol følger den samme normale private udvælgelse og rapporterer første stop pr. kystdel med faste årsager. Den må ikke fremstille en delvis gennemgang som fuld dækning. Den er begrænset til de to allerede navngivne checkpoints, kræver normal autentifikation og afviser RAW-restore, providerkald, planfil, SAVE og scorebygning. Enkel target-48h-inddeling er kun diagnostik; initialtilstand, replay, egne brackets og holdstøtte må ikke ignoreres.

Ny præcis kildekontrol, faktisk årsagsaflæsning og en helkæderettelse er åbne. Originaler, strømkontrol, no-loss, I71, C69, T12, SQL, kildeprioritet, admin/geometri og budgetter bevares. Ingen isoleret revision eller øvrig produktionslevering aktiveres. Cron forbliver deaktiveret med uændret tidsplan. Alle fem mål og fristen 18. oktober består. Se håndbog 89.235 og privat checkpoint; tidligere lokalstatus om PR625 er erstattet alene på de faktisk gennemførte kildetrin.

## 16. oktober — lokale originaler først og fælles normal udvælgelse

PR624 er kildeleveret efter præcis Linux/native/source/PostgreSQL-kontrol. Den efterfølgende genopretning passerede faktisk CLI-opstart og autentificeret forberedelse, men stoppede på utilgængelig historisk original før cachegemning. Det er ikke bevis for ugyldige DMI-data eller en ny offentlig generation. Den nye skrivefri audit af det nyere gemte checkpoint er gennemført med normal baseline og fuld autentifikation; manifestfravær er fortsat ikke bevis for fysisk fravær i alle arkiver.

To konkrete forhold er reproduceret lokalt: genopretningen spurgte DMI før verificerbar lokal genbrug, og den uafhængige donoroptælling kunne kræve en gammel original, selv om normal privat udvælgelse valgte dens fuldt kvalificerede samme-original-efterfølger. Kildekandidaten prøver nu lokal original gennem den normale ejede læser før netværk. Fejl i indhold, capture, hoveder, EOF, fysisk lukning eller en fil, som forsvinder under læsning, må aldrig blive et netværksfallback. Kun faktisk oprindeligt fravær må gå videre til den præcise historiske DMI-revision.

Ejeren har særskilt godkendt, at de eksisterende rene record-, retention- og mergefunktioner flyttes uændret til ét importsikkert fællesmodul. Den normale vejrhentning bruger samme funktioner som før; byteinverse og målprøver bevarer den gamle normale adfærd. Genopretningens behov skal følge den faktiske private udvælgelse, bevaret tilstand, originale timeforløb og fuldt beviste native endepunkter, ikke PUBLIC alene, en proofmarkør eller kopieret topmetadata til en manglende bracket. Manglende nødvendige originalbeviser forbliver et ærligt stop. Nul faktisk behov må ikke fremstilles som udført download eller gemning.

Dette er lokal kilde og målbevis, ikke samlet præcis kildekontrol, installeret genopretning eller faktisk produktionseffekt. Nye kilde-/native-/PostgreSQL-gates, reel originaltilgængelighed og cachegemning/genbrug samt efterfølgende checkpoint-beregning, upload, deploy og offentlig kontrol er åbne. I71, scoreformel, kildeprioritet, admin/geometri, originaler, historiske scorer og budgetter bevares. Ingen SQL eller isoleret revision aktiveres af denne kildeændring. Ejeren har stående forhåndsgodkendt nødvendige handlinger i det aftalte arbejde uden gentagne rutinespørgsmål; databevarelse og konkrete sikkerhedsgrænser består. Cron forbliver deaktiveret med uændret tidsplan indtil verificeret genopretning. Alle fem mål og fristen 18. oktober består. Tidligere status om afventende CLI-opstart er erstattet; øvrige historiske beviser bevares. Se håndbog 89.234 og privat checkpoint.

## 15. oktober — faktisk CLI-opstart i checkpoint-genopretningen

PR623 har bestået præcis Linux-, native-, source- og PostgreSQL-kontrol og er merget. Det er kildelevering, ikke en ny offentlig vejrgeneration. Det ene godkendte genopretningsforsøg gendannede de gemte cacher, men stoppede i selve programopstarten før DMI-originalhentning og cachegemning. En ventecirkel mellem CLI-modulets top-level await og den autentificerede læsers import af samme moduls planfunktioner er faktisk reproduceret uden driftsnøgler eller netværk.

Den afgrænsede lokale rettelse afslutter modulindlæsningen før den asynkrone CLI-kommando afventer læseren. Samme scope-, autentifikations-, original-, proces-, budget- og no-loss-kontroller består. Faktiske lokale underprocesprøver rammer nu de faste scope- og filsystemafslag i stedet for exit 13; en direkte funktionstest alene er ikke bevis for kommandovejen. Den nye præcise kildekontrol, faktisk originaltilgængelighed, ejet cachegemning/genbrug og efterfølgende checkpoint-beregning/upload/Pages/offentlig effekt er stadig åbne. Ejeren har stående godkendt nødvendige tilsvarende fejllæsninger, rettelser og kontrollerede genoptagelser inden for det samme eksisterende vejrforløb uden nye spørgsmål. Et nyt forsøg kræver en faktisk rettet årsag og beståede kontroller, ikke en blind gentagelse; data-, destinations- og sikkerhedsgrænser bevares. Cron forbliver deaktiveret med uændret tidsplan. Alle fem mål og fristen 18. oktober består; øvrige leverancer holdes tilbage. Tidligere status om en rent lokal PR623-kilde er erstattet på kildetrinnet, ikke på produktionstrinnet. Se håndbog 89.233 og privat checkpoint.

## 15. oktober — afgrænset genopretning af historiske DMI-originaler

De to nye normale vejrhentninger stoppede før deploy ved ny brug af gammel strøm i OWNER-historikken. Den gennemførte ældre RAW-audit fandt heller ingen mulige filer for de undersøgte manglende identiteter; det er ikke bevis for ugyldige DMI-data eller fravær i alle arkiver. Den godkendte næste vej er en særskilt, manuel genopretning fra det allerede autentificerede checkpoint: kun nødvendige historiske originaler, fuld kontrolsum, størrelse, officiel revision og model-/tidshoveder, additiv normal RAW-cache og fysisk afsluttet skrivning før normal ejet SAVE. Ingen nyere vejrdata, beregning, pruning, SQL eller deploy i genopretningen. Se håndbog 89.233.

Kilden er lokal, ikke installeret eller produktionsverificeret. Nye målprøver og uændret modelbinding er delbeviser; præcis Linux/native/source/PostgreSQL, faktisk originaltilgængelighed, cache-SAVE/genbrug og efterfølgende checkpoint-beregning/upload/Pages/offentlig effekt er åbne. Ejeren har igen godkendt levering efter kontrollerne og checkpoint-afprøvning med hensyn til nye gemte kørsler. Cron er deaktiveret af ejeren og faktisk kontrolleret i browseren; tidsplanen er uændret. Ingen blind tilbagerulning eller nødpolicy er aktiveret. Alle fem mål og fristen 18. oktober består; øvrige leverancer holdes tilbage. Ældre afventningsstatus nedenfor er historik på de konkret gennemførte trin.


## 15. oktober — faktisk manifestkontrol og én godkendt ældre cache

PR619 har faktisk bestået præcis Linux-, source- og PostgreSQL-kontrol og er merget. Den korrigerede skrivefri audit gennemførte normal baselinegenskabelse, fuld autentifikation og manifestoptælling. De ukvalificerede gamle strømoriginalers identiteter matcher ikke den undersøgte fortegnelse; forskellen i acquiredAt forklarer derfor ikke det aktuelle produktionsstop. Manglende manifestidentitet er ikke bevis for fysisk fravær, ugyldige DMI-data eller fejl i deres værdier. Den gennemførte audittilladelse er forbrugt.

Ejeren har særskilt godkendt præcis én anden, allerede gemt ældre RAW-cache sammen med det samme checkpoint. Den afgrænsede kilde til denne kontrol bevarer checkpointets egen identitet og vælger kun den ene faste ældre kilde gennem et eksplicit, som udgangspunkt tomt valg. Filtilstedeværelse er et separat default-OFF lstat-inventar: et 24-tegns filnavn og en størrelse er kun en mulig filkandidat, aldrig indholds-, sampling- eller admissionsbevis. Ingen RAW-fil åbnes, hashes eller afkodes. Næsten identisk nyere cache genhentes ikke.

Streng kontrol ved faktisk ny strømbrug, gamle originaler, historiske scorer, kildeprioritet, budgetter, SQL, admin/geometri og alle efterfølgende gates bevares. Lokal gennemgang fandt ikke en ændret identitetsalgoritme eller en dokumenteret OWNER-historikfejl, der tillader at fjerne kontrollen. Den ene nye providerfri produktionsgenoptagelse er fortsat ubrugt og må ikke sendes uændret på den afkræftede hypotese. Præcis kildekontrol, den nye godkendte aflæsning, en faktisk årsagsrettelse og ny offentlig generation er åbne. Alle fem mål og fristen 18. oktober består; 230/assistent og SOURCE19 forbliver tilbageholdt. Se håndbog 89.230 og privat checkpoint. Ældre afventende status er kun historik på disse konkret afsluttede punkter.

## 15. oktober — kildeleveret samme-originalrettelse og afvist checkpoint-diagnose

PR618 har faktisk bestået præcis Linux-, source- og PostgreSQL-kontrol og er merget. Det er kildelevering, ikke en ny offentlig vejrgeneration. Den ene skrivefri audit gendannede de præcise gemte pakker, men stoppede ved PROGRESS_AUTHENTICATION_REJECTED før manifest-/strømoptællingen. Dens engangstilladelse er forbrugt; ingen automatisk gentagelse.

Koden og den normale 673-dels migrationsprøve beviser forskellen mellem gammel og korrekt genskabt baseline. Den afgrænsede lokale auditrettelse er eksplicit og default-OFF og genbruger den normale, typesikre overgang i en ny privat midlertidig mappe. Originaler, målinger, historiske scorer, GCM og byteeksakt baselinekontrol bevares; forkert nøgle afvises fortsat. Den normale audit består 47 prøver og tre målrettede diagnoseprøver. De sidst additive original-/gentaget-outputassertions afventer præcis CI, ikke en ny stor lokal gentagelse. Den indre hosted årsag og faktisk manifestmatch er fortsat ubekræftede. Ejeren har nu givet det nye ja til præcis én gentagelse af samme gemte pakker efter rettelse og bestået kontrol; den er endnu ikke startet.

Den ene nye providerfri produktionsgenoptagelse er fortsat ubrugt. Ingen ny providerhentning, SQL, 230/assistent, SOURCE19 eller cronændring følger af denne auditrettelse. Ny beregning, holdbar gemning, upload, Pages og offentlig effekt skal bevises særskilt; alle fem mål og fristen 18. oktober består. Se håndbog 89.230 og privat checkpoint. Tidligere status nedenfor er historik på de konkret afsluttede punkter.


# RavRadar – bindende arbejdsinstruks

Denne fil skal læses før analyse, programmering eller versionsbygning.

## Nyt faktisk historikstop og bevaret checkpoint — 15. oktober 2026

Lokalstatus: Den afgrænsede samme-originalrettelse er nu materialiseret, og de normale planner-, originalmodtager-, bindings-, audit-/workflow- og dokumentationsprøver består. Auditten skelner autentiske, men policy-udelukkede eller allerede receipt-markerede originaler fra de ukendte rækker, som RAW-joinet faktisk vedrører. Metadata er ikke ny kildeautoritet. Hele den præcise Linux/native/source/PostgreSQL-kontrol, faktisk manifestårsag, sikker levering og offentlig virkning er fortsat åbne.

Den seneste providerfri genoptagelse gennemførte autentificeret restore, DMI-cachetrinnet med ærlig PARTIAL og gemte reservekontroller, men stoppede ved ny brug af ukvalificeret gammel strøm i OWNER-historikken. Nyt krypteret fremskridt blev faktisk gemt; beregningsoriginaler, publicering og Pages blev ikke leveret. Tidligere lokal-/afventningsstatus nedenfor er historik alene på de konkret gennemførte trin. Fejlen er ikke den tidligere PUBLIC-kalder.

Et normalt, rent manifestjoin er lokalt reproduceret rødt: identiske officielle originalbytes med kun et andet gyldigt acquiredAt får intet job. Reparationssporet skal bevare begge fulde captures og bruge den faktiske ejede RAW-capture til ny kvalifikation; ingen gammel original eller tidsangivelse ommærkes. Om netop denne forskel forklarer produktionsstoppet, er endnu ikke bevist. En særskilt default-OFF skrivefri audit må efter præcis kildekontrol genlæse den nøjagtige gemte RAW-cache og autentificerede fremskridt og rapportere kun faste matchantal; helt cache-restore er ikke det samme som rå GRIB-analyse. Ingen providerhentning, cache-SAVE, replay, score eller deploy i auditten.

Ejerens nyeste direkte ordre giver efter rettelse og nødvendige kontroller én ny genoptagelse uden vejrhentning, helst fra det nye checkpoint og samme oprindelige target. Den er endnu ikke brugt. Streng ny strømbrug, kilderegler, ægte originaler, no-loss, 220-floor og alle efterfølgende databevarelses-/deploygates består. Faktisk årsag, præcis Linux/source/PostgreSQL, sikker levering og ny offentlig effekt er åbne; 230/assistent og SOURCE19 holdes tilbage. Alle fem mål og fristen 18. oktober består. Se håndbog 89.230 og privat checkpoint.

## Godkendt checkpoint-genoptagelse — 15. oktober 2026

Ejeren har nu konkret godkendt, at korrekt færdiggemt, men delvis DMI i checkpoint-only kan fortsætte med checkpointets gemte reservekilder. Kun denne mode får PARTIAL efter fuld gemning; ready=false, kildeledger, originaler og tidligere aktive DMI-data bevares. Udskudt eller utilgængelig nødvendig historik, replay-/gemmefejl og bootstrapkonflikt stopper fortsat. Der hentes ikke nyt vejr, og alle efterfølgende beregnings-, databevarelses- og deploykontroller består.

Kilden er lokalt sammenført med main615 og bevarer dens faktisk Linux-verificerede processtoprettelse samt begge dokumentationshistorikker. De målrettede routing-, workflow- og originalmodtagerprøver består; Windows-provenanceprøven passerede de nye terminalprøver, men stoppede senere på den eksisterende native-læsegrænse. Ny præcis samlet Linux/source/PostgreSQL-kontrol og faktisk genoptagelse/offentlig effekt er endnu åbne. Vejrfloor220 bevares; 230/assistentinstallation og SOURCE19 aktiveres ikke. Alle fem mål til 18. oktober består. Ældre afventende tilladelses- og leveringsudsagn nedenfor er historik på disse konkrete punkter.

## Separat SAVE-kildekandidat — 15. oktober 2026

Den normale cachegemning skal også stoppe sine egne underprocesser, hvis den styrende action-proces forsvinder brat. Den afgrænsede kandidat overvåger den allerede verificerede forælder gennem et kernel-håndtag og bevarer fysisk gruppeafslutning, første fejl, originalfiler og privat skrivelås. Den nye normale Linux-prøve dækker action-SIGKILL, ikke ødelæggelse af hele runneren. Lokale syntakskontroller er ikke native-, upload- eller produktionsbevis.

Dette er et selvstændigt kildespor fra faktisk main 213942 efter PR613, ikke kopiering eller aktivering af den isolerede SOURCE19-revision. Produktbladet er særskilt registreret som producentkilde, men indgår ikke i den faktiske gemmekontrakt: den bruger den uændrede storage-ABI. Den normale beregning bekræfter uændrede fullRuntime-, publicProjection- og continuationState-kontrakthashes. Der kræves derfor ingen ny model-/SQL-/lagringsovergang for denne procesrettelse; gamle originaler og kontraktbeviser må ikke ommærkes. Model-/scorebindinger, SQL, fd3-kommunikation, kildeprioritet, administratorpunkter og budgetter bevares. Normal præcis kilde-/Linux-kontrol, sikker levering og faktisk effekt er åbne. Checkpoint-PARTIAL, 230/614-installation, fuld revision og alle fem mål til 18. oktober er fortsat særskilte åbne krav. Se håndbog 89.232.

## Lokal statistikpræference 4.0.577 — 15. oktober 2026

Denne kildekandidat følger efter offentlig 4.0.576 og før den særskilt bevarede assistent578. Beskyt nyere OFF mod forsinket ON gennem serverens kontobundne revision; ukendt skriveudfald må ikke vises som gemt. Se håndbog 89.219. Lokal kilde er ikke installation, anonym statistik eller aktiveret retention.

## Aktuel kritisk grænse — strømhistorik og genoptagelse, 14. oktober 2026

Aktuelt 15. oktober — genoptagelse fra checkpoint: PR612 er merget på main6b3e0262 efter grøn source-, Linux- og PostgreSQL-kontrol, uden ny vejrhentning eller offentlig generation. Den lokale checkpoint-only-mode låser oprindelig target og lukker providerindgange; standardforløbet er uændret. Lokale prøver og åbne Linux/native/source/PG-/produktionsgrænser er præciseret i håndbog 89.230 og er ikke leveringsbevis. Alle fem mål er åbne med frist 18. oktober; SOURCE19, KB og statistik forbliver inaktive. Ældre status nedenfor bevares som historik.

Aktuelt 15. oktober: PR610 er kildeleveret efter præcis CI inklusive Linux og PostgreSQL. Den næste genoptagelse stoppede før vejrhentning på miljøtimens Z/.000Z-format. Den normale 673-dels CLI-prøve har reproduceret fejlen og består efter en snæver miljønormalisering, inklusive fem ugyldige input og originalbevarelse. Den lille kildegate består lokalt; ny præcis CI, levering og offentlig effekt er åbne. Tilstands- og originalkrav, version, SQL, model og SOURCE-afgrænsning er uændrede. Se håndbog 89.230; ældre status nedenfor er erstattet kun på disse punkter.

Den tidligere PUBLIC-sammeoriginalrettelse og præcise fulde fremskridtsvalg er kildeleveret efter faktisk Linux-/PostgreSQL-kontrol. Den efterfølgende normale vejrhentning stoppede imidlertid i kystdelens strømhistorik, før nogen ny offentlig generation blev leveret. Det nye stop er ikke den tidligere PUBLIC-kalder. Streng kontrol ved faktisk ny strømbrug består; tilgængeligheden af de nødvendige historiske råfiler er endnu ukendt.

Den lokale normale kystdelshistorik-/behovsprøve består med 70 prøver uden skip. Historikplanen følger den faktisk valgte tilstand og historiske strømendepunkter og normal bro, ikke et fast vægursvindue. Ægte kildeledger, reservekomplement, originaler og alle no-loss-grænser skal bevares. Den strøm-only historiske cachelæsnings kilde har nu første faktisk beståede Linux-nativekontrol på ca827; samlet source og PostgreSQL er fortsat åbne. Nyt samlet kildebevis, sikker levering, kapacitet, ny offentlig effekt og alle fem mål med frist 18. oktober er åbne. Se håndbog 89.230. Ældre fronter er kun erstattet på disse præcise statuspunkter.

Den historiske strøm-only cachelæser har nu sin første faktisk beståede Linux-nativekontrol på PR610-head ca8273d58fb37 i CI 38644100696/1. Den normale native-wrapper og alle syv obligatoriske native-underprøver er gennemført, herunder ejet læselease, procesafslutning, EOF, tilbagerulning og historisk genbrug. Den regionale normale prøve og den nationale producentkæde består lokalt med 673 dele og 118 timer gennem CLI til JavaScript. De tilknyttede lokale Open-Meteo- og kontrolprøver består efter præcis rettelse af prøveinput-headeren for otte mål; de oprindelige fejl bevares. Det er lokale/syntetiske input, ikke bevis for providerdata, national produktionsdrift eller hård databevarelse i næste faktiske generation. Den private 72-timers-/51-timersbehovsbro mapper højst 127 rækker med højst to eksisterende 121-timersvinduer. Tre private slutstøttetimer bevares til den uændrede scalar-T+3-sanitizer; offentlige 118 timer og det normale 121-timersunderlag ændres ikke. Den normale lokale 673-dels CLIprøve består også med nøgleomordnet input og eksklusiv outputoprettelse. Status 15. oktober: Den samlede source-kontrol i samme CI fejlede i fem kontroller; De efterfølgende trin 15–19, herunder PostgreSQL-kontrollen, blev derfor ikke kørt. De afgrænsede lokale kildekompatibilitetsrettelser bevarer ægte gamle kildepins, updaterens fulde historiske kildeinverse og alle gamle model-/SQL-/ABI-grænser. Den normale updater-indgangsprøve består lokalt 21/21 uden skip; første værtsfejl er bevaret, og ingen produktguard er lempet. Ny samlet CI på det rettede præcise head, PostgreSQL, sourceproof og sikker offentlig levering er fortsat åbne; det første native-PASS er ikke samlet CI- eller produktionsbevis.

## Aktuel kritisk afgrænsning — 14. oktober 2026

PR #606 er kildeleveret, men den efterfølgende normale vejrhentning stoppede ved faktisk strømbrug før offentlig levering. Bevar den strenge strømguard. Den snævre PUBLIC-rettelse må kun prioritere en kvalificeret genfortolkning af de samme hele originalbytes for alle faktiske endepunkter; den normale zonemap er autoritet, ikke manglende zonefelter i en part-række. Historisk replay, gyldige originaler og almindelig kildeprioritet bevares. Præcist krypteret fremskridtsgenbrug i det fulde normalforløb kræver stadig faktisk GCM-restore, autentisk baseline/admission og uændrede budgetter/original-/ny-time-gates. Lokale mål er nu bestået efter faktisk afklaring af sandboxens filgrænse; Linux/Bash, præcis CI og produktion er særskilt åbne. Se håndbog 89.229 og privat checkpoint. Alle fem mål er åbne med frist 18. oktober; de eksisterende tilladelses- og writer-grænser består.

## Obligatorisk rækkefølge
1. Læs `docs/ai/CODEX_START_HERE.md` og derefter `docs/rdks/00_READ_FIRST.md`, `01_AI_OPERATING_RULES.md`, `90_INDEX/CURRENT_TRUTH.md` og `90_INDEX/IMPLEMENTATION_STATUS.md`.
2. Læs relevante aktive krav, beslutninger og kendte issues.
3. Læs relevante håndbogsafsnit og verificér dem mod aktuel kode.
4. Sammenhold nye ønsker og gamle chats med nyere beslutninger og faktisk kodeadfærd.
5. Gamle chats er historiske kilder. De giver aldrig i sig selv tilladelse til kodeændringer.

## Automatisk versionspligt
Ved enhver ny version skal assistenten uden særskilt påmindelse:
- indarbejde samtaledeltaet siden seneste ZIP i RDKS,
- opdatere implementeringsstatus og åbne issues,
- opdatere changelog,
- opdatere relevante dele af både Markdown-håndbogen og webhåndbogen,
- markere hvad der er erstattet, forkastet eller fortsat uklart,
- og køre RDKS-validering samt relevante tests.

Ejeren har stående godkendt, at topversionsfeltet i `data/kystdata.json` og `data/zones.geojson` automatisk følger den reelle releaseversion. Codex skal derfor ikke bede om en ny særskilt godkendelse til en ren versionsfeltsynkronisering. Før commit skal en særskilt diff bevise, at kun versionsfeltet er ændret; enhver anden ændring af geodata, zoner, geometri eller land-/vandpunkter falder uden for godkendelsen og skal stoppe releasen.

En version må ikke afleveres, hvis projektets hukommelse stadig beskriver en tidligere version eller mangler væsentlige beslutninger fra den aktuelle samtale.

Ved konflikt gælder: brugerens aktuelle instruktion > aktiv RDKS-beslutning > verificeret aktuel kodeadfærd > håndbog > changelog > gamle chats.

## Omkostningsbevidst testmatrix
- Under udvikling køres kun målrettede tests for den berørte kontrakt samt nødvendige versions- og RDKS-kontroller.
- Den fulde validate:source skal bestå én gang på PR'ens eksakte head i GitHub. Lokal gentagelse er kun nødvendig ved bred/tværgående risiko, manglende CI eller konkret fejlevidens.
- Almindelige rettelser deployes efter DEC-0148 som kode-only med eksakt genbrug af senest gyldige data og uden ekstern vejrhentning. Normal vejrhentning følger som et særskilt, tidsbegrænset forløb.
- Den tidlige kildekodegate køres på ny eller uverificeret main-kode. Vejropdateringer, også cron-/watchdog-dispatch og manuelle genkørsler, må genbruge et live-verificeret grønt source-step på præcis samme main-commit. Senere fejl, ændret run-attempt eller ukendt evidens kræver ny kontrol; en cachemarkør alene er aldrig bevis. Se DEC-0045's tillæg 2026-09-04.
- Hvert artifact med frisk produktionsdata skal efter DEC-0184 køre den faste 52-blads artifactgate, tre version-/modelbindingskontroller og de selvstændige runtime-, Supabase-, checkpoint-, privacy-, artifact- og deploytrin. Efter DEC-0193 samles fund i de uafhængige normale driftskontroller uden alene at blokere ellers gyldige friske prognoser; hårde target-/main-, private-state-, artifact-, privacy- og deploygrænser består. De øvrige fulde/historiske suites køres målrettet eller periodisk, ikke efter hver vejrindsamling. Et kode-only artifact følger fortsat DEC-0148.
- Fuld 210/673-browserkontrol køres ugentligt eller efter relevante ændringer i UI, score eller offentlig datakontrakt. Små afgrænsede ændringer får målrettet kontrol.
- En kendt fejl eller konkret modstridende evidens i den berørte produktionsflade kræver målrettet kontrol og må ikke skjules. En forældet eller historisk test uden betydning for artifactet registreres og rettes uden at blokere normal produktion. Se DEC-0184.

## Codex og systemisk arbejdsmodel
- `docs/ai/CODEX_START_HERE.md` er obligatorisk indgang for Codex.
- Tænk hele brættet: en fejl i én test/zone er et symptom, indtil input, central admin-konfiguration, scheduler, cache, DMI/GRIB, provenance, score/state, public runtime, UI, tests og deployment er gennemgået.
- Kald aldrig en baseline stabil på baggrund af lokal validering alene, når ændringen afhænger af DMI, Supabase eller produktionspipeline.
- Administratorens centralt gemte redigerbare data er runtime-sandhed og må ikke erstattes af historiske hardcodede værdier.

## Bindende model- og kvotestyring
- Kvalitet kommer før kvotebesparelse. Før hvert væsentligt arbejdsafsnit vurderer Codex ræsonneringsbehov, kodebasebredde, fejlkonsekvens og påvirkning af RavScore, faglig model, DMI/fallback, dataintegritet, arkitektur og produktion.
- Før hvert nyt arbejdsafsnit skal Codex også vurdere og tydeligt anbefale den nødvendige **Indsats** i brugerfladen. Hvis den aktuelle indsats er for lav, skal Codex bede ejeren skifte før det kritiske arbejde starter. `Let` er kun til simple tekstrettelser, status og helt mekaniske opgaver; `Høj` er normal RavRadar-udvikling; `Ekstra høj` kræves som udgangspunkt til kystgeometri, land-/vandpunkter, DMI, RavScore, ukendt rodårsag, systemiske regressioner og slutvalidering; `Ultra` reserveres til de vanskeligste kvalitet-først-analyser, hvor merforbruget er begrundet.
- GPT-5.6 Sol bruges som udgangspunkt til kritisk analyse, ukendt rodårsag, forskning, RavScore/fysisk model, komplekse regressioner, arkitektur, DMI-/forecast-/cache-/fallbacklogik og endelig validering af større ændringer.
- Når en aktuelt tilgængelig billigere model kan levere samme nødvendige kvalitet, skal Codex stoppe før hovedarbejdet, anbefale den konkrete model og kort begrunde valget. Codex skal tilsvarende stoppe og bede om skift tilbage til Sol, før næste kritiske del.
- Ved reel tvivl vælges Sol. Kvoteudløb må aldrig medføre, at analyse, forskning, tests eller validering springes over.
- Ved kvotepause skrives et permanent checkpoint med evidens, konklusioner, afviste/åbne hypoteser, ændringer, tests, resterende arbejde, næste trin og anbefalet model.
- Den planlagte videnskabelige RavRadar-/RavScore-analyse udføres som udgangspunkt med Sol. Billigere modeller må kun udføre afgrænsede støtte- eller rutineopgaver uden kvalitetsrisiko. Se DEC-0031.

## Midlertidig Codex-overgangstilstand 2026-08-07
- Dette afsnit beskriver den historiske 4.0.117-overgang. Kravet om fuld validate/releasegate efter hver vejrbygning er supersederet af DEC-0184; kravet om reelle data-, privacy-, artifact- og deploygates består.
- Den nuværende 4.0.117-handoff er en **bootstrap til Codex**, ikke en ny dokumenteret stabil release.
- GitHub-workflowet har en kendt alvorlig gate-fejl: almindelige `workflow_dispatch`-vejropdateringer kan bygge og deploye, selv om `npm run validate` og `npm run release:gate` springes over. Et grønt automatisk run er derfor ikke i sig selv releasebevis.
- **Første kodeopgave i Codex:** ret workflowet, så ethvert nyt produktionsartifact/deploy, der bygger frisk produktionsdata, ikke kan passere uden de relevante fulde gates. Bevar muligheden for billigt preflight-skip, når der slet ikke bygges/deployes nyt artifact.
- Første strenge post-fix-kørsel skal bruge den aktuelle `main`-kode og den senest centralt gemte admin-geometri. Først når den fulde kæde inkl. `npm run validate` og `npm run release:gate` faktisk har kørt og er grøn, må baselinen kaldes stabil/produktionsverificeret.
- Denne overgangspakke må **ikke** selv ændre de eksisterende workflow-gatebetingelser; det er bevidst udskudt til den første Codex-session, så Codex kan ændre, teste, committe og verificere rettelsen direkte i repositoryet.

## Permanent PR- og mergeautoritet
- Codex må oprette og opdatere korte, datasikre Pull Requests fra RavRadar-branches, som Codex selv har pushet.
- Codex må merge disse PR'er til `main` uden særskilt ejergodkendelse, men kun efter selvstændig verifikation af alle relevante tests, release-gates, regressioner, dataintegritetskrav, produktionskontrakter og nødvendig RDKS-/håndbogs-/changelogdokumentation.
- En grøn GitHub-status er aldrig tilstrækkelig, hvis konkret evidens viser en fejl eller væsentlig usikkerhed. Røde eller uafklarede gates må ikke omgås; fejlen skal undersøges eller rettes før merge.
- PR-tekst og commits må ikke indeholde secrets, credentials, private produktionsdata, komplette diagnostikpayloads, U/V-værdier eller andre følsomme oplysninger.
- Efter en sikker merge skal Codex følge deployet, verificere den mergede commit og relevante produktionsresultater og fortsætte til næste ikke-blokerede roadmap-punkt.
- Irreversible, usædvanligt risikable eller destruktive merges samt beslutninger uden for allerede godkendte RavRadar-krav kræver fortsat ejerens udtrykkelige godkendelse.

## Lokal Codex-klargøring og kildekontrol
- På en frisk Windows/Codex-runtime køres scripts/setup-codex.ps1 én gang. Scriptet installerer projektets tre eksisterende Python-afhængighedssæt og ændrer ikke repositorydata.
- Før en kilde-PR køres den lille produktkritiske sourcegate målrettet. Den kræver ikke central adminhydrering eller frisk produktionsdata.
- Sourcegaten erstatter ikke DEC-0184s post-data artifact-, modelbinding-, runtime-, privacy-, Supabase- og deploybevis. Den fulde validate/releasegate bevares til målrettet eller periodisk brug. Kode-only rettelsesdeploy følger DEC-0148 og beviser eksakt genbrug og artifactintegritet.
- Midlertidige runtime-shims skrives kun i systemets temp-mappe og må ikke stages.
