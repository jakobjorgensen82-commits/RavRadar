# Implementeringsstatus pr. 4.0.129

## Kystgeometri v2 – aktivt design/pilotarbejde, ingen produktionsændring
- [x] Krav om ravstrandlinjer, fjordeksklusion, spring over havne/åer, navnekorrektion og fortsat fuld adminredigering er låst i DEC-0032.
- [x] Eksisterende multi-ankerfunktion er auditeret: flere navngivne retninger findes allerede i admin og scoreforklaring, men almindelig vejrpipeline leverer ikke endnu en selvstændig komponentserie pr. anker.
- [x] Høfder og andre mulige ravfælder er afgrænset som score-neutral registrering frem til særskilt RavScore-forskning og godkendelse.
- [x] Piloten er låst som parallel og ikke-destruktiv; `data/zones.geojson` og centrale adminoverrides er ikke ændret.
- [x] GeoDanmark `Kyst`, EPSG:25832, entitets-WFS, API-key/OAuth-adgang og CC BY 4.0 er verificeret i `docs/research/COASTAL_GEOMETRY_V2_SOURCE_AUDIT.md`.
- [x] V2-arbejdsskema, gratis-kildekontrakt, migrationsklasser og read-only baselineaudit er implementeret uden produktionsintegration.
- [x] Baselineaudit: 209 aktive repositoryzoner, 0 gemte multi-ankerzoner, 116 flaggede kystlinjer og 157 overlap over 0,01 km². Central runtime har senest 208 zoner, så pilotinput skal hydreres før generering.
- [x] Offentlig readback er sammenholdt med repositoryet: `DK-B02-14` er slettet centralt, `DK-B10-05` er omdøbt, og 18 zoner har centralt propagerede multi-ankre. Evidensen ligger i `data/diagnostics/coastal-geometry-v2-live-comparison.json`.
- [ ] Implementér autoritativ navneaudit samt fjord-/havn-/åmasker på den centralt effektive zonebestand.
- [x] Tre pilotmiljøer og nul-tolerancekriterier er låst i `data/geometry-v2/pilot-areas.json`: Blåvand/Rømø, Limfjorden og Lolland/Falster.
- [x] `DATAFORDELER_API_KEY` er oprettet som repository secret, og lokalt workflowjob/script henter kun små private pilotudsnit efter central adminhydrering. Secret værdi, rå arbejdsmappe og v2-data udelukkes fra Pages.
- [x] Pilot #1928 bekræftede secret-injektion, central hydrering, maskering og fuld isolation fra build/deploy; den stoppede sikkert ved første lagopslag.
- [x] #1931 hentede `Kyst_current` og seks supplerende `_current`-lag for alle tre pilotområder uden secretlæk eller produktionsjob.
- [ ] Genkør 4.0.128 med pagination og råfiler inkluderet i det private artifact; verificér at ingen lag er afkortet ved serverens 10.000-featureloft.
- [ ] Generér første parallelle forslag fra den CI-verificerede kilde.

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
- [ ] Grøn genkørsel skal bevise komplette sider og gøre rå pilotdata tilgængelige for parallel geometrianalyse.

## 4.0.129 – separat concurrency-kø til geometri-pilot
- [x] #1933 dokumenterede, at en nyere 15-minutters vejropdatering kan erstatte en ventende pilot, når begge deler samme concurrency-gruppe.
- [x] Pilotdispatch bruger nu `ravradar-geometry-v2-pilot`, mens vejrproduktion fortsat bruger `ravradar-weather-production`.
- [x] En ny pilot kan kun erstatte en ældre pilot; rutinevejret kan ikke længere annullere den.
- [ ] Genkør 4.0.129-piloten og verificér komplethed/artifact.

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
- [ ] Verificér faktiske WAM-/DKSS-vindfelter og overlap mod HARMONIE i friske runs; auditér samtidig Open-Meteo-modelidentitet og UTC-tidslinjen.
- [ ] Vurder først derefter tail-fallback, overgangskvalitet, proveniens, automatiske dækningsgates samt konsekvens for RavScore og UI.
- [ ] Implementering og produktionsverifikation kræver efterfølgende dokumenteret design; ingen blind fallbackændring er godkendt.

## 4.0.119 – DKSS-vindhale, parser og scheduler
- [x] #1828 beviste `wind-tail-u-10m`, men manglende `wind-tail-v-10m`.
- [x] Lokale DKSS-id'er 33/34 er autoritative foran generiske ecCodes-navne. Parser/parameterkort er 13/4.
- [x] Schedulerrotation følger manglende komplet U/V-vindhale pr. zones DKSS-collection.
- [x] Regression reproducerer id 34-konflikten og en 208-zoners rotationsprofil.
- [x] #1831 beviste U+V i `dkss_idw`, 107 vindhalezoner ≥96 timer, fulde gates og deploy. Offentlig samlet vind: 200/208 med data, 108/208 ≥96 timer og maksimum 111,5 timer.
- [ ] De automatiske runs skal nu rotere LF/NSBS ind og måles, så de resterende geografiske huller lukkes mod produktmålet 118–119 timer.
