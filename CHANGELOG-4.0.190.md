# RavRadar 4.0.190

- Retter rodårsagen bag det gentagne 125/210-mønster i GitHub Actions #2429–#2431.
- Den nyeste kompatible private DMI-checkpoint-cache vælges nu før en ældre offentlig cache; datakvalitet bruges kun som tie-breaker.
- Dermed overlever collectionrotation, budgetafbrydelser og allerede behandlede forecast-trin mellem GitHub-runners.
- Offentlig fallback, DMI's 90 %-audit, RavScore, kystdata og alle deploygates er uændrede.
