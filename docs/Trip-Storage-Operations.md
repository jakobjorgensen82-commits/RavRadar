# Turlager – D1-drift, énvejscutover og roll-forward

Denne runbook er den operative ledsager til DEC-0082 og DEC-0109. **Status ved 4.0.312-roll-forward-checkpointet:** 4.0.311-kilden bestod PR #224 exact-head CI `33263734108` på `4c4699fe`, blev merged som `7c168b00` og fik en korrekt grøn no-op-pushkørsel `33263858078` uden artifact eller Pages. Backendkørslen `33263892151` afsluttede ikke readiness; den stoppede i post-apply-katalogverifikationen før D1, Edge, Worker, sync, vejr, artifact og Pages. 4.0.312-kandidatens målrettede tests, hele lokale sourcegate, releasegate, RDKS/håndbog/version og særskilte geodatabevis er grønne; exact-head PR, merge og ny live backend mangler. Offentlig sandhed er fortsat produktionsverificeret 4.0.310. Runbooken må ikke bruges som bevis for, at cutover eller rekonstruktion er gennemført, og den må aldrig bruges til at udskrive private ture eller credentials.

## 4.0.311-backendhændelsen og sikker genkørsel

Kørsel `33263892151` modtog HTTP 201 for Candidate G-trip-quality-migrationen og fejlede derefter i den read-only kontrol af `pg_get_constraintdef`, fordi verifikatoren forventede en flad OR-tekst og ikke accepterede PostgreSQLs semantisk ækvivalente venstreparentesering. Migrations-SQL'en er én transaktion med drop/add-not-valid/validate/comment og uden `INSERT`, `UPDATE` eller `DELETE`. Den mulige Supabase-tilstand er derfor enten fuldt committed med valideret constraint og comment eller fuldt rullet tilbage; en halv eller uvalideret constrainttilstand kan ikke være efterladt. Ingen observationpayloads blev hentet til runneren eller logget, og ingen rækker blev muteret; constraintens interne `VALIDATE` kan have scannet rækker uden at ændre dem. Ingen efterfølgende backend- eller publiceringsdel blev nået.

Den uændrede 4.0.311-kørsel må ikke genstartes som genvej. En sikker genkørsel starter først på en exact-head-grøn og merged 4.0.312-main. Den rettede read-only kontrol skal da acceptere den allerede aktuelle constraint uden mutation, hvis transaktionen blev committed; hvis den blev rullet tilbage, må den samme idempotente atomiske migration anvendes og genverificeres. Først når post-apply-katalogkontrollen er grøn, må D1-/Edge-/Worker-kæden fortsætte. Dette er roll-forward, ikke et bevis for, at nogen af de efterfølgende gates allerede er bestået.

## Arkitektur

```text
Browser → Supabase Auth/Edge → HMAC-pseudonym + allowlist → privat Cloudflare Worker → 10 EU-D1-shards
```

Den i 4.0.311 mergede og af 4.0.312 fremførte kontrakt har konstant `[d1]`-identitet. Supabase kan kun være en kort initial bro ved en **helt ny** installation uden varig D1-controlmarkør og uden de ti eksisterende RavRadar-shards. Efter grønt capacity- og exact-main-bevis sættes præcis ét current-run installationstype-intent umiddelbart før første Edge-deploy: `d1_edge_predeploy_intent` for eksisterende D1 eller `fresh_edge_predeploy_intent` for genuine fresh. Existing-D1 får maintenance-kapabel Edge under uændret D1-mode/gammel Worker, derpå repair-intent og en udløbende lease før Worker. En partial existing-D1 Edge-deploy går kun D1 roll-forward; en partial fresh Edge-deploy går exact-main-bundet tilbage til Supabase-secret, eksakt Edge-redeploy og dobbelt Supabase-attestation.

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

Når en konkret Edge-/Worker-deploy, migration eller D1 roll-forward-reparation bliver nødvendig, er den sikre behovsstyrede proces:

