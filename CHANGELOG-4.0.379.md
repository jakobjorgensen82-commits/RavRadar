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
