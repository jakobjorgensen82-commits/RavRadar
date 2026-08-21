# Audit af mulighedsfordel i nationale zoneranglister

Dato: 2026-08-21

Produktionsdataset: `rr-20260821154200-210`

Omfang: 210 zoner / 673 kystdele

Rangeringer: aktuel dag og fem prognosedage i begge tilstande, i alt 12 top-5-lister

## Formaal

Auditten undersoeger, om zoner med mange kystdele faar en uforholdssmaessig fordel, naar den hoejeste delscore bestemmer zonens placering i "Bedste omraader" og "5 dages RavRadar".

Den aendrer ikke score, rangering, produktionsdata eller land-/vandpunkter. Rapporten indeholder ikke raa vejrdata, koordinater eller komplette diagnostikpayloads.

## Hovedresultat

| Antal kystdele | Zoner | Andel af top-5-pladser | Forhold mellem top-5-andel og zoneandel |
| --- | ---: | ---: | ---: |
| 1-2 | 116 | 25,0% | 0,453 |
| 3-5 | 69 | 33,3% | 1,014 |
| 6+ | 25 | 41,7% | 3,500 |

- Korrelationen mellem antal kystdele og top-5-forekomster var `0,370`.
- Korrelationen mellem retningsdaekning og top-5-forekomster var `0,288`.
- 70% af top-5-pladserne var situationer, hvor kun den vindende kystdel laa inden for den eksisterende margin paa syv point.
- Falster nord og Orehoved havde 11 dele, optraadte i top-5 i 8 af 12 rangeringer og havde kun en enkelt stoettende del i 5 af disse placeringer.
- Falster vest og Nysted Nor munding havde 26 dele, optraadte i top-5 i 6 af 12 rangeringer og havde kun en enkelt stoettende del i 3 af disse placeringer.

## Fortolkning

Det konkrete produktionsvejr viser en tydelig skaevhed for gruppen med mindst seks dele. En enkelt vejrsituation kan dog ogsaa favorisere bestemte landsdele. Resultatet er derfor evidens for et problem, men ikke alene grundlag for en korrektionsformel.

En regel om automatisk straf efter to kystdele afvises som for grov:

- Gruppen med 3-5 dele var samlet omtrent proportionalt repraesenteret.
- Flere dele med naesten samme retning giver ikke samme mulighedsfordel som mange forskellige retninger.
- En zone kan legitimt have flere dele med gode forhold; det skal ikke behandles som et tilfaeldigt maksimum.

## Sammenhold med den vejruafhaengige test

Det separate 360-graders geometriaudit bekraefter, at forskelligt vendte dele i sig selv giver flere muligheder. Det peger paa en eventuel intern, begraenset rangeringstilpasning baseret paa effektiv retningsdaekning og stoetten fra zonens oevrige dele. Den lokale RavScore og den vindende kystdel skal fortsat vises ujusteret.

## Status

Mulighedsfordelen er bekraeftet. Ingen produktionsregel er valgt eller aktiveret. Naeste trin er at sammenligne faa forklarlige kandidater mod flere historiske vejrsituationer og kontrollere hele sammenhaengen mellem score, pil og forklaring.
