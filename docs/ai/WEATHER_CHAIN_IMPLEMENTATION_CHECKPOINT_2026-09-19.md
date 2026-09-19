# Genstartscheckpoint: hele den igangværende vejrrettelse

Dato: 2026-09-19, efter Windows-genstart kl. 09.33.28 dansk tid.
Dette er genfundet implementeringsstatus, ikke en ny release eller et
produktionsbevis. Ejeren har udtrykkeligt krævet, at **alle fund fra den
store analyse følger med i rettelsen, som var i gang før genstarten**.

## NYESTE efter almindelig 4.0.435-kørsel

4.0.435 bestod exact-head `35457292220` og blev merged som `725068be`.
Normalrun `35457642258` fortsatte den gemte DMI-kandidat og gennemførte DMI,
Copernicus, Open-Meteo, DMI-first-samling, syvdageshistorik og scorebygning.
Den sikre stage-trace dokumenterer vind 673/673, bølger 673/673, direkte strøm
665/673 plus otte kontrollerede state-only-hold og beregnelig vade-/strandscore
673/673. Dette lukker den tidligere 0/673-vindhypotese for netop runnets data.

Stoppet kom først ved lagringen af hele den private `conditions.json`:
indrykket `JSON.stringify(output)` overskred V8's maksimale strengstørrelse.
Krypteret providerfremgang blev gemt efter fejlen. Lokal 4.0.436 bevarer alle
data, men skriver dokumentet kompakt, løbende og atomisk under en konservativ
parsegrænse. Helperen er med i privat fuldruntimekontrakt. Næste run skal
fortsætte gemt fremgang og bevise artifact/deploy; det må ikke blindt genhente
alt. Fordi fremgangen er bundet til den gamle protected bundle, gendanner en
snæver 4.0.436-engangsovergang kun `d4e8844e`/`ad2337ab…` med den gamle
reader og eksakte binding/hashes, før nuværende kode fortsætter. Se DEC-0215.

## NYESTE efter 4.0.431-merge og central ACTIVE31

4.0.431 er merged som `686ebec4` efter grøn exact-head `35448032367`.
Providerfri `35448284914` startede ingen providers og deployede intet, men
afsluttede PENDING som ACTIVE31/profil73 og anvendte/læste migration
`20260919020000` tilbage.

Det efterfølgende stop var forgænger-readernes ufuldstændige importlukning.
Den aktuelle wrapper manglede først komponentinventaret; importgrafen viste,
at den bagefter ville have manglet Supabase-helperens responsebody-transport.
Lokal 4.0.432 installerer begge modeluafhængige hjælpere sammen med wrapperen,
importtester dem og bevarer forgængerens modelkontrakt/bundleverifier. Eksakt
`4bee5b0d`-importreplay er grøn.

Dette checkpoint erstatter ikke den samlede vejrmatrice nedenfor. Alle dens
input-, rotation-, fallback-, bevarings-, historik-, Feggesund-, retry/cache-,
offentlige og browserbeviser er fortsat åbne til almindelig drift.

## NYESTE efter 4.0.430-merge og providerfri reentry

4.0.430 er merged som `f7c954fe` efter grøn exact-head `35446765316`.
Providerfri `35447099504` kaldte ingen providers og deployede intet; den
verificerede det eksisterende offentlige target 210/673 og gemte holdbar
evidens, men stoppede med central PENDING version 30 åben.

Lokal 4.0.431 retter begge sekventielle historiske stop samlet: senere
migrationskrav eftermonteres ikke på en korrekt hashforseglet gammel
readiness, og en gammel diagnostisk audit kan kun fortsætte, når dens
immutable plan allerede har calibration=false. Nye transitions, hash/head,
model/closure, profil, 210/673, privacy, historik/warmup og central CAS er
fortsat strenge. Sidste providerartifacts er krydstjekket mod hele matricen;
ingen af de tidligere fund er fjernet eller erklæret løst uden livebevis.

## NYESTE implementeringsstatus efter genoptagelsen

### Afgørende nyere status – går forud for alle ældre "åbent"-afsnit

Den samlede lokale rettelse omfatter nu også de punkter, som tidligere i
dette dokument stod som åbne:

- PENDING-genoptagelse er ikke længere bundet til GitHub-artifacts med
  14 dages levetid. En payloadfri, krypteret terminalkvittering gemmes i den
  eksisterende private Supabase-lagring med central pointer, CAS/readback,
  lost-response-håndtering og præcis run/attempt/head/binding.
- Failed-run-komponentfremskridt gemmes kun som autentificeret AES-256-GCM-
  ciphertext i Actions-cache. Nøglen afledes domæneadskilt med HKDF fra den
  allerede nødvendige `SUPABASE_SERVICE_ROLE_KEY`; der kræves ingen ny
  håndholdt secret. Filen er `.cache/weather-private-progress.encrypted`,
  og ciphertextloftet er 256 MiB.
- Den krypterede pakke omfatter ikke kun de nye CP/OM-komponentbanker, men
  også DMI active/candidate/current, CP/OM currentbanker og coastal staging.
  En vellykket protected-private-runtime gemmer de samme allowlistede
  fremskridt holdbart sammen med produktionsbaselinen.
- De aktive normal-, manuel- og currentveje bruger ikke længere rå private
  Actions-cachefamilier. Den gamle post-build-refresh, keepalive og
  pilot-oneoff er permanent deaktiveret. Rå officielle DMI-GRIB-assets er
  bevidst bevaret som tilladt kildedata.
- Den fulde fejlliste er bundet sammen i
  [lukningsmatrixen](WEATHER_CHAIN_CROSSCHECK_2026-09-19.md): DMI-plan og
  rotation, komponentbevaring, DMI/CP/OM-prioritet, 96-timersudfordring,
  DMI-only-vandstand, PP1D-bølgeovergang, H118–H120-trend, historik,
  checkpoint, reentry, Supabase-body-retry, Pages-rækkefølge, browser-shards,
  aktuelle timer, vagthund og vedligeholdelsesfri drift.

Lokale måltests for disse kæder er grønne, inklusive 11 krypterings-/restore-
cases, 10 private-pack-cases, 63 DMI/bootstrap-integrationscases og de
holdbare reentry-cases. Node-syntaks, Python-AST, YAML-parse og diffcheck er
også grønne. Dette er fortsat **ikke** produktionsbevis. Resterende forløb er:
færdiggør versions-/RDKS-/håndbogssynkronisering, synkronisér de to afledte
modelbundles én gang, kør korte måltests, commit/push, én fuld kildegate på
det eksakte PR-head, merge og derefter central reentry/deploy samt almindelig
vejrkørsel og browserbevis.

Alle ældre formuleringer nedenfor om manglende krypteringssecret, 64 MiB-
loft, rå cachebehov, uimplementeret 14-dagesreentry eller kun ni packfiler er
historisk arbejdsevidens og er erstattet af dette afsnit.

### Afgrænsning af rester efter seneste krydstjek

