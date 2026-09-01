# Nedlukningscheckpoint – integreret model før fuld historik – 2026-09-01 10:40 CEST

## Varigt gemt

- Branch: `codex/ravscore-history-incomplete-cutover`.
- Pushet head: `5f058e0b` (`Allow integrated cutover with incomplete wave history`).
- Branchens base er seneste hentede `origin/main 28f24d1c1fc2c9d971b5acb43cf91bddd80fb950`.
- Den sammenhængende WAM-del er implementeret i seks filer og ligger på remote-branchen; worktree var rent umiddelbart efter push.
- 51/51 målrettede Python-tests, den målrettede Node-workflowtest og `git diff --check` er grønne.

## Bindende ejerretning og implementeret del

- Den integrerede model skal online med friske direkte input og en eksakt, sammenhængende 118-timers aktuel/femdøgnsprognose, selv om fortidshistorikken endnu ikke er komplet.
- Manglende fortid er `HISTORY_INCOMPLETE`, vises tydeligt offentligt og opbygges bagefter af reelle målte data. Den må ikke fjerne score eller femdøgnsprognose.
- Ingen syntetisk rekonstruktion, interpolation, carry-forward eller lån fra nabozoner er tilladt.
- Cold-start `NO_COHERENT_RUN` for den historiske WAM-matrix er nu advisory history-incomplete og fortsætter til den normale operationelle WAM-hentning. Migration er fortsat strict.
- Kun legacy `MISSING_CELL` nulstiller bølgedelen. Gyldig delhistorik og `MISSING_HOUR` bevares.
- Operationel exact bridge plus én coherent 118-timers WAM-run er fortsat en ufravigelig gate. Proveniens-, celle-, felt-, retnings-, run- og registerfejl stopper fortsat fail-closed.

## Åbent før modellen kan gå online

1. Bevar det eksisterende schema-4 Candidate G-rollbackcheckpoint 100 % strict og kun `READY`.
2. Gem en separat privat `BUILDING_MEASURED_ONLY`-warmup for alle 673 kanoniske dele; den må aldrig betegnes rollback-companion eller eksponeres offentligt.
3. Tillad første integrerede cutover og efterfølgende same-binding integrated maintenance med denne målte warmup, mens kalibrering er låst. Manuel Candidate G-rollback og return fra Candidate kræver stadig 673/673 `READY`.
4. Spring checkpoint-build/save/protected-publish over under warmup, men bevar den private runtimebundle, så measured-only-fremdriften fortsætter på næste kørsel.
5. Luk audit, activation, state-less recovery, releasegate, workflow og måltests. Derefter RDKS/håndbog/changelog, exact-head-CI, sikker merge, frisk fuld produktion og offentlig desktop-/mobilkontrol af 210/673, score, advarsel og fem døgn.

## Sikkerhed og genoptagelse

- Candidate G er fortsat den sidste offentlige model; `5f058e0b` er ikke merged eller deployet og må ikke beskrives som live.
- Ingen geometri, zoner, kystnormaler, land-/vandpunkter, private payloads, koordinater, rå U/V eller credentials er ændret eller skrevet i dette delta.
- To implementeringsagenter er afsluttet; der er ingen bevidst efterladt lokal test- eller skriveproces.
- Ved genoptagelse: læs obligatorisk startkæde og dette topcheckpoint, fetch `origin/main`, verificér branch/head/status, implementér punkt 1–4 med måltests, og kør ikke unødvendige fulde lokale testgentagelser.

---

# Nedlukningscheckpoint – RavScore state 6 – 2026-08-31 06:34 CEST

## Status

Dette er et permanent, lokalt WIP-checkpoint før planlagt computernedlukning. Det er **ikke releaseklart**, må ikke merges eller deployes som det står, og er oprettet for at sikre, at intet arbejde går tabt.

Branch: `codex/ravscore-first-cutover-cold-start`.

Seneste allerede committed modelarbejde før dette checkpoint:

- `ebf05cff` – samlet integreret RavScore state 6-kandidat.
- `5c119c32` – dokumenteret integration af seneste verificerede main-ancestry.
- `947554c4` – forward-port af den produktionsverificerede, statefrie trip-storage-retry.

Den offentlige model er fortsat Candidate G. Dette checkpoint aktiverer eller publicerer ikke state 6.

## Sikret i checkpointet

- Workflowmonolitten er lokalt opdelt i controller, reusable weather-build og reusable Pages-deploy.
- Central releasekontraktmetadata og modelbindingsmetadata er tilføjet.
- `version.json` er ottende bindingsforbruger.
- Candidate G-rollbackbindingen er regenereret som 55-filers bundle:
  - kontrakt `c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8`
  - bundle `4ccc2081982677aadbb47a5ee7d6f2b99fdcb7e42113e73029d5c60323a5ee96`
