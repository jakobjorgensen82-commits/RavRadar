# Administrator-system 1.0

## Første version

- dashboard for datakvalitet og API-status
- liste over regler med status, type, geografi, tillid (`lav`, `mellem`, `stor`) og seneste version
- formular til ny regelversion
- test af regel mod valgt zone og historisk tidsrum
- shadow-resultat: hvor meget reglen ville have ændret eksisterende scores
- eksport af pseudonymiserede observationsdata
- auditlog over ændringer

## Adgang
Developer-mode PIN 1931 er kun et lokalt udviklingsværktøj og må ikke betragtes som produktionssikkerhed. Produktionsadministration kræver Supabase Auth, admin-rolle og server-side autorisation.

## Vejrstatus og alarmbegrænsning

Administratorens vejrpanel skal læse `weather-health.json` og senere `weather_ingestion_status`. DMI-problemer må højst udløse to administratorbeskeder pr. 24 timer. Panelet viser fortsat gul/rød status uden at sende flere beskeder.

Administrator skal kunne starte en kontrolleret oprydning af vejrhistorik med valgt skæringsdato. Oprydningen må aldrig slette `observations.weather_snapshot` eller andre snapshots knyttet til brugerfund.
