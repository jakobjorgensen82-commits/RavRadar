# DEC-0051: Jagtformsafhængig kobling mellem jagtbarhed og RavScore

**Status:** Aktiv produktbeslutning og score-neutral forskningsbeslutning; ingen produktionsaktivering

**Dato:** 2026-08-22

**Scorepåvirkning:** Ingen i offentlig runtime

## Ejerbeslutning

1. Ved strandjagt må den samlede RavScore godt være høj, selv om den praktiske jagtbarhed er lav. Kraftig vind kan gøre turen mindre behagelig uden at ophæve et stærkt fysisk ravpotentiale.
2. Ved wadersjagt er jagtbarhed en nødvendig del af metodens effektivitet. Lav jagtbarhed fra især vind og bølger skal derfor begrænse den samlede waders-score væsentligt.
3. Denne forskel er ikke en sikkerhedsvurdering. RavRadar skal ikke indføre en særskilt sikkerhedsadvarsel eller kalde RavScore en sikkerhedsgodkendelse.
4. Bundtype, dybdeprofil, render, vadebredde og lokal adgang indgår ikke som stedets grundegnethed. Lokalkendskab kan gøre automatiske geodata misvisende.
5. En eventuel kobling skal være synlig og matematisk forklarlig. Ingen skjult koefficient eller skjult gate må aktiveres.
6. I den næste waders-forskningsvariant giver vinddelen 100 point fra 0 til og med 6 m/s. Over 6 m/s falder den monotont og glidende gennem knækpunkterne 7/80, 8/60, 10/35, 13/10 og 18/0. Bølgedelen beregnes fortsat separat og vægter sammen med vinden i jagtbarheden.

## Score-neutral analyse

Fem koblinger af den foretrukne Candidate G-variant er sammenlignet på de eksisterende 1.460 historiske evalueringer og en syntetisk vind-/bølgematrix. Strandresultatet er låst uændret i alle forsøg.

Den ejer-godkendte næste forskningsvariant bruger en eksplicit waders-begrænsning:

`waders-score = min(Candidate G-score, jagtbarhed)`

Varianten er implementeret under det stabile ID `G-50-50-NO-DIRECT-WIND-WADERS-LIMIT`. Den ændrer ingen strandscore og sikrer, at waders med jagtbarhed under 35 ikke samtidig kan få middel eller god samlet score. Den nye vindkurve kan løfte en waders-score svagt under rolige forhold i forhold til den tidligere forskningskurve, men slutscoren kan aldrig overstige jagtbarheden.

Genafspilningen af 730 waders-evalueringer gav et gennemsnit på 27,351 mod 35,465 i den tidligere Candidate G-reference. Sammenlignet med samme direkte loft på den tidligere vindkurve var forskellen kun +0,449 point i gennemsnit. Alle 730 strandresultater var identiske, og ingen waders-score oversteg jagtbarheden. Dette er regelvirkning i udvalgte vejrhændelser, ikke empirisk kalibrering.

Varianten er godkendt som næste score-neutrale analysecentrum, ikke til offentlig produktion. Offentlig aktivering kræver fortsat samlet model-, forklarings-, vægt- og ejer-go/no-go.

## Vægte

Den aktive offentlige vægtning forbliver 25/40/35. Candidate G's 20/45/35 forbliver et analysecentrum.

De endelige vægte kan ikke afgøres før komponenternes indhold og den jagtformsafhængige kobling er fastlagt. Derefter kan en fagligt begrundet produktionsprior vælges. Endelig empirisk kalibrering kræver senere repræsentative komplette ture med både fund og reelle nul-fund.

## Bevarede kontrakter

- Offentlig RavScore, UI, forklaring og scorebånd er uændrede.
- DMI-first, fallback, central admin, geometri og land-/vandpunkter er uændrede.
- Private cachefiler, rå vejrdata, U/V og koordinater må ikke skrives til Git.
- Candidate G og alle koblingsvarianter er diagnostic-only og kan ikke aktivere sig selv.
- Den tidligere `G-50-50-NO-DIRECT-WIND` bevares uændret som sammenligningsreference.

## Evidens

- `docs/research/RAVSCORE_MODE_SPECIFIC_HUNTABILITY_ANALYSIS_2026-08-22.md`
- `js/core/ravscore-mode-huntability-research.js`
- `js/core/phase-d-process-candidate.js`
- `js/core/ravscore-candidate-g.js`
- `scripts/analyze-ravscore-candidate-g.mjs`
- `scripts/audit-ravscore-mode-huntability.mjs`
- `scripts/audit-ravscore-candidate-g-scenarios.mjs`
- `scripts/validate-national-shadow-score.mjs`
- `js/core/score-candidates.js`

Produktionsbeviset fra PR #66 fandt én dokumentations-/testkonflikt: den fulde nationale shadowkontrakt forventede stadig den erstattede gate `candidate-waders-product-decision`, mens koden korrekt bar `candidate-waders-rule-order-public-product-review`. Produktion `32575055644` stoppede før release og deploy. 4.0.255 opdaterer kontrakttesten og fører den ind i `validate:source`; selve beslutningen og scoreberegningen ændres ikke.
