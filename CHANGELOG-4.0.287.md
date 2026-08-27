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

## Produktionsbevis

- Målrettede kontrakter og den fulde lokale `scripts/validate-source.ps1` er grønne for pseudonymisering, HMAC, ti shards, idempotens, privat turlog, ejersletning, migration, cutover, rollback og releasegate.
- Infrastruktur-PR #162 bestod exact-head `33014102652` og blev merged som `27cebfd0`. Den afgrænsede workflowrettelse i PR #163 bestod exact-head `33014672254` og blev merged som `94b58e41`.
- En dedikeret Cloudflare-konto, præcis to mindst-mulige D1/Worker-tokens og de nødvendige krypterede GitHub Actions-secrets er oprettet og kontrolleret uden at vise værdier. De efterfølgende udløbsændringer og rotationer er beskrevet nedenfor.
- Rollback-deploy `33014772035` satte `TRIP_STORAGE_MODE=supabase`, deployede de versionsstyrede Edge-funktioner og bestod ikke-skrivende CORS-, login- og feltkontrol.
- Første D1-cutover `33019198166` bestod exact-main sourcegate, oprettede/skema-verificerede ti tomme EU-shards og deployede Workeren, men stoppede før migration og Edge-skift, fordi health-kaldet ramte den umiddelbare Cloudflare-udbredelsesforsinkelse. Endepunktet blev derefter payloadfrit verificeret grønt; verifikationsscriptet bruger nu højst 53 sekunders bounded retry uden at lempe health-, shard- eller skemakravet.
- Opfølgningen bestod PR #166 exact-head `33019805663` og blev merged som `2d12c085c8178c4b89e8b00bf00ca43abe15129f`. D1-cutover `33019868542` bestod Worker-grænse, pre-/post-migration, Edge-deploy og ikke-skrivende livekontrol. Fire eksisterende Supabase-rækker blev migreret; andet gennemløb fandt fire idempotente dubletter og fortsat fire målposter uden kildesletning eller payloadlog.
- Fuld frisk produktion `33019856228` og Pages-job `98351206091` er grønne. Offentlig `rr-20260826224651-210` viser 4.0.287, 210/210 aktive zoner, 673 kystdele, 420 aktuelle og 2.100 prognosevisninger samt nul kontrol-, konsol-, side- eller HTTP-fejl. **Bedste områder** er befolket.
- Det separate read-only monitorjob `33021364240`/`98352259752` verificerede ti shards, 0 MB afrundet samlet/største shard og 0 % forbrug uden at læse ture.
- Cloudflare deploy-/audit-token er efterfølgende ændret til **No expiration** uden værdiskift og med uændrede mindst-mulige rettigheder. Supabase-PAT'et er sikkert udskiftet med et dedikeret token, der udløber 25. august 2027; D1-verifikation `33024408547` bestod hele kæden, før det gamle og et ubrugt mellem-token blev tilbagekaldt.
- Payloadfri Cloudflare-audit `33024621109`/`98362935528` genbekræftede efter udløbsændringen ti shards, 0 MB afrundet og 0 % forbrug uden turlæsning.
- En første verifikation `33023652174` stoppede sikkert ved Supabase-tokenets formatkontrol, fordi browserens og Windows' udklipsholdere var adskilte. Ingen tokenværdi blev logget, det gamle PAT blev bevaret, og den korrigerede overførsel brugte en lokal engangskanal uden fil eller kommandolinjeværdi.
- Et secret-frit GitHub-workflow varsler via en tildelt issue og mail fra 60 dage før Supabase-udløb med opfølgning ved 30/14/7/3/1/0 dage. Det har kun `issues: write` og kan hverken læse tokens, ture eller deploye.
- PR #169 bestod exact-head `33025102301` på `ba8e8f03` og blev merged som `1e402834`. Manuel main-prøve `33025289153` bestod uden at oprette en for tidlig issue, fordi der er mere end 60 dage til udløb.
- Frisk pushproduktion `33025210517`/Pages-job `98367528389` bestod hele data-, runtime-, validerings-, release-, Supabase- og deploykæden. Offentlig `rr-20260827000855-210` er 4.0.287 med 210/210 aktive zoner, fem **Bedste områder**, 673 dele, 420 aktuelle visninger, 2.100 prognosevisninger og nul kontrol-, side- eller HTTP-fejl.

## Intern analyseopgave

- En fremtidig, score-neutral sammenligning må analysere offentligt synlige Ravudsigten-resultater mod RavRadar over flere vejrsituationer. Den må kun udlede observerbare hypoteser, må ikke omgå adgang eller kopiere privat kode og har `scoreImpact=false`/`publicRuntime=false`.
- Opgaven må stå i RDKS, roadmap og changelog, men må ikke vises i appen, den offentlige Markdown-/webhåndbog, ekspert-/adminflader eller offentlige prognosedata.

Candidate G 20/50/30, score, vejr, geometri og land-/vandpunkter ændres ikke. Geodatafilerne må kun få releaseversionens topmetadata; separat diff skal bevise, at ingen geometri eller punkter er ændret. Se DEC-0082.
