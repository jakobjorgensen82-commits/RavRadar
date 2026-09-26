# AKTUELT CHECKPOINT – 2026-09-26 – 4.0.496 leveringsstop før R2 og Pages

Arbejd i managed worktree `r2-private-runtime`; cb79 er ikke
arbejdsroden. 4.0.495/PR #458 er merged som `a7f6ca8b`. Kort
normalrun `36244956035` gennemførte DMI, Copernicus, Open-Meteo,
cache og alle 54 artifactkontroller og gemte krypteret fremdrift
`36244956035-1`. Det stoppede før privat produktionsskrivning og
Pages, fordi én vandstandstest manglede sin importerede fixture,
og deployet assistant Edge havde gammel modelbundle-hash. 4.0.496
tilføjer fixturen og begge tests til den tidlige kildekontrol.
Kilde-, score- og vejrbindinger ændres ikke. Næste: målrettet
version/RDKS, exact-head CI, merge, providerfri code-only-deploy
med Edge-readback, derpå højst én kort normalrun fra eksakt gemt
fremdrift. Start ingen overlappende/lang kørsel eller oneoff.

R2-læsning er bevist, men ny produktionsskrivning er stadig åben:
fem objekter/199,96 MB/$0. Supabase Pro 26/9–26/10 viste
0,20 GB Cached Egress og 0,004 GB Egress. Flere vellykkede
driftsdøgn kræves til Free. Fem vejrfamiliers huller, Copernicus'
nul nye accepterede komponenter og 34 historiske temperaturfelter
kl. 26/9 07 UTC er åbne. Se CURRENT_TRUTH og ACTIVE_ROADMAP.

# HISTORISK CHECKPOINT – 2026-09-26 – 4.0.494 kildekontinuitet under lokal kontrol

Arbejd i managed worktree `r2-private-runtime`, branch
`codex/4.0.494-paired-weather-sources`; cb79 er ikke arbejdsroden. Run
`36232521656` stoppede før privat R2-publish og Pages på 1.380
vind- og 1.045 vandtemperaturtab mod offentlig 15Z. Ny lokal
4.0.494-kandidat genvaliderer 15Z's originale private kildepakke
og fletter dens gyldige DMI-, Copernicus- og Open-Meteo-input med
11Z plus krypteret fremdrift. Den flytter ikke offentlig JSON,
scoretilstand eller gammel scheduler-cursor. Almindelig progress-
restore forener også de to havstrømsdonorbanker med den beskyttede
produktionsbank. Test ti efterfølgende sparsomme DMI-generationer
bevarer alle fem fortsat gyldige vejrkomponenter. Koden er endnu
ikke merged eller bevist i produktion. De 34 historiske
temperaturtab kl. 26/9 07 UTC er fortsat et særskilt åbent punkt.
En samme-time-overskrivning af gyldig scorehistorik er nu også
lokalt rettet og testet, men ikke bevist som årsag til de 34 tab.

R2-migration `36225146256` kopierede to pakker/fem objekter med
byte-/SHA-readback og afvist anonym adgang; aktiv variabel er `r2`,
og `36232521656` gendannede fra R2. Ny produktionsskrivning i R2
er **ikke** bevist, fordi runnet stoppede tidligere. Cloudflare viste
26/9 fem objekter/199,96 MB, 38 Class A, 33 Class B og $0,00 i
perioden 26/9–26/10. Supabase Pro viste 0,00 GB i både Egress og
Cached Egress for den netop påbegyndte periode. Små admin-/pointer-
og deploy-beviser bruger stadig Supabase; ældre Supabase-kopier er
bevaret til rollback. En nulstillet tæller er intet Free-bevis.
Ingen ny vejrkørsel før exact-head-gate og sikker merge; derefter
kun én kort, ikke-overlappende bekræftelse med eksakt seneste
krypterede fremdrift. Mål alle fem vejrtyper, begge tidligere
grundlag, R2-gemning og offentlig visning.

# HISTORISK CHECKPOINT – 2026-09-26 – stop før ny vejrkørsel

Læs først `docs/rdks/90_INDEX/CURRENT_TRUTH.md` og
`.cache/codex-4.0.492-handoff.md` for den seneste 4.0.493-fejl og alle
åbne arbejdspunkter. PR #456 er merged, men run `36232521656` fejlede
før R2-publish/Pages på 1.380 vind- og 1.045 temperaturtab mod den
offentlige 15Z-pakke. 15Z er i dag kun tabsanker, ikke verificeret
komponentdonor. De ældre 34 temperaturtab kl. 26/9 07 UTC, nul nye
Copernicus-komponenter og store rester i fem vejrtyper er stadig åbne.
Ingen ny vejrkørsel, før den generelle kilde- og historikkontinuitet
er analyseret og sikret. En merged koderelease lukker ikke et
produktionsissue uden målt end-to-end-bevis.

# HISTORISK CHECKPOINT – 2026-09-26 – samlet 4.0.493 lokalt kontrolleret

Arbejd i managed worktree `r2-private-runtime`, branch
`codex/4.0.493-provider-continuity`. Den gamle cb79-rod er urørt.
PR #455/4.0.492 bestod exact-head `36227603554` og er merged som
`c41aa4721406392bddc49cb92f4b523f95a41858`. Kort normalrun
`36228162505` bruger netop `36183093672-1`: restore og DMI er
grønne; senest observeret opbygger den central vejr-cache. Ny privat
R2-publish, offentlig deploy og nul tab er endnu ikke bevist.
Ingen main-ændring eller overlappende vejrkørsel under denne lås.

Ejeren brugte den resterende Astra Ultra-tid på en samlet gennemgang
og er nu tilbage på Sol Ekstra høj. Se den konkrete evidens i
`docs/ai/PROVIDER_ACQUISITION_AUDIT_2026-09-26.md`.
Den samlede lokale 4.0.493 retter fem sammenhængende forhold:

- Kort DMI-bekræftelse må ikke registreres som en lang genopfyldning
  og udløse fire timers pause. Kun dokumenteret falske gamle markører
  fjernes; ægte langkørselsmarkører bevares.
- Copernicus får separate gemte positioner til huller og opgradering
  af Open-Meteo-data. Begge gennemløb rapporteres særskilt.
- De dokumenterede NWS 202511-metadata læses korrekt: manglende
  bathymetri-enhed og tredimensional overflademaske. Forkert eksplicit
  enhed, andre produkter og dybe lag godkendes ikke.
- Kort bekræftelse henter præcis det bestilte run/attempt fra cachen,
  ikke den nyeste tilfældige prefix-træffer.
- Krypteret fremdrift kan bevare DMI's prognose-/stationsinput;
  komponenter genvalideres mod central geometri og gyldighed.
  Gamle snapshots og fuld produktionspakke skal forblive kompatible.

Scoreformel, aktiv modelbinding, DMI-first/96-timersregel, DMI-only-
vandstand, admininterpolation og Limfjord-fastholdelse er uændrede.
Måltests og integration er afsluttet lokalt; exact-head CI og merge
mangler. 4.0.493 er ikke produktionsbevist. De 34 temperaturtab ved 26/9 kl. 07Z
må kun kaldes afkræftet, hvis præcis den time faktisk kontrolleres.
Der er stadig åbne dækning-/leverandørspørgsmål i alle fem vejrtyper.
Ingen lang hentning eller cron før kort save/deploy-bevis.
Permanent Supabase/R2-Free-overvågning består; dagens kvoteopgave er
sprunget over efter ejeren. Flytning alene er ikke et Free-løfte.

# HISTORISK CHECKPOINT – lokal 4.0.492 før merge og bekræftelse

Arbejd i managed worktree `r2-private-runtime`, branch
`codex/4.0.492-progress-hour-normalization`; ikke i den gamle
beskidte cb79-rod. Main er 4.0.491/`197f3cc3`, PR #454 merged.
R2-token og GitHub-secrets er installeret med bucketbegrænset adgang.
Migration `36225146256` kopierede to generationer, fem objekter,
199.955.131 byte; byte-/SHA-readback og anonym afvisning bestod.
Pointer og Supabase-originaler er bevaret; aktiv backend er nu R2.

Kort normalrun `36225273085` beviste R2-restore, 11Z-installation
og bevaret 15Z-tabsanker. Det stoppede FØR leverandørerne:
workflowets UTC-time uden millisekunder blev afvist af den nye
komponentsamling. Lokal regression genskabte præcis fejlen; 4.0.492
normaliserer de to eksakte UTC-timeformer og bevarer afvisning af
andre tider. En ekstra reproduceret fejl i overlappende Open-Meteo-
svar er rettet i en selvstændig operationel samler, som kun forener
de faktisk valgte bankposter. Den gamle replay-helper er ikke længere
produktionskaldt. Scorepakke, continuation og databasebinding er
uændrede, så allerede krypteret fremdrifts baseline ikke brydes.

Seneste gemte fremdrift er `36183093672-1`, 56.603.798 byte,
genbekræftet i GitHub 26/9. Den er hentearbejde, ikke en publiceret
prognose. De tidligere 34 vandtemperaturtab og ny R2-publish/Pages
mangler fortsat livebevis. Næste: måltests, exact-head-PR, sikker
merge, derefter ÉN kort normalbekræftelse uden overlap på aktuel main
med netop denne fremdriftskilde. Ingen lang hentning eller cron endnu.

Ejeren bad om en kort helikoptergennemgang med Astra Ultra før nyt
run. Se `docs/ai/WEATHER_CACHE_REVIEW_2026-09-26.md`.
Dagens kvoteopgave er sprunget over efter ejerens ordre; permanent
Supabase/R2-Free-overvågning er ikke ophævet. Lov ikke Free uden
målte driftsdøgn. Historiske checkpoints herunder er erstattet.

# HISTORISK CHECKPOINT – 2026-09-26 – lokal 4.0.491, R2 før vejrhentning

Arbejd i managed worktree `r2-private-runtime`, branch
`codex/r2-private-runtime`. Main er 4.0.490/`66e0f1b5` efter
exact-head-grøn PR #453. Rettelsen til de 34 tabte vandtemperaturpar
mangler stadig livebevis. Cron/vejrmonitor er pauset; start ingen
overlappende eller lang kørsel på ubekræftet cache.

Supabase Pro er midlertidigt aktiv efter 11,9 GB cachet og 6,45 GB
øvrig egress i forrige periode. Den private EU/Standard-R2-bucket
findes, men er tom. Lokal 4.0.491 flytter kun den store private
produktionsruntime; Supabase er fortsat default indtil migrationen
af current+previous er byte-/SHA-verificeret, anonym adgang afvist
og backend eksplicit skiftet. R2-konto-ID-secret er oprettet; scoped
R2-token og de to nøgle-secrets afventer specifik godkendelse.
Måltests er grønne lokalt, men ny combined exact-head-kontrol,
merge, live migration og kort normal weather/deploy mangler.
Supabase Free må ikke loves før flere målte driftsdøgn under begge
egressgrænser med reserve. Se DEC-0255 og aktivt roadmap.

# HISTORISK CHECKPOINT – 2026-09-25 – lokal 4.0.489, kort cachebevis

Arbejd i indlejret Git-rod `node_modules/RavRadar-4.0.396`, branch
`codex/weather-continuity-unified`. Main er 4.0.488/`34e25e5f`.
Normalrun `36153463393` stoppede før privat produktionscache og Pages,
fordi 34 tidligere gyldige vandtemperaturpar ville blive tomme;
de øvrige fire felter havde nul tab. Dets byggede 15Z-prognose er
ikke officiel cache. DMI's rå downloadfremgang og den krypterede
private fremdrift (56.144.813 byte, GitHub-cache-nøgle med
`36153463393-1`) blev gemt.

Lokal 4.0.489 ophæver 11Z-recoveryens udelukkelse af netop denne
kryptografisk bundne fremdrift. Et manuelt kort bekræftelsesrun
kræver eksakt cache-nøgle, godkendt restore og DMI-kandidat **før**
ny leverandørhentning; ellers stopper det tidligt. DMI, Copernicus
og Open-Meteo får korte budgetter, men central score/public,
begge tabsankre, privat publish og Pages er uændrede krav.
Copernicus' sikre statiske retryårsager og kort offentlig
tabsdiagnose er forbedret. De 34 temperaturtab er stadig ikke
forklaret eller løst. Målrettede JS-tests består; exact-head CI,
merge, faktisk genbrug, gemning og offentlig visning mangler.
Første exact-head CI på PR #452 fandt én glemt binding i det
centrale workflowinterface: de to nye valgfri kort-mode-inputs
var ikke registreret. Inventar og begge kaldere er nu synkroniseret;
automatisk normaldrift sender eksplicit `false`/tom kilde.
Målrettet interfacetest er grøn; ny exact-head CI kræves.
Ingen ny kørsel er startet. Cron er pauset; start ikke en lang
vejrhentning før kort end-to-end-bevis. De store resthuller og
leverandørprioriteten er fortsat åbne, se DEC-0254 og roadmap.

# AKTUELT CHECKPOINT – 2026-09-25 – lokal 4.0.488 (endnu ikke leveret)

Seneste ejerbeslutning: verificér både den fuldere beskyttede 11Z-
pakke og den tyndere aktuelle 15Z-pakke fra samme pointer; installer
kun 11Z og lad almindelig vejrhentning genhente 15Z's unikke værdier.
Brug 15Z som særskilt tabsanker, aldrig som privat score-/vejrdonor.
På 92 endnu fremtidige fælles timer har 11Z 72.520 gyldige feltpar,
som 15Z tabte, og 15Z har 3.238, som 11Z mangler. Ingen ny privat
pakke eller Pages før nul gyldig→tom mod begge. Frisk/tom cache og
fuld automatisk to-generationsfletning er ikke valgt. Den eksisterende
72-timersbro forlænges ikke. Lokal workflow og DMI-læseværn er
rettet. Første exact-head CI på PR #449 fandt en manglende
model-/databasebinding; begge genererede modelpakker,
continuation-identiteten og append-only-migration `20260925150000`
er nu rettet og måltestet. Gammel 11Z-state skal verificeres med
4.0.485-kilden og genbindes uden ændring af vejrdata; den eksakte
4.0.487-læser kontrollerer begge oprindelige pakker. Det gamle
checkpoint må ikke indlæses i denne ene overgang. Efter merge:
brug kun `apply-weather-model-binding-only.yml` til databindingen
før normalrun, ikke code-only deploy, som ellers kan fortrænge 11Z.
Ny exact-head CI, merge, database-readback og livebevis
mangler. Cron er deaktiveret. Tre gamle queued runs på andre main-
commits er endnu ikke annulleret, men deres egen tidlige SHA-gate
forhindrer beskyttet læsning/skrivning på gammel kode. Se DEC-0254's
tillæg og aktivt roadmap.

# HISTORISK CHECKPOINT – 2026-09-24 – første lokale 4.0.488-afgrænsning

Arbejd i den indlejrede Git-rod `node_modules/RavRadar-4.0.396` på
`codex/4.0.488-cache-lineage-guard`. Main er 4.0.487. Normalrun
`36022310055` deployede en tyndere 15:00-prognose, fordi fuld privat
cache ikke blev gendannet, men workflowet alligevel fortsatte. På 114
identiske timer og 673 kystdele mistedes tidligere gyldige par i alle
fem vejrtyper. Lokal 4.0.488 stopper normal drift uden fuld cache,
genfinder kun den eksakte komplette 4.0.485-forgænger, binder begge
restore-trin til samme pakke, bevarer fremtidig cachekompatibilitet
med en eksplicit lagrings-ABI og blokerer gyldig-til-tom-tab i den
offentlige prognose. DMI's budget og vandstandsprioritet samt
Copernicus' afgrænsede rotation er rettet lokalt. Måltests er grønne,
men exact-head CI, merge, flere almindelige vejrkørsler og offentlig
verifikation mangler. Cron og Codex-overvågning er pauset. Ingen
oneoff eller overlappende runs. Se DEC-0254, CURRENT_TRUTH og aktivt
roadmap; historiske checkpoints nedenfor er ikke aktuel releaseplan.

# HISTORISK CHECKPOINT – 2026-09-24 – lokal 4.0.486

4.0.485/PR #447 er merged som `cc45e971` efter grøn exact-head
`35991803426`; providerfri kodelevering `35992546525` er grøn.
Normalrun `35993736090` på samme main er grøn: seneste beskyttede
private cache blev genbrugt og en ny blev gemt; 11:00 UTC-pakken
`rr-20260924122409-210` blev deployet med 210 zoner/673 kystdele.
På præcis 114 fælles timer × 673 dele blev ingen gyldige værdier
tomme i nogen af de fem vejrtyper. Større resthuller består. Næste
ikke-overlappende normalrun `36009816840` er startet på uændret main
og skal følges til gemning og deploy. Ingen main-merge under denne
lås. Cron er fortsat pauset.

Lokal branch `codex/4.0.486-plain-score-prognosis` reviderer kun
offentlige score- og prognoseforklaringer. De skal være forståelige for
almindelige brugere, ikke nødvendigvis kortere. Hovedvisningen
forklarer strøm over tid, bølger, historikhuller og usikkerhed uden
fagjargon; modelpræcise årsager kan stadig åbnes som teknisk detalje.
Dansk, tysk og engelsk følges ad. Den aktive modelbundle er uændret
(`61ec5474…`). Målrettede lokale tests er grønne; exact-head, merge,
kode-only-deploy og visuel kontrol afventer det aktive run.

# HISTORISK CHECKPOINT – 2026-09-24 – lokal 4.0.485

Normalrun `35972581225` på 4.0.484 gemte og deployede 07:00-pakken.
Én rumlig strømaudit fejllæste otte autoriserede Limfjord-holds,
fordi den søgte `currentTransition` under rå `publicContext` frem for
produktionsprojektionens topniveau. Eksakt 115×673-overlap af to
offentlige prognoser fandt 274 gyldig→tom for vandtemperatur, nul
for de øvrige fire felter. En før-rettelse-rød reproducer viste, at en
ny marin time uden temperatur kunne skygge for gyldig temperatur.
Lokal 4.0.485 retter både audit og komponentvis DMI-timeudvælgelse
uden bredere tidsgrænse. Kun den eksakte seneste private 4.0.484-cache
er tilladt som forgænger i begge restore-trin. Copernicus meldte
datasætopdatering og gav nul komponenttilvækst; feltvise vejrrester
og livebekræftelse er åbne. Cron pauset.

# AKTUELT CHECKPOINT – 2026-09-24 – lokal 4.0.482 efter anden-restore-fejl

4.0.481 merged som `64599ed4` efter grøn exact-head-gate. Normalrun
`35952076841` stoppede før vejrleverandørerne: beskyttet restore
godkendte 4.0.480-cachen, men næste lokale restore afviste dens brede
hash. Ingen ny cache eller Pages. Lokal 4.0.482 binder andet trin til
præcis samme godkendte kilde og bundle; måltests grønne. Næste skridt
er exact-head, merge og én normalrun uden overlap. Først den kan
måle DMI/CP/OM og alle fem felter. Cron pauset. Se DEC-0252.

# HISTORISK CHECKPOINT – 2026-09-24 – 4.0.481 efter helkædeaudit

4.0.480 er merged (`38fa4c27`); normalrun `35939353111` var grønt,
genbrugte den aktuelle private cache, gemte ny pakke/checkpoint og
deployede `rr-20260924012618-210`. På 77.395 fælles positioner blev
ingen gyldige værdier tomme. Aktuelle 118-timers rester: vind 5.659,
bølger 5.919, havstrøm 5.868 i 57 dele, DMI-only-vandstand 66.491 og
temperatur 31.653, hver af 79.414. Open-Meteos egen rest 5.713 er et
andet trin i kæden, ikke offentlig slutrest.

DMI's `dkss_lf` nåede 31/115 native timer og startede ved tidligste
time. Copernicus prioriterede kun ægte unionhuller, mens dens gamle
post-build-kvalitetsjob er permanent slukket på grund af ukrypteret
cache. Lokal 4.0.481 roterer DMI's kritiske native timer efter de tre
nærmeste, giver Copernicus højst 360 s valgfri kvalitet i samme
krypterede normaljob og genbruger kun den eksakte 4.0.480-private pakke
med tre hashes. Måltests grønne, exact-head/produktion afventer.
Start ingen overlappende run; cron pauset, ingen oneoff. Efter merge
én normalrun og felt-/leverandørvis live-sammenligning. Se DEC-0251,
CURRENT_TRUTH og ACTIVE_ROADMAP.

# HISTORISK CHECKPOINT – 2026-09-24 – lokal 4.0.480 efter grøn normalrun

4.0.479 blev merged som `888d3c04`; kode-only `35919418385` og normalrun
`35920484428` var grønne. Normalrun genbrugte korrekt privat cache,
gemte ny cache/checkpoint og deployede `rr-20260923215727-210`.
Hjemmesiden viste prognose/rangliste og alle fem felttyper i et
kontrolleret browserudsnit. Det er **ikke** bevis for komplet dækning.

Eksakt sammenligning af 113 fælles timer med forrige deploy afslørede
22 tabte strøm-, 41 vandstands- og 41 temperaturpositioner, alle ved
én Limfjordstime 25. september kl. 07 UTC. Den gamle gyldige DMI-
kantværdi blev tabt, da et nyt modelrun kom til. Lokal 4.0.480 bevarer
den inden for den eksisterende tids- og proveniensgrænse uden at
interpolere på tværs af modelruns. En eksakt forgængerbro bevarer
muligheden for at genbruge 4.0.479's nyeste private pakke; anden
runtime er ikke godkendt. Måltests grønne, exact-head/livebevis mangler.

Sidste run sluttede med 5.620 manglende havstrømspar, 9.073 vind-,
5.352 bølge-, 64.525 vandstands- og 34.563 temperaturpositioner i
79.414 forecast-positioner pr. felt. Copernicus-segmenter kørte, men
Baltic NEMO var ofte under opdatering; Open-Meteo bar stadig for
meget, DMI's horisonter var korte. Disse er særskilte åbne barrierer.
Ingen ny normalrun før 4.0.480 er sikkert leveret og den seneste
cachelineage er bekræftet. Cron pauset. Se DEC-0250 og roadmap.

# HISTORISK CHECKPOINT – 2026-09-23 – lokal 4.0.479 efter fejlet normalrun

4.0.478 er merged som `693f4789`. Normalrun `35903476784` hentede vejr og
bestod artifactgates, men deployede ikke: beskyttet scorecheckpoint ramte
database-timeout (`57014`) to gange. Dets nye private vejrpakke blev ikke
gemt. Den offentlige 16:00-pakke fra `35887652848` er fortsat sidst
bevist deployet. Ingen ny normalrun før rettelsen er på main.

Den seneste private pakke blev allerede ved runstart afvist som
inkompatibel, fordi DMI's nye tidsfordeling ændrede et bredt
kildeaftryk. Model, scorestate og offentlig projektion var uændrede.
4.0.479 giver kun eksakt 4.0.477-pakke en afgrænset genbrugsvej med
fuldt arkiv-/tids-/integritetsbevis; det aktiverer også den eksisterende
krypterede fremdriftsgemning. Checkpoint-RPC alene får 30 sekunder via
append-only migration `20260923210000`.

Copernicus-nul er særskilt: første leverandørkald brugte alle 286
arbejdssekunder uden kvittering. Operationelle kald opdeles nu i
højst 24 timer og logger sikre startmål. Open-Meteo efterlod 5.501
havstrømspar i 57 dele, herunder mange null-svar; DMI dækkede 19.893
af 79.414 direkte havstrømspar. Begge restårsager og alle øvrige
vejrtypehuller er åbne. Næste normale, ikke-overlappende kørsel skal
bevise korrekt cache, leverandørfremgang pr. vejrtype, checkpoint,
gemt pakke og offentlig side; stop ved stagnation. Cron er pauset.
Se DEC-0249 og roadmap. Supabases 30. oktober-ændring berører ikke
eksisterende tabeller; fremtidige `public`-tabeller kræver eksplicitte
mindst mulige Data API-grants i samme migration.

# AKTUELT CHECKPOINT – 2026-09-23 – lokal 4.0.478 efter normalrun

`main` er 4.0.477 / `2bafe6c6`. Normalrun `35887652848` sluttede grønt:
nyeste private cache/checkpoint blev gemt, 210/673-runtime bygget og
`rr-20260923170622-210` deployet ved 16:00 UTC. Én af 54 diagnostiske
artifactkontroller fejlede: rumlig revision læste otte gyldige regionale
native holds med `WINDOW_HAS_MISSING_EVIDENCE` som almindelig MISSING.
Den integrerede producent/tilstandsvalidator tillader denne ærlige
ikke-klare historie. Lokal 4.0.478 retter kun revisionens klassifikation;
eksakt regional kilderække, vektorfrihed og tre-timersgrænse består.

DMI behandlede 98 assets på 1.499 sekunder, men nåede kun én IDW-time
efter bølgekørslerne og otte LF-timer. Dokkedal/Udbyhøj havde fortsat
kun 2/118 vandstandstimer. Lokal 4.0.478 reserverer proportional tid
til alle ventende kritiske WAM/DKSS-familier. Copernicus var stadig
`IN_PROGRESS`; Open-Meteo efterlod 5.531 havstrømspar i 57 dele.
Ingen af disse rester kaldes løst. Cron er pauset. Næste: målrettede
kontroller, version/RDKS, én exact-head CI, merge, én almindelig
ikke-overlappende kørsel fra gemt cache og feltvis/offentlig måling.
Se DEC-0248. De ældre topafsnit er historiske, når de modsiges her.

# AKTUELT CHECKPOINT – 2026-09-23 – lokal 4.0.471, normalplan pauset

4.0.470 er på `main` (`76f235be`). Godkendt trip-storage-run `35849255295`
anvendte og læste migrationerne `20260923091500` og `20260923100000`
tilbage uden fejl. Providerfrit kode-only-run `35849615112` genbrugte
samme private vejrpakke, byggede 210/673-runtime og checkpoint for 673
dele, men stoppede igen før beskyttede writes/Pages: checkpoint-RPC'en
afviste indholdet, mens wrapperen skjulte den præcise fejl. Den forrige
forklaring om manglende migration var derfor utilstrækkelig.

Lokal 4.0.471 retter en konkret uenighed: et målepunkt, der findes på
sidste time med tom styrke, klassificeres af JavaScript som
`WINDOW_HAS_MISSING_EVIDENCE`, men SQL klassificerede det som
`LATEST_SAMPLE_MISSING`. Ny append-only migration `20260923110000`
retter SQL; kode-only-workflowet anvender nu også migrationer ved den
normale integrerede handling. En sikker fejlklasse logges ved næste
afvisning uden privat payload. Dette er en stærk, men endnu ikke
produktionsbevist forklaring på stoppet. Næste: målrettede kontroller,
én exact-head-CI, merge, én providerfri deploy fra den aktuelle private
pakke og derpå én normal vejrkørsel med særskilt DMI/CP/OM- og
komponentmåling. Sidste normalrun havde 25.793 direkte DMI-, 0 CP-,
47.996 OM-havstrømspar og 5.201 huller. Det er ikke tilfredsstillende;
cron forbliver pauset.

# HISTORISK CHECKPOINT – 2026-09-23 – lokal 4.0.470

PR #431/4.0.469 bestod exact-head-kildekontrol `35843681490` og blev merged
som `a6ec7c9b`. Providerfrit run `35844441095` genbrugte den aktuelle
private vejrpakke, byggede runtime og bestod dens audit, men stoppede før
beskyttede writes/deploy ved historikcheckpoint: den virkelige kystdel har
sit ID som map-nøgle, mens checkpointkontrollen forventede det samme ID
gentaget som felt. Lokal 4.0.470 bruger den verificerede map-nøgle til
tilstandsidentiteten og afviser et eventuelt modstridende indre ID.
Måltesten bruger nu den virkelige projektion uden indre ID. Ingen vejrdata,
scoreformel eller geometri ændres. Næste: målrettede kontroller, én
exact-head-CI, merge, providerfrit deploy og derefter én normal vejrkørsel
med målt DMI/Copernicus/Open-Meteo- og komponentfremgang. Cron er pauset.

# HISTORISK CHECKPOINT – 2026-09-23 – lokal 4.0.469

Arbejd i den indlejrede Git-rod `node_modules/RavRadar-4.0.396`.
4.0.468 er på main (`9f9553c4`), mens offentlig side stadig bruger
4.0.467-datasættet. Providerfrit kode-only-run `35835042039` genbrugte
aktuel privat vejrpakke, men stoppede før deploy, fordi checkpointet
fejllæste et gyldigt kort Limfjord-hold uden fuld historik. Lokal
4.0.469 retter checkpointet (DEC-0240) og DMI's separate vindbarriere:
`35823773587` havde 23 officielle fremtidstrin, men nåede kun H0,
og fremtidig vind havde ingen egen tur ved allerede dækket H0.
En afgrænset vindtur får nu højst 120 sekunders slack efter de bevarede
DKSS/WAM-reserver (DEC-0241). Ingen datakomplethed er endnu bevist.

Næste: målrettet version/RDKS, eksakt-head CI, merge, providerfri
checkpoint/deploy, derefter én kontrolleret normal vejrhentning på
aktuel cache med komponentoptællinger før/efter. Scheduler-workflowet
er deaktiveret, og det gamle queued run blev annulleret. Genaktivér
ikke automatisk drift før stabil gemning, fuld kæde og faktisk fremgang
er bevist. `.tmp-420/` og øvrige `.tmp-run-*` må ikke stages.

# HISTORISK CHECKPOINT – 2026-09-20 – lokal 4.0.441 varig genindgang

4.0.440 bestod exact-head `35485303951`, PR #385 og merge `c00e6c5a`.
Normalrun `35485561037` stoppede før providers: den aktuelle private runtime
var kontraktinkompatibel, og den eksakte forgængerbro var blevet slukket af
versionsnummeret 4.0.440. 4.0.439 havde bevist broen, men stoppede senere ved
Copernicus og nåede aldrig at publicere en kompatibel efterfølger. Derfor
fandt runnet rå DMI-cache, men ingen installeret struktureret DMI-kandidat
eller dekrypteret providerfremgang.

Branch `codex/4.0.441-durable-bounded-reentry` pensionerer broen på faktisk
sourceafløsning, ikke versionsløft. Alle eksakte source-, bundle-, binding-,
kontrakt-, 210/673-, tids- og payloadfri krav består. Når den beskyttede
pointer ændrer source, bliver broen automatisk uanvendelig. Måltesten beviser
både fortsat exact-source-adgang og sourceændring → ingen overgang. Næste:
RDKS/version/målchecks, én exact-head, PR/merge og én almindelig continuation
fra den gemte fremgang. Ingen oneoff. `.tmp-420/` må aldrig stages. DEC-0219.

# AKTUELT CHECKPOINT – 2026-09-20 – lokal 4.0.440 timeoutaflevering

4.0.439 bestod exact-head `35481877393`, PR #384 og merge `badf84e9`.
Normalrun `35482138050` beviste, at forgængerrestore, rebind og installation
nu virker. DMI gennemførte og gemte fremgang. Copernicus gemte fem varige
segmentkvitteringer og nåede 5.855 par, men et sjette netkald ramte den hårde
tidsgrænse, før kvitteringerne blev samlet til et genbrugeligt stage. Den
strenge stagegate stoppede derfor før Open-Meteo; krypteret fremgang blev gemt.

Branch `codex/4.0.440-copernicus-timeout-recovery` reserverer den sidste del
af samme eksisterende tidsbudget til en netværksfri `--checkpoint-only`-
aflevering. Normal 360 s deles 288/300/60; extended 3.300 s deles
3.120/3.180/120. Recovery genafspiller kun fsync'ede kvitteringer gennem den
eksisterende atomiske bank/shadow/IN_PROGRESS-transaktion. Den strenge gate
består. DMI-first, providerprioritet, data og score ændres ikke. Måltests er
grønne. Næste: version/RDKS, exact-head, PR/merge og én almindelig
fortsættelse fra den gemte fremgang. Ingen oneoff. DEC-0218.

Første exact-head `35484940998` gennemførte alle tidligere sourcechecks og
fandt én forældet regression: den krævede, at 4.0.439's allerede anvendte
exact-release-engangsbro fortsat var aktiv i 4.0.440. Produktionskoden var
korrekt inaktiv. Testen beviser nu både 4.0.439-aktivering og senere
deaktivering; næste exact-head afventer.

# AKTUELT CHECKPOINT – 2026-09-20 – lokal 4.0.439 udfører forgængerovergangen

4.0.438 bestod exact-head `35471789111`, PR #383 og merge `2fbfe3b2`.
Backend `35472148224` anvendte den nye binding. Normalrun `35472299635`
gendannede beskyttet runtime og fremgang, gennemførte DMI, Copernicus,
Open-Meteo og aktuel closure og nåede 673/673 scoreklare kystdele.

Stoppet kom før score-runtime og deploy: workflowet genkendte den eksakte
`bounded-conditions-writer`-forgænger, men installerede den uden først at
udføre den eksisterende kontrollerede modelbindingstilpasning. Alle 673
gyldige fortsættelser bar derfor forgængerens bundlehash og blev afvist.

Branch `codex/4.0.439-bounded-runtime-rebind` fører kun denne eksakte,
forseglede forgænger gennem den hærdede migrering før installation. Dens
gamle læser, source/targetbindinger, kontrakter, inventar og 210/673 valideres.
Kun det kendte integrerede bundlemærke tilpasses; vejr, målinger og Candidate
G-state bevares. Ukendte afvigelser stopper. Næste er målchecks, RDKS/version,
én exact-head, PR/merge og én almindelig continuation. `.tmp-420/` er privat
og må aldrig stages.

# AKTUELT CHECKPOINT – 2026-09-19 – lokal 4.0.438 timeleveringspakke

Main er 4.0.437 / `65bda6a9`. Normalrun `35463989289` gendannede den
krypterede fremgang og gennemførte DMI, Copernicus, Open-Meteo, historik og
scorebygning. Det sikre spor viste vind, bølger, brugbar strøm og beregnelig
score 673/673. Runnet stoppede først ved den endelige private
`conditions.json`: den redundante 673 × 118-timeprojektion overskred stadig
V8's samlede streng-/parsemodel.

Lokal 4.0.438 bygger først den komplette offentlige runtime, færdiggør
strømproveniens og gemmer de eksakte 118 timefiler i en hashbundet privat
gzip-pakke. Den private conditions fjerner kun denne dobbelte hourly-kopi;
current, state, metadata, proveniens og scorer bevares. Conditions og pakke
installeres atomisk og publicering genskaber timefilerne byte-for-byte.
Startsidens færdigberegnede nationale oversigt bindes også, så den ikke kan
blive tom ved restore. Faktisk kapacitetsbevis: 203.510.947 rå bytes →
9.331.534 pakkede bytes.

Måltests og model-/migrationsbinding er grønne lokalt. Næste: RDKS/version-
slutkontrol, én exact-head sourcegate, PR/merge, append-only migration og én
almindelig continuation fra gemt fremgang. Derefter artifact, Pages, aktuel
time og næste cron. `.tmp-420/` er privat og må aldrig stages. DEC-0217.

# AKTUELT CHECKPOINT – 2026-09-19 – 4.0.435 resumérbar DMI-kandidat

4.0.434 er online efter exact-head `35453677623`, PR #379, main `d4e8844e`
og providerfri deploy `35454050404`. Normalrun `35456148104` startede ingen
provider, fordi en gendannet delvis DMI-base fejlagtigt skulle bestå strict
READY før DMI-producenten. Krypteret failed-run-progress blev gemt.

