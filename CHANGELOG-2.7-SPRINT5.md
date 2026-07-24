# RavRadar 2.7 – Sprint 5

## Implementeret

- Aktiv Weather Engine-router med prioriteten: frisk cache → DMI live → gammel cache → syntetisk fallback.
- Runtime-konfigurerbar DMI-endpoint uden API-nøgle i browserkoden.
- Timeout og separat DMI circuit breaker med automatisk cooldown.
- In-memory cache med frisk og stale periode.
- Weather Control Center registrerer valgt kilde, forsøgte kilder, cache-hit, alder og kvalitet.
- Kvalitetsscore skelner mellem live data, frisk cache, stale cache og syntetisk fallback.
- Diagnostik inkluderer providerstatus, sidste forsøg, sidste succes og circuit breaker-status.
- `getWaterLevel()` er bagudkompatibel, men routes nu gennem Weather Engine 2.7.
- Automatisk test af routing, fallback, diagnostik og kontrolcenter.

## Konfiguration

Browseren kan kobles til RavRadars centrale weather endpoint via:

```js
globalThis.RAVRADAR_WEATHER_CONFIG = {
  dmiWaterLevelUrl: '/api/weather/water-level',
  timeoutMs: 8000,
  cacheTtlMs: 900000,
  staleTtlMs: 21600000
};
```

Uden endpoint anvendes cache og derefter den eksisterende syntetiske fallback. Ingen DMI API-nøgle indlejres i klienten.
