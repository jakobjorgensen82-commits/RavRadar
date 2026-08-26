# RavRadar 4.0.287 – Supabase-identitet og EU-D1-turlager

Dato: 2026-08-26

## Leverance

- Supabase forbliver Auth-, profil-, rettigheds-, rate-limit- og offentlig Edge-grænse.
- Normal turlagring går til ti EU-låste Cloudflare D1-shards gennem en privat Worker.
- Rå bruger-/anonym-id, mail, navn, JWT, GPS og rute fjernes. Eksternt ejerskab er et domæneadskilt HMAC-SHA-256-pseudonym.
- Servicekald signeres over metode, sti, body-hash og tidsstempel. Kanonisk payload-hash samt klient-/tur-id giver idempotens og konfliktstop.
- Eksisterende Supabase-ture migreres idempotent både før og efter Edge-cutover uden at slette kilden.
- `TRIP_STORAGE_MODE=supabase` er en eksplicit rollback uden automatisk fallback eller normal dual-write.
- Et dagligt payloadfrit job advarer ved 70 % og stopper ved 85 % af D1-lageret. En eksplicit bekræftet kommando kan slette en ejers ture i begge lagre uden payloadlog.
- `docs/Trip-Storage-Operations.md` beskriver første cutover, normaldrift, rollback/retur, kapacitet, sletning og nøglehændelser uden private data.

## Kapacitet og drift

- Cloudflare Free: 5 GB samlet D1, 500 MB pr. database, 100.000 Worker-kald/dag, 5 mio. læste rækker/dag og 100.000 skrevne rækker/dag.
- RavRadars smallere globale Edge-gates begrænser normaltrafikken til højst 2.000 observationer og 5.000 turlogkald pr. dag.
- Supabase Free forbliver relevant med 50.000 MAU, 500.000 Edge-kald/måned, 500 MB database og 5 GB egress. Varslet om mulig begrænsning fra 9. september 2026 er ikke lukket af lagerflytningen.
- Turso Free blev forkastet, fordi en databehandleraftale ikke fremgår tydeligt af gratisplanen. Cloudflare D1 oprettes med uforanderlig EU-jurisdiktion og Cloudflares self-serve-DPA.

## Kontrolstatus før D1-cutover

- Målrettede kontrakter og den fulde lokale `scripts/validate-source.ps1` er grønne for pseudonymisering, HMAC, ti shards, idempotens, privat turlog, ejersletning, migration, cutover, rollback og releasegate.
- Infrastruktur-PR #162 bestod exact-head `33014102652` og blev merged som `27cebfd0`. Den afgrænsede workflowrettelse i PR #163 bestod exact-head `33014672254` og blev merged som `94b58e41`.
- En dedikeret Cloudflare-konto, præcis to mindst-mulige D1/Worker-tokens og de nødvendige krypterede GitHub Actions-secrets er oprettet og kontrolleret uden at vise værdier. Supabase-PAT'en udløber 25. september 2026; Cloudflare deploy-/audit-tokens udløber 27. august 2027.
- Rollback-deploy `33014772035` satte `TRIP_STORAGE_MODE=supabase`, deployede de versionsstyrede Edge-funktioner og bestod ikke-skrivende CORS-, login- og feltkontrol. På dette deltrin afventede D1-shards/Worker, migration, kandidatens endelige exact-head/merge, fuld produktion og offentlig verifikation.
- Første D1-cutover `33019198166` bestod exact-main sourcegate, oprettede/skema-verificerede ti tomme EU-shards og deployede Workeren, men stoppede før migration og Edge-skift, fordi health-kaldet ramte den umiddelbare Cloudflare-udbredelsesforsinkelse. Endepunktet blev derefter payloadfrit verificeret grønt; verifikationsscriptet bruger nu højst 53 sekunders bounded retry uden at lempe health-, shard- eller skemakravet.

Candidate G 20/50/30, score, vejr, geometri og land-/vandpunkter ændres ikke. Geodatafilerne må kun få releaseversionens topmetadata; separat diff skal bevise, at ingen geometri eller punkter er ændret. Se DEC-0082.