Lokal 4.0.435 skelner strict aktiv donor fra resumérbar kandidat. Kun strict
READY + register kan være aktiv; kandidat/ikke-READY deployed data fortsættes
af producenten og promoveres kun gennem den eksisterende efterfølgende gate.
Næste er én exact-head, merge og én almindelig weather. Mål vind fra 0/673;
ingen blind oneoff eller gentaget providerfri deploy. Se DEC-0214.

# NYESTE CHECKPOINT – 2026-09-19 – lokal 4.0.434 checkpoint-N/A

4.0.433 bestod exact-head `35451524450`, PR #378 og merge `b6afcdca`.
Providerfri code-only `35451791985` passerede den tidligere sekskodeaudit og
startede ingen providers. Den stoppede før artifact, fordi workflowet
fejlagtigt krævede et Candidate G-checkpoint ved `BUILDING_MEASURED_ONLY`.

Lokal 4.0.434 genindfører DEC-0114's eksisterende disposition
`NOT_APPLICABLE_DURING_MEASURED_WARMUP` i både code-only og normal weather.
Checkpoint-build/save/publish skal da alle være `skipped`; Pages, reentry og
outcome validerer allerede denne eksakte kombination. Den integrerede private
runtime gemmes fortsat og bærer conditions, state og private vejrcacher.

Måltests er grønne. Næste: versions-/RDKS-slutkontrol, én exact-head, PR/merge
og providerfri code-only. Derefter normal weather og måling af lokal vind fra
0/673 mod 673/673 samt score. `.tmp-420/` er privat og må aldrig stages.

# NYESTE CHECKPOINT – 2026-09-19 – 4.0.433 lokal code-only-kant

Main er 4.0.432 / `0d2fd78a` efter PR #377. Providerfri `35449470349`
bestod central ACTIVE-readback, migration, forgænger-restore, importkontrol,
privat runtimeinstallation og deterministisk 210/673-genbygning uden
providerkald eller ændrede vejrdata. Den stoppede før artifact/deploy på seks
auditfølgefund.

Der er én offentlig model: integreret RavScore. Den gemte runtime kommer fra
ældre kode, men er ikke en anden model. Den har zonevind 210/210 og lokal
kystdelsvind 0/673; derfor er alle 420 aktuelle scorevisninger utilgængelige.
Lokal 4.0.433 fortsætter kun på præcis de seks koder ved metadata-only,
210/673, 1.346 modes, 420 utilgængelige, nul replay/privacy/continuationfejl
og uændret vejr. Ukendt diagnostik stopper. Candidate G er pensioneret i
produktionsdispatch; inert historisk kode røres ikke nu. DEC-0213.

Næste: korte målchecks, én exact-head-sourcegate, PR/merge, providerfri
code-only og derefter normal weather med konkret måling af lokal vind/score.
`.tmp-420/` er privat og må aldrig stages.

# NYESTE CHECKPOINT – 2026-09-19 – 4.0.432 komplet forgænger-restore

Main er 4.0.431 / `686ebec4` efter PR #376 og grøn exact-head
`35448032367`. Providerfri code-only `35448284914` startede ingen
vejrleverandører og deployede intet, men afsluttede central PENDING som
`INTEGRATED_ACTIVE` version 31/profil 73 og anvendte/læste migration
`20260919020000` tilbage.

Kørslen stoppede bagefter, fordi den nye restore-wrapper blev lagt ind i den
eksakte forgængerkilde uden sine to nyere, modeluafhængige hjælpefiler. Første
manglende modul var komponentinventaret; næste latente fejl var Supabase-
transporthelperens manglende eksport. Lokal 4.0.432 kopierer præcis wrapper,
transporthelper og inventar som én importtestet kompatibilitetslukning. Den
gamle modelkontrakt og bundleverifier bevares. Eksakt `4bee5b0d` importerer
lukningen lokalt. Se DEC-0212 og CHANGELOG-4.0.432.md.

Næste er målrettede slutchecks, én exact-head-sourcegate, merge og samme
providerfri code-only fra ACTIVE31. Start ikke weather før kodeleveringen er
online. Derefter almindelige vejrkørsler og browserbevis for hele DEC-0210-
matricen. Ingen vejrfejl er fjernet eller kaldt produktionsløst. `.tmp-420/`
er privat og må aldrig stages.

# NYESTE CHECKPOINT – 2026-09-19 – 4.0.431 historisk reentry

4.0.430 bestod exact-head `35446765316`, PR #375 og blev merged som
`f7c954fe`. Providerfri code-only `35447099504` startede ingen providers og
lavede intet deploy. Reentry fandt det allerede offentlige 4.0.429-target,
verificerede 210/673 og backfillede holdbar source-/targetevidens, men central
PENDING version 30 er fortsat åben.

Den konkrete fejl havde to kanter, som er rettet samlet i lokal 4.0.431:
historisk readiness blev fejlagtigt sammenlignet med 4.0.430's nyere
migrationsliste, og den oprindeligt tilladte diagnostiske warmup-audit ville
bagefter være blevet krævet grøn. Historisk genoptagelse følger nu sin eksakte
forseglede hash/plan; nye overgange følger fortsat dagens fulde krav.
Diagnostiske fund kan kun fortsætte med forseglet calibration=false. Hash,
head, binding, closure, 210/673, privacy, history/warmup og central CAS er
uændret strenge. Se DEC-0211 og CHANGELOG-4.0.431.md.

Regressionen efterligner de tre faktiske auditkoder og forgængerens kortere
migrationsliste. Activation, Pages-generation/reentry, protected evidence,
workflow-outcome, terminal, version, RDKS, håndbog og modelbinding er grønne.
Næste: én exact-head-sourcegate, merge og samme providerfri reentry. Start
ikke weather før PENDING og code-only deploy er afsluttet. `.tmp-420/` må
aldrig stages. Derefter almindelige vejrkørsler som produktionsbevis for hele
4.0.430-kæden; den er ikke endnu erklæret stabil eller komplet.

# NYESTE CHECKPOINT – 2026-09-19 – hele helkæderettelsen samlet før levering

Den ucommittede rettelse omfatter alle aktuelle vejr-, cache-, historik-,
reentry-, deploy- og browserfund. Krypteret progress bruger
`.cache/weather-private-progress.encrypted`, 256 MiB og afledt eksisterende
service-role-secret; holdbar privat terminalevidens fjerner den funktionelle
14-dagesgrænse. Gamle rå private cachewriters er fjernet/deaktiveret.
Læs først [samlet lukningsmatrix](WEATHER_CHAIN_CROSSCHECK_2026-09-19.md) og
[implementeringscheckpoint](WEATHER_CHAIN_IMPLEMENTATION_CHECKPOINT_2026-09-19.md).
Produktion er stadig 4.0.429; lokale tests er ikke produktionsbevis.

De tidligere topafsnit nedenfor er arbejdshistorik, når de modsiges af dette.

Seneste ejerbeslutning i fortsættelsen: vandstand og tre-timers ændring
skal kun komme fra DMI. CP/OM-datumomregning udgår; øvrige reserver består.
Se DEC-0210's nye topafsnit. Den gamle datum-restliste nedenfor er erstattet.
Root har desuden måltestet retry ved afbrudt Storage-responsebody. Isoleret
diagnosticbranch `codex/readonly-weather-evidence-20260919` er kørt som
`35437186403`: 95,2 MB faktisk Storage og konkret gammel MWP/PP1D-forskel
i gemte native rækker. Det er ikke endnu en optælling af berørte scorestates.
Ingen provider eller produktionswrite. Den store rettelse er stadig lokal.
Vandstand er nu afgrænset lokalt gennem hentning/valg/legacy-visning;
historik/T+3 og snæver state-neutral migration er også måltestet. Krypteret
progress er koblet til normalworkflow med eksakt bundle+conditionsbinding,
256 MiB cap og måltestet rollback; kun aktivt driftsbevis afventer.
Anden read-only diagnose `35438520417` har verificeret protectedgenerationen
med gammel reader. Alle 673 aktive inputbanker har forkert periode før/på
H0; faktisk gammel statepåvirkning er ikke bevist. Næste er den eksisterende
parrede measured-cold replay for det nu dokumenterede eksponeringsscope,
ikke endnu en identisk diagnose. Se inputmigrationsplanen. Eksisterende rå
private cachewriters er fjernet/deaktiveret og deres filer indgår i den
samlede krypterede overgang. Remote caches slettes først efter en bevist ny
generation.

Læs [hele implementerings- og genstartsoversigten](WEATHER_CHAIN_IMPLEMENTATION_CHECKPOINT_2026-09-19.md).
Ejeren har bestilt den samlede rettelse og gentaget, at ALLE fund fra den
store analyse skal med. Arbejdet er startet og bevaret på disk, men er
ufærdigt og ucommittet. Ingen ny produktversion, produktpush, merge, deploy
eller weather. Kun den ovennævnte isolerede read-only diagnose er pushet.

Aktiv rod er stadig indlejret `node_modules/RavRadar-4.0.396`, branch
`codex/4.0.428-weather-completeness`, main/HEAD `4bee5b0d`, 4.0.429.
Der er gemte rettelser i DMI, komponentmerge, checkpoint/retry og public/UI.
Workflows er nu forbundet med warmup-checkpoint, fælles recovery/kø,
monoton Pages-generation og public-shardkopi. DMI-horizon har eget katalog;
LF/resume bevarer støtteaksen. Nyere kvalificeret DMI vælges komponentvis;
nyere cachefil sletter ikke længere gyldige huller/tail fra den gamle.
Mobil/netfejl/geninstallation er rettet lokalt. PART-fallback for alle
komponenter, koblet 96-timersvalg, DMI-only-vandstand og den kontrollerede
input/state-overgang er implementeret lokalt. Endelig versions-/binding-
synkronisering og produktionsbevis mangler. Se checkpointets NYESTE afsnit;
de nedenstående gamle notater om urørte workflows er historik.

Seneste snit: OM's single-model-rettelse er færdig i både PART og almindelig
210-zone-hentning; faktisk normalfunktion bruger låst H0..H120. Privat
budgetteret OM-transport er klar. Valgte reserveinput følger nu videre til
kortpile med samme kilde/time, og CP-kildealder bruger kun responsbundet
reference. Behovsplan skelner ægte huller, aged-DMI og DMI-opgradering.
CP-spatial/transport→actual adapter, current96's normale delkæde og
bankernes private restore er nu lokalt måltestet. Normal topcaller er koblet
til komponentkoordinator→score→gemt valgledger; workflowbudget er 90s+90s,
cache-only 0. OM's nye native-nearest-policy bruger præcist IFS/WAM O1280
og MF-SST, ingen kilometer-/sea-nabolånslempelse. Vandstandsdatum er afgrænset
til DMI, og den historiske input/state-overgang er implementeret lokalt.
Se checkpointets nyeste topafsnit.
Ingen nye afstande/datumomregninger er godkendt af helpernes grønne tests.

Ejerens seneste præcisering: cron/GitHub skal kunne køre uden Codex som
manuel kontrollør/retry/cacheflytter. Gemte data/rotation skal overleve
ren runner, og flere almindelige kørsler uden håndgreb er acceptkrav.
Se DEC-0210; cron er ikke genaktiveret ved denne dokumentation.

Fortsæt fra matrixen i checkpointet; begynd ikke analysen eller en oneoff
forfra. Små lokale checks består, men er ikke produktionsbevis. Cron er
fortsat disabled; tre historiske kørsler står queued og må ikke vækkes.
`.tmp-420/` må aldrig stages. Scoreformel og geometri er ikke ændret.

# HISTORISK ANALYSECHECKPOINT – 2026-09-19 – samlet kædeanalyse

Ejeren har fastholdt ALT i helhedsanalysen, ikke kun 96-timersreglen. Læs nu
også [tværgående krydstjek og samlet rettelsesplan](WEATHER_CHAIN_CROSSCHECK_2026-09-19.md).
Nye fund/præciseringer: DMI alias kan blande peak- og middelbølgeperiode;
privat 118-timersmerge mister støtte til sidste TRE vandstandstrends;
CP/OM-cache beviser ikke modelalder; warmup-/public-schemaovergange skal
bevare gammel læser. Public-opdeling er størrelsesmålt på ældre artifact.
Ingen kode, providerkørsel eller deploy i analysen; kun dokumentation.

Seneste afklaringspunkt: Ejeren foreslår nu fire døgn gamle DMI-data frem
for prognosens sidste døgn som reserveundtagelse. Anbefaling: mindst 96
timer fra komponentens beviste DMI-modelrun til låst vurderingstid, ikke
downloadtid eller lead. Nyere gyldig reserve må da overtage; ellers bevares
gyldig DMI. DEC-0210's nye topafsnit er autoritativt for diskussionens status;
H94..H117 nedenfor er et tidligere forslag, ikke implementeringsordre.

Læs først [helhedsanalysen](WEATHER_CHAIN_REVIEW_2026-09-19.md). Main er faktisk
`4bee5b0d` / 4.0.429, PR #374, grøn exact-head `35420912328`. Saved-weather
`35421108551` deployede Pages, men offentlig profilkontrol fejlede og central
status blev PENDING. Normalrun `35421627495` stoppede derfor før providerne.
Sidste fulde providerdata er stadig `35416641052`, H0 19/9 kl. 04 dansk.

Ejerens bindende korrektion: Copernicus/Open-Meteo skal udfylde alle huller i
alle nødvendige vejrtyper efter DMI, ikke kun strøm eller yderste timer.
Gyldig DMI, også gyldig gemt DMI, bevares. Fallbackens snævre PART-accept er
en implementeringsmangel. Eksisterende Open-Meteo-zonehentning er ikke nok,
når den nye models adapter afviser felterne.
Ejeren har desuden præciseret, at reservedækning ikke må låse DMI ude:
almindelig DMI skal med ledig kapacitet opsøge og overtage gyldige CP/OM-
komponenter for samme sted/time. Bevar reserven, indtil DMI er kvalificeret.
Planlæg ægte huller og kildeopgradering særskilt. Se DEC-0210.
Det mellemliggende forslag om sidste prognosedøgn er historisk og erstattet
af 96-timers-forslaget. Det må ikke indføres som en parallel regel.

Analysen dokumenterer sammenhængende problemer i vindplan/horizon,
komponentfriskhed, modelhistorikkens persistens, readiness/verifier,
central genindgang, samtidige runs, retry og browserens permanente H0-visning.
Nuværende detaljefil er 148 MB. Browserfejlen er livekontrolleret i Chrome;
mobil/Safari-bevis mangler. Nul H0-vind, otte aktuelle strømmangler og 156
Feggesund-bølgedeltimer er fortsat åbne. Ingen komplet/stabil drift.

Arbejd i indlejret `node_modules/RavRadar-4.0.396`, branch
`codex/4.0.428-weather-completeness`. To lokale verifier/test-ændringer fra
tidligere er ikke releaseklare og må ikke leveres alene. Ingen ny oneoff,
providerkørsel eller produktionsændring i analysen. Cron er livebekræftet
disabled. `.tmp-420/` er privat. Fortsæt den samlede plan i rapporten;
scoreformel/geometri/gyldighed må ikke lempes for at skjule huller.

# HISTORISK CHECKPOINT – 2026-09-19 – lokal 4.0.429 saved-weather og HARMONIE-tid

Brug det indlejrede `node_modules/RavRadar-4.0.396`, branch
`codex/4.0.428-weather-completeness`. 4.0.428 bestod exact-head `35416314162`,
PR #373 og main `a2d03d95`. Normalrun `35416641052` gemte alle providercacher,
men stoppede sent på gammel 4.0.427-readiness. Providerfri `35419876748`
gendannede 02:00-runtime og stoppede på en for snæver auditundtagelse.

DMI valgte ét eksakt HARMONIE-H0-asset, men startede det ikke: 268 sekunders
katalogarbejde plus 512 sekunders marine reserver kunne ikke være i det gamle
779-sekunders arbejdsbudget. HARMONIE blev desuden fejlagtigt kørt gennem en
marine-only assetidentitet. 4.0.429 retter begge forhold, hæver normal DMI fra
900 til 1.500 sekunder og lader saved-weather følge normaldriftens diagnostiske
deployregel. Næste: måltests, exact-head, merge, providerfri 02:00-deploy og én
normal weather. Nul H0-vind, 420 utilgængelige modes og 156/354 Feggesund-huller
er fortsat åbne P0. `.tmp-420/` må aldrig publiceres. DEC-0209.

# NYESTE CHECKPOINT – 2026-09-19 – lokal 4.0.428 H0-cooldown og deployfortsættelse

Brug det indlejrede `node_modules/RavRadar-4.0.396`, branch
`codex/4.0.428-weather-completeness`, fra main `abf0274f` / PR #372.
4.0.427 bestod exact-head `35410861514`; backend `35411487128` var grøn.
Normalrun `35411701055` gennemførte providerne, build og alle 52+3 kontroller,
men stoppede før Pages i historical-maintenance-sealens for snævre krav til
en diagnostisk offentlig audit.

Stagebeviset viser, at aktuel strøm nu bevares til 665/673 dele. HARMONIE blev
ikke forsøgt, fordi en arvet cooldown blev anvendt før det kritiske H0-valg.
4.0.428 omgår kun denne cooldown for ét H0-asset, bevarer alle admissionkrav
og lader afgrænsede diagnostiske fund fortsætte til deploy uden at åbne
kalibrering. Næste: måltests, exact-head, merge og én almindelig weather.
2.334/79.414 providerpar og 153/354 Feggesund-bølgedeltimer mangler fortsat;
det er ikke komplet. `.tmp-420/` må aldrig publiceres. DEC-0208.

# NYESTE CHECKPOINT – 2026-09-19 – lokal 4.0.427 strøm- og DMI-recovery

Brug det indlejrede `node_modules/RavRadar-4.0.396`, branch
`codex/4.0.427-weather-foundation`, fra main `41a39bbc` / PR #371.
4.0.426 bestod exact-head `35404863947`. Normalrun `35405307261` gennemførte
providerne og byggede 673/673 aktuelle strømdele, men adapteren kasserede
fallbackstrømmen på en valgfri historik/referencefejl og beholdt kun 56
direkte DMI-dele. Privat publicering stoppede bagefter på forgængerens gamle
modelbinding; intet nyt Pages-deploy blev lavet.

4.0.427 isolerer operationel closure fra valgfri historik, lader en nyere
privat produktion afløse en gyldig historisk binding, spørger HARMONIE smalt
efter produktionstimen og lader DKSS lukke tidligste reelle hul først. Næste:
måltests, exact-head, merge og én almindelig weather. Runnet havde fortsat
1.122 manglende par af 79.414; det er ikke komplet. `.tmp-420/` må aldrig
publiceres. DEC-0207.

# HISTORISK CHECKPOINT – 2026-09-19 – lokal 4.0.426 measured historical recovery

Brug det indlejrede `node_modules/RavRadar-4.0.396`, branch
`codex/4.0.426-stateless-historical-recovery`, fra main `05892afc` / PR #370.
4.0.425 bestod exact-head `35403040711` og normalrun `35403510608` beviste,
at hverken GitHub-cache eller beskyttet Supabase havde et schema-6-checkpoint.
Runnet stoppede før providerkald og ændrede ingen produktionsdata.

4.0.426 skelner nu mellem fravær og fejl: findes checkpointfilen, skal den
fortsat bestå hele struktur-, hash-, binding-, 673-dels- og tidsvalideringen.
Findes filen slet ikke, må kun den allerede centralt aktive integrerede model
i sit midlertidige `integrated-historical-maintenance`-stadie genopbygge state
fra den eksisterende afgrænsede 48-timers målehistorik. Candidate G, første
cutover, retur og ukendte actions forbliver lukkede. Næste: måltest,
exact-head, merge og én almindelig weather. Ingen oneoff. `.tmp-420/` må aldrig
publiceres.

# HISTORISK CHECKPOINT – 2026-09-19 – lokal 4.0.425 historical-maintenance recovery

Brug det indlejrede `node_modules/RavRadar-4.0.396`, branch
`codex/4.0.425-historical-runtime-recovery`, fra main `0b4a08ec` / PR #369.
4.0.424 bestod exact-head `35401458027`, blev merged og startede normalrun
`35401927838`. Runnet stoppede før providerkald, fordi den aktuelle action er
`integrated-historical-maintenance`, mens 4.0.424 kun tillod navnet
`integrated` efter afvisning af de gamle private runtimes.

4.0.425 lader den historiske integrated-vedligeholdelse fortsætte efter tre
restoreforsøg, men kun hvis det lokale schema-6-checkpoint først består den
eksisterende fulde validering og stadig er aktuelt. Den historiske handling får
ingen stateless cold start. Candidate G, første cutover, manglende/udløbet
checkpoint og ukendte actions stopper fortsat. Næste: måltest, version/RDKS,
exact-head, merge og én almindelig weather. Ingen oneoff. `.tmp-420/` må aldrig
publiceres.

# HISTORISK CHECKPOINT – 2026-09-19 – lokal 4.0.424 runtime-recovery

Brug det indlejrede `node_modules/RavRadar-4.0.396`, branch
`codex/4.0.424-integrated-runtime-recovery`, fra main `8718c1ec` / PR #368.
4.0.423 exact-head og backendrun `35400575522` er grønne. Normalrun
`35400832705` stoppede før provider, fordi begge private runtime-generationer
tilhørte den tidligere kontrakt. 4.0.424 lader kun active `integrated` nå den
allerede eksisterende stateless recovery efter tre retries; øvrige actions
forbliver fail-closed. Næste er måltest, version/RDKS, exact-head, merge og én
almindelig weather. Ingen oneoff. `.tmp-420/` må aldrig publiceres.

# HISTORISK CHECKPOINT – 2026-09-18 – lokal 4.0.423 samlet vejrrettelse

Seneste faktiske status står i `CURRENT_SESSION_HANDOFF.md` og
`ASTRA_WEATHER_REVIEW_2026-09-18.md` i denne mappe. Brug det indlejrede
`node_modules/RavRadar-4.0.396`, branch
`codex/4.0.423-current-score-and-terminal`, baseret på main `8a95c7cf`;
appversion 4.0.423. Det gamle ydre worktræ må ikke ændres.

Normalrun `35386276428` byggede og deployede/verificerede 4.0.422. De
tidligere 672 replayafvigelser er væk; 420 aktuelle zonetilstande var stadig
utilgængelige, og en forældet terminalregel gav fejlmail efter deploy.

Den lokale 4.0.423-kandidat implementerer nu den samlede rettelse: fælles
manuel/cron-terminal, reelt opløselig vindhorisont, sikker HARMONIE-
seriesøgning, bevaret privat replayhistorik, Feggesunds to nødvendige
WAM-kildezoner, tidsestimat pr. providerfamilie og payloadfri 673-dels
stageoversigt. `MISSING` holder alene resten af siden brugbar; det tæller
aldrig som data eller komplethed. Append-only migration `20260918190000`
binder begge modelbundles og continuation. Måltests er grønne; version,
samlet validering, exact-head, merge og normal produktionskørsel afventer.

# HISTORISK CHECKPOINT – 2026-09-18 – lokal 4.0.419 model-neutral runtimeombinding

4.0.418 bestod exact-head `35366221956`, PR #362 og main `9573264f`, men
code-only `35366953774` stoppede før writes/Pages. Den private migration var
korrekt `CONTRACT_ONLY_REBIND`; workflowet kaldte den bagefter fejlagtigt en
score-reparation og krævede en scoreændring. `35368826476` blev afbrudt som en
bevist gentagelse. Normal weather `35369122090` stoppede før providerkald, fordi
den beskyttede runtime stadig havde forgængerens kontrakthash.

Lokal 4.0.419 fører migrationens eksakte klassifikation gennem code-only og
Pages. En kontraktombinding kræver samme datasæt/time, uændret vejr, score og
geometri samt nul providerkald; kun en reel modelbindingsovergang må kræve en
scoreændring. Næste: måltests, version/RDKS, exact-head, merge, én providerfri
code-only og derefter én almindelig weather på de gemte cacher. Ingen oneoff;
scheduler pauset. DEC-0202. Standard/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-18 – lokal 4.0.418 præcis offentlig vejrakse

4.0.417 bestod exact-head `35356064367`, PR #361, main `0890ed0e` og
providerfri levering `35356645337`. Normalrun `35357557315` gennemførte og
gemte DMI, Copernicus, regional DMI og Open-Meteo. Currentfordelingen var
32.232 / 5.158 / 912 / 40.039 med 1.073 ærlige lokale huller af 79.414.

Publicering stoppede, fordi en ældre DMI-caches starttime forskød én zones
118-timersakse og skar den rigtige +117-time væk. Lokal 4.0.418 binder alle
offentlige zoner til den aktuelle produktionstime +0..+117, bevarer gyldige
samme-time-komponenter og materialiserer ærlige huller som `MISSING` uden
forskydning. Måltests er grønne. Næste: version/RDKS, exact-head, merge,
providerfri kode og én almindelig weather på de gemte cacher. Ingen oneoff;
scheduler pauset. DEC-0201. Standard/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-18 – lokal 4.0.417 afledt scorekæde

4.0.416 bestod exact-head `35351272955`, PR #360 og main `496ba278`.
Providerfri `35351928923` reparerede 673/673 continuations uden måleændringer,
men auditten fandt 156 gamle aktuelle modes ovenpå den nye state. Replay var
grøn; ingen beskyttet runtime eller Pages blev skrevet.

4.0.417 genberegner mode, offentlig delscore og aktuel zonevinder samlet.
Klassifikation skal være uændret, og en særskilt proof låser vejr, tid,
geometri, flowpunkter og tidsakser. Næste er én exact-head, merge og samme
providerfri code-only; derefter browserbevis og sikker normal weather.
DEC-0200. Sol/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-18 – lokal 4.0.416 kendt privat state kan repareres

4.0.415 bestod exact-head `35348220691`, PR #359 og main `3a705259`.
Saved-weather `35349088863` beviste handlingsrettelsen, men targetet var ikke
nyere end offentlig 09:00. Samme-time code-only `35349313096` gendannede den
eksakte beskyttede 4.0.410-runtime og stoppede før artifact/Pages, fordi den
gamle validator afviste de 673 kendte last-mile-states før den aktuelle
deterministiske reparation.

Lokal 4.0.416 lader den aktuelle validator kanonisere netop denne kendte kant.
Kun last-mile-minimums-/maksimumsspor og det godkendte modelhashskifte må
ændres; andre ændringer stopper. Ens fejl grupperes. Næste: exact-head, merge,
samme providerfri code-only og browserbevis. Før almindelig weather skal de
tre gamle køposter holdes ude gennem en sikker current-main-indgang. Ingen
oneoff; det gamle workflow og scheduler forbliver pauset. DEC-0199.

# NYESTE CHECKPOINT – 2026-09-18 – lokal 4.0.415 gemt vejr kan fortsætte

4.0.414 bestod exact-head `35346135848`, blev merged gennem PR #358 som main
`f1f33c44`, og recovery `35346704791` registrerede live target som central
version 24. Saved-weather `35346790218` installerede og verificerede den
append-only binding, men stoppede før private runtime, artifact og Pages,
fordi én gammel kontrol kun accepterede handlingen `integrated`.

Lokal 4.0.415 accepterer også den sikre
`integrated-historical-maintenance`-handling i netop saved-weather-trinnet.
Candidate, retur og cutover er fortsat afvist; nyere/friskt target,
source-forgænger, tomt repair-id og eksakt runtime består. Migrationplanen
genkender den allerede installerede migration som sikker genkørsel. Næste:
exact-head, merge og providerfri fortsættelse; derefter én almindelig weather
og browserkontrol. Ingen oneoff; scheduler pauset. DEC-0198.

# NYESTE CHECKPOINT – 2026-09-18 – lokal 4.0.414 direkte same-binding recovery

4.0.413 bestod exact-head `35343692557`, blev merged gennem PR #357 som main
`50216cd6`, og recovery `35344230599` bestod de fastlåste artifacts samt frisk
Pages-verifikation. Den stoppede før CAS, fordi den gamle recovery også krævede
transitionnavnet fra første cutover. Central version 23 blev imidlertid
oprettet af almindelig integreret vedligeholdelse i run `35331109332`.

Lokal 4.0.414 beviser derfor same-binding-source direkte gennem alle materielle
centrale felter og den normale maintenance-seal. Afvigelser samles i ét stop;
første-cutover-navnet bruges ikke som identitetsbevis. Måltesten er grøn.
Næste: RDKS/version/slutkontroller, exact-head, merge og recovery. Derefter
providerfri code-only og én normal weather. Nye normale caches bruger allerede
den særskilte maintenance-vej. Ingen oneoff; scheduler pauset. DEC-0197.

# NYESTE CHECKPOINT – 2026-09-18 – lokal 4.0.410 aktuelle prognoser trods kontrolfund

4.0.409 er live gennem exact-head `35318809153`, PR #353, main `013baac8`
og code-only `35320190547`. Normalrun `35320738621` gennemførte DMI,
Copernicus, Open-Meteo, closure, historik, central weather, proveniens og
offentlig runtime. 4.0.409 er dermed livebevist; prognoserevisionskonflikten
kom ikke igen.

Kørslen stoppede bagefter på 673 ens `LAST_MILE_STATE`-replayfund, og 420
aktuelle modes var utilgængelige. Lokal 4.0.410 kører alle uafhængige
driftskontroller videre, uploader audit og en samlet payloadfri rapport og
lader ikke et score-/testfund alene holde gyldige friske prognoser tilbage.
Target/main, byggeligt artifact, beskyttet state, privacy og forseglet deploy
forbliver hårde. Den målrettede deploysuite, workflow, RDKS, håndbog, version,
YAML, diff og geodataversionsbevis er grønne; modelbundle `d9ba75ed...` er
uændret. Næste: commit/push, exact-head, merge, providerfri kode og én normal
weather på gemte cacher. Ingen oneoff; scheduler pauset. DEC-0193.

# NYESTE CHECKPOINT – 2026-09-18 – lokal 4.0.409 nyeste gyldige komponent

4.0.408 er live gennem exact-head `35310381268`, PR #352, main `891b5f3c`
og code-only `35310919329`. Normalrun `35311408813` gennemførte og gemte alle
providerled samt livebeviste Copernicus-rettelsen, men central weather
stoppede på en bølgekonflikt mellem gammel og nyere gyldig DMI-prognose.

Lokal 4.0.409 vælger nyeste dokumenterede `modelRun` pr. komponent/time.
Ny strøm og gammel gyldig bølge kan bruges sammen, når den nye bølge mangler;
samme prognoseversion med forskellige værdier stopper fortsat. RavScore-
modelbundle `d9ba75ed...` er uændret. Næste: docs/version/geodatabevis,
commit/push, exact-head, merge, providerfri kode og én normal weather på
gemte cacher. Ingen oneoff; bootstrap kun ved målt behov. Scheduler pauset.
DEC-0192. Sol/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-18 – lokal 4.0.408 journalfriskhed

4.0.407 er live gennem exact-head `35305418536`, PR #351, main `74ce8c38`
og code-only `35306056877`. Normalrun `35306467385` gennemførte DMI og gemte
fremgangen, men stoppede i Copernicus før Open-Meteo/deploy.

En korrekt rebased source-stage blev bagefter forurenet af et gammelt forsøg
fra den varige segmentjournal. Lokal 4.0.408 filtrerer replayede forsøg med
den samme firetimersgrænse og bevarer gyldige positive records i donorbanken.
Python-syntaks, tre målrettede Copernicus-tests, version, RDKS, håndbog,
geodataversionsbevis og uændret modelbinding er grønne. Næste: commit/push,
exact-head, merge, providerfri kode og én almindelig weather på gemte cacher.
Ingen oneoff; bootstrap kun ved målt behov.
Scheduler pauset. DEC-0191. Sol/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-17 – lokal 4.0.407 vindhorisont og replaydiagnose

4.0.406 er live gennem exact-head `35242940822`, PR #350, main `459dc41c`
og code-only `35252644724`; browseren viser scorer og femdøgn. Normalrun
`35253587766` gennemførte DMI, Copernicus og Open-Meteo og gemte cacher. Den
byggede runtime forbedrede aktuelle utilgængelige modes til 192, men blev ikke
deployet: HARMONIE kørte ikke, og state replay fejlede ens 673/673.

Rodårsagen til HARMONIE er bekræftet: `missingAnyWind` accepterede ét gammelt
vindpunkt som grunddækning. Lokal 4.0.407 bruger den sammenhængende 96-timers
vindhorisont og bevarer ét-asset-loftet. Replayauditten logger nu kun faste
payloadfrie fejlkategorier og forbliver hård. Næste: måltests, RDKS/geodata,
exact-head, merge, providerfri kode og én normal weather på gemte cacher.
Ingen oneoff; bootstrap kun ved målt behov. Scheduler pauset. DEC-0190.
Sol/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-17 – lokal 4.0.406 mobilvisning og delvind

4.0.405 er live gennem exact-head `35217753258`, PR #349, main
`e128b15d` og saved-weather `35222128772`. Livepakken er 210/673 med 141
brugbare og 69 helt utilgængelige zoner. 296 dele har strøm og bølger, men
mangler vind; normalrun `35205052150` nåede ikke HARMONIE.

4.0.406 viser den kompakte, tidsmærkede samme-model-startpakke uden cirka
175 MB opstartshentning og giver ét HARMONIE-asset førsteplads ved manglende
delvind før normal DKSS/WAM. Første exact-head `35241236001` bestod 22/24;
de to fejl var samme utilsigtede modelhashændring fra fire UI-tekster i den
fælles sprogfil. Teksterne er nu isoleret i appen. Aktiv modelbundle
`d9ba75ed...` og alle otte bindinger er uændrede. Næste: ny exact-head,
merge, providerfri deploy og én almindelig weather. Ingen oneoff. Scheduler
pauset. DEC-0188/0189. Sol/Ekstra høj.

# HISTORISK CHECKPOINT – 2026-09-17 – lokal 4.0.405 fælles tidskontrakt

4.0.404 bestod exact-head 35215528731, PR #348 og main 5fc6e2fd.
Saved-weather 35216079458 genbrugte 09Z uden providerkald og gennemførte
artifact, privacy, privat runtime og Edge. Pages stoppede før aktivering,
fordi den fælles freshness-parser stadig afviste samme time med .000Z.

Lokal 4.0.405 accepterer præcise hele UTC-timer med eller uden .000 centralt,
mens øvrige tids- og gyldighedskrav består. Det faktiske 09Z-input er FRESH.
Næste: RDKS/geodatabevis → én exact-head → merge → providerfri Pages →
live score/prognose. Scheduler pauset. DEC-0187. Sol/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-17 – lokal 4.0.404 tidsformatkant

4.0.403 bestod exact-head 35214029193 og blev main c685c83d gennem PR #347.
Providerfri fortsættelse 35214668708 stoppede efter 31 sekunder før writes og
Pages. Descriptoren brugte 09:00:00.000Z; freshness-kontrakten kræver den
samme time skrevet 09:00:00Z.

Lokal 4.0.404 normaliserer kun den valgfrie .000-del og kræver derefter
eksplicit FRESH under 240 minutter. Model, kilde, dataset og alle DEC-0185-
grænser består. Næste: måltests/RDKS/geodatabevis → én exact-head → merge →
providerfri fortsættelse → live score/prognose. Scheduler pauset. DEC-0186.
Sol/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-17 – lokal 4.0.402 kritisk produktionsartifact-gate

4.0.401 bestod exact-head 35187093136, blev merged gennem PR #345 som main
82f4fb08ab14bf50fd4c285e0148f2ebb7666313 og kom providerfrit online i
35187388134.

Normalrun 35187767148 gennemførte DMI, Copernicus, Open-Meteo, closure,
syvdøgnshistorik, offentlig runtime og den uafhængige runtimeaudit. Det
stoppede før deploy på en stale DMI-test, ikke på vejr- eller scoreartifactet.

