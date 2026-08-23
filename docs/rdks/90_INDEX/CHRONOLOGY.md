# Rekonstrueret chatkronologi

## 2026-08-23 – ejeren vælger en privat turlog uden dobbeltlagring

1. Ejeren bad om et let forståeligt konto-link til brugerens egne ture og fund og gjorde det bindende, at eksisterende Supabase-data skal genbruges for at beskytte free-planen.
2. Kodegennemgangen viste, at `observations` allerede rummer turdata og har RLS for egne rækker. Løsningen læser samme række i stedet for at bygge en ny tabel eller gemme en kopi.
3. Den aktive turknap havde stadig en gammel GPS-baseret parallelrejse foran v2-dialogen. Den fjernes fra brugerrejsen, så Start/Afslut/Færdiggør bruger én komplet v2-tur uden GPS eller rute.
4. Kontologgen er doven og begrænset til de seneste 100 ture og et lille feltudvalg. Lokale afventende ture deduplikeres mod serveren via eksisterende klient-/tur-id.
5. `user_id` tillades som en snæver teknisk RLS-kobling til den samme række. Mail/navn gemmes ikke i turposten, og identiteten må ikke bruges i analyse eller modeltræning. Anonyme ture forbliver anonyme.
6. Magic link forklares i almindeligt dansk, callbacken hydreres med den faktiske Supabase-bruger, og centrale offentlige RavScore-ord forenkles uden scoreændring.
7. Den lokale 4.0.264-kandidat og kildegaten blev grønne; PR #104 bestod exact-head `32651048627` og blev merged som `579bd167`.
8. Produktion `32651106811` stoppede før release, fordi en gammel fuldtest stadig krævede den fjernede GPS-parallelrejse. PR #105 rettede kontrakten, bestod exact-head `32651724416` og blev merged som `7c43146f`.
9. Produktion `32651786366` stoppede derefter før deploy på en anden gammel ordret test af stjerneforklaringen; den rettede feedbacktest var grøn. Den aktuelle opfølgning retter denne test og en lokalt fundet gammel mobil-turtest og flytter begge ind i `validate:source`. Frisk fuld produktion og live kontrol mangler.
10. PR #106 bestod exact-head `32652894729`, blev merged som `23fa89ed`, og produktion `32652970105` udgav `rr-20260823165645-210` som 4.0.264 på 210/673 efter grøn fuld validering og releasegate.
11. Live konto/login og direkte tur uden GPS/rute blev kontrolleret. Den fulde audit afslørede kun en gammel testetiket: `3-timers trend` mod UI'ets `Vandstandsændring på 3 timer`. Med etiketten rettet bestod 420/2.100/673 uden browser-, konsol-, side- eller HTTP-fejl.
12. PR #107 bestod exact-head `32654048944`, blev merged som `8b758337`, og produktion `32654119745` bestod hele kæden igen og udgav `rr-20260823171804-210`. Den afsluttende rene dokumentationsmerge bruges som bevis for 0 push-produktionskørsler.


## 2026-08-23 – den aktuelle Candidate G-gate afgrænses fra senere prognosehuller

1. 4.0.262 blev exact-head- og produktionsverificeret. Cadencerettelsen fortsatte alle 673 states uden nulstilling og gav 110 positive transportpotentialer mod 0 før rettelsen; 563 var fortsat fysisk nul efter de aktuelle strømforhold.
2. Den offentlige profil stod alligevel på legacy, fordi `candidateWarmupEligible` blev beregnet over hele femdøgnsprognosen. Et senere prognosehul blev derfor fejlagtigt brugt som bevis mod den faktisk viste aktuelle opvarmning.
3. Ejeren bad om en grundig permanent rettelse og en almindeligt forståelig forklaring af både tre-timersfejlen og rollbackrollen efter leverancen.
4. DEC-0062 lader den globale profilgate bedømme memory ved den nærmeste fælles aktuelle scoretid for alle dele i hver zone. Senere huller påvirker fortsat deres egne fremtidige states fail-closed, men slår ikke den aktuelle profil fra.
5. Komplet beregnelig Candidate G-scorecoverage kræves stadig for alle publicerede rækker, og missing eller tidsgab ved den faktisk valgte aktuelle reference vælger fortsat legacy globalt.
6. PR #101 bestod exact-head `32644701811`, blev merged som `9f5953f6`, og fuld produktion `32644772373` udgav live `rr-20260823142247-210` med Candidate G aktiv på 210/673.
7. Den dataminimerede audit bestod 673 fortsatte states, nul reset/replaymismatch og 139 positive mod 534 aktuelt fysiske nultransporter. Aktiv shadow `32645569741` og browser 420/2.100/673 er grønne uden fejl; P0 er lukket.

## 2026-08-23 – ejeren bestiller den systemiske cadence-rettelse

1. Efter bekræftelsen af 673/673 nultransporter bad ejeren om en grundig analyse og implementation af den rette rettelse.
2. Analysen valgte produktionens dokumenterede native marine stride på tre timer som maksimal sammenhængende bevisafstand. Faktisk tid integreres; der opfindes ingen mellemtimer.
3. Et fire-timers eller manglende gab forbliver fail-closed. Ejerens pre-public undtagelse gælder kun et kort, sammenhængende `WINDOW_INCOMPLETE`-vindue.
4. Profilomskifteren får `candidateWarmupEligible`, og shadowen genafspiller kompakt state med aktuel kode.
5. Deterministiske tests er grønne, og dataminimeret replay af den gamle live state giver 110 positive transporter mod 0 før rettelsen. Eksterne leverancegates afventer.

## 2026-08-23 – nultransport afslører cadencefejl efter aktiveringen

