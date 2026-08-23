# Kendte åbne og overvågede forhold

## 4.0.264 brugerrejse og konto

- **ISSUE-ACCOUNT-TRIP-LOG – PRODUKTIONSVERIFICERET KODE / AFVENTER INTERAKTIV KONTO:** Kontoen har nu **Mine ture og fund**, som læser den eksisterende `observations`-tabel gennem RLS. Ingen ny tabel, serverrække eller kopi oprettes. Læsningen er doven, feltbegrænset og højst 100 ture; en autentificeret ejerprøve skal senere bekræfte den faktiske private liste uden at sende en automatisk loginmail nu.
- **ISSUE-TRIP-DUPLICATE-FLOWS – PRODUKTIONSVERIFICERET LØST:** Den gamle turknap kunne starte en GPS-baseret rejse før den komplette v2-dialog og efterlade sporing aktiv ved afbrydelse. Live brugerflade går nu direkte gennem v2 og oplyser, at GPS/rute ikke indsamles.
- **ISSUE-MAGIC-LINK-USER-HYDRATION – PRODUKTIONSVERIFICERET KODE / AFVENTER INTERAKTIV MAIL:** Callbacken henter den aktuelle Supabase-bruger før kontoejerskab bruges. Loginlinkets forklaring og live redirectkontrakt er kontrolleret; rigtig magic-link-mail, adgangskodelogin og udlogning kræver ejerens senere interaktive prøve.
- **ISSUE-PUBLIC-WORDING – PRODUKTIONSVERIFICERET FORBEDRET / LØBENDE:** De centrale brugerord er forenklet og kontrolleret live. Den samlede browserkontrol skal fortsat fange interne fagtermer eller forklaringer, som ikke er forståelige i deres faktiske sammenhæng.
- **ISSUE-FEEDBACK-UI-STALE-TEST – LØST OG EXACT-HEAD-VERIFICERET:** Produktion `32651106811` stoppede før release, fordi den gamle fuldtest stadig krævede `tripZoneSearch` og Administratorcenter-kvitteringen fra den fjernede GPS-parallelrejse. PR #105/exact-head `32651724416` kræver nu direkte v2 og afviser gamle markører; testen var grøn i produktion `32651786366`.
- **ISSUE-PLAIN-COPY-STALE-TESTS – PRODUKTIONSVERIFICERET LØST:** Produktion `32651786366` stoppede før deploy, fordi `test-score-presentation` stadig forventede den erstattede formulering "exceptionelt gode forhold". Den efterfølgende lokale gennemgang fandt også, at mobiltesten stadig krævede den gamle `startTrip()`-rejse. PR #106/exact-head `32652894729` og produktion `32652970105` beviser den nye almindelige stjernetekst og direkte v2-tur.
- **ISSUE-LIVE-AUDIT-WATER-TREND-LABEL – PRODUKTIONSVERIFICERET LØST:** Den første 4.0.264-liveaudit talte 2.520 gentagelser af én forældet testlabel. Feltet var korrekt beregnet og vist som `Vandstandsændring på 3 timer`, men auditten søgte `3-timers trend`. PR #107/exact-head `32654048944`, merge `8b758337` og produktion `32654119745` låser den fælles label; live 420/2.100/673 består med nul øvrige kontrol-, konsol-, side- eller HTTP-fejl.

## Dokumentationsmerge udløser unødvendig fuld produktion via rodhåndbogen

- **ISSUE-ROOT-HANDBOOK-DOCS-SKIP – RETTET I LOKAL KILDE / BEVIS AFVENTER:** Den rent dokumentariske PR #102 ændrede blandt andet `HANDBOOK-RAVRADAR.md`. Workflowets `paths-ignore` dækkede `docs/**`, changelog og release-rapporter, men ikke rodhåndbogen; merge `0da5b31d` startede derfor unødvendigt fuld produktion `32646026290`. Den eksakte rodhåndbog og regressionstesten er nu rettet lokalt. Fordi workflowfilen ændres, skal denne merge først gennem én normal fuld produktion; derefter skal en særskilt ren dokumentationsmerge bevise 0 oprettede push-produktionskørsler.

## P0 – Candidate G-profilgate ved senere prognosehuller

- **ISSUE-CANDIDATE-G-CURRENT-REFERENCE-GATE – PRODUKTIONSVERIFICERET LØST:** 4.0.262 beregnede transport korrekt, men `candidateWarmupEligible` blev bedømt over alle femdøgnsrækker. Et senere prognosehul kunne derfor rulle en sund aktuel `WINDOW_INCOMPLETE`-reference tilbage til legacy. DEC-0062/4.0.263 bedømmer memory og warmup ved den nærmeste fælles aktuelle scoretid i hver zone. Komplet scorecoverage for hele forecastet og global fail-closed ved fejl i den faktisk valgte aktuelle reference bevares. PR #101/exact-head `32644701811`, merge `9f5953f6`, produktion `32644772373`, live `rr-20260823142247-210`, aktiv shadow `32645569741` og fuld browserkontrol er grønne på 210/673/420/2.100 uden fejl.

## P0 – Candidate G-transport ved tre-timers produktionsevidens

- **ISSUE-CANDIDATE-G-TRANSPORT-CADENCE – PRODUKTIONSVERIFICERET LØST:** Live `rr-20260823121818-210` havde transport 0 i 673/673 dele, fordi tre timers native bevisafstand blev afvist af én-times-gaten. DEC-0061/4.0.262 accepterer højst tre timer, bruger faktisk forløbstid uden kunstige mellemtimer og bevarer fail-closed ved større eller manglende gab. PR #100/exact-head `32642456123`, merge `586fbd184f68c6445acfb38a39814f6348f14bd0`, produktion `32642532892` og live `rr-20260823134605-210` beviste 673/673 accepterede states, nul replaymismatch og 110 positive transportpotentialer. DEC-0062 retter særskilt den efterfølgende for brede profilgate.

## 4.0.261 Candidate G-aktivering under pre-public opvarmning

- **ISSUE-CANDIDATE-G-PREPUBLIC-WARMUP – PRODUKTIONSVERIFICERET LØST UNDER DEC-0062:** Candidate G må fortsat være aktiv før 48 timers moden historik, fordi siden endnu ikke er offentlig, men kun når den faktisk valgte aktuelle fælles reference er kort og sammenhængende (`WINDOW_INCOMPLETE`). Latest-missing, missing-evidence og time-gap ved denne reference vælger legacy globalt. Senere prognosehuller behandles fail-closed i deres egne states, men må ikke retroaktivt slå den aktuelle profil fra. 4.0.263's aktive 210/673-shadow beviser kontrakten. Se DEC-0060–0062.
- **ISSUE-CANDIDATE-G-ACTIVE-PROJECTION – PRODUKTIONSVERIFICERET LØST:** Den globale 4.0.261-profil kræver fortsat beregnelige Candidate G-resultater for alle nødvendige rækker og begge jagtformer. Én manglende projektion vælger legacy for hele datasættet. PR #97/exact-head `32636378576`, merge `0f7a9d5f`, produktion `32636433944`, auditrettelse PR #98/merge `fd69f8a0`, frisk produktion `32637387600`, grøn shadow `32637833674` og fuld livebrowserkontrol beviser aktiv 210/673-projektion uden score- eller visningsafvigelser.
- **ISSUE-CANDIDATE-G-CENTRAL-SELECTION – PRODUKTIONSVERIFICERET LØST:** `ravscore-profile-selection` er privat centralt admin-dokument med sikker engangspromotion af en nyere ejerbeslutning og efterfølgende central autoritet. Produktion `32636433944` skrev og genlæste Candidate G-konfigurationen identisk; samme eller nyere central konfiguration kan gennemføre global rollback.
- **ISSUE-CANDIDATE-G-SHADOW-NOT-READY-STATUS – PRODUKTIONSVERIFICERET ERSTATTET:** PR #98 accepterede alle fire ikke-ready-statusser under pre-public warmup. Live cadencefundet viste, at dette kunne skjule et permanent gap. DEC-0061 tillader derfor kun `WINDOW_INCOMPLETE`, og DEC-0062 binder denne kontrol til den faktisk valgte aktuelle fælles reference. De tre fejlstatusser udløser global rollback ved denne reference; shadowen genafspiller desuden den kompakte state. Aktiv shadow `32645569741` beviser den erstattende 4.0.263-kontrakt.

## 4.0.260 versionsbundet RavScore-profilomskifter

- **ISSUE-CANDIDATE-G-PROFILE-SWITCH – LØST OG PRODUKTIONSVERIFICERET SCORE-NEUTRALT:** DEC-0058 vælger fortsat `RRS-CURRENT-B0-4.0.247` som ønsket, aktiv og rollbackprofil. PR #92/exact-head `32628441062`, merge `c5898ce8`, produktion `32628516066`, live `rr-20260823083627-210`, dataminimeret 210/673/1.346-shadow og fuld browseraudit er grønne. Candidate G kan fortsat kun vælges samlet efter komplet dækning, frisk aktiveringsshadow og særskilt ejerbeslutning; manglende eller ukendt konfiguration falder fail-closed tilbage globalt.
- **ISSUE-CANDIDATE-G-ACTIVATION-CONFIG-ROUNDTRIP – PRODUKTIONSVERIFICERET LØST:** Den versionsbundne aktivering ligger i `ravscore-profile-selection`, hydreres centralt og skrives tilbage med identitetskontrol. Produktion `32636433944` gennemførte identisk central readback; legacydefault er fortsat fail-closed ved manglende eller ugyldigt dokument.

## Docs-only produktionsskip

- **ISSUE-ROOT-CHANGELOG-DOCS-SKIP – LØST OG BEVIST:** Den snævre allowlist dækkede `CHANGELOG-*.md`, men ikke den faktiske samlede `CHANGELOG.md`. Derfor startede PR #78's ellers rene dokumentationsmerge fuld produktion `32599980640`. PR #79 tilføjede kun den eksakte fil, bestod exact-head `32600654326`, blev merged som `41f71900` og bestod fuld produktion `32600714319`. Det rene docs-checkpoint PR #80 blev merged som `1565e073`; GitHub viste 0 workflowkørsler på mergecommitten, så ingen push-produktion blev oprettet.

## Candidate G strømstyret transporthukommelse efter 4.0.258

- **ISSUE-CANDIDATE-G-TRANSPORT-ZERO-VS-TOTAL-SCORE-ZERO – LØST OG PRODUKTIONSVERIFICERET SCORE-NEUTRALT:** Ejeren har valgt en eksplicit slutscoregate i den interne `RESEARCH-2`-revision. Når faktisk kraftig udtransport har udtømt transportpotentialet, bliver Candidate G 0, mens mobilisering og jagtbarhed fortsat beregnes og kan forklares. Gaten kræver historikmarkøren for faktisk udtransport og udløses ikke af start 0, missing, neutral strøm eller svag modstrøm. Exact-head `32604792201`, PR #84/merge `800a93cb`, produktion `32604850884` og live `rr-20260822232159-210` er grønne. Offentlig RavScore er ikke aktiveret eller ændret.
- **ISSUE-CANDIDATE-G-CURRENT-NORMAL-THRESHOLD – TEKNISK ANBEFALING VALGT / EMPIRISK USIKKERHED BEVARET:** 0,03→0,15 m/s er valgt som anbefalet privat produktprior, fordi 0,15 allerede er RavRadars aktive betydning af velegnet strøm, 0,05→0,20 aldrig når fuld styrke i replayet, og 0,02→0,12 ændrer væsentligt flere scorebånd. Profilen er ikke fundkalibreret og må ikke fremstilles som naturgrænse.
- **ISSUE-CANDIDATE-G-TRANSPORT-INITIAL-STATE-AND-DECAY – LØST OG PRODUKTIONSVERIFICERET:** Den ubundne videreførelse og anbefalingen om neutral startprior 50 er erstattet af et fast 48-timers vindue af sammenhængende, afledt kystnormal strømevidens. Persistéret transportoutput bruges ikke som ny start. Missing og tidsgab holder `transportMemoryReady=false`. Syntetiske tests og 582 komplette historiske vinduer giver nul mismatch mellem tænkte starter 0/50/100. Exact-head `32633533257`, PR #95/merge `1d848724`, produktion `32633607166` og live `rr-20260823102619-210` verificerede den score-neutrale 4.0.260-indførelse; DEC-0060 erstatter kun den daværende legacy-aktiveringsstatus og tillader Candidate G under ærligt mærket pre-public opvarmning.
- **ISSUE-CANDIDATE-G-FRESH-SCORE-DISTRIBUTION – GAMMEL FORDELING FORKLARET / PRE-PUBLIC AKTIVERING EJERACCEPTERET:** Den tidligere shadow lå 16,582/22,379 point under aktiv waders/strand og havde 493/673 transporttilstande på 0 uden udtransportgate, fordi maskinstarten hang ved; den fordeling er ikke et modenhedsbevis. DEC-0060 tillader alligevel den nye afgrænsede model som gældende under den ikke-offentlige opvarmning. En frisk aktiv shadow skal bevise eksakt projektion nu, mens senere komplet memory beskriver den indrettede fordeling.
- **ISSUE-CANDIDATE-G-PUBLIC-ACTIVATION – PRODUKTIONSVERIFICERET LØST:** Ejeren har valgt `RESEARCH-3` som gældende scoremotor og accepteret de foreløbige værdier under den første ikke-offentlige opvarmning. 4.0.261's globale Candidate G-projektion, centrale konfiguration og eksakte legacyrollback er bevist af exact-head `32636378576`, produktion `32636433944`, central readback, aktiv shadow `32637833674` og fuld browserkontrol. Repræsentative ture bevares som senere modelusikkerhed og efterkalibrering.

## Candidate G bølgeenergistyret mobilisering

