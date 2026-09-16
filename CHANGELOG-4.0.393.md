# RavRadar 4.0.393 – lokal missing gennem Open-Meteo-adapteren

## Normal vejropdatering

- 4.0.392 blev leveret som main `e84fba55` gennem sourcegate
  `35119195730` og providerfri deploy `35120023098`.
- Normalrun `35120782348` gemte DMI-, Copernicus- og Open-Meteo-fremgang og
  byggede en gyldig `READY_WITH_MISSING`-closure: 79.075 validerede værdier
  og 339 lokale `MISSING` ud af 79.414 par.
- Runnet stoppede bagefter, fordi public-history-adapteren validerede den
  ufuldstændige Open-Meteo-cache mod kun de 34.218 positive værdier og
  samtidig krævede global `COMPLETE`.

## Rettelse

- Adapteren validerer nu den eksakte closure-rest: både de positive
  Open-Meteo-værdier og de præcise lokale `MISSING`-par.
- Kun de positive records publiceres som strømdata. Lokale huller forbliver
  huller og kan kun gøre de berørte resultater utilgængelige.
- Dokumenthash, recordhash, targetregister, upstream-bindinger, antal
  værdier og antal huller skal fortsat matche closure præcist.
- Helikopterkontrollen fandt ingen tilsvarende global komplethedsgate i de
  efterfølgende RavScore-, public-runtime- eller deployled.

## Kontrol

- Målrettede closure-, Open-Meteo-, live-adapter-, offentlig runtime- og
  integreret 210/673-audittests er grønne.
- Exact-head sourcegate, merge, providerfri genbinding og en ny almindelig
  weather-kørsel afventer.
