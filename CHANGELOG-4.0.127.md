# RavRadar 4.0.127

## GeoDanmark entity-lag hotfix

- Dokumenterer pilot #1928: GitHub-secret, central adminhydrering og workflowisolation virkede; featurehentningen stoppede ved lagidentifikation.
- Læser kun WFS `FeatureType/Name` og vælger deterministisk det aktuelle `Kyst_current`-lag.
- Afviser historiklag og beslægtede, men forkerte navne.
- Gemmer ved ukendt lagkontrakt en secret-fri capabilitiesrapport i pilotens private artifact.
- Tilføjer regressionstest for eksakt, `_current`, `_hist` og falske præfiksmatch.

## Ikke ændret

- Ingen aktive zoner, kystlinjer, adminrettelser, produktionsdata eller RavScore ændres.
- Første faktiske GeoDanmark-featureudtræk afventer en grøn genkørsel.
