# RavRadar 4.0.9

## DMI-first prognose og diagnostik
- Retter cachefletningen, så både `dmiForecast` og cachefeltet `forecast` anvendes. Gyldige DMI-komponenter vinder fortsat time for time.
- Retter Runtime Diagnostics `componentCoverage` og kræver alle nødvendige felter for vind og strøm.
- Ophæver automatisk en gammel `parser-blocked`-tilstand, når GRIB-parserens version er ændret.
- Genopbygger collectionens `recognizedParameters` fra allerede komplette cachetrin.

## EDR-reparation
- Gemmer delvise brugbare DMI-marine resultater.
- Flytter zonecursoren ved terminalt no-progress uden HTTP 429 og sætter zonen på 12 timers reparationspause.
- Bevarer genforsøg ved egentlige netværksfejl og rate limiting.

## Vandstand og fjorde
- Tillader eksplicit interpolation mellem to stationer på hver sin side af samme fjord.
- Mariager Fjord-mundingen tillader Hals og Als Odde/Helberskov som grundlag for Øster Hurup og beslægtede zoner.
- Den generelle kystkorridorlogik forhindrer fortsat interpolation på tværs af bælter, øer og adskilte farvande.

## Health
- Opdeler samlet status i service-, brugerprognose-, DMI-dæknings- og API-forbindelsesstatus.
- Tilføjer særskilte tidspunkter for API-succes, observationssucces og reel dækningsforbedring.
