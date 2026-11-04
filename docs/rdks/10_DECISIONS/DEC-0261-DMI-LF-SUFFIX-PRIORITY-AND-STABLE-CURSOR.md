## 4. november — scalarplanens tidsforbrug før DMI

I den almindelige vejrhentning nåede den lokale scalarplan sin fælles 120-sekundersgrænse. Budgetkontrollen opdagede overskridelsen ved indgangen til PART_RETENTION. Loggen målte hele planlæggerens tid, så tallet viser ikke tidsforbruget for kystdelstrinnet alene. Den særskilte CURRENT-plan bestod, mens DMI fortsatte med den konservative prioritering. En senere CURRENT-plan før Copernicus bad kun om strømgrundlaget. Dens melding om manglende scalarplan hører til den separate indgang.

På samme syntetiske landsprøve nåede den stærkere DMI-fil alene alle 673 kystdele, men den samlede plan stoppede efter cirka 195 sekunder da den fælles frist blev kontrolleret ved indgangen til den offline Copernicus-verifikation. De 195 sekunder er hele kalderens tid. Der blev ikke skrevet en plan. Den samlede kandidat med ni produktfiler genbruger de samme kontrollerede tidsakser, undgår overflødigt arbejde og samler behovene efter den normale offline kontrol af reserverne.

Den samlede kandidat gav det forventede planoutput byte for byte på den eksisterende 210/673-prøve på cirka 81 sekunder. De gamle forløb nåede ikke at skrive en plan. Ligheden gælder den gemte forventning for prøvepakken, og faktisk drift skal måles i en almindelig vejrhentning.

Rækkefølgen DMI → Copernicus → Open-Meteo, kildevalg, originalkontrol, scoreformel og de 120 sekunder bevares. Det normale krav om nye sammenhængende kilde- og modelbindinger, autentificeret førskrivning og efterfølgende offentlig kontrol gælder fortsat. Levering og faktisk dækning er åbne.

Den lokale 4.0.597-kandidat bruger normal overgang fra autentificeret 594 ved en nyere hel prognosetime. Den første almindelige kørsel bruger den eksisterende overgang for historisk vedligeholdelse og kører uden den nye scalarplan. Den efterfølgende almindelige integrerede vejrhentning skal vise, om planen holder tidsgrænsen og forbedrer dækningen. Sammenlign alle forventede timer og zoner for hver af de fem vejrfamilier, og opgør prognosehalen og bevarede fælles timer særskilt.

De 118 offentlige prognosetimer understøttes af 121 private timer. De sidste tre bruges til at vurdere vandstandsændringen tre timer frem fra den centralt valgte vandstandskilde. Manglende støtte giver fortsat en manglende værdi. De syv kystzoner kan fortsat bruge dkss_lf til vandstand alene. dkss_lf-strøm, tilhørende strømhukommelse og vandtemperatur er fortsat udelukket i de zoner.

## Lokal kandidat 4. november — komplet DMI-katalog ved samlingens første tur

I en almindelig udvidet vejrhentning kan den første tur for en DKSS-samling kontrollere kataloget én gang mere, hvis der er plads inden for den eksisterende tid og downloadgrænse. Kontrollér kun en faktisk manglende ydertime med V1-strømplanen eller den kvalificerede V2-plan for vind, vandstand og vandtemperatur. En ukendt V2-plan angiver ingen verificerede huller for disse tre komponenter. De eksisterende kilde- og zonegrænser gælder for hver komponent.

Et komplet nyere modelkatalog skal fortsat være kausalt ved det låste starttidspunkt og bevare det tidligere udbud, de eksisterende originale kildebeviser og den regionale plan. Den private vandstandsstøtte til T+3 kan begrunde en katalogkontrol, selv når alle 118 offentlige timer er på listen. Kun faktisk manglende støttetimer optages via den normale private støtterute. Den offentlige prognosehorisont og de eksisterende prioriteter bevares. Med normal sekstimers kadence og +120 timers modelrækkevidde kan en nyere model normalt ikke levere de sidste støttetimer, når den gamle liste allerede dækker alle 118 offentlige timer. Næste model vil da ligge efter den låste starttime og bliver afvist.

