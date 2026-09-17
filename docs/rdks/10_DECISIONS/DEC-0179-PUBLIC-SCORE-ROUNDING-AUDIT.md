# DEC-0179 – Offentlig scoreaudit følger den forseglede afrunding

**Status:** Aktiv og bindende; implementeret og måltestet i 4.0.397, livebevis afventer
**Dato:** 2026-09-17

## Baggrund

4.0.396 blev leveret som main
`265ec215ace894264e7c687d2e7fe8955f305a76`. Normalrun `35159168292`
gennemførte providerne, gemte cacher og byggede den offentlige 118-timers
prognose. Slutauditten stoppede deploy med 47 del- og 1.285 zonefejl.

Producenten beregner heltalsscoren fra en fuldpræcisionssum og publicerer
derefter både bidrag og rå sum afrundet til seks decimaler. Auditten lagde de
tre allerede afrundede bidrag sammen og heltalsafrundede den nye sum. Ved en
halv-point-grænse kunne den blive én mikroenhed lavere eller højere end den
publicerede rå sum og dermed give et andet heltal.

## Beslutning

Auditten skal fortsat bevise, at summen af de tre offentlige bidrag matcher
den forseglede rå score inden for `1e-6`. Den må ikke genfortolke den
tabsbehæftede sum som mere præcis end producentens oprindelige beregning.

Når den seksdecimaler-afrundede rå score ligger præcis på `.5`, accepteres
kun de to naboheltal, der kan være resultatet af en oprindelig værdi inden for
den halve mikroenheds publiceringsinterval. Uden for dette smalle interval
består den eksakte tidligere heltalskontrol. Waders-loftet, slutscore,
modelbinding, scorekvalitet og alle øvrige felter kontrolleres fortsat.

Kontraktform og formelkonsistens skal tælles separat, så én fejlklasse ikke
skjuler den anden i et samlet produktionsgennemløb.

## Afgrænsning

Beslutningen ændrer ikke RavScore, bidrag, vægte, vejrdata, kildeprioritet,
lokal missing, geometri eller offentlig præsentation. Den retter kun en
falsk negativ i den efterfølgende audit. Et bidragssumafvig større end
`1e-6`, et umuligt heltal eller enhver kontraktfejl stopper fortsat.

## Bevis

Den målrettede auditregression reproducerer `50.499999` i publicerede
bidrag mod `50.5` i publiceret rå score og accepterer begge eneste mulige
producentudfald. Eksisterende malformed-fixtures afvises fortsat. Exact-head,
merge og live fortsættelse af den gemte vejrgeneration afventer.
