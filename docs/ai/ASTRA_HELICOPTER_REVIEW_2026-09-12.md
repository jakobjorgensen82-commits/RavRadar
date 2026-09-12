# Astra/Ultra – helkædereview 2026-09-12

## Konklusion og arbejdsgrænse

Ejeren skiftede udtrykkeligt til Astra/Ultra for dette afgrænsede review og bad om besked, så snart arbejdet kunne fortsætte på Sol. Reviewet er afsluttet. Næste implementering og målrettede integrationstest udføres på **GPT-5.6 Sol / Indsats Ekstra høj**. Ingen merge, dispatch, annullering, cacheændring eller produktionsændring er foretaget under reviewet.

Main er 4.0.346 på `e912ef9a53d62c489402531fc318f4c3b3ccaf7f`, efter PR #280 og exact-head-sourcegate `34673860241`. Lokal branch er `codex/4.0.347-dmi-harmonie-runtime-continuation`; 4.0.347 er en ucommitted, ufuldstændig kandidat, **ikke releaseklar**. Den første HARMONIE-patch rammer den faktiske fejl, men reviewet har fundet yderligere nødvendige kanter. Tidligere udsagn om, at denne patch alene var tilstrækkelig, er erstattet.

## Frisk faktisk kørselevidens

Run `34675040245`, job `103503274163`, kører på ovenstående main. Loggen er hentet fra repositoryets faktiske remote `jakobjorgensen82-commits/RavRadar`; brug ikke et andet repositorynavn. Producentens sidste JSON-loglinje er selve diagnostikobjektet, ikke et dokument med en indlejret `diagnostics`-nøgle.

- Kun `DMI one-off pass 1/3` optræder. DMI-trinnet løb fra 05:17:40 til 06:05:41 UTC.
- Alle seks collections blev forsøgt: IDW, WAM DW, WAM NSB, LF, NSBS og HARMONIE.
- Verificeret DMI-current: **66.998/79.414**. Det er DMI alene før den igangværende fallbackkæde, ikke slutrest eller samlet closure.
- NSBS og HARMONIE har begge præcis `RUNTIME_BUDGET_REACHED`, beskeden `bulk runtime budget reached` og `partialProgressPreserved:true`.
- Ledgerkoder: `LOCALLY_SKIPPED_DKSS_ASSET` og `RETAINED_CURRENT_PART_TIME`. Ledger er ikke READY. Råcache efter pruning: 4.294.632.744 bytes, under 4 GiB.
- `parametersByCollection.harmonie_dini_sf=[]` betyder ingen genkendte parametre, **ikke ingen planlagte parametre**. Den tidligere nul-arbejdsforklaring er forkastet.
- GitHub bekræfter succes for GRIB-save, kandidatprogression-save og regional-save. READY-promotion blev sprunget over. WAM-handoff-inspektion var grøn.
- Ved seneste statuskontrol var Copernicus-trin 55 stadig aktivt. Det skal have lov at bevare sin fremgang; kontroller frisk run/job-status før enhver senere merge eller ny writer. DMI-fremgang er gemt, men der er endnu intet positivt samlet oneoff-/cutoverbevis.

## Konkrete fund og afgrænset løsningsdesign

### 1. Gemmetid er ikke terminalt afslutningsbevis

`scripts/update-dmi-bulk.py:10082` skriver den atomiske slutcache før blandt andet `write_ocean_diagnostics`. En efterfølgende OSError ender i generisk exit 2. Wrapperen accepterer i dag både dette og forventet ufuldstændig afslutning som samme exit 2. Isoleret reproduktion med den faktiske writerfunktion viste, at et nyt pass kunne starte efter denne reelle fejl.

Minimal løsning: en wrapper-aktiveret intern protokol, eksempelvis `DMI_BULK_ONEOFF_CONTINUATION_PROTOCOL=1`, med særskilt forventet-partial-exit, eksempelvis 75. Denne kode må kun returneres helt nederst efter hele producentens normale terminalbehandling. Generiske exceptions, tidlige exits og `FINALIZE_ONLY` beholder exit 2. Normal drift uden opt-in beholder sin hidtidige exitkontrakt. Wrapperen må kun klassificere næste pass efter 0 eller den særskilte kode; sidstnævnte normaliseres udadtil til 2 ved afslutning. Bevar same-target, ny cache og eksplicit afvisning af `diagnostics.progressCheckpoint`. En ny receipt-/nonce-/hashramme er ikke nødvendig til denne afgrænsede proceskontrakt.

