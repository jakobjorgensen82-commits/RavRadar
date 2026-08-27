# DEC-0087 – Cloudflare Workers AI er gratis produktionsspor; Gemini er reference

**Status:** GPT-OSS 20B valgt; ejer-go og live Edge-gates til offentlig 4.0.291-aktivering er grønne, Pages/produktion afventer
**Dato:** 2026-08-27
**Scorepåvirkning:** Ingen
**Offentlig fjern-AI:** 4.0.291-aktiveringskandidat; offentlig produktion afventer live Edge-bevis
**Erstatter:** Kun DEC-0083's valg af Gemini som produktionskandidat; domæne-, data-, fallback- og evalkontrakten i DEC-0083 bevares

## Problem

`gemini-3.5-flash-lite` bestod den tidligere fælles eval 27/27, men den aktuelle Gemini API-aftale definerer et API Client som en hjemmeside, applikation eller anden tjeneste og tillader kun Paid Services, når et sådant klientprodukt stilles til rådighed for brugere i EØS, Schweiz eller Storbritannien. RavRadar er en offentlig dansk hjemmeside og kan derfor ikke bruge gratis Gemini som produktionsløsning under ejerkravet om nul betaling.

## Beslutning

1. Gemini Flash-Lite bevares som historisk intern kvalitetsreference, ikke som gratis offentlig produktionskandidat.
2. Cloudflare Workers AI på Workers Free er det aktive produktionsspor. Free-kontoen har 10.000 neuroner pr. døgn; yderligere kald skal fejle, aldrig udløse betaling eller automatisk overflow.
3. `@cf/openai/gpt-oss-20b` er valgt som deaktiveret Edge-kandidat. `@cf/zai-org/glm-4.7-flash` og `@cf/google/gemma-4-26b-a4b-it` er afvist efter ikke-evaluerbare smoke-svar. Modeller, som kræver Workers Paid eller prepaid AI Gateway-kreditter, er forbudt i nulbetalingssporet.
4. Samme versionsbundne 45-case DA/DE/EN-suite, samme 27 remote-kandidatcases, samme schema, evidenskrav, afvisninger, timeout og hårde stop bruges for Cloudflare og Gemini.
5. GPT-OSS-valget bygger på den fælles live-eval, ikke leverandørudsagn: smoke 1/1, målrettet tidligere-fejl-gate 4/4 og fuld eval med 25/26 beståede evaluerbare svar. Median/p95 var 1.406/2.933 ms, og 26 rapporterede svar brugte 32.835 tokens samt estimeret mindst 623,63 neuroner.
6. Provideroutput er aldrig betroet. Edge skal validere schema, locale, disposition, længde og kendte evidens-id'er og falde lokalt tilbage ved kvote, `429`, kapacitetsfejl, timeout, ugyldigt JSON eller faglig kontraktfejl.
7. Åbenlyst uvedkommende og sikkerhedsfølsomme spørgsmål afvises før provider. Bedste sted, bedste tid og konkret RavScore forbliver deterministiske Candidate G-svar.
8. Kun mindst-mulige offentlige fakta og valgt-zone-kontekst må sendes. Konto-/turdata, persondata, præcis position, credentials, interne regler, rå vektorer og komplette datasæt er forbudt.
9. Credential findes kun server-side. Offentlig aktivering kræver særskilt ejer-go efter positiv live-eval, hærdet Edge-gateway, CORS/rate-limit/fallback/rollback-test og offentlig browserverifikation.
10. Ejerbeslutningen er, at RavRadar bruger GPT-OSS 20B til den kommende gratis fjernfunktion. Valget må ikke erstattes af Gemini, GLM, Gemma eller en anden model uden ny dokumenteret beslutning og samme evalkontrakt.
11. Den fungerende providerkontrakt er Cloudflare `json_object`, kontrolleret rekursiv svarudtrækning, fem faste outputfelter, 800 completion-tokens, low reasoning, eksplicit disposition/evidenssemantik samt smoke- og mål-gate før fuld eval. Edge må ikke falde tilbage til det fejlede direkte `json_schema`-forsøg eller acceptere fri tekst.
12. Gemini må ikke være automatisk offentlig fallback under nulbetalingskravet. Den kan kun genåbnes som betalt, server-side reserve efter ny ejerbeslutning samt fornyet vilkårs-, privatlivs-, kvote-, gateway- og rollbackvurdering. Den aktive gratis fallback er RavRadars lokale deterministiske svar.

## Aktuel evidens og åbne gates

- Gemini Flash-Lite/low: historisk 27/27, median/p95 1.329/1.896 ms. Gratis offentlig EØS-drift: kontraktmæssigt no-go.
- Cloudflare GPT-OSS 20B: 27 forsøg, 26 evaluerbare svar og 25 fulde beståelser. Ét ellers gyldigt tysk svar overskred længdegrænsen; ét åbent irrelevant engelsk rejsespørgsmål timeoutede og skal i produktion afvises lokalt før provider.
- GLM-4.7-Flash og Gemma 4 26B: hver 0/1 evaluerbare smoke-svar og derfor stoppet før fuld eval.
- Den provider-neutrale runner kræver dobbelt eksplicit opt-in og gemmer kun dataminimerede målinger. Den rapporterer beståelse, latenstid, tokens og estimerede neuroner.
- Den lokale Edge implementerer den valgte model med server-only Cloudflare-secrets, dobbelte domænegates, dataminimeret zonekontekst, CORS, 6/minut, 40/time og 300/dag, syv sekunders timeout, `json_object`, rekursiv svarudtrækning og eksakt femfelts/evidens/locale/længdevalidering. Målrettet Edge- og sikkerhedstest er grøn.
- `ravAssistantRemoteEnabled=false` forbliver rollback; 4.0.291-kandidaten sætter flaget `true` efter ejerens go i DEC-0088.
- Edge er deployet gennem Supabases godkendte kanal og har bestået live afvigelsesprøver, DA/DE/EN, terminologilås og afgrænset rate-limitkontrol. Før 4.0.291 kaldes produktionsverificeret skal den nye exact-head være grøn, Pages-koden merges, og offentlig browserkontrol bestå.

Se `docs/research/RAV_ASSISTANT_CLOUDFLARE_GEMINI_COMPARISON_2026-08-27.md`.
