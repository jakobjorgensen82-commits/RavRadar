# RavRadar 4.0.404

## Rettet

- Den centralt gemte hele UTC-time må komme som både HH:00:00Z og
  HH:00:00.000Z. Workflowet normaliserer kun den valgfrie millisekunddel til
  den eksisterende kanoniske form før freshness-kontrollen.
- Freshness-resultatet skal eksplicit være FRESH, så den særskilte
  reparationsrute stadig afviser en pakke over 240 minutter.

## Bevis og afgrænsning

- 4.0.403 bestod exact-head 35214029193 og blev main c685c83d.
- Deploy 35214668708 stoppede før private writes, Edge, artifact og Pages.
- Model, dataset, tidspunkt, geometri, RavScore, vejrdata og providerprioritet
  ændres ikke. Ingen provider kaldes.

