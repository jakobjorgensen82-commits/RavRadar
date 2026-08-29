# RavRadar 4.0.309

Dato: 2026-08-29

## Ekstern produktionsvagthund

- GitHub ejer fortsat den normale vejrproduktion ved UTC-minut 14/29/44/59.
- Ét eksternt cron-job må kalde cache-/watchdogworkflowet ved 04/19/34/49 med `external_watchdog=true`.
- Kaldet er normalt en no-op og kan kun bestille én ikke-tvungen produktion efter den eksisterende 45-minutters dobbelte stilhedskontrol.
- Copernicus-pilot, intern retry, cachebevaring og de to concurrencygrupper bevares.

## Afgrænsning og verifikation

- Målrettede workflow-, heartbeat-, watchdog- og håndbogskontrakter, RDKS, releasegate og hele lokale `validate:source` er grønne før PR.
- Exact-head, frisk post-merge-produktion, offentlig status og mindst to eksterne automatiske kald skal dokumenteres.
- Ingen model-, score-, vejrinput-, state-, recovery-, geometri- eller punktændring.
- Geodata må kun ændre topversionsfelt 4.0.308 → 4.0.309.

Se DEC-0107.
