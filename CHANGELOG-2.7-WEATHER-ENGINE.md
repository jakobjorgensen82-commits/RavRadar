# Weather Engine 2.7 – stor udbygning

## Browsermotor

- Fælles provider-routing med prioriteten DMI → Open-Meteo Marine → MET Norway → cache → syntetisk fallback.
- Separat circuit breaker, fejltæller, svartid, seneste forsøg og seneste succes pr. provider.
- Timeout, kontrolleret retry og exponential backoff.
- Normaliseret vandstandsformat på tværs af providerne.
- Frisk cache og stale cache i både hukommelse og `localStorage`.
- Kildebaseret kvalitetsscore med komplethed og stale-penalty.
- Weather Control Center med valgt kilde, provider, forsøgte kilder, cachealder, policy og fuld health-status.
- Bagudkompatibel `getWaterLevel()` og eksisterende scorefunktion.

## Central vejropdatering

- Per-provider runtime-status og circuit breakers i stedet for én global DMI-afbryder.
- Begrænset parallel zonebehandling via `WEATHER_CONCURRENCY` (standard 6).
- Providerdiagnostik skrives i `conditions.json` og `weather-health.json`.
- Registrering af requests, succeser, fejl, circuit-status og gennemsnitlig svartid.

## Validering

- Weather Engine-testen dækker DMI-prioritet, frisk cache, Open-Meteo failover, total providerfejl, fallback, diagnostik og source decision.
