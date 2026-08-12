# DEC-0035 – Hovedzonegrænser og ejerskab af præcise kystdele

**Status:** AKTIV OG PRODUKTIONSVERIFICERET I 4.0.183 (GitHub Actions #31572312647)
**Dato:** 2026-08-12

## Beslutning

- Det offentlige kort viser kun et sort skel, når to forskellige hovedzoners ydre ender faktisk mødes. Interne beregningsdele og fritstående ender får intet sort skel.
- Skel er mindre på landsniveau og vokser moderat ved lokal zoom.
- “Tilbage til oversigten” gendanner Danmark-overblikket.
- En hovedzones længde ændres i admin ved at flytte hele eksisterende præcise kystdele mellem hovedzoner. Der tegnes ikke nye uverificerede målepunkter ved en almindelig grænseændring.
- Kystdelens geometri, ID, landpunkt, vandpunkt, DMI-gridbevis og lokale dataserie bevares samlet. Kun hovedzoneejeren ændres.
- En kystdel må have præcis én aktiv hovedzoneejer. Et adminvalg til en ukendt eller slettet zone stopper bygningen.
- Ved sletning af en hovedzone fjernes dens resterende kystdele fra offentlig runtime. Dele, som skal bevares, flyttes til en aktiv nabozone før sletningen.

## Begrundelse

De 643 kystdele er allerede ejer- og gridkontrollerede. At genberegne geometri og målepunkter ved en ren flytning af en hovedzonegrænse ville skabe unødvendig risiko. Ejerskabsflytning genbruger den verificerede viden og kan ikke i sig selv skabe fysisk overlap, fordi hver eksisterende geometri kun publiceres én gang.

## Afgrænsning

Dette er ikke en fri tegnefunktion til at skabe ny, ukendt kyst. Hvis en relevant kyststrækning ikke findes blandt de aktive præcise dele, kræver den fortsat geometri-, land/vand- og DMI-kontrol før aktivering.
