# RavRadar 4.0.410 – friske prognoser trods kontrolfund

Dato: 2026-09-18

## Ændret

- Runtimeaudit, produktionsartifact-validering, releasegate og øvrige
  uafhængige normale driftskontroller køres videre og registrerer deres
  udfald uden alene at blokere et ellers sikkert vejrdeploy.
- Alle udfald samles i en payloadfri rapport med adskilte diagnostiske,
  operationelle og sikkerhedskritiske fund.
- Den normale runtimeaudit uploades altid, når rapporten findes.
- Den brede `LAST_MILE_STATE`-kategori er opdelt i continuation-skema, -tid,
  -momenter, -readiness, -reference og -seneste-vektor samt parent-time,
  point-vs-bounds og exact-bounds.
- Hårde sikkerhedsgrænser for target/main, privat state, artifact, privacy og
  forseglet deployhandoff er bevaret.

## Baggrund

4.0.409 blev leveret gennem exact-head `35318809153`, PR #353, main
`013baac897e2158d316301abd04193442c3a0ddb` og providerfri code-only
`35320190547`.

Normalrun `35320738621` gennemførte DMI, Copernicus, Open-Meteo, closure,
historik, central weather, proveniens og offentlig runtime. Den tidligere
prognoserevisionskonflikt var væk. Runtimeauditten fandt derefter 673 ens
last-mile-replayfejl og 420 utilgængelige aktuelle modes. Fordi auditten var
hård, blev resten af kontrollerne sprunget over, og friske prognoser blev
ikke udgivet.

## Drift

Efter exact-head og merge leveres kode providerfrit. Derefter køres én
almindelig weather på de allerede gemte cacher. Den skal samle eventuelle
fund, fortsætte til et sikkert deploy og give den præcise replayunderkategori.
Scheduler forbliver pauset, til denne kørsel og den efterfølgende normale
cachevedligeholdelse er verificeret. Ingen oneoff bruges.

RavScore-formel, vægte, aktiv modelbundle, geometri og kildeprioritet er
uændrede.
