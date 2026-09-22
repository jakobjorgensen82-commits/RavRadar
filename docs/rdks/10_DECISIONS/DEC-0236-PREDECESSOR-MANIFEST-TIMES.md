# DEC-0236 – predecessor-identiteten skal indeholde manifesttider

**Dato:** 2026-09-22  
**Status:** Gældende fra 4.0.459

Code-only-run `35734072736` bekræftede den rigtige predecessor-source og
bundle, men `validatePredecessorManifest` afviste manifestet, fordi den faste
identitet ikke havde `productionReferenceAt` og `generatedAt`. Begge felter er
del af manifestets kontrakt og skal derfor være en del af den forseglede
identitet: henholdsvis `2026-09-21T16:00:00.000Z` og
`2026-09-21T17:06:45.191Z`.

Det er fortsat nødvendigt at sammenligne dem eksakt. De kommer nu fra det
allerede verificerede offentlige datasæt, ikke fra en ny runtimeberegning.
