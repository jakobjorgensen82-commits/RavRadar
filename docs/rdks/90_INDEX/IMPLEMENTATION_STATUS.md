# Implementeringsstatus pr. 4.0.223 – modelcyklusdækning

## 4.0.223 – delvis kontra fuld modelcyklus

- [x] Timer pr. modelkørsel suppleres med antal aktive zoner pr. modelkørsel og collection@run.
- [x] Selvtesten beskytter zonetællingen for både dokumenteret og udokumenteret DMI-proveniens.
- [x] Artifact #2783 dokumenterer en ny, men delvis HARMONIE 12 UTC-cyklus: 416 timer i 208 zoner.
- [x] #31891984360 produktionsverificerer auditten; artifact #2785 viser naturlig indfasning til 3.744 timer i 208 zoner og fortsat gamle WAM-/DKSS-run-id'er.
- [x] Overgangstal og historikvækst er målt uden at ændre data, fallback eller score.
- [x] Et enkelt Supabase statement-timeout i #31891504819 stoppede deploy fail-closed; næste normale release synkroniserede og deployede uden retryændring.
- [ ] Afvent bredere HARMONIE 12 UTC-indfasning og nye WAM-/DKSS-run-id'er før permanente intervaller.

# Tidligere status: 4.0.222 – modelcyklusaudit

## 4.0.222 – uafhængig forecast-evidens

- [x] DMI-collection og model-run optælles pr. komponent og samlet som collection@run.
- [x] Native/interpoleret/kantopløsning og timer uden collection/model-run rapporteres fail-closed.
- [x] Selvtesten dækker både dokumenteret og udokumenteret DMI-proveniens.
- [x] #2764/#2771/#2777 er sammenlignet og dokumenteret som samme aktive modelcyklusser.
- [x] #31890898143 bestod fulde gates og deploy; artifact #2782 dokumenterer fuld collection/modelrun for alle fem komponenter og afgrænser #2777's vandstandsfund som ikke-vedvarende.
- [x] #2782 eftermåler historikvækst til 158 rå prøver/38,760 timer og 3,040–38,760 timers verificeret spænd uden bagudfyldning.
- [ ] Friske naturlige HARMONIE-, WAM- og DKSS-run-id'er skal fortsat eftermåles, før permanente overgangsintervaller kan besluttes.

# Tidligere status: 4.0.221 – vandstandsroutingalarm

## 4.0.221 – effektiv kildealarm

- [x] Artifact #2771 dokumenterer register, forecast/cache og Hals-kildernes 113 timer.
- [x] Fjernelsen i 4.0.99 og de stale videreførte alarmfelter er historisk afgrænset.
- [x] Effektiv automatisk/adminrouting bestemmer præcist hvilke aktive kilder der overvåges.
- [x] Seneste gyldighed fra DMI-kildeprognose og routet cache vurderes samlet uden at gøre observation og forecast til samme status.
- [x] Gyldig forecast rydder stale `critical`; advarsel, udløb, aktiv levering, historisk kilde og central tærskel er funktionelt regressionstestet.
- [x] #31889559758 bestod fulde gates og deploy; artifact #2777 rydder begge falske Hals-alarmer, viser 116,6 timers resttid, nul nye notifikationer og uændret faktisk routing i 5/6 zoner.
- [ ] En naturligt opstået warning/critical skal fortsat eftermåles i produktion; den syntetiske regression beviser allerede begge grene uden at fremkalde et kunstigt driftsbrud.

## 4.0.220 – audit af brugbar transporthistorik

- [x] Rå prøveantal og råt tidsspænd bevares som selvstændige mål.
- [x] Aktuel DMI-verifikationsstatus, verificeret prøvefordeling og verificeret tidsspænd rapporteres uden at skrive.
- [x] Selvtesten beviser, at uverificerede prøver ikke tælles med, og at zoner under 72 verificerede timer forbliver åbne.
- [x] Artifact #2764 er målt til 210/210 aktuelt verificerede zoner, men kun 1,43–37,149 timers verificeret historik.
- [x] Ny fuld `dkss_lf`-cyklus med 41/41 trin og halevækst fra 98 til 115 timer er dokumenteret.
- [x] #31888082124 produktionsverificerer audit, fuld `validate`, releasegate, Supabase og Pages; artifact #2771 viser 210/210 aktuelt verificerede zoner og naturlig vækst til 152 rå prøver/37,722 timer.
- [ ] Fortsæt naturlig opbygning til mindst 72 verificerede timer i alle aktive zoner; ingen bagudfyldning eller scoreændring.

## 4.0.219 – routingaudit hentes ikke før hver vejrbygning

- [x] Artifact #2757 er størrelsesmålt med kompakt JSON og 96 kørsler/dag.
- [x] Routingauditten er fjernet fra central runtimehydrering, men bevares i frisk generering, beskyttet upload og ejerens adminvisning.
- [x] Regressionen bevarer stationsregister og redigerbar central konfiguration.
- [x] Read-only estimator viser cirka 3,03 GiB/30 dage som nedre pipelinegrænse mod cirka 4,44 GiB før rettelsen.
- [x] Målrettede Supabase/admin-regressioner, estimator, versions-/håndbogs-/RDKS-kontrol og lokal releasegate består.
- [x] Fuld lokal `validate` består hele geometri-v2-kæden og stopper derefter forventet fail-closed ved repositoryets historiske 211-zonegrundlag mod den centralt effektive bestand på 210; forskellen er ikke omgået.
- [x] #31885856568 produktionsverificerer central hydrering uden routingaudit-readback, frisk routingaudit-upload, fulde gates, Supabase og Pages på commit `5c823947`.
- [x] Artifact #2764 giver 3,028 GiB/30 dage som read-only nedre grænse og 1,416 GiB/30 dage undgået readback ved 96 kørsler/dag.
- [ ] Næste billingperiodes faktiske egressmåling; estimator og grøn funktionstest er ikke billingbevis.

## 4.0.218 – tidsmæssigt sikkert havmodelskift

- [x] De 27 zoners tilbagefald er adskilt fra 4.0.217-historikrettelsen og ført til et sent `dkss_idw`-halepar.
- [x] Et halepar kan ikke længere rydde en eksisterende strømserie omkring nu.
- [x] Et reelt bedre aktuelt par og recovery uden eksisterende aktuelt anker er bevaret.
- [x] Målrettede modelvalgs-, historik-, versions-, håndbogs- og RDKS-tests samt lokal releasegate består.
- [x] Fuld lokal `validate` består hele geometri-v2-kæden og stopper derefter forventet fail-closed ved repositoryets historiske 211-zonegrundlag mod den centralt effektive bestand på 210; forskellen er ikke omgået.
- [x] #31883707138 beviser central hydrering, DMI-bulk, fulde gates, Supabase og deploy; `rr-20260815122446-210` har aktuel verificeret strøm i 210/210 og 41 strømtrin i hver af de 27 tidligere berørte zoner.
- [ ] Kommende modelrotationer skal eftermåles, indtil et konkurrerende sent par faktisk udløser `CURRENT_ANCHOR_PROTECTED`; den første produktion valgte NSBS uden denne konkurrence.

## 4.0.217 – samme verificerede prøve i 24- og 72-timersvinduer

- [x] Produktionsartifact #2750 er målt: 210/210 zoner har 142 prøver og 35,1 timers rå historie.
- [x] Rodårsagen til den ujævne verifikationshistorik er lokaliseret til efterberigelse af kun `samples24h`.
- [x] Den eksakte aktuelle prøve synkroniseres til begge vinduer efter eksisterende DMI-U/V-verifikation.
- [x] Regressionen bevarer ældre `false`, afviser uverificeret ny strøm og beviser akkumulering over successive merges.
- [x] Auditten måler nu faktisk tidsspænd, største hul og verificeret andel.
- [x] Målrettede historik-/provenienstests, 210-zonesimulering, versionskontrol, RDKS og lokal releasegate består.
- [x] Fuld lokal `validate` stopper som forventet fail-closed ved repositoryets historiske 211-zonegrundlag mod den centralt effektive bestand på 210; forskellen er ikke omgået.
- [x] #31882866344 beviser central 210-zonehydrering, fulde gates, Supabase, deploy og første fremadrettede vækst: datasæt `rr-20260815114746-210` fordelte verificerede 72-timersprøver som 102×1, 98×2 og 10×102.
- [ ] Eftermålingen fortsætter til mindst 72 faktiske timer; fortid udfyldes ikke bagudrettet.

## 4.0.216 – progressiv offentlig vejrindlæsning

- [x] Byteaudit dokumenterer den deployede flaskehals i hovedzoneprognoser og lokale kystdelsdata.
- [x] Startpakken bevarer aktuelle scorer, kompakt historik, flowpunkter og aktuelle vindende kystdele for begge jagtformer.
- [x] Detaljepakken bevarer alle femdøgnstimer og alle lokale kystdele.
- [x] Manifest, klient og regression afviser datasetblanding.
- [x] Browserkontrol med frisk 210-zonedata viser kort/rangliste, færdig prognose, zonepanel og nul browserfejl.
- [x] Lokal `release:gate` og målrettede runtime-, historik-, versions-, RDKS- og browsertests består. Fuld lokal `validate` stoppede fail-closed ved repositoryets historiske 211-zonegrundlag og blev derfor ikke omgået.
- [x] #31880984004 bestod efter central adminhydrering den fulde 210-zonekæde med `validate`, releasegate, Supabase/artifact og Pages-deploy.
- [x] Direkte deploykontrol viste 4.0.216, datasæt `rr-20260815110313-210`, 210 zoner, 2.534.969 bytes startpakke og 24.748.808 bytes komplet detaljepakke.

## 4.0.215 – privat besøgsstatistik

- [x] Sidevisninger og browserbesøg er adskilt uden vedvarende besøgsidentitet.
- [x] Kun én aggregeret Supabase-række pr. dag gemmes; rå person- og browserdata er udeladt.
- [x] Ejerbeskyttet rapport viser periode, dagstal og separat antal login-konti.
- [x] Offentlig registrering er efter normal appstart og fail-open.
- [x] Målrettet kontrakttest dækker sessionstælling, dataminimering, kontotal og ikke-blokerende opstart.
- [x] Databasemigrationen er installeret og testet mod den offentlige RPC; de to afgrænsede testbesøg er fjernet igen.
- [x] #31876816700 bestod fuld frisk CI/deploy; direkte kontrol viste 4.0.215 og første rigtige produktionsoptælling på 1 sidevisning/1 browserbesøg.
- [x] Den private rapport viste dagstallet og 2 oprettede/2 aktive login-konti med korrekt forklaring af browserbesøg.

# Tidligere status: 4.0.214 – fail-closed genopbygning af havoverfladetemperatur

## 4.0.214 – fail-closed genopbygning af havoverfladetemperatur

- [x] #31873118298 afviste 756 nye dybdelagsmeddelelser og bestod hele releasekæden.
- [x] Artifactet afslørede ældre cachede temperaturtimer uden lagproveniens; 4.0.213 var derfor kun første halvdel af rettelsen.
- [x] Parser 16 fjerner umærkede/ikke-overflade temperaturtimer fail-closed og prioriterer manglende overfladetemperatur i DKSS-rotationen.
- [x] Øvrig vejrhistorik bevares; kun uverificeret temperatur kasseres.
- [x] Artifact #2777 beviser genopbygning i alle relevante modeller: 116 IDW-, 71 NSBS- og 23 LF-zoner samt 9.159/9.159 native temperaturtrin med `surface:0` og nul lagafvigelser.
- [x] #31874335007 bestod frisk DMI, fuld validering, releasegate, Supabase og Pages og leverede datasæt `rr-20260815083802-210`.
- [x] Den fælles P1-komponentmatrix og regressionsplan er dokumenteret for vind, bølger, strøm, vandstand og vandtemperatur.
- [ ] Det fulde virkelige 72-timersvindue afventer fortsat måling.
- [x] Numeriske overgangsfejl er målt på #31874335007 og sammenholdt med almindelige timer for alle fem komponenter.
- [x] Overgangsmålingen er gentaget på 4.0.214, 4.0.217 og en fuld DMI-rotation i 4.0.218; hovedmønstret er stabilt og dokumenteret i `P1_SOURCE_TRANSITION_REPEAT_4.0.218.md`.
- [ ] Permanente regressionsgrænser kræver fortsat flere forecastcyklusser pr. komponent: 4.0.218 gav en ny NSBS-cyklus, men ikke nye HARMONIE-/WAM-cyklusser eller en færdig ny Limfjordscyklus; det fulde virkelige 72-timersvindue afventer også.

## 4.0.213 – entydig DMI-havoverfladetemperatur

- [x] 4.0.212-supportartifactet dokumenterer DMI-parameter 80 ved både `surface:0` og mange `depthBelowSea`-lag i alle tre DKSS-collections.
- [x] Den tidligere skalarkæde kunne overskrive samme zone/time i GRIB-rækkefølge og bevare det sidst læste dybdelag uden lagidentitet.
- [x] Kun `surface`, niveau 0, accepteres nu som offentlig vandtemperatur; dybere lag afvises fail-closed.
- [x] Temperaturens grid- og timeproveniens gemmer `verticalLayer: surface:0`.
- [x] Parsergeneration 15 tvinger kontrolleret genbehandling af den aktuelle DMI-cache.
- [x] Målrettede parser-, grid-, forecast-, null- og historiktests består lokalt.
- [x] Senere fuldt gated produktion til og med #31889559758 beviser genopbygget overfladetemperatur, bevaret strøm/vandstand, supportartifact, Supabase og Pages.
- [ ] Den separate tidligere 15-timers hale er reduceret til fire viste timer i artifact #2777: otte Limfjordszoner har 114 mod 118 temperaturtimer. DEC-0030-horisontanalysen forbliver åben.

## 4.0.212 – komponentkorrekt DMI-modelskift

- [x] Produktionsforløbet #31856214946 → #31856697202 → #31857361460 → #31858042990 dokumenterer præcis overgang fra 210 til 183 zoner med aktuel strøm.
- [x] De 27 berørte zoner er én fælles NSBS-regression: 38 strømtrin blev reduceret til ét sent trin, ikke 27 uafhængige geografiske huller.
- [x] Skalare marinefelter kan ikke længere genvælge en eksisterende autoritativ havmodel eller omskrive strømvalgets score.
- [x] Et bedre fælles strøm-U/V-par kan fortsat skifte model; regressionstesten dækker begge sider.
- [x] #31870747677 genlæste NSBS én gang, bestod fulde gates/Supabase/Pages og dokumenterede verificeret aktuel strøm i 210/210 zoner.
- [x] Alle 210 zoner når mindst 100,8 timers sammenhængende marinehorisont; 27 har 37 strømtrin, 183 har 38.
- [ ] DEC-0030 skal forklare og designe de sidste cirka 17–19 timer fra 100,8 til reel 118–120-timers strømkæde.
- [ ] 131 rå historikprøver pr. zone er bevaret; eftermålingen fortsætter, indtil et fuldt 72-timers vindue er dokumenteret.

