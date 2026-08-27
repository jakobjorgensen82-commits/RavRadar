# RavRadar 4.0.288 – automatisk Candidate G-genopretning

## Produktionsstatus

4.0.288 er produktionsverificeret. PR #179 bestod exact-head `33069307854`, blev merged som `653a9811`, og produktion `33069384084` bestod frisk data, faktisk runtimeaudit, fallbackpublicering, fuld validering, releasegate, Supabase-sync, Pages-artifact og deploy.

PR #176 bestod exact-head `33066322196` og blev merged som `16ad8300`. Første produktion `33066416034` gendannede den kompakte 09-state, men stoppede sikkert før DMI/deploy, fordi fallbackkopien blev taget efter stateændringen. Opfølgningen tager den komplette 00-fallback først og indlæser derefter 09-checkpointet.

PR #178 bestod exact-head `33066897710` og blev merged som `5f9ee093`. Produktion `33066980965` gennemførte den korrigerede rækkefølge og frisk runtime, men stoppede sikkert før deploy på et modstridende auditkrav om rå score under 0/673 `READY`. Den snævre rettelse bevarer de fulde scorekrav ved `READY` og accepterer under warmup kun `available=false`, `score=null`, en entydig fejlårsag og en fortsat lukket offentlig score. Det eksakte supportartifact og den efterfølgende fallbackpubliceringsprøve er grønne.

Live primær `rr-20260827121030-210` modner separat med 0/673 `READY`, mens fallback `rr-20260827013448-210` leverer 210 zoner, 673 dele og 1.346 modeevalueringer med matchende startup-/detaljehashes. Offentlig kontrol viser 210 farvede zoner, fem **Bedste områder**, fem prognosedage og fungerende områdedetaljer uden browserfejl samt den tydelige nødtekst.

## Ændringer

- En fejlet eller ufuldstændig datahentning kan ikke erstatte det seneste komplette, auditerede offentlige datasæt.
- RavRadar kan vise det seneste fuldt verificerede Candidate G-datasæt i højst 48 timer med en tydelig **ikke aktuelle data**-advarsel, mens frisk state genopbygges.
- Startup, detaljer, **Bedste områder** og **5-dages RavRadar** bruger samme fallbackdataset; gamle og nye data blandes ikke.
- Efter et verificeret hul over tre timer genstarter Candidate G fra den reelle sammenhængende suffix efter hullet. Der opfindes, interpoleres eller backfilles ingen timer.
- Når den nye runtime igen har 673/673 `READY` kystdele og består predeploy-audit, skifter siden atomisk og fjerner nødvisningen.
- En eksakt hash- og tidslåst engangsrecovery kan redde den kompakte 09 UTC-state fra den fejlede kørsel `33059522170`, men kopierer aldrig vejr, scores, rå vektorer, koordinater eller private data.
- Candidate G 20/50/30, +10/-8-/13-timersfysik, vejr, normal sortering, konto-/turdata, privatliv, geometri og land-/vandpunkter er uændrede.

Se DEC-0084.
