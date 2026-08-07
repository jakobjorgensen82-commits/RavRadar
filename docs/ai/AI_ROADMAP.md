# AI Roadmap – RavRadar efter 4.0.117

Roadmappet prioriterer stabilitet og verificerbarhed før nye features. Status skal løbende flyttes til RDKS, når noget implementeres.

## P0 – etabler en ægte Codex-baseline
- **Første opgave:** luk workflowets gate-bypass. En almindelig automatisk `workflow_dispatch` må ikke kunne deploye et nyt produktionsartifact efter frisk dataopbygning, hvis `npm run validate` og `npm run release:gate` ikke faktisk har kørt og bestået.
- Auditér de seneste to dages røde push-runs og grønne auto-runs som historik. Grøn topstatus på runs med `skipped` fulde gates er ikke releasebevis.
- Kør derefter én frisk streng produktionskørsel på aktuel `main` + seneste centrale admin-geometri. Først denne kan blive ny stabil baseline.
- Hvis den strenge kørsel fejler, ret rodårsagen systemisk uden stale data, nulkonvertering, hardcodede zoner eller svækkede audits.
- Undersøg derefter femdøgns-horisontens yderste `missing` for strøm/vandstand og de kendte 0/missing vind-/bølgeproblemer.
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
