# DEC-0157 – Kanoniske rødder i den offentlige privacykontrol

**Status:** Aktiv  
**Dato:** 2026-09-15

## Beslutning

`assertPublicRuntimePrivacy` bruger sit andet argument som en maskinlæsbar
JSON-rodsti, ikke som en fri beskrivelse. Code-only-genopbygningen skal derfor
kalde den med præcis `startup`, `details` og `manifest`, svarende til den fælles
offentlige generator.

## Begrundelse

Run `34939798892` beviste, at 4.0.375 migrerede og installerede hele den gemte
private runtime. Genopbygningen stoppede derefter på
`zones.DK-B01-01.flowPoints.current`, selv om netop `flowPoints.current` og
`flowPoints.wind` er de historisk godkendte offentlige koordinater til kortets
verificerede pile. Årsagen var alene rodteksten `Code-only startup runtime`, som
ikke kunne matche allowlistens `startup...`-sti.

## Sikkerhedsgrænse

Allowlisten ændres ikke. Ukendte koordinatpar, positionsfelter, rå U/V,
private statefelter og private payloads er fortsat forbudt. Den fælles
generator og code-only-wrapperen kontrollerer samme dokument med samme
kanoniske sti, og Pages-artifactet gennemgår fortsat sin uafhængige filbaserede
privacyaudit.

## Drift

4.0.376 fortsætter providerfrit fra central version 1, migration 16/17 og den
allerede migrerede gemte runtime. Ingen oneoff eller normal vejrhentning må
starte før den offentlige code-only-installation er verificeret.
