# RavRadar 4.0.8

- DMI-first komponentfletning gennem hele 5-døgns tidsserien.
- Adaptivt Forecast EDR-budget efter cooldown og succesrække.
- Retry-After understøtter både sekunder og HTTP-dato plus jitter.
- Separate rate-limit states for Forecast EDR, STAC og oceanObs.
- 10-minutters trigger bevares; concurrency forhindrer overlap, og EDR-cooldown blokerer ikke STAC.
- Forecast-komplethed for 24 og 120 timer i Runtime Diagnostics.
- DKSS parserVersion 4 med udvidede oceanaliases og dybere GRIB-inventory.
- Parserfejl klassificeres som parser-blocked i stedet for gentagne korte retries.
- HTTP 429 retries fjernet fra bulk requests; Retry-After håndteres af pipeline-state.
