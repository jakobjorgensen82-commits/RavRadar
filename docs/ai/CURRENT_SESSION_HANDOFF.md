# Aktuelt sessionshandoff – 2026-08-16

## Handoff 2026-08-18 – Copernicus-pilot under opbygning

- Arbejd i den rene worktree `C:\Users\jakob\AppData\Local\Temp\ravradar-40232-current`; ejerens oprindelige workspace er fortsat dirty og må ikke overskrives.
- `main`/`origin/main` var ved start `a8eaa9ca` (4.0.231-handoff). Grenen er `codex/current-coverage-4.0.232`.
- Begge Copernicus Actions-secrets findes. Deres værdier er ikke læst eller vist.
- Commit `0c01009033bfb36ec0f7ef0101ccc19e4ea2eaf3` er fast-forwardet til `main`. Den private workflow bruger de aktuelle officielle Baltic/AMM15-datasæt, ét afgrænset 3D-tidssnit pr. time, samme-celle/-tid/-lag U/V, højst 5 km, nul interpolation og 168 timers privat cache.
- `data/current-regional-proxy-policy.json` har præcis otte ejerbesluttede vestlige Limfjordsdele. Kun `dkss_lf`, samme samplingpunkt og højst 15 km er tilladt; policytesten består mod #3079-artifactets centralt hydrerede `coastal-parts-v2.json`.
- 4.0.232-kandidaten bygger nu alle otte private mål på hver DMI-kørsel og gemmer deres U/V i den eksisterende 168-timers shadow-cache. Almindelige mål forbliver på 5 km; forkert collection, ændret punkt, forkert zoneklasse og over 15 km afvises. `data/diagnostics/current-regional-proxy-pilot.json` er en support-only rapport uden rå vektorer.
- Autentificeret privat run `#32129799346` bestod på Toolbox 2.4.1: 39/51 DMI-huller fik Baltic og yderligere fire AMM15, så potentialet er 665/673. Præcis allowlistens otte Limfjordsdele mangler fortsat. Ingen af de 43 var kun overfladelag ved 11:00Z. Pushrun `#32129778162` stoppede korrekt ved den uændrede strømgate på 622/673 og deployede ikke. Timeplan ved minut 17 samler nu flerruns-bevis; intet kobles til offentlig score eller pile før efterfølgende gates.
- Gentaget manuelt run `#32131021153` på commit `406353be` bestod og gendannede/deduplikerede cachen til 629 records ved én gyldig time, 625 unikke mål og 629 mål/kildepar. Den rensede flerrunsrapport havde nul mål/kildepar med grid- eller lagskift og ingen rå U/V-nøgler. Det var cache-/rapportsikkerhed, ikke et nyt modeltidspunkt; første schedule-event er siden bevist i #32134686185.
- Commit `cda7358bfa97eb4f506ce907b86d39068514cf18` med den private regionale collector er fast-forwardet til `main`. Central `#32134021410`/artifact `#3094` beviser alle otte mål med 32 `dkss_lf`-prøver ved fire forecasttider, 5,416–12,110 km, både overflade- og dybere lag, nul rå U/V i rapporten og ingen `.cache` i supportartifactet.
- #32134021410 stoppede før Supabase og Pages, fordi `test-dmi-bulk-model-download.mjs` stadig forventede User-Agent 4.0.229 efter versionsløftet. Testen følger nu `package.json`, og de berørte lokale og centrale regressioner består. Offentlig coverage er stadig bevidst 622/673.
- Test-/evidensrettelsen er pushed som `d00d55bc4e7a73c2fb44f048d0d33cc38e933b5c`. #32135079819 passerede den rettede test og stoppede først ved 622/673-auditten; intet blev deployet.
- Første schedule-run #32134686185 var grønt ved 12:00Z, men havde kun én rå tid, fordi 11:00Z-cachen var LRU-fortrængt. Cacheforbruget var cirka 10,2 GB med flere 2,5 GB DMI-cacher. Restore-only keepalive er pushed i `0224ea6a`: #32136328681 ramte 12:00Z, #32136391556 backfillede 11:00Z til 1.258 records/to tider uden grid-/lagskift eller supportlæk, og #32136642330 ramte derefter den nye cache. Første automatiske keepalive og næste naturlige time afventer. En rå artifactløsning er forkastet, fordi repoet er offentligt.
- Slutkontrol fandt, at `test-current-spatial-scientific-audit-4.0.76.mjs` stadig krævede historiske 95 %/640, ikke ejerens nyere 100 %. Kandidaten kræver nu `expectedParts.length`, aktuelt 673/673; `test-current-full-coverage-gate-4.0.232.mjs` beskytter kravet. Replay mod #3094 giver korrekt 622/673 og “alle 673 kræves”.
- Commit `9e2164b8` er på `main`. Central #32139054129 bestod regressionen og stoppede præcis på “622/673; alle 673 kræves”; releasegate, Supabase og Pages blev sprunget over.
- Ingen automatisk keepalive-event ankom før #32139054129 gemte næste store DMI-cache, så Copernicus-cachen blev fortrængt igen. #32139755594 beviser miss. Kandidaten gendanner nu restore-only cachen direkte før DMI-cachearbejde; regressionen forbyder rå log, artifact og save i blokken. #32140001424/#32140470201 har genopbygget 11/12 UTC til 1.258 records og to tider uden grid-/lagskift eller supportlæk.
- Commit `b6cf0383` er på `main`. #32140865173 ramte to-timers-cachen før DMI, gemte en ny 2,905-GB DMI-cache og efterlod Copernicus-cachen intakt. Cache- og 100 %-regressionerne bestod centralt; auditten stoppede fortsat på 622/673 uden deploy. #32141443152 ramte samme cache efter DMI-save og validerede den uden recordlog.
- Parallelt roadmaparbejde har gjort Copernicus-retention til en normal releasegate. `scripts/test-copernicus-shadow-retention-4.0.232.py` beviser 168-timersgrænsen, deduplikering, sikker rensning af beskadigede restoreposter og fail-closed kontrol af nye råposter. Den målrettede lokale Copernicus-, workflow- og cacheisolationstest består; naturligt syvdøgnsbevis afventer stadig.
- Commit `7f22e8e1` er på `main`. Central `#32143798560` bestod den nye retentiontest og 100 %-kontrakttesten i normal fuld validering og stoppede derefter korrekt på 622/673 uden releasegate, Supabase eller Pages. Cache-API'en viste fortsat tre-timers-cachen efter DMI; kun naturlig schedule-/syvdøgnsdrift mangler for dette delspor.
- Commit `50eefbe3` og evidenscommit `aac3bf2c` er på `main`. Forsinket native pilot `#32146584311` tilføjede 14 UTC og gav fire tider/2.516 records. Automatisk heartbeat `#32146699458` ventede på piloten, gendannede samme cache og sprang dubletdispatch over; pushrun `#32146695718` bestod heartbeat-, cache-, retention- og 100 %-regressioner før det forventede 622/673-stop.
- Commit `2531203e` binder hver Copernicus-time til SHA-256 af alle aktuelle centralt hydrerede vandpunkter og et eksakt recordantal. `#32149556595` fandt legacycachen og dispatch'ede automatisk `#32149592195`, som migrerede 14 UTC til ny fire-timerscache med 2.516 records uden læk. `#32149552657` bestod de nye regressioner og stoppede korrekt på 622/673 uden deploy.
- Evidenscommit `15f2a1fc` er på `main`; det efterfølgende heartbeat `#32150318931` ramte manifestcachen og sprang dispatch over. Næste åbne bevis er naturlig ny UTC-time og senere fuldt 168-timersvindue, ikke mere samme-time-kode.
- Manuel aktuel-time-pilot #32141772134 tilføjede 13:00Z efter DMI-beviset. Det sikre artifact har 1.887 records ved 11/12/13 UTC, 625 mål, 629 mål/kildepar, nul grid-/lagskift og nul rå U/V/credentials. Naturligt schedule-event efter rettelsen afventer fortsat.

