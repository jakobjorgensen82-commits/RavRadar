# RavRadar 3.1.15 – kontrolleret DMI-opbygning

- GitHub Actions henter højst 5 live DMI-zoner pr. kørsel med et budget på 20 DMI-kald.
- Der er nu 5 sekunder mellem DMI-kald for at mindske risikoen for HTTP 429.
- Efter HTTP 429 stoppes yderligere DMI-arbejde lokalt i samme kørsel, og oceanObs springes over.
- DMI-stationer og observationer deles fortsat via én fælles Promise og hentes derfor højst én gang pr. datatype.
- Cursoren flyttes kun, når zonen faktisk har foretaget mindst ét DMI-HTTP-kald.
- Diagnostikken viser tildelte, faktisk forsøgte, succesfulde og rate-limit-stoppede zoner, HTTP 429, observationstatus samt et optimistisk estimat til fuld cache.
- Weather engine er opdateret til 2.11.0.
