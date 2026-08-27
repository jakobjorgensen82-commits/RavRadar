# Turlager – drift, cutover og Supabase-rollback

Denne runbook er den operative ledsager til DEC-0082. Den må ikke bruges til at udskrive private ture eller credentials.

## Arkitektur

```text
Browser → Supabase Auth/Edge → HMAC-pseudonym + allowlist → privat Cloudflare Worker → 10 EU-D1-shards
```

`TRIP_STORAGE_MODE=d1` er normal drift. `TRIP_STORAGE_MODE=supabase` er en bevidst rollback. Der findes ingen automatisk fallback og ingen normal dual-write.

## Faste og behovsstyrede secrets

GitHub Actions har følgende faste secrets til de relevante manuelle og planlagte driftsflow:

- `CLOUDFLARE_ACCOUNT_ID` til Cloudflare-deploy og metadataaudit;
- `CLOUDFLARE_API_TOKEN` med kun D1 Write og Workers Scripts Edit til det manuelle deployment;
- `CLOUDFLARE_AUDIT_API_TOKEN` med kun D1 Read til den daglige payloadfri monitor;
- `CLOUDFLARE_TRIP_GATEWAY_URL`, eksakt Worker-origin under `workers.dev`, til deploymentets grænsekontrol;
- `TRIP_GATEWAY_SHARED_SECRET`, mindst 32 tilfældige bytes, til den private servicekontrakt;
- `TRIP_PSEUDONYM_SECRET_V1`, mindst 32 tilfældige bytes, til stabil pseudonymisering;
- de eksisterende `SUPABASE_URL` og `SUPABASE_SERVICE_ROLE_KEY` til afgrænsede migrations- og administrationsoperationer.

`SUPABASE_ACCESS_TOKEN` er derimod kun et management-token til det manuelle **Deploy RavRadar trip storage**-workflow. Login, profil, Edge-runtime, indsendelse af ture, D1-lagring og den daglige D1-monitor bruger det ikke. Det må derfor være udløbet eller fraværende i normal drift.

Secretværdier må aldrig skrives i PR, issue, log, artifact, dokumentation eller chat. `TRIP_PSEUDONYM_SECRET_V1` er en stabil identitetsnøgle: blind rotation gør eksisterende kontoture ulæselige. En nødvendig rotation kræver en særskilt versioneret v2-migration. Gateway-secret kan roteres koordineret gennem GitHub → Cloudflare → Supabase.

Aktuel credential-status og politik er:

- det installerede `SUPABASE_ACCESS_TOKEN` udløber 25. august 2027, men skal ikke kalenderfornyes. Det kan udløbe uden at stoppe normal drift;
- Cloudflare deploy-tokenet har kun D1 Write og Workers Scripts Write og er sat til **No expiration**;
- Cloudflare audit-tokenet har kun D1 Read og er sat til **No expiration**;
- gateway-secret kan roteres koordineret, mens pseudonym-secret kun må roteres gennem en særskilt v2-migration.

Cloudflare-tokenværdierne ændrede sig ikke, da udløbet blev fjernet. De skal derfor ikke roteres efter en kalender, men straks ved mistanke om kompromittering eller en nødvendig rettighedsændring. Pseudonym-secret må fortsat aldrig roteres blindt.

Det tidligere kalenderbaserede **Warn before RavRadar credential expiry**-workflow er pensioneret. Der skal ikke oprettes mail-, GitHub-issue-, kalender- eller Codex-varsler om Supabase-PAT'ets udløb, fordi udløbet ikke er en runtimehændelse.

Når en konkret Edge-deploy, migration eller rollback-deploy bliver nødvendig, er den sikre behovsstyrede proces:

1. opret et nyt Supabase-PAT med kortest praktiske udløb gennem den godkendte interaktive kanal;
2. opdatér GitHub-secretet `SUPABASE_ACCESS_TOKEN` uden at vise værdien;
3. kør det manuelle workflow på eksakt `main` og bestå hele den relevante D1-/Edge-/CORS-/login-/feltverifikation;
4. tilbagekald PAT'et efter grøn verifikation. Ved rød verifikation stoppes ændringen, men et aktivt token må kun bevares kortvarigt, mens den konkrete fejl undersøges.

Værdier, token-id'er, konto-id og fuld privat gateway-origin må ikke kopieres til dokumentation eller logs. Processen kan udføres med Codex, men den kræver den godkendte brugerkanal til selve secretværdien; den kan ikke gøres permanent automatisk uden at genindføre et langlivet management-token.

## Første idriftsættelse og normal opdatering