Den supplerende protected-wave-diagnose `35438520417` er afsluttet success
på isoleret diagnosticcommit `45342643`; kun læsning, ingen provider, upload
eller produktionsændring. Gammel reader/kontrakter og beskyttet generation
for 19/9 kl. 04 dansk er verificeret. Alle 673 aktive dele har mindst én
native perioderække før/på H0, som er MWP og forskellig fra PP1D. Blandt
34.434 sammenlignede PART-rækker er 34.404 forskellige: 15.763 før H0,
461 på H0 og 18.180 efter. 22 originalassets mangler fortsat i det gemte
manifest. Dette beviser dårlig historisk inputbank, ikke præcis hvilke
rækker hver gamle state faktisk konsumerede. Ingen falsk påstand om 673
bevist forkerte scorer eller om rekonstrueret historisk inputjournal.
Diagnosticbranchen må ikke merges til main. Mainrettelsen er fortsat lokal.

Eksisterende ukrypterede raw Actions-cacher er nu konkret kortlagt; den nye
komponentcache er IKKE en løsning for DMI active/candidate, CP/OM current-
banker, staging eller source-handoff. Se progressnotatets sidste afsnit.
Ingen data er slettet. Før en samlet overgang skal active og nyere gemte
fremskridt bevares krypteret og verificeres. Dette er et særskilt åbent punkt.

PENDING/artifactudløb er snævrere end den tidligere driftsbeskrivelse:
almindelig ACTIVE/samme-binding integrated maintenance opretter ikke
PENDING (`operationalIntegratedMaintenanceTransition`). PENDING-risikoen
gælder blandt andet bindingsovergange, første cutover og rollback. Stabilt
offentligt target kan genbevises fra central manifest/closure/binding og
eksakt GitHub-terminalkvittering uden gammel Pages-ZIP, men readiness,
audit og plan/profil kan ikke genskabes fra deres hashes alene. En generel
artifactfri completion er derfor ikke implementeret eller godkendt.
Særskilt recovery skal ikke udbygges til en ny daglig driftsafhængighed.

Ejeren har særskilt gentaget, at 14-dages-udløbet skal med i den samlede
rettelse til vedligeholdelsesfri drift. Kravet er nu eksplicit i DEC-0210,
aktive krav og roadmap: behold nødvendige beskyttede afslutningsbeviser,
mens en overgang er uafsluttet, eller genskab dem fra tilsvarende betroede
varige kilder. Længere retention alene og blind ignorering er afvist.
Dette er endnu ikke implementeret. Det er ikke en påstand om, at alle
vejrdata slettes efter 14 dage.

### Senere fortsættelse: faktiske lagertal og netværksrettelse

Read-only diagnosticbranch `codex/readonly-weather-evidence-20260919`
(`4c5489ec`, ikke merged) er pushet og kørt som run `35437186403`.
Den rører ikke produktion eller vejrudbydere. Storagejobbet beviser to
private objekter på tilsammen 95.212.566 bytes, heraf current 47.606.276
og previous 47.606.290; ingen ekstra/manglende/størrelsesafvigende objekter.
Nye komponentbankers størrelse er stadig ikke målt. Se progressnotatet.

Protected Storage-client genprøver nu ét afbrudt responsebody-download,
også efter HTTP 200. Chunked overgrænse afvises under læsning og genprøves
ikke som netfejl. Seks små cases og eksisterende storage/retentiontest
består. Dette er fortsat lokal kode, ikke ny release.

En krypteret Actions-cache for komponentfremskridt er implementeret lokalt
som enklere best-effort-alternativ til den tidligere Supabase-slotprotokol.
Kun krypteret pack, egen secret, autentificering før brug, eksakt beskyttet
baseline og almindelig providerkvalifikation; ingen model/statepromotion.
Normalworkflow beregner hele den verificerede bundles hash og binder den
sammen med conditionshash. Save sker efter providerarbejdet, også ved fejl,
men før senere gates. 64 MiB ciphertextloft bevarer gammel fil ved overskridelse.
Målrettet roundtrip/korruption/rollback/CP-originaltest og uafhængigt review
består. Secret og faktisk driftsbevis mangler; ingen cacheoprydning er udført.

### Seneste ejerbeslutning: vandstand kun DMI

Ejeren har nu afgrænset vandstand til DMI, inklusive tre-timers ændring.
CP/OM-datumomregning udgår af rettelsen; reserveveje skal også lukkes i
gammel forecast/cache/visning. Gyldig DMI bevares ved nye huller, og fuld
DMI-vandstandsdækning tilstræbes stadig. Implementeringen er nu lokalt
færdig i behovsplan, normal/legacy-hentning, bank, valg og vandstands-
kontinuitet. Eksisterende DMI-interpolation mellem DMI-ankre bevares;
gammel OM-bias fjernes. CP/OM-data i andre komponenter røres ikke.
Måltests består; det er ikke deployet. DEC-0210 og aktive krav er opdateret,
og dette går forud for nedenstående datum-restpunkter.
Vandstand indgår ikke i den historiske stateopbygning, men kan påvirke
offentlig kontekst og valg af bedste tidspunkt; offentlig visning skal
genbygges. Snæver migrationsklassifikation er implementeret og måltestet:
kun faktisk DMI-sanitizer-bevist fjernelse får `WATER_LEVEL_SANITIZED_STATE_UNCHANGED`;
begge modelstates bevares. Bølgeændring kræver fortsat relevant replay,
øvrige inputændringer og samme-time-publicering accepteres ikke ad denne vej.

Krydstjek fandt og rettede også to reelle hovedzonekanter: trim til 118
timer fjernede støtte til sidste tre trends, og den efterfølgende routing
overskrev dem igen. Nu bevares privat H118–H120 gennem begge trin, mens
public stadig har 118 timer. Præcis T+3 og eksisterende DMI-seriebevis
bruges; ingen ekstra offentlig horisont, stationsvalg eller geometriændring.
Aktuel trend følger routet aktuelt niveau. Historikkens rent numeriske
niveaumatch kan ikke længere godkende en afvigende gammel trend. 30 små
målrettede kontroller består. PART-adapteren var allerede korrekt på T+3
og ændres ikke af disse legacy/public-rettelser.

### Seneste fortsættelse: selvkørende drift og normal komponentkobling

Dette afsnit går forud for de tidligere delstatusser nedenfor. Stadig
ingen commit/push/ny version/SQL-installation/deploy/providerhentning.

- Ejerens nye bindende ramme er minimal vedligeholdelse og intet løbende
  Codex-abonnement som driftsforudsætning; måske ét årligt eftersyn.
  Kravet er skrevet i DEC-0210, aktive krav og begge roadmaps. Flere
  normale runs uden manuelle mellemtrin er et slutkrav, ikke lokalt bevist.