1. Ejeren spurgte, om alle transportværdier kunne være startet på 0 efter Candidate G-aktiveringen.
2. En dataminimeret livekontrol af `rr-20260823121818-210` bekræftede 673/673 transportpotentialer og transportkomponenter på 0.
3. 658 dele havde to afledte beviser med tre timers afstand og 15 kun ét. Candidate G accepterer højst én time mellem sammenhængende beviser, så genafspilningen bruger kun den seneste prøve.
4. Den første prøve har nul forløbstid; derfor kan selv en indgående seneste styrke ikke bygge transport. Ved uændret cadence bliver memory aldrig komplet, og scoren retter sig ikke ind over tid.
5. PR #97–99's grønne gates fangede ikke den semantiske cadencefejl. Ingen kode eller rollback blev udført under den read-only kontrol; P0 kræver nu global rollback eller en særskilt testet rettelse.

## 2026-08-23 – Candidate G-aktiveringen produktionsverificeret og lukket

1. PR #97 bestod exact-head `32636378576`, blev merged som `0f7a9d5f`, og fuld produktion `32636433944` gennemførte central hydrering, frisk data, fuld validering, releasegate, central profil-readback og Pages.
2. Live `rr-20260823112726-210` viste Candidate G som aktiv global profil på 210 zoner og 673 kystdele med identisk manifestbinding og nul offentlige kandidat-scoreafvigelser.
3. Den første aktive shadow fandt en for snæver auditantagelse om lovlige non-ready-memory-statusser. Fejlen var i kontrollen, ikke i runtime eller score, og blev ikke omgået.
4. PR #98/merge `fd69f8a0`, produktion `32637387600` og shadow `32637833674` lukkede auditkontrakten grønt på 210/673.
5. Den fulde livebrowseraudit bestod 420 aktuelle visninger, 2.100 femdøgnsvisninger og begge jagtformer uden kontrol-, konsol-, side- eller HTTP-fejl. PR #99/merge `328b4d7c` registrerede lukningen.
6. Candidate G er dermed den produktionsverificerede 4.0.261-scoremotor. Naturlig memoryopbygning er driftsevidens, ikke en ny aktiveringsgate; 25/40/35 er eksakt global rollback.

## 2026-08-23 – Candidate G godkendt som gældende under pre-public opvarmning

1. Ejeren afklarede, at RavRadar-siden endnu ikke er offentlig, og at foreløbige scoreværdier i de første 48 timer derfor er acceptable.
2. Ejeren bad Candidate G blive implementeret som den gældende scoremotor nu, ikke først efter 48 timers ventetid.
3. DEC-0060 vælger `RESEARCH-3` med `20/50/30`, mens legacy `25/40/35` bevares som global rollback.
4. Ufuldstændig transporthukommelse må kun passere med den konkrete ejer-godkendte pre-public-konfiguration og skal vises som `candidate-active-pre-public-warmup`; scoreprojektionen skal stadig være komplet i hele datasættet.
5. Profilvalget versionsbindes centralt i `ravscore-profile-selection`, automatisk aktivering forbliver falsk, og én manglende kandidatscore giver global legacyfallback.
6. Modelregler, geometri, land-/vandpunkter og private data ændres ikke. Exact-head, produktion, central readback, aktiv shadow og browserkontrol er leverancegates.

## 2026-08-23 – startværdien erstattet af afgrænset evidens

1. Ejeren afviste, at Candidate G skulle kunne være permanent skæv på grund af den værdi, modellen startede med på en bestemt computer eller produktionskørsel.
2. Neutral startprior 50 blev derfor forkastet. DEC-0059 vælger i stedet et fast, rullende 48-timers vindue, som genafspilles fra samme eksplicitte rand for alle kystdele.
3. Randen 0 betyder “ingen dokumenteret indtransport før vinduet”, ikke udtransport. Kun dokumenteret strøm kan bygge eller nedbryde transporten og udløse 13-timersgaten.
4. Missing og tidsgab behandles ikke som roligt vejr. Candidate G forbliver fail-closed på legacy, indtil hele vinduet igen er sammenhængende.
5. Historisk genafspilning giver nul forskel mellem tænkte starter 0, 50 og 100 for alle 582 komplette vinduer. Ejeren kræver derfor ikke en ny 48-timers realtidsudviklingstest.
6. Candidate G er ikke aktiveret. Offentlig `25/40/35`, geometri, land-/vandpunkter og beskyttede data er uændrede.
7. Exact-head `32633533257`, PR #95/merge `1d848724` og fuld produktion `32633607166` er grønne. Live `rr-20260823102619-210` starter schema 2 fail-closed på alle 673 dele med ét timebevis, 0 ready og legacy aktiv.

## 2026-08-23 – start-0-skævhed fundet efter produktionsshadow

1. Den grønne live-shadow viste 493/673 transporttilstande på 0, men ingen udløst 13-timers udtransportgate.
2. RavRadars eksisterende offentlige historik blev genafspillet uden nye kildedata: 42.551 poster, 633 dækkede dele og 65–117 timers tidsdybde.
3. Start 0 gav fortsat median 0. Kun 6/633 dele blev uafhængige af start 0 kontra 100, og 607/633 bevarede mindst 50 points forskel.
4. Historikken kunne dermed ikke vælge startreserven under den daværende ubundne regel uden passivt neutralt tab. Den efterfølgende anbefaling om neutral prior 50 er erstattet af DEC-0059's faste 48-timers evidensvindue.

## 2026-08-23 – 4.0.260 produktionsverificeret uden Candidate G-aktivering

