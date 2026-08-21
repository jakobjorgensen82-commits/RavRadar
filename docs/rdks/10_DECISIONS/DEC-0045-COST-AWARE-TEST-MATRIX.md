# DEC-0045 - Omkostningsbevidst testmatrix

- **Status:** IMPLEMENTERET
- **Dato:** 2026-08-21
- **Besluttet af:** Ejer og Codex

## Problem

RavRadar brugte for meget tid på at gentage den samme kildekodekontrol lokalt, i PR og igen ved hver planlagt vejropdatering. Den virkelige 4.0.245-fejl skyldtes derimod samspillet mellem en frisk DMI-cache og den valgte strømtime og blev kun fundet af den fulde produktionsdatagate.

## Beslutning

1. Under udvikling køres målrettede tests for den berørte kontrakt samt nødvendige RDKS- og versionskontroller.
2. Den fulde validate:source skal bestå én gang på PR'ens eksakte head i GitHub. Lokal gentagelse kræves kun ved bred/tværgående risiko, manglende CI eller konkret fejlevidens.
3. Push og manuelle produktionsbyg kører den tidlige kildekodegate. Planlagte vejropdateringer på den allerede kontrollerede main-kode gentager den ikke.
4. Hvert nyt deploybart produktionsartifact skal fortsat bestå fuld npm run validate og npm run release:gate efter central hydrering, frisk vejr og proveniens.
5. Fuld browserkontrol af 210 zoner og 673 kystdele køres ugentligt eller ved relevante ændringer i UI, score eller offentlig datakontrakt. Andre ændringer får målrettet kontrol.
6. Kendte fejl, reel usikkerhed og modstridende evidens tilsidesætter altid den normale minimumsmatrix og udløser den ekstra kontrol, som problemet kræver.

## Sikkerhedsgrænse

Beslutningen ændrer kun placeringen og hyppigheden af dublerede kontroller. Den sænker ingen datakrav, 673/673-gate, releasegate, DMI-first-regel, scorekontrol eller mergekrav.

## Produktionsbevis

PR #37 blev merged som 3dc331ca. Exact-head-kildegaten og push-produktion 32468752244 bestod. Push-kørslen beholdt den tidlige kildekodegate og gennemførte derefter frisk data, fuld validering, releasegate, Supabase, artifact og Pages. Live viser 4.0.247 med 210 zoner og 673 kystdele.
