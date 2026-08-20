# State-shadow-checkpoint - produktion #3240

## Resultat

Den strenge referencezonerapport fra produktionsdatasæt `rr-20260819230435-210` indeholder alle fire forventede referencezoner. Alle fire har:

- verificeret DMI-current med eksakt grid-, sampling-, lag- og kildeproveniens
- `shadow-v2`-state til stede
- `numericScoreChangedByReport=false`
- 15 verificerede current-timer
- 8 uverificerede current-samples
- `activeCurrentRegime=unavailable`

Det utilgaengelige aktive regime er derfor ikke en manglende rapport eller en skjult fallback. Historikken er endnu for kort/ufuldstaendig til det aktive regime, og modellen forbliver korrekt score-neutral.

## Fysisk variation i checkpointet

| Referencezone | Fase | Indtransport | Mobilisering | Naerkystpotentiale |
|---|---|---:|---:|---:|
| Agger og Krik Vig | indtransport opbygges | 3,0 t | 59,5 | 18,5 |
| Asaa og Melholt | indtransport opbygges | 2,2 t | 33,9 | 19,5 |
| Als Odde og Helberskov | indtransport opbygges | 5,2 t | 35,9 | 30,1 |
| Blaavand og Hvidbjerg | vedvarende naerkystpotentiale | 7,1 t | 77,3 | 99,0 |

Variationerne viser, at shadowfelterne ikke blot er en konstant standardvaerdi. Checkpointet beviser dog ikke faglig kalibrering, syv doegns stabilitet eller ret til numerisk scorepaavirkning.

## Naeste gate

Fortsat naturlig drift skal vise laengere verificeret dækning, fysisk forklarlige faseovergange og stabil proveniens paa de samme fire zoner. `scoreImpact` forbliver `none`. Ingen score-, kilde-, fallback-, geometri- eller punktaendring er begrundet af dette checkpoint.
