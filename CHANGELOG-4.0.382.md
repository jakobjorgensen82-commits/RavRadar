# RavRadar 4.0.382

## Rettet

- Gendanner administrationens offentlige modulclosure. `admin.html` importerede
  en decoder, som 4.0.379 fejlagtigt havde klassificeret som ubrugt og fjernet
  fra Pages-pakken.
- Flytter den payloadfrie browserdecoder til
  `js/services/protected-runtime-envelope.js`. Den gamle diagnostiknavngivne
  sti er fjernet og forbliver fraværende fra Pages; ingen private data bliver
  offentlige.
- Kontrollerer den færdige `_site`-pakke mod den allerede forseglede
  browserclosure før produktionswrites/upload på både kode-only- og normal
  vejrvej. Closure- og privacykontrollen kører begge, før deres fælles udfald
  afgøres.

## Produktionsfund

- 4.0.381 bestod exact-head `35019932207`, PR #323 og merge til main
  `d84773a7`.
- Providerfri kode-only `35020915350` bestod actual-current-restore,
  byteidentisk contract-only-genbinding, offentlig genopbygning, privat
  publicering/anonym-afvisning, assistent-readiness og Pages-deploy.
- Pages publicerede 4.0.381 med den integrerede model, 210 zoner og 673
  kystdele. Efterkontrollen fandt derefter den reelle admin-404 og stoppede
  central maintenance-completion.
- Hele den beregnede browserclosure er HTTP-kontrolleret: 78 af 79 moduler
  svarer 200; kun den fejlagtigt udeladte decoder svarer 404.
- Den integrerede model er online, men `activeZoneCount=0` og
  `unavailableZoneCount=210`. Struktur er derfor ikke det samme som
  fungerende numeriske scorer; normal weather skal bevise og vedligeholde
  input, historik, rotation og cache efter denne kodelevering.

## Næste bevis

Én exact-head sourcegate, merge og providerfri 4.0.382-kodelevering skal
publicere alle 79 closuremoduler, gennemføre offentlig verifikation og afslutte
central maintenance. Derefter køres én normal tidsbegrænset vejrkørsel. Ingen
oneoff.