## 4.0.211 – bevaret DMI-havmodel og genbehandling

- [x] #31854174281 bestod fuld releasekæde og deployede 4.0.211.
- [x] #31855164652 genopbyggede den næste DMI-havmodel, bestod fuld validering/releasegate/Supabase/Pages og gav verificeret aktuel strøm i 210/210 zoner.
- [x] 210/210 zoner bevarede `marineSelection`, og alle havde 107 rå `samples72h`-prøver efter den efterfølgende kørsel.
- [ ] De 75 zoner, som først blev verificeret i #31855164652, følges gennem 72 timer; verificeret historik måles uden bagudrettet udfyldning.
- [ ] DEC-0030 klassificerer de 89 zoner under 96 timers marinehorisont. Aktuelt minimum er cirka 70,8 timer, og kun 121/210 når mindst 96 timer; cirka 120 timer er fortsat målet.
- [x] 4.0.210 efterkontrol dokumenterer, at diagnosen fandt hullerne, men alle 39 aktuelle IDW-/NSBS-filer blev sprunget over som tidligere behandlet.
- [x] `marineSelection` bevares nu gennem cachemerge.
- [x] Legacy-cache rekonstrueres fra faktisk collection, gitterafstand og kysttype; produktionsartifactet giver 1.138 gendannede valg.
- [x] En dårligere havmodel kan ikke længere rydde en bevaret autoritativ serie.
- [x] Behandlingssignaturen er hævet, så aktuelle DMI-filer genlæses præcis én gang under migrationen.
- [ ] Frisk produktion skal bevise forbedret strømserie, fuld validate, releasegate, Supabase, artifact og deploy.

## 4.0.210 – sammenhængende DMI-strømdækning
- [x] Produktionsartifactet er målt: 125 zoner havde kun to sene strømtrin, 75 havde syv sene trin, og 10 havde fuld serie fra nutiden.
- [x] Rodårsagen er lokaliseret til schedulerens horisontsmål, som brugte sidste gyldige tidspunkt uden at kontrollere start eller interne huller.
- [x] Dækning kræver nu en sammenhængende serie fra nutiden ved den native DMI-cadence.
- [x] Regression afviser en fjern prognosehale og et internt hul som komplet dækning.
- [x] Den korrigerede scheduler prioriterer `dkss_idw` og `dkss_nsbs` for de 200 dokumenterede hovedzonehuller.
- [ ] Frisk produktion skal bevise genhentning, fuld validate, releasegate, Supabase, artifact og deploy.
- [ ] Mindst 72 timers eftermåling skal dokumentere, hvor mange zoner der opbygger verificeret strømhistorik; reelle geografiske DMI-huller forbliver missing.

## 4.0.209 – længere historik og vandstandsproveniens
- [x] 4.0.208-artifactet er målt til 101 prøver/cirka 24 timer i alle 210 zoner.
- [x] Separat 72-timers pipelinehistorik er implementeret; aktiv score og `shadow-v2` bruger fortsat kun 24 timer.
- [x] Regression beskytter 72/24-adskillelsen og udelader begge rå vinduer fra `public-conditions.json`.
- [x] Vandstands-continuity bevarer den oprindelige DMI-identitet.
- [x] Målrettede retention-, current-history-, water-continuity- og forecast-store-tests består lokalt.
- [x] 4.0.209 er produktionsverificeret i #31852633877 med retention, provenance, artifact, Supabase og deploy; alle 210 zoner startede `samples72h` med 102 prøver.
- [ ] Providerskift analyseres videre under DEC-0030; ingen kilde-, merge-, fallback- eller scoreændring er inkluderet.

## Lokal validering og centralt effektiv zonebestand

- [x] Stale lokale `conditions.json`-data klassificeres særskilt fra en aktuel zone-/vejrdækningsfejl.
- [x] Dækningsgaten er fortsat fail-closed; den springer hverken manglende eller ukendte zoner over.
- [x] Atomisk mismatch mellem lokalt manifest og conditions er fortsat en hård fejl.
- [x] Skrivebeskyttet `audit:deployed-zone-weather` sammenholder deployet `zones.geojson` og `public-conditions.json` og kontrollerer eksplicit alle tre Vadehavszoner.
- [x] Direkte produktionsaudit 15. august 2026 gav 210/210 og vejrdata til `DK-B04-12`–`DK-B04-14`.
- [x] Den gamle 211-formulering i kendte issues er markeret erstattet: Fejø/Femø og Havnø/Mariager Fjord øst er centralt slettede; den effektive bestand er 210.
- [x] 4.0.208 er produktionsverificeret i #31848912461 på commit `7a3382f200a72b702d814ba4d8ca205dc4523369`: central adminhydrering/tombstones, frisk vejrbygning, fuld validering, releasegate, Supabase, artifact og deploy bestod. Direkte efterkontrol viste 4.0.208 og 210/210 med alle tre Vadehavszoner.

## Admin land/hav og manuel ejerreview

- [x] Beslutningen om præcis ét autoritativt punktpar pr. aktiv kyststrækning er registreret i DEC-0037.
- [x] **Sæt nyt havpunkt** og **Sæt nyt landpunkt** er fjernet fra editoren.
- [x] Trækbare eksisterende markører, rød hav→land-pil, geometrikontrol, central readback og DMI-/releasevalidering er bevaret.
- [x] Regressionstesten afviser genindførelse af de fjernede knapper og beskytter fortsat træk- og runtime-roundtrip.
- [x] 4.0.207 er produktionsverificeret i #31845836107: frisk vejrdata, fuld projektvalidering, releasegate, Supabase-synkronisering, artifact og Pages-deploy bestod.
- [ ] Ejeren gennemgår senere alle zoner manuelt og vælger et repræsentativt punktpar på bugtede strækninger. Opgaven kan udføres gradvist og blokerer ikke uafhængige roadmapopgaver.
- [ ] Den manuelle gennemgang skal være afsluttet før endelig faglig godkendelse af alle lokale scorer og domæne-/brugerrelease.

## Fallback efter fuld national kæde

- [x] Målrettet central roundtrip/rollback bestod i #31822371489.
- [x] 4.0.205 blev produktionsverificeret i #31822335540 med frisk DMI, fulde gates, central synkronisering og deploy.
- [x] Privat #31822748625 bestod hele den nationale hovedkæde og central create/read/update/delete/rollback før fallbacktrinnet.
- [x] Den dokumenterede clean-runner-fejl er rettet: fallbackbyggeren opretter selv alle outputmapper.
- [x] Byggeren kan genbruges efter tidligere aktivering ved at anvende centralt aktive naborester i stedet for slettede historiske del-ID'er.
- [x] Eksisterende validerede punktpar og deres retning bevares eksakt; manglende retning stopper fail-closed.
- [x] ESA WorldCover 10 m er genkørt på den aktuelle 17-dels kandidat med samme 11 verificerede, fire rettelser og to blokerede dele.
- [x] Ren lokal fallbackslutkæde består med 2/2 ejerskabsflytninger, 9/9 erstatninger og nul overlap.
- [x] 4.0.206 er produktionsverificeret i #31831068809 med progressiv DMI-færdiggørelse, frisk vejrbygning, fulde gates, Supabase, artifact og Pages-deploy; live runtime har 210 zoner og alle tre nye Vadehavszoner.
- [x] Privat #31829349458 beviser fallback-DMI, slutvalidering, nul overlap, central roundtrip/rollback og begge artifacts som del af hele den friske nationale kæde.
- [ ] Privat geometri må kun aktiveres efter særskilt ejerafgørelse.

## Supabase og privat national slutkontrol

- [x] Offentlig 4.0.204 er fuldt produktionsverificeret i #31815039302.
- [x] Privat #31815423082 har bevist hele den nationale kæde frem til og med endelig shadow-score, score-neutralt ejerreview og slutaudit for 835 dele.
- [x] Den eneste fejl er lokaliseret til første beskyttede `direction-reviews`-læsning: HTTP 401 / `PGRST303` fra Supabases interne secret-key-oversættelse.
- [x] Nye `sb_secret_`-nøgler sendes kun som `apikey`; en fælles requester genprøver kun den dokumenterede `PGRST303` én gang og stopper ellers fail-closed.
- [x] Python-hydreringen før DMI følger samme snævre retryregel og stopper GitHub Actions ved central læsefejl i stedet for at fortsætte på historiske repositorydata.
- [x] Beskyttet manifestsync kan ikke længere omdanne en læsefejl til “manifest mangler” og dermed udløse unødvendige Supabase-skrivninger.
- [x] Lokal regression dækker headerkontrakt, præcis én genprøvning, vedvarende/andre auth-fejl, kvotebeskyttet manifestlæsning og at målrettet workflow ikke kan deploye.
- [x] Målrettet CI-roundtrip mod artifactet fra #31815423082 bestod i #31822371489.
- [x] Privat #31822748625 beviste roundtrip/rollback i den fulde friske kæde; fallbacktrinnets clean-runner-fejl er afgrænset og rettet i 4.0.206.
- [ ] Privat geometri kan fortsat kun aktiveres efter særskilt ejerafgørelse; offentlig RavScore og geometri er uændrede.

## Effektiv national zonebestand

- [x] Central ejerbeslutning om sletning af Fejø/Femø giver 210 effektive aktive hovedzoner.
- [x] National plan, topologiaudit, delgenerator, stednavneaudit, validatorer og regressionstest bruger samme 210-zonekontrakt.
- [x] Lokalitetsopdelingen bruger også 210 og kan ikke længere stoppes af den historiske 208-konstant.
- [ ] Frisk privat national kørsel skal bekræfte hele kæden efter politikrettelsen.

## National land-/vandaudit og rettelse

- [x] 673 aktive lokale kystdele er kontrolleret mod uafhængig 10 m landdækning ved flere afstande fra den præcise kyst.
- [x] 434 punktpar er verificeret korrekte, 121 er dokumenteret omvendte, og 118 er bevaret som tvetydige uden automatisk gæt.
- [x] De 121 rettelser har reproducerbar evidens og nye vinkelrette land-/vandpunkter.
- [x] Admin viser rød hav→land-retning og kræver kystkryds, modsatte sider og højst 20 graders afvigelse fra vinkelret før godkendelse.
- [x] Produktionsbyggeren beregner pålandsretningen geodætisk fra punktparret; et gammelt gemt retningstal kan ikke tilsidesætte markørerne.
- [x] Den private nationale workflow anvender rettelserne før både første og endelige punkt-/DMI-validering.
- [ ] Frisk privat national GitHub-kørsel skal bevise DMI-grid, score-neutralitet, runtime og rollback for rettelseskandidaten.
- [ ] De 118 tvetydige kystdele skal samles i en særskilt manuel kontrol efter alle automatiske gates er afsluttet.

## Tidligere 4.0.195-status

## Admin land/hav

- [x] Hvert hovedzonevalg invaliderer kortstørrelsen, rydder tidligere lag og zoomer til den nye zones aktive kystdele.
- [x] Valgt kystdel, øvrige dele samt eksisterende land- og havpunkter tegnes med entydige roller.
- [x] Forsinkede kortcallbacks fra et tidligere valg kan ikke overskrive det seneste valg.
- [x] **Vis på hovedkortet** er fjernet; editorens arbejdskort er den eneste relevante visning.
- [x] Kortets geografiske grænser beregnes og anvendes før første vektorlag tilføjes; reproduceret Leaflet-fejl er væk i isoleret browserkontrol med produktionsdata.

## Lokal DMI, score og forklaring

- [x] Rodårsag dokumenteret: schedulerens dækningsnævner udelod 651 aktive lokale kystdele.
- [x] Hovedzoner og kystdele indgår nu i samme faktiske DMI-recovery.
- [x] Lokale scorer kræver lokal strømretning og -hastighed; manglende lokal sammenligning falder sikkert tilbage til hovedzonescoren uden geografisk påstand.
- [x] Fuld scoreforklaring, lokalt vejr, lokalt punktpar og lokal pålandsretning føres til offentlig runtime/debug.
- [x] Landsdækkende gate kræver mindst 95 % verificeret lokal U/V-dækning og forbyder overpublicering.
- [x] #31764453987 bestod frisk data, fuld validering, releasegate og deploy for 4.0.193-kodekæden før geometriaktivering.
- [ ] Den aktiverede 673-dels pakke skal opbygge mindst 95 % lokal U/V-cache og bestå den skærpede gate i en efterfølgende produktionskørsel.
- [x] #31764957646 stoppede før deploy ved central manifestreadback, fordi aktiveringsstatus ikke matchede den eksisterende `owner-approved-*`-promotionskontrakt. Status og portabel rollbacksti er rettet uden at svække hash/readback.
- [x] Alle 651 aktive punktpar er auditeret mod eget kystreferencepunkt og lokal tangent: 13 afvigelser; privat reparationskandidat giver 0.
- [x] Vedvarende retningsskift er auditeret afstandsbaseret. En konservativ kandidat opdeler 10 hidtil enkelt-delte hovedzoner til i alt 673 lokale dele; Helgenæs bliver tre fysisk forskellige sider.
- [x] Kandidatens 673 punktpar består den samme geometriaudit med 0 afvigelser. Private kontrolbilleder er genereret og kontrolleret for alle 10 zoner.
- [x] Privat GitHub Actions #31764242827 validerede alle 45 ændrede eller nye vandpunkter mod DMI's native grid: fuld dækning og 0 ugyldige punkter.
- [x] Kandidaten er lokalt aktiveret som 673-dels pakke med versionsstyret rollback til 4.0.192/651 dele.
- [ ] Rejsby/Ribe Vesterå er ikke automatisk opdelt, fordi ét lokalt land-sidevalg er tvetydigt. Den nuværende del bevares frem for at gætte.
- [x] Målrettede regressioner for offentlig runtime, delscoreforklaring, kortvisning, adminredigering, ejerskab og aktivering består lokalt.
- [ ] Offentlig brugerflade, ydelse og Supabase-forbrug skal efterkontrolleres på den deployede 673-dels pakke.

## Tidligere 4.0.192-status

## Samlet land-/vandeditor
- [x] Søg hovedzone og vis alle tilhørende aktive kyststrækninger på ét kort.
- [x] Træk det eksisterende autoritative land-/havpunktpar; oprettelse af ekstra punktpar er bevidst fjernet i 4.0.207.
- [x] Central godkendelse med readback og kystdel-ID-bundet runtime-roundtrip.
- [x] DMI-signatur og sampling bruger den byggede aktive kystdelskontrakt med administratorens godkendte punktrettelser.
- [x] Eksisterende filterrækkefølge, centrale kladder og godkendelsesflow er bevaret; det overflødige hovedkortlink er fjernet efter ejerbeslutning.
- [ ] Frisk GitHub-kørsel skal bestå fuld DMI-, validerings-, release- og deploykæde.

## Stabil DMI-sampling-signatur

