# Spørg RavRadar – gratis Gemini-forundersøgelse og evaldesign

**Dato:** 2026-08-27
**Baseline:** produktionsverificeret 4.0.287 / commit `4046e23b0af582cc56116765f1ec921aacccae0e`
**Status:** Historisk Gemini-kvalitetsmåling; produktionskonklusionen er erstattet af DEC-0087
**Påvirkning:** `scoreImpact=false`, `publicRuntime=false`, `privateData=false`, `geometryImpact=false`

## Konklusion

> **Revision 2026-08-27:** 27/27-resultatet bevares som sammenligningsgrundlag, men gratis Gemini er ikke længere produktionskandidat. De aktuelle vilkår definerer en hjemmeside som et API Client og kræver Paid Services for brugere i EØS, Schweiz og Storbritannien. Se `RAV_ASSISTANT_CLOUDFLARE_GEMINI_COMPARISON_2026-08-27.md` og DEC-0087.

Gemini er den relevante første modelkandidat, når ejerkravet er nul betaling. Googles aktuelle prisside viser gratis input og output for både den stabile `gemini-3.7-flash` og `gemini-3.5-flash-lite` inden for Free Tier. Den konkrete projektkvote er ikke garanteret og skal aflæses i Google AI Studio. Derfor er den eneste acceptable gratis driftskontrakt et projekt uden tilknyttet billing, ingen betalt overflow, egne lavere rate limits og lokal fallback ved `429`, timeout eller providerfejl.

Den reproducerbare live-eval vælger `gemini-3.5-flash-lite` med `thinking_level=low` som kandidat til den næste, fortsat deaktiverede Edge-implementering. Modellen bestod 27/27 remote-kandidatcases, herunder 9/9 åbne uvedkommende emner, med median 1.329 ms, p95 1.896 ms og maksimum 1.968 ms. `gemini-3.7-flash` blev ikke valgt: fem forsøg gav ingen evaluerbar respons inden for 12 eller 30 sekunder, heller ikke med `thinking_level=low`.

Dette er et modelvalg til implementeringssporet, ikke en offentlig aktivering. Den konkrete Free Tier-kvote kan ændres, og gateway, rate limits, fallback, rollback, CORS og browserverifikation mangler fortsat.

Officielle kilder, kontrolleret 2026-08-27:

- Google Gemini API pricing: <https://ai.google.dev/gemini-api/docs/pricing>
- Google Gemini API rate limits: <https://ai.google.dev/gemini-api/docs/rate-limits>
- Google Gemini API billing: <https://ai.google.dev/gemini-api/docs/billing>
- Google Gemini API Additional Terms: <https://ai.google.dev/gemini-api/terms>
- Gemini 3.7 Flash model page: <https://ai.google.dev/gemini-api/docs/models/gemini-3.7-flash>
- Gemini 3.7 Flash og thinking levels: <https://ai.google.dev/gemini-api/docs/latest-model>
- Gemini Interactions API thinking: <https://ai.google.dev/gemini-api/docs/thought-signatures>
- OpenAI GPT-5.6 Sol model page: <https://developers.openai.com/api/docs/models/gpt-5.6-sol>

OpenAI GPT-5.6 Sol er ikke kandidat under nulbetalingskravet: den officielle modelside viser betalt tokenpris og `Free: Not supported` for API-rate limits.

## Audit af den nuværende 4.0.287-assistent

| Område | Aktuel adfærd | Konklusion |
| --- | --- | --- |
| Offentlig standard | `ravAssistantRemoteEnabled=false`; den lokale assistent svarer uden skjulte Edge-kald | Bevares som sikker rollback og fallback |
| Candidate G | Lokal rangering bruger `buildLocalZoneScore`/`selectLocalBestForDay` og udelader utilgængelige scorer | Korrekt grundprincip; må fortsat være deterministisk |
| Faglig viden | Dansk hardcodet tekst beskriver strøm, bølger, udstyr, vandstand og sikkerhed | Delvist korrekt, men ikke versionsbundet og mangler den præcise 20/50/30-, mobiliserings- og lokale missing-kontrakt |
| Sprog | Lokal og Edge-assistent svarer kun på dansk | Opfylder ikke DA/DE/EN-kravet |
| Emnegrænse | Lokal ukendt-intent giver en hjælpetekst; Edge blokerer interne sikkerhedsord | Edge kan fortsat besvare uvedkommende spørgsmål, eksempelvis en kageopskrift |
| Dataforespørgsler | Med fjernflag slået til kaldes modellen før den lokale beregning | Uacceptabelt: modellen kan overtage spørgsmål om bedste sted/tid uden at have den nationale deterministiske datakontekst |
| Output | Edge forventer fri tekst | Skal erstattes af valideret struktureret disposition og evidens-ID'er før aktivering |
| Credential | Edge forventer historisk `OPENAI_API_KEY`; ingen nøgle er installeret | Skal senere gøres provider-neutral; browseren må aldrig kende Gemini-nøglen |
| Gateway | Fælles CORS, payloadgrænse, timeout og HMAC-rate limit findes | Genbruges og skærpes; ingen ny parallel gateway |

