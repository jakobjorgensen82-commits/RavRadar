# Daglig Copernicus-shadow-eftermåling - 2026-08-20

## Konklusion

Den naturlige private cache vokser fortsat uden tegn på gitter- eller lagdrift. Pilot `#58` (`32312522005`) indsamlede den nye 23:00 UTC-time og udvidede evidensen fra 35 til 37 gyldige timer. Den efterfoelgende planlagte pilot `#59` var groen og uploadede korrekt intet nyt artifact, fordi samme UTC-time allerede fandtes.

## Måling

| Felt | Resultat |
|---|---:|
| Gyldige timer | 37 |
| Første tid | 2026-08-18 11:00 UTC |
| Seneste tid | 2026-08-19 23:00 UTC |
| Shadow-poster | 23.273 |
| Unikke mål | 625 |
| Mål/kilde-par | 629 |
| Gitterustabile mål/kilde-par | 0 |
| Lagustabile mål/kilde-par | 0 |
| Baltic-observationer | 20.424 |
| AMM15-observationer | 2.849 |

Piloten verificerede 625 af 673 mål inden for 5 km; 48 havde fortsat intet Copernicus-par. Dette er forventet shadowdækning og ændrer ikke den aktive DMI-first-livekæde. `scoreImpact=false`, `publicRuntime=false`, retention er 168 timer, og interpolation er deaktiveret.

## Drift

- Pilot `#58` var groen med ny 23 UTC-time; planlagt dubletkontrol `#59` var groen uden nyt artifact.
- Preserve `#153` og workflow-run-preserve `#154` var grønne.
- Den samtidige naturlige produktion `#3237` bestod current-hour readiness, hele `build-and-prepare` og Pages-deploy. Den efterfølgende fulde livebrowseraudit var grøn på datasæt `rr-20260819213342-210`.
- Der er ikke fremkaldt ekstra pilot- eller produktionsruns.

## Næste kontrol

Næste cacheeftermåling udføres tidligst næste kalenderdag. Det fulde 168-timersvindue er endnu ikke nået og må ikke beskrives som afsluttet. Ingen rå U/V, credentials, land-/vandpunkter eller produktionsdata er skrevet til repositoryet.
