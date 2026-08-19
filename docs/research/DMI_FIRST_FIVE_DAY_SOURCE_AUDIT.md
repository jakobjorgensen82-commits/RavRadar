# DMI-first femdøgnskæder – kilde- og runtimeaudit

## 4.0.214-opfølgning

4.0.213 afviste nye dybdelag, men produktionsartifactet indeholdt fortsat ældre temperaturtimer uden vertikal provenance. 4.0.214 kasserer dem fail-closed og bruger manglende `surface:0` som et aktivt rotationsbehov for DKSS-modellerne. Dækningen måles efter hver kørsel; der indføres ingen ny kilde eller scoreændring.

**Status:** Fase A, aktiv analyse – ingen produktionsændring  
**Beslutningsgrundlag:** DEC-0030  
**Senest opdateret:** 2026-08-15

## Formål
Dette dokument kortlægger den faktiske kæde for hver forecast- og RavScore-komponent, før nye kilder eller sammensyningsregler implementeres. Produktmålet er cirka 120 timer med DMI til sidste valide DMI-time, eventuel anden relevant DMI-kilde derefter og kun ekstern fallback for den resterende hale.

## Produktionsaudit 4.0.123

#1851 og #1852 havde komplet offentlig vinddækning, men ingen direkte DKSS-vindhale i fem zoner. Den deployede zonefil bekræftede, at de seneste centrale adminrettelser var anvendt. Bulkparseren begrænsede imidlertid værdikontrollen til de 16 nærmeste marine kandidater eller 48 i Limfjorden; tørre/maskerede celler kunne derfor fylde vinduet. 4.0.123 udvider kontrollen til 64/128, fastholder de eksisterende fysiske afstandsgrænser og kræver fortsat ét fælles fysisk U/V-punkt. Resultatet skal verificeres i produktion.

## Produktionsaudit 4.0.124 – dataset `rr-20260808145245-208`

De fem DKSS-vindhalehuller er lukket. Den komponentvise måling af 208 zoner og 118 offentlige forecasttimer viste:

| Komponent | Komplette zoner | Delvise zoner | Helt manglende zoner | DMI-timer pr. zone | Fallback/missing-kant |
|---|---:|---:|---:|---|---|
| Vind | 208 | 0 | 0 | 101 eller 107 | 17 eller 11 fallbacktimer; ét indledende fallbacktrin og én hale |
| Bølger, komplet vektor | 192 | 13 med 117 timer | 3 | normalt 117, mens 22 Limfjordszoner bruger ren fallback | 3 zoner uden gyldig DMI eller fallback |
| Strøm | 200 | 8 med 101 timer | 0 | 101–107 | 8 Limfjordszoner har 17 reelle missing-timer ved forecastkanten |
| Vandstand | 200 | 8 med 101 timer | 0 | 101–107 | samme 8 Limfjordszoner mangler hale; øvrig fallback biasjusteres til DMI |
| Vandtemperatur | 200 | 8 med 101 timer | 0 | 101–107 | samme 8 Limfjordszoner mangler hale |

De tre zoner helt uden bølger var Mors nord/Feggesund, Sallingsund/Glyngøre og Salling vest/Junget. De otte fælles marine halehuller var Sallingsund/Glyngøre, Fur nord, Fur syd, Løgstør/Aggersund, Livø/Rønbjerg, Gjøl/Attrup, Aalborg vest/Egholm og Aalborg øst/Nørresundby.

Auditten viste også et selvstændigt provenienstab. Timefelterne gemmer normalt kun provider; vind gemmer delvist `harmonie_dini_sf` eller `dkss`, mens bølger og marine komponenter ikke bærer den konkrete collection. Model-run, lead time og prognosealder mangler pr. time. Disse oplysninger kan ikke sandfærdigt rekonstrueres efter merge, fordi bulkcachen kan akkumulere forecasttrin fra forskellige runs. Næste design skal derfor føre identiteten med fra STAC-asset/GRIB-felt gennem interpolation og merge.

## Produktionsaudit 4.0.208 – run #31849701179, dataset `rr-20260814231726-210`

