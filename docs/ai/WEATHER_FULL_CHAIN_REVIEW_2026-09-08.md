# Implementeringsopfølgning 2026-09-09

Denne audits oprindelige status og NO-GO gælder historisk for det gennemgåede udkast. DEC-0122/4.0.337 har siden rettet de fem codecfejl, fastlåst ecCodes, indført granulær N−1-salvage og komponentvis atomisk donorbackfill, omlagt kendte produktions-I/O-veje og bundet direkte legacy-cutover til én eksakt succesfuld oneoff. Målrettede lokale tests er grønne. Production-sized exact-codec, GitHub exact-head, merge, main-runtime og offentlig produktion mangler fortsat; audittens negative produktionsstatus er derfor ikke omklassificeret til et runtimebevis.

Ejerens tillæg 2026-09-09 tillader kun first cutover ved archive højst 50 MB og uændrede storage/checkpoint/privacy/readbackkrav. Tilbagevendende transport er fortsat åben P0 og skal implementeres parallelt uden cache-reset før højfrekvent normal drift.

# Ekstra Astra Ultra-helhedsgennemgang – 2026-09-08

Status: audit afsluttet, produktionsrettelse IKKE klar. Checkpoint skrevet efter 19 UTC. Dette er en read-only kode-/designgennemgang med små in-memory-prober og dokumentationskontrol, ikke en release eller et grønt produktionsbevis. Ingen nye GitHub-runs, cachewrites, merges, providerkald eller deploys blev startet under denne ekstra gennemgang.

Main er senest verificeret som `bf47198125401342426532df6de8d8d489188a0a` / 4.0.336. Candidate G / 4.0.316 er senest verificerede offentlige model. Normalworkflow/watchdog er fortsat dokumenteret deaktiveret; de er ikke genaktiveret her. Bevar alle lokale cacher og den isolerede diagnoseworktree. Diagnosebranchen må aldrig merges som produktionsrettelse.

## Konklusion og modelgrænse

Den tidligere rettelsesplan var ikke tilstrækkelig. At gentage vejrkørslen efter alene decoderkompatibilitet og mindre JSON ville efterlade kendte fejl i genbrug, normal handoff, hukommelse og modelovergang. Det ville fortsætte reparationsspiralen. Den ekstra gennemgang har afgrænset disse fejl, men har IKKE bevist komplet vejr eller gjort den nye model klar til launch.

Astra-delen kan afsluttes. Anbefalet næste model er Sol / Ekstra høj til de konkrete rettelser og nedenstående målrettede beviser. Ingen grund til at beholde Astra under mekanisk integration, dokumentationssynk eller ventetid. Privat transport kræver stadig en faktisk payloadmåling og en udtrykkelig design-/budgetafklaring før release; den må ikke stiltiende fjernes fra planen.

Tidligere målinger i [cacheauditen](WEATHER_CACHE_ASTRA_AUDIT_2026-09-08.md) består: original arkivcache giver 62.865 genvaliderede currentpar ved det historiske target 16 UTC, mens den seneste cache kun godkender 4.200. Det er ikke et aktuelt antal komplette vejrtimer og ikke bevis for, at alle rester hos Open-Meteo er lukket.

## 1. Genbrug: bevarede data og deres beviser skal følges ad

