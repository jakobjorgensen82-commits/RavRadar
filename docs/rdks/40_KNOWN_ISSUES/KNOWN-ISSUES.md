# Kendte åbne og overvågede forhold

## Høj prioritet
1. **ISSUE-STATION-CACHE-STATUS – PLANLAGT:** Stationslivscyklus skelner endnu ikke fuldt mellem observation og gyldig prognosecache.
2. **ISSUE-HANDBOOK-EVIDENCE – LØBENDE:** Flere faglige antagelser om rav og sedimenttransport kræver ekstern ekspertvalidering.
3. **ISSUE-DMI-HORIZON – OVERVÅGES:** Komponenternes DMI-horisont kan være kortere end hele brugerprognosen; fallback og dækning skal forklares.
4. **ISSUE-WATERLEVEL-CONTINUITY – OVERVÅGES:** Kunstige spring må ikke genopstå ved kildeskift; Vadehavet skal vurderes særskilt.
5. **ISSUE-STATION-OFFICIAL-AUDIT – DELVIST LØST I 4.0.103:** OceanObs-målestationer og `tidewaterstation`-prognosepunkter opdages fra deres dokumenterede collections og skrives til en samlet audit. Første produktion skal bekræfte antal, horisont og Hals-punkternes faktiske data.

## Produkt og admin
6. **ISSUE-RULE-USABILITY – DELVIST:** Regelbyggerens fulde menneskevenlige workflow og konfliktforklaring skal løbende verificeres i browseren.
7. **ISSUE-COASTLINE-EDITOR – RETTET I 4.0.90, OVERVÅGES:** Søgning, zonevalg, omdøbning og central gemning er samlet i én brugerrejse. Mobil browsertest og rollback overvåges fortsat.
8. **ISSUE-CENTRAL-STORAGE – DELVIST:** Supabase-opsætning og rettigheder kræver fortsat driftsverifikation.

## Historiske problemer, der ikke må genindføres
- Timevis DMI/Open-Meteo-pendlen.
- Global 180°-vending som hurtigfix uden lokal geometri-audit.
- Afstandsbaseret stationsvalg uden kysttopologi og datastatus.
- Fjernelse af kendte stationer, fordi én kørsel mangler observationer.
- Genindførelse af brede førstegenerationszoner.
- Implementering af funktioner alene fordi de blev diskuteret teoretisk.

## Senest løst, kræver produktionsbekræftelse
- **ISSUE-PUBLIC-FORECAST-MAIN-THREAD – RETTET I 4.0.83, AFVENTER PRODUKTIONSBEKRÆFTELSE:** Dagens rangliste kunne ikke males, fordi 5-dages landsberegningen blokerede browserens hovedtråd synkront. Beregningen er nu opdelt og giver løbende browseren kontrollen tilbage.

## Løst i 4.0.85 – afrundingsinkonsistent strømvektor
**Status:** LØST

4.0.84 kunne gemme afrundet u/v, men beregne retning og hastighed fra uafrundede værdier. Det kunne påvirke audit og RavScore tæt på retningsgrænser. 4.0.85 bruger én kanonisk lagret vektor i hele kæden.

## Løst i 4.0.86 – funktioner uden synlig brugerrejse
**Status:** LØST

Reviewkøen fandtes kun i en parallel/inaktiv adminimplementering, mens den aktive admin kunne indsende reviews uden at ejeren kunne finde dem igen. Samme audit afdækkede manglende håndtering af lokale nødkladder, et tomt dokumentationscenter og uklar lokal virkning af model-forslag. Den aktive admin og sitetesten kontrollerer nu hele brugerrejsen.

## Løst i 4.0.87 – manglende kortpile, admin-kortrace og blandet modulcache
**Status:** LØST, AFVENTER PRODUKTIONSBEKRÆFTELSE

Pileinstallationen var gjort afhængig af browserens idle-callback uden runtimekontrol. Samtidig kunne retningskortets forsinkede Leaflet-start køre efter faneskift, og aktive browserimports bar flere ældre versionsparametre. 4.0.87 gør pileinstallationen deterministisk efter de centrale visninger, beskytter kortcontainerens livscyklus og kræver én releaseversion gennem hele importgrafen.

## Løst i 4.0.96 – vandstandsstationsfanen
- `stationDeliveryLabel` stoppede kortinitialisering for zoner med gemt override. Løst ved at bruge de aktive observations-, cache- og anvendelighedslabels.
- Beskyttet stationsstatus blev ikke hydreret fra Supabase og kunne blive forringet til ukendt/utilgængelig. Løst med central readback og ikke-destruktiv merge.


## Løst i 4.0.103 – supporteksponering og uens afstandsvægte
**Status:** LØST I KODE, AFVENTER GITHUB-BEKRÆFTELSE

