# DEC-0082: Supabase-identitet og eksternt EU-turlager – historisk cutoverkontrakt

**Status:** Ejerbesluttet, implementeret og produktionsverificeret i 4.0.287. Auth-, HMAC-, EU-, shard-, dataminimerings- og kapacitetsdelene gælder fortsat. DEC-0109's 4.0.311-protokol og 4.0.313's bounded legacyreplay er merged; exact-main D1-run `33269631305` bestod begge syncs, slutreconciliation, Edge, Worker, registry og SQL. Lokal 4.0.314 ændrer kun incident-inspektørens afteranker og kræver nyt exact-head D1-bevis før rekonstruktion/Pages. Offentlig produktionssandhed er fortsat 4.0.310. Driftspræciseringen af 27. august 2026 gør Supabase-PAT'et behovsstyret i stedet for kalenderroteret.

## Baggrund

Supabase Free har fortsat plads til login, profiler, rettigheder og central administration, men den bindende databasegrænse er 500 MB. Projektet viste cirka 86 MB database og et særskilt varsel om mulig begrænsning fra 9. september 2026 efter en tidligere egressoverskridelse. Ture er den forventede langsigtede vækst og må derfor ikke optage Supabases resterende databaseloft.

Ejeren har valgt den endelige arkitektur fra første dag og krævet en eksplicit Supabase-rollback. En tidligere Turso Free-kandidat er forkastet, fordi den aktuelle gratis plan ikke tydeligt inkluderer en databehandleraftale. Pseudonymiserede, men linkbare turforløb behandles fortsat som persondata.

## Beslutning

1. Supabase forbliver autoritativ for Auth, profiler, roller, rettigheder, rate limit og den offentlige Edge-grænse.
2. Normal turlagring bruger `TRIP_STORAGE_MODE=d1`. `submit-observation` verificerer Supabase-sessionen, validerer payloaden og fjerner direkte identitet og GPS, før en tur sendes videre.
3. Rå `user_id`, `anonymous_id`, mail, navn, JWT, GPS og rute må aldrig sendes til eller lagres i Cloudflare. Ejerskab erstattes med en domæneadskilt HMAC-SHA-256-pseudonymnøgle, `usr_v1_…` eller `anon_v1_…`, lavet med `TRIP_PSEUDONYM_SECRET_V1`, som kun findes i GitHub/Supabase-secretlagrene.
4. Supabase Edge og Cloudflare Worker bruger en særskilt HMAC-signeret servicekontrakt med body-hash, metode, sti og et højst fem minutter gammelt tidsstempel. Browseren kan ikke kalde turlageret direkte.
5. Cloudflare D1 fordeles deterministisk efter tur-id over ti databaser. Alle ti oprettes uforanderligt med `jurisdiction=eu`. En brugers private log læses fra alle shards, flettes efter observationstid og begrænses fortsat til højst 200 poster, normalt 100.
6. Den samme logiske tur gemmes kun én gang i det normale lager. `client_observation_id`, valgfrit `trip_id` og et kanonisk payload-hash gør genforsøg idempotente og afviser samme id med ændret indhold.
7. Eksisterende Supabase-ture migreres uden payloadudskrift og uden at slette kilden. Cutover-workflowet migrerer både før og efter Edge-skiftet, så en tur indsendt under deploymentvinduet ikke efterlades.
8. **Historisk 4.0.287-kontrakt:** `TRIP_STORAGE_MODE=supabase` var post-cutover rollback. DEC-0109 erstatter den: existing-D1 edge-predeploy/legacy/repair/activation-intent går kun D1 roll-forward. Genuine fresh får særskilt `fresh_edge_predeploy_intent`; partial første Edge-deploy før fresh activation repareres exact-main-bundet med Supabase-secret, eksakt Edge-redeploy og dobbelt Supabase-attestation. Fejl før capacity/CAS sætter intet intent og muterer ikke recovery-state.
9. Ejerens turdata kan slettes på tværs af begge lagre gennem den eksplicit bekræftede, ikke-loggende driftskommando. D1 Time Travel kan fortsat bevare en slettet række i leverandørens syvdages gendannelsesvindue.
10. Den normale deploy er manuel, kræver eksakt `main`, fuld `validate:source`, EU-shards/skema, privat Worker-verifikation, migration, Edge-deploy og ikke-skrivende slutkontrol. Windows Application Control må ikke svækkes; CI/browser er den godkendte kanal.
11. `SUPABASE_ACCESS_TOKEN` er kun en management-credential til dette manuelle deploy-/migrations-/rollbackflow. Den offentlige Supabase Auth/Edge-runtime og D1-turlagringen må ikke afhænge af PAT'et. Et installeret PAT må udløbe uden rutinefornyelse eller udløbsvarsel. Før en konkret managementændring oprettes et kortlivet PAT gennem godkendt kanal, den fulde relevante kæde verificeres på eksakt `main`, og tokenet tilbagekaldes efter grøn verifikation.

