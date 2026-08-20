# RavRadar - aktuelt Codex-handoff

## Arbejdssted og branch

- Brug kun `C:\Users\jakob\AppData\Local\Temp\ravradar-40232-current`.
- Aktiv branch er `codex/current-coverage-4.0.232`; draft-PR #1 peger mod `main`.
- Desktop-klonen er gammel og dirty og må ikke bruges til dette spor.

## Beskyttet lokalt arbejde

Disse fire eksisterende dirty filer må aldrig ændres, stages eller committes:

- `data/diagnostics/current-spatial-audit-4.0.76.json`
- `data/diagnostics/state-reference-zones.json`
- `data/diagnostics/zone-geometry-audit.json`
- `data/live/coastal-parts-v2.json`

Der må ikke flyttes land-/vandpunkter.

## Aktuel kandidat

- 4.0.238 samler historikmatch på `productionReferenceAt`, et låst Open-Meteo-vindue over UTC-timeskifte, den kildebaserede PR-gate og et versionsbundet browserbevis.
- PR-kontrollen må ikke hente secrets, hydrere central sandhed, bygge produktionsdata eller deploye.
- Browserbeviset kræver liveversion 4.0.238 og kontrollerer 210 zoner, 673 delreferencer, 420 aktuelle paneler, 2.100 femdøgnsvalg, score/farve/pile/forklaring og seks vejrmetrikker.
- Ingen geometri, punkter, U/V, kildeorden, afstandsgrænser eller RavScore er ændret.

## Seneste eksterne evidens

- PR #1 var draft, mergeable og grøn på `Source validation and release gate` før 4.0.238-pakken.
- Naturlig produktion #3249 på gammel `main` bestod begge fulde gates, Supabase og Pages.
- #3249 har 198 zoner med verificeret aktuel strøm og 12 reelle `NO_SHARED_MARINE_GRID_POINT`-huller, men verificeret historik står stadig på 22,563 timer. Det er gammelkodens symptom og ikke kandidatbevis.
- Feggesund (`DK-B05-11`) mangler fortsat reelle bølgedata og må ikke udfyldes kunstigt.

## Næste bindende trin

1. Kør kandidatens relevante kildechecks og releasegate uden at skrive de beskyttede datafiler.
2. Commit og push kun den afgrænsede 4.0.238-pakke; kontroller PR-gaten.
3. Merge ikke PR #1 uden ejerens udtrykkelige beslutning.
4. Efter sikker merge: kør frisk fuld central produktion over et UTC-timeskifte og bevis historik, bølgehuller, DMI-first-hale og alle gates.
5. Forsøg Browser-pluginet først. Hvis den kendte hostfejl ikke har en konkret løsning, brug den godkendte Playwright/Chromium-fallback og gentag hele 210/673/420/2.100-kontrollen.
