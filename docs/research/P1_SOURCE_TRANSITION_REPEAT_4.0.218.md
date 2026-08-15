# P1 – gentaget måling af kildeskift til og med 4.0.218

**Grundlag:** 4.0.214 `rr-20260815083802-210`, 4.0.217 `rr-20260815114746-210` og 4.0.218 `rr-20260815122446-210`  
**Status:** Gentagelsesmåling; ingen udglatning, kilde-, fallback- eller scoreændring

## Det klare billede

Tre målinger bekræfter samme hovedmønster. Vandstandens kildeskift er ikke større end almindelige timespring. Vind, bølger, strøm og vandtemperatur har derimod fortsat større spring ved kildeskiftet. Størrelsen varierer mellem kørslerne, så permanente alarmgrænser er endnu ikke fagligt forsvarlige.

| Felt | Gennemsnit ved kildeskift, tre målinger | 95 %, tre målinger | Almindelig time, seneste måling | Konklusion |
|---|---:|---:|---:|---|
| Vindhastighed | 0,94 / 0,98 / 0,68 m/s | 2,7 / 2,6 / 2,1 m/s | 0,33 m/s | Overgangen er fortsat større |
| Vindretning | 35 / 36 / 20° | 102 / 115 / 85° | 5,8° | Vedvarende, men variabelt retningsspring |
| Bølgehøjde | 0,13 / 0,13 / 0,09 m | 0,59 / 0,60 / 0,43 m | 0,03 m | Overgangen er fortsat større |
| Bølgeretning | 37 / 34 / 40° | 153 / 148 / 150° | 7,0° | Stabilt højt overgangssignal |
| Bølgeperiode | 0,37 / 0,41 / 0,30 s | 1,5 / 1,6 / 1,4 s | 0,07 s | Overgangen er fortsat større |
| Strømhastighed | 0,46 / 0,44 / 0,21 m/s | 1,25 / 1,10 / 0,79 m/s | 0,02 m/s | Fallback er ikke en sømløs strømfortsættelse |
| Strømretning | 92 / 89 / 45° | 179 / 175 / 162° | 17° | Fortsat fagligt uforenelig som én ubrudt serie |
| Vandstand | 4,6 / 4,3 / 2,8 cm | 17 / 14 / 11 cm | 5,1 cm | Eksisterende kontinuitetsmekanisme er sund |
| Vandtemperatur | 2,43 / 1,51 / 0,69 °C | 9,1 / 2,9 / 2,1 °C | 0,03 °C | Mindre efter overfladekorrektionen, men stadig markant større end normalt |

## Dækning i den seneste fulde rotation

- Vind: 210/210 zoner med 118 timer.
- Bølger: 194 zoner med 118 timer, 15 med 114 og `DK-B05-11` med nul.
- Strøm, vandstand og vandtemperatur: 202 zoner med 118 timer og de samme otte Limfjordszoner med 98 timer.
- `missing` er fortsat bevaret i halen; ingen stale gentagelse eller opdigtet udfyldning er indført.

## Hvad vi kan beslutte nu

1. Fallbackstrøm må fortsat ikke tælle som verificeret transporthistorik.
2. Vandtemperatur forbliver score-neutral; selv den laveste målte overgang er langt større end en almindelig time.
3. Vandstandens eksisterende reparation bevares uændret.
4. Vind- og bølgeproveniens skal fortsat være synlig, og en senere overgangsregel skal konsekvensberegnes mod RavScore før godkendelse.

## Hvad der fortsat mangler

4.0.217- og 4.0.218-datasættene ligger kun cirka 37 minutter fra hinanden. Den sidste kørsel indeholder en reel fuld DMI-rotation, men de er ikke to uafhængige forecastcyklusser. Permanente regressionsgrænser kræver derfor flere modelcyklusser og bør beskrives som intervaller pr. komponent og overgangsretning, ikke som ét fælles tal.