Kørsel 249 fastholdt det første katalog. NSBS startede efter det normale udgivelsesvindue for næste model, men kørslen dokumenterede ikke et senere tilbud. Den lokale prøve bruger dette tidsforløb med syntetiske data. Faktisk katalogtilbud, behandling og offentlig dækning skal måles særskilt. Kendte huller inden for den gamle kataloghorisont hører fortsat til den almindelige prioritering.

## 2. november — normal scalarplan med begge kendte kontinuitetsformater

Den normale producent gemmer native strømhistorik som schema2. Før-DMI-kalderen skal tillade både schema1 og schema2, før den normale læser vurderer de gemte komponenter og planlægger reelle vejrhul.

Den tidligere selector tillod kun schema1, selv om den normale producent allerede udstedte schema2 og den efterfølgende læser accepterede begge. Derfor kunne en almindelig gyldig genlæsning springe den nye plan over. Den afgrænsede rettelse udvider kun denne formatkontrol til de to kendte værdier. Alle øvrige almindelig-genlæsning-, model-, bindings- og særforløbsvagter bevares; ukendte formater giver fortsat ingen adgang.

Den samme normale testcase er rød før og grøn efter rettelsen: producentens faktiske schema2 går gennem workflowets selector, Node-planen, den offline reservekilde og Python-/DMI-læseren. Hele de gamle workfloworakler og afslag på ukendt format eller ændret helfil bevares. Et særskilt, eksakt helfiltrin fører schema1/2-ændringen tilbage til den ægte forgænger, før den gamle scalarprøve læser den. Den nye helfil og ændrede eller ukendte varianter prøves særskilt; gamle forventninger ændres ikke. Det er ikke bevis for, at alle øvrige vagter var opfyldt i en bestemt produktionskørsel, eller at leverandørerne har alle manglende timer.

DMI → Copernicus → Open-Meteo, hentebudgetter, originaler, cache, scoreformel, modelbindinger, administratorpunkter og geometri ændres ikke. Den konkrete ændring bruger den normale fulde kildevej; kontrolregistret udvides ikke for at gøre kandidaten målrettet. Native- og databasegenbrug afgøres fortsat af den normale læser på faktiske uændrede input og runtime. Præcis GitHub-kvalifikation, sikker levering efter writer og faktisk ny offentlig effekt er åbne.

# DEC-0261 – Samme DMI-prioritet ved Limfjord-omplanlægning

**Dato:** 2026-09-28
**Status:** Implementeret på main i 4.0.509; produktionskæden bestod,
men den tilsigtede sen-LF-vandstand er ikke bevist.

## Måletillæg 2026-10-24

Før yderligere prioriteringsændring registreres hver samlings første faktiske kø med klassifikationens begrundelse og turens startmarkør. Rapporten ændrer ikke sorteringen og er ikke bevis for hele jobbets starttilstand, senere restkøer eller faktisk samlet dækning. Kritiske filer kan være native opgraderinger; markeringen er ikke i sig selv et tomt vejrhul. Den eksisterende prioritering, stabile cursor, originalkontrol og krav om faktisk dækningsmåling består. Den afgrænsede lokale kilde og målprøve er ikke en ny offentlig driftsobservation.


## Produktionsmåling 2026-09-29

Normalrun `36478379298` på den mergede kode bestod cache,
no-loss, fulde gates, beskyttet gemning og Pages. Syv berørte
Limfjordszoner havde fortsat kun 67/118 vandstandstimer og var
uændrede på alle 114 fælles timer mod forrige pakke. Derimod fik
131 andre zoner 12 ekstra fælles vandstandstimer hver. Dette
beviser, at workflowet og DMI-vandstand kan gøre fremskridt, men
ikke at den ændrede restkø faktisk hentede senere LF-værdier.
Den eksakte native katalog-/afvisnings-/interpolationsårsag skal
måles før yderligere kodeændring. Beslutningen om DMI-first og
centralt valgte vandstandskilder består.

