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

## Trinprofil for #3240

Det langsomste build er profileret pr. GitHub-step:

| Trin | Tid |
|---|---:|
| Update DMI bulk model cache | 797 sek. |
| Update central weather cache | 72 sek. |
| Fuld projektvalidering | 50 sek. |
| Hydrate latest deployed weather state | 40 sek. |
| Restore DMI GRIB-cache | 33 sek. |
| Save DMI GRIB-cache | 24 sek. |

DMI bulk stod alene for 13,28 minutter og cirka 72 % af hele buildjobbet. Releasevalidering, Supabase og Pages er ikke den dominerende aarsag i dette run.

## DMI bulk internt i #3240

- Arbejdsbudgettet var 780 sekunder med 120 sekunders afslutningsreserve.
- `wam_dw` behandlede og checkpointede alle 47 forecasttrin. Foerste trin brugte cirka 168 sekunder frem til checkpoint; hele collectionen brugte cirka 559 sekunder.
- `wam_nsb` checkpointede 21 af 46 forecasttrin. Foerste trin brugte cirka 53 sekunder; de efterfoelgende trin cirka 8 sekunder hver inklusive overhead.
- De viste trin var `downloadet`, ikke genbrugt fra raasset-cache.
- Et 22. NSB-trin blev paabegyndt ved 780,7 sekunder, men checkpointet forblev paa 21 trin, da arbejdsbudgettet var overskredet. Delvis fremdrift blev dermed ikke fremstillet som gemt.

Den konkrete driver var altsaa indfasning af en ny WAM-cyklus uden raasset-hit, foerst hele `wam_dw` og derefter progressiv `wam_nsb`. Det forklarer baade varigheden og, hvorfor kun to collections blev behandlet under `DMI_BULK_COLLECTIONS_PER_RUN=2`.

Varighedsissuet forbliver aktivt. Der aendres ikke paa DMI-budgetter, collection-raekkefoelge, cache, marine audits, 673/673-gate, validering eller releasegate alene for at reducere tiden. Naeste meningsfulde trin er at sammenligne en senere cache-hit-kørsel med samme WAM-cyklus og maale, om foerste-step-omkostningen gentager sig.
