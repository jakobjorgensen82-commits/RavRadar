# RavRadar 4.0.225

## Rettet

- Vandstandsroutingens kildeindeks bevarer nu den igangværende UTC-klokktime, selv når vejrbygningen starter få minutter efter hel time.
- Den routede vandstandstime får dermed fortsat de valgte punkters faktiske DKSS-collection(s), model-run, lead time, forecastalder, native tider, routingmetode og source keys.
- Forecastalder beregnes fortsat fra den faktiske genereringstid; kun routingvinduets start afrundes ned til den aktuelle time.

## Produktionsfund

- Artifact #2800 havde nul routede DMI-vandstandstimer uden collection/model-run.
- Artifact #2801, genereret 17:02 UTC, havde præcis 210 udokumenterede timer ved 17:00 UTC – én pr. aktiv zone.
- Vandstandsværdier, valgte punkter, routing, vægte, continuity, fallback, RavScore, historik og geometri er uændrede.

## Validering

- Regressionen kører med generering kl. `HH:02`, kræver den aktuelle `HH:00`-time og kontrollerer både sammensat collection og faktisk forecastalder.
- Read-only replay af #2801 bevarer 210 anvendte/0 ufuldstændige routingvalg og giver collection/model-run på 23.310/23.310 DMI-vandstandstimer, inklusive 210/210 i aktuel time.
- GitHub Actions #31902872631/#2810 bestod central adminhydrering, frisk DMI, fuld `validate`, releasegate, Supabase, Pages-artifact og deploy på commit `18499eb10a45f561d4440a7944b34725049cf34d`.
- Supportartifactet indeholder datasæt `rr-20260815190651-210`: 22.890/22.890 routede DMI-vandstandstimer har collection, model-run, lead time, forecastalder, native tider, routing og source keys. Den aktuelle 19:00-time er komplet i 210/210 zoner.
- Det komplette manifests to publiceringshashes matcher filerne, og direkte kontrol efter #2810 viste version 4.0.225 og samme 210-zone-datasæt på Pages.
- Den efterfølgende dokumentationskørsel #31903561423/#2812 gentog alle fulde gates og deploy. Datasæt `rr-20260815192135-210` har samme 22.890/22.890 komplette routede timer og 210/210 i aktuel time; sundheds-, DMI-dæknings- og API-status var `ok`.
