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

## Produktionsbevis

GitHub Actions #31902872631/#2810 på commit `18499eb10a45f561d4440a7944b34725049cf34d` kørte central adminhydrering, frisk DMI-bulk, fuld projektvalidering, releasegate, vejrcachevalidering, supportpakke, Supabase, Pages-artifact og deploy som grønne trin.

Supportarkivet `RavRadar-support-2810.zip` har SHA-256 `4f3d6c6a05d0ee1c9b954410fe9e3069c028893ed4d5b0aa1e31ad3875b82177`. Datasæt `rr-20260815190651-210`, genereret `2026-08-15T19:06:51.916Z`, har 210 zoner og 22.890 routede DMI-vandstandstimer. Der er nul mangler i collection, model-run, lead time, forecastalder, native tider, routing og source keys. Alle 210 rækker ved den aktuelle `19:00`-time er DMI-routede og fuldt dokumenterede.

Manifestet er komplet, begge publiceringsfilers SHA-256 matcher, og direkte kontrol efter #2810 viste version 4.0.225 og samme datasæt på GitHub Pages.

Den efterfølgende dokumentationskørsel #31903561423/#2812 gentog alle fulde gates og deploy på commit `0c489f9c362a995ef6b613004ee3b828b58f012b`. Supportarkivet har SHA-256 `2190641c537304b8ea675c6f437c2ef7e11fa896b81a0614e09d8bc610858407`. Datasæt `rr-20260815192135-210` har igen 22.890/22.890 fuldt dokumenterede routede DMI-vandstandstimer og 210/210 ved aktuel 19:00-time. Direkte Pages-kontrol viste samme datasæt, og sundheds-, DMI-dæknings- og API-status var `ok`. Brugerfuldstændigheden er fortsat 209/210 på grund af det særskilte kendte bølgegab ved Feggesund; vandstand og strøm er 210/210.
