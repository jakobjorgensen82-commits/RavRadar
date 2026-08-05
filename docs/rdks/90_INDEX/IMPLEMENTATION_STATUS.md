# Implementeringsstatus pr. 4.0.99

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
| Release Governance | Implementeret i 4.0.58 | Skal bestå ved alle kommende releases |
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
