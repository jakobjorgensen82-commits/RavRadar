# RavRadar 4.0.205

## Rettet

- Central serveradgang bruger én fælles Supabase-requester med korrekt `apikey`-kontrakt for nye `sb_secret_`-nøgler.
- Python-hydreringen før DMI følger samme snævre retryregel og stopper fail-closed i GitHub Actions, hvis centrale ejerdata ikke kan læses.
- Den dokumenterede, enkeltstående Supabase-fejl HTTP 401 / `PGRST303` genprøves præcis én gang efter ét sekund. Alle andre eller gentagne adgangsfejl stopper fortsat fail-closed.
- Beskyttet adminsync maskerer ikke længere en manifestlæsefejl som et manglende manifest. Dermed undgås både skjult datarisiko og unødvendige genskrivninger på Supabase free-kvoten.
- National, Blåvand og godkendt-offentlig central roundtrip samt den almindelige Supabase-persistenstest bruger samme sikre kald.
- Versionsværktøjet springer private genererede `KYSTZONER-*`-reviewkort over.

## Verifikation

- Nye regressioner dækker secret-/legacy-headere, præcis én tilladt genprøvning, afvisning af andre og gentagne auth-fejl, fail-closed manifestlæsning samt at den målrettede workflow ikke kan deploye.
- Ny manuel workflow kan genbruge det kompakte private artifact fra #31815423082 og køre kun den centrale nationale roundtrip/rollback. Den har ingen Pages-skriverettighed og bygger ikke ny DMI.
- Den målrettede centrale roundtrip/rollback bestod i #31822371489. Den normale produktionskørsel #31822335540 bestod frisk DMI, fuld validering, releasegate, central synkronisering, artifact og deploy af 4.0.205.
- Privat #31822748625 bestod hele den nationale kilde-, geometri-, punkt-, DMI-, state-, vind-, shadow-, ejerreview- og centrale admin-roundtrip/rollbackkæde. Kørslens eneste efterfølgende fejl var en manglende outputmappe i den private fallbackbygger; den ændrede ikke offentlig geometri eller centrale ejerdata.

## Ikke ændret

- Offentlig geometri, RavScore, lokale land-/vandpunkter og centrale ejerdata ændres ikke af denne release.
