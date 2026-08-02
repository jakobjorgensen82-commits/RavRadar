# RavRadar 4.0.79 – hurtig rangliste og 5-dages prognose

## Rettet
- Ranglisten og 5-dages prognosen beregnes nu uden at genindlæse og normalisere den adaptive model for hver time og zone.
- Den adaptive model indlæses én gang ved opstart og genbruges i alle scoreberegninger.
- Aktuelle zonescorer caches pr. jagtform, så kort, rangliste og dagsprognose bruger samme beregning.
- Prognosetimer grupperes én gang pr. zone i stedet for gentagne gange for hver dag.
- Opstarten udfører ikke længere en skjult dobbelt rendering af rangliste og 5-dages prognose.
- Fund-sandsynlighed beregnes fortsat i zonepanelet, men ikke unødvendigt for alle zoner under rangliste- og kortberegning.
- Den samlede sitetest kontrollerer nu dashboardets testknap, mens dashboardet faktisk er åbent; tidligere blev kontrollen fejlagtigt udført efter gennemgang af alle faner.

## Forventet virkning
- Den tunge 5-dages scoreberegning falder fra mange sekunder i browseren til en kort, lokal beregning.
- Rangliste og 5-dages prognose skal kunne vises stabilt også på langsommere telefoner.
