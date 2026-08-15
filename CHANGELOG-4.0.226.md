# RavRadar 4.0.226

## Rettet

- Beskyttet Supabase-sync genprøver nu præcis én gang, når PostgREST svarer HTTP 500 med PostgreSQL-kode `57014` for statement-timeout.
- Den genprøvede skrivning er den samme idempotente `admin_documents`-upsert. PostgreSQLs annullerede statement har ikke committet den første transaktion.
- En anden `57014`, andre HTTP 500-fejl, netværksfejl og øvrige auth-/databasefejl stopper fortsat releasekæden fail-closed.

## Produktionsfund

- #31904109833/#2814 forsøg 1 bestod frisk DMI, fuld `validate`, releasegate, vejrcache og supportartifact, men stoppede før Pages, da den cirka 17,7 MB store `runtime-diagnostics`-upsert ramte statement-timeout efter cirka 19 sekunder.
- Samme upsert lykkedes i #2810 og #2812 på cirka 11,5 sekunder og i #2814 forsøg 2 på cirka 10,3 sekunder. Forsøg 2 gennemførte Supabase og Pages uden kodeændring, hvilket afgrænser hændelsen som transient men gentagelig driftsrisiko.

## Uændret

- Ingen Supabase-timeout hæves, og ingen fejl omklassificeres som succes.
- Adminpayload, versionering, beskyttet manifest, DMI, vejrdata, vandstand, RavScore, historik og geometri er uændrede.

## Validering

- Regressionen dækker recovery efter én eksakt `500/57014`, vedvarende `57014`, andre databasekoder og den eksisterende `PGRST303`-authgenprøvning.
- Workflow-gatetesten normaliserer CRLF og LF før trinafgrænsning, så Windows og GitHub kontrollerer samme uændrede workflowbetingelser.
- #31905211459/#2816 på commit `2dc8253a4c7f77449d6f92dcc9c996f211f033d2` bestod central adminhydrering, frisk DMI, fuld `validate`, releasegate, supportartifact, beskyttet Supabase-sync, Pages-artifact og deploy.
- Den virkelige `runtime-diagnostics`-upsert lykkedes i første forsøg på cirka 11,5 sekunder. Timeoutgrenen blev derfor ikke aktiveret mod produktion; den er dækket af den målrettede regression.
- Artifactdatasæt `rr-20260815195620-210` og direkte Pages-kontrol viser 4.0.226, 210 zoner, matchende manifesthashes, 22.890/22.890 komplette DMI-vandstandstimer og 210/210 komplette rækker ved aktuel 19:00 UTC.
