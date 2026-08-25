# RavRadar – overlevering til næste chat

## Kandidat 4.0.279 – offentlig Om RavRadar-side

- Ny offentlig side er implementeret og linket i topmenuen ved konto, tur og Rav-assistent.
- Siden forklarer ejer, formål, scorebegrænsning, landsdelsforskel, modelkompromiser, kontakt og frivillig støtte.
- MobilePay Box `4214MX` og den godkendte betalingsadresse bruges som tekstlink og klikbar QR-kode.
- Begge ejerbilleder ligger som responsive WebP-varianter; siden er tospaltet på pc og enspaltet på mobil.
- Siden og aktiverne ligger i appskallen. Målrettet kontrakttest er grøn.
- Versionen er sat til 4.0.279. Særskilt diff viser kun topversionsfelt 4.0.278 → 4.0.279 i `data/kystdata.json` og `data/zones.geojson`; næste skridt er exact-head, merge, produktion og offentlig pc-/mobilkontrol.
- Ejeren har stående godkendt fremtidige rene versionsfeltsynkroniseringer i de samme to filer, når diffkontrollen beviser, at intet andet geodata ændres. Der skal derfor ikke spørges igen ved en ren versionssynkronisering.
- Candidate G, score, vejr, zoner, geometri, land-/vandpunkter, admin-data og brugerdata er urørte. Se DEC-0076.

## Produktionslukket 4.0.278 – Regelværksted pensioneret og zonestatus rettet

- Regelværkstedet var ikke en sikker vej til offentlig score: dets øjeblikstest kunne ikke validere Candidate G's 48-timersstate, lokale datagater, transport-nul, wadersloft eller øvrige invariants.
- Regelværksted, Vidensbase, regelrettigheder og den offentlige regelfil fjernes fra den aktive kæde. Historiske centrale og lokale kladder bevares urørt uden runtimeeffekt.
- Eksperten indsender fortsat faglige kommentarer i håndbogen. Accepterede scoreændringer går gennem Candidate G-kode, RDKS, målrettede tests, exact-head, produktion og offentlig kontrol.
- Hele ekspert-håndbogen er rettet mod Candidate G 20/50/30, aktiv 48-timersstate, lokal fail-closed og fraværet af legacyfallback. Se DEC-0075.
- PR #146 bestod exact-head `32844951668` på `432de975`, blev merged som `8facd2d8`, og produktion `32845130587` bestod fuld validering, releasegate, artifact og Pages.
- Live `rr-20260825120459-210` viser 205/210 aktive zoner. Fem zoner er korrekt lokalt utilgængelige; 657/673 kyststrækninger er READY, 16 er `WINDOW_INCOMPLETE`, og alle 673 statefortsættelser er accepteret uden reset.
- Candidate G 20/50/30 er eneste offentlige profil uden rollback eller legacyfallback. Landsstatus bruger den fælles aktuelle reference, så senere lokale prognosehuller ikke lukker current-status globalt.
- Aktuel liste og alle fem prognosedage er kontrolleret for strand og waders. Alle bruger særskilte værdier; tre prognosedage har forskellig top-5-rækkefølge. Stor overlapning er forventelig, fordi transport og rav i bevægelse er fælles.
- De offentlige topfelter i `data/kystdata.json` og `data/zones.geojson` er 4.0.278. Opfølgningen ændrer ingen score, geodata, geometri eller land-/vandpunkter.

## Produktionslukket 4.0.277 – native tretimerskadence

- Den seneste naturlige produktion stoppede sikkert på 666/673 ved en mellemtime. Historikken var ikke tabt.
- Rodårsagen var todelt: readiness talte en fremtidig regionalproxyprøve som aktuel, mens Candidate G skrev den naturlige mellemtime som manglende evidens.
- 4.0.277 gør alle valg årsagstro. DMI/Copernicus kræver eksakt tid; kun de otte godkendte `dkss_lf`-proxyer må fastholde den seneste afledte transporttilstand i højst tre timer.
- Fastholdelsen tilføjer ingen bevægelse, evidens, U/V, hastighed, retning eller pil. Næste ægte prøve bruger den faktiske tidsafstand. Over tre timer stoppes lokalt.
- Candidate G 20/50/30 er eneste offentlige profil. Scorekurver, zoner, geometri, punkter og central admin er urørte.
- PR #140 bestod exact-head `32816129342` og blev merged som `d3b4542f`. Produktion `32816237198` byggede historik, vejr og runtime grønt, men stoppede før deploy på en forældet statisk dæknings-test.
- PR #141 rettede kun testkontrakten, bestod exact-head `32817501003` på `128c71ce` og blev merged som `81e9b891`. Produktion `32817626537` bestod frisk vejr, fuld validering, releasegate, artifact og Pages.
- Offentlig 4.0.277 viser 673/673 Candidate G-states, 673 accepterede fortsættelser, nul resets og 12–45 timers naturlig historik. Candidate G 20/50/30 er eneste profil uden rollback eller legacyfallback.
- Ved kontrollen var 0/210 zoner aktive, fordi den længste kæde var 45 timer. Næste handling er kun naturlig overvågning af passage over 48 timer; der må ikke bygges kunstig historik eller ændres score, geometri eller punkter. Se DEC-0074.

## Produktionslukket 4.0.275 – Candidate G-only med lokal fail-closed zonestatus

- Ejerbeslutning: Candidate G 20/50/30 er eneste offentlige scoremotor. Der findes ingen offentlig 25/40/35-fallback eller rollback. Manglende evidens gør kun den konkrete zone/søgemåde/tid utilgængelig.
- Adminforsiden viser **ALLE AKTIVE** eller en dataminimeret liste over berørte zone-/søgemådepar og almindelige danske årsager. Resten af Danmark fortsætter Candidate G.
- PR #134 og #135 lukkede først de offentlige legacyveje og den centrale legacyoverskrivning. 4.0.273 og 4.0.274 blev ikke udgivet, fordi deres produktioner stoppede sikkert før deploy.
- PR #136 bestod exact-head `32778118765` på `8103143c018253861a154f9fce5b7d937572a166` og blev merged som `59ea4546f3505ed96d2512a9bf5c9925ff7dff2a`.
- Produktion `32778269487` bestod central hydrering, frisk vejr, fuld validering, releasegate, beskyttet adminsynkronisering, artifact og Pages. Live `rr-20260824211701-210` er 4.0.275 på 210/673.
- Live manifest har Candidate G som ønsket og aktiv profil, `rollbackProfileId: null`, forbud mod legacyfallback og lokal fail-closed availability. Den gamle 25/40/35-model kan ikke vende tilbage automatisk.
- Ved slutkontrollen var 0/210 zoner aktive, fordi den krævede sammenhængende 48-timers strømhistorik endnu ikke var komplet. Adminforsiden viser alle berørte zone-/søgemådepar og årsagen. Der vises ingen gammel eller opdigtet score; hver zone bliver aktiv, når dens eget grundlag er komplet.
- Næste naturlige driftskontrol skal kun følge, at antallet af aktive zoner vokser, når historikken bliver komplet. Et lokalt hul må fortsat kun holde den konkrete zone/søgemåde utilgængelig.
- Geometri og land-/vandpunkter blev ikke ændret.

