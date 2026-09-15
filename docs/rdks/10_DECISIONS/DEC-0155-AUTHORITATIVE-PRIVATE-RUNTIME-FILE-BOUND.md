# DEC-0155 – code-only bruger den beskyttede cachetransports filgrænse

**Dato:** 2026-09-15  
**Status:** Aktiv og implementeret lokalt i 4.0.374

## Problem

4.0.373 bestod sourcegate `34924287616`, blev merged gennem PR #315 som main
`bf61970ab92585fd4c004994cc52d4ea20ce73a8`, og code-only-run
`34924664012` passerede den manifestbundne offentlige detailfil. Den private
runtime blev verificeret, migreret og installeret atomisk uden provider.

Den efterfølgende offentlige genopbygning læste samme installerede
`data/live/conditions.json` gennem et uafhængigt gammelt 256 MiB-loft. Filen
var allerede godkendt af cachetransporten, men blev derfor afvist før parsing
og før publicering.

## Beslutning

- Code-only-læseren genbruger
  `PROTECTED_PRIVATE_RUNTIME_POLICY.maximumFilePayloadBytes` på 768 MiB.
- Den beskyttede restore skal fortsat kontrollere eksakt størrelse og SHA-256
  mod det forseglede bundlemanifest før atomisk installation.
- Code-only-trinnet kræver fortsat en almindelig ikke-symbolsk fil, gyldig
  JSON, aktuel modelbinding, samme datasæt/reference, 210/673-inventar og
  uændret offentlig projektion.
- Der indføres ingen ubegrænset læsning og ingen ny særskilt størrelsesværdi.

## Drift

Næste code-only-run genbruger central version 1, migration 16/17, privacy og
den gemte cache uden provider. Ingen oneoff eller vejrhentning indgår.
