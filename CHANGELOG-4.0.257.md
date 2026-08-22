# RavRadar 4.0.257

## Candidate G-coverage

- Den nationale private Candidate G-shadow skelner nu komplet dynamisk scoreinput fra en bevidst udeladt statisk stedmodel.
- `scoreInputCoverageReady` kræver komplette native dynamiske scoreinput til alle aktive kystdele.
- Statiske lokale rev-, lavtvands- og ålegræsfelter rapporteres fortsat diagnostisk, men har nul scorepåvirkning og kræves ikke for Candidate G-coverage.
- Parentzonens morfologi accepteres fortsat ikke som lokal kystdelsevidens.
- Den tidligere kombinerede gate er erstattet af `candidate-national-score-input-coverage`.

## Frisk evidens

- PR #69/exact-head `32577977245`, merge `d629177a` og fuld produktion `32578049137` verificerede 4.0.256-vægt-/forklaringsgrundlaget.
- Central shadow `32578554928` kontrollerede 210 zoner og 673 aktive dele. 243 kunne scores; 430 mangler komplet lokal DKSS-familie. Coverage er derfor fortsat no-go.

## Uændret

- Offentlig RavScore er fortsat 25/40/35; Candidate G aktiveres ikke.
- Candidate G's 20/45/35-analysecentrum, waders-loft, vindkurve, fysiske beregning og forklaringskontrakt er uændrede.
- DMI/fallback, central admin, offentlig UI, geometri og land-/vandpunkter er uændrede.
- Private rådata, U/V, koordinater, artifact og protected-dirty-data er ikke skrevet til Git eller ændret.

## Validering

- Nationale shadow-selftests, shadowkontrakttest, fase-D-test, Candidate G-test, fuld lokal `scripts/validate-source.ps1` og releasegate er grønne.
- Exact-head PR, produktion og ny central shadow på 4.0.257 afventer dette checkpoint.