## Produktionslukket 4.0.272 – scorekollaps efter tabt Candidate G-fortsættelse

- Den landsdækkende lave score skyldes, at en planlagt produktion fortsatte efter timeout i den atomiske hentning af offentligt manifest/conditions. Alle 673 dele startede derefter med `NO_PREVIOUS_STATE`.
- Sidste grønne 4.0.271-artifact har 673/673 accepterede fortsættelser og normal scorevariation. Det er den eneste godkendte recoverykilde.
- Branchen `codex/candidate-g-state-recovery-4.0.272` gør hydreringen fatal, afviser global nulstart og genoptager kun kompakt Candidate G-state fra én eksakt Actions-kørsel efter streng del-/model-/type-/tids-/integritetskontrol. Den aktuelle nulstillede fortsættelseslinje genkendes uden at være låst til ét senere datasæt-id og bliver straks inaktiv, når historikken er genindsat.
- Scoreformel, vægte, vejr, zoner, geometri og land-/vandpunkter er ikke ændret. Kun geodatafilernes versionsfelt følger releasen fra 4.0.271 til 4.0.272.
- Punktpar 2 blev senere flyttet af ejeren. Én efterfølgende kystdel manglede en komplet frisk offentlig vejrrække; det er separat og må ikke løses ved at låne strøm fra moderzone/nabo.
- PR #131/merge `1bbb4cc2` indførte recoveryen. PR #132/merge `392fea15` bevarede den ældre hydratorindgang uden runtimeændring. Produktion `32761751284` bestod den fulde kæde og udgav `rr-20260824183620-210` som 4.0.272 på 210/673.
- Offentlig top-5 varierer igen 76, 74, 72, 72 og 71; femdøgnslisten sorterer 86, 84, 83, 76 og 76. Det tidligere landsdækkende 17/18-kollaps er lukket.
- Runtime har 672 accepterede states, én lovlig lokal kontekstreset efter punktpar 2 og otte aktuelle missing-evidence-huller, som også fandtes før nulstillingen. Den viser derfor midlertidigt den samlede 25/40/35-reserve. Næste naturlige kontrol skal overvåge disse otte huller; ingen ny score- eller geodatarettelse er begrundet af kollapset.

## Produktionslukket 4.0.271 – samlet feltrettelse af grundbogen

Implementeret og offentligt verificeret:
- offentlig grundbog og målrettet test,
- ekspert- og webhåndbog,
- DEC-0070, forskningsnotat, aktive krav, indeks og changelog,
- versionsløft uden ændring af score, vejrdata eller geometri.

- PR #128 bestod exact-head `32742727246` og blev merged som `a723ae8c`.
- Produktion `32743307402` stoppede fail-closed før deploy ved en manglende læsehjælp i det nye eksperthåndbogskapitel.
- PR #129 bestod exact-head `32745213320`, blev merged som `499861e8`, og produktion `32745389504` bestod hele kæden og udgav 4.0.271.
- Den levende `learn.html` er målrettet kontrolleret for pil, opdriftsforklaring, bundnær strøm, revlehuller, fjernet grus, adskilt vind/strøm og speciallygter.
- Ingen score-, vejr-, geometri-, zone- eller land-/vandpunktsdata blev ændret ud over det allerede godkendte versionsfelt.

> Produktionsbevis: PR #126 blev merged som `fda934ae`. Den eksakte mergeproduktion `32730674577` (#3522) bestod hele kæden og udgav Pages-artifact `9521472172` samt supportartifact `RavRadar-support-3522` (`9521463897`).

## Produktionslukket 2026-08-24 – 4.0.270 før-lancering

- Naturlig 210/673-produktion, Supabase Free-plan, admin, eksperthåndbog og rettigheder er kontrolleret. Ingen private payloads, koordinater eller rå strømvektorer er udstillet.
- Den synlige rangering er rettet uden at genindføre ekstra lotterilodder: toplisterne viser den samme afrundede områdescore, som DEC-0049 sorterer efter. Den falske adminstatus for `coastline-overrides` er også rettet.
- Begge håndbøger beskriver den aktive 20/50/30-model, installationsfilen synkroniseres med hele webhåndbogen, og livehåndbogen trevejsflettes, så godkendte centrale ekspertændringer ikke overskrives.
- PR #122 bestod exact-head `32721778498` på `a885bc5b` og blev flettet som `abe10127`. Produktion `32721891349` bestod de fulde kode- og datagates, men stoppede før Supabase- og Pages-deploy ved den første beskyttede håndbogssynkronisering: central håndbog var ændret, og en tidligere kildebaseline fandtes endnu ikke.
- PR #123 bestod exact-head `32724526697`, blev merged som `00f59456`, og produktion `32724616331` bestod alle kode-, data- og releasegates. Den stoppede fortsat sikkert før deploy, fordi den slanke Pages-pakke ikke udgiver håndbogens kildefil.
- PR #124 bestod exact-head `32726897134`, blev merged som `fd7bc868`, og produktion `32727025187` bestod alle øvrige gates, men stoppede fortsat før deploy: hashkontrollen beviste, at manifestet stammer fra den senere produktionsgrønne 4.0.269-dokumentationsmerge.
- PR #125 bestod exact-head `32728525467` på `3fe579ab`, blev merged som `7861079b`, og produktion `32728654553` lukkede den beskyttede første migrering med `source-update`, aktiv Candidate G-readback, fulde gates, supportartifact og Pages.
- PR #126 rettede alene den aktive browseraudits forældede vandstandslabel og bestod exact-head `32730584569` på `01853d21`; offentlig brugerflade, score og data blev ikke ændret.
- Den gentagne fulde 4.0.270-liveaudit bestod 210 zoner, 673 kystdele, 420 aktuelle og 2.100 femdøgnsvisninger med nul kontrol-, konsol-, side- eller HTTP-fejl.
- Efter den tekniske lukning mangler den virkelige eksterne ekspertgennemgang samt domæne-, HTTPS-, Supabase-redirect- og fuld brugerflowprøve på `ravradar.dk`.