- `weather-component-runtime.mjs` er nu kaldt fra almindelig
  `update-weather.mjs`. Behov bygges fra samme kvalificerende PART-adapter;
  CP får arbejdet først, OM får genberegnede faktiske rester. Scoring,
  Feggesund-bevis og flowpunkter får samme opaque indeks. Normal workflow
  angiver 90 sekunders ekstra CP og 90 sekunders OM-komponentbudget;
  saved-weather/cache-only bruger nul. Eksisterende currentkæde er separat.
- Ingen vilkårlig udvidelse af kilometerafstand: ny OM-kontrakt bruger
  eksplicit native-nearest IFS/WAM O1280 og MF-SST-center. En tom celle
  flyttes ikke til en anden havcelle. Legacy210 bruger samme nye wind/wave/
  SST-requestvalg. Leverandørinterpolerede timer mærkes ikke native-exact.
  [Kildevurdering](OPEN_METEO_SPATIAL_POLICY_REVIEW_2026-09-19.md).
- Native CP/OM-vandstand er fortsat ikke DMI-centimeter. Det reelle hul
  bliver ved med at fremgå i behov/diagnostik, men den nye normalplan bruger
  ikke gentagne budgetter på et felt, som modellen endnu ikke kan optage.
  `pendingAdmissionComponents` synliggør begrænsningen. Datum/T+3 er åbent,
  ikke en godkendt permanent undtagelse fra komplethedsmålet.
- Valgt reserveprovider gemmes pr. sted/time/komponent i en hashbundet
  privat ledger. DMI kan overtage; CP får ikke generel overskrivningsret
  over tidligere gyldig OM. Hver kandidat genkvalificeres fra egen bank.
  Conditions-markøren skrives først efter den faktiske scoreopbygning og
  hash af den præcist gemte ledgerfil. Koordinatorens fejlrute genlæser
  delvist gemt fremgang offline; en in-memory-bank må ikke efterstemples
  som faktisk gemt. Fem koordinatorcases og to normalcallercases består.
- CP's faktiske originalbytes/static→Python→opaque Node→PART-adapter,
  waveflow og Feggesund DIRECT er måltestet. Tom behovsliste bevarer bank.
  Manglende/korrupte originaler frigiver kun berørte slots til genhentning;
  ugyldige bytes gemmes privat i karantæne, ikke i offentlig pakke.
  Manglende statik kan genhentes uden unødigt nyt dynamicdownload.
- Current96 er lokalt forbundet plan→producer→closure→Python/JS-læser;
  nyere CP kræver faktisk subsetbundet modelreference. Gamle qualified
  records uden alder kan fortsat fylde huller, ikke udfordre gammel DMI.
- Privat restore og migration håndterer nu præcis ni gamle filer eller
  ni plus den allowlistede komponentpakke. Originale CP-filer/receipts
  gennemgår byteidentisk roundtrip; pakken kopieres uændret ved ren
  kodebinding. Ni packcases, fire inventorycases og eksisterende routing
  består. National rå-/komprimeret størrelse er endnu ikke målt.
- Gammel faktisk score-weather/state kan eksporteres fra den beskyttede
  generation med dens gamle parser, men den gemte 4.0.429 indeholder ikke
  de allerede konsumerede rå historiske input. Bølgecachemetadata kan ikke
  skelne valgt PP1D fra MWP. Originale hashbundne GRIB-bytes skal undersøges
  før affected-optælling og historisk overgang; ingen blanket nulstilling.
- Vagthunden rapporterer nu gamle offentlige vejrtider trods nylige
  fejlede kørsler i en dansk payloadfri summary. Dispatch er uændret;
  der er ikke tilføjet beskeder hvert tiende minut eller en falsk
  deduplikeringsgaranti. [Afgrænsning](PRODUCTION_WATCHDOG_ADVISORY_2026-09-19.md).

**Konkrete rester for selvkørende drift:** nye komponentcheckpoints er
endnu kun varige på tværs af runners ved vellykket privatbundle-publicering;
failed-run-progress kræver beskyttet lagring og må ikke lægges råt i GitHub
Actions-cache i det offentlige repository. GitHub dokumenterer, at fork-PR
kan læse basebranchens cache ([officiel cachevejledning](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)).
Kapacitet skal måles, før progresslagring tilføjes; eksisterende publisher
kan kortvarigt have tre runtimegenerationer, mens retention regner med to.
Se [konkret progress-/kapacitetsdesign](WEATHER_COMPONENT_PROGRESS_PERSISTENCE_2026-09-19.md).
Desuden kræver genoptagelse af PENDING aktuelt 14-dages GitHub-artifacts;
holdbar reconcile-evidens efter udløb og en vedvarende-alarm-livscyklus er
fortsat åbne. Der er ikke lavet en ny storageprotokol eller nye abonnementer.

### Tidligere delstatus fra samme genoptagelse

Dette afsnit erstatter genstartsaudittens nedenstående status over, hvad
der endnu ikke var kodet. Hele den oprindelige fundliste bevares som scope.
Stadig ingen ny version, commit, push, SQL-installation, deploy eller
providerkørsel; lokale resultater er ikke produktionsbevis.

| Fundgruppe | Nu implementeret og målrettet kontrolleret lokalt | Stadig åbent |
| --- | --- | --- |
| 1–2, 12: DMI-plan og støtte | Separat fremtidskatalog efter H0-foundation, H118–H120 gennem LF-filter og dynamisk replan/resume, scalar-only støtte og vedligeholdelsescursor. | Normal driftsbevis, fuld PART-reservekæde og faktisk DMI-overtagelse. |
| 3, 11: Komponentbevaring/valg | JS og Python vælger nyere kvalificeret DMI med samlet værdi/bevis; strøm bevarer lokal grid-/lagprioritet. Samme-run-revision bruger alle native endpoints og officielle revisionsdatoer, ikke downloadtid/hash. Ny cachefil med huller bevarer gamle gyldige komponenter/timer for samme punkt. Stale parallel provenance fjernes før adapter. | CP/OM-producenter, fælles bank/admission/valgpartition og historisk inputmigration. |
| 4–5: Historik/checkpoint | Schema-5/companion-2 og ægte schema-4-læser; warmup build/save/publish forbundet i normal og saved/code-only. `MEASURED_WARMUP_PUBLISHED` giver ikke rollbackREADY. Generator matcher READY-nativehold på op til tre timer. | SQL-draft/schema/installer er bevidst STALE efter seneste generatorændring; endelig binding og model/input-overgang mangler. |
| 6–7: Genoptagelse/deploy | Fælles reusable reentry før admin-sync, præcist reusable-jobmatch, failed-complete recovery, fælles ny v2-kø, varigt code-only begin før Pages og monoton generation med eksakt samme-time-forgænger. Udløben runbundet first-cutover-nødvej fjernet; normal advisory uændret. | Virkelig central afslutning/Pages-bevis og korrekt input-/modelmigration før levering. |
| 8: Supabase | Afgrænset retry inkluderer response-body for sikre reads og identiske idempotente writes; relevante måltests består. | Faktisk central driftsbevis. |
| 9: Browser/artifact | Begge artifactbyggere kopierer hashbundne shards. Samme-time-visning genbruges, netfejl bevarer allerede verificeret visning, ny generation installeres atomisk, mobil-resume uden tvungen monolit/reload, gamle svar afvises, cache begrænset. Gamle input opfinder ikke fremtidige PART-detaljer. | Frisk faktisk artifactstørrelse og browser/Safari/åben fane. Et nyt offline-tidspunkt uden indlæst pakke må ikke mærkes aktuelt. |
| 10: Kontroller | Gammel current-coverage-regex erstattet af reelt dæknings-/MISSING-skel. Nye tests har selvstændige kommandoer, ikke flere tunge artifactkontroller. Hurtig samlet workflowstrukturtest består. Syv releasegate-modstrid og tre for brede afsnitsgrænser rettet efter DEC-0149/0193, ikke blanket accept af sikkerhedsfejl. | Endelige releasekontroller først efter integration. |
| 13: Felters betydning | Peak adskilt fra middelperiode, komplet positiv bølgetuple kræver retning, DMI-temperatur kræver eget kildebevis. CP-kildekontrakter dokumenteret særskilt. | Fuld CP/OM-reader→bank→PART-admission→replay→public, overfladelag/datum og gammel wave-migration. |