1. opret et nyt Supabase-PAT med kortest praktiske udløb gennem den godkendte interaktive kanal;
2. opdatér GitHub-secretet `SUPABASE_ACCESS_TOKEN` uden at vise værdien;
3. kør det konstante `[d1]`-workflow på eksakt `main` og bestå hele den relevante D1-/Edge-/CORS-/login-/feltverifikation;
4. tilbagekald PAT'et efter grøn verifikation. Ved rød verifikation stoppes ændringen, men et aktivt token må kun bevares kortvarigt, mens den konkrete fejl undersøges.

Værdier, token-id'er, konto-id og fuld privat gateway-origin må ikke kopieres til dokumentation eller logs. Processen kan udføres med Codex, men den kræver den godkendte brugerkanal til selve secretværdien; den kan ikke gøres permanent automatisk uden at genindføre et langlivet management-token.

## Første idriftsættelse og normal opdatering

1. Merge kun en exact-head-grøn kilde til `main`.
2. Brug en dedikeret Cloudflare-konto uden andre D1-databaser; Free-planens ti databasepladser bruges alle som `ravradar-trips-0` … `ravradar-trips-9`. Start **Deploy RavRadar trip storage** manuelt på `main`; workflowidentiteten er altid `[d1]` og har ingen operativ backendvælger.
3. Kontrollér eksakt `origin/main`, opret/genbrug alle ti EU-shards, anvend SQL-skemaet og læs den globale controlmarkør `trip_storage_control.d1_activation_attempted` **før** enhver Edge-modeændring. Klargøringen klassificerer desuden en historisk live-D1-installation, når alle ti forventede `ravradar-trips-0` … `-9` allerede fandtes; kilden fastholder den dokumenterede aktiveringsproveniens run `33024408547`/head `5c7f774d3f09a527628d97e08c3900d49eb41a89`. Read-only GitHub-beviset kræver desuden præcis ét upagineret job på første forsøg: alle ti bundne D1-trin skal være `completed/success`, mens **Configure explicit Supabase rollback mode** skal være `completed/skipped`. Runmetadata uden dette stepbevis er ikke nok til at klassificere installationen som legacy-D1.
4. Shard 0 er control-database for den atomiske globale `trip_observation_registry`, `trip_owner_erasure_tombstones` og den varige D1-fasemarkør. Headroom, EU-jurisdiction og skema skal være grønne før writes.
5. Hvis legacy-D1 findes uden markør, sættes current-run `legacy_activation_intent` efter grønt kapacitetsbevis og exact-main-CAS, og markøren persisteres før quiescence. Fejl før capacity/CAS sætter intet intent og tillader nul ekstern recoverymutation.
6. Efter en ny exact-main-CAS sættes umiddelbart før første Edge-deploy enten `d1_edge_predeploy_intent` eller `fresh_edge_predeploy_intent`. Deploy begge eksakte maintenance-kapable Edge-funktioner, `submit-observation` og `trip-log`, mens den aktuelle mode og gamle Worker er uændrede. Ved existing D1 attesteres begge grænser i D1-mode med to sammenhængende no-cache/no-store-par; genuine fresh forbliver i Supabase-broen.
7. Sæt først nu current-run `d1_repair_intent` for existing D1 og derefter `TRIP_STORAGE_MODE=maintenance:<UTC-deadline>` med 20 minutters lease. Edge afviser en ugyldig eller mere end 30 minutter fremtidig lease fail-closed; når en gyldig lease udløber, fortolkes mode automatisk som D1.
8. Alle Edge-prober har fem sekunders hard timeout. Attestér begge Edge-grænser i maintenance med to sammenhængende no-cache/no-store-par, vent 20 sekunder, genbekræft eksakt main og kræv mindst 600 sekunders resterende lease før første Worker-write. Secretinstallering, Worker-deploy og Worker-health er én samlet fail-closed gate på højst syv minutter.
9. Kør første Supabase→D1-synk gennem den eksplicitte PostgREST-bladprojektion. Runneren må ikke hente `select=*`, hele fri-form-JSON-felter, GPS, koordinater, rå U/V, tekst/billeder eller ukendte kolonner; owner-id må kun bruges i memory til HMAC og må ikke logges.
10. Kun ved en helt ny installation sættes current-run `activation_intent` og derefter `d1_activation_attempted=true` efter en ny exact-main-CAS. Legacyinstallationen har allerede fået markøren før quiescence. Aktivér D1, og attestér begge Edge-grænser uden cache i live D1-mode.
11. Vent yderligere 20 sekunder, genbekræft eksakt main og kør afsluttende reconciliation. Genverificér begge Edge-grænser, Worker, SQL, global registry og D1-mode. Først et succesfuldt eksakt-head-bundet `[d1]`-run er gyldigt readinessbevis for en 4.0.312-Pagesproduktion.

