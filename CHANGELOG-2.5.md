# RavRadar 2.5 – central vejrarkitektur

- Central vejrindsamling i GitHub Actions hvert femte minut.
- Kildekæde: DMI → Open-Meteo Marine → MET Norway → cache.
- DMI-ratebegrænsning åbner en circuit breaker, så resten af zonerne straks bruger fallback.
- Ny DMI-kørsel sker ved næste centrale workflow efter cirka fem minutter; jobbet venter ikke.
- Provider, fallbackstatus, fejlspor og stale-status gemmes pr. zone.
- `conditions.json` schemaVersion er opgraderet til 3.
- Validatoren kontrollerer schemaVersion 3 før deployment.
- Brugernes browsere henter kun den centralt publicerede cache.
