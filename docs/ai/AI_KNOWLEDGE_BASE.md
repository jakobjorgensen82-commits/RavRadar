# AI Knowledge Base – RavRadar

## 4.0.313 – nullable JSON og bladprojektion er en versionsgrænse

- Et JSON-dokument med kendte `null`-blade og et PostgREST-bladselect uden disse blade kan være samme historiske kilde, men får forskellig kanonisk hash.
- Denne lighed må aldrig løses med generel tolerant JSON-sammenligning. Kun migration→migration må bruge en eksplicit versioneret projektion efter stored selvhash, ejer/id/shard, schema, privacy og eksakt non-null/core-lighed.
- D1-row og registry er historisk evidens og omskrives ikke for at matche den nye projection. Missing registry må kun repareres med gammel verified hash.
- Privacy gælder både input og readback. Et ukendt schema-v2-topfelt må ikke bortfiltreres, heller ikke når det er null.
- Response-body er ubetroet data. Både fejlede og succesfulde malformed gateway-svar skal blive faste lokale fejl uden bodyudsnit.

## DEC-0109 – afledt rekonstruktion er en særskilt evidensklasse

- Et komplet aktuelt vejrdatasæt kan godt have ufuldstændig Candidate G-memory; aktuelle vejrdata og 48-timers transportbevis er forskellige sandheder.
- Den eneste godkendte rekonstruktion er incident `RRGAP-2026-08-29-CANDIDATE-G-01`. Den bruger lineær interpolation af allerede afledt signeret kystnormal `strength` mellem eksakte målte ankre. Det gør ikke prøven målt og siger intet nyt om rå strøm, vejr, bølger, vandstand eller surfzonen.
- Målt state er schema 2.0.0. State med levende rekonstrueret prøve er schema 2.1.0 og skal bære trust helt ud i mode, diagnostik, startup/detaljer, manifest/hash og turbinding. Ældre/ukendt kode skal afvise den fail-closed.
- Rekonstrueret transportmemory kan være teknisk READY, men `calibrationEligible=false` og `hardObservedOuttransportEligible=false`. En rekonstrueret passage af +10/-8/13-timersmekanikken er ikke observeret bevis for faktisk udtransport.
- Inspect er read-only og descriptorforseglet. Apply er source-/mål-CAS-bundet og skriver privat rollback først. Cleanup fjerner kun incidentets syntetiske prøver, bevarer nyere målinger og vender tilbage til schema 2.0/warmup.
- Last-verified offentlig nødvisning er målt-only. Ture fra nødvisning eller rekonstrueret score gemmes som erfaring, men må aldrig indgå i kalibrering.
- Fravær af de nye trustfelter er ikke bevis for measured-only. Aktive/pending schema-v2-ture fra før 4.0.311 bevares som `ravscore-evidence-trust-unattested` med `calibrationEligible=false`; migrationen må ikke slette brugerens tur eller lade den fail-open til kalibrering.
- Allerede persistérede pre-4.0.311 schema-v2-observationer backfilles, omskrives eller slettes ikke. Prediction-/kalibreringsforbrugeren er den konservative migrationsgrænse: en række kan kun medtages ved `calibration_features.appVersion >= 4.0.311`, eksplicit `calibration_eligible=true` og eksakt attesteret `data_quality_flags=[]`; alt andet udelukkes lokalt uden databaseændring.
- Tripmigration/readback må kun se en eksplicit server-side bladprojektion. `select=*`, hele fri-form-JSON, lokation/GPS, geohash/UTM, rå U/V, fri tekst/billeder og ukendte/private ekstrakolonner må ikke komme ind i runner-memory. Owner-id bruges kun kortvarigt til HMAC og logges ikke.
- Ti D1-shards deler én atomisk global registry for id/ejer/hash/målshard. Ejer-sletning skriver en global tombstone før rows/registry fjernes, så samtidige og senere writes stoppes.
- Efter capacity/CAS identificerer current-run Edge-predeploy-intent installationstypen. Existing D1 bruger 20-minutters lease/30-minutters max, femsekunders prober, dobbeltattestation, drain, 600 sekunders restlease og samlet syvminutters Worker-gate; partial Edge går D1 roll-forward. Fresh partial Edge før activation går exact-main-bundet til Supabase-secret, eksakt Edge-redeploy og dobbelt Supabase-attestation. Uden intent ved capacity/pre-CAS-fejl sker nul recoverymutation.
- `calibration_eligible=true` er ikke et serverbevis mod signeret public manifest. Det er en udelukkelseslås, ikke empirisk evidens, og må ikke åbne global koefficientlæring.
- Den næste samlede RavScore-model skal bevare provenance, trust, migration, tripbinding og cleanup, men interpolation må ikke blive dens normale missingregel.
- Den næste models nødvej skal være målt-only og atomisk 210/673 med eksakt model/state/hash, højst 72 timer og kortere forecastudløb, DA/DE/EN-advarsel, non-calibration trips og automatisk frisk primary.

