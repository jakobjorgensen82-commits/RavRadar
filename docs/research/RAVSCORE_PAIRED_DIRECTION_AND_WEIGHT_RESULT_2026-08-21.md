# RavScore: parret retnings- og vaegtanalyse 2026-08-21

## Status

Dette er privat, score-neutralt forskningsarbejde. Den offentlige RavScore er ikke aendret.

Den reproducerbare GitHub-koersel `32521046654` blev gennemfoert paa commit `64ee7b7a260cc7505b31a3a916fba5860aa66b0b`. Koerslen brugte 12 historiske vejrforloeb, fire geografiske omraader og 1.460 evalueringer. Raadata, koordinater, U/V-vaerdier og credentials indgaar ikke i dette dokument.

## Hvad testen maaler

Den tidligere sammenligning af naturlige paalands- og fralandsforloeb blandede retning sammen med forskelle i boelgeenergi, vind, stroemstyrke og jagtbarhed. Derfor kunne den ikke isolere selve retningsvirkningen.

Den nye parrede test bruger det samme historiske tidspunkt, samme styrker, samme varighed og samme oevrige tilstand, men beregner to kontrollerede varianter:

- boelger, stroem og vind rettet mod kysten;
- boelger, stroem og vind rettet fra kysten.

Forskellen mellem de to varianter er derfor et bedre maal for modellens retningsfoelsomhed. Det er stadig en modeltest, ikke dokumentation for faktiske ravfund.

## Hovedresultater

| Model | Paaland | Fraland | Forskel |
|---|---:|---:|---:|
| Aktiv offentlig model | 61,366 | 31,477 | 29,890 |
| Korrigeret kandidat E | 47,252 | 32,762 | 14,490 |
| Kandidat F | 43,701 | 27,046 | 16,655 |

Den aktive model gav hoejere score ved paaland i alle 1.460 par. Kandidat E gjorde det i 1.455 par og var ens i fem. Kandidat F gjorde det i 1.458 par og var ens i to. Ingen kandidat gav systematisk hoejere score ved fraland.

## Retning skal afhaenge af reel flytteevne

Forloebene blev opdelt i en foreloebig lav, mellem og hoej bevaegelseskapacitet ud fra stroemstyrke og boelgeenergi. Graenserne er analysegraenser og er ikke produktionsregler.

| Model | Lav kapacitet | Mellem kapacitet | Hoej kapacitet |
|---|---:|---:|---:|
| Aktiv offentlig model | 30,450 | 28,854 | 30,327 |
| Kandidat E | 8,390 | 13,502 | 22,944 |
| Kandidat F | 9,364 | 15,243 | 27,011 |

Den aktive models retningsforskel er naesten den samme, selv naar stroem og boelger er for svage til at flytte ret meget. Det er en strukturel advarsel: den aktive transportberegning giver i praksis en stor retningsvirkning, naar der findes en stroemretning, uden at stroemstyrken reducerer virkningen tilstraekkeligt.

Kandidat E og F reagerer mere fysisk rimeligt: en retning betyder mindre ved svag flytteevne og mere ved kraftig flytteevne.

## Jagtformer

Resultatet er kontrolleret separat for vadejagt og strandjagt. Begge viser samme hovedmoenster. Den aktive model er isaer for optimistisk ved svage paalandsforhold. Ved hoeje energier kommer kandidaterne taettere paa den aktive model, fordi der da faktisk er kraft til mobilisering og transport.

## Foreloebig vaegtanalyse

Den aktive model bruger 25 % jagtbarhed, 40 % transport og 35 % mobilisering. Kandidat F brugte 15/50/35 og var nyttig som en yderkant, men saenkede niveauet for bredt og flyttede for mange scorebaand.

Den mest lovende naeste private arbejdshypotese er 20/45/35:

| Maal | 20/45/35 |
|---|---:|
| Naturligt gennemsnit | 37,649 |
| Forskel fra aktiv model | -3,660 |
| Aendrede scorebaand | 545 af 1.460 |
| Parret paaland | 45,482 |
| Parret fraland | 29,897 |
| Parret forskel | 15,584 |
| Retningsforskel ved lav kapacitet | 8,879 |
| Retningsforskel ved mellem kapacitet | 14,431 |
| Retningsforskel ved hoej kapacitet | 24,950 |

20/45/35 bevarer transport som den stoerste del, er mindre voldsom end F og bevarer den oenskede sammenhaeng mellem retning og reel flytteevne. Det er ikke en endelig vaegt og maa ikke aktiveres alene paa baggrund af denne test.

## Ny bindende forskningsregel om historik

Retning maa ikke vurderes som et oejebliksbillede. Den naeste kandidat skal som minimum beskrive:

- stroemmens retning, styrke, varighed og udvikling over de foregaaende timer og dage;
- hvor laenge den nuvaerende retning har vaeret aktiv;
- om en vending er kort og svag eller lang og kraftig;
- nettoeffekten af tidligere paalands- og fralandstransport med aftagende vaegt bagud i tiden;
- vindens retning, styrke, varighed og vendinger efter samme princip;
- vindens indirekte virkning gennem boelger, stroem og vandstand, saa samme fysiske virkning ikke taelles flere gange.

En kort, svag vending skal kun flytte scoren lidt. En vedvarende og kraftig vending skal flytte den mere. Timer eller dage med opbygget paalandstransport maa ikke slettes af et enkelt svagt fralands-tidspunkt. Omvendt maa langvarig kraftig fralandspaavirkning reelt kunne nedbryde et tidligere gunstigt forloeb.

Direkte vindtransport af rav behandles konservativt, fordi rav ikke uden videre kan antages at opfoere sig som permanent flydende overflademateriale. Vindens dokumenterede indirekte virkning gennem havtilstanden skal stadig medregnes.

## Beslutning

- Den aktive offentlige model aendres ikke endnu.
- Kandidat F afvises som direkte produktionskandidat, men beholdes som foelsomhedsmaessig yderkant.
- Den gamle begrundelse om, at F skulle mindske retningsforskellen, traekkes tilbage. Den var baseret paa en sammenblandet, uparret sammenligning.
- Naeste private arbejdshypotese kaldes kandidat G: korrigeret procesmodel, foreloebigt 20/45/35, ingen udokumenterede statiske kystbonusser og historisk hukommelse for stroem og vind.
- Kandidat G er en forskningshypotese og ikke godkendt produktionslogik.

## Naeste kontroller foer en offentlig aendring

1. Udled score-neutrale historikmaal for stroem og vind fra de eksisterende 96-timers forloeb.
2. Test stroem, boelger og vind hver for sig samt samlet, saa dobbeltregning opdages.
3. Test svage og kraftige vendinger med forskellig varighed og alder.
4. Koer den kanoniske nationale matrix og de historiske forloeb igen.
5. Koer en national shadow-sammenligning mod den aktive score.
6. Kontrollér jagtbarhed og sikkerhed for vadejagt separat.
7. Kontrollér at pil, score og forklaring fortaeller den samme historie.
8. Afspil de centrale ekspertregler og den endelige scorekaede, foer en produktionsbeslutning.

## Begraensninger

Analysen bygger paa fire udvalgte kyststeder og 12 historiske forloeb fra 2024. DMI-vinden er stationsbaseret og beskriver ikke al lokal mikroskala. Centrale ekspertregler blev ikke fuldt afspillet, og der findes endnu ikke et tilstraekkeligt saet af komplette ture og fund til endelig kalibrering. Resultaterne er derfor fysisk begrundede priors og regressionsbeviser, ikke fundvalidering.