4.0.402 erstatter den normale efter-vejr-kæde på 277 bladkontroller plus 44
historiske releasegatetests med præcis 52 artifactkritiske og tre
version-/modelbindingskontroller. Collector kører alle og skriver payloadfri
samlede rapporter. Faktiske runtime-, Supabase-, checkpoint-, privacy-,
artifact- og deploytrin forbliver hårde. Den fulde suite og releasegate er
bevaret til målrettet/periodisk brug.

Gamle DMI-testforventninger er synkroniseret med den eksisterende
extended-bootstrap-gren; produktionsruntime er uændret. Browserens
hardkodede 4.0.398-fallback er fjernet. Næste: målrettede slutkontroller,
RDKS/geodatabevis, én exact-head, merge, providerfri code-only og én
almindelig weather på gemte cacher. Ingen oneoff. Scheduler pauset.
DEC-0184. Sol/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-17 – lokal 4.0.401 sikrer historikkilden før slutkontrol

4.0.400 bestod exact-head `35181131552`, blev merged gennem PR #344 som main
`0744c79cfba7a884a11bba9e0ddb532cea0230b9` og kom providerfrit online i
`35181573799` med grøn privat runtime, Pages og offentlig 210/673-verifikation.

Normalrun `35181918091` gennemførte DMI, Copernicus og Open-Meteo, gemte alle
tre providercacher, byggede closure, syvdøgnshistorik og offentlig runtime og
bestod den uafhængige runtimeaudit. 4.0.400's rettede nationale shadow-test
bestod dermed i den virkelige helkæde.

Runnet stoppede sent i `npm run validate`, fordi den historiske Candidate G-
rollbacktest kræver commit `49dd4cb`, mens det normale workflow havde genbrugt
et grønt sourceproof og derfor ikke havde hentet den commit i runneren. Det er
en checkout-/testforberedelsesfejl, ikke en vejr- eller scorefejl.

Lokal 4.0.401 sikrer præcis den pinnede commit og dens kendte træ umiddelbart
før fuldvalideringen. Findes den allerede, genbruges den; ellers hentes kun den
ene commit. Hele Git-historikken hentes ikke. Næste: målrettede kontroller,
RDKS/geodatabevis, én exact-head, merge, providerfri code-only og én almindelig
weather på de gemte cacher. Ingen oneoff. Scheduler pauset. DEC-0183.
Sol/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-17 – lokal 4.0.400 retter et falsk fuldvalideringsstop

4.0.399 bestod exact-head `35175844570`, blev merged som main
`b86bcf9712de119d29b98e0a5d5d9536e56c994b` og kom offentligt online gennem
providerfri code-only `35176215202` med 210 zoner og 673 kystdele.

Den normale weather `35176561317` gennemførte DMI, Copernicus og Open-Meteo,
gemte alle providercacher, lukkede alle 79.414 identiteter som gyldig værdi
eller ærligt lokalt `MISSING`, byggede historik og offentlig runtime og bestod
den uafhængige 210/673-audit. Resten var 420 lokale provider-negative/null-/
gitterpar; ingen provider ramte tids-, forsøgs- eller køloft.

Runnet stoppede først i `npm run validate`, fordi
`test-national-weather-shadow-contract.mjs` kun søgte 180 tegn efter et
trinnavn. En længere `continue-on-error`-linje skubbede det eksisterende
`DMI_BULK_MAX_RUNTIME_SECONDS: "3000"` uden for vinduet. Lokal 4.0.400
udtrækker nu det eksakte YAML-trin, kører testen tidligt i den billige
deploy-source-gate og gør versionsværktøjets capture group-erstatninger
entydige. Ingen score-, vejr-, geometri- eller kildeprioritet ændres.

Næste: målrettede kontroller og RDKS/geodatabevis, én exact-head, merge,
providerfri code-only og én almindelig weather på de gemte cacher. Ingen
oneoff. Scheduler pauset. DEC-0182. Sol/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-17 – lokal 4.0.399 retter browserimports samlet

4.0.398 bestod sourcegate `35174942101`, blev merged gennem PR #342 som main
`d7420ade95990b97e6d3c65bcabe2a9f7c88dec1`, og code-only
`35175276505` blev startet. Runnet stoppede efter 19 sekunder i den første
offentlige browserlukning, før kildebevis, data, Supabase, runtime, provider
eller deploy.

Rodårsagen var 21 ugyldige imports i `app.js` og `bootstrap.js`: den manuelle
versionssynkronisering havde gjort `?v=4.0.398` til `$14.0.398`. Lokal
4.0.399 gendanner alle 21 imports som `?v=4.0.399`. Begge eksisterende
versionskontroller afviser nu samme fejltype, og den egentlige offentlige
browserlukning køres målrettet lokalt.

Ingen vejrdata, cache eller offentlig side blev ændret af det røde run.
Næste: afgrænsede kontroller, version/RDKS/geodatabevis, commit/push, én ny
exact-head, merge og providerfri code-only. Derefter én almindelig weather
med gemte cacher; ingen oneoff. Scheduler pauset. DEC-0181. Sol/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-17 – lokal 4.0.398 retter de sidste to auditfejl

4.0.397 er live som kode efter sourcegate `35167221199`, PR #341, main
`f3a200ff4d4a2bc0ce0aec36c841f6e3972b28a9` og providerfri deploy
`35167698742`. Normalrun `35168055561` gennemførte DMI, Copernicus og
Open-Meteo, gemte cacher og byggede 118 timer for 210 zoner og 673 kystdele.
Pages blev ikke opdateret, fordi auditten meldte 86 del- og 1.250
zoneformelfejl samt én profilfejl.

4.0.398 retter kun auditten. Tre bidrag og råsummen afrundes uafhængigt, så
den matematisk mulige sumforskel er `2e-6`, ikke `1e-6`. Desuden er fuld
dækning af 673 kystdele ikke det samme som tilgængelighed af alle zoner: en
fler-delszone må være brugbar, når mindst én del giver gyldig score.
Profilfelterne genberegnes stadig uafhængigt og får konkrete fejlkoder.

210/673-måltesten og negative fejlprøver er grønne. Næste: afslut
version/RDKS/geodatabevis, commit/push, én exact-head, PR/merge,
providerfri code-only og én almindelig weather med de gemte cacher. Ingen
oneoff. Verificér levende prognoser, scorer og derefter næste normale
cachevedligeholdelse før scheduler genaktiveres. DEC-0180. Sol/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-17 – lokal 4.0.397 retter falsk prognoseaudit

4.0.396 er live som kode efter main `265ec215ace894264e7c687d2e7fe8955f305a76`
og providerfri deploy `35158653973`. Normalrun `35159168292` gennemførte
DMI, Copernicus og Open-Meteo, gemte cacher og byggede 118 timers prognoser
for 210 zoner og 673 kystdele. Det udgav ikke prognoserne: auditten meldte 47
del- og 1.285 zonefejl, og Pages blev korrekt sprunget over.

Rodårsagen er en auditfejl ved seksdecimal afrunding omkring præcis `.5`;
scoreproducenten og de byggede scores er konsistente. Lokal 4.0.397 bruger
den forseglede rå scores mulige fuldpræcisionsinterval og kontrollerer stadig
bidragssummen inden for `1e-6`. Kontrakt- og formelfejl samles separat.
Måltesten er grøn. Næste: RDKS/version, commit/push, én exact-head, PR/merge,
providerfri deploy og derefter fortsættelse fra den eksakte gemte vejrgeneration
gennem resterende gates og Pages. Ingen oneoff. Scheduler pauset. DEC-0179.
Sol/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-16 – lokal 4.0.393 fører ærlig missing gennem historikken

4.0.392 er live efter sourcegate `35119195730`, PR #336, main
`e84fba55ddfd1aa4585137d4d0d86169c50695a8` og providerfri deploy
`35120023098`. Siden åbner uden den gamle 118 MB-nøddriftsblokering.

Normalrun `35120782348` gemte alle providercacher og byggede
`READY_WITH_MISSING`: DMI 37.448, Copernicus 6.465, regional DMI 944,
Open-Meteo 34.218 og 339 lokale `MISSING`. Closure bestod. Runnet stoppede
bagefter på `OPEN_METEO_CLOSURE_CACHE_INVALID`, fordi history-adapteren
krævede en globalt komplet Open-Meteo-cache og udelod de 339 forseglede
missing-par fra sin anden validering.

Lokal 4.0.393 validerer den eksakte closure-rest med både positive records
og de præcise missing-par. Hashes, counts, targetregister og upstream-
bindinger består. Helikopterkontrol og måltests gennem RavScore, public
runtime og 210/673-audit er grønne. Scheduler er pauset. Næste: docs/version,
push, én exact-head, merge, providerfri code-only og én almindelig weather på
gemte cacher; verificér levende scorer og genaktivér først derefter scheduler.
DEC-0176. Sol/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-16 – 4.0.390 samler forlænget providerbootstrap i normalruten

Main er `bf8eb739476631ec534df3b2e3ba75e7370a3c29`. Normalrun
`35069942328` reducerede 6.450→5.025 reelle rester. Næste
`35074225256` rykkede target en time, øgede DMI 14.260→14.772 og
regional DMI 416→704 samt reducerede 5.181→4.565.

Open-Meteo nåede hele køen i begge runs; andet run ramte ikke dens budget.
Resterne var provider-negative null-/gittertilfælde. Mere Open-Meteo-tid er
forkert kurs. Den gamle Candidate G-oneoff bruges ikke.

Lokal 4.0.390 tilføjer eksplicit main-only
`force + extended_provider_bootstrap` til normalruten. Kun den får DMI
3.600 sekunder/seks samlinger, Copernicus 3.300 sekunder og 240 minutters
jobloft. Normaldrift forbliver kort. Fortsæt version/RDKS/håndbog/måltests →
push/exact-head/merge → forlænget bootstrap → nul-missing/deploy/scorer →
normal takeover/scheduler/site/roadmap. DEC-0172. Sol/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-16 – 4.0.389 lukker resterne gennem normal weather

Main er `8d0a5ac5a488ff493e93e00d8260cc2feaa96f47`. Normalrun
`35064588725` livebeviste DEC-0170, Open-Meteo-rotation og cache-save hos
DMI, Copernicus og Open-Meteo. Før Open-Meteo var der 6.254 reelle rester;
fire fejlfri requests udfyldte 396, og 5.858 stod tilbage ved det delte
240-sekundersstop.

Oneoff `35067958289` nåede ingen provider, fordi den stadig er en Candidate
G-bundet før-cutover-rute. Brug den ikke igen. Lokal 4.0.389 giver normal
Open-Meteo 900 sekunder og `--critical-only`. Batch 50, kildeprioritet,
datavalidering og nul-missing-gate er uændrede.

Fortsæt: måltests/version/RDKS/geodatabevis → push → én exact-head → merge →
kontrolleret normal weather på gemte cacher → nul-missing/deploy/scorer →
bevis DMI/Copernicus-overtagelse → scheduler → site og roadmap. DEC-0171.
Sol/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-16 – 4.0.388 retter normal Copernicus-journalfortsættelse

4.0.387 er levende efter sourcegate `35051800082`, PR #330, main
`529f8888f7022232709a699ee5289a9dd52fdd99` og providerfri code-only
`35052231130`. Integreret model, 210 zoner, 673 kystdele, privat publish,
Edge, Pages og central closure er grønne. Siden er fortsat i nøddrift, fordi
weather er gammel.

Normal `force=false` `35052715440` gennemførte DMI og gemte caches, men
stoppede før Open-Meteo/writes/deploy: en gendannet Copernicus-segmentjournal
havde nul overlap med den aktuelle DMI-hulmatrix. Strict stage afviste den
korrekt. Lokal 4.0.388 filtrerer kun nul-overlap før stage og bevarer hele
immutable blandede forsøg med mindst ét aktuelt par. Direkte måltest og
Python-syntaks er grønne; lokal fuld fixturetest mangler `h5py`.

Fortsæt: releasehukommelse/geodatabevis → commit/push → én exact-head → merge
→ providerfri same-binding code-only → almindelig weather med gemte cacher →
numeriske scorer/sitekontrol → scheduler. Ingen oneoff. DEC-0170.
Sol/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-16 – 4.0.387 åbner same-binding code-only-genbinding

4.0.386 bestod sourcegate `35050098674`, PR #329 og main `c3833354`.
Normalrun `35050697588` stoppede før providers/writes, fordi Open-Meteo-
kodeændringen korrekt ændrede private runtimes fulde kontrakthash. Code-only
`35051090133` valgte korrekt action `integrated`, men predecessor-steppet
accepterede fejlagtigt kun `integrated-historical-maintenance` og stoppede før
migration, writes og deploy.

Lokal 4.0.387 tillader den eksisterende eksakte `CONTRACT_ONLY_REBIND` for
både same-binding `integrated` og historisk integreret maintenance. Candidate
G, retur og cutover er fortsat afvist; databasebindingsmigration forbliver kun
historisk. Måltest er grøn. Scheduler er pauset. Næste: docs/geodatabevis,
RDKS/version, commit/push, én exact-head, merge og providerfri code-only.
Derefter én normal `force=false` weather for DEC-0168. Ingen oneoff. DEC-0169.
Sol/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-16 – 4.0.386 retter Open-Meteos tidsbegrænsede restkø

4.0.385 er merged som main `879f4644d391b41cb52c7f5435551c368fedd1fa`.
Den private runtime blev gendannet korrekt i de almindelige runs
`35043360563` og `35046314979`; DMI, Copernicus og Open-Meteo genbrugte og
gemte cachefremgang. Første run reducerede reelle mangler fra 59.382 til
33.383. Næste run startede med 33.656, men Open-Meteo hentede kun 244 og
sluttede med 33.412.

Rodårsagen er den stabile sorterede Open-Meteo-kø: hver tidsbegrænset kørsel
begyndte ved de samme svære/null-batches, så senere batches kunne sulte.
Lokal 4.0.386 roterer hele stabile batches efter UTC-time, kvarter og
GitHub-forsøg. Providerbevis, acceptregler, cacheformat og hård nul-missing-
gate er uændrede. Måltests er grønne, og geodata ændrer kun versionsfelt.
Scheduler er pauset. Næste: docs/RDKS-kontrol, commit/push, én exact-head
sourcegate, merge, genaktivér og kør én normal `force=false` weather. Ingen
oneoff. DEC-0168. Sol/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-16 – central version 2 aktiv; 4.0.385 retter normal weatherstart

4.0.384 bestod exact-head sourcegate 35040475553, blev merged gennem PR
#327 som main 2628ddefa547191c678f88ba9791b2cd867ea3e4, og den korte centrale
recovery 35040799616 flyttede atomisk driften fra ACTIVE version 1 til
ACTIVE version 2. Readback viser INTEGRATED_ACTIVE, aktuel binding og
deployment pages-35034589754-1. Ingen weather, privat build, Edge eller
Pages blev gentaget.

Den første almindelige standard-weather 35041008201 stoppede efter 29
sekunder før DMI, øvrige providers, produktionswrites og deploy. Den konkrete
årsag var, at normalworkflowet ikke oprettede
/tmp/ravradar-private-production-runtime før protected restore. En senere
always()-kontrol gav desuden en misvisende Open-Meteo-følgefejl, selv om
providerforløbet var sprunget over.

Arbejd i RavRadar-4.0.366, branch
codex/4.0.385-normal-weather-restore. Workflowet opretter nu runtime-roden,
genprøver kun protected restore højst tre gange og kører Open-Meteo-slutgaten
kun efter verificeret handoff eller et faktisk startet providerforløb. Den
normale scheduler er midlertidigt pauset. Målrettede workflow-/YAML-kontroller
er grønne. Næste: docs/geodatabevis, commit/push, én exact-head sourcegate,
merge, genaktivér scheduler og kør én normal tidsbegrænset weather. Ingen
oneoff. DEC-0167. Sol/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-16 – lokal 4.0.383 reparerer central/offentlig drift

4.0.382 bestod sourcegate `35024395809`, PR #324 og main `a7f0fcba`.
Providerfri `35025121452`, forsøg 3, byggede en grøn 79/79-Pages-pakke, men
deployede den ikke. Central pointer peger stadig på `pages-34877443841-1`,
mens den faktiske offentlige 4.0.381 er `pages-35020915350-1` med den kendte
ene admin-404. Derfor afviste kildebeviset korrekt den modstridende identitet.

Branch `codex/4.0.383-public-source-repair` har én eksakt, fastlåst
source-reparation for netop denne 4.0.381-tilstand. Den kræver 78 korrekte
filer og præcis den kendte 404; enhver anden drift stopper. Nyt 4.0.383-mål
skal fortsat bestå normal 79/79 før og efter deploy. Fortsæt med docs,
geodatabevis, måltests, én exact-head, merge og providerfri code-only. Først
derefter normal tidsbegrænset weather. Ingen oneoff. DEC-0165. Sol/Ekstra høj.

Første exact-head `35032447763` bestod alle produktkontroller, men
metakontrollen fandt 25 direkte kommandoer mod loftet 24. Den nye
resolverregression er derfor samlet i den eksisterende code-only-test;
produktdækningen bevares, og gateplanen er igen 24. Ny exact-head kræves.

PR #325 blev merged som main `ee3de32b`. Providerfri `35033489693`
stoppede efter 18 sekunder før alle writes: resolveren krævede fejlagtigt, at
gammel central binding allerede var lig nyere offentlig 4.0.381-binding. Den
rettede branch `codex/4.0.383-central-public-binding` låser begge hashes
særskilt; normal match kræver fortsat lighed. Faktisk offline central/public-
bevis og 24-kommando-plan er grønne. Ny kort PR/exact-head kræves.

# HISTORISK CHECKPOINT – 2026-09-15 – levende 4.0.381, lokal 4.0.382 adminclosure

4.0.381 er offentlig efter sourcegate `35019932207`, PR #323, main
`d84773a7` og providerfri `35020915350`. Contract-only-genbinding, privat
runtime, assistent og Pages bestod. Offentlig verification fandt bagefter én
reel 404 i admin-dashboardets closure; central maintenance blev derfor ikke
afsluttet. Hele closurekortet gav 78/79 HTTP 200.

Branch `codex/4.0.382-public-admin-closure` flytter den payloadfrie decoder til
en publicerbar sti og kræver `_site` = forseglet browserclosure før upload på
begge produktionsveje. Måltests grønne. 210/673 er live, men 0/210 zoner har
aktiv score; normal weather følger først efter providerfri 4.0.382. Ingen
oneoff. DEC-0164. Sol/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-15 – lokal 4.0.381 contract-only og Pages først

Main `de8ae966`, PR #322 og sourcegate `35015984953`. Providerfri code-only
`35016734197` kom forbi fire-felts auditten, læste actual private current og
gendannede dens eksakte bundle. Den stoppede, fordi modelbindingen allerede
var identisk, mens kun kodekontraktstemplet var nyt.

Branch `codex/4.0.381-contract-rebind-deploy-continuation` tillader nu både
snæver modelhashmigration og byteidentisk ni-fils contract-only-genbrug.
Same-reference-beviset skelner eksplicit. Kode-only lægger først central
historisk status efter hårdt bestået Pages-deploy og offentlig verification;
artifact, privacy, model/source og latest-main forbliver hårde. Målrettet
matrix og geodatadiff grøn. Næste er commit/push, én exact-head, merge og
providerfri code-only. Ingen weather/oneoff. DEC-0163. Sol/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-15 – lokal 4.0.380 audit og actual current

Main `0cc4a867`, sourcegate `34959283992`, PR #321. Providerfri code-only
`34959875107` bestod Pages-privacy, privat publicering, anonym-afvisning,
assistent og readiness; ingen provider. Den stoppede før Pages-begin, fordi
shared auditconsumeren manglede producentens fjerde historikfelt med 420
utilgængelige modes.

Branch `codex/4.0.380-audit-current-resume` retter fire-felts 420-summen og
bevarer calibration false. Helikopterreview fandt også, at en ny privat
efterfølger ellers ville bruge den oprindelige forgænger trods 4.0.379 som
current. Den faktiske current-source beskrives nu uden payload, kræves som
ancestor og bindes til restore, manifest, migration og publish. Sourceartifact
`34877443841` findes. Målmatrix grøn. Næste: docs/geodatabevis, commit/push, én
exact-head, merge og providerfri code-only. Ingen weather/oneoff. DEC-0162.

# NYESTE CHECKPOINT – 2026-09-15 – lokal 4.0.379 efter Pages-privacyfund

Main er `348d4a28` efter PR #320/sourcegate `34956693177`. Providerfri
code-only `34957362872` bestod hele den tunge kæde til og med privat bundle,
210/673, Pages-prebuild og samlet prewrite. Privacy fandt tre ubrugte interne
filer i Pages-pakken, så ingen efterfølgende private/Edge/Pages-writes skete.

Branch `codex/4.0.379-pages-privacy-scope` udelader filerne i både code-only-
og normal Pages-builder uden at lempe audit eller fjerne `zones.geojson`.
Fortsæt: målrettet kontrol, docs/geodatabevis, commit/push, én exact-head,
merge og providerfri code-only. Ingen provider, weather eller oneoff.
DEC-0161. Sol/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-15 – 4.0.378 samlet og klar til exact-head

Læs først `docs/ai/ASTRA_DELIVERY_CHAIN_REVIEW_2026-09-15.md`, DEC-0159 og
DEC-0160. Astra-fund A–G er samlet implementeret på Sol/Ekstra høj i
`RavRadar-4.0.366`, branch `codex/4.0.378-historical-private-binding`.
Målrettede runtime-, CAS-, REST-, workflow-, readiness- og YAML-kontroller er
grønne. Historisk restore bruger nu to reelle arkiver; code-only deployer den
eksakte assistent og samler fire uafhængige prewrite-kontroller før writes.

Main er stadig `ec26f8e4`; ingen ny gate, deploy, provider, weather eller
oneoff er startet. Fortsæt med dokumentations-/geodatabevis, commit/push, én
exact-head sourcegate, merge og providerfri code-only. Verificér derefter
central/private/Edge/Pages. Først så må normal weather bevise tal, scorer,
rotation og cache. 210/673 er ikke numerisk komplethed.

# NYESTE CHECKPOINT – 2026-09-15 – lokal 4.0.378 bevarer historisk rollbackbinding

Main er `ec26f8e4` efter PR #319/sourcegate `34946601576`. Providerfri
code-only `34947169348` beviste 4.0.377’s kanoniske DMI-sti, privat spec/bundle,
offentlig genopbygning og 210/673-audit. Den stoppede før private writes,
Pages og completion, fordi pointerlæseren afviste forgængerens gamle
modelbundlehash, før migrationsbeviset blev nået.

Branch `codex/4.0.378-historical-private-binding` accepterer gammel current kun
ved eksakt forgængermanifest under samme-reference-overgangen. Efter write skal
current matche aktiv model; previous bevares som stramt formvalideret historisk
rollback og verificeres fortsat mod konkret forventning og lagret bundle ved
restore. Direkte publiceringslivscyklus er grøn. Fortsæt: docs/geodatadiff →
commit/push → én exact-head sourcegate → merge → providerfri code-only →
livekontrol → normal weather. Ingen oneoff. DEC-0159. Sol/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-15 – lokal 4.0.377 bruger installeret DMI-cache

Arbejd i siblingworktree `RavRadar-4.0.366`, branch
`codex/4.0.377-code-only-installed-dmi-cache`; remote main er `3144c557` efter
PR #318/sourcegate `34941640752`. Providerfri code-only `34942127741` bestod
restore, komplet metadataoverførsel, privat installation, offentlig
genopbygning og 210/673-audit. Ingen provider, oneoff eller normal weather
kørte.

Runnet stoppede før ny privat publicering og Pages, fordi specifikationen søgte
DMI i den midlertidige `.cache/dmi-candidate-progress.json` fremfor den allerede
installerede `data/live/dmi-bulk-cache.json`. 4.0.377 bruger den kanoniske fil
og kræver et eksakt migrationsbevis ved ny privat bundle på samme vejrtid:
uændrede målinger/states, byteidentiske øvrige filer og kun godkendt
modelmetadataændring. Fortsæt: målrettet slutkontrol → commit/push → én
exact-head sourcegate → merge → providerfri code-only → livekontrol → separat
normal weather. Ingen oneoff. DEC-0158. Sol/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-15 – lokal 4.0.376 kanonisk privacy-rod

Arbejd i siblingworktree `RavRadar-4.0.366`, branch
`codex/4.0.376-code-only-privacy-path`; remote main er `e95339e5` efter PR
#317/sourcegate `34939186051`. Providerfri code-only `34939798892` beviste den
komplette 4.0.375-metadataoverførsel og atomiske private installation.

Offentlig genopbygning stoppede før writes på et godkendt
`flowPoints.current`, fordi wrapperens ekstra privacykald brugte en fri label
som teknisk JSON-rod. 4.0.376 bruger præcis `startup`, `details` og `manifest`;
allowlisten lempes ikke. De tre relevante privacy/runtimekontroller er grønne.
Fortsæt: slutdiff → commit/push → én exact-head sourcegate → merge → providerfri
code-only → central/offentlig kontrol → separat normal weather. Ingen oneoff.
DEC-0157. Sol/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-15 – lokal 4.0.375 migrerer hele modelmetadatafladen

Arbejd i siblingworktree `RavRadar-4.0.366`, branch
`codex/4.0.375-migrate-runtime-metadata`; remote main er `dd59bc51` efter PR
#316/sourcegate `34933609573`. Providerfri code-only `34934257354` genbrugte
central version 1, migration 16/17, privacy og den gemte private runtime. Det
stoppede før publicering, fordi scoreprofilen stadig bar forgængerens
bundlehash. Samme gamle hash findes i indlejrede resultater, forklaringer,
zone-timer og Candidate G-runtime.

4.0.375 gennemgår hele `conditions.json` rekursivt og ændrer kun bundlehashen
i eksakt genkendte 11-feltsbindinger, scoreprofiler og kompakte resultater.
Continuation state valideres særskilt før/efter for 673 dele; Candidate G-state
og de øvrige otte filer bevares. Faktisk leaf-diff skal være identisk med den
dynamiske allowlist, og ingen gammel hash må være tilbage. Måltests er grønne.
Fortsæt: slutkontrol → commit/push → én exact-head sourcegate → merge →
providerfri code-only → central/offentlig kontrol → separat normal weather.
Ingen oneoff. DEC-0156. Sol/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-15 – 4.0.368 fortsætter fra central version 1

Arbejd i siblingworktree `RavRadar-4.0.366` på branch `codex/4.0.368-preserve-false-outputs`. PR #309 bestod sourcegate `34914010157` og blev merged som main `d25dfe8e`. Code-only-run `34914399119` gennemførte engangsrecoveryen; Supabase er nu `INTEGRATED_ACTIVE` version 1. Gentag ikke recoveryen.

Runnet stoppede bagefter, fordi jq `.[$field] // ""` gjorde ægte boolske `false`-felter tomme. 4.0.368 bruger eksplicit `has($field)` og har ingen anden forekomst af det gamle mønster. Fortsæt: målrettede kontroller → commit/push → én exact-head PR-gate → merge → providerfri code-only fra central version 1 → central/offentlig kontrol → separat tidsbegrænset normal weather. Sol/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-15 – lokal 4.0.367 retter manglende central cutover

Arbejd i siblingworktree `RavRadar-4.0.366` på branch `codex/4.0.367-cutover-state-recovery`; mappenavnet er historisk, mens `package.json` er autoriteten. Main er 4.0.366/`62fe62ee`. Code-only-forsøg 2 viste, at Pages har den historiske integrerede binding, men central operation mangler og profilen fortsat er legacy Candidate G. Run `34877443841` var falsk grøn: Pages blev publiceret, mens plan/handoff og central begin/complete fejlede. Gentag ikke påstanden om en fuldført Supabase-cutover.

4.0.367 har en engangs-, hash- og runlåst recovery, der kræver den eksakte manglende centrale tilstand og en frisk verification af det offentlige historiske target. Samme code-only-run fortsætter derefter gennem den eksisterende historisk-til-aktuel vedligeholdelse. Pages-terminalen kræver nu handlingsspecifikt completion eller gyldig reconciliation. Målrettet state-machine, code-only-kontrakt, YAML-parse og de faktiske historiske beviser er grønne. Ingen provider eller oneoff.

Fortsæt: forsegl bundles/version/RDKS → målrettet slutdiff → commit/push → én exact-head PR-sourcegate → merge → manuelt code-only-deploy med `DEPLOY-CODE-ONLY-REPAIR` → central og offentlig kontrol → separat tidsbegrænset normal weather med score-, rotations- og cachebevis. DEC-0149. Sol/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-14 – integreret model online; Astra-review før normalt vejr

Læs først `ASTRA_POST_CUTOVER_REVIEW_2026-09-14.md`. PR #306 er admin-merget som main `fa418f43`; cutover `34877443841` har faktisk publiceret den integrerede model og privat runtime. Dataset `rr-20260914180039-210` har 210 zoner/673 dele/118 timer, men endnu ingen tilgængelige scorer. Strukturkomplethed er ikke numerisk komplethed. Gentag ikke cutover.

Normalworkflowet er stadig deaktiveret. Ejeren ønsker grundig analyse før den næste normale vejrkørsel, ingen sourcegate, oneoff eller brede testgentagelser. Bekræftede rettelser omfatter vindtab i merge, 360-graders afrunding, ugyldigt strømholdinterval samt misvisende UI-/dækningstal. Samlet implementering skal også bevare den gemte private historik gennem ny modelbinding og undgå kendte gentagelser i den normale opgraderingsvej. Gemt runtime findes; nyt separat checkpoint er ikke bekræftet.

Aktiv arbejdsmappe er siblingvisualiseringens `RavRadar-4.0.366`, ikke den beskidte `cb79/RavRadar`. Appversionen er stadig4.0.365. Dette er kun analyse-/dokumentationscheckpoint; rettelserne er ikke implementeret. Se reviewet for præcise paths, hashes, evidens og resterende arbejde. Sol/Ekstra høj er den planlagte implementeringsindsats efter Astra-gennemgangen. Ældre launch- og gateinstruktioner nedenfor er historik, hvor de modsiges af dette checkpoint.

# HISTORISK CHECKPOINT – 2026-09-14 – lokal 4.0.365 retter checkpointets manglende dataset-id

4.0.364 bestod sourcegate `34846130189`, blev merged gennem PR #301 som main `273cb052`, og providerfrit handoff `34848494028` blev grønt. Cutover `34849662988` forsøg 1 ramte midlertidig Supabase 502; retry i forsøg 2 fortsatte og gav grøn integreret runtimeaudit med 0 fejl. H0-rettelsen er dermed bevist.

Stoppet kom bagefter: checkpoint-leddet krævede auditrapportens `datasetId`, men producenten skrev ikke feltet. 4.0.365 tilføjer alene det allerede validerede `full.datasetId` til rapporten. Modelbundles, migration 15, score, vejr, rotation, cache, geometri og privacy er uændrede.

Fortsæt uden oneoff eller weather: én exact-head sourcegate → merge → kort providerfrit same-head-handoff → cutover → offentlig kontrol → normal weather/rotation. Sol/Ekstra høj. DEC-0147.

# NYESTE CHECKPOINT – 2026-09-14 – lokal 4.0.364 retter den sidste H0-auditparameter

4.0.363 bestod sourcegate `34838663036`, blev merged som main `b4024371`, og det providerfri handoff `34840938570` blev grønt. Cutover `34842010506` byggede 210 zoner, 673 dele og 1.346 modes, men stoppede før writes. 4.0.363 fjernede 32/48 tidligere fejl; de resterende 8 last-mile- og 16 modeudslag kom fra samme auditfejl: H0-rekonstruktionen udelod den virkelige ældre `currentReferenceAt`, så senere null-svar overskyggede målingen. 4.0.364 sender denne tid videre som `nativeHoldReferenceTime` kun ved verificeret `NATIVE_CADENCE_HOLD`. Direkte regression for begge modes er grøn; modelbundles, migration 15, score, vejr og cache er uændrede.

Fortsæt uden oneoff eller weather: docs/slutkontrol → commit/push → én exact-head sourcegate → merge → kort same-head cache-handoff → cutover → offentlig kontrol → normal weather. Sol/Ekstra høj. DEC-0146.

# NYESTE CHECKPOINT – 2026-09-14 – lokal 4.0.363 retter det faktiske H0-runtime-stop

4.0.362 bestod sourcegate, blev merged som main `8f5d818f`, og cache-handoff `34830877368` blev grønt uden provider. Cutover `34832259268` byggede 210/673, men skrev eller deployede ikke, fordi runtimeauditen fandt de samme otte H0-holds.

4.0.363 retter en delt mutable holdintervalliste, så næste forecasttime ikke kan ændre H0-state. Candidate G-auditen følger den virkelige ældre reference kun ved eksakt integreret holdbevis og højst tre timer. Direkte replay og syntetisk 210/673-audit er grønne. Bundles `327b989b…`/`1ccbb10e…`; migration `20260914020000`.

Fortsæt uden oneoff eller weather: RDKS/version → commit/push → én exact-head sourcegate → merge → kort same-head cache-handoff → cutover → offentlig kontrol → normal weather. Sol/Ekstra høj. DEC-0145.

# NYESTE CHECKPOINT – 2026-09-14 – lokal 4.0.362 skal online

Main er `6337fa09065b38bc578dad1a81a83ddd505bbd0d` efter PR #298. Handoff `34804412079` har 79.414/79.414 klassificerede currentpar, men tallet er ikke numerisk komplethed. Cutover `34805083829` byggede 673 dele og kørte 272 kontroller; én rumlig audit stoppede deploy. Diagnose `34820407527` viste 669 vind, 673 bølger, 659 direkte current + 8 holds, 6 lokale currentmangler og 669 vandstand ved H0.

På branch `codex/4.0.362-cutover-validation-resume` er DKSS same-run `windTail` og eksakt H0-currenthold rettet. Bundles `b144ebcd…`/`b4b258f2…` og append-only migration `20260914010000` er synkroniseret. Første cutover gentager ikke reference/full validate/release/data. En ærligt utilgængelig score må komme online.

Fortsæt uden oneoff og uden bred lokal testrunde: RDKS/version → commit/push → én exact-head sourcegate → merge → kort same-head cache-handoff → cutover/deploy → offentlig sitekontrol → normal weather/rotation. Sol/Ekstra høj. DEC-0144.

Ældre checkpoints nedenfor er historik.

# NYESTE CHECKPOINT – 2026-09-14 – lokal 4.0.361 efter integreret auditmismatch

Main er 4.0.360/`cbb56fcb00b9ce654b51768b3df23d7add2e8904` efter PR #297 og sourcegate `34795741830`. Handoff `34797345624` forseglede 79.414/79.414 currentpar uden provider/oneoff. Candidate G er stadig offentlig, og normalworkflowet er deaktiveret.

Cutover `34798027472` kørte alle fem hovedkontroller og 272/272 underkontroller. Fire hovedkontroller var grønne. Kun den rumlige audit fejlede med 654/673; ingen writes/deploy. Producenten havde samtidig 673/673 scoreklare dele, og integreret public runtime bestod 210/673/1.346.

Lokal 4.0.361 retter alene audittens to stale kanter: fem DMI-dele reproduceres fra produktionsprojektionens femdecimalers U/V, og fjorten native-cadence-holds læses fra aktiv `ravScoreModel` frem for kun historisk `candidateG`. Ikke-genkendte dele får nu individuel årsag. Direkte regressioner og uændrede modelbundle-/bindingschecks er grønne.

