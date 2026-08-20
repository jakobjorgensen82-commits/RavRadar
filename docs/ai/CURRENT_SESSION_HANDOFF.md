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

## 4.0.238-kandidat

- P0.1 er afsluttet i `2db2cd2b` og `e197a196`.
- `release/RavRadar-4.0.238.zip` er bygget reproducerbart fra committen: 972 filer og 13.878.902 byte.
- Lokal RDKS, historik, timeskiftelås, DMI, forecastintegration, vandkæde, workflowrækkefølge, browser-syntaks, versionskontrol og releasegate er grønne.
- GitHub PR-gate `#32342936407` er grøn på `e197a196`.
- PR #1 er fortsat draft og må ikke merges uden ejerens udtrykkelige beslutning.

## Seneste naturlige evidens

- Produktion #3249 på gammel `main` bestod fuld validering, releasegate, Supabase og Pages, men er ikke kandidatbevis.
- Naturlig Copernicus-pilot `#32342023293`/artifact #70 har 45 eksakte timer, 28.305 private poster, 625 unikke mål, 629 mål/kilde-par og nul gitter-/lagustabilitet.
- Piloten er fortsat score-neutral, privat og uden interpolation. Det fulde 168-timersvindue er endnu ikke nået.
- De 12 reelle hovedzonehuller for verificeret strøm og Feggesunds reelle bølgemangel skal fortsat være `missing`.

## Næste bindende trin

1. Merge ikke PR #1 uden ejerens udtrykkelige beslutning.
2. Fortsæt ikke-blokeret naturlig Copernicus-overvågning mod 168 timer og Supabase-forbrugsovervågning.
3. Efter sikker merge: kør frisk fuld central produktion over et UTC-timeskifte og bevis historik, bølgehuller, DMI-first-hale og alle gates.
4. Forsøg Browser-pluginet først. Hvis hostfejlen ikke har en konkret løsning, brug den godkendte Playwright/Chromium-fallback og gentag 210/673/420/2.100-kontrollen mod live 4.0.238.
