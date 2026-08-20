# RavRadar - aktuelt Codex-handoff

## Arbejdssted og branch

- Brug kun `C:\Users\jakob\AppData\Local\Temp\ravradar-40232-current`.
- Aktiv branch er `codex/verify-4.0.238` fra merge-commit `b8844841` på `main`.
- Desktop-klonen er gammel og dirty og må ikke bruges til dette spor.

## Beskyttet lokalt arbejde

Disse fire eksisterende dirty filer må aldrig ændres, stages eller committes:

- `data/diagnostics/current-spatial-audit-4.0.76.json`
- `data/diagnostics/state-reference-zones.json`
- `data/diagnostics/zone-geometry-audit.json`
- `data/live/coastal-parts-v2.json`

Der må ikke flyttes land-/vandpunkter.

## 4.0.238 produktion

- Kandidaten blev afsluttet i `2db2cd2b`, `e197a196`, `3dcd93c6` og `e89778f9`; PR #1 er merged som `b8844841` efter ejerens udtrykkelige godkendelse.
- `release/RavRadar-4.0.238.zip` bygges reproducerbart med 972 filer og er et lokalt, ikke-committet artifact. Kør pakkeren efter enhver ny slutcommit; dens output er den autoritative bytekontrol.
- Push-kørsel `#32344813967` bestod central adminhydrering, frisk DMI, fuld validering, releasegate, Supabase og Pages.
- Support `RavRadar-support-3252`/datasæt `rr-20260820074127-210` viser 210 zoner, de seks tidligere bølgehuller lukket til 118 timer og verificeret historik vokset til 39,594 timer.
- Live 4.0.238 er browserkontrolleret med nul fejl i 210 zoner, 673 dele, 420 aktuelle paneler og 2.100 femdøgnsvalg samt mobil og desktop.

## Seneste naturlige evidens

- Readiness-run `#32347036227` sprang korrekt produktionen over uden artifact, fordi UTC-time 08 endnu ikke var komplet.
- Automatisk Copernicus-pilot `#32347060320`/artifact #72 gjorde time 08 klar og har nu 46 eksakte timer, 28.934 private poster, 625 unikke mål, 629 mål/kilde-par og nul gitter-/lagustabilitet.
- Piloten er fortsat score-neutral, privat og uden interpolation. Det fulde 168-timersvindue er endnu ikke nået.
- De 12 reelle hovedzonehuller for verificeret strøm og Feggesunds reelle bølgemangel skal fortsat være `missing`.

## Næste bindende trin

1. Følg næste kvalificerede naturlige produktion, som starter før og slutter efter et UTC-timeskift; ingen manuel omgåelse af readiness-gaten.
2. Fortsæt naturlig Copernicus-overvågning fra 46 mod 168 timer og Supabase-forbrugsovervågning.
3. Fortsæt DEC-0030 med nye uafhængige HARMONIE-, WAM- og DKSS-cyklusser samt de kendte strøm-, bølge- og Limfjordshuller uden kunstig udfyldning.
4. Commit og push kun den afsluttede dokumentationsopfølgning; stage aldrig de fire beskyttede lokale datafiler eller verifikationsmapperne.