## Kapacitet og driftsgrænser

Cloudflare Workers Free/D1 giver aktuelt 5 GB samlet lager, højst 500 MB pr. database, 100.000 Worker-kald pr. dag, 5 mio. læste D1-rækker pr. dag og 100.000 skrevne D1-rækker pr. dag. Ti hashfordelte shards kan derfor bruge den samlede 5 GB-pulje uden at samle én brugers identitet uden for Supabase.

RavRadars egne globale Edge-grænser er smallere: højst 2.000 observationer og 5.000 turlogkald pr. dag. Et logkald læser alle ti shards, altså højst 50.000 D1-kald ved den nuværende gate. En insert skriver tabelrække og indeksrækker og ligger fortsat langt under D1's dagsgrænse. Det daglige, payloadfrie kapacitetsjob advarer ved 70 % og fejler ved 85 % af enten en shard eller den samlede pulje.

Supabase Free oplyser aktuelt 50.000 månedligt aktive brugere, 500.000 Edge-kald pr. måned, 500 MB database og 5 GB egress. Turlagerflytningen fjerner fremtidig turvækst fra Postgres, men ikke Auth-/Edge-egress eller varslet fra 9. september 2026. Supabase-forbrug og banner skal derfor fortsat overvåges.

Officielle driftskilder:

- <https://developers.cloudflare.com/d1/platform/pricing/>
- <https://developers.cloudflare.com/d1/platform/limits/>
- <https://developers.cloudflare.com/d1/configuration/data-location/>
- <https://developers.cloudflare.com/workers/platform/limits/>
- <https://www.cloudflare.com/en-gb/cloudflare-customer-dpa/>
- <https://supabase.com/docs/guides/platform/billing-on-supabase>

## Forhold til ældre beslutninger

DEC-0063 til DEC-0066 gælder fortsat for valgfrit login, én logisk turpost, samme rapportflow, privat ejerskab og dataminimering. Deres konkrete udsagn om, at turposten altid ligger i Supabase-tabellen `observations` og læses direkte gennem dens RLS, er erstattet af denne beslutning. Supabase-tabellen bevares som migrationskilde, men DEC-0109 afløser dens rolle som post-activation rollback; den er ikke normalt dobbeltlager.

DEC-0080's HTML-, RLS-, gateway-, CORS-, rate-limit- og privatlivsgrænser består. Candidate G, RavScore, vejr, geometri og land-/vandpunkter ændres ikke.

## Accept

- Målrettede lokale tests skal bevise pseudonymisering, identitets-/GPS-fravær, HMAC-integritet og alder, ti-shard-fordeling, idempotens, privat log, ejer-sletning og cutover-rekonsiliering. Supabase-rollback var det historiske 4.0.287-krav; efter DEC-0109's point-of-no-return skal testen i stedet bevise D1 roll-forward uden Supabase-toggle.
- Exact-head source gate skal bestå på PR-head.
- Cloudflare-konto, EU-shards, Worker og secrets må først oprettes gennem en godkendt kanal og skal verificeres uden private payloads.
- Migrationen skal rapportere kun summerede tællinger. Kilden slettes ikke.
- Efter merge skal D1-normaldrift, Supabase Edge, konto/turlog, den aktuelt gældende roll-forward-/recoverykontrakt og offentlig 210/673-side verificeres grønt.

## Historisk DEC-0109-tillæg – storagehærdningen består efter DEC-0111

Dette tillæg ændrer ikke DEC-0082's identitets- eller dataplacering. Det hærder den tværgående storagekontrakt, som 4.0.311-protokollen og 4.0.313-roll-forwarden kræver:

1. Shard 0 fører én atomisk global `trip_observation_registry`, så `client_observation_id`, valgfrit `trip_id`, ejerbinding, payloadhash og målshard reserveres på tværs af alle ti shards. Samme id med andet indhold eller anden ejer afvises uden mutation.
2. Ejer-sletning skriver først en global `trip_owner_erasure_tombstones`-markør. Nye reservationer for den pseudonyme ejer stoppes atomisk; derpå slettes rækker og registrybindinger uden payloadudskrift. Tombstonen er en genoprettelsesbarriere, ikke en brugerprofil.
3. Supabase→D1-migration må aldrig hente `select=*`, hele fri-form-JSON-felter, GPS, koordinater, rå U/V, tekst/billeder eller ukendte kolonner. PostgREST læser kun en eksplicit server-side bladprojektion; owner-id bruges kun i memory til HMAC-pseudonymisering og logges ikke. Readback genverificerer selvhash, canonical safe projection, ejer-/id-binding og kvalitetskontrakt. Eksisterende ældre rækker omskrives ikke.
4. Deploymentet har konstant `[d1]`-identitet og varig `d1_activation_attempted=true`. Efter capacity og exact-main-CAS sættes umiddelbart før første Edge-deploy enten `d1_edge_predeploy_intent` eller `fresh_edge_predeploy_intent`. Existing D1 får eksakt Edge under uændret mode/gammel Worker, derpå repair-intent og 20-minutters maintenance-lease; Edge har 30-minutters max/automatisk D1 ved udløb. Femsekunders prober, dobbelt no-cache-attestation, 20-sekunders drain og mindst 600 sekunders restlease kræves før én samlet højst syv minutter lang Worker-secret/deploy/health-gate. Partial existing-D1 Edge-deploy går D1 roll-forward; partial fresh Edge-deploy går exact-main → Supabase-secret → eksakt Edge-redeploy → dobbelt Supabase-attestation. Uden installationstype-/andet current-run intent efter capacity/pre-CAS-fejl sker nul recoverymutation.
5. Den samme aktuelle `origin/main` genbekræftes umiddelbart før hver ekstern skrivefamilie. Første mulige Pages-build med denne kontrakt er 4.0.313 og må kun bygges efter et eksakt-head-bundet succesbevis fra D1-kæden; et manglende bevis giver no-op uden artifact/deploy. Trust-/tripprotokollens kompatibilitetsgrænse forbliver 4.0.311.

