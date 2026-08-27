# Spørg RavRadar – Cloudflare Workers AI sammenlignet med Gemini

**Dato:** 2026-08-27
**Baseline:** produktionsverificeret 4.0.289; lokal kandidat 4.0.290
**Status:** live-sammenligning afsluttet; GPT-OSS 20B valgt som deaktiveret Edge-kandidat
**Påvirkning:** `scoreImpact=false`, `remotePublicEnabled=false`, `privateData=false`, `geometryImpact=false`

## Kort konklusion

Gemini 3.5 Flash-Lite er den rene kvalitetsreference: 27/27 fælles remote-kandidatcases på dansk, tysk og engelsk. Den kan imidlertid ikke vælges til en gratis offentlig dansk hjemmeside. Googles vilkår gældende fra 23. marts 2026 definerer API Clients som hjemmesider, applikationer eller andre tjenester og kræver Paid Services til brugere i EØS, Schweiz og Storbritannien. Betalt status kræver et aktivt billingprojekt; den aktuelle billingvej starter normalt med mindst 10 USD forudbetaling.

Cloudflare Workers AI er derfor det eneste af de to undersøgte spor, der både kan være offentligt, gratis og fail-closed. Workers Free giver 10.000 neuroner pr. døgn, nul betalt overflow og fejl efter loftet. Den gatede livekørsel sorterede GLM-4.7-Flash og Gemma 4 26B fra efter hver sin ikke-evaluerbare smoke-case. GPT-OSS 20B bestod smoke 1/1 og den målrettede tidligere-fejl-gate 4/4. I den fulde fælles pakke gav den 26 evaluerbare svar, hvoraf 25 bestod alle kontraktchecks. Derfor vælges `@cf/openai/gpt-oss-20b` som deaktiveret Edge-kandidat; den er ikke offentligt aktiveret.

## Sammenligning

| Kandidat | DA/DE/EN-kvalitet | Gratis offentlig dansk hjemmeside | Kapacitet og stop | Databehandling | Foreløbig rolle |
| --- | --- | --- | --- | --- | --- |
| Gemini 3.5 Flash-Lite/low | Målt 27/27; median/p95 1.329/1.896 ms | Nej under aktuelle EØS-vilkår | Free Tier findes, men opfylder ikke produktionskravet; Paid kræver billing | EØS får Paid Services-datavilkår også på gratis quota, men det ophæver ikke Paid-Service-kravet | Intern kvalitetsreference |
| Cloudflare GLM-4.7-Flash | Smoke 0/1 evaluerbare svar | Ja på Workers Free | 10.000 neuroner/dag; 5.500/M input og 36.400/M output | Ingen træning eller serviceforbedring uden udtrykkeligt samtykke; lagring kun ved særskilt storagebrug | Afvist før fuld eval |
| Cloudflare Gemma 4 26B | Smoke 0/1 evaluerbare svar | Ja på Workers Free | 9.091/M input og 27.273/M output | Samme Workers AI-kontrakt | Afvist før fuld eval |
| Cloudflare GPT-OSS 20B | Smoke 1/1; mål-gate 4/4; fuld 25/26 evaluerbare svar bestod | Ja; ikke på listen over modeller med betalingskrav | 18.182/M input og 27.273/M output | Samme Workers AI-kontrakt | Valgt deaktiveret Edge-kandidat |

Cloudflares tokenpriser er omregnet til neuroner af Cloudflare. De er ikke en faktura på Workers Free; de bruges til at måle, hvor hurtigt dagskvoten forbruges.

## Målt Cloudflare-resultat

Den fulde GPT-OSS-kørsel forsøgte 27 cases og gav 26 strukturelt evaluerbare svar. 25 bestod alle kontroller. Median/p95 var 1.406/2.933 ms; de 26 rapporterede svar brugte 32.835 tokens og estimeret 623,63 neuroner. Det sidste tal er et nedre estimat, fordi timeoutkaldet ikke rapporterede forbrug. I samme størrelsesorden svarer dagskvoten groft til cirka 430 spørgsmål, men faktisk kapacitet afhænger af spørgsmålslængde, output og leverandøradfærd.

De to afvigelser var afgrænsede:

- `de-waders` var et ellers gyldigt tysk ravsvar, men overskred 900-tegnsgrænsen. Edge skal afvise et sådant output og bruge lokal fallback.
- `en-open-travel` timeoutede efter 12 sekunder. Den offentlige domænegate skal afvise dette uvedkommende rejsespørgsmål lokalt, før et providerkald kan ske; timeout er stadig bevaret som defense-in-depth-evidens.

De øvrige 25 svar bestod schema, sprog, disposition, evidens-id'er, længde og sikkerhedschecks. Resultatet er ikke 27/27 og dokumenteres derfor ikke som det. Valget skyldes, at den eneste faglige afvigelse er fail-closed bag den krævede outputvalidator, mens timeoutcasen slet ikke må nå provider i den offentlige arkitektur.

## Hvad der skulle til for brugbare Cloudflare-svar

Første rå kørsel beviste, at en Gemini-lignende schemaanmodning ikke kunne genbruges direkte. Følgende ændringer var nødvendige og skal bevares i Edge-kontrakten:

