# Database Design 1.0

## Kerneentiteter

- `observations`: Supabase-rollback og migrationskilde for brugerens fund/ikke-fund.
- Cloudflare D1 `trip_observations`: normalt EU-lager fordelt på ti shards med HMAC-pseudonym, kanonisk payload-hash og uden direkte identitet/GPS.
- `weather_observations`: normaliserede fortløbende målinger pr. zone og tidspunkt.
- `knowledge_rules`: regelidentitet, status og geografisk omfang.
- `knowledge_rule_versions`: uforanderlige versioner af betingelser, effekt, kilde og tillid.
- `score_evaluations`: reproducerbar beregning af basis-, regel- og slutscore.
- `observation_rule_matches`: hvilke regelversioner der påvirkede en observation.
- `analysis_exports`: audit af genererede analyseudtræk.

## Persondata

Supabase Auth er identitetssandhed. Edge-gatewayen erstatter bruger-/anonym-id med et versionsbåret HMAC-pseudonym, før normale ture sendes til D1. Præcis GPS, rute, mail, navn og JWT sendes aldrig med. Ejerens private læsning går gennem samme autentificerede Edge-grænse; Cloudflare er ikke offentligt læse- eller skrivebart. Supabase-tabellen bevares som eksplicit rollback, ikke som normal dual-write. Se DEC-0082.

## Reproducerbarhed

Vejrsnapshot, algoritmeversion og anvendte regelversioner gemmes på observationstidspunktet. Dermed kan en historisk score genskabes, selv hvis aktive regler senere ændres.
