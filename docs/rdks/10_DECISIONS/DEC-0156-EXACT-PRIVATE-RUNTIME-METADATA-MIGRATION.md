# DEC-0156 – alle gemte modelbindinger migreres som én eksakt metadataændring

**Dato:** 2026-09-15  
**Status:** Aktiv og implementeret lokalt i 4.0.375

## Problem

PR #316 bestod sourcegate `34933609573` og blev merged som main `dd59bc51`.
Code-only-run `34934257354` genbrugte den allerede beviste kæde, gendannede den
private runtime og nåede frem til den offentlige genopbygning uden provider.

Den gamle migration ændrede kun rootbindingen, 673 wrappers og continuation
states samt tre ydre Candidate G-bindinger. `conditions.json` bærer imidlertid
samme modelidentitet flere steder: scoreprofiler, kompakte private resultater,
indlejrede `modelBinding`-objekter, forklaringer, offentlige delresultater,
zone-timer og Candidate G-runtime. Derfor stoppede genopbygningen først på
scoreprofilens gamle bundlehash. At rette kun denne ene placering ville blot
flytte stoppet til den næste.

## Beslutning

- Hele `conditions.json` gennemgås rekursivt, også arrays.
- En gammel bundlehash må kun migreres, når dens objekt er én af tre eksakte
  former: fuld 11-feltsbinding, eksakt offentlig scoreprofil eller kompakt
  resultat med samme model-id, kontrakthash og eksakte indlejrede binding.
- Kun `modelBundleSha256` ændres. Ukendte eller modstridende forekomster
  afvises.
- `currentState` og `continuationState` røres ikke af den generelle gennemgang.
  Den integrerede statehash opdateres særskilt for hver af de 673 dele efter
  gammel validator og accepteres kun af den aktuelle validator bagefter.
- Candidate G-state skal forblive byteidentisk.
- De præcise ændrede leaf-paths danner en dynamisk allowlist. Den faktiske diff
  skal være identisk med denne allowlist, og ingen gammel integreret eller
  Candidate G-bundlehash må være tilbage.
- De øvrige otte private runtimefiler skal fortsat være byteidentiske.

## Drift

Næste code-only-run genbruger central version 1, migration 16/17, sourcebevis,
privacy og den eksakte gemte runtime. Ingen DMI-, Copernicus- eller
Open-Meteo-hentning og ingen oneoff indgår. Efter offentlig verifikation køres
normal weather separat og tidsbegrænset.

