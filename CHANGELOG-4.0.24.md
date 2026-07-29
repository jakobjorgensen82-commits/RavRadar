# RavRadar 4.0.24 – samlet planopfølgning

Denne version bygger videre på 4.0.23 og samler de resterende implementerbare dele af den aftalte plan:

- Admin viser marine DMI-zoner opdelt i frisk modelrunde, bevaret gyldig DMI-cache og fallback/manglende dækning.
- Admin læser og viser DMI-cacheaudit med størrelse før/efter oprydning samt beholdte/slettede filer.
- Admin viser per-zone årsager til manglende marine dækning, prøvede collections og nærmeste gyldige gridafstand, når diagnostikken indeholder oplysningerne.
- Ny samlet implementeringsaudit kontrollerer zonegeometri, onshore-retninger, dublerede forecasttider, timevise kildeskift og administratorens stationsoverrides.
- 4.0.23-funktionerne for dynamisk marine collection-routing, op til 16 havpunktskandidater, afstandsgrænser og to collections pr. kørsel er bevaret.
- 4.0.22-funktionerne for naturlige tidevandsspring og registrering af unaturlig timevis zigzag er bevaret.

Auditten ændrer ikke autoritative DMI-værdier. Den dokumenterer problemer, så næste diagnostiske kørsel kan bruges til målrettede rettelser.
