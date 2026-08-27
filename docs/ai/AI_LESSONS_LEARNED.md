# AI Lessons Learned – RavRadar

Dette dokument samler tværgående læring, som skal påvirke fremtidige tekniske beslutninger. Historiske detaljer findes i RDKS/chatarkivet; her står de generelle arbejdsregler.

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
