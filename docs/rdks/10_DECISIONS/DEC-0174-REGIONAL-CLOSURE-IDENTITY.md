# DEC-0174 – Regional public adapter følger closureens eksakte identitet

**Status:** Aktiv og bindende; implementeres i 4.0.392, livebevis afventer
**Dato:** 2026-09-16

## Baggrund

Normalrun `35105048864` gennemførte DMI, Copernicus og Open-Meteo, gemte
alle tre cacher og bestod closure med 79.147 validerede par og 267 lokale
`MISSING`. Den efterfølgende public-history-adapter stoppede på
`REGIONAL_CLOSURE_SAMPLE_INVALID`.

Den regionale prøve var allerede blevet valideret og forseglet af closure.
Adapteren genindførte bagefter en gammel 12-timers sammenligning mellem
capture-tid og validTime. En lang, stadig gyldig regional prognose kunne
derfor bestå closure og blive afvist få trin senere.

## Beslutning

Public-history-adapteren skal finde præcis den ene regionale prøve, som den
forudgående closure har godkendt. Match sker efter kanonisk UTC for
`modelRun` og `validTime` samt eksakt `collection` og
`sourceAssetSha256`.

Adapteren må ikke indføre en ny alders- eller capture-heuristik oven på
closureens tids-, horizon-, retention- og kildebevis. Den skal fortsat
genberegne vektorcommitmentet og afvise nul match, flere match, forkert
samling, forkert kildehash eller ændrede U/V-værdier.

Samme resolver bruges af de almindelige regionale historikrækker og de
regionale referenceprøver til state-only holds. ReferenceAt kommer fra det
forseglede `productionReferenceAt`, ikke fra maskinens aktuelle ur.

## Drift

Rettelsen genbruger de cacher, der allerede blev gemt af `35105048864`.
Den kræver ikke en oneoff. Først efter 4.0.392 er live, køres én almindelig
vejrvedligeholdelse for at bevise adapteren i den fulde kæde.
