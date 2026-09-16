# DEC-0178 – Feggesund-huller er lokale, men alle positioner skal bogføres

**Status:** Aktiv og bindende; implementeret og måltestet i 4.0.395, livebevis afventer
**Dato:** 2026-09-16

## Baggrund

4.0.394 blev leveret som main `b67459b0f7cafe85c2bfa1b8482ed7e69b3c8d11`.
Normalrun `35138332481` beviste 4.0.394-rettelsen: current closure og den
offentlige syvdøgnshistorik bestod. `update:weather` stoppede derefter på
Feggesund-beviset med 336 direkte bølgepositioner, 0 proxypositioner og 18
ærlige `MISSING`-positioner. De 18 svarer til tre kystdele i de sidste seks
prognosetimer, hvor hverken direkte data eller begge gyldige naboer fandtes.

## Beslutning

Den almindelige produktion kræver fortsat præcis `3 × 118 = 354` bogførte
Feggesund-positioner. Hver position skal være præcis én af `DIRECT`,
`FEGGESUND_TWO_NEIGHBOR_WAVE_INTERPOLATION` eller `MISSING`, og summen skal
være 354. Et ærligt `MISSING` må ikke længere stoppe hele den nationale
produktion. Det gør alene den berørte kystdel og time `UNAVAILABLE`.

Forkert antal, overlap, ukendt disposition, ændret delmængde, manipuleret
proof, ugyldig direct/proxy-lineage eller en delvis bølgetuple stopper fortsat.
Rettelsen opfinder ingen bølger, flytter ingen punkter og ændrer ikke
direct-first/two-neighbor-reglen.

## Afgrænsning

Det tidligere krav om `direct + proxy = 354` og `missing = 0` er
supersederet som global gate for almindelig produktion. En særskilt
komplethedsprobe må fortsat måle nul missing som driftsmål; den må ikke
omfortolke et ærligt lokalt hul som national datakorruption.

En valideret supplerende bølgekilde til Feggesunds hale skal undersøges
senere. Indtil en sådan kilde er fagligt godkendt, er lokal `MISSING` bedre
end syntetiske eller forkert lånte data.

## Bevis

De målrettede Feggesund-/DMI-integrationskontroller og den fulde 210/673
public-runtimeaudit består med én ærlig missing-position, mens ufuldstændig
bogføring fortsat afvises. Exact-head og normal liveproduktion afventer.
