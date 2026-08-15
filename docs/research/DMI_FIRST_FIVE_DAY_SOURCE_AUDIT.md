# DMI-first femdøgnskæder – kilde- og runtimeaudit

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
