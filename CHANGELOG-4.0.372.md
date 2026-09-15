# RavRadar 4.0.372 – korrekt attestation af hydreret runtime

**Dato:** 2026-09-15  
**Status:** Lokal releasekandidat; exact-head PR-gate, merge og providerfri code-only mangler.

## Produktionsbevis før rettelsen

4.0.371 bestod sourcegate `34921912516`, blev merged via PR #313 som main
`36ea9374`, og code-only-run `34922303619` nåede forbi den tidligere forkerte
11-feltsbinding. Central tilstand, migration 16/17, privacy, restore og
udpakning blev genbrugt uden provider.

Runnet stoppede før runtime-, Pages- og completionwrites, fordi cachemanifestets
hashes fra det hydrerede produktionsworkspace blev sammenlignet med en rå
Git-udpakning. De to tilstande er med vilje ikke byteidentiske.

## Rettelse

Den ugyldige krydssammenligning er fjernet. Den beskyttede cache skal stadig
matche alle eksakte forseglede hashes, modelbinding, datasæt-id, indholdshash og
210/673-inventar. Den historiske commit bruges fortsat til de uændrede
validatorer, og kun modelbundlehashfelter må ændres.

Ingen vejrdata, score, state, migration, geometri, provider eller privat
payload ændres. Se DEC-0153.