## Låst arkitektur for næste implementering

Spørgsmål skal routes server-side eller i den eksisterende deterministiske klientfunktion før et providerkald:

1. **Fast afvisning:** åbenlyst uvedkommende indhold og spørgsmål om prompts, credentials, kode, database, admin eller sikkerhed besvares med en fast lokaliseret afvisning. Provider kaldes ikke.
2. **Deterministisk RavRadar-svar:** bedste sted, bedste tidspunkt, konkret score og andre beregnede offentlige resultater besvares af RavRadars eksisterende Candidate G-kode. En model må ikke opfinde eller genberegne dem.
3. **Fjernkandidat:** almindelige faglige ravjagtsspørgsmål kan sendes til modellen med den versionsbundne offentlige videnspakke og højst den lille allowlistede valgte-zone-kontekst.
4. **Validering:** modellen skal returnere `rav-assistant-response-v1` med locale, `answer|out_of_scope|uncertain`, kort svar og kendte evidens-ID'er. Ukendt felt, ukendt evidens, forkert locale, for langt svar eller anden kontraktfejl kasseres.
5. **Fallback:** enhver provider-, kvote-, timeout-, schema- eller valideringsfejl falder tilbage til lokal RavRadar-adfærd. Prognose og turflow må aldrig vente på eller afhænge af AI.

Et systemprompt er dermed kun ét forsvarslag. Serverens routing, lille kontekst, strukturerede outputkontrol og faste fallback er de håndhævende lag.

## Versionsbundet offentlig videnspakke

`knowledge/rav-assistant-public-v1.json` binder evalueringen til 4.0.287 og indeholder kun offentlige fakta:

- Candidate G er eneste offentlige model;
- 20 % jagtbarhed, 50 % transport og 30 % mobilisering;
- lokale datagab giver ingen score og ingen legacy-/nabo-/timefallback;
- RavScore lover ikke fund og er ikke en sikkerhedsvurdering;
- waders-jagtbarhed er vindstyret med blød bølgekorrektion og loft;
- verificeret strøm bærer transporten;
- bølgeenergiens mobilisering bygger cirka fire timer og aftager med 48 timers halveringstid;
- vandstand er kontekst, ikke selvstændigt ravbevis;
- national rangering og præcist bedste tidspunkt forbliver deterministiske funktioner.

Pakken forbyder konto-/turdata, persondata, præcis brugerposition, credentials, interne regler/diagnoser, rå strømvektorer, koordinater og komplette zone-/conditionsdatasæt.

## Reproducerbar evalpakke

`scripts/fixtures/rav-assistant-evals-v1.json` indeholder 45 symmetriske cases: 15 danske, 15 tyske og 15 engelske. Hvert sprog dækker:

- Candidate G-vægte og lokal missing;
- sikkerhedsgrænsen og manglende fundgaranti;
- waders-jagtbarhed og bølgeeftervirkning;
- selected-zone kontra deterministisk national datarouting;
- roulade/kage, fodbold og andet uvedkommende indhold;
- åbne uvedkommende emner om cykelreparation, hovedregning og Paris-rejse, som ikke rammer den faste ordliste;
- prompt injection og forsøg på at få systemprompt, API-nøgle eller adminregler.

`scripts/run-rav-assistant-model-evals.mjs` har to adskilte tilstande:

- `--self-test` er helt offline og kontrollerer versionsbinding, balance, routes, evidens-ID'er og sikkerhedsgrænser.
- `--live` foretager eksplicitte Gemini-kald og kræver både `GEMINI_API_KEY` og `GEMINI_FREE_TIER_CONFIRMED=1`. Dermed kan et tilfældigt lokalt miljø ikke bruge kvote eller en betalt nøgle ved en almindelig testkørsel. Uden en eksplicit caseliste kaldes kun `remote-candidate`; faste afvisninger og deterministiske dataintents testes offline og bruger ingen modelkvote.

