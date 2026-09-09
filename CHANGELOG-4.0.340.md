# RavRadar 4.0.340 – sikker WAM-seam

## Problem

Oneoff `34371642565` gemte DMI-, Copernicus- og Open-Meteo-progress, men WAM-handoff stoppede med `MIXED_RUN_INTERPOLATION`. Producenten kunne finde en gyldig interpolation inden for samme native WAM-serie, mens slutvalidatoren og Forecast Store kun prøvede de to tidsmæssigt nærmeste rækker. En eksakt nyere modelrække kunne dermed skjule en stadig gyldig bracket fra den forrige kørsel.

## Rettelse

- Eksakte rækker vinder uændret.
- Alternative brackets kræver samme collection, modelkørsel, gitterdefinition og fysiske celle.
- Den smalleste bracket vælges deterministisk; ved lighed vælges nyeste kausale run.
- Fire timer er et absolut bølgeloft, også hvis en forkert cadence-værdi sendes ind.
- Ingen leverandørprioritet, cacheidentitet, geometri, scoreparameter eller offentlig model ændres.

## Bevis og status

Python-validator 34/34, DMI-producentintegration 24/24, Forecast Store, bootstrap-target og RavScore-produktionsadapter er grønne lokalt. Negative regressioner bevarer stop ved mixed-run og over-fire-timers interpolation. Exact-head GitHub-sourcegate, merge, komplet 4.0.340-main-oneoff, fulde post-data-gates, deploy og offentlig verifikation mangler. Candidate G forbliver offentlig indtil da.
