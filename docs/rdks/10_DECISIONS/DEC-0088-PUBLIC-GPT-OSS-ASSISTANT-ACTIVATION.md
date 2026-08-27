# DEC-0088 – offentlig aktivering af gratis GPT-OSS-assistent

**Status:** Produktionsverificeret i 4.0.291 gennem PR #187, produktion `33114598957` og offentlig browserkontrol
**Dato:** 2026-08-27
**Scorepåvirkning:** Ingen
**Data-/geometripåvirkning:** Ingen ud over ren versionsfeltsynkronisering

## Beslutning

1. Ejeren har udtrykkeligt godkendt offentlig aktivering af **Spørg RavRadar** med Cloudflare `@cf/openai/gpt-oss-20b` gennem Supabase Edge.
2. Cloudflare-kontoen skal ved aktivering stå på **Workers Free / $0**. Den officielle og viste grænse er 10.000 neuroner pr. døgn; yderligere kald skal fejle. Upgrade, Workers Paid og prepaid AI Gateway-kreditter er ikke tilladt i dette nulbetalingsspor.
3. Den offentlige dialog oplyser på dansk, tysk og engelsk, at den daglige AI-kvote er begrænset for at holde RavRadar gratis. Teksten siger entydigt, at kvoten kun gælder Spørg RavRadar og ikke har indflydelse på kort, prognoser, RavScore eller øvrige funktioner.
4. Browserflaget må først udgives som `ravAssistantRemoteEnabled=true`, når den versionsstyrede GPT-OSS Edge er deployet med server-only secrets og består live CORS-, domæne-, rate-limit-, timeout-, output- og fallbackkontrol.
5. Åbenlyst uvedkommende og sikkerhedsfølsomme spørgsmål afvises før provider. Bedste sted, bedste tid og konkret RavScore forbliver lokale Candidate G-funktioner.
6. Konto-/turdata, identitet, præcis position, credentials, interne regler/diagnoser, rå vektorer, koordinater og komplette datasæt må ikke sendes til modellen.
7. `ravAssistantRemoteEnabled=false` forbliver den umiddelbare rollback. Edge- eller providerfejl må aldrig blokere kort, prognoser, konto eller turflow.

## Aktiveringsbevis

- Cloudflare-dashboardet viste **Free** som aktuel Workers-plan, **$0**, 10.000 neuroner/dag og cirka 4.930/10.000 neuroner brugt efter model-evals den 27. august 2026.
- Den versionsstyrede Edge-kode og de to Cloudflare-secrets er installeret. Første browseredit indsatte fejlagtigt ny Monaco-tekst foran gammel kilde; `503 BOOT_ERROR` afslørede det før merge. Filerne blev derefter erstattet atomisk og genudgivet.
- Direkte live-smoke består `OPTIONS 204` med eksakt GitHub-Origin, lokal rouladeafvisning `200`, fremmed Origin `403` uden CORS-header, ugyldigt sprog `400`, seks tilladte minutkald efterfulgt af `429 RATE_LIMITED` og gyldige GPT-OSS-svar på dansk, tysk og engelsk. Gentagne danske og tyske vægtprøver viste, at promptens ordliste alene ikke stoppede sproglige hybridord; Edge normaliserer derfor en snæver testlåst fagordsliste og erstatter det validerede 20/50/30-svar med en fast DA/DE/EN-tekst, når begge påkrævede Candidate G-evidens-id'er er til stede.
- 4.0.291-kandidaten tilføjer synlig DA/DE/EN-kvotetekst, aktiveringsflag og regressioner for remote-succes, `429`-fallback, manglende browsercredential og fortsat lokal afvisning/routing.
- PR #187 bestod exact-head `33114501539` på `d781e464` og blev merged som `c6c9998c`. Produktion `33114598957` bestod frisk DMI/Copernicus, faktisk Candidate G-runtimeaudit, fuld validering, releasegate, Supabase-synkronisering, artifact og Pages-job `98668455689`.
- Offentlig 4.0.291 viser den entydige kvotetekst på dansk, tysk og engelsk, farvet kort, fem **Bedste områder** og fem dagsfaner. Browseren modtog det faste engelske Candidate G 20/50/30-svar gennem den levende Edge, mens rouladespørgsmålet blev afvist lokalt. 390 px-visningen er visuelt grøn.
- Den offentlige vejrvisning er fortsat tydeligt markeret som bounded nøddrift fra sidste komplette dataset, mens frisk Candidate G modnes. Denne status er uafhængig af assistenten og må ikke beskrives som fuldt normaliseret vejrdrift.

Se DEC-0083 og DEC-0087 for den bevarede domæne-, data-, eval- og modelkontrakt.