## Lukket checkpoint 2026-08-24 – 4.0.268 offentlig grundbog

- **Grundbog i ravjagt** er udgivet i `learn.html`/`learn.css` og tilgængelig fra forsiden. Den lærer ravjagt fra havbund til fund, før RavRadar forklares.
- Normal offentlig tekst i forside, scorepanel, Rav-assistent, login, konto, tur og fejl er gennemgået og gjort mere forståelig. Admin-/debugværktøjer er fortsat bevidst tekniske.
- Målrettede tests låser emnedækning, faglig rækkefølge, aktiv `20/50/30`, waders-kurve, udtransportregel, mobilopsætning, bølge-/strømroller, kilder og almindeligt sprog.
- PR #116 og #117 stoppede to forældede ordrette testkontrakter før deploy. Den samlede rettelse bestod PR #118 exact-head `32672522334` på `8faccce3` og blev merged som `3c22e40b`.
- Produktion `32672578127` bestod hele kæden. Live `rr-20260823230848-210` er version 4.0.268 med 210 zoner og 673 kystdele.
- Den offentlige browseraudit bestod 420 aktuelle, 2.100 femdøgns- og 673 kystdelsvisninger uden kontrol-, konsol-, side- eller HTTP-fejl. Lokal desktop og 390×844-mobilvisning bestod uden vandret overløb.
- Score, Candidate G, vejrdata, Supabase-kontrakt, geometri og land-/vandpunkter er urørte; geodatafilerne ændrer kun versionsfelt til 4.0.268.
- Næste chat skal begynde fra ren `main` efter den afsluttende docs-only-merge. Næste produktarbejde vælges ud fra det aktive roadmap; 4.0.268 skal ikke genåbnes uden ny modstridende evidens.

## Akut checkpoint 2026-08-23 – 4.0.267 uploadhotfix

- Ejerens oprindelige og nye manuelle kontoindberetning var ikke synlige efter 4.0.266. Aggregeret Supabase-kontrol viste 0 nye rækker; turindhold blev ikke læst.
- Første rodårsag var den aktive tabels manglende POST-only-felter `forecast_target_at` og `report_accuracy`. Central databevarende hotfix er anvendt og begge felter er efterkontrolleret.
- Genindlæsningen gav stadig nul ture, og API-loggen viste GET uden POST. Den fælles klientkontrol afviste den krævede tomme værdi `gps=null` før lokal lagring. Det ramte både kontoindberetning og **Start ravtur → Slut ravtur**.
- 4.0.267 tillader kun lokationsfelter med værdien `null`; faktiske GPS-, positions- og rutedata er fortsat blokeret. De to tidligere forsøg nåede ikke outboxen og skal indberettes igen efter udgivelsen.
- 4.0.267-branch versionsstyrer migration, test, RDKS og changelog. Exact-head, merge og produktion skal færdiggøres før lukning, hvis tiden tillader det.

## Nedlukningscheckpoint 2026-08-23 – 4.0.266 login og privat turlog

- PR #113 bestod exact-head `32662085932` på `bd3b4984` og blev flettet som `db4db876`.
- Produktionskørsel `32662155582` bestod central hydrering, frisk vejr, fuld validering, releasegate, artifact og Pages. Den almindelige adresse viser 4.0.266.
- Supabases Site URL og tilladte redirect er den aktuelle GitHub Pages-adresse. Når `ravradar.dk` tages i brug, skal begge auth-adresser ændres i samme deployment og prøves med et nyt magic link.
- Et nyt magic link returnerede til RavRadar uden token i den afsluttende adresse. Kontoen blev indlæst, og **Mine ture og fund** hentede uden fejl gennem den private SELECT-policy.
- Codex-browseren viste nul ture. Det er forventet, fordi ejerens tidligere efterregistrering ligger i den oprindelige Chrome-browsers lokale outbox, som en anden browser ikke kan se.
- Første og eneste resterende P0-trin: genindlæs den oprindelige Chrome-fane, mens brugeren er logget ind, og kontrollér at turen eftersendes og vises i **Mine ture og fund**. Opret ikke en testtur og læs ikke private turdetaljer.
- Score, Candidate G, `20/50/30`, geometri, land-/vandpunkter, artifact, protected-dirty-data og private caches er urørte. Geodatafilerne fik kun versionsfeltet 4.0.266.

## Aktuel 4.0.263-P0 – Candidate G's aktuelle referencegate

- 4.0.262-produktion `32642532892` beviste cadence-rettelsen med 673/673 fortsatte states, nul replaymismatch og 110 positive transportpotentialer. Profilen rullede alligevel tilbage til legacy, fordi en senere prognosegapstatus blev brugt som aktuel warmup-gate.
- DEC-0062 lader memory-/warmup-gaten følge den nærmeste fælles aktuelle scoretid pr. zone. Fuld Candidate G-scorecoverage over hele prognosen består; missing/gap ved den aktuelle reference giver stadig global rollback, mens senere gaps håndteres fail-closed i deres egen state.
- 4.0.263 er produktionslukket gennem PR #101/exact-head `32644701811`, merge `9f5953f6`, fuld produktion `32644772373`, live `rr-20260823142247-210`, aktiv shadow `32645569741` og grøn 420/2.100/673-browserkontrol. Candidate G er aktiv på 210/673 med nul reset, replay-, score- eller visningsfejl.

## Aktuel 4.0.262-arbejdsbaseline – Candidate G cadence-rettelse