Fortsæt uden oneoff eller almindelig weather: version/RDKS/håndbog → målrettet slutkontrol → én exact-head GitHub-sourcegate → merge exact green → kort same-head cache-handoff → fuld cutover → offentlig 210/673/118/sitekontrol → normal weather/rotation. Bevar alle brugerændringer og eksisterende private artefakter. Sol/Ekstra høj.

De jobløse poster `34613079069` og `34228112413` kan ikke starte og slettes, når GitHub gør dem sletbare.

Se DEC-0143 og `CHANGELOG-4.0.361.md`. Ældre checkpoints nedenfor er historik.

# NYESTE CHECKPOINT – 2026-09-14 – lokal 4.0.359 retter hele den samlede kontrolliste

Main er 4.0.358/`2a1c73d2`; exact-head-sourcegate `34777480545` og cache-handoff `34781396538` er grønne. Handoffet bevarede target `2026-09-12T08:00:00Z`, hentede intet providervejr og lukkede alle 79.414 par: DMI 67.686, Copernicus 8.668, regional 944 og Open-Meteo 2.116, missing 0.

Cutover `34781869394` gennemførte alle 272 bladkommandoer og alle fem hovedkontroller. Runtime/modelaudit, referencezoner, releasegate og datavalidering var grønne; fuld validering samlede seks fejl. De seks er nu hver reproduceret som en forældet testforventning eller forkert testkontekst: to gamle DMI-rotationsværdier, en gammel availability-fixture, forkert DMI-cachepath i collectorjobbet, en fixture der krævede opfundne mellemtimer uden provenance, og en skrøbelig kaldetælling. Ingen af dem viser scorefejl, vejrhul eller datatab.

Lokal 4.0.359 retter alle seks samlet og binder collectorens rumlige audit til samme friskbyggede DMI-candidate-cache som den normale fulde validering. DEC-0140 består: fremtidige ukendte eller produktkritiske fejl stopper stadig før writes. Kontrolfejl skal rettes konkret, ikke skjules bag en generel undtagelse. Ingen score-, vejr-, model-, geometri-, migrations- eller privacyændring indgår.

PR #296's første head `b0f43474` nåede releasegate og de første 30 unikke sourcekontroller grønt i run `34786784374`, men stoppede på, at 4.0.359-afsnittet i webhåndbogen ikke var kopieret ind i Supabase-installationsfilen efter den sidste dokumentændring. Projektets synkroniseringsværktøj har nu rettet kopien, og den direkte test er grøn. De 90 sourcekontroller efter stoppet er kørt samlet til ende lokalt: alle Node-led var grønne; 26 Python/Node→Python-led var alene røde uden Windows-alias og er derefter 26/26 grønne med projektets bundne Python-runtime. Ingen yderligere kodefejl blev fundet.

Næste rækkefølge er målrettet slutkontrol, én exact-head GitHub-sourcegate, merge, kort cachebaseret SHA-handoff uden provider/oneoff og ny cutover. Normal weather forbliver deaktiveret indtil offentlig model- og siteverifikation. Derefter bevises almindelig cachevedligeholdelse og fuld DMI-rotation. De to gamle jobløse workflowposter `34613079069` og `34228112413` slettes, når GitHub tillader det. Sol/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-13 – lokal 4.0.358 samlet cutoverrettelse implementeret

På `codex/4.0.358-cutover-error-collection`, baseret eksakt på main `2c243d9e`, er Astra-reviewets samlede rettelse nu implementeret. Cutoverens fem topkontroller fortsætter alle til ende og afgør først derefter samlet, om installationen må skrive eksternt. Den fulde validering er desuden udvidet til sin komplette deklarerede plan på 272 bladkommandoer: hver uafhængig kontrol fortsætter efter fejl, og en atomisk rapport gemmes før, under og efter forløbet. Første cutover har 180 minutter; normalvejret beholder 90 minutter. Ingen provider-oneoff er tilføjet.

De konkrete falske stop er også rettet i samme arbejdsgang: gammel strømfixture, gammel public-runtime-scoremotor, tre gyldige boolske `false`-udtræk og Pages-kontrollens sammenblanding af lokal `UNAVAILABLE` med ufuldstændig historik. Måltests for fejlopsamling, strøm, workflow og Pages er grønne; version/RDKS er konsistent, og geodata har alene ændret topversionsfelt. Resten før release er én exact-head GitHub-sourcegate, merge og fortsættelse fra det allerede grønne handoff. Den fulde produktkontrol kører i selve cutoveren; hvis alle fem topkontroller er grønne, fortsætter installationen automatisk. Den offentliggøres ikke ved en reel produktfejl.

# HISTORISK CHECKPOINT – 2026-09-13 – Astra-cutover- og modelreview afsluttet, 4.0.358 under arbejde

Ejerens udvidede gennemgang af hele modelkæden er nu også afsluttet. Ingen ny konkret regnefejl påvist i de læste forbindelser/små syntetiske prøver. Endnu en faktisk kontrolfejl er fundet: Pages udleder forkert fuld hukommelse af nul tilgængelige HISTORY_INCOMPLETE-scorer og kan derfor afvise lokal UNAVAILABLE kombineret med ufuldstændig historik. Ret dette i samme 4.0.358; reviewets punkt 7 indeholder reproduktion og måltest. Zonens all-parts-regel og et ubevist 256-MiB-læseloft er særskilte åbne opmærksomhedspunkter, ikke nye påviste launchstop. Ingen score-/produktionsændring udført af reviewet. Sol/Ekstra høj er næste arbejde.

Læs først [Astra-reviewet](ASTRA_CUTOVER_REVIEW_2026-09-13.md). Main er 4.0.357/`2c243d9e` efter grøn PR #294. Handoff `34768997271` er grønt; cutover `34769550035` stoppede i en forældet strømtest. Ingen offentliggørelse. Den lokale 4.0.358-kladde er ikke releaseklar: behold fixturefix/fejlopsamling, men ret også den gamle public-runtime-scoretest, tre boolske shelludtræk og den inkonsistente generelle advisory-fritagelse. Løbende/færdig rapport og cutoverbudget skal afstemmes. Reviewet indeholder de konkrete steder, beviser, arbejdsmappeforhold og minimumsplan. Ingen ny oneoff. Skift nu tilbage til **Sol / Ekstra høj** til samlet implementering. Ældre checkpoints nedenfor er historik.

# HISTORISK CHECKPOINT – 2026-09-13 – lokal 4.0.351 direkte til offentlig integreret model

Main er `f6e725ec`/4.0.350 efter grøn PR #285 og backend `34720600286`; migration 12 er anvendt. Cache-only `34720789985` hentede intet providervejr og bestod current 79.414/79.414, WAM, freshness og 673/673 current selection. Modelbygningen nåede 210 zoner/673 dele/1.346 modes, men public-auditen stoppede før handoff/cutover/deploy på fire samlings-/rekonstruktionskoder.

Lokal branch `codex/4.0.351-public-runtime-oracle` retter kun denne offentlige kant: independent coverage/memory/migration, ens publiceret H0-current/native-hold og last-mile samt deterministisk eksisterende part-identitet ved lokal `UNAVAILABLE`. Ingen score opfindes, og slutauditen lempes ikke. Migration 13 er append-only; migration 12 er SHA-fastlåst uændret. Hashes `79d5118a…` / `84311c92…` / `9d396013…`.

Korte kontroller er grønne. Kør ikke ny lang lokal national audit og ingen ny oneoff. Næste: slut-RDKS/geodatadiff, én exact-head GitHub-sourcegate, merge, migration-13 apply/readback, samme cache-only preflight, faktisk cutover og offentlig 210/673-verifikation. Bevar fire untracked inspectmapper. Sol/Ekstra høj. Se DEC-0133.

# NYESTE CHECKPOINT – 2026-09-12 – lokal 4.0.350 fra komplet cache til sikker cutover

Main er `512f889dbb301bc7fb801478358625f5404586b2`/4.0.349 efter PR #284's samlede, privacy-sikre fejlrapport. Cache-only-run `34706453561` bevarede target `2026-09-12T08:00:00Z`, hentede intet providervejr og havde fortsat current 79.414/79.414: DMI 67.686, Copernicus 8.668, regional 944 og Open-Meteo 2.116. Rapporten viste i stedet scoreinputfejl: 659 dele × begge modes manglede accepteret vind, og 14 dele × begge modes havde `CURRENT_DIRECT_INPUT_NOT_READY`.

Rodårsagen for vind var fællesadapterens hardcodede `wind`, som afviste gyldig DKSS `windTail`. Den læser nu alene deklareret `wind|windTail` og beviser samme komponentidentitet. Otte af de 14 currentdele var regionale closure-bundne hold, hvis nødvendige præ-H0-kildereference ikke blev ført ind i den private scorer. Live-current bygger nu eksakte, cache-/proof-/grid-/lag-/U/V-/hashbundne `regionalReferenceEntries`; privat scoring/recovery kan bruge dem, public runtime kan ikke. Den kanoniske rækkefølge er `(validTime, partId)`.

Direkte inputmangel er nu én delt lokal `UNAVAILABLE`-kontrakt gennem generator, conditions/manifest, audit, Pages, browserdataservice, admin og ture. Kun berørt del/mode/time får null-score og udelades fra rangering; resten fortsætter. `HISTORY_INCOMPLETE` holdes særskilt. De seks øvrige H0-currentdele skal klassificeres i ny same-main-runtime og må forblive ærligt utilgængelige uden at stoppe hele 210/673-strukturen.

På ejerens udtrykkelige beslutning kører `integrated-cutover` præcis fem kontroller i én blok: runtimeaudit, referencezoner, fuld validate, releasegate og datavalidering. Alle fejl samles i en payloadfri trinrapport, og enhver fejl stopper én gang før database/checkpoint/privat runtime/Pages. Er alle fem grønne, fortsætter cutover automatisk. Almindeligt vejr er uændret; én exact-head GitHub-sourcegate består, uden lokal dobbelt fuld gate.

Ny append-only migration 12 er `20260912194206_local_unavailable_cutover_binding.sql`; migration 11 forbliver byteuændret. Efter den seneste modelafhængige availabilityrettelse er integrated/rollback/continuation `a575f767…` / `ca184522…` / `dce13d51…`. PR #285-head `fe4969f1`/run `34717671774` var rød uden sourceproof på en historisk hash-test; det er rettet med fastlåst 4.0.349-SHA `548c2925…`. Næste head `66338d63`/run `34717905077` bestod migrationsleddet og samlede tre senere fejl: Candidate G-stage/ture blev sendt gennem integrated-policyen, og releasegaten søgte gammel inline-historikkode. Fælles validator kræver nu enten integrated lokal `UNAVAILABLE` eller exact Candidate G komplet/full-history; releasegaten følger den fælles historikvalidator. Hurtige tur-, hash-, binding- og markørkontroller er grønne. Efter ejerens stop for testspiralen køres ingen ny lang lokal fuldpakketest; næste bevis er én ny exact-head GitHub-gate. Derefter merge, migrationapply/readback og cache-only cutover. Normalworkflow forbliver disabled til offentlig integreret 210/673-kontrol. Bevar fire untracked `.tmp-run-*-safe-inspect`. Sol/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-12 – lokal 4.0.349 efter positiv cache og v1/v2-modelstop

Main er `c86cc2a0283e9afda7b4d7677497ecccd0ceafba`/4.0.348; branch er `codex/4.0.349-state-only-closure-v2`. PR #282 var exact-head-grøn og merged byteidentisk. Backendrun `34697586057` genbrugte sourceproofet uden dobbelt fuld kildegate, anvendte alene `20260912122607_measured_rollback_warmup_binding.sql` og bestod readiness/readback.

Cache-only-run `34697760571` brugte `2026-09-12T08:00:00Z`, sprang DMI-register/plan/producer og CP-plan/credentials/producer over, brugte OM reuse-only og bestod gemt currentclosure, native WAM og freshness. Ingen providerhentning. Modelbygningen stoppede derefter på `RAVSCORE_RECOVERY_REPLAY_STATE_ONLY_HOLD_INVALID`, fordi live-current udstedte korrekt closure-v2, mens RavScore-validator/fixtures stadig krævede v1. Intet handoff/cutover/deploy; Candidate G er offentlig.

Lokal 4.0.349 deler én v2-konstant mellem producent og RavScore, har en faktisk live-adapter→validator-seamtest og afviser v1 særskilt. Ingen score-, fysik-, vejr-, grid-, afstands-, geometri- eller provenancekontrakt ændres. Integrated bundle `c1e75371…`, rollback `d4fd8620…`, continuation `7f6e1c2d…`.

Den anvendte 4.0.348-migration forbliver immutable ved normaliseret SHA-256 `704439882eb6e77a7c038e14b8ecfd49ef9b6bb9074f9ea5778f6843f6c48137`. Ny append-only `20260912141641_state_only_hold_closure_v2_binding.sql` fører kun tre forseglinger/readbackversion frem. Begge builders er versionsfastlåste. 11-leddet readiness/install/checkpoint/release/workflowmatrix er måltestet grøn.

Ejeren har udtrykkeligt godkendt at flytte DEC-0122's uændrede engangsundtagelse til exact 4.0.349. Policy, workflow og tests må kun ændre releaseVersion; alle størrelses-, storage-, checkpoint-, integrity-, privacy-, readback-, handoff- og recurring-forbud består.

Næste: slut RDKS/metadata/diff, én exact-head PR-sourcegate, byteidentisk merge, apply/readback af migration 11, gentag samme cache-only-run, kræv Feggesund/full post-data gates/same-head-handoff, cutover og offentlig 210/673-kontrol. Normalworkflowet er disabled; `34613079069` er inert `jobs:[]`. Genaktivér først efter offentlig succes og mål normal DMI-rotation særskilt. Bevar fire untracked `.tmp-run-*-safe-inspect`. Sol/Ekstra høj gennem slutvalideringen.

# NYESTE CHECKPOINT – 2026-09-12 – lokal 4.0.348 fra komplet cache til model-online

Læs først `CURRENT_SESSION_HANDOFF.md` og de nyeste RDKS-topafsnit. Main er `6868ae04`/4.0.347; branch er `codex/4.0.348-candidate-warmup-projection`. PR #281 exact head bestod sourcegate `34681246581`, og main-oneoff `34682428800` genbrugte beviset uden en anden fuld kildegate.

Oneoffens vejr var komplet: DMI 67.686 + Copernicus 8.668 + regional 944 + Open-Meteo 2.116 = 79.414/79.414, missing 0. De 193 var kun resten før Copernicus. Native WAM 79.060 var grøn. Kørselen stoppede først bagefter på Candidate G-rollback-oraklets READY-48h-krav, så der findes intet handoff, artifact, cutover eller deploy; Candidate G er fortsat offentlig.

Lokal 4.0.348 gør rollback privat numerisk, men offentligt/valgbart unavailable/null indtil READY, kun ved attesteret målt koldstart eller privat `BUILDING_MEASURED_ONLY`-fortsættelse. Ny `locked_weather_resume` fastholder `2026-09-12T08:00:00Z`, springer DMI/Copernicus over, bruger Open-Meteo reuse-only og spærrer skjulte providerkald. Mangelfuld cache stopper uden automatisk ny oneoff; alle efterfølgende gates genkøres.

Den gamle WAM-migration er allerede centralt anvendt og må ikke omskrives. Lokal append-only `20260912122607_measured_rollback_warmup_binding.sql` fører kun 4.0.348-forseglinger/readbackversion frem. Efter merge skal den anvendes og readback-verificeres før cachekontrollen. Backendworkflowet genbruger PR-sourceproof efter live exact-content-kontrol og kører ellers fuld kildegate.

PR #282's første head `cc06fa37`/run `34695465328` er negativ: alle lange model-/privacy-/runtimeled var grønne, men releasegatens statiske testplan manglede den nye migrationsbygger, så intet sourceproof blev uploadet. Lokal opfølgning binder byggeren præcis én gang til releaseplan/package og er måltestet. Push ny head; rerun eller genbrug ikke den røde.

Næste trin er lokal slutmatrix og Sol/Ekstra høj-review, én exact-head 4.0.348-PR-sourcegate, byteidentisk merge, append-only backendapply/readback, fastlåst cachekontrol, fuldt same-head-handoff, cutover og offentlig 210/673-verifikation. Normal drift aktiveres først kontrolleret bagefter. Runnet viste kun DMI-pass 1; multipass/rotation forbliver et åbent normaldriftsbevis. Bevar de fire untracked `.tmp-run-*-safe-inspect`-mapper.

# HISTORISK CHECKPOINT – 2026-09-12 – lokal 4.0.347 måltestet, exact-head og drift åbne

Main er fortsat 4.0.346 på `e912ef9a`; Candidate G er offentlig. Oneoff `34675040245` er terminal failure, ikke cutoverinput. Den gemte DMI-, Copernicus-, regional- og Open-Meteo-fremgang består, men Open-Meteo sluttede 2.170/2.212 med 42 provider-negative par fordelt på 21 kystdele efter isolerede genforsøg. Der var ingen runtime-, attempt- eller køgrænse i OM, men de 42 er stadig reelle mangler. Intet handoff/artifact/deploy/modelskift blev udført.

Lokal 4.0.347 implementerer Astra-reviewets seks kanter: opt-in terminalkode 75 først efter fuld producentfinalisering; generisk exit 2 læses aldrig som cachebevis; supervisoren bevarer watchdoghistorik; indre/ydre DKSS/HARMONIE-runtime adskilles eksakt fra download; kun `assetsProcessedThisInvocation` tæller; Pages genkontrollerer target+117h før begin-CAS og umiddelbart før deploy med eksisterende reconciliation efter begin. Normal drift, sources, grids, afstande, score og closure er uændrede.

Målbevis er grønt: wrapper 15/15, supervisor 12/12, checkpoint 32/32, Python compile, DMI-modeldownload, freshness og workflowrækkefølge. PR #281's første exact-head-run `34680013012` bestod releasegaten, men stoppede senere på én statisk WAM-test, der søgte de nu erstattede direkte exitlinjer. Testen følger terminalhelperen og er grøn 63/63; produktionskode er uændret. Opdatér dokumentcheckpoint og branch-head, kør én ny exact-head PR-sourcegate, merge sikkert og start ny main-oneoff på de genvaliderede cacher. Cutover må kun følge ved current 79.414/79.414, native WAM 79.060, Feggesund 354/354, freshness og gyldigt same-head-handoff. Fuld post-data validate/releasegate og offentlig kontrol må ikke genbruges. GPT-5.6 Sol/Ekstra høj.

# HISTORISK CHECKPOINT – 2026-09-12 – Astra-review af ufuldstændig 4.0.347

Main er nu 4.0.346 på `e912ef9a`, CI-valideret via PR #280/run `34673860241`. Oneoff `34675040245` genbrugte kildeproofet, gemte DMI/GRIB/regional progression og nåede 66.998/79.414 direkte DMI-par i ét pass. NSBS og HARMONIE havde begge eksplicit bevaret runtime-stop; fallbackkæden var stadig aktiv ved sidste kontrol. HARMONIEs tomme liste betyder genkendte, ikke planlagte, parametre.

Lokal 4.0.347 på `codex/4.0.347-dmi-harmonie-runtime-continuation` er **ikke releaseklar**. Astra/Ultra-review har fundet manglende skel mellem forventet partial og post-cache-exception, bortfaldende watchdoghistorik, ydre HARMONIE-stop, overbelastet download/runtimekode, historiske assettællere og en eksisterende udløbskant før Pages. Læs [det permanente review](ASTRA_HELICOPTER_REVIEW_2026-09-12.md) og [handoff](CURRENT_SESSION_HANDOFF.md) før videre arbejde. Reviewet er afsluttet; bed ejeren skifte tilbage til **GPT-5.6 Sol / Ekstra høj** før implementering og releasearbejde. Ingen ny writer/merge før frisk kontrol af den aktive oneoff. Ældre checkpoints nedenfor er historik.

# HISTORISK CHECKPOINT – 2026-09-12 – lokal 4.0.346 reelle DMI-multipass

Main er 4.0.345 på `64d2f23f`. PR #279 exact head `47275529` bestod sourcegate `34666410182`, og oneoff `34667430392` live-genbrugte exact-content-proofet uden en anden fuld kildegate. Normalproduktionen er disabled; den inerte jobløse køpost `34613079069` må ikke behandles som aktiv writer. Candidate G er offentlig.

Oneoffen stoppede korrekt uden handoff/deploy efter 1h41m38s: DMI 64.400/79.414, Copernicus gennemførte 73 forsøg på 39m25s, regional dækkede 928, og Open-Meteo løste 2.284/2.468. De sidste 184 var alle forsøgt og singleton-genprøvet; null/grid-resultater uden runtime-/attempt-/køstop er ærlig provider-negativ evidens for target/kilde, ikke permanente umuligheder.

Helkædefejlen er oneoffens falske multipass: producentens korrekte exit 2 ved ufuldstændig currentledger blev returneret før den gemte fremgang blev klassificeret, og alle pass delte én 3.000-sekundersramme. DMI planlagde hele registeret og betjente alle tre DKSS-familier, men kunne derfor ikke få næste roterede passage.

Lokal 4.0.346 tillader højst tre separate 3.000-sekunders/4-GiB-pass efter exact same-target-slutcache, allowlistet runtime/lokal-skip og faktisk assetfremgang. Et tredje strict-current-runtimepass kræver højere verifiedPairCount; den eksisterende exit-0-downloadbudgetvej er særskilt. Andre fejl stopper. Normalproducent, sourceorder, grids, afstande, score og closure er uændrede. Oneoff har 160 minutter til DMI og 330 samlet.

Næste bindende trin: afslut version/RDKS/håndbog, kør måltests, én exact-head PR-sourcegate, merge, derefter én kontrolleret main-oneoff på bevarede cacher. Kræv current 79.414/79.414, native WAM 79.060, Feggesund 354/354, freshness, fulde post-data-gates, handoff, integreret cutover og offentlig modelkontrol. Se DEC-0128 og `CHANGELOG-4.0.346.md`. GPT-5.6 Sol/Indsats Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-12 – lokal 4.0.345 efter main/oneoff og helkæderettelse

**Aktuel handling:** PR #279's tredje head `e1e9dd1e` beviste i run `34664907674` igen hele `validate:source` grøn og viste den præcise dirty-state: `release/RELEASE-REPORT.json` og `.md`. Rodårsagen var ikke Linux, modellen eller tests, men at den fulde releasegate altid skrev en ny tidsstemplet tracked rapport. Sourcevalideringen kalder nu samme fulde gate med `--no-write-report`; kun de to rapportwrites undertrykkes. Den separate post-data-produktionsgate og `release:package` bruger fortsat almindelig `npm run release:gate` og skriver rapporterne. Kør ny exact-head-CI, merge kun hvis gate, rent træ og proofartifact alle er grønne, og følg derefter én kontrolleret main-opfyldning på bevarede cacher. Kræv current 79.414/79.414, native WAM 79.060, Feggesund 354/354, freshness, fuld validate/releasegate og runbundet handoff før integreret cutover. Candidate G er offentlig indtil positiv offentlig modelverifikation.

**Faktisk runtime:** 4.0.344 blev merged som `f2cc2a77`. Normalrun `34635781802` sluttede med 1.335 currentrester. Oneoff `34642214559` sluttede med 1.033/79.414 provider-negative Open-Meteo-rester, current 78.381/79.414, grøn WAM/Feggesund og intet handoff/cutover. DMI roterede alle seks collections og planlagde mod hele registeret; “upstream fravær” betyder alene, at den konkrete fallback ikke gav et gyldigt eksakt grid-/værdipar, ikke at DMI/CP aldrig kan levere.

**Rodårsag og rettelse:** Copernicus brugte cirka 54 minutter; 31 gentagne fulde admission/checkpoints tog cirka 2.376 sekunder/78,2 %. 4.0.345 skriver nu hvert segment som en fsync'et, readback-hashet receipt bundet til exact donor/reference/targets og konsoliderer seks ad gangen gennem uændret strict bank→shadow→stage. Positiv receipt bærer acquisition/records; legitimt nulresultat bærer kun immutable attempt og opfinder ingen native tid. Replay, quarantine, soft-boundary og alle fire workflowcacheveje er dækket.

**Måling:** Syntetisk 40.120-record før/efter med seks segmenter: 115,905 sekunder mod 46,438, heraf 0,127 sekunders journal; slutbank, shadow og stage er byteidentiske. Den samlede Copernicus-målpakke er grøn. Dette er lokalt kapacitetsbevis, ikke live closure.

**Kildegate:** PR-workflowet kører sourcegaten én gang på exact head og uploader et artifact bundet til SHA-256 af hele tracked treeindholdet. Main må kun genbruge ved identisk content og live GitHub-verificeret same-repo PR/merge/artifact/run/attempt/head/job/steps. PR #278-runnet beviste, at `run.pull_requests` kan være tomt; bind derfor via `/pulls/{number}`. Enhver uvished kører fuld main-sourcegate. Post-data validate/releasegate må aldrig genbruges eller springes over.

**Driftstilstand:** Produktionsworkflowet er deaktiveret; `34613079069` er en inert queued/jobs[]-post. Start aldrig en dubletwriter uden frisk run/job/main-kontrol. Bevar `.tmp-run-34635781802-safe-inspect/` og `.tmp-run-34642214559-safe-inspect/`; de er untracked sikre diagnoseudtræk. Se DEC-0127 og de nyeste RDKS-indekser.

# HISTORISK CHECKPOINT – 2026-09-11 – lokal 4.0.344, bevist genbrugsfejl og målrettede CP-segmenter

**Aktuel næste handling:** Saml den frosne, måltestede 4.0.344-pakke til én exact-head-CI. `34623745943` er GRØN: regionalt +656/−0, fast rest 1.002, heraf 676 uden afsluttet relevant CP-forsøg og 326 forsøgt uden accepteret par. Fem produkt/shard-requests har 37 nødvendige timer over 118 med 80 tomme timer. Alle input er uændrede. Segmentering ved mindst 24 hele tomme timer er implementeret lokalt; små mellemrum beholdes samlet, ét segment pr. shard/pass, kollektiv attempt-retirement og exact-pair-fejlisolation. De tre samlede CP-måltests er grønne. Den sidste subprocess-regression beviser, at et fejlet AMM-segment ikke spærrer et andet segment efter senere Baltic-unlock; fejlen skaber intet completed witness, og slutstatus bevarer ærligt resthullet. Dette supersederer tidligere afsnits igangværende diagnose/implementation.

**Pakning:** Version 4.0.344 er committed/pushet som PR #278, men ikke main. DEC-0126, aktive krav/issues/MASTER_LOG, changelog og begge håndbøger er opdateret. DEC-0122's first-cutover-undtagelse følger snævert 4.0.344 under stående ejerautorisation. Releaseversion, RDKS, runtimebinding, uændret modelbundle og browserimports er måltestet grønne; særskilt diff viser kun topversionsfelt i geodata. Den isolerede læsende diagnosebranch må ALDRIG merges. .cache, .tmp, forensic og gamle inspect-hjælpere forbliver urørte og uden for PR.

**Exact-head-opfølgning:** PR #278 head `1fd4d8a3` bestod den lange kildekontrol frem til DMI-schedulertesten, som stadig forventede den gamle STAC-slutkant `required_horizon_end`. Produktionskoden observerer med vilje frem til en mulig kausal models +120-terminal, mens producentkø/ledger forbliver 118 timer. Testens ene forventede kald rettes derfor til denne kontrakt; ingen produktionskode eller acceptregel ændres. Kør den isolerede schedulertest og ny exact-head-CI; genstart ikke det fejlede run.

**Anden exact-head-opfølgning:** Head `362709cd` passerede schedulertesten og fortsatte næsten til slutningen af workflowkontrakterne. Den stoppede i en statisk cachebevaringstest, fordi recovery-hash/quarantine nu er flyttet fra `commit_donor_bank` til den fælles `prepare_recovered_donor_replacement`, som også beskytter den optimerede prepared-commit. Den statiske test følger nu helperen, public/fast builder-validering og kald-rækkefølgen. Hele den korte workflowkontrakt samt de source-tail-kontroller, som CI ikke nåede, er grønne lokalt. Opdatér samme PR med ny exact head; genstart ikke de to gamle runs.

**Driftsværn:** Main og offentlig model er uændret. Den godkendte normale run `34613079069` var fortsat queued/jobs[] ved 16:44 UTC, og forespørgslen om ét minuts workflowgenaktivering er ubesvaret. En gammel head, der først starter efter merge, stoppes før vejrrestore/providerarbejde af exact-main-værn; et queued snapshot er dog ikke en lås. Verificér run/attempt/jobs umiddelbart før merge og afvent en eventuel aktiv writer. Ingen run er annulleret. Adaptiv deadlineguard er fravalgt nu: mål først de nye segmenttider; eksisterende hard/softbudget og checkpointbevaring består.

Main er fortsat `5587001b` / 4.0.343; Candidate G er offentlig. Ejerens eksplicit godkendte almindelige vedligehold `34613079069` er dispatched, men stod stadig queued/jobs[] omkring 15:20 UTC. Workflowet er igen disabled_manually. Ingen ny oneoff, cutover eller rollback er startet.

Læsende diagnose `34615189896` målte: 1.658 rester fordelt på 8 dele med 114 huller, 21 med 33, 2 med 5 og 43 med 1. Regionalt ligger 912 huller i den godkendte otte-dels-policy; et isoleret kontrafaktisk forsøg med fuldt originale retained LF-outcomes dækker 656 af dem (216 eksakte + 440 hold), uden at miste nogen eller ændre input. 256 regionale huller består. CP-journalen er bundet til den faktiske DMI-fil: 1.004 slutpar har intet afsluttet registreret forsøg i nogen relevant CP-kilde; 654 blev efterspurgt på returnerede native timer men gav ingen accepteret parværdi. AMM15's kunstige geografiske grænse rammer kun 48 slutpar, ikke hovedresten. Alle 4.516 OM-diagnoseafvisninger skyldes præcis diagnosens sub-syvdecimal-punktforskel; ikke påvist produktionskorruption. Se [residualaudit](WEATHER_RESIDUAL_AUDIT_2026-09-11.md).

Den rettede læsende diagnose `34615949813` på isoleret branch/head `69a86b78` er afsluttet grøn. Alle inputhashes er uændrede. Af de 1.658 slutrester er 1.107 markeret `LOCALLY_SKIPPED` i alle tre DMI-currentfamilier, 477 spatialUnavailable i IDW og lokalt sprunget over i mindst én anden familie, og 74 upstreamAbsent i alle tre. Det beviser utilstrækkelig DMI-betjening, ikke at alle disse filer faktisk vil give valide værdier. Den første diagnoses forkerte familienavn er rettet til den kanoniske liste; syv syntetiske diagnosetests er grønne. Ingen providerfetch/cache-save/deploy.

Lokal DMI-leadrotation og fair reserve inden samme kørsel er måltestet; LF's faktiske regionale holdgevinst/criticalqueue er under implementering. Regionalt samplebundet originalproof og migration/EOF-transaktion er implementeret lokalt; regionale tests, shadow-tests, 26 transactiontests og native-provenance-test er grønne. Migration gemmes før native recovery-write; research-only replay må ikke længere overskrive regionale samples. Minus-tre-timerskanten er bundet til locked target, ikke faktisk startminut. En yderligere regional no-loss-kontrol sikrer, at en afvist genlæst same-key leaf ikke erstatter en ældre stadig gyldig sample/binding.

Læsende faktisk migrationsreplay `34619730789` på isoleret forensic-head `cc2d1e59b019cea287f3e9f75ad59774d31a7777` er afsluttet GRØN: separat exact-5587001b-checkout med frossen regional patch, ægte extractor/migrator/consumer, +656/−0 i den faste rest, serialisering bevarede proof, anden migration var idempotent, nul quarantine og alle inputhashes uændrede. Fast rest efter denne isolerede prøve: 1.002, ikke en ny produktionsstatus. Af de 256 regionale restpar har 240 et relevant officielt native-cadence-asset, som ikke blev behandlet; 16 ved offset 0..1 kræver venstre kildekant uden for den undersøgte ledgerakse. Katalogtilgængelighed beviser ikke en brugbar U/V-værdi. Første forsøg `34619473233` stoppede FØR cache-restore, fordi diagnosens egen workflowtest stadig forventede én analysekommando frem for nu to på samme generation. Kontrollen er rettet til eksakte kommando-/source-/generationbindinger og alle syv lokale tests er grønne. Ingen providerfetch, cache-save, production writer eller mainændring.

Main-flow-review fandt også DMI's katalog-/terminalmodstrid: selector krævede modelRun+120, men spurgte kun til target+117. Lokal rettelse observerer hele nødvendige terminalhorisont uden at udvide producentkø/118-akse; separat sanitiseret `nativeTerminalAsset` valideres i ledgeren. Faktisk datetime-filtrerende katalogfixture (tre familier, alder 0/1/2, ikke-sekstimersbundne modelankre), ægte builder/strict-reader, serialisering og negative tampertests er grønne i native-provenance-testen. LF's offphase-guard, ændringsstyrede tunge replan og exact in-axis schedulerobservation er færdige med 29 grønne transaktionstests samt DKSS-primary. Uafhængigt integrationsreview fandt ingen ny konkret fejl i selector→ledger→reader→registry/runtime-sporet. Præ-target-genforsøg og native ejerskifte er fortsat begrænsede åbne ydelseskanter, ikke ændret admission. Se auditens sidste afsnit.

CP's første positive fastpath var ikke hurtigere og er erstattet. Den færdige lokale efterfølger har uafhængig encoder-SHA/størrelse, disk-readback og samlet precommit for bank→shadow→stage. Efter-readback-prøven med 40.120 Baltic-records gav 27,536 mod 45,926 sekunder, 2×N recordvalideringer, tre byteidentiske filer og 77,1 MB ekstra traced peak; se CP_CHECKPOINT_PROFILE_2026-09-11.md. Source-stage-måltest inkl. maskmutation og injiceret skrivekorruption er grøn. CP-kadencerotationen er nu kølængdebevidst: faktiske 34/9-køer og både 15-minutters-/timekadence er måltestet; range-runner og pilot er grønne. Læsende post-migrations-sparsitetdiagnose `34623745943` på isoleret head `39a7bfc4` kører; den skal afgøre behovet for tidsopdeling og budgetværn, ikke ændre geografi eller producere ny driftstatus. Ni syntetiske diagnosetests er grønne. Normalrun `34613079069` stod stadig queued/jobs[] ved 16:44 UTC; den særskilte forespørgsel om højst ét minuts workflowgenaktivering er fortsat ubesvaret. Ingen af produktionsrettelserne er committed/merged. Retention, eksakte timer, kildeprioritet og afstande består. Runtime-targetsæt er bevist identisk ved 7-decimal-fingerprint; fuld central konfiguration og OM's finere præcision er ikke dermed byteidentiske. Fortsæt samlet implementering, læsende cache-replay og målrettet verifikation. Main må ikke flyttes under en aktiv cache-writer.

# HISTORISK CHECKPOINT – 2026-09-11 – 4.0.343 merged, første residualaudit

