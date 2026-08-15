# P1 – aktuel klokktime mistede routet vandstandsproveniens i #2801

## Evidens

Den naturlige GitHub Actions-kørsel #31897098322/#2801 byggede datasæt `rr-20260815170259-210`. Supportartifactets SHA-256 var `f09543ef90fba1f3b905a4c22a67286a65a02f87b83ded220107f1902fdb56d0`.

Artifact #2800, genereret 16:47 UTC, havde fuld collection- og model-run-identitet på alle routede vandstandstimer. #2801 blev genereret 17:02 UTC og havde præcis 210 DMI-vandstandstimer uden collection og model-run. Alle lå ved `2026-08-15T17:00:00.000Z`, én pr. aktiv zone. De efterfølgende timer havde fortsat fuld identitet.

## Rodårsag

Den offentlige prognose bevarer korrekt den igangværende klokktime. Det separate vandstandskildeindeks startede derimod ved `ceil(generatedAt)`. Efter 17:00 blev indeksets første time derfor 18:00, så routingen ikke kunne erstatte den generiske zonemodels kildeoplysning på 17:00-rækken.

## Afgrænset rettelse

`buildDmiForecastHourly` kan nu modtage et separat `startAt`. Vandstandskildeindekset starter ved den aktuelle hele UTC-time, mens `generatedAt` fortsat er den faktiske byggetid og bruges til forecastalder og øvrig provenance.

Der ændres ikke vandstandstal, kildepunkter, routingvalg, geografiske vægte, continuity, fallback, RavScore, historik, hav-/landpunkter eller zonegeometri.

## Gate

En regression genererer kl. 06:02 UTC, kræver routet provenance på 06:00 UTC og kontrollerer, at forecastalderen er 6,03 timer frem for en kunstigt afrundet seks timer. Fuld produktion skal efter push vise nul DMI-vandstandstimer uden collection/model-run, herunder den igangværende time.

En read-only genafspilning af det faktiske #2801-supportartifact gennem den rettede routing gav fortsat 210 anvendte og 0 ufuldstændige zonevalg. Alle 23.310 DMI-vandstandstimer fik collection og model-run, inklusive 210/210 rækker ved `2026-08-15T17:00:00.000Z`. Det afgrænser virkningen til provenancevinduet og viser, at routingdækningen ikke ændres.
