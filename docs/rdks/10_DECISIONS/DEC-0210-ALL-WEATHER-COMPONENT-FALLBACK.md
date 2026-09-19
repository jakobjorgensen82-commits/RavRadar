# DEC-0210 – Reservekilder skal udfylde alle nødvendige vejrtyper

**Status:** Aktiv ejerbeslutning; samlet implementering er lokal, driftsbevis mangler
**Dato:** 2026-09-19
**Grundlag:** Ejerens aktuelle korrektion under helhedsanalysen af 4.0.429

## Seneste kildeafgrænsning 19/9 – vandstand er kun DMI

Ejeren har under implementeringen præciseret: »men ift vandstand, der skal
vi kun bruge dmi synes jeg.« Dette erstatter nedenstående tidligere krav
om CP/OM-reserve for vandstand, ikke reservekæden for de øvrige vejrtyper.

- Absolut vandstand og den afledte tre-timers ændring bruger kun gyldig,
  kvalificeret DMI. Ændringen kræver sammenlignelige DMI-værdier præcis
  tre timer fra hinanden; nødvendige støttepunkter H118–H120 bevares.
- Ny gyldig DMI erstatter gammel. Ved et hul bevares gamle gyldige
  DMI-værdier for samme sted/tid. Mangler også disse, markeres feltet
  MISSING, uden at resten af siden gøres ubrugelig.
- Copernicus/Open-Meteo må hverken hentes som vandstandsreserve eller
  komme ind gennem gamle reserve-cacher, scoreadapter eller offentlig
  visning. 96-timersundtagelsen giver ikke reserveadgang til vandstand.
- CP/OM-datumomregning er dermed ikke længere et implementeringskrav eller
  en leveringsblokering. Fuld DMI-vandstandsdækning er fortsat målet;
  dette er ikke tilladelse til at kalde huller komplette.
- Vind, bølger, strøm og vandtemperatur følger uændret den øvrige aftale.

## Selvkørende normaldrift uden Codex

Almindelige vejrkørsler skal kunne drives af cron/GitHub alene. Codex må
ikke være en nødvendig kontrollør, retry-mekanisme, cachekopierer eller
manuel igangsætter mellem hvert run. Dette er et acceptkrav til den
samlede rettelse, ikke blot en senere driftsopgave.

Ejeren har yderligere præciseret, at løbende Codex-abonnement ikke er en
økonomisk mulighed; højst et omtrent årligt eftersyn kan være realistisk.
Design derfor til mindst mulig nødvendig vedligeholdelse: ingen AI-agent
eller lokal computer i den daglige kritiske driftskæde, genbrug eksisterende
GitHub/Supabase-drift frem for nye overvågningsabonnementer, afgrænsede
ressourcebudgetter og en kort dansk driftsvejledning. Nye lag kræver en
konkret driftsgevinst, ikke blot flere checks. En kortvarig leverandørfejl
skal ikke udløse manuel babysitning eller en strøm af ens fejlmeldinger.
Et årligt eftersyn er et designmål, ikke en garanti mod eksterne API-,
konto-, kvote- eller sikkerhedsændringer, der kan kræve tidligere handling.

- Midlertidige provider-/Supabase-fejl får afgrænsede automatiske retry.
  Budgetudløb gemmer fremgang og rotation; næste planlagte run fortsætter.
- Faktisk kvalificerede data og valgte komponenter skal kunne gendannes på
  en ren GitHub-runner. En fil/recordmarkør alene må ikke undertrykke
  genhentning, hvis dens nødvendige originaldata mangler eller er korrupte.
- Resterende huller sendes videre i den almindelige reservekæde. Gyldige
  gemte søskendefelter og resten af siden bevares ved et lokalt problem.
- Deploy og central afslutning skal følges korrekt til ende. Allerede
  offentliggjorte data må ikke efterlades i en permanent ventetilstand,
  som kun Codex kan rydde. Diagnostiske fejl følger gældende advisorypolitik;
  kildeautoritet, dataintegritet og privacy må ikke forfalskes.
- Udløb af GitHubs midlertidige hjælpefiler, herunder de omtalte 14-dages
  artifacts, må ikke efterlade en afbrudt overgang permanent låst. Nødvendig
  afslutningsevidens skal bevares beskyttet, så længe overgangen er uafsluttet,
  eller kunne genskabes fra tilsvarende betroede, varige kilder. Forlænget
  retention alene er ikke en løsning. Oprydning må først fjerne beviserne,
  når overgangen er afsluttet eller sikkert erstattet. Dette gælder også
  på en ren runner uden Codex; manglende beviser må ikke blot ignoreres.
  Almindelig ACTIVE/samme-binding maintenance opretter ikke PENDING;
  rettelsen skal målrettes de overgange, der faktisk bruger genoptagelsen.
