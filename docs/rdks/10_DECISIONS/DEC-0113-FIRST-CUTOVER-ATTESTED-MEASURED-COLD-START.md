# DEC-0113 – første integrerede cutover bruger attesteret measured-only cold start, når Candidate G ikke er migrationsklar

- **Status:** Ejerbesluttet og implementeret i lokal 4.0.318-kandidat. Aggregate/cold-start/rollback/recovery, workflowroller, public-integrated 210/673, profil/cutover og 8-consumer-binding er lokalt grønne uden P0/P1-reviewfund; fuld slut-sourcegate, exact-head, merge, frisk produktion/deploy, Feggesund 3 × 118 og offentlig desktop-/mobilbrowser afventer

**Driftspræcisering 2026-09-01:** En genbrugt DMI-kystdelscache er kun producentmæssig succes, når dens aktive `PART::`-identitet er eksakt, og mindst ét finite U/V-par på samme time/række har fuld native provenance i den låste `target−48..target+117`-matrix. Den valgte cache skal være atomisk materialiseret til næste forbruger. Nul strict par stopper både normal og WAM-produktion, men reelt progressivt arbejde checkpointes fortsat. Testfixtures for relative prognosedage skal bruge den fælles danske forecastkalender og et fast klokkeslæt. Dette ændrer ingen score-, geometri-, punkt- eller private datakontrakter.
- **Dato:** 2026-08-30
- **Ejer:** RavRadar
- **Supplerer:** DEC-0102, DEC-0110 og DEC-0112
- **Offentlig model indtil sikker cutover:** Candidate G/4.0.316

## Hændelse og observeret bevis

PR #235 bestod exact-head-kildegaten `33332106627` på source head `30306a51c4e360c5054368f1b0167e3aaa3862ee` og blev merged som main `a584d1cf1a53692b10b0f01244eab4fb91ca89b1`. Den første normale push-produktion `33333490853` stoppede sikkert i **Resolve one aggregate Candidate G wave-bootstrap target**. Den offentlige Candidate G-kilde var komplet som 210 zoner/673 kystdele, men alle 673 states var kanonisk warmup og 0 var `READY`. Den gamle resolver behandlede fejlagtigt migrationsegnethed som et krav for overhovedet at anerkende kilden.

Stoppet skete før DMI-/Copernicus-opdatering, scorebygning, fælles eller beskyttede state-/cache-/checkpointskrivninger, artifact, Pages og activation. Den efterfølgende WAM-fejl var kun en afledt `always()`-gate og kørte ikke WAM. Candidate G/4.0.316 og den centrale Candidate G-profil forblev offentlige og uændrede.

Tre kontraktfejl blev identificeret samlet:

1. En komplet, kanonisk Candidate G-warmupkilde er et gyldigt attesterbart rollbackgrundlag, men ikke en `READY` migrationsstate.
2. Den offentlige Candidate G-state skal valideres mod sit eget eksakte historiske kystdelsregister. Den aktuelt centralt godkendte runtimekontekst skal valideres separat; den må ikke bruges til at omskrive eller fejltolke den historiske source-state.
3. Node-resolveren udsendte UTC-timen med `.000Z`, mens den produktionskritiske Python-parser kun accepterede den kanoniske hele-timeform uden millisekunder.

Bot-/watchdogkørslen `33334709027` på samme main stoppede før produktionsarbejdet i den fail-closed operationelle actionresolver og blev korrekt klassificeret som `FAILED`; Pages var skipped. Det separate planlagte Copernicus-pilotrun `33335078275` stoppede ved forseglingen af den eksakte `target−48..target+117` DMI-gapmatrix, før pilotberegning, Copernicus-udfyldning, supportartifact eller offentlig mutation. Begge runs forklarer de automatiske fejlmails og er ikke yderligere offentlige modeldeploys; runstatus alene beviser hverken et nyt datahul eller det modsatte.