1. PR #92 bestod exact-head `32628441062` på `eabf7e8b` og blev merged som `c5898ce8`.
2. Produktion `32628516066` bestod central hydrering, frisk DMI/fallback, fuld validering, releasegate, Supabase, artifact og Pages og udgav `rr-20260823083627-210`.
3. Den dataminimerede liveaudit bestod 210/673/1.346 med 673 accepterede tilstande, nul nulstillinger og nul rekonstruktionsfejl. Reference 09:00Z dokumenterer 9/9 timers alder fra bootstrap 00:00Z; det er ikke et 48-timersbevis.
4. Browserauditten bestod 420 aktuelle visninger, 2.100 femdøgnsvisninger og 673 kystdelsreferencer uden fejl.
5. Candidate G var score-neutral og automatisk aktivering falsk. Shadowen lå væsentligt lavere end aktiv score og skal derfor gennemgås særskilt med ejeren før en eventuel senere aktiveringsversion.

## 2026-08-23 – nattens state accepteret og scoreomskifter forberedt

1. Den naturlige Candidate G-state fortsatte til fælles reference 06:00Z i den offentliggjorte runtime `rr-20260823075018-210`.
2. Den dataminimerede kontrol bestod 210/673/1.346, accepterede alle 673 tidligere tilstande og nulstillede ingen. Yngste og ældste dokumenterede alder er seks timer.
3. Ejeren besluttede, at nattens forløb er nok praktisk evidens til at fortsætte. Perioden må ikke beskrives som et 48-timersbevis.
4. DEC-0058 forbereder en særskilt versionsbundet omskifter med offentlig `25/40/35` som fortsat aktiv profil og eksakt rollback.
5. Candidate G kan ikke aktiveres automatisk eller delvist. Komplet dækning, frisk slutshadow og særskilt ejer-gennemgang kræves stadig.


## 2026-08-19 – scheduler overdraget og næste browservej fastlagt

1. Ejeren bekræftede, at RavRadar-jobbene i cron-job.org er slettet.
2. Naturlig GitHub-produktion `#32272470720`, cachebevaring `#32272473716`/`#32272598725` og Copernicus-pilot `#32273634626` bestod efter sletningen. GitHub er dermed eneste normale scheduler.
3. Live `rr-20260819155614-210` blev sikkert auditeret for 210 zoner, 673 dele, 420 aktuelle visninger, 2.100 femdøgnsvalg og 673 pile ved præcis 673/673.
4. Den private cache nåede 30 gyldige timer og 18.870 poster med 625 mål, 629 mål/kilde-par og nul gitter-/lagustabilitet. Det fulde naturlige 168-timersvindue forbliver åbent og kontrolleres højst dagligt.
5. Ejeren besluttede, at næste systematiske online DOM-/kliktest først forsøger Browser-plugin og målrettet diagnostik. Hvis der ikke findes en konkret reparationsvej, må Chromium/Playwright bruges som fallback for alle 210 zoner og 673 dele. Ingen land-/vandpunkter må ændres i kontrollen.

## 2026-08-19 – én lokal visningskontekst

1. Den systematiske Chromium-audit viste, at lokale scoredata var korrekte, men zonepanelet blandede dem med hovedzonens synlige vejr og et andet femdøgnstidsvalg.
2. Ejeren krævede en systemisk rettelse for alle 210 zoner og 673 kystdele uden ændring af de centralt godkendte land-/vandpunkter.
3. DEC-0044 fastlægger én fælles lokal visningskontekst for del, tid, score, forklaring, debug og vejr samt eksplicit samlet hovedzonefallback ved reel lokal mangel.
4. 4.0.235 implementerer samme lokale `selectLocalBestForDay` i national prognose og zonepanel og bærer vinderdelens kompakte præsentationsgrundlag pr. fælles time.
5. Den syntetiske landsregression består for 210 zoner, 673 dele, begge jagtformer og 2.100 femdøgnsvisninger. 4.0.235 blev centralt/runtimeverificeret, og den efterfølgende zonevise tidslås i 4.0.237 blev produktionsverificeret i `#32264833170` og live `rr-20260819143933-210`. Kun den faktiske visuelle online DOM-/kliktest afventer; Browser-plugin forsøges først, og Chromium/Playwright er godkendt fallback.

## 2026-08-19 – GitHub-ejet produktion og Supabase-timeout

1. Ejeren konstaterede gentagne røde 15-minutterskørsler og bad om både timeoutrettelsen og Supabase-rettelsen samt om at flytte startansvaret fra cron-job.org til GitHub.
2. Actions-evidensen delte fejlene i to: ved timeskift manglede den nye eksakte Copernicus-time og produktionen stoppede på 630/673; senere fulddækkede runs kunne stoppe på Supabase/PostgreSQL `57014` ved den store runtime-diagnostik.
3. DEC-0042 forskyder GitHub-produktionen til minut 14/29/44/59, piloten til minut 6 og kræver en readiness-gate uden artifact/deploy ved manglende time. cron-job.org slukkes først efter naturligt schedule-bevis.
4. DEC-0043 bevarer den komplette diagnostik tabsfrit som gzip/base64 med SHA-256 og byteantal under samme beskyttede nøgle. Den repræsentative payload falder fra 4.014.169 til 208.874 byte.
5. Commit `7409d461` og pushrun `#32237507059`/`#3202` bestod fuld validering, releasegate, 673/673, Supabase og Pages. Naturligt schedule `#32244914347`/`#3210` bestod også; senere naturlige events er grønne for produktion `#32262008874`, pilot `#32262250342` og cachebevaring `#32262276171`. Kun ejerens faktiske deaktivering af cron-job.org mangler.

## 2026-08-18 – supplerende strøm og afgrænset Limfjordsproxy