- **P0 reproduceret og rettet lokalt:** Den aktive 4.0.261-runtime har transport 0 i 673/673 dele, fordi native tre-timers beviser blev afvist af én-times-gaten. DEC-0061/4.0.262 accepterer højst tre timer, integrerer den faktiske tid uden kunstige mellemtimer og afviser fortsat større eller manglende gab.
- Pre-public opvarmning er kun lovlig med `WINDOW_INCOMPLETE`; latest-missing, missing inde i vinduet og tidsgab giver global legacyrollback gennem `candidateWarmupEligible=false`.
- Målrettede tests er grønne. Dataminimeret gammel-state-replay giver 110 positive og 563 fortsat nul; det gamle artifact får 658 forventede replaymismatch. Exact-head, frisk fuld produktion, aktiv 210/673-shadow og browserkontrol mangler endnu.
- Ejeren har i DEC-0060 godkendt øjeblikkelig Candidate G-aktivering, selv om det første schema-2-vindue endnu ikke har 48 timers naturlig historik. Siden er endnu ikke offentlig, og de foreløbige scoreværdier er accepteret.
- Startbaselinen er `main` på merge `328b4d7c` fra PR #99. Arbejdsbranch er `codex/candidate-g-transport-cadence-fix`. 4.0.262 bruger fortsat `RESEARCH-3` med `20/50/30`; modelreglerne er uændrede, og legacy `RRS-CURRENT-B0-4.0.247` er global rollback.
- Den private centrale konfiguration hedder `ravscore-profile-selection`. Den må promoveres centralt én gang med versions- og ejerbinding; derefter er central samme/nyere konfiguration autoritativ.
- Aktivering under ufuldstændig memory kræver stadig komplette Candidate G-scoreprojektioner for alle nødvendige rækker. Runtime skal vise `candidate-active-pre-public-warmup` og faktisk `WINDOW_INCOMPLETE`; én manglende projektion giver global legacyfallback.
- PR #97/exact-head `32636378576`, merge `0f7a9d5f` og produktion `32636433944` beviser aktivering, central readback og live 210/673. PR #98/merge `fd69f8a0`, produktion `32637387600` og shadow `32637833674` lukkede auditkontrakten. PR #99/merge `328b4d7c` registrerede den fulde 210/673/420/2.100-browserkontrol uden fejl.
- Ingen artifact, protected-dirty-data, private cachedata, geometri eller land-/vandpunkter er rørt. Kun versionsfeltet må ændres i `data/kystdata.json` og `data/zones.geojson`.

Den naturlige memoryopbygning følges som driftsevidens, ikke som ny implementerings- eller aktiveringsgate. Repræsentative ture og hold-out er senere efterkalibrering.

## Aktuelt checkpoint 2026-08-23 – 4.0.260 score-neutral produktion grøn

- PR #92/exact-head `32628441062`, merge `c5898ce8` og produktion `32628516066` er grønne. Live `rr-20260823083627-210` består 210/673/1.346, manifestintegritet og 420/2.100/673-browseraudit uden fejl.
- Candidate G er ikke aktiveret; legacy `25/40/35` er fortsat ønsket, aktiv og rollbackprofil, og automatisk aktivering er falsk.
- 673/673 tilstande blev videreført uden nulstilling til 09:00Z, svarende til 9/9 timer fra bootstrap 00:00Z. Det er praktisk evidens, ikke et 48-timersbevis.
- Candidate G ligger aktuelt væsentligt lavere end aktiv score. Næste opgave er ejerreview af scorefordelingen og den unge transport-/mobiliseringstilstand, ikke central aktivering.
- Bootstrapauditten viser, at problemet ikke løses ved blot at vente: 65–117 timers eksisterende historik efterlader 607/633 dele med mindst 50 points afhængighed af startprioren. Neutral startprior 50 anbefales til ejerbeslutning; den er ikke implementeret.
- Privat cache, protected-dirty-data, geometri og land-/vandpunkter må fortsat ikke berøres.

## Afslutningscheckpoint 2026-08-20 - online browserkontrol grøn

- Live index og bootstrap er 4.0.237; senest auditerede datasæt er `rr-20260819213342-210` fra grøn naturlig produktion `#3237`.
- Chromium klikkede gennem 210 zoner, 673 kystdele, 420 aktuelle visninger og 2.100 femdøgnsvisninger med 0 mismatch i score, farve, pile, forklaringer, lokal vinderkontekst og debug-ID.
- Browser-pluginet blev forsøgt først og fejlede i trusted-code-path. Chromium-fallbacken var tidligere ejer-godkendt.
- Eneste HTTP-fejl var favicon 404; ingen page errors.
- Evidens: `data/diagnostics/online-browser-audit-4.0.237-20260820.json` og `data/diagnostics/ONLINE_BROWSER_AUDIT_4.0.237_20260820.md`.
- Spark-kørslen i den gamle desktopkopi er forkastet. `codex/browser-zone-audit-20260820`/`526509f2` må ikke flettes.
- Næste driftspunkt er højst daglig syvdøgnseftermåling; fortsæt derefter næste ikke-blokerede roadmappunkt. De fire beskyttede dirty datafiler må fortsat ikke ændres eller stages.
- Dagens cacheeftermaaling er udfoert: pilot `#58` har 37 gyldige timer, 23.273 poster, 625 maal og 629 maal/kilde-par med nul gitter-/lagustabilitet. Planlagt `#59` dubletskippede korrekt uden artifact. Naeste maaling tidligst naeste kalenderdag; 168 timer er ikke naaet.
- Produktion `#3237` bestod readiness, hele `build-and-prepare` og Pages-deploy. Den fulde 420/2.100-browseraudit blev derefter gentaget grønt på det nye datasæt.
- Separat mobil-/desktopaudit er grøn ved 390 × 844 og 1440 × 900 uden overflow, page errors eller funktionelle HTTP-fejl. Evidens: `data/diagnostics/online-responsive-audit-4.0.237-20260820.json`.

## Afslutningscheckpoint 2026-08-19 – GitHub alene, 30 timers cache og browservej

- Ejeren har slettet/deaktiveret RavRadar-jobbene i cron-job.org. Efter denne overdragelse bestod GitHubs egen naturlige produktion `#32272470720`, cachebevaring `#32272473716` og `#32272598725` samt Copernicus-pilot `#32273634626`. GitHub Actions er dermed eneste normale scheduler.
- Den naturlige produktion frigav live datasæt `rr-20260819155614-210` gennem current-hour-readiness, frisk bygning, præcis 673/673, fuld `validate`, releasegate, Supabase og Pages. Sikker liveaudit fandt 210 zoner, 673 dele, 420 aktuelle visninger, 2.100 femdøgnsvalg og 673 pile uden kontraktbrud; 1.956 femdøgnsvisninger havde lokale data, mens 144 var korrekt mærkede mangler/fallbacks.
- Den private cache fra `#32273634626` har nu 30 gyldige timer, 18.870 poster, 625 unikke mål og 629 mål/kilde-par med nul gitter- eller lagustabilitet. `scoreImpact=false`, `publicRuntime=false` og 168 timers retention er bevaret, og cachen har overlevet efterfølgende DMI-cachearbejde. Det fulde naturlige 168-timersvindue er fortsat åbent og kontrolleres højst dagligt.
- Næste chat forsøger først den installerede Browser-plugin og diagnosticerer native-host/trusted-code-path. Hvis den fortsat ikke virker, og diagnostikken ikke giver en konkret reparationsvej, har ejeren udtrykkeligt godkendt Chromium/Playwright som fallback til den systematiske online DOM-/kliktest af kort, pile, vinderområde, beskrivelser, score og debug for alle 210 zoner og 673 dele.
- Arbejd kun i `C:\Users\jakob\AppData\Local\Temp\ravradar-40232-current`. De beskyttede dirty filer `data/diagnostics/current-spatial-audit-4.0.76.json`, `data/diagnostics/state-reference-zones.json`, `data/diagnostics/zone-geometry-audit.json` og `data/live/coastal-parts-v2.json` tilhører ejeren og må ikke ændres eller stages.