- [x] #2435/#2437-supportpakker er sammenlignet: signaturen skiftede fra `9c6f8338bfbe0491` til `ae6c3199488d784f` alene sammen med den løbende kilderegistrering.
- [x] Flygtige stations-, observations-, forecast- og versionsfelter er fjernet fra kompatibilitetssignaturen.
- [x] Faktiske samplingændringer i zone, kystdel eller vandkilde er fortsat signaturbrydende.
- [ ] Frisk GitHub-kørsel skal oprette den nye semantiske cache; den efterfølgende ikke-overlappende kørsel skal bevise genbrug og rotation væk fra tidsafbrudt `dkss_idw`.

## DMI-checkpoint bevares som faktisk arbejdsfremdrift

- [x] #2429–#2431 er analyseret som gentagen genstart fra forkert cachegrundlag.
- [x] Nyeste kompatible checkpoint vinder nu over en ældre offentlig cache, selv hvis udløbsrensning har reduceret antallet af rå komponentrækker.
- [x] Offentlig data er fortsat flettet ind i checkpointet ved hver kørsels start; ingen gyldig fallback eller releasegate er fjernet.
- [ ] Frisk GitHub-kørsel skal bevise, at rotationsstate overlever til næste runner, at DKSS-modellerne faktisk skifter, og at 125/210-dækningen vokser.

## DMI-budgetrotation efter fastlåst 125/210-mønster

- [x] #2423–#2426 er analyseret som et gentaget scheduler-loop, ikke som enkeltstående DMI-fejl.
- [x] Tidsafbrudte DKSS-samlinger registreres i den private collection-state og roterer bag ikke-forsøgte/ældre afbrudte marinemodeller.
- [x] Markeringen nulstilles ved fuld eller dokumenteret uændret gyldig samling.
- [x] Målrettede scheduler-, marine-first-, cache- og syntakstests er grønne lokalt.
- [ ] Frisk GitHub-kørsel skal bevise, at andre DKSS-samlinger nås, dækningen vokser fra 125/210, og den uændrede strømaudit til sidst består.

## Progressiv DMI-recovery uden offentlig bypass

- [x] Dokumenteret gentagen fejl: 85/210 hovedzoner med verificeret aktuelt marine U/V-par.
- [x] Dokumenteret, at fejlen også fandtes før 4.0.187 og ikke skyldes de seks kystzoner.
- [x] Privat progressiv `dmi-bulk-cache.json` gendannes før DMI-builderen og gemmes før fuld validering.
- [x] Kun en vellykket cache med aktuel registersignatur kan fortsætte; senest deployede cache bevares som kompatibel fallback, og fejl/afbrydelser gemmes ikke.
- [x] Offentlig Pages-artifact/deploy kræver fortsat alle eksisterende gates.
- [ ] Friske GitHub-kørsler skal bevise voksende dækning og til sidst grøn current-spatial audit.
- [x] Land/hav-admin er i 4.0.192 opdateret til lokale kystdele med eksisterende filterrangering bevaret; produktionsverifikation afventer den friske fulde GitHub-kæde øverst i dokumentet.

## Fem-zoneaktivering

- [x] Fem visuelt godkendte zoner er indarbejdet i den aktive præcise kystpakke.
- [x] Fejø/Femø (`DK-B10-16`) er fjernet fra zoneregister og kystpakke.
- [x] Den centrale Supabase-sletning er skrevet og læst tilbage som `deleted: true` i `direction-reviews` version 315.
- [x] Rollback til den tidligere 4.0.182-kyst er versionsstyret.
- [ ] Fuld lokal validate/releasegate.
- [ ] Frisk GitHub Actions-kørsel og offentlig verifikation.

- [x] DEC-0036 låser det aktive arbejde til de seks navngivne fallbackzoner og adminværktøjet. Den fejlagtigt udvidede landsdækkende pipeline er stoppet som arbejdsretning og må ikke genoptages uden ny udtrykkelig ejergodkendelse.
- [x] Admin-endepunkter kan trækkes til en eksisterende valideret nabokystdel.
- [x] Viskelæder deaktiverer/gendanner en hel del og dens punkt-/DMI-kontrakt samlet.
- [x] Central schema-4-readback validerer både ejerskab og deaktiveringer.
- [x] Produktionsbyggeren publicerer ikke centralt deaktiverede dele.
- [x] Privat fallbackrecovery bevarer `DK-B02-14` som slettet. Den korrigerede kandidat har 22 mål-/naborester, 22/22 punktpar og nul overlap; hele flytninger, der tømte nabozoner, er forkastet.
- [x] En separat, ikke-deployende seks-zoneworkflow validerer den låste plan og kandidatens vandpunkter på DMI's native grid; den starter ingen national genopbygning.
- [x] Fallbackrecovery og native DMI-gridkontrol er koblet på den eksisterende private nationale Linux-kørsel og uploader kun ikke-aktiverbare QA-artifacts.
- [x] Den nationale planport er opdateret fra den historiske 208-zonebestand til den aktuelle eksplicitte politik på 211 zoner; downstream-kildegater sammenligner bestandene indbyrdes i stedet for at skjule drift med en løs konstant.
- [x] #31589831140 bekræftede plan, officiel kildehentning, kilde-QA og fjord-/normasker for 211 zoner. Den efterfølgende topologiaudit og delgenerator er nu også afstemt til 211 med matchende validatorer og regressionstests.
- [x] #31590992368 bekræftede 211 zoner og 131 fliser gennem topologi, dækningsaudit og delgenerator. Stednavnegaten følger nu planens faktiske fliseantal og bevarer komplet requestkontrol uden den forældede 100-fliseantagelse.
- [x] Privat #31609637964 bestod 22/22 native DMI-gridvalg, den deaktiverede 656-dels/211-zoners runtime, uændrede zoner uden for det godkendte område og rollback-isolation.
- [ ] Ejeren skal visuelt godkende seks-zonekontrolkortet. Shadow-score og offentlig releasegate følger først derefter; automatisk aktivering er fortsat forbudt.

## 4.0.185 – produktionsverificeret

- [x] Offentlig “Hvad fandt du?”-formular fjernet uden at slette tur-/observationsinfrastruktur.
- [x] “Hvor er det?” tegner eksisterende kystdele ved klik, viser navne og zoomer til hovedzonen.
- [x] Kortvisningen kræver ingen nye billeder eller ekstra datahentning ved opstart.
- [x] GitHub Actions #31578272122 bestod frisk datakæde, fuld validering, releasegate og Pages-deploy; offentlig 4.0.185-kode er kontrolleret for knap, kortlag, zonezoom og fravær af fundformular.

- [x] Fælles lokal scoreresultatbygger bevarer totalscore, delscorer, begrundelser og geografisk dækning.
- [x] Én eller flere bedst scorende kystdele vises tydeligt ved en spredning over 7 point; præcis 7 point gælder fortsat hele zonen.
- [x] Aktuel zone og femdøgnsvisning anvender samme lokale resultatkontrakt.
- [x] Offentlig 4.0.183-runtime er systemisk auditeret: 412/412 aktuelle visninger kan bygges komplet, uden manglende vinder eller scoreuoverensstemmelse.
- [x] GitHub Actions #31575562432 bestod frisk datakæde, fuld validering, releasegate og Pages-deploy; den offentlige 4.0.184-runtime er efterkontrolleret på Reersø og Mullerup.

- [x] Interne sorte kystdelsmarkeringer er fjernet; ét gensidigt nærmeste møde mellem to forskellige hovedzoner giver ét skel.
- [x] Sorte skel skaleres ned ved landszoom, og tilbage-knappen gendanner Danmarksoverblikket.
- [x] Admin kan flytte en eksisterende præcis kystdel til en anden aktiv hovedzone. Delen beholder geometri, land-/vandpunkt, gridbevis og del-ID gennem public runtime og scoring.
- [x] Runtime afviser ukendte/slettede modtagere, publicerer en del én gang og filtrerer rester fra slettede hovedzoner.
- [x] GitHub Actions #31572312647 bestod fuld bygge-, data-, release- og Pages-kæde; 4.0.183 er produktionsverificeret.

- [x] Ejeren har godkendt national slutkontrol og de seks sidste rettelser.
- [x] Den frigivelsesklare bestand er 643 interne dele under 212 hovedzoner; 206 hovedzoner har præcis kyst og seks bruger sikker legacy-fallback. Der er nul tværzoneoverlap og nul uafklarede relevante huller.
- [x] Alle 643 dele har land-/vandpunkter; 632 har fuldt og 11 delvist marint gridbevis. Privat #31532688885 bestod DMI for alle 39 nye eller ændrede punktpar.
- [x] Privat #31533385967 bestod deaktiveret runtime, public-kontrakt og central admin-roundtrip/rollback uden ændring af beskyttede poster.
- [x] #31541126136 produktionsverificerede 4.0.182 med frisk DMI, fuld projektvalidering, release-gate, central Supabase-readback, Pages-artifact og deploy. Direkte onlinekontrol bekræftede 211 effektive hovedzoner, 643 kystdele under 206 præcise zoner, alle tre Vadehavszoner med vejrdata og et synligt fejlfrit kort.
- [x] Første releaseforsøg #31536061680 dokumenterede, at den historiske 4.0.48-generator fjernede de tre nye Vadehavszoner før validering. Generatoren bevarer nu eksplicit de godkendte tilføjelser; intet blev deployet fra den fejlede kørsel.
- [x] Andet releaseforsøg #31537882402 dokumenterede, at den ældre centrale aktiveringsmanifest overskrev den nyere ejer-godkendte 4.0.182-manifest før vejropbygningen. Central sync bevarer nu kun en semantisk nyere, eksplicit ejer-godkendt repositoryaktivering; ved samme eller ældre version er Supabase fortsat autoritativ, så admin-rollback bevares. Intet blev deployet fra den fejlede kørsel.
- [x] Tredje releaseforsøg #31539597870 beviste den rettede engangspromotion, frisk DMI og central vejrskrivning, men en ældre kildekodetest forventede den tidligere komprimerede Python-formatering og stoppede fuld validering. Testen matcher nu den faktiske nøgle-/stikontrakt uafhængigt af sikker formatering; intet blev deployet.

## National kystgeometri v2 – datakæde verificeret, offentlig kortvisning rettes
- [x] Ejeren har godkendt det private seks-zoners korrektionskort. Den versionsførte godkendelse tillader samling og audit, men ikke automatisk produktion eller scoreaktivering.
- [x] De seks godkendte rettelser er samlet med den additive kandidat til 206 præcisionsdækkede hovedzoner og 643 dele. En korrigeret symmetrisk overlapgate fjernede 11 oversete additive dubletdele; tre helt dublerede præcisionszoner faldt sikkert tilbage til deres hovedzonelinje. Tværzoneoverlap er nu nul, og hulauditen har nul uafklarede relevante huller.
- [x] Alle 643 dele har land-/vandpunkt; 39 nye eller ændrede dele er genereret uden blokering, mens 604 eksisterende punktpar genbruges.
- [x] Privat #31532688885 beviser native DMI-dækning for den endelige 39-punktsbestand: 39 fulde, nul delvise og nul blokerede.
- [x] Den score-neutrale vejridentitetskontrakt er bygget på det komplette kommende register med 212 hovedzoner.
- [x] Den versionslåste 643-dels kandidat bestod privat runtime-/releaseintegration i #31533385967 og blev efter ejerens godkendelse produktionsverificeret i #31541126136.
- [x] Den autoritative otte-zoners ejerfil `(4)` er versionsført og anvendt fail-closed. Seks bevarede/rettede kandidater er samlet i et privat korrektionskort; to fejlagtige præcisionsforslag er forkastet uden at slette deres eksisterende hovedzoner.
- [x] Vadehavsforslaget sammenholdes nu med hele den additive 650-dels kandidat, så den eksisterende Emmerlev-geometri ikke dobbeltregistreres. Den private Vadehavstilføjelse er 81,883 km efter denne deduplikering.
- [x] Ejeren har kontrolleret og godkendt det lille seks-zoners korrektionskort; godkendelsen er versionsført fail-closed.
- [x] Den manglende relevante fastlandskyst langs Vadehavet fra Emmerlev til Esbjerg er fundet som en ejerskabsfejl. Det rettede private forslag er 81,883 km uden Rømødæmning, økyster eller runtime-overlap. To ejerbestemte forbindelser på samlet 4.671,4 meter er eksplicit dokumenteret som manuelle broer og må ikke beskrives som direkte GeoDanmark-geometri.
- [x] Privat #31480089490 genbyggede den friske centralt hydrerede landskæde og bestod geometri, 605/605 land-/vandpunkter, 605/605 DMI-gridvalg, flertrinsserier, isoleret state/historik, lokal vind, shadow-score og central admin-roundtrip/rollback.
- [x] Slutbestanden er 605 lokale kystdele i 190 hovedzoner, nul fysiske overlap og 594 fuldt plus 11 delvist marinedækkede dele. Den sidste tætte ejerskabsbeslutning ved Orehoved tilhører Falsters nordkyst, ikke Bøgestrømmen vest.
- [x] Ejeren har 11. august 2026 givet udtrykkeligt go til aktivering på testdomænet. De 605 dele, 605 punktpar og deres DMI-gridbevis er versionslåst med SHA-256.
- [x] Det almindelige DMI-bulkjob sampler delene i allerede downloadede GRIB-felter uden ekstra netkald pr. del. De 605 dele ændrer ikke schedulerens 208-zoners dækningsnævner.
- [x] Score beregnes lokalt pr. del og tidspunkt. Bedste gyldige del bærer hovedzonens score; en 7-punktsmargin afgør hel zone, én del eller flere dele. Manglende lokal sammenligning bliver `uncertain`; gammel hovedzonescore bruges ikke som fallback.
- [x] Den offentlige kortvisning bruger de nye kyststreger. Central `coastal-parts-v2-activation` kan slå aktiveringen fra igen uden at slette den tidligere hovedzoneruntime.
- [x] #31491319173 beviste 605 offentlige kyststreger, fulde Linux-gates, Supabase-readback, Pages-artifact og deploy for 4.0.176.
- [x] Online audit fandt fail-closed 0/605 lokale scorer og workflowloggen dokumenterede separate gridopslag som årsag. #31493787424 viste derefter, at 4.0.177's ecCodes-flerpunktsfunktion stadig gentog den dyre søgning internt og færdiggjorde nul trin.
- [x] #31495844161 beviste 4.0.178's indeks: otte HARMONIE-trin, 44 WAM-trin, 543/605 lokale scorer i alle 190 zoner, fulde gates, central readback og deploy.
- [x] #31497361674 beviste fire kandidatceller, fulde gates, central readback og deploy; online steg dækningen til 592/605 i alle 190 zoner.
- [x] De sidste 13 kræver mere end fire naboceller. 4.0.180 genbruger den private vindgates dokumenterede 32-celle-retrygrænse og kræver fortsat fælles gyldig U/V.
- [x] #31498481482 bestod fulde gates, central readback, artifact og deploy. Onlinekontrollen viste lokal score til 605/605 dele i alle 190 hovedzoner.
- [x] Rodårsagen til det uoverskuelige kort er dokumenteret: `mapZoneCollection` gjorde hver intern del til en synlig zone, og `renderZones` tilføjede to sorte endemarkeringer samt casing, farvelinje og klikflade pr. del.
- [x] 4.0.181 fjerner denne projektion. Kortet modtager igen de oprindelige hovedzoner; lokale scorer læses fortsat fra `conditions.coastalParts`.
- [x] #2279 (`31505747519`) bestod frisk DMI-kæde, fuld Linux-validering, release-gate, Pages-artifact og deploy. Offentlig browserkontrol viste 208 centralt aktive hovedzoner og præcis 416 endemarkeringer.
- [x] Målrettede aktiverings-, public-runtime-, zoom- og scorepræsentationstests består. De 605 multipart-beregningsdele blev tidligere til 2.488 synlige linjer og cirka 12.440 Leaflet-objekter. Lokal browserkontrol viser nu 209 aktive hovedzonelinjer, cirka 1.045 kortobjekter og præcis 418 endemarkeringer – to pr. zone.
- [ ] Frisk produktion skal bevise farver, tooltips, klik, indlæsning og kun to synlige endemarkeringer pr. hovedzone.
- [ ] Auditér beregningsdækningen mod kendte relevante ravstrande; synlig hovedzonekyst og skjult beregningsdækning må ikke forveksles.
- [x] Rodårsagen til flere manglende præcise hovedzoner er identificeret: den private kildeplan valgte fliser fra den gamle kystlinje i stedet for zonens fulde ejerskabsområde.
- [x] Lokal plan- og analysetest dækker nu hele ejerskabsområdet (128 fliser for den seneste 208-zonebestand) og begrænser bred recovery til de 18 aktive hovedzoner uden præcise dele. De 190 repræsenterede zoner genbruger eksisterende arbejde.
- [ ] Ny privat national CI skal hente de ekstra officielle fliser og bevise, at recoveryzonerne ikke længere mangler kildedata.
- [x] Privat #31514481361 gennemførte 128-flisehentning, kildevalidering, analyse, topologi og delgenerering. 16/18 manglende hovedzoner fik kandidater; samlet privat råbestand blev 806 dele i 206 zoner. Jobbet stoppede først ved den kendt ustabile eksterne stednavnetjeneste.
- [ ] Anden privat recovery skal bruge alle zonebeviser samlet, så den internt modstridende Nibe-zone ikke afskærer sin faktiske kyst. Den resterende Ålsgårde/Helsingør-kilde skal undersøges særskilt mod officielle lag.
- [x] #31516332559 beviste, at et samlet evidensrektangel er for bredt: 1.072 rå dele i 207 zoner. Denne variant er forkastet og må ikke flettes eller aktiveres.
- [x] Målrettet lokal kildetest bevarer første forsøgs kandidater og genprøver kun helt tomme recoveryzoner i smalle evidensbånd. Resultatet er én resterende nul-zone: Ålsgårde/Helsingør; Nibe får 20,295 km officiel kandidat. Privat CI-bevis af topologi/slutantal mangler.
- [x] En ny privat hovedzoneaudit måler officiel kildeafstand, hovedzonedækning, tværzoneoverlap og handlingsrelevante huller. Førmålingen på de aktive 605 dele gav nul kildeafvigelser, nul overlap og 18 manglende hovedzoner. National once-only-samling reducerer zonevise dubletter til 84 fysiske kandidater: 75 løsrevne, syv endeforlængelser og to små mellemrum.
- [x] #31520862947 verificerede den afgrænsede tom-zone-recovery og kompakt QA. En additiv lokal kandidat bevarer de 605 godkendte dele og når 650 dele/203 hovedzoner med nul kildeafvigelser og nul overlap.
- [x] De 84 huller uden for de fem restzoner er geometrisk sammenholdt med den tidligere ejer-godkendte før/efter-bestand og er alle tidligere bevidste udeladelser; de må ikke genindføres automatisk.
- [ ] Fem restzoner gennemgås i `KYSTZONER-SLUTKONTROL.html`. Først derefter kan den præcise hovedzoneprojektion færdiggøres, valideres og frigives.
- [ ] Et privat samlet hovedzonekort skal derefter bevise præcis kyst, nul overlap, ingen uforklarede almindelige kysthuller, ingen udenlandske/outlier-linjer og kun to offentlige endemarkeringer pr. hovedzone. Ingen offentlig aktivering eller adminudvidelse før dette bevis.

