# Weather Pipeline 1.0

Prioritet: DMI → Open-Meteo Marine → MET Norway → cache.

## Supplerende 3D-strøm og regional proxy (privat kandidat efter 4.0.231)

Den almindelige aktive kontrakt nedenfor er fortsat uændret i produktion. En separat privat workflowkandidat undersøger først Copernicus Baltic NEMO og derefter AMM15 for kystdele, hvor DMI ikke har et eksakt fælles U/V-par inden for 5 km. Piloten bruger officielle timebaserede 3D-datasæt, vælger nærmeste fælles U/V-vandkolonne og derefter dybeste fælles lag uden interpolation. Rå vektorer opbevares højst 168 timer i privat Actions-cache; supportrapporten indeholder kun kilde, tid, grid, lag, afstand og antal og kan ikke påvirke score eller offentlig runtime.

Workflowen kører ved minut 17 hver time og kan også startes manuelt med en eksakt citeret UTC-time til kontrolleret reparation af et cachegab. Første autentificerede run `#32129799346` ved 2026-08-18 11:00Z bestod og fandt 39 Baltic- samt fire AMM15-par blandt de 51 DMI-huller, altså et kombineret potentiale på 665/673 før regionalproxy. Ingen af de 43 var `surface-only` i dette run. Hvert renset artifact sammenfatter desuden tid-, grid-, lag-, afstands- og dybdestabilitet på tværs af den rullende cache uden rå U/V. Timeplanen er observationsopsamling, ikke produktionsaktivering.

Den fælles Actions-cache ligger omkring GitHubs kvoteloft, fordi få DMI-GRIB-cacher hver fylder cirka 2,5 GB. Første schedule-run ved 12:00Z viste derfor, at en lille timestrømcaches gamle nøgle kunne blive LRU-fortrængt på under en time. En særskilt keepalive-workflow gendanner nu kun den eksisterende private Copernicus-cache hvert tiende minut. Gendannelsen opdaterer cachens seneste brug, logger ingen poster og uploader intet; mangler cachen, fejler jobbet synligt. Rå U/V må fortsat kun ligge i workflowcachen.

Otte dokumenterede modelhuller i den vestlige Limfjord har en særskilt ejerbeslutning. Efter fulde aktiveringsgates må kun disse dele bruge nærmeste `dkss_lf`-kolonne op til 15 km som `regional-proxy`. Det er ikke en global afstandslempelse. Et ændret samplingpunkt invaliderer godkendelsen, og pilen skal stå på den faktiske modelcelle. Se DEC-0041 og `data/current-regional-proxy-policy.json`.

## Strømsted, dybdelag og vist scoretime (4.0.231)

Administratorens centralt gemte vandpunkt er samplinganker for både DMI-strøm, den viste strømpil og den aktive scores lokale strømgrundlag. For hvert native forecasttidspunkt finder parseren først den nærmeste vandkolonne med et gyldigt fælles U/V-par på tværs af alle aktive DKSS-collections og vælger derefter det dybeste gyldige lag i præcis den kolonne. Et dybere lag længere væk må aldrig vinde. Op til 3 km er foretrukket; 3–5 km er accepteret reserve; større afstand bliver manglende data.

Strøm vælges uafhængigt af vandstand, overfladetemperatur og andre skalare havfelter. Disse felter må fortsat følge deres kysttilpassede modelprioritet, men deres modelvalg kan hverken blokere, rydde eller flytte strømmen. Havknude viste fejlen konkret: et gyldigt NSBS-U/V-par 2,804 km væk var skjult, fordi et IDW-skalarfelt 5,131 km væk havde vundet det gamle fælles modelvalg. Semantik v3 adskiller valgene og invaliderer kun gammel strøm, ikke gyldige skalarfelter.

Verificeret strøm kræver samme koordinat, forecasttid og vertikallag samt et samplingpunkt, der matcher den aktuelle centralt hydrerede konfiguration. Pilen står på DMI-cellens eksakte koordinat, og den beregnede koordinatafstand efterkontrolleres uafhængigt af DMI-metadata. For lokale kystdele vælges den viste scorepost først; derefter beregnes pilens flowpunkt ved præcis scorepostens tid. Mangler strøm på den viste tid, må byggetidens vandpunkt eller en anden times celle ikke vises som DMI-pil. Cacher fra før denne kontrakt invalideres, så gammel fjern eller umærket strøm ikke kan nå score, historik eller kort. Kun den verificerede DMI-GRIB-kæde må levere aktiv strøm. Den direkte ForecastEDR-positionstjeneste kan reparere vandstand og overfladetemperatur, men dens strøm holdes ude, fordi svaret ikke beviser fælles vandkolonne og dybdelag. Open-Meteos overfladestrøm og anden fallbackstrøm fjernes også før merge, historik, score og kort; de øvrige fallbackkomponenter er fortsat tilgængelige.