### Historisk 4.0.312-roll-forward-checkpoint 2026-08-29

4.0.311 bestod PR #224 exact-head CI `33263734108` og blev merged som `7c168b00af535415117c968a8c021a493b083137`. Push-run `33263858078` var en korrekt grøn no-op uden artifact eller Pages. Backend-run `33263892151` nåede den atomiske SQL-forespørgsel, fik HTTP 201 og fejlede derefter på en flad `pg_get_constraintdef`-regex, som ikke tolererede PostgreSQLs ekstra parenteser omkring den kanoniske JSONPath.

Den højt sandsynlige databasetilstand er samlet commit af CHECK, validering og kommentar; transaktionens eneste atomiske alternativ er fuld rollback. Ingen observationpayloads blev hentet til runneren, logget eller ændret, ingen row mutation forekom, og D1, Edge, Worker, sync, vejr, artifact og Pages blev ikke nået. Offentlig version er fortsat produktionsverificeret 4.0.310, og incident-rekonstruktionen er ikke anvendt.

Den lokale 4.0.312-verifier udtrækker strukturelt præcis én JSONPath-literal, tolererer parentesering, kræver den eksakte kanoniske path og afviser reorder, duplicate, extra og ambiguous. Dette historiske checkpoint blev efterfølgende lukket gennem PR #225/exact-head `33266087776`, merge `a5ece10d` og no-op push `33266184326`. Backend `33266229687` bestod verifier-, D1-, Edge- og Workerleddene, men fejlede migrationssynken og er ikke readiness. Det resterende arbejde er operationelt flyttet til det aktuelle 4.0.313-checkpoint øverst; rekonstruktions-inspect/apply, frisk produktion og offentlig verifikation er stadig ikke udført. Trip protocol/header og den konservative observationsgrænse forbliver 4.0.311.

## Produktions- og driftsverificeret 4.0.310 – ekstern og intern stilhedsgrænse er bevidst forskellige

4.0.309's første virkelige redningsgren blev udløst af vagt `33246369618` kl. 09:49 UTC og bestilte produktion `33246376992`. Da den foregående produktionsstart lå cirka en time tidligere, var den fælles 45-minuttersgrænse for konservativ som vedvarende erstatning for helt manglende native schedules.

Kun det autentificerede eksterne `external_watchdog=true` bruger derfor fra 4.0.310 mere end 15 minutters samtidig gammel runhistorik og gammelt offentligt manifest. GitHubs interne schedule-vagt beholder DEC-0085's 45 minutter. Begge veje afviser præcis grænsealder, aktiv/queued produktion, frisk runhistorik og friskt manifest og bestiller kun normal `force=false` under den fælles tunge concurrency. Datagates og Candidate G er urørte. Se DEC-0108.

PR #222/exact-head `33247789054`, merge `792648c3`, post-merge-produktion `33247839121` og offentlig `rr-20260829103233-210` er grønne. Det automatiske eksterne run `33248692042` beviste den mergede 15-minuttersgren og bestilte præcis én normal produktion `33248699516` efter fortsat native schedulerstilhed.

## 4.0.309-kandidat – ekstern schedule-vagthund uden dataadgang

GitHub forbliver normal scheduler. Den eksterne tjeneste kender kun repository, workflow, `main` og et boolsk watchdogintent og kan ikke se vejr, Candidate G-state, koordinater, rå U/V eller private data. Keepalive-workflowet foretager selv den eksisterende 45-minutters kontrol mod ufølsom workflowhistorik og det offentlige manifest. Direkte eksterne produktions- og pilotkald er fravalgt for at bevare eventsemantik, retry, cache og concurrency. Se DEC-0107.

