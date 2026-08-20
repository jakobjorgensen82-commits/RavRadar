# Daglig Copernicus-shadow-eftermåling - 2026-08-20

## Konklusion

Den naturlige private cache vokser fortsat uden tegn på gitter- eller lagdrift. Pilot `#62` (`32323819599`) indsamlede den nye 02:00 UTC-time og udvidede evidensen fra 38 til 40 gyldige timer. De naturlige pilot- og preserve-kørsler mellem målingerne var grønne.

## Måling

| Felt | Resultat |
|---|---:|
| Gyldige timer | 40 |
| Første tid | 2026-08-18 11:00 UTC |
| Seneste tid | 2026-08-20 02:00 UTC |
| Shadow-poster | 25.160 |
| Unikke mål | 625 |
| Mål/kilde-par | 629 |
| Gitterustabile mål/kilde-par | 0 |
| Lagustabile mål/kilde-par | 0 |
| Baltic-observationer | 22.080 |
| AMM15-observationer | 3.080 |

Piloten verificerede 625 af 673 mål inden for 5 km; 48 havde fortsat intet Copernicus-par. Dette er forventet shadowdækning og ændrer ikke den aktive DMI-first-livekæde. `scoreImpact=false`, `publicRuntime=false`, retention er 168 timer, og interpolation er deaktiveret.

## Drift

- Pilot `#62` var groen med ny 02 UTC-time; den mellemliggende naturlige pilot `#61` var også groen.
- Produktionsrun `#3244` bestod current-hour readiness og sprang korrekt både `build-and-prepare` og deploy over; det skabte intet nyt produktionsartifact.
- Preserve `#153` og workflow-run-preserve `#154` var grønne.
- Den samtidige naturlige produktion `#3237` bestod current-hour readiness, hele `build-and-prepare` og Pages-deploy. Den efterfølgende fulde livebrowseraudit var grøn på datasæt `rr-20260819213342-210`.
- Der er ikke fremkaldt ekstra pilot- eller produktionsruns.

## Næste kontrol

Næste cacheeftermåling udføres tidligst næste kalenderdag. Det fulde 168-timersvindue er endnu ikke nået og må ikke beskrives som afsluttet. Ingen rå U/V, credentials, land-/vandpunkter eller produktionsdata er skrevet til repositoryet.
