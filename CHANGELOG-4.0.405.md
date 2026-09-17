# RavRadar 4.0.405

## Rettet

- Den fælles freshness-parser accepterer nu de to ækvivalente former
  HH:00:00Z og HH:00:00.000Z.
- Samme regel gælder både produktionstimen og den eksakte prognosehorisont,
  så direkte og genbrugte workflowkald ikke kan være uenige.

## Bevis og afgrænsning

- 4.0.404 bestod exact-head 35215528731, PR #348 og main 5fc6e2fd.
- Saved-weather 35216079458 bestod hele artifactbygningen, privacy, privat
  runtime og Edge uden providerkald; kun Pages' direkte parserkald stoppede.
- Parserens virkelige 2026-09-17T09:00:00.000Z er måltestet som FRESH.
- Ingen vejrdata, scoreformel, geometri, providerprioritet eller cache ændres.