### Åbent driftsfund: komponentfremskridt før vellykket produktionsbundle

Nye CP/OM-banker med originale responsbeviser har endnu ingen færdig privat
save/restore-vej, der garanterer deres fremskridt efter et failed normalrun
på en ren hosted runner. Den færdige 9+1-produktionsbundle løser ikke alene
dette interval. Actions/cache er IKKE en løsning i det offentlige repository;
private punkter/originaler må ikke gøres læsbare fra fork-PRs.

Det konkrete design og de endnu åbne koblinger står i
[WEATHER_COMPONENT_PROGRESS_PERSISTENCE_2026-09-19.md](WEATHER_COMPONENT_PROGRESS_PERSISTENCE_2026-09-19.md).
Eksisterende beskyttet bucket/klient og componentpack kan genbruges, men
der er ikke bygget en ny pending-object/CAS-protokol i dette snit.

Vigtigt kodefund: `protected-private-production-runtime.mjs:1141` uploader
den nye generation, `:1146` readback-verificerer den, og først efter pointer-
CAS/readback slettes `existing.payload.previous` fra `:1244`. Der kan altså
midlertidigt være TRE runtimegenerationer i Storage. Kapacitetsrapporten i
`private-production-runtime-workflow.mjs:723` ganger derimod størrelsen med
`retainedObjectGenerations:2` (`:154`). 700 MB er det eksisterende samlede
vedvarende budget; det er ikke et målt bevis for peakplads under udskiftning.

Næste nødvendige evidens er en read-only optælling af faktisk current,
previous, eventuelle orphanobjekter og den nye komprimerede componentpack,
med fysisk peak under kandidat-upload, ikke kun 2× retained-estimat. Ingen
faktiske bytes er målt i dette snit; 20 MB pr. progressslot / 40 MB samlet
er kun et foreløbigt capforslag. Normalruntimegrænsen på 350 MB/generation
ændres ikke. Ikke-obsolete progress må ikke blindt slettes for at få plads.
Egen ny adminpointer kræver også bounded exact-key/versions-oprydning,
fordi den nuværende historytrigger ellers gemmer alle pointerversioner.

Dette er eksplicit åbent, ikke en aktiv persistensgaranti eller driftstest.
Normal komponentintegration fortsætter; ingen remote writes, SQL, YAML,
storageclient- eller publisherændringer er udført på baggrund af dette fund.

### Præcis grænse for den nye kildevalgsregel

`weather-component-selection.mjs` findes nu. DMI-til-DMI-delen er koblet
til den faktiske merge. 96-timerspolitikken har seks grønne afgrænsede
scenarier, men **er ikke koblet til den fulde CP/OM-produktion/closure**.
Helperen kræver eksplicit admission og låst vurderingstid; den skaber ikke
selv bevis. Ukendt reserve-modelalder kan udfylde et hul, aldrig bevise en
nyere prognose til overtagelse af gyldig DMI. Intet er efterstemplet fra
downloadtid. Rå DMI og valgt kilde skal fortsat holdes adskilt.

Se [faktiske CP-kildekontrakter og åbne metadata](WEATHER_COMPONENT_SOURCE_CONTRACTS_2026-09-19.md).
Toolbox-responsen har ikke modelRun; NWS-wave dokumenterer reference i
originalfiler, men metadata i aktuelle subsets er endnu ikke observeret.
NWS `zos`, Baltic `sla` og OM's MSL må ikke kaldes samme vandstandsdatum.
En afgrænset CP-komponentlæser er nu implementeret med 18 grønne fil→reader-
scenarier: rigtige variable/enheder, payloadbundet modelreference eller
ukendt alder, separat native datum, øverste Baltic-lag og bevaring af
gyldige søskendetimer. Det er ikke i sig selv lokal produktadmission eller
en tilkoblet vejrhentning; 2 km/16 MiB er foreløbige parsergrænser.

