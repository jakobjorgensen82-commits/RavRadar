# RavRadar 4.0.255

## Kildegaten dækker den nationale waders-kontrakt

- Den nationale shadow-kontrakttest forventer nu den aktuelle åbne gate `candidate-waders-rule-order-public-product-review` i stedet for den erstattede `candidate-waders-product-decision`.
- Den samme kontrakttest er flyttet ind i `validate:source`, så en fremtidig forskel mellem national shadowkode og gate-navne stoppes før merge og dyr frisk-data-produktion.
- Selve waders-kandidaten, vindkurven, replayresultaterne og de beregnede scorer er uændrede fra 4.0.254.

## Uændret

- Den offentlige RavScore er fortsat 25/40/35; Candidate G og waders-loftet er diagnostic-only.
- Ingen geometri, land-/vandpunkter, vejrinput, private caches eller beskyttede data er ændret.
- PR #66's produktionskørsel `32575055644` stoppede korrekt før release, Supabase og Pages på den forældede testmarkør. 4.0.255 kræver ny exact-head-kildegate og fuld post-data-validering.

## Verifikation

- Den målrettede nationale kontrakttest og shadow-selftesten er grønne lokalt.
- Fuld lokal `scripts/validate-source.ps1` og releasegate er grønne. Exact-head PR-gate og central produktionsverifikation dokumenteres før afslutning.