## 4.0.308-kandidat – naturlige sikkerhedsformuleringer

Den offentlige prøve viste, at den eksisterende kildebundne viden om hvidt fosfor var for snævert routet: “Hvad er hvidt fosfor på stranden?” manglede ordet rav og blev derfor afvist. DA/DE/EN-emnematchet genkender nu selve stofnavnet og naturlige strand-/fundformuleringer. Svaret, evidensklassen og den officielle Forsvaret-proveniens er uændrede; kun adgangsformuleringen er bredere. Se DEC-0106.

## 4.0.307-kandidat – 152 kildeklassificerede lokale emner og rettet scopegrænse

Den ekstra høje audit erstatter antagelsen om, at seks nye emnefamilier var en tilstrækkelig breddeudvidelse. Et deterministisk katalog giver nu 152 DA/DE/EN-emner oven på de 17 eksisterende intent-kontrakter og testes med 456 katalogspørgsmål uden netværk eller AI-kvote. Hvert emne har evidensklasse og kilde-ID. De 27 offentligt registrerede kilder omfatter ekstern ravforskning, fagfællebedømt kystanalogi, officielle kyst-/sikkerheds-/regelkilder, RavRadars større forskningsgrundlag og Rav Jagt som navngiven praktisk ekspert. Specifik lokal viden vælges før brede standardsvar; dynamiske sted-/tid-/scoresvar bevarer deres Candidate G-vej.

Browser og Edge bruger Unicode-helordsgrænser, så `Skagen` ikke rammer det uvedkommende ord `kage`, og relevant specialviden har en bredere domænerute. Edge-pakken er udvidet fra 23 til 38 offentlige fakta, herunder geologi, saltation, koldt vand, identifikation, konservering, sikkerhed og aktuelle regelgrænser. Den versionsbundne Edge-UV-fakta bruger 395 nm. Providercredential, dataminimering, CORS, kvote, timeout, JSON/evidensvalidering og lokal fallback er uændrede. Se DEC-0105 og den eksterne researchaudit.

Den visuelle mobilprøve fandt en skjult afhængighed: UI'en ventede tidligere på prognosedetaljer før alle spørgsmål. `ravQuestionNeedsConditionDetails` begrænser nu denne venten til dynamisk bedste sted, bedste tid og score. Katalogsvar, sikkerhed og generel forskning svarer lokalt, selv når detaljefilen er utilgængelig.

## 4.0.306-kandidat

Det separate smårettelsesspor ændrer offentlig tekst/UI, Grundbogen og read-only Spørg RavRadar-viden. Aktiv UV-angivelse er 395 nm; koldt vand forklares tydeligere som mobiliseringsfaktor uden nyt scoreinput. Zonesøgning, pilesignatur, Rav Jagt-illustration og synlige BernsteinScore/AmberScore er tilføjet. Candidate G/modelsporet er urørt. Se DEC-0103.

## 4.0.291 – offentlig GPT-OSS kræver en dobbelt fail-safe grænse

Ejeren har givet særskilt aktiverings-go. Cloudflare-kontoen er verificeret som Workers Free / $0 med 10.000 neuroner pr. døgn og fejl efter loftet. RavRadar må ikke aktivere Workers Paid, prepaid AI Gateway eller anden betalt overflow. Den interne dagsgrænse på 300 providerkandidater er en ekstra buffer, ikke en erstatning for Cloudflares eget loft.

Browseren afviser kendte uvedkommende og sikkerhedsfølsomme spørgsmål før netværk og holder bedste sted/tid/score i Candidate G. Edge gentager domænegaten, minimerer konteksten, rate-limiter og validerer fem faste outputfelter. `429`, timeout, upstreamfejl, ugyldigt JSON, forkert locale/evidens eller manglende secrets giver lokal fallback. `ravAssistantRemoteEnabled=false` er øjeblikkelig rollback.

Brugeren skal have en forståelig DA/DE/EN-tekst om den begrænsede dagskvote og om, at prognoser og lokale RavRadar-svar fortsætter. Teksten må ikke love, at der er kvote tilbage. Se DEC-0088.

