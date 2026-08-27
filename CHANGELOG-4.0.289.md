# RavRadar 4.0.289 – årsagstro produktion og robust genopretning

## Status

Produktionsverificeret. PR #181, frisk produktion, fulde gates, Pages og offentlig efterkontrol er grønne.

## Ændringer

- En DMI-prognosetime efter den workflowlåste UTC-time kan ikke længere blive valgt som produktionstime.
- Målrettet Copernicus-hentning har to procesisolerede forsøg med seks minutters hard timeout og 20 sekunders pause; fortsat fejl stopper før deploy.
- Hver genereret runtime gemmer et privat hashkontrolleret checkpoint med alene 673 kompakte Candidate G-states, så et senere gate- eller deploystop ikke mister reel recoveryfremdrift.
- Det komplette offentlige fallbackdataset kan bruges i højst 72 timer, men aldrig efter sin egen prognosehorisont. Startup, detaljer, ranglister og femdøgnsvisning forbliver atomisk bundet til samme dataset.
- En fejlet, timeoutet eller før-start-fejlet planlagt produktion får ét automatisk retry. Et payloadfrit 45-minutters-watchdog dispatch'er kun ved både gammel workflowhistorik og gammelt offentligt manifest og aldrig mens en produktion er aktiv; total GitHub-schedulerstilhed kræver fortsat ekstern overvågning.
- Candidate G 20/50/30, fysik, DMI-først, vejrberegning, sortering, konto-/turdata, privatliv, geometri og land-/vandpunkter er uændrede.
- PR #181 bestod exact-head `33076656266` og blev merged som `6c8acf08`.
- Produktion `33076772432`, build `98532962269` og Pages `98538133039` bestod frisk DMI/Copernicus, 673-deles checkpoint, faktisk runtimeaudit, fuld validering, releasegate, Supabase og deploy.
- Live 4.0.289 består 210 aktive zoner, 673 dele, 420 aktuelle og 2.100 prognosevisninger uden funktions-, konsol-, side- eller HTTP-fejl.

Se DEC-0085.
