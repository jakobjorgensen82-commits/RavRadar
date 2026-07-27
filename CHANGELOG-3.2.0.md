# RavRadar 3.2.0 – ekstern scheduler og intelligent opdateringskontrol

## Ekstern trigger som fast driftsmodel

- GitHubs ustabile `schedule:`-trigger er fjernet.
- `workflow_dispatch` er den primære automatiske indgang og er kompatibel med cron-job.org-kaldet, der kun sender `{ "ref": "main" }`.
- Den manuelle GitHub-knap har et valgfrit `force`-felt til en fuld genkørsel.

## Intelligent preflight

- Et let Python-tjek undersøger de nyeste DMI-modelkørsler før installationer og downloads.
- En tung vejropdatering starter straks ved en nyere DMI-model.
- Uden nye modeller køres en sikker periodisk opdatering senest efter 30 minutter, så Open-Meteo, observationer og øvrige aktuelle forhold ikke bliver gamle.
- Friske 10-minutters kald afsluttes hurtigt uden deploy.

## Vedvarende data uden voksende Actions-cache

- Seneste livefiler hydreres fra den allerede deployede GitHub Pages-side.
- Den tidligere cache med en unik `github.run_id` pr. kørsel er fjernet, så repositoryets Actions-cache ikke vokser for hvert cron-kald.
- DMI bulk-download kan gennemtvinges, når preflight finder en ny model, selv hvis den lokale cache er under 60 minutter gammel.

## Workflowoptimeringer

- Hele testsuiten køres ved push og tvungen manuel kørsel, men ikke ved hvert almindeligt 10-minutters cron-kald.
- Pages-artifaktet bygges i `_site` og udelader Git-historik, scripts, dokumentation og øvrige udviklingsfiler.
- Python-afhængigheder er samlet i `requirements-dmi.txt`.
