# DEC-0088 – offentlig aktivering af gratis GPT-OSS-assistent

**Status:** Ejer-go givet; Edge-kode, server-secrets og første live-smoke er grønne; rate-limit-/browser-/produktionsverifikation afventer
**Dato:** 2026-08-27
**Scorepåvirkning:** Ingen
**Data-/geometripåvirkning:** Ingen ud over ren versionsfeltsynkronisering

## Beslutning

1. Ejeren har udtrykkeligt godkendt offentlig aktivering af **Spørg RavRadar** med Cloudflare `@cf/openai/gpt-oss-20b` gennem Supabase Edge.
2. Cloudflare-kontoen skal ved aktivering stå på **Workers Free / $0**. Den officielle og viste grænse er 10.000 neuroner pr. døgn; yderligere kald skal fejle. Upgrade, Workers Paid og prepaid AI Gateway-kreditter er ikke tilladt i dette nulbetalingsspor.
3. Den offentlige dialog oplyser på dansk, tysk og engelsk, at den daglige AI-kvote er begrænset for at holde RavRadar gratis, og at prognoser og lokale RavRadar-svar fortsætter ved kvoteudløb.
4. Browserflaget må først udgives som `ravAssistantRemoteEnabled=true`, når den versionsstyrede GPT-OSS Edge er deployet med server-only secrets og består live CORS-, domæne-, rate-limit-, timeout-, output- og fallbackkontrol.
5. Åbenlyst uvedkommende og sikkerhedsfølsomme spørgsmål afvises før provider. Bedste sted, bedste tid og konkret RavScore forbliver lokale Candidate G-funktioner.
6. Konto-/turdata, identitet, præcis position, credentials, interne regler/diagnoser, rå vektorer, koordinater og komplette datasæt må ikke sendes til modellen.
7. `ravAssistantRemoteEnabled=false` forbliver den umiddelbare rollback. Edge- eller providerfejl må aldrig blokere kort, prognoser, konto eller turflow.

## Aktiveringsbevis

- Cloudflare-dashboardet viste **Free** som aktuel Workers-plan, **$0**, 10.000 neuroner/dag og cirka 4.930/10.000 neuroner brugt efter model-evals den 27. august 2026.
- Den versionsstyrede Edge-kode og de to Cloudflare-secrets er installeret. Første browseredit indsatte fejlagtigt ny Monaco-tekst foran gammel kilde; `503 BOOT_ERROR` afslørede det før merge. Filerne blev derefter erstattet atomisk og genudgivet.
- Direkte live-smoke består `OPTIONS 204` med eksakt GitHub-Origin, lokal rouladeafvisning `200`, fremmed Origin `403` uden CORS-header, ugyldigt sprog `400` og gyldige GPT-OSS-svar på dansk, tysk og engelsk. Den danske prøve udløste en yderligere kontraktlås for de eksakte fagord og forbud mod sproglige hybridord.
- 4.0.291-kandidaten tilføjer synlig DA/DE/EN-kvotetekst, aktiveringsflag og regressioner for remote-succes, `429`-fallback, manglende browsercredential og fortsat lokal afvisning/routing.

Se DEC-0083 og DEC-0087 for den bevarede domæne-, data-, eval- og modelkontrakt.
