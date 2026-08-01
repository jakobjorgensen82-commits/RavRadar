# RavRadar 4.0.67

## Rettelse af GitHub Actions-regression

- `manifest.json` og `conditions.json` hydreres nu som ét atomisk vejrdatasæt.
- Hydreringen afviser et deployet sæt, hvis de to filer ikke har samme `datasetId`.
- Begge filer skrives eller bevares samlet, så en nyere deployet `conditions.json` ikke kan kombineres med et ældre indchecket manifest.
- Ny regressionstest beskytter workflowrækkefølgen, som udløste fejlen i 4.0.66.
