# RavRadar 4.0.321 – bounded metadata-CAS for det private RavScore-checkpoint

**Dato:** 2026-09-03
**Status:** Lokal releasekandidat oven på merged Phase A `7198b685`. Candidate G er fortsat den eneste offentlige model. Uafhængig SQL-review fandt ingen P0/P1; remote Supabase dry-run/readback, exact-head, data-/kapacitetsbeviser, merge, frisk produktion, manuel Fase B og offentlig state-6-verifikation er åbne.

## Ændret

- Normal checkpointpublicering bruger en fixed-key, service-role-only compare-and-swap og returnerer højst 4 KiB metadata i stedet for en fuld fler-megabyte payload.
- Selve checkpointpayloaden er bounded til højst 16 MiB i sin kanoniske serialisering. Fuld payload hentes kun ved reel restore/cache-miss; den samlede HTTP-wrapper påstås ikke at have samme loft.
- Retry af samme payload er idempotent. Version-, target-, same-target-content- og central-state-konflikter stopper fail-closed, bortset fra én eksakt 4.0.320→4.0.321-genattestering ved samme target.
- Continuation-kilden normaliseres som `utf8-bomless-lf-v2`, så Windows- og Linux-checkouts giver samme aktuelle hash `35c45f8f1f701695923b3195d60a6b8931aad4d2d08b05c93900b88401eca95c`. Kun den kendte 4.0.320-forgænger `082a5187f569518c0474590e924ccd17fce760d494a1da4a593de551e440cf91` fra sourcehead `7198b685f4bc9d86bd6432b049380f4279ab797c` må genattesteres; kun continuation-hash samt top- og companion-generation må ændres, og alt andet indhold skal være identisk.
- Checkpointet skaber ikke nye adminhistorikkopier; eksisterende historik bevares. Restriktiv RLS skjuler current og historiske checkpointpayloads for authenticated-læsning.
- Databasen validerer envelope, exact keys/ranges/tider, 673 integrerede og 673 READY Candidate G-dele, modelbinding, continuation-hash og privacy. Replay- og generationshashberegning forbliver i JavaScript.
- Migration, frisk schema og sikkerhedsinstaller deler samme genererede SQL-blok. En separat metadata-readback attesterer migration, funktioner, trigger, RLS, ACL, security mode og `search_path` uden at læse checkpointrækker.
- Kapacitetsfremskrivningen skelner nu normal metadata-only publicering fra sjældne fulde restores. Live før/efter-egress, øvrig trafik, database/lager og mindst 30 procent reserve er fortsat en hard gate.

## Uændret

- Integreret model-id/state/formel, 20/50/30, +10/−8, 13 timer, 4/48 timer, last-mile, historikkvalitet, DMI-first/Copernicus exact-gap, Feggesund, rollback og offentlige payloads.
- Ingen syntetisk historik, score, koordinater eller rå U/V gemmes eller returneres af checkpointmetadataen.
- Ingen zone, geometri, kystnormal eller land-/vandpunkt er ændret. De to geodatafiler har alene fået topversion 4.0.321.

## Verifikation

- Lokalt grønne måltests: continuation checkpoint, protected checkpoint, private runtime, integrated cutover readiness, installerparitet, release metadata, workflowrækkefølge og modelbundle.
- Uafhængig read-only SQL-review bekræftede CAS, installerparitet, no-history, RLS/ACL/search path og exact 673+673 uden P0/P1. Eksternt releasebevis afventer remote Supabase dry-run/apply/readback, exact-head, 673 × 118, Feggesund 3 × 118, live kapacitet, merge, fuld produktion og offentlig mobil-/desktopkontrol.