## Historisk kystgeometri-v2-design før aktivering
Punkterne i dette afsnit er udviklingshistorik. Åbne pilotbokse er erstattet af den produktionsverificerede status ovenfor og er ikke længere aktuelle gates.
- [x] Lokal slut-samling efter alle ejerafgørelser reducerer 753 tekniske dele med 311 tværzone-overlap til 603 unikke fysiske dele med nul overlap. Hammer Odde har en eksplicit geografisk nordspidsgrænse.
- [x] Land-/vandpunkter er genberegnet på de 603 endelige linjer. Seks resterende sider er kontrolleret kartografisk og versionsstyret; lokalt resultat er 603/603 punktpar og nul blokeringer.
- [ ] Privat national CI skal bevise native DMI-grid, marine flertrinsserier, state-/historikisolation, vind og shadow-score igen på slutbestanden på 603 dele.
- [x] Privat #31474672948 nåede gennem den oprindelige native DMI-/state-/vind-/shadow-kæde, men stoppede ved en forældet 752/22/9-forventning efter seks allerede versionsstyrede punktbeslutninger. 4.0.175 retter alene forventningen til den faktiske 758/22/3-fordeling; en ny privat kørsel skal stadig nå slutbestanden på 603 dele.
- [x] Privat #31448258035 CI-verificerede 4.0.169's begrænsede vindvalg og hele den nationale kæde: 774 vindserier, 752 shadow-scorer, 22 deldækkede og ni blokerede dele, score-neutral reviewside med 783 dele samt bestået central admin-roundtrip/rollback.
- [x] Ejeren har gennemgået de 31 oprindelige opmærksomhedsdele. 4.0.172 bevarer beslutningerne revisionsbart og bygger et privat korrektionsforslag uden aktivering.
- [x] Ejeren har gennemgået alle 23 supplerende dele. Afgørelserne er normaliseret til 15 sletninger, tre godkendelser og fem præcise rettelser.
- [x] En metrisk landsaudit fandt 12 fysiske dubletter under andre tekniske ID'er. De arver den oprindelige afgørelse og ved præcise beskæringer kun den bevarede, rettede linje. Restlisten er nul; privat CI-bevis mangler fortsat.
- [x] 4.0.171 gør ejerreviewet praktisk anvendeligt med én stor del ad gangen, baggrundskort/luftfoto, tydelig linje, opmærksomhedsfilter, beslutningsknapper, bemærkning og lokal eksport.
- [ ] Privat #31440337378 bestod vindgaten, men stoppede shadow-score ved 0/752, fordi to på hinanden følgende midnatstrin ikke gav den krævede native `t+3h`-vandstand. 4.0.168 henter fire trin og kræver et ægte tretimerspar før scoreinput. Afventer nyt privat CI-bevis.
- [x] Privat #31425327202 verificerede 774/774 native vindserier; kun 20 faktiske gab brugte målrettet 32-celle-retry. Samme-celle-, afstands- og provenancekrav bestod.
- [x] Samme run verificerede DEC-0033-shadow-score for 752 fuldt dækkede dele; 22 deldækkede og ni blokerede forblev fail-closed, og alle mutationsflag var falske.
- [x] 4.0.167 bygger en privat score-neutral ejer-reviewside med alle 783 dele og statusfordelingen 752/22/9 uden delscores, scorefarver, rangering eller rådata.
- [ ] 4.0.167's nationale admin-roundtrip/rollback består lokalt; privat CI skal bevise tempkladde create/read/update/delete og uændrede beskyttede dokumenter.
- [x] 4.0.143 er produktionsverificeret i #2027: central sync, frisk data, fuld Linux-validate, releasegate, Pages-artifact og deploy bestod.
- [x] Første nationaljob målte 101 fliser og 707 sekventielle lagrequests; efter mere end ti minutter var hentningen fortsat aktiv uden flisefremdrift. 4.0.144 begrænser parallelitet til fire fliser og logger deterministisk fremdrift.
- [x] National kildevalidator kontrollerer plan/rapport, 208 zoner, samtlige eksponerede lag, komplethedsflag, filer, hashes, deduplikering, mutationer og credentialfravær før artifact-upload.
- [x] National source-QA bruger `STRtree` til at sammenholde samlede officielle kystobjekter med alle effektive zoner og viderefører planens konfliktklasse uden at foreslå aktivering.
- [x] Privat #2029 beviste korrigeret hentning af den aktuelle centrale 100-flise/700-request-plan på ca. 5:15, grøn validator og 208-zoners source-QA; hele jobbet sluttede på 7:45. 101/707 var den tidligere repositorybaserede planmåling.
- [x] National planlægger bruger den centralt hydrerede effektive bestand, kræver 208 zoner og danner deterministiske, overlappende kildefliser uden 208 manuelle Blåvand-forløb.
- [x] Kendte fejl ved Blåvand, Rømø, Limfjorden og Lolland/Falster er maskinlæsbare konfliktklasser; øvrige centrale ændringer stoppes automatisk som admin-konflikter.
- [x] Separat privat nationalt workflowjob kan hente og deduplikere syv gratis officielle GeoDanmark-lag uden Pages-rettigheder eller mutationsadgang.
- [x] #2029 beviste 208-zoners hydrering, 100 fliser/700 requests, komplethed, deduplikering og credentialkontrol; råartifactet er privat og 413 MB.
- [x] #2033 verificerede 4.0.145's særskilte kompakte artifact på 6,8 MB ved siden af råkilden; #2032 bestod normal produktion.
- [x] 4.0.146 måler national havn-/åmunding-/fjord-/norudskæring, klit-/skræntevidens og høfter i en read-only 208-zone topologiaudit med egen fail-closed gate.
- [x] #2037 verificerede topologiauditens tekniske kæde: 90 officielle masker, 194 zoner med bevaret kandidat og grøn isolation; #2036 bestod normal produktion.
- [x] Artifactaudit afviste første nationale åmundingsregel fagligt: 2.868 klynger i 180 zoner og op til 189 i én zone er oversegmentering, ikke 2.868 dokumenterede åmundinger.
- [x] 4.0.147 tilbageholder åmasker over en eksplicit auditgrænse, markerer zonen no-go og gemmer egenskabsprofil samt begrænsede diagnostiske samples uden geometri eller credentials.
- [x] #2040 viste 45 overdense zoner og nul fejlagtigt anvendte masker; #2039 bestod normal produktion.
- [x] 4.0.148 filtrerer på officiel midtebredde ≥2,5 m og fysisk linjelængde ≥100 m samt rapporterer alle smalle/korte fravalg.
- [x] #2043 målte 489 klynger og kun én overdense, allerede blokeret partitionszone; #2042 bestod normal produktion.
- [x] #2046 produktionsverificerede 4.0.149; privat #2047 dannede 755 dele i 194 zoner med nul opdigtede forbindelser og nul navne/punkter/runtimeaktivering.
- [x] #2049 produktionsverificerede 4.0.150; privat #2050 gav 129 umiddelbart reviewbare og 79 blokerede zoner samt lokalitetsflag på 25 zoner/28 dele.
- [x] #2054 produktionsverificerede 4.0.151; privat #2055 brugte 503 nøglefrie requests, deduplikerede 37.815 steder og gav balancerede kandidater til 755/755 dele uden automatisk navn eller aktivering.
- [x] 4.0.152 opdeler read-only de 28 grove dele i 56 lokale forslag (2,565–19,882 km; gennemsnit 12,43 km). 55/56 har officielt kystnært stedanker; fragmentgrupper bevarer kildelinjen 1:1 og tegner ingen forbindelser.
- [x] Privat #2107 CI-verificerede 4.0.152 på den friske centralt hydrerede 208-zonekæde: source-, topologi-, del-, navne- og lokalitetsgater bestod; build/Pages var korrekt skipped.
- [x] 4.0.154 danner 783/783 private, unikke navneforslag for den endelige bestand (755 minus 28 erstattede plus 56 lokale forslag). Hvert forslag har officielt kandidat-ID, afstand, alternativer og nul automatisk omdøbning/aktivering; Hou/Bisnap-ankergabet lukkes revisionsbart med `Hou Syd` 508,7 m fra delen.
- [x] #2110 produktionsverificerede 4.0.154 med fuld Linux-validate, release-gate og deploy; privat #2111 verificerede 783/783 officielle navneforslag og nul blokerede.
- [x] 4.0.155 danner 774/783 private land-/vandpunktpar fra modsat-side-evidens. 575 bruger et officielt Farvand-vidne og 199 zonens centralt hydrerede marinepunkt. Ni tvivlsomme dele forbliver uden aktive punktforslag og får to neutrale normalalternativer til native DMI-review.
- [x] #2114 bestod fulde produktionsgates/deploy, og #2115 reproducerede præcis 783 dele, 774 punktpar og ni blokeringer fra den aktuelle centrale admin-geometri.
- [x] #2118 stoppede korrekt fail-closed, men afslørede en validatorfejl: alle kandidater var mærket `unknown`, så Nordsø-WAM blev filtreret væk og alle 774 valgte punkter blev afvist.
- [x] #2122 verificerede coastType-routing: 752 valgte punkter har komplette WAM+DKSS-familier; 18 har komplet DKSS uden WAM, og fire har komplet WAM uden DKSS. Alle 774 har mindst én komplet native havmodelfamilie.
- [x] #2127 verificerede 4.0.158 fra central admin-geometri: 792 kandidater, 774 gyldige valgte vandpunkter, 752 med fuld WAM+DKSS, 22 med eksplicit deldækning og nul ugyldige valgte punkter. Alle ni tvivlsdele forbliver blokerede; alle mutationsflag er falske.
- [x] 4.0.159 bygger lokalt en privat national weather-shadow-kontrakt: 774 unikke serie-/historikidentiteter, 752 fulde, 22 med eksplicitte gab, ni udelukkede blokeringer samt 208 autoritative parent-zoner. Produktionsjob #2132 bestod alle Linux-gates; tre private genopbygninger blev eksternt blokeret før kontrakten, fordi den officielle stednavnetjeneste returnerede ikke-JSON.
- [ ] 4.0.160 tilføjede den fail-closed nationale flertrinsgate. #2142 bestod hele upstreamkæden, inklusive stednavne, 774-punkts DMI-grid og 4.0.159-kontrakt, men fandt en `parts_by_id`-scopefejl ved start af flertrinsgaten.
- [x] 4.0.161 rettede scopefejlen og regressionstestede collection-routing pr. del. Privat #2146 bestod hele kæden: 774 serier, 1.526 tilgængelige familier med præcis to native trin og 9.156 komplette komponentbeviser; ingen råværdier, fallback, interpolation eller mutation.
- [x] 4.0.162 tilføjede national state-/historikisolation. Privat #2152 verificerede 770 unikke `shadow-v2`-historikker med mindst to samples, nul parent-/krydslæsning, slettet replay og nul scorepåvirkning; fire WAM-only dele forbliver eksplicit uden state.
- [ ] 4.0.163 tilføjede lokal native HARMONIE-vindgate. #2157 ramte parserens standardtidsbudget efter 16 minutter; 4.0.164 retter kun det private tidsbudget til 3.000 sekunder og afventer nyt CI-bevis for 774/774 dele.
- [ ] 4.0.164 tilføjer privat DEC-0033-shadow-score på eksakt tidsfælles native lokale data. Den genbruger den aktive scoremotor, anvender 7-pointmarginen, sletter transient råinput og holder alle aktiverings-/mutationsflag falske. Afventer privat CI.
- [ ] #2164 beviste, at 4.0.164-tidsbudgettet når vindresultatet, men fire nærmeste HARMONIE-celler gav intet fælles U/V ved Harbo Odde. 4.0.165 udvider kun den private native kandidatsøgning til 32 og validerer fortsat samme celle/afstand. Afventer privat CI.
- [ ] #2167 viste, at global 32-cellesøgning ikke skalerer. 4.0.166 genindfører fire-celle-first og kører 32-celle-retry kun for faktisk manglende dele. Afventer privat CI.
- [x] Lokal RDKS, kystgeometri-v2, workflowkontrakt, releaseversion og releasegate består. Hele validate-rækken består bortset fra den kendte Windows/Linux-`rsync`-test, som skal bevises i CI.
- [ ] National topologi, ravstrandfravalg, lokal opdeling, navne og 774 punktpar er målt; ni punktpar samt DMI/state/score/UI/admin og aktivering er endnu ikke færdige.
- [x] Krav om ravstrandlinjer, fjordeksklusion, spring over havne/åer, navnekorrektion og fortsat fuld adminredigering er låst i DEC-0032.
- [x] Eksisterende multi-ankerfunktion er auditeret: flere navngivne retninger findes allerede i admin og scoreforklaring, men almindelig vejrpipeline leverer ikke endnu en selvstændig komponentserie pr. anker.
- [x] Høfder og andre mulige ravfælder er afgrænset som score-neutral registrering frem til særskilt RavScore-forskning og godkendelse.
- [x] Piloten er låst som parallel og ikke-destruktiv; `data/zones.geojson` og centrale adminoverrides er ikke ændret.
- [x] GeoDanmark `Kyst`, EPSG:25832, entitets-WFS, API-key/OAuth-adgang og CC BY 4.0 er verificeret i `docs/research/COASTAL_GEOMETRY_V2_SOURCE_AUDIT.md`.
- [x] V2-arbejdsskema, gratis-kildekontrakt, migrationsklasser og read-only baselineaudit er implementeret uden produktionsintegration.
- [x] Baselineaudit: 209 aktive repositoryzoner, 0 gemte multi-ankerzoner, 116 flaggede kystlinjer og 157 overlap over 0,01 km². Central runtime har senest 208 zoner, så pilotinput skal hydreres før generering.
- [x] Offentlig readback er sammenholdt med repositoryet: `DK-B02-14` er slettet centralt, `DK-B10-05` er omdøbt, og 18 zoner har centralt propagerede multi-ankre. Evidensen ligger i `data/diagnostics/coastal-geometry-v2-live-comparison.json`.
- [x] Autoritativ navneaudit samt private, revisionsbare fjord-/havn-/åpolitikker er implementeret på den centralt effektive pilotbestand.
- [x] Tre pilotmiljøer og nul-tolerancekriterier er låst i `data/geometry-v2/pilot-areas.json`: Blåvand/Rømø, Limfjorden og Lolland/Falster.
- [x] `DATAFORDELER_API_KEY` er oprettet som repository secret, og lokalt workflowjob/script henter kun små private pilotudsnit efter central adminhydrering. Secret værdi, rå arbejdsmappe og v2-data udelukkes fra Pages.
- [x] Pilot #1928 bekræftede secret-injektion, central hydrering, maskering og fuld isolation fra build/deploy; den stoppede sikkert ved første lagopslag.
- [x] #1931 hentede `Kyst_current` og seks supplerende `_current`-lag for alle tre pilotområder uden secretlæk eller produktionsjob.
- [x] #1936 verificerede pagination og privat råartifact: 21/21 lag/område-udtræk er komplette, seks er flersidede, og største udtræk har 72.870 features.
- [x] 4.0.130 genererer privat source-QA og oversigtskort direkte fra centralt effektive pilotzoner og komplette rålag; output ændrer ikke produktion.
- [x] Hver pilotzone klassificeres, og kun geometrisk støttede kildestykker samles til private reviewforslag; ingen blind snapping eller national aktivering.
- [x] #1974 verificerede gratis ortofoto-WMTS-fetch, 108 tiles, tre private Blåvand-overlays, fail-closed credentialhåndtering og skipped build/Pages.
- [x] Visuelt review er gennemført: nord og sydøst passer overordnet; hukudsnittet viser en uacceptabel indadgående sandtange-/laguneløkke.
- [x] Hukløkken er rettet privat og genkontrolleret mod officielt ortofoto i #1982.
- [x] 4.0.136-kandidaten registrerer hårnålen maskinelt (430,0/144,3 m; ratio 2,98), bevarer søværts apex og fjerner 242,0 m indadgående detur med syntetisk regression.
- [x] #1982 verificerede det nye officielle ortofotooverlay, 108 tiles, tre kontroludsnit, nul credentialmatch og alle aktiverings-/vejr-/scoreflag falske. Den relevante grønne linje springer den indre omvej over og ligger på sand/landsiden; ortofotogaten er bestået privat.
- [x] #1981 produktionsverificerede 4.0.136 med frisk data, fuld Linux-validate, release-gate, Pages-artifact og deploy.
- [x] 4.0.137-kandidaten validerer begge private vandpunkter direkte i aktuelle native `wam_nsb`- og `dkss_nsbs`-GRIB-felter med produktionens nearest-cell-logik og fælles U/V-gridregel.
- [x] Privat pilot #1987 og artifactreview beviser gyldige WAM-/DKSS-celler for begge punkter, fælles current-U/V på 17 m-laget og forskellige nord/sydøst-celler for alle seks komponentfelter. Ingen sampling eller aktivering er sket.
- [x] #1986 produktionsverificerede 4.0.137 med frisk data, fuld Linux-validate, release-gate, Pages-artifact og deploy.
- [x] 4.0.138 låser stabil partserieidentitet, eget punkt/grid/proveniens, separat historiknøgle og forbud mod krydsmerge, fallback, part-score, state, UI, public projection, admin-write og aktivering.
- [x] Privat pilot #1992 og artifactreview verificerer præcis to isolerede delserier, unikke serie-/historik-ID'er, korrekte gridreferencer, ingen credentialbærende URL og alle aktiverings-/mutationsflag falske.
- [x] #1991 produktionsverificerede 4.0.138 med central adminhydrering, frisk data, fuld Linux-validate, release-gate, Pages-artifact og deploy.
- [x] 4.0.139 danner private metadata-/hashbaserede flertidsserier via produktionens native DMI-parser og kræver mindst to fælles komplette trin med fuld komponentproveniens og korrekt current-U/V-parring.
- [x] Privat pilot #1997 verificerede fire fælles komplette tider pr. del, 48 fulde DMI-komponentposter, forskellige delceller, korrekt U/V-parring, nul interpolation/fallback og ingen credential- eller råværdilæk.
- [x] #1996 produktionsverificerede 4.0.139 med central adminsync, frisk data, fuld Linux-validate, release-gate, Pages-artifact og deploy.
- [x] 4.0.140 replay-validerer hver del med egen historiknøgle gennem den faktiske `shadow-v2`-funktion og afviser parent-genbrug, krydslæsning og scorepåvirkning. Midlertidigt råinput uploades ikke og slettes.
- [x] Privat pilot #2004 verificerede to unikke historiknøgler, nul parent-genbrug/krydslæsning, verificerede samples, nul scorepåvirkning, slettet transient input og intet rå-/credentiallæk.
- [x] #2003 produktionsverificerede 4.0.140 med central adminsync, frisk data, fuld Linux-validate, release-gate, Pages-artifact og deploy.
- [x] 4.0.141-kandidaten implementerer et privat HTML/JSON-review, som bevarer parent-zonens eksisterende RavScore-farvelinje og forbyder part-scorefarve, delrangering, “bedste del”, klik og tooltip.
- [x] Privat pilot #2009 verificerede én aktiv parent, bevaret RavScore-præsentation, to helt score-neutrale ikke-interaktive dele, nul rå-/credentiallæk og alle mutations-/aktiveringsflag falske.
- [x] #2008 produktionsverificerede 4.0.141 med central adminsync, Supabase-roundtrip, frisk data, fuld Linux-validate, release-gate, Pages-artifact og deploy.
- [ ] Næste gate er privat central admin-roundtrip/rollback; ingen geometri-, sampling-, state-, admin-, UI- eller scoreaktivering før eksplicit ejer-go/no-go.
- [x] 4.0.142-kandidaten implementerer en isoleret temp-document create/read/update/delete-gate med verificeret rollback og uændret hash/version for de to beskyttede runtime-admin-dokumenter.
- [x] Privat pilot #2014 verificerede temp create/read/update/delete, fravær efter rollback og identiske digests/versioner for begge beskyttede runtime-dokumenter.
- [x] #2013 produktionsverificerede 4.0.142 med central adminsync, Supabase-roundtrip, frisk data, fuld Linux-validate, release-gate, Pages-artifact og deploy.
- [ ] Kun eksplicit ejer-go/no-go er tilbage før nogen Blåvand-aktivering; den må ikke udledes af “fortsæt”.
- [x] #1976 produktionsverificerede 4.0.135 efter dependency-isolationshotfix med frisk data, fuld validate, release-gate, Pages-artifact og deploy.