## 4.0.286 – et faseskudt grænsebevis skal overleve næste rullende reference

Den faktiske predeploy-gate fandt efter kontinuitetsrettelsen en separat 8-delsfejl: 672/673 states var `READY`, men de otte ejerallowlistede `dkss_lf`-dele ved `NATIVE_CADENCE_HOLD` manglede 16 modes, fordi Candidate G-evaluatorens ældre Phase D-fortrin krævede et nyt aktuelt strømfelt. En godkendt native hold må bruge den allerede afledte `READY` transport- og mobiliseringstilstand, men kun med eksakt tre-timers tilladelse, referencealder over 0 og højst 3 timer samt tomme U/V-, fart-, retnings- og alignmentfelter. Den må ikke foregive en aktuel vektor. Ordinary `UNVERIFIED`, for gammel eller ikke-READY forbliver lukket. Se DEC-0081.

4.0.286 er produktionsverificeret via PR #159/exact-head `33001615758`, merge `c0f42b33` og produktion `33001743118`. Offentlig `rr-20260826185603-210` har 210/210 aktive zoner, befolket **Bedste områder**, komplet 210/673/420/2.100-struktur og nul kontrol-, browser-, side- eller HTTP-fejl.

Når `buildBoundedCurrentTransportMemory` bruger en virkelig kompakt forgænger før `referenceAt - 48h` til at dokumentere ubrudt højst tretimerskadence, skal forgængeren bevares i den kompakte state til næste reference. Ellers kan samme beregning blive `READY`, mens næste produktion igen mister én times sammenhæng og bliver `WINDOW_INCOMPLETE`.

Forgængeren er kun kontinuitetsbevis. Det aktuelle replay og dækningsberegningen bruger fortsat kun evidens fra og efter vinduesgrænsen, som starter med fast tilstand 0. Der opfindes ingen måling eller interpolation, og et reelt kort vindue uden forgænger forbliver lukket.

En syntetisk shadow-selftest er ikke bevis for den runtime, produktionen netop har bygget. `data/live/conditions.json` skal auditeres fail-closed efter generering og før Supabase-sync, artifact og Pages. Se DEC-0081.

## 4.0.285 – 48-timersgrænsen skal tåle en dokumenteret cadencefase

`buildBoundedCurrentTransportMemory` må ikke kræve, at første bevarede bevis ligger præcis på `referenceAt - 48h`. Hvis referencen ligger mellem native prøver, er vinduet komplet, når et verificeret compact bevis umiddelbart før grænsen og første bevis efter grænsen sammen dokumenterer højst tre timers kadence. Den faste rand er fortsat 0 ved den eksakte grænse; forgængeren er sammenhængsbevis, ikke en ny måling i vinduet.

Nærhed til grænsen er ikke nok. Et selvstændigt 47-timersdatasæt uden et verificeret bevis før grænsen skal fortsat være `WINDOW_INCOMPLETE`, og et internt hul over tre timer forbliver `WINDOW_HAS_TIME_GAP`.

Den offentlige 4.0.284-state havde allerede mistet forgængeren. Recovery må derfor kun sammenflette de kompakte afledte transportbeviser fra den eksakte hash-låste sunde Pages-kilde med den nyere public state. Den må ikke kopiere vejr, rå vektorer, koordinater, scoreoutput, geometri, punkter eller private data. Se DEC-0081.

## 4.0.284 – sikkerhed ligger på servergrænsen

Dynamisk håndbogs-HTML skal gennem `sanitizeTrustedHtml`; CSP og fravær af inline script er en separat browserbarriere. Ekspertens `experts_manage` er ikke fuld administration: RLS, RPC og UI må kun vise ekspertprofiler og `admin_access`, `handbook_view`, `handbook_review`.

Browserroller må ikke indsætte direkte i `observations`. `submit-observation` er den eneste offentlige skrivevej og skal validere allowlist, størrelse, struktur, privatliv, brugerbinding, tidspunkt, idempotens og rate limit før service-role-insert. Offentlige Edge-funktioner deler `_shared/public-gateway.ts`; CORS er ikke autentifikation, men origin-afvisning, payloadkontrol, rate limiting og brugerbinding skal virke sammen.

