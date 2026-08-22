# RavRadar 4.0.256

## Candidate G-vægt og forklaring

- Den ejer-godkendte score-neutrale waders-variant er genafspillet med hovedvægtene `15/50/35`, `20/45/35` og `25/40/35` på de samme 1.460 private evalueringer.
- Yderpunkterne adskiller sig 4,947 point i gennemsnit og skifter referencebånd i 282 evalueringer. `20/45/35` bevares som Candidate G's gennemsigtige analysecentrum; det er ikke fundkalibrering.
- Alle tre vægtpriorer består de kanoniske retnings-, kapacitets-, symmetri- og waders-kontrakter.
- Candidate G-resultatet indeholder nu en diagnostic-only forklaringskontrakt med eksakte komponenter, vægte og bidrag, pil nu, historik før nu, fysisk gate og synligt waders-loft.
- Forklaringskontrakten rekonstruerer 1.460/1.460 replayevalueringer uden afvigelser.

## Uændret

- Den offentlige RavScore er fortsat `25/40/35`; Candidate G aktiveres ikke.
- Strand har fortsat intet jagtbarhedsloft. Waders-scoren kan ikke overstige jagtbarheden og bruger den ejerbesluttede vindkurve med fuld vindscore til og med 6 m/s.
- Der indføres ingen bund-, dybde-, rende-, adgangs- eller særskilt sikkerhedsmodel.
- DMI/fallback, central admin, offentlig UI, geometri og land-/vandpunkter er uændrede.
- Private cachepayloads, artifact og protected-dirty-data er ikke skrevet til Git eller ændret.

## Validering

- Målrettede Candidate G-tests, RDKS, fuld lokal `scripts/validate-source.ps1` og releasegate er grønne for 4.0.256.

## Åbne gates

- Ny exact-head PR-kildegate og fuld relevant produktionskontrol på den præcise mergecommit.
- Frisk centralt hydreret Candidate G-shadow til måling af aktuel national scoreinputcoverage.
- Dokumenteret lokal retention-evidens og ejerens samlede go/no-go før enhver offentlig score- eller UI-aktivering.
