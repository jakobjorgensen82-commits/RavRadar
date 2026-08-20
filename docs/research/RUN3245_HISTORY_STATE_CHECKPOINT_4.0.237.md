# Historik- og state-checkpoint - produktion #3245

## Produktionsstatus

Naturlig produktion `#3245` (`32327270685`) bestod current-hour readiness, `build-and-prepare`, fuld validering, releasegate, Supabase, Pages-artifact og deploy. Datasættet er `rr-20260820031545-210` med `productionReferenceAt=2026-08-20T03:00:00Z`.

Runnet koerer fortsat den uændrede `main` og indeholder ikke reference-time-fixet fra kladde-PR `#1`. Det kan derfor bruges som nyt foer-fix-bevis, ikke som produktionsverifikation af kandidaten.

## Raa 72-timershistorik

Alle 210 zoner har ens:

- 65 `samples72h`
- foerste sample `2026-08-18T16:05:48.548Z`
- seneste sample `2026-08-20T03:00:00.000Z`
- spaend `34,903` timer

Den raa historik vokser altsaa naturligt og ensartet. 72-timers exitkriteriet er endnu ikke naaet.

## Verificeret current og state

State-rapporten har fortsat 4/4 verificerede referencezoner, 4/4 shadow-states og `numericScoreChangedByReport=false`. Sammenlignet med `#3240` aendres historikfelterne dog saadan:

| Felt | #3240 | #3245 |
|---|---:|---:|
| Verificeret current-dækning | 15,0 t | 10,1 t |
| Uverificerede samples | 8 | 10 |
| Aktivt current-regime | unavailable | unavailable |

Faldet sker samtidig med, at raa 72-timershistorik vokser. Det er dermed ikke retentiontab. Det er den kendte koblingsfejl, hvor produktionen lagrer samplet paa `productionReferenceAt`, mens den gamle enrichment matcher `generatedAt`; nye raasamples bliver derfor fejlagtigt staaende som uverificerede.

Branchens isolerede artifact-replay har allerede vist, at reference-time-fixet loefter de 198 verificerbare parent-zoner uden backfill og uden at udfylde de 12 reelle `no-marine-grid-point`-huller. `#3245` skaerper behovet for fixet, men kandidaten maa fortsat gennem korrekt versionspakke, main-gates og frisk produktion foer den kaldes live.

Ingen score-, kilde-, fallback-, geometri-, land- eller vandpunkter er aendret af denne analyse.
