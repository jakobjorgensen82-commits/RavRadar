# DEC-0158 – kanonisk DMI-cache og eksakt efterfølger på samme vejrtid

**Status:** DMI-sti aktiv; pointerrolle afløst af DEC-0159 i 4.0.378
**Dato:** 2026-09-15

## Problem

4.0.376 bestod exact-head sourcegate `34941640752`, blev merged gennem PR #318
som main `3144c557`, og providerfri code-only `34942127741` gennemførte privat
restore, komplet metadataoverførsel, atomisk installation, offentlig
genopbygning og 210/673-runtimeaudit uden provider.

Den efterfølgende private specifikation brugte imidlertid
`.cache/dmi-candidate-progress.json`. Det er en midlertidig arbejdsfil fra en
rigtig vejrhentning og findes med vilje ikke i code-only. Den komplette cache
var allerede installeret som `data/live/dmi-bulk-cache.json`.

Samme gennemgang viste et efterfølgende sikkert stop: den beskyttede private
publicering afviser normalt to forskellige bundles med samme
`productionReferenceAt`. Her er den installerede current-bundle eksakt den
godkendte forgænger, mens efterfølgeren bevarer samme vejr og alene fører den
gemte runtime til den nye modelbinding.

## Beslutning

- Code-only bygger specifikationen fra den kanoniske installerede
  `data/live/dmi-bulk-cache.json`; den midlertidige kandidatfil må ikke bruges.
- Samme-reference-publicering forbliver afvist som standard.
- En undtagelse må kun bruges sammen med både forgængerens manifest og den
  eksakte rapport fra den netop udførte metadataoverførsel.
- Eksisterende pointer skal matche migrationsrapportens forgængerhash og
  source head. Forgænger og efterfølger skal have samme datasæt, vejrtid,
  generation, 210 zoner, 673 dele og ni eksakte filer.
- De otte filer uden `conditions.json` skal være byte- og hashidentiske.
- Rapporten skal bevise uændrede målinger, uændrede Candidate G-states, ingen
  privat payload i rapporten og mindst én modelbindingsændring for hver del.
- Den migrerede `conditions.json` skal matche efterfølgerens manifest i både
  byteantal og SHA-256.
- Den gamle og nye binding må alene afvige i `modelBundleSha256`, og begge
  kontrakter skal matche den forseglede rapport.

## Drift

4.0.377 fortsætter uden provider og uden oneoff. Først efter verificeret privat
runtime, central completion og offentlig Pages-runtime må en normal,
tidsbegrænset vejrkørsel startes for at bevise numeriske scorer, rotation og
cachevedligeholdelse.