- **ISSUE-CANDIDATE-G-MOBILISATION-DOUBLE-COUNTING – LØST SCORE-NEUTRALT:** `RESEARCH-3` erstatter de overlappende additive mobiliseringspoint fra bølger, vind, strøm og varighed med én kausal bølgeenergitilstand. Direkte vind og strøm giver nul mobiliseringspoint; stedegnethed indgår ikke. Den offentlige score er uændret.
- **ISSUE-CANDIDATE-G-MOBILISATION-HALF-LIVES – TEKNISK ANBEFALING VALGT / EMPIRISK USIKKERHED BEVARET:** Fire timers opbygning og 48 timers aftrapning er den anbefalede private profil. Syntetiske randtilfælde og 1.460-evalueringsreplayet er monotone og robuste, men profilen er ikke fundkalibreret. 24/72 timer bevares som følsomhedsgrænser.
- **ISSUE-CANDIDATE-G-MOBILISATION-PIPELINE-STATE – PRODUKTIONS- OG NATURLIG FORTSÆTTELSE BEVIST:** Den kompakte afledte mobiliseringstilstand fortsætter eksakt centralt sammen med transporttilstanden. Missing og same-time holder; ændret kontekst nulstiller. 4.0.259 beviste fortsættelsen, og 4.0.261's friske aktive shadow `32637833674` lukkede aktiveringskontrollen.

## 4.0.257 Candidate G national scoreinputcoverage

- **ISSUE-CANDIDATE-G-DYNAMIC-SCORE-INPUT-COVERAGE – PRODUKTIONSVERIFICERET LØST:** Exact-merge-shadow `32580774128` scorede kun de 243 dele i en snæver native-DKSS-testkontrakt; de øvrige 430 var ikke almindelige vejrhuller. DEC-0057/4.0.259 auditerer den producerede DMI/Copernicus/proxy-runtime. Flere friske offentlige kørsler består 210/673 og 1.346 modeevalueringer uden nuludfyldning, nabokopiering eller punktflytning.
- **ISSUE-CANDIDATE-G-STATIC-RETENTION-COVERAGE-GATE – PRODUKTIONSVERIFICERET LØST:** Den ældre shadowkontrakt krævede komplette lokale rev-/lavtvands-/ålegræsfelter, selv om Candidate G ikke bruger en sådan statisk stedmodel. DEC-0052 gør felterne til ren diagnostik med nul scorepåvirkning. PR #70, produktion `32580314866` og exact-merge-shadow `32580774128` bekræfter kontrakten.
- **ISSUE-CANDIDATE-G-FINAL-WEIGHTS – AKTIV EJERPRIOR / ÅBEN FOR SENERE TURKALIBRERING:** Ejeren har valgt `20/50/30` som gældende faglig produktprior i DEC-0060. Det er ikke fundkalibrering. Udvalgte vejrhændelser og mekaniske snapshots kan ikke afgøre, hvilken vægt der bedst forudsiger fund; repræsentative ture kan derfor senere begrunde en ny særskilt ejerbeslutning. `25/40/35` bevares som eksakt rollback, ikke som den ønskede aktive profil i 4.0.261.

## 4.0.255 national waders-kontraktgate

- **ISSUE-RAVSCORE-NATIONAL-WADERS-CONTRACT-MARKER – PRODUKTIONSVERIFICERET LØST:** PR #66's produktion `32575055644` stoppede korrekt før release og deploy, fordi fuld validering stadig forventede den erstattede markør `candidate-waders-product-decision`. Testen følger nu den aktuelle `candidate-waders-rule-order-public-product-review` og er tilføjet den hurtige kildegate. PR #67, exact-head-gate `32575697204`, merge `af8f30cf` og produktion `32575740539` er grønne; live 4.0.255-integritet er verificeret. Ingen score- eller dataadfærd er ændret.

## Copernicus-pilot #72 - 2026-08-20

- **ISSUE-COPERNICUS-CURRENT-PILOT - FORTSAT SUND / 168 TIMER IKKE NÅET:** Automatisk dispatch `#32347060320`/artifact `copernicus-current-pilot-72` har 46 eksakte timer til og med 2026-08-20 08:00Z, 28.934 private poster, 625 unikke mål og 629 mål/kilde-par med nul gitter- eller lagustabilitet. Pilotens 48 Copernicus-huller er uændrede kildedækningshuller og udfyldes ikke. Scorepåvirkning, offentlig runtime og interpolation er fortsat deaktiveret; syvdøgnsanalysen forbliver åben.

## 4.0.252 produktion

- **ISSUE-NATIONAL-RANKING-OPPORTUNITY-BIAS - PRODUKTIONSVERIFICERET LØST:** `direction-broad-19-v1` korrigerer kun landsrækkefølgen og beskytter helzone samt mindst 50 procent støtte. PR #52, merge `ad70fbca`, produktion `32515757957` og livekontrollen af 210 zoner, 673 dele, 420 aktuelle og 2.100 femdøgnsvisninger er grønne. Den viste RavScore er uændret.

## 4.0.238 produktion

- **ISSUE-VERIFIED-HISTORY-GENERATEDAT-MISMATCH - PRODUKTIONSVERIFICERET LØST:** `#32344813967`/support `RavRadar-support-3252`/datasæt `rr-20260820074127-210` viser op til 56 verificerede prøver over 39,594 timer i de 198 verificerbare zoner mod tidligere fastlåste 22,563 timer. Matcheren bruger `productionReferenceAt` med bagudkompatibel fallback. De 12 reelle gitterhuller forbliver `missing`.
- **ISSUE-OPEN-METEO-LOCKED-HOUR-WINDOW - PRODUKTIONS- OG BROWSERVERIFICERET LUKKET:** Schedule `#32347036227` beviste først korrekt fail-closed skip, da time 08 manglede. Den senere naturlige schedule `#32351140886` byggede og deployede datasæt `rr-20260820085852-210` med begge fulde gates, Supabase og Pages på tværs af timeskiftet. Efterfølgende onlinekontrol var grøn for 210 zoner, 673 kystdele, 420 aktuelle visninger og 2.100 prognosevisninger uden score-, pil-, forklarings-, konsol-, side- eller HTTP-fejl.
- **ISSUE-ONLINE-AUDIT-VERSION-BINDING - LIVEVERIFICERET LØST:** Browser-pluginet åbnede live 4.0.238, og den godkendte Playwright-fallback gennemførte 210 zoner, 673 dele, 420 aktuelle paneler og 2.100 femdøgnsvalg med nul score-, label-, farve-, pil-, komponent-, forklarings-, kontekst-, debug-, metrik-, konsol-, side- eller HTTP-fejl. Mobil og desktop er uden overflow eller funktionsfejl.

- **ISSUE-GITHUB-SCHEDULE-COPERNICUS-HOUR-RACE – PRODUKTIONSVERIFICERET LØST I 4.0.236:** `#32249924919`/`#3217` godkendte 11:00 kl. 11:59, men den gamle bygning skiftede efter timeskiftet til 12:00 og stoppede sikkert ved 630/673. 4.0.236 låser hele det planlagte build til readiness-timen. Commit `668a1cdd`, `#32253251841`/`#3219` og gentagelsen `#32257480030`/`#3220` bestod to låste timer med 673/673, fuld validering, releasegate, Supabase og Pages. 673/673 er ikke sænket.
- **ISSUE-GITHUB-NATIVE-SCHEDULE-DELIVERY – LUKKET / OVERDRAGELSE VERIFICERET:** GitHub havde et midlertidigt leveringshul, men ejeren har nu slettet RavRadar-jobbene i cron-job.org. Efter sletningen bestod naturlig produktion `#32272470720`, cachebevaring `#32272473716`/`#32272598725` og Copernicus-pilot `#32273634626`. GitHub Actions er dermed eneste normale scheduler, og repositoryets tre naturlige kæder er direkte bevist uden ekstern dublet.

- **ISSUE-PUBLIC-LOCAL-PRESENTATION-SPLIT – PRODUKTIONS- OG RUNTIMEVERIFICERET I 4.0.235 / VISUEL SLUTTEST ÅBEN:** 4.0.235 fører én lokal del/tid/vejrpost gennem score, tekst, debug og metrikker, genbruger samme `selectLocalBestForDay` og mærker samlet hovedzonefallback eksplicit. `#32249770288`/`#3216` bestod 673/673, fuld validering, releasegate, Supabase og Pages. Seneste sikre liveaudit er grøn for 420 aktuelle og 2.100 femdøgnsvisninger. Ingen land-/vandpunkter, U/V, pilceller, kilder eller scoreformel er ændret. Kun faktisk online DOM-/kliktest af alle 210 zoner/673 dele er åben.
- **ISSUE-CODEX-BROWSER-NATIVE-HOST – EKSTERN FEJL / CHROMIUM-FALLBACK GODKENDT:** Browser- og Chrome-pluginet har ikke kunnet starte styring. Chrome-udvidelsen er installeret og aktiveret, men native messaging-host `com.openai.codexextension` mangler, og Codex har meldt trusted-code-path-fejl. Næste chat forsøger pluginet og målrettet diagnostik først. Hvis det ikke giver en konkret reparationsvej, har ejeren godkendt Chromium/Playwright til RavRadars afsluttende systematiske online audit. RavRadar-kode, Chrome-register og native host må ikke håndrettes som projektomvej.

- **ISSUE-CURRENT-COMMON-HOUR-COVERAGE – PRODUKTIONS- OG RUNTIMEVERIFICERET LØST I 4.0.237:** 4.0.236 beviste 673/673 verificerede delrecords, men udvælgeren valgte hver dels nærmeste gyldige tid uafhængigt og kunne derefter vælge en nærmere `uncertain` zonerække til visningen. 4.0.237 publicerer `currentReferenceAt` pr. zone og låser delscore, tekst, debug, vejr og pile til den eksakte række. Commit `9c971bc1` og `#32264833170` bestod fuld produktion; live `rr-20260819143933-210` har 210/210 komplette zoner og 673/673 dele på zonens valgte tid. 100 %-kravet, DMI → Baltic → AMM15 → otte allowlistede proxyer og afstandsgrænserne er uændrede.

- **ISSUE-LOCAL-PART-INHERITED-PARENT-DIRECTION – PRODUKTIONSVERIFICERET LØST I 4.0.233:** Live `rr-20260818164751-210` havde korrekte strømvektorer og pilceller, men 216/673 lokale dele i 52 zoner arvede moderzonens retningsankre. 49 aktuelle zonevindere kunne derfor vise én del og score eller forklare mod en anden. Blåvand viste konkret `Havsande – nordkyst` med lokal retning 117,3°, men scoreanker `Syd for fyret` 29°. Commit `286ea9e5`, `#32165688946` og `#32165969786` bestod fuld produktion. Direkte liveaudit af `rr-20260818173528-210` fandt nul lokale anker-, vinder/navn/score-, retning-, pil/grid-, provenance- eller afstandsfejl i 673 dele og 43.064 prognose-/jagtformstimer.

- **ISSUE-COPERNICUS-CURRENT-PILOT – LIVE OG PRODUKTIONSVERIFICERET / SYVDØGNSOVERVÅGNING ÅBEN:** `#32158041877`/support `#3127` bestod den første fulde 673/673-livekæde. Seneste naturlige pilot `#32273634626` har udvidet den private cache til 30 gyldige timer og 18.870 poster med 625 mål, 629 mål/kilde-par og nul gitter-/lagustabilitet; `scoreImpact=false`, `publicRuntime=false` og 168 timers retention er bevaret. Naturlig produktion `#32272470720` er samtidig grøn med 673/673 efter cron-overdragelsen. Kun det fulde naturlige syvdøgnsvindue og den gentagne visuelle onlinekontrol er åbne.

- **ISSUE-EIGHT-LIMFJORD-REGIONAL-PROXIES – 8/8 LIVE- OG CI-VERIFICERET:** De otte eksplicitte dele bruger efter DEC-0041 kun nærmeste eksakte `dkss_lf`-par op til 15 km. Commit `5a7780e4` rettede livebyggeren til den kanoniske anchoridentitet, og `#32158041877` beviste alle otte i runtime som den sidste del af samlet 673/673. Support `#3127` viser 40 gyldige proxyprøver uden credentiallæk.

- **ISSUE-LOCAL-CURRENT-ARROW-USED-BUILD-TIME – PRODUKTIONSVERIFICERET LØST I 4.0.232:** #2876 viste én lokal pil/grid-afvigelse ved `PART::dk-b04-12-owner-approved-01`. Runtime vælger nu den viste score først og beregner pilen ved præcis scoretiden. `#32158041877` bestod den fulde kilde-/celle-/tidsaudit ved 673/673, og livepakken indeholder ingen ikke-godkendte strømpilkildeklasser.

- **ISSUE-CURRENT-SCALAR-MODEL-BLOCKED-NEAREST-UV – PRODUKTIONSVERIFICERET LØST I 4.0.232:** #2872 fandt Havknudes eksakte fælles NSBS-U/V-kolonne 2,804 km fra vandpunktet, mens offentlig runtime var `missing`. Ét globalt `marineSelection` lod et IDW-skalarpunkt 5,131 km væk blokere strømmen. #2876 beviste semantik v3, og `#32158041877` har siden bestået den fulde nationale 673/673-gate og deploy med det selvstændige strømvalg aktivt.

- **ISSUE-CURRENT-DEEPEST-LAYER-MOVED-SPATIALLY – PRODUKTIONSVERIFICERET LØST I 4.0.232:** Parseren valgte tidligere det dybeste lag globalt og kunne lade et 12–24 km fjernt dybdepunkt slå den nærmeste vandkolonne. Lag vælges nu pr. native tid efter nærmeste vandkolonne, interpolation over lag-/celleskift afvises, og pilen bruger den viste times egen celle. `#32158041877` bestod den fulde 673/673-kilde-, celle-, tids- og lagaudit samt deploy.

