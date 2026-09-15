# DEC-0159 – historisk privat binding valideres efter sin rolle

**Status:** Aktiv; implementeret lokalt i 4.0.378, produktionsbevis afventer
**Dato:** 2026-09-15

## Astra-opfølgning samme dag

Den efterfølgende helkædegennemgang fandt flere reelle stop. De er samlet
implementeret i samme lokale 4.0.378-batch efter modelskiftet til Sol/Ekstra
høj; se `docs/ai/ASTRA_DELIVERY_CHAIN_REVIEW_2026-09-15.md` og DEC-0160.
Historisk restore er nu regressionstestet med to reelt forskellige,
selvkonsistente arkiver. Pointeren læses først strukturelt, hvorefter hver
generation skal matche forbrugerens eksakte binding, kontrakter, manifest og
bytes. Det er fortsat ikke et produktionsbevis før exact-head-gate og deploy.

## Problem

Run `34947169348` beviste 4.0.377’s kanoniske DMI-sti: specifikation og bundle
blev bygget efter grøn metadataoverførsel, offentlig genopbygning og
210/673-audit. Publiceringen stoppede derefter før writes med
`Private runtime descriptor model binding has incompatible modelBundleSha256`.

Fejlen lå før 4.0.377’s migrationskontrol. Den fælles pointerlæser krævede den
aktive kodebinding på både current og previous. En forgænger, der skal migreres,
har per definition den gamle bundlehash, og en bevaret rollback har fortsat
den hash efter en vellykket overgang.

## Beslutning

- Uden overgangsbevis skal pointerens current fortsat matche den aktive
  RavScore-binding eksakt.
- Under samme-reference-publicering må current også matche præcis den binding,
  der står i det medsendte, hashvaliderede forgængermanifest. Andre historiske
  current-bindinger afvises.
- Pointerens previous er historik og må have en ældre binding, men skal have
  det eksakte 11-feltsformat, sikre identifikatorer og gyldige SHA-256-felter.
  Restore accepterer den kun, hvis den efterfølgende matcher den konkrete
  forventning og den lagrede bundle byteeksakt.
- Lige vejrtid mellem current og previous er lovlig, fordi forskellen kan være
  modelmetadata. Selve mutationstilladelsen ligger fortsat i DEC-0158’s
  eksakte samme-reference-migrationsbevis. Faldende vejrtid er fortsat forbudt.
- Readback, anonym-audit, senere generationer, retention og cleanup skal kunne
  læse den historiske previous uden at gøre den til aktiv model.

## Drift

4.0.378 fortsætter providerfrit fra de gemte data. Ingen oneoff eller normal
weather før privat runtime, central completion og offentlig Pages-runtime er
verificeret.
