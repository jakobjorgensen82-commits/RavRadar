# RavRadar 4.0.22

## Tidevandsform og vandstandsdiagnostik

- Store sekventielle DMI-vandstandsspring accepteres fortsat uændret, når de danner sammenhængende stigende og faldende tidevandsgrene.
- Vandstandsserien analyseres nu efter den semidiurnale grundform: omtrent to højvander og to lavvander, svarende til cirka fire meningsfulde vendepunkter pr. døgn.
- Der er indbygget tolerance op til seks tydelige vendepunkter i et rullende 24-timers vindue, så meteorologisk påvirkning og randvinduer ikke giver unødige alarmer.
- Gentagne markante timevise retningsskift som `+-+-+-` registreres som `rapid-hourly-water-level-zigzag`.
- Små bevægelser under 5 cm omkring høj- og lavvande ignoreres som plateau-/slack-water-støj.
- Mistænkelige mønstre diagnosticeres, men autoritative DMI-værdier omskrives ikke automatisk.
- Diagnostikken indeholder nu forventet tidevandsfrekvens, vendepunkter, mistænkelige 24-timers vinduer og konkrete alternerende forløb.

## Regressionstest

- Test af store sammenhængende tidevandsspring.
- Test af to højvander og to lavvander pr. døgn.
- Test af markant timevis `+-+-+-`-zigzag.
- Test af at små udsving omkring vendepunkter ignoreres.