Den seneste fuldt gatede automatiske kørsel på commit `dec935982e1bdb5cc12b971f80d2d1bfd7c229f1` gennemførte central adminhydrering/tombstones, frisk vejrbygning, fuld `validate`, releasegate, Supabase-synkronisering, Pages-artifact og deploy. Supportartifactets beskyttede `conditions.json` og schema-4-coverageaudit måler 210 aktive zoner og 118 monotone forecasttimer pr. zone uden dubletter.

| Komponent | Komplette zoner | Zoner med missing | DMI-timer | Fallbacktimer | Missing-timer | DMI-timer med komplet krævet timeproveniens |
|---|---:|---:|---:|---:|---:|---:|
| Vind | 210 | 0 | 22.834 | 1.946 | 0 | 22.834 |
| Bølger | 194 | 16 | 20.706 | 3.731 | 343 | 20.706 |
| Strøm | 202 | 8 | 2.725 | 21.977 | 78 | 2.725 |
| Vandstand | 202 | 8 | 22.463 | 2.245 | 72 | 0 |
| Vandtemperatur | 202 | 8 | 2.725 | 21.977 | 78 | 2.725 |

Tallene dokumenterer værdidækning, ikke en godkendt kildekæde. Der er 686 providerskift for vind, 406 for bølger, 426 for strøm, 518 for vandstand og 426 for vandtemperatur på tværs af de 210 zoner. Konkrete vindserier indeholder blandt andet `Open-Meteo → DMI → Open-Meteo → DMI → Open-Meteo`; vandstand kan skifte gentagne gange mellem `dmi`, `open-meteo-adjusted` og `dmi-interpolated`. Den aktuelle merge opfylder derfor ikke endnu DEC-0030's tilsigtede kontrakt om bedste DMI frem til sidste valide DMI-time og derefter højst én dokumenteret fallbackhale. En komplet 118-timers værdiserie må ikke forveksles med en komplet DMI-first-kæde.

Mønsterudtrækket afgrænser tre årsagsklasser. Alle komponenter kan begynde med én Open-Meteo-time kl. 23 UTC, mens DMI-timebyggeren starter kl. 00. Vind har i 116 zoner et internt to-timershul ved HARMONIE→progressiv DKSS og i 17 zoner et tilsvarende hul nær halen; 77 zoner har ellers én sammenhængende DMI-blok. For strøm og vandtemperatur har 125 zoner kun fire sene DMI-timer, 73 har 15 sene DMI-timer, 10 har 110 sammenhængende timer, og to har yderligere reelle gab. Det skal analyseres som komponentvis progressiv cache-/collectiondækning, ikke skjules med en generel mergeændring.

Proveniensforbedringen fra 4.0.125 virker i produktionen for vind, bølge, strøm og vandtemperatur: collection, model-run, lead time, prognosealder, temporal status og native gyldighedstider er til stede på alle deres DMI-klassificerede timer. Vandstand mister derimod alle seks felter på samtlige 22.463 DMI-klassificerede timer. Kodesporet peger på `repairWaterLevelContinuity`: funktionen genopbygger `sources.waterLevel` med provider/fallback-status, men fører ikke den oprindelige DMI-identitet videre. Dette er et dokumenteret provenancebrud; det er endnu ikke en autoriseret kodeændring.

Den tidligere UTC-hypotese er samtidig afkræftet for aktuel kode. Begge Open-Meteo-forecastkald bruger nu `timezone: 'GMT'`, og de offsetløse timer konverteres eksplicit med `Z`. Den relevante resterende fallbackrisiko er modelidentitet (`best_match`) og overgangskvalitet, ikke lokal dansk tidszone.

## Verificerede DMI-modelrammer

| Model | Officiel horisont | Runs | Normal komplet tilgængelighed | Relevante felter | Rumlig opløsning |
|---|---:|---:|---:|---|---|
| HARMONIE NEA surface | 54 timer | 00/03/06/09/12/15/18/21Z | ca. run +2t45m | 10 m vind, temperatur m.m. | ca. 2,5 km |
| WAM | 5½ døgn | 00/06/12/18Z | ca. run +2t45m til +3t | bølgehøjde/-retning/-periode samt 10 m vind | `wam_dw` ca. 1 km; `wam_nsb` ca. 5 km |
| DKSS | 5 døgn | 00/06/12/18Z | ca. run +3t20m | vandstand, strøm-U/V, vandtemperatur og 10 m vind-U/V | områdespecifikt ca. 0,1–3 sømil |