- Status skal skelne kortvarig retry, udskudt arbejde og vedvarende mangel.
  Vedvarende problemer skal give en forståelig, handlingsrettet melding;
  grønt deploy må aldrig beskrives som fuldstændigt vejrgrundlag.
- Normaldrift skal bevises gennem flere almindelige kørsler, inklusive
  ren runner/genstart og et vinduesskift, uden manuelle mellemhåndgreb.
  Lokale helpertests eller Codex-overvåget succes er ikke dette bevis.

Cron aktiveres ikke alene fordi kravet nu er præciseret. Den aktuelle
produktionsblokering og de historiske kørsler skal stadig håndteres i den
aftalte leveringsrækkefølge.

## Seneste forslag under afklaring – 96 timer fra DMI-prognosens modelrun

Ejeren har efter sidste-døgn-forslaget spurgt, om det er bedre at tillade
reserveovertagelse, når DMI-data er fire døgn gamle. Assistentens anbefaling
er ja som en mere entydig prioriteringsregel, ikke som en dokumenteret
meteorologisk kvalitetsgrænse. **Nedenstående sidste-døgn-design er derfor
et tidligere forslag og må ikke implementeres som endeligt afklaret.**

Den seneste anbefalede definition er pr. komponent: forskellen mellem den
faktiske vurderingstid (kørslens låste `productionReferenceAt`) og kandidatens
beviste oprindelige DMI-`modelRun` er mindst 96 timer. Brug ikke downloadtid,
hele cachefilens dato eller afstanden fra modelrun til en fremtidig
`validTime`. En fremtidig femtedøgnstime er ikke fire døgn gammel allerede
den dag, prognosen udarbejdes. UTC-varighed, ikke kalenderdøgn, bruges.

- Under 96 timer beskyttes gyldig DMI; faktiske huller kan altid udfyldes.
- Fra præcis 96 timer må en **nyere, kvalificeret gyldig** CP-komponent,
  derefter OM, erstatte samme sted/time/komponent. Et nyere hentetidspunkt
  alene beviser ikke en nyere prognose; providerens revisionsbevis kræves.
- Uden gyldig erstatning bevares gyldig DMI. Reglen hverken forkorter den
  faktiske horisont, sletter data, indfører automatisk MISSING eller tilsidesætter
  DEC-0119/0173's beskyttelse af horizon-gyldige værdier.
- Ny kvalificeret DMI overtager igen. Et gammelt DMI-modelrun må ikke
  nulstille sin alder ved genhentning eller vælges tilbage blot pga. DMI-navnet.
- Vind, bølger, strøm og temperatur vurderes hver for sig med deres eget
  bevis; sammenhørende felter forbliver atomiske. Vandstand er DMI-only og
  deltager ikke i 96-timers reserveundtagelsen.

96-timersundtagelsen er lokalt forbundet gennem producer, bank, admission,
valg og closure. Det er endnu ikke et driftsbevis.
Implementeringen følger den seneste afgrænsning, ikke både 96-timers-reglen
og tidligere H94..H117-regel.
Målrettede beviser: 96 timer minus 1 ms/præcis 96 timer, samme gamle run
genhentet, forskellige komponentaldre, nyere DMI, nyere reserve, ukendt
reserveprognosealder og bevarelse uden gyldig erstatning.

## Afklaring

Ejeren har præciseret, at Copernicus og Open-Meteo fra begyndelsen er tænkt
som reservekilder for alle huller efter DMI, uanset vejrtype. Analysens
beskrivelse af den nuværende strømorienterede kode må ikke fremstilles som
produktets tilsigtede afgrænsning eller som en ny begrænsning i aftalen.

## Bindende regel

For hvert godkendt sted, nødvendigt tidspunkt og vejrkomponent gælder:

1. Brug gyldig DMI. Nye gyldige revisioner erstatter ældre; gyldig gemt DMI
   for samme sted og tidspunkt bevares, når den nye DMI-hentning har hul.
2. Copernicus udfylder det, DMI ikke dækker gyldigt.
3. Open-Meteo udfylder de resterende huller.
4. Reservekilder udfylder huller og må som hovedregel ikke overskrive gyldig
   DMI. Den seneste undtagelse under analyse er 96 timers modelalder,
   som beskrevet i topafsnittet; det tidligere sidste-døgn-forslag er erstattet.
   Ingen null/ugyldig værdi må fortrænge
   en gyldig beholdt komponent.
