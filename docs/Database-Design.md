# Database Design 1.0

## Kerneentiteter

- `observations`: brugerens fund/ikke-fund med snapshot.
- `weather_observations`: normaliserede fortløbende målinger pr. zone og tidspunkt.
- `knowledge_rules`: regelidentitet, status og geografisk omfang.
- `knowledge_rule_versions`: uforanderlige versioner af betingelser, effekt, kilde og tillid.
- `score_evaluations`: reproducerbar beregning af basis-, regel- og slutscore.
- `observation_rule_matches`: hvilke regelversioner der påvirkede en observation.
- `analysis_exports`: audit af genererede analyseudtræk.

## Persondata

Standardanalyse bruger pseudonymiseret identifikator. Præcis GPS bør afrundes eller erstattes af zone/rumlig celle før eksport. RLS skal sikre, at brugere kun ser egne observationer, mens aggregerede offentlige resultater leveres gennem kontrollerede views eller serverfunktioner.

## Reproducerbarhed

Vejrsnapshot, algoritmeversion og anvendte regelversioner gemmes på observationstidspunktet. Dermed kan en historisk score genskabes, selv hvis aktive regler senere ændres.