## Produktionsverificeret 4.0.237 – én komplet aktuel time pr. zone

- Metadataaudit af det nuværende 210-zone/673-dels livegrundlag viser en komplet fælles række i alle zoner, men den hidtidige runtime havde kun 642/673 dele på deres zones nærmeste komplette time. 31 dele brugte en anden nær-time.
- 673/673-kildegaten er fortsat gyldig og uændret. Den nye særskilte regel er, at den viste lokale sammenligning låses pr. zone til én eksakt komplet time; der kræves ikke én national klokktime for hele landet.
- 4.0.237 beregner `currentReferenceAt`, bygger delens current/flowpunkt på den tid og fører referencen gennem offentlig runtime, manifest, fletning og frontend. Nærzoom viser kun tidsjusterede lokale pile.
- Målrettede regressioner for 210 zoner, 673 dele, 2.100 femdøgnsvisninger, pile, DMI og Copernicus er grønne. Commit `9c971bc1` og `#32264833170` bestod frisk 673/673, fuld `validate`, releasegate, Supabase og Pages.
- Direkte liveaudit af `rr-20260819143933-210` fandt 210/210 komplette zoner og 673/673 dele på zonens valgte `currentReferenceAt`; 196 zoner bruger 15:00Z og 14 bruger 14:00Z. Start-/detailhashes matcher, `controlled-live` er aktivt, og historikken er credentialfri med 168 timers retention.
- Ejerens land-/vandpunkter er ikke flyttet eller omskrevet. De fire kendte dirty datafiler og alle untracked verify/cachefiler må ikke stages.

## Produktionsverificeret 4.0.236 – lås hele schedule-kørslen til readiness-timen

- Naturlig schedule `#32249924919`/`#3217` godkendte den komplette 11:00-time kl. 11:59, men den tunge bygning krydsede kl. 12 og valgte derefter 12:00. De 43 Copernicus-dele manglede på den nye time, så den uændrede gate stoppede sikkert ved 630/673 før releasegate, Supabase og Pages.
- 4.0.236 eksporterer `current-hour-readiness`-timen og sætter den som `RAVRADAR_PRODUCTION_TARGET_HOUR` for hele `build-and-prepare`. Live-pilot og vejrbygning bruger dermed samme eksakte time gennem hele kørslen.
- Push og bevidst manuel release uden readiness-output bruger fortsat nutiden og alle fulde gates. Ingen punkter, geometri, U/V, pile, score, kilder, afstande eller dækningskrav er ændret.
- Ny timegrænseregression og målrettede workflow-/DMI-/heartbeattests er grønne. Den fulde centrale validering er efterfølgende afsluttet, senest i `#32264833170` på 4.0.237.
- GitHubs egne naturlige events er igen leveret og grønne. Ejeren har siden slettet RavRadar-jobbene i cron-job.org, og efter-deaktiveringsbeviset er produktion `#32272470720`, cachebevaring `#32272473716`/`#32272598725` og pilot `#32273634626`.
- De tre allerede dirty diagnostik-/geometrifiler samt `data/live/coastal-parts-v2.json` er ejerens og må ikke stages. Untracked verify/cache-filer må heller ikke medtages.

## Produktionsverificeret 4.0.235 – én sammenhængende lokal visning

- Browser-P1 er implementeret lokalt: én lokal visningskontekst bærer del, tid, score, forklaring, debug og vejr gennem nuvisning og femdøgnsfaner.
- National prognose og zonepanel bruger samme `selectLocalBestForDay`; runtime bevarer vinderdelens kompakte præsentationsfelter pr. fælles time.
- Manglende lokal post låner ikke hovedzoneværdier. En ufuldstændig fælles lokal række vises som tydeligt mærket, samlet hovedzonefallback.
- Syntetisk landsregression består for 210 zoner, 673 dele, begge jagtformer og 2.100 femdøgnsvisninger. `#32249770288`/`#3216` bestod derefter frisk central 673/673, fuld validering, releasegate, Supabase og Pages.
- Live datasæt `rr-20260819115558-210` er metadata-, hash- og runtimeverificeret. Audit af 420 aktuelle og 2.100 femdøgnsvisninger fandt kun komplette lokale kontekster eller eksplicitte samlede hovedzonefallbacks.
- Ingen ejerpunkter, geometri, U/V, pilceller, scoreformel, kildeorden, afstandsgrænser eller dækningskrav er ændret. De tre dirty diagnostik-/geometrifiler samt `data/live/coastal-parts-v2.json` må ikke stages.
- Faktisk DOM-/kliktest af den online side er fortsat åben. Forsøg og diagnosticér Browser-pluginet først; hvis der ikke findes en konkret reparationsvej, bruges den ejer-godkendte Chromium/Playwright-fallback. Der må ikke laves en RavRadar- eller registryomvej.

## Produktionsverificeret 4.0.234-drift