DMI dokumenterer, at WAM og DKSS bruger HARMONIE-forcing de første 60 timer og ECMWF-forcing i resten af deres egen DMI-prognose. Det gør WAM/DKSS til reelle DMI-produkter gennem femdøgnshorisonten, men ikke til uafhængige atmosfæremodeller. Et eventuelt vindskift fra HARMONIE til WAM/DKSS skal derfor vurderes som et DMI-produkt-/opløsningsskift og ikke som uændret HARMONIE.

Kilder:
- DMI HARMONIE: https://www.dmi.dk/friedata/dokumentation/data/forecast-data-weather-model-harmonie
- DMI WAM: https://www.dmi.dk/friedata/dokumentation/data/forecast-data-wave-model-wam
- DMI DKSS: https://www.dmi.dk/friedata/dokumentation/data/forecast-data-storm-surge-model-dkss
- DMI tilgængelighed: https://www.dmi.dk/friedata/dokumentation/data/forecast-data-availability
- DMI API/collections: https://www.dmi.dk/friedata/dokumentation/forecast-data-stac-api
- DMI vilkår, CC BY 4.0 og fair use: https://www.dmi.dk/friedata/dokumentation/terms-of-use

## Nuværende RavRadar-kæde – kodeverificeret

| Komponent | Primær DMI-kilde i kode | DMI-felt | Aktuel fallbackserie | Faktisk merge |
|---|---|---|---|---|
| Vind | `harmonie_dini_sf` | `wind-u-10m`, `wind-v-10m` | Open-Meteo Weather; MET Norway bruges kun til current snapshot hvis Open-Meteo-current fejler | timevis DMI-værdi vinder; Open-Meteo udfylder manglende time/komponent |
| Bølger | `wam_dw` eller `wam_nsb` efter kysttype | højde, middelretning, dominant periode | Open-Meteo Marine | timevis DMI-værdi vinder |
| Strøm | `dkss_idw`, `dkss_nsbs` eller `dkss_lf` | fælles U/V-grid og vertikallag | Open-Meteo Marine | timevis DMI-værdi vinder; transportstate tæller fortsat kun verificeret DMI-strøm |
| Vandstand | DKSS samt DMI-stations-/prognosepunktrouting | `sea-mean-deviation` | kort DMI-gap-reparation og Open-Meteo sea level | særskilt kontinuitetsfunktion; korte DMI-huller højst 6 timer |
| Vandtemperatur | relevant DKSS | `water-temperature` | Open-Meteo Marine SST | timevis DMI-værdi vinder |
| Lufttemperatur | ikke en del af public hourly-feltlisten/RavScore | Open-Meteo hentes, men public projection udelader feltet | ingen aktiv produktkæde | skal afklares som aktiv eller overflødig komponent |

Koden bruger `mergeHourlyPreferDmi`, som prioriterer DMI separat pr. komponent og time. Det er allerede grundformen for hale-fallback. Der er dog ikke endnu dokumentation nok til at bevise et korrekt modelskift:

- timeproveniens er komplet på DMI-klassificerede vind-, bølge-, strøm- og vandtemperaturtimer i 4.0.208, men vandstand mister fortsat identiteten i continuity-trinnet;
- Open-Meteo-kaldet bruger i aktuel kode `GMT`, og tiderne kanoniseres eksplicit som UTC; den tidligere 1–2 timers lokal-tidshypotese er dermed afkræftet;
- Open-Meteo `best_match` kan selv skifte underliggende model uden at RavRadar registrerer modellen;
- live-DMI-grenen returnerer en DMI-only forecastserie, mens cache-DMI-grenen henter og merger fallback; ens adfærd skal verificeres;
- `ACCEPTED_FORECAST_HOURS=118` er produktkontrakten, men den eksisterende completeness-audit tæller værdier og ikke sammenhængende kildeintervaller eller skiftets kvalitet;
- public projection fjerner timevis kildeproveniens, selv om den beskyttede `conditions.json` bevarer `sources`.

## Eksterne fallbackkandidater – foreløbig afgrænsning