Et rødt trin kan ikke tælle som readiness og stopper normal success-kæde. Guarded `continue-on-error` må kun bruges i den afgrænsede failure-kæde for at forsøge sikker genopretning; det må aldrig skjule en fejl, bevise readiness eller åbne artifact/Pages.

## Fejl og roll-forward efter current-run intent

Når den aktuelle kørsel har sat `legacy_activation_intent`, `d1_edge_predeploy_intent`, `d1_repair_intent` eller fresh `activation_intent`, er eneste recovery D1 roll-forward. En historisk markør/legacydetektion er ikke current-run intent: fejl før capacity/CAS udfører nul ekstern recoverymutation. `fresh_edge_predeploy_intent` alene er derimod en pre-activation fresh-grænse og må kun repareres via exact-main → Supabase-secret → eksakt Edge-redeploy → dobbelt Supabase-attestation.

På en fejlet eller genstartet kørsel skal workflowet:

1. genbekræfte eksakt aktuelle `origin/main` før enhver recoverymutation;
2. kræve current-run existing-D1 edge-/legacy-/repair-/activation-intent og fastholde/persistere D1-point-of-no-return;
3. deploye og kontrollere den eksakte maintenance-kapable Edge-generation, mens den aktuelle mode endnu er uændret;
4. sætte en ny 20-minutters maintenance-lease, attestere begge grænser med femsekunders prober to gange uden cache, vente 20 sekunder og kræve mindst 600 sekunders restlease før den samlede højst syv minutter lange Worker-secret/deploy/health-gate;
5. aktivere D1, redeploye og dobbeltattestere Edge, vente yderligere 20 sekunder, genbekræfte main og køre den samme bladprojekterede, idempotente reconciliation;
6. attestere begge Edge-grænser og Workeren igen.

En genuine fresh installation med `fresh_edge_predeploy_intent`, men uden fresh `activation_intent`/markør, repareres exact-main-bundet til Supabase-secret, eksakt Edge-redeploy og dobbelt Supabase-attestation. Det er partial-Edge pre-cutover recovery, ikke post-cutover rollback. Existing-D1 `d1_edge_predeploy_intent` og alle senere D1-intents går altid D1 roll-forward. En udløbet maintenance-lease genåbner automatisk D1; den må ikke forlænges over Edges 30-minutters hard max som genvej.

## Global idempotens, readback og privacy

- Shard 0 reserverer `client_observation_id`, valgfrit `trip_id`, HMAC-ejer, payloadhash og målshard atomisk før shardinsert. Den globale registry forhindrer, at samme identitet divergerer på tværs af ti shards.
- Samme legacy-række kan anerkendes som no-mutation replay, når oprindelig selvhash, ejer-/id-binding og den deterministiske sikre projektion er identiske. Reelle payload-, ejer- eller id-konflikter afvises.
- Readback genberegner lagret hash og fører kun den dokumenterede sikre top-level/nested allowlist ud. Ukendt schema, ukendt felt, direkte identitet, lokation, geohash/UTM, rå komponent eller friform-metadata stopper fail-closed.
- Schema-v2 quality/trust kan udelukke kalibrering, men `calibration_eligible=true` er ikke i sig selv serverbevist mod et signeret public manifest og må ikke åbne global koefficientlæring.

