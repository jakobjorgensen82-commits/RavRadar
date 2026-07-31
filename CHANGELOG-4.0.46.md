# RavRadar 4.0.46 – sikker geometri-rollback og fundament

- Ruller kun den fejlslagne 4.0.45-kystgeometri tilbage til den senest auditerede 4.0.44-geometri.
- Bevarer scorefarver og stjerneændringer fra 4.0.45.
- Bevarer begge komplette geometri-snapshots under `data/geometry-snapshots/`.
- Tilføjer deterministisk rollback-script og automatisk test.
- Ingen Supabase- eller databasemigration.
- Den kommende højopløselige naturlige kystlinje må først aktiveres, når hele Danmark er valideret mod en detaljeret kilde, og havne/moler er filtreret uden funktionstab.