## Ejerbeslutning

### Produktionspræcisering 2026-08-31

PR #242 bestod exact-head `33408976253` og blev merged som `29f39cce44ffe6e3a1c14d5b58e991b61da2faba`. Pushproduktion `33412497717` passerede den korrigerede legacy-kildeattestering og den fulde tidlige kildegate, men stoppede i DMI/WAM før artifact, Pages eller activation. En inaktiv privat punktkandidat blev kørt efter et ikke-succesfuldt DMI-producentforsøg og kunne derfor stoppe de progressive cache-save-trin. Det var i strid med punkt 11's krav om at bevare reelt delarbejde.

Den korrigerede kontrakt er snæver: punktkandidaten kører kun efter DMI-success og er ikke en offentlig produktionsblocker; progressive GRIB-, DMI-zone- og current-researchcaches gemmes efter ethvert ikke-annulleret forsøg. Den komplette WAM-/rollbackgate er ikke lempet. Validatorens payloadfri fejlkode gøres eksplicit, mens dens exitstatus fortsat stopper first cutover. Ingen geometri, punkter eller private data ændres.

Ejeren kræver, at den nye model:

- fortsat scorer med tydelig `HISTORY_INCOMPLETE`, når ældre historik mangler, men scoretimens direkte input er gyldige,
- genbruger allerede hentede **reelle og provenanceverificerede** vejrdata ved første opstart frem for at kræve kunstig historik eller flere dages ny warmup,
- bevarer Candidate G som den eneste offentlige model, indtil hele den integrerede cutover er grøn,
- og frigives autonomt gennem de normale exact-head-, merge-, produktions-, release- og offentlige verifikationsgates.

Det betyder ikke, at et ugyldigt Candidate G-grundlag accepteres. Det betyder, at **source-attestation**, **migrationsegnethed** og **aktiv samplingkontekst** behandles som tre adskilte beviser.

## Bindende first-cutover-kontrakt