- Pages-privacygaten accepterer kun eksakt integreret eller eksakt Candidate G-rollbackbinding fra manifestet og afviser mixed/unknown binding.
- De 10 Markdown-filer, som midlertidigt blev afkortet ved en lokal redigeringsfejl, er genoprettet fra `947554c4`. Byte-/diffkontrol beviste genopretningen, hvorefter kun de kendte 8-forbruger-, 55-filers- og PR #237-statusrettelser blev genanvendt.
- Ingen syntetisk historik, interpolation af det gamle driftshul eller Feggesund-nabolån er genindført.

## Kontrol udført før nedlukning

Grønne målrettede kontroller rapporteret og/eller genkørt i dette arbejdsafsnit:

- parsing af alle tre workflowfiler;
- exact job-body/step-order-sammenligning mod den tidligere monolit;
- reusable workflow interface/failure-test;
- production outcome;
- RavScore dispatch;
- operational Pages recovery;
- release-contract metadata;
- release-version;
- Pages artifact privacy;
- protected handbook merge;
- modelbindingssynk;
- scoped `git diff --check` efter Markdown-genopretningen.

Seneste observerede automatiske Candidate G-produktion `33355833084` på main `8c03e25d` sluttede grønt med fuld vejrbygning, validate, releasegate, artifact og Pages-deploy. Det er driftsbevis for Candidate G, ikke state-6-releasebevis.

## Kendte åbne punkter

1. `test-workflow-validation-order-4.0.108.mjs` kender endnu ikke de to nye reusable workflowfilnavne. Det er den eneste kendte røde måltest i workflow-splitten.
2. De øvrige scripts, som historisk læser kun `.github/workflows/update-and-deploy.yml`, skal migreres rollebevidst til controller/build/deploy-kilder. Positive assertions må ikke baseres på naiv tekstsammenkædning.
3. `release-gate.mjs` skal færdiggøre samme rollebevidste opdeling.
4. Arkitekturgælden må først markeres lokalt lukket, når inventory/consumer-migreringen og relevante måltests er grønne.
5. Hele modelhelheden skal derefter genreviewes samlet: fysik/last mile, konservativ `HISTORY_INCOMPLETE`, nøddrift, migration, rollback, producent-/forbrugermatrix, privacy og geodatabevis.
6. Fuld `validate:source` skal køres én gang på PR'ens eksakte head i GitHub. Derefter følger sikker merge, frisk produktion og offentlig desktop-/mobilverifikation.

## Sikkerhedsgrænser

- Ingen private payloads, koordinater, rå U/V eller credentials er skrevet i checkpointet.
- Ingen geometri, zoner eller land-/vandpunkter er ændret.
- Intet i dette lokale WIP-checkpoint er pushet, merged eller deployet.
- Alle subagenter er afsluttet; der er ingen kendt aktiv lokal test- eller skriveproces.

## Præcis genoptagelse

1. Læs AGENTS.md og den obligatoriske RDKS-startkæde.
2. Læs dette checkpoint og kontroller branch/HEAD/status.
3. Kør ikke fulde tests først; luk inventory/consumer- og releasegate-migreringen med måltests.
4. Opdater aktiv RDKS/håndbog uden at ændre historiske 4.0.317-hashes.
5. Kør samlet slutreview og derefter den ene bindende exact-head-kæde.

---

# Nedlukningscheckpoint 2 – DMI/Copernicus-kontrakt – 2026-08-31 23:33 CEST

## Eksakt lokal tilstand

- Branch: `codex/dmi-part-cache-reuse-gate`.
- HEAD og seneste hentede `origin/main`: `0dcde6b8a840aaff51d0d294f4cc46a4604e4992`.
- Fem lokale, gemte kode-WIP-filer er ændret: `scripts/update-dmi-bulk.py`, `scripts/test-dmi-scheduler-active-zones-4.0.117.mjs`, `scripts/test-dmi-bulk-model-download.mjs`, `scripts/lib/dmi_native_provenance.py` og `scripts/build-copernicus-target-registry.py`.
- WIP-kontrollen baserer sig endnu på aggregeret diagnostik og er bevist for svag. Den må ikke committes, pushes, merges eller deployes i den nuværende form.
- Efter den første checkpointskrivning blev den delte strict pair-helper lokalt tilføjet i provenancebiblioteket, og target-registryen blev lokalt omlagt til at kalde den. Den efterfølgende patch af producenten blev afvist uden ændringer. De to nye filer er derfor også utestet WIP og må ikke betragtes som en færdig rettelse.
- Ingen geometri, land-/vandpunkter, private payloads, koordinater, rå U/V eller credentials er læst, skrevet eller ændret i dette arbejdsafsnit.

