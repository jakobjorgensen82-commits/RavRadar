# Rekonstrueret chatkronologi

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
