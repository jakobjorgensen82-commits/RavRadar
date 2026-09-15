# RavRadar 4.0.374 – privat runtime bruger cachetransportens filgrænse

**Dato:** 2026-09-15  
**Status:** Lokal releasekandidat; exact-head PR-gate, merge og providerfri code-only mangler.

## Produktionsbevis før rettelsen

4.0.373 bestod sourcegate `34924287616`, blev merged via PR #315 som main
`bf61970a`, og providerfri code-only `34924664012` nåede forbi den rettede
offentlige detailfil på `117.820.378` bytes. Forgængercachen blev igen
verificeret, migreret og installeret atomisk uden vejrprovider.

Det næste trin stoppede før offentlig genopbygning, fordi den installerede
private `conditions.json` var større end code-only-læserens gamle 256 MiB-loft.

## Rettelse

Code-only-læseren genbruger nu cachetransportens eksisterende, validerede
per-fil-loft på 768 MiB. Restoretrinnet har allerede kontrolleret den eksakte
filstørrelse og SHA-256 mod det forseglede bundlemanifest før atomisk
installation. Regelmæssig fil, JSON, modelbinding, datasæt, 210/673-inventar,
projektion og privacy kontrolleres fortsat.

Ingen data, score, state, migration, geometri eller provider ændres. Se
DEC-0155.
