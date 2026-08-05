# RavRadar 4.0.104

## Rettet
- Administratorvalg oprettes nu i det centrale routingdokument allerede ved første klik i en zone. Dermed aktiveres override og den valgte kilde vises rødt, også når zonen ikke tidligere havde en routingpost.
- Manglende (`null`) vandstandsdata fra et DMI-prognosepunkt kan ikke længere blive konverteret til tallet `0`.
- En prognosekilde uden reelle værdier bliver ikke længere markeret som modtagende eller routingberettiget og kan derfor ikke overskrive en fungerende zoneprognose med en kunstig nulserie.

## Beskyttelse
- Ny regressionstest dækker begge fejl samlet: første administratorvalg og null-til-nul-fejlen i femdøgnsserien.
- DMI-hentning, observationskæde, automatisk kildevalg, geografiske vægte, RavScore og strømpile er ikke ændret.