Main `5587001b45ffea056addaf6cd20084719540336a` er 4.0.343. Oneoff `34588002366` gemte providerprogression, men fejlede før friskhedskontrollen med 1.658 currentrester. Native WAM 79.060 blev accepteret; intet handoff/cutover. Den ejerautoriserede læsende undersøgelse `34608174221` er afsluttet grøn på alle fem generationer: 240 rå shadow-identiteter i den faste 1.658-rest, nul rå DMI-/CP-/OM-par i resten og nul ekstra accepterede par. VIGTIGT: shadow-råtælleren inkluderer research; de 240 er ikke alle dokumenteret regionale. Regional hold kan dække andre timer; 1.418 uden rå eksakt sample er derfor ikke et bevist genhentningstal. OM-diagnoseadmission afviser records og kræver separat forklaring; dens lavere samlede union må ikke bruges som ny driftstatus. Alle input var uændrede; ingen providerhentning, cache-save eller deploy. Se [den aktuelle residualaudit](WEATHER_RESIDUAL_AUDIT_2026-09-11.md) for evidens, CP-profil, regionale proofproblemer og næste trin. Ejeren kræver helheden, ikke alene regionalrettelse, og spørger nu konkret til ændrede afstands-/acceptregler siden komplet 4.0.333-run. Ingen blind ny oneoff. Gammelt lokalt 4.0.343-checkpoint nedenfor er historik.

# HISTORISK CHECKPOINT – 2026-09-11 – lokal 4.0.343 fair providerbetjening

`origin/main` er 4.0.342 på `6a3133fe`; Candidate G er offentlig, og provider-/WAM-cachen er bevaret. Oneoff `34565347360` gav ingen handoff/cutover: current 77.859/79.414, rest 1.555 og terminal WAM-fejl. Det afgørende fund er scheduler-/owner-starvation, ikke cache-reset eller blot manglende tid.

- DMI-currentfamilier får bounded fair service via vedvarende `lastStrictCurrentTurnAt`; exact prefetch flytter refresh-only arbejde efter reelle huller.
- Baltic og AMM15 har separate roterede Copernicus-køer, round-robin, direkte AMM15-only-adgang og kun exact same-pair Baltic-forudsætning for overlap.
- Fælles WAM-owner-policy anvendes i hele kæden: 458 DW/212 NSB blandt 670 native dele, med præcis to exact DW-overrides. Policy-id bindes til register/receipts/historik/runtime; ingen global cache-reset.
- Normal og oneoff bruger samme producentkode; oneoff giver kun flere bounded pass.
- Slutkravene består: current 79.414/79.414; bølger 79.060 native + Feggesund 354/354; nul mangler/uløste lineage-konflikter.
- Målrettede lokale tests er grønne. Exact-head-CI, live providers, closure, gates, handoff, cutover og offentlig modelkontrol er åbne.

Fortsæt med versions-/RDKS-/håndbogslukning, én exact-head sourcegate og den kontrollerede merge/cutoversekvens. Normalworkflow og watchdog/shadow-dispatch forbliver deaktiveret. DEC-0125 er nyeste bindende detaljekontrakt.

# NYESTE CHECKPOINT – 2026-09-11 – lokal 4.0.342 granular provideradmission

Main er 4.0.341 på `caa49c42`. Backend `34534769955` blev rapporteret grøn, men oneoff `34534764449` forseglede intet handoff og udførte ingen cutover. Candidate G er fortsat offentlig. Den levende fejl var ikke cache-reset: 4.0.341's isolerede WAM-candidate bevarede aktiv state, men whole-asset-admission rullede alle 91 `wam_nsb`-assets tilbage ved enkelte partafvisninger. Et Copernicus-shard kunne tilsvarende kassere eksakte gyldige timer, når én anden bestilt time manglede.

- 4.0.342 beholder collection/modelRun-isolation, same-target/pair-superset/no-new-lineage-promotion, terminal fallback med egen modelRun og faseatomisk qualityrefresh af komplet WAM.
- Efter fuldt, uafbrudt assetgennemløb kan komplette exact-asset-provenancebundne `(partId, nativeValidTime)`-tuples bevares. Rejected slices skal være bit-for-bit uændrede; komplet anden gammel lineage på samme native tid eller global asset-/tidsakse-/control-plane-fejl afviser hele stagen.
- Privat WAM må bevare sikre tuples, men en delvis time er ikke locked/history-complete. Genuine cold-starts `HISTORY_INCOMPLETE` og udsatte historiknetværk ændres ikke.
- Copernicus må checkpoint'e returnerede exact native U/V-par fra et strukturelt validt shard og sende kun manglende par videre. Tidsinterpolation/hold er forbudt; malformed/non-hourly/duplikeret tidsakse og out-of-request-rækker er fatale.
- Final closure er uændret: current 79.414/79.414; bølger 79.060 native WAM plus Feggesund 354/354; nul missing/overlap og nul uløste lineage-konflikter. Partial progression er ikke handoff eller launchbevis.
- Samlet WAM er grøn `63/63`, WAM-historik `35/35` og checkpoint `21/21`; de tre Copernicus-måltests, Python compile og code diff-check er også grønne. 4.0.342 mangler fortsat privacy-/releasepakningskontrol, exact-head-CI og main-/produktionsbevis og er derfor ikke release- eller runtime-GO.

Næste sikre rækkefølge er samlet målverifikation, versions-/RDKS-/håndbogslukning, én exact-head sourcegate, sikker merge, én kontrolleret main-writer, begge komplette closures, fulde post-data-gates, runbundet handoff og offentlig modelverifikation. Normalworkflow og watchdog/shadow-dispatch forbliver deaktiveret gennem sekvensen. DEC-0124 er den bindende detaljekontrakt; ældre checkpoints nedenfor er historik.

# NYESTE CHECKPOINT – 2026-09-10 – lokal 4.0.341 WAM-kandidat, ikke releaseverificeret

Main er nu `b41ed5b64ac0ca3e89ab72d16afbdcbe7d474fc7`/4.0.340. Oven på den er en 4.0.341-kandidat implementeret lokalt for den fejl, hvor en delvist behandlet WAM-modelkørsel kunne gøre den aktive, brugbare bølgecache dårligere. Candidate G er fortsat den dokumenterede offentlige model; 4.0.341 er hverken committed, CI-valideret, merged, kørt mod leverandører eller produktionsverificeret.

- Den aktive cache er vedvarende og nulstilles ikke. Hver collection/modelRun behandles i en isoleret kandidat. Et asset kan kun indgå efter fuld validering af en ikke-tom forventet mængde; ufuldstændige kandidater, budgetstop og afbrydelser må ikke flytte `processedSteps`, run-identitet eller aktiv WAM-state.
- Reelle huller og ny hale behandles straks. Når den aktive WAM-dækning allerede er komplet, samles kvalitetsopgraderinger gennem hele den uafbrudte primærfase og vurderes én gang ved faseafslutning. Det fjerner dyr WAM-slutberegning efter hvert kvalitetsasset uden at forsinke en reel hulrettelse.
- En ældre modelkørsel må højst bruges i én terminal fallbackfase, efter at primærfasen reelt er udtømt og aldrig efter budget-/interruptstop. Hvert asset beholder egen collection, modelRun og provenance; interpolation må fortsat ikke krydse modelkørsler.
- Den operationelle 118-timers bølgeakse er 670 native dele plus Feggesunds tre godkendte direct/proxy-dele: `(670 + 3) × 118 = 79.414`. Currentkæden bruger fortsat DMI → Copernicus → Open-Meteo på den eksakte rest. Ældre strukturelt valide data bruges, mens de stadig dækker timen; ny kvalitet erstatter først efter fuld validering. Op til 48 timers verificeret historik bevares rådgivende.
- Lokalt er WAM-integration 52/52 og bootstrap 35/35 grøn, og den importerede bootstrap-runtime er nu med i den private runtimeattestation. Dette er kun lokal test. Normal vejrkørsel og watchdog skal forblive deaktiveret, indtil 4.0.341 har samlet exact-head-bevis, sikker merge og kontrolleret main-runtime.

Næste rækkefølge er versions-/RDKS-lukning, målrettet slutkontrol, én exact-head sourcegate, sikker merge, kontrolleret cache-/WAM-opfyldning og derefter de fulde launchgates for den integrerede scoremodel. Efter launch revideres de udskudte cachetransport-, cron-/tidsbudget-, kontinuitets- og flerpakkeopgaver mod den nye faktiske drift. Historiske checkpoints nedenfor bevares som revisionsspor.

# NYESTE CHECKPOINT – 2026-09-10 – anden exact-head-CI afgrænset til forældet handoff-test

Head `f44b7c9cb55bb89c5a15daed61d2c2b2996b1d2e` bestod bindingspreflight, den fulde releasegate og de nye plan-/provider-/closurekontroller i sourcegate `34420641243`. Kørslens første og eneste observerede stop kom derefter i `test-verified-weather-source-handoff.mjs`, som stadig krævede navnet på et fjernet Copernicus-trin.

Det gamle trin slettede source-stage. Den godkendte donorbankkontrakt har med vilje erstattet det med `Preserve original Copernicus admission evidence before production rebase`, så gyldigt originalbevis bevares til kontrolleret migration. Test-only-rettelsen følger den faktiske kontrakt, afviser eksplicit sletning og kontrollerer nu også handoff-værnet på de nye donorbank- og plantrin. Den isolerede test og alle 14 efterfølgende workflowtests er grønne lokalt. Ingen produktionskode, workflow, migration, cache eller geodata er ændret i denne opfølgning.

Næste trin er kort dokument-/RDKS-kontrol, ny exact-head-commit og én nødvendig exact-head-CI. Det fejlede run genstartes ikke; merge, backend, komplet main-handoff, post-data-gates og modelcutover afventer fortsat et samlet grønt bevis.

# HISTORISK CHECKPOINT – 2026-09-10 – første exact-head-CI afgrænset til forældet test

Head `e459b826e3fae296ca8074f9a9efeadb8a7f663d` bestod bindingspreflight og den fulde releasegate, men sourcegate `34417094732` stoppede senere i `test-copernicus-target-registry-4.0.244.py`. Tre uafhængige gennemgange og lokal reproduktion viser, at fixturet stadig forventede den nu erstattede regel: nyere `PROCESSED` metadata skulle kassere en ældre, faktisk attesteret cachetuple. Det strider mod den godkendte atomiske kontrakt, hvor gammel gyldig tuple+proof består, indtil en nyere tuple faktisk er materialiseret og attesteret.

Kun testen er rettet lokalt. Den beviser nu både, at metadata alene ikke sletter den gamle vinder, og at et gammelt retained proof afvises, når cachetuple og attestation faktisk er skiftet til den nyere kilde. Target-registry-testen og DMI-provenienstesten er grønne. Ingen produktionskode, migration, binding, workflow, cache eller geodata er ændret i opfølgningen. Næste trin er dokument-/diffkontrol, en ny samlet head og ny exact-head-CI; det fejlede run genstartes ikke.

# HISTORISK CHECKPOINT – 2026-09-10 – lokale måltests bestået, CI og drift afventer

Den samlede vejrlivscyklusrettelse og den eksisterende 4.0.340 WAM-/bindingspakke er lokalt målverificeret. Se `docs/ai/WEATHER_LIFECYCLE_TEST_EVIDENCE_2026-09-10.md` fra repositoryroden for faktiske resultater og de to testfixture-rettelser. Plan/DMI/checkpoint/WAM, CP-/OM-donorbanker, recovery, runner/checker/closure, workflows og privat runtimepakke er grønne. Modelbindingens otte forbrugere er konsistente; dette Python-/workflowdelta kræver ikke nye SQL-/modelhashes. Runtimeproducentens pakkehash beregnes derimod på den endelige kode.

Ingen ny head er endnu committed/pushet, CI-valideret, merged eller produktionsverificeret ved dette checkpoint. Main er senest b0ca7f5d/4.0.339; Candidate G er senest verificerede offentlige model. Gammelt run34398417483 forbliver annulleret. Næste trin er samlet pakke, én ny exact-head-CI og derefter kontrolleret faktisk cache-/launchverifikation efter AUTONOMOUS_WEATHER_LAUNCH_PLAN_2026-09-10. Ejer har godkendt Sol Ultra, autonom fortsættelse og launchovervågning; testpausen nedenfor er historik. Udskudte opgaver revideres mod de nye faktiske resultater.

GitHub-cacheinventaret viser47 poster,10.166.365.283 byte, heraf9.742.641.482 rå GRIB-byte. Read-only limit-endpoints svarer HTTP402; den faktiske konfigurerede grænse er derfor ikke verificeret. Ingen betaling, cache eller kvoteindstilling er ændret. Inventar er ikke bevis for cacheindhold eller kvoteoverskridelse. Kapacitet og restore/save måles før gentagen tung drift.

# HISTORISK CHECKPOINT – 2026-09-10 – samlet lokal rettelse og afsluttende review

Se `docs/ai/WEATHER_LIFECYCLE_IMPLEMENTATION_CHECKPOINT_2026-09-10.md` fra repositoryroden og analyseafsnit 7 i `docs/ai/WEATHER_COLLECTION_SYSTEM_REVIEW_2026-09-09.md`. Fælles hulplan, vedvarende CP/OM-reserver, DMI-checkpoint/cold-start og normal/oneoff/quality-integration er skrevet lokalt. Ingen nye tests, compile, CI, providerkald eller produktion er udført.

**Afsluttende review:** Originalmanifest og vedvarende konfliktmasker er nu implementeret i begge nye banker. Uafhængigt review har lukket CP's bankpointer-crashvindue og OM's manglende in-memory-recovery i henteplanen. Ingen yderligere konkret P0/P1 fundet i disse reviewede grene; dette er IKKE funktionelt bevis. En ny lokal antagelse om obligatorisk parent-strøm blev afvist mod PART-forbrugerne, den reelle gate og de kendte 12 geografiske parenthuller. Parent-only current må ikke gøre et asset kritisk eller genåbne en færdig behandling. Krav til alle 673 kystdele består.

PR#274/c4043bf7 og de otte anvendte migrationer bevares. Main er senest b0ca7f5d/4.0.339, gate34398417483 cancelled, seneste oneoff535rest+WAM MISSING_HOUR, integreret model ikke online. Endelig producerbinding, måltests og faktisk driftstid/hukommelse/komplethed er stadig uverificeret. CP-bankvækst under 1GiB og bæredygtig normaldrift er åbne målepunkter, ikke lukkede løfter.

**Ny ejerordre 2026-09-10:** De lokale måltests er godkendt; den midlertidige lokale testpause er ophævet. Ejeren har samtidig bestilt autonom fortsættelse gennem stabil fuld cache, ny scoremodel online, efterfølgende driftskontrol og udskudte opgaver. Se `docs/ai/AUTONOMOUS_WEATHER_LAUNCH_PLAN_2026-09-10.md` fra repositoryroden. Den eksisterende 4.0.340 WAM-/bindingsrettelse skal med. Den gamle annullerede gate må ikke genstartes; ny færdig exact-head-CI og sikker release følger gældende autoritet og nødvendigt bevis. Modellen anbefales til Sol Ultra før hovedarbejdet. Spørg ikke igen om allerede godkendte lokale tests; ældre pauseafsnit nedenfor er historik.

# AKTUELT CHECKPOINT – 2026-09-09 – samlet vejrlivscyklusrettelse, IKKE releaseklar

Ejeren har efter computerfrysningen udtrykkeligt bestilt grundig analyse og samlet rettelse med kvalitet først. Se `docs/ai/WEATHER_COLLECTION_SYSTEM_REVIEW_2026-09-09.md` fra repositoryroden: analysen og den fulde løsningskontrakt er gemt, og lokal implementation er igangsat. Ældre GO-/kørselsstatus nedenfor er historik.

- Bevar PR #274/head `c4043bf7f0ae0e9ed147263bb49cce3cd5fc7abc` og hele 4.0.340 WAM-/bindingspakken. Main er fortsat `b0ca7f5d`/4.0.339; den integrerede model er ikke dokumenteret online.
- Kildegate `34398417483` er completed/cancelled. Ejerens stop består: ingen nye/genstartede tests, push der starter CI, workflowdispatch, merge eller deploy. Ingen tests er kørt i dette nye implementeringsafsnit. Skrevne tests er ikke grøn evidens.
- Seneste oneoff `34387410217`: alle provider-saves lykkedes, men535 strømrester og WAM `MISSING_HOUR`; intet handoff. Forrige run manglede324. Mindst124 tidligere dækkede overlappar er nu manglende; konkret per-pair-årsag er ikke målt. DMI forbedredes39511→42926/79414; stor egenrest er ikke alene bevis for forkert DMI-klassifikation.
- Verificerede systemfund: OM-reserver filtreres af dagens rest; CP-positive records kan miste kortlivet kildebevis; DMI/CP planlægger ikke ud fra hele kildeunionen; gentaget DMI-checkpointarbejde fylder cirka23min af hvert48min-trin; seneste cold-start hentede48h-WAM-historik før operationel indsamling; OM gentager uproduktive splits/indholdsfejl.
- Aftalen er ALLE reelle huller inklusive hale før kvalitet. Ved komplet dækning: DMI skal overtage mest muligt, dernæst CP, sidst OM. Bevar gammel gyldig tuple+proof til ny fuldt valideret atomisk erstatning. Ingen særregel om gammel rest før hale.
- Implementation deles i DMI/checkpoint/cold-start, CP-positiv donorbank og OM-donorbank/fejlstyret retry. Root ejer fælles acquisition-plan, workflowkoblinger og RDKS. Der må ikke efterlades to forskellige normal-/oneoffalgoritmer. Nye banker må ikke halvt promoveres eller nulstille eksisterende data.
- Aktuel common planningkontrakt: `scripts/lib/weather_acquisition_plan.py`; plan er kun arbejdsprioritet, aldrig positiv kildeadgang. Provider-/publicclosure forbliver selvstændig. Komplet integration, autoriseret validering, bindingsgenbygning, faktisk535-rest og WAM-livebevis er fortsat åbne.
- Ingen blind gentagelse af små normalruns på gammel main; de bruger samme retentionfejl. Efter senere launch består shadow-transport/egress,48h-historik og bæredygtig ekstern cron. Ingen cache er ændret af analysen/lokal programmering.
- Anbefalet indsats i dette kritiske tværgående afsnit: Ultra. En ny session skal fortsætte implementation/integration ud fra rapporten, ikke begynde helikopteranalysen forfra eller genstarte gaten.

# NYESTE CHECKPOINT – 2026-09-09 – Astra samler 4.0.340 før tredje CI

PR #274 på branch `codex/wam-same-run-resolution-4.0.340` er endnu ikke mergeklar. CI `34391930353` på `8f752334` fandt stale genererede modelbundles; `34393986579` på `2c71ac0f` fandt derefter usynkroniserede SQL-/profil-/Edge-/releasebindinger. Det var mangelfuld releaseforberedelse, og de tidligere korte WAM-tests var utilstrækkelige som samlet pakkecheck.

Astra-reviewet har rettet en konkret yderligere JS/Python-forskel: en alternativ WAM-serie må kun vælges efter kontrol af den fulde bølgetuple og retningen. Nærmeste endepunkter vælges pr. serie; eksakte rækker, firetimerloft og eksisterende delvise input bevares. Python 35/35, producentintegration 24/24 og de korte runtime-/adaptertests er grønne.

Ny migration `20260909194000_wam_same_run_resolution_binding.sql` fremfører alene integrated-/rollback-/continuation-hashes og checkpoint-readbackversion fra den bytefastlåste, allerede anvendte horizon-migration. De otte gamle migrationer er uændrede. Backendplanen understøtter otte applied/kun niende pending og alle øvrige gyldige prefixes. Alle bindingsforbrugere og installationskopier er synkroniseret. De tidligere fejlede måltests samt readiness/installations-/CASE-/migrationstests er nu grønne. Kildekontrollen starter fremover med fem eksisterende hurtige bindingskontroller før de tunge fixtures; fuld gate består fortsat.

Main er fortsat `b0ca7f5d`. Backendbeviset på 4.0.339 gælder ikke de nye hashes; efter merge kræves et nyt backendrun samt en komplet 4.0.340-oneoff på samme main. De kan køre parallelt. Oneoff `34387410217` fortsætter imens cachearbejdet; main flyttes først efter dens provider-saves. Ingen cache nulstilles. Candidate G er fortsat offentlig.

Se `docs/ai/RELEASE_4_0_340_ASTRA_REVIEW_2026-09-09.md` for samlet scope, fund, test og næste trin. Dokumentations-only status efter CI må gemmes lokalt uden at starte endnu en gate. Astra er nødvendig til dette samlede review; Sol/Ekstra høj er næste model, når pakken er verificeret og pushet.

# NYESTE CHECKPOINT – 2026-09-09 – lokal 4.0.340 retter WAM-seam uden at blande modelkørsler

Backend `34371639398` forsøg 2 er terminalt grøn på merged main `b0ca7f5d`. Oneoff `34371642565` gemte DMI-, Copernicus- og Open-Meteo-progress, men stoppede før handoff: Open-Meteo fyldte 2.057/2.381 aktuelle restpar (1.787 genbrugte, 270 hentede), efterlod 324 og ramte 15-minuttersbudgettet uden global leverandørfejl. WAM-inspektøren stoppede separat med `MIXED_RUN_INTERPOLATION`. Candidate G er fortsat offentlig.

Rodårsagen er bevist som en kontraktforskel, ikke tabt cache: producentens `resolved_native_wave_hours` grupperer efter samme collection/modelkørsel/gitter/celle og kan finde en sikker bracket, mens både Python-slutvalidatoren og JavaScript Forecast Store hidtil kun prøvede de to tidsmæssigt nærmeste rækker. En eksakt nyere række kunne derfor skjule en bredere, men stadig højst fire timer lang, sikker bracket fra den foregående modelkørsel.

Lokal 4.0.340 bruger samme afgrænsede valg i begge consumers. Eksakt række vinder fortsat; alternativ interpolation kræver identisk native serie og vælger deterministisk smalleste bracket, derefter nyeste kausale modelkørsel. Ingen cross-run/cell/collection-interpolation tillades, og bølgers firetimersloft kan ikke udvides af cadence-input. Python 34/34, producentintegration 24/24, Forecast Store, handoff-target og RavScore-produktionsadapter er grønne. Se `WAM_SAME_RUN_RESOLUTION_REVIEW_2026-09-09.md`.

DEC-0122's allerede ejerautoriserede snævre first-cutover-binding er flyttet til exact-release 4.0.340. Oneoff `34387410217` fortsætter på den bevarede 4.0.339-main-cache; main må ikke flyttes før dens afsluttende cache-saves. Dens eventuelle gamle-head-handoff kan ikke bruges til 4.0.340-cutover, men alle kildecacher kan genvalideres og genbruges. Næste rækkefølge: færdiggør releasehukommelse og måltests, commit/push, én exact-head sourcegate, merge efter cache-save, ny eksakt main-oneoff, fulde post-data-gates og offentlig modelverifikation. Sol / Ekstra høj er passende.

# NYESTE CHECKPOINT – 2026-09-09 – 4.0.339 retter den stoppede backendmigration

4.0.338 bestod exact-head-kildegaten `34348151097` på `2bddb2db` og blev merged via PR #272 som `208e878453d6d8a21b8ce879eac050d664c50c40`. Backendrun `34350871769` bestod parser, migrationsliste, dry-run, eksakt otte-filsplan, `--skip-vault` og sidste main-CAS. Migration 1–3 blev anvendt og registreret. Migration 4 stoppede på PostgreSQL `SQLSTATE 42601`, statement 9, og dens egen transaktion rullede helt tilbage; migration 5–8 samt D1, Edge, Worker, maintenance, synchronization, public mode og protected readiness blev ikke kørt. Vault blev ikke ændret.

Rodårsagen er den samme ugyldige PL/pgSQL-form i fem endnu ikke anvendte migrationer, schemaet og installationskopien: `IS DISTINCT FROM CASE ... END`. 4.0.339 omslutter alene `CASE`-udtrykket med parenteser i alle syv kanoniske kopier. En ny regressionstest afviser den oprindelige form og kræver identiske rettede kopier. Hele det resterende migrationssuffix 4–8 er desuden kørt i rækkefølge på isoleret PostgreSQL 16 uden syntaksfejl; måltests for partial recovery, installer, readiness, releasepolicy og workflows er grønne.

PR #273, head `a3786e6d`, nåede sourcegate `34362702197`, som stoppede på den gamle immutable per-pair-migrationshash. Det var en manglende opdatering af testens reference til den godkendte pending-SQL-rettelse, ikke en ny observeret databasefejl. Referencekontrollen er nu lokalt rettet: den nye fil er fastlåst, og fjernelse af netop de to parenteser skal reproducere den gamle SHA. Hele migrations-testgruppen og den afgrænsede CASE-test er grønne. CASE-testen undersøger kun validatorfunktionen, ikke håndbogstekst eller anden SQL.

Ejeren har udtrykkeligt godkendt, at DEC-0122's uændrede one-shot first-cutover-undtagelse om nødvendigt må flyttes til 4.0.340 eller senere launchrettelser uden ny forespørgsel. Den aktuelle kandidat forbliver 4.0.339; ingen ekstra version er nødvendig alene pga. testrettelsen. Hver overførsel skal dokumenteres og fortsat bindes til én eksakt release og main-head, højst 50 MB archive samt alle integritets-, privacy-, readback-, storage-, checkpoint-, closure- og releasekrav. Ingen generel kadenceundtagelse. Candidate G er fortsat offentlig.

Den [ekstra Astra-helkædekontrol](LAUNCH_CHAIN_ASTRA_REVIEW_2026-09-09.md) er afsluttet. SQL-funktionen er også kaldt positivt/negativt i isoleret PostgreSQL 16.4. Weather `34350872447` er terminalt fejlet med alle provider-saves grønne: OM required 6.004, filled 5.703, retained 5.166, fetched 537, missing 301; WAM MISSING_HOUR. Beregnet samlet 79.113/79.414 er ikke en slutattesteret closure. Ingen defekt codec er bevist. De unikke rester skal afklares; gentagne afstands-/værdiafvisninger gør mere OM-tid alene til en ubevist løsning.

Næste rækkefølge: push samlet 4.0.339-PR, én sourcegate på nyt eksakt head, sikker merge (aktive saves er nu afsluttet), backendgenoptagelse fra migration 4 og målrettet vejrfuldførelse på samme nye head med bevarede cacher. Backend og vejrarbejde kan køre parallelt, men begge beviser kræves før cutover. Handoff bevarer producentens reference; 90/150-minuttersmål er advarsler inden for gyldigt vindue. Kræv 79.414/79.414, WAM/Feggesund 354/354 og fulde produktions-/publicgates. Efter launch: straks tabsfri cachetransport og kildeattesteret 48h-OM-historik, før normal cron/watchdog erklæres bæredygtig. Astra-delen er afsluttet; Sol / Ekstra høj er næste anbefalede model til release, runtime og den afgrænsede restdiagnose.

# NYESTE CHECKPOINT – 2026-09-09 – 4.0.338 lokal Supabase-parserrettelse, ingen backendwrites

4.0.337 bestod exact-head-kildegaten `34325630686` på `aa78d75f` og blev merged via PR #271 som `af03659a`. Main-oneoff `34333689292` kører fortsat på denne mergecommit. Den sikre cachematerialisering og DMI-progress-save bestod; Copernicus-fyldningen sluttede grønt, begge Copernicus-cacher blev gemt, og Open-Meteo startede kl. 11:31Z. Runnet er endnu ikke terminalt og beviser derfor ikke komplet vejr, handoff eller modelcutover.

Backendrun `34333553305` stoppede fail-closed i begge forsøg før første eksterne write. Forsøg 1 nåede den read-only linkkontrol og fik PostgreSQL `SQLSTATE 28P01`; ejeren rettede `SUPABASE_DB_PASSWORD` kl. 09:54Z uden at dele værdien. Forsøg 2 bestod autentificeringen og den read-only migrationsliste, men Supabase CLI 2.117.0 gengav tabelceller med omsluttende backticks, som den hidtidige eksakte parser afviste under lokal historikhydrering. Dry-run, migrationsapply, database-/D1-/Edge-led, protected readiness og alle offentlige skriverier blev sprunget over. Der er ingen DB-, D1-, Edge- eller public-mutation fra de to fejl.

Den lokale, versionssatte 4.0.338-kandidat fastlåser Supabase CLI til præcis 2.117.0 og accepterer kun en hel celle med ét balanceret backtickpar, hvorefter migrationsversionen fortsat skal matche den eksakte versionsregex. Tabellen skal have præcis tre kolonner og én genkendt Local/Remote/Time-header, hvor tidskolonnen må være `Time` eller `Time (UTC)`; tvetydige local/remote-par, dubletter, kronologisk rækkefølge, den eksplicitte no-write-markør og dry-runnens præcise filnavne afvises fortsat fail-closed. Begge `db push`-kald bruger `--skip-vault`. DEC-0122-undtagelsen er flyttet snævert til exact-release 4.0.338 og bindes fail-closed til `package.json`, så et 4.0.337-handoff afvises og 4.0.339 ikke arver den. Parser-, workflow- og versionsbindingen er måltestet lokalt; commit, exact-head-CI, merge, ny backendkørsel og live-readback mangler.

Efter launch forbliver fire forhold samlet P0-opfølgning: readiness-versionintervallet kan lade 4.0.337 attestere sig selv og skal snævres, den gamle ventende runpost `34228112413` skal afklares uden at afbryde aktivt cachearbejde, cachetransporten skal migreres i shadow uden nulstilling, og normal cron/watchdog skal forblive holdt indtil transport-/budgetbevis. Den monolitiske testkæde skal samtidig opdeles i tidligere målrettede risikolanes, så semantiske fejl findes før de lange kontroller.

Næste rækkefølge: afslut versions- og RDKS-synk samt én exact-head GitHub-kildegate; merge kun den eksakte grønne head; genkør derefter backend og kræv hele migrations-/D1-/Edge-/readiness-kæden grøn. Oneoff følges uafhængigt. Den integrerede model er ikke online, før komplet runbundet vejr, backendreadiness, fulde post-data-gates, artifact/deploy og offentlig verifikation faktisk består. Anbefalet model/indsats til integration og runtime er Sol / Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-09 – 4.0.337 lokalt samlet, launchundtagelse afgrænset

DEC-0122 er nu implementeret som én samlet cache-/cutoverpakke på releasegrenen. DMI-dependencies er fastlåst, kompatible 2.48.0/2.48.2-proofs kan genbruges granulært, komponenter donorbackfilles atomisk, og alle kendte produktionslæsere, inklusive oneoff-progresskontrollen, bruger den fælles tabsfri tre-tabellers codec. Read-only job `34288231609` beviser den eksakte codec på 760.487.472 byte/578.063 sourceposter til 94.150.151 byte med identisk logisk indhold, uændret input og Node-readback. Den separate historiske Open-Meteo-overlapprobe fejlede fortsat og er ikke codec- eller main-runtimebevis.

Den afsluttende helkædekontrol fandt derefter en pre-normalization legacy-blocker: de strenge 256 MiB-readers kunne afvise den bevarede 760 MB legacyfil, før den nye codec kunne materialisere den kompakt. En særskilt bounded helper skriver nu atomisk til et andet output og genlæser dette under det normale loft; pilot, normal vedligeholdelse, oneoff og conditional point activation bruger outputtet før første DMI-reader. Kildefilen bevares ved enhver fejl, og en overstor allerede kodet wrapper kan ikke bruge legacy-undtagelsen.

Ejeren godkendte 2026-09-09 en snæver undtagelse for første cutover: én eksakt succesfuld komplet main-oneoff må bruges som launchinput ved privat archive højst 50.000.000 bytes, to generationer inden for lagerbudget og fortsatte integritets-, privacy- og readbackgates. Undtagelsen godkender ikke hyppig automatisk drift. Legacy first cutover kræver nu netop dette runbundne handoff.

Permanent åben P0-driftsopgave: byg cachetransporten ved siden af den eksisterende cache, skyggeverificér logisk indhold/checksums, skift pegepind atomisk og behold rollbackgeneration. Ingen cache må nulstilles. Normal højfrekvent cron/watchdog forbliver deaktiveret, indtil transporten og den reelle kadence holder budgettet. Candidate G er fortsat offentlig. Basecommit `bce970af` er pushet på releasegrenen; de afsluttende legacy-normaliserings-, gate-, test- og dokumentationsændringer er lokale og endnu ikke samlet sourcegated, committed/pushet, merged, runtimebevist eller deployet.

# NYESTE CHECKPOINT – 2026-09-08 – ekstra Astra-audit: rettelsesplan udvidet, produktion uændret

[Den ekstra Astra-helhedsgennemgang](WEATHER_FULL_CHAIN_REVIEW_2026-09-08.md) supersederer den tidligere implementeringsplan nedenfor. Main er senest verificeret som 4.0.336 `bf471981`; Candidate G er senest verificerede offentlige model. Audit er afsluttet, men .337 er IKKE implementeret, sourcegated eller releaseklar. Eksisterende untracked codec-/compatibilityudkast er bevaret; codecudkastet er konkret NO-GO, ikke en færdig tabsfri implementation. Ingen nye GitHub-runs, providerkald, cachewrites, merge eller deploy under denne ekstra audit.

Nye verificerede forhold: én ugyldig currentrække kan fjerne alle retained proofs; samme asset/gammel+ny decoder har en proofkonfliktvej; faktisk production recovery er ikke RAM-bevist; codecudkastet har fem reproducerede integritets-/valideringsfejl; normal handoff mangler samlet bootstrap/WAM/statevej; Fase A kan genindføre 48h-historikblokering; privat archive har forkert DMI-inputbinding, stram kodehash/72h-restore og et uløst transportbudget. Oneoff er desuden legacybundet efter launch. Se auditens skelnen mellem bevist adfærd, betingede risici og umålte liveforhold.

Næste model: Sol / Ekstra høj. Før release: korrigér den samlede plan, mål rigtig privat payload og forklar/registrér den foreslåede snævre DEC-0114-ændring før implementering. Genattestér om muligt seneste caches eksisterende værdier fra originale arkivproofs før større donorunion. Kræv målrettede kontrakttests og én produktionstor isoleret I/O-/recoveryprøve, ikke flere blinde vejrhentninger. DMI→Open-Meteo-overlap er endnu IKKE bevist: de to senere diagnoseforsøg fejlede ved checkpointvalidering. Ingen nearest-policyændring eller launchløfte. Bevar alle cacher og den isolerede diagnoseworktree.

# HISTORISK AUDITCHECKPOINT – 2026-09-08 – første Astra-genbrugsanalyse

Astra-rodårsag og helkædeaudit er afsluttet; se [det samlede bevis og næste trin](WEATHER_CACHE_ASTRA_AUDIT_2026-09-08.md). Main er 4.0.336 `bf471981`, exact-head-grøn via PR #270; ingen .337-produktionsrettelse er implementeret. Automatisk native ecCodes-opgradering gjorde kompatible gamle proofs utilgængelige; dataene findes stadig. Read-only `34261357677` og `34262628767` er grønne: 62.865 par kan genvalideres i 16 UTC-vinduet, og cacheindholdet kan tabsfrit lagres på 94,15MB i stedet for 760,49MB. Ingen inputcache er ændret.

Næste model er Sol / Ekstra høj. Først mål recovered-DMI-overlap med de 1.891 OM-rester; ingen ny nearest-policy før dette. Implementér pinning, snæver retained-kompatibilitet, partial-donor-union, fælles tabsfri I/O og normal-WAM-binding samlet. Privat transport/kapacitet er særskilt reel blokker: kodet DMI alene er 17,09MB gzip, så fuld månedlig restorepolitik passer ikke automatisk i eksisterende budget. Ingen launchgaranti, ny vejrkørsel eller gatebypass. Candidate G er offentlig. Diagnosegrenen `.tmp-weather-forensic` / `codex/weather-cache-forensic` må aldrig merges; bevar alle cacher/tempdata.

# NYESTE CHECKPOINT – 2026-09-08 – efter Windows-genstart og Astra-helkædeaudit