## Aktiv 4.0.231-kandidat – vist lokal scoretime og pil deler DMI-celle

- Commit `7dd1fbf2aaa7f037395a5d38c8003c09ba1dac67` med 4.0.230 er pushed til `main`. #2875 genopbyggede IDW og #2876 NSBS under parser v18/semantik v3; ingen gate blev lempet, og begge runs stoppede før Supabase/Pages på den strenge strømaudit.
- Havknude er rettet i #2876-artefaktet: 38 native tider bruger `dkss_nsbs`-cellen 2,80363 km fra det centralt hydrerede vandpunkt. Dækningen efter IDW+NSBS er 182/210 hovedzoner og 574/673 lokale dele; Limfjord parser v18 mangler endnu.
- #2876 fandt én selvstændig pil/grid-afvigelse ved `PART::dk-b04-12-owner-approved-01`. Den viste lokale score var fra kl. 12 med verificeret DMI-celle, men pilen var beregnet ved byggetiden kl. 06:25 uden strøm og stod derfor på vandpunktet.
- 4.0.231 vælger nu den viste lokale scorepost før `flowPoints.current` beregnes ved samme tid. Zoom-/piltesten dækker et datagab mellem byggetid og scoretid. DMI-værdi, lag, RavScore, geometri, 5-km-grænse og gate er uændrede.
- Produktrettelsen er samlet i commit `4181976c2a54862f3377582d4c25ca94b8f8f977`; push og central verifikation afventer.
- Privat strømfeltscache står efter #2876 ved cursor 300, 1.394 prøver, 630 ankre og 239 dele med 168 timers retention, `scoreImpact=false` og `publicRuntime=false`. Ejeroversigten indeholder ingen rå U/V.

