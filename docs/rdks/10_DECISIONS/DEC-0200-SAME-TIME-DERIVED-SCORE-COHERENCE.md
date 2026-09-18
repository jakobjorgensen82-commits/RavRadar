# DEC-0200 – Same-time-reparation skal genberegne hele den afledte scorekæde

**Status:** Aktiv; implementeret og måltestet lokalt i 4.0.417, livebevis afventer
**Dato:** 2026-09-18

## Evidens

4.0.416 bestod exact-head `35351272955`, PR #360 og main `496ba278`.
Providerfri code-only `35351928923` reparerede alle 673 continuations uden at
ændre målinger. Audittens state-replay havde nul fejl, men 156 aktuelle modes
matchede ikke en ny beregning fra den reparerede state. Kørselen stoppede før
beskyttet publicering og Pages.

## Beslutning

- Når en continuation faktisk repareres, genberegnes begge aktuelle modes fra
  den reparerede state og det uændrede aktuelle vejr.
- De offentlige aktuelle waders-/strandresultater genberegnes fra de nye modes.
- Den aktuelle timerække for den berørte zone genbygges fra alle zonens dele,
  så score, interval og vinder igen hænger sammen.
- Tilgængelighed, historikkvalitet, kalibreringsstatus, scoresemantik,
  historikdækning og reason codes må ikke skifte. Et skift stopper.
- Den eksisterende blad-for-blad-allowlist er fortsat den endelige grænse:
  kun modelbinding, den kendte last-mile-reparation og dens afledte aktuelle
  scorefelter må ændres. Vejr, målinger og Candidate G kan ikke passere.
- Code-only får en intern same-time-reparationstilstand. Den tillader reelle
  scoreændringer, men kræver uændret datasæt/tid, offentligt vejr, 673 deles
  aktuelle vejr, geometri, flowpunkter og scoretidsakser.

## Afgrænsning

RavScore-formel, vægte, modelbundle, providere, cacheindhold, geometri og
land-/vandpunkter ændres ikke. Der køres ingen oneoff eller almindelig weather
før 4.0.417 er offentlig og browserverificeret. Derefter etableres en sikker
current-main-indgang til normal weather, og almindelig cachevedligeholdelse
bevises før scheduler genaktiveres.
