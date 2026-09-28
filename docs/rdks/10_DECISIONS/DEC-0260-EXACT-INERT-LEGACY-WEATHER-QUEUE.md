# DEC-0260 – tre eksakt kendte, fastlåste legacy-kørsler

**Dato:** 2026-09-28
**Status:** Besluttet af ejeren tidligere; lokal 4.0.507, live-verifikation afventer

Den første levende tørkørsel af den mergede eksterne firetimerskontrol,
`36365055249` på main `1e2cc005`, afsluttede grønt uden vejrdispatch.
Beslutningen var `weather-run-active-or-queued`, selv om begge
aktuelle produktionsindgange ikke havde nogen ny aktiv kørsel.
GitHubs rå workflow-API returnerer fortsat tre gamle
`update-and-deploy.yml`-poster med status `queued` og helt uændret
`created_at`/`updated_at`:

| Run-id | Tid UTC | Head |
| --- | --- | --- |
| 34868901509 | 2026-09-14 16:29:10 | c4930944a6273c00f201994504e3971ad3f2b165 |
| 34613079069 | 2026-09-11 14:55:55 | 5587001b45ffea056addaf6cd20084719540336a |
| 34228112413 | 2026-09-08 12:47:45 | b814b525962514a368536f456477881390d6b333 |

Ejeren havde allerede afklaret, at netop disse tre ikke kan blive
aktive. Den generelle regel om at ignorere gamle ventende kørsler
ville derimod være usikker. 4.0.507 undtager derfor **kun** hver
præcis `id`, `head_sha`, `run_attempt=1`, `event=workflow_dispatch`,
`status=queued`, `created_at` og `updated_at`, og kun i historikken
for den gamle indgang. Enhver ændring i identiteten eller ethvert
andet ventende run spærrer stadig for dispatch. Den aktuelle
`run-current-weather-once.yml`-historik undtages aldrig.

Reglen om én kørsel pr. firetimersslot, ingen overlap, ingen
straksretry i samme slot og normal start efter en afsluttet fejl
fra forrige slot består. Der ændres ikke vejrdata, cache, prioritet,
score, geometri eller releasegates. Måltest er ikke livebevis:
exact-head CI, merge, ny kontrolkørsel og faktisk ekstern start
skal vise, at undtagelsen kun fjerner denne falske blokering.
Cron-job.org forbliver deaktiveret, indtil det er verificeret.
