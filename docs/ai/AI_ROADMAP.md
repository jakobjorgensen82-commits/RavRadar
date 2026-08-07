# AI Roadmap – RavRadar efter 4.0.117

Roadmappet prioriterer stabilitet og verificerbarhed før nye features. Status skal løbende flyttes til RDKS, når noget implementeres.

## P0 – ægte Codex-baseline etableret i #1772
- **Første opgave – implementeret lokalt:** workflowets gate-bypass er lukket. En positiv preflight kræver nu `npm run validate` og `npm run release:gate` før artifact; negativ preflight kan fortsat stoppe billigt.
- Auditér de seneste to dages røde push-runs og grønne auto-runs som historik. Grøn topstatus på runs med `skipped` fulde gates er ikke releasebevis.
- **Gennemført:** #1772 på `292b4024…` brugte central admin-geometri og gennemførte frisk data, begge fulde gates, artifact og Pages-deploy med `success`.
- Hvis den strenge kørsel fejler, ret rodårsagen systemisk uden stale data, nulkonvertering, hardcodede zoner eller svækkede audits.
- Femdøgnsdiagnosen fra #1774 er gennemført: public runtime manglede vind i 187/208 zoner og bølger i 33/208, mens 203/208 havde mindst 96 timers marinegrundlag. Balanceret recovery er produktionsbekræftet i #1778/#1779; vind steg til 199/208 zoner med mindst noget data. Næste målepunkt er progressiv 96-timers HARMONIE-dækning efter filtrering af udløbne modeltrin.
- Fortsæt måling af workflowtid/schedulerbudget og DMI-coverage uden at svække marine audits.

## P1 – vandstandskilder
- Gør forecast/cache-brugbarhed uafhængig af midlertidigt observationsstop.
- Vis observationsstatus, forecaststatus, cache gyldig til og samlet brugbarhed separat.
- Bevar opdagede kilder i registry; vis status frem for at lade dem forsvinde.
- Admin skal vise auto primær/sekundær, reel geodistance, vægte og metode samt tydelig override.
- Auditér Hals/prognosepunkter og end-to-end routing i RavScore, rangliste og femdøgnsvisninger.
- Etabler alarmtærskel for aktive observationskilder, der stopper før forecastcache udløber.

## P1 – Supabase/admin drift
- Reparer **Kontroller nu** under Supabase-lagringskontrollen.
- Test ekspertens håndbogsreview direkte mod Supabase: write, readback, reload og ejerens visning.
- Gør reviewkøen i stand til at slette/arkivere automatiske systemtestposter med auditspor.
- Bevar central autoritet for zonegeometri, regler og routing og udvid propagationstests frem for hardcoding.

## P2 – håndbog og ekspertarbejde
- Gennemarbejd hele håndbogen sprogligt og pædagogisk i almindeligt dansk.
- Omskriv ekspertens valideringsmatrix, så hvert punkt forklarer betydning, nuværende RavRadar-adfærd, usikkerhed, konkret ekspertspørgsmål og mulig effekt på regel/score.

## P2 – historisk state og faglig validering
- Bevar skyggetilstanden score-neutral, indtil faktiske produktionsdata og ekspertvalidering viser, at den er robust.
- Når et numerisk transportbidrag senere introduceres, gør det gradvist, versioneret, forklarligt og med regressionssammenligning.
- Bevar eksisterende pålidelige morfologidata; kræv ikke manuel landsdækkende morfologikortlægning.

## P2 – performance
- Bevar/udbyg startupmålinger for page load, JS-init, manifest/data fetch, parsing, scoreberegning og maprendering.
- Hold tunge state-/historikberegninger i pipeline og send kompakte præberegnede data til public klient.

## Ikke-roadmap / forbudte genveje
Roadmappet må aldrig opfyldes ved at genindføre stale data, regionale strømbånd, falske nulværdier, hardcodede administratorzoner eller ved at gøre audits svagere.
