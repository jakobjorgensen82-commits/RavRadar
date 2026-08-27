# RavRadar 4.0.288 – automatisk Candidate G-genopretning

## Kandidatstatus

4.0.288 er implementeret og har bestået målrettede tests samt lokal `validate:source` inklusive releasegate. Exact-head-, produktions- og offentlig funktionsverifikation afventer.

PR #176 bestod exact-head `33066322196` og blev merged som `16ad8300`. Første produktion `33066416034` gendannede den kompakte 09-state, men stoppede sikkert før DMI/deploy, fordi fallbackkopien blev taget efter stateændringen. Opfølgningen tager den komplette 00-fallback først og indlæser derefter 09-checkpointet.

## Ændringer

- En fejlet eller ufuldstændig datahentning kan ikke erstatte det seneste komplette, auditerede offentlige datasæt.
- RavRadar kan vise det seneste fuldt verificerede Candidate G-datasæt i højst 48 timer med en tydelig **ikke aktuelle data**-advarsel, mens frisk state genopbygges.
- Startup, detaljer, **Bedste områder** og **5-dages RavRadar** bruger samme fallbackdataset; gamle og nye data blandes ikke.
- Efter et verificeret hul over tre timer genstarter Candidate G fra den reelle sammenhængende suffix efter hullet. Der opfindes, interpoleres eller backfilles ingen timer.
- Når den nye runtime igen har 673/673 `READY` kystdele og består predeploy-audit, skifter siden atomisk og fjerner nødvisningen.
- En eksakt hash- og tidslåst engangsrecovery kan redde den kompakte 09 UTC-state fra den fejlede kørsel `33059522170`, men kopierer aldrig vejr, scores, rå vektorer, koordinater eller private data.
- Candidate G 20/50/30, +10/-8-/13-timersfysik, vejr, normal sortering, konto-/turdata, privatliv, geometri og land-/vandpunkter er uændrede.

Se DEC-0084.