1. Ejeren afsluttede den manuelle rettelse af land-/vandpunkter og vandstandsrouting. Frisk central #3079 gav 622/673 lokale DMI-strømpunkter; alle 51 mangler blev auditeret.
2. Direkte officielle gittertests fandt fælles bundnære Baltic U/V-par inden for 5 km til 39 mangler og AMM15-par til yderligere fire vestkystpunkter. To AMM15-celler havde kun 0 m som dybeste tilgængelige lag.
3. Otte resterende modelhuller lå i den vestlige Limfjord. Nærmeste observerede `dkss_lf`-par lå 5,416–12,110 km væk.
4. Ejeren besluttede, at disse otte hellere skal bruge nærmeste tilgængelige strøm end stå uden strøm, og oprettede en gratis Copernicus-konto samt de to påkrævede GitHub Actions-secrets.
5. DEC-0041 fortolker beslutningen fail-safe som en eksplicit allowlist og et 15-km-loft, som dækker alle otte uden at skabe en global ubegrænset regel. Alle øvrige dele og alle Copernicus-kilder beholder 5-km-grænsen.
6. En separat privat pilotkandidat bruger den officielle Toolbox, friske centrale punkter, samme-celle/-tid/-lag U/V, nul interpolation, 168 timers retention og sikre reports uden credentials eller rå vektorer. Lokal test består; autentificeret CI og aktiv integration afventer.
7. Commit `0c010090` blev fast-forwardet til `main`. Autentificeret run `#32129799346` bestod og bekræftede 39 Baltic + 4 AMM15 af de 51 DMI-huller. De sidste otte var præcis Limfjordsallowlisten. Pushrun `#32129778162` stoppede ved den daværende dækningsgate på DMI's 622/673 uden deploy. Piloten blev derefter sat til privat timeopsamling med syv døgns retention.
8. Første cron `#32134686185` hentede 12:00Z, men cirka 10,2 GB DMI-domineret Actions-cache havde LRU-fortrængt 11:00Z. En restore-only keepalive blev valgt frem for artifact i det offentlige repository. #32136328681/#32136391556/#32136642330 beviser keepalive, kontrolleret backfill og en samlet 11/12 UTC-cache med 1.258 records uden supportlæk.
9. En efterkontrol viste, at “100 %-gaten” endnu kun stod i beslutningshukommelsen; koden brugte fortsat historiske 95 %/640. 4.0.232 gør kravet reelt og dynamisk: alle aktive kystdele, aktuelt 673/673, skal have verificeret strøm før release.
10. Commit `406353be` tilføjede en renset historikaggregation. Run `#32131021153` gendannede og deduplikerede første times 629 records, rapporterede 625 unikke mål samt nul grid-/lagskift og bestod rekursiv rå-U/V-afvisning. Fordi begge runs brugte 11:00Z, var der fortsat kun ét selvstændigt tidspunkt; første cron-event afventede.
11. Commit `9e2164b8` gjorde 100 %-kravet reelt. Central #32139054129 bestod regressionen, stoppede med “622/673; alle 673 kræves” og sprang releasegate, Supabase og Pages over.
12. GitHubs keepalive-cron leverede stadig intet event før #32139054129 gemte endnu en stor DMI-cache. #32139755594 fandt Copernicus-cachen væk. Produktionsjobbet fik derfor en restore-only pre-DMI-refresh, så den lille private cache røres umiddelbart før den cacheaktivitet, der kan udløse LRU-fortrængning.
13. #32140001424/#32140470201 genopbyggede 11/12 UTC kontrolleret. Det rensede slutartifact bekræfter igen 1.258 records ved to tider, 625 unikke mål og nul grid-/lagskift uden rå U/V- eller credentiallæk.
14. `b6cf0383`/#32140865173 ramte to-timers-cachen før DMI og bevarede den gennem en ny 2,905-GB DMI-save. Regressionerne bestod, 622/673 blev fortsat afvist, og #32141443152 ramte samme cache efterfølgende. LRU-beskyttelsen er dermed centralt bevist; næste naturlige pilot skal udvide tidsserien.
15. Manuel aktuel-time-pilot #32141772134 tilføjede 13:00Z uden backfill og gav 1.887 records ved tre tider med nul grid-/lagskift og nul supportlæk. Senere naturlige pilot- og cachebevaringsruns `#32262250342` og `#32262276171` er grønne; det fulde naturlige 168-timersvindue afventer fortsat.
16. Mens naturlig drift opsamles, blev syvdøgnsgrænsen gjort til en normal release-regression: præcis 168 timer bevares, beskadigede/ældre/fremtidige restoreposter fjernes, dubletter samles, og nye ugyldige poster stopper lukket. Det naturlige fulde syvdøgnsvindue afventer stadig.
17. `7f22e8e1`/`#32143798560` beviste retentionregressionen centralt. Den bestod sammen med 100 %-kontrakttesten; den faktiske 622/673-audit forhindrede Supabase/Pages, og tre-timers-Copernicus-cachen overlevede igen DMI-cachearbejdet.
18. GitHub leverede fortsat ingen nye native timeevents. Keepalive blev derfor koblet til `requested` fra den allerede eksternt startede produktionskørsel. Den gendanner read-only, kontrollerer aktuel UTC-time uden rå log og dispatcher kun den private pilot ved en manglende time. Lokal fail-closed regression består; central automatisk hændelseskæde afventer første pushbevis.
19. Forsinket native `#32146584311` tilføjede 14 UTC og gav fire tider/2.516 records uden stabilitets- eller lækagefejl. Automatisk heartbeat `#32146699458` ventede på samme concurrencygruppe, ramte cachen og sprang dubletdispatch over. Manglende-time-grenen afventer næste UTC-time.
20. Pushrun `#32146695718` bestod heartbeat-, cache-, retention- og fulddækningsregressionerne centralt. Faktiske 622/673 stoppede fortsat releasegate, Supabase og Pages.
21. Efteraudit af dubletreglen viste, at “timen findes” ikke beviser, at den blev hentet til de nuværende centrale vandpunkter. 4.0.232 binder derfor hver afsluttet time til SHA-256 af alle del-ID'er/parentzoner/vandpunkter og et eksakt recordantal. Flyttet punkt, legacycache eller ufuldstændig time genindsamles samlet; lokal regression består, central migration afventer.
22. `#32149556595` fandt automatisk legacycachen og kørte dispatchjobbet. Den startede pilot `#32149592195` hydrerede 673 punkter, genindsamlede 14 UTC og gemte ny manifestcache med fire tider/2.516 records uden læk. `#32149552657` bestod de nye normale regressioner og stoppede igen på 622/673 før release/Supabase/Pages.

