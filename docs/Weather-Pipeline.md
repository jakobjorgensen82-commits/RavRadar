# Weather Pipeline 1.0

Kildeprioriteten er komponentvis, ikke én fælles kæde. DMI er førstevalg. For strøm bruges derefter kun den kontrollerede Copernicus-/regionalproxykontrakt ved eksakte DMI-huller; Open-Meteo/MET-strøm må ikke blive scoregrundlag. For andre tilladte komponenthaler undersøges relevante DMI-produkter før den dokumenterede eksterne fallback. Cache og privat runtime bevarer allerede valideret kontinuitet, men er ikke en selvstændig kilde, der må overtrumfe frisk provenance.

## Integreret RavScore og genbrug af allerede hentet vejr (lokal releasekandidat 2026-08-29)

Den integrerede RavScore indfører ikke en ny offentlig rådatakilde og kræver ikke, at produktionen først samler flere dages ny historik efter cutover. Engangsmigrationen fra Candidate G/schema 2 til schema 4 genbruger de allerede hentede, validerede og provenancebundne DMI-/Copernicus-forløb samt den kompatible afledte Candidate G-state. Recovery vælger eksklusivt en gyldig state i rækkefølgen exact point-aktivering, integreret privat continuation, integreret checkpoint og dybt valideret Candidate G schema 2. En ugyldig exact point-aktivering stopper straks; en ugyldig ordinær kandidat må ikke skygge for en gyldig lavere prioritet. Den må hverken opfinde fortid, fremskynde state med kunstig historik eller gøre et hul til roligt vejr.