Rav-assistentens local-only 4.0.287/4.0.290-tilstand er historisk og erstattet af den ejer-godkendte 4.0.291-aktivering. DEC-0083's nulbetalings-, domæne-, data- og fallbackkrav består; DEC-0087 valgte GPT-OSS 20B og gjorde Gemini til historisk reference; DEC-0088 godkender aktiveringen med `false` som rollback.

Supabase har varslet mulig begrænsning fra 9. september 2026 efter tidligere egressoverskridelse. Kvoteovervågning er drift, men må aldrig lempe sikkerheds- eller releasegates.

## 4.0.283 – moderzonekobling i den afsluttende Candidate G-kontrol

`data/live/coastal-parts-v2.json` gemmer den autoritative moderzone som nøglen i `zones`; de enkelte kystdelsobjekter behøver derfor ikke et eget `zoneId`. Når en kontrol skal bruge en flad liste, skal moderzonen kopieres fra denne nøgle med `flattenCoastalPartsWithParentZoneId`. En almindelig `Object.values(...).flat()` mister koblingen og må ikke bruges, hvor evidens matches på både zone og kystdel.

Fejlen berørte kun slutkontrollens genkendelse af de otte godkendte native-kadencereferencer. Den byggede Candidate G-state og livepiloten havde allerede 673/673 scoreklare kyststrækninger. Kravene til eksakt strøm, godkendt native kadence, dataminimering og lokal fail-closed adfærd er uændrede. Se DEC-0079.

## 4.0.282 – eksakt reference ved native vinduesskift

De otte godkendte `dkss_lf`-regionalproxyer har ægte tretimerskadence. Hvis et Candidate G-beregningsvindue starter efter den seneste verificerede prøve, må state-pipelinen bruge den eksakte prøve som transportreference, men kun når den ligger før vinduet og højst tre timer tilbage. Prøven reduceres straks til `time` og kystrelativ `strength`.

Referencen er ikke en ny måling og må ikke skabe pil, ekstra bevægelse, mobilisering eller en opdigtet mellemtime. Rå U/V, koordinater, punkt-id og private kildefelter må ikke indgå i Candidate G-state. Efter tre timer stopper den konkrete kystdel fortsat lokalt. Se DEC-0078.

## 4.0.277 – årsagstro native kadence og bevaret Candidate G-state

Kun de otte ejerallowlistede `dkss_lf`-regionalproxyer må fastholde den seneste afledte transporttilstand mellem ægte tretimersprøver, højst tre timer. Fastholdelsen er ikke en ny måling og må ikke tilføje bevægelse, evidens, U/V, hastighed, retning eller pil. DMI og Copernicus kræver fortsat eksakt målreference, og fremtidige prøver må aldrig tælle som aktuelle.

PR #141 bestod exact-head `32817501003`, merge `81e9b891` og fuld produktion `32817626537`. Offentlig 4.0.277 har 673/673 Candidate G-states, 673 accepterede fortsættelser, nul resets og 12–45 timers naturlig historik. Candidate G 20/50/30 er eneste offentlige profil uden rollback eller legacyfallback. 0/210 zoner var endnu aktive, fordi ingen lokal kæde ved kontrollen havde nået 48 timer; dette er naturlig modning og ikke et krav om en ny realtidstest. Se DEC-0074.

## 4.0.269 – offentlig forklaringskontekst er ikke ny rådata

De tre offentlige RavScore-forklaringer skal bruge den valgte kystdels faktiske allerede-offentlige værdier og relevante Candidate G-state. Den lille forklaringskontekst er afledt visningsdata, ikke en ny rå strøm- eller privat datakanal: rå U/V, koordinater og private payloads er forbudt. Generiske scoreintervaltekster kan kun være supplement. Tidligere forløb skal mærkes som historik, og faste lokale reserveegenskaber skal mærkes som faste.

Mobilisering betyder bølgevirkning – ofte skabt af vind – på allerede tilgængeligt rav og let materiale. Vind er ikke direkte mobiliseringspoint; strøm transporterer. Et lavt aktuelt vandniveau hjælper ikke i sig selv indtransport, selv om vandstanden samtidig kan være stigende.

Fundprognosen er skjult, indtil et særskilt beslutningspunkt dokumenterer repræsentative afsluttede ture med både fund og intet fund. Observationer og intern læring bevares i den eksisterende datakontrakt. Se DEC-0068.