1. Cloudflares forskellige svarindpakninger udtrækkes rekursivt og kontrolleret; et ukendt payloadformat bliver en fejl, ikke fri tekst.
2. `response_format` bruger Cloudflares `json_object`-tilstand. Det oprindelige `json_schema`-forsøg gav mange ikke-evaluerbare svar med de valgte Workers Free-modeller.
3. Systeminstruksen kræver præcis ét JSON-objekt med de fem kendte felter, samme sprog og højst 900 tegn. Outputbudgettet er 800 completion-tokens og `reasoning_effort=low`.
4. Disposition blev gjort entydig: et ravrelevant spørgsmål, som de leverede fakta kan svare på, er `answer`—også når svaret er “ingen garanti”, “ikke en sikkerhedsvurdering” eller “data mangler”. Kun uvedkommende emner er `out_of_scope`; relevante spørgsmål uden tilstrækkelig evidens er `uncertain`.
5. Krævede evidens-id'er blev gjort eksplicitte med konkrete eksempler for Candidate G-vægte, sikkerhedsgrænse, fundgaranti, manglende data og waders/vind. Modellen må kun citere allowlistede fakta-id'er.
6. En billig smoke-case sorterer teknisk uegnede modeller fra. En fire-case mål-gate genprøver tidligere disposition-/timeoutfejl, før den fulde 27-case-suite må starte.
7. Selvom modellen nu svarer brugbart, forbliver servervalidering obligatorisk: ukendt schema, forkert sprog/disposition/evidens, for langt output, timeout, kvote og providerfejl giver lokal fallback.

Forløbet var reproducerbart: første GPT-OSS-fuldkørsel med utilstrækkelig outputkontrakt gav 11/17 beståede evaluerbare svar; efter `json_object` og dispositions-/evidenshærdning steg den til 23/26; efter de konkrete semantiske eksempler bestod den målrettede gate 4/4 og sluttede på 25/26 evaluerbare svar i fuldpakken.

## Reproducerbar eval

`scripts/run-rav-assistant-model-evals.mjs` bruger den samme:

- versionsbundne Candidate G-videnspakke;
- 45-case DA/DE/EN-suite og som standard de samme 27 remote-kandidatcases;
- `rav-assistant-response-v1`-schema;
- locale-, disposition-, evidens-, længde- og sikkerhedskontrol;
- 12 sekunders timeout, low reasoning og fast seed;
- hårde stop for læk, opdigtet score/sted/tid, forkert sprog og besvarelse af uvedkommende spørgsmål.

Cloudflare-livekørsel kræver `CLOUDFLARE_WORKERS_FREE_CONFIRMED=1`, Account ID og et separat mindst-muligt Workers AI-token. Gemini-kørsel kræver særskilt `GEMINI_INTERNAL_EVAL_ONLY_CONFIRMED=1` og mærkes comparison-only. Ingen credential må stå i Git, argumenter, rapport eller output.

Runneren gemmer kun case-id, kontraktchecks, fejltype, latenstid og forbrug. Cloudflare-rapporten beregner også estimerede neuroner. JSON schema er et hjælpelag; Cloudflare garanterer ikke, at enhver model kan opfylde schemaet, så RavRadars servervalidering og lokale fallback er obligatorisk.

## Produktionsgrænse

En provider vælges ikke alene på samlet procent. Der må være nul credential-/promptlæk, nul opdigtede Candidate G-resultater, nul skjult brug af private data og nul svar på eksplicit uvedkommende spørgsmål. Ved samme nødvendige kvalitet vinder den kandidat, som bruger færrest neuroner og har stabilest latenstid.

Ekstern AI forbliver deaktiveret, indtil den eksisterende Supabase Edge-gateway er skærpet med server-side credential, CORS-allowlist, rate limit, payloadgrænser, timeout, schema-/evidensvalidering, lokal fallback, rollback og målrettet browserkontrol. Den eksakte deploykontrakt skal genkøre de to observerede afvigelser og den fulde fælles suite, før ejeren kan tage særskilt stilling til offentlig aktivering.

## Officielle kilder kontrolleret 2026-08-27

- Google Gemini API Additional Terms: <https://ai.google.dev/gemini-api/terms>
- Google Gemini billing: <https://ai.google.dev/gemini-api/docs/billing>
- Cloudflare Workers AI pricing: <https://developers.cloudflare.com/workers-ai/platform/pricing/>
- Cloudflare GLM-4.7-Flash: <https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/>
- Cloudflare Gemma 4 26B: <https://developers.cloudflare.com/workers-ai/models/gemma-4-26b-a4b-it/>
- Cloudflare GPT-OSS 20B: <https://developers.cloudflare.com/workers-ai/models/gpt-oss-20b/>
- Cloudflare Workers AI data usage: <https://developers.cloudflare.com/workers-ai/platform/data-usage/>
- Cloudflare JSON mode: <https://developers.cloudflare.com/workers-ai/features/json-mode/>
- Cloudflare Workers AI REST credential: <https://developers.cloudflare.com/workers-ai/get-started/rest-api/>