## Historisk 4.0.230-kandidat

- #31929171918/#2872 beviste, at Havknude havde fælles NSBS-U/V 2,804 km fra vandpunktet, selv om offentlig v2-runtime manglede strøm. Et fælles `marineSelection` lod et IDW-skalarpunkt 5,131 km væk blokere det nærmere strømpar.
- 4.0.230 vælger strøm selvstændigt for hvert native tidspunkt på tværs af alle aktive DKSS-collections: nærmeste komplette U/V-vandkolonne først, derefter dybeste gyldige lag i samme kolonne. Skalarfelter beholder separat modelvalg.
- Parser v18/semantik v3 invaliderer gammel strøm selektivt og bevarer gyldige skalarfelter. Interpolation over collection-, run-, celle-, lag- eller samplingpunktskift forbliver forbudt.
- Havknude-regressionen, de berørte målrettede DMI-/forecast-/piltests, RDKS/version og lokal releasegate består. 4.0.230 blev pushed i `7dd1fbf2aaa7f037395a5d38c8003c09ba1dac67`; frisk central produktion af alle tre modelområder og efterfølgende 4.0.231-verifikation mangler endnu.
- #2872 nåede cursor 240, 873 private prøver, 469 ankre og 179 dele. Af 77 offentlige mangler var 36 besøgt: én pipelinefejl ≤5 km, fire ved 5–6 km, fem ved 6–8 km, 23 over 8 km og tre uden observeret fælles U/V; 41 afventer rotation.

## Historisk 4.0.229-kandidat

- Rodårsagen til fejlplaceret strøm var globalt dybdevalg: et dybt DMI-lag ved en fjern koordinat kunne slå den nærmeste vandkolonne.
- Ny bindende rækkefølge er nærmeste gyldige fælles U/V-vandkolonne først, derefter dybeste gyldige lag i samme kolonne. 0–3 km foretrækkes, 3–5 km accepteres, og over 5 km er `missing`.
- Verificeret strøm er bundet til aktuelt centralt samplingpunkt, fælles U/V-koordinat, forecasttid, lag og afstand gennem score, provenance og kort. Den geografiske afstand genberegnes som kontrol; gamle semantik-v1-data, direkte ForecastEDR-strøm uden kolonne-/lagbevis, Open-Meteos overfladestrøm og anden fallbackstrøm lukkes ude før historik, scoring og kort.
- Laget vælges særskilt pr. native forecasttid. Interpolation er kun tilladt ved identisk lag, celle, samplingpunkt, collection og modelkørsel; ellers er mellemtimen `missing`. Pilen følger den valgte times egen celle.
- Centralt reviewede kystdelspunkter bygges før DMI. Ved et ændret register bevares kun cacheposter med uændret eget samplingpunkt; flyttede dele nulstilles selektivt.
- Privat 168-timers strømfeltsopsamling roterer 15 kystdele pr. DMI-kørsel ved 0/5/15 km og flere lag. Den er `scoreImpact=false`, `publicRuntime=false` og publicerer kun kompakt status. Det lille udsnit beskytter workflowets tidsbudget og når fortsat hele bestanden inden for syvdøgnsvinduet ved normal drift.
- DEC-0040 og den udvidede DEC-0029 kræver, at kommende analyse og et eventuelt nyt scoremodul vurderer ydre tilførsel → overgang → lokal bundnær levering, inkl. tidsforsinkelse og risiko for dobbelt-tælling.
- Commit `14ce8908bcfd219055d622ef88c2e94d6f9ad37c` er pushed til `main`. #31919296190/#2846 byggede frisk DMI og privat cache, men stoppede i fuld audit før deploy, fordi efterkæden antog ét fast lag for hele serien. Artifactreplay med rettelsen bevarer 11.400 verificerede prognosetimer og nul pil/grid-mismatch i 353 matchende lokale dele. Den opfølgende rettelse er pushed til `main`, men endnu ikke produktionsverificeret.

## Sikker produktionsbaseline

