# RavRadar 4.0.29 – topologisk stationsrouting og supportpakke

- DMI-stationsregisteret er nu persistent: tidligere fundne stationer bevares og får status i stedet for at blive slettet, hvis DMI ikke returnerer dem i en enkelt kørsel.
- Admin og beregningsmotor bruger topologisk stationvalg: normalt én station på hver side af zonen langs den lokale kystlinje.
- Øster Hurup/Als-regressionen kræver Hals/Hals II/Hals 2 sammen med Als Odde og må ikke erstatte Hals med Udbyhøj.
- Ny auditfil: `data/live/water-station-routing-audit.json` med valg, kandidater, afstande langs/tværs af kysten og forklaring på manglende bracket.
- Admin viser samme automatiske valg som backend og advarer ved ensidig/ufuldstændig routing.
- GitHub Actions bygger automatisk ét downloadbart RavRadar-supportartifact med projekt, runtimefiler, diagnostik og run-metadata.