- **ISSUE-CURRENT-SPATIAL-COVERAGE-AFTER-SEMANTICS-V2 – PRODUKTIONSVERIFICERET LØST MED 100 %-GATE:** #2875/#2876 var historiske deltrin i V3-genopbygningen. `#32158041877` hydrerede de centrale punkter og nåede præcis 673/673 med 622 DMI, 43 Copernicus og otte afgrænsede Limfjordsproxyer. Gaten er fortsat dynamisk 100 %, ikke 640; `dmi-only-rollback` kan deaktivere supplementet uden at hævde fuld strømdækning.

- **ISSUE-CENTRAL-COASTAL-POINTS-BUILT-AFTER-DMI – PRODUKTIONSVERIFICERET LØST I 4.0.232:** Workflowet byggede tidligere kystdelskontrakten efter DMI-bulksteppet, så flyttede centrale punkter kunne blive samplet på gamle koordinater. Kontrakten bygges nu før DMI, og cache genbruges kun for uændrede samplingpunkter. `#32158041877` hydrerede ejerens aktuelle centrale punkter før vejropbygningen og bestod derefter 673/673 og deploy.

- **ISSUE-CURRENT-FIELD-TRANSPORT-CHAIN-NOT-YET-SCORED – PLANLAGT FORSKNING:** Aktiv RavScore bruger fortsat lokal verificeret strøm. Den kommende analyse skal afgøre, om ydre strøm ved cirka 5/15 km, flere dybdelag, overgangskorridorer og tidsforsinkelse giver selvstændig forklaringsværdi. Privat syvdøgnsopsamling starter score-neutralt i 4.0.229; ingen ny scoremekanisme er godkendt.

- **ISSUE-CURRENT-FIELD-ROTATION-STALLED-ON-UNCHANGED-MODEL – LØST OG CI-BEVIST:** #2855/#2859 stod ved cursor 90, 491 prøver/58 dele og nul replayassets, fordi fælles 4 GB-LRU manglede en tidsrelevant marine fil. Manifest og prioriteret retention er bevist i #2863/#2864, og #2866 fortsatte med tre cachede replayassets til cursor 150, 667 prøver og 118 dele. Forskningskæden er fortsat score-neutral; 168-timers drift overvåges almindeligt. Den særskilte aktive strømdækning bestod siden 673/673 i `#32158041877`.

- **ISSUE-MAP-ARROW-DENSITY-DOES-NOT-GROW-WITH-ZOOM – PRODUKTIONSVERIFICERET LØST I 4.0.228:** Kortet genberegnede allerede afstand mellem pile ved zoom, men runtime leverede kun ét flowpunkt pr. hovedzone. Nærzoom kan nu tilføje hver kystdels egne, eksakt parrede DMI-U/V-gitterpunkter. #2830 afdækkede, at DKSS-`wind-tail-u/v` blev overset; transporten genkender nu både primær HARMONIE-vind og DKSS-vindhale med særskilte kildemærker. #31913779486/#2835 bestod hele kæden. Artifact og livefiler har 670 eksakte strøm- og vindpunkter uden mismatch, og livebrowseren gik fra 54 til 87 synlige pile efter to zoomtrin uden konsolfejl.

- **ISSUE-40228-DMI-LF-PARTIAL-RUN – HISTORISK RECOVERED UNDER DAVÆRENDE GATE:** Første forsøg ramte DMI-bulkbudgettet under `dkss_lf` og stoppede korrekt ved 629/673 verificerede lokale strømpunkter mod det daværende minimum 640. Den uændrede progressive genkørsel nåede 670/673 og bestod den daværende strømaudit. Dette er fortsat gyldigt historisk bevis, men 670/673 er ikke nok til en ny release under 4.0.232's 100 %-gate.

- **ISSUE-ADMIN-LOCAL-COAST-ANGLE-BLOCKS-OWNER – PRODUKTIONSVERIFICERET LØST I 4.0.227:** Admin brugte vinklen mod det nærmeste korte kystsegment som en hård 20-graders godkendelsesport. Svansodde blev derfor låst ved 50 grader, selv om ejeren havde kontrolleret hele den bugtede strækning. Vinklen er nu vejledende; reelle punkt-/kystintegritetsfejl, central readback og DMI-/releasegates bevares. #31908498204/#2824 bestod hele produktionskæden, supportartifactets hashes matcher, og direkte Pages-kontrol viser den nye regel live.

- **ISSUE-SUPABASE-RUNTIME-DIAGNOSTICS-STATEMENT-TIMEOUT – PRODUKTIONSVERIFICERET LØST I 4.0.234:** #2814 og senere #2830 viste HTTP 500/PostgreSQL `57014` på den voksende `runtime-diagnostics`-upsert. 4.0.234 gemmer den komplette rapport tabsfrit i et gzip/base64-arkiv med SHA-256 og reducerer den repræsentative kompakte payload fra 4.014.169 til 208.874 byte. `#32237507059`/`#3202` bestod central upsert/readback på otte sekunder samt fuld release og deploy. Admin genskaber kun originalen efter integritetskontrol; retry og fail-closed adfærd er bevaret.

- **ISSUE-WATER-ROUTING-CURRENT-HOUR-PROVENANCE – PRODUKTIONSVERIFICERET LØST I 4.0.225:** #2801 havde én DMI-vandstandstime uden collection/model-run pr. zone, alle ved den aktuelle 17:00-time efter generering 17:02. Kildeindeksets start afrundes nu ned til aktuel time, mens forecastalder fortsat bruger faktisk genereringstid. #31902872631/#2810 og #31903561423/#2812 beviser i to efterfølgende datasæt 22.890/22.890 routede timer med fuld provenance og 210/210 komplette aktuelle 19:00-rækker.

- **4.0.214 PRODUKTIONSOPFØLGNING:** 4.0.213 afviste nye DMI-dybdetemperaturer, men bevarede ældre cachetimer uden lagmærkning. 4.0.214 fjerner dem fail-closed og genopbygger `surface:0` gennem DKSS-rotationen. Afsluttes først, når artifacts viser verificeret overfladelag for alle viste DMI-temperaturtimer.
- **ISSUE-LIMFJORD-WAVE-MISSING-B05-11 – ÅBEN FAGLIG BESLUTNING:** Rodårsagen er afgrænset: Limfjordsmodellen har ingen bølgekomponent, `wam_dw` har intet accepteret gyldigt punkt ved Feggesund, og eksisterende fallback er også missing. Den nuværende korrekte adfærd er `missing`. Fjernere punkt eller ny kilde kræver særskilt godkendelse og konsekvensberegning.

## P1-bølger og vandstand – aktuel produktionsmåling

- **ISSUE-LIMFJORD-WATER-LEVEL-15H-TAIL – ÅBEN ANALYSE:** Otte Limfjordszoner har 103/118 vandstandstimer og mangler præcis samme sidste 15 timer. Undersøg fælles `dkss_lf`-run, assetinventar, cache og native horisont i flere friske runs. Missing må ikke skjules med stale gentagelse, interpolation eller opdigtet fallback.
- **ISSUE-WATER-TEMPERATURE-LAYER-IDENTITY – RETTET LOKALT I 4.0.213 / AFVENTER PRODUKTION:** Artifactet beviste parameter 80 ved både overflade og dybdelag. Kun `surface:0` accepteres nu, lagidentiteten bevares, og parsergeneration 15 genopbygger cachen. Den separate 15-timers Limfjordshale er fortsat åben og må ikke skjules.

## 4.0.212 – skalarfelt kunne rydde valgt strømserie

- **ISSUE-DMI-SCALAR-EVICTS-CURRENT-SERIES – PRODUKTIONSVERIFICERET LUKKET I #31870747677:** #31857361460 reducerede 27 tidligere komplette NSBS-zoner fra 38 strømtrin til ét sent trin. Skalare felter må nu kun følge et eksisterende valg; kun et bedre fælles strøm-U/V-par må skifte model. Frisk genindlæsning gav verificeret strøm i 210/210 zoner og mindst 100,8 timers sammenhængende marinehorisont.
- **ISSUE-DMI-CURRENT-LAST-17-19-HOURS – ÅBEN P1 UNDER DEC-0030:** 4.0.212 giver ensartet mindst 100,8 timers strøm-/marinehorisont i alle 210 zoner, men ingen når 118 timer ved den målte byggetid. Kildekørsel, assetinventar, lead-time og sidste valide time skal forklares før eventuel kædeændring. Missing må ikke skjules.

## 4.0.211 – tabt havmodelvalg og falsk genbrug

- **ISSUE-DMI-MARINE-SELECTION-DROPPED-ON-MERGE – PRODUKTIONSVERIFICERET LUKKET I #31855164652:** Progressiv cachemerge tabte `marineSelection`, selv om collection og gitterpunkt blev bevaret. Valget bevares og rekonstrueres fail-closed; efterkontrollen viser valg og verificeret aktuel strøm i 210/210 zoner.
- **ISSUE-DMI-PROCESSED-STEPS-HIDE-EVICTED-CURRENT – PRODUKTIONSVERIFICERET LUKKET I #31855164652:** Den nye behandlingssignatur genlæste de relevante IDW-/NSBS-filer. Aktuel verificeret strømdækning steg fra 10/210 før rettelserne til 210/210 efter den progressive genopbygning.

## 4.0.210 – falsk komplet DMI-strømdækning

- **ISSUE-DMI-CURRENT-DISTANT-TAIL-MASKS-NOW-GAP – PRODUKTIONSVERIFICERET LUKKET I 4.0.210–4.0.211:** Schedulerens tidligere horisontsmål så kun på det sidste komplette marinetidspunkt. 4.0.210 kræver sammenhængende komponenter fra byggetiden, og #31855164652 beviser verificeret strøm ved nutiden i 210/210 zoner. Ingen manglende værdi udfyldes kunstigt.
- **ISSUE-DMI-CURRENT-HISTORY-RECOVERY-MEASUREMENT – ÅBEN / MIDLERTIDIGT UDSAT 2026-08-16:** Alle 210 zoner bevarer nu rå og verificeret historik, som fortsat opsamles naturligt. Ejeren har udsat den næste 72-timersanalyse, indtil mere data findes. Fortid må fortsat ikke fabrikeres.
- **ISSUE-DMI-CURRENT-FIVE-DAY-TAIL – ÅBEN P1 / MIDLERTIDIGT UDSAT 2026-08-16:** Den samlede fem-døgnsdækning analyseres videre, når flere naturlige modelkørsler er opsamlet. Ingen ny kilde, fallback eller scoreændring er godkendt, og `missing` må ikke skjules.

## 4.0.208 – lokal snapshotdrift

- **ISSUE-STALE-LOCAL-WEATHER-MISDIAGNOSED-AS-ZONE-FAILURE – PRODUKTIONSVERIFICERET LUKKET I #31848912461:** Det indcheckede 31. juli-snapshot dækkede 209 historiske zoner, mens råt repositoryregister og central runtime havde nyere, forskellige bestande. Valideringen stoppede korrekt, men teksten fik de tre Vadehavszoner til at ligne defekte produktionszoner. Den nye diagnose skelner et udløbet snapshot fra et aktuelt dækningsbrud uden at lempe gaten. Frisk central vejrbygning, fuld validering og deploy bestod; direkte deployaudit beviser 210/210 og alle tre Vadehavszoner med vejrdata.
- **ISSUE-LOCAL-REPOSITORY-VS-CENTRAL-TOMBSTONES – DOKUMENTERET:** Rå repositorydata kan før central hydrering stadig indeholde Havnø/Mariager Fjord øst, mens et gammelt vejrsnapshot kan indeholde Fejø/Femø. Den effektive produktionsbestand opstår først efter central adminhydrering og tombstones. Vejrhydrering alene er derfor ikke et fuldt lokalt produktionsbuild.

## 4.0.207 – manuel placering af ét punktpar

- **ISSUE-ADMIN-NEW-POINT-BUTTONS – PRODUKTIONSVERIFICERET LUKKET I #31845836107:** De to knapper til at sætte nye enkeltpunkter gav ikke et virksomt ekstra punktpar og passede ikke til den aktive én-par-kontrakt. De er fjernet efter udtrykkelig ejerbeslutning. Eksisterende markører er fortsat flytbare, og central gemning/DMI-gate er bevaret.
- **ISSUE-LOCAL-PART-DIRECTION-VARIATION – ACCEPTERET KOMPROMIS / MANUEL REVIEW UDSKUDT:** En skrivebeskyttet 1 km-orienteringsaudit flagger 199 af 673 dele i 122 zoner ved mindst 35 graders vedvarende variation. 171 er fragmenterede `MultiLineString`-dele, så listen er triage og ikke dokumenterede fejl. Ejeren har fravalgt automatisk genopdeling og ekstra aktive punktpar; ét manuelt valgt repræsentativt punktpar pr. strækning bevares. Den gradvise gennemgang skal afsluttes før endelig faglig score- og brugerreleasegodkendelse, men blokerer ikke uafhængigt roadmaparbejde.

## 4.0.206 – fallback på ren runner og efter tidligere aktivering

- **ISSUE-FALLBACK-CLEAN-RUNNER-OUTPUT-DIR – LUKKET I #31829349458:** #31822748625 lokaliserede den manglende private reviewmappe. Alle fire outputforældre oprettes nu eksplicit, regressionen består, og en ren fuld national runner gennemførte fallbackbygning, validering og artifactupload.
- **ISSUE-FALLBACK-POST-ACTIVATION-IDEMPOTENCE – LUKKET I #31829349458:** Byggeren genbruger centralt aktive `remainder-*`-dele og deres eksakte validerede punktpar/retning, når oprindelige del-ID'er er erstattet. Den fulde private kæde bestod ejerskab, 2/2 flytninger, 9/9 erstatninger, nul overlap og fallback-DMI.

## 4.0.205 – Supabase secret-key-oversættelse

