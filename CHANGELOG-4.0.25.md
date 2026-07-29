# RavRadar 4.0.25 – konsolideret plan, audit og driftsgennemsigtighed

Denne version bygger direkte på den aktive 4.0.23-base og samler de sikre forbedringer fra 4.0.24 med yderligere kontrolpunkter fra RavRadar-planen.

- Admin viser marine DMI-dækning som frisk modelrunde, bevaret gyldig DMI-cache og fallback/manglende dækning.
- Admin viser cacheaudit, konkrete årsager for manglende marine zoner og den samlede implementeringsaudit.
- Den samlede audit kontrollerer dubletter, ikke-monotone tider, faktisk prognosehorisont, manglende komponenter og timevise kildeskift.
- Auditrapporten gemmer detaljer om de første 1000 kildeskift, så zonespecifikke skift kan undersøges.
- Als Odde og Helberskov har en eksplicit regressionskontrol for placering nord for Mariager Fjord.
- Auditten kontrollerer onshore-retning mod zonegeometri og registrerer brugen af flere retningsankre.
- GitHub-workflowet genererer auditrapporten efter hver vejrproduktion uden at blokere deployment på diagnostiske advarsler.
- DMI forbliver autoritativ. Store naturlige tidevandsspring ændres ikke automatisk, og fallback må fortsat ikke skifte vilkårligt time for time.
- Den marine routing fra 4.0.23 bevares: modeloverlap, op til 16 havpunktskandidater, afstandsgrænser og sammenhængende modelvalg for U/V/vandstand.
