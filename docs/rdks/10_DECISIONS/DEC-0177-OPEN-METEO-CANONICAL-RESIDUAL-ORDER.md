# DEC-0177 – Open-Meteo-resten skal have kanonisk fælles rækkefølge

**Status:** Aktiv og bindende; implementeret lokalt i 4.0.394, livebevis afventer
**Dato:** 2026-09-16

## Baggrund

4.0.393 blev leveret som main `88ecda1e`. Normalrun `35131237007`
gemte alle providercacher og byggede en gyldig `READY_WITH_MISSING`-closure
med 79.276 værdier og 138 lokale huller. History-adapteren afviste bagefter
Open-Meteo-dokumentet.

## Rodårsag

Adapteren rekonstruerede den rigtige mængde restpar, men sammenkædede først
alle positive assignments og derefter alle missing-assignments. Validatorens
kanoniske kontrakt kræver listen allerede sorteret efter `validTime` og
`partId`. Virkelige missing-par ligger mellem positive timer; den tidligere
fixture havde tilfældigvis missing sidst og skjulte fejlen.

## Beslutning

Positive og missing assignments samles og sorteres kanonisk før
Open-Meteo-dokumentet genvalideres. Sorteringen ændrer kun rækkefølgen.
Medlemskab, dokumenthash, recordrefs, targetregister, upstreambindinger,
required count, record count og missing count skal fortsat matche closure
præcist. Kun positive records publiceres.

## Bevis

Regressionstesten placerer missing ved reference-timen og en positiv record
en time senere. Den fejler med den gamle usorterede sammenkædning og består
med den kanoniske sortering. Exact-head og normal livebevis afventer.
