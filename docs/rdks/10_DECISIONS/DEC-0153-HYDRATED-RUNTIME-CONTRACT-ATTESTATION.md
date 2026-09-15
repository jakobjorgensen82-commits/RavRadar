# DEC-0153 – Cachekontrakter attesteres fra den byggede runtime

**Dato:** 2026-09-15  
**Status:** Aktiv og implementeret lokalt i 4.0.372

## Problem

4.0.371 bestod exact-head sourcegate `34921912516`, blev merged gennem PR #313
som main `36ea9374`, og code-only-run `34922303619` genbrugte kildebevis,
central version 1, migration 16/17, privacy, restore og udpakning uden provider.
Den korrekte 11-feltsbinding bestod. Næste kontrol sammenlignede derefter den
beskyttede caches kontrakthashes med hashes beregnet fra en rå Git-udpakning.

Den sammenligning er ikke gyldig. Cachemanifestet blev forseglet efter central
hydrering og generering af runtimefiler. Den rå commit er derfor den rigtige
historiske kode, men er ikke byteidentisk med det færdige byggeworkspace.

## Beslutning

- Cachemanifestet skal fortsat matche de tre eksakte forseglede kontrakthashes,
  datasæt-id, indholdshash, modelbinding og 210/673-inventar.
- Den rå historiske source bindes fortsat til den eksakte commit og bruges til
  de uændrede model-, state- og stagingvalidatorer.
- De to uafhængige beviser må ikke kræves byteidentiske, fordi de repræsenterer
  henholdsvis rå source og hydreret produktionsworkspace.
- Migreringen må fortsat kun ændre de tilladte modelbundlehashfelter. Vejr,
  målinger, scores, Candidate G-state, geometri og private payloads er urørte.

## Drift

Næste code-only-run er providerfri og fortsætter fra samme bevarede cache.
Ingen migration, oneoff eller vejrhentning gentages. Først efter central og
offentlig modelverifikation må en normal tidsbegrænset vejrkørsel startes.
