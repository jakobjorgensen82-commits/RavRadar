# P1 – snæver genprøvning af Supabase statement-timeout i 4.0.226

## Evidens

GitHub Actions #31904109833/#2814 forsøg 1 kørte alle faglige data- og releasegates grønt, byggede supportartifactet og stoppede derefter ved beskyttet Supabase-sync. `weather-health` blev skrevet, mens den efterfølgende `runtime-diagnostics`-upsert svarede HTTP 500 med PostgreSQL-kode `57014` og teksten `canceling statement due to statement timeout` efter cirka 19 sekunder. Pages blev korrekt ikke bygget eller deployet.

Payloaden er cirka 17,7 MB. Den samme idempotente upsert lykkedes i #2810 og #2812 på cirka 11,5 sekunder. En uændret rerun af #2814 lykkedes på cirka 10,3 sekunder og gennemførte derefter Supabase og Pages. Det beviser en transient belastningshændelse, men også at enkeltstående databaseforsinkelse kan stoppe et ellers gyldigt releaseforløb.

## Afgrænset design

Den fælles Supabase-requester genprøver kun, når responsen samtidig er HTTP 500 og det parsebare PostgREST-felt `code` er `57014`. Der udføres højst to forsøg i alt. En anden timeout returneres som fejl med den oprindelige operation, metode, status, kode og fejltekst.

`57014` betyder, at PostgreSQL annullerede statementet; den første transaktion er derfor ikke committet. Genprøvningen gentager samme `admin_documents`-upsert med samme `document_key` og payload. Der tilføjes ingen bred retry af 5xx, netværksfejl eller vilkårlige databasekoder.

## Gate

Regressionen beviser én recovery, præcis to kald, logget timeoutårsag, fail-closed ved to `57014` og ingen retry ved andre status-/kodekombinationer. Den eksisterende snævre `PGRST303`-genprøvning består fortsat uændret.

#31905211459/#2816 på commit `2dc8253a4c7f77449d6f92dcc9c996f211f033d2` gennemførte central adminhydrering, frisk DMI, fuld `validate`, releasegate, supportartifact, beskyttet Supabase-sync og Pages-deploy. `runtime-diagnostics` blev skrevet i første forsøg på cirka 11,5 sekunder, så produktionen beviser den uændrede normalvej, mens den kontrollerede regression beviser timeout-recoveryen. Der blev ikke fremprovokeret en database-timeout.

Artifactet `RavRadar-support-2816` har datasæt `rr-20260815195620-210`: 210 zoner, 22.890/22.890 routede DMI-vandstandstimer med fuld collection, model-run, lead time, forecastalder, native tider, routing og source keys samt 210/210 komplette rækker ved aktuel 19:00 UTC. Begge offentlige manifesthashes matcher artifact og den direkte Pages-kontrol.
