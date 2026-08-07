# RavRadar 4.0.117 – aktiv-zone scheduler og DMI-vind recovery

## Rodårsag
Produktion #1717 bekræftede, at 4.0.116 fjernede U/V-grid-mismatch, men DMI-vind havde fortsat ingen 24/96-timers dækning. Schedulerens dækningsnævner kom fra den gamle bulkcache i stedet for det aktuelle aktive zoneregister. Samtidig hed HARMONIE-familien `wind`, mens den gamle mangeltabel brugte `atmosphere`, så reel vindmangel kunne rangeres som nul.

## Ændring
- Schedulerens nævner er nu altid det aktuelle aktive zoneregister.
- Nye aktive zoner uden cache tæller eksplicit som manglende; udgåede cachezoner tæller ikke.
- Vind bruger konsekvent familien `wind` i både collection-mapping og deficitberegning.
- Hvis en aktiv zone helt mangler marinegrundlag, er DKSS fortsat ubetinget først.
- Når marinegrundlaget findes for alle aktive zoner, men 96-timershorisonten stadig bygges, kan en helt udsultet vind-/bølgefamilie få næste prioritet efter marine.
- `scheduleCoverageBeforeRun` beskriver nu samme aktive zoner og samme dækning, som scheduleren faktisk beslutter ud fra.
- Marine audits og DMI-only transportkravet er uændrede.

## Regression
Ny scheduler-kontrakttest beskytter aktiv-zone-nævner, `wind`-familien og marine-first. Ældre tests er opdateret til at validere kravet frem for 4.0.110-implementationsdetaljer.

## Hotfix efter produktion #1728 – geografisk DKSS-recovery
Produktion #1728 nåede gennem DMI-opbygning, public runtime og referencezoner, men fejlede i den strenge strømaudit, fordi tre aktive Limfjordszoner manglede i den friske bulkcache. Schedulerens to produktive slots gik til `dkss_nsbs` og `dkss_idw`, mens `dkss_lf` stod som nummer tre og derfor aldrig blev forsøgt.

Hotfixen lader aktive zoners konkrete marinegrundlagsmangler og kysttype styre rækkefølgen inden for DKSS-familien. Den eksisterende model-penalty afgør geografisk førstevalg, og modellen der kan lukke flest reelle datagab kommer før historiske attempt-tider. Mod #1728-state bliver rækkefølgen `dkss_lf`, `dkss_nsbs`, `dkss_idw`, fordi 11 mangler er Limfjord og 1 er vestkyst. Runtimebudget, DMI-only strøm, fælles U/V-gitterpunkt og den strenge strømaudit er uændrede.

Schedulerregressionen er udvidet med en egentlig adfærdstest. Seks nyere projektchats er samtidig arkiveret som CHAT-0008–CHAT-0013, og chatmanifestets validator er gjort dynamisk uden at hardcode antallet af historiske chats.
