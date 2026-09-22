# DEC-0234 – genbind den faktiske beskyttede predecessor-runtime

**Dato:** 2026-09-22  
**Status:** Gældende fra 4.0.457

## Problem

Efter den grønne database-readback stoppede code-only-run `35730421484` i
genbindingen af den gemte private runtime med `Protected predecessor bundle
identity is not exact`. Den gemte runtime var den offentligt verificerede
generation `rr-20260921170645-210` fra source `a6d89798`, men
`migrate-post-cutover-private-runtime.mjs` var stadig låst til den ældre
historiske forgænger fra 14. september. Stoppen var korrekt fail-closed, men
kilden var blevet forældet i forhold til den runtime, som den centrale pointer
faktisk leverede.

## Beslutning

Den beskyttede predecessor-identitet opdateres samlet til den aktuelle,
allerede forseglede runtime:

- source: `a6d89798c76a5218c5d699961474f4259835dfb9`
- dataset: `rr-20260921170645-210`
- 210 zoner og 673 kystdele
- integrated bundle `14f3f0c9…`
- Candidate G bundle `618b2b44…`
- de tre contract-hashes beregnet direkte fra den arkiverede source

Det er fortsat en fast identitetskontrol. Koden må ikke begynde at acceptere
vilkårlige forgængere eller gætte ud fra public data ved køretid. En senere
runtime kræver en ny samlet identitetsopdatering med samme bevis.

## Afgrænsning

Rettelsen ændrer ikke private målinger, continuation-state, scoreformel,
vejrdata eller modelprioritet. Den gør kun den allerede eksisterende,
beskyttede genbinding i stand til at genbruge den runtime, der faktisk er
gemt og beskrevet af den centrale pointer.