## 2026-08-16 – 4.0.229 strømsted, bundlag og privat feltgrundlag

1. Ejerens kortkontrol viste blå strømpile over land og krævede bevis for både placering og den anvendte strøm.
2. Kodeauditen fandt en systemisk fejl: dybeste U/V-lag blev foretrukket på tværs af forskellige koordinater, så et dybt punkt 12–24 km væk kunne vinde.
3. Ejeren besluttede rækkefølgen nærmeste gyldige vandkolonne → dybeste gyldige lag i samme kolonne, med 3 km foretrukket og højst cirka 5 km.
4. Ejeren besluttede samtidig, at senere scoreforskning skal omfatte strøm længere ude og hele transportkæden, og at et privat syvdøgnsgrundlag må startes nu uden scorepåvirkning.
5. 4.0.229 implementerer semantik v2, cacheinvalidering, eksakt provenance, en privat roterende 0/5/15-km flerlagscache og fail-closed afvisning af ForecastEDR-, Open-Meteo- og anden fallbackstrøm uden kolonne-/lagbevis. Lokal releasegate består; produktionsbevis afventer.
6. Første produktionsforsøg #31919296190/#2846 gennemførte den friske DMI- og forskningsopsamling, men stoppede i fuld audit før Supabase/Pages. Artifactet viste, at DMI legitimt kan skifte dybeste tilgængelige lag mellem native tider; auditten havde fejlagtigt krævet ét lag for hele serien.
7. Kontrakten blev præciseret til lagvalg pr. native tid og nul interpolation på tværs af lag, celle eller modelkørsel. Replay bevarer 11.400 verificerede hovedzone-prognosetimer og placerer alle 353 viste lokale pile på den viste times provenienspunkt.
8. Samme replay afdækkede, at centralt flyttede kystdelspunkter først blev bygget efter DMI-sampling. Workflowrækkefølgen og cachemigrationen blev rettet, så aktuelle centrale punkter samples først, og kun faktisk flyttede punkter nulstilles.
9. Den private rotation fortsatte gennem #2863–#2872 med stabil råcache, 168-timers retention og afstandsklassifikation uden rå U/V-værdier i ejeroversigten.
10. #2872 fandt Havknude som den første offentlige mangel med et faktisk fælles U/V-punkt inden for 5 km: NSBS 2,804 km fra vandpunktet. Offentlig v2-runtime var stadig `missing`.
11. Rodårsagen var et fælles `marineSelection`, hvor et IDW-skalarpunkt 5,131 km væk med bedre kysttypeprioritet blokerede den nærmere NSBS-strøm.
12. 4.0.230 indfører semantik v3: strøm vælges pr. native tid på tværs af DKSS-collections og uafhængigt af skalare marinefelter. Parser v18 tvinger selektiv strømgenopbygning; RavScore, punkter og gate er uændrede. Produktionsbevis afventer.

## 2026-08-15 – 4.0.208
1. Tre Vadehavszoner blev gentagne gange vist som manglende i lokal validering.
2. Direkte read-only produktionskontrol viste 210/210 matchende zoner og komplette vejrposter til alle tre; symptomet var ikke en produktionszonefejl.
3. Rodårsagen blev afgrænset til et indchecket 31. juli-snapshot og forskellen mellem råt repositoryregister og central admin-/tombstonesandhed.
4. Valideringen forbliver fail-closed, men beskriver stale lokaldata korrekt og tilbyder en read-only deployaudit.
5. RDKS, roadmap, kendte issues, changelog og begge håndbøger blev opdateret.
6. #31848912461 produktionsverificerede commit `7a3382f`: central adminhydrering/tombstones, frisk vejr, fuld validering, releasegate, Supabase, artifact og deploy bestod. Direkte efterkontrol viste 4.0.208 og 210/210 med alle tre Vadehavszoner.

## 2026-08-12 – 4.0.183
1. Ejerens kortkontrol dokumenterede fortsatte sorte markeringer inde i hovedzoner, for store skel ved landszoom og manglende Danmarksoverblik efter lukning af en zone.
2. Kortet blev ændret til ét delt skel mellem forskellige hovedzoner og zoomafhængig størrelse.
3. Admin-redigering af hovedzonelængde blev koblet til flytning af eksisterende, verificerede kystdele, så geometri og lokale data følger samlet med uden nye overlap.

Rækkefølgen er udledt af tekstens indhold, versionsnumre, funktionsudvikling, henvisninger til tidligere arbejde og eksplicitte datoer. Filnavne og redigeringshistorik er ikke brugt som kronologisk bevis.

