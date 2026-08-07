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


## Hotfix efter produktion #1738 – Limfjord U/V-kandidatsøgning
Schedulerrettelsen fra #1728 virker: #1738 kørte både `dkss_lf` og `dkss_nsbs` friskt. Den strenge strømaudit fejlede alligevel på `DK-B05-10`, `DK-B05-13` og `DK-B05-20`, fordi de fortsat ikke fik `conditions/public/bulk`. DMI-diagnostikken viste `NO_SHARED_UV_GRID_POINT`.

Rodårsagen var en forskel mellem den dokumenterede fysiske acceptgrænse og den faktiske søgeflade: Limfjordspunkter må bruge et dokumenteret fælles U/V-havpunkt op til 24 km væk, men kandidatproberne stoppede ved 0,14° og kandidatlisten ved 16 punkter. I smalle fjordløb og omkring landmasker kunne søgningen derfor stoppe, før et gyldigt fælles vådt U/V-punkt inden for den eksisterende 24-km-grænse blev undersøgt.

Hotfixen udvider kun Limfjordens marine kandidatsøgning til 48 kandidater og prober op til 0,26°. `MAX_GRID_DISTANCE_KM["limfjord"]` forbliver 24 km, så der accepteres ikke fjernere eller kunstige data. U og V skal fortsat komme fra samme fysiske DMI-gitterpunkt.


## Stabiliseringsrettelse efter produktion #1740/#seneste CI – U/V-dybdelag

Den tidligere radiusdiagnose var utilstrækkelig. Den friske GitHub-log viste, at `dkss_lf` blev planlagt og gennemført, men de lavvandede zoner `DK-B05-10`, `DK-B05-13` og `DK-B05-20` endte stadig uden fælles U/V-vektor. DMI-GRIB-inventaret viste samtidig gyldige strøm-U og strøm-V i flere vertikale lag (`surface` og `depthBelowSea`).

Den egentlige parserfejl var, at U/V-kandidatcache var nøglebundet kun til `(familie, zone)`. Når GRIB-filen leverede flere U-dybdelag før de tilsvarende V-dybdelag, overskrev et dybere U-lag det lavere U-lag. I lavvandede områder kunne det dybe lag være maskeret, og et ellers gyldigt lavere fælles U/V-par blev derfor aldrig dannet.

Rettelsen:
- U/V-kandidater caches nu separat pr. DMI-vertikallag.
- U og V må kun danne vektor, når både fysisk gitterpunkt **og vertikallag** er fælles.
- Blandt gyldige fælles strøm-lag vælges deterministisk det dybeste tilgængelige lag, så resultatet ikke afhænger af GRIB-meddelelsesrækkefølgen.
- Valgt vertikallag skrives i gridproveniens og diagnostik.
- Parserversionen hæves til 11, så tidligere behandlede assets genbehandles med den korrigerede logik.
- 24-km-grænsen for Limfjorden og alle øvrige videnskabelige audits er uændrede.

Den lokale komplette `npm run validate` består efter rettelsen. Endelig produktionsbekræftelse kræver fortsat en frisk GitHub/DMI-kørsel, fordi den konkrete fejl kun opstod under parsing af friske DKSS-GRIB-filer.

## Produktionsverifikation og Codex-handoff – 7. august 2026
Efter de fejlede mellemtrin gennemførte 4.0.117 på commit `6c1dece72d5970a1fc095b9a22f080d811cd9f36` efterfølgende succesfulde produktionskørsler. #1749 deployede samme commit, og #1750 gennemførte efter administratorens seneste rettelser af Limfjord-geometri. Den centrale sync viste de nye geometrier som ændrede, og weather-kæden gennemførte.

Det afsluttende forløb ændrer den dokumenterede rodårsagsforståelse: den tidligere kandidatradius var ikke tilstrækkelig forklaring på de tilbagevendende udfald. Den væsentlige parserfejl var vertikallagsoverskrivning, samtidig med at nogle berørte zoners centrale geometri faktisk var forkert. Begge forhold er nu en del af RDKS/handbook lessons learned.

Før Codex-overgangen er CHAT-0014 importeret, den gamle handoff opdateret, og en dedikeret `docs/ai/`-pakke er tilføjet. Dette dokumentationsarbejde ændrer ikke RavScore eller runtimeadfærd.

## Første Codex-rettelse – obligatoriske gates ved alle produktionsbuilds
Den dokumenterede bootstrap-fejl er lukket lokalt. Når preflight beslutter at bygge frisk produktionsdata, kører både `npm run validate` og `npm run release:gate` nu uanset om triggeren er `push`, tvungen manuel kørsel eller almindelig cron-startet `workflow_dispatch`. Et negativt preflight-resultat kan fortsat afslutte billigt uden artifact eller deploy. Regressionstesten kræver begge gates før Pages-artifactet og afviser triggerbaserede gate-undtagelser. Frisk CI-/produktionsverifikation afventer.

## Opfølgning fra streng #1769 – tomme aktive bulkzoner
#1769 blev korrekt stoppet af den fulde validate før artifact/deploy. Fire aktive zoner var blevet materialiseret, men blev bagefter slettet af bulk-cleanup, fordi deres `hourly` var tom. Cleanup bevarer nu hele den aktive registrering; tomme records betyder eksplicit manglende data og udfyldes ikke med nul eller stale værdier.

## Streng produktionsverifikation #1772
#1772 på `292b402487efaf74e2a102773a3a8fbfbd39f5af` gennemførte central admin-sync, frisk DMI/weather/proveniens/public runtime, fuld validate, releasegate, Pages-artifact og deployment med `success` i samme run. Gate-bypasset og tom-zone-regressionen er dermed produktionsverificeret løst.

## Balanceret scheduler-recovery efter #1774
#1774 viste, at fem vedvarende marinegrundlagshuller kunne holde begge produktive collection-pladser på DKSS, selv om 203/208 zoner allerede havde mindst 96 timers marinegrundlag. Resultatet var vinddata i kun 21/208 offentlige zoner og bølgedata i 175/208.

Scheduleren bevarer nu fuld marine-first ved bred fejl, men skifter ved mindst 95 % marinegrundlag til én relevant DKSS-plads og én plads for den mest underdækkede vind-/bølgefamilie. Missing forbliver missing; der er ikke tilføjet stale eller syntetisk fallback. Regressionstesten dækker begge tilstande. Frisk produktionsverifikation afventer.