- 4.0.228 er seneste produktionsverificerede release.
- Commit `93b8c0216821d02bf913f7aab369406ba2365fe9` bestod i #31913779486/#2835 central adminhydrering, frisk DMI, fuld `validate`, releasegate, supportartifact, beskyttet Supabase-sync, Pages-artifact og deploy.
- Datasæt `rr-20260815231859-210` har 210 aktive zoner, 673 forventede og 670 verificerede/offentliggjorte kystdele mod det daværende minimum 640. Alle 670 har eksakte DMI-strøm- og vindpunkter uden U/V-mismatch; manifesthashes matcher artifact og live. Dette er historisk produktionsbevis, ikke længere en tilstrækkelig gate for en ny release.
- Den lokale kystvinkel er nu en vejledende advarsel. Ejerens repræsentative helhedsvurdering kan gemmes, mens reelle punkt-/kystintegritetsfejl fortsat blokerer.

## Afsluttet 4.0.228

- REQ-MAP-ARROWS-ZOOM-001 implementeres i den isolerede worktree `C:\Users\jakob\AppData\Local\Temp\ravradar-40228-arrows` på branch `codex/map-arrow-density-4.0.228`.
- Landsoversigten bevarer ét repræsentativt vind- og strømpunkt pr. hovedzone.
- Fra zoomniveau 9 tilføjes kun lokale kystdelspile, når deres egne DMI-U/V-komponenter har præcis samme gitterkoordinat. Vind kan være den valgte primære HARMONIE-serie eller DKSS-`wind-tail`; kildetypen bevares særskilt.
- Lokale fallbackankre, ufuldstændig provenance og kunstige kopier eller forskydninger afvises.
- Den fulde kystdelsdetaljepakke bærer alle flowpunkter og udløser automatisk opdatering af pilelaget.
- Ændringen påvirker kun kortvisning og transport af punktproveniens; DMI-værdier, kildevalg, forecast, RavScore, historik og geometri er uændrede.
- Målrettet zoomtæthedsregression og eksisterende zoom-, provenance-, null-safety-, DMI-bulk- og progressiv-runtime-tests består lokalt. RDKS-, versions-, håndbogs- og lokal releasegate er også grønne.
- Den fulde lokale `validate` gennemfører hele geometri-v2-kæden og stopper derefter forventet fail-closed på repositoryets historiske 209/211-vejrsnapshot før central adminhydrering.
- Produktcommit `bb1892e4072deb77dbc83a203587221c666013d2` er pushed til `main`.
- #31911509244/#2830 forsøg 1 stoppede korrekt ved 629/673 lokale strømpunkter efter delvis Limfjordshentning. Forsøg 2 nåede 670/673 og bestod fuld `validate` og releasegate, men stoppede før Pages på gentaget Supabase `57014` efter den tilladte retry.
- Artifactaudit af datasæt `rr-20260815224811-210` fandt 670 ægte lokale strømpunkter, men nul ægte lokale vindpunkter, fordi `wind-tail-u/v` ikke blev transporteret. Rettelsen blev implementeret og målrettet testet.
- #2835 produktionsverificerede rettelsen med 461 unikke strøm- og 544 unikke vindpunkter. Direkte livebrowserkontrol gik fra 27+27 pile på oversigten til 45+42 efter to zoomtrin og havde nul konsolfejl.

## Aktuel ejerbeslutning og parallelle spor

- Ejeren fortsætter nu den manuelle gennemgang af land-/vandpunkter. Central adminstatus er autoritativ, og nye produktioner skal hydrere de senest godkendte punkter.
- Fem-døgnsdækning og historikanalyse er midlertidigt udsat, indtil flere naturlige data og modelkørsler er opsamlet. De er ikke annulleret.
- Automatisk historikopsamling, DMI- og releasegates fortsætter uændret i pausen. Historik må ikke bagudfyldes kunstigt.

## Næste trin

1. Commit/push 4.0.232-kandidaten og kræv frisk central `dkss_lf`-evidens i den private regionalproxyrapport; alle otte skal være policyvaliderede, og rå U/V må kun findes i Actions-cachen.
2. Følg Copernicus-cron og kræv mindst to forskellige gyldige tider/modelruns. To manuelle runs på samme 11:00Z-time tæller fortsat kun som ét tidsbevis.
3. Bevar offentlig DMI-only-adfærd og den nye dynamiske 100 %-gate, mens privat 168-timers pruning og stabilitet bevises. Aktiv kildefletning, pile og score er en senere særskilt gated ændring.

## Bindende arbejdsregler

- Brug GPT-5.6 Sol og **Ekstra høj** indsats til DMI, RavScore, geometri, ukendt rodårsag, systemiske regressioner og endelig kritisk validering.
- Central adminstatus er runtime-sandhed. Historiske hardcodede værdier må ikke overskrive den.
- DMI er primær kilde. Manglende data er `missing`, aldrig nul, stale gentagelse eller skjult interpolation.
- En grøn automatisk kørsel er kun releasebevis, når den fulde gatekæde faktisk har kørt.
- Gamle chats er historik, ikke ændringstilladelse.