### 2. Supervisorens watchdoghistorik må ikke forsvinde

`scripts/run-dmi-bulk-supervised.py:231` kan genstarte efter et watchdogstop. Producenten tilføjer først den gamle assetfejl til slutdiagnostikken, hvis det samme asset besøges igen. Et nyt katalog/modelRun kan derfor give en slutrapport uden det tidligere stop. Dette blev reproduceret med den faktiske supervisor og mocks.

Supervisoren må kun videresende den særskilte forventet-partial-kode, hvis **ingen** tidligere child i dette pass blev watchdogstoppet. Ellers returneres 2. Watchdog-finalisering må aldrig udstede fortsættelseskoden. Dette ændrer ikke supervisorens eksisterende bounded recovery, men forhindrer, at en efterfølgende oneoff-passage skjuler historikken.

### 3. Begge HARMONIE-tidsgrænser skal beskrives ærligt

Producenten kan stoppe før collectionstart (`update-dmi-bulk.py:11405`) eller inde i collectionforløbet. Kun det indre stop har eksplicit progressmarkør. Den nuværende patch genkender den aktuelle indre fejl, men vil stadig stoppe ved den næste ydre variant.

Efter positivt terminalbevis må en samtidig HARMONIE-note genkendes enten som indre runtime med `partialProgressPreserved is True` eller som den præcise ydre tre-feltsform før collectionstart. Manglende markør på en indre/allerede forsøgt collection må ikke blot accepteres. Kræv fortsat mindst ét faktisk DKSS-runtime-stop; HARMONIE alene giver ingen ny passage. WAM-/request-/parser-/katalog-/kontraktfejl forbliver afvisende.

### 4. Runtimekode er overbelastet med downloadbudget

`update-dmi-bulk.py:12360` bruger også `RUNTIME_BUDGET_REACHED` ved downloadbudget. Dermed accepterer den aktuelle kode downloadstoppet som strict-runtime, i strid med DEC-0128/0129's ordlyd. Både DKSS- og HARMONIE-varianten blev reproduceret.

Afgræns strict-runtime til koden **og** præcis `bulk runtime budget reached` eller `bulk runtime budget reached inside GRIB processing`. Bevar den særskilte READY/exit-0-downloadbudgetvej med dens tre eksisterende eksakte beskeder. Ingen bred ny producentfejlkodefamilie er nødvendig nu.

### 5. Historiske assettællere er ikke ny fremgang

`update-dmi-bulk.py:13427` kan genindsætte hele `previous_run` ved refresh-only/deferred arbejde, mens collection stadig står i `collectionsAttempted`. Wrapperens sum af `runs[*].assetsProcessed` kan derfor være fra et tidligere pass. Det kan åbne et unødvendigt pass, men giver ikke i sig selv READY eller deploy.

Brug en eksplicit tæller for **dette producentkalds** fuldførte, accepterede assetbehandlinger, nulstillet ved start og adskilt fra bevarede runmetadata. Wrapperen skal kræve den under den nye protokol uden fallback til historiske tællere. Bevar kravet om stigende verificeret currentparantal før pass 3.

### 6. Eksisterende udløbskant ved Pages-write

Den sidste hårde horisontkontrol ligger i build (`reusable-weather-build.yml:1718`). Det separate Pages-job kan derefter vente. Kontrollerne ved `reusable-pages-deploy.yml:376` kontrollerer main, men ikke targetets udløb; `ravscore-operational-activation.mjs:3029` kontrollerer heller ikke wall-clock ved begin-CAS.

Det er ikke årsagen til DMI-problemet, og en få-timers oneoff har stor margin. Men den eksisterende DEC-0119-kontrakt bør håndhæves ved write-grænsen: genkontroller horisonten før begin-CAS og umiddelbart før Pages, og bevar abort/reconciliation ved et stop efter begin. Tilføj clock-boundary-tests; indfør ikke en ny 90/150-minutters hård aldersgrænse.

## Hvad helheden allerede beskytter

