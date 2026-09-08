# RavRadar 4.0.337 – tabsfri vejrcache og kontrolleret direkte modelcutover

Dato: 2026-09-09

## Ændret

- DMI Pythonbinding, native library og definitions er fastlåst til den gennemgåede runtime.
- Kompatible currentproofs fra 2.48.0/2.48.2 kan genbruges uden relabel; rå GRIB-/processed-step-reuse kræver fortsat eksakt signatur.
- Ét ugyldigt retained proof fjerner kun den konkrete proof-enhed.
- Current, bølger, vind, vandstand og temperatur donorbackfilles alene som komplette atomisk validerede tuples.
- DMI-bulkdokumentet bruger en fælles tabsfri tre-tabellers codec i Python og Node. Unknown, Unicode, nested og proto-navne bevares, input muteres ikke, og validering sker før ekspansion.
- Oneoff-wrapperens afsluttende progresskontrol læser også gennem codec'en; den kan derfor fortsætte på den kompakte cache i stedet for fejlagtigt at afvise den efter en vellykket producentpassering.
- Private preflight- og size-dryrun-beviser bindes til den faktiske DMI-kandidat.
- Første integrerede cutover kan bruge den fastlåste offentlige legacy Candidate G direkte og viser ufuldstændig historik ærligt.
- Legacy first cutover kræver et konkret succesfuldt komplet oneoff-run og den eksakte forseglede cache.

## Ejerens snævre launchundtagelse

Kun 4.0.337-first-cutover må fortsætte, når det målte private archive højst er 50.000.000 bytes, to retained generationer holder lagerbudgettet, checkpointet holder sit loft, og alle integrity-, privacy- og readbackgates består. Den generelle egressfremskrivning ændres ikke, og undtagelsen tillader ikke tilbagevendende automatisk kadence.

## Åbent før normal højfrekvent drift

Cachetransporten bygges parallelt uden nulstilling, køres i shadow, sammenlignes logisk og kryptografisk, skifter pegepind atomisk og bevarer rollback. Normal højfrekvent cron/watchdog må først aktiveres efter positivt drift- og budgetbevis.

## Status

Lokal målmatrix er grøn. Exact production-sized codec/recovery, GitHub exact-head sourcegate, merge, komplet main-oneoff, fulde produktionsgates og offentlig integreret modelcutover mangler.
