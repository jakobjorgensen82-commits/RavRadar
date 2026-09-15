# RavRadar 4.0.381

## Rettet

- Accepterer den virkelige kode-only-situation, hvor den aktive private
  runtime allerede bruger samme RavScore-model som den nye kode.
- Kopierer i dette tilfælde alle ni private runtimefiler byte-for-byte og
  opdaterer kun deres verificerede kodekontrakt; vejr, målinger, scorer og
  modeltilstand ændres ikke.
- Udvider same-reference-beviset med to adskilte udfald: eksakt
  modelbindingsovergang eller eksakt kontrakt-only-genbrug.
- Lægger for kode-only den centrale historiske statusopdatering efter et
  bestået Pages-deploy og en bestået offentlig modelverifikation. En ren
  status-/planfejl kan derfor rapporteres efter, at den sikre side er online.
- Bevarer hårde stop ved forkert/privateksponerende artifact, model- eller
  kildeuoverensstemmelse samt en commit, der ikke længere er nyeste `main`.

## Evidens

- 4.0.380 bestod sourcegate `35015984953`, PR #322 og merge til main
  `de8ae966`.
- Providerfri `35016734197` beviste exact source-genbrug, central læsning,
  databaseled, dynamisk current-source, forgængerrestore og bundlekontrol. Den
  stoppede alene, fordi uændret model fejlagtigt blev klassificeret som en
  umulig migration. Ingen provider eller Pages kørte.
- De målrettede migration-, protected-runtime-, code-only- og reusable-
  workflowkontroller samt YAML- og diffkontrol er grønne lokalt.
- Geometri, koordinater, vejrdata, scoreformel og private modelstates ændres
  ikke. Geodata får alene topversionsløft til 4.0.381.

## Næste bevis

Én exact-head sourcegate, merge og providerfri kode-only skal publicere og
verificere Pages. Først derefter køres normal tidsbegrænset weather for tal,
scorer, DMI-rotation og cache. Ingen oneoff.

## Faktisk produktionsresultat

Exact-head `35019932207`, PR #323 og main `d84773a7` blev grønne.
Providerfri `35020915350` bestod contract-only-genbindingen og deployede Pages.
4.0.381 og den integrerede model er offentlige, men efterkontrollen fandt en
reel HTTP 404 i admin-dashboardets browserclosure. Central maintenance blev
derfor ikke afsluttet. Rettelsen fortsætter i 4.0.382/DEC-0164.