Pages-buildet udelukker nu både `_support/` og support-ZIP. Automatisk routing og administratoroverride anvender samme reelle geografiske afstand til vægtning, mens topologien fortsat bestemmer kandidatvalget. Det fejlagtige plurale prognosepunkt-endpoint er erstattet af DMI's dokumenterede `tidewaterstation`-collection.

## Løst i 4.0.104 – administratorvalg og næsten konstant 0 cm
Status: **LØST, AFVENTER PRODUKTIONSVERIFIKATION**

Første valg i en zone uden routingpost blev tidligere foretaget i et løsrevet midlertidigt objekt. Samtidig kunne manglende prognoseværdier (`null`) blive konverteret til 0 og skabe en falsk nulserie. Begge rodårsager er rettet og dækket af regressionstest. Første GitHub-kørsel skal bekræfte varierede femdøgnsværdier og rødt aktivt administratorvalg i produktionen.

## Løst i 4.0.105 – forsinkede administratorvalg og døde knapper
**Status:** LØST I KODE, AFVENTER PRODUKTIONSBEKRÆFTELSE

Vandstandsfanen kunne tidligere blive vist med automatisk routing, mens central routing stadig ventede bag en stor samlet admininitialisering. Når Supabase-data senere ankom, blev tilstanden og DOM'en erstattet, så røde valg kom flere minutter for sent, og et klik på “Fjern” kunne blive overskrevet. 4.0.105 indlæser de tre nødvendige vandstandsdele først og holder fanen ikke-klikbar, indtil den endelige centrale routing er klar.

- 4.0.105 kunne fylde localStorage med store Supabase-dokumenter og udløse QuotaExceededError. Rodårsagen er rettet i 4.0.106 og produktionsbekræftet af ejer i den efterfølgende drift.

- 4.0.109 kunne fejle, fordi HARMONIE brugte næsten hele bulkbudgettet før DKSS. Rettet i 4.0.110 ved marine-first recovery; afventer produktionsverifikation.


## Overvåges fra 4.0.112
- **ISSUE-WORKFLOW-DURATION – AKTIV:** Deploy/Update-jobbet kan vare omkring 14 minutter og dermed overlappe et 10-minutters interval. Profilér collection- og trinforbrug, cachegenbrug og uændrede GRIB-assets. Auditkrav og marine dækning må ikke svækkes som genvej.
- **ISSUE-SITETEST-DASHBOARD-TIMING – RETTET I 4.0.112:** Sitetesten kunne kontrollere dashboardknappen efter admin-ready, men mens en anden fane stadig var aktiv. Den skifter nu eksplicit til dashboard og venter på en synlig, klikbar knap.
- **ISSUE-STATE-SHADOW-VALIDATION – AKTIV:** Tilstandsfelterne skal valideres over flere produktionstimer på de faste referencezoner, før de får numerisk scorevirkning.

## 4.0.113 – workflowcache og scheduler
- **ISSUE-DMI-CACHE-IMMUTABLE-KEY – RETTET I 4.0.113, AFVENTER PRODUKTIONSBEKRÆFTELSE:** Fem kørsler gendannede samme ugentlige primærnøgle og gemte derfor ikke ny rå GRIB-fremdrift. Workflowet bruger nu separat restore/save og unik save-nøgle.
- **ISSUE-WORKFLOW-DURATION – FORTSAT AKTIV:** De målte 12–15 minutter kan være kunstigt forhøjede af cachefejlen. Cron ændres ikke før nye målinger.
- **ISSUE-STATE-SHADOW-VALIDATION – FORBEDRET, FORTSAT AKTIV:** Hver frisk produktion logger nu datasætbundne referencefelter og håndhæver streng tilstedeværelse. Faglig stabilitet over flere timer skal stadig bekræftes.

## 4.0.114 – Pages-deploy og workflowkø
- **ISSUE-PAGES-DEPLOY-QUEUED – PRODUKTIONSBEKRÆFTET LØST/AFGRÆNSET I 4.0.114:** Flere selvstændige kørsler byggede og uploadede et gyldigt Pages-artifact, men GitHub Pages blev stående i `deployment_queued` til timeout. Build/data og deploy er nu adskilt, og kun deployjobbet ejer `github-pages`-miljøet. Et fejlet deploy kan genkøres uden ny DMI-kørsel.
- **ISSUE-WORKFLOW-QUEUE-PRIORITY – DELVIST RETTET I 4.0.114:** Push og tvungne manuelle releasekørsler må afbryde en ældre almindelig vejropdatering. Almindelige 10-minutters kald afbryder ikke den aktive kørsel. Den faktiske køadfærd og cronintervallet skal stadig måles i produktion.


