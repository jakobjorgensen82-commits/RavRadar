# DEC-0262 – Sikker årsagsklasse for DMI-bølger fra samme modelkørsel

**Status:** Aktiv diagnostisk beslutning; lokal 4.0.515-kandidat, endnu ikke livebevist
**Dato:** 2026-09-30

## Evidens

Kort normalrun `36650098594` på main 4.0.514 gendannede eksakt
`36645991041-1`, gennemførte DMI, Copernicus og Open-Meteo og nåede
central cache. Bølgereplay stoppede igen på
`RAVSCORE_RECOVERY_REPLAY_CONFLICT`. 4.0.513's indholdsfri
kandidatdiagnose så syv overlap mellem to validerede DMI-kilder fra
samme `modelRun`: to med forskellige fysiske bølgeværdier og fem med
samme værdier. De syv er **mulige** par efter kildeprojektion, ikke
bevis for hvilket par replayet først afviste. Den krypterede fremdrift
blev gemt som `36650098594-1`; intet nyt produktionsartifact, CAS,
R2 eller Pages blev udgivet. Ekstern cron forbliver pauset.

## Beslutning

1. Bevar DEC-0192/DEC-0229: samme modelkørsel med modstridende
   værdier må kun overtage en gammel gyldig DMI-værdi ved bevist
   nyere officiel revision. Uafklarede par stopper fortsat fail-closed.
2. Udvid alene fejlstiens aggregat med faste klasser for, om de to
   DMI-kilder har sammenlignelig identitet, om en officiel revision
   kan rangordnes, eller om native trin, revisionsdato eller
   gitter-/kildeidentitet hindrer sammenligningen. Skeln samtidig
   mellem samme og forskellige fysiske værdier.
3. Log kun antal og faste feltnavne/klasser. Log aldrig kystdel,
   klokkeslæt, koordinat, bølgeværdi, rå proveniens, kilde-id eller
   privat payload. Kategorierne er fortsat kandidater og må ikke
   alene afgøre en kildeprioritet.
4. Efter måltest, exact-head source-CI og sikker merge må højst én
   kort normal bekræftelse genbruge præcis `36650098594-1` og den
   beskyttede produktionsbaseline. Den skal enten levere gennem
   fulde gates eller give de sikre årsagsklasser til en dokumenteret
   adfærdsrettelse. Ingen lang, overlappende eller blind oneoff-kørsel.

## Afgrænsning

Denne beslutning ændrer ikke vejrværdier, DMI-/reserveprioritet,
RavScore, modelbundle, central admininterpolation, Limfjord-reglen,
no-loss, cacheformat, scheduler eller offentlig visning. Grønt
kildecheck er ikke produktionsbevis.