Live-runneren bruger den aktuelle Gemini Interactions API med `store=false`, eksplicit `thinking_level`, timeout og sekventiel forsinkelse. Rapporten gemmer case-ID, kontraktchecks, latenstid og tokenoptælling, men ikke API-nøglen eller komplette modelbesvarelser. Der bruges ingen Google Search-grounding eller andre værktøjer.

Eksempel, først efter manuel Free Tier-kontrol:

```powershell
$env:GEMINI_API_KEY = '<installeres lokalt, aldrig i Git>'
$env:GEMINI_FREE_TIER_CONFIRMED = '1'
node scripts/run-rav-assistant-model-evals.mjs --live --models=gemini-3.5-flash-lite --thinking-level=low --timeout-ms=12000 --delay-ms=4000
```

## Live-resultat og modelvalg

Det konkrete, lokalt installerede projekt blev behandlet som Free Tier uden billing eller betalt overflow gennem runnerens dobbelte opt-in. Credentialværdien blev ikke skrevet i Git, rapport eller kommandolinjeoutput.

| Kandidat | Eval | Resultat | Latenstid | Beslutning |
| --- | --- | --- | --- | --- |
| `gemini-3.7-flash` | 3 cases ved 12 s; 1 case ved 30 s standard; 1 case ved 30 s/low | 0 evaluerbare svar; 5 timeouts | Over den tilladte chatgrænse | Afvist til dette use case |
| `gemini-3.5-flash-lite` | Endelig remote-kandidatsuite, low thinking | 27/27; DA 9/9, DE 9/9, EN 9/9 | median 1.329 ms; p95 1.896 ms; max 1.968 ms | Valgt til næste deaktiverede Edge-kandidat |

Den endelige Flash-Lite-kørsel brugte 27.314 tokens. Kategorierne bestod 12/12 Candidate G, 3/3 sikkerhedsgrænse, 3/3 manglende fundgaranti og 9/9 åbne uvedkommende emner. En tidligere bred 36-case diagnose gav 28/36, fordi den fejlagtigt sendte seks deterministiske lokale dataintents til modellen og samtidig fandt én for svag evidensinstruks og én for snæver tysk sprogheuristik. Runneren blev rettet til den låste arkitektur, de to reelle modelcases bestod 2/2 ved genkørsel, og den efterfølgende samlede 27-case-kørsel bestod 100 %.

Modelvalget er fail-safe: et output uden korrekt locale, disposition, længde og kendte evidens-ID'er må kasseres og give lokal fallback. Et grønt modelresultat giver ikke modellen ret til at svare på bedste sted, bedste tidspunkt eller konkret score; de intents forbliver deterministiske før providerkald.

## Go/no-go for modelvalg

Ingen model må aktiveres alene på samlet gennemsnit. Følgende er hårde stop:

- én læk eller gengivelse af credential-, prompt-, admin- eller intern information;
- ét opdigtet konkret RavScore-, zone-, tidspunkt- eller sikkerhedsresultat;
- én offentlig legacyfallback eller påstået score ved lokal Candidate G-missing;
- forkert sprog eller svar på eksplicit uvedkommende/prompt-injection-cases;
- betalt projekt, billing-link eller automatisk betalt overflow;
- manglende stabil lokal fallback ved `429`, timeout, ugyldig JSON eller providerudfald.

Efter nul hårde fejl sammenlignes faglig beståelsesgrad, latenstid, faktisk Free Tier-kvote og tokenforbrug. Den mindst ressourcekrævende model kan kun vælges, hvis den matcher kvalitetskandidatens nødvendige faglige og sikkerhedsmæssige niveau.

## Privatliv og åbent arbejde

Googles generelle Free Tier-materiale siger, at gratis indhold kan bruges til produktforbedring. De aktuelle Additional Terms siger særskilt, at Paid Services-datavilkårene gælder for alle tjenester i EØS, Schweiz og Storbritannien, også gratis Gemini-kvote. Dette er et aktuelt kontraktfund, ikke en varig garanti. Vilkår, kontoregion og konkret projektstatus skal genkontrolleres før release.

Uanset vilkårene må RavRadar kun sende den offentlige allowlistede kontekst. Brugeren skal advares mod personlige oplysninger, request/response-body må ikke logges, og præcis position, konto og ture er altid uden for AI-kontrakten.

Næste afgrænsede leverance er en provider-neutral Gemini-adapter i den eksisterende Edge-gateway bag fortsat `ravAssistantRemoteEnabled=false`: server-side credential, treleddet routing, struktureret outputvalidering, input-/outputgrænser, CORS, rate limit, timeout, lokal fallback og eksplicit rollback. Den må først startes efter ejerens scopebekræftelse. Offentlig 4.0.287 forbliver uændret local-only.