OM-forecastlæseren kontrollerer nu faktisk returnerede units og ens længde
for felt/timeakse, ikke kun forespørgslens indstillinger. Forkert enhed
gør kun berørt komponent ubrugelig og rapporteres; øvrige felter bevares.
Ugyldige kalenderdatoer må ikke normaliseres til en anden time. Selv en
synkron fejl ved start af én request forhindrer ikke den uafhængige anden.
Officielle felt-/unitkilder: [Weather API](https://open-meteo.com/en/docs)
og [Marine API](https://open-meteo.com/en/docs/marine-weather-api).

### Yderligere integration i denne fortsættelse (stadig lokal)

- OM har en privat PART-bank med faktisk responsbytes→request→felt-/unit-/
  koordinatkontrol→opaque index. Producenten kræver en konkret restliste og
  et caller-låst opbevaringsinterval; den skal ikke hente alt, blot fordi
  dens egen bank er tom. Gyldige søskendefelter bevares ved netfejl/huller.
  Punktændring/udgået del afgrænses uden kassation af uændrede dele.
- `verifiedIntegratedPartHourly` kan nu modtage dette verificerede index
  gennem `componentInputs`: vind, bølger og temperatur går ind i den
  faktiske modeladapter. DMI beskyttes; ukendt OM-modelalder giver aldrig
  96h-overtagelse. Feggesunds direkte wave-bevis kræver match til samme
  opaque index/record, ikke blot et selvskrevet verified-flag. Preflight,
  hovedadapter og historikadapter har samme nye parametersnit. Den normale
  pipeline loader/producer **leverer endnu ikke indexet**.
- Ny konkret upstream-fejl: Open-Meteo `best_match` kan blande modeller
  pr. felt/time og returnere en anden readers koordinat. Selv en komplet
  height/peak/direction-tuple i ét JSON-svar er derfor ikke tilstrækkeligt
  bevis på fælles model/celle. Både den nye PART-producent og den ældre
  `forecastFromOpenMeteo`-210-rute bruger nu særskilte navngivne modeller.
  Vind er IFS025 (ICON-EU's korte delkørsler har utilstrækkelig horisont),
  bølger er WAM025 med ægte total peak. SST kræver eksplicit nearest og
  genberegnet native center; level har særskilt sea-request. Legacy bruger
  nu samme låste start/slut i alle fire requests, inklusive H120, i stedet
  for vægur-relative past/forecast_hours. Højst to samtidige requests,
  uafhængige fejl og ingen lån af felter på tværs af modelsvar.
  [Pinned officiel kildekode og begrænsninger](OPEN_METEO_COMPONENT_SOURCE_CONTRACT_2026-09-19.md).
  Afstandspolitik er stadig ikke stiltiende udvidet for at få dækning.
- CP har nu en separat behovsplan/reader/privat bank med bevaret fremgang,
  T+3-støtte og responsbundet modelreference eller ukendt alder. En
  Python→JS-projektion binder tal og kildefelter uden sprogenes forskellige
  JSON-floatformater. Projektionens hash er **integritet, ikke selvstændig
  spatialautoritet**. CP-transport/spatialmyndighed og modeladapterkobling
  mangler fortsat; native vandstand må ikke ommærkes til DMI-niveau.
- Peak-period-migration har en afgrænset offline helper til faktisk ændrede
  inputs, statepar før første historiske ændring og verificeret suffix.
  Alternativet er kun berørt PARTs ærlige bounded cold replay. Ændringer
  strengt efter H0 bevarer H0-state og giver ikke unødvendig cold replay.
  Helperen er **ikke tilsluttet** og beviser ikke de gamle GRIB-bytes.
- v1 CP/OM-current-projektioner afviser nu eftermonteret ubundet modelalder
  i både Python og JS. Gamle kvalificerede records er fortsat huludfyldere.
  Ægte current-96h kræver en separat challenge-plan samt versionsbundet
  producer/bank/closure/læser; rå gyldig DMI-ledger må ikke omskrives til
  huller. Se [det konkrete integrationssnit](CURRENT_96H_SELECTION_INTEGRATION_2026-09-19.md).

Ingen af disse helpers må tælles som fuld normaldrift, fuld reservedækning
eller aktiveret 96-timerspolitik. Private filer/capacity og normal workflow-
transport er fortsat åbne; SQL og releasebinding er stadig ufrosset.

### Integrationssnit 19/9 ca. kl. 11.20 dansk

- OM har nu rigtig budgetafgrænset transport med respons-bytecap, timeout
  over både headers/body, retry for net/429/5xx og atomisk privat checkpoint.
  Gammel gyldig bank bevares ved budget0; korrupt eksisterende bank må ikke
  overskrives. Loaderen genvaliderer originalrespons, ikke statusflag.
  Centralt ændret zoneejerskab bruger aktuel `zoneId`; `sourceZoneId` er
  historik. Kun ændret PART pensioneres, uændrede søskende bevares.
- Krydstjek fangede en forkert placeret `componentInputs`-parameter ved
  current-tracing; den er flyttet til det tilsigtede Feggesund-hovedbevis.
  Preflight og hovedforløb får nu samme reserveautoritet.
- PART-pilen brugte tidligere rå DMI-record selv efter reservevalg i
  modellen. `partRows.record` bærer nu de faktisk sanitiserede/valgte timer.
  Flowpunktet kræver igen samme opaque reserveindex, nøjagtig tuple og
  kildebevis; en OM-vindpil mærkes ikke som DMI. Kortets vindpil accepterer
  denne eksplicitte kilde, også på den præcise valgte prognosetime.
- `weather-component-needs.mjs` planlægger fra allerede kvalificerede
  adaptertimer: ægte komponenthuller, manglende T+3 med privat støtte,
  særskilte ≥96h-DMI-challenges og senere DMI-overtagelse af reservedækning.
  Gammel DMI tælles ikke som missing, blot fordi den udfordres. OM får
  kun ægte huller, da dens modelalder stadig er ukendt. Planhelperen er
  endnu ikke tilsluttet normalcaller; ingen ny vejrtransport er kørt.
- Offentlig kildealder kan nu medregne faktisk respons-/subsetbundet
  CP-reference for valgt H0. Fetch-tid, forkert time, forkert payload og
  fremtidig modelreference er fortsat ukendt alder; ingen falsk friskhed.
- Aktive parallelle snit: CP pinned static wet/depth/point + bounded
  transport/verify-only originalbytes/opaque Node-index; current96 hele
  registry→producer→closure→live-adapter; privat migrationskompatibel
  extensionpack for nye banker og originale subsets/receipts. Afsluttede
  scenarier genbruges. Disse dele skal samles før final binding/levering.

Små nye beviser: normal OM-producer 2 scenarier, komponentbehov 4,
source-age 2, reserve→adapter→pil 3 og eksisterende kortpil/time-lock-checks.
Ingen tung sourcegate, providerkørsel, commit, deploy eller nyt geodatadiff.

### Oprindelse af bevarede data og endelig migration

Den eksisterende `migrate-post-cutover-private-runtime.mjs` må ikke
forveksles med reparation af ændret historisk input: den bevarer private
cachefiler byte-identisk og har kun snævre state-reparationer. Recovery
efter `initialState.time` genberegner ikke en ændring på/før dette tidspunkt.
Nødvendigt replay skal derfor starte før den første berørte historiske
værdi, eller beviseligt uændret attesteret historik skal bevares. Den
konkrete rækkefølge og begrænsninger er nu samlet i
[inputmigrationsplanen](WEATHER_INPUT_MIGRATION_PLAN_2026-09-19.md).
Ren modelBundle-ændring med uændret vejr/state/score blev fejlagtigt routet
til last-mile-repair. Det er nu rettet: migratoren klassificerer hele det
verificerede diff som `MODEL_BINDING_METADATA_ONLY`, når kun tilladte
bindingsfelter ændres, og workflowet bruger eksisterende strikt code-only-
sammenligning. Reel snæver state-repair følger fortsat reparationsruten.
Publisheren bevarer alle vejr-/state-/cachekrav; Candidate-bundle tvinges
ikke til en kunstig ændring. Ny lille routingtest er grøn. Dette er ikke
en løsning på ændret historisk wave-input.

Den historiske launch-undtagelse for run `34858950223` og fast
`f61efac…`-head er fjernet fra orchestrator/build/Pages. Den må ikke kunne
fabrikere deploy/action/model-outputs eller omgå predeploy privacy, state,
target og handoff efter den gennemførte cutover. Alle normale advisorytrin
er verificeret bevaret (1 orchestrator + 33 build). To afgrænsede fejl-
opsamlingsbetingelser efter Pages består: terminalen kræver stadig ægte
central completion eller verificeret reconciliation. Første legitime
cutover-validering er bevaret; der er ikke genindført tung blokering af
almindelige diagnostiske fund.

GitHubs cacheinventar er genlæst: seneste DMI-GRIB-cache fra
`35416641052` findes stadig (1.968.654.353 komprimerede bytes); DMI candidate
er ca. 5,8 MB. Dette er kun eksistens/størrelse, ikke verificeret indhold.
Ingen lokal privat DMI-bank/GRIB i de undersøgte supportpakker eller aktive
cachepaths; Supabase-credentials er ikke sat i denne terminal. Derfor er
det konkrete antal gamle MWP-/ubeviste wave-rækker endnu ukendt. Ingen
blind kassation eller ommærkning; genafkod præcise gemte filer, hvor de
findes, og genhent kun nødvendige wave-input, hvis de ikke kan genbruges.

### Seneste målrettede beviser

- Efterfølgende peerreview fandt og lukkede to konkrete mergehuller:
  kildebevis kontrolleres nu også ved første række, tom komponent og en
  donors ekstra timer, ikke kun ved erstatning af et eksisterende tal.
  Parent-cachevisningen genkontrollerer alle komponenter mod det aktuelle
  centrale punkt. 360° normaliseres ens til nord/0°; 361° accepteres ikke.
  Reelle kildefixtures erstatter en gammel test uden gyldigt bevis. Dæknings-
  optællingen må ikke tælle slettede/undefined værdier som gyldige felter.
- Copernicus `DatasetUpdating` får ét budgetafgrænset retry og bevarer
  eksisterende `IN_PROGRESS`/fallback/resume. Seks nye scenarier og den
  eksisterende wrappertest består; ingen providers er kontaktet.
- `test-weather-component-composition.mjs`: 22 scenarier, herunder faktisk
  producermerge/nyere cachefil, præcis tuple/provenance og 121→118-støtte.
- `test-weather-reserve-part-admission.mjs`: responsbundet OM→faktisk
  modeladapter→Feggesund-bevis, forkert sted/time/flag afvist, DMI bevaret.
  Det er lokale kontraktfixtures med den nye single-model-requestrettelse,
  ikke bevis for fuld livegeografisk dækning eller normalproducentkobling.
- Nye afgrænsede CP-bank/projection-, OM-bank-, current-modelreference-
  og wave-inputmigrationstests har selvstændige package-kommandoer, ikke
  yderligere blade i den faste tunge produktionsgate.
- `test-weather-component-selection.mjs`: 6 politiksituationer; ikke fuldt
  provider-/produktionsbevis.
- DMI native-chain 13 scenarier, DKSS-primary, WAM-producerintegration
  63/63 og scheduler/budgetrotation: bestået.
- DMI forecast-store/bulk integration, production adapters og current-
  coverage: bestået.
- Public refresh/inventory, mobile resume/load-performance: bestået.
- Pages-generation/reentry, workflow-outcome/reusable structure,
  operational readiness, checkpoint/old→new protected restore og
  Supabase-body-retry: bestået.
- `test-post-cutover-migration-routing.mjs`: præcis binding-only, faktisk
  repair og afvist ændret input/state/cache; bestået uden national fixture.
- Berørte releasegate-blokke og konkret privacy-bypass-mutation kontrolleret;
  ingen fuld releasegate. JavaScript-syntax: 65 filer, nul fejl på tidspunktet.
- 18 YAML-filer/43 jobs kontrolleret uden ugyldige dependencies/cykler
  eller dobbelte step-ID'er; fuld source/releasegate ikke kørt.

Genbrug disse målresultater. Rerun kun ændrede grænseflader. De slutlige
hash-/SQL-/artifactbeviser er ikke grønne endnu, og alle åbne punkter i den
oprindelige analyse består, indtil deres konkrete kæde er afsluttet.

## HISTORISK genstartsaudit: arbejdssted og faktisk fremgang

- Aktivt repository: `node_modules/RavRadar-4.0.396` under cb79/RavRadar.
  Ydre worktree er separat og må ikke ryddes eller bruges som arbejdsrod.
- Branch: `codex/4.0.428-weather-completeness`. HEAD/main:
  `4bee5b0d0909b56a6f66e0f0e961f51321f9d236`, version 4.0.429, PR #374.
- 41 tracked filer var ændret ved genstartsauditten, plus nye kode-, test-,
  analyse- og SQL-filer. Arbejdet er ucommittet. Ingen ny release, push,
  merge eller deploy er gennemført efter helhedsanalysen.
- Gemte sidste ændringer omfatter `update-weather.mjs` kl. 09.28.03,
  `update-dmi-bulk.py` 09.28.07, `app.js` 09.31.40 og checkpoint/SQL
  09.33.10–12. Gemte ændringer er bevaret næsten frem til genstarten.
  Eventuelt ikke-gemt arbejde kan ikke bevises bevaret.
- Det gamle handoff fra 09.06 beskriver stadig kun analyse. Det er historik,
  ikke bevis for at kodearbejdet mangler. Tidligere parallelle opgaver var
  ikke længere aktive efter genstarten; deres gemte filer er gennemgået.
- `.tmp-420/` er privat diagnostik og må aldrig stages eller publiceres.

Kilder, som denne liste skal læses sammen med:

1. [Helhedsanalysens 13 fundgrupper](WEATHER_CHAIN_REVIEW_2026-09-19.md).
2. [Krydstjek, arbejdspakker A–D og tværgående afhængigheder](WEATHER_CHAIN_CROSSCHECK_2026-09-19.md).
3. [DEC-0210: hele fallbackkæden og kildeprioritet](../rdks/10_DECISIONS/DEC-0210-ALL-WEATHER-COMPONENT-FALLBACK.md).

**Statusord:** Gemt betyder kode på disk; lokalt kontrolleret betyder kun
det nævnte scenarie. Delvis betyder, at kæden stadig ikke er færdig. Ingen
af nedenstående samlede fund erklæres produktionsløst.

## HISTORISK genstartsaudit: komplet kobling fra analysen til rettelsen

| Fund | Gemt arbejde | Restarbejde før fundet er løst |
| --- | --- | --- |
| 1. H0-vind, vindhorisont og fair DMI-plan | Foundation/native/horizon/maintenance-passager, fælles HARMONIE/DKSS-vindmåling og roterende vedligeholdelse i Python. | Horisontpassagen genbruger endnu H0-only-kataloget. Tilslut reelle fremtidige assets, nødvendige reserver og forbrugerens samme komponentbehov. Bevis passage fra H0-hul til horisontarbejde. |
| 2. 118 offentlige timer, støtteakse og fallback | Privat standardakse er 121 timer; strict PART-merge og adapter bevarer støtte, mens offentlig scoreakse fortsat er H0–H117. | Python LF-filter og resumeidentitet taber stadig H118–H120. Hele PART-kæden for øvrige reservekomponenter mangler. WAM-vind er kun en undersøgt kandidat, ikke en leveret vindhale. |
| 3. Nyere kvalificeret cachekomponent | Python-backfill vælger nyere kvalificeret komponent og bevarer strømmenes grid-/lagprioritet; værdi og bevis flyttes samlet. | JS-valget er stadig primary-first nogle steder. Afslut fælles friskhedsvalg, samme-run-konflikter og krydssprogsscenarier. Hash/hentetid alene må ikke bestemme nyere modelrun. |
| 4. Bevar modelhistorik under warmup og kodeændring | Checkpoint schema 5/companion 2, schema-4-læser, målt warmup uden rollbackREADY og `CHECKPOINT_COMPANION`-fortsættelse er gemt. SQL-generator og successor findes. | Workflows springer fortsat warmup-checkpoint over; endelig binding, SQL-installation og faktisk gammel→ny input/model/state-overgang mangler. |
| 5. Blandet lovlig historik og offentlig verifier | Readiness/runtimeaudit accepterer lovlig blanding pr. del; offentlig verifier er ikke længere begrænset til nul aktive zoner. Candidate G er fortsat særskilt streng. | Samlet central complete- og workflowintegration samt den reelle migration skal bevises. Lokal test er ikke bevis for central afslutning. |
| 6. Pages lykkes, central afslutning fejler | Verifierhelperen er udvidet som ovenfor. | Fælles genoptagelse før admin-sync, korrekt reusable-jobmatch og normal failed-complete-reconciliation er ikke ændret. Bevar holdbart begin/intent før Pages; genbrug allerede publiceret eksakt target. |
| 7. Samtidige ruter og baglæns publicering | Ingen workflowrettelse gemt. | Fælles kø for indgangene, ingen caller/reusable-deadlock, kontrol af monoton generation før Pages og præcis samme-time code-only-forgænger. Gamle kørsler må ikke vækkes. |
| 8. Supabase-fejl under svarlæsning | Retry omslutter nu sikker læsning og idempotent checkpoint-RPC inklusive body. Samme write-payload bevares. Små transporttests består. | Bevar parse-/størrelses-/integritetsfejl som reelle fejl og eksisterende CAS/read-back. Samlet produktionsforløb er endnu ikke kørt. |
| 9. Fastlåst H0, store filer og browser | Små hashbundne time-/zonepakker, manifestopfriskning, generationsbinding, afvisning af sene svar, begrænset cache, PART-timeakse og tidskorrekte flowpunkter er gemt. Privacy/verifier/code-only er udvidet. | Artifactkopiering er ikke tilsluttet. Mobil-resume kan stadig reloade. Netfejl kan fjerne gyldig visning. Gammel runtime mangler fremtidige PART-detaljer. Mål færdige pakker og kontroller faktisk mobil/åben fane. |
| 10. Forældede tests og hukommelse | Nogle relevante fixtures er tilpasset; ny genstartsoversigt retter forældet analyse-only-status. | Den gamle current-coverage-regex er endnu urettet. Nye tests skal indgå i rette målmatrix. Kontroller grænseovergange, ikke kun helpers; ingen fuld gentagen testspiral. |
| 11. Værdi/kilde/tid blandes og requests kobles | Dubletter vælges komponentvis med kilde; OM bruger eksakt UTC-union, eksakt T+3, selvstændige atmosfære-/marineforsøg og forecast uden afhængighed af current-kald. | Dette er ikke den nye fulde PART-fallback. Afslut kvalificeret vinder før normalisering, korrekt tuplefuldstændighed og faktiske merge-/adapterintegrationer. |
| 12. DMI får aldrig overtaget reserve | Sticky startflag er fjernet fra direkte vedligeholdelsesveto; roterende vedligeholdelsespassager er gemt. | Afslut scheduler-katalogkobling, ægte restarbejde og test faktisk CP/OM→DMI efter hullukning. Ubrugt `deferred_refresh_times` er endnu oprydningsrest. 96-timers-valgpartition er ikke kodet. |
| 13. Korrekte bølge-/temperaturvariable | OM forespørger peakperiode og adskiller felter/tider. DMI peakbevis er indført, se særskilt afsnit nedenfor. | CP/OM-producer, PART-admission, replay og public for alle nødvendige komponenter mangler. CP VHM0/VTPK/VMDR, reelt overfladelag, lokale vådceller og konkret Feggesund-dækning skal kvalificeres. |

### Yderligere fund fra krydstjekket må ikke falde ud

- **Peak kontra middelperiode:** Python decoder og Python/JS-admission
  skelner nu PP1D/231 fra MWP/232 og MP2/221. Kilden bærer faktisk feltbevis.
  Wave-only processingsignatur kan genafkode gemt WAM uden at kassere øvrigt
  vejr. Men påvirkede gamle produktionsrækker, bevarede hashkontrollerede
  GRIB-filer og nødvendig historikreparation er ikke afgrænset. Strammere
  admission må ikke leveres som om migrationen allerede er gennemført.
- **96 timer:** Den seneste plan bruger DMI-komponentens beviste modelrun
  ved låst `productionReferenceAt`, ikke hentetid, forecastlead eller det
  erstattede sidste-prognosedøgn-forslag. Rå gyldig DMI bevares adskilt fra
  den valgte række. Gyldig ældre DMI bevares uden nyere kvalificeret reserve;
  ny gyldig DMI kan overtage igen. CP/OM-cacherne mangler endnu responsbundet
  modelreference til at bevise nyere prognose. Ingen efterstempling fra
  aktuelle globale metadata. Python-closure og JS kræver samme versionerede
  valgpartition; dette er **ikke implementeret**.
- **Én inputkæde:** Der er endnu ingen ny generel komponentbank eller
  `weather-component-selection.mjs`. Legacy OM-zonehentning er ikke
  kvalificeret 673-PART-input. Producer, cache, plan, adapter, replay,
  modelinput, offentlig kildevisning og dækningsrapport skal bruge samme
  valgte komponent. Temperaturmangel alene skal ikke slukke en gyldig score.
- **Vandstandsreference:** Strict PART-merge undgår nu legacy-offset.
  Absolutniveauer er stadig ikke bevist sammenlignelige mellem DKSS, CP og
  OM. Niveau og eksakt T/T+3-trend kan have særskilte gyldige kildebeviser;
  en trend må aldrig dannes ved at trække to forskellige leverandørers
  niveauer fra hinanden. UI/min/max/waders-tiebreak må ikke sammenligne
  usammenlignelige niveauer. Den fulde referencekontrakt er åben.
- **Historisk korrektion:** Nye valgte historiske værdier kræver bevaret
  attesteret fortid eller replay fra før første ændring. Valg skal ske før
  replay-union; konflikter må ikke omgås. CONTRACT_ONLY_REBIND gælder kun
  uændret autoritativt indhold, ikke nye værdier/banker/repareret wave-input.
- **Privat kapacitet:** Nye banker skal med i fast inventory/hash/restore.
  Mål både rå og komprimeret størrelse, også ny PART-timeakse, mod 16 MiB
  checkpoint, 768 MiB pr. privat fil/2 GiB samlet, 350.000.000 komprimerede
  bytes og 8 objekter à 50.000.000 bytes. Ingen blind grænseforhøjelse.
- **Admin:** Centralt godkendte punkter er uændret autoritet. Almindeligt
  timeskift ændrer ikke punktidentitet. Kontrolleret genbrug af uændrede
  dele efter en reel fremtidig punktaktivering er særskilt roadmap, ikke
  en skjult geometri-/donorlempelse i denne rettelse.
- **Komplethed og normal drift:** Optæl faktisk gyldige nødvendige
  komponenter pr. del/time, ikke blot 210/673 struktur eller overlappende
  providercacher. Adskil hul, ikke forsøgt, upstream-fravær, lokalt afvist,
  gyldig reserve og mulighed for DMI-overtagelse. Sammenlign samme tidsakse
  mellem runs og fortsat state gennem en normal døgncyklus.

## Konkrete afbrudte integrationspunkter ved genstarten

Disse er konstateret ved read-only genlæsning af det gemte arbejde; de
behøver ikke en ny oneoff for at reproduceres:

1. `update-dmi-bulk.py`: foundation-kataloget afgrænses til H0 ved
   `list_latest_assets`; horizon-turn genbruger det og får ikke fremtiden.
2. Samme fil: LF-assetfilteret og `asset_identity_is_required_for_resume`
   accepterer ikke de nye private H118–H120-støttebehov hele vejen.
3. Ingen `.github/workflows`-filer er ændret. Warmup forventes stadig at
   springe build/save/publish af checkpoint over, trods nye helperfunktioner.
4. Ny SQL `20260919020000_measured_warmup_checkpoint.sql` binder stadig
   continuation `91251f6b…`, mens den gemte nye kode giver `877e2f5f…`.
   `schema.sql`, installer og parity-test peger stadig på gammel migration.
   Den syntetiske schema-test er ikke bevis for færdig releasebinding.
5. `copy-public-delivery-shards.mjs` har ingen workflowkald. Normal og
   code-only kopierer stadig kun de gamle fire livefiler. Nyt manifest
   ville derfor pege på filer, som ikke kom med i artifactet.
6. Shardload + global `conditionDetailsReady=false` kan udløse reload ved
   mobil-resume. Isoleret reproduceret: én reload, ingen resume.
7. Netfejl i reevaluate kan give `available:false`, som appen installerer,
   selv om den tidligere indlæste visning stadig er gyldig.
8. Gammel privat runtime mangler ny `part.hourly`. Ren code-only-ompakning
   kan ikke opfinde fremtidige lokale pile/detaljer, der ikke findes i input.

## Verifikation efter genstarten

Afgrænsede offline-/lokale checks, ingen providerkald eller produktionswrites:

- `node --check` på 34 ændrede/nye JS/MJS-filer: nul syntaksfejl.
- `git diff --check`: bestået også efter dokumentationscheckpointet.
- `node scripts/validate-rdks.mjs`: bestået efter opdatering af handoff,
  start, aktuel sandhed, implementeringsstatus, issues og log.
- `test-weather-component-composition.mjs`: 7 scenarier bestået.
- `test-dmi-native-chain-continuity.py`: 10 scenarier bestået; dækker ikke
  det faktiske katalog→horizon- eller LF/resume-støtteforløb ovenfor.
- `test-dmi-forecast-store.mjs`, `test-dmi-bulk-forecast-integration.mjs`,
  `test-ravscore-production-adapters.mjs`, `test-ravscore-recovery-replay.mjs`:
  bestået. Sidstnævnte beviser ikke den endnu ufærdige nye migration.
- Supabase admin-/response-body-retry, operational-state-readiness,
  operational-pages-deployment, continuation-checkpoint og protected-
  checkpoint-måltests samt migrationsgeneratorens `--check`: bestået.
- `test-ravscore-public-data-service-binding.mjs`: afsluttet med exit 0.
  Den syntetiske test var tungere end forventet. Ingen fortsat testproces;
  de ovenfor identificerede integrationsfejl består trods grønt helperbevis.

Ingen fuld kildegate, ingen ny CI, ingen browser-/Safari-produktionskontrol
og ingen komplethedserklæring. De målrettede resultater genbruges; gentag
kun relevante scenarier, når deres kontrakt faktisk ændres.

## Produktion og køer er ikke ændret

GitHub er læst efter genstarten: main er stadig `4bee5b0d`, seneste run er
`35421627495`, ingen aktive runs. Workflow 318363965 er `disabled_manually`.
Tre historiske queued runs findes stadig: `34868901509`, `34613079069`,
`34228112413`. De må ikke genoplives; ingen ny cancel/delete i denne audit.

Den senest dokumenterede fejl er stadig Pages-success i `35421108551`
efterfulgt af verifier-/central-complete-fejl, og derefter admin-sync-stop
før providere i `35421627495`. Sidste faktiske providerdata kommer fra
`35416641052`, produktionstime 19/9 kl. 04 dansk. Central PENDING30 og
komplethedstallene i helhedsanalysen er seneste gemte bevis, ikke en ny
central læsning eller frisk måling af vejr i denne genstartsaudit.

## Genoptagelsesplan uden at starte forfra

1. Bevar alle gemte ændringer; brug matrixen ovenfor som samlet restliste.
   De tre uafhængige genstartsaudits har afsluttet deres afgrænsede arbejde.
2. Færdiggør sideløbende DMI-katalog/støtte/komponentvalg, state/workflow/
   reentry/serialisering og public artifact/resume/netfejl. Udvid den
   manglende PART-fallback og afklar modelreference/datum i samme plan.
3. Saml inputvalg, wave-migration og modelhistorik før endelig binding/SQL.
   Tilslut private inventories, public leveringsfiler og tests i alle ruter.
   Ingen scoreformel, vægte eller geometriændring er del af ordren.
4. Kør målrettede tværgående scenarier med samlet fejlrapport. Derefter
   versionsløft alle steder, RDKS/changelog/begge håndbøger, særskilt bevis
   for version-only geodata og ét relevant exact-head CI-forløb.
5. Lever rettelsen uden lang vejrhentning, når input/migrationskontrakten
   tillader det; færdiggør allerede publiceret dokumenteret target uden
   nye providerkald. Nye faktiske værdier må ikke kaldes ren ompakning.
6. Bevis derefter normal vejrhentning, fulde gyldige felter, prioritering,
   fortsat historik, aktuel hjemmeside og central afslutning. Genaktivér
   planlægning kontrolleret uden historiske kørsler; derefter øvrig roadmap.

Astra Ultra er relevant til den endnu uafsluttede tværgående integration.
Bed ejeren skifte tilbage, når den kritiske analyse/integration er færdig;
genstartsauditten alene gør ikke resten til en simpel mekanisk opgave.
