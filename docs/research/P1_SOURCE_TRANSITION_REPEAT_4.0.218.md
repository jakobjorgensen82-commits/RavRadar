# P1 – gentaget måling af kildeskift til og med 4.0.219

**Grundlag:** 4.0.214 `rr-20260815083802-210`, 4.0.217 `rr-20260815114746-210`, 4.0.218 `rr-20260815122446-210` og 4.0.219 `rr-20260815131334-210`
**Status:** Gentagelsesmåling; ingen udglatning, kilde-, fallback- eller scoreændring

## Det klare billede

Fire målinger bekræfter samme hovedmønster. Vandstandens kildeskift er ikke større end almindelige timespring. Vind, bølger, strøm og vandtemperatur har derimod fortsat større spring ved kildeskiftet. Størrelsen varierer mellem kørslerne, så permanente alarmgrænser er endnu ikke fagligt forsvarlige.

| Felt | Gennemsnit ved kildeskift, fire målinger | 95 %, fire målinger | Almindelig time, seneste måling | Konklusion |
|---|---:|---:|---:|---|
| Vindhastighed | 0,94 / 0,98 / 0,68 / 0,79 m/s | 2,7 / 2,6 / 2,1 / 2,5 m/s | 0,34 m/s | Overgangen er fortsat større |
| Vindretning | 35 / 36 / 20 / 19° | 102 / 115 / 85 / 75° | 5,7° | Vedvarende, men variabelt retningsspring |
| Bølgehøjde | 0,13 / 0,13 / 0,09 / 0,09 m | 0,59 / 0,60 / 0,43 / 0,43 m | 0,03 m | Overgangen er fortsat større |
| Bølgeretning | 37 / 34 / 40 / 40° | 153 / 148 / 150 / 151° | 7,0° | Stabilt højt overgangssignal |
| Bølgeperiode | 0,37 / 0,41 / 0,30 / 0,30 s | 1,5 / 1,6 / 1,4 / 1,4 s | 0,07 s | Overgangen er fortsat større |
| Strømhastighed | 0,46 / 0,44 / 0,21 / 0,18 m/s | 1,25 / 1,10 / 0,79 / 0,77 m/s | 0,02 m/s | Fallback er ikke en sømløs strømfortsættelse |
| Strømretning | 92 / 89 / 45 / 45° | 179 / 175 / 162 / 166° | 18° | Fortsat fagligt uforenelig som én ubrudt serie |
| Vandstand | 4,6 / 4,3 / 2,8 / 4,1 cm | 17 / 14 / 11 / 16 cm | 5,0 cm | Eksisterende kontinuitetsmekanisme er sund |
| Vandtemperatur | 2,43 / 1,51 / 0,69 / 0,62 °C | 9,1 / 2,9 / 2,1 / 2,1 °C | 0,04 °C | Mindre efter overfladekorrektionen, men stadig markant større end normalt |

## Dækning i den seneste fulde rotation

- Vind: 209 zoner med 118 timer og én med 117.
- Bølger: 193 zoner med 118 timer, én med 117, 15 med 113 og `DK-B05-11` med nul.
- Strøm, vandstand og vandtemperatur: 201 zoner med 118 timer, én med 117 og de samme otte Limfjordszoner med 115 timer.
- `missing` er fortsat bevaret i halen; ingen stale gentagelse eller opdigtet udfyldning er indført.

Den ene 117-timersrække optræder på tværs af komponenterne efter én mislykket Open-Meteo-forecastforespørgsel i kørslen. Den behandles som et synligt sluttidshul, ikke som tilladelse til stale udfyldning.

## Hvad vi kan beslutte nu

1. Fallbackstrøm må fortsat ikke tælle som verificeret transporthistorik.
2. Vandtemperatur forbliver score-neutral; selv den laveste målte overgang er langt større end en almindelig time.
3. Vandstandens eksisterende reparation bevares uændret.
4. Vind- og bølgeproveniens skal fortsat være synlig, og en senere overgangsregel skal konsekvensberegnes mod RavScore før godkendelse.

## Hvad der fortsat mangler

4.0.217- og 4.0.218-datasættene ligger kun cirka 37 minutter fra hinanden. 4.0.218 indlæste en ny NSBS-cyklus fra 15. august kl. 06 mod den tidligere 14. august kl. 12, så strøm-, vandstands- og temperaturmålingen indeholder reel ny modelevidens for NSBS-zonerne. HARMONIE-vind og WAM-bølger brugte derimod samme modelkørsler i de to artifacts, og Limfjordsmodellen blev ikke færdigbehandlet i 4.0.218. Permanente regressionsgrænser kræver derfor fortsat nye modelcyklusser pr. komponent og bør beskrives som intervaller pr. overgangsretning, ikke som ét fælles tal.

4.0.219 gentager mønstret på endnu en produktionsbygning og viser samtidig 149 rå historikprøver over 37,149 timer i alle 210 zoner. Det er vækstbevis, ikke et fuldt 72-timersvindue. Næste sammenligning skal fortsat kontrollere faktiske model-run-id'er særskilt for HARMONIE, WAM, NSBS, IDW og LF, så flere artifacts fra samme modelcyklus ikke fejltolkes som uafhængig evidens.
