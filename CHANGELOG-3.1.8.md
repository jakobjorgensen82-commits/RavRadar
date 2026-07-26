# RavRadar 3.1.8

## Rettet

- Tilbageført 179 `onshoreDirectionDeg`-værdier, som den tidligere punkt-bearing-audit havde overskrevet uden geografisk bevis.
- `DK-E-02 – Djursland nord og øst` er gendannet til 260°, så strøm mod øst klassificeres som udgående.
- Automatisk `--apply` i onshore-auditten er deaktiveret. `dataPoint` og `pinPoint` må ikke længere bruges som automatisk bevis for hav→land-retningen.
- Regressionstest sikrer, at strøm mod øst ved Djurslands østkyst udløser loftet for kraftigt udgående strøm.

## Debug-tilstand

Zonepanelet indeholder nu **Debug: vis alle mellemregninger** med:

- zone-ID og datakilde,
- konfigureret pålandsretning og dokumentationskilde,
- rå strømretning som oceanografisk mod-retning,
- rå vindretning som meteorologisk fra-retning,
- vinkel mellem strøm og pålandsretning,
- fysisk klassifikation af strøm og vind,
- alle transporttrin med pointændringer,
- transportscore før og efter scorelofter,
- anvendte caps,
- komponenter, vægte, bidrag, adaptive justeringer og AI-output.
