# RavRadar 4.0.373 – manifestbundet offentlig detailruntime

**Dato:** 2026-09-15  
**Status:** Lokal releasekandidat; exact-head PR-gate, merge og providerfri code-only mangler.

## Produktionsbevis før rettelsen

4.0.372 bestod sourcegate `34923460101`, blev merged via PR #314 som main
`b2d401a1`, og run `34923801295` gennemførte cachemigrationen og installerede
den private runtime atomisk med den aktuelle modelbinding. Ingen provider blev
kaldt.

Det næste trin stoppede før publicering, fordi den komplette offentlige
detailfil er `117.820.378` bytes, mens læserens gamle faste loft var 64 MiB.

## Rettelse

Manifestet valideres først. Dets eksakte detailfilstørrelse bruges som
læsegrænse inden for et fast 192 MiB sikkerhedsloft. Eksakt byteantal, filhash,
payloadhash, modelbinding, datasæt, projektion og privacy kontrolleres fortsat.

Ingen data, score, state, migration, geometri eller provider ændres. Se
DEC-0154.
