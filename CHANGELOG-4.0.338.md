# RavRadar 4.0.338 – robust Supabase CLI-output før første backendwrite

Dato: 2026-09-09

## Ændret

- Supabase CLI fastlåses til præcis 2.117.0.
- Migration-list-parseren afklæder kun ét balanceret backtickpar omkring en hel Local- eller Remote-celle og kræver derefter fortsat en eksakt migrationsversion.
- Tabellen skal have præcis tre kolonner og én genkendt Local/Remote/Time-header; tidskolonnen må være `Time` eller `Time (UTC)`. Entydige local/remote-par, ingen dubletter og korrekt migrationsrækkefølge forbliver fail-closed.
- Dry-run skal bevise præcis én no-write-markør samt enten én entydig liste med eksakte unikke migrationsfilnavne eller ét eksakt up-to-date-resultat. Stdout og stderr kontrolleres samlet.
- Både dry-run og apply bruger `--skip-vault`, så den autoriserede plan er begrænset til de otte migrationer og ikke omfatter Supabase CLI's separate Vault-secret-opdatering.
- DEC-0122-engangsundtagelsen flyttes snævert til exact-release 4.0.338. Et 4.0.337-handoff kan ikke bruges på 4.0.338, fordi producent og consumer skal have samme main-head. Releaseversionsgaten binder policyen til `package.json`, så 4.0.339 ikke arver undtagelsen.

## Hændelsen

- Backend `34333553305` forsøg 1 stoppede i read-only migrationsliste med PostgreSQL `SQLSTATE 28P01`. Ejeren rettede `SUPABASE_DB_PASSWORD` kl. 09:54Z uden at eksponere værdien.
- Forsøg 2 bestod autentificering og read-only liste, men CLI 2.117.0's backtickindrammede tabelceller blev afvist under lokal historikhydrering.
- Begge forsøg stoppede før dry-run og første write. Migrationapply, database, D1, Edge, protected readiness og publicering blev ikke ændret; intet rollback er nødvendigt.

## Status

Parser- og workflowrettelsen er lokalt måltestet. 4.0.338 er endnu ikke exact-head-CI-valideret, merged eller runtime-/produktionsverificeret. 4.0.337 er merged som `af03659a`; oneoff `34333689292` fortsætter og har bestået legacy-cachematerialiseringen, men har endnu ikke terminalt bevist komplet vejr eller modelcutover.

Efter launch forbliver readiness-versionintervallets 4.0.337-selvattestation, stale run `34228112413`, cachetransport/cron-hold og test-lane-refaktorering åbne P0-opgaver.