4.0.269 er produktionsverificeret via PR #120/exact-head `32703138969`, merge `d745e0ba`, produktion `32703271897` og live `rr-20260824080543-210`. Candidate G står globalt på 20/50/30 for 210 zoner og 673 kystdele, og den fulde browseraudit er grøn uden fejl.

## 4.0.125 – proveniens skabes ved indlæsningen
`update-dmi-bulk.py` parsergeneration 14 skriver DMI-identitet på den rå komponenttime: provider, collection, model-run og native valid time. `dmi-forecast-store.mjs` må kun interpolere identificerede trin med samme collection og model-run og fører lead time, forecast age, temporal resolution og native source times videre. To hydrerede pre-v14-trin uden identitet kan midlertidigt bevare tidligere værdiinterpolation, men får ingen opdigtet proveniens og udløser fortsat audit; et identificeret og et uidentificeret trin må ikke blandes. `update-weather.mjs` og vandstandskontinuiteten må ikke erstatte identiteten med en generisk DMI-markør. Public runtime forbliver slank; den fulde sporbarhed ligger i beskyttede conditions/audits.

## 4.0.124 – komponentintervaller og proveniens
Vind er produktionsdækket, og de fem tidligere DKSS-huller er lukket efter kode- og adminrettelser. Den bredere femdøgnsaudit fandt dog særskilte bølge- og marine halehuller i Limfjorden. `audit-implementation-plan-4.0.25.mjs` schema 3 måler derfor komplette feltsæt, sammenhængende providerintervaller, DMI/fallback/missing og manglende DMI-identitetsfelter for fem komponenter. Fuld timeproveniens skal skabes ved STAC/GRIB-indlæsningen; den må ikke gættes ud fra en senere samlet cache.

## 4.0.123 – DKSS-landmasker
Produktionens centralt gemte zonegeometri er bulkjobbets input og kan afvige fra repositoryets historiske datapunkter. Marine U/V-opslag undersøger 64 kandidater ved almindelige kyster og 128 i Limfjorden, men de fysiske afstandsgrænser og kravet om ét fælles U/V-gridpunkt er uændrede. `marineGridSearch.vectorPairs` skelner mellem fejl i strøm og vindhale. De fulde livecacher er vedvarende hydreringstilstand; offentlig browserruntime er fortsat `public-conditions.json`.

## Formål
RavRadar er et dansk kystbeslutningssystem for ravjagt. Systemet producerer en RavScore 0–100 og femdøgns/time-for-time prognoser for kystzoner. Scoren er beslutningsstøtte, ikke en garanti. DMI er den autoritative kilde til de marine og meteorologiske data, som projektet kan hente pålideligt.

Produktets femdøgnsmål skal skelnes fra én models native horisont. En komponentkæde bruger den bedst egnede DMI-kilde til dens sidste valide time, undersøger andre DMI-produkter som forlængelse og anvender først derefter ekstern fallback på den resterende hale. Kæden og skiftetiden fastlægges separat for hver komponent; fallback må ikke skubbe fungerende DMI-data ud. Se DEC-0030.

## Arkitektonisk sandhed
Der findes flere forskellige typer sandhed, som ikke må blandes:
- Git-repository: versioneret kode, tests og dokumentation.
- RDKS: aktuelle krav, beslutninger, status, issues og historik.
- Supabase: centralt gemt administratoropsætning og beskyttede workflows.
- DMI: autoritative vejr-/havdata.
- Genererede caches/public data: afledte snapshots, ikke kravgrundlag.
- Håndbog: faglig og operationel forklaring.
- Chatarkiv: historisk beslutningskontekst.

## Produktionskæde
GitHub-workflowet bygger først/forbereder data og deployer derefter et færdigt Pages-artifact. Tidligt synkroniseres central admin-konfiguration og godkendt zonegeometri. Derefter hydreres eksisterende frisk state, DMI-registre og DMI-bulkdata opdateres efter scheduler/tidsbudget, central weather-cache bygges, strømproveniens tilknyttes, public runtime bygges og valideres, referencezoner kontrolleres, supportpakke genereres og et lean Pages-artifact deployes. `_support` og private adminmellemprodukter må ikke ende offentligt.

