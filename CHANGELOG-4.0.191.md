# RavRadar 4.0.191

- Retter den dokumenterede årsag til, at #2437 ikke genbrugte #2435-checkpointet.
- DMI-cachekompatibilitet afhænger nu kun af faktiske samplingpunkter, geometri, kysttype, status og ejerskab.
- Løbende stationshelbred, observationstider, forecasttider og appversion kan ikke længere nulstille collectionrotationen.
- Reelle geografiske eller samplingmæssige ændringer invaliderer fortsat cachen fail-closed. RavScore, DMI-audit, fallback og deploygates er uændrede.
