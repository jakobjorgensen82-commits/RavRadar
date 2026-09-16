# RavRadar 4.0.396 – prognoser med ærlig delvis zonedækning

## Levende fund

- 4.0.395 bestod exact-head `35146153044`, PR #339 og providerfri deploy
  `35146689278` som main `349a27021cd244c10b00ab777ba078edb7c1c312`.
- Normalrun `35147366418` gennemførte DMI, Copernicus, Open-Meteo, closure og
  syvdøgnshistorik, men stoppede før deploy med
  `Public RavScore winning-part uncertainty flag is inconsistent`.
- Vejrdata og providerfremgang blev gemt. Den offentlige side beholdt derfor
  det tidligere datasæt i stedet for at få et halvt bygget datasæt.

## Rodårsag og rettelse

- Zoneberegningen markerede korrekt delvis dækning og usikker vinder.
- `buildLocalZoneScore` bevarede ikke status, delantal, score-spredning,
  manglende dele og direkte modelbinding på det resultat, som den offentlige
  prognose bruger.
- 4.0.396 fører hele denne validerede metadata videre. Kontrollen svækkes
  ikke; den får nu de oplysninger, som scoreberegningen allerede havde.
- En målrettet regression sender en `FULL_HISTORY`-score med ét lokalt hul
  gennem `buildPublicNationalForecast` og beviser, at scoren når frem som en
  ærligt markeret delvis zone.
- Den lokale visningstests forældede tekstsøgning følger nu appens eksisterende
  nøddata-gren; den kan dermed ikke blokere produktionen på en sikker adfærd,
  som allerede var indført.

## Drift

- Næste trin er exact-head-kildegate, merge, providerfri code-only og én
  normal vejrkørsel med de allerede gemte providerfremskridt.
- Ingen oneoff. Scheduler forbliver pauset, indtil frisk offentlig prognose,
  score og fuld produktionskæde er grønne.

## RavScore-binding

- Første exact-head-kørsel `35155765121` fortsatte hele kontrolforløbet og
  bestod de øvrige runtime-, vejr-, privacy- og deploykritiske kontroller.
  Den stoppede kun på en forældet RavScore-bundlehash, fordi
  `local-zone-score.js` indgår i den forseglede modelclosure.
- Den fælles resultatbygger indgår også i den private Candidate G-rollback.
  Rollback blev derfor genbygget først til `da27b811…`; den afhængige
  integrerede modelbundle blev derefter deterministisk genbundet til
  `d9ba75ed7f7ff2b477676e418a3ede61adf90b00aca77259bb6ccd73ee3f2906`.
  Continuation-kontrakten følger samme fælles kode og er genbundet til
  `d20939c1b141a763fb20aa39b39506d79bf150860714bf1ce306f64d5314e7e6`.
  Den allerede anvendte migration `20260916120000` forbliver urørt; den nye
  append-only migration `20260917001500_partial_zone_public_metadata_binding`
  fører bindingen frem som migration nummer 19.