- **ISSUE-SUPABASE-SECRET-TRANSLATION-PGRST303 – CI-VERIFICERET:** Privat #31815423082 dokumenterede den enkeltstående HTTP 401 / `PGRST303`. Den snævre retryregel bestod målrettet central roundtrip i #31822371489 og fuld privat create/read/update/delete/rollback i #31822748625. Andre eller gentagne auth-fejl forbliver releaseblokerende.
- **ISSUE-PROTECTED-MANIFEST-READ-MASKED – LUKKET I #31829349458:** Beskyttet adminsync kan ikke længere gøre en manifestlæsefejl til `null`. Den fulde private create/read/update/delete/rollback bestod uden at maskere læsefejl eller efterlade ejerdata ændret.
- **ISSUE-NATIONAL-ROUNDTRIP-835 – LUKKET I #31822371489 OG #31822748625:** Central create/read/update/delete/rollback er bevist både målrettet og efter hele den friske nationale hovedkæde. Beskyttede ejerdata var uændrede efter rollback; ingen privat geometri er aktiveret.

## 4.0.204 – første land-/vandbevis var ikke råt

- **ISSUE-NATIONAL-LAND-WATER-EVIDENCE-DATASET-DRIFT – RETTET I TO TRIN / AFVENTER PRIVAT CI:** #31804967576 afslørede det historiske 673-dels bevis. #31812035188 viste derefter, at 4.0.203's første nye bevis var afledt af en fil med 107 allerede anvendte historiske korrektioner. Slut- og fallbackbeviset matcher deres rå GitHub-input præcist; det første bevis er nu genberegnet direkte fra den rå 835-dels QA-fil. Forkert input afvises fortsat før DMI.
- **ISSUE-NATIONAL-LAND-WATER-AMBIGUOUS – AKTIV MED RÅ BESTAND:** Den foreløbige 835-dels kandidat har 166 tvetydige/manglende punktpar, slutkandidaten på 652 dele har 114, og fallbackkandidaten på 17 dele har to. Fallbackens to er `dk-b10-14-fallback-recovery-02` og `dk-b10-14-fallback-recovery-05`, begge ved Albuen i `Lolland vest og Albuen`. Den første følger et længere kystforløb med skiftende lokal retning; den anden er en meget lille lukket kystfigur. Ét automatisk punktpar er derfor ikke et sikkert fagligt valg. De er fail-closed uden aktive punkter, vejr, state, score eller automatisk aktivering, indtil ejeren har afgjort, hvilke relevante ydre kystdele der skal beholdes, og om den lille lukkede figur skal udelades.
- **ISSUE-FALLBACK-DELETED-ZONE-REINTRODUCTION – RETTET LOKALT / AFVENTER PRIVAT CI:** Den historiske fallbackbygger indeholdt stadig vinduer for Fejø/Femø. De er fjernet, og validatoren kræver nu både Fejø/Femø og Havnø/Mariager Fjord øst bevaret som slettede.

## 4.0.198 – lokalitetsopdeling

- **ISSUE-NATIONAL-LOCALITY-PARTITION-208 – RETTET LOKALT / AFVENTER CI:** #31792615992 dokumenterede, at lokalitetsopdelingen alene stadig krævede den historiske 208-zonebestand. Den følger nu den fælles 210-zonekontrakt og har en direkte regressionstest.

## 4.0.197 – national zonebestand

- **ISSUE-NATIONAL-EFFECTIVE-ZONE-COUNT-STALE – RETTET LOKALT / AFVENTER CI:** #31790559558 stoppede før netværksarbejde, fordi nationalplanen forventede den tidligere bestand på 211 aktive zoner. Fejø/Femø er godkendt slettet, så central runtime har 210. Alle aktive nationale porte er afstemt til 210; historiske registre og historiske rapporter omskrives ikke.

## 4.0.196 – national land-/vandkontrol

- **ISSUE-NATIONAL-LAND-WATER-AMBIGUOUS – ERSTATTET AF 4.0.203-BESTANDEN:** Den oprindelige audit målte 118 tvetydige af 673 aktive dele. Tallet er historik og må ikke bruges som forventning for de nye private kandidater.
- **ISSUE-NATIONAL-LAND-WATER-DMI-PROMOTION – ERSTATTET AF KANDIDATBUNDET BEVIS I 4.0.203:** De 121 rettelser var gyldige for 673-delsbestanden, men ikke som generel regel for senere kandidater. Nye kandidater bruger egne eksakte beviser og kræver fortsat hele den private DMI-/runtime-/rollbackkæde.

- **ISSUE-ADMIN-DIRECTION-MAP-STALE-SELECTION – RODÅRSAG RETTET LOKALT I 4.0.195:** 4.0.194 ændrede timing uden at løse fejlen. Isoleret browsertest med produktionsdata viste, at Leaflet-vektorlag blev tilføjet før kortets første geografiske position og kastede `reading 'min'`; derfor udeblev linjer, markører og zoom. 4.0.195 positionerer kortet før lagene. Rejsby-testen viser korrekt område, 121 stier og to markører uden fejl. Afventer produktionsdeploy og ejerens efterkontrol.

## DMI-produktionskæde

- **ISSUE-DMI-VOLATILE-REGISTRY-SIGNATURE – RETTET LOKALT I 4.0.191 / AFVENTER TO CI-RUNS:** #2437 beviste, at checkpointet stadig blev afvist, fordi rå bytes fra det løbende vandkilderegister og zoneregisterets versionsmetadata indgik i signaturen. Signaturen bruger nu kun samplingbestemmende felter. Første run etablerer ny signatur; næste ikke-overlappende run skal bevise stategenbrug og rotation.
- **ISSUE-DMI-PROGRESS-CACHE-SELECTION – RETTET LOKALT I 4.0.190 / AFVENTER CI:** #2429–#2431 stod fast på 125/210 verificerede current-zoner. Den private cache blev gendannet, men en ældre offentlig cache kunne vinde på antal komponenter og dermed kassere nyere scheduler-/checkpointfremdrift. Nyeste kompatible checkpoint vinder nu; kvalitetsmålet er kun tie-breaker. Den uændrede 90 %-gate skal fortsat bestås i frisk CI før deploy.