1. Merge kun en exact-head-grøn kilde til `main`.
2. Brug en dedikeret Cloudflare-konto uden andre D1-databaser; Free-planens ti databasepladser bruges alle som RavRadar-shards. Start **Deploy RavRadar trip storage** manuelt på `main` med `storage_mode=d1`.
3. Workflowet opretter eller genbruger præcis `ravradar-trips-0` … `ravradar-trips-9` og afviser enhver shard uden uforanderlig `jurisdiction=eu`.
4. Skema og 70/85 %-headroom kontrolleres, Worker-secret installeres, og Worker deployes.
5. Offentlig health og afvist usigneret API kontrolleres; et privat signeret count-kald læser kun antal.
6. Supabase-ture migreres idempotent uden sletning eller payloadlog.
7. Edge sættes til D1 og alle versionsstyrede funktioner deployes.
8. Migrationen køres igen for at samle ture fra cutover-vinduet.
9. CORS, fremmed origin, loginbeskyttet turlog og feltgate kontrolleres uden testinsert.

Et rødt trin stopper. Der må ikke sættes `continue-on-error`, springes over eller indsættes automatisk fallback.

## Supabase-rollback

Start samme workflow manuelt på eksakt `main` med `storage_mode=supabase`. Workflowet ændrer kun Edge-mode og deployer funktionerne; D1-data slettes eller ændres ikke.

Under rollback:

- nye ture skrives til Supabase;
- turloggen læser Supabase;
- ældre D1-ture er bevaret, men kan være midlertidigt usynlige;
- frontend og outbox bruger samme endpoint og kræver ingen ny release.

Når D1 er sund igen, start workflowet med `storage_mode=d1`. Pre-/post-cutover-migrationen kopierer rollback-periodens Supabase-ture uden dubletter og uden at slette kilden.

## Kapacitet

Det daglige **Monitor RavRadar trip storage**-workflow læser kun database-metadata. Det kræver ti EU-shards, advarer ved 70 % og fejler ved 85 % af enten 500 MB på største shard eller 5 GB samlet. Ved advarsel skal ejer vælge betalt kapacitet, dokumenteret arkivering eller ny godkendt arkitektur før 85 %; historik må ikke slettes ad hoc.

RavRadars Edge-gates begrænser normaltrafik til 2.000 observationer og 5.000 turlogkald pr. dag. Supabase-forbrug kontrolleres fortsat særskilt, især banneret om mulig begrænsning fra 9. september 2026.

## Sletning af en ejers ture

Kommandoen `scripts/delete-trip-owner-data.mjs --confirm-delete-owner-data` må kun køres ved en verificeret ejerhenvendelse med credentials i procesmiljøet. `TARGET_SUPABASE_USER_ID` må ikke skrives som kommandolinjeargument eller i en delt log. Kommandoen:

1. beregner HMAC-pseudonymet lokalt;
2. sletter ejerens rækker på alle D1-shards;
3. sletter ejerens Supabase-rollbackrækker;
4. verificerer begge lagre uden payloadudskrift.

Kommandoen sletter ikke selve Auth-kontoen eller profilen. Cloudflare D1 Time Travel kan bevare en slettet række i leverandørens syvdages gendannelsesvindue.

## Hændelser og nøgler

- **D1/Worker utilgængelig:** brug eksplicit Supabase-rollback; bevar D1 urørt; returnér gennem normal D1-workflow efter rodårsag og health-kontrol.
- **Gateway-secret mistænkt kompromitteret:** opret ny stærk værdi, opdatér GitHub-secret og kør D1-workflowet, som installerer den i Worker og Supabase i samme kontrollerede kæde.
- **Pseudonym-secret mistænkt kompromitteret:** stop normal D1-deploy og opret særskilt incident-/v2-migrationsbeslutning. Rotér ikke blindt.
- **Shard eller samlet lager over 85 %:** workflowet stopper. Opgradér/udvid efter ejerbeslutning; slet ikke ture for at tvinge en grøn gate.
- **Supabase-begrænsning:** turlagerflytningen beskytter kun databasevækst. Auth, Edge, rate limit og egress kan fortsat rammes og skal behandles efter Supabases aktuelle usage/billing-status.

## Bevis uden private data

Godkendt driftsbevis består af commit/run-id, mode, antal EU-shards, skemaversion, samlet antal migrerede/duplikerede poster, total/største shard i MB, HTTP-statusser og offentlig appkontrakt. Det må ikke indeholde bruger-id, pseudonym, mail, JWT, zone/tid-kombinationer fra enkeltture eller payloads.
