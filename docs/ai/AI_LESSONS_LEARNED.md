# AI Lessons Learned – RavRadar

Dette dokument samler tværgående læring, som skal påvirke fremtidige tekniske beslutninger. Historiske detaljer findes i RDKS/chatarkivet; her står de generelle arbejdsregler.

## Aktuel 4.0.312-læring

4.0.311 bestod exact-head CI `33263734108` og blev merged som `7c168b00af535415117c968a8c021a493b083137`, men backend `33263892151` viste, at ekstern mutation og lokal postverifikation er to forskellige beviser. En HTTP 201 fra en atomisk SQL-transaktion efterfulgt af verifierfejl må behandles som mulig samlet commit, ikke automatisk som rollback eller som tilladelse til blind retry. I denne hændelse er CHECK/validering/kommentar med høj sandsynlighed committed samlet; det eneste atomiske alternativ er fuld rollback. PostgreSQLs `VALIDATE` kan have scannet rækker internt, men ingen observationspayload blev hentet til runneren eller logget, ingen rækkemutation skete, og downstream-D1/Edge/Worker/sync/weather/artifact/Pages blev ikke nået. Offentlig version er fortsat 4.0.310.

PostgreSQLs `pg_get_constraintdef` er semantisk deparsering, ikke en stabil bytekontrakt. 4.0.312 udtrækker derfor strukturelt præcis én JSONPath-literal, tolererer parentesering, kræver den eksakte kanoniske path og afviser reorder, duplicate, extra og ambiguous. Målrettede tests samt fuld lokal source/release/RDKS/håndbog/version og geodatakontrol er grønne, og exact-D1-interlocken omfatter 4.0.312; PR/exact-head, merge, backend, reconstruction og public-verifikation mangler. App-roll-forwarden ændrer ikke trip protocol/header 4.0.311.

- En modevælger er ikke rollback, hvis den kan skjule writes, der kun findes i det nye lager. Efter et D1 point-of-no-return skal recovery gå fremad og reconcile; rå Supabase-identiteter kan ikke genskabes sikkert fra HMAC-ejerskab.
- Sæt installationstype-intent efter capacity/CAS og umiddelbart før første Edge-deploy. Så kan partial existing-D1 Edge gå D1 roll-forward, mens partial genuine-fresh Edge sikkert kan genoprette Supabase-secret, eksakt Edge og dobbelt Supabase-attestation.
- Maintenance må ikke blive permanent ved runner-tab. Normal lease er 20 minutter, hard max er 30, Edge-prober er fem sekunder, og udløb genåbner D1. Kræv 600 sekunders restlease før den samlede højst syv minutter lange Worker-write-gate.
- Uden current-run intent ved capacity/pre-CAS-fejl må failure-kæden udføre nul recoverymutation. Historisk markør/legacyfund er ikke i sig selv autoritet.
- Privacy skal begrænse det, processen **læser**, ikke kun det, den senere skriver. Server-side bladselect er nødvendig, så private/ukendte kolonner aldrig kommer ind i migrationsrunnerens memory.
- “Kalibreringsegnet” er ikke empirisk evidens uden server-side binding til det signerede snapshot, brugeren faktisk så. Fail-closed udelukkelse kan bevares, mens global læring forbliver låst.
- Nøddrift er en atomisk målt tilstand, ikke interpolation. 210/673, model/state/hashes, 72 timer og kortere forecastudløb skal være én kontrakt.
- Når en ekstern transaktion kan være committed, skal næste trin være en read-only tilstandskontrol og en idempotent roll-forward fra ny exact-main-kode. Destruktiv cleanup, antaget rollback og genkørsel af samme kendt defekte verifier er forbudt.

## 1. En grøn lokal test kan være falsk tryghed
I 4.0.117-forløbet bestod lokale tests, mens friske GitHub/DMI-kørsler stadig fandt fejl. Eksterne data, central Supabase-konfiguration, schedulerbudget og produktionscache kan ikke altid reproduceres fuldt lokalt. Brug derfor lokal validering som nødvendig, men ikke tilstrækkelig evidens.

## 2. Find første sted sandheden bliver forkert
Når public data mangler, start ikke ved UI-testen. Spor værdien baglæns gennem public conditions, central weather cache, provenance, bulk/GRIB og autoritativ geometri. Spor samtidig fremad fra kilden for at se hvor den falder ud. Rodårsagen er det første led, hvor korrekt input bliver forkert eller tabes.

## 3. Vektorer har identitet – ikke kun to tal
U/V kan kun kombineres, hvis deres metadata beskriver samme fysiske observation/prognose. Samme gridpunkt er ikke nok, når DMI leverer flere vertikallag. Forecasttid, gridpunkt og lag skal være fælles, og cachekeys skal bevare denne identitet.

## 4. Admin-data kan være årsag – og skal respekteres
Tre Limfjordszoner viste, at forkert central geometri kan ligne en DMI/parserfejl. Administratoren rettede geometri, og den friske pipeline anvendte ændringerne. Derfor skal central konfiguration verificeres tidligt i fejlsøgning. Systemet må ikke "reparere" en korrekt adminændring tilbage til gamle fixtures.

