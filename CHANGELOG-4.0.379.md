# RavRadar 4.0.379

## Rettet

- Fjerner `data/kystdata.json`, `data/zone-plan.json` og
  `js/services/runtime-diagnostics-archive.js` fra det offentlige Pages-
  artifact. Ingen af filerne bruges af den offentlige app.
- Gør samme eksklusion i både direkte code-only og normal weather, så en
  senere vejrdeploy ikke genindfører filerne.
- Bevarer `data/zones.geojson`, alle nødvendige browserfiler, de fire
  manifestbundne livefiler og hele privacy-auditen uændret.

## Evidens

- 4.0.378 code-only `34957362872` bestod central binding, privat restore,
  migration, installation, 210/673-audit, privat spec/bundle og Pages-prebuild.
- Samlet prewrite rapporterede kun privacyfejlen: tre filer og fire udslag.
  Stoppet lå før efterfølgende private, Edge- og Pages-writes.
- 4.0.379 ændrer ingen geometri, koordinater, land-/vandpunkter, vejrdata,
  score eller modelstate. Geodata får alene topversionsløft.
- Målrettet lokal kontrol, exact-head, merge og ny providerfri code-only
  dokumenteres efter udførelse. Ingen normal weather eller oneoff før modellen
  er offentligt verificeret.

## Produktionsresultat

- Exact-head sourcegate `34959283992` bestod, og PR #321 gav main
  `0cc4a867`.
- Providerfri code-only `34959875107` beviste eksklusionerne med grøn
  Pages-privacy og nåede videre gennem privat publicering, anonym-afvisning,
  assistentdeploy og readiness.
- Kørselen stoppede før Pages-begin på auditforbrugerens forældede tre-felts
  historikform. 4.0.380 retter denne og den efterfølgende current-genoptagelse;
  se DEC-0162. Ingen weather-provider kørte.
