# RavRadar 4.0.290 – central DA/DE/EN og sikker assistentgrænse

## Status

Lokal releasekandidat. Målrettede tests, desktop-/390 px-browserkontrol og fuld lokal `validate:source` inklusive releasegate er grønne; exact-head, frisk produktion og offentlig efterkontrol afventer.

## Ændringer

- Ét centralt tekstkatalog driver dansk, tysk og engelsk med dansk standard/fallback, parameteriserede nøgler, localeformatering og lokalt husket sprogvalg.
- Den komplette offentlige flade omfatter hovedside, aktuelle/femdøgnsstatusser, kort-/områdepanel, konto/login, turformularer, lokal Spørg RavRadar, hele **Om RavRadar** og alle 12 sektioner i **Grundbog i ravjagt**.
- Admin-, ekspert-, PIN-, debug- og interne flader forbliver danske. CSS-tegnede flag sikrer rigtige flagikoner også på Windows, som ellers gengiver flag-emojier som bogstavkoder.
- Kendte uvedkommende og sikkerhedsfølsomme spørgsmål afvises før provider. Bedste sted, bedste tidspunkt og konkret RavScore forbliver deterministiske Candidate G-svar.
- Mulig fjernkontekst er reduceret til en offentlig allowlist uden konto-/turdata, persondata, præcis position, rå vektorer eller interne diagnoser.
- Den valgte GPT-OSS-model er implementeret i den eksisterende server-side Edge med Cloudflare-credentials kun på serveren, CORS, 6/minut, 40/time og 300/dag, syv sekunders timeout, eksakt femfelts JSON-/evidens-/locale-/længdevalidering og lokal fallback. Ekstern AI og deploy er fortsat deaktiveret indtil særskilt ejer-go.
- Gemini Flash-Lite 27/27 bevares som intern kvalitetsreference, men gratis Gemini er no-go til en offentlig EØS-hjemmeside under aktuelle vilkår. Cloudflare Workers Free er produktionskandidatsporet.
- Den samme DA/DE/EN-evalrunner målte GLM-4.7-Flash, Gemma 4 26B og GPT-OSS 20B mod Gemini-referencen med schema/hårde stop, latenstid, tokens og estimerede neuroner. GLM/Gemma blev stoppet efter ikke-evaluerbare smoke-svar; GPT-OSS er valgt som fortsat deaktiveret Edge-kandidat efter 1/1 smoke, 4/4 mål-gate og 25/26 beståede evaluerbare fuldtests. Én længdeafvigelse og én irrelevant timeout skal fejle lukket i gatewayen.
- Candidate G 20/50/30, vejr, sortering, konto-/turdata, privatliv, geometri og land-/vandpunkter er uændrede. Geodatafilerne ændrer kun topversionsfelt 4.0.289 → 4.0.290.

Se DEC-0086 og DEC-0087.