## 5. Schedulerfejl ses ofte som datamangler senere
Når en tung DMI-family ikke bliver kørt, kan downstream kun rapportere manglende data. Schedulerens beslutningsgrundlag skal derfor logges og bruge aktive zoner og reelle datagab. Historisk cache må ikke definere den nuværende zonepopulation.

## 6. Tests skal beskytte kontrakter, ikke gamle implementeringsdetaljer
En gammel regressionstest kan være forkert efter en legitim arkitekturændring. Før en test ændres, skal det bevises, at dens gamle forventning ikke længere er selve kravet. Administratorredigerbare koordinater, zonetal og navne må ikke være faste releasekrav.

## 7. Missing er en tilstand
`missing`, `null` og fraværende provenance betyder ukendt. Det er ikke fysisk nul og må ikke få scoremæssig betydning som nulvind, nulstrøm eller nulbølge. Forecastkantens manglende timer skal forblive synlige, indtil datakæden kan levere dem korrekt.

## 8. Bevar en hurtig offentlig klient
Tidligere performanceproblemer viste, at gentagen parsing/normalisering og tung historik i browseren kan mangedoble startup-tiden. Cache normaliserede modeller, beregn historik/state i pipeline og hold public payload kompakt.

## 9. Dokumentation er en del af releaseintegriteten
En gammel handoff kan sende en ny AI tilbage til en forældet baseline. Current Truth, Implementation Status, Known Issues, handbook og AI-dokumenter skal derfor ændres sammen med koden. Validatoren skal kontrollere, at den persistente AI-hukommelse faktisk findes.

## 10. Bevar historien uden at gøre den aktiv
Chatarkiv og gamle changelogs er værdifulde til regressioner og begrundelser. De må ikke bruges som implicit krav. Nyere aktiv RDKS og verificeret kode/produktion vinder.

## 11. Et aktiveringsflag er sidste trin, ikke første
En versionsstyret Edge-kandidat er ikke det samme som den kode, der faktisk kører hos leverandøren. Før et offentligt klientflag aktiveres, skal den levende funktionskode, de nødvendige secret-navne, gratisplanen, CORS og fail-safe svar kontrolleres direkte. Ellers kan en grøn Pages-release sende brugere til en gammel eller ukonfigureret gateway.

## 11. Aktiv zonepopulation skal materialiseres i alle pipelineled
Run #1753-lignende fejlbillede viste, at en aktiv zone kan være korrekt opbygget i central weather-cache, men stadig mangle helt i `dmi-bulk-cache.json`, hvis bulk-builderen kun opretter poster ved et direkte DMI-hit. Det er strukturelt forkert. Den aktuelle admin-zone-/kilderegistrering skal materialiseres som tomme, eksplicitte records før data flettes ind. Manglende direkte DMI-data skal være `missing`/unverified – aldrig et manglende zoneobjekt, kunstigt nul eller stale data. Tidligere bulkposter uden for den aktuelle registrering må ikke genindføres ved merge.

## 12. Native modelhorisont er ikke produktets horisont
HARMONIEs cirka 60 timer bestemmer run-retention og validering af netop den kilde, men reducerer ikke RavRadars cirka 120-timers produktmål. Den korrekte løsning er en dokumenteret komponentkæde: DMI så langt som muligt, eventuel anden DMI-kilde og kun derefter en fagligt valgt fallbackhale. Kilder må ikke sammensys uden overgangs-, proveniens- og scoreanalyse.

## 13. Midlertidige workflows skal have en slutdato
Diagnostiske workflows bliver en driftsrisiko, når deres oprindelige forsøg er slut. En Pages-mikrotest med deployrettigheder kan overskrive samme miljø som produktionen, selv om filnavnet siger test. Aktivt workflowinventar skal derfor være bevidst, dokumenteret og kontrakttestet; GitHub-genererede workflowvisninger må ikke forveksles med repositoryets egne YAML-filer.

## Grøn workflowstatus kan skjule `skipped` releasegates
**Hændelse:** De strenge push-runs fejlede, mens efterfølgende automatiske vejrruns ofte blev grønne og deployede.
**Rodmekanisme:** `npm run validate` og `npm run release:gate` var betinget af `push || force`, men artifact/deploy kunne fortsætte i en almindelig `workflow_dispatch`.
**Læring:** Kontroller job-step-status og workflowbetingelser, ikke kun det grønne flueben på runniveau. Deployment og releasegodkendelse er forskellige beviser.
**Fremtidig regel:** Intet nyt produktionsartifact efter frisk opbygning må deployes med bindende gates `skipped`.
**Implementeret beskyttelse:** Begge gates følger nu positiv preflight uden trigger-undtagelser, ligger før artifactet og er dækket af en workflow-kontrakttest. Billigt skip findes kun ved negativ preflight, hvor intet artifact deployes.
## 16. Proveniens kan ikke tilføjes troværdigt efter cachemerge
Når native forecasttrin fra flere modelkørsler kan eksistere i en progressiv cache, kan en senere samlet `runs`-post ikke bevise, hvilket run der leverede en bestemt komponenttime. Identiteten skal gemmes sammen med værdien ved STAC/GRIB-indlæsningen. Interpolation kræver samme collection og model-run i begge ender; ellers er det korrekte resultat `missing`.