Den normale firetimershentning skal fortsætte med at udfylde reelle
mangler før den opgraderer allerede gyldige reserveværdier. For
`dkss_lf` gælder dette både den første plan og en genberegnet restkø,
når regionale input ændrer sig. En omplanlægning må ikke flytte den
lagrede rotationsmarkør under samme samlingstur: markøren fra turens
start bestemmer rækkefølgen, mens hvert faktisk forsøg stadig gemmer
en ny markør til **næste** tur. De tre første kritiske timer forbliver
først. Kildeaccept, U/V-dybdevalg, DMI-only-vandstand, central
interpolation, gyldighed og no-loss ændres ikke.

To normale runs viste, at forsøgte Limfjord-timer gik kronologisk:
`36421101118` behandlede 31 timer fra 28/9 kl. 12 UTC til 29/9 kl.
18 UTC; `36450204193` behandlede 36 timer fra 28/9 kl. 16 UTC til
30/9 kl. 03 UTC. Den seneste offentlige pakke havde vandstand i
Limfjordsdelene kun til prognosetime 70, mens andre dele nåede time
93. Dette er observation, ikke bevis for at leverandøren mangler
senere filer. Kodegennemgang viste to lokale fejl i restkøen:
`criticalPriority` blev ikke ført med, og den senest forsøgte time
blev genbrugt som sorteringspivot i stedet for turens startmarkør.
Begge adfærd er reproduceret mod den aktuelle produktionssortering.

4.0.509 samler de to planlægningssteder om én adapter, så
komponentprioriteten følger begge, og bruger turens uændrede
startmarkør ved restkøsortering. Måltesten kræver, at et faktisk
vandstandshul går før en allerede dækket havstrømsopgradering, og
at restkøen efter første forsøg fortsætter ved den ubetjente sene
horisont. Den kræver også, at begge produktionskald bruger adapteren
og startmarkøren. Lokal test alene beviser ikke reel senere DMI-
dækning: normalt run, cache/no-loss, Supabase/R2/Pages og offentlig
femfeltskontrol afventer. PR #475 bestod exact-head source-CI `36476446904`
på `4f61ff84` og blev merged som `9fcd996f`; den planlagte
firetimerskørsel skal stadig give det nødvendige livebevis. Hvis
den senere vandstand stadig mangler, skal
faktisk leverandørkatalog, afvisninger og adminvalgte kilder måles
før en ny ændring; en reservekilde aktiveres ikke på formodning.

DEC-0251's oprindelige rotationsintention og DEC-0257's
firetimerskadence består; dette er en rettelse af deres konkrete
implementering, ikke en ny score- eller vejrmodel.

## Teknisk tillæg 2. november 2026 — lokale normale komponentbehov

Den samlede lokale DMI-kandidat skelner reelle mangler fra allerede dækkede timer med manglende native opgradering. Den genbruger den normale bevarede femkomponentfortolkning og centrale SOURCE-vandstandsrouting før DMI. Per-PART-mangler, TREND ved T og privat T+3 bevares, og den eksisterende parameter-/zoneadgang afgrænser hver samlings prioritet og ekstra feltlæsning. Ukendt kontekst beholder den konservative native vej.

Otte relevante normale lokale kaldere består på den faktiske samlede kandidat. De tidligere hele workflow-orakler er bevaret gennem én præcis inverse; de to manglende almindelige kildekalderindgange er tilkoblet uden dobbelt udførelse. Præcis GitHub-kontrol, sikker merge og målt effekt i en ny almindelig generation er åbne. Ingen ny version, C/I/T, SQL, geometri, scoreformel, kildeprioritet eller tidsbudget. SOURCE forbliver særskilt og inaktiv. Aktuelle kørsler og private måletal føres kun i checkpointet. Se DEC-0261 og håndbog 89.294.
