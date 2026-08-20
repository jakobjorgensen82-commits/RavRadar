# RavScore 4.0.242 - audit af foreløbige vægte

## Formål
Auditte sammenligner den tidligere vægt 40/35/25 med kandidaten 25/40/35. Kun vægtene ændres; komponentværdier, øvrige justeringer og offentlige data bevares.

## Syntetisk audit
- 9.261 komponentkombinationer i fempointstrin.
- Middelforskel: 0 point på det symmetriske gitter.
- Interval: minus 15 til plus 15 point.
- 8.676 kombinationer ændres; 585 er uændrede.
- Balancerede komponenter, 0/0/0 og 100/100/100 er uændrede.

## National offentlig audit
Baseline: dataset rr-20260820204808-210, genereret 2026-08-20T20:48:08.698Z.

Dækning:
- 673 kystdele.
- 42.846 scoreposter.
- 1.346 aktuelle kystdelsvisninger.
- 41.500 prognoseposter.
- 420 aktuelle zone-/jagtformsvisninger.
- Nul baselineforklaringer med anden vægt end 40/35/25.

Alle scoreposter:
- Middelforskel: minus 3,803 point.
- Interval: minus 14 til plus 13 point.
- 41.954 poster ændres.
- 11.088 krydser en referencegrænse på 35, 55 eller 75.

Aktuelle zonevisninger:
- Gennemsnit: 56,945 før og 50,631 efter.
- Middelforskel: minus 6,314 point.
- Interval: minus 13 til 0 point.
- 7 af 420 skifter vindende kystdel.
- 110 krydser en referencegrænse.
- Referencefordeling før: 0 dårlig, 178 svag, 227 middel og 15 god.
- Referencefordeling efter: 31 dårlig, 220 svag, 160 middel og 9 god.

Jagtformer på tværs af aktuelle og fremtidige poster:
- Waders: gennemsnit minus 2,720 point, interval minus 14 til plus 13.
- Strand: gennemsnit minus 4,887 point, interval minus 10 til plus 5.

## Vurdering
Faldet i det aktuelle snapshot skyldes, at jagtbarhed generelt er højere end transport og mobilisering. Det er den dominans, ændringen skal reducere. Kun 7 af 420 aktuelle zonevisninger skifter vindende kystdel, så den geografiske prioritering er stabil, mens selve sikkerheden i høje scores dæmpes.

Resultatet er ikke en fundkalibrering og bruges ikke til at finjustere vægtene mod dette ene vejrsnapshot. 25/40/35 forbliver en foreløbig prior efter DEC-0041 og skal senere revurderes med både fund og reelle nul-fund.

## Integritet
Auditten ændrer ingen data. Komponentregler, tærskler, bølgeprior, scoregrænser, pile, vejr, geometri samt land-/vandpunkter er uændrede.
