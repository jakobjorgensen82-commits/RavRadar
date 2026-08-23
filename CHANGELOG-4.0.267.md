# RavRadar 4.0.267

- Lukker to lag i den resterende uploadfejl: den aktive Supabase-tabel manglede `forecast_target_at` og `report_accuracy`, og klientens privatlivskontrol afviste den krævede tomme værdi `gps=null`, før en tur blev gemt eller sendt.
- Tilføjer de to felter med en databevarende og idempotent migration. Ingen eksisterende tur ændres eller slettes.
- Tillader kun lokationsfelter med værdien `null`; GPS, koordinater, positioner, ruter og spor med en faktisk værdi er fortsat blokeret.
- Udvider regressionen, så alle POST-only-felter for kontoindberetningen findes i en produktionsmigration, `gps=null` accepteres, og ikke-tomme lokationsdata afvises.
- Rettelsen dækker både kontoens efterregistrering og **Start ravtur → Slut ravtur**.
- De to tidligere ejerforsøg nåede hverken den lokale kø eller databasen og skal derfor indberettes igen efter udgivelsen.
- Score, Candidate G, `20/50/30`, vejrdata, geometri og land-/vandpunkter er uændrede. Geodatafilerne ændrer kun versionsfelt til 4.0.267.
