# RavRadar 4.0.321 – bounded metadata-CAS for det private RavScore-checkpoint

**Dato:** 2026-09-03
**Status:** Lokal releasekandidat oven på merged Phase A `7198b685`. Candidate G er fortsat den eneste offentlige model. Uafhængig SQL-review fandt ingen P0/P1; remote Supabase dry-run/readback, exact-head, data-/kapacitetsbeviser, merge, frisk produktion, manuel Fase B og offentlig state-6-verifikation er åbne.

## Ændret

- 2026-09-04: kildekontrollen kører fuld releasegate først og undgår 33 identiske gentagelser bagefter. Alle 134 oprindelige kildekommandoer er bevaret i deklarationen; plan-/fejlstopstest tilføjet. Den konkrete gamle releasekommando-kontrol er rettet, så både metadata og migrationsfremføring kræves. Ny CI-tid og samlet bestået kørsel afventer.

### HARMONIE-reference 2026-09-04 – lokalt, ny runtime afventer

- #252-kontrollens oversete backendtest er ført fra historisk migration til produktionskædens seneste kontrakt; hele testen består lokalt. Ingen ændring af vejrkode, modelbinding eller SQL i denne testopfølgning.

- Lambert-formatfejlen og manglende geografisk vindomregning er rettet samlet i fælles producent. HARMONIE-only cachemarkør bevarer marinearbejdet; primær kilde v2 og DKSS-vindhale v1 valideres separat.
- Reelle model-/rollback-/continuation-bindinger føres frem med ny migration `20260904140000`; alle gamle migrations bevares. Den nye SQL-krop er måltestet til kun at ændre eksakte bindinger/readbackversion. Se HARMONIE-rapporten for fulde hashes og beviser. Ingen ny produktion, modelaktivering eller 210/673/118-bevis endnu.

### Driftslukning 2026-09-04 – lokal, afventer ny exact-head og produktion

- Friske DMI-snapshots må ikke kassere dokumenterede Copernicus-forsøg alene på filhash eller et bounded referenceskift. Originale acquisitiontider og identiteter bevares, aktuelle par tælles igen, og frigivelse kræver ny streng READY.
- Shardinddeling beregnes fra hele det centrale register; kun konkrete DMI-huller hentes. Ingen land-/vandpunkter eller geometri ændres.
- Kildekontrol kan genbruges for eksakt samme main efter live GitHub-verifikation, inklusive senere fejl/reruns. Ukendt/fejlet evidens kræver kontrol. PR-gate samt frisk fuld produktionsvalidering/releasegate består.
- Den gamle tre-timers DMI-stride forklarer en del af forskellen til den nye exact-hour-arbejdsmængde; der ændres ikke DMI-first, datafriskhed eller modelkrav for at skjule langsom fremdrift.

### Oprindelig checkpointændring

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