### Open-Meteo
Den aktive fallback leverer vejr og marine felter. Marine API'et kombinerer flere modeller. Dokumentationen angiver blandt andet DWD EWAM, ECMWF WAM, Météo-France MFWAM/SMOC og GFS; `best_match` vælger model efter sted. Strøm, tidevand og havtemperatur er typisk ca. 8 km og har udtrykkelig begrænset kystnøjagtighed. Open-Meteos gratis tier er til evaluering/prototyping; kommerciel brug kræver abonnement/kundekapacitet. Produktets brugsmodel skal afklares før dette kan godkendes som langsigtet fallback.

Kilder:
- https://open-meteo.com/en/docs/marine-weather-api
- https://open-meteo.com/en/pricing

### MET Norway Locationforecast
RavRadar bruger aktuelt MET Norway kun som sekundær fallback for øjebliksdata, ikke som femdøgnsserie. For Norden bruger Locationforecast MEPS 0–60 timer ved ca. 2,5 km og ECMWF-ensemble/postprocessering for 2–10 dage ved ca. 9 km. Det kan være en atmosfærisk vindhalekandidat, men overlap, modelskift, vindretning, prognosemedlemmer og timeproveniens skal analyseres. Data kræver kreditering og er under NLOD 2.0/CC BY 4.0.

Kilder:
- https://docs.api.met.no/doc/locationforecast/datamodel.html
- https://docs.api.met.no/doc/License.html

## Foreløbige komponenthypoteser – ikke beslutninger

1. **Vind:** Bevar HARMONIE 0–ca. 54 timer. Undersøg først WAM's 10 m `WIND/DWI` og DKSS' 10 m U/V som DMI-hale til cirka 120 timer. Sammenlign spatialt mod HARMONIE i overlapperioden og kontrollér retningskonvention/gridrotation. Kun hvis DMI-produkterne ikke er forsvarlige, sammenlignes MET Norway og en eksplicit Open-Meteo-model.
2. **Bølger:** WAM har allerede en native 5½-døgnskæde. Hovedopgaven er at lukke zonedækning og dokumentere WAM-modelområde/skift (`wam_dw`/`wam_nsb`), ikke at erstatte den med fallback.
3. **Strøm:** DKSS har officielt fem døgn. Open-Meteos kystbegrænsning og REQ-STATE-005 betyder, at ekstern strøm aldrig må drive transportstate. Fokus er DMI-zonecoverage og korrekt `missing`; enhver vist fallback skal være tydeligt score-/state-afgrænset.
4. **Vandstand:** DKSS har fem døgn, og stationsrouting/continuity er separat. Fallback skal vurderes mod datumforskelle og lokale tidevand; Open-Meteos globale middelvandstand kan ikke antages direkte kompatibel.
5. **Vandtemperatur:** DKSS har fem døgn. Sammenligning med Open-Meteo SST skal tage højde for DKSS' vertikallag kontra overfladetemperatur.

## Næste analysearbejde

- Udtræk faktiske field inventories og horisonter for WAM-vind og DKSS-vind fra friske DMI-runs.
- Mål overlap pr. repræsentativ kysttype: bias, spring, retning og komplethed mellem HARMONIE og WAM/DKSS.
- Kortlæg præcis Open-Meteo-modelidentitet i Danmark eller konfigurer eksplicit model til en fair kandidatprøve.
- Kortlæg hvorfor komponenterne skifter gentagne gange mellem DMI og fallback i stedet for at have ét dokumenteret haleskift; skeln ægte DMI-huller, cache/run-overgange og continuity-reparation.
- Spor og design bevaring af vandstandsproveniens gennem `repairWaterLevelContinuity` uden endnu at ændre kode.
- Udarbejd maskinlæsbar kædekontrakt og testdesign før implementeringsforslag.

## Afgrænset næste målerunde – bølger og vandstand

Mens den separate 72-timers strømhistorik opbygges naturligt gennem de planlagte GitHub-kørsler, fortsætter P1 med en skrivebeskyttet analyse af bølger og vandstand. Ekstra manuelle vejrbygninger er ikke nødvendige: de kan tilføje nye snapshots, men kan ikke skabe manglende historik bagud i tiden.

### Bølger

