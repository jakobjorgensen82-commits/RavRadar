# RavRadar 4.0.339 – sikker recovery efter SQL-stop

## Hvad der skete

4.0.338 bestod exact-head-kildegaten `34348151097` og blev merged via PR #272 som `208e878453d6d8a21b8ce879eac050d664c50c40`. Backendrun `34350871769` bestod migrationsliste, dry-run, exact-main-CAS og `--skip-vault`. Migration 1–3 blev anvendt. Migration 4 stoppede på PostgreSQL `SQLSTATE 42601`; dens transaktion rullede helt tilbage, og migration 5–8 samt D1, Edge, Worker og protected readiness blev ikke kørt.

## Rettelsen

- Det fælles PL/pgSQL-udtryk bruger nu `IS DISTINCT FROM (CASE ... END)` i alle fem pending migrationer, schemaet og installationskopien.
- Ingen database-, score-, vejr-, geometri- eller punktsemantik ændres.
- En ny regressionstest afviser den oprindelige form i den konkrete validator og kræver identiske rettede udtryk i de syv kopier. Håndbogstekst og kommentarer må ikke udløse en falsk SQL-fejl.
- Efter PR #273's første gatefejl opdateres den forældede per-pair-referencehash; inversion af kun de to parenteser skal fortsat reproducere originalens SHA.
- Hele migrationssuffixet 4–8 er kørt i rækkefølge på isoleret PostgreSQL 16 uden syntaksfejl. Partial-recovery-, installer-, readiness-, releasepolicy- og workflowtests er grønne.

## Afgrænsning og næste bevis

Ejeren har udtrykkeligt godkendt, at DEC-0122's materielt uændrede one-shot first-cutover-undtagelse gælder exact-release 4.0.339 og om nødvendigt må overføres til 4.0.340 eller senere launchrettelser uden ny forespørgsel. Hver overførsel dokumenteres og bindes til én eksakt release/main-head. Archive højst 50 MB og alle eksisterende storage-, checkpoint-, integrity-, privacy-, readback-, closure- og releasekrav består; normal højfrekvent transport er ikke godkendt.

Den udvidede [Astra-helkædekontrol](docs/ai/LAUNCH_CHAIN_ASTRA_REVIEW_2026-09-09.md) dokumenterer positiv/negativ faktisk SQL-funktionsprøve, gemt weatherprogress med 301 rester og WAM MISSING_HOUR, korrekt samme-reference-handoff, ubetinget backendreadiness og de åbne OM-historik-/transportbegrænsninger. Den anbefaler ingen yderligere cachelæserrettelse eller lempelse af leverandørernes fysiske datakrav.

4.0.339 er endnu ikke exact-head-valideret, merged eller produktionsverificeret. Næste backendrun skal se præcis migration 1–3 applied og 4–8 pending og bevise hele DB-/D1-/Edge-/readiness-kæden. Derefter kræves en komplet oneoff på samme eksakte 4.0.339-main-head før modelcutover. Candidate G forbliver offentlig indtil fuld verifikation.