- **Efter auditen:** Fundene er nu samlet implementeret og måltestet som lokal 4.0.335. Granulær WAM-salvage, atomisk tuple-admission, exact-proof genbrug, operationel exact multi-run-kontinuitet, Feggesunds separate proxy-scope og sen fail-closed WAM-gate er på plads.
- **Lokal evidens:** Python-syntaks, 32 validator-tests, 24 producent-/resume-tests samt workflowinventar og integreret workflowadapter er grønne. Det er ikke exact-head-, provider- eller produktionsbevis.
- **Næste:** commit/push → én GitHub sourcegate på eksakt head → merge → corrected main-oneoff på bevarede cacher → komplet vejr/Feggesund → fulde gates og modelcutover. Candidate G er offentlig; workflows er fortsat deaktiveret.

- Læs [WAM-helkædeaudit og næste sikre trin](WAM_CHAIN_AUDIT_2026-09-08.md). Dens oprindelige “analyseret, ikke implementeret”-status er historisk og erstattet af 4.0.335-statussen ovenfor.
- 4.0.334 er exact-head-verificeret i `34187779106` og merged via PR #267 som `836e23ec207e56b6ed275b66f9758dcd311bbe7b`. Nedenstående lokal/uncommitted-status er historisk.
- Main-oneoff `34189720294` bestod sourcegaten og gemte GRIB-, kandidat- og regionalcache, men fejlede WAM før Copernicus/Open-Meteo. Gemte bytes er ikke komplet vejrbevis. Candidate G er fortsat senest verificerede offentlige model.
- Den tidligere P2-only-vurdering af proxy/native-konflikten og ubetinget WAM-stepgenbrug er supersederet af de konkrete helkædefund. All-target-afvisning, falsk parsercooldown, tuplebevarelse, granulær legacy-salvage, genoptagelse og gateplacering skal håndteres samlet før blind genkørsel.
- Normalworkflow og watchdog er midlertidigt deaktiveret og skal genaktiveres/observeres efter kontrolleret cutover. Næste model: Sol / Ekstra høj efter ejerens ønskede afslutning af Astra-analysen.

# HISTORISK CHECKPOINT – 2026-09-08 – 4.0.334 lokal WAM-readiness-kandidat

- Offentlig sandhed er fortsat 4.0.316 / Candidate G. 4.0.334 er lokal og måltestet, men endnu ikke committed, exact-head-CI-testet, merged, main-runtime-testet, fuldt releasevalideret, deployet eller cuttet over.
- Oneoff `34161930631` beviste 79.414/79.414 operationelle strømpar (61.860 DMI, 16.593 Copernicus, 944 regional, 17 Open-Meteo, 0 missing), men stoppede korrekt på Feggesund 3 × 118. Closure må ikke forveksles med samlet artifact-/release-readiness.
- Den lokale løsning giver fair runtime til begge WAM-familier, bounded eksakt bridge på højst fire inklusive timer, source-attesteret cold-start-rebase ved ældre Candidate G-target, eksakt 118-timersakse med `MISSING`, atomiske tuples, hashbundet Feggesund-proof og konkret runbundet første cutover.
- Næste gyldige vej er version/commit → exact-head `validate:source` → merge/main-oneoff → 354/354 og runtimeproof → fuld validate/releasegate → deploy/Phase B/offentlig cutover. Ingen gate må omgås.
- Normale kørsler er den permanente cachevedligeholder efter reaktivering; oneoff er accelerator. Ekstern cron er primær dispatch og GitHub schedule reserve.
- De to åbne P2-effektivitetsforhold (proxy ikke krediteret som native WAM; live ForecastEDR-budget kan ikke sættes helt til nul) er ikke dokumenterede correctness- eller releaseblockere.

# NYESTE CHECKPOINT – 2026-09-07 – 4.0.333 exact-residual før modelcutover

- 4.0.332 er sourcegate-grøn (`34125927405`, `f23f306b…`) og merged via PR #265 (`1e1093de…`). Main-oneoff `34127986853` genbrugte cachen, men sluttede 79.132/79.414: DMI 65.409, Copernicus +12.661, regionalled og Open-Meteo efterlod 282. Open-Meteo required 472 / retained 76 / fetched 114 / filled 190. Ingen artifact/deploy/cutover.
- Lokal 4.0.333 fjerner en identificeret under-batch-risiko: checkpoint succespar straks; requeue kun exact unresolved i bounded FIFO/BFS; binært split max to til singleton; tre transportforsøg, ét content-retry, requestcap 1.024, queuecap 2.048, fælles deadline og provider-wide HTTP-cooldown. Det historiske run havde ikke den nye diagnostik og beviser derfor ikke den konkrete payload-/stopårsag; den skal klassificeres i næste main-oneoff.
- HTTP 400/ukendt permanent stopper providerfamilien; kun 413/414 splittes. Retry-After kan være sekunder eller HTTP-date og begrænses til 15 sekunder. Alle stop bevarer ærlig residual, og diagnostik er kun aggregeret/privacy-safe.
- Py_compile, udvidet Open-Meteo, målrettet DMI/Copernicus/regional/closure og live builder/adapter/runtime er grønne; to uafhængige reviews er GO. Dette er lokal releasekandidat, ikke CI-/runtimebevis.
- Uændret afslutning: exact-head sourcegate → merge → main-oneoff → præcis 79.414/79.414 → run-bundet handoff → central hydrering, Feggesund/spatial, kapacitet, fuld validate/releasegate, artifact/deploy og Phase B. Candidate G er offentlig; normal workflow er deaktiveret.

# NYESTE CHECKPOINT – 2026-09-07 – 4.0.332 horizon-validitet uden svækket integritet

- DEC-0119 er bindende: en strukturelt valid future-række bruges uanset acquisition/generation-alder, indtil dens egen verificerede horizon udløber. Eksakt sidste instant er gyldig; `+1 ms` er udløbet. De gamle hårde 72h- og 90/150/240-minutters regler er **SUPERSEDERET** som availability-/deploygates. Alder er warning/emergency/tillid/tur/kalibrering.
- Nyt weather-artifact kræver stadig præcis 79.414/79.414, én kilde pr. par, nul overlap/missing og alle target-/registry-/model-/provenance-/hash-/privacygates. `34083611297` stoppede korrekt ved 78.856/79.414 og 558 missing uden deploy. `34093354004` sluttede sikkert med 112 missing efter faktisk Open-Meteo-fremgang. `34104536681` på eksakt `main` `c2ce63ff` genbrugte DMI-cachen til 67.897/79.414 på 5m24s, fik 8.372 Copernicus-par og efterlod 3.145, men stoppede før første Open-Meteo-request på null-run-source-index-fejlen; Copernicus-fremgang blev gemt uden closure/artifact/deploy.
- Første integrerede cutover kan bruge et exact-run-/head-/attempt-/target-/registry-/hashbundet handoff af fem private sourcecacher fra én grøn komplet `main`-producent. Consumeren genbeviser closure. Central hydrering, sourcegate, bounded `update:weather`, Feggesund/spatial audit, kapacitet, fulde gates, artifact/privacy, Pages og offentlig verifikation består.
- DMI/Copernicus/Open-Meteo salvages per proof-enhed med fail-closed control plane. En DMI-collection med `modelRun=null` går kun videre som nul positiv dækning, når alle rækker er negative og uden sourceAsset; retained old-run-proofs består, mens positive/kildebærende null-run-rækker er fatale. Nyeste verificerede tuple vinder atomisk efter uændret providerorden; fallback låser ikke kilden. Ufuldstændig 48t-historik giver numeriske `HISTORY_INCOMPLETE`-scorer, reason codes og kalibrering fra, ikke availability-stop.
- Normal workflow forbliver deaktiveret under kontrolleret cutover. Candidate G er offentlig. Providertransitioners scorekontinuitet og durable immutable multi-artifact-historik er særskilte post-launch-issues.

# NYESTE CHECKPOINT – 2026-09-07 – 4.0.331 sourcehistorik før vejrstart

- 4.0.330 nåede `main` som `8020cdfe539df0841246714c22705d78927c8bdb`, men er supersederet før nogen 4.0.330-vejrruntime af den snævre 4.0.331-sourceprecondition.
- 118h-oneoff `34077360903` bestod releasegaten inde i `validate:source`, men fejlede derefter i legacy Candidate G-sourceverifikationen, fordi det shallow checkout ikke indeholdt `49dd4cb454656bdf629e5df760176705e38d2cb0^{tree}`. Klassificér dette som pre-weather workflow/source-fejl, ikke provider-, cache- eller databevis.
- Alle trin fra central adminhydrering og første vejrcache-restore til DMI, Copernicus, Open-Meteo, closure, runtime, kapacitet, artifact/deploy og modelcutover blev skipped. Det senere røde `always()`-Open-Meteo-krav er kun en følge af skipped fill. Ingen vejrcachedata blev læst ind, opdateret eller gemt af runnet.
- Lokal 4.0.331 materialiserer og verificerer det fastlåste historiske Candidate G-sourcehead før hvert workflowkald, som kan udføre `validate:source`, uafhængigt af operational action. Det er read-only Git-input og ændrer ikke checkout-head eller runtime. Den fokuserede lokale matrix er grøn; exact-head-CI og runtimebevis mangler.
- 4.0.330's vejrcache-/providerkontrakt består uændret. Normal workflow er fortsat deaktiveret under den kontrollerede genopfyldning. Frisk main-oneoff, 79.414/79.414, Feggesund 354/354, spatial audit, live kapacitet, fulde post-data gates, deploy og særskilt Phase B er fortsat åbne; Candidate G er offentlig.

# NYESTE CHECKPOINT – 2026-09-07 – 4.0.330 helkæde-cachevedligeholdelse

- 4.0.329 er merged på `main` som `b3865eb9`, men komplet positiv vejrruntime er ikke bevist. Candidate G er fortsat offentlig.
- 4.0.330 er en lokal kandidat under fokuseret validering. Dens kontrakt gør critical missing/invalid/expired, interne huller og hale til første kø hos alle providers; gyldige rækker opfriskes bounded bagefter og bevares til atomisk valideret replacement.
- Copernicus isolerer provider-/datafejl pr. shard, fortsætter senere shards, bevarer eksakt bound `IN_PROGRESS` og nul-resultatforsøg, forhindrer stale residualudvidelse og sletter ikke validerede records ved rollover. Primary må kun genbruge eksisterende 48t-historik og må ikke netværkshente den; et kort ikke-deployblokerende postbuild-job ejer history/advisory-refresh gennem separat kandidatvalidering og atomisk promotion.
- Hourly rebase må genbruge et fortsat kryptografisk/domæne/tidsvalidt Baltic-prerequisite i højst fire timer til et overlappende AMM15-par, men kun exact-current-reference-attempt må undertrykke frisk Baltic-retry/postbuild-upgrade. Det forhindrer falsk missing uden at kildelåse fallback.
- Regional optional shadowdata kan isoleres til pair-level missing; centrale targets, registry, DMI-ledger/attestation, policy og gapmatrix forbliver fatal control plane.
- Open-Meteo schema v2 deler durable progress mellem normal/oneoff med per-record `acquiredAt`, target-overlap-rebase, checkpoint før requests og efter batches, breadth-first batches på højst 50, bounded retry og batchisolerede HTTP-/provider-/payloadfejl.
- Proaktiv Open-Meteo-refresh åbner kun ved nul kritisk residual, ældst først og mindst to timers alder. Fejl bevarer den tidligere validerede record. DMI/Baltic/AMM15/regional DMI kan senere erstatte fallback efter normal kildeprioritet.
- Normal og oneoff bruger samme provider-/cache-/closurekontrakt; normal vedligeholder, oneoff accelererer uden deploy. Shared cachewrites kræver exact-main authority. Scheduled Copernicus-pilot fjernes; ekstern cron er primær normal-dispatcher og GitHub-schedule reserve.
- Slutbeviset er fortsat 79.414/79.414, kildeunikhed og nul overlap/missing. De foregående højst 48 timers verificerede historik er rådgivende. Den integrerede scoremodel må først aktiveres efter Feggesund 354/354, spatial audit, live kapacitet, fuld post-data validate/releasegate, artifact/deploy og særskilt Phase B.
- Statusord skal være præcise: lokal kandidat, ikke CI-valideret, merged eller produktionsverificeret. Exact-head, frisk main-runtime og hele modelkæden afventer. Ingen geometri, kystnormal, punkter eller scoreformel ændres.

# NYESTE CHECKPOINT – 2026-09-06 – 4.0.329 DMI-attestationskontinuitet

- 4.0.328 bestod exact-head `34040547841` og blev merged via PR #261 som `31b98428dea163c11ded1fc1e428e27a0218a8f2`. Den første rettede main-kørsel nåede DMI, men ikke Copernicus/Open-Meteo.
- Run `34041885030` gemte DMI-cacheprogression og stoppede på 8.918 faktisk attesterede par mod 9.541 outcome-proof-verificerede, delta 623. Run `34044178502` gemte igen progression og stoppede efter det observerede kanoniske modelrunskift på 22.357 mod 25.826, delta 3.469. Dette er et kontinuitets-/synlighedsproblem, ikke bevis for nulstillede cachebytes.
- Gammel-main `34049794693` og `34051318868` på head `31b9842` nåede DMI/Copernicus, men Open-Meteo fejlede deterministisk med `OPEN_METEO_RESIDUAL_PLAN_INVALID_SHADOW_NATIVE_CADENCE_INVALID` ved `2026-09-06 18:16:28Z` og `18:42:49Z`; artifact/deploy blev korrekt skipped. Producenten skrev en hourly off-phase regional `dkss_lf`-sample, mens consumeren gjorde selected-run `lead % 3 != 0` fatal. Det er negativt regional producer/consumer off-phase-bevis, ikke retained-proof-admission-bevis. Begge paths er lokalt fokustestet; exact-head runtime mangler.
- Rodårsagen er, at nye valgte assets' per-part outcome-proof kunne klassificere et par positivt, mens den faktiske cached række fortsat bar en tidligere modelruns kildeidentitet, som den aktuelle attestation filtrerede fra. Proof-partitionen overclaimede derfor de faktiske attesterede rækker.
- 4.0.329-designet bevarer og genvaliderer et konkret per-pair/source-proof med hver kompatibel genbrugt række på tværs af modelruns. Processing-signaturen skal være kompatibel, og native source-lead må højst være 120 timer. Kun faktiske cached rækker med gyldigt aktuelt eller bevaret kildebevis kan indgå i den positive DMI-attestation; et nyt assets generelle spatial-proof kan ikke overtage ejerskab af en gammel række.
- Fallbackresten er altid den eksakte inverse af den faktiske kanoniske attestation i alle 79.414 registrybundne par. Ingen antal-, procent- eller minimumsdækningstærskel må blokere Copernicus, regional DMI eller Open-Meteo. Resten kan være lille eller stor.
- Active-donoren valideres ved donorledgerens egen `productionReferenceAt` og eksakte +117-vindue. Interne huller, missing/expired og hale prioriteres før retained refresh. En revideret officiel asset i samme modelrun ophæver den gamle revisions dækning; ny currenttuple vinder først efter atomisk asset-, outcome- og provenancebevis.
- Den absolutte whole-row-donorregel er supersederet. Kun exact-proof-gated U+V+`sources.current` merges atomisk; primary-proof vinder, og halv/uattesteret donor afvises. Wave, wind, øvrige felter/kilder og `processedSteps` bevares. Complete donor-current-summary erstatter; ellers bevares complete same-grid primary-summary, og kun partial/mismatch current-summary fjernes.
- DEC-0117's selected-run off-phase blanket-fatal-regel er scoped supersederet. Producer skriver ikke canonical off-phase regional sample. Consumer validerer dict + exact collection/modelRun/validTime + `run <= validTime`, ignorerer derefter canonical off-phase før capturedAt/hash/sampleKey/spatial/vector og sender exact pair som `MISSING` til Open-Meteo. Ingen physical prune. Malformed identity og alle on-phase proofs forbliver fatal.
- `RETAIN_PREFERRED_NATIVE_RUN` udledt af `ledger.ready` er supersederet. Exact retained pair/source-proofs bærer kontinuiteten; både normal og oneoff skal vælge selectorens nyeste modne, native-complete run med `RETAIN_PREFERRED_NATIVE_RUN=false`, også ved non-READY kandidat. Den gamle 96h-pin må ikke forsinke refresh op til cirka 24h eller skabe unødig fallback-tail; `true`-path er kun dormant test/helper.
- Hvert progressivt bulkcheckpoint forsegles før write med en ny availability-ledger bygget af validerede retained proofs + aktuelle canonical `processedStep`-poster/officielt katalog. Persisted candidate er selvkonsistent og valideres som helhed efter timeout/crash; ledgerløst checkpoint rekonstrueres ikke til trust. `processedValidTimes` og tidligere complement må aldrig stå alene som coveragebevis.
- Retained availability medfører `ready=false`; active-promotion og offentlig release lempes ikke, mens den eksakte residual må fortsætte. Slutbeviset kræver stadig 79.414/79.414, én kilde pr. par, nul overlap/missing og alle fulde gates. Providerkæde, ydre budgetter, cron/reserve-dispatchkadence, 48-timers historik, score, geometri og punkter består; intern canonical regional off-phase-admission er den afgrænsede undtagelse.
- Status ved checkpointet: lokal implementering og final fokustests er grønne (`py_compile` 8 produktionsscripts; provenance, current-field-shadow, regional-current-operational, Open-Meteo-fallback, targetregistry, transactional 19/19 og diff-check). Ny GitHub exact-head, merge, positiv main-runtime, 79.414/79.414, fuld validate/releasegate og deploy afventer. Candidate G er fortsat offentlig.

# HISTORISK CHECKPOINT – 2026-09-06 – 4.0.328 per-pair-verificeret vejrfallback, supersederet af 4.0.329

- Ejeren har godkendt DEC-0118. Lokal 4.0.328 bevarer hvert kompatibelt, verificeret DMI-par og sender availability-ledgerens eksakte inverse rest videre; interne huller, hale, lokalt assetsvigt og registrybundet totalt DMI-udfald behandles uden at gøre partial til `DMI_READY`.
- DMI download-/parse-/behandlingsfejl ruller kun det eksakte asset tilbage. Supervisoren binder restart/skip til collection, run, time, item, kanonisk URL-hash og revisionshash; malformed markør kan kun give bounded finalisering. Active-promotion kræver fortsat strict READY, current-anchor, `candidate_promoted=true` og registrybevis.
- Copernicus `READY` eller target/DMI/shadow-bound `IN_PROGRESS`, også med nul attempts, kan aflevere den ærlige rest til næste provider. Det er ikke kildeudtømning eller releasebevis. Kun ugyldige private Copernicus-derivater kan karantæneres; registry, DMI-ledger og centrale targets stopper fail-closed.
- Open-Meteo er fortsat sidste `open-meteo-combined-current`, target..+117-only, højst 15 km, UTC/m/s/grader og `calibrationEligible=false`. Rådgivende 48-timers historik kan mangle; public/runtime/deploy kræver stadig eksakt 673 × 118 = 79.414, nul overlap/missing og alle fulde gates.
- Closure-/advisorydokumentet valideres én gang og indekseres derefter, mens hvert konkret opslag fortsat er hash-/assignmentbundet. Spatial slutgate reproducerer public strøm fra privat U/V uden at eksponere vektorer.
- Modelclosures er genforseglet og verificeret efter adapterændringen: integrated `4346bf2d…`/55, Candidate G rollback `71a093a4…`/56 og continuation `5456d603…`.
- Måltests er grønne lokalt: supervisor 11/11, transaction/recovery 17/17, WAM 21/21 samt ledger-, Copernicus-, regional-, Open-Meteo-, closure-, runtime- og 673-opslagsregressioner. Fuld `validate:source` skal køre én gang på PR'ens eksakte head i GitHub. Derefter: merge → frisk main-oneoff som genopfyldning → normal vedligeholdelse → 79.414/79.414 og Feggesund 354/354 → hydreret spatial audit → fulde produktionsgates/kapacitet → særskilt modelaktivering. Candidate G er offentlig; 4.0.328 er ikke stabil eller onlinebevist.
- Ekstern cron forbliver primær dispatcher, GitHub-schedules reserve. Normale kørsler vedligeholder; oneoff vedligeholder ikke. Efter systemstabilisering og model-online måles/justeres leverandørrækkefølge, budget og kadence mod targetfriskhed. Større pipelineoptimering er udskudt.

# NYESTE CHECKPOINT – 2026-09-06 – 4.0.327 currentfallback-run og SI-enhed

- 4.0.326 bestod exact-head 34010245661, PR #259 og merge d899c6defac93d52826269773bcaa9a8c645261f.
- Oneoff 34017809629 attempt 1 gjorde DMI og Copernicus READY. Open-Meteo stoppede før request med OPEN_METEO_RESIDUAL_PLAN_INVALID_SHADOW_NATIVE_CADENCE_INVALID; DMI- og Copernicus-cacherne blev gemt.
- Lokal 4.0.327 sorterer prøver fra ikke-valgte regionale modelruns fra før cadence-, asset- og vektorkontrol. Samme-run fejl forbliver fatale. En leverandøraudit fandt desuden, at velocity_unit=ms blev ignoreret og gav km/t; requesten bruger nu wind_speed_unit=ms og validerer GMT/UTC, m/s og grader.
- Officielle generiske live-prober bekræftede meteofrance_currents, 118 timer og batchstørrelse 50. Regional-, closure- og Open-Meteo-måltests er grønne. Vedligeholdelses-oneoff 34017809629 attempt 2 er startet på gammel main for at holde upstream-cacherne varme; dens Open-Meteo-stop er forventet og er ikke nyt bevis.
- Næste rækkefølge: releasehukommelse/korte kontroller → exact-head → merge → frisk main-oneoff → 79.414/79.414 og 354/354 → kapacitet/fulde gates → særskilt modelaktivering. Candidate G er offentlig.

# NYESTE CHECKPOINT – 2026-09-06 – 4.0.326 regional shadow-rollover

- Oneoff `34004697179` gjorde DMI og Copernicus READY, men Open-Meteo stoppede før request på en residualplanfejl. Copernicus havde dækket 7.408/8.512 operationelle rester og efterladt 1.104; advisoryhistorik manglede 417.
- 168-timers regional shadow beholdt korrekt gamle modelruns, men de blev behandlet som aktuelle hashkonflikter. Lokal 4.0.326 ignorerer kun gamle runs i den aktuelle closure; de kan ikke levere data, men parret kan fortsætte til Open-Meteo. Samme-run hashmismatch forbliver fatal.
- Open-Meteo kan nu vise en allowlistet versal årsagskode uden private id''er, koordinater, rå U/V, payloads eller fritekst. Måltests er grønne.
- Normalrun `34004873418` gemte DMI-fremgang og stoppede korrekt før downstream uden terminal producer-success. Næste rækkefølge er exact-head → merge → stor main-oneoff → komplet 673 × 118/Feggesund → kapacitet og fulde gates → særskilt modelaktivering. Candidate G er fortsat offentlig.

# NYESTE CHECKPOINT – 2026-09-05 – 4.0.325 terminalbevist cachebootstrap

- PR #257 bestod exact-head-run `33989875253` og blev merged som `948ba60b365dc604056ac0c719bd67645b3e3478`. Den ventende post-merge-kørsel `33991028274` blev derefter stoppet under checkout, før DMI, cachewrite, protected write eller deploy, fordi den hardkodede bootstrapcache ikke længere fandtes.
- Ejerens pre-gate-stop afdækkede den generelle fejl: flere cirka 49 MB legacycacher forsvandt hurtigt fra GitHubs inventar. Årsagen kan ikke udledes af cache-API'et, men en ny hardkodet nøgle ville have samme kapløb med sourcegaten.
- 4.0.325 vælger derfor den nyeste entydige main-key/version og genverificerer dens immutable exact-attempt samt grøn DMI-producent, progressiv zonecache-save og DMI-terminaltrin i korrekt rækkefølge og save-vindue. Kun den eksakte beviste key restores på main; active-bootstrap har ingen wildcard. En definitiv kandidat-404 falder videre, mens øvrig API-/inventar-/evidensusikkerhed stopper fail-closed. READY- og registrykontrollen består uændret.
- Liveprøven valgte cache-id `7369179233`, version `2f5a0598…`, `33990516150` attempt 1 og 48.847.855 byte; runnet fejlede først senere i Copernicus. Det er et DMI-donorbevis, ikke komplet vejr- eller produktionsbevis. Pilot/118h kræver main før private cache-restores. Active/candidate-isolation, fuldvinduesvedligehold, historik, kildeorden og cron er uændrede.
- Run `33991952081` bestod sourcegaten, men bekræftede derefter den gamle hardkodede cachemiss og re-savede 2.778.397.542 byte GRIB efter skipped DMI. GRIB-, kandidat- og research-save kræver nu et faktisk startet, ikke-annulleret producentforsøg.
- Resolver-, active/candidate-, workflowrækkefølge-, DMI-workflow-, RDKS-, sikkerheds-, version-, håndbog/SQL-, metadata-, YAML/JSON-, geodata- og live read-only API-kontroller er grønne. Den fulde lokale releasegate blev standset uden fejl under dens tunge, uberørte Candidate G-runtimeaudit i overensstemmelse med den omkostningsbevidste matrix; GitHub skal køre den fulde sourcegate én gang på eksakt head. Næste rækkefølge er commit/push/PR → exact-head → merge → active-save → frisk fetched/missing → autoriseret stor main-oneoff. Candidate G er fortsat offentlig.

# TIDLIGERE CHECKPOINT – 2026-09-05 – 4.0.324 aktiv/kandidat-cache og helvinduesvedligehold

- Ejeren har udtrykkeligt godkendt produktionsændringen i DEC-0116: gyldige data genbruges på tværs af time- og modelrunskift, hele det krævede prognosevindue kontrolleres ved hver normal vejrkørsel, og kun interne huller, ugyldige/forældede rækker og halen målrettes.
- Både normal drift og 118h-oneoff materialiserer sidste strict READY-active som donor, men alt nyt DMI-arbejde sker i samme `dmi-zone-candidate-v1`-familie. Fælles production-concurrency serialiserer writers, så begge kan fortsætte samme kandidat. Normal drift er den varige updater; oneoffen accelererer kun den samme mekanisme.
- Ikke-annulleret partial kandidat gemmes før terminalen. Active og deploykæden må først ændres eller fortsætte efter producer-success, allowlistet status, `DMI_READY`, strict anchor, `candidate_promoted=true` og eksakt registrybevis.
- Partial kandidat må kun fastholde sit native run over et seks timers modelskift med mindst normalt 96 timers moden/komplet fremtidshorisont og et katalog, der ikke er dokumenteret stale. Manglende eller READY kandidat vælger nyeste komplette run; retention kan ikke pinne cirka +120 timer gammelt arbejde.
- Kildeordenen er fortsat DMI → Baltic → AMM15 → policytilladt regional DMI → Open-Meteo for eksakte rester. Historik bevares: DMI private replay mindst 54 timer (standard 60), Copernicus bridge 48 timer og retention 168 timer; de integrerede mobiliserings-/transportforbrugere har fortsat op til 48 timers verificeret historik.
- Normal drift scanner hele target..+117 og kan behandle tre DKSS-familier pr. run. GitHub-reserveschedules og ekstern cron er uændrede; større pipelineparallelisering udskydes til efter komplet cache og leverandørmåling.
- Den målrettede lokale matrix er grøn. Run `33986893042` fejlede alene på manglende releasechangelog. Ejeren beordrede derefter et admin-bypass efter risikoforklaring, men Codex-sikkerhedslaget afviste handlingen, så ingen bypass eller merge skete. Run `33988058582` bestod releasegaten, men stoppede senere alene på håndbogs-/installationspariteten. Den officielle synk retter én genereret SQL-payloadlinje. Næste rækkefølge: ny exact-head → merge → frisk status → active-bootstrap/runtime og fuld produktionsgate → én stor main-engangskørsel → normal catch-up og komplet 210/673/118 før modelaktivering.

# NYESTE CHECKPOINT – 2026-09-05 – 4.0.323 operationel Open-Meteo-current

- DEC-0115 supersederer alene det tidligere ubetingede forbud mod Open-Meteo-current. Kildeordenen er DMI → Baltic → AMM15 → otte policydele regional DMI → Open-Meteo for eksakte rester, kun efter terminalt READY og kun target..+117. Kilden er combined surface current, højst 15 km, aldrig bølge-/tidevandsreprojektion og altid `calibrationEligible=false`.
- Seneste sikre status: 78.430/79.414 dækket, 984 rest; 944 policyregionalt og 40 udenfor ved +117. Lokal partition, filler, provenance, RavScore-, workflow-, freshness-, bundle- og append-only migrationskæde er måltestet. Exact-head, merge og frisk runtime afventer.
- Næste sikre rækkefølge er docs/version 4.0.323, fuld sourcegate, exact-head/merge, ny safe status til ejeren og derefter den allerede autoriserede store main-oneoff. Mål leverandørtid og justér normal drift kun efter komplet opfyldning. Candidate G er offentlig; gammel migration må ikke omskrives.

# NYESTE CHECKPOINT – 2026-09-05 – HARMONIE-assetwatchdog 4.0.322

- Run `33918250039` på main `ce93cebc` blev dræbt ved 55 minutter, fordi ét downloadet HARMONIE-asset sad over 52 minutter i ecCodes. Cachesave bestod; downstream blev ikke nået.
- Lokal 4.0.322 fører både normal drift og engangsopfyldning gennem `run-dmi-bulk-supervised.py`: 180 sekunder pr. igangværende HARMONIE-asset og højst 420 sekunders fail-closed finalisering gennem den eksisterende producent. Gemte data, DMI-first, exact-gap, model/state og geometri bevares.
- Måltests er grønne; exact-head, merge og frisk main-run mangler. Se `../research/DMI_HARMONIE_ASSET_WATCHDOG_2026-09-05.md`.

# NYESTE CHECKPOINT – 2026-09-03 – PR #249 merged; modelclosure klar til exact-head

- `origin/main a331e0dbb08a9ab9ffff26632a708828574bdcd8` indeholder nu den exact-head-grønne monotone Copernicus-progression. Post-merge-vejrkørsel `33775957133` er startet og er ikke endnu terminalt releasebevis.
- Scheduled pilot `33766716934` stoppede sikkert på mismatch mellem restored DMI-ledger-start og implicit ny pilot-time. Lokalt bindes targetregistry nu til den fuldt validerede ready-ledgers eksakte reference; en bounded uafsluttet ledger springes neutralt over.
- Den lokale samlede kandidat binder integrated `a226e7d1…`/`d5796289…` over 55 filer og attesterer den faktiske 78-modulers public closure. Alle nødvendige måltests er grønne. Candidate G er fortsat offentlig; migration, 673 × 118/Feggesund, kapacitet, Fase B, produktion og browser mangler.

# NYESTE CHECKPOINT – 2026-09-03 – reel public-bundle og Supabase pre-write-status

- Backendrun `33736292211` stoppede fail-closed i den eksakte integrerede public-implementation-seal, før Supabase/Edge/database, artifact eller Pages kunne ændres. Den daværende 44-filers bundle manglede de direkte offentlige entrypoints `js/services/rav-assistant.js` og `js/services/trip-evidence-public-adapter.js`; Candidate G er derfor fortsat offentlig.
- Begge entrypoints indgår nu i generatorens reelle transitive lukning. Integrated er lokalt `a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b`/`d5796289f645f1bcab6b4fe822c5ed6b0e919321013687302feb2139e814a286` over 55 filer. Actual-source browserlukningen attesterer den virkelige genererede binding over 78 offentlige moduler; bundle- og closure-måltest er grønne. Candidate G-rollback er uændret `7c7f2b4950b4ce7a04d560dde15dd93e408e045ca5e9ed4f9be33eac0255e89d`/56.
- Live Supabase read-only gav `false/false/false`: `supabase_migrations.schema_migrations` findes ikke som læsbar relation, og de to nye trip-/checkpoint-RPC-beviser findes ikke. De nye migrations er dermed ikke installeret. Linked migration list + dry-run forbliver den definitive stopgate før første write.
- `SUPABASE_DB_PASSWORD` er kun verificeret som eksisterende GitHub-secret-navn; værdien er ikke læst. Nulstil eller gæt ikke passwordet. Ved link-/authfejl stoppes før writes. Den gamle integrated-hash `3192db…` er nu kun historisk revisionsspor; exact-head, migration/dry-run, 673 × 118, kapacitet, Fase B, frisk produktion og offentlig mobil/desktop er stadig åbne.

# NYESTE CHECKPOINT – 2026-09-03 – første modelaktivering er adskilt fra merge

- Den lokale 4.0.320-implementering bruger nu to faser. Fase A merger/pusher koden, men holder Candidate G som eneste offentlige model og fører om nødvendigt legacy-Candidate til current moderne Candidate G på samme `main`-head. Fase A må ske før 673 × 118, så cron opbygger den korrigerede cache. Push, schedule, watchdog og almindelig manuel vejrdrift kan ikke aktivere state 6.
- Fase B er en særskilt manuel `workflow_dispatch` med både `ravscore_integrated_first_cutover=true` og den eksakte bekræftelse `EXECUTE-INTEGRATED-RAVSCORE-FIRST-CUTOVER-AFTER-CAPACITY-GATE`. Før DMI kræves den forseglede centrale Phase-A-complete Candidate G-identitet med eksakt binding/manifesthash, dataset/reference, deployment-id, `sourceHead`, implementation closure og profil; live public source/manifest/implementation genverificeres i deployleddet før begin-CAS.
- Tokenen er kun operationsautorisation. 673 × 118, Feggesund, DEC-0114's live Supabase før/efter-måling, øvrige egress/lager og mindst 30 procent reserve skal være dokumenteret grønne, før Fase B startes. Gamle forseglede planer/recovery bevares; der oprettes ingen ny controllerstatus, transitionstype eller direkte rowless/legacy→integrated-plan.
- Preflight `33695730459` attempt 2 nåede grøn DMI-terminal med 71.526/79.414 DMI-direct og gemte 364 Copernicus-par, men timeout gav intet 673 × 118-artifact. Attempt 3 var endnu ikke terminal. Main #3913 bevarede caches, men fejlede i den gamle selector. Overclaim ikke dette som releasebevis.
- Dette er kun lokal, måltestet kode og dokumentation: ikke commit'et, pushet, exact-head-verificeret, merged, kapacitetsmålt, aktiveret eller live. Candidate G er fortsat offentlig. Modelbundles/hashes, geometri og land-/vandpunkter er uændrede.

# TIDLIGERE CHECKPOINT – 2026-09-03 – source-stage v2 og exact-time regional state

- Aktiv branch `codex/ravscore-history-incomplete-cutover` bygger videre på baseline `1df200d9b56bb9ac4a7304ae3a07a2db8f45abf3` og indeholder den samlede 4.0.320-kandidat; `origin/main 28f24d1c1fc2c9d971b5acb43cf91bddd80fb950` er hentet og ancestor. Candidate G er offentlig, indtil resten af releasekæden er bevist.
- Main-runs `33682062077` og `33687215451` gemte DMI-bulk-/zone-/GRIB-/researchcache og bevarede Copernicus-cachen, men gammel main stoppede ved exact-gap-selector før fill/673 × 118/artifact/deploy.
- Source-stage v2 kræver pr. valgt Baltic/AMM15-par eget produktdomæne, komplet samme-par Baltic-forudsætning eller deterministisk `NOT_APPLICABLE`, samt eksakt registry/DMI/shadow/hashbinding. Nonempty komplet Copernicus uden stage stopper.
- Regionalt derived hold er state-only og bindes til præcis `(partId, validTime, sourceValidTime, holdAgeHours)`. Det skaber ingen U/V/fart/retning/grid/pil, kan ikke autorisere nabotimer og er forbudt i target−48..−1-historikken. Rettelsen og de relevante måltests er grønne; den uafhængige exact-time-revision fandt ingen P0/P1.
- Rollback- og integrated-bundles er nu regenereret i hver sin proces og synkroniseret til alle bindingsforbrugere: Candidate G `7c7f2b4950b4ce7a04d560dde15dd93e408e045ca5e9ed4f9be33eac0255e89d` over 56 filer og integrated `3192db304a6e613059cd66d1ae983583c3aaff832293bda978cdc03991bb49c3` over 44 filer/8 forbrugere. Den samlede fokuserede Python-/Node-/workflow-/PWA-/versions-/RDKS-slutmatrix er grøn. `.cache` er urørt og må aldrig stages. Næste rækkefølge: commit/push → exact-head/673 × 118 → Supabase live før/efter → merge, frisk produktion og offentlig mobil/desktop.

