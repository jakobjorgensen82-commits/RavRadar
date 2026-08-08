# RavRadar 4.0.120

## Komplet vindhale og sikker vandstandsrouting
- Produktionsmålingen efter #1831 viste 208/208 zoner med vind, men fem zoner stoppede efter HARMONIE, og den længste offentlige vindserie stoppede omkring 110 timer.
- Vandstandsroutingen erstattede den blandede offentlige serie med den rene DMI-cache og slettede dermed komponentvis fallback.
- Vandstand routes nu separat i den offentlige serie og DMI-cachen. Øvrige offentlige komponenter bevares.
- Open-Meteo forespørges nu om 120 fremtidige timer i stedet for fem kalenderdage fra midnat.

## Afgrænsning og bevis
- De fem zoner uden et fælles gyldigt DKSS U/V-gitterpunkt forbliver korrekt `missing` for direkte DMI-havdata; ingen værdier konstrueres.
- Regressionstests beskytter fallbackbevarelse, ren DMI-cache og den fremadrettede 120-timers forespørgsel.
- RavScore er uændret. Frisk produktion skal stadig bevise 118–119 timers offentlig vinddækning, fulde gates og deploy.