## Beviste konklusioner

1. Target-registryens nul-gate er korrekt fail-closed og skal bevares.
2. DMI-producentens hurtige cachegenbrug kan returnere succes ud fra forældrezonedækning og separate globale U/V-tællinger, selv om ingen eksakt kystdel har et samlet, provenance-verificeret strømpar i den låste `target−48..target+117`-matrix.
3. Den hurtige sti kan kontrollere den valgte deployed fallback i hukommelsen uden at materialisere netop dette dokument til `data/live/dmi-bulk-cache.json`, som næste trin læser.
4. Mindste korrekte gate er fortsat mere end nul strict par i den eksakte matrix, ikke en ny procent- eller target-hour-politik. Det faktiske `PART::<id>`-set skal samtidig være eksakt lig det autoritative aktive register.
5. Samme strict kontrakt skal deles af producent og target-registry. Den normale/WAM-afslutning må heller ikke kunne returnere succes med nul strict current-par.

## GitHub- og vejrstatus ved checkpointet

- GitHubs 15-minutters scheduler og den private cache-keepalive er aktive på main-head `0dcde6b8`.
- Seneste kontrollerede vejrproduktioner `33434007877`, `33434900041` og `33437475995` sluttede rødt ved den fail-closed Copernicus-target-gate; ingen af dem deployede et nyt artifact.
- Private Copernicus-cache-keepalive-kørsler fortsatte grønt til og med `33440724601` kl. 21:19 UTC.
- Det er derfor bevist, at schedulerens triggere lever, men ikke at friske offentlige vejrdatasæt bliver deployet. Dette skal behandles som den højeste driftsprioritet ved genoptagelse; blinde reruns kan ikke løse kontraktbruddet.

## Præcis genoptagelse

1. Erstat den nuværende diagnostikbaserede WIP-helper med en delt, direkte payload-verifikator: eksakt aktivt PART-set, finite U/V på samme eksakte time og `complete_native_source_for_hour()` i den låste 166-timersmatrix.
2. Materialisér atomisk den faktisk valgte cache til producentens `OUTPUT_PATH` før fast-path-success.
3. Brug samme gate før normal/WAM-success; checkpoint fremdrift, men returnér non-success ved nul strict current-par.
4. Test kun de målrettede falske positive cases, producent/registry-paritet, fallback-materialisering og WAM-successkontrakten.
5. Lav én samlet rettelsescommit, én exact-head-kildekontrol, sikker merge og én frisk produktion. Verificér derefter nyt offentligt dataset; gentag ikke blindt.

Nedlukningsnote 23:43 CEST: Arbejdet blev eksplicit stoppet efter ejerens gentagne nedlukningsbesked. To read-only-agenter blev afbrudt. Ingen lokal test, commit, push, PR, merge eller workflow-dispatch blev startet efter denne note.

---

# Genoptaget checkpoint – vejrpipeline – 2026-09-01

- Computeren er igen online, og ejeren har udtrykkeligt bedt om autonom, kontinuerlig genopretning af vejrdata og derefter fortsat modelimplementering.
- Liveaudit beviste aktive schedulere/vagthund, men ingen frisk publicering: `33445662715`, `33446827961` og `33449081608` stoppede i kildegaten; `33442030072` stoppede ved Copernicus-targetregistry. Seneste fulde produktionsbevis var `33378344817`.
- UTC-midnatsflagen i Spørg RavRadar-testen er rettet med fast klokkeslæt og fælles dansk forecastkalender.
- DMI-cachegenbrug og producentsucces kræver nu eksakt aktivt PART-set og mindst ét finite, samme-række, native-proveniensverificeret U/V-par i `target−48..target+117`; valgt fallback materialiseres atomisk.
- Assistent-, provenance-, targetregistry-, scheduler-, bulk-, WAM 18/18- og integreret bundletest er grønne. Exact-head, merge, frisk fuld produktion/deploy og offentlig friskhed er næste handling.
- Ingen geometri, land-/vandpunkter, private payloads, koordinater, rå U/V eller credentials er læst eller ændret.
- Første PR #244 exact-head `33450446237` stoppede i den afsluttende releasegate på to forældede source-string-assertions til den nu delte DMI-helper. `scripts/release-gate.mjs` attesterer nu registry→helper og helperens native-time/proveniens; målrettet releasegate er grøn. Opdateret exact-head er næste handling.
