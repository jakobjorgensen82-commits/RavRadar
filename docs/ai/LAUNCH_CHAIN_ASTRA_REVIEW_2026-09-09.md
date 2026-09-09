# Astra – samlet launchkontrol 2026-09-09, 4.0.339

## Konklusion og afgrænsning

SQL-recovery er afgrænset og lokalt bevist. Den alene bringer ikke modellen online: komplet strøm/bølgeinput, produktionsbackend og det efterfølgende offentlige modelskift mangler stadig. Audit fandt ingen begrundelse for en ny cachelæserrettelse, større afstandsgrænser, falsk komplethed eller bypass af produktionsgates. En ny kørsel må ikke loves komplet alene ud fra antal resterende huller.

Auditen gennemgår backend/migrationshistorik, central profil, kildecacher, DMI/WAM, Copernicus, Open-Meteo, historik/state, handoff/tid, artifact, backendreadiness, offentlig tofaset cutover og efterfølgende drift. Det er kode- og logbevis, ikke endnu et gennemført produktionsdeploy.

## 1. Den aktuelle SQL- og testrettelse

- Backend `34350871769` anvendte migration 1–3; migration 4 fik SQLSTATE 42601 og rullede sin egen transaktion tilbage. 5–8 og downstream backend blev ikke anvendt. En ny migration 9 alene ville ikke hjælpe: migration 4 skal kunne udføres først. Ingen ledger-repair eller ændring af allerede anvendte filer.
- De samme to CASE-parenteser rettes i fem pending migrationer, schema og installer. PR #273/head `a3786e6d` fejlede sourcegate `34362702197`, fordi den gamle immutable per-pair-hash stadig stod i testen. Den rettede test pin'er korrigerede bytes og kræver, at fjernelse af alene parenteserne reproducerer den oprindelige SHA. Det er ikke accept af vilkårlige migrationsændringer.
- CASE-regressionen afgrænses til checkpointvalidatoren. Håndbogstekst/kommentarer om den gamle fejl må ikke klassificeres som udført SQL. Hele den berørte migrations-testgruppe er grøn.
- Isoleret PostgreSQL 16 har anvendt hele pending suffix 4–8 i rækkefølge. Supplerende direkte funktionskald i PGlite 0.2.17/PostgreSQL 16.4 accepterer den autoritative JS-builders fulde 48-position-state og 47-complete/1-unknown-state; forkert transition og inkonsistente counts afvises. Rekonstrueret gammel kode giver stadig SQLSTATE 42601. Dette er ikke live DB-readback.

## 2. Den afsluttede vejrkørsel – præcist logbevis

Run `34350872447` på 4.0.338/main `208e878453d6d8a21b8ce879eac050d664c50c40` sluttede med failure. Alle afsluttende providerprogress-saves bestod, inklusive Open-Meteo. Ingen cache blev nulstillet.

- DMI: 33.835 operationelle par. Copernicus: 38.743 af DMI-resten. Regional bridge: beregnet 832. Open-Meteo: required 6.004, filled 5.703, missing 301, retained 5.166, fetched 537, cacheReuse valid og checkpointWritten true.
- Summen er beregnet 79.113/79.414; det er **ikke** en slutattesteret closure, fordi den afsluttende closuregate blev skipped.
- Open-Meteo stoppede på tidsbudget. Loggen har 826 batchforsøg, 210 adaptive splits, 155 transportretryable, 248 afvisninger af gridafstand og 3.226 afvisninger af parværdier. Disse er forsøgstællere, ikke hver sin unikke manglende post. Der er derfor ikke bevis for, at mere Open-Meteo-tid alene kan fylde alle 301.
- WAM-koden er direkte verificeret som `MISSING_HOUR`, **ikke** `CACHE_JSON_INVALID`. Fejlen gælder operationelle fremtidstimer, ikke cold-start-historik. CLI bruger allerede den fælles codec. Loggen viser `wam_nsb` ved asset 40/48 og target+109h med cirka 59 sekunder tilbage; kravet går til +117h. En ufærdig hale er sandsynlig, men præcist antal skal måles på cache, ikke gættes.
- Tidligere opsummerede tal 5.680/23 og koden CACHE_JSON_INVALID var forkerte statusoplysninger og er forkastet. De må ikke genbruges som evidens.

## 3. Kontrollerede forbindelser i launchkæden

