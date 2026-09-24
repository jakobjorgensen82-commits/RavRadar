# RavRadar 4.0.482 – brug samme cachebevis i begge trin

- 4.0.481 blev merged efter grøn exact-head-kontrol, men normalrun
  `35952076841` stoppede før vejrhentningen: den beskyttede aktuelle
  cache blev korrekt hentet, mens den efterfølgende lokale restore
  afviste dens gamle brede kodeaftryk.
- Det andet trin bruger nu kun forgængerens hash, når den beskyttede
  kildebeskrivelse, bundlemanifest og den eksakt godkendte 4.0.480-
  identitet stemmer i dataset, tid, model, hashes og indhold. Alle
  øvrige integritets- og tidskontroller er uændrede.
- DMI-/Copernicus-forbedringerne fra 4.0.481 er endnu ikke målt live.
  Ingen ny cache eller Pages-pakke kom fra det fejlede run. Én normal
  kørsel følger først efter grøn exact-head-kontrol og merge.
