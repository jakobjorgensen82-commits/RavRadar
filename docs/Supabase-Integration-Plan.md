# Supabase Integration Plan 1.0

1. Opret udviklingsprojekt og kør schema/migrationer.
2. Konfigurér Auth som valgfri funktion.
3. Implementér offline kø og idempotent upload af observationer.
4. Upload vejrhistorik via server-side job, ikke direkte fra klienten.
5. Implementér admin-roller i en separat tabel og håndhæv dem server-side.
6. Opret eksportfunktion, der fjerner direkte identifikatorer og reducerer GPS-præcision.
7. Kør shadow-evaluering af regelmotor før den påvirker offentlig RavScore.