- DMI bygger hele det centralt hydrerede register på 673 dele × 118 timer. Historiske positive par er ikke søgens nævner.
- Normal og oneoff bruger samme producent/supervisor, kandidatcache og vedvarende leadrotation. Kun faktisk lead flytter markøren; øvrige kritiske familier deler den resterende tidsreserve.
- Cachen genvalideres og bevares. Immutable negative outcomes kan springes over for uændrede officielle inputs; ændret asset/register eller bortfaldet positivt cachepar skal genåbne arbejdet. Tre pass giver betjeningsmuligheder, ikke et løfte om alle filer eller alle par.
- Cutover installerer oneoffens eksakte fem kildefiler og fastholder samme target. DMI/CP/OM-acquisition springes over; exact closure genbygges og sammenlignes. Der opstår ikke en ny moving-window hale, som cutoverrotationen skal indhente.
- 90/150/240 minutter er foretrukken friskhed med advarsel, ikke hårdt udløb. Horisonten løber gennem target+117 timer. Datasættet giver ikke 118 nye timer regnet fra deploy.
- Exact-content-kildeproof fjerner kun dobbelt kildegate. Oneoff forsegler kilder/preflight, ikke et produktionsartifact; fuld post-data `validate` og `release:gate` kræves i den efterfølgende cutover før artifact/deploy.
- En komplet oneoff beviser ikke løbende vedligeholdelseskapacitet. Normal kadence skal fortsat verificeres kontrolleret efter launch.

## Tests og næste trin

Grønne under review: wrapper 13/13, supervisor 11/11, scheduler-adfærd, DKSS primary-mode, 29 transactional-checkpoint-tests, target-freshness, verified-weather-source-handoff, weather-source-gate og operational-activation. Modbeviserne ovenfor er isolerede in-memory-prøver, ikke tilføjede regressionstests. Eksisterende grønne tests gør derfor ikke kandidaten releaseklar.

Før release skal de nye regressioner ind i suiten: post-cache-exception/generic2, finalisering og watchdoghistorik, begge runtimeformer og eksakte downloadbeskeder, pending-cache og historiske tællere. Kræv desuden den manglende seam: rigtig serialiseret producentcache → wrapper → pass 2/3, bevaret target hen over timegrænser, faktisk leadrotation, bevarede par, immutable skip og genåbning ved ændret asset/manglende tidligere positivt par. Test Pages-udløb før og efter begin med korrekt abort.

RDKS-validering før dokumentationsarbejdet fejlede forventeligt, fordi version allerede var løftet til 4.0.347, men MASTER_LOG endnu ikke fulgte med. Efter checkpointopdateringen er RDKS-validering og `git diff --check` grønne (kun LF/CRLF-advarsler). Dokumentationscheckpointet må ikke forveksles med færdig version: changelog, aktive krav, begge håndbøger/indlejret SQL, fulde statusindekser og relevante tests skal stadig færdiggøres efter implementering.

**Sidste liveopdatering før modelskift:** Copernicus er nu afsluttet, og donorbank, source-stage samt valideret Copernicus-cache er alle gemt med succes (trin 57, 58 og 61). Run `34675040245` er stadig aktivt, nu i Open-Meteo-trin 62. Det erstatter den tidligere Copernicus-status ovenfor; samlet slutclosure er stadig ukendt.

Fortsæt på Sol/Ekstra høj: implementér de afgrænsede rettelser og regressioner; kontrollér den aktive writers afslutning og bevarede cacher; færdiggør version/RDKS/håndbøger og geodata-only-version-diff; én exact-head-PR-sourcegate; sikker merge; ny oneoff på genvalideret fremgang; kræv current 79.414, native WAM 79.060 og Feggesund 354, handoff, fulde cutover-gates og offentlig modelverifikation. Ingen blind genstart eller lempet kilde-/grid-/afstandsregel.

## Efter-review-status på Sol/Ekstra høj

Run `34675040245` er afsluttet failure efter grøn gemning af DMI-, Copernicus-, regional- og Open-Meteo-progression. Open-Meteo løste 2.170/2.212 og efterlod 42 provider-negative par fordelt på 21 kystdele efter isolerede genforsøg; der var ingen runtime-, attempt- eller køgrænse. Slutgaten stoppede korrekt før handoff, artifact, cutover og modelændring.

De seks reviewfund er implementeret lokalt i 4.0.347: intern opt-in-kode 75 efter hele producentterminalen, generic2 uden cacheklassifikation, supervisorbundet watchdoghistorik, eksakte DKSS/HARMONIE inner/outer-runtimeformer adskilt fra download, nulstillet `assetsProcessedThisInvocation` og to target+117h-gates i Pages med eksisterende reconciliation efter begin. Wrapper 15/15, supervisor 12/12, transaktionelt checkpoint 32/32, Python compile, DMI-modeldownload, freshness og workflowrækkefølge er grønne. Dette opdaterer implementationstatus, men ikke reviewets fund eller behovet for exact-head-CI og live pass 2/3.
