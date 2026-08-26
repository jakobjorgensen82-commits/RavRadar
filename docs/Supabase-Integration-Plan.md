# Supabase Integration Plan 1.0

1. Opret udviklingsprojekt og kør schema/migrationer.
2. Konfigurér Auth som valgfri funktion.
3. Implementér offline kø og idempotent upload af observationer gennem Supabase Edge.
4. Upload vejrhistorik via server-side job, ikke direkte fra klienten.
5. Implementér admin-roller i en separat tabel og håndhæv dem server-side.
6. Opret eksportfunktion, der fjerner direkte identifikatorer og reducerer GPS-præcision.
7. Kør shadow-evaluering af regelmotor før den påvirker offentlig RavScore.

## Aktiv turlagerarkitektur fra 4.0.287

Supabase beholder Auth, profiler, rettigheder, rate limit og Edge. Normal turvækst går til ti EU-låste Cloudflare D1-shards gennem en privat HMAC-signeret Worker. Kun HMAC-pseudonym og allowlistede turfelter sendes; rå bruger-id, mail, navn, JWT, GPS og rute er forbudt.

`TRIP_STORAGE_MODE=supabase` er den eksplicitte rollback. Der dual-writes ikke normalt. Eksisterende/rollback-rækker migreres idempotent før og efter et D1-cutover uden at slette Supabase-kilden. Se DEC-0082.

Den bindende operative rækkefølge og nøglehåndtering står i `docs/Trip-Storage-Operations.md`.
