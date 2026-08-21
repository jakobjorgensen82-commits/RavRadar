# Anbefalet kandidat til fair national zonerangering

Dato: 2026-08-21

Status: Privat forskningsanbefaling. Ikke aktiveret i produktion.

## Anbefaling

Kandidaten `direction-broad-19` er den foreløbigt bedst dokumenterede løsning på lotterieffekten.

Den ændrer ikke zonens viste RavScore, lokale vinder, kortfarve, pile eller forklaring. Den bruges kun som intern sammenligningsværdi i `Bedste områder` og `5 dages RavRadar`.

## Beregning

Den maksimale korrektion er 19 point, men den konkrete korrektion afhænger af zonens reelle retningsmulighed og støtte:

- Én kystdel får ingen mulighedskorrektion.
- Mange ens retninger tæller langt mindre end mange forskellige retninger.
- En isoleret vinder i en zone med stor retningsmulighed kan få næsten hele korrektionen.
- Ved 25 % støtte begynder et ekstra bredt støtteværn at udfase korrektionen.
- Ved mindst 50 % støtte er korrektionen altid nul.
- Hel-zonedækning får derfor altid nul korrektion.
- En isoleret stor zone kan stadig vinde, hvis dens rå forspring er større end dens konkret beregnede mulighedsfordel.

19-point-grænsen er ikke valgt tilfældigt. Den syntetiske nulmodel målte omkring 13 points gennemsnitlig fordel for isolerede maksimummer, mens de faktiske 107 timer viste, at 18-20 point var intervallet, hvor den nationale overrepræsentation blev neutraliseret. 19 point var det mindste mellemtrin, som samtidigt klarede den tidsopdelte kontrol.

## Resultater på 107 faktiske prognosetimer

214 nationale rangeringer, fordi både waders og strandjagt indgår:

| Zonegruppe | Andel i forhold til gruppens andel af alle zoner |
| --- | ---: |
| 1-2 kystdele | 0,90x |
| 3-5 kystdele | 1,12x |
| 6+ kystdele | 1,11x |

Til sammenligning lå 6+-gruppen på 3,68x uden korrektion.

## Tidsopdelt kontrol

Timerne blev delt i skiftende 12-timers blokke, og begge jagtformer blev holdt sammen:

| Del | 1-2 dele | 3-5 dele | 6+ dele |
| --- | ---: | ---: | ---: |
| Kalibreringsblokke | 0,98x | 1,05x | 0,97x |
| Holdoutblokke | 0,81x | 1,21x | 1,30x |

Bootstrap med 1.000 gentagelser gav for 6+-gruppen median 1,11x og et 5-95 %-interval på 0,94-1,30x.

## Beskyttelse af reelle vindere

- Ingen hel-zone-vinder blev flyttet.
- Ingen vinder med mindst 50 % støtte blev flyttet.
- Den højeste støtteandel blandt flyttede vindere var 37,5 %.
- Et råt forspring på op til 13 point blev i enkelte isolerede eller svagt støttede tilfælde vurderet som mindre end den beregnede mulighedsfordel.
- Falster nord og Orehoved beholdt 50 af sine 102 top-5-placeringer i den tidsopdelte prøve.
- Falster vest og Nysted Nor munding beholdt 1 af 128. I disse 107 timer var zonens høje placeringer næsten aldrig støttet bredt nok til at opveje dens meget store retningsmulighed.

Det sidste punkt er ikke en permanent dom over zonen. Under et reelt stort scoreforspring eller mindst 50 % støtte kan den fortsat ligge helt i top.

## Resterende før produktion

- Ejerens udtrykkelige beslutning om at bruge kandidaten.
- Implementering som separat intern rangeringsværdi, ikke som ændring af RavScore.
- Kontrakttest af alle 210 zoneprofiler og 673 kystdele.
- Exact-head gates, produktion og fuld relevant browserkontrol af score, pile, forklaring og begge top-5-visninger.
- Efterfølgende privat overvågning og senere genkalibrering mod nationale turdata.
