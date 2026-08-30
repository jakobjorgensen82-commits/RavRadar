# RavRadar 4.0.309

Dato: 2026-08-29

## Ekstern produktionsvagthund

- GitHub ejer fortsat den normale vejrproduktion ved UTC-minut 14/29/44/59.
- Ét eksternt cron-job må kalde cache-/watchdogworkflowet ved 04/19/34/49 med `external_watchdog=true`.
- Kaldet er normalt en no-op og kan kun bestille én ikke-tvungen produktion efter den eksisterende 45-minutters dobbelte stilhedskontrol.
- Copernicus-pilot, intern retry, cachebevaring og de to concurrencygrupper bevares.

## Afgrænsning og verifikation

- Målrettede workflow-, heartbeat-, watchdog- og håndbogskontrakter, RDKS, releasegate og hele lokale `validate:source` er grønne.
- PR #221 bestod exact-head `33244011544` på `6046e8a3`, blev merged som `aba3d669`, og produktion `33244062982` frigav komplet `rr-20260829085521-210` gennem fuld validate/releasegate og Pages.
- Præcis ét aktivt eksternt job, id `8348098`, er dokumenteret. Manuel test `33244853536` og de første automatiske kald `33245204517`/`33245798817` gav HTTP 204 og korrekt no-op ved frisk produktion.
- Det automatiske 09:34 UTC-kald sprang ikke over på grund af et nyt native schedule; intet produktions-`schedule` fandtes omkring 09:29, og det offentlige manifest var fortsat kun cirka 39 minutter gammelt.
- Ingen model-, score-, vejrinput-, state-, recovery-, geometri- eller punktændring.
- Geodata må kun ændre topversionsfelt 4.0.308 → 4.0.309.

Se DEC-0107.
