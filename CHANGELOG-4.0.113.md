# RavRadar 4.0.113

## Progressiv DMI GRIB-cache
- GitHub-workflowet bruger nu særskilt restore og save for den rå DMI GRIB-cache.
- Hver gennemført kørsel gemmer sin cachefremdrift under en unik nøgle, mens næste kørsel gendanner den seneste kompatible cache.
- Det retter rodårsagen fra fem produktionskørsler den 6. august 2026, hvor den samme ugentlige primærnøgle blev gendannet hver gang og GitHub derefter skrev, at cachen ikke blev gemt efter et primary-key hit.
- Marine audits, collections, horisont og datakrav er uændrede. Ændringen må ikke skjule eller udfylde manglende marine data.

## Streng referencezonevalidering
- Referencezonerapporten bærer nu datasæt-id, datasættets generationstid, valideringsoversigt og et kompakt maskinlæsbart logudtræk.
- Efter frisk vejr, u/v-proveniens og public runtime kører workflowet en streng produktionskontrol.
- Kørslen fejler, hvis en referencezone mangler `shadow-v1`. Manglende verificeret strøm registreres som en tydelig advarsel og må aldrig udfyldes med en fallbackstrøm.
- Rapporten er fortsat ren diagnostik og ændrer ikke RavScore.

## Schedulerbeslutning
- Det eksterne 10-minutters kald ændres ikke i denne release. De fem målte job varede cirka 12–15 minutter, men målingen var påvirket af cachefejlen.
- Intervallet vurderes igen efter produktionsverifikation af den progressive cache. Friskhedstjek og concurrency bevarer én aktiv kørsel uden at annullere den.

## Releaseafgrænsning
- Ingen ændring af RavScore, morfologibidrag, strømfallback, offentlig datamodel eller vandstationsadmin.
- Det glidende transportbidrag er ikke aktiveret. Første krav er fortsat stabil skyggevalidering over flere produktionstimer.
