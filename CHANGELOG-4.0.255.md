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
- Fuld lokal `scripts/validate-source.ps1` og releasegate er grønne. PR #67's exact-head-gate `32575697204` bestod på `b011f915`, og PR'en blev merged som `af8f30cf`.
- Produktion `32575740539` bestod kildegate, frisk DMI/proveniens, fuld validering, releasegate, coverageaudit, support `RavRadar-support-3389`, Supabase, Pages-artifact og deploy.
- Live version 4.0.255/datasæt `rr-20260822133041-210` viser 210 zoner og 673 kystdele. Manifestet er komplet og `controlled-live`; begge offentlige datafiler matcher deres publicerede byteantal og SHA-256.
