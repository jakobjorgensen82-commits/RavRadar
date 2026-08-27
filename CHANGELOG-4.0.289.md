# RavRadar 4.0.289 – årsagstro produktion og robust genopretning

## Status

Implementeret og målrettet lokalt valideret. Exact-head CI, merge, frisk produktion og offentlig efterkontrol afventer.

## Ændringer

- En DMI-prognosetime efter den workflowlåste UTC-time kan ikke længere blive valgt som produktionstime.
- Målrettet Copernicus-hentning har to procesisolerede forsøg med seks minutters hard timeout og 20 sekunders pause; fortsat fejl stopper før deploy.
- Hver genereret runtime gemmer et privat hashkontrolleret checkpoint med alene 673 kompakte Candidate G-states, så et senere gate- eller deploystop ikke mister reel recoveryfremdrift.
- Det komplette offentlige fallbackdataset kan bruges i højst 72 timer, men aldrig efter sin egen prognosehorisont. Startup, detaljer, ranglister og femdøgnsvisning forbliver atomisk bundet til samme dataset.
- En fejlet, timeoutet eller før-start-fejlet planlagt produktion får ét automatisk retry. Et payloadfrit 45-minutters-watchdog dispatch'er kun ved både gammel workflowhistorik og gammelt offentligt manifest og aldrig mens en produktion er aktiv; total GitHub-schedulerstilhed kræver fortsat ekstern overvågning.
- Candidate G 20/50/30, fysik, DMI-først, vejrberegning, sortering, konto-/turdata, privatliv, geometri og land-/vandpunkter er uændrede.

Se DEC-0085.