# NYESTE CHECKPOINT – 2026-09-02 – 4.0.320 atomisk DMI-assetprogression

- Exact-head `33627490090` er grøn på `c8aa5665`. Preflight `33632361928` gennemførte DMI-terminalgaten med 71.525/79.414 DMI-par og afgrænsede præcis 7.889 operationelle Copernicus-restpar; stoppet skyldtes, at den gamle all-or-nothing-pilot tabte færdige spatialshards ved to 600-sekunders timeouts.
- Copernicus checkpoint'er nu hver fuldt downloadede, hashkontrollerede og validerede shard atomisk som uforseglet privat state. Ét hard-bounded 1.200-sekunders forsøg pr. workflowrun efterlader plads til failure-save; næste run springer attesterede par over. Kun komplet target..+117 må blive `OPERATIONAL_COMPLETE`. DMI-first, data, provenance, score, geometri og punkter er uændrede.

- Fortsæt fra branch `codex/ravscore-history-incomplete-cutover` med udgangspunkt i committed baseline `eebab205c6633e32b993f2c18b0933c392e1d20c`. Hentet `origin/main 28f24d1c1fc2c9d971b5acb43cf91bddd80fb950` er allerede ancestor.
- Run `33604589582` beviste officielle DKSS-assets og bevaret progression, men også cirka 1.105 sekunders spild på 26–27 gamle fuld-cache-checkpoints. Main-runs `33608982473` og `33617117320` gentog den gamle main-parsers string-`round`-fejl og stoppede korrekt før bred Copernicus/deploy.
- Hvert asset behandles nu copy-on-write og committer først efter grøn komplet validator; interruption/exception/validatorfejl ruller public/private/shadow/outcomes/diagnostics tilbage. Den fælles controller checkpoint'er kompakt og atomisk ved 8 committede assets/60 sekunder; tung finalisering sker én gang.
- Tolv dynamiske transaction/checkpointtests, 21 WAM-bootstraptests, producent-/workflowtest, native provenance, syntaks/diff og uafhængig review er grønne uden P1/P2-blokker. Bevar DMI-first, exact-gap Copernicus, spatial-first/fælles celle/lag/5 km, 118-timersgaten, Feggesund, model-id/state/bundles, scorekontrakt og alle geometri-/punktforbud.
- Næste sekvens er commit/push, én exact-head sourcegate og én isoleret 673 × 118-currentpreflight; Feggesunds tre dele × 118 timer er et separat wave-only-bevis. Først efter grøn evidens: fetch main, merge, fuld produktion/activation og offentlig desktop/mobil.

# NYESTE CHECKPOINT – 2026-09-02 – Feggesund direct-first wave-only proxy

- Denne topstatus superseder ældre direct-only-/proxy-pensioneringsresumeer nedenfor; de bevares som revisionsspor.
- Direkte lokal DMI WAM vinder altid. Kun `DK-B05-11`, kun ved hel lokal `(Hs, period, mean FROM direction)`-missing, må komplette direkte DMI-tuples fra både `DK-B05-10` og `DK-B05-12` ved samme time/run danne den faste 50/50 energikonsistente bølgeproxy.
- Proxytimer bærer `LOW`/`MODERATE`/`HIGH`, tydeligt DA/DE/EN-varsel og `calibrationEligible=false` gennem mode, zone, public, tur og observation, også ved ellers `FULL_HISTORY`. Direkte DMI følger normal historikregel.
- Undtagelsen er wave-only: ingen current, historik, recovery-backfill, kunstig state, geometri-, land-/vandpunkt- eller kystnormalændring. Ingen lokal surfzone- eller empirisk fundpræcisionspåstand.
- Release kræver privacy-sikkert 3 × 118-bevis med direct + proxy = 354 og missing = 0. Exact-head, merge, frisk fuld produktion og offentlig desktop-/mobilverifikation afventer fortsat; Candidate G er stadig offentlig.
- Den afsluttende lokale releasegate fandt to stale tekstmarkører fra før de stærkere DMI-refaktoreringer. Kun gaten er justeret til den faktiske cache-key/row/native-time-kontrol og nested `resetWaveRowCount`-registrering; runtime er uændret, og de relevante måltests er grønne.
- Gældende 4.0.320-slutbundles er forseglet og lokalt måltestet: integrated `a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b`/`3192db304a6e613059cd66d1ae983583c3aaff832293bda978cdc03991bb49c3` over 44 filer og 8 deklarerede forbrugere; Candidate G-rollback `c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8`/`7c7f2b4950b4ce7a04d560dde15dd93e408e045ca5e9ed4f9be33eac0255e89d` over 56 filer. Exact-head `33577887262` stoppede i Candidate G-rollbackens public stage på calibration-ceiling på den historiske 4.0.319-head; fem-validator-rettelsen og fire måltests blev grønne. Exact-head `33580532775` kom gennem hele den historiske model-/rollbackkæde og stoppede kun på to forældede DMI-testassertions; test-only-rettelsen blev grøn 21/21 og ændrede ingen runtime. Restkontrollen rettede derefter kun en gammel syntetisk live-current-fixture til den gældende downloadindholdsbinding; testen blev grøn, mens hydreringstestens lokale WindowsApps-Python-fejl blev afvist med bundled-Python-bevis. Ny 4.0.320-exact-head, slutligt 118-timers/Feggesund-bevis, merge, frisk fuld produktion og offentlig browserkontrol afventer; hashes i eksplicit historiske 4.0.317/4.0.318-afsnit er revisionsspor.

# NYESTE CHECKPOINT – 2026-08-31 – PR #241 merged; legacy-profilattestering lokalt rettet

- Denne topstatus superseder ældre topresumeer nedenfor, men bevarer dem som revisionsspor.
- PR #241 bestod exact-head-kildegaten i run `33397737159` og blev merged som `origin/main a1ce7632b4262d742ec4a8a59746a61241c3b79a`.
- Mergeproduktion `33400836760` passerede den tidligere Højbjerg/bearing-gate og beviste dermed den smalle `360→0`-rettelse. Den stoppede derefter fail-closed i den lokale legacy-kildeattestering, før DMI, beskyttede writes, artifact og Pages; Candidate G og den offentlige side blev ikke ændret.
- Rodårsagen er reproduceret: attesteringens testfixture tillod kun 11 profilfelter, mens den fastlåste 4.0.316-producent og den aktive offentlige Candidate G-manifestform har 20. Den lokale branch `codex/ravscore-legacy-profile-attestation` validerer nu den fulde eksakte feltmængde, readiness/advisory-konsistens og bit-for-bit samme profil i manifest og conditions. Ukendte felter og blandede profiler stopper fortsat.
- Målrettet legacy-, activation-, workflow-, deploy- og cutover-matrix samt privacy-sikker offentlig manifest/payload/53-fils source-closure-verifikation er grøn. Ingen private conditions-payloads, koordinater, rå U/V, geometri eller land-/vandpunkter er læst eller ændret.
- Candidate G/4.0.316 er fortsat eneste offentlige model. Ny exact-head, sikker merge, én frisk 4.0.319-produktion og offentlig desktop-/mobilverifikation udestår.

# NYESTE CHECKPOINT – 2026-08-31

- Denne topstatus superseder ældre topresumeer nedenfor.
- PR #238 er merged som `origin/main 57f76d716310060e0d629c9f9d3691d386a2dd58`; workflowfixes PR #239/#240 er merged videre til `origin/main be81005b50294f54367f154c393bb27910e16c6f`.
- Produktion `33391418061` og `33393684620` stoppede fail-closed før DMI, beskyttede writes, artifact og Pages på én aktiv offentlig Højbjerg-del i `DK-B04-01` / `dk-b04-01-national-part-03` med bearing `360`, mens aktiv kontrakt kræver `[0,360)`.
- PR #241 er den aktuelle smalle remediation: afrundet `360` normaliseres til `0` uden geometri-, zone-, land-/vandpunkt- eller kystnormalændring. Første CI `33394343851` stoppede ved stale bundle-/binding-consumers; senere gates blev derfor ikke bevist. Bundle-/binding-consumerne er nu regenereret og målrettet lokalt verificeret; opdateret exact-head afventer.
- Lokale bundle-hashes er nu integrated `e880d5425e6f7b93d8afc99cddf491e58ad5a4a2ab055f8e4455193609c90a73` og rollback `4ccc2081982677aadbb47a5ee7d6f2b99fdcb7e42113e73029d5c60323a5ee96`. Candidate G er fortsat offentlig. Exact-head, merge, frisk produktion og offentlig browserverifikation af PR #241 udestår.
# Codex – start her

Dette er den obligatoriske indgang til RavRadar for Codex og andre kodeassistenter. Projektet må ikke behandles som en samling isolerede filer. Hver ændring skal forstås som et træk i et sammenhængende system.

## Nyeste P0-checkpoint 2026-09-01 – DMI-currentfasefejl lokalt rettet; ny frisk preflight afventer

- Isoleret run `33520738058` på `3a26ba0c` nåede producenten, men hard gate stoppede payloadfrit med `DMI_STRICT_CURRENT_ANCHOR_MISSING`. Runnet er negativt runtimebevis, ikke grønt 673 × 118-bevis eller bevis for bred upstream-DMI-mangel.
- Den yderligere lokale rodårsag var en faseforskel: tidlig cache-health kunne være grøn, før den senere autoritative sampling-/gridvektoroprydning fjernede et uforeneligt `samplingPoint` eller top-level `current-u`/`current-v`-par. Working-tree-rettelsen gør `coastal_part_current_cache_reusable` fasekonsistent med begge kontroller. Direkte provenance-test, bulk-test, scheduler-test og Python-syntakskontrol er grønne lokalt; ny eksakt GitHub-kørsel er endnu ikke kørt eller grøn.
- DMI er bindende primærkilde i både nuværende drift og den nye integrerede model. Copernicus må kun udfylde eksakte, dokumenterede manglende DMI-tuples efter grøn DMI-terminalgate og må aldrig skjule eller erstatte en systemisk DMI-fejl.

- De isolerede 118-timers runs `33510636195` og `33512163102` nåede DMI-producenten, men den payloadfri logoptælling viste nul behandlede trin i `dkss_idw`, `dkss_nsbs` og `dkss_lf`, mens HARMONIE og WAM blev behandlet. `DMI_STRICT_CURRENT_ANCHOR_MISSING` er derfor ikke bevis for, at DMI generelt manglede currentdata; fejlen lå i RavRadars lokale cache-/runvalg før DKSS-behandlingen.
- Den progressive cachelinje førte tilbage til det negative run `33498108421`. En foretrukken ældre run kunne blive fastholdt og derefter afvist som stale uden skift til en nyere moden run. Preflightens såkaldte deployed donor var samtidig blot en kopi af den samme progressive cache, og gamle DKSS-`processedSteps` kunne undertrykke en nødvendig genbehandling uden strict current anchor.
- Den lokale rettelse binder ét eksakt jobtarget før DMI og genbruger det gennem hele beviset, også hvis væguret krydser en UTC-time under kørslen. En ældre preferred run må kun beholdes foran en nyere moden run, når en kendt observeret cadence viser, at den højst er én cadence bagud; ved ukendt cadence vælges den nyere modne run. Mens strict current anchor mangler, står de tre DKSS-familier først i den normale collection-loop, og netop deres gamle stepmarkører genbruges ikke.
- Preflighten forsøger valgfrit at hydrere en uafhængig offentlig Candidate G-DMI-donor under `RUNNER_TEMP`. Kun en donor, der består den strenge kompatibilitetskontrol, må bruges; er den fraværende eller ugyldig, fortsætter det friske officielle DMI-forsøg uden deployed fallback.
- Den samme beskyttelse gælder den nye model: den særskilt checkpointede WAM-historikbootstrap ligger fortsat før den normale collection-loop og kan fortsætte over flere cutoverforsøg. I selve seks-collection-loopet står DKSS foran WAM, når strict current anchor mangler; med et gyldigt anchor kan WAM igen stå først. oormal vedligeholdelse behandler fortsat højst to collections. Copernicus er uændret sidste led og må kun supplere de eksakte resterende DMI-huller pr. kystdel og time efter grøn DMI-terminalgate.
- **Historisk supersession 2026-09-06:** DEC-0116 afløste først to-collection- og cadence-/én-lag-reglen med fælles kandidat, tre DKSS-collections og partial-only 96h-retention. 4.0.329 supersederer siden retentionen: normal/oneoff vælger nyeste modne native-complete run med flag `false`, mens exact retained pair/source-proof bærer kontinuiteten.
- Ingen scoreformel, geometri, kystnormal, land-/vandpunkt, private payloads, koordinater eller rå U/V er ændret. Frisk isoleret 673 × 118-preflight på den nye kodehead, exact-head, merge, fuld produktion og offentlig kontrol er fortsat åbne beviser. Candidate G er fortsat den eneste offentlige model.

## Nyeste P0-checkpoint 2026-08-31

- Nyeste offentlige Candidate G-bevis er produktion `33368963614` på uændret `origin/main 8c03e25d`; build, frisk fuld validate, releasegate, protected sync/artifact og Pages er grønne, og `rr-20260831074016-210` er komplet 210/673. Det er ikke state-6-bevis.
- Offentlig sandhed er exact 4.0.316/Candidate G efter PR #236 på `origin/main c58deb78`; exact-head `33342157517` og post-merge fuld produktion `33342219152` er grønne. `33345476979`/`rr-20260831010337-210` var første recoverybevis. Det tidligere external-watchdog-`workflow_dispatch` `33347230240`/`rr-20260831012407-210` bestod fuld DMI/validate/releasegate/storage/Pages og er komplet 210/673, `VERIFIED_ONLY`, uden syntetiske samples; Candidate G er 0/210 aktiv på grund af historikmemory. Visuel browserkontrol er åben. `33343469247`/`33344823000` stoppede på transient 503 uden deploy; bounded retry-hotfixen er produktionsverificeret gennem PR #237, exact-head `33352520408`, merge `8c03e25d`, backend `33352661061` og fuld produktion `33352634365`; automatisk run `33354263148` publicerede `rr-20260831034128-210` komplet 210/673.
- 4.0.319 er lokal. Historical Candidate/integrated H0→H1 er immutable-plan/two-phase under controller-v4's 30 felter/4 statusser/6 kinds; direct Candidate→integrated bruger IntegratedReturnPlan; ordinary maintenance er exact-current.
- Source-visible er ikke abortbevis. Kun NOT_STARTED må `SAFE_SOURCE_ABORT`; ambiguous går til exact-target writer og separat non-Pages-finalizer. Third/mixed/reversed/stale/tampered/missing plan er fail-closed, og `pages-recovery-*` er næste source-lineage.
- `HISTORY_INCOMPLETE` publicerer alle 118 timer ved gyldige direct inputs; direct missing er timevis `UNAVAILABLE`. Outcome er lokalt schema v2, og Spørg RavRadar/plain-language-P2-måltests er grønne. Workflowet er opdelt i orchestrator/build/deploy, alle 40 direkte readers er migreret, public-integrated 210/673 og 78 browsermoduler er grønne, og slutreviewet fandt ingen P0/P1. Gældende 4.0.320-slutbinding er integrated `a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b`/`3192db304a6e613059cd66d1ae983583c3aaff832293bda978cdc03991bb49c3` over 44 filer/8 consumers og Candidate G-rollback `c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8`/`7c7f2b4950b4ce7a04d560dde15dd93e408e045ca5e9ed4f9be33eac0255e89d` over 56 filer. Assistentens state-6-fixture er fast sourcegate. Ny exact-head/merge/frisk produktion/Feggesund/browser mangler.

## Tidligere P0-checkpoint 2026-08-30 – 4.0.318 first-cutover-hærdning under DEC-0113

- Offentlig sandhed er fortsat 4.0.316/Candidate G. PR #235 bestod exact-head `33332106627`, blev merged som `a584d1cf`, men push-produktion `33333490853` stoppede sikkert før DMI, protected writes, artifact og Pages: den gamle resolver afviste 0 READY/673 kanoniske Candidate G-warmupstates som invalid migration.
- 4.0.318 adskiller tre beviser: eksakt public Candidate G-source, migrationsegnethed og den aktive centralt hydrerede samplingkontekst. Source manifest/conditions/register valideres samlet på en isoleret sti; det aktive 210/673-register materialiseres separat. Ingen geometri, kystnormal eller land-/vandpunkter flyttes.
- 673 READY + identisk source/active context + ét target giver `candidate-g-migration`. Komplet kanonisk warmup eller legitim contextændring giver national `genuine-cold-start`. Invalid, tampered, ukendt eller bindingsforkert source stopper. Cold start kræver `source_validated=true` og må ikke maskere en afvist integreret continuation/checkpoint.
- State 6 replay'er kun faktisk tilgængelige private, verificerede 0–48 timer plus reel target og bliver `HISTORY_INCOMPLETE`. Candidate G-rollback cold-replayes separat fra egne reelle timer, må ikke hybridiseres og skal selv være 48-timers READY før companion/checkpoint/release. Ingen syntetisk historik, interpolation, zonelån eller carry-forward.
- UTC-bootstrapmålet er canonical `YYYY-MM-DDTHH:00:00Z` og roundtriptestes Node→Python. Ikke-annulleret reel DMI-cacheprogression bevares privat på fejl; slutgaterne lempes ikke.
- Watchdog/bot `33334709027` og separat pilot `33335078275` stoppede begge rødt før deploy/offentlig mutation. De forklarer fejlmails; de er ikke skjulte modelreleasebeviser. **Dette historiske checkpoint er supersederet 2026-09-03 for initiatoren:** alle almindelige jobs, også push, vedligeholder Candidate G; særskilt manuel Fase B alene må initiere første integrerede aktivering.
- Læs DEC-0113 og de fem nye aktive first-cutover-krav før videre arbejde. 4.0.318 har en regenereret endelig binding, men mangler versions-/docs-/testlukning, egen exact-head/merge, frisk fuld produktion/releasegate/artifact/Pages samt offentlig 210/673/current/femdøgns-/desktop-/mobilkontrol. Påstå ikke empirisk bedre fundpræcision.
- Det efterfølgende state-6-afsnit er det tidligere 4.0.317-checkpoint og må læses som præ-hærdningshistorik, ikke som livebevis.

## Historisk P0-checkpoint 2026-08-30 – integreret RavScore state 6

- 4.0.315 bestod PR #233 exact-head `33299676128` og blev merged som `63d789a4`. Run `33299747300` frigav D1-/reconstruction-readiness og startede build; den gamle grøn-no-op-interlock er ikke længere blockeren.
- Runnet stoppede rødt ved **“Stage audited last verified Candidate G public fallback”**, fordi ingen measured-only fallback var inden for både 72 timer og prognosehorisonten. Intet nyt artifact/Pages blev publiceret.
- 4.0.316 må lade en frisk measured-only primary publicere current+fem døgn uden fallback. Gammel/udløbet fallback skal være fraværende i manifest/public files og må aldrig vises. Kun forventet fallbackfravær er ikke-blokerende; uventet primary accounting/audit stopper fortsat.
- Ingen syntetiske data, interpolation, backfill eller zonelån. DEC-0111-retirementen består.
- DEC-0112 binder state `6.0.0` til konservativ `HISTORY_INCOMPLETE` lower/upper ved gyldige direkte input, tydelig auto-forsvindende DA/DE/EN-advarsel og `calibrationEligible=false`. Manglende direkte input er separat `UNAVAILABLE`/`null`. Current scorer kun 48 timer; 168 timers researchretention har ingen scoreeffekt; bølge- og last-mile-usikkerhedshaler lukkes efter henholdsvis 288 og 40 timer.
- Workflowmonolit, grøn-no-op-semantik og spredt version/docs/string-testkobling skal reduceres i modelleverancen, ikke i P0-hotfixen.
- Offentlig 4.0.316/Candidate G er observeret som `rr-20260830091913-210` med 210/673, men 0 aktive/210 `UNAVAILABLE` ved utilstrækkelig strømhistorik. Dette er regressionsevidens, ikke state-6-releasebevis. Kald ikke state 6 live før exact-head, merge, frisk fuld produktion, artifact/Pages og offentlig 210/673/current/femdøgnskontrol er bevist. Rør ikke geometri, zoner, punkter eller private data.
- Feggesund-parenten er 118/118 wave-missing i sanitiseret `rr-20260830104132-210`, men de tre aktive part-id'er findes, har `marineCoverage=full`, og Candidate G-current er tilgængelig i begge modes. Kræv frisk integrated 3 × 118 part-level-bevis før kildeændring. Kun ved et reelt part-hul og dokumenteret umulig korrekt direkte data må den ejerautoriserede konservative nabozonehypotese for præcis `DK-B05-11` vurderes særskilt; den er ikke implementeret eller generel fallback.
- Historisk 4.0.317-binding: `778db7aa3946f925607a8304daa42ed17dd30294e4a51bf6d895d7293e84c4e7`/`74bfc42bb008f6743f374fc35201d3ea6f81f6e360c99873541fed83eeadcbae` over 43 filer og Candidate G-rollback `c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8`/`fd3f7e70ec3706818c153c26140ae592e4f0ad2acc6c157183984689f74a2207` over 54 filer. Den daværende matrix var grøn; gældende 4.0.320-binding står i de nyere checkpoints øverst.

## Historisk P0-checkpoint 2026-08-30 – 4.0.315 retirement og frisk produktion

- 4.0.314's tilbagetrukne one-time Candidate G-operation efterlod en aktiv readiness, som krævede et apply+Pages-bevis, der aldrig kunne eksistere. Normale vejrjobs blev grønne no-ops uden build, artifact eller Pages.
- Offentlig primary er observeret mere end otte timer gammel, og den målte recovery er over sin absolutte 72-timersgrænse. RavRadar viser derfor ærligt **“Aktuelle data kunne ikke hentes. Gamle data vises ikke.”**, men kan ikke vise prognoser.
- Ingen descriptor blev forseglet, ingen apply/rollback/cleanup blev kørt, og ingen syntetiske eller interpolerede data blev anvendt eller deployet.
- DEC-0111 tilbagetrækker DEC-0109 uden anvendelse. 4.0.315 fjerner operationsinput/jobs, actuator og apply+Pages-attestationen. `trip-storage-readiness` bevares for historical exact-D1 på 4.0.311–4.0.314, men returnerer eksplicit `ready=true` for 4.0.315.
- Bevar measured-only gap-checkpoint, continuation og senest-komplet recovery samt defensive trust-/schema-/turkvalitetslæsere. De defensive læsere kan ikke skabe data og er ikke en operationel tilladelse.
- P0 er ikke lukket ved lokal eller grøn topstatus. Kræv exact-head sourcegate, merge, en frisk normal produktion hvor fuld validate/releasegate, artifact og Pages faktisk kører, og offentlig 210/673-kontrol af aktuelle og femdøgnsprognoser.
- Rør ikke geometri, zoner, land-/vandpunkter, private data eller geodata ud over den særskilt autoriserede rene topversionssynk.

## Historisk modelcheckpoint 2026-08-30 – integreret RavScore state 6 under DEC-0110/DEC-0112

- Offentlig produktionssandhed er 4.0.316 med Candidate G som eneste offentlige model. `RRS-COASTAL-PROCESS-INTEGRATED-1.1.0`/state `6.0.0` er lokal releasekandidat og mangler exact-head, merge, frisk produktion/deploy og offentlig 210/673 desktop-/mobilkontrol. Schema 5 er kun en aldrig-offentlig eksakt 5→6-migrationskilde.
- Kandidaten bruger afgrænset kausal energivægtet wave-approach med fire timers halveringstid og en ældre hale, én DMI `FROM`→`TOWARD`-rotation og én 0,85–1-dæmpning af eksisterende supply. Fysisk levering er uopløst; DDM er kun statisk kontekst, Rainville 2026 kun buoyant-object-analogi, og ingen geometri eller punkter flyttes.
- Candidate G-cutover bruger `candidate-g-schema2-signed-current-reweight-bounded40h-wave-approach-to-integrated-schema6-v5`: signeret afledt kystnormal currentevidens genvægtes uden rå U/V; alle 673 schema-2-states skal give ét fælles target; wave-approach bruger 40 private præ-target-positioner fra coherent WAM-run pr. collection med same-cell provenance og kun højst fire timers same-run/same-cell-interpolation. Grænserne er `1/1024` udeladt EWMA-hale og `0.01171875` rå scorepoint før afrunding. Fejl bevarer Candidate G offentlig; ingen syntetisk/offentlig historik.
- Ægte state-6-cold start bruger 0–48 faktisk tilgængelige private verificerede timer plus reel target og forbliver `HISTORY_INCOMPLETE`, indtil 288 timers kausal tail closure eller attestert migration/continuation. Candidate G-rollback bruger samme target uden dobbelt credit; checkpoint-only recovery kræver en separat beskyttet READY companion fra samme generation. Nøddrift er kun same-model og atomisk i højst 72 timer; WAM-bootstrapinterpolation gælder ikke nøddrift, og cross-model fallback er forbudt.
- Ejeren opgav den fiktive morgenhulsrekonstruktion før descriptor/apply/mutation/publicering. DEC-0109 er kun historisk incident-/trustkontrakt. Kør ikke ny incident-inspect eller apply; de følgende 4.0.311–4.0.314-afsnit er revisionsspor.
- Fortsæt Sol/Ultra gennem dokumentationslukning, uafhængig helhedsrevision, integration af seneste grønne `origin/main`, releaseversion, fulde gates, egen PR/merge, frisk produktion og offentlig browserkontrol. Genbrug det historiske 4.0.317-bevis; de regenererede 4.0.319-digests står i nyeste checkpoint, og den fulde slutmatrix skal fortsat køres. Læs eller vis aldrig private payloads, rå U/V eller koordinater.

## Historisk P0-checkpoint 2026-08-30 – før-primary-gate lokalt afgrænset

- Offentlig produktionssandhed er stadig 4.0.310-nøddrift; morgenhullet er ikke lukket.
- PR #230 bestod exact-head `33277107562`/`99165644953` på `7ad1a98b`, blev merged som `228725ea`, og push `33277217412` var korrekt no-op.
- Første D1 `33277253662` stoppede fail-closed på en forbigående unauth-trip-probe-503 efter Edge med grøn roll-forward og nul inspect. Idempotent genkørsel `33277510537`/`99166722076` bestod hele backendkæden på samme SHA.
- Read-only inspect `33277738135`/`99167394284` stoppede før descriptor/apply/build/Pages og viste kun `ONE_TIME_GAP_BEFORE_NOT_UNIFORMLY_READY`. Ingen data eller cache blev ændret.
- Før-supportfilen er den ærlige primary; den komplette målte nødvisning blev publiceret separat. Før-primary må derfor være eksakt replaybar measured-only schema 2.0 `WINDOW_INCOMPLETE`. Kun det samlede target-reference-replay må åbne `READY` efter den ene forseglede interpolation.
- Lokal same-version-hotfix fjerner kun blanket-READY-gaten. Alle minimum-, replay-, cadence-, bracket-, targetanker-, source-, descriptor-, CAS-, privacy- og slut-READY-gates består. Ældre hul, for kort suffix, schema 2.1, ukendt status eller tampering stopper før descriptor.
- Syntetisk 210/673-test bruger 673 ærlige 24-timers `WINDOW_INCOMPLETE`-før-suffixer og består begge parentmiljøer. Næste rækkefølge er lokale gates/review → exact-head/merge/no-op → nyt D1 → ny inspect → eventuelt CAS-apply/frisk produktion/offentlig 210/673.
- Hent aldrig fuld inspectjoblog eller source-/descriptor-/rollbackartifacts. Brug kun allowlistet checkannotation. Ingen vejr, rå U/V, koordinater, geometri eller punkter ændres. Brug Sol/Ultra.

## Historisk P0-checkpoint 2026-08-29 – D1 grøn; sanitiseret diagnostikhotfix

- Offentlig produktionssandhed er stadig 4.0.310-nøddrift; morgenhullet er ikke lukket.
- 4.0.313 bestod PR #226 exact-head `33269501339`/job `99145314693`, blev merged som `ff62ba116d08a7894d206d350ea5bdde199fe433`, og push `33269584236` var korrekt no-op uden artifact/Pages.
- Exact-main D1-backend `33269631305`/job `99145677813` bestod hele kæden inklusive begge syncs, slutreconciliation, Edge, Worker, registry og SQL. Det er backendbevis for 4.0.313, ikke exact-head-bevis for en ny 4.0.314-head.
- Read-only inspect `33269849748`/job `99146287609` stoppede før descriptor/apply med den faste kode `ONE_TIME_GAP_AFTER_EVIDENCE_COUNT`. Ingen data eller cache blev ændret, og intet nyt descriptor-/releaseartifact eller Pages-deploy blev oprettet.
- Rodårsagen er snæver: de otte native 3-timersdele kan have præcis ét gyldigt målt højreanker i after-kilden. 4.0.314 tillader singleton kun i `AFTER`, kun når før+aktuelt mål uafhængigt beviser enstemmig 3-timerskadence, og fortsat kun efter fuldt state-replay, eksakt target-anker og alle source-/CAS-gates. Nul punkter samt singleton i før/mål/1-timesdele afvises.
- 4.0.314-kilden bestod PR #227 exact-head `33272564543`/`99153577550`, blev merged som `d1369d88`, og push `33272676071` var tilsigtet grøn no-op uden build/artifact/Pages.
- Den ældre 4.0.313-produktion `33271863449`/`99151692515` stoppede før releasegate/Pages, fordi en stale marine-first-test stadig forventede den tidligere dynamiske concurrencytekst. Same-version-hotfixet kræver nu præcis én `cancel-in-progress: false` og gør testen obligatorisk i `test:workflow-action-contracts`/`validate:source`.
- Docs-checkpoint PR #229 bestod exact-head `33275025105`/`99160126852`, blev merged som `9291250c`, og push `33275147023` var korrekt no-op uden build/inspect/Pages. Exact-main D1 `33275218540`/`99160622956` bestod hele storage-/Edge-/Worker-/sync-/slutattestationskæden.
- Read-only inspect `33275438494`/`99161265720` hydrerede mål og kilder, men stoppede i planforseglingen. Descriptorrefusal/-upload, build og Pages blev sprunget over; ingen descriptor, apply, data-/cachemutation eller publicering forekom.
- Den sikre Actions-annotation viste kun exit 1, mens domænekoden kun fandtes i hele jobloggen. Hent ikke den log. Den lokale diagnostikhotfix annoterer kun /^ONE_TIME_GAP_[A-Z0-9_]+$/ ved fejl og maskerer alt andet; ved succes kun descriptor-SHA samt validerede affected/synthetic/1h/3h-optællinger. Målrettet 210/673-black-box-test er grøn. Efter exact-head/merge kræves nyt exact-main D1 på den nye final-SHA før ny inspect. Normal produktion forbliver no-op indtil descriptorbundet apply+Pages; 4.0.315 er ulåst.
- PR #230's første head `e8f579ba` stoppede source-run `33276791132`/`99164804850` kun i testharnessen: normale child-cases arvede runnerens `GITHUB_ACTIONS=true`. Harnessen fjerner nu flaget for normale cases og sætter det kun eksplicit i annotationstests; 210/673-testen er grøn med begge forældremiljøer. Ingen produktion eller data blev rørt; ny exact-head afventer.
- Trip protocol/header og Candidate G model/formel/state-/trustsemantik forbliver 4.0.311/2.0–2.1. Ingen vejr, rå U/V, koordinater, geometri eller punkter ændres. Brug Sol/Ultra.

## Historisk P0-checkpoint 2026-08-29 – lokal 4.0.313 replay-roll-forward

## Historisk P0-checkpoint 2026-08-29 – lokal 4.0.312 roll-forward

- Offentlig sandhed er fortsat produktionsverificeret 4.0.310. 4.0.311 bestod PR #224's exact-head CI `33263734108` og blev merged som `7c168b00af535415117c968a8c021a493b083137`; push-run `33263858078` var en korrekt grøn no-op uden nyt artifact eller Pages-deploy.
- Backend-run `33263892151` stoppede ved den efterfølgende katalogverifikation, efter at den atomiske SQL-forespørgsel havde svaret HTTP 201. `pg_get_constraintdef` havde deparseret den kanoniske JSONPath med ekstra parenteser, som den flade regex ikke accepterede. Den sandsynlige tilstand er derfor, at CHECK-constraint, validering og kommentar blev committed samlet; transaktionens eneste atomiske alternativ er fuld rollback. Ingen observationpayloads blev hentet til runneren, logget eller ændret, ingen row mutation forekom, og D1, Edge, Worker, sync, vejr, artifact og Pages blev ikke nået.
- Den lokale 4.0.312-roll-forward erstatter den skrøbelige tekstregex med strukturel udtrækning af præcis én JSONPath-literal. Den tolererer deparserens parentesering, kræver den eksakte kanoniske path og afviser reorder, duplicate, extra og ambiguous. Målrettede regressioner, fuld lokal source/release/RDKS/håndbog/version og geodatakontrol er grønne, og exact-D1-interlocken omfatter 4.0.312; PR/exact-head, merge, backend, rekonstruktions-inspect/apply, frisk produktion og offentlig verifikation mangler fortsat.
- 4.0.312 er en app-/verifier-roll-forward og ændrer ikke trip protocol/header 4.0.311 eller den eksisterende `>=4.0.311`-migrationsgrænse.
- Ejeren har godkendt præcis én rekonstruktion af Candidate G-morgenhullet som incident `RRGAP-2026-08-29-CANDIDATE-G-01`. Kun allerede afledt kystnormal strength mellem eksakte artifacts må interpoleres; ingen vejr, bølger, vandstand, rå U/V, koordinater, geometri, punkter eller private payloads.
- Rekonstrueret state er schema 2.1 med eksplicit trust, ikke kalibreringsegnet og ikke gyldigt observeret udtransportbevis. Normal measured-only state/fallback er schema 2.0 og uændret.
- Inspect/apply/rollback/cleanup, measured-only fallback, tripflags og releasekæden er bindende. Storagekandidaten sætter existing-D1/fresh Edge-predeploy-intent efter capacity/CAS. Existing D1 bruger 20-/30-minutters lease, femsekunders prober, 600 sekunders restlease og samlet syvminutters Worker-gate; partial Edge går D1 roll-forward. Fresh partial Edge går exact-main/Supabase-secret/eksakt Edge/dobbelt attest. Uden intent ingen recoverymutation. Dette historiske næste-trin blev afløst, da 4.0.312 blev merged og dens backend fejlede migrationssynken; fortsæt kun fra det aktuelle 4.0.314-checkpoint ovenfor med Sol/Ultra.
- Den integrerede næste model er fortsat separat under DEC-0102 og skal efter recovery integrere den nye grønne `main` samt bevare DEC-0109's trust-/provenancekontrakt uden generel interpolation. Den skal selv bevare én målt-only atomisk 210/673-nødstate i højst 72 timer og aldrig efter kortere forecastudløb. `calibration_eligible` er ikke serverbevist empirisk evidens; global koefficientlæring forbliver låst.