5. Reservedækning må ikke låse den foretrukne kilde ude: når DMI er med og
   har kapacitet, skal almindelige DMI-kørsler også søge data til komponenter,
   der allerede dækkes af Copernicus/Open-Meteo. En kvalificeret gyldig
   DMI-komponent overtager da for samme sted og tidspunkt. Denne udtrykkelige
   opgraderingsordre vedrører DMI; den giver ikke reservehentninger en generel
   tilladelse til at overskrive allerede gyldige felter.

Ejerens efterfølgende præcisering gør punkt 5 udtrykkeligt bindende.
"Udfyldt" og "dækket af DMI" er to forskellige forhold. Et felt udfyldt af
en reservekilde er ikke et datamanglende felt, men kan stadig være en opgave
for DMI. Et rent hulfilter eller en fuld fallback-cache må ikke permanent
fjerne denne opgave fra planen.

Kildeprioritet anvendes først blandt **kvalificerede gyldige** kandidater;
derefter vælges den nyeste kvalificerede revision inden for samme kilde og
den gældende geografiske kontrakt. En nyere hentetid alene giver ikke
Open-Meteo forrang over gyldig DMI og beviser heller ikke en nyere prognose.
Omvendt må en forkert time, forkert sted, ugyldig eller udløbet DMI-værdi
aldrig erstatte gyldig reserve. Et forgæves DMI-forsøg efterlader reserven
urørt. Værdier og deres kildebevis skifter samlet, komponent for komponent.

## Historisk forslag – sidste døgn (erstattet, må ikke implementeres)

Ejerens daværende forslag erstattede den upræcise formulering "meget tæt på
udløb": **Copernicus og Open-Meteo må erstatte DMI i prognosens sidste 24
timer, hvis DMI endnu ikke har leveret nye gyldige data for de samme timer.**
Den arbejdende fortolkning er udtrykkeligt meddelt ejeren som de sidste 24
timer i RavRadars viste prognose, ikke sidste døgn af en vilkårlig providers
native prognose og ikke et ur for, hvornår hele DMI-cachen slettes.

- På den låste H0..H117-akse omfatter tilladelsen de 24 sidste offentlige
  timepunkter H94..H117. H93 er udenfor. Aksen flyttes ikke, for at et felt
  bliver omfattet; der indføres ingen ny hentetids- eller prognosealders-TTL.
- DMI forsøges/afklares først. Er der en ny kvalificeret gyldig DMI-revision
  for den samme komponent/time, vinder den stadig, også i sidste døgn.
  Et nyt download af den samme gamle prognose er ikke en ny DMI-revision.
- Hvis DMI ikke er fornyet dér, må gyldig Copernicus, derefter Open-Meteo,
  vælges for præcis samme sted/time/komponent. En ny global modelkørsel er
  ikke i sig selv bevis på en brugbar lokal komponent. Bevis for DMI-forsøg/
  tilgængelighed og valgt reserve skal registreres; ukendt katalogstatus må
  ikke fejlagtigt beskrives som "DMI har ikke udgivet data".
- Mangler gyldig reserve, bevares den gamle gyldige DMI. Undtagelsen er en
  tilladelse til kildevalg, aldrig en tilladelse til at tømme et felt,
  stemple brugbar DMI som MISSING eller slette dens oprindelige bevis.
- De øvrige timer beholder den almindelige DMI-beskyttelse. Rigtige huller
  må fortsat udfyldes fra CP/OM over hele prognosen, ikke kun sidste døgn.
- At hente og gemme en reserve i god tid er ikke automatisk tilladelse til
  at vælge den over DMI. Den gamle 24-timers legacy-cache-refreshgrænse er
  en anden regel og må ikke genbruges som implementering af denne undtagelse.
- Et tilladt skift gemmes sammen med den afløste DMI-revision og årsagen.
  Samme gamle DMI må ikke vælges tilbage ved næste merge alene, fordi den
  stadig findes eller prognosevinduet rykker. Ny kvalificeret DMI overtager
  igen; dette skal ske uden kildeflimren og uden at blande komponentfelter.

Denne definition er historisk og **erstattet** af det senere 96-timers-
forslag. Den blev aldrig implementeret. H94..H117 og dette afsnits
tilbagevalgsregler må ikke bruges som en parallel aktiv kildepolitik.
Faktisk prognosegyldighed følger stadig DEC-0119/0173. Reglen er ikke en
generel "nyeste provider vinder"-regel og ændrer ingen fysisk acceptgrænse.

"DMI må overskrive alle" betyder stadig kvalificeret gyldig DMI, ikke at en
ældre DMI-revision må fortrænge en nyere gyldig DMI-revision. Den seneste
formulering "reservekilder må kun fylde huller" er heller ikke grundlag for
at indføre en ny generel CP-over-OM-refresh. Den tidligere CP/OM-prioritet ved
huludfyldning består; behov for ændring af eksisterende indbyrdes cachevalg
skal afgrænses særskilt før kodeændring.

