# Weather Pipeline 1.0

Prioritet: DMI → Open-Meteo Marine → MET Norway → cache.

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