## 4.0.126 – sikker gratis GeoDanmark-pilot, afventer CI
- [x] Gratis kildekontrakt, v2-schema, migrationslogik, audit og tre pilotområder er dokumenteret og regressionstestet.
- [x] `DATAFORDELER_API_KEY` er koblet til et isoleret manuelt workflowjob og kan ikke påvirke Pages-deploy eller RavScore.
- [x] Workflowet hydrerer central admin-sandhed før fetch og udelukker v2-data, arbejdsmappe og dependencies fra offentlig artifact.
- [ ] En konkret manuel Actions-run skal bekræfte secret-injektion, WFS capabilities, `Kyst`-featurehentning, frivillige supplerende lag og privat artifact uden secretlæk.
- [ ] Mål DMI-forskelle pr. lokal kystdel og design provenance/merge uden at ændre RavScore.
- [ ] Fremlæg pilotresultat og undtagelsesliste til særskilt go/no-go før national omskrivning.

## 4.0.127 – GeoDanmark entity-lag hotfix
- [x] #1928 dokumenterede, at adgang og secret virker, mens den første parser fejlagtigt søgte efter det ældre eksakte navn `Kyst`.
- [x] Capabilities-parseren læser nu kun `FeatureType/Name` og vælger deterministisk det aktuelle entity-lag med `_current`; `_hist` og beslægtede navne accepteres ikke.
- [x] Ved ukendt lagkontrakt gemmes en secret-fri capabilitiesrapport i det private artifact, så næste fejl kan diagnosticeres uden credential eller credential-bærende URL.
- [ ] Genkør CI-piloten og verificér konkrete featureudtræk før forslag genereres.

## 4.0.128 – komplet pagineret pilotartifact
- [x] #1931 verificerede adgang til 140 lag og faktiske featureudtræk fra `kyst_current`, `havn_current`, `vandloebskant_current`, `vandloebsmidte_current`, `hoefde_current`, `sandklit_current` og `skraent_current` i alle tre områder.
- [x] Kystudtrækkene gav 893, 1.392 og 1.325 features; flere maskelag ramte præcis serverloftet på 10.000 og kunne derfor ikke kaldes komplette.
- [x] 4.0.128 paginerer med `startIndex`, rapporterer source match/page count/completeness og stopper sikkert ved 250.000 features pr. lag/område.
- [x] GitHub artifact-upload inkluderer nu den skjulte private arbejdsmappe eksplicit; Pages ekskluderer den fortsat.
- [x] #1936 beviste komplette sider og gjorde 21 rå GeoJSON-filer (ca. 341 MB) tilgængelige i det private artifact.

## 4.0.129 – separat concurrency-kø til geometri-pilot
- [x] #1933 dokumenterede, at en nyere 15-minutters vejropdatering kan erstatte en ventende pilot, når begge deler samme concurrency-gruppe.
- [x] Pilotdispatch bruger nu `ravradar-geometry-v2-pilot`, mens vejrproduktion fortsat bruger `ravradar-weather-production`.
- [x] En ny pilot kan kun erstatte en ældre pilot; rutinevejret kan ikke længere annullere den.
- [x] #1936 kørte samtidig med den separate vejrproduktionskø og verificerede komplethed/artifact uden indbyrdes annullering.
- [ ] Byg næste read-only analysetrin på den centralt hydrerede zonebestand og de komplette råfiler; ingen produktionsaktivering.

## 4.0.130 – privat GeoDanmark source-QA og kort
- [x] Den centralt hydrerede delmængde af de ni pilotzoner gemmes kun i det private arbejdsartifact med hash og antal.
- [x] Eksisterende kystlinjer måles mod nærliggende GeoDanmark-kyst med længde, fragmentering, 250-meters dækning og stikprøveafstande.
- [x] Havne, vandløbsender, høfder, klit og skrænt registreres som score-neutral reviewkontekst; de fortolkes ikke automatisk som ravstrand eller åmunding.
- [x] Tre private PNG-kort viser nuværende kyst, GeoDanmark-kilde, zoner og centrale ankre.
- [x] Lokal analyse flaggede 9/9 zoner: Rømø har en stor forskydning, Limfjorden har manuelle konflikter/modstående bredder, og Lolland/Falster kræver egentlig zonepartition frem for simpel koordinatjustering.
- [x] #1941 verificerede den nye kæde, privat artifact, score-/produktionsisolation og uændret Pages.

## 4.0.131 – kystdels-, navne- og migrationstriage
- [x] 702 fysiske kildestykker på tværs af ni zoner får privat reviewklasse ud fra afstand til eksisterende kyst; ingen må aktiveres automatisk.
- [x] Det offentlige, nøglefri `steder`-API er verificeret som adgang til Danmarks officielle stednavneregister og forespørges kun i afgrænsede pilotpolygoner.
- [x] Navnetokens, autoritative kandidater, afstande og manglende match gemmes uden automatisk omdøbning.
- [x] Lokal migrationstriage: Blåvand geometriopretning; Rømø og Thisted semantisk flyttereview; Fur, Aalborg og fire Lolland/Falster-zoner grænse-/partitionsreview.
- [x] #1948 verificerede private outputs, netværksadgang, artifact og fortsat isolation; #1947 verificerede fuld produktionsvalidering og release-gate.