1. Den eksakte offentlige Candidate G-manifest/conditions-kilde og dens `coastal-parts-v2.json` skal hentes og valideres som én source-enhed. Source-registeret skal opbevares på en isoleret, ignoreret first-cutover-sti og må aldrig overskrive det aktive `data/live/coastal-parts-v2.json`.
2. Source-registeret skal bevise schema 2, 210 zoner, 673 unikke dele, identisk zone-/delsæt med conditions og, når manifestet fører dem, eksakt byte- og SHA-256-binding. Alle 673 Candidate G-states skal derefter bestå schema-, model-, variant-, profil-, stateKey-, rollback-, status-, coverage-, tids- og privacygrænser mod **source-registeret**.
3. Efter central adminhydrering materialiseres det autoritative aktive 210/673-register med den eksisterende builder. Det valideres separat mod den aktuelle runtimekontekst. Dette er ikke en geometri- eller punktændring: ingen land-/vandpunkter, kystnormaler, zoner eller koordinater flyttes af denne beslutning.
4. Hvis alle 673 source-states er `READY`, source- og active-stateKey-kontekst er ens, og deres validerede WAM-bootstrapmål er ét fælles UTC-timetarget, vælges `candidate-g-migration`.
5. Hvis alle 673 states er kanoniske, men mindst én er en tilladt non-READY warmuptilstand, eller source- og active-stateKey-kontekst legitimt er forskellig, vælges nationalt `genuine-cold-start` ved den aktuelle produktionstime. Der må ikke blandes migration og cold start mellem dele.
6. Manglende, ukendt, forkert schema/model/profil/stateKey, malformed, tampered, fremtidig eller på anden måde ikke-kanonisk source-state stopper fail-closed. Når alle dele ellers er migrationsklare, stopper et manglende eller blandet fælles migrationstarget ligeledes. En almindelig per-del fallback må ikke maskere aggregatefejlen.
7. Resolveren må kun udstede de payloadfri felter `mode`, kanonisk `target_hour`, `part_count=673` og `source_validated=true`. UTC-formatet er eksakt `YYYY-MM-DDTHH:00:00Z`; samme tekst skal kunne roundtrippe gennem produktionsparseren i Python.
8. `genuine-cold-start` må kun accepteres af statevælgeren, når aggregate-resolveren udtrykkeligt har attesteret source med `source_validated=true`, en Candidate G-source-state findes, og ingen tidligere integreret continuation-/checkpointkilde er blevet afvist som invalid. Standard/`auto` forbliver fail-closed ved en tilstedeværende ugyldig kilde.
9. Den integrerede state genafspiller kun de faktisk tilgængelige 0–48 private, verificerede timer plus den virkelige targettime. Historikmissing forbliver numerisk `HISTORY_INCOMPLETE` efter DEC-0112; der indsættes ingen syntetisk, interpoleret, lånt eller carry-forwardet historik.
10. Candidate G-rollback-oraklet initialiseres ad en separat, eksklusiv vej. Ved `genuine-cold-start` skal det bygges fra sine egne faktiske measured-only timer og må ikke hybridiseres med en continuation. En READY rollback-companion må først forsegles, når Candidate G's egen fulde 48-timers-/memoryReady-kontrakt faktisk består; ellers stopper checkpoint/release fail-closed.
11. Allerede hentede, gyldige DMI-/Copernicus- og beskyttede cachedata genbruges under deres eksisterende provenance-, alder-, target- og hashgrænser. En virkelig delvis DMI-cache gemmes efter et ikke-annulleret producentforsøg, også når forsøget senere fejler, så næste run kan fortsætte uden at genstarte alt arbejde. Dette gør ikke deldata offentlige og lemper ikke slutgaterne.
12. Første cutover er fortsat push-only. Mens Candidate G er offentlig og ingen integreret continuation findes, må schedule-/watchdog-/manuel vejrdrift vælge Candidate G-maintenance frem for at forsøge en ny offentlig modelaktivering. Kun controllerens fuldt verificerede atomiske cutover må skifte den offentlige profil.
13. En bootstrap-/resolverfejl skal stoppe før dyr vejrhentning, scorebygning, protected state/cache/checkpoint/adminmutation, artifact, Pages, deploy og activation. Lokal materialisering af den allerede centralt godkendte inputkontekst og isoleret read-only sourcehydrering er tilladt; de må ikke ændre offentlig eller beskyttet state.

## Release- og evidensgrænse

4.0.318 er ikke livebevist af denne beslutning. Før release kræves målrettede aggregate/source-registry/UTC/cold-start/rollback/cache/workflowtests, RDKS- og kildegate, endelig modelbinding, exact-head på egen PR, sikker merge, frisk fuld produktion med validate/releasegate/artifact/Pages samt offentlig 210/673/current/femdøgns- og desktop-/mobilkontrol. Candidate G forbliver offentlig ved enhver fejl.

Offline-replay og kontrakttests kan dokumentere determinisme, fysisk sammenhæng og teknisk forbedring. Uden repræsentativt fund-/nul-fundgrundlag må 4.0.318 ikke omtales som empirisk mere fundpræcis.

## Uændrede grænser

Beslutningen genåbner ikke DEC-0109 og tillader ingen fiktiv morgenhulsrekonstruktion. Den ændrer ingen geometri, zoner, kystnormaler eller land-/vandpunkter. Private payloads, private koordinater og rå U/V må ikke læses, vises, logges eller publiceres; den eksisterende offentlige source-registry må kun bruges internt til stateKey-attestation og må ikke udsende delidentitet eller koordinatindhold. Candidate G er ikke en samtidig offentlig shadowmodel; den er offentlig alene indtil sikker cutover og derefter kun privat migration-/offline-/rollback-orakel, medmindre et særskilt fuldt verificeret helrollback igen gør den til eneste offentlige model.
