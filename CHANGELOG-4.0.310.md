# RavRadar 4.0.310

Dato: 2026-08-29

## Hurtigere ekstern overtagelse

- Det ene eksisterende cron-job og dets `04/19/34/49` UTC-plan er uændret.
- Et eksplicit `external_watchdog=true` kan nu bestille normal `force=false`-produktion efter mere end 15 minutters samtidig stilhed i produktionshistorik og offentligt manifest.
- GitHubs interne schedule-watchdog beholder 45 minutter. Almindelig manuel keepalive udløser fortsat ingen produktionsvagt.
- Aktiv/queued produktion, frisk produktionshistorik eller friskt manifest blokerer fortsat en ny bestilling; alle tunge builds deler samme concurrency.

## Evidens og afgrænsning

- 4.0.309-vagten `33246369618` bestilte korrekt den første redningsproduktion `33246376992` kl. 09:49 UTC efter vedvarende native schedule-stilhed. Den viste samtidig, at 45 minutter gav cirka en time mellem produktionsstarterne. Produktionen bestod den fulde kæde og publicerede komplet `rr-20260829095610-210` med reference 09:00 UTC.
- Offentlig eftermåling viser, at komplette aktuelle vejrdata ikke retablerede den mistede historik: 673 dele er `WINDOW_INCOMPLETE` med 5–12/48 sammenhængende timer. Tidligere forventet nøddriftsophør omkring kl. 15 er forkastet; ingen historik backfilles kunstigt.
- Boundarytests låser no-op ved præcis 15 minutter, dispatch lige over 15 minutter, aktiv-run-blokering og frisk-manifest-/frisk-run-blokering.
- PR #222 bestod exact-head `33247789054` på `63ab1209`, blev merged som `792648c3`, og post-merge-produktion `33247839121` publicerede komplet 4.0.310/`rr-20260829103233-210` efter alle fulde gates.
- Automatisk cron-run `33248692042` kom på den mergede kode efter fortsat native schedulerstilhed, bestod 15-minutterskontrollen og oprettede præcis én normal produktion `33248699516`.
- RDKS, begge håndbøger, releaseversion, hele lokale `scripts/validate-source.ps1` og releasegate er grønne; geodatadiffen ændrer kun de to topversionsfelter.
- Ingen kompletheds-, current-hour-, DMI/Copernicus-, Candidate G-, validate-, release- eller deploygate er ændret.
- Ingen model-, score-, vejrinput-, state-, recovery-, geometri- eller punktændring og ingen kunstig/interpoleret historik.
- Geodata må kun ændre topversionsfelt 4.0.309 → 4.0.310.

Se DEC-0108.