- **Bevist rodårsag:** implicit native ecCodes-opgradering ændrer den strenge processing-signatur. Pin binding og native dependency. Brug kun den gennemgåede 2.48.0/2.48.2-kompatibilitet til allerede verificerede currentrækker, med uændret binding/parser/param/grid/central targetregistry. Bevar originale signatures og hashes. Rå GRIB-/processed-step-genbrug forbliver eksakt.
- **Yderligere bevist kodefejl:** `load_previous` sanerer rækkeindhold, hvorefter `_validated_candidate_retained_current_asset_proofs` kræver, at den samlede oprindelige attestation stadig er identisk. Én defekt currentrække kan derfor få alle gode retained proofs til at forsvinde. Testen i `test-dmi-native-provenance.py:2960–3020` forventer ligefrem `granular_proofs == []`; den grønne test beskytter den forkerte helhedsadfærd. Ny kontrol skal autentificere det oprindelige kontrolplan og bevare hver uafhængigt kildeautoriseret overlevende række, genberegne ledgeren og vise N−1 gode par hele vejen til downstream-residual. Et ugyldigt kontrolplan må fortsat ikke bruges.
- **Bevist konfliktvej, faktisk overlap endnu ikke målt:** samme immutable sourceasset med gammel og ny decoder kan have forskellige signaturebundne outcomeproofs. Selektoren ved `update-dmi-bulk.py:5811–5834` grupperer kun efter asset og afviser konflikten; den uafhængige validator tillader kun ét proof pr. asset. Et simpelt compatibility-filter løser derfor ikke nødvendigvis unionen. Bevar entydigt originale beviser pr. faktisk valgt række; ingen blind relabel eller last-write-wins.
- **Vigtig forenkling at afprøve først:** seneste fil indeholder allerede fysisk 62.865 currentpar. Udtræk de validerede originale beviser fra arkivet, frigiv arkivdokumentet og afprøv genattestering af de faktiske rækker i den seneste cache. Hvis det lykkes efter sanitation, clean og ny ledger, er recovery hovedsageligt genoprettelse af beviser, ikke endnu en stor værdifletning. Rækker med nyere gyldige værdier må ikke rulles tilbage.
- **Komponenthul:** `backfill_compatible_cache_data` fylder hele donorrækken ved en tom primærplads, men ellers kun current U/V/source. Manglende bølger, vind, vandstand eller temperatur i en allerede delvist fyldt række hentes ikke fra donor. Mål dette på det faktiske donor/latest-par; tilføj kun nødvendig komponentvis atomisk opfyldning med eksisterende tuplevalidatorer. Currentunion er ikke hele vejrcachen.
- **Hukommelse:** produktionsvejen holder store dokumenter og deepcopy samtidig. Den hidtidige diagnose holdt kun donorernes pair-sets sekventielt. En lagringscodec beviser ikke, at fuld Python-ekspansion og fletning kan køre. Sekventiel recovery og faktisk peak-RAM/tidsmåling er nødvendige.

## 2. Tabsfri lagring: forkast det nuværende uintegrerede udkast som releaseklart

Den tidligere read-only prototype beviste en tabsfri repræsentation på cirka 94,15 MB mod 760,49 MB. Men de efterfølgende untracked produktionsudkast `dmi_bulk_storage.py` og `dmi-bulk-storage.mjs` er ikke samme bevis. De er endnu ikke integreret og må ikke stages som færdige.

Fem fejl er reproduceret med små syntetiske in-memory-prober, uden private data eller filwrites:

1. Node bruger `JSON.stringify(value, Object.keys(value).sort())` som dictionarynøgle. Replacerlisten filtrerer også indlejrede felter, så forskellige nested værdier kan sammenblandes og mistes.
2. Node ændrer kalderens sourceobjekter før writerens try/finally. En sen kodningsfejl efterlader tidligere rækker omformet; også succesvejen eksponerer midlertidige refs over async-await.
3. Begge decodere ekspanderer før alle refs/counts er valideret. En sen fejl kan efterlade wrapperen delvist ændret.
4. Dictionarytabellernes nested værdier undgår depthgrænsen; et depth-80-input accepteres trods maksimum 64.
5. Node skriver ukendte felter via `{}`-assignment. Et eget JSON-felt `__proto__` mistes og ændrer partitionens prototype.

Mindste rettelsesdesign: behold de tre dictionaries, men brug tabsfri nøgleserialisering, en separat shallow-cloned dokumentspine ved skrivning og to-pass-validering før ekspansion. Bevar ukendte felter med ordinary data-properties. Beregn dictionary-entry-størrelser én gang. Node bør anvende almindelige sourceobjekter med sikkert readonly delte nested værdier, ikke en ny Proxy-semantik uden dokumenteret behov. Python-mutable værdier må ikke aliases. Gamle store plain-cacher tillades kun på eksplicit migrationsvej; normale downstreamlæsere skal kontrollere encoded loft før parsing.

Alle læsere OG skrivere skal være med. Kystpunktaktiveringens faktiske bulk-I/O er `prepare-coastal-point-activation.mjs:201,239`. Den separate stagingcache er ikke denne fil. Normalisér atomisk før nye registry-/closurehashes; rør ikke bytes i et allerede forseglet handoff.

## 3. Normal kørsel og modelovergang: én sammenhængende vej

**Beviste kodeafhængigheder, ikke blot mulige providerfejl:**

