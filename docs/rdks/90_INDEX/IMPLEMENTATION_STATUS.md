# Implementeringsstatus pr. 4.0.76

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
| Observationslivscyklus | Delvist implementeret | Historisk stabilitet og bedre audit pr. station |
| Prognose-/cachestatus pr. station | Implementeret | Overvåg cacheudløb, drift og historisk stabilitet |
| Automatisk stationsrouting | Implementeret, overvåges | Bedre-station-notifikationer uden automatisk omskiftning |
| Adminoverride | Implementeret | Tydelig visning af aktiv kontra tilsidesat routing |
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
