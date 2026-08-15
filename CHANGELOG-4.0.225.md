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
- Produktionsverifikation afventer første fulde GitHub-kørsel efter push.