Vandstandstrend bliver ikke konverteret til en ekstra strømvektor og blandes ikke med det valgte current-U/V-felt. [DMI DKSS](https://www.dmi.dk/friedata/dokumentation/data/forecast-data-storm-surge-model-dkss) er en tredimensional HBM-cirkulationsmodel med atmosfærisk forcing og tidevands-sealevel ved åbne rande; [Copernicus Baltic NEMO](https://data.marine.copernicus.eu/product/BALTICSEA_ANALYSISFORECAST_PHY_003_006/description) leverer tilsvarende fysiske hastighedsfelter samt øjeblikkelige og detidede produkter. Feltet er et samlet modeludfald, ikke et bevis for hver lokal proces. En vandstandsafledt ekstra strøm kan derfor dobbeltregne korreleret dynamik og siger fortsat intet sikkert om surfzonens lokale fortegn.

Efter migrationen bæres videreførelse, checkpoint og recovery i den private syvfilers runtime eller et beskyttet checkpoint. Hver continuation-state, checkpointet og den centrale profilselection skal matche den fulde 11-feltsbinding. Hvis ingen statekilde findes for en kystdel ved første offentlige target, genafspiller buildet de 48 private, proveniensverificerede kildetimer target−48 h til target−1 h med strøm og bølger. Offentlige eller syntetiske pre-target-rækker kan ikke blive historik. Komplette data giver `READY` ved første offentlige target; en manglende eller ugyldig kilde stopper build/release med `RAVSCORE_RECOVERY_REPLAY_BRIDGE_MISSING`. Fremtidige checkpointopdateringer kopieres ikke til `admin_document_versions`, men eksisterende historikrækker bevares, og migrationen sletter intet. Offentlige startup-, detalje-, state- og manifestfiler indeholder fortsat kun de dataminimerede projektioner, som produktet skal bruge. Modelgridstrømmen er ikke lokal bundnær strøm, undertow, feeder-/langskyststrøm eller ripstrøm; sidste mile forbliver uopløst og score-neutral uden lokal batymetri og bølgeopløst surfzonemodel.

Den produktionsverificerede 4.0.308-side bruger fortsat Candidate G, indtil den integrerede model har bestået exact-head, frisk produktionsbygning, releasegate og offentlig mobil-/desktopkontrol. Først ved det atomiske cutover bliver schema 4 og den nye fælles model-id offentlig sandhed.

Candidate G's varme rollbackprojektion findes kun som `ravScoreCandidateGRollback` i den beskyttede fulde runtime; den er ikke en ny vejrfil, Pages-fil eller automatisk fallback. Første modelskift går via `INTEGRATED_PENDING`; manuel rollback via `CANDIDATE_G_PENDING`; manuel tilbagevenden igen via `INTEGRATED_PENDING`. Alle bruger samme source/PENDING/target/reconcile: central profil forbliver source under Pages-deploy og skifter først atomisk med `ACTIVE` efter eksakt offentlig implementation+210/673. Targethash completer efter genverifikation, sourcehash aborterer/rekonsoliderer, og tredje hash stopper fail-closed. Der deployes ingen særskilt Candidate G-assistent-Edge; den integrerede Edge svarer `409`, og klienten bruger lokale deterministiske DA/DE/EN-svar. Scheduler kan kun `CANDIDATE_G_REFRESH` på allerede aktiv Candidate G og må ikke aktivere, rollbacke eller returnere modellen. Dermed kan allerede hentede vejrdata genbruges uden at blande modelgenerationer eller fremskynde historikken.

## Ekstern scheduler-vagthund (4.0.309/4.0.310)

GitHub ejer fortsat normal vejrproduktion ved UTC-minut 14/29/44/59, Copernicus-piloten ved minut 06 og den interne cache-/watchdogplan ved 07/17/27/37/47/57. Fordi alle tre native planer afhænger af samme GitHub-scheduler, kalder ét eksternt cron-job keepalive-workflowet ved 04/19/34/49 UTC med `external_watchdog=true`.

Kaldet starter ikke produktion eller pilot direkte. GitHub-workflowet kontrollerer selv, at ingen produktion er aktiv, og at både seneste produktionskørsel og det offentlige manifest er gamle, før én normal `force=false`-produktion dispatch'es. Det eksplicitte eksterne intent bruger fra 4.0.310 mere end 15 minutter, så det kan overtage efter ét manglende native interval; GitHubs interne schedule-vagt beholder 45 minutter. Almindelig manuel keepalive udløser ikke watchdoget. Ingen vejrpayload, koordinater, rå U/V, private data eller modelstate sendes til den eksterne tjeneste. Se DEC-0107/0108.

Driftsbeviset i 4.0.309 er præcis ét aktivt cron-job, id `8348098`: manuel prøve samt de første automatiske kald kl. 09:19 og 09:34 UTC gav HTTP 204 og grønne GitHub-runs `33244853536`, `33245204517` og `33245798817`. Produktionsdispatch blev korrekt sprunget over, fordi den offentlige produktion stadig var frisk. Ved 09:34 fandtes intet nyt native produktions-`schedule` omkring 09:29; manifestet var cirka 39 minutter gammelt. Kl. 09:49 bestilte vagt `33246369618` den virkelige redningsproduktion `33246376992`. No-op betyder derfor friskhed, ikke nødvendigvis en netop leveret GitHub-plan; denne cirka en-times startafstand er evidensen for 4.0.310's kortere eksterne grænse.

## Supplerende 3D-strøm og regional proxy (privat kandidat efter 4.0.231)

Den almindelige aktive kontrakt nedenfor er fortsat uændret i produktion. En separat privat workflowkandidat undersøger først Copernicus Baltic NEMO og derefter AMM15 for kystdele, hvor DMI ikke har et eksakt fælles U/V-par inden for 5 km. Piloten bruger officielle timebaserede 3D-datasæt, vælger nærmeste fælles U/V-vandkolonne og derefter dybeste fælles lag uden interpolation. Rå vektorer opbevares højst 168 timer i privat Actions-cache; supportrapporten indeholder kun kilde, tid, grid, lag, afstand og antal og kan ikke påvirke score eller offentlig runtime.

Workflowen har en native timeplan ved minut 17 og kan startes manuelt med en eksakt citeret UTC-time til kontrolleret reparation af et cachegab. GitHub leverede dog kun ét stærkt forsinket schedule-event og sprang de næste timer over. Derfor bruger keepalive også `requested`-eventet fra RavRadars eksisterende eksternt startede produktionsworkflow som driftshjerteslag. Det gendanner kun den private cache og dispatcher den eksisterende pilot via `workflow_dispatch`, når aktuel UTC-time mangler; selve produktionsworkflowet ændres ikke. Første autentificerede run `#32129799346` ved 2026-08-18 11:00Z bestod og fandt 39 Baltic- samt fire AMM15-par blandt de 51 DMI-huller, altså et kombineret potentiale på 665/673 før regionalproxy. Ingen af de 43 var `surface-only` i dette run. Hvert renset artifact sammenfatter desuden tid-, grid-, lag-, afstands- og dybdestabilitet på tværs af den rullende cache uden rå U/V. Timeopsamlingen er observationsgrundlag, ikke produktionsaktivering.

Den fælles Actions-cache ligger omkring GitHubs kvoteloft, fordi få DMI-GRIB-cacher hver fylder cirka 2,5–2,7 GB. Første schedule-run ved 12:00Z viste derfor, at en lille timestrømcaches gamle nøgle kunne blive LRU-fortrængt på under en time. Keepalive gendanner cachen read-only ved hvert eksternt produktionshjerteslag og har desuden den oprindelige ti-minutters native timeplan som reserve. En metadata-/timekontrol fejler lukket ved usikkert schema, forkert 168-timersgrænse eller aktiv runtimepåvirkning og logger aldrig rå U/V. Kun et separat to-minutters job må dispatch'e piloten; det kan ikke deploye Pages eller gemme selve cachen. Produktionsworkflowet gendanner fortsat også den eksisterende cache umiddelbart før hver stor DMI-cachekørsel. Dermed bliver en ældre stor DMI-cache næste LRU-kandidat. Mangler cachen, fortsætter offentlig vejrproduktion efter sine egne strenge gates, mens heartbeatet bestiller en ny privat time. Rå U/V må fortsat kun ligge i workflowcachen.

Produktionsgaten kræver fuld verificeret dækning af alle aktive kystdele, aktuelt 673/673. Den tidligere 95 %-grænse var en historisk indfasningsregel og er erstattet af ejerens nyere beslutning. En kystdel uden tilladt, dokumenteret U/V-proveniens stopper hele den nye release; den bliver ikke nuludfyldt, skjult eller lånt fra en anden del.

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
