# 4.0.458 – fjern stale predecessor-sti fra code-only workflow

## Hvad der blev rettet

- Code-only-run `35732235540` fandt den korrekte aktuelle protected-runtime
  descriptor, men genbindingssteppet brugte stadig en historisk, hardkodet
  arbejdssti (`source-fa418f43`). Det fik workflowet til at behandle den
  forkerte forgænger som den aktuelle og stoppede korrekt fail-closed.
- `RAVRADAR_PREDECESSOR_SOURCE_ROOT` er nu en neutral sti. Den konkrete source-
  SHA bestemmer fortsat indholdet dynamisk via descriptoren og `git archive`.
- Ingen runtime-, måle-, score-, cache- eller datakontrakt er ændret.

## Driftsstatus

Næste skridt er en ny exact-head/code-only-kørsel. Den skal bevise migration,
genbinding, privat runtime, artifact og Pages. Først derefter genoptages normal
vejrdrift fra gemt fremgang.
