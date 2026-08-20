# Produktionsworkflowets varighed - 4.0.237

## Maaling

De seneste fire fulde naturlige `build-and-prepare`-jobs maalte:

| Run | Varighed |
|---|---:|
| #3237 | 14,70 min |
| #3238 | 7,30 min |
| #3240 | 18,45 min |
| #3242 | 11,48 min |

Gennemsnittet er 12,98 minutter. Minimum er 7,30 og maksimum 18,45 minutter. Pages-deploy efter et fuldt build tog 8-9 sekunder.

Runs `#3239`, `#3241`, `#3243` og `#3244` sprang korrekt det tunge build og deploy over efter en kort current-hour-readiness. Der blev ikke bygget eller deployet et nyt artifact i disse runs.

## Koeadfaerd og beslutning

`#3240` overskred 15 minutter, men den naeste observerede produktion `#3241` startede foerst efter afslutningen. De maalte runs viser derfor ingen samtidig tung produktion og ingen Pages-koe. GitHub-schedule leveres ikke med en praecis 15-minuttersgaranti, saa datasættet kan ikke bruges til at love en bestemt startfrekvens.

Varighedsissuet forbliver aktivt. Der aendres ikke paa DMI-budgetter, collection-raekkefoelge, cache, marine audits, 673/673-gate, validering eller releasegate alene for at reducere tiden. Naeste meningsfulde trin er trinvis jobprofilering paa et nyt langsomt fuldt build, ikke en kodeaendring baseret paa samlet jobtid.