Det bindende aktive workflowinventar står i `scripts/test-workflow-validation-order-4.0.108.mjs`. Kun `.github/workflows/update-and-deploy.yml` må deploye Pages; de øvrige registrerede workflows er private QA-, recovery- eller forskningsjobs uden Pages-rettigheder. `schedule-test.yml` og `pages-microtest.yml` blev fjernet i 4.0.121. `pages-build-deployment` er GitHubs platformsmekanisme og tælles ikke som repositoryfil. Den eksterne scheduler udløser fortsat produktionsworkflowet via `workflow_dispatch`. Copernicus-keepalive bruger dette workflows `requested`-event som read-only heartbeat og må kun dispatch'e den private pilot ved manglende aktuel UTC-time. Piloten må kun genbruge en afsluttet time, når dens recordmanifest og SHA-256-fingeraftryk matcher den aktuelle centralt hydrerede vandpunktsbestand; en punktændring kræver samlet genindsamling af timen.

## DMI bulk og vektorer
Aktive bulkfamilier omfatter DKSS-varianter for marine data, WAM for bølger og HARMONIE for vind. Schedulerens prioritet skal bestemmes af faktiske aktive zoners datagab, ikke kun historisk cacheindhold. Marinegrundlag prioriteres højt, fordi faktisk DMI-strøm ikke må erstattes af regionale antagelser.

Strømvektoren er særlig følsom. U og V må ikke vælges uafhængigt fra forskellige steder. Fra 4.0.116 kræves fælles fysisk gridpunkt. 4.0.117 stabiliserede dette yderligere: DKSS leverer current-komponenter i flere vertikallag, så kandidatcache og parring er lag-isoleret. Vektoren kræver samme forecasttid, samme fysiske gridpunkt og samme vertikallag; blandt gyldige fælles lag vælges deterministisk et fælles lag efter den implementerede policy. Parsergeneration 11 tvinger ældre assets gennem den korrigerede logik.

## Zonegeometri og administrator
Zoner er ikke statiske fixtures. Administratoren kan ændre navn, kystlinje, land-/havpunkter, retning og relevante ankre og kan slette zoner. Godkendte centrale ændringer skal anvendes på det autoritative zoneregister før vejrproduktion. Tests må ikke låse historiske navne, koordinater, antal eller retninger.

Ved Codex-overgangen blev dette produktionsverificeret: tre Limfjordszoner havde forkert geometri, blev korrigeret i admin, og den friske #1750-kørsel viste ændringerne i den centrale geometry-sync og førte dem videre til succesfuld weather-cache. Læringen er, at en datamangelsfejl kan skyldes både parser/scheduler og forkerte autoritative koordinater; begge dele skal kontrolleres før kodeændring.

## Vandstandskilder
Vandstandskilder omfatter observationsstationer og prognosepunkter. Observationsstatus og forecast/cache-status er forskellige begreber. En kilde kan fortsat være prognosebrugbar, mens dens gyldige forecastcache består, selv om nye observationer midlertidigt udebliver. Aktiv adminrouting vinder over auto-routing; auto primær/sekundær, afstande, vægte og metode skal være synlige og konsistente gennem score og prognoser.

## RavScore og historisk state
RavScore bruger aktuelle og dokumenterede forhold. Eksisterende pålidelige morfologidata bevares. Den historiske state-model beregnes i pipeline og er fortsat skyggetilstand i 4.0.117; den skal valideres fagligt før nye numeriske scorebidrag aktiveres. Faktisk DMI-strøm er eneste gyldige strømgrundlag for transportstate.

En større kildekritisk forskningsrunde er planlagt som P3, men ikke startet. Den skal senere validere hele kæden fra frigivelse til jagtbarhed, auditere den faktiske scorekode og særskilt undersøge, om rumlige strømstrukturer tilfører information ud over punktvise DMI-vektorer. Indtil en separat, evidensbaseret beslutning eventuelt siger andet, bruges generelle strømbånd fortsat hverken som scoreinput eller fallback. Forskningen har ingen automatisk tilladelse til at ændre RavScore.

