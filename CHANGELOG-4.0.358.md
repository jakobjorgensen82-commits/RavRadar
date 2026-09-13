# RavRadar 4.0.358 – samlet cutoverrettelse og komplet underfejlrapport

## Resultat

- Fuld validering forsøger nu alle 272 deklarerede selvstændige leaf-kommandoer og fortsætter efter fejl.
- En payloadfri, SHA-planbundet rapport gemmes løbende før, under og efter kontrollerne. Afbrydelse kan derfor ikke ligne en komplet kørsel.
- De fem hovedkontroller fortsætter stadig uafhængigt og stopper kun én gang efter den samlede blok, hvis en reel fejl findes. Alle fem forbliver bindende før eksterne writes.
- First-cutover har et samlet loft på 180 minutter; almindelig produktion forbliver 90 minutter, og providerbudgetter ændres ikke.

## Samlede fejlrettelser

- Forecast-fixturen følger den faktiske komplette DMI-proveniens og kontrollerer konkrete interpolerede strømresultater samt afvisning af manglende kildeidentitet.
- Den progressive public-runtime-test bruger ikke længere den gamle scoremotor; den kontrollerer de materialiserede integrerede scores offentlige projektion.
- Tre strengt typede boolske `jq`-udtræk accepterer nu gyldigt `false` uden at acceptere null, manglende eller forkert type.
- Pages-kontrollen holder lokal scoretilgængelighed og rå modelhukommelse adskilt. Lokal UNAVAILABLE og ærligt ufuldstændig memory kan sameksistere uden en falsk deployafvisning.
- Den skjulte oneoff-fill-test er gjort til et synligt selvstændigt plantrin.

## Uændret

Selve RavScore-formlen, modelstate, vejrets værdier og kildeorden, geometri, land-/vandpunkter, database- og privacykontrakter er uændrede. Der køres ingen ny provider-oneoff. Næste er én exact-head-sourcegate, byteidentisk merge, cachebaseret handofffortsættelse, cutover og offentlig/sitekontrol.