- En komplet bølgetime kræver samtidig bølgehøjde, bølgeretning og dominant periode. En optælling af bølgehøjde alene er kun en driftsindikator og ikke et fuldt P1-bevis.
- Målingen skal skelne `wam_dw`, `wam_nsb`, ekstern fallback og `missing` pr. sammenhængende interval og forklare geografiske huller, herunder Limfjorden hvor den nuværende kysttype ikke har en valgt WAM-collection.
- For hver zone måles start ved nutiden, sidste valide time, interne huller, model-run, lead time, prognosealder og antal kildeovergange. Et komplet værdiforløb er ikke i sig selv et godkendt DMI-first-forløb.
- WAM har allerede den officielle native horisont til produktmålet. Analysen skal derfor først forklare collection-, grid-, cache- og runovergange; den skal ikke begynde med at tilføje en ny fallback.

### Vandstand

- Målingen skal følge `sea-mean-deviation` fra den valgte DKSS-collection gennem kildepunktrouting, eventuel kort DMI-gap-reparation, automatisk eller administrativ afstandsvægtning og den endelige zoneserie.
- DMI-identitet, run og tidsproveniens skal fortsat være til stede efter continuity- og routingtrinnene. En talmæssigt komplet serie uden denne identitet er ikke et fuldt P1-bevis.
- Overgangen til Open-Meteo skal vurderes separat for datum-/niveau-forskel, tidevandsmønster og spring ved sammensyningen. Reelle Vadehavssvingninger må ikke udglattes som fejl.
- Målingen skal skelne et ægte DMI-hul fra et hul skabt af cache, model-run, routing eller efterbehandling. Manglende timer forbliver `missing`, indtil årsagen er forklaret.

### P1-komponenternes afgrænsning

Den bindende aktive liste er vind, bølger, strøm, vandstand og vandtemperatur. Vandtemperatur mangler fortsat sin selvstændige overgangs- og halekvalitetsanalyse efter bølge-/vandstandsrunden. Lufttemperatur hentes og findes i den kompakte offentlige timefil, men vises ikke i det aktive informationspanel og indgår ikke i den aktive RavScore; den skal afklares som overflødig eller fremtidig funktion og må ikke automatisk udvide den bindende P1-kæde. Nedbør, skydække, lufttryk og sigtbarhed er heller ikke aktive P1-komponenter i den verificerede kode.

### Beslutningspunkt efter målingen

Først når mindst flere normale modelkørsler er sammenlignet, udarbejdes et designforslag med konsekvens for UI, RavScore/state, datamængde, GitHub-køretid og Supabase-egress. Denne analyse giver fortsat ikke mandat til nye kilder, fallbackregler eller scoreændringer.

## Offentlig P1-måling 2026-08-15 – dataset `rr-20260815071241-210`

Den skrivebeskyttede direkte måling af det deployede datasæt omfatter 210 zoner og 118 monotone timer fra `2026-08-15T07:00:00Z` til `2026-08-20T04:00:00Z`.

| Komponent | 118 komplette timer | Ufuldstændige zoner | Mønster |
|---|---:|---:|---|
| Bølger, højde + retning + periode | 209/210 | 1 | `DK-B05-11` Mors nord/Feggesund mangler alle 118 bølgetimer |
| Vandstand | 202/210 | 8 | Otte Limfjordszoner har 103 timer og mangler samme sammenhængende hale på 15 timer |

De otte vandstandszoner er `DK-B05-14`, `DK-B05-16`, `DK-B05-17`, `DK-B05-18`, `DK-B05-19`, `DK-B05-22`, `DK-B05-23` og `DK-B05-24`. Alle har vandstand fra nutiden gennem `2026-08-19T13:00:00Z` og mangler `2026-08-19T14:00:00Z`–`2026-08-20T04:00:00Z`. Det ens geografiske og tidslige mønster skal først undersøges som en fælles `dkss_lf`-run-, asset-, cache- eller native horisontgrænse.

`DK-B05-11` er ligeledes en Limfjordszone. Den aktuelle kysttypekobling vælger ingen WAM-collection for `limfjord`, hvilket forklarer fraværet af en direkte DMI-WAM-kæde, men ikke alene hvorfor den eksisterende eksterne fallback også er missing. Det sidste kræver den beskyttede timeproveniens fra et frisk supportartifact.

