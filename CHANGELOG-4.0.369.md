# RavRadar 4.0.369 – sikker og genprøvbar privat runtime-recovery

**Dato:** 2026-09-15  
**Status:** Lokal releasekandidat; exact-head PR-gate, merge og providerfri code-only-fortsættelse mangler.

## Produktionsresultat før rettelsen

4.0.368 bestod sourcegate `34915216698`, blev merged som main
`c461063690ff148604cb6c2f87053105fe96771b`, og code-only-run
`34915725308` sprang korrekt den allerede udførte recovery over. Migration 16
blev installeret og læst tilbage. Runnet stoppede derefter før runtimeændring,
nyt Pages-artifact og central completion, fordi den beskyttede runtime ikke
kunne gendannes gennem den eksakte forgængerkode.

Den oprindelige publicering i run `34877443841` havde desuden allerede vist,
at et anonymt downloadforsøg fik HTTP 200. Det er en reel privacyfejl for den
private runtime og må ikke ignoreres.

## Samlet rettelse

- Ny append-only migration `20260915020000_private_runtime_storage_deny.sql`
  lægger en restriktiv SELECT-policy på netop
  `ravradar-private-production-runtime` for `anon` og `authenticated`.
  Service-role-adgang og andre buckets ændres ikke; ingen runtimeobjekter eller
  pointerrækker skrives om.
- Migration 16 forbliver den eksakte RavScore-/checkpointbinding. Koden skelner
  nu mellem seneste modelbinding og seneste driftsmigration, så næste run kun
  anvender sikkerhedsleddet og aldrig gentager migration 16.
- Den eksakte forgængerforventning forsegles fortsat mod den urørte
  `fa418f43`-kilde. Derefter bruges den aktuelle source-gatede restore-wrapper
  i forgængertræet, så afvisninger kun vises som ufølsomme kategorier.
- Supabase Storage-restore genprøves højst tre gange med fem sekunders mellemrum.
  Både den direkte og historiske runtimevej skal bevise, at den gemte generation
  afvises anonymt, før offentlig runtime og Pages må fortsætte.

Ingen vejrprovider, oneoff, scoreformel, kystgeometri eller vejrværdi ændres.
Hvis alle tre restoreforsøg fejler deterministisk, viser samme run årsagskategorien
uden at logge payload og uden at skrive runtime eller Pages.