## 2026-08-08 – 4.0.122 produktionsverifikation
1. #1845 gennemførte frisk DMI, fuld validering, release-gate, artifact og Pages-deploy som `success`.
2. Det offentlige datasæt `rr-20260808124116-208` viste 208/208 zoner med 118 sammenhængende vindtimer.
3. De fem tidligere zoner uden fælles DKSS U/V-gridpunkt er fortsat et provenanceaudit, ikke en offentlig vinddækningsfejl.

## 2026-08-08 – 4.0.121 workflowoprydning
1. Det aktive workflowinventar blev sammenholdt med kode, regressionstests, release- og recoveryprocedurer.
2. `schedule-test.yml` og `pages-microtest.yml` blev bekræftet som historisk diagnostik og fjernet.
3. `update-and-deploy.yml` blev bevaret som produktionsworkflow, mens GitHubs `pages-build-deployment` udtrykkeligt blev afgrænset som platformsmekanisme.

## 2026-08-08 – 4.0.120 komplet offentlig vindhale
1. #1833/#1835 roterede NSBS og LF og gav vind i alle 208 zoner; fem zoner manglede fortsat DKSS-hale.
2. Supportdata afgrænsede de fem som reelle `NO_SHARED_UV_GRID_POINT`, ikke schedulerudsultning.
3. Vandstandsrouting overskrev den blandede offentlige serie med DMI-cachen og slettede fallback.
4. Open-Meteos fem kalenderdage mistede dagens allerede forløbne timer; forespørgslen er ændret til 120 fremtidige timer.
5. Rettelsen er score-neutral og blev produktionsverificeret i GitHub Actions #31572312647.

## CHAT-0001
- **Kilde:** chat 1.txt
- **Forløb:** 2026-07-20 til projektets version 28
- **Funktion i historien:** Projektets opstart: gratis vandstandsprognose, første kort, zoner, scoring og den første retnings-/diagnostikfase.

## CHAT-0002
- **Kilde:** chat 7.txt
- **Forløb:** Efter version 28 til version 53 / 4.0.5
- **Funktion i historien:** Retningsaudit, DMI-cacheopbygning, zoner, scorer, diagnostik, administration og overgang til 4.0-serien.

## CHAT-0003
- **Kilde:** chat 2.txt
- **Forløb:** Version 54 til 66 / omkring 4.0.12
- **Funktion i historien:** Datakvalitet, kildegennemsigtighed, DMI-prioritet, forecastfiler, runtime-diagnostik og filarbejdsgang.

## CHAT-0004
- **Kilde:** chat 5.txt
- **Forløb:** Version 68 til 82 / 4.0.13–4.0.21
- **Funktion i historien:** DMI-bulkmodeller, marine dækning, observationer, stationer, Frederikshavn-mismatch og cachearbejde.

## CHAT-0005
- **Kilde:** chat 3.txt
- **Forløb:** Version 83 til 95 / 4.0.22–4.0.35
- **Funktion i historien:** Weather engine, GitHub-kørsler, stationsregister, zoneregister, Supabase og oprydning af gamle zoner.

## CHAT-0006
- **Kilde:** chat 6.txt
- **Forløb:** Version 96 til 111 / 4.0.35–4.0.49
- **Funktion i historien:** Langtidssundhed, kysteditor, admin, regler, scorepræsentation, stationsrouting og brugervenlighed.

## CHAT-0007
- **Kilde:** chat 4.txt
- **Forløb:** Version 112 til 4.0.52
- **Funktion i historien:** Havmarkør-afklaring, korrekt afgrænsning af ændringer, regelbygger, RDKS og stationers livscyklus.

## Sikkerhed ved fortolkning
Kronologien er stærk, fordi versionsforløbene overlapper sammenhængende: 1–28, 28–53, 54–66, 68–82, 83–95, 96–111 og 112–4.0.52. Et mindre hul omkring version 67 ændrer ikke rækkefølgen. Historiske forslag er bevaret i kildeteksterne, men kun aktive RDKS-poster styrer fremtidigt arbejde.

## 2026-08-06 – 4.0.113
Fem sammenhængende produktionskørsler afslørede, at samme ugentlige GitHub-cache blev gendannet og aldrig opdateret efter primary-key hit. Progressiv cache og streng referencezonevalidering blev implementeret uden scoreændring.

## 2026-08-06 – 4.0.114 til 4.0.115
- 4.0.114 blev efter gentagne Pages-timeouts til sidst publiceret og bestod sitetest 19/19.
- Releasekædens build/deploy-opdeling blev dermed produktionsbekræftet.
- Den efterfølgende faglige analyse viste, at transporthistorikken skulle bindes til den endelige DMI-proveniens og at akkumuleret varighed ikke måtte forveksles med et ubrudt forløb.
- 4.0.115 indfører score-neutral `shadow-v2` med verificerede strømprøver og særskilt aktivt regime.

## 2026-08-07 – 4.0.116
- 4.0.115 nåede ikke produktion, fordi den strenge DMI spatial-audit afslørede en ældre latent U/V-gridfejl.
- 4.0.116 parrer strøm og vind på samme fysiske DMI-gitterpunkt, invaliderer gamle mismatch-par og reducerer unødige opslag på vandstandskilder.
- Manglende vind/bølger forbliver `null`/`Mangler` i stedet for at kunne fremstå som 0,0; ægte nulværdier bevares.
- `shadow-v2` er fortsat score-neutral.