## 4.0.132 – kontrollerede private kystdelsforslag
- [x] Kun `existing-alignment-reference` og `partial-alignment-review` samles; alle semantiske/grænsemæssige stykker udelades fra forslag.
- [x] Havne udskæres med et dokumenteret bufferbånd. Kun synlige, ikke-rørlagte vandløbsmidter, der faktisk når kystkandidaten og fortsætter ind i land, danner deduplikerede mundingsmasker.
- [x] Fjordpolitikken er maskinlæsbar pr. pilotmiljø: ydre vestkyst, eksplicit inkluderet Limfjord og ekskluderede indre fjorde/nor ved Lolland-Falster.
- [x] Lokalt genkørt på det private #1948-artifact: 84 multipart-reviewforslag på ni zoner; Rømø stoppede sikkert med nul forslag.
- [x] Forslag, masker og provenance gemmes kun privat, vises orange på pilotkort og har eksplicit falsk aktivering, vejrsampling, adminændring og scoreændring.
- [x] #1952 verificerede antal, private kort, artifact og isolation; #1951 verificerede fuld Linux-validering, release-gate og Pages.

## 4.0.133 – officielle indre-vandmasker og geografisk reviewgate
- [x] Den officielle nøglefri stednavnekilde hentes som GeoJSON og leverer Farvand-polygoner; kun undertyperne `fjord` og `nor` udelukkes uden for Limfjorden.
- [x] Seks officielle polygoner blev fundet i Lolland/Falster-piloten. De relevante zoner rammes revisionsbart af Nysted Nor samt Nakskov/Sakskøbing Fjord og Søndernor; Limfjorden har bevidst ingen sådan maske.
- [x] Havne-, å- og indre-vandmaskernes faktiske private geometri gemmes med forslagene og vises rosa.
- [x] Ni højopløselige private zonekort viser nuværende linje, fysisk kilde, forslag, fravalg og officielle stednavne.
- [x] Maskinlæsbart geografisk review dækker alle ni zoner: én detailkandidat, to semantiske flytninger og seks grænse-/partitionsredesign.
- [x] Kun Blåvand må gå videre til privat detailopretning. Ingen zone er produktionsgodkendt, og ingen af de otte strukturelt fejlplacerede zoner må få DMI-punkter endnu.
- [x] #1959 verificerede 72 dele, seks officielle masker, ni zonekort, reviewgaten og fortsat privat isolation; #1958 verificerede fuld produktionskæde.

## 4.0.134 – privat Blåvand-detailforslag
- [x] Den sammenhængende fysiske GeoDanmark-kyst splittes ved det officielle Blåvands Huk, ikke ved nærmeste anker alene.
- [x] To navngivne dele dannes: `Nord for Blåvands Huk` og `Sydøst for Blåvands Huk mod Hvidbjerg Strand`.
- [x] Hvert fysisk fragment forskydes præcis 15 meter mod den side, som det tilhørende centralt verificerede land-/vandanker dokumenterer som land.
- [x] Hver del får et privat land-/vandpunktpar og lokal pålandsretning, men vejrsampling og DMI-gridbrug er eksplicit deaktiveret.
- [x] Ni GeoDanmark-høfter registreres separat som score-neutrale morfologihypoteser og indgår ikke i kystlinjen eller RavScore.
- [x] Et særskilt detailkort viser fysisk kyst, landforskudt linje, punktpar og høfter; alle produktions-, admin-, vejr-, score- og aktiveringsflag er falske.
- [x] #1967 verificerede 208-zone central hydrering, 2 dele, 15 features, 9 høfter, detailkort og alle mutations-/vejr-/scoreflag falske. #1965 viste samtidig, at manglende central ankersandhed stopper detailtrinnet sikkert.
- [x] Ortofotokontrol er gennemført; den private DMI-gridkontrol er implementeret i 4.0.137-kandidaten.
- [x] #1987 gennemførte CI-/artifactreview af DMI-gridrapporten uden credential-URL eller mutationsflag.
- [ ] Design og valider admin-roundtrip samt hele vejr-/proveniens-/score-/UI-kæden før nogen produktionsbeslutning.

## 4.0.125 – fuld timeproveniens fra STAC/GRIB
- [x] Collection, model-run og native gyldighedstid lagres pr. rå komponenttime i bulkcachen.
- [x] Lead time, prognosealder, native/interpoleret-status og anvendte native tidspunkter føres til beskyttede `conditions.json`.
- [x] Bølge-, strøm-, vandstands- og vandtemperaturproveniens overlever den endelige komponentmerge; vandstandskontinuitet bevarer original DMI-identitet.
- [x] Regressionstest afviser interpolation på tværs af modelkørsler.
- [x] Audit schema 4 måler også temporal status og native kildetider.
- [ ] Frisk produktion skal genopbygge parsergeneration 14 og bevise komplette proveniensfelter uden dækningstilbagegang.

## 4.0.124 – komponentvis interval- og proveniensaudit
- [x] De fem DKSS-vindhalehuller er lukket i produktion; de sidste centrale rettelser for Nibe/Sebbersund og Falster/Nysted propagerede og gav 36 direkte DKSS-haletidspunkter.
- [x] Seneste målte public dataset havde 208/208 zoner med 118 vindtimer.
- [x] Implementeringsauditten dækker nu vind, bølger, strøm, vandstand og vandtemperatur med DMI-/fallback-/missing-intervaller pr. zone.
- [x] Manglende collection, model-run, lead time og prognosealder på DMI-timer rapporteres maskinlæsbart.
- [x] #1862 gennemførte fulde gates og deploy; et frisk live-snapshot med samme commit gav 208/208 zoner og 118 vindtimer samt 0 auditfejl.
- [x] Den timevise pipeline er implementeret lokalt i 4.0.125 uden at udlede metadata, som råcachen ikke faktisk har gemt.

## 4.0.123 – marine landmasker og fælles U/V-søgning
- [x] #1851 og #1852 er auditeret på faktisk produktionscache: fem stabile DKSS-vindhalehuller, heraf fire i Limfjorden og ét ved Falster/Nysted.
- [x] Den centralt gemte og deployede admin-geometri er sammenholdt med bulkcache og fulde conditions; den anvendes faktisk af kørslen.
- [x] Kandidatvinduet er udvidet til 128 marine gridceller i Limfjorden og 64 ved øvrige kyster uden at ændre de fysiske afstandsgrænser.
- [x] Strøm og DKSS-vindhale får særskilt U/V-pardiagnostik.
- [ ] Første produktion på 4.0.123 skal vise, om én eller flere af de fem zoner får direkte DKSS-U/V; fallbackdækning er fortsat komplet uafhængigt heraf.

## 4.0.122 – produktionsverificeret vindhale
- [x] #1845 gennemførte frisk DMI-kørsel, fuld projektvalidering, release-gate, artifact og Pages-deploy som `success`.
- [x] Det offentlige datasæt har 208/208 zoner med vind og 118 sammenhængende timer i alle zoner.
- [ ] Direkte DKSS-gridproveniens versus fallback skal fortsat dokumenteres særskilt for de fem tidligere problemzoner.

## 4.0.121 – workflowoprydning
- [x] Aktiv kode, tests, release- og recoverydokumentation er kontrolleret: ingen procedure afhænger af `schedule-test.yml` eller `pages-microtest.yml`.
- [x] Begge historiske diagnostikworkflows er fjernet; `update-and-deploy.yml` er bevaret som eneste repository-ejede produktionsworkflow.
- [x] Workflow-kontrakttesten fejler, hvis ekstra YAML-workflows genindføres uden en ny bevidst beslutning.
- [x] `pages-build-deployment` er dokumenteret som GitHub-administreret Pages-mekanisme, ikke RavRadar-workflow.

## 4.0.120 – fallbackhale efter vandstandsrouting
- [x] #1833/#1835 beviste NSBS/LF-rotation og løftede offentlig vind til 208/208 zoner med data og 203/208 mindst 96 timer.
- [x] Fem zoner mangler et fælles gyldigt DKSS U/V-gitterpunkt; de udfyldes ikke kunstigt.
- [x] Vandstandsrouting bevarer den blandede offentlige komponentserie og opdaterer DMI-cachen separat.
- [x] Open-Meteo bruger 120 fremtidige timer i stedet for fem kalenderdage.
- [ ] Frisk CI/produktion skal vise 208/208 zoner med 118–119 timers vind samt fulde gates og deploy.

## 4.0.76
- Strømpile placeres ved dokumenterede DMI-marinegitterpunkter i stedet for kunstige offsets.
- Rå current-u/current-v bevares og valideres mod hastighed, retning og pil.
- 197/209 zoner har direkte DMI-gitterproveniens i den medfølgende cache; 12 zoner kræver fortsat kildespecifik opfølgning.
- DMI-pile uden dokumenteret punkt skjules.

## 4.0.73
- Ekspertreview viser fuld Supabase-fejl og understøtter eksisterende skemaer.
- Stationshistorik bevares ved hydrering og observationsskip.
- Helhedstesten skelner mellem funktionsfejl og performanceadvarsel og profilerer opstartstrin.

## 4.0.71
- Samlet sitetest viser nu levende fremdrift, slutrapport og fatal fejl direkte i admin.
- Tavs afslutning kan ikke længere fortolkes som bestået.
- Seneste rapport bevares lokalt efter genindlæsning.

## 4.0.70
- Samlet funktionstest dækker nu hele sitets centrale brugerrejser, data, deploy og performance.
- Testresultat vises pr. område og kan downloades.
- Live Supabase-skrivninger er fortsat mærkede og ryddes op automatisk.

Status er baseret på importerede chats, aktuelle RDKS-poster og projektets kode/teststruktur. Den er en styringsoversigt, ikke en påstand om ekstern driftsverifikation.

| Område | Status | Næste væsentlige arbejde |
|---|---|---|
| DMI-bulkprognoser | Implementeret, overvåges | Fortsat audit af horisont og marine randzoner |
| DMI-first vindhale | Implementeret lokalt, afventer frisk produktion | Bevis HARMONIE→DKSS-kildeskift og 118–119 timers dækning |
| Sammenhængende forecastserier | Implementeret | Regressionstest mod kildeskift og spring |
| Officielt zoneregister | Implementeret | Fortsat geografisk audit |
| Retningskonventioner | Implementeret og rådata-verificeret | Opfølgning på 12 zoner uden direkte DMI-gitterproveniens |
| DMI-stationsregister | Delvist implementeret | Officiel registerkontrol og fuld datalivscyklus |
| Observationslivscyklus | Rettet i 4.0.99, kræver produktionsverifikation | Bekræft OceanObs-resultat og adminstatus efter Update weather and deploy |
| Prognose-/cachestatus pr. station | Rettet i 4.0.99, kræver produktionsverifikation | Bekræft cacheudløb og alarmer på reelle stationsmålinger |
| Automatisk stationsrouting | Implementeret, overvåges | Bedre-station-notifikationer uden automatisk omskiftning |
| Adminoverride | Implementeret og runtime-rettet i 4.0.96 | Overvåg central readback og produktionens anvendelse af valgte stationer |
| Kystlinjeeditor | Delvist implementeret | Mobil regressionstest af kurver, deaktivering og lagring |
| Regelbygger | Delvist implementeret | Fuld brugertest, geografiske grupper og konfliktforklaring |
| Supabase/central adminlagring | Implementeret med samlet funktionstest | Kør produktionstesten ved releases og følg fejlrapporten |
| RavScore/debug | Delvist implementeret | Komplet forklaringskæde og nabozoneaudit |
| Ekspertreview og brugerfeedback | Implementeret med central CRUD-test | Faglig behandling af indsendte forslag |
| RDKS | Implementeret i første fulde historikversion | Automatisk samtaledelta ved alle kommende releases |
| Levende håndbog | Sprogligt revideret og markant udbygget | Fortsat faglig ekspertvalidering og konkrete forbedringer |
| Release Governance | **Produktionsverificeret i #1772** | Alle reelle produktionsbuilds kræver begge fulde gates; overvåg kontrakten ved fremtidige workflowændringer |
| ravradar.dk-beredskab | Planlagt/delvist | DNS, Supabase redirects, CNAME og produktionstest før aktivering |
| Faglig rav- og sedimenthåndbog | Markant udbygget | Ekstern ekspertreview og lokal kalibrering af tærskler |

## 4.0.74
- [x] Offentlig `public-conditions.json` genereres atomisk.
- [x] Offentlig side bruger ikke fuld `conditions.json`.
- [x] Scoreparitet verificeres for 209 zoner, begge jagtformer og prognosetimer.
- [x] Live-data undtages fra service-worker-cache.
- [x] Mobilkort, kontoikon, GPS-flow, knapper og farveforklaring er implementeret.
- [x] Håndbog og RDKS er opdateret.
- [ ] Produktionsmålinger efter deployment skal bekræfte den faktiske hastighedsgevinst på mobil og desktop.

## 4.0.77
- [x] Oversigt renderes ved første åbning.
- [x] Admin-ready-markør styrer aktiv fanetest.
- [x] Testdialoger opsamles uden popup.
- [x] Runtimebaseret versionskontrol.

## 4.0.78
- [x] Null, tomme værdier og manglende strømkomponenter kan ikke blive til falsk 0/0.
- [x] Verificeret proveniens indeholder gitterpunkt, metode og kildetider.
- [x] Ikke-verificerbare timer bevarer vist strøm uden falske råkomponenter.
- [x] Audit og Release Gate skelner mellem reel fejl og manglende dokumentation.

## 4.0.79
- [x] Rangliste og 5-dages prognose bruger én indlæst adaptiv model.
- [x] Aktuelle scores caches pr. jagtform og zone.
- [x] Prognosedage grupperes én gang pr. zone.
- [x] Skjult dobbelt rendering ved opstart er fjernet.
- [x] Sitetestens dashboardkontrol følger den faktiske UI-livscyklus.
- [ ] Produktionstesten efter deployment skal bekræfte hurtig rendering på brugerens enheder.

## 4.0.80
- Implementeret: Kritisk opstartsrettelse, så dagens rangliste og 5-dages prognose ikke længere blokeres af vind- og strømpile.
- Implementeret: Pile installeres efter centrale prognosevisninger og bygges samlet på et afkoblet Leaflet-lag.
- Implementeret: Jagtform vælges før første scorecache.

## 4.0.83
- [x] Dagens rangliste får et eksplicit browser-paint før 5-dages landsberegningen.
- [x] 5-dages prognosen beregnes i små, afbrydelige bidder med synlig fremdrift.
- [x] Gammel prognoseberegning annulleres ved skift af jagtform.
- [x] Regressionstest beskytter mod genindførelse af en synkron, blokerende prognoseberegning.
- [ ] Produktionssitetest efter deployment skal bekræfte faktisk rendering på brugerens browser.

### 4.0.84
- [x] Verificeret DMI u/v er autoritativ kilde for strømretning og -hastighed efter hydrering.
- [x] Proveniensberigelse genberegner viste strømfelter fra u/v.
- [x] Regressionstest for vektorkonsistens tilføjet.

