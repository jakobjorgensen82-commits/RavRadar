# 4.0.459 – kompletér predecessor-identiteten med manifesttider

## Hvad der blev rettet

Code-only-run `35734072736` brugte nu den korrekte predecessor-source, men
manifestkontrollen stoppede, fordi den faste identitet manglede
`productionReferenceAt` og `generatedAt`. De verificerede tider fra det
offentlige datasæt `rr-20260921170645-210` er nu med i den samme identitet.

## Afgrænsning

Rettelsen ændrer ikke data, runtime, scorematematik eller cache. Den gør kun
den allerede eksisterende fail-closed sammenligning komplet.
