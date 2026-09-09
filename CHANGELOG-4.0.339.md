# RavRadar 4.0.339 – sikker recovery efter SQL-stop

## Hvad der skete

4.0.338 bestod exact-head-kildegaten `34348151097` og blev merged via PR #272 som `208e878453d6d8a21b8ce879eac050d664c50c40`. Backendrun `34350871769` bestod migrationsliste, dry-run, exact-main-CAS og `--skip-vault`. Migration 1–3 blev anvendt. Migration 4 stoppede på PostgreSQL `SQLSTATE 42601`; dens transaktion rullede helt tilbage, og migration 5–8 samt D1, Edge, Worker og protected readiness blev ikke kørt.

## Rettelsen

- Det fælles PL/pgSQL-udtryk bruger nu `IS DISTINCT FROM (CASE ... END)` i alle fem pending migrationer, schemaet og installationskopien.
- Ingen database-, score-, vejr-, geometri- eller punktsemantik ændres.
- En ny regressionstest afviser den oprindelige form, scanner al Supabase-SQL og kræver, at de syv kanoniske kopier er identiske.
- Hele migrationssuffixet 4–8 er kørt i rækkefølge på isoleret PostgreSQL 16 uden syntaksfejl. Partial-recovery-, installer-, readiness-, releasepolicy- og workflowtests er grønne.

## Afgrænsning og næste bevis

Ejeren har udtrykkeligt godkendt, at DEC-0122's materielt uændrede one-shot first-cutover-undtagelse flyttes til exact-release 4.0.339. Den gælder fortsat kun ved archive højst 50 MB og alle eksisterende storage-, checkpoint-, integrity-, privacy-, readback-, closure- og releasekrav. 4.0.340 arver den ikke.

4.0.339 er endnu ikke exact-head-valideret, merged eller produktionsverificeret. Næste backendrun skal se præcis migration 1–3 applied og 4–8 pending og bevise hele DB-/D1-/Edge-/readiness-kæden. Derefter kræves en komplet oneoff på samme eksakte 4.0.339-main-head før modelcutover. Candidate G forbliver offentlig indtil fuld verifikation.