- Restoreprefixer for DMI/Copernicus/Open-Meteo er ikke releasebundne; 4.0.338-cacher kan genvalideres som donor i 4.0.339. Et handoff derimod kræver samme eksakte head som consumeren. Ingen ommærkning af det gamle handoff.
- Main må ikke flyttes, mens et aktivt weather-run stadig skal gennemføre exact-main-beskyttede saves. Denne risiko er nu afklaret for `34350872447`, fordi alle saves er afsluttet.
- `verified-weather-source-handoff.mjs` installerer de eksakte kildefiler og fastholder producentens reference i consumeren. Consumeren åbner ikke en ny hale blot fordi klokkeslættet har flyttet sig under oneoff. 90/150/240-minuttersmål er advarsler; stop sker ved et reelt udløbet target+117h-vindue. Den resterende fremtidshorisont bliver naturligvis kortere.
- Den senere ubetingede backend-/Edge-readinessgate i `reusable-weather-build.yml` kræver exact source/model/closure før integreret Pages. Det tidlige versionsinterval er en potentiel effektiviseringsopgave, ikke bevist bypass af backendkrav.
- Centralhydreringen bevarer den nyere integrerede releaseprofil ved den kendte Candidate G-forløber. Ingen dokumenteret backend/weather-bindingkonflikt i denne vej.
- Første cutover accepterer den allerede godkendte ærlige historikopvarmning. Det kræver ikke først en ny moderne Candidate G-release. Offentligt artifact, privatlivskontrol, PENDING/CAS, Pages og offentlig readback skal fortsat hænge sammen; et grønt build alene er ikke launch.

## 4. Reelle driftsbegrænsninger, som ikke må skjules af launch

**Open-Meteo-historik:** Den aktive OM-cache beholder kun den nye operationelle restliste. Timer før nyt target indgår ikke i en separat 48h-OM-historikdonor. Ved ubrudte 1h-stateovergange kan modellen opvarmes, men gentagne større spring kan gøre allerede tidligere hentede OM-timer ukendte i replay. HISTORY_INCOMPLETE påvirker konservative scoregrænser/mobilisering, ikke kun kalibrering. Det er en P1-scorekontinuitetsfejl, som skal løses med kildeattesteret 48h-bevarelse og en test over efterfølgende targetskift; ingen syntetisk historik eller scoreformelændring.

**Cachetransport og kadence:** Den godkendte egressundtagelse gælder kun første cutover. Den gør ikke hyppig fuld privat transport bæredygtig, og den eksisterende oneoff er bundet til legacy-bootstrap før launch. Efter launch skal transportarbejdet derfor begynde straks, og første almindelige vedligeholdelse på et senere target skal bevises. Normal cron/watchdog må ikke blot slås til, før transport og budget er dokumenteret. En eventuel kontrolleret lavere midlertidig kadence skal baseres på faktisk objektstørrelse og budget; den er ikke stiltiende omfattet af engangsundtagelsen. Offentlig horizons udløb er den yderste frist, ikke et mål for hvor længe arbejdet må vente.

## 5. Samlet udførelsesrækkefølge

1. Luk den afgrænsede SQL-/testpakke i **samme 4.0.339-PR**, dokumentér ovenstående og kør én sourcegate på samlet nyt head. Ingen ny release alene pga. den gamle testhash.
2. Efter grøn exact-head og bekræftede cache-saves: merge og genoptag backend med præcis 3 applied/5 pending. Den målrettede restdiagnose/vejrfuldførelse kan ske parallelt med backend; ikke en ukritisk gentagelse af hele forløbet.
3. Før endnu en antagelse om komplethed: klassificér privacy-sikkert de unikke rester hos DMI/WAM og strømleverandørerne, og fuldfør derefter en same-head-oneoff på de bevarede kildecacher. Skeln timeout/uforsøgt fra vedvarende ugyldige providerdata. Hent reelle huller; ændr ikke gridafstand, kildeklassificering eller geometri for at gøre tælleren grøn. Ny time/leverandørversion må ikke slette stadig brugbare rækker.
4. Når både backendreadiness og komplet same-head-handoff er bevist: dispatch den allerede autoriserede første integrerede cutover, genbrug handoff frem for ny lang leverandørhentning, og følg fulde data-/privacy-/release-/artifact-/Pageskontroller til offentlig modelverifikation.
5. Fortsæt straks med tabsfri transport i shadow og OM-historik, bevarede originaler, atomisk skift og verificeret normal vedligeholdelse. Først da må systemet kaldes bæredygtigt automatisk, ikke blot online.

Kosmetiske dokumentations-/formkrav må ikke blive en ny releaseblokker. Kendte datamangler, forkert kilde, privat datalæk, forkerte modelbindinger og manglende offentlig transaktionsverifikation er derimod reelle fejl. Denne audit er ingen garanti for, at eksterne leverandører eller endnu uprøvede credentials lykkes.