Dette gælder vind, bølger, strøm og vandtemperatur samt nødvendige
afledte felter. Vandstand følger den nyere DMI-only-afgrænsning ovenfor.
Det gælder både H0, interne huller og fremtidshalen, og det
skal virke i den almindelige vedligeholdelse, ikke kun en engangskørsel.
En leverandør uden det nødvendige produkt springes over for netop det felt;
der må ikke opfindes et Copernicus-vindprodukt for at udfylde prioriteringen.

## Gyldighed og sammenhæng

- Samme UTC-time og godkendte lokale samplingidentitet skal bevises. En
  hovedzones værdi må ikke få en falsk kystdelsidentitet ved kopiering.
- Kilde/model, enheder og feltbetydning skal bevares. Middelperiode er ikke
  automatisk dominant bølgeperiode; forskellige vandstandsnulniveauer er
  ikke automatisk sammenlignelige.
- Sammenhørende felter vælges som gyldige komponenter: eksempelvis vindfart
  og retning, strømmens U/V samt bølgens nødvendige højde/periode/retning.
  Uafhængige komponenter må komme fra forskellige gyldige hentninger.
- En tre-timers ændring kræver to sammenlignelige værdier præcis tre timer
  fra hinanden. Nødvendige støtte-/historiktimer bevares privat, også uden
  for de 118 offentlige prognosetimer.
- Udvalgt input, provenance, offentlig vejrvisning og scoregrundlag skal
  referere til samme komponentvalg. Flere hentede rækker er ikke bevis på
  fuld accepteret dækning.

Tidligere DMI-only-scalaraccept erstattes i det omfang, den forhindrer denne
godkendte reservekæde. Krav til faktisk kvalitet, lokal identitet, gyldighed,
privacy og dokumenteret proveniens består. Dette er datakædearbejde, ikke
tilladelse til at ændre scoreformel, vægte eller geometri.

## Implementering og bevis

Den samlede ændring omfatter behovsplan, indsamling, gyldig cachebevaring,
kildevalg, adaptere, modelinput, datadiagnostik og offentlig visning.
Komponenthentninger skal kunne lykkes uafhængigt; en mislykket marine-
anmodning må ikke kassere en vellykket vindhentning.

Planlægningen skal skelne reelle datamangler, nødvendige fornyelser og
muligheder for kildeopgradering. Lukning af reelle huller og vedligeholdelse
af gyldighed må ikke blive sultet af genhentning alene for at forbedre
kildeandelen. Ledig DMI-kapacitet bruges derimod til dokumenteret, roterende
arbejde på reservedækkede komponenter; fuld reservedækning må ikke gøre
DMI-kørslen permanent arbejdsløs. Reelt utilgængelige native timer skal ikke
genprøves meningsløst på samme uændrede modelrun. De skal vurderes igen ved
relevante nye upstream-data. Ingen garanti om 100 % DMI kan udledes af en
prognosehorisont, som DMI-produktet ikke selv dækker.

Målrettede kontraktbeviser skal omfatte CP/OM → DMI for samme komponent,
bevarelse af gyldig DMI mod senere reserve uden for 96-timers-undtagelsen,
96 timer minus 1 ms/præcis 96 timer, ny gyldig DMI, manglende reserve
uden datatab og fortsættelse over vinduesskift uden kildeflimren,
uafhængige bølge-/vind-/strømvalg,
forgæves DMI-opgradering uden datatab og fortsat DMI-planlægning, når alle
krævede felter allerede har gyldig reservedækning. Faktisk fremgang måles på
samme sted/time/komponent mellem kørsler, ikke ved at sammenligne rå,
overlappende cachestørrelser eller nye haletimer som om de var samme opgave.

Fuld gyldig dækning måles for alle krævede felter/timer, særskilt fra
strukturel 210/673-komplethed og deploystatus. Almindelige kørsler skal
bevise vedligeholdelse over tid. Lokalt MISSING bevarer resten af sidens
brugbarhed, men er aldrig et afsluttet datamål.

Se [helhedsanalysen](../../ai/WEATHER_CHAIN_REVIEW_2026-09-19.md) for de
konkrete kodefejl, åbne kildeafklaringer og den sammenhængende leveringsplan.
Det efterfølgende [tværgående krydstjek](../../ai/WEATHER_CHAIN_CROSSCHECK_2026-09-19.md)
gennemgår ALLE fund, ikke kun denne kildepolitik. Det dokumenterer også,
at eksisterende CP/OM-records mangler bevis for sammenlignelig modelalder;
deres hentetid må ikke bruges som erstatning.
