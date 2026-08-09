# RavRadar 4.0.144

## National kildeskalering og QA
- Begrænser national GeoDanmark-hentning til fire samtidige fliser og logger flisefremdrift.
- Validerer 208-zoners dækning, alle eksponerede lags komplethed, filhash, deduplikering, mutationsflag og credentialfravær før upload.
- Tilføjer rumligt indekseret national source-QA for samtlige effektive zoner og viderefører konfliktklasser.
- Ændrer ikke aktiv geometri, admin-data, vejrsampling, state, offentlig UI eller RavScore.

## Evidens
- 4.0.143 blev produktionsverificeret med fulde gates og deploy.
- Den første sekventielle nationalkørsel målte 101 fliser/707 requests og var stadig aktiv efter mere end ti minutter.
- 4.0.144 afventer privat national CI, artifactaudit og normal produktionskæde.
