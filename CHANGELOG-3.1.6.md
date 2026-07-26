# RavRadar 3.1.6

## Retningsaudit
- Alle 210 aktive zoners `onshoreDirectionDeg` er genberegnet som kompasretningen fra zonens offshore `dataPoint` mod strandens/landets `pinPoint`.
- 167 aktive zoner blev korrigeret; mange var reelt vendt tæt på 180°.
- Auditspor og maskinlæsbar rapport er tilføjet.
- Dokumenterende tests dækker U/V-strømvektorer, vindens `from`-konvention, strømmens `toward`-konvention og alle aktive zoner.

## Vandstandsdiagnostik
- Kystinterpolation kan ikke længere falde tilbage til generisk nærmeste-station-interpolation, når en gyldig kystkorridor mangler.
- En station uden for zonen kan ikke længere behandles som direkte station, når streng bracket-logik er krævet.
- Stationer deduplikeres efter `stationId` før både generisk og kystbaseret interpolation.
- Datakvalitet markerer nu enhver ikke-godkendt observationsmetode som fejl.

## DMI ForecastEDR
- Første HTTP 429 åbner straks en global DMI-cooldown og stopper yderligere DMI-kald i samme kørsel.
- `Retry-After` respekteres med mindst 60 sekunders pause; uden header anvendes 15 minutter.
- 429 genforsøges ikke aggressivt, så en rate-limit ikke forværres.
