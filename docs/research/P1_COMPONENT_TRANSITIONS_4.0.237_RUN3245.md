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

## Vandstand

- 202 zoner har alle 118 viste timer; otte Limfjordszoner har 107 timer.
- 22.470 zonetimer er DMI, 2.222 fallback og 88 eksplicit missing.
- Alle 210 zoner har eet kildeskift: 202 `dmi -> fallback` og otte `dmi -> missing`.
- Ved de 202 numeriske DMI/fallback-overgange er forskellen i vandstand middel 2,099 cm, p95 9 cm og maksimum 22 cm.

De otte `dmi -> missing`-haler ligger i `DK-B05-14`, `DK-B05-16`, `DK-B05-17`, `DK-B05-18`, `DK-B05-19`, `DK-B05-22`, `DK-B05-23` og `DK-B05-24`. De fremstilles ikke som numeriske overgange og udfyldes ikke kunstigt.

### Klassifikation af de otte Limfjordshaler

Artifactets timeposter viser en ens, skarp modelkant: sidste gyldige DKSS-vandstand og -temperatur er 24. august kl. 13 UTC, og begge felter er `missing` fra kl. 14 til 00 i alle otte zoner. Nabozonerne `DK-B05-13`, `DK-B05-15`, `DK-B05-20` og `DK-B05-21` har samme DKSS-sluttid, men skifter paa kl. 14 til henholdsvis `open-meteo-adjusted` og `open-meteo`.

Den aktuelle mergekode kopierer Open-Meteo Marine-vaerdien direkte, naar DMI-feltet er tomt. Den markerer kun komponenten `missing`, hvis den tilsvarende raa marine fallbackvaerdi er `null`; der findes ingen zone-, routing- eller afstandsfiltrering i dette mergeled. Halerne er derfor klassificeret som manglende raa marine fallbackfelter ved de otte eksisterende zonepunkter, ikke som tab i vandstandsrouting eller en senere mergefejl.

Der flyttes ingen punkter, og der indfoeres ingen syntetisk udfyldning. En eventuel forbedring kraever foerst et særskilt dokumenteret fallbackdesign med proveniens og konsekvensanalyse for RavScore/UI.

## Vandtemperatur

- Den samme fordeling gaelder: 202 zoner har 118 timer, og de otte Limfjordszoner har 107 timer.
- 22.470 zonetimer er DMI, 2.222 fallback og 88 eksplicit missing.
- Alle 210 zoner har eet kildeskift: 202 `dmi -> fallback` og otte `dmi -> missing`.
- Ved de 202 numeriske DMI/fallback-overgange er forskellen i vandtemperatur middel 1,653 grader C, p95 2,9 og maksimum 5,0.

Vandstand og vandtemperatur har altsaa data i alle zoner, men ikke fuld vist hale i otte zoner. Maalingen dokumenterer den eksisterende progressive merge; den er ikke i sig selv grundlag for nye permanente graenser eller aendret fallback.

## 72-timers historik

Alle 210 zoner har 65 raasamples og 34,903 timer. Den gamle `main`-enrichment har fortsat kun 55 verificerede samples i 197 zoner, 49 i en zone og nul i de 12 reelle huller; verificeret spaend er 22,563 timer i 198 zoner. Det er nyt foer-fix-bevis for reference-time-fejlen.

Ingen score-, kilde-, fallback-, geometri-, land- eller vandpunkter er aendret.