- Begge godkendte driftsrettelser er implementeret lokalt: GitHub-ejet plan `14,29,44,59 * * * *` med fail-closed kontrol af den aktuelle private Copernicus-time, samt tabsfri komprimering og integritetskontrol af den beskyttede Supabase-`runtime-diagnostics`-payload.
- Copernicus-piloten kører ved minut 06, så dens time kan være klar før første produktionsforsøg. Manglende time giver et billigt sikkert skip; den normale produktion må stadig kun frigive præcis 673/673 efter DMI ≤5 km → Baltic ≤5 km → AMM15 ≤5 km → otte ejerallowlistede `dkss_lf`-proxyer ≤15 km.
- Overgangens almindelige cron-job.org-`workflow_dispatch` bruger nu samme current-hour-gate, så et hel-timeskald uden den nye Copernicus-time udsættes uden rød release. Push og en bevidst manuel `force=true`-release bevarer hele kæden.
- Arkivet indeholder hele originalen som deterministisk gzip/base64 med SHA-256 og bytekontrol. Admin-download dekoder og verificerer filen efter sædvanlig adgangskontrol. Den målte repræsentative størrelse er 208.874 bytes mod 4.014.169 bytes kompakt original.
- Lokal RDKS, version, geometri-v2, runtimeuafhængig testmatrix og releasegate er grønne. Commit `7409d461` er fast-forwardet til `main`; pushrun `#32237507059`/`#3202` bestod frisk central geometri, fuld validering, releasegate, 673/673, Supabase på otte sekunder, Pages og deploy. Overgangscommit `4ab7a659` bestod derefter i pushrun `#32242510084`/`#3207` og eksterne gentagelser `#3208`/`#3209`.
- Det første nye naturlige GitHub-`schedule`-event `#32244914347`/`#3210` bestod hele kæden. Ejeren har siden slettet cron-job.org-jobbene, og de efterfølgende native runs `#32272470720`, `#32272473716`, `#32272598725` og `#32273634626` beviser overdragelsen uden ekstern scheduler.
- Eksternt hel-timeskald `#32245473213`/`#3211` beviste samtidig den nye sikre udsættelse: readiness var grøn, mens build, Supabase og Pages blev sprunget over. Dokumentationspush `#32245605472`/`#3212` bestod derefter hele den centrale kæde.
- Der er ikke ændret ejerens land-/vandpunkter eller anden geometri.

## Start her

Læs `AGENTS.md`, `docs/ai/CODEX_START_HERE.md`, den obligatoriske RDKS-kæde samt DEC-0024, DEC-0029, DEC-0030, DEC-0031, DEC-0037, DEC-0038, DEC-0039, DEC-0040, DEC-0041, DEC-0042, DEC-0043 og DEC-0044. Kontrollér derefter gitstatus, seneste commit og GitHub Actions.

## Aktuel sandhed

- **Den åbne browser-P1 er nu kun den faktiske visuelle DOM-/kliktest, ikke projektets data- eller runtimekobling.** En fuld Chromium-audit 2026-08-18 bekræftede 210 zoner, 673 dele, 622 DMI + 43 Copernicus + 8 godkendte proxyer, ejersource = runtimepunkt for 673/673 og korrekte U/V-retninger/pilceller inden for tolerancen. Ingen land-/vandpunkter blev ændret.
- Den tidligere blanding af hovedzonens vejrkort med den lokale vinderdels score, forklaring og debug er rettet og produktionsverificeret i 4.0.235. Zonepanelet, femdøgnspanelet og national prognose bruger nu samme lokale del/tid/vejrpost eller en samlet, eksplicit hovedzonefallback.
- Det historiske 20:00-eksempel med ufuldstændige rækker i `DK-B05-12`, `DK-B05-17` og `DK-B05-18` er nu afklaret som et zonevist udvælgelsesproblem, ikke som behov for én national fælles time. 4.0.237 vælger nærmeste komplette række særskilt pr. zone og bevarer fortsat 673/673-kildegaten.
- **Den zonevise current-reference er afsluttet:** 4.0.237 er centralt og live produktionsverificeret som beskrevet øverst. Næste browsertrin er den faktiske systematiske visuelle kontrol: Browser-plugin og målrettet diagnostik først, derefter Chromium/Playwright hvis der ikke findes en brugbar reparationsvej. Brug fortsat GPT-5.6 Sol med Ekstra høj til slutkontrollen.

- Ejeren har godkendt kontrolleret live-aktivering af Copernicus/regionalproxy på den nuværende ikke-offentlige side. Gyldige U/V-data, fuld provenance og nye pile må publiceres; kun credentials forbliver hemmelige. Syvdøgnsstabiliteten eftermåles live.
- 4.0.237 er gældende produktionsverificeret liveversion. Commit `9c971bc1` og `#32264833170` bestod frisk central geometri, vejrbygning, 673/673, fuld validering, releasegate, Supabase og Pages. Direkte liveaudit af `rr-20260819143933-210` kontrollerede 210/210 komplette zoner og 673/673 tidsjusterede dele; den tidligere 4.0.233-anker-/pilintegritet er bevaret.
- Den aktive runtime bygger en separat online `data/live/current-pilot-history.json`, fletter eksakt DMI-first strøm til RavScore og kort og placerer hver pil på den valgte posts faktiske kildecelle. Normal gate er fortsat 673/673.
- `data/current-live-pilot-control.json` giver en auditerbar `dmi-only-rollback`, som fjerner supplementet fra score/pile og lader berørte strømme være `missing`, mens friske vind-, bølge-, vandstands- og øvrige prognoser fortsætter. Rollback må ikke kalde reduceret dækning fuld.
- Commit `5a7780e4` og central `#32158041877`/support `#3127` har bestået præcis 673/673, fuld validering, releasegate, Supabase, Pages-artifact og deploy. Det første aktiveringsdatasæt `rr-20260818160548-210` blev direkte HTTP-/hashverificeret live med 673 scorede dele og credentialfri historik. Efterkontrol `#32160090899`/support `#3129` bestod igen hele kæden og live artifactmatch.
- Næste operation er at følge den naturlige live-drift i syv døgn uden at tage siden offline. Gentag også den visuelle kliktest af farver, prognoser og pile, når Codex' lokale browser-plugin igen kan starte; artifact-, hash- og HTTP-beviset er allerede grønt.