- Normal `candidate-maintenance`/`candidate-legacy-maintenance` sætter bootstrap-required=false. Derfor mangler sammenhængende sourcehydrering, targetresolver, WAM-producentmode, WAM-inspektion og WAM-slutgate. Et ekstra flag i sidste `if` løser ikke manglende input.
- Uden privat runtime/checkpoint importeres legacykilden kun isoleret, mens weatherbuilderen får auto/source=false/stateless=false. Cold-start kan derfor afvises i Candidate G-statebygningen efter komplette providers. Om næste konkrete kørsel har privat continuation er ikke målt her.
- Normal handoff forsegles før senere privat publish og Candidate G-vedligeholdelse. Consumer kræver hele producentkørslen grøn. Senere fejl gør det allerede forseglede handoff ubrugeligt.
- Fase A skal fremstille en moderne offentlig Candidate G med national READY continuation, og Fase B kræver den på samme head. Dermed kan den gamle models 48-timerskrav blokere en ellers gyldig integreret HISTORY_INCOMPLETE-model. Faktisk historikdækning er ukendt, men den obligatoriske afhængighed er verificeret.
- Oneoff kræver fortsat offentlig legacy Candidate G-hydrering før cache-restore. Efter integrated launch afviser denne hydrator integrated schema. Den nuværende oneoff er derfor ikke en generelt brugbar accelerator efter launch.

**Anbefalet overgang, endnu ikke implementeret eller gjort til ny aktiv beslutning:** behold kontrolleret klargøring og kontrolleret cutover, men lad klargøringen fremstille og validere den integrerede runtime uden først at publicere en ny Candidate G. Bevar den eksisterende offentlige generation uændret. Cutover skal være bundet til denne eksakte attesterede source og bevare CAS/PENDING/abort/reconciliation og alle artifact-/release-/privacygates. Manglende målt historik forbliver HISTORY_INCOMPLETE; kalibrering er låst og ny Candidate G-companion er BUILDING_MEASURED_ONLY, indtil historikken faktisk findes. Den bevarede gamle generation er ikke i sig selv bevis for en fuldt fungerende post-launch rollback på ny kode; rollback/abort skal testes særskilt.

Dette ændrer DEC-0114's specifikke krav om moderne same-head Candidate G før Fase B. Konflikten skal forklares for ejeren og den snævre ændring registreres før implementering; den må ikke skjules som en workflow-if-rettelse. Ingen generel lempelse af schema 2.1 eller fabrikation af gammel historie.

Normal og oneoff bør bruge samme kilde-/readinesskontrakt med forskellige tidsbudgetter. En eksplicit normal handoff-producent skal kunne afslutte efter sine nødvendige fulde checks og forsegling uden efterfølgende uvedkommende Candidate G-publicering. Normalbudgettet udvides ikke til en oneoff som skjult følge af rettelsen.

## 4. Privat backup/transport: reel uløst kapacitets- og kompatibilitetsopgave

- Privat archive indeholder ni filer, herunder full conditions og alle store providercacher. Den komprimerede kodede DMI-fil alene målte 17.088.100 bytes. Det er ikke hele archive- eller liveforbrugsmålingen.
- Den nuværende kapacitetspolitik regner 1.860 full builds/måned og 2 downloads normalt / 3 ved rollback. Ved samme målte kompressionsstørrelse er DMI-komponenten alene cirka 63,57/95,35 GB/måned mod kodens 5 GB-budget med 30 procent reserve. Den faktiske base64-envelope skal stadig måles; codecprototypen er ikke et præcist archive-estimat eller oplysning om kontoens aktuelle abonnement.
- Actions-first restore løser ikke dette alene: hver publicering downloader det nye komplette archive én gang som byte-exact readback før pointer-CAS. Selv ét læs pr. build giver på samme grundlag cirka 31,78 GB/måned for DMI-komponenten. Readback må ikke blot fjernes uden en anden tilsvarende integritetskontrakt.
- `createPrivateRuntimeSpec` læser fast `data/live/dmi-bulk-cache.json`, mens weatherbuilderen kan bruge kandidatfilen. Når kandidaten er PARTIAL DMI men samlet fallbackvejr er komplet, er promotion til active ikke garanteret. Backup, preflight, gates og faktisk anvendt input skal bindes til samme eksakte fil; mål den rigtige kandidat.
- Archive forventer rå kodehashes fra alle updater-/runtimefiler. En senere ændring kan gøre både current og previous inkompatible. Restore stopper da før providers, selv med gyldigt checkpoint. Tilføj eksplicit versioneret, autentificeret migrations-/kompatibilitetsvej og revalidering; ægte tamper må fortsat afvises. At ignorere alle restorefejl er forkert.
- Restore har fortsat en intern 72-timers aldersgrænse. Et 73 timer gammelt 118-timersforecast kan have 45 timers brugbart restvindue, men bliver ikke restaureret. Adskil genbrugelig kilde/historik fra offentlig artifactfriskhed; vurder faktisk valid-time og korrekt geometri. Kildehashkonflikt sker desuden før expired-klassifikationen.
- Publish afviser forskellige generationer ved samme productionReferenceAt. Det er en tilsigtet konfliktkontrol, men en eksplicit samme-time genkørsel med reelt forbedrede data kan ramme den. Før en ændring: test faktisk controllerpolicy. Skeln streng tidsregression fra en autoriseret nyere generation ved samme time med CAS; ingen ubetinget last-write-wins.

