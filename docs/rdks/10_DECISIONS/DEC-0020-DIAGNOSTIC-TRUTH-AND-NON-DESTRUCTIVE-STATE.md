# DEC-0020 – Diagnostisk sandhed og ikke-destruktiv tilstand

**Status:** IMPLEMENTERET i 4.0.73

## Beslutning
En diagnostik må ikke fremstille cache, manglende måling i en bevidst sprunget kørsel eller browserens memory-cache som en funktionsfejl. Omvendt må reelle fejl aldrig skjules bag en kort HTTP-status.

- Supabase-fejl vises med status, kode, message, details og hint, når de findes.
- Stationsregister og leveringshistorik er vedvarende tilstand og må ikke forringes af en nyere, men informationsfattigere fil.
- Observationsstatus, prognosecache og samlet anvendelighed holdes adskilt.
- Performance er en advarsel, medmindre en kritisk ressource eller brugerrejse faktisk fejler.
- Helhedstesten skal navngive den konkrete ressource eller handling, som fejler.