- Commit `cda7358b` med collectoren, `161ba79e` med liveintegrationen og `5a7780e4` med den kanoniske regionale anchorvalidering er på `main`. Seneste deploy er `controlled-live`, ikke DMI-only.
- #3079 efter ejerens fulde centrale punktgennemgang gav 622/673 lokale DMI-strømpunkter. Alle 51 mangler er auditeret.
- Autentificeret privat Toolbox-run `#32129799346` bekræftede på friske centrale punkter Baltic-par til 39/51 og AMM15-par til yderligere fire. Alle 43 var dybere end øverste lag ved 11:00Z. Samlet potentiale er 665/673; en privat timeplan samler nu op til syv døgns flerruns-bevis.
- DEC-0041 og `data/current-regional-proxy-policy.json` tillader kun otte vestlige Limfjordsdele at bruge nærmeste `dkss_lf`-par op til 15 km. Den aktive pipeline og fulde 673/673-kæde er produktionsverificeret; alle øvrige dele beholder 5-km-grænsen.
- Den aktive kildeorden og de otte regionale proxyer er implementeret bag fulde gates. Pushrun `#32129778162` er historisk bevis for det gamle 622/673-stop; `#32158041877` er det nye produktionsbevis for 673/673-runtime og deploy.
- Run `#32131021153` bekræftede cachegendannelse, deduplikering og rekursivt sikker flerrunsrapport på commit `406353be`: 629 records, én gyldig time, 625 unikke mål, nul mål/kildepar med grid-/lagskift og ingen rå U/V. Første cron-event er siden bevist i #32134686185; to tider i samme cache afventer keepalive og backfill.
- Central `#32134021410`/artifact `#3094` beviste private `dkss_lf`-data til alle otte regionale mål: 32 prøver ved fire forecasttider, 5,416–12,110 km, dybere lag til alle mål, ingen rå U/V i supportrapporten og ingen `.cache` i artifactet. Offentlig dækning forblev 622/673 som tilsigtet.
- #32134021410 stoppede sikkert før deploy, fordi én test stadig forventede workflowets gamle User-Agent 4.0.229. Testen følger nu `package.json`; rettelsen er centralt verificeret i #32135079819.
- Rettelsen er pushed som `d00d55bc`; #32135079819 passerede den og stoppede først ved den uændrede 622/673-gate uden deploy.
- Første faktiske Copernicus-cron #32134686185 var grøn ved 12:00Z, men 11:00Z-råcachen var blevet LRU-fortrængt af cirka 10,2 GB Actions-cache med flere 2,5 GB DMI-generationer. Restore-only keepalive er pushed i `0224ea6a`; #32136328681 ramte 12:00Z, #32136391556 samlede 1.258 records ved 11/12 UTC uden grid-/lagskift eller supportlæk, og #32136642330 ramte den nye cache. Første automatiske keepalive og næste naturlige time skal fortsat kontrolleres. En artifact med råcache er forkastet, fordi repositoryet er offentligt.
- Den faktiske gamle audit brugte stadig 95 %/640. Ejerens nyere 100 %-beslutning er nu kode: alle aktuelle kystdele, aktuelt 673/673, kræves. Den nye statiske regression forbyder 95 %-formlen, og #3094-replay stopper korrekt på 622/673.
- Commit `9e2164b8` og #32139054129 beviser det centralt: regressionen passerer, auditten skriver “622/673; alle 673 kræves”, og releasegate/Supabase/Pages springes over.
- GitHub leverede ingen automatisk keepalive før næste DMI-save; #32139755594 fandt derfor den private Copernicus-cache væk igen. Produktionsworkflowet har nu en restore-only pre-DMI-refresh uden rå log/upload. #32140001424/#32140470201 har genopbygget 11/12 UTC og to-timersbeviset; næste DMI-/pilotkontrol skal bevise, at dette lukker LRU-hullet.
- `b6cf0383`/#32140865173 lukkede DMI-delen af beviset: cache-hit før DMI, ny 2,905-GB DMI-save, Copernicus-cache stadig til stede, begge nye regressioner grønne og fortsat 622/673-stop uden deploy. #32141443152 ramte samme cache bagefter. Næste naturlige pilot skal bevise, at historikken også udvides videre.
- Manuel aktuel-time-pilot #32141772134 har allerede udvidet den sikkert til 1.887 records ved 11/12/13 UTC uden grid-/lagskift eller supportlæk. Første nye naturlige schedule-event efter rettelsen er stadig et særskilt åbent driftsbevis.
- Den private syvdøgnsgrænse er nu også dækket af normal releasevalidering: præcis 168 timer, deduplikering, beskæring af ugyldige restoreposter og fail-closed kontrol af nye lokale samme-tid/celle/lag-U/V-poster. Det naturlige fulde syvdøgnsvindue er fortsat åbent og må ikke erklæres bevist af fixturetesten.
- `7f22e8e1`/`#32143798560` CI-verificerede retentiontesten og den fortsatte 673/673-kontrakt; den faktiske 622/673-audit stoppede før Supabase/Pages, og Copernicus-cachen overlevede DMI. Næste bevis er naturlig schedule-/syvdøgnsdrift.

### Historiske mellemtrin – ikke aktuelle opgaver

- 4.0.230/4.0.228 nedenfor er historiske mellemtrin, som er erstattet af den produktionsverificerede 4.0.233. #2872 viste dengang, at Havknude havde gyldig NSBS-strøm 2,804 km væk, men blev blokeret af det gamle fælles havmodelvalg, fordi IDW var valgt til skalare felter 5,131 km væk.
- Strøm vælges nu pr. native tid på tværs af alle aktive DKSS-collections, uafhængigt af vandstand/temperatur: nærmeste komplette U/V-kolonne først, dybeste lag i samme kolonne bagefter. Parser v18/semantik v3 genopbygger gammel strøm selektivt.
- RavScore, administratorpunkter, 5-km-grænse og geografisk gate er uændrede. Havknude-regressionen og berørte målrettede tests består; fuld lokal og central produktionsvalidering mangler.
- #2872 fortsatte privat rotation til cursor 240 med 873 prøver/469 ankre/179 dele. 36 af 77 offentlige mangler var besøgt: én pipelinefejl ≤5 km, 4 ved 5–6 km, 5 ved 6–8 km, 23 over 8 km og 3 uden observeret U/V; 41 afventer rotation.
- 4.0.229 var den første kandidat, der rettede “dybeste lag globalt” til “nærmeste vandkolonne først, dybeste lag i samme kolonne” og håndhævede højst 5 km, men dens globale havmodelvalg var stadig utilstrækkeligt.
- Samme aktuelle samplingpunkt, U/V-koordinat, forecasttid og dybdelag kræves gennem bulkcache, forecast, score, provenance og pil. Gamle strømdata invalideres, og direkte ForecastEDR-strøm uden samme bevis, Open-Meteos overfladestrøm samt anden fallbackstrøm lukkes ude før historik, scoring og kort.
- Dybdelaget vælges pr. native forecasttid; interpolation kræver samme lag, celle og run. Pilen bruger den valgte times egen celle. Centralt reviewede kystdelspunkter bygges før DMI, og cache genbruges kun for uændrede samplingpunkter.
- En privat syvdøgnscache genbruger DKSS ved 0/5/15 km og flere lag uden score- eller public-runtimepåvirkning. Helhedsmodellen er permanent gemt i DEC-0040 og DEC-0029.
- #2853–#2855 gentager 187/210 verificerede hovedzoner og 596/673 lokale kystdele. #2855 har 20.924 verificerede timer, 3.856 `non-dmi-current`-timer og nul kendt pil/grid-mismatch blandt verificerede poster. De 23/77 rester er `null` uden pil.
- Den private cache har 491 prøver for 153 ankre/58 dele og er fortsat 168 timer, score-neutral og ikke offentlig. #2855 tilføjede ingen dubletter fra det uændrede modelrun.
- #2855 afdækkede, at cursoren ikke gik videre på `unchanged-valid`, og #2859 beviste LRU-gabet ved cursor 90/491 prøver/58 dele. Efterrettelsen er nu bevist: #2863 brugte tre bootstrapfiler/29,8 MB og nåede cursor 105/531 prøver/73 dele; #2864 genbrugte samme tre filer med nul download og nåede cursor 120/573 prøver/88 dele; #2866 fortsatte til cursor 150/667 prøver/118 dele. Alle var score-neutrale og ikke-offentlige. DMI's aktuelle STAC-href er efterkontrolleret som stabil; objektsti-ID er fremtidssikring.
- Rotationens coverage-audit registrerer afstand/koordinat/lag til nærmeste eksakte fælles U/V-kolonne uden at gemme fjerne U/V-værdier. Den private ejeroversigt skelner ≤5 km-pipelinehul, 5–6 km rent manuelt geometrireview, 6–8 km modelhul og >8 km strukturelt modelhul. #2869 beviser nul `uMps`/`vMps`, cursor 195, 755 prøver/157 dele og 11 målte af de 77 aktuelle mangler: 2/4/5 i de tre afstandsklasser; 66 afventer rotation. Den flytter aldrig punkter.
- Produktionsgaten er ikke sænket. 4.0.229 er ikke deployet; næste beslutning er fortsat punktrettelser til fuld dækning eller en udtrykkelig fail-closed deldækningspolitik.