## Historisk arbejdscheckpoint 2026-08-24 – 4.0.273

- **Candidate G er den eneste tilladte offentlige scoremodel.** Den aktive formel er `20 % søgeforhold`, `50 % transport mod kysten` og `30 % rav i bevægelse`. `25/40/35` må kun bruges til historisk analyse og kan ikke vælges som offentlig reserve.
- Manglende eller usammenhængende Candidate G-grundlag håndteres lokalt: den konkrete zone, søgemåde og time får ingen score og udelades fra aktuelle og femdøgns-ranglister. Andre zoner fortsætter på Candidate G. Der må ikke lånes score fra en gammel model, moderzone, nabozone eller anden time.
- Adminforsiden viser, om alle zone-/søgemådekombinationer har en aktiv Candidate G-score. Hvis ikke, listes de berørte zoner, søgemåder og almindeligt forståelige årsager uden private payloads, rå strømvektorer eller koordinater.
- Produktionshydrering, tidligere state, kildeproveniens og releasegates er fortsat fail-closed. En mangelfuld produktion må stadig stoppe før publicering; lokal utilgængelighed er ikke tilladelse til at opfinde data eller svække gates.
- Ændringen er implementeret og målrettet lokalt valideret. Exact-head CI, frisk produktion og offentlig runtime er endnu ikke verificeret. Se DEC-0072. Ingen geometri eller land-/vandpunkter er ændret.

## Historisk produktionscheckpoint 2026-08-23

- **Aktuel produktionsverificeret 4.0.265:** Kontoen har **Indberet tur eller fund** uden forudgående turstart. Brugeren skal selv vælge dato og klokkeslæt for turens start samt varighed; dato og tid er ikke forudfyldt. Nutidens vejr bruges aldrig som historisk erstatning, og en efterregistrering uden sikkert snapshot gemmes i den eksisterende `observations`-tabel med `calibration_eligible=false`. **Afslut uden at indberette** rydder kun den lokale aktive tur. Se DEC-0064.
- PR #111 bestod exact-head `32658661075`, blev merged som `cb7d2232`, og produktion `32658724861` bestod frisk vejr, fuld validering, releasegate, Supabase og Pages. Live `rr-20260823184330-210` er version 4.0.265 på 210/673, og den udgivne formulars dato-/tids- og fravalgskontrakt er målrettet kontrolleret. En autentificeret indsendelse kræver fortsat ejerens bevidste handling, fordi den opretter en virkelig række.
- **Tidligere produktionsverificeret 4.0.264:** Kontoen fik **Mine ture og fund** som en begrænset RLS-læsning af de eksisterende `observations`-rækker. Der oprettes ingen ny tabel, serverrække eller kopi. Den direkte v2-tur erstattede den gamle GPS-baserede parallelrejse i UI, og login/magic-link-tekster samt centrale RavScore-ord blev forenklet. Se DEC-0063.
- PR #106 bestod exact-head `32652894729`, blev merged som `23fa89ed`, og produktion `32652970105` bestod hele kæden. PR #107 bestod exact-head `32654048944`, blev merged som `8b758337`, og produktion `32654119745` bestod igen frisk data, fuld validering, releasegate og Pages. Live `rr-20260823171804-210` er 4.0.264 på 210/673. Konto-/loginforklaring, direkte tur uden GPS/rute og offentlig tekst er browserkontrolleret. Den fulde 420/2.100/673-audit er grøn med UI og audit enige om `Vandstandsændring på 3 timer`.
- PR #108 bestod exact-head `32654780774` og blev merged som den rene dokumentationscommit `98621bf9`. Mergecommitten oprettede 0 push-produktionskørsler; den eksakte rodhåndbog er dermed bevist omfattet af docs-only-skip. Den seneste push-produktion er fortsat den fuldt grønne `32654119745`.
- I den produktionsverificerede 4.0.265-baseline er kun versionsfeltet løftet i de to geodatafiler. Geometri og land-/vandpunkter er uændrede.
- **Tidligere produktionsverificeret 4.0.263:** DEC-0062 retter profilgatens referencescope. Memory-/warmup-aktivering bedømmes ved den nærmeste fælles aktuelle scoretid pr. zone; senere prognosegaps må ikke retroaktivt slå den aktuelle Candidate G fra.
- PR #100/exact-head `32642456123`, merge `586fbd18` og produktion `32642532892` beviser DEC-0061's cadence. Live `rr-20260823134605-210` fortsatte 673/673 states uden replaymismatch og gav 110 positive mod 563 fysisk fortsat nul, men 4.0.262 valgte legacy, fordi den for brede gate også inspicerede senere prognoser.
- Pre-public opvarmning var kun gyldig ved aktuel `WINDOW_INCOMPLETE`. I 4.0.263 gav `LATEST_SAMPLE_MISSING`, `WINDOW_HAS_MISSING_EVIDENCE` og `WINDOW_HAS_TIME_GAP` global rollback. Denne historiske offentlige adfærd er erstattet af DEC-0072's lokale utilgængelighed.
- Hele femdøgnets Candidate G-scorecoverage kræves fortsat. PR #101/exact-head `32644701811`, merge `9f5953f6`, fuld produktion `32644772373`, live `rr-20260823142247-210`, aktiv shadow `32645569741` og browserkontrol er grønne. Candidate G er aktiv på 210/673 med 139 positive og 534 aktuelt fysiske nultransporter; replay- og visningsfejl er 0.
- Ejeren besluttede i DEC-0060 at aktivere Candidate G allerede under den første, ikke-offentlige opvarmning. 4.0.261 brugte `RESEARCH-3` med `20/50/30` og bevarede dengang `25/40/35` som global rollback. DEC-0072 har siden fjernet den offentlige rollback.
- Den ufuldstændige, men sammenhængende transporthukommelse blev vist ærligt som `candidate-active-pre-public-warmup`; den måtte ikke kaldes et 48-timersbevis. DEC-0072 erstatter kun fejlhåndteringen: et lokalt hul skjuler nu den konkrete score uden at skifte resten af landet til legacy.
- Profilvalget hydreres og skrives tilbage som det centrale admin-dokument `ravscore-profile-selection`. PR #97 aktiverede modellen; PR #98 lukkede den daværende shadowkontrakt; PR #99 registrerede den grønne browserkontrol. Disse gates fangede ikke cadencefejlen ovenfor og kan derfor ikke længere stå alene som scorebevis.
- Den gældende helhedsmodel er `RESEARCH-3`: `20/50/30`, DEC-0054's vindstyrede waders-jagtbarhed, DEC-0055's strømstyrede transport og DEC-0056's ene bølgeenergistyrede mobiliseringstilstand.
- Mobilisering bruger højde² × periode med fire timers opbygning og 48 timers aftrapning. Direkte vind, aktuel strøm, separat varighed og statisk stedegnethed giver ingen mobiliseringspoint.
- PR #92/exact-head `32628441062`, merge `c5898ce8`, produktion `32628516066` og live `rr-20260823083627-210` er grønne for 210/673/1.346 og browser 420/2.100/673. Statealderen er 9/9 timer uden nulstilling; det er ikke et 48-timersbevis.
- Den tidligere score-neutrale Candidate G-shadow lå væsentligt lavere end legacy, fordi den ubundne start 0 fortsat dominerede efter 65–117 timers historik. Ejeren afviste en vilkårlig startprior og valgte DEC-0059's faste 48-timers evidensvindue. State schema 2 genafspiller afledt kystnormal strøm fra samme rand og markerer missing/tidsgab. DEC-0060 erstattede kun kravet om komplet memory før den første pre-public aktivering; mekanikken er valideret med simulation og historisk replay, og der kræves ikke en ny 48-timers realtidsudviklingstest. Opret ikke en parallel model, og tillad aldrig automatisk aktivering.

## Verificeret startbaseline
- Applikationsversion: **4.0.117**.
- Aktuel `main` ved handoff: `a164b6e52fa18efc7209d90779048bb86bcf870a` (`RavRadar 4.0.117 codex handoff v2`).
- Historiske #1749/#1750 var grønne i deres daværende kontekst, men må **ikke længere bruges som bevis for den aktuelle handoff-baseline**. Efterfølgende fejlsøgning viste, at almindelige automatiske `workflow_dispatch`-kørsler kan springe de to fulde releasegates over og stadig deploye.
- #1760 kørte på `a164b6e…`, opdaterede DMI/weather/provenance/public runtime og deployede succesfuldt, men trinene `Validate full project after fresh weather and current provenance` og `Run release governance gate after refreshed data validation` var begge **skipped**. Derfor er #1760 et deploy-/datakædebevis, ikke et fuldt releasebevis.
- De centrale adminrettelser blev i #1750 hentet fra Supabase, anvendt på zoneregisteret og ført videre gennem vejrproduktionen.
- En senere kørsel skal altid vurderes som nyere evidens, men må ikke automatisk omskrive denne dokumenterede baseline uden analyse.

## Læs i denne rækkefølge før første ændring
1. `AGENTS.md`
2. `docs/rdks/00_READ_FIRST.md` og `docs/rdks/01_AI_OPERATING_RULES.md`
3. `docs/rdks/90_INDEX/CURRENT_TRUTH.md`
4. `docs/rdks/90_INDEX/IMPLEMENTATION_STATUS.md`
5. `docs/rdks/20_REQUIREMENTS/ACTIVE-REQUIREMENTS.md`
6. `docs/rdks/40_KNOWN_ISSUES/KNOWN-ISSUES.md`
7. `docs/ai/AI_KNOWLEDGE_BASE.md`, `AI_ARCHITECTURE_MAP.md`, `AI_WORKING_RULES.md`, `AI_ROADMAP.md` og `AI_LESSONS_LEARNED.md`
8. relevante beslutninger under `docs/rdks/10_DECISIONS/`
9. relevante dele af `HANDBOOK-RAVRADAR.md` og den aktive kode/testkæde
10. historiske chatfiler kun når en beslutnings begrundelse eller regression skal rekonstrueres.

## Første kontrol i en lokal Codex-session
Kør `git status`, `git log -5 --oneline` og kontroller `package.json`/`version.json`. Kør mindst `npm run validate:rdks` før dokumentationsarbejde og relevante målrettede tests før kodeændringer. Før release kræves hele den gældende validerings- og releasegate.

Før hvert væsentligt arbejdsafsnit skal Codex desuden anvende DEC-0031: vurder modelbehovet, anbefal aktivt en billigere aktuel model når kvaliteten er den samme, og stop senere for at anbefale Sol igen før kritisk arbejde. Kvote må aldrig sænke analyse- eller valideringskrav.

## Stabilitetsord
Brug ikke ordet **stabil** om noget, der kun er lokalt grønt. Skeln mellem:
- **lokalt valideret** – relevante lokale tests er grønne,
- **CI-valideret** – den relevante GitHub Actions-kørsel er grøn,
- **produktionsverificeret** – frisk produktionsdata, artifact/deploy og den berørte runtimekæde er faktisk verificeret.

## Hovedregel: tænk hele brættet
Når en fejl viser sig i ét led, må Codex ikke straks lappe dette led. Kortlæg først input, central konfiguration, scheduler, tidsbudget, cache, DMI-collection, GRIB-parser, komponentparring, interpolation/routing, provenance, score/state, public runtime, UI/admin, tests, artifact, deployment og browsercache. Sammenlign om nødvendigt med seneste fungerende version og identificér den introducerende ændring.

## Autoritative kilder
Aktuel brugerbeslutning og aktiv RDKS er kravgrundlaget. Git repositoryet er kodegrundlaget. Supabase er autoritativ for centralt gemte administratorændringer. DMI er autoritativ vejr-/havdatakilde. Håndbogen forklarer faglig og driftsmæssig betydning. Chatarkivet er historik.

## Stopklodser
Codex må ikke få tests grønne ved at genindføre stale vejrdata, konstruere manglende værdier som nul, bruge generelle regionale strømbånd, hardcode administratorredigerbare zonedata eller svække videnskabelige audits.

## Praktisk handoff
Brug `docs/ai/CODEX_HANDOFF_CHECKLIST.md` ved første lokale opsætning og før den første Codex-release.

Hvis `docs/ai/CURRENT_SESSION_HANDOFF.md` findes, skal den læses efter de obligatoriske RDKS-indeksfiler. Den beskriver den seneste sikre arbejdsgrænse, men kan aldrig tilsidesætte nyere brugerbeslutning, RDKS eller faktisk kode.

## P0 – første Codex-opgave før al videre udvikling
Workflowrettelsen er implementeret og produktionsverificeret i #1772: begge fulde gates kræver enhver positiv preflight, artifactet ligger efter gates, og samme friske run viste begge gates samt Pages-deploy som `success`.
1. Kontrollér den aktuelle workflowfil og bekræft gatebypasset: de to fulde gates er betinget af `push || force`, mens almindelig `workflow_dispatch` stadig kan nå artifact/deploy.
2. Ret workflowet systemisk, så et nyt produktionsartifact ikke kan deployes efter en frisk dataopbygning uden at de relevante fulde gates faktisk har kørt og bestået. Svæk ikke gates og ændr ikke RavScore/DMI-regler for at få grønt.
3. Kør lokale målrettede tests + `npm run validate` + `npm run release:gate`.
4. Commit/push workflowrettelsen fra Codex.
5. Følg den første friske GitHub-kørsel trin for trin. Den tæller kun, hvis de to gate-trin står som **success**, ikke `skipped`.
6. Hvis den bliver rød, analysér den konkrete runtimekæde og ret årsagen. Ingen ny større featureudvikling før en fuld streng produktionskørsel er grøn.

**Vigtigt:** Handoff-ZIP'en før Codex ændrer med vilje ikke workflowbetingelserne. Det er en midlertidig bootstrapmekanisme, ikke accepteret slutarkitektur.

## Permanent PR- og mergeautoritet
Codex må oprette, opdatere og selv merge datasikre PR'er fra egne RavRadar-branches, når hele den relevante validerings-, regressions-, dokumentations- og produktionskontrakt er verificeret. Grøn topstatus alene er ikke nok ved konkret modstridende evidens, og røde eller uafklarede gates må aldrig omgås. Efter merge følges deploy og produktion uden unødigt stop. Irreversible, destruktive, usædvanligt risikable eller ikke-godkendte produktbeslutninger kræver fortsat ejerens udtrykkelige godkendelse. Se `docs/rdks/01_AI_OPERATING_RULES.md` og `docs/ai/AI_WORKING_RULES.md`.

## Lokal Codex-klargøring og kildekontrol
- På en frisk Windows/Codex-runtime køres scripts/setup-codex.ps1 én gang. Scriptet installerer projektets tre eksisterende Python-afhængighedssæt og ændrer ikke repositorydata.
- Under udvikling køres målrettede tests. Den fulde validate:source skal bestå på PR'ens eksakte head i GitHub; den gentages kun lokalt ved bred risiko, manglende CI eller konkret fejlevidens.
- Push og manuelle produktionsbyg kører fortsat den tidlige kildekodegate. Planlagte vejropdateringer på samme allerede kontrollerede main-kode springer kun denne gentagelse over.
- validate:source er aldrig en erstatning for den fulde npm run validate og npm run release:gate, som fortsat skal køre efter central hydrering og frisk vejr før ethvert deploybart artifact.
- Fuld browserkontrol er hændelsesstyret: ugentligt eller ved ændret UI, score eller offentlig datakontrakt. Se DEC-0045.
- Midlertidige runtime-shims skrives kun i systemets temp-mappe og må ikke stages.
# NYESTE CHECKPOINT – 2026-09-16 – lokal 4.0.394 sorterer hele Open-Meteo-resten

4.0.393 bestod sourcegate `35130086861`, PR #337 og providerfri deploy
`35130668700` som main `88ecda1ecde879123b208da0732ddd16b3be3e7a`.
Normalrun `35131237007` gemte alle providercacher og byggede
`READY_WITH_MISSING`: DMI 39.309, Copernicus 6.560, regional DMI 944,
Open-Meteo 32.463 og 138 lokale `MISSING`.

History-adapteren stoppede igen, fordi 4.0.393 samlede alle positive
Open-Meteo-par før missing-parrene. Validatoren kræver én samlet allerede
sorteret rest; virkelige huller ligger mellem positive timer. Lokal 4.0.394
sorterer hele positive+missing-listen efter validTime/partId. Testen lægger
bevidst et hul før en senere positiv værdi og er grøn. Scheduler er pauset.
Næste: docs/version, push, én exact-head, merge, providerfri code-only og én
almindelig weather på gemte cacher. DEC-0177. Sol/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-16 – lokal 4.0.395 Feggesund-lokalisolation

4.0.394 er live som main `b67459b0` efter exact-head `35137196497`, PR #338
og providerfri deploy `35137798403`. Normalrun `35138332481` beviste både
current closure og syvdøgnshistorik, men stoppede senere på Feggesund 336
direct + 0 proxy + 18 missing.

4.0.395 bevarer eksakt 354-positioners direct/proxy/missing-bevis. Et ærligt
missing bliver lokalt `UNAVAILABLE` i stedet for at stoppe hele landet;
forkert antal, ukendt disposition, invalid provenance eller tamper stopper.
De målrettede DMI- og 210/673-runtimeaudits er grønne.

DMI voksede ikke: 39.309 → 38.660 ved to timer nyere target. Cacherne er
gemt; næste normale kørsel skal måle fortsættelsen uden oneoff. Fortsæt
docs/version/geodatabevis, én exact-head, merge, providerfri code-only og én
normal weather. Scheduler forbliver pauset. DEC-0178. Sol/Ekstra høj.

# NYESTE CHECKPOINT – 2026-09-16 – lokal 4.0.396 prognosemetadata

4.0.395 er live som kode efter sourcegate `35146153044`, PR #339, main
`349a2702` og code-only `35146689278`. Normalrun `35147366418` gennemførte
providerkæde, closure og historik, men stoppede før deploy på inkonsistent
winning-part-usikkerhed.

Rodårsagen er tabt `partial-zone`-metadata i `buildLocalZoneScore`, ikke en
forkert score. 4.0.396 bevarer status, spredning, delantal, manglende dele og
modelbinding. Den målrettede public-forecast-regression er grøn. Fortsæt med
versions-/RDKS-bevis, én exact-head, merge, code-only og én normal weather på
gemte cacher. Ingen oneoff; scheduler pauset. Sol/Ekstra høj.

Exact-head `35155765121` beviste alle øvrige kritiske led og stoppede kun på
den gamle RavScore-hash. Aktuel lokal closure er genbundet i rækkefølgen
rollback `da27b811…` og integrated `d9ba75ed…`
med append-only migration `20260917001500`; anvendt migrationshistorik er
ikke omskrevet. Fortsæt med målrettet bevis og én ny exact-head.
# NYESTE CHECKPOINT – 2026-09-17 – lokal 4.0.403 fortsætter den gemte vejrpakke

4.0.402 bestod exact-head 35203813380, PR #346 og providerfri deploy
35204369048 som main 0132900c. Normalrun 35205052150 gennemførte DMI,
Copernicus, Open-Meteo, cache, closure, historik, offentlig runtime,
uafhængig audit og 52+3-kontroller. Den validerede private runtime for
2026-09-17T09:00:00Z blev gemt centralt.

Runnet stoppede derefter i beskyttet adminsynkronisering, fordi scriptet
kaldte den udefinerede stableDigest. Pages blev ikke nået. Lokal 4.0.403
retter dette til den delte stabile JSON-digest og tilføjer en eksplicit
providerfri fortsættelse af præcis den nyere gemte runtime. Ruten kræver
aktiv integreret model, tomt repair-id, alder højst 240 minutter,
source-ancestry, 210/673, privacy og normal Pages-kontrol.

Næste: slut dokumentation/måltests/geodatabevis → én exact-head → merge →
saved-weather-continuation → levende prognose- og scorekontrol. Ingen
providergentagelse eller oneoff. Scheduler pauset. DEC-0185. Sol/Ekstra høj.
# AKTUELT CHECKPOINT – 2026-09-22 – lokal 4.0.465 timefilbinding

Main `90256510`/4.0.464 deployede grøn providerfri kørsel `35771214115`,
men offentlig prognose/rangliste forsvandt. Det valgte datasæt var den nyere
centrale 19:00-generation, ikke den tidligere offentlige 16:00-generation.
Timefilens ydre modelbinding var aktuel; indre scorefelter bar gammel bundle.
Browseren afviste den korrekt. Normalrun `35773937409` blev annulleret før
leverandører og deploy. Lokal 4.0.465 genbinder indre metadata i eksakt
post-cutover-migration og stopper mismatch i Pages-preflight. Bundlen er
uændret. Næste: målrettede versions-/RDKS-kontroller, exact-head PR, merge,
én almindelig vejropdatering og offentlig 118-timers/browserkontrol. Den
centrale 19:00-pakke er endnu ikke repareret; påstå ikke at siden er hel.
# AKTUELT CHECKPOINT – 2026-09-22 – 4.0.465 live genopretning

Arbejd i indlejret `node_modules/RavRadar-4.0.396`, branch
`codex/4.0.465-public-hour-nested-binding`, PR #427. Normalrun
`35778530384` på gammel main gennemførte tre leverandører, cache, runtime,
artifact og Pages. Browseren viser igen prognose og rangliste. Runnet blev
rødt alene ved den umiddelbare offentlige slutkontrol: Pages serverede endnu
forgængerens manifest. Det offentlige manifest matcher nu det forseglede
handoff, og præcis samme verifier bestod 210/673 efter udbredelse.

Lokal PR-rettelse forlænger det afgrænsede Pages-retry til cirka tre minutter
og tester forsinket manifest. Bevar alle eksakte hash-/model-/privacykrav.
Næste: målrettet RDKS/version, commit/push, én ny exact-head-PR-kontrol,
merge, og følg næste normale cron uden at genhente vejret kun for denne
statusfejl. Untracked `.tmp-420/` og `.tmp-run-*` må ikke stages.
# AKTUELT CHECKPOINT – 2026-09-23 – lokal 4.0.466 Pages-hash

Arbejd i indlejret `node_modules/RavRadar-4.0.396`. 4.0.465/PR #427 er
merged som main `0f7b2ed0`. Normalrun `35778530384` gemte vejr, deployede
offentligt dataset `rr-20260922210147-210` og genskabte rangliste og
prognose. Det blev rødt, fordi Pages endnu serverede forgængerens manifest
under kort slutretry; senere bestod samme eksakte offentlige verifier.

Providerfri standardrun `35791092708` stoppede på korrekt observeret
offentlig/central identitetsforskel. Eksakt saved-weather-recovery
`35791637412` fra handoffet kom gennem kildebevis, beskyttet runtime,
genopbygning og artifact uden leverandørkald, men stoppede før Pages-begin.
Rodårsag: workflowet sendte råbyte-SHA-256 fra `code-only-reuse.json` til
`assertMonotonicPagesGeneration`, som kræver kanonisk JSON-SHA-256. Faktiske
hashes for den samme offentlige pakke var henholdsvis `a3568136…` og
`75985e1e…`; det nye target var `544358de…` kanonisk. Lokal 4.0.466
gemmer begge kildehashes og bruger den kanoniske i begge Pages-gates. Bevar
rå bytekontrol, source/target-binding og stop ved ukendt/ældre pakke.

Næste: måltests, version/RDKS, exact-head PR, merge; kør så én providerfri
`DEPLOY-SAVED-WEATHER-REPAIR` med `recover_public_run_id=35778530384` og
attempt 1. Følg Pages og central completion, derefter næste normale cron.
To state-replay-afvigelser og 51/673 dele uden direkte strøm i sidste
normalrun er åbne fund. Untracked `.tmp-420/` og `.tmp-run-*` må ikke stages.
# AKTUELT CHECKPOINT – 2026-09-23 – lokal 4.0.472, helkædebevis åbent

4.0.471 er på `main` (`9927d09c`). Providerfri `35855497915` anvendte
og læste `20260923110000` tilbage, genbrugte den nyeste private
vejrpakke og byggede 673-dels checkpointet. Den beskyttede database
afviste det med `HTTP_400_22023_INPUT_INVALID` før Pages; der blev
ikke hentet nyt vejr. Lokal 4.0.472/DEC-0243 retter yderligere
JS/SQL-modstrid for ærligt manglende scorehistorik i en append-only
migration `20260923120000`, med uændret streng READY-regel og kun
summeret sikker fejldiagnose. Ingen leverandør- eller datadækning er
hermed bevist rettet.

Næste: målrettet slutkontrol, én exact-head-CI, merge, én providerfri
kodelevering fra senest gemte cache, derefter én normal vejrkørsel.
Mål eksakt cachelineage og DMI/Copernicus/Open-Meteo for havstrøm,
lokal vind, bølger, vandstand og temperatur hver for sig. Senest
observeret: 5.201 havstrømspar mangler, CP har 0 anvendte par,
Open-Meteo har 47.996. Cron forbliver pauset; bevis stabil autonom
vedligeholdelse over flere normale kørsler før genaktivering. Usporede
`.tmp-*` er analysefiler, ikke releaseindhold.
# AKTUELT CHECKPOINT – 2026-09-23 – lokal 4.0.473, præcis stopårsag søges

4.0.472/PR #434 bestod exact-head `35858302147` og blev merged som
`9b29183c`. Providerfrit main-run `35858910881` genbrugte den aktuelle
private vejrpakke og anvendte migration `20260923120000`, men stoppede
igen før beskyttede writes og Pages på checkpoint-RPC'ens `INPUT_INVALID`.
Sikker formdiagnose viste 673 integrerede tilstande med nul tomme
evidensrækker og nul seneste målinger før referencen. 4.0.472's
manglende-sidste-time-hypotese var altså ikke den udløsende livefejl.
Ingen nye vejrdata eller Pages blev publiceret af denne kørsel.

Lokal 4.0.473/DEC-0244 tilføjer en isoleret, skrivefri og kun service-role-
tilgængelig diagnose-RPC. Den er en eksakt semantisk kopi af de anvendte
SQL-validatorer, men returnerer kun faste regelkoder og summerede antal;
ingen ID, tider, vejrvektorer eller payload vises. Den eksisterende CAS,
dens afvisning og datakrav ændres ikke. Næste: målrettet kontrol, én
exact-head CI, merge, providerfri genbrug af samme private vejrpakke for
præcis regelkode; ret først derefter den beviste kontraktfejl. Ingen ny
normal vejrkørsel før denne leveringsbarriere er afklaret. Sidste
normale havstrømsopgørelse: DMI 25.793, regional DMI 424, Copernicus 0,
Open-Meteo 47.996, manglende 5.201 af 79.414. Vindhalens og de øvrige
vejrtypehullers fremgang er endnu ikke livebevist. Cron er pauset.
# AKTUELT CHECKPOINT – 2026-09-23 – lokal 4.0.474, diagnose i afgrænsede portioner

4.0.473/PR #435 bestod exact-head `35862513968` og blev merged som
`4e7a9c71`. Providerfri main-kørsel `35863417067` installerede og
læste den skrivefri diagnosemigration tilbage, genbrugte præcis samme
private vejrpakke og genbyggede offentlig runtime. Den beskyttede CAS
afviste igen checkpointet med `INPUT_INVALID`; den nye diagnose
returnerede blot `UNAVAILABLE` efter cirka 10 sekunders samlet trin.
Årsagen til diagnosens manglende svar er endnu ukendt. Ingen nye
vejrdata, private checkpointwrites eller Pages blev publiceret.

Lokal 4.0.474/DEC-0245 ændrer kun diagnoseklienten: den sender de
allerede lokalt validerede 673 integrerede og private ledsagertilstande
i højst 32 kystdele pr. skrivefrit RPC-kald og summerer kun faste
regelkoder. Delmængden afvises bevidst som *hel* pakke (P02), mens
SQL-helperen uafhængigt klassificerer dens enkelte tilstande. En
eventuel HTTP-/transport-/svarfejl får nu en ufølsom klasse i stedet
for blot `UNAVAILABLE`. CAS, databaseaccept, vejr, scoreformel og
geometri ændres ikke. Næste: målrettede kontroller, exact-head CI,
merge, én providerfri kørsel på samme cache. Ingen normal weather før
checkpoint-/leveringsstop er forklaret og rettet. Cron er pauset.

# AKTUELT CHECKPOINT – 2026-09-23 – lokal 4.0.475, diagnosefejl afgrænset

4.0.474/PR #436 blev merged efter grøn exact-head `35865765502`.
Providerfri main-run `35866710973` genbrugte samme aktuelle private
vejrpakke, byggede checkpoint med 673 tilstande og stoppede igen på
beskyttet CAS `INPUT_INVALID` før Pages. Diagnose-RPC'ens svar blev
forkastet af *vores klient* som `RESPONSE_REASON_SHAPE`; SQL-årsagen
er altså stadig ukendt. Ingen nye vejrdata eller offentligt deploy.

4.0.475 ændrer kun denne skrivefri diagnoseklient: den faktiske
673-delsregel prøves først, en ikke-kanonisk respons får afgrænset
32-delsfallback, og kun godkendte faste fejlkoder/antal logges.
Ukendte svarfelter tælles anonymt. CAS-accept, datakrav, score,
vejrdata og geometri er uændrede. Lever næste korte forsøg fra samme
cache, ret den beviste SQL-kontraktfejl og mål først derefter normal
vejrhentning for alle felter. 5.201 er kun sidst observeret havstrøm;
DMI/CP-fordeling og autonom stabilitet er fortsat åbne. Cron er pauset.

# AKTUELT CHECKPOINT – 2026-09-23 – lokal 4.0.476, SQL I04 målt

4.0.475/PR #437 er på `main` efter exact-head `35870444432`.
Providerfri `35871154038` genbrugte samme private vejrpakke,
byggede 673 tilstande og stoppede fortsat før Pages, men diagnosen
viste nu `P02`/otte `I04`. Kode/SQL-krydstjek viser, at den anvendte
SQL forbyder en senere **null**-evidenstime under dokumenteret
regional DMI-fastholdelse. JS-replay bevarer korrekt den time som
MISSING, ikke som ny strøm. Lokal 4.0.476/DEC-0246 tilføjer kun
append-only validator- og diagnosekorrektion; en senere numerisk
værdi uden ny verificeret måling er stadig forbudt.

Næste: målrettede checks, én exact-head CI, merge og én kort
providerfri fortsættelse fra samme cache. Hvis checkpoint og Pages
lykkes, kør normal weather med særskilt DMI/Copernicus/Open-Meteo-
og komponentopgørelse. 5.201 er stadig kun sidste havstrømsrest;
vindhalens og øvrige vejrfelters dækning er ikke bevist. Cron pauset.

# AKTUELT CHECKPOINT – 2026-09-23 – lokal 4.0.477, P04-id-rettelse

4.0.476 er merged som `76801468`. `35878951916` genbrugte den
aktuelle private pakke uden providerkald: de otte I04 er væk,
men privat Candidate G-ledsager afvises som P04 før checkpoint/Pages.
Den anvendte skrivefri Candidate G-diagnose returnerede ved
ikke-READY et boolsk udtryk i stedet for en fast C-kode; derfor
blev 22 delrapporter anonyme »ukendte koder«. Lokal 4.0.477
retter dette til C07/C08 i append-only SQL. Yderligere krydstjek
påviste, at privat ledsager bruger den frosne Candidate G-pakkes
v2-id, men anvendt SQL fejlagtigt krævede det integrerede controller-
overgangs-id v3. Ny append-only `20260923160000` retter kun denne
id-sammenligning i validator og diagnose. Alle andre CAS-krav,
score, kildevalg, vejrdata og tre-timers Limfjord-hold bevares.

Næste: målrettede tests, én exact-head, merge og ét providerfrit
run fra samme private pakke. Bevis checkpoint/Pages og saml eventuelle
andre sikre C-koder for 673 dele, og
fortsæt derpå normal vejrhentning felt for felt. Cron pauset.
# AKTUELT CHECKPOINT – 2026-09-24 – lokal 4.0.483 tydelig rangliste

4.0.482/PR #444 er merged som `131f92f0`. Normalrun `35954069186`
gennemførte DMI, Copernicus, Open-Meteo, cachegemning og Pages med
offentligt dataset `rr-20260924045351-210`. Feltvis sammenligning,
leverandørandele og reel cachefremgang er endnu ikke afsluttet; grøn
drift er ikke bevis for komplet vejr. Cron er pauset.

Lokal 4.0.483 ændrer kun de to top-5-listers præsentation: den store
områdescore og rækkefølgen bevares, og bedste lokale RavScore vises
mindre med ejerens godkendte enkle forklaring. Målrettede ranking-/
sprogtests er grønne. Næste: slut version/RDKS/geodatadiff, exact-head,
merge og målrettet offentlig desktop-/mobilvisning. Ingen ny
vejrindsamling alene for UI-ændringen. Fortsæt separat feltvis
vejranalyse før næste normale run.
# Aktuelt checkpoint 2026-09-24 – lokal 4.0.484

4.0.483 er online efter kode-only `35967586655`, med uændret
4.0.482-vejrpakke og verificerede to tal i “Bedste områder”.
Normalrun `35954069186` gemte/deployede, men fire vejrtypehuller
består og Copernicus' særskilte bølge-/temperaturled tilføjede nul.
Det er ikke det samme som Copernicus' havstrømsled, som fik en
fire minutters krypteret kvalitetstur til næste run. Lokal 4.0.484
synliggør kun sikre årsagstal i GitHub-loggen. Først måltest, RDKS,
exact-head, merge og kode-only; dernæst én normalrun uden overlap,
eksakt feltvis før/efter og årsagsbestemt rettelse. Cron er pauset.
Se CURRENT_TRUTH og ACTIVE_ROADMAP.
# NYESTE CHECKPOINT – 2026-09-24 – lokal 4.0.487

4.0.486-UI-branchen/PR #448 er udvidet til 4.0.487, fordi næste
normalrun `36009816840` på uændret 4.0.485-main fejlede før deploy.
DMI, Copernicus, Open-Meteo, strøm-lukning og strømhistorik lykkedes;
krypteret privat vejrprogress blev gemt. Scorehistorikkens to
verificerede bølger for samme time havde forskellige signaturer,
og replay stoppede. Eksakt providerpar er ukendt. Lokal rettelse bruger
DEC-0210's DMI-first/96-timers kildevalg også her, men kun efter
replayets præcise bølgebevis. Modelbundle og scoreformel er uændrede.
Måltest grøn. Næste: dokumentation/version, exact-head PR #448, merge,
én normal ikke-overlappende kørsel fra seneste beskyttede progress;
kontroller fem felter, cache og Pages. Cron pauset. Det gamle
4.0.486-afsnits »aktivt run« er erstattet af dette resultat.
# AKTUELT CHECKPOINT – 2026-09-26 – 4.0.490 kandidat

Main er 4.0.489/`0c6a901c`. Kort run `36183093672` nåede hele
vejr- og prognosebygningen, men no-loss afviste 34 tidligere gyldige
vandtemperaturfelter kl. 07 UTC 26/9. Fire andre vejrtyper havde
nul tab. Ny krypteret fremdrift `36183093672-1` blev gemt, men
privat produktionscache og Pages blev ikke opdateret.

Lokal 4.0.490 forener verificerede komponenter fra beskyttet cache
med den krypterede fremdrift og bevarer særskilt beskyttet DMI-donor.
Måltests er grønne, men det er ikke bevist, at dette forklarer de 34.
Efter ejerens beslutning: exact-head PR-kontrol, sikker merge og én
kort normalrun; spor samtidigt tabets konkrete oprindelse. Ingen
lange runs eller cron før end-to-end-bevis. Tidligere checkpoint
nedenfor er historisk.
