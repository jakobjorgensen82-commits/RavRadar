# RavRadar 4.0.377

## Rettet

- 4.0.376 bestod exact-head-kontrollen `34941640752`, blev merged gennem PR
  #318 som main `3144c557`, og providerfri code-only `34942127741` kom gennem
  gendannelse, komplet metadataoverførsel, atomisk privat installation,
  offentlig genopbygning og den samlede 210/673-kontrol.
- Runnet stoppede før ny privat publicering og Pages, fordi specifikationen
  læste DMI fra den midlertidige vejrhentningsfil
  `.cache/dmi-candidate-progress.json`. Code-only havde korrekt installeret den
  komplette cache i `data/live/dmi-bulk-cache.json`.
- Code-only bruger nu den kanoniske installerede DMI-cache. Der hentes stadig
  ingen data hos DMI, Copernicus eller Open-Meteo.
- En ny privat runtime med samme vejrtid som forgængeren accepteres kun med et
  eksakt migrationsbevis: samme ni filer og 210/673-inventar, byteidentiske
  otte øvrige filer, uændrede målinger og states samt præcis tilladt
  modelmetadataændring i `conditions.json`.

## Kontrol

- Migrationsrapporten binder den skrevne `conditions.json` med præcist
  byteantal og SHA-256.
- Testene dækker den kanoniske DMI-sti, afvisning uden migrationsbevis, gyldig
  samme-tids-efterfølger og afvisning ved ændrede målinger.
- Ingen scoreformel, vejrdata, måling, state, geometri eller land-/vandpunkt er
  ændret.