## National zone- og kystgeometri – aktiv pilot efter DEC-0032
- **ISSUE-SIX-ZONE-NATIVE-DMI-PROOF – LUKKET PRIVAT / AFVENTER EJERREVIEW:** Den første DMI-grønne kandidat blev forkastet før aktivering, fordi hele del-flytninger tømte to nabozoner. Den korrigerede 22-dels kandidat bevarer naborester, og #31609637964 bestod 22/22 native DMI-gridvalg, nul overlap, runtime-isolation og rollback. Offentlig aktivering er fortsat blokeret indtil visuel ejergodkendelse og efterfølgende releasegates.
- **ISSUE-COAST-WORK-SCOPE-EXPANSION – STOPPET / AFGRÆNSET AF DEC-0036:** Arbejdet blev fejlagtigt udvidet fra seks fallbackzoner og adminværktøjet til en landsdækkende genkørsel. Ingen kandidat blev aktiveret offentligt. Den aktive opgave er nu bindende begrænset til de seks navngivne zoner; bred national genopbygning kræver ny, udtrykkelig ejergodkendelse.
- **ISSUE-PUBLIC-COAST-RESIDUAL-OWNER-CORRECTIONS – LUKKET / PRODUKTIONSVERIFICERET I 4.0.182:** Den symmetriske overlapgate fandt og fjernede 11 additive dubletdele, som den tidligere ensidige kontrol overså. Den aktiverede bestand har 643 dele, nul tværzoneoverlap, nul uafklarede relevante huller og punktpar til 643/643 dele. #31532688885 godkendte de 39 endelige nye punkter; #31541126136 bestod hele produktionskæden. Seks af 212 repository-hovedzoner bruger fortsat deres bevarede fallbacklinje.
- **ISSUE-PUBLIC-COAST-WADDEN-MAINLAND-GAP – LUKKET / PRODUKTIONSVERIFICERET I 4.0.182:** Den ravrelevante fastlandskyst fra Emmerlev mod Esbjerg indgår nu i tre hovedzoner. Rømødæmning og økyster er udeladt; de to ejerbestemte broer på samlet 4.671,4 meter er bevaret som dokumenterede undtagelser. #31541126136 og efterfølgende onlinekontrol bekræftede alle tre zoner med offentlige vejrdata.
- **ISSUE-NATIONAL-SOURCE-TILES-FOLLOWED-BAD-LEGACY-LINE – RODÅRSAG RETTET LOKALT / AFVENTER PRIVAT CI:** Den nationale kildeplan hentede kun GeoDanmark-fliser omkring hovedzonens gamle `coastLine`. Når netop denne linje lå kilometer fra den virkelige strand, fandtes den korrekte officielle kyst derfor ikke i inputtet. Planen dækker nu hele zonens afgrænsede ejerskabsgeometri (lokalt 128 mod tidligere cirka 100 fliser). De 190 allerede repræsenterede hovedzoner genbruger den hidtidige konservative matchning; de 18 aktive hovedzoner uden præcise dele får en bredere, fortsat privat recovery. Offentlig geometri må ikke ændres før ny kildehentning, national hul-/overlapaudit og ejerreview er bestået.
- **ISSUE-NATIONAL-RECOVERY-EVIDENCE-WINDOW – DELVIST CI-BEVIST I #31514481361:** Første udvidede private kørsel gav kystkandidater til 16 af de 18 hidtil helt manglende hovedzoner og øgede den private rå bestand fra 755 til 806 dele. Nibe Bredning vest afslørede, at zonepolygonen lå helt adskilt fra både kystlinje og land-/vandpunkter. Kildeplan og analysevindue bruger derfor nu summen af polygon, gammel linje og begge punkter (131 fliser lokalt). Ålsgårde/Helsingør mangler fortsat GeoDanmark-`Kyst`-kandidat og skal auditeres mod øvrige officielle lag; der må ikke tegnes eller gættes automatisk.
- **ISSUE-NATIONAL-RECOVERY-RECTANGLE-OVERREACH – FORKASTET EFTER #31516332559:** Ét samlet rektangel omkring modstridende polygon-, linje- og punktbeviser gav ganske vist Nibe en kandidat, men voksede det private råforslag urimeligt fra 806 til 1.072 dele. Metoden må ikke anvendes. Den erstattes af polygon-recovery for de 18 manglende zoner og kun ved helt tomt resultat et smalt, adskilt ekstrabånd omkring gammel linje/land-vandvidne. Lokal kildemåling giver dermed første forsøg plus Nibes 20,295 km og lader den geografisk fejlplacerede Ålsgårde/Helsingør-zone fail-closed.
- **ISSUE-PUBLIC-COAST-MUST-COMBINE-PARENT-ZONES-AND-PRECISE-SHORE – LUKKET / PRODUKTIONSVERIFICERET I 4.0.182:** Den godkendte løsning har 211 effektive, forståelige hovedzoner efter central tombstone og tegner 206 af dem med de præcise kystdele. De 643 interne dele giver ingen offentlige ticks, tooltips eller farveskift. Bestand og runtime har nul tværzoneoverlap og nul uafklarede relevante huller; seks repositoryzoner bruger sikker legacy-fallback. #31541126136 og efterfølgende onlinekontrol bestod.
- **ISSUE-PUBLIC-COAST-FIVE-RESIDUAL-ZONES – LUKKET/ERSTATTET I 4.0.187:** Det senere afgrænsede seks-zonereview erstattede denne kandidat. Fem zoner blev visuelt godkendt og aktiveres; Fejø/Femø blev udtrykkeligt slettet. Ingen resterende kandidat må aktiveres automatisk.
- **ISSUE-COASTAL-PARTS-PUBLIC-MAP-EXPLOSION – LUKKET / PRODUKTIONSVERIFICERET I 4.0.181–4.0.182:** 4.0.176–4.0.180 projicerede hver intern beregningsdel som en synlig kortzone. Det gav to sorte endemarkeringer, tooltip og tre Leaflet-linjer pr. del, gentagne zonenavne, synlige huller og langsom kortstart. Produktionen tegner nu kun hovedzonerne offentligt; lokale dele, punkter, vejr og RavScore bevares bag kulissen. Onlinekontrollen af 4.0.182 viste et synligt kort uden browserfejl.
- **ISSUE-COASTAL-PARTS-RELEVANT-BEACH-COVERAGE – AKTIV:** Ejerens offentlige kontrol viser, at enkelte kendte gode ravstrande ikke indgår i de lokale beregningsdele. Kortets hovedzonelinje genoprettes straks, men beregningsdækningen skal auditeres særskilt og eventuelle huller føres til kort ejerreview uden automatisk generering.
- **ISSUE-NATIONAL-LEGACY-REVIEW-COUNT-STALE – LØST LOKALT I 4.0.175 / AFVENTER PRIVAT CI:** Seks godkendte kartografiske sideafgørelser reducerede korrekt den gamle 783-dels reviews blokeringer fra ni til tre, men reviewgaten krævede stadig 752/22/9 og stoppede #31474672948 efter bestået upstreamkæde. Gaten kræver nu 758 komplette, 22 deldækkede og tre blokerede dele; ingen geometri eller scorelogik er ændret.
- **ISSUE-NATIONAL-FINAL-CROSS-ZONE-OVERLAP – LØST LOKALT I 4.0.174 / AFVENTER PRIVAT CI:** Slutkontrollen fandt 311 overlappar mellem forskellige zoner efter ejerrettelserne. Once-only-samlingen giver lokalt 603 dele og nul overlap; én næsten lige Hammer Odde-konflikt er erstattet af en eksplicit grænse ved nordspidsen.
- **ISSUE-NATIONAL-FINAL-POINTS-STALE-AFTER-OWNER-REVIEW – LØST LOKALT I 4.0.174 / AFVENTER PRIVAT DMI-CI:** Det tidligere 774/783-punktbevis lå før sletninger, beskæringer og tværzonededuplikering. Punkterne er nu genberegnet til 603/603 på slutgeometrien, inklusive seks kartografisk dokumenterede sideafgørelser. Native DMI- og downstreambevis mangler endnu.
- **ISSUE-NATIONAL-INNER-WATER-FOLLOW-UP – LØST LOKALT I 4.0.173 / AFVENTER PRIVAT CI:** Ejeren har afgjort de 23 supplerende dele. En efterfølgende metrisk dubletaudit fandt 12 andre tekniske ID'er for allerede bedømte fysiske linjer og fører afgørelserne sikkert videre. Den resterende efterkontrol er nul.
- **ISSUE-NATIONAL-OWNER-REVIEW-UNUSABLE-OVERVIEW – LØST OG VISUELT EJERBEKRÆFTET I 4.0.171:** Første review pressede hele Danmark ind i et lille, baggrundsløst kort og havde ingen godkendelsesarbejdsgang. Det er erstattet af én stor del ad gangen med baggrundskort/luftfoto, kraftig linje, automatisk zoom, beslutningsknapper, bemærkning og eksport.
- **ISSUE-NATIONAL-WIND-ASSET-BUDGET – LØST OG CI-VERIFICERET I #31448258035:** Det begrænsede valg af præcis to HARMONIE-assets bestod for alle 774 berettigede dele inden for downloadgrænsen.
- **ISSUE-NATIONAL-SHADOW-THREE-HOUR-TREND – LØST OG CI-VERIFICERET I #31448258035:** Et ægte native `t`/`t+3h`-par blev anvendt, og alle 752 komplette dele blev shadow-scoret uden interpolation.
- **ISSUE-NATIONAL-PART-WIND-NOT-YET-VERIFIED – LØST PRIVAT I #31425327202:** 774/774 dele har mindst to native HARMONIE-trin; retrypopulationen var 20, og samme celle, afstand og provenance bestod uden interpolation eller parentfallback.
- **ISSUE-NATIONAL-SHADOW-SCORE-NOT-YET-VERIFIED – LØST PRIVAT I #31425327202 / AKTIVERING LUKKET:** 752 fuldt dækkede dele blev scoret privat; 22 deldækkede og ni blokerede forblev fail-closed.
- **ISSUE-NATIONAL-OWNER-REVIEW-AND-ADMIN-ROUNDTRIP – CI-VERIFICERET I #31448258035 / AFVENTER EJERREVIEW:** Reviewet samler 783 dele, og tempkladde-roundtrip/rollback bestod uden ændring af beskyttede dokumenter. Ingen aktivering er tilladt før Jakobs manuelle gennemgang og særskilte beslutning.
- **ISSUE-NATIONAL-SOURCE-SEQUENTIAL-SCALING – LØST I #2029:** Den tidligere repositoryplan gav 101 fliser/707 requests. Efter central hydration gav #2029 den autoritative plan 100 fliser/700 requests, som blev hentet med højst fire samtidige fliser på ca. 5:15; hele validator-/QA-/artifactjobbet sluttede på 7:45.
- **ISSUE-NATIONAL-RAW-ARTIFACT-DOWNLOAD-SCALE – LØST I #2033:** Det private råartifact er 413 MB komprimeret. #2033 bevarede råbeviset og uploadede samtidig et separat kompakt 6,8 MB artifact med plan, manifest og begge 208-zone-QA-filer.
- **ISSUE-NATIONAL-GEOMETRY-SOURCE-ACQUISITION – PRIVAT CI-VERIFICERET I #2029/#2033:** Den central-hydrerede nationale kæde bestod med 208 zoner, 100 fliser, komplette eksponerede lag, deduplikering, credentialgate og rumligt indekseret QA. 4.0.146 bygger næste read-only havn-/å-/fjord-/relevanstopologiaudit.
- **ISSUE-NATIONAL-SOURCE-QA-WIDESPREAD-CONFLICTS – AKTIV:** Det kompakte #2033-artifact viser kun 20 source-reference-ready zoner og 188 flaggede; 167 har under 80 % nærhed, 123 har afstand over 1 km, 73 er stærkt fragmenterede, og 46 har central-admin-konflikt. Blind snapping er derfor eksplicit forkastet; topologi, semantik og partition skal behandles før delgenerering.
- **ISSUE-NATIONAL-RIVER-MOUTH-OVERSEGMENTATION – MÅLT I #2037 / MASKER TILBAGEHOLDES I 4.0.147:** Den første nationale regel målte 2.868 klynger i 180 zoner, heraf 189 ved Falster/Nysted. Det kan ikke kaldes dokumenterede åmundinger. 4.0.147 anvender ingen åmaske i zoner over 20 klynger, markerer no-go og eksporterer egenskabsprofil/diagnostik til næste regelrevision.
- **ISSUE-NATIONAL-RIVER-WIDTH-FILTER – PRIVAT CI-VERIFICERET I #2043:** Filteret reducerede åklynger fra 2.868 til 489 og overdense zoner fra 45 til én kendt partitionskonflikt. Ingen no-go-maske blev anvendt; den resterende zone fortsætter som eksplicit redesignreview.
- **ISSUE-NATIONAL-COASTAL-PART-FRAGMENTATION – OPDELING CI-VERIFICERET I #2107 / PUNKTER AFVENTER:** 755 dele blev dannet uden forbindelsesgeometri; 28 grove dele er erstattet af 56 lokale forslag på højst 19,882 km. Den endelige private bestand er 783 dele med officielle navneforslag til 783/783 i 4.0.154. Lokale land-/vandpunkter og DMI-kæder er fortsat fail-closed.
- **ISSUE-ZONE-GEOMETRY-NATIONAL-CONSISTENCY – AKTIV:** Det aktuelle register indeholder geografisk misvisende navne/placeringer, utilsigtede overlap og mange kystlinjer, der fortsat bygger på ældre AI-/fallbackgeometri. Integritetstests beviser propagation, men ikke en korrekt national kystpartition.
- **ISSUE-MULTI-ANCHOR-SAMPLING-GAP – AKTIV / DMI-GRIDGATE 4.0.158:** 774 valgte vandpunkter har mindst én komplet native havmodelfamilie; 22 mangler enten WAM eller DKSS og må ikke fremstilles som fuldt dækkede. Ni geometriske dele er fortsat blokeret. Ingen må markedsføres som forskellig lokal vind/strøm, før sampling og provenance er implementeret pr. kystdel.
- **ISSUE-NATIONAL-PART-SERIES-NOT-YET-SAMPLED – LØST PRIVAT I #2146 / IKKE AKTIVERET:** Alle 774 private serier og 1.526 tilgængelige familier bestod to native trin med komplet provenance. Resultatet er stadig kun QA; parent-zonerne er fortsat eneste runtime-sandhed.
- **ISSUE-NATIONAL-STATE-MISSING-CURRENT – CI-VERIFICERET GAB I #2152 / 4 DELE:** Fire WAM-only dele har ingen komplet DKSS-currentfamilie og kan derfor ikke få lokal `shadow-v2`-state. De skal vises som manglende state og må ikke få parentfallback eller nulstrøm.
- **ISSUE-NATIONAL-PART-WIND-NOT-YET-VERIFIED – #2164 HARBO ODDE-CELLEGAB / #2167 GLOBAL RETRY FOR LANGSOM / 4.0.166 AFVENTER CI:** Global 32-cellesøgning for 774 dele blev stoppet efter 54 minutter. 4.0.166 bruger fire celler for alle og 32 kun som målrettet retry for faktiske gab; samme celle og eksisterende afstandsgrænse håndhæves fortsat.
- **ISSUE-NATIONAL-SHADOW-SCORE-NOT-YET-VERIFIED – 4.0.164 AFVENTER PRIVAT CI:** Den lokale gate bruger eksisterende RavScore på eksakt tidsfælles native data og klassificerer DEC-0033-dækning. Ingen score må aktiveres, før artifactet, UI-reviewet og admin-roundtrip/rollback er bestået.
- **ISSUE-OFFICIAL-PLACE-NAME-SERVICE-TRANSIENT-NONJSON – EKSTERN BLOKERING:** Tre forsøg på privat 4.0.159-rebuild (#2133, attempt 1–3) bestod geometri/topologi, men den officielle stednavnetjeneste returnerede ikke JSON. Gaten må ikke omgås med uofficielle eller stale navne; genkør når kilden er rask.
- **ISSUE-NATIONAL-MULTI-STEP-PARTS-SCOPE – LØST OG CI-VERIFICERET I #2146:** #2142 fandt, at `parts_by_id` ikke var defineret i flertrinsvalidatorens live-`run()`. 4.0.161 rettede scope og routing; #2146 bestod.
- **ISSUE-ZONE-ID-SEMANTIC-DRIFT – AKTIV:** Omdøbning eller flytning kan få et stabilt teknisk ID til at beskrive en ny geografisk strækning. Historik, observationer, regler og adaptive data kræver en eksplicit migrationsklassifikation.
- **ISSUE-FJORD-EXCLUSION-BOUNDARIES – AKTIV:** Kravet om at udelukke alle fjorde undtagen Limfjorden kræver dokumenterede grænser ved mundinger, sunde og tvivlsomme indre farvande; det kan ikke skjules i navnematch eller en generel bufferheuristik.
- **ISSUE-COASTAL-TRAP-EVIDENCE – PLANLAGT:** Høfder, læsider og andre lokale ravfælder kan være fagligt relevante, men deres scoreværdi er endnu ikke valideret og forbliver score-neutral under geometriarbejdet.
- **ISSUE-REPOSITORY-VS-CENTRAL-ZONE-COUNT – HISTORISK, ERSTATTET I 4.0.197/4.0.208:** 4.0.186 beskrev en midlertidig 211-bestand efter tilføjelse af Vadehavszonerne. Efter de bindende sletninger af Fejø/Femø og Havnø/Mariager Fjord øst er den centralt effektive produktionsbestand 210. Historiske 208/209/211-filer bevares som evidens, men må ikke bruges som aktuel port eller genoplive slettede zoner.
- **ISSUE-NATIONAL-TOPOLOGY-STALE-ZONE-COUNT – RETTET LOKALT EFTER #31589831140 / AFVENTER PRIVAT CI:** Den private kæde nåede gennem den nye 211-zoneplan, officiel GeoDanmark-hentning, kilde-QA og vandmasker, men topologiaudit og den umiddelbare delgenerator håndhævede stadig 208. De fire fail-closed analyse-/validatorfiler og deres kontrakttests kræver nu 211. Offentlig geometri og aktivering er uændret.
- **ISSUE-NATIONAL-PLACE-NAME-STALE-TILE-COUNT – RETTET LOKALT EFTER #31590992368 / AFVENTER PRIVAT CI:** Den udvidede nationale plan har 131 fliser, men stednavneauditen krævede historisk præcis 100 og stoppede før API-kald. Audit og validator kræver nu samme positive fliseantal som den aktuelle plan samt mindst fem basisrequests pr. flise, svarende til alle valgte officielle stedtyper. Ingen navne eller geometri aktiveres automatisk.
- **ISSUE-GEODANMARK-FIRST-CI-PILOT – PRODUKTIONSVERIFICERET LØST:** #1936 hentede 21/21 komplette lag/område-udtræk i det private artifact. Seks krævede pagination; største udtræk havde 72.870 features. Adgang, lagvalg, pagination, råupload, maskering og isolation er verificeret. Forslagsgenerering er næste separate, fortsat score-neutrale fase.
- **ISSUE-GEOMETRY-PILOT-CONCURRENCY – PRODUKTIONSVERIFICERET LØST:** #1936 kørte i sin separate pilotgruppe samtidig med vejrproduktionsgruppen. Rutinevejr kan ikke længere erstatte eller afbryde piloten.
- **ISSUE-GEODANMARK-BLIND-SNAP-RISK – AKTIV:** Lokal 4.0.130-QA flaggede alle ni pilotzoner. Kystkilden indeholder flere bredder, øer og stærkt fragmenterede dele, mens enkelte eksisterende linjer er markant forskudte eller går på tværs af semantiske zonegrænser. Automatisk nærmeste-linje-snap må derfor ikke bruges; næste fase kræver klassificerede delstrækninger og eksplicit konfliktreview.
- **ISSUE-GEODANMARK-RAW-WATERCOURSE-OVERSEGMENTATION – LOKALT LØST / AFVENTER CI:** Første 4.0.132-prøve brugte begge vandløbskanter og midterlinjer og skabte 300 tekniske fragmenter med hundredvis af dubletter. Den frigives ikke. Løsningen bruger kun synlig, ikke-rørlagt midterlinje, kræver faktisk kystkontakt og indlandsfortsættelse, klynger dubletter og samler nærliggende fysiske fragmenter uden at opfinde forbindelsesgeometri. Samme artifact giver 84 private reviewforslag.
- **ISSUE-GEOMETRY-FJORD-POLICY-NOT-ENFORCED – LOKALT LØST / AFVENTER CI:** 4.0.132 beskrev fjordpolitikken, men havde ingen egentlig indre-vandpolygon. Visuelt review viste derfor kystdele i Nysted Nor og andre indre farvande. 4.0.133 henter officielle Farvand-GeoJSON-polygoner og udskærer `fjord`/`nor` uden for Limfjorden; pilotresultatet faldt fra 84 til 72 dele.
- **ISSUE-GEOMETRY-PILOT-ZONE-SEMANTICS – AKTIV OG GATED:** Zonekortene viser, at kun Blåvand er en lokal geometriopretning. Rømø og Askø/Lilleø er geografisk fejlplacerede; seks andre zoner kræver grænse-/partitionsredesign. Reviewgaten blokerer DMI-punktarbejde for disse otte, indtil nye semantiske afgrænsninger er dokumenteret.
- **ISSUE-BLAAVAND-DETAIL-PHYSICAL-VALIDATION – ORTOFOTO OG DMI-GRID LØST PRIVAT:** #1982 godkendte linjen mod officielt 2025-ortofoto. #1987 bekræftede gyldige WAM-/DKSS-celler, fælles current-U/V-lag og forskellige celler mellem begge vandpunkter. Dette er ikke i sig selv tilladelse til selvstændig sampling, admin-roundtrip eller aktivering.
- **ISSUE-BLAAVAND-INDEPENDENT-WEATHER-SERIES – PRIVAT FLERTID OG PROVENIENS LØST / INTEGRATION ÅBEN:** #1997 beviser fire fælles komplette native tider pr. del med fuld komponentproveniens, forskellige celler og nul krydsmerge/fallback. Separat state/historik, UI og admin-roundtrip er fortsat åbne; ingen serie er aktiveret.
- **ISSUE-COASTAL-PART-CROSS-MERGE – AFDÆKKET / KONTRAKTBLOKERET OG CI-VERIFICERET I #1992:** Den nuværende multi-anker-score sammenholder én zones vejrværdi med flere kystretninger. Hvis separate partdata blev koblet direkte på, kunne nordlig vejrsampling blive vurderet mod sydøstlig kyst og omvendt. Shadow-kontrakten forbyder derfor krydsmerge og part-score, indtil partidentitet følger hele kæden.
- **ISSUE-COASTAL-PART-HISTORY-COLLISION – PRIVAT ISOLATION LØST I #2004 / INTEGRATION IKKE AKTIVERET:** Produktionens historik slås op ved zone-ID. #2004 beviser, at private dele kan replayes med unikke `historyKey`-nøgler uden parent-genbrug, krydslæsning eller scorepåvirkning. En fremtidig produktionsintegration kræver stadig UI/admin/rollback/go-no-go.
- **ISSUE-COASTAL-PART-UI-ACTIVE-ZONE-AMBIGUITY – PRIVAT KONTRAKTBLOKERET OG CI-VERIFICERET I #2009 / INTEGRATION LUKKET:** Artifactet beviser én aktiv parent og to neutrale ikke-interaktive dele uden scorefarve, rangering eller “bedste del”. Offentlig integration og aktivering er fortsat lukket; næste sikkerhedsgate er admin-roundtrip/rollback.
- **ISSUE-COASTAL-PART-ADMIN-ROLLBACK – PRIVAT LØST OG CI-VERIFICERET I #2014 / AKTIVERING LUKKET:** Tempkladden blev slettet og verificeret fraværende; begge autoritative dokumenter beholdt identiske digests og versioner. Dette giver ikke aktiveringstilladelse; eksplicit ejer-go/no-go mangler.
- **ISSUE-BLAAVAND-HUK-HAIRPIN – LØST OG ORTOFOTOVERIFICERET I #1982:** 4.0.136 måler den afviste rute/chord-ratio, bevarer det søværts apex og genforener kysten efter den indadgående detur. #1982 viser, at den grønne relevante strandlinje springer lagune-/sandspidsomvejen over og ligger på sand/landsiden. 242,0 m detur fjernes uden sampling eller scoreændring.
- **ISSUE-OFFICIAL-PLACE-API-LIFECYCLE – OVERVÅGES / NATIONAL ADAPTER I 4.0.151:** Dataforsyningens nøglefri `steder`-API giver officiel stednavnegeografi, men DAWA er varslet til fremtidig lukning. 4.0.151 isolerer endpoint, kildefelter, flise-/requestspor og fail-closed validering; udfald må ikke udløse uofficiel fallback eller automatisk genbrug af gamle zonenavne.
- **ISSUE-PILOT-RENDER-DEPENDENCY-LEAK – RETTET I 4.0.131, AFVENTER CI:** #1942/#1943 stoppede almindelig fuld validering, fordi den private kort-renderers globale Pillow-import lækkede ind i produktions-self-testen. Importen er flyttet efter self-testen og kræves kun ved faktisk privat rendering; regressionstesten fastholder isolationen.

## 4.0.124 – komponenthuller og manglende timeproveniens
- **ISSUE-FIVE-ZONES-NO-SHARED-DKSS-GRID – PRODUKTIONSVERIFICERET LØST:** Bredere kandidatsøgning lukkede tre zoner; centrale adminrettelser lukkede Nibe/Sebbersund og Falster/Nysted. Alle fem har nu direkte DKSS-vindhale.
- **ISSUE-COMPONENT-FIVE-DAY-COVERAGE – AKTIV:** Seneste snapshot havde 3 Limfjordszoner helt uden bølger, 13 med 117 bølgetimer og 8 med kun 101 timer for strøm, vandstand og vandtemperatur. Missing bevares korrekt og må ikke skjules med nul eller stale værdier.
- **ISSUE-HOURLY-DMI-PROVENANCE – AKTIV:** Timekæden bevarer ikke endnu collection, model-run, lead time og prognosealder komplet fra STAC/GRIB til conditions. 4.0.124 måler tabet; næste designfase skal bevare rå identitet frem for at rekonstruere den efterfølgende.

## 4.0.123 – fem direkte DKSS-U/V-huller
`ISSUE-FIVE-ZONES-NO-SHARED-DKSS-GRID` er rettet i søgebredden, men ikke endnu lukket i produktion. #1851 og #1852 bekræftede samme fem huller trods komplet offentlig fallbackvind. Fire er Limfjordszoner med centralt gemte adminpunkter; den femte ligger ved Falster/Nysted. 4.0.123 undersøger flere marine landmaskeceller og rapporterer vindhalepar særskilt. Først en frisk produktionskørsel kan vise, om hullerne skyldtes kandidatloftet eller reel manglende DKSS-dækning inden for afstandsgrænsen.

## 4.0.122 – offentlig vindhale verificeret
`ISSUE-DMI-FIRST-FIVE-DAY-CHAIN` er delvist afklaret i produktion: #1845 leverede 208/208 zoner med 118 sammenhængende offentlige vindtimer og grønne gates/deploy. `ISSUE-FIVE-ZONES-NO-SHARED-DKSS-GRID` er fortsat afgrænset til provenance-spørgsmålet; offentlig fallbackdækning er ikke det samme som direkte DMI-gridbevis.

## Løst i 4.0.121 – historiske diagnostikworkflows
**Status:** LØST

`schedule-test.yml` målte tidligere GitHubs interne schedule-adfærd, og `pages-microtest.yml` kunne manuelt publicere en minimal testside. Ingen af dem indgik længere i aktiv test, release eller recovery. De er fjernet, fordi især mikrotesten kunne konkurrere med produktionsdeployet om `github-pages`-miljøet. En kontrakttest fastholder nu kun `update-and-deploy.yml` som repository-ejet workflow.

## Høj prioritet
1. **ISSUE-STATION-CACHE-STATUS – PLANLAGT:** Stationslivscyklus skelner endnu ikke fuldt mellem observation og gyldig prognosecache.
2. **ISSUE-HANDBOOK-EVIDENCE – LØBENDE:** Flere faglige antagelser om rav og sedimenttransport kræver ekstern ekspertvalidering.
3. **ISSUE-DMI-FIRST-FIVE-DAY-CHAIN – P1 ANALYSE PLANLAGT:** Komponenternes DMI-horisont kan være kortere end hele brugerprognosen. DEC-0030 kræver separat kildekortlægning og cirka 120-timers kædedesign pr. komponent: DMI til sidste valide time, eventuel anden DMI-kilde og kun derefter ekstern hale-fallback med fuld proveniens. Ingen produktionsændring før analysen.
4. **ISSUE-WATERLEVEL-CONTINUITY – OVERVÅGES:** Kunstige spring må ikke genopstå ved kildeskift; Vadehavet skal vurderes særskilt.
5. **ISSUE-STATION-OFFICIAL-AUDIT – DELVIST LØST I 4.0.103:** OceanObs-målestationer og `tidewaterstation`-prognosepunkter opdages fra deres dokumenterede collections og skrives til en samlet audit. Første produktion skal bekræfte antal, horisont og Hals-punkternes faktiske data.

## 4.0.120 – offentlig fallbackhale
- **ISSUE-WATER-ROUTING-DROPS-FALLBACK – RETTET LOKALT:** Vandstandsroutingen overskrev hele den offentlige blandede prognose med den rene DMI-cache. Routing opdaterer nu vandstand separat i begge serier og bevarer alle andre offentlige komponenter.
- **ISSUE-OPEN-METEO-CALENDAR-DAY-HORIZON – RETTET LOKALT:** `forecast_days=5` startede ved midnat og gav kun cirka 110 fremtidige timer ved en kørsel kl. 10. Fallback bruger nu `forecast_hours=120`.
- **ISSUE-FIVE-ZONES-NO-SHARED-DKSS-GRID – AFGRÆNSET:** Fem navngivne zoner havde ingen fælles gyldigt DKSS U/V-punkt i #1835-supportdata. Direkte DMI-havdata forbliver `missing`; afventer frisk produktionsbevis for fallbackhalen.

## Produkt og admin
6. **ISSUE-RULE-USABILITY – DELVIST:** Regelbyggerens fulde menneskevenlige workflow og konfliktforklaring skal løbende verificeres i browseren.
7. **ISSUE-COASTLINE-EDITOR – RETTET I 4.0.90, OVERVÅGES:** Søgning, zonevalg, omdøbning og central gemning er samlet i én brugerrejse. Mobil browsertest og rollback overvåges fortsat.
8. **ISSUE-CENTRAL-STORAGE – DELVIST:** Supabase-opsætning og rettigheder kræver fortsat driftsverifikation.
9. **ISSUE-SUPABASE-FREE-QUOTA – RODÅRSAG OG DATABASE RETTET I 4.0.153 / EGRESS-MÅLING AFVENTER:** Alle centrale payloads blev hentet hvert 15. minut, og store maskindiagnostikker fik ubegrænset versionshistorik. 4.0.153 filtrerer readback og gør uploads idempotente. Central oprydning 2026-08-10 fjernede 8.647 historikrækker/cirka 600 MB og reducerede databasen fra 699 MB til 24 MB uden tab af aktuelle dokumenter. Fair-use-status lukkes efter næste billingperiodes egressmåling.

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
- **ISSUE-WORKFLOW-DURATION – FORTSAT AKTIV:** Den normale 15-minutterskadence flyttes i 4.0.234 fra ekstern cron til GitHub ved minut 14/29/44/59. DMI-workload og GitHubs eventlevering skal måles efter naturlig aktivering; marine audits må ikke svækkes.

## 4.0.117 – schedulerens aktive zoner og DMI-vind
- **ISSUE-DMI-SCHEDULER-CACHE-DENOMINATOR – RETTET LOKALT I 4.0.117:** Schedulerens dækning kunne bruge zonerne i den gamle bulkcache som nævner og dermed overse nye aktive zoner uden cache. Nævneren er nu altid det aktuelle aktive zoneregister.
- **ISSUE-DMI-WIND-FAMILY-NAME – RETTET LOKALT I 4.0.117:** HARMONIE er familien `wind`, men schedulerens gamle mangeltabel brugte `atmosphere`. Reelt manglende DMI-vind kunne derfor få nul deficit. Familienavnet er nu konsistent gennem prioriteringen.
- **ISSUE-FORECAST-HORIZON-WIND-WAVE – FORTSAT AKTIV:** 4.0.116 fjernede falsk `null -> 0`; 4.0.117 retter dokumenteret schedulerudsultning. #1785 viste, at HARMONIEs native horisont er cirka 60 timer, så vind skal måles ved 24/48 timer, mens bølger og marine data fortsat måles ved 24/96 timer. Store HARMONIE-assets og runtime/downloadbudget forbliver et separat målepunkt.

## 4.0.117 hotfix – DKSS-modeludsultning under marine recovery
- **ISSUE-DKSS-GEOGRAPHIC-RECOVERY-ORDER – RETTET LOKALT I 4.0.117-HOTFIX:** 4.0.117 kunne registrere et marinegrundlagsgab uden at prioritere den DKSS-model, der geografisk dækkede de manglende zoner. Med to produktive collections kunne Limfjordsmodellen derfor blive stående som nummer tre, og strømauditten fejlede på aktive zoner uden bulkgrundlag. Schedulerprioriteten er nu datagabs- og kysttypebaseret. Afventer CI/produktion.
- **ISSUE-LIMFJORD-UV-SEARCH-RADIUS – DIAGNOSEN VAR UTILSTRÆKKELIG:** #1738 viste korrekt `NO_SHARED_UV_GRID_POINT`, og søgefladen blev udvidet uden at hæve 24-km-grænsen. Senere frisk CI viste, at dette ikke var den egentlige årsag til de tre tilbagevendende Limfjordsudfald.
- **ISSUE-DMI-UV-VERTICAL-LAYER-OVERWRITE – RETTET LOKALT, AFVENTER PRODUKTION:** DMI DKSS leverer strøm-U/V i flere vertikallag. Parserens kandidatcache var kun nøglebundet til familie+zone, så et senere/dybere U-lag kunne overskrive et lavere gyldigt U-lag før tilsvarende V blev behandlet. Lavvandede zoner kunne dermed ende uden vektor. Cache og parring er nu lag-isoleret, dybeste gyldige fælles lag vælges deterministisk, og parserversion 11 tvinger genbehandling.

## 4.0.117 – produktionsafslutning og Codex-overgang
- **ISSUE-DKSS-GEOGRAPHIC-RECOVERY-ORDER – PRODUKTIONSVERIFICERET LØST:** Efter de tidligere fejl er DKSS-recovery kørt succesfuldt i efterfølgende 4.0.117-produktioner. Bevar regressionstesten, men behandl ikke issue som åbent.
- **ISSUE-DMI-UV-VERTICAL-LAYER-OVERWRITE – PRODUKTIONSVERIFICERET LØST I 4.0.117:** Parsergeneration 11 isolerer U/V-kandidater pr. vertikallag. Efterfølgende friske 4.0.117-kørsler er grønne. Den tidligere radiusforklaring er historisk og må ikke genindføres som rodårsag.
- **ISSUE-ADMIN-ZONE-GEOMETRY-PROPAGATION – PRODUKTIONSVERIFICERET FOR SENESTE RETTELSER:** Tre Limfjordszoner havde reelt forkert land-/havpunkt og kystlinje. Administratoren rettede dem centralt; #1750 viste dem som ændrede og førte dem gennem den friske produktionskæde. Fremtidige tests skal beskytte propagation, ikke gamle koordinater.
- **ISSUE-FORECAST-EDGE-COVERAGE – RODÅRSAG FUNDET, RETTET LOKALT:** #1774 viste, at problemet ikke kun lå ved yderste kant: vind manglede helt i 187/208 zoner og bølger i 33/208. Samtidig havde 203/208 mindst 96 timers marinegrundlag. Binær `marineFoundationMissing` gav fortsat begge produktive pladser til DKSS og udsultede HARMONIE. Balanceret recovery efter 95 % marinegrundlag bevarer én DKSS-plads og åbner én plads for den mest underdækkede vind-/bølgefamilie. Afventer frisk produktion; ingen stale udfyldning eller nulkonvertering er indført.
- **ISSUE-HARMONIE-EXPIRED-ASSET-BUDGET – RETTET LOKALT EFTER #1778/#1779:** Schedulerrettelsen blev produktionsbekræftet, men #1778 brugte 1,74 GB på de tre ældste HARMONIE-assets med valid-tider 18–20 UTC, som allerede var udløbet ved generering 22:13 UTC. #1779 genbrugte dem og nåede frem til 23 UTC; offentlig vind steg fra 21 til 199 zoner med mindst noget data, men femdøgnshorisonten var endnu ikke genopbygget. Nye bulk-kørsler springer nu forecasttrin ældre end én time over, så downloadbudgettet starter ved den aktuelle forecastkant. Ingen fremtidige trin springes over, og progressiv cache bevares.
- **ISSUE-HARMONIE-PARTIAL-RUN-RESET – PRODUKTIONSVERIFICERET LØST I #1788:** #1785 valgte 18Z frem for den kortere 21Z-publikation. #1788 beviste den kildespecifikke 48-timersregel i drift: 18Z blev fastholdt, fire assets blev genbrugt, og den progressive serie voksede fra fire til syv tider; fulde gates og deploy bestod. Marine samlinger beholder 96 timer. Regression og diagnostik bevares.
- **ISSUE-DOCUMENTATION-DRIFT-BEFORE-CODEX – RETTET I HANDOFF:** `05_NEXT_CHAT_HANDOFF.md` og flere statusdokumenter beskrev en ældre 4.0.114–4.0.116-baseline. De er opdateret til 4.0.117, og en dedikeret Codex-pakke er gjort obligatorisk.
- **LOCAL-SNAPSHOT-CURRENT-PROVENANCE-WARNINGS – OBSERVATION VED HANDOFF:** Den lokale 4.0.117-pakke består fuld validering, men spatial-auditten giver 12 warnings for manglende dokumenteret current-gridproveniens i det medfølgende datasnapshot. Dette er ikke i sig selv en frisk produktionsfailure. Ved analyse skal snapshotets alder holdes op mod #1750 og nyere produktioner.

## 2026-08-07 – Bulk-zone-struktur efter dynamiske adminzoner
- **Fundet i produktion:** Strømaudit fejlede for Fur syd, Gjøl og Attrup, Aalborg vest og Egholm, Aalborg øst og Nørresundby samt Falster vest og Nysted Nor munding, selv om central weather-cache rapporterede `OK ... via mixed`.
- **Rodårsag:** `update-dmi-bulk.py` oprettede kun zoneposter, når et DMI-felt blev fundet eller en gammel bulkpost fandtes. En aktiv zone uden direkte bulk-hit kunne derfor forsvinde helt fra bulkstrukturen.
- **Rettet i Codex-handoff-kandidaten:** Bulk-builderen materialiserer nu hele den aktuelle zone-/kilderegistrering før DMI-felter flettes ind og filtrerer gamle bulkposter mod den aktuelle registrering. Missing forbliver missing; ingen nuldata eller stale data indføres.
- **Validering:** `npm run validate` og `npm run release:gate` består lokalt. Produktionsverifikation kræver næste friske GitHub/DMI-kørsel efter upload.

- **ISSUE-WORKFLOW-FALSE-GREEN-DEPLOY – PRODUKTIONSVERIFICERET LØST I #1772:** Bypasset blev lukket ved at lade gates følge enhver positiv preflight. #1769 beviste korrekt stop før artifact ved rød validate; #1772 beviste begge gates, artifact og Pages-deploy som `success` i samme friske run.
- **TRANSITION-NOTE – ERSTATTET:** Pre-Codex bootstrap-undtagelsen er ophørt i kode. Den bevares kun som historisk forklaring.
- **ISSUE-BULK-EMPTY-ACTIVE-ZONES – PRODUKTIONSVERIFICERET LØST I #1772:** #1769 afslørede, at `clean_and_summarize` slettede aktive records med tom `hourly`. Tomme records bevares nu som eksplicit `missing`; #1772 bestod den fulde spatial-audit uden stale data eller nuludfyldning.

## 4.0.118 – DMI-first vindhale
- **ISSUE-FIVE-DAY-DMI-WIND-TAIL – RETTET LOKALT, AFVENTER PRODUKTION:** DKSS' dokumenterede 10-meter U/V-vind udtrækkes nu som en separat hale efter HARMONIE. Modelserier blandes ikke, og HARMONIE vinder i overlap. En frisk kørsel skal bevise feltgenkendelse, zonehorisont, kildeskift og fulde release-gates.
- **ISSUE-OPEN-METEO-LOCAL-TIME-AMBIGUITY – RETTET LOKALT, AFVENTER PRODUKTION:** Fallback blev forespurgt med `Europe/Copenhagen` og leverede offsetløse tider. Kaldet bruger nu GMT, og tider lagres eksplicit som UTC.
- **ISSUE-FIVE-DAY-PER-HOUR-PROVENANCE – VANDSTAND PRODUKTIONSVERIFICERET I 4.0.209–4.0.211:** #31849701179 fandt tabet af identitetsfelter på DMI-vandstandstimer. Continuity-trinnet læser nu den oprindelige DMI-kilde fra `dmiByTime`; efterfølgende fulde produktioner og releasegates er grønne. Den bredere analyse af providerskift og femdøgnshale fortsætter under DEC-0030.
- **ISSUE-DMI-FIRST-MULTIPLE-PROVIDER-REVERSALS – RODKLASSER DOKUMENTERET / DESIGN ÅBENT:** Første fallbacktime ligger før DMI-seriens start. Vindens korte interne huller ligger ved progressive HARMONIE/DKSS- og runovergange. Strøm/vandtemperatur har i 198/210 zoner hovedsageligt fallback med kun sene native DKSS-blokke; 10 zoner har sammenhængende DKSS. Ingen kilde- eller mergeændring er godkendt.
- **ISSUE-WEATHER-HISTORY-ONLY-24H – PRODUKTIONSVERIFICERET, 72-TIMERS MÅLING ÅBEN:** En separat 72-timershistorik bevares nu score-neutralt; #31855164652 viser 107 bevarede prøver i alle 210 zoner efter endnu en kørsel. Det fulde 72-timers vindue skal stadig gennemløbes og dokumenteres. Aktiv score/state forbliver på 24 timer, og rå data udelades fortsat fra public projection.

## 4.0.119 – produktionsbevist DKSS-parserfejl
- **ISSUE-DKSS-WIND-TAIL-V-DROPPED – PRODUKTIONSVERIFICERET LØST I #1831:** #1828 beviste, at DKSS-id 34 blev fejlfortolket som `sst` og forkastet som tvetydigt. #1831 genkendte begge U/V-felter, gav vindhale i 107 zoner med mindst 96 timer og gennemførte fulde gates/deploy. Det offentlige datasæt havde 108/208 zoner med mindst 96 timers samlet vind og maksimum 111,5 timer.
# 4.0.184 – løst lokalt, afventer produktionsbevis

- **ISSUE-LOCAL-SCORE-EXPLANATION-DROPPED – LØST LOKALT:** 4.0.183 viste korrekt lokal totalscore og AI-prognose, men konstruerede derefter et tomt `components`/`componentReasons`-objekt. Derfor stod delscorer som `–/100` og UI hævdede fejlagtigt, at data manglede. 4.0.184 fører vinderens eksisterende scorer og forklaringer videre og viser kystdelens geografiske betydning efter den uændrede syvpunktsregel.

# 4.0.183 – løst og produktionsverificeret

- **ISSUE-INTERNAL-BLACK-MAIN-ZONE-MARKERS – LØST OG PRODUKTIONSVERIFICERET:** Offentlig runtime tegnede tidligere to sorte ender for hver hovedzone uden at samle fælles grænser. 4.0.183 tegner ét lille skel alene ved et gensidigt møde mellem forskellige hovedzoner. GitHub Actions #31572312647 bestod.
- **ISSUE-ADMIN-MAIN-ZONE-LENGTH-DID-NOT-PROPAGATE-LOCAL-PARTS – LØST LOKALT:** Den tidligere frie hovedlinjeredigering ændrede ikke ejerskabet af de aktive præcise kystdele. Admin kan nu flytte en eksisterende del til en anden hovedzone, og public runtime omgrupperer geometri og lokal dataidentitet samlet.
# 4.0.193 – lokal DMI-/forklaringskæde under systemisk rettelse

- **ISSUE-LOCAL-PARTS-EXCLUDED-FROM-DMI-COVERAGE – KODEKÆDE PRODUKTIONSVERIFICERET / FULDDÆKNING AFVENTER:** Schedulerens dækning blev afsluttet ud fra hovedzonerne alene. #31764453987 bestod frisk data, fuld validering, releasegate og deploy med rettelsen. 4.0.232 erstatter den historiske 95 %-indfasning: en ny release af 673-dels pakken kræver verificeret tilladt U/V til alle 673 dele.
- **ISSUE-LOCAL-EXPLANATION-AND-WEATHER-STRIPPED – RETTET LOKALT:** Runtimebuilderen gemte kun vægte og bidrag for vinderen og tabte transportdiagnostik og lokalt råvejr. Debug blandede derefter hovedzonens retning med den lokale score. Hele forklaringen og den lokale datakontekst føres nu samlet.
- **ISSUE-SINGLE-PART-FALSE-WHOLE-ZONE – RETTET LOKALT:** Én beregnet del med spredning nul blev fejlagtigt præsenteret som bevis for hele zonen. UI kræver nu mindst to dele før en geografisk sammenligning.
- **ISSUE-ACTIVE-POINT-TANGENT-MISMATCH – RETTET OG AKTIVERET LOKALT:** 13 punktpar afveg over 5 grader fra normalen ved deres eget kystreferencepunkt. Alle 13 er rettet; privat #31764242827 validerede de 45 berørte/nye vandpunkter med fuld native DMI-dækning, og den samlede pakke har 0 resterende afvigelser.
- **ISSUE-COASTAL-ORIENTATION-UNDERSEGMENTED – RETTET OG AKTIVERET LOKALT:** Blandt andet Helgenæs øst havde én teknisk del trods vedvarende forskellige orienteringer. 10 enkelt-delte hovedzoner er konservativt opdelt; den aktive kandidat har 673 dele og består punkt- og overlapgates. Rejsby/Ribe Vesterå forbliver blokeret frem for at gætte.

# 4.0.199 – privat national land-/vandkørsel

- **ISSUE-PRELIMINARY-POINT-CORRECTIONS-REQUIRED-FUTURE-PARTS – LØST LOKALT:** Privat #31794474426 stoppede, fordi den foreløbige punktbestand blev krævet at indeholde 14 dele, som først tilføjes af ejerrettelser senere i workflowet. Første fase må nu registrere dem som udskudte. Den afsluttende fase er uændret streng og stopper fortsat, hvis blot ét evidens-id mangler.

# 4.0.200 – korrigeret punktpar skal have konsistent status

- **ISSUE-INDEPENDENT-CORRECTION-LEFT-BLOCKED-STATUS – LØST LOKALT:** #31796921725 anvendte 107 rettelser og udskød de korrekte 14, men DK-B07-21 beholdt sin gamle blokerede status efter at have fået et komplet, uafhængigt dokumenteret punktpar. Rettelsen normaliserer nu hele den isolerede punktkontrakt og genberegner rapportens foreslået/blokeret-summer; DMI, state, score og automatisk aktivering forbliver deaktiveret indtil senere gates.

# 4.0.201 – ejer-reviewets historiske delantal

- **ISSUE-NATIONAL-OWNER-REVIEW-STALE-783-COUNT – LØST LOKALT / AFVENTER CI:** #31798588868 passerede kyst-, punkt-, DMI-, state-, vind- og shadow-gates med 835 indbyrdes konsistente dele, men reviewbyggeren krævede fortsat 783 fra 4.0.175. Review og admin-roundtrip bruger nu den validerede faktiske bestand og stopper ved manglende 1:1-identitet eller tælleafvigelse; ny privat slutkørsel mangler.

# 4.0.202 – national DMI-gate havde marginalt standardbudget

- **ISSUE-NATIONAL-DMI-GRID-DEFAULT-BUDGET – LØST LOKALT / AFVENTER CI:** #31802022918 nåede standardloftet under sidste DKSS-model efter 11,1 minutter, mens #31798588868 bestod samme 835-dels gate på 8,5 minutter. De tre private nationale DMI-gates får nu eksplicit 3.000 sekunder. Datakrav, afstandsgrænser og fail-closed-resultat er uændrede.
# 4.0.215 – privat besøgsstatistik

- **ISSUE-ANALYTICS-ANONYMOUS-NOISE – ÅBEN/OVERVÅGES:** Den dataminimerede tæller gemmer ingen vedvarende besøgsidentitet. Det beskytter privatlivet, men betyder også, at browserbesøg ikke kan bevises som unikke mennesker, og at automatiseret støj ikke kan fjernes præcist uden at indføre mere sporing. Admin bruger derfor betegnelsen browserbesøg, og dagstal/egress overvåges efter deploy.
- **ISSUE-ANALYTICS-MIGRATION – LUKKET FØR DEPLOY:** Den versionsstyrede 4.0.215-migration er installeret i Supabase. Tabel og begge funktioner er verificeret, anonym rapportlæsning er afvist, og de to testbesøg er fjernet igen.

## GitHub Actions Node-runtime - 2026-08-20
- **ISSUE-GITHUB-ACTIONS-NODE20-DEPRECATION - LØST LOKALT / AFVENTER CI OG PRODUKTION:** Produktion `#32354210495` var grøn, men advarede om Node 20. De ni berørte workflows bruger nu de officielle Node 24-majorer: checkout v7, cache v6, setup-python v7, setup-node v7, upload-artifact v7, download-artifact v8, configure-pages v6, upload-pages-artifact v5 og deploy-pages v5. Gates, jobrækkefølge, inputs og betingelser er uændrede; fuld PR- og produktionskontrol mangler.

## Aktuel workflow-sandhed, 2026-08-20
- main indeholder Action-opgraderingen fra PR #3, men den første push-produktion blev stoppet før deploy af gamle versionsforventninger i fem regressionstests.
- Den offentlige side er derfor fortsat den senest verificerede 4.0.238-dataset fra før PR #3; merge-commit 4c6b7e3a er endnu ikke produktionsverificeret.
- Reparationskandidaten gør PR-gaten i stand til at opdage denne klasse af fejl før merge og ændrer ikke produktdata eller modeladfærd.
## Workflowoptimering produktionsverificeret, 2026-08-20
- PR #4 blev merged som 8e4c11c3 efter grøn 17-sekunders kildegate.
- Push-produktion 32359944007 bestod fuld validering, release-gate, supportupload, Supabase, Pages-build og Pages-deploy.
- Supportartifactet er RavRadar-support-3259. Den offentlige dataset er rr-20260820104155-210 med 210 zoner og 673 kystdele.
- Fuld Playwright-kontrol bestod 420 aktuelle visninger og 2.100 prognosevisninger uden score-, pile-, farve-, forklarings-, konsol-, side- eller HTTP-fejl.
- De tidligere Node 20-advarsler er væk. Den officielle Pages-action skriver fortsat en ikke-blokerende punycode-deprecation fra sin egen afhængighed.
- Arbejdsgangsopgaven er afsluttet; næste aktive arbejde er igen P1-historik og modelcyklusser.
## Endelig workflowproduktion 3261, 2026-08-20
- PR #5 blev merged som 0d29a512 og udløste den forventede sidste fulde produktion, fordi selve workflowfilen var ændret.
- Produktion 32361218606 bestod fuld validering, release-gate, supportupload, Supabase og Pages-deploy. Supportartifactet er RavRadar-support-3261.
- Den offentlige dataset rr-20260820105744-210 indeholder 210 zoner og 673 kystdele.
- Fuld Playwright-kontrol bestod 420 aktuelle visninger og 2.100 prognosevisninger uden score-, pile-, farve-, forklarings-, konsol-, side- eller HTTP-fejl.
- Merge af dette rene interne dokumentationscheckpoint er den praktiske kontrol af paths-ignore-reglen og skal ikke starte produktionsworkflowet.
## Observation privacy follow-up - 2026-08-20
- **ISSUE-HISTORICAL-OBSERVATION-GPS - OWNER DECISION REQUIRED:** 4.0.239 prevents precise trip GPS from entering new or retried central observation payloads. Rows written by older versions may still contain GPS. Do not inspect, export or delete those values ad hoc. A count-only audit, migration, rollback/backup decision and explicit owner approval are required before irreversible cleanup.

## ISSUE-HUNTABILITY-SAFETY-CONFLATION - LUKKET I PRODUKTION 4.0.240

- Jagtbarhed blev tidligere omtalt som både praktisk mulighed og sikkerhed.
- Kilden adskiller nu begreberne og viser en fast sikkerhedsnote.
- Lukket efter PR #23, frisk produktionsvalidering, deployet kildekontrol og fejlfri onlineaudit.

## ISSUE-ACTIVE-WAVE-APPROACH-VALIDATION - ÅBEN I 4.0.241 SOURCE

- Den relative bølgeproxy er en forskningsbaseret arbejdsprior og ikke lokalt kalibreret bundfysik.
- Effekten er derfor begrænset og falder til nul ved manglende input.
- Luk først efter nationale audits, fulde gates, browserkontrol og produktionsverifikation.

## Foreløbige RavScore-vægte kræver senere kalibrering

25/40/35 i DEC-0041 er en forskningsbaseret prior og ikke en empirisk dansk fundkalibrering. Revurdering kræver mindst cirka seks måneders brugbare ture med både fund og reelle nul-fund; enkelte fund må ikke bruges som genvej.
## Åben: eksisterende tripobservationer er ikke kalibreringsklare

- Den aktuelle formular gemmer dato/zone/Ja-Nej/gram, men ikke faktisk lokal kystdel, søgetid, dækningsgrad eller stabil prognosereference.
- `observed_at` sættes til kl. 12 på valgt dato, og jagtformen kan komme fra appens senere tilstand frem for turstart.
- Eksisterende rækker bevares og må bruges coverage-only. De må ikke bruges til koefficientfit uden fuldt feltbevis.
- Løsningen er den dataminimerede tripkontrakt i DEC-0042; præcis GPS må fortsat ikke sendes centralt.

## Lukket gate 4.0.243: Supabase-turkontrakt

Migrationen `20260821_trip_evidence_contract.sql` blev anvendt og verificeret på `public.observations`, og 4.0.243 blev efterfølgende merged, deployet og browserverificeret. Den historiske gate er lukket; nye ændringer skal fortsat bevare kolonner, RLS og privacykontrakt.
## KI-2026-08-21-SUPABASE-EGRESS

- **Status:** Åben driftsrisiko, ikke en kodefejl i 4.0.243.
- Supabase-dashboardet viser, at organisationen overskred egresskvoten i forrige betalingsperiode og varsler begrænsning fra 9. september 2026, hvis forbruget fortsat ligger over grænsen.
- Næste sikre trin er at identificere de største egresskilder og reducere unødvendige kald eller vælge en passende plan. Denne analyse må ikke eksponere private payloads.
### Egress-analyse 2026-08-21

- Usage-grafen viste tidligere cirka 700-1.500 MB pr. dag, men kun 64 MB den 20. august. Trafikken var 100% PostgREST; Functions var ubetydelig.
- Den kraftige reduktion falder sammen med den allerede indførte pakning af runtime-diagnostik. Ved cirka 64 MB pr. dag er en simpel månedsfremskrivning under 2 GB og dermed under gratisgrænsen på 5 GB.
- **Beslutning:** Ingen ny cache- eller manifestarkitektur nu. Overvåg næste betalingsperiode og grib kun ind, hvis dagsforbruget igen stiger varigt over cirka 160 MB.

## ISSUE-COPERNICUS-DMI-REFERENCE-HOUR-4.0.246 - LUKKET I PRODUKTION

- 4.0.245-produktion `32465245055` stoppede korrekt, fordi triggerens 08:00-time havde 0/673 lokale DMI-strømme, selv om DMI-cachen var frisk og indeholdt andre felter på timen.
- Nærmeste verificerede DMI-strømtime var 09:00 med 622/673 og 51 reelle supplementhuller.
- 4.0.246 løser timen inden for højst tre timer og binder efterfølgende DMI/Copernicus/live/score til samme time.
- PR #36 blev merged som c2e0d024. Produktion 32467031990 bestod 673/673, fuld validering, releasegate, Supabase og Pages; live viser version 4.0.246 og den løste 09:00-reference.

## Historik – ISSUE-CANDIDATE-G-WADERS-MEANING før DEC-0054–0060

- Den kanoniske Candidate G-matrix kan give cirka 79 point samtidig med waders-jagtbarhed 0, fordi den fysiske gate efter DEC-0050 ikke indeholder jagtbarhed.
- Replayet har 219 waders-evalueringer under 35 i jagtbarhed; på den foretrukne no-direct-wind-variant har 7 samtidig mindst 55 point. Den tidligere bredere G-optælling på 10 brugte ikke præcis samme variant.
- Dette er ikke en offentlig regression, fordi Candidate G er diagnostic-only. Det er en aktiveringsstopklods for betydning, UI og forklaring.
- Ejeren har besluttet næste forskningskontrakt: strand forbliver uden loft, mens waders bruger et synligt loft ved jagtbarheden og en vinddel på 100 til 6 m/s med monotont fald derover. Dette er ikke en sikkerhedsgate.
- Den score-neutrale variant `G-50-50-NO-DIRECT-WIND-WADERS-LIMIT` giver nul waders-score i 0/79-yderpunktet, ændrer nul af 730 strandscorer og giver ingen waders-score over jagtbarheden.
- Den tidligere separate-metodestatus-anbefaling er erstattet som forskningscentrum. En tydelig produktforklaring er fortsat nødvendig, men må ikke skjule eller omgå den besluttede scorekobling.
- Det score-neutrale model-, vægt- og forklaringsgrundlag er nu samlet. Offentlig aktivering er fortsat blokeret af utilstrækkelig lokal coverage og ejerens endelige go/no-go. Produktionsbeviset er ikke et aktiveringsbevis for den nye variant.

## Historik – ISSUE-CANDIDATE-G-FRESH-NATIONAL-SHADOW før fallback-kompatibel 210/673-shadow

- Centralt hydreret exact-head-run `32554012542` kontrollerede 673 aktive dele i 210 zoner og gennemførte G 24 timer, 50/50, 48 timer og 50/50 uden direkte vind uden offentlig ændring.
- 243 dele blev scoret i begge jagtformer; 430 var eksplicit u-scorede, nul var blokerede, og retention-featurecoverage var nul.
- 4.0.253 rapporterer nu coverage samlet og fail-closed. Parentzonens morfologifelter accepteres udtrykkeligt ikke som dokumentation for den lokale kystdel.
- Aktuelle centrale regler var hydreret, men havde nul aktive regler og nul matches.
- Kørselsgaten er dermed lukket. Coverage-, ekstrem-, forklarings- og ejer-gaten er fortsat åbne; ingen aktivering må ske på dette grundlag alene.
- Den nye fail-closed coverageklassifikation bestod PR #62's exact-head-gate og den fulde 4.0.253-produktion. Den klassificerer manglen; den fylder ikke 430 u-scorede dele kunstigt ud.

## Historik – ISSUE-CANDIDATE-G-ARROW-HISTORY-EXPLANATION før 4.0.261-koblingen

- 4.0.253 rekonstruerer komponenter, vægtede bidrag, fysisk gate og slutscore uden afvigelser i 1.460/1.460 evalueringer.
- Blandt 872 tydeligt retningsbestemte contexts var aktuel retning og historik modrettet i 332; i 100 flyttede historikken den afrundede score.
- Pilen skal fortsat betyde aktuel lokal strøm. Historisk nettoforløb skal forklares separat på samme kystdel, tidspunkt og jagtform og må ikke skjult ændre pilens betydning.
- Den score-neutrale kontrakt er lukket. Endelig offentlig UI-/forklaringskobling kræver ejerbeslutning og efterfølgende browservalidering.
- Kontrakten er merged og produktionsverificeret i 4.0.253 (`01904b92`/`32570223437`) uden offentlig UI-kobling.

## Historik – ISSUE-CANDIDATE-G-WEIGHT-CALIBRATION før ejerens 20/50/30-beslutning

- Den godkendte waders-variant er genafspillet med `15/50/35`, `20/45/35` og `25/40/35` på 1.460 evalueringer.
- Yderpunkterne adskiller sig 4,947 point i gennemsnit og 282 referencebånd. `20/45/35` ligger praktisk midt mellem dem og bevares som Candidate G's analysecentrum.
- Alle tre priorer består de kanoniske proces- og waders-kontrakter. Scenarier og udvalgte hændelsesvinduer kan derfor ikke afgøre den empirisk bedste vægt.
- Endelig kalibrering kræver komplette ture med fund, reelle nul-fund og søgeindsats. Offentlig 25/40/35 forbliver uændret, indtil coverage og samlet ejer-go/no-go er lukket.
- Candidate G's maskinlæsbare forklaring rekonstruerer 1.460/1.460 evalueringer og holder pil nu, historik før nu, komponentbidrag og det synlige waders-loft adskilt. Den er diagnostic-only og ikke en offentlig UI-ændring.

## ISSUE-RAVSCORE-SHADOW-ADMIN-CONTRACT - LUKKET I PRODUKTION

- PR #59's kildegate var grøn, men produktion `32565885534` stoppede før release og deploy, fordi den fulde shadowtest afviste selve ordet `admin`.
- Den faktiske nye adfærd læser centralt gemte regler med GET og bygger kun en lokal midlertidig regelfil; den skriver ikke til central admin.
- Testen lå ikke i `validate:source`. PR #60 flyttede den ind i kildegaten og erstattede ordforbuddet med eksplicit tilladelse af de to læsetrin samt forbud mod konkrete skrive-, roundtrip- og deployveje.
- Exact-head-gate `32566573875`, merge `41e01e2d`, fuld produktion `32566631701` og Pages deployment `6035679906` er grønne. Issuet er lukket uden score-, data-, geometri- eller punktændring.
