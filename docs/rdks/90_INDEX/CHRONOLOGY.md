# Rekonstrueret chatkronologi

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