En separat privat forskningscache genbruger de allerede downloadede DKSS-felter. Et roterende udsnit samples ved vandpunktet samt cirka 5 og 15 km søværts, og flere repræsentative lag bevares i højst 168 timer. Rå vektorer publiceres ikke, og opsamlingen er eksplicit score-neutral. Den kommende forskning skal bruge materialet til at undersøge **ydre tilførsel → overgang mod kyst → lokal bundnær levering**, ikke til automatisk at ændre RavScore.

## Komponentvis femdøgnsaudit (4.0.124)

Vind, bølger, strøm, vandstand og vandtemperatur auditeres som separate timekæder. Et interval klassificeres som DMI, fallback eller manglende ud fra både de nødvendige numeriske felter og den registrerede provider. For DMI-timer kontrolleres collection, model-run, lead time og prognosealder. Diagnostikken ændrer ikke værdier eller RavScore; den gør manglende dækning og metadata synlige før næste designfase.

## Marine landmasker og U/V-par (4.0.123)

Strøm og DKSS-vind må kun dannes af U og V fra samme fysiske DMI-gridpunkt. I smalle fjorde og lavvandede kyster kan mange af de nærmeste celler være landmaskerede. Bulkjobbet undersøger derfor op til 128 kandidater i Limfjorden og 64 ved øvrige kyster, men accepterer fortsat kun punkter inden for den fastlagte kysttypeafstand. Administratorens centralt gemte marine datapunkt er input og må ikke erstattes af historiske hardcodede koordinater.

Alle kilder normaliseres til ens enheder, tidsstempel, kilde-id og kvalitetsstatus. Fortløbende målinger bør senere gemmes pr. zone, så historiske 6–72 timers features kan beregnes uden at være afhængige af en ekstern kildes historik.

## DMI-vandstand og interpolation (2.6.26)

Aktuel vandstand hentes centralt fra DMI OceanObs. En zone vægtes mellem de to nærmeste stationer med inverse afstande. Kilden, stationernes afstande, vægte og observationstid følger med zonedata. Hvis stations-API'et midlertidigt fejler, bruges DMI's havmodel og derefter den eksisterende fallback-kæde.

Fem-døgnsvisningen bruger DMI-havmodellens `sea-mean-deviation` for vandstand. Open-Meteo-vandstand må kun vises som tydeligt markeret fallback.

## Driftsalarm

`data/live/weather-health.json` viser DMI-dækning og hvor længe data har været utilstrækkelige. Alarm aktiveres først efter 60 minutters vedvarende problemer og højst to gange i et rullende døgn. Når Supabase er tilkoblet, flyttes den vedvarende alarmhistorik til `admin_alert_log`.

## Retention

Rå vejrhistorik kan slettes eller aggregeres efter en konfigurerbar periode. Fundrelaterede vejrsnapshots bevares, fordi de er nødvendige for senere analyse af RavScore og ravfund.

## Vedvarende DMI-opbygning (3.1.7)

DMI-prognosecachen, zonemarkøren og en eventuel HTTP 429-cooldown gemmes mellem GitHub Actions-kørsler med `actions/cache`. Uden denne vedvarende state ville hver planlagt kørsel starte med en tom repository-cache, selv om den foregående Pages-deployment indeholdt friske data.

Hver kørsel henter som standard højst to nye eller udløbende zoner og højst otte faktiske DMI-requests. Zoner vælges med en vedvarende cursor, så hele landet roteres igennem. Ved HTTP 429 gemmes `Retry-After` i forecast-cachen, og efterfølgende kørsler springer live-DMI over, indtil cooldown er udløbet.

Gyldige `dmi-cache`-zoner tæller som DMI-dækning i health-status. Cachefilen skrives atomisk og checkpointes efter hvert live-forsøg, så allerede hentede zoner ikke mistes ved en senere fejl eller timeout.
