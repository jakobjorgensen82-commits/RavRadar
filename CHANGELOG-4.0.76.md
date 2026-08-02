# RavRadar 4.0.76 – videnskabeligt sporbare strømpile

## Rettet
- Kunstige klynger af pile omkring hver zone er fjernet. De kunne placere strøm- og vindpile på land og gav indtryk af en rumlig opløsning, som datagrundlaget ikke havde.
- Strømpile placeres nu ved det faktiske DMI-gitterpunkt, hvor `current-u` og `current-v` blev udlæst. Ved Open-Meteo-fallback bruges zonens dokumenterede marine forespørgselspunkt.
- En DMI-strømpil vises ikke, hvis DMI-værdien mangler et dokumenteret marine gitterpunkt. Det er bedre at undlade en pil end at vise en videnskabeligt usporbar placering.
- Vindpile placeres ved det dokumenterede atmosfæriske gitterpunkt. Zoom- og lagknapper er uændrede.

## Retning og zoneværdier
- Rå østlig (`current-u`) og nordlig (`current-v`) strømkomponent bevares nu i den fulde diagnose- og prognosekæde.
- Retningen beregnes som oceanografisk mod-retning: 0° mod nord, 90° mod øst, via `atan2(u,v)`.
- Hastigheden kontrolleres mod `hypot(u,v)`.
- Kortpilen for strøm peger direkte i bevægelsesretningen. Kun vindpilen vendes 180°, fordi vindretning angives som den retning, vinden kommer fra.
- Den offentlige runtime indeholder de præcise visningspunkter, men rå u/v-komponenter forbliver i den fulde diagnosefil.

## Audit
- 197 af 209 aktive zoner har et direkte dokumenteret DMI-marinegitterpunkt med gyldige u/v-værdier i den medfølgende cache.
- 23.049 DMI-prognosetimer er kontrolleret for sammenhæng mellem rå u/v, hastighed, retning og vist pil.
- 12 zoner mangler aktuelt direkte DMI-gitterproveniens. Open-Meteo-zoner kan fortsat vises ved deres præcise marine forespørgselspunkt; DMI-pile uden dokumenteret punkt skjules.
- Auditrapport: `data/diagnostics/current-spatial-audit-4.0.76.json`.

## Releasebeskyttelse
- GitHub-pipelinen beriger data med gitterproveniens før den offentlige runtime bygges.
- Releasevalideringen fejler ved forskellige u/v-gitterpunkter, forkerte retninger, forkerte hastigheder, kunstige pileoffsets eller manglende brug af dokumenteret strømposition.
