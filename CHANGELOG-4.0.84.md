# RavRadar 4.0.84

## Rettelse

- Retter GitHub-fejl i den videnskabelige strømaudit efter hydrering.
- Når rå DMI-komponenter `current-u/current-v` tilføjes som verificeret proveniens, genberegnes `currentSpeedMps` og `currentDirectionDeg` nu altid fra de samme komponenter.
- Dermed kan en ældre hydreret cache ikke efterlade modstridende strømretning eller -hastighed i samme prognosetime.
- Den strenge videnskabelige audit bevares; tolerancerne er ikke løsnet.
- Tilføjer regressionstest for vektorkonsistens.
