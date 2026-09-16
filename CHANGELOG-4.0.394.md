# RavRadar 4.0.394 – kanonisk Open-Meteo-restorden

## Levende fund

- 4.0.393 bestod sourcegate `35130086861`, PR #337 og providerfri deploy
  `35130668700`.
- Normalrun `35131237007` gemte alle providercacher og byggede en gyldig
  closure med 79.276 værdier og 138 lokale `MISSING`.
- History-adapteren afviste restlisten, fordi positive og missing par stod i
  to blokke i stedet for én fælles kanonisk rækkefølge.

## Rettelse

- Den eksakte positive+missing-rest sorteres efter `validTime` og `partId`
  før Open-Meteo-dokumentet genvalideres.
- Ingen værdier, huller, hashes, counts eller kildebindinger ændres.
- Regressionstesten har nu et missing-par før en senere positiv record.

## Næste produktionsbevis

- Én exact-head sourcegate, merge og providerfri code-only-genbinding.
- Én almindelig weather på de gemte cacher; ingen oneoff.
- Scheduler forbliver pauset, indtil historik, RavScore, fulde gates og
  deploy er grønne.
