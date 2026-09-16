# RavRadar 4.0.390 – forlænget DMI/Copernicus-bootstrap efter cutover

## Ændret

- Den normale orchestrator får et eksplicit, main-only
  `extended_provider_bootstrap`, som kræver `force=true`.
- DMI får i denne ene tilstand 3.600 sekunder, seks samlinger og større
  downloadramme; Copernicus får 3.300 sekunder.
- Jobloftet bliver 240 minutter kun i bootstraptilstanden. Almindelige
  kørsler beholder deres korte budgetter.

## Bevidst uændret

- Open-Meteo forbliver 900 sekunder og `--critical-only`.
- DMI → Baltic → AMM15 → regional DMI → Open-Meteo.
- Alle cache-, provenance-, fysik-, privacy- og komplethedsgates.
- Nul mangler før artifact, writes og deploy.

## Driftsevidens

Normalrun `35069942328` reducerede 6.450 rester til 5.025. Næste normalrun
`35074225256` reducerede 5.181 til 4.565 trods et én time nyere
prognosevindue. Open-Meteo nåede hele køen i begge runs; den hurtigste vej er
derfor mere samlet DMI/Copernicus-tid, ikke flere blinde Open-Meteo-minutter.
Se DEC-0172.
