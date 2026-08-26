# DEC-0082: Supabase-identitet og færdigt eksternt EU-turlager med eksplicit rollback

**Status:** Ejerbesluttet og implementeret i kandidat 4.0.287. Infrastrukturens exact-head/merge, dedikeret konto, mindst-mulige credentials, krypterede GitHub-secrets og Edge-deploy i Supabase-rollback er verificeret; EU-shards/Worker, migration, D1-cutover og offentlig ende-til-ende-verifikation afventer eksakt merged kandidat.

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
8. `TRIP_STORAGE_MODE=supabase` er den eksplicitte rollback. Der findes ingen skjult automatisk fallback og ingen normal dual-write. Under rollback går nye writes og læsninger til Supabase; ældre D1-ture er bevaret, men kan være midlertidigt usynlige, indtil D1 er genåbnet. Ved tilbagevenden køres den idempotente migration igen før og efter skiftet.
9. Ejerens turdata kan slettes på tværs af begge lagre gennem den eksplicit bekræftede, ikke-loggende driftskommando. D1 Time Travel kan fortsat bevare en slettet række i leverandørens syvdages gendannelsesvindue.
10. Den normale deploy er manuel, kræver eksakt `main`, fuld `validate:source`, EU-shards/skema, privat Worker-verifikation, migration, Edge-deploy og ikke-skrivende slutkontrol. Windows Application Control må ikke svækkes; CI/browser er den godkendte kanal.

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

DEC-0063 til DEC-0066 gælder fortsat for valgfrit login, én logisk turpost, samme rapportflow, privat ejerskab og dataminimering. Deres konkrete udsagn om, at turposten altid ligger i Supabase-tabellen `observations` og læses direkte gennem dens RLS, er erstattet af denne beslutning. Supabase-tabellen bevares som migrationskilde og eksplicit rollback, ikke som normalt dobbeltlager.

DEC-0080's HTML-, RLS-, gateway-, CORS-, rate-limit- og privatlivsgrænser består. Candidate G, RavScore, vejr, geometri og land-/vandpunkter ændres ikke.

## Accept

- Målrettede lokale tests skal bevise pseudonymisering, identitets-/GPS-fravær, HMAC-integritet og alder, ti-shard-fordeling, idempotens, privat log, ejer-sletning, cutover-rekonsiliering og Supabase-rollback.
- Exact-head source gate skal bestå på PR-head.
- Cloudflare-konto, EU-shards, Worker og secrets må først oprettes gennem en godkendt kanal og skal verificeres uden private payloads.
- Migrationen skal rapportere kun summerede tællinger. Kilden slettes ikke.
- Efter merge skal D1-normaldrift, Supabase Edge, konto/turlog, rollbackkontrakt og offentlig 210/673-side verificeres grønt.