## 4.0.85 – IMPLEMENTERET
- Kanonisk lagret DMI-u/v-vektor er indført i proveniensberigelsen.
- Hastighed og retning genberegnes fra de lagrede komponenter.
- Videnskabelig strømaudit består på 23.049 verificerede prognosetimer uden lempelse af tolerancer.
- Regressionstest beskytter mod fremtidig forskel mellem lagret vektor og afledte scorefelter.

## 4.0.86 – IMPLEMENTERET
- Synlig reviewkø og komplet ejerflow i aktiv admin.
- Synlig håndtering af lokale håndbogsnødkladder.
- Reelt dokumentationscenter med RDKS-kernedokumenter.
- Tydelig lokal afgrænsning af model-forslag.
- Sitetest skelner 404, timeout, netværksfejl og HTTP-fejl.
- Performanceprofil opdelt i netværk/data, beregning og rendering.
- Reachability-test beskytter centrale adminfunktioner.
- [x] Roadmappets P1-driftspunkter er efterkontrolleret mod aktuel kode: lagringskontrol, central persistensprøve, synlig reviewkø, lokale nødkladder og soft-delete/systemtestrydning er implementeret. Kun næste billingperiodes egressmåling står åben.

## 4.0.87 – IMPLEMENTERET
- Deterministisk, efterstillet installation af vind- og strømpile med ready/failed-status og retry ved reel fejl.
- Sitetest kontrollerer faktiske vind- og verificerede strømpile.
- Admin-kort ryddes ved faneskift, og forsinket initialisering kontrollerer containerens livscyklus.
- Hele den aktive browser-importgraf versionslukkes til releaseversionen.
- Rangliste, første paint og ikke-blokerende 5-dagesberegning er bevaret.

## 4.0.88 – IMPLEMENTERET
- Historisk koordinatfallback i pilelaget er rettet til én ensartet `L.LatLng`-type.
- Fejl isoleres pr. zone, så én mangelfuld datapost ikke fjerner alle pile.
- Zonestreger og grænsetikker redrawes automatisk efter zoomanimation.
- Regressionstest beskytter pilefallback og zoomopdatering.

## 4.0.89 – zoneændringer og reviewoprydning
Status: Implementeret og lokalt valideret.

- Slet valgt kystdel: centralt gemt og readback-verificeret.
- Slet hele zone: dobbelt bekræftelse, central tombstone og automatisk anvendelse i deployment.
- Retnings- og ankerændringer anvendes på den autoritative zonefil før runtime-data bygges.
- Reviewkø: individuel soft-delete og samlet oprydning af systemtestposter.
- Ny integrationstest beviser både retningsoverførsel og zonesletning i buildkæden.

## 4.0.90 – IMPLEMENTERET
- Kystlinjesøgning skifter nu både aktiv zone, kortudsnit og redigeringspunkter.
- Zoner kan omdøbes i kystlinjeeditoren uden at ændre zone-ID.
- Én Gem ændringer-knap erstatter kladde- og eksportarbejdsgangen i normal admin.
- Flyt kort og Præcis redigering er bevaret uden funktionsændring.
- Kun nye eksplicit publicerede ændringer anvendes i deployment; gamle kladder ignoreres.
- Central readback og buildtest beskytter navn/geometri-forplantningen.

## 4.0.93 – IMPLEMENTERET
- Alle testantagelser om fast zoneantal er erstattet af integritetskontrol mod det historiske ID-grundlag og eksplicitte administratorsletninger.
- En fuld 180° vending af land-/havpunkter og pålandsretning accepteres, når geometrien er konsistent.
- Geometri-rollback beskytter snapshots uden at låse admin-redigerbare navne, kystlinjer, punkter eller retninger.
- Rollbackværktøjet skifter kun polygongeometri og bevarer slettede zoner og aktuelle adminfelter.
- En ny samlet admin-zonekontrakttest dækker omdøbning, kystlinjeændring, 180° vending, zonesletning og beskyttelse mod ikke-godkendte kladder.

## 4.0.94 – IMPLEMENTERET
- [x] Aktive centrale administratorregler publiceres sanitiseret til offentlig runtime.
- [x] Offentlig score er uafhængig af den enkelte browsers lokale administratorlager.
- [x] Regelkladder og inaktive regler kan ikke påvirke produktionen.
- [x] Rå `data/admin/`-filer udelukkes fra Pages-artifactet.
- [x] Integrations- og release-gate beskytter hele kæden.

## 4.0.96 – IMPLEMENTERET
- Vandstandsstationsfanen bruger ikke længere det slettede `stationDeliveryLabel`-kald, som stoppede kortinitialisering og adminfanetest.
- Beskyttet stationsregister og routing-audit hydreres fra Supabase før vejropdatering.
- Manglende stationslivscyklus behandles som ukendt, ikke som dokumenteret utilgængelig.
- Upload til Supabase fletter livscyklusfelter ikke-destruktivt, så nyere men informationsfattigere filer ikke sletter kendt historik.
- Kortets eksisterende farvekontrakt er bevaret: grøn automatisk, rød administrator, lilla begge, grå udfaset, orange øvrig.
- DMI-prognoser, vandstandsværdier, RavScore og offentlig runtime er ikke ændret.

## 4.0.100
- [x] Målestationer og prognosepunkter klassificeres særskilt.
- [x] Tidewaterstations-registeret indlæses som prognosepunkter.
- [x] Begge kildetyper får DKSS-femdøgnsserier via STAC/GRIB ved deres koordinater.
- [x] Adminoverride og automatisk routing bruger samme produktionskæde.
- [x] Afstandsinterpoleret kildeserie forplantes til aktuel vandstand, RavScore, ranglister, femdøgnsprognose og time-for-time-vandstandstabel.
- [ ] Produktionens første fulde bulk-kørsel skal verificere Hals-kildernes faktiske horisont og markering.

## 4.0.101 – IMPLEMENTERET
- Automatisk vandstandskildevalg i admin genberegnes fra det aktuelle, indlæste kilderegister med samme `recommendWaterStationBracket`-funktion som produktionsrouting.
- Et hydreret, men ældre eller tomt `water-station-routing-audit` kan ikke længere overstyre en kilde, som nu er dokumenteret brugbar.
- To kompatible kilder bevarer automatisk afstandsvægtet interpolation; én kompatibel kilde anvendes med 100 % vægt frem for et tomt valg.
- Administratoroverride, kildestatus, DKSS-femdøgnsserier, RavScore, ranglister, vandstandstabeller og øvrig 4.0.100-funktionalitet er uændret.

## 4.0.102 – IMPLEMENTERET
- Vandstandskortet viser nu kun den routing, som faktisk er aktiv for den valgte zone.
- Ved aktiv automatisk routing vises valgte kilder grønt; ved aktivt administratoroverride skjules alle grønne automatiske markører, og administratorens kilder vises rødt.
- Den lilla kategori “begge valg” er fjernet, fordi den blandede et inaktivt forslag sammen med den aktive produktionsrouting.
- Samme vandstandskilde kan ikke længere stå både som primær og sekundær; dubletter samles, og én tilbageværende kilde får 100 % vægt.
- Automatisk udvælgelse, DMI-kilder, prognoseserier, interpolation, RavScore, ranglister, femdøgnsvisning og produktionsrouting er ikke ændret.


## 4.0.103 – IMPLEMENTERET, AFVENTER PRODUKTIONSBEKRÆFTELSE
- GitHub Pages-buildet udelukker `_support/` og `RavRadar-support-*.zip`, så den private supportpakke ikke kan kopieres ind i det offentlige artifact.
- Automatisk vandstandsinterpolation og administratoroverride bruger nu samme inverse vægtning efter reel geografisk haversineafstand. Kandidatvalgets kysttopologi er uændret.
- DMI-prognosepunkter opdages via den dokumenterede OceanObs-collection `tidewaterstation` (ental); det tidligere plurale 404-endpoint er fjernet.
- Kilderegisteret dokumenterer discovery-endpoint, resultat, antal og fejl. Hver vejrproduktion skriver desuden en beskyttet audit af alle målestationer og prognosepunkter med prognosestatus, horisont, gyldighed og routingberettigelse.
- En ny samlet produktionstest kontrollerer automatisk routing, adminoverride, geografiske vægte, forecastStore, zonens aktuelle vandstand og time-for-time-serie samt Pages-sikkerhed og DMI-endpointkontrakt.
- En rigtig GitHub-vejrproduktion skal stadig bekræfte det aktuelle antal DMI-prognosepunkter og deres faktiske femdøgnshorisont.

## 4.0.104 – IMPLEMENTERET, kræver produktionsverifikation
- [x] Første administratorvalg i enhver zone bindes til det centrale routingdokument.
- [x] Aktivt override vises rødt og kan gemmes ved første valg.
- [x] Manglende prognoseværdier kan ikke længere konverteres til falske 0 cm.
- [x] Tomme prognosekilder kan ikke blive routingberettigede.
- [x] Samlet regressionstest dækker override og vandstandsserie.
- [ ] Første deployment skal bekræfte UI og varierede værdier på den offentlige side.

## 4.0.105 – IMPLEMENTERET, kræver produktionsverifikation
- [x] Vandstandskilder, zoneregister og central administratorrouting indlæses i en separat prioriteret opstartskæde.
- [x] Vandstandsfanen er ikke klikbar med foreløbige eller tomme data.
- [x] Langsomme diagnose-, regel-, historik- og reviewkald kan ikke længere forsinke eller efterfølgende overskrive vandstandsroutingen.
- [x] Sitetesten åbner vandstandsfanen tidligt og måler, hvornår zonevalg, kort og administratoroverride faktisk er klar.
- [x] Eksisterende DMI-data, automatiske valg, manuel override, interpolation, vandstandsprognose, RavScore og offentlig runtime er uændret.
- [ ] Første deployment skal bekræfte, at gemte røde valg og Fjern-knappen er tilgængelige hurtigt og reagerer uden senere overskrivning.

## 4.0.106 – kvotesikker vandstandsrouting
**IMPLEMENTERET, afventer produktionsverifikation.** Store read-only admin-dokumenter fylder ikke længere localStorage, gamle store cacher ryddes, og QuotaExceededError kan ikke afbryde røde markører, Fjern eller central routinggemning.

## 4.0.107 – historisk tilstandsmodel i skyggetilstand
**IMPLEMENTERET, afventer pipeline- og produktionsverifikation.**
- [x] Udvidet 24-timers historik med vindretning, strøm, alignment og vandstand.
- [x] Akkumuleret indtransportmomentum og udtransporttryk.
- [x] Stærk energihændelses varighed/alder, mobiliserings- og nærkystpotentiale samt procesfase.
- [x] Score-neutral `shadow-v2`, som kun bruger verificerede marine DMI-prøver og ikke ændrer offentlig RavScore.
- [x] Kompakt public projection uden rå historik.
- [x] Ingen generelle strømbånd eller strømbåndsfallback.
- [x] 4.0.106 vandstationsrettelse markeret produktionsbekræftet af ejer.
- [ ] GitHub-kørsel skal opbygge rigtige historiksamples over flere kørsler.
- [ ] Sitetest skal bekræfte uændret eller acceptabel offentlig opstartstid.
- [ ] Debugkontrol skal udføres på zoner med kendte administrator-overrides af land-/havpunkter.

## 4.0.110 – marine recovery scheduler
**IMPLEMENTERET, AFVENTER PRODUKTIONSVERIFIKATION.** DKSS prioriteres før HARMONIE under manglende marinehorisont. Den videnskabelige u/v-audit er uændret.


## 4.0.112 – overgang, teststabilitet og referencezoner
- **IMPLEMENTERET:** Obligatorisk næste-chat-overlevering med aktuel sandhed, plan, beslutninger, kendte risici og første læserækkefølge.
- **IMPLEMENTERET:** Automatisk score-neutral referencezonerapport for Agger/Krik Vig, Asaa/Melholt, Als Odde/Helberskov og Blåvand/Hvidbjerg.
- **IMPLEMENTERET:** Sitetesten venter på aktivt dashboard og en synlig, klikbar samlet-test-knap.
- **FORTSAT SKYGGETILSTAND:** Historisk tilstand forklares, men påvirker ikke RavScore.
- **NÆSTE PLANTRIN:** Validér referencezonernes historiske felter over flere produktionstimer; aktivér derefter kun det glidende varigheds-/styrkebidrag for dokumenteret indadgående strøm.
- **ÅBEN DRIFT:** Workflowkøretid over cronintervallet skal profileres og optimeres separat.

## 4.0.113
- **IMPLEMENTERET:** Progressiv rå DMI GRIB-cache med separat restore/save og unik nøgle pr. kørsel.
- **IMPLEMENTERET:** Datasætbundet referencezonerapport med kompakt loglinje og streng CI-kontrol efter frisk datagenerering.
- **OVERVÅGES:** Faktisk cacheprogression, ophør af gentagen marine warmup og ny normal køretid.
- **UDSAT:** Ændring af eksternt 10-minutters croninterval, indtil nye produktionsmålinger foreligger.
- **IKKE IMPLEMENTERET:** Numerisk transportbidrag til RavScore.

## 4.0.114 – deployisolering
- **IMPLEMENTERET LOKALT:** `build-and-prepare` udfører data, validering, supportpakke og Pages-artifact.
- **IMPLEMENTERET LOKALT:** `deploy-pages` er et separat kort job med `needs`, eget environment og mindst mulige Pages-rettigheder.
- **IMPLEMENTERET LOKALT:** Fejlet deploy kan genkøres uden ny tung build.
- **IMPLEMENTERET LOKALT:** Push/tvungen release prioriteres ved at afbryde en ældre almindelig kørsel.
- **AFVENTER CI/PRODUKTION:** Første grønne deploy og efterfølgende sitetest af 4.0.114.


## 4.0.115 – IMPLEMENTERET LOKALT, CI STOPPET AF DMI-INTEGRITETSAUDIT
- [x] Historisk strøm beregnes igen efter den videnskabelige DMI-proveniensberigelse.
- [x] Ikke-verificerede strømprøver udelukkes fra transportvarighed og momentum.
- [x] Akkumuleret 24-timers transport er adskilt fra aktuelt sammenhængende regime.
- [x] Aktivt regime har egen varighed, momentum, stabilitet, sampleantal og verificeret dækningsmål.
- [x] `shadow-v2` er dokumenteret og regressionstestet som score-neutral.
- [x] Den midlertidige Pages-mikrotest er fjernet, så den ikke ved et uheld kan overskrive produktionssiden.
- [ ] Produktionslogs fra mindst tre friske timer skal stadig bruges til faglig stabilitetsvalidering før scoreaktivering. 4.0.115 nåede ikke produktion, fordi en ældre DMI U/V-gridfejl blev afsløret af release-auditen.