**Transportdesign må ikke forceres:** checkpointet indeholder afledt integreret/Candidate G-continuation, men ikke alle vejrdata. Full conditions bruges også til parent-zone samples24h/samples72h, advisoryhistorik og fallback; providercacher leverer kildehistorik og recovery. At slette disse fra backup og blot henvise til checkpoint ville miste funktioner. Mål faktisk bytes-inventar og alle nødvendige previous-runtimefelter. En eventuel mindre hot continuation-pakke og særskilt cold kildebackup skal være tabsfri for de faktiske forbrugere, have verificeret miss-/restorevej og aftalt frekvens/budget. Alternativt kræver uændret transport et konkret godkendt større kapacitetsbudget. Ingen ny betaling eller ekstern lagertjeneste er godkendt her.

## 5. Open-Meteo: skeln fejl i diagnose fra fejl i produktion

De tidligere read-only overlapruns `34264558462` og `34265419767` fejlede i `open_meteo_current_fallback.py`'s validering. Den seneste diagnose udskriver kun exceptiontype og sidste frame `_fail:89`, ikke den sikre fejlkode/kaldende valideringslinje. Derfor er DMI-overlap med de 1.891 rester IKKE bevist, og en ny Open-Meteo-produktionsfejl er heller ikke diagnosticeret.

Næste nødvendige diagnose skal først isolere den allowlistede fejlkode og relevante valideringstrin uden private payloads og uden gentagelse af allerede grønne tunge delprober. Valider checkpointets eget required=records+missing og exact targetregistry. Ingen nearest-policy-, geometri-, 15km- eller kildeprioritetsændring før den faktiske residual efter recovery er kendt. De 62.865 er bundet til et historisk target; en aktuel kørsel skal genberegne hele sit aktuelle vindue og huller, ikke bruge dette tal som en ny statisk sandhed.

## Afgrænset bevis- og leveringsrækkefølge

1. Løs/afklar designkonflikterne ovenfor før en releasekandidat kaldes klar. Gem eksisterende cacheidentiteter; rør ikke produktionscache eller offentligt datasæt for at få et grønt lokalt resultat.
2. Målrettede lokale kontrakttests: én ugyldig række bevarer N−1, kompatible/inkompatible signatures og samme-asset-proofkonflikt, korrekt nyere-rækkeprioritet, alle nødvendige komponenter, writer-success/failure uden inputmutation, nested/Unicode/unknown/__proto__ roundtrip, invalid/deep/bomb refs afvist før ekspansion.
3. Én produktionstor isoleret genbrugs-/I/O-prøve med bevarede input: faktisk load/sanitize/recovery/clean/ledger/downstream, Python+Node-roundtrip, oprindelige proofhashes, tidsforbrug/peak-RAM og residualoptælling. Ikke endnu en vejrhentning. Hvis data kan genattesteres uden stor union, brug den enklere vej.
4. Små adfærdstests for normal handoff, oneoff før/efter launch, manglende privat continuation, ét WAM-/Feggesund-hul, HISTORY_INCOMPLETE, exact-source cutover/abort, gammel kompatibel archive vs tamper, samme-time genkørsel og reelle cachemisses. Tjek normal cron-dispatch og tidsbudget som del af denne kontrakt.
5. Når design og målbeviser er grønne: én sammenhængende dokumenteret releasepakke med RDKS, issues, changelog, Markdown-/webhåndbog og beskyttet installationskopi samt version-only geodata-diff. Én fuld GitHub sourcegate på eksakt PR-head; ikke en stor gate pr. lokalt fund.
6. Kontrolleret main-kørsel på genbrugte data, helst normalbudget hvis den målte residual gør det realistisk. Komplet current/WAM/Feggesund, korrekt privat inputbinding, faktisk kapacitet og fulde post-data artifactgates før cutover. Først derefter offentlig modelkontrol og genaktiveret ekstern cron/normaldrift. Ingen garanti om at næste kørsel er den sidste.

## Hvad blev ændret under denne ekstra audit?

Kun audit/checkpoint/statusdokumenter. Ingen produktionsfiler blev rettet; de allerede eksisterende untracked codec-/compatibilityudkast er bevaret og eksplicit IKKE godkendt som releaseklare. De fem små codecprober var in-memory og skrev ingen filer. RDKS-baseline bestod for 4.0.336 før dokumentation. Efter opdatering bestod `scripts/validate-rdks.mjs`, `scripts/test-security-hardening-4.0.284.mjs` og `git diff --check`. Ingen ny kildegate eller lang test er sat i gang.
