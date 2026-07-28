# RavRadar 4.0.11

## Workflow validator repair

- `validate-weather-health.mjs` understøtter nu både den gamle `status`-model og den strukturerede health-model.
- Topstatus `degraded` accepteres nu som en gyldig driftstilstand.
- De strukturerede felter valideres hver for sig:
  - `serviceStatus`
  - `userForecastStatus`
  - `dmiCoverageStatus`
  - `apiConnectivityStatus`
- Validatoren fejler fortsat ved ukendte værdier eller en ufuldstændig struktureret statusmodel.
- Workflowets versionsreferencer er opdateret til 4.0.11.
- Weather Engine-versionen er opdateret til 2.17.1.
