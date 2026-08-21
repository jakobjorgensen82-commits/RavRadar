# Audit af mulighedsfordel i zoner med mange kystdele

## Problem

RavRadar viser den hoejeste lokale kystdelsscore som zonens score. Det er nyttigt, fordi brugeren skal kunne finde den bedste konkrete del. Men en zone med mange forskelligt vendte kystdele faar flere muligheder for, at mindst en del passer til den aktuelle stroem, vind og boelgeretning.

Det kan give en statistisk fordel i `Bedste omraader` og `5 dages RavRadar`, selv om den viste vinderdels score er matematisk korrekt. Ejerens konkrete eksempler er `Falster nord og Orehoved` og `Falster vest og Nysted Nor munding`.

## Foerste trin: maal foer korrektion

Den private audit skal paa det samme produktionsdatasæt:

- gennemgaa alle 210 aktive zoner og 673 kystdele,
- rekonstruere top 5 nu og fem doegn frem for begge jagtformer,
- taelle kystdele pr. zone,
- maale hvor stor en del af kompasset kystdelenes retninger daekker,
- maale hvor ofte hver zone optraeder i top 5,
- og maale hvor mange dele der stoetter zonens vinderscore inden for den eksisterende margen paa 7 point.

Auditten er score-neutral. Den aendrer ikke offentlig score, rangliste, geometri, DMI/fallback eller land-/vandpunkter.

## Hvorfor antal alene ikke er nok

Mange kystdele kan vende naesten ens og giver da ikke mange uafhaengige chancer. Omvendt kan relativt faa dele vende meget forskelligt. En eventuel korrektion boer derfor mindst overveje:

- antal dele,
- effektiv retningsbredde,
- om kun én del eller flere dele stoetter vinderscoren,
- og om korrektionen kun skal paavirke nationale ranglister frem for den lokale RavScore.

## Kandidater efter auditten

Ingen kandidat er valgt endnu. Foelgende muligheder vurderes foerst efter maaling:

- behold lokal maksimumscore, men brug en separat ranglistescore med mulighedskorrektion,
- nedjuster kun zoner, hvor én enkelt del blandt mange skaber hele placeringen,
- brug en robust kombination af bedste og naestbedste del,
- eller behold nuvaerende metode, hvis produktformaalet og de faktiske data viser, at den ikke giver urimelig dominans.

En simpel fast straf for mere end to dele maa ikke indfoeres uden audit. Den ville ramme mange zoner og kan straffe reel geografisk vaerdi.

## Vejruafhaengig geometrikontrol

Den friske vejrsituation kan ikke alene afgore, om top-5-fordelen er strukturel. Derfor suppleres auditten med en deterministisk rotation gennem alle 360 stroemretninger. For hver zone maales, hvor ofte mindst en kystdel ligger inden for +/-25 og +/-55 grader, samt zonens gennemsnitlige bedste positive retningsjustering. Resultatet normaliseres mod en zone med en enkelt kystretning.

Raadelenes antal er kun en forklarende variabel. En senere kandidat maa baseres paa effektiv retningsdaekning og stoette fra andre hoejt scorende kystdele, ikke en fast straf efter to dele.