# DMI-first femdøgnskæder – kilde- og runtimeaudit

**Status:** Fase A, aktiv analyse – ingen produktionsændring  
**Beslutningsgrundlag:** DEC-0030  
**Senest opdateret:** 2026-08-08

## Formål
Dette dokument kortlægger den faktiske kæde for hver forecast- og RavScore-komponent, før nye kilder eller sammensyningsregler implementeres. Produktmålet er cirka 120 timer med DMI til sidste valide DMI-time, eventuel anden relevant DMI-kilde derefter og kun ekstern fallback for den resterende hale.

## Produktionsaudit 4.0.123

#1851 og #1852 havde komplet offentlig vinddækning, men ingen direkte DKSS-vindhale i fem zoner. Den deployede zonefil bekræftede, at de seneste centrale adminrettelser var anvendt. Bulkparseren begrænsede imidlertid værdikontrollen til de 16 nærmeste marine kandidater eller 48 i Limfjorden; tørre/maskerede celler kunne derfor fylde vinduet. 4.0.123 udvider kontrollen til 64/128, fastholder de eksisterende fysiske afstandsgrænser og kræver fortsat ét fælles fysisk U/V-punkt. Resultatet skal verificeres i produktion.

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

- timeproveniens angiver normalt kun `dmi` eller `open-meteo`, ikke collection, model-run, lead time eller prognosealder;
- Open-Meteo-kaldet bruger `Europe/Copenhagen`, mens resten af kæden kræver kanonisk UTC; de offsetløse tidsstrenge parses efter runnerens tidszone og skal auditeres for mulig 1–2 timers forskydning;
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
- Auditér UTC-fejlen som selvstændig rodårsagskontrol uden endnu at ændre kode.
- Udarbejd maskinlæsbar kædekontrakt og testdesign før implementeringsforslag.
