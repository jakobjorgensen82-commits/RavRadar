# RavRadar 4.0.359 – kontrolorakler efter komplet cutoverrapport

**Dato:** 2026-09-14
**Status:** Lokal kandidat; exact-head-CI, merge, cachebaseret SHA-handoff, cutover og offentlig verifikation mangler.

## Observeret bevis

- PR #295 blev merged som main `2a1c73d2` efter grøn exact-head-sourcegate `34777480545`.
- Cachefortsættelse `34781396538` hentede intet providervejr og forseglede 79.414/79.414 currentpar: DMI 67.686, Copernicus 8.668, regional 944, Open-Meteo 2.116, missing 0.
- Cutover `34781869394` gennemførte alle 272 deklarerede bladkommandoer og alle fem hovedkontroller. Runtime/modelaudit, referencezoner, releasegate og datavalidering var grønne. Fuld validering samlede seks røde resultater. Ingen eksterne writes eller deploy blev udført.

## Samlet rettelse

1. De to gamle DMI-workflowtests følger nu den gældende first-cutover 6/normal 3 collections-kontrakt frem for historisk 2.
2. Den progressive public-fixture bruger availability schema 2, obligatorisk `evaluatedAt` og forventer én deterministisk eksisterende part uden currentdata.
3. Collectorjobbet sætter `DMI_BULK_CACHE_PATH=.cache/dmi-candidate-progress.json`, ligesom normal fuld validering. Den rumlige audit sammenligner derfor den friskbyggede runtime mod den rigtige cache og ikke den bevarede legacyfallback.
4. No-provenance-fixturen forventer kun native tretimersprøver. Den kræver ikke længere syntetiske mellemtimer uden kildebevis.
5. Local-part-isolationstesten accepterer de tre legitime produktkald: Feggesund-readiness, weather-feature og scorezone. Den semantiske 673/673-kontrol består uændret.
6. Workflowrækkefølge og releasegate kræver den nye collector-cachebinding, så rettelsen ikke kan falde ud senere.

## Sikkerhedsafgrænsning

De seks resultater klassificeres ikke generelt som ufarlige. Deres konkrete forkerte orakler eller kontekst er rettet. DEC-0140's krav om alle 272 underkontroller, alle fem bindende hovedgates og samlet stop før writes består. En ukendt eller materiel fejl i score, vejrdata, deploy, hjemmeside, privacy eller sikkerhed stopper stadig cutoveren.

## Første exact-head-resultat

PR #296/head `b0f43474` bestod releasegaten og de første 30 unikke sourcekommandoer i run `34786784374`. Derefter fandt håndbogskontrollen, at sidste webhåndbogsændring ikke var synkroniseret til Supabase-installationskopien. Det eksisterende syncværktøj har opdateret kopien, og den direkte test er grøn. Alle 90 efterfølgende sourcekommandoer er kørt samlet lokalt. De eneste første røde udfald skyldtes, at Windows-shellens `python`-alias manglede; de 26 berørte Python- og Node→Python-led er derefter 26/26 grønne med projektets bundne runtime. Ingen yderligere kodefejl blev fundet.

## Uændret

- Ingen ændring af scoreformel, scoreinput, modelstate eller offentlig forklaring.
- Ingen ændring af vejrværdier, sourceorder, providerbudgetter eller DMI-rotationen selv.
- Ingen ændring af geometri, land-/vandpunkter, migrationer, database eller privacy.
- Ingen oneoff og ingen almindelig weather før modellen er online.

## Næste bevis

Én exact-head GitHub-sourcegate køres på 4.0.359. Efter byteidentisk merge genskabes alene det commitbundne handoff fra de eksisterende cacher, og cutover køres igen. Ved grønt gennemløb verificeres offentlig 210/673/118, siden gennemgås, og først derefter genaktiveres normal weather for at bevise cachevedligeholdelse, fuld DMI-rotation, fallback og tidsoverskud.
