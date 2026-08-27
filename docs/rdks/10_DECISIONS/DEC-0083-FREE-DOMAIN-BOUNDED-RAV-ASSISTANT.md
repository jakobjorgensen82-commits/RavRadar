# DEC-0083 – Spørg RavRadar skal være gratis og domæneafgrænset

**Status:** Godkendt arkitektur- og evalkontrakt; Flash-Lite valgt til implementeringskandidat, offentlig aktivering ikke besluttet
**Dato:** 2026-08-27
**Scorepåvirkning:** Ingen
**Offentlig runtimepåvirkning:** Ingen ved dette checkpoint

## Problem

Den eksisterende fjernassistent er deaktiveret og historisk bundet til OpenAI. Den gamle Edge-prompt har en sikkerhedsordliste, men ingen håndhævet afvisning af almindelige uvedkommende emner. Hvis den blev aktiveret uændret, kunne et spørgsmål om eksempelvis en roulade nå modellen, mens bedste sted/tid kunne blive besvaret af en model uden den nødvendige nationale Candidate G-kontekst.

Ejeren kræver, at en eventuel AI-løsning er gratis og kun bruges til spørgsmål med relevans for ravjagt.

## Beslutning

1. En fjernmodel må kun aktiveres fra et verificeret gratis projekt uden tilknyttet billing og uden betalt overflow. Gratis kvoteudløb giver fallback, aldrig betaling.
2. `gemini-3.5-flash-lite` med `thinking_level=low` er valgt til den næste, fortsat deaktiverede Edge-implementering. Den bestod 27/27 remote-kandidatcases på DA/DE/EN med median 1.329 ms. `gemini-3.7-flash` afvises til dette use case efter fem timeouts ved 12/30 sekunder, inklusive low thinking. Dette er ikke et offentligt aktiverings-go.
3. Åbenlyst uvedkommende spørgsmål og forsøg på at få prompts, credentials, kode, database-, admin- eller sikkerhedsoplysninger afvises før providerkald med en fast tekst på valgt sprog.
4. Bedste sted, bedste tidspunkt, konkret score og andre beregnede offentlige resultater forbliver deterministiske Candidate G-funktioner. En fjernmodel må hverken genberegne eller opfinde disse resultater.
5. Andre ravrelevante spørgsmål kan kun sendes med den versionsbundne offentlige videnspakke og højst den eksisterende lille allowlistede selected-zone-kontekst.
6. Konto-/turdata, persondata, præcis brugerposition, credentials, interne regler/diagnoser, rå strømvektorer, koordinater og komplette zone-/conditionsdatasæt er forbudt.
7. Provideroutput skal være struktureret og servervalideret med locale, disposition, kort svar og kendte evidens-ID'er. Ugyldigt output kasseres.
8. CORS, server-side rate limits, input-/outputgrænser, timeout, lokal fallback og deaktiveret-standard bevares. Assistenten må aldrig blokere prognosen eller turflowet.
9. Gemini Search-grounding og andre værktøjer er ikke en del af gratis basisløsning.
10. Modelkald og evals skal være stateless med `store=false`; RavRadar må ikke bruge providerserveren som samtalehukommelse.
11. Offentlig aktivering kræver særskilt ejer-go, aktuel vilkårs-/kontoregionskontrol, positiv live-eval, Edge-kontrakt, rollbacktest og målrettet browserverifikation.

## Evidens og implementeringsstatus

- `knowledge/rav-assistant-public-v1.json` binder de tilladte offentlige fakta til 4.0.287 og Candidate G 20/50/30.
- `scripts/fixtures/rav-assistant-evals-v1.json` indeholder 45 balancerede cases på dansk, tysk og engelsk, herunder åbne uvedkommende emner uden fast ordlistematch.
- `scripts/run-rav-assistant-model-evals.mjs --self-test` kontrollerer hele routingkontrakten offline. Live-tilstand kræver både `GEMINI_API_KEY` og `GEMINI_FREE_TIER_CONFIRMED=1` og kalder som standard kun remote-kandidatcases.
- Den endelige dataminimerede Flash-Lite-eval bestod 27/27: DA/DE/EN 9/9 hver, Candidate G 12/12, sikkerhedsgrænse 3/3, usikkerhed 3/3 og åbent uvedkommende 9/9. Median/p95/max var 1.329/1.896/1.968 ms ved 27.314 tokens.
- Gemini 3.7 Flash leverede nul evaluerbare svar i fem forsøg og overskred både 12- og 30-sekundersgrænsen. Beslutningen kan senere genbesøges med ny dokumenteret evidens, men modellen er ikke kandidat til den aktuelle chatgateway.
- Den offentlige 4.0.287-adfærd forbliver local-only med `ravAssistantRemoteEnabled=false`.

Se `docs/research/RAV_ASSISTANT_FREE_GEMINI_EVAL_DESIGN_2026-08-27.md`.