- 4.0.228 er produktionsverificeret i #31913779486/#2835 på commit `93b8c0216821d02bf913f7aab369406ba2365fe9` med central adminhydrering, frisk DMI, fulde gates, Supabase og Pages.
- Fra zoomniveau 9 viser kortet flere lokale vind- og strømpile, men kun ved kystdelenes egne eksakt parrede DMI-U/V-gitterpunkter. Vindkilden kan være HARMONIE eller den faktisk anvendte DKSS-`wind-tail`-serie og mærkes særskilt.
- Fjernzoom bevarer hovedzonernes oversigtspile. Fallbackankre og kunstige kopier må ikke skabe ekstra tæthed.
- Den fulde detaljepakke opdaterer automatisk pilelaget. DMI-værdier, forecast, RavScore, historik og geometri er uændrede.
- Produktcommit `bb1892e4072deb77dbc83a203587221c666013d2` førte først til #2830: forsøg 1 stoppede på en delvis Limfjordshentning med 629/673 lokale strømpunkter; forsøg 2 nåede 670/673, men stoppede før Pages på gentaget Supabase `57014`.
- Artifactauditten fandt derefter, at DKSS-`wind-tail-u/v` ikke blev ført til lokale vindpunkter. Commit `93b8c021` rettede transporten. #2835-artifact og livefiler har 670 eksakte strøm- og vindpunkter uden mismatch, 461/544 unikke gitterpunkter og matchende manifesthashes.
- Livebrowseren havde nul konsolfejl og viste 54 pile på oversigten mod 87 efter to zoomtrin.

## Ejerens parallelle arbejde

- Ejeren har afsluttet den landsdækkende gennemgang af land-/vandpunkter og vandstandskilder. De centralt godkendte værdier er autoritative og hydreres før hvert frisk produktionsbuild.
- Fem-døgnsdækning og historikanalyse er midlertidigt udsat, indtil mere naturligt datagrundlag er opsamlet. Dataopsamling og eksisterende gates fortsætter; intet må bagudfyldes eller skjules.

## Første opgave i næste chat

1. Forsøg Browser-pluginet og diagnosticér native-host/trusted-code-path målrettet. Hvis det fortsat fejler uden en konkret reparationsvej, brug Chromium/Playwright som ejer-godkendt fallback.
2. Gennemfør derefter den systematiske online DOM-/kliktest af kort, farver, pile, vinderområde, beskrivelser, score og debug for alle 210 zoner og 673 kystdele. Flyt eller omskriv ingen land-/vandpunkter som led i testen.
3. Fortsæt samtidig den godkendte syvdøgnsovervågning højst dagligt uden at tage siden offline. Dokumentér kun nye milepæle eller reelle fejl; log aldrig rå U/V eller credentials.
4. Bevar normalrækkefølgen DMI ≤5 km → Baltic ≤5 km → AMM15 ≤5 km → kun otte ejerallowlistede `dkss_lf`-proxyer ≤15 km, eksakt samme tid/celle/lag og præcis 673/673. Ved reproducerbar dataintegritetsfejl bruges `dmi-only-rollback` gennem fulde gates.
5. Når det naturlige 168-timersvindue er afsluttet, dokumentér slutbeviset i RDKS og vælg derefter næste særskilt godkendte roadmapopgave. Fem-døgnsdækning og den store RavScore-/strømfeltsanalyse er fortsat udsat, indtil datagrundlaget er tilstrækkeligt.

## Beskyttede beslutninger

- Ét autoritativt land-/havpunktpar pr. aktiv kyststrækning; bugtede kyster vurderes repræsentativt af ejeren.
- Flere kortpile kræver flere faktiske dokumenterede DMI-gitterpunkter; pile må ikke kopieres eller flyttes.
- Central adminstatus er autoritativ, `missing` forbliver `missing`, og ingen gate må svækkes for at få grønt.
- Kritisk arbejde udføres med GPT-5.6 Sol og Ekstra høj indsats.
# DEC-0030-status 2026-08-20

Aktiv kodekandidat retter verifikationsmaerket i timeskarp historik: brug `productionReferenceAt`, fallback til `generatedAt`. Produktionsbevis `#3242` har 64 raa proever/30,903 timer, men falsk fastlaast verificeret spaend paa 22,563 timer. Maalrettede tests er groenne; frisk central produktion skal eftermaales. Se `docs/research/P1_HISTORY_REFERENCE_FIX_4.0.237.md`.

Kandidaten ligger i draft-PR `#1`. Featuregrenen har ingen automatiske PR-checks; den er ikke paa `main` og ikke produktionsverificeret.

Produktionskoersel `#3237` er maelt read-only. Nye WAM 18Z- og DKSS 12Z-cyklusser er dokumenteret; HARMONIE 12Z er kun delvist indfaset. 4.0.232's kompatible `controlled-live`-historik har 28,903 timer og maa fortsat opbygges naturligt til 72 timer. Ingen kilde-, fallback-, score- eller geometriaendring er godkendt. Se `docs/research/P1_COMPONENT_TRANSITIONS_4.0.237_RUN3237.md`.