## 4.0.115 – historisk strømproveniens
- **ISSUE-STATE-PRE-PROVENANCE – RETTET I 4.0.115, AFVENTER PRODUKTIONSBEKRÆFTELSE:** Historiske transportfelter blev tidligere beregnet før den endelige DMI-proveniensberigelse. Nu genberegnes de efter provenance, og kun verificerede DMI-prøver tæller.
- **ISSUE-STATE-DURATION-SEMANTICS – RETTET I 4.0.115:** Akkumulerede timer kunne fejltolkes som ét ubrudt forløb. Nye aktive-regimefelter beskriver det sammenhængende forløb særskilt.


## 4.0.116 – DMI U/V-grid og manglende femdøgnsfelter
- **ISSUE-DMI-UV-GRID-MISMATCH – RODÅRSAG FUNDET, RETTET LOKALT I 4.0.116:** 4.0.115 blev stoppet, fordi bulk-parseren kunne vælge nærmeste gyldige `current-u` og `current-v` separat. Forskellige masker kunne dermed danne en fysisk falsk vektor. 4.0.116 kræver nærmeste fælles fysiske punkt og invaliderer gamle mismatch-par. Afventer CI/produktion.
- **ISSUE-WATER-SOURCE-COVERAGE-INFLATION – RETTET LOKALT I 4.0.116:** `SOURCE::`-vandstandspunkter blev talt med som almindelige zoner i komponentdækning og sampled unødigt for andre parametre. Det kunne holde marine recovery aktiv og bruge tidsbudget, som ellers kunne nå vind/bølger. Afventer CI-måling.
- **ISSUE-FIVE-DAY-WIND-WAVE-ZERO – DELVIST RODÅRSAG FUNDET, RETTET LOKALT I 4.0.116:** JavaScript-konvertering kunne gøre `null` til 0, så manglende vind/bølge blev vist og delvist behandlet som fysisk nul. 4.0.116 gør kæden null-sikker. Produktion skal stadig afgøre, om der bagefter findes reelle kildedatamangler i bestemte timer/zoner.
- **ISSUE-WORKFLOW-DURATION – FORTSAT AKTIV:** Eksternt cron-job er nu 15 minutter. DMI-workload skal måles efter fjernelse af unødige `SOURCE::`-opslag; marine audits må ikke svækkes.

## 4.0.117 – schedulerens aktive zoner og DMI-vind
- **ISSUE-DMI-SCHEDULER-CACHE-DENOMINATOR – RETTET LOKALT I 4.0.117:** Schedulerens dækning kunne bruge zonerne i den gamle bulkcache som nævner og dermed overse nye aktive zoner uden cache. Nævneren er nu altid det aktuelle aktive zoneregister.
- **ISSUE-DMI-WIND-FAMILY-NAME – RETTET LOKALT I 4.0.117:** HARMONIE er familien `wind`, men schedulerens gamle mangeltabel brugte `atmosphere`. Reelt manglende DMI-vind kunne derfor få nul deficit. Familienavnet er nu konsistent gennem prioriteringen.
- **ISSUE-FIVE-DAY-WIND-WAVE-ZERO – FORTSAT AKTIV:** 4.0.116 fjernede falsk `null -> 0`; 4.0.117 retter dokumenteret schedulerudsultning. Ny produktion skal måle reel 24/96-timers vind- og bølgedækning. Store HARMONIE-assets og runtime/downloadbudget forbliver et separat målepunkt.

## 4.0.117 hotfix – DKSS-modeludsultning under marine recovery
- **ISSUE-DKSS-GEOGRAPHIC-RECOVERY-ORDER – RETTET LOKALT I 4.0.117-HOTFIX:** 4.0.117 kunne registrere et marinegrundlagsgab uden at prioritere den DKSS-model, der geografisk dækkede de manglende zoner. Med to produktive collections kunne Limfjordsmodellen derfor blive stående som nummer tre, og strømauditten fejlede på aktive zoner uden bulkgrundlag. Schedulerprioriteten er nu datagabs- og kysttypebaseret. Afventer CI/produktion.
- **ISSUE-LIMFJORD-UV-SEARCH-RADIUS – DIAGNOSEN VAR UTILSTRÆKKELIG:** #1738 viste korrekt `NO_SHARED_UV_GRID_POINT`, og søgefladen blev udvidet uden at hæve 24-km-grænsen. Senere frisk CI viste, at dette ikke var den egentlige årsag til de tre tilbagevendende Limfjordsudfald.
- **ISSUE-DMI-UV-VERTICAL-LAYER-OVERWRITE – RETTET LOKALT, AFVENTER PRODUKTION:** DMI DKSS leverer strøm-U/V i flere vertikallag. Parserens kandidatcache var kun nøglebundet til familie+zone, så et senere/dybere U-lag kunne overskrive et lavere gyldigt U-lag før tilsvarende V blev behandlet. Lavvandede zoner kunne dermed ende uden vektor. Cache og parring er nu lag-isoleret, dybeste gyldige fælles lag vælges deterministisk, og parserversion 11 tvinger genbehandling.