## 4.0.116 – IMPLEMENTERET LOKALT, AFVENTER CI/PRODUKTION
- [x] Strøm-U/V og vind-U/V vælges kun fra nærmeste fælles fysiske DMI-gitterpunkt.
- [x] DMI-strøm-U/V isoleres pr. vertikallag; samme vektor må aldrig blande dybder, og dybeste gyldige fælles lag vælges deterministisk (parser v11).
- [x] Ældre cachede U/V-par med forskellige dokumenterede gitterpunkter invalideres sikkert.
- [x] Vandstandskilder samples kun for `sea-mean-deviation` og er fjernet fra almindelige forecastdækningsmål.
- [x] Schedulerens zoneunderskud beregnes på aktive forecastzoner og ikke `SOURCE::`-hjælpepunkter.
- [x] Manglende vind/bølge/null håndteres null-sikkert i score-, regel-, best-time-, retnings- og UI-kæden; ægte nulværdier bevares.
- [x] Eksternt croninterval dokumenteret som 15 minutter.
- [x] `shadow-v2` og eksisterende morfologi forbliver score-neutrale/uændrede.
- [ ] CI skal bevise, at den strenge current spatial audit består med den nye fælles-grid-logik.
- [ ] Produktion og sitetest skal kontrollere femdøgnsfelter: reelle datagab vises som `Mangler`, og tilgængelig vind/bølge må ikke forsvinde.


## 4.0.117 – PRODUKTIONSVERIFICERET / CODEX-HANDOFF
- Schedulerens aktive-zone-nævner og `wind`-familie er implementeret.
- Geografisk DKSS-recovery er implementeret og efterfølgende kørt i produktion.
- U/V-gridintegritet er udvidet med vertikallagsisolering; parsergeneration 11 er aktiv i 4.0.117.
- Den seneste centrale adminzonegeometri blev hentet og anvendt i frisk #1750-kørsel, som gennemførte succesfuldt.
- 4.0.117 commit `6c1dece…` er derfor den dokumenterede overgangsbaseline.
- Codex AI-dokumentationspakken og CHAT-0014 er tilføjet som dokumentationslag uden ændring af RavScore.
- Åben: femdøgnshorisontens yderste `missing` for enkelte marine felter samt øvrige aktive roadmapkrav.

## Codex bootstrap-status 2026-08-07
- Aktuel `main`: `a164b6e…`, 4.0.117 handoff v2.
- #1760 deployede denne kode og den seneste synkroniserede admin-geometri, men de fulde `npm run validate`/`npm run release:gate` steps var `skipped`.
- Status må derfor ikke være "stabil baseline" endnu.
- Første Codex-implementering er workflow-gatefikset; først derefter kan næste fulde grønne run lukke stabiliseringsfasen.

## Første Codex-rettelse – releasegates
- [x] `npm run validate` og `npm run release:gate` er nu betinget alene af, at preflight beslutter at bygge frisk produktionsdata.
- [x] Billigt preflight-skip uden artifact/deploy er bevaret.
- [x] Workflow-kontrakttesten kræver begge gates før Pages-artifactet og forbyder trigger-/force-betingelser på gates.
- [x] #1772 på `292b4024…` viste central sync, frisk produktionskæde, begge fulde gates, artifact og Pages-deploy som `success` i samme run.

## Forecast-edge og schedulerbalance – 2026-08-08
- [x] #1774-supportdata er målt på alle 208 aktive zoner og gennem hele bulk/public-kæden.
- [x] Public projection bevarer manglende værdier korrekt; der er ikke fundet ny `null -> 0`-fejl.
- [x] Rodårsagen til den brede vindmangel er schedulerudsultning: 203/208 marinezoner var dækket, men fem huller holdt begge collection-pladser på DKSS.
- [x] Balanceret recovery ved mindst 95 % marinegrundlag er implementeret med én marineplads og én plads til mest underdækkede vind/bølgefamilie.
- [x] Regression dækker både bred marine-first recovery og den målte 203/208-profil.
- [x] #1778/#1779 og #1785 har bevist HARMONIE-forsøg, fulde releasegates, deploy og forbedret offentlig basiscoverage.
- [x] #1778 og #1779 beviste balanceret rækkefølge `dkss_lf,harmonie_dini_sf`, begge collections som `success`, fulde gates og deploy.
- [x] Offentlig vind steg progressivt fra 21/208 zoner i #1774 til 199/208 i #1779.
- [x] Udløbne HARMONIE-forecasttrin ældre end én time filtreres nu før download, så det begrænsede bytebudget bruges på aktuelle/fremtidige trin.
- [x] #1785 korrigerede målet: HARMONIE-samlingens native horisont er cirka 60 timer, så 96-timers vinddækning er ikke et gyldigt succeskriterium.
- [x] #1783 beviste, at udløbne HARMONIE-trin filtreres, og at aktuelle trin behandles; fulde gates og build bestod.
- [x] Nyeste, endnu ufuldstændige modelgeneration må ikke nulstille en brugbar progressiv generation. HARMONIE fastholdes ved mindst 48 resterende timer; marine samlinger fortsat ved 96.
- [x] Run-valget eksponerer valgt/nyeste generation, deres fremtidige horisont samt om et ufuldstændigt nyt run er udskudt.
- [x] #1785 beviste valg af 18Z frem for den kortere 21Z-generation samt fulde gates/deploy.
- [ ] Næste produktion skal bevise, at 48-timersreglen fastholder 18Z og bygger videre mod 24/48-timers vinddækning.

## Planlagt større forskningsopgave – RavScore og kystprocesser
- [x] Forskningsopgaven er registreret i roadmap og RDKS som P3 under DEC-0029.
- [x] Afhængigheder og stopregel er fastlagt: ingen start før forecast-/schedulerstabilisering og højere P0/P1-opgaver; ingen automatisk produktionskode eller scoreændring.
- [x] Det aktuelle forbud mod generelle strømbånd består, mens en senere forskningsrunde må revurdere den under streng evidens- og valideringspligt.
- [x] Forskningsprotokollen fastslår, at viste vindpile ikke afgrænser vindanalysen; relevant rumlig og historisk vind uden for pile-/zonepunkterne skal undersøges sammen med bølge-/strømkobling og dobbelt-tælling.
- [ ] Fase A: permanent kildekritisk forskningsgrundlag.
- [ ] Fase B: audit af faktisk RavScore-kode mekanisme for mekanisme.
- [ ] Fase C: konceptuel fysisk systemmodel før scoremodel.
- [ ] Fase D: evidensmatrix, strømstrukturkonklusion og prioriterede valideringseksperimenter.
- [ ] Eventuel implementering kræver en ny, særskilt brugerbeslutning efter forskningsleverancen.

## P1 – komplette DMI-first femdøgnskæder
- [x] Produktkravet og analyse-/stopreglen er registreret i DEC-0030 og REQ-DATA-007–010.
- [x] HARMONIEs cirka 60 timer er klassificeret som native kildehorisont, ikke som samlet produktmål.
- [x] #1788 produktionsverificerede 48-timers HARMONIE-fastholdelse, genbrug af fire assets og vækst fra fire til syv behandlede forecasttider; fulde gates og deploy bestod.
- [ ] Kortlæg eksisterende runtimekæde, faktisk horisont/runfrekvens og alle relevante DMI-alternativer pr. komponent.
- [x] Fase A er startet i `docs/research/DMI_FIRST_FIVE_DAY_SOURCE_AUDIT.md`: aktuel kodekæde, officielle DMI-horisonter, runfrekvenser, opløsninger, vilkår og foreløbige alternativer er dokumenteret.
- [x] Frisk #31849701179-audit dokumenterer 118 monotone timer i 210 zoner, komplet DMI-timeproveniens for vind/bølge/strøm/vandtemperatur og GMT/UTC i den aktive Open-Meteo-kæde.
- [ ] Den samme audit viser mange tilbage-skift mellem DMI og fallback samt fuldt tab af vandstandsidentitet efter continuity-trinnet; spor ægte datagab, cache/run-overgange og provenancebrud før design.
- [ ] Verificér faktiske WAM-/DKSS-vindfelter og overlap mod HARMONIE i friske runs; auditér samtidig Open-Meteo-modelidentitet.
- [ ] Vurder først derefter tail-fallback, overgangskvalitet, proveniens, automatiske dækningsgates samt konsekvens for RavScore og UI.
- [ ] Implementering og produktionsverifikation kræver efterfølgende dokumenteret design; ingen blind fallbackændring er godkendt.

## 4.0.119 – DKSS-vindhale, parser og scheduler
- [x] #1828 beviste `wind-tail-u-10m`, men manglende `wind-tail-v-10m`.
- [x] Lokale DKSS-id'er 33/34 er autoritative foran generiske ecCodes-navne. Parser/parameterkort er 13/4.
- [x] Schedulerrotation følger manglende komplet U/V-vindhale pr. zones DKSS-collection.
- [x] Regression reproducerer id 34-konflikten og en 208-zoners rotationsprofil.
- [x] #1831 beviste U+V i `dkss_idw`, 107 vindhalezoner ≥96 timer, fulde gates og deploy. Offentlig samlet vind: 200/208 med data, 108/208 ≥96 timer og maksimum 111,5 timer.
- [ ] De automatiske runs skal nu rotere LF/NSBS ind og måles, så de resterende geografiske huller lukkes mod produktmålet 118–119 timer.
## Supabase Free-plan-kvotekontrol
- [x] Ufiltreret 15-minutters readback af alle `admin_documents.payload` er erstattet af server-side nøglefilter; central adminhydrering forbliver før preflight.
- [x] Beskyttede pipelineuploads har SHA-256-manifest og springer uændrede payloads over.
- [x] Ny triggerkontrakt bevarer rollback for adminredigerede dokumenter, men versionskopierer ikke udskiftelige maskindiagnostikker.
- [x] Read-only størrelsesaudit og transaktionel, bounded oprydningsmigration er versionsstyret; aktuelle `admin_documents` slettes aldrig.
- [x] Central audit og migration kørt 2026-08-10: 8.647 rækker/cirka 600 MB blev fjernet, `VACUUM FULL` reducerede databasen fra 699 MB til 24 MB, 14 aktuelle dokumenter er intakte, og maskinhistorik er 0.
- [ ] Følg egress i næste billingperiode; dashboardets historiske 8,28 GB nulstilles ikke af kodeændringen.

## 4.0.199 – trinbevidst anvendelse af land-/vandevidens
- [x] Foreløbig punktbestand kan udskyde rettelser til dele, der først skabes af den senere ejerrettelsesfase.
- [x] Metadata angiver faktisk anvendte rettelser og konkrete udskudte id'er.
- [x] Slutbestanden anvender fortsat streng kontrol uden undtagelse.
- [ ] Privat national workflowkørsel skal bevise både den foreløbige udskydelse og den afsluttende fulde anvendelse.

## 4.0.200 – konsistent status efter uafhængig punktrettelse
- [x] En sikkert korrigeret række får forslagstatus, tomme gamle blokeringer og deaktiverede downstreamflag.
- [x] Foreslået/blokeret-summer genberegnes efter rettelser.
- [x] Målrettet regression flytter en syntetisk blokeret DK-B07-21-række fra 0/1 til 1/0 og består punktkontrakten.
- [x] #31798588868 passerede den foreløbige punktkontrakt, native DMI-grid, marine flertrinsserier, state, vind og shadow-score med 832 foreslåede og tre blokerede dele.
- [ ] Frisk privat national kørsel skal fortsat passere den afsluttende punktkontrakt efter ejerrettelserne; #31798588868 nåede ikke dette trin på grund af den separate reviewtæller nedenfor.

## 4.0.201 – bestandsafledt ejer-review og admin-roundtrip
- [x] #31798588868 dokumenterede en indbyrdes konsistent finaliseret foreløbig bestand på 835 dele: 828 komplette, fire delvise og tre blokerede.
- [x] Reviewgaten sammenholder nu geometri, navne, punktstatus, shadow-ID'er og alle tællinger 1:1 i stedet for at kræve det historiske 783-tal.
- [x] Admin-roundtrip læser, skriver og rapporterer reviewets faktisk validerede delantal og afviser uoverensstemmende input.
- [x] Målrettede 835/828/4/3-regressioner samt hele `test:coastal-geometry-v2` består lokalt.
- [ ] Ny privat national kørsel skal bevise review, endelige 121 punktrettelser, slut-DMI, slut-shadow-score, central roundtrip/rollback og artifacts samlet.

## 4.0.202 – robust tidsbudget til nationale native DMI-gates
- [x] #31801993662 produktionsverificerede 4.0.201 med fuld validering, releasegate, frisk DMI, Supabase og Pages.
- [x] #31802022918 bestod 27 nationale trin og reproducerede punktbestanden, men ramte standardtidsbudgettet under `dkss_lf` efter 11,1 minutter; samme gate bestod i #31798588868 på 8,5 minutter.
- [x] Foreløbig, endelig og fallback-baseret national DMI-gate har nu eksplicit `DMI_BULK_MAX_RUNTIME_SECONDS: 3000`, som allerede bruges af den nationale vindgate.
- [x] Workflowregressionen kræver budgettet på alle tre DMI-gates uden at ændre datakrav eller offentlig runtime.
- [ ] Ny privat national kørsel skal fortsat bevise hele kæden gennem review, slutpunkter, slut-DMI, shadow-score, roundtrip/rollback og artifacts.

## 4.0.203 – eksakt kandidatbundet land-/vandevidens

- [x] #31804967576 beviste, at 3.000-sekundersbudgettet virker, og nåede gennem første DMI, vejridentitet, flertrinsserier, state, vind, shadow-score, review og dubletaudit.
- [x] Fejlen efter review er dokumenteret som bestandsdrift: det gamle 121-rettelsesbevis var lavet til 673 aktive dele og kunne ikke anvendes sikkert på de private 835-/652-delsbestande.
- [x] Foreløbig, endelig og fallback-kandidat har nu hver sit eksakte delantal og SHA-256-fingeraftryk af ukorrigerede punktpar.
- [x] Tvetydige dele blokeres uden aktive punkter. 4.0.203's foreløbige optælling blev efterfølgende afvist som ikke-rå af #31812035188; den bindende rå optælling står under 4.0.204. Slutstatus er fortsat 427 verificerede, 111 rettede og 114 blokerede; fallbackstatus er 11 verificerede, fire rettede og to blokerede.
- [x] Fallbackbygger og validator kan ikke genindføre Fejø/Femø eller Havnø/Mariager Fjord øst.
- [x] `test:coastal-geometry-v2` og workflowrækkefølgen består lokalt.
- [x] Normal 4.0.203-produktion bestod fulde releasegates, DMI, Supabase og Pages i #31811492510.
- [x] Privat #31812035188 beviste, at fingeraftryksgaten stopper et første bevis, som var lavet efter 107 historiske korrektioner.

## 4.0.204 – første bevis direkte fra rå GitHub-kandidat

- [x] Den rå 835-dels punktfil fra #31812035188 er auditeret direkte: 520 verificerede, 149 sikkert vendte og 166 blokerede.
- [x] Slutbevisets fingeraftryk matcher fortsat den rå 652-dels GitHub-fil fra #31804967576; fallbackbeviset matcher sin rå 17-dels fil. De to beviser ændres ikke.
- [ ] Normal 4.0.204-produktion skal bestå fulde releasegates og deploy.
- [ ] En ny privat national kørsel skal bevise de tre eksakte beviser, DMI for valgte/alternative punkter, slut-shadow-score, admin-roundtrip/rollback og artifacts samlet.
