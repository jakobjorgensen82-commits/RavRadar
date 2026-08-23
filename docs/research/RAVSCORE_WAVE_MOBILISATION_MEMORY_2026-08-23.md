# Candidate G – beslutningsgrundlag for mobilisering

## Kort fortalt

Den bedste nuværende mobiliseringsmodel er én hukommelse for bølgepåvirkning. Højde og periode fortæller, hvor kraftig den aktuelle påvirkning er. Vedvarende påvirkning bygger gradvist mobiliseringen op, og rolige forhold får den til at falde langsomt igen.

Det gør modellen mere forståelig og mindre tilbøjelig til dobbelttælling. Vind får ikke ekstra mobiliseringspoint, fordi vindens fysiske virkning allerede viser sig i de målte/modellerede bølger og strømme. Strømmen bestemmer transporten. Vind bestemmer desuden, hvor effektiv wadersjagt er. En separat varighedsscore er unødvendig, fordi varighed allerede ligger i den kontinuerlige tilstand.

## Før og efter

Den foregående Candidate G-mobilisering samlede flere plausible signaler additivt:

- tidligere bølgeenergi;
- tidligere vind;
- hændelsesvarighed;
- aktuelle bølger;
- aktuel strøm.

Hvert signal kan være relevant, men flere af dem beskriver samme vejrhændelse. Den nye `RESEARCH-3`-variant erstatter derfor kun mobiliseringsleddet med én kausal tilstand. Transport-, jagtbarheds- og udtransportreglerne ændres ikke.

## Sådan virker tilstanden

1. For hver time beregnes den relative bølgeenergi som `bølgehøjde² × periode`.
2. Energien omsættes til et øjeblikkeligt mål mellem 0 og 100 med den allerede anvendte glatte energikurve.
3. Hvis målet er højere end den eksisterende mobilisering, bevæger tilstanden sig op mod målet med fire timers halveringstid.
4. Hvis målet er lavere, bevæger tilstanden sig ned mod målet med 48 timers halveringstid.
5. Hvis bølger mangler, holdes tilstanden. Missing må ikke opfattes som vindstille eller fladt vand.
6. Sidste tidspunkt og tilstand føres videre mellem kørsler.

Udtrykket “halveringstid” betyder her, at forskellen til det aktuelle mål halveres over den angivne tid. Det giver et glidende forløb uden hårde spring.

## Syntetiske randtilfælde

Den offentligt reproducerbare audit bruger ingen private data:

| Forløb | Mobilisering |
|---|---:|
| Én høj time | 15,910 |
| Fire moderate timer | 27,625 |
| Tolv høje timer | 87,500 |
| Derefter 48 rolige timer | 43,750 |

En udviklet moderat hændelse slår dermed en enkelt høj top, mens en vedvarende kraftig hændelse stadig bliver tydeligt stærk. Eftervirkningen forsvinder ikke efter få rolige timer.

En opdelt 24-timers kørsel giver samme slutværdi 91,815 som en ubrudt kørsel. Det beviser, at pipelinegrænser ikke behøver ændre hændelsesforløbet.

## Privat replay – kun sammenfattede resultater

Den eksisterende flyttede og Git-ignorerede cache indeholder 12 hændelsesvinduer og 1.460 evalueringer. Ingen private payloads eller steder er skrevet til Git.

| Måling | Resultat |
|---|---:|
| Tidligere mobilisering, gennemsnit | 57,651 |
| Ny mobilisering, gennemsnit | 73,348 |
| Ny samlet Candidate G-score, gennemsnit | 31,775 |
| Scoreændring mod valgt transportrevision | +3,484 |
| Ændrede referencebånd | 332 / 1.460 |

Det højere mobiliseringsniveau er ikke i sig selv et problem. Vinduerne er udvalgt omkring bølgehændelser, hvor mobilisering netop bør være høj. Ved dokumenteret udtømt udtransport kan mobiliseringen fortsat være høj, mens den samlede score er 0. Det matcher ejerens beslutning om, at en storm kan mobilisere materiale samtidig med, at kraftig fralandsstrøm trækker ravet ud.

## Følsomhed

| Profil mod 4/48 | Gennemsnitlig scoreændring | Ændrede bånd |
|---|---:|---:|
| Opbygning 3 timer | +0,336 | 33 |
| Opbygning 6 timer | -0,711 | 89 |
| Aftrapning 24 timer | -1,651 | 166 |
| Aftrapning 72 timer | +0,703 | 74 |
| Starttilstand 50 | +0,130 | 13 |

Opbygningsvalget og replaystarten har beskeden betydning i dette materiale. Aftrapningen betyder mest. 48 timer er derfor en begrundet midterprior, som passer med den ønskede 24–48-timers hukommelse, men den er ikke fundkalibreret.

## Hvad modellen bevidst ikke gør

- Den regner ikke bølgeproxyen om til bundskærspænding.
- Den modellerer ikke dybde, revler, render eller den konkrete passage rundt om dem.
- Den giver ikke grundegnethedspoint eller -fradrag til en kyst.
- Den giver ikke sikkerhedsadvarsler.
- Den bruger ikke strømretning som mobilisering; strømretning hører til transport.
- Den lader ikke bølger skabe transport; bølger kan kun mobilisere og sekundært hjælpe den sidste levering, når strømmen allerede har skabt en vej.

## Anbefaling

Brug `RESEARCH-3` med fire timers opbygning og 48 timers aftrapning som det samlede Candidate G-spor til næste produkttrin. Bevar den gamle mobilisering som revisionsreference. Kobl ikke den nye model halvt ind i den offentlige runtime: transporttilstand, mobiliseringstilstand, forklaring og rollback skal versionsbindes og valideres samlet.

Offentlig RavScore er fortsat `25/40/35` i dette checkpoint. Kandidaten ændrer ingen brugerdata, UI, geometri, land-/vandpunkter eller beskyttede data.