Den offentlige projektion indeholder med vilje ikke timevis kildeidentitet. Målingen beviser derfor det faktiske brugerresultat, men kan ikke alene afgøre DMI-/fallbackintervaller eller model-run. Ingen kildeændring kan besluttes på dette grundlag alene.

## Vandtemperaturaudit 2026-08-15

Den direkte offentlige måling af dataset `rr-20260815071241-210` viser samme haleprofil som vandstand: 202/210 zoner har alle 118 vandtemperaturtimer. `DK-B05-14`, `DK-B05-16`, `DK-B05-17`, `DK-B05-18`, `DK-B05-19`, `DK-B05-22`, `DK-B05-23` og `DK-B05-24` har 103 timer og mangler fælleshalen `2026-08-19T14:00:00Z`–`2026-08-20T04:00:00Z`. Det styrker hypotesen om en fælles `dkss_lf`-run-, asset-, cache- eller native horisontgrænse frem for otte uafhængige zonefejl.

Den verificerede kodekæde er:

- DMI-feltet `water-temperature` hentes fra zonens valgte DKSS-collection og interpoleres kun inden for gyldige modeltrin.
- Manglende DMI-timer kan udfyldes komponentvis af Open-Meteos `sea_surface_temperature`; manglende værdier forbliver ellers `missing`.
- DMI-timeproveniens føres gennem forecaststore og komponentmerge. Den kompakte offentlige projektion fjerner kildeidentiteten, så et supportartifact kræves til den aktuelle DMI-/fallbackfordeling.
- `waterTemperatureC` vises i informationspanelet, gemmes i observationssnapshots og bevares i både `samples24h` og det score-neutrale `samples72h`.
- Den aktive RavScore og den nuværende mobiliserings-/stateberegning bruger ikke vandtemperaturen numerisk. Historikfeltet er derfor bevaret forskningsinput, ikke et aktivt scorebidrag.

### Fysisk lagproblem fundet og afgrænset i 4.0.213

4.0.212-supportartifactet viser, at lokal DMI-parameter 80 findes både ved `surface:0` og ved mange `depthBelowSea`-niveauer i `dkss_idw`, `dkss_nsbs` og `dkss_lf`. Den tidligere skalarkæde skelnede ikke disse lag og kunne overskrive overfladeværdien med det sidst læste dybdelag. Open-Meteo-fallbacken er eksplicit havoverfladetemperatur, så serierne var ikke sikkert fysisk sammenlignelige.

4.0.213 accepterer derfor kun parameter 80 ved eksplicit `surface`, niveau 0, gemmer lagidentiteten og afviser dybere lag fail-closed. Det giver DMI og fallback samme tilsigtede vertikale betydning, men overlap skal stadig måles for bias, spring og geografisk mønster. Temperaturen får fortsat ingen scorevirkning.
# 4.0.210 – rodårsag i strømdækningens horisontsmål

4.0.209-supportartifactet dokumenterer tre hovedgrupper: 125 zoner med to native U/V-par fra 19. august kl. 11–12 UTC, 75 zoner med syv par fra 19. august kl. 00–12 UTC og 10 zoner med 40 par fra 14. august kl. 21 til 19. august kl. 12 UTC. Den tidligere scheduler beregnede horisont som `sidste gyldige tidspunkt - nu` og kaldte derfor alle grupper 96-timersdækkede.

Den korrigerede måling kræver første komplette native trin inden for fire timer fra byggetid og højst fire timer mellem komplette trin. Anvendt på samme artifact er kun 10 hovedzoner komplette, mens 200 kræver genhentning. Den geografiske efterspørgsel fordeler sig på 101 `dkss_idw`, 83 `dkss_nsbs` og 16 `dkss_lf`; schedulerens første to valg bliver IDW og NSBS. Dette er en cache-/schedulerrettelse, ikke evidens for en ny datakilde eller scoreændring.
# 4.0.211 – modelvalgstab og behandlingsstatus

4.0.210-kørslen #31853585142 prioriterede IDW og NSBS korrekt, men begge runs rapporterede 39 af 39 assets som `assetsSkippedPreviouslyProcessed`. Cacheartifactet havde fortsat de samme 125/75/10-strømgrupper. `merge_previous` kopierede `hourly`, `gridPoints` og `collections`, men ikke `marineSelection`; behandlingsregistret kunne dermed overleve den serie, som et senere modelskift havde ryddet.