De fem grundpunkter blev exact-head-valideret på PR #224. 4.0.312 bestod derefter PR #225, men backend `33266229687` fejlede idempotent sync. 4.0.313's migration-only legacykompatibilitet blev exact-head-valideret i PR #226, merged som `ff62ba11` og live backendbevist af `33269631305` uden omskrivning af row/hash/registry. Dette er historisk exact-D1-bevis. Rekonstruktionen blev aldrig anvendt og er pensioneret af DEC-0111. Storage-, privacy-, migration- og roll-forward-kontrakten består uændret; det versionsafgrænsede `trip-storage-readiness` bevares for 4.0.311–4.0.314 og returnerer eksplicit `ready=true` for 4.0.315.

## Driftstillæg 2026-08-31 – transient retry må kun omfatte no-write-kontraktprober

1. Den afsluttende liveverifier må genkøre en probe kun ved HTTP 429/502/503/504 eller den eksisterende bundne timeout/transportfejl, højst tre forsøg med deterministisk 0/250/750 ms ventetid.
2. Retry er allowlistet til OPTIONS og en privat HMAC-signeret, statefri `trip-log`-GET uden request-body med fast domæneadskilt signature-path, per-attempt nonce/query og no-store-headers. Helperen konstruerer selv descriptoren og må ikke acceptere en vilkårlig request-closure. Den gamle/current normalrute afviser enhver ikke-POST med ikke-transient 405 før rate limit; rollout kan derfor ikke gøre proben stateful eller retrye den.
3. Den signerede gren ligger før rate limit, auth og storage og returnerer kun fast minimal 401 `LOGIN_REQUIRED` med readinessheaders. Den beviser Edge-liveness/response-kontrakt, ikke at auth er udført eller D1 er læst. Ugyldig signatur, metode, header eller payload stopper uden rate/auth/storage.
4. Normal `trip-log` skal fortsat følge rate limit → auth → storage én gang. `submit-observation`, observationens 400-/kvalitetsprober og enhver anden request, som kan skrive, forbruge kvote eller ændre state, må ikke genkøres.
5. Efter transient hændelse kræves samme eksakte 204/CORS/version/mode-, 403/fremmed-origin- eller signerede faste 401-kontrakt. Forkert ikke-transient status/header/body stopper straks; vedvarende transient fejl forbliver rød. Transient body og transportcause må ikke parses til diagnostik eller indgå i fejl/log.
6. Den aktive pre-write gate skal også køre eksisterende Worker-health og HMAC-signeret `/v1/trips/count`; kun denne separate Worker-probe er faktisk D1-readiness. Secrets bindes via step-env. Tillægget ændrer ikke offentlig app, Pages, D1-data, cutover, privacy, Candidate G/RavScore, vejr, geometri eller punkter og er versionsneutralt for 4.0.316.
7. Worker-count-readiness bruger en særskilt helper, som selv ejer eksakt `POST`, `/v1/trips/count` og body `{}` og aldrig modtager vilkårlig route/body/request-closure. Den må højst forsøge ved 0/250/750 ms og kun efter 429/502/503/504, bundet timeout eller Node `TypeError`; transient body/cause kasseres. Usigneret svar skal være 401. Signeret svar bruger frisk timestamp/HMAC ved hvert forsøg og skal være 200 med `ok=true` og et ikke-negativt sikkert heltal. D1-funktionen er ren `SELECT`; kun intern count-readfejl mappes til fast datasikker 503. Alle andre status-/body-/authkontraktfejl er ikke-transiente. Denne private driftskontrakt ændrer ikke appversionen eller Workerens storage-contract-version.
8. Den signerede 200-response er exact-key `{ok, trip_count}`. Ekstra felter, malformed body, forkert `ok`, negativt eller ikke-sikkert heltal er ikke-transiente kontraktfejl, stoppes efter første forsøg og må ikke lække gennem fejl eller log.