## Performance
Public klienten skal starte hurtigt. Store råhistorikker, private audits og tunge beregninger må ikke flyttes til browserstartup. Den historiske målsætning/baseline er ca. 2–3,5 sekunder; tidligere regression mod ca. 13 sekunder er en advarsel om at holde pipelinearbejde server-/buildside.

## 4.0.117 – hvad der blev lært
En serie fejl omkring Limfjorden viste, hvorfor lokal symptomrettelse er farlig. Først blev schedulerens DKSS-rækkefølge korrigeret, derefter blev kandidatsøgningen undersøgt, men den dybere parserårsag var vertikallagsoverskrivning. Samtidig viste administratorens efterfølgende korrektioner, at nogle zoners geometri reelt var forkert. Den endelige arbejdsregel er derfor: undersøg hele kæden og alle autoritative inputs før du konkluderer rodårsag.

## Kendt åben kant ved overgangen
I den friske femdøgnsproduktion kan forecastets yderste timer vise `missing` for strøm/vandstand i enkelte zoner. Det er et dæknings-/horisontproblem, ikke tilladelse til at kopiere sidste værdi eller gøre missing til nul. Det skal undersøges som separat aktiv opgave.

## Lokal snapshot-advarsel ved handoff
Den projekt-ZIP, som Codex-handoffet blev bygget fra, består `npm run validate`, men den lokale `test:current-spatial-audit` rapporterer 12 advarsler om aktive zoner uden dokumenteret current-U/V-gridpunkt i netop det bundne datasnapshot. Det er ikke det samme som en frisk produktionsfejl. Ved overgangen har #1750 højere evidens for de senest korrigerede adminzoner, fordi den kørte efter central geometri-sync med friske data. Codex skal derfor altid sammenligne snapshot-tidspunkt, run-tidspunkt og commit før en warning erklæres aktuel regression.

## 4.0.117 – korrigeret releasehistorik før Codex
Efter den første handoff blev det opdaget, at topniveauet `success` på en almindelig automatisk vejropdatering ikke betyder, at hele release governance er kørt. Workflowet betinger `npm run validate` og `npm run release:gate` af `push` eller `force=true`, mens en almindelig `workflow_dispatch` med reel vejropdatering fortsat kan nå Pages-artifact og deployment. #1760 er et konkret eksempel: DMI bulk, central weather-cache, current provenance, public runtime, referencezoner, `validate:data` og Pages deployment var succes, men de to fulde gates var `skipped`.

Konsekvensen er, at de seneste automatiske grønne runs ikke må bruges som stabilitetsbevis. Den aktuelle 4.0.117-kode er på `main` og er deployet, men handoffet skal betragtes som **ikke fuldt release-verificeret**, indtil Codex har lukket gatehullet og en frisk kørsel har vist `success` på begge fulde gate-trin.

### Første Codex-rettelse
Gatehullet er lukket ved at lade både fuld validering og releasegate følge samme positive preflight-kontrakt som produktionsartifactet. En almindelig `workflow_dispatch` kan derfor ikke længere bygge frisk data og nå artifactet med triggerbetinget skipped gates. Negativ preflight stopper fortsat uden artifact/deploy. #1769 beviste korrekt stop ved rød validate; #1772 produktionsverificerede begge gates, artifact og deploy som `success`.

### Endelig admin-geometri før Codex
Efter #1758 blev yderligere fire zoner gennemgået manuelt og konstateret klart geografisk forkerte: **Fur syd**, **Gjøl og Attrup**, **Aalborg vest og Egholm** samt **Aalborg øst og Nørresundby**. Administratoren rettede deres kystlinje og/eller land-/havpunkter centralt. #1760 blev startet efter disse sidste rettelser og viste, at den efterfølgende DMI/weather/provenance/public/deploy-kæde kunne gennemføres. Da de fulde releasegates var `skipped`, er dette bevis for propagation/deployment, ikke fuld releasegodkendelse.

## Turdata v2 - permanent viden

Komplette ture med søgetid, grundighed, faktisk kystdel og startprognose er kalibreringsevidens. Enkeltfund og ældre ufuldstændige svar er kun dækningsdata. Stedskift mellem start og afslutning gør calibrationEligible falsk. Fjernlagring er kystdelsbaseret og må ikke indeholde GPS/rute. 25/40/35 er fortsat foreløbig produktionsvægt.
