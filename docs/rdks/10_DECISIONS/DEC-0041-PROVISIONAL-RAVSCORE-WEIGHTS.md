# DEC-0041 - Foreløbige RavScore-vægte før fundkalibrering

## Status
Aktiv i 4.0.242 source. Produktionsaktivering kræver de fulde RavRadar-gates og onlineaudit.

## Beslutning
Den aktive RavScore vægter foreløbigt:
- jagtbarhed: 25 %
- transport: 40 %
- mobilisering/tilgængelighed: 35 %

Vægtene summerer til 100 %. De gælder ens for waders og strand; jagtformerne beholder deres forskellige jagtbarhedsregler.

## Begrundelse
RavScore skal både beskrive, om ravet kan være til stede ved kysten, og om brugeren praktisk kan lede efter det. Den tidligere vægt på 40 % til jagtbarhed lod de aktuelle søgeforhold dominere de to fysiske led. Den foreløbige prior gør transport til det største enkeltled, giver mobilisering større betydning og bevarer jagtbarhed som en væsentlig, men ikke dominerende del.

Fordelingen er understøttet af den samlede forskning og fase D-sammenligning, men er ikke statistisk kalibreret mod danske ture. Enkeltstående ravfund bruges ikke som kalibreringsgrundlag.

## Afgrænsning
Denne beslutning ændrer kun vægtene. Den ændrer ikke:
- komponenternes interne regler eller tærskler
- bølgejusteringen fra DEC-0040
- scoregrænser, labels, farver, stjerner eller pile
- vejrkilder, fallback, prognoser eller cache
- zoner, kystdele eller land-/vandpunkter

## Senere kalibrering
Efter mindst cirka seks måneders brugbare turdata med både fund og reelle nul-fund kan vægtene revurderes. En senere ændring kræver særskilt analyse, validering og beslutning; 25/40/35 må ikke omtales som endelig videnskabelig kalibrering.