4.0.211 bevarer modelvalget og rekonstruerer legacy-valg fra collection, distance og kysttype. På 4.0.210-artifactet kan 1.138 hovedzone-/kystdelvalg rekonstrueres, og en dårligere IDW-kandidat afvises for en eksisterende Limfjordsserie. `GRID_LOOKUP_VERSION` hæves fra 5 til 6 for at genbehandle den aktuelle modelkørsel én gang.

# 4.0.212 – komponentkonflikt ved marine modelvalg

Successive artifacts viser, at #31856697202 havde 210/210 zoner med strøm fra nutiden, mens #31857361460 havde 183/210. De 27 berørte NSBS-zoner gik fra 38 sammenhængende U/V-trin til ét sent trin. Det er derfor ikke en native NSBS-horisontgrænse.

Den konkrete mekanisme er, at samme globale `marineSelection` tidligere kunne opdateres af både fælles strømvektor og skalare felter. For eksempel havde Røsnæs nord et valgt NSBS-strømpar på 10,999 km. Et IDW-skalarpunkt på 0,375 km plus 10 km modelstraf blev marginalt bedre og kunne rydde hele NSBS-serien, selv om IDW ikke leverede et fælles U/V-par ved de berørte tider. Et efterfølgende NSBS-skalar-/strømtrin efterlod kun sidste tidspunkt.

4.0.212 gør strømparret autoritativt for et allerede etableret havmodelvalg. Vandstand og temperatur kan følge samme model, men kan ikke skifte den eller ændre dens afstandsscore. En anden model kan fortsat overtage, når den faktisk leverer et bedre fælles strøm-U/V-par. Det er en regressionsrettelse inden for de eksisterende DMI-kilder; den ændrer ikke fallback eller RavScore.

# 4.0.217 – faktisk historiktid og tabt verifikationsmærke

Supportartifact #2750 (`rr-20260815111030-210`) giver den første direkte tidsspændsmåling: alle 210 zoner har 142 rå `samples72h` over 35,098 timer. Det fælles største hul er 67,6 minutter mellem 14. august 02:46:57Z og 03:54:33Z. `samples24h` spænder 23,887 timer uden huller over én time.

Rå tællinger skjulte en proveniensfejl. Aktuel strøm havde et tidsmatchende DMI-U/V-bevis i 183/210 zoner, mens 27 `dkss_idw`-zoner kun havde U/V 19. august og korrekt stod `unverified/no-time-match`. `samples72h` fordelte sig på 75 zoner med nul verificerede prøver, 125 med én og 10 med 101. Efterberigelsen opdaterede kun den aktuelle række i `samples24h`; næste vejrbygning videreførte autoritativt `samples72h`, hvor samme række stadig stod uverificeret.

4.0.217 synkroniserer kun rækken med eksakt `conditions.generatedAt` til begge vinduer efter den eksisterende grid-, tids- og U/V-kontrol. En simulering på hele artifactet markerede 183 zoner og lod de 27 uden tidsmatch forblive `false`. Ældre `false` forbliver `false`, så manglende fortid ikke opfindes. Eftermålingen skal derfor starte fra første produktionskørsel med rettelsen og fortsætte til 72 faktiske timer.

Første produktionsevidens er #31882866344 og datasæt `rr-20260815114746-210`. Alle 210 zoner nåede 145 rå prøver over 35,719 timer. Verificeret 72-timershistorik voksede én fremadrettet prøve i de 183 zoner med tidsmatch: fordelingen blev 102 zoner med én, 98 med to og 10 med 102 verificerede prøver. De 27 aktuelle `no-time-match` blev ikke fejlmarkeret som verificerede.
## 4.0.218 – tidsankret havmodelvalg

De 27 `no-time-match`-zoner i #2750 delte samme mekanisme: deres valgte `dkss_idw`-model havde kun et fælles U/V-par 19. august, mens den tidligere `dkss_nsbs`-model dækkede tiden omkring nu. Det globale modelvalg vurderede afstand og kystmodelstraf, men ikke kandidatparrets placering i tid, og et halepar kunne derfor rydde hele den aktuelle serie.

