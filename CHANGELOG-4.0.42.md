# RavRadar 4.0.44 – central lagring, rettigheder og stationsaudit

- Gendanner tydelig Supabase-status på admin-overblikket og i topbjælken.
- Automatisk fornyelse af Supabase access-token og ét sikkert genforsøg ved HTTP 401.
- Central lagring verificeres ved at læse dokumentet tilbage efter skrivning.
- Statusoversigt for regler, regelhistorik, stationrouting og retningsreviews.
- Regelhistorik gemmes nu centralt i Supabase og ikke kun lokalt.
- Ekspertrettigheder håndhæves i admin-navigation og ved regelaktivering.
- Ny SQL-migration med dokumentbaseret RLS, sikre RPC-funktioner og auditlog.
- Kildeangivelse sættes kun til fallback, når fallback faktisk indeholder gyldige værdier.
- Manglende Limfjordsdata markeres som `missing` i stedet for falsk Open-Meteo-kilde.
- Officielt dokumenterede Hals Havn og Hals Barre Fyr føjes til det persistente stationsregister, selv hvis OceanObs ikke returnerer dem i en kørsel.
- Stationssøgning med navn, ID, status, koordinater og zoom på admin-kortet.