## 2026-08-07 – 4.0.117 stabilisering og Codex-overgang
1. Schedulerens aktive-zone- og DMI-vindlogik blev korrigeret i 4.0.117.
2. Fejlede produktioner afdækkede DKSS-geografisk recovery og derefter en dybere U/V-vertikallagsfejl; tidligere søge-radiusdiagnose blev markeret utilstrækkelig.
3. Parsergeneration 11 isolerede current-U/V efter vertikallag og krævede fælles lag/gridpunkt.
4. Administratoren konstaterede forkert geometri i tre Limfjordszoner og korrigerede kystlinje samt land-/havpunkter centralt.
5. Efterfølgende #1749 og især frisk #1750 kørte succesfuldt på commit `6c1dece…`; #1750 bekræftede central geometri-propagation.
6. Forecast-edge `missing` blev bevaret som separat aktivt dækningsissue.
7. CHAT-0014 og en samlet AI/Codex-dokumentationspakke blev oprettet før videre udvikling.

## 2026-08-07 – korrigeret Codex-overgang efter #1760
1. Efter #1758 blev fire yderligere zoner manuelt rettet i admin, fordi deres kystlinje/land-/havpunkter var geografisk forkerte: Fur syd, Gjøl og Attrup, Aalborg vest og Egholm samt Aalborg øst og Nørresundby.
2. #1760 kørte efter de endelige adminrettelser på `a164b6e…` og deployede succesfuldt.
3. Gennemgang af step-status viste, at de to fulde releasegates var `skipped` i #1760. Dermed blev det bevist, at en almindelig automatisk `workflow_dispatch` kan være grøn og deploye uden fuld releasevalidering.
4. Tidligere formulering om #1749/#1750 som aktuel stabil Codex-baseline blev derfor trukket tilbage. De er historisk evidens, men ikke bevis for den nuværende handoff-kode og endelige adminstate.
5. Den sidste pre-Codex ZIP bruges kun til at få den komplette projektviden ind i det lokale/repository-baserede arbejdsmiljø. Workflowbypasset bevares midlertidigt i denne bootstrap og skal lukkes af Codex som første kodeopgave.

## 2026-08-08 – 4.0.118 DMI-first vindhale
1. Den officielle kildeaudit fastslog HARMONIE som primær korttidsvind og DKSS 10-meter U/V som egnet DMI-hale mod fem døgn.
2. Parsergeneration 12 udtrækker DKSS-vinden i separate felter og kræver et fælles fysisk U/V-gitterpunkt.
3. HARMONIE vinder i overlap; interpolation sker aldrig på tværs af HARMONIE/DKSS-grænsen.
4. Open-Meteo fallback bruger nu entydige GMT/UTC-tider.
5. Implementeringen og målrettede regressionstests er lokale; frisk produktionsdækning og releasekæde skal stadig bevises.

## 2026-08-08 – 4.0.119 DKSS-vindhale repareret
1. #1828 bestod releasekæden, men havde ingen dokumenteret DKSS-vindhale.
2. Parameter 34 blev fejlmærket `sst` og forkastet som tvetydig.
3. DMI's lokale id er gjort autoritativt; parser/parameterkort er 13/4.
4. Schedulerens DKSS-plads roterer efter manglende U/V-vindhale pr. valgt marinecollection.
5. #1831 genkendte begge DKSS U/V-felter, gav 107 vindhalezoner ≥96 timer og gennemførte validate, release gate og deploy.
6. Det offentlige datasæt havde 200/208 zoner med vind, 108/208 ≥96 timer og maksimum 111,5 timer; videre automatiske runs skal rotere LF/NSBS og lukke de resterende huller.

## 2026-08-23 – 4.0.259 central Candidate G-kandidat

1. DEC-0055/0056's afledte transport- og mobiliseringstilstand blev koblet til den centrale kystdelspipeline ved den fælles aktuelle referencetime.
2. En versions- og konteksthash forhindrer, at tilstand bæres over ændret model, profil, vandpunkt eller kystretning; kun kompakte afledte værdier persistéres.
3. Same-time-rekørsel blev gjort til eksplicit hold, så en ændret prognose i samme time hverken tæller dobbelt eller nulstiller et udtransportforløb.
4. Candidate G offentliggøres diagnostisk med rekonstruerbare 20/50/30-bidrag, men aktiv `25/40/35` og UI er uændrede.
5. Den manuelle shadow blev omlagt fra native-only genhentning til fallback-kompatibel audit af den faktiske 210/673-runtime. Første produktion er bootstrap fra 0 og kan ikke i sig selv bevise en modnet 48-timersfordeling.
6. Exact-head `32609888406` bestod på `337466b5`; PR #89 blev merged som `31e50acb`.
7. Produktion `32609952992` bestod central hydrering, frisk data/proveniens, fuld validering, releasegate, Supabase, artifact og Pages. Live er 4.0.259/`rr-20260823011924-210` med 210 zoner og 673 dele.
8. Read-only shadow `32610281620` bestod 1.346 modeevalueringer uden rekonstruktionsfejl. Alle 673 tilstande var forventet bootstrap; næste trin er naturlig state-alder, ikke offentlig aktivering.

## 2026-08-08 – DEC-0031 model- og kvotestyring
1. Jakob fastlagde, at kvalitet går foran kvotebesparelse, men at Sol ikke skal bruges til rutinearbejde af bekvemmelighed.
2. Codex fik ansvar for både at anbefale billigere model og senere kræve skift tilbage til Sol før kritiske opgaver.
3. Kvoteudløb kræver dokumenteret checkpoint frem for reduceret analyse eller validering.
4. Den planlagte videnskabelige RavRadar-/RavScore-analyse er som udgangspunkt Sol-arbejde; afgrænsede mekaniske støtteopgaver kan udføres billigere.
## 2026-08-11 – 4.0.182 frigivelseskandidat
- Godkendt slutgeometri aktiveret lokalt: 212 hovedzoner, 206 præcise, 6 fallback og 643 interne dele.
- Nul tværzoneoverlap og nul uafklarede relevante huller; Vadehavets fastlandskyst er med.
- Private DMI- og central-admin-gates er grønne. Fuld release og onlinekontrol udestår.
## 2026-08-12 – 4.0.184-kandidat