Designet i 4.0.218 gør et eksisterende U/V-par inden for seks timer af `bulkCache.generatedAt` til et tidsmæssigt anker. Et andet modelvalg kan kun fortrænge det, når kandidatparret også ligger i samme ankervindue. Hvis den eksisterende model ikke selv har et aktuelt anker, må en bedre kandidat fortsat reparere zonen. Dermed forbliver missing synligt, og hverken kildehierarki, fallback eller score ændres.

Første produktionsevidens er #31883707138 og `rr-20260815122446-210`. Alle 210 zoner havde verificeret strøm omkring nu. De 27 tidligere berørte zoner valgte `dkss_nsbs` og havde 41 strømtrin hver. Diagnostikken registrerede ingen `CURRENT_ANCHOR_PROTECTED` i netop denne rotation, fordi et konkurrerende sent IDW-par ikke blev behandlet; derfor er regressionen produktionssund, men beskyttelsesgrenens faktiske aktivering er fortsat en eksplicit eftermåling.
## 2026-08-19 – DK-B05 lokal transition-opsamling (automatiseret)
- Lokal analyse på data/diagnostics/p1-component-zone-transitions-B05-detail-20260819-221839.json viser to klare klynge-mønstre i dette snapshot:
  - 8 zoner med samtidigt første manglende current/waterLevel/waterTemperature kl. 2026-08-19T14:00:00Z: DK-B05-14, DK-B05-16, DK-B05-17, DK-B05-18, DK-B05-19, DK-B05-22, DK-B05-23, DK-B05-24.
  - 15 zoner med første manglende bølge først kl. 2026-08-20T06:00:00Z (inkl. DK-B05-11 total wave-manglende og 14 andre).
- Foreløbig årsagsklassifikation (lokal snapshot): wave-only vs wave+current/waterLevel/waterTemperature. Se data/diagnostics/p1-component-B05-transition-classified-20260819-221839.json og data/diagnostics/p1-component-B05-cause-hypothesis-20260819-221839.md for zone-liste og tidsmønster.
- Konklusion i denne trinvise fase: denne profil ligner en fælles run/collection-grænse (ikke zone-snit), så næste P1-trin er at validere mod næste produktionsartifact før overgangsdesign og før nogen model-/fallbackændring.
## 2026-08-19 – DK-B05 lokal transition-opfølgning

Den lokale P1-transition på `data/live/conditions.json` bekræfter igen de to DK-B05-halestrukturer:
- 15 zoner går første gang missing på `wave` 2026-08-20T06:00:00Z.
- 8 zoner har first-missing samtidigt for `current`, `waterLevel` og `waterTemperature` 2026-08-19T14:00:00Z.
- Klassifikation fra `data/diagnostics/p1-component-B05-transition-classified-live-20260819-2237.json`:
  - `waveOnlyGap`: 7 zoner.
  - `waveCurrentLevelTempSimulGap`: 8 zoner.
  - `waveTotalGap`: 0 zoner i denne måling.

Det betyder, at den udtømmende årsagstrekant stadig står klart: fælles DKSS-siden af halekæden, sandsynligvis run-/asset-/cache-relateret, ikke otte uafhængige zonelokale defects.

Begrænsning: offentlig production-JSON kunne ikke hentes sikkert i denne gennemløb, så overgangs-kontrakt skal stadig bekræftes i en kommende produktionsovertræk.
## 2026-08-19 (lokal suppleringsrunde)
- Ny komplet transitionprofil (lokal) gemt: `data/diagnostics/p1-component-transition-profile-live-20260819-2302.json`.
- Kort resume: `data/diagnostics/p1-component-transition-profile-live-20260819-2302.md`.
- De vigtigste overgangsmarkører i denne kørsel:
  - `current`: 8 zoner med første manglende efter DMI-front ved 2026-08-19T14:00:00Z.
  - `waterTemperature`: samme 8 zoner som `current`.
  - `waterLevel`: samme 8 zoner med parallel `firstMissingAfterDmiAt`.
  - `wave`: 15 zoner med første manglende fra 2026-08-20T06:00:00Z i 15-zone-klyngen.
- Ingen produktionskode er ændret på baggrund af denne afledte output; den ligger som beslutningsunderlag i DEC-0030.
