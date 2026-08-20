# P1-komponenter og kildeskift - produktion #3245

## Datasæt

Naturlig fuld produktion `#3245` byggede `rr-20260820031545-210` ved reference-time 03:00 UTC og bestod fuld validering, releasegate, Supabase, Pages og efterfoelgende fuld browseraudit.

## Vind

- 210/210 zoner har alle 118 viste timer.
- 22.470 zonetimer er DMI, 2.310 fallback.
- Ny HARMONIE 2026-08-20 00Z er delvist indfaset med 624 zonetimer i 208 zoner.
- Alle zoner har eet `dmi -> fallback`-skift ved halen.
- Overgang: vindhastighed middel 1,13 m/s, p95 3,2; retning middel 42,676 grader, p95 154.

Den fulde viste horisont er derfor ikke bevis for fuld ny HARMONIE-cyklus. DMI-haler og fallback udfylder efter den eksisterende komponentpolitik; ingen kildeorden aendres.

## Boelger

- 194 zoner har 118 timer.
- 15 Limfjordszoner har 115 timer.
- Feggesund (`DK-B05-11`) har fortsat 0 boelgetimer og er tydeligt missing.
- WAM 2026-08-19 18Z leverer 18.879 DMI-zonetimer og er den dominerende nye cyklus.
- Overgange: boelgehoejde middel 0,107 m, p95 0,38; retning middel 21,121 grader, p95 106; periode middel 0,344 s, p95 1,3.

De 203 WAM-daekkede zoner har skift mellem DMI og fallback omkring progressive huller/kanter. Tallene dokumenteres, men begrunder ikke interpolation, stale udfyldning eller aendret mergepolitik.

## Current

- 198 zoner har 107 viste DMI-timer.
- De samme 12 parent-zoner har 0 og `no-marine-grid-point`.
- Der er 21.186 DMI-zonetimer og ingen numerisk overgangsdelta til den efterfoelgende missing-hale.
- Almindelige DMI-timedeltaer: hastighed middel 0,016 m/s, p95 0,06; retning middel 19,439 grader, p95 114.

Den kortere viste current-horisont end i tidligere artifacts afspejler reference-tidens fremrykning mod den uændrede DKSS-modelkant. Den er ikke i sig selv historikretention eller tab af de 673 lokale liveidentiteter.

## 72-timers historik

Alle 210 zoner har 65 raasamples og 34,903 timer. Den gamle `main`-enrichment har fortsat kun 55 verificerede samples i 197 zoner, 49 i en zone og nul i de 12 reelle huller; verificeret spaend er 22,563 timer i 198 zoner. Det er nyt foer-fix-bevis for reference-time-fejlen.

Ingen score-, kilde-, fallback-, geometri-, land- eller vandpunkter er aendret.