1. Ejeren dokumenterede Reersø og Mullerup som grøn med RavScore 78, mens zonepanelet viste `–/100` og “ikke nok data”.
2. Produktionsruntime viste korrekt vinder `Mullerup Klint`, score 78 og komplette delscorer; UI havde bevidst erstattet disse med tomme objekter.
3. Hele runtime blev auditeret: 643 dele, 206 hovedzoner og 412 aktuelle zone-/jagtformsresultater havde konsistent score, vinder og delscoredata.
4. En fælles lokal resultatbygger og tydelig geografisk forklaring genopretter den tidligere funktion med uændret grænse på mere end 7 point.
# 4.0.185 – lokalt delkort og fjernet offentlig fundformular
- “Hvor er det?” blev bygget som et behovsstyret lag på det eksisterende hovedkort med navngivne kystdele og automatisk zonezoom.
- Den offentlige “Hvad fandt du?”-formular blev fjernet; turbaseret observation og bagvedliggende adminanalyse blev bevaret.
## 2026-08-22 – 4.0.258 Candidate G vindstyret waders-jagtbarhed

- Ejerbeslutning: privat analyseprior `20/50/30`, vindkurve med nul ved 15 m/s og WAM-bølger kun som blødt fradrag på højst 20 point.
- DEC-0054 og `G-50-50-NO-DIRECT-WIND-WADERS-WIND-LED` erstatter den tidligere reviewvariant, men ændrer ingen offentlig score.
- 1.460-evalueringsreplay og kanoniske/nationale self-tests består uden nye rådata, geometri eller punktændringer.

## 2026-08-22 – Candidate G strømstyret transportpotentiale

1. Ejeren præciserede, at strømmen transporterer ravet, mens bølger højst hjælper det sidste stykke over revle eller op på strand.
2. Fuld udgående strøm skal reducere potentialet fra første time med 8 point pr. effektiv time og nå 0 ved 13 timer; fuld indgående strøm bygger mod 100 over cirka 10 timer.
3. Den nye private variant og nationale shadowkontrakt implementerer retningen uden at ændre offentlig `25/40/35`.
4. Replayet viser korrekt mekanik, men også stor følsomhed over for strømgrænsen og reservoirværdien ved start. DEC-0055 holder derfor aktiveringen lukket.
5. Ingen nye rådata, geometri, land-/vandpunkter, artifact eller protected-dirty-data er ændret.

## 2026-08-22 – Candidate G 24/48-randkontrol

1. Neutral passiv halvering på 24 og 48 timer blev implementeret som valgfri diagnostic-only følsomhed; den godkendte ind-/udtransportkurve og missing-pause er uændret.
2. Start-0-scoren flytter -1,182/-0,697 point, men warm-start-kontroller viser fortsat væsentlig randfølsomhed.
3. Alle 12 eventvinduer har præcis 24 timers forhistorie og nul har 48/72 timer; de kan derfor ikke vælge fysisk levetid.
4. Referencegrænsen har ingen fuldstyrkeevalueringer, og lavere profiler har kun sparsom fuldstyrkedækning uden fundlabels; strømgrænsen forbliver ukalibreret.
5. Ingen offentlig score, nye rådata, geometri, punkter eller artifacts er ændret.
6. Exact-head `32599255165` bestod på `ed1f0297`, PR #77 blev merged som `75ed93d6`, og produktion `32599309735` leverede `rr-20260822212612-210` med 210 zoner og 673/673 dele uden Candidate G-aktivering.

## 2026-08-23 – Candidate G udtransportgate afgjort score-neutralt

1. Ejeren har afgjort, at dokumenteret faktisk kraftig udtransport med udtømt transportpotentiale skal sætte den interne Candidate G-slutscore til 0.
2. Mobilisering og jagtbarhed beregnes og bevares som synlige komponenter; reglen er derfor ikke en påstand om, at disse forhold også er nul.
3. Startpotentiale 0 uden faktisk udtransport, missing, neutral strøm og svag modstrøm må ikke udløse gaten.
4. Den bindende forklaring er: `På grund af kraftig fralandsstrøm trækkes ravet ud i havet og derfor går scoren i nul, selv om der fortsat kan være mobilisering og god jagtbarhed`.
5. Adfærden versionsbindes som `RRS-CANDIDATE-G-CURRENT-LED-OUTFLOW-8-RESEARCH-2`; `RESEARCH-1` bevares som revisionsspor. Offentlig RavScore og automatisk aktivering er uændret.
6. Exact-head `32604792201` bestod på `f6458f09`, PR #84 blev merged som `800a93cb`, og fuld produktion `32604850884` leverede live `rr-20260822232159-210` med 210 zoner, 673 dele og samme datasæt-id i manifest/start/detaljer.

## 2026-08-23 – første naturlige Candidate G-statefortsættelse

1. Schedule `32613284735` kørte naturligt på `main`/`600e8a45` og bestod frisk data, fuld validering, releasegate, artifact og Pages.
2. Live `rr-20260823023951-210` består den dataminimerede 210/673-shadow med 1.346 modeevalueringer og nul rekonstruktionsfejl.
3. Alle 673 tidligere tilstande blev accepteret, og ingen blev nulstillet. Referencetiden gik fra 00:00Z til 03:00Z, så dokumenteret yngste og ældste naturlige state-alder er 3/3 timer.
4. Candidate G er fortsat diagnostic-only; offentlig `25/40/35` og aktiveringsforbuddet er uændret. 48-timersslutshadow udestår.
