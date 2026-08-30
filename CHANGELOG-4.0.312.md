# RavRadar 4.0.312-kandidat

Dato: 2026-08-29

## Snæver roll-forward efter PostgreSQL-deparserfejl

- PR #224 på head `4c4699fe3a87a3b804da1d8beea204e4144a7a76` bestod exact-head CI `33263734108` og blev merged som `7c168b00af535415117c968a8c021a493b083137`.
- Den efterfølgende pushkørsel `33263858078` var grøn, men first-release-interlocken gjorde den korrekt til en no-op uden vejrbyg, artifact eller Pages, fordi exact-head `[d1]`-readiness endnu ikke var live.
- Backendkørslen `33263892151` sendte den transaktionelle Candidate G-trip-quality-CHECK-migration og modtog HTTP 201. Den efterfølgende read-only katalogkontrol afviste alene PostgreSQLs semantisk ækvivalente venstreparentesering i `pg_get_constraintdef`.
- Migrationen kører som én transaktion og indeholder ingen `INSERT`, `UPDATE` eller `DELETE`. Den eneste realistiske live-tilstand er derfor enten en fuldt committed, valideret og kommenteret CHECK eller en fuld rollback; ingen halv eller uvalideret constrainttilstand kan være efterladt.
- Kørslens stop skete før D1-klargøring, Edge, Worker, sync, vejropdatering, artifact og Pages. Ingen observationpayloads blev hentet til runneren eller logget, og ingen rækker blev muteret. Constraintens interne `VALIDATE` kan have scannet rækker i databasen uden at ændre dem.

## Rettelsen

- Den flade regex mod deparserteksten er erstattet af en balanceret og quote-bevidst udtrækning af SQL-funktionskald.
- Verifikatoren kræver præcis ét `jsonb_path_query_array`-kald med alle tre forseglede quality reasons i kanonisk rækkefølge. Semantisk uvæsentlige parenteser accepteres; ombytning, dubletter, ekstra predicates, ubalancerede kald og tvetydige ekstra kald afvises fail-closed.
- Regressionen bruger realistisk PostgreSQL-deparsertekst og dækker både venstre- og højreparentesering samt negative ordens-, dublet-, ekstra-predicate- og flerkaldscases.
- 4.0.312 bevarer first-release-interlocken, så ingen Pages-/vejrproduktion kan passere, før den eksakte 4.0.312-main har et grønt `[d1]`-backendbevis.
- Migrations-SQL, database-schema, constraintsemantik, Edge, D1, Worker, tripruntime, Candidate G, RavScore, DMI/Copernicus, rekonstruktionslogik, geometri og land-/vandpunkter er uændrede.

## Status

Den målrettede verifier-/storage-test, hele lokale `scripts/validate-source.ps1`, releasegate, RDKS-/håndbogsidentitet og det separate geodata-topversionsbevis er grønne. Exact-head PR, merge, ny live `[d1]`-backendkørsel, rekonstruktionens inspect/apply, frisk produktion, Pages og offentlig desktop/mobil/210/673-verifikation mangler. Offentlig RavRadar er fortsat produktionsverificeret 4.0.310; 4.0.311 er kun merged kilde og ikke en produktionsrelease.

Se DEC-0109.
