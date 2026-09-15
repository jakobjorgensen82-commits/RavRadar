# DEC-0154 – offentlig detailruntime læses med manifestbundet størrelse

**Dato:** 2026-09-15  
**Status:** Aktiv og implementeret lokalt i 4.0.373

## Problem

4.0.372 bestod sourcegate `34923460101`, blev merged gennem PR #314 som main
`b2d401a1`, og code-only-run `34923801295` gennemførte forgængerrestore,
udpakning, binding-only migration og atomisk installation af den private
runtime. Det næste trin afviste den offentlige detailruntime, fordi læseren
havde et fast 64 MiB-loft. Det levende, hashbundne manifest oplyser eksakt
`117.820.378` ukomprimerede bytes for det komplette 210/673-datasæt.

## Beslutning

- Manifestet læses og valideres før den store detailfil.
- Manifestets `publicConditionDetailsBytes` er den eksakte læsegrænse.
- Den deklarerede størrelse skal være et sikkert heltal på mindst 2 bytes og
  højst 192 MiB.
- Den eksisterende efterfølgende kontrol af eksakt byteantal, filhash,
  payloadhash, modelbinding, datasæt og privacy bevares.
- Der indføres ingen generel ubegrænset storfilslæsning.

## Drift

Næste code-only-run genbruger central version 1, migration 16/17, privacy og
den gemte cache uden provider. Ingen oneoff eller vejrhentning indgår.