## Kapacitet

Det daglige **Monitor RavRadar trip storage**-workflow læser kun database-metadata. Det kræver ti EU-shards, advarer ved 70 % og fejler ved 85 % af enten 500 MB på største shard eller 5 GB samlet. Ved advarsel skal ejer vælge betalt kapacitet, dokumenteret arkivering eller ny godkendt arkitektur før 85 %; historik må ikke slettes ad hoc.

RavRadars Edge-gates begrænser normaltrafik til 2.000 observationer og 5.000 turlogkald pr. dag. Supabase-forbrug kontrolleres fortsat særskilt, især banneret om mulig begrænsning fra 9. september 2026.

## Sletning af en ejers ture

Kommandoen `scripts/delete-trip-owner-data.mjs --confirm-delete-owner-data` må kun køres ved en verificeret ejerhenvendelse med credentials i procesmiljøet. `TARGET_SUPABASE_USER_ID` må ikke skrives som kommandolinjeargument eller i en delt log. Den 4.0.311-mergede og 4.0.312-roll-forward-bundne kommando:

1. beregner HMAC-pseudonymet lokalt;
2. skriver først ejerens globale D1-tombstone, så samtidige/nye reservationer stoppes;
3. sletter ejerens rækker på alle D1-shards og registrybindinger;
4. sletter ejerens bevarede Supabase-kilderækker;
5. verificerer begge lagre uden payloadudskrift.

Kommandoen sletter ikke selve Auth-kontoen eller profilen. Cloudflare D1 Time Travel kan bevare en slettet række i leverandørens syvdages gendannelsesvindue.

## Hændelser og nøgler

- **D1/Worker utilgængelig efter point-of-no-return:** behold D1 som ønsket mode, blokér Pages, ret årsagen og genkør eksakt-head roll-forward/reconciliation. Slå ikke tilbage til Supabase.
- **Fejl før installationstype-intent:** Capacity-/pre-CAS-fejl sætter intet intent og må starte nul recoverymutation.
- **Partial first Edge-deploy:** `d1_edge_predeploy_intent` går D1 roll-forward. `fresh_edge_predeploy_intent` uden activation-intent går exact-main → Supabase-secret → eksakt Edge-redeploy → dobbelt Supabase-attestation.
- **Runner-tab under maintenance:** Den normale lease er 20 minutter og kan ikke accepteres over 30 minutter. Mens den er aktiv, fejler Edge lukket; ved udløb genåbner Edge automatisk D1. Genkør derefter den eksakte roll-forward-kæde med femsekunders Edge-prober og 600 sekunders restlease før den samlede syvminutters Worker-gate.
- **Gateway-secret mistænkt kompromitteret:** opret ny stærk værdi, opdatér GitHub-secret og kør D1-workflowet, som installerer den i Worker og Supabase i samme kontrollerede kæde.
- **Pseudonym-secret mistænkt kompromitteret:** stop normal D1-deploy og opret særskilt incident-/v2-migrationsbeslutning. Rotér ikke blindt.
- **Shard eller samlet lager over 85 %:** workflowet stopper. Opgradér/udvid efter ejerbeslutning; slet ikke ture for at tvinge en grøn gate.
- **Supabase-begrænsning:** turlagerflytningen beskytter kun databasevækst. Auth, Edge, rate limit og egress kan fortsat rammes og skal behandles efter Supabases aktuelle usage/billing-status.

## Bevis uden private data

Godkendt driftsbevis består af commit/run-id, konstant `[d1]`-identitet, varig fase (aldrig værdi fra en privat payload), antal EU-shards, skema-/registry-/tombstoneversion, samlede migreret/duplikat-/reconciliationtællinger, total/største shard i MB, HTTP-statusser, dobbelte Edge-attestationer og offentlig appkontrakt. Det må ikke indeholde bruger-id, pseudonym, mail, JWT, zone/tid-kombinationer fra enkeltture, owner-id, fri tekst eller payloads.
