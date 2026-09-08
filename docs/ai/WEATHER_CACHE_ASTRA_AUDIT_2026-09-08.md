# Implementeringsopfølgning 2026-09-09

DEC-0122/4.0.337 implementerer nu den samlede rettelse, som denne historiske audit efterspurgte: fastlåst decoder, snæver kompatibilitet, granulær proofbevarelse, komponentvis donor og fælles tabsfri Python/Node-I/O. De fem senere codecfejl fra den ekstra audit er rettet og måltestet. Prototype-målingerne nedenfor er fortsat historisk skalaevidens; exact production-sized runtime med releaseimplementationen er endnu åben.

Ejeren har godkendt én first-cutover-undtagelse med højst 50 MB archive og fortsatte storage/checkpoint/privacy/readbackgates. Den løser ikke tilbagevendende egress. Cachetransport uden nulstilling er derfor en bindende åben P0 før højfrekvent normal cron/watchdog.

# Astra-helkædeaudit: bevaret vejrdata, decoderdrift og cache-I/O

**Senere ekstra audit:** [WEATHER_FULL_CHAIN_REVIEW_2026-09-08.md](WEATHER_FULL_CHAIN_REVIEW_2026-09-08.md) supersederer denne fils implementeringsplan og tidligere vurdering af tilstrækkelig afgrænsning. De historiske cachemålinger består. Nye kodefund om granulært prooftab, codecudkastets fejl, normal/cutover, forkert backupbinding og privat transport skal med før release. Overlap med Open-Meteo er endnu ikke bevist; to senere diagnoseforsøg fejlede i checkpointvalideringen. Ingen .337-produktionsrettelse er gennemført.

Status: kritisk Astra-rodårsag/helkædeanalyse afsluttet med to grønne read-only forensics; INGEN 4.0.337-produktionsrettelse implementeret, committed, gated eller merged. Main er fortsat `bf47198125401342426532df6de8d8d489188a0a` / 4.0.336. Candidate G er fortsat senest verificerede offentlige model. Denne fil er checkpoint, ikke releasebevis.

## Slutresultater og modelskifte

`34262628767` er grøn på diagnostichead `baf71fd8`. Den nyere gemte kandidat beviser 62.865 genbrugelige par ved 16 UTC med original signature og med den snævre diagnostic-only compatibilityklasse. Seneste kandidat beviser 4.200; alle findes i samme union (intersection 4.200, union 62.865). Seneste rækker kan stadig være nyere værdier og skal bevares ved atomisk union, selv om de ikke øger cardinality. Ingen cache er skrevet eller erstattet.

Storage-prototypen beviste exact whole-document canonical SHA-roundtrip for alle 578.063 sourceobjekter. Filen går fra 760.487.472 til 94.150.160 bytes ved tabsfri shared source-repræsentation; original og decoded canonical størrelse er begge 760.487.471 bytes. 256MiB-grænsen kan dermed holdes uden datatab. Gzip af den kodede fil er 17.088.100 bytes. Ved nuværende 60×31×3-politik er DENNE FIL ALENE cirka 95,35GB/måned. Det er ikke måling af hele base64-arkivet, men påviser, at den fulde private transport-/kapacitetsløsning skal afklares særskilt før launch. Codec alene er ikke en løst Supabasegate.

Næste model: Sol / Ekstra høj til den nu afgrænsede implementering og målrettede beviser. Først lav billig read-only DMI↔Open-Meteo-restoverlap: genbrug recovered pair-set, restore exact OM-key fra `34252960481`, og valider checkpointet med `validate_checkpoint_document()` og de DMI-ledgerbundne 673 targets. Den rekonstruerer selv required = records + missing; den ikke-gemte Copernicus-targetregistry er derfor IKKE nødvendig. Kræv samme target/registry/input-immutability; output kun 1.891 missing, intersection og remaining. Hvis DMI lukker resten, indfør INGEN nearest-policyændring. Ellers undersøg alene den reelle rest. Den ufærdige separate A/B-probe blev ikke beholdt; ingen Open-Meteo-produktionsændringer foretaget.

Implementér genbrugs-/dependency-/tabsfri-I/O-/normal-WAM-rettelser samlet. Afklar kapacitet ud fra faktisk transportbehov og liveforbrug, ikke ved at hæve en gate eller love køb. Codecs, recovery og private-payloaddesign er endnu ikke produktionsimplementeret. Ingen ny vejrindsamling er startet; ingen formel release er klar.

## Aktuel ejerinstruks og modelgrænse

Ejeren kræver Astra Ultra til DMI-genbrug, øvrige fejl i kørslen og samlet helikoptergennemgang. Bevar alle gyldige cacher, undgå nulstilling og reparationskarusel. Normal drift og oneoff skal genbruge samme progression. Når kritisk analyse/design er afklaret, skal ejeren have konkret besked om at kunne skifte til billigere egnet model. Ingen nye lange vejrforsøg må maskere den kendte genbrugsfejl.

## Evidens og korrigerede tidligere påstande

- PR #270 er exact-head-grøn i `34249645563` og merged som `bf471981`. Dokumenternes tidligere manglende-CI-status for .336 er historisk.
- Normalrun `34252960481` på dette main-head bestod source-step, men stoppede efter Open-Meteo med 1.891 missing. Ingen closure, handoff, artifact, deploy eller modelcutover.
- Den tidligere sammenligning 70.280 -> 4.200 var IKKE en gyldig før/efter-sammenligning: 70.280 var en særskilt active-donor ved et 44 timer ældre target. .335 -> .336 ændrede DMI-serialisering/telemetri, ikke udvælgelse eller retained-proof-logik.
- Den relevante tidsserie er `34212820037` (8. september 10 UTC): 66.597 DMI-par; `34229976645` (13 UTC): 3.024; `34252960481` (16 UTC): 4.200. Seneste run genbrugte 2.856 og tilføjede 1.344. Biblioteksdrift skete mellem den store kandidat og første normalrun, ikke som en cachefamilieforskel mellem normal og oneoff.

## Bevist rodårsag: implicit native dependency-opgradering

`requirements-dmi.txt` tillader løse ecCodes-versioner. Den store kandidat brugte Pythonbinding `eccodes 2.48.0`, native `eccodeslib 2.48.0.26` / API 2.48.0. Normalruns brugte samme Pythonbinding men native `eccodeslib 2.48.2.27` / API 2.48.2.

`current_marine_processing_signature` inkluderer native API-version. `_validated_candidate_retained_current_asset_proofs` filtrerer inkompatible signatures fra evidence, hvorefter en fortsat faktisk attesteret række rammer `ValueError` ved manglende canonical asset-proof. `load_previous` sluger fejlen og mister ALLE donorens retained proofs. Rækkerne er ikke nødvendigvis slettet.

Read-only diagnose `34261357677` på isoleret branch `codex/weather-cache-forensic`, commit `d14309db`, er grøn for active, forrige kandidat og seneste kandidat. Ingen saved cache, privat artifact eller deploy:

- Active-donor `34056999485`: 70.280 verificeret ved egen reference; 42.915 verificeret ved 16 UTC med original signatur. Med aktuel signatur afvises begge i `update-dmi-bulk.py:5764`. ENESTE ændrede signatursegment er `eccodesApi`. Fil uændret.
- Forrige kandidat: 3.024 ved egen reference, 2.856 ved 16 UTC; genbrug godkendt. Samme fil indeholder 62.865 current-værdipar i targetvinduet, men value presence er ikke proof.
- Seneste kandidat: 4.200 verificeret LF-par; 62.865 current-værdipar fysisk til stede (41.472 IDW, 15.177 NSBS, 6.216 LF). Disse rå tilstedeværelsestal må IKKE kaldes valideret genvundet dækning.
- Nyere arkivcache eksisterer: `dmi-zone-candidate-v1-Linux-2026-W37-118-preflight-34212820037-1`, cache-id `7451912954`. Ledger/log beviser 66.597 ved 10 UTC; 62.865 ligger i 16 UTC-vinduet. Direkte archive+latest union afprøves i `34262628767`.

Normalrun brugte sit DMI-budget på første LF-familie; IDW/NSBS nåede ikke behandling efter massetabet af proofs. Store checkpoints kostede også cirka 50-60 sekunder hver. Mere netværkstid alene er ikke rettelsen.

## Afgrænset genbrugsdesign

1. Pin både Pythonbinding og native pakke; binding-pin alene stopper ikke drift.
2. Brug én fælles, snæver compatibility-helper for allerede verificerede currentrækker: den gennemgåede native 2.48.0/2.48.2-klasse, binding 2.48.0 og uændret parser20/params4/grid9/registry. Ukendt eller malformed signatur afvises. Bevar alle originale signatures og hashes; ingen relabel.
3. Rå GRIB-/nearest-/processed-step-cache skal stadig bruge PRÆCIS runtime-signatur. Decoder-kompatibiliteten må ikke overføres til råasset-skip.
4. Ret både retained-evidencefilter, build-current-ledger-filter og den uafhængige `lib/dmi_native_provenance.py`-validator. Bevidst inkompatibel proof-enhed bliver kun selv residual; manglende/malformed uafhængigt proof må ikke bruges som compatibilitybevis.
5. Recovery skal forene den nyere store PARTIAL-kandidat med seneste progression; ingen af inputcacherne overskrives. Den eksisterende fallbackdonorvej kræver strict READY og kan derfor IKKE uden videre genbruge dette partial-arkiv. Tilføj særskilt canonical per-pair-valid recoverydonoradgang; active-promotion forbliver strict READY.
6. Bind den præcise genopretningskilde til eksisterende run/key/registry; et cachenavn eller størrelse er ikke gyldighedsbevis. Efter recovery skal almindelige checkpoints selv bære unionens originale beviser fremover.

Officiel dependency-diff: <https://github.com/ecmwf/eccodes/compare/2.48.0...2.48.2>. Read-only GitHub API viser 18 commits: encoding/spec-, ECMWF-definition-, tabel- og CLI-ændringer, ingen ændring i nearest-/GRIB-værdidecoderfiler. Dette begrunder kun den snævre gennemgåede transition, ikke vilkårlig fremtidig decoderkompatibilitet.

## Bevist størrelse og samlet tabsfrit I/O-design

Seneste kompakte kandidat er 760.487.472 bytes. Dens 578.063 source-objekter fylder cirka 684,8 MB. Hele source-objekter er forskellige, men delt asset/spatial/semantik-information fylder samlet kun cirka 2,15 MB som unikke grupper. Ingen datafelter skal fjernes for at reducere de massive gentagelser.

Størrelsesfejlen rammer flere led:

- WAM CLI: hard 256 MiB.
- `update-weather.mjs` og `enrich-current-provenance.mjs`: hel strengindlæsning, læsefejl skjules som null. Node max string er 536.870.888 bytes.
- Spatial-audit: samme helstrengsproblem, hårdt stop.
- Private preflight: 256 MiB og læser gammel `data/live` active, mens vejrbuilderen bruger kandidaten.
- Handoff: 768 MiB rå cache, kun cirka 43 MiB reserve til seneste fil.
- Privat archive: base64 per fil og hel JSON-envelope; de konfigurerede 768/1040 MiB-grænser overstiger faktisk Node-strengkapacitet. En enkelt fil over cirka 384 MiB fejler før gzip.

Valgt design til bevis: fælles tabsfri storage-wrapper med tre source-tabeller (asset/spatial/semantik) og strenge references. Logisk schema2 rekonstrueres identisk; gamle plain-cacher kan stadig indlæses. NDJSON eller WAM-sidecar alene løser ikke hele problemet. Ukendte felter bevares, overlap/ugyldige referencer afvises, mutable værdier må ikke aliases. Produktkode skal have encoded-, decoded-expansion-, depth- og countgrænser før ekspansion.

Reader-inventar: Python bulk load/writer, targetregistry, closurebuilder, livepilotbuilder, Open-Meteo DMI-input, WAM CLI, oneoff progress og weather preflight. Node weatherbuilder, provenance, spatial-audit, private runtimepreflight og kystpunktaktiveringens læser OG writer. Direkte workflow-jq skal bruge codec-aware accessor. Rangechecker og handoff bruger rå filhash og kan forblive bytebaserede.

Normalisér gamle inputs atomisk før nye registry-/closurehashes. Hash altid faktisk opbevaret fil. Et allerede forseglet handoff må ikke reserialiseres. Codec skal ligge ved I/O, ikke importeres i scorekernen; offentlig model-/browser-/continuationclosure kan dermed bevares, mens privat full-runtime-kontrakt skal inkludere nye codecs.

Read-only prototype `scripts/inspect-dmi-source-codec.py` tester full-document canonical SHA-roundtrip og måler encoded/gzip bytes uden cachewrite. Livebevis køres i `34262628767`; lokalt er reference-/collision-/unknown-field-/Unicode-/mutable-aliasing-/gzip-selvtests grønne. Det er ikke en færdig produktionscodec.

## Andre runfejl og åbne slutled

- Open-Meteo: 28.568 required, 24.829 retained, 1.848 fetched, 26.677 filled, 1.891 missing. 81 batch attempts, 23 retryable transporthændelser, 84 grid-distance-afvisninger og 9.256 pair-value-afvisninger (gentagne, ikke unikke huller). Deadline nået; ingen global provider-/queue-/attemptgrænse.
- Algoritmen bevarer succespar, men deterministic nulls kan gentages på flere splitniveauer. Mere tid garanterer ikke opfyldning; tidligere run efterlod 37 uden deadline-stop. Eventuel secondary nearest-cell skal først undersøges på faktiske huller og kræver samme model/time/units/waterpoint samt uændret 15km-grænse og korrekt policyproveniens gennem Python/JS. Intet sådant produktionsskift er implementeret.
- Normal handoff aktiverer IKKE native-WAM-mode/inspektion/slutgate, fordi betingelserne kræver integrated-cutover, mens handoff kun tillader candidate-maintenance. Dette modsiger DEC-0121 og skal rettes samlet. Feggesund 354/354 kontrolleres separat i runtime; et generelt Feggesund-bypass er IKKE bevist.
- Source-step genbrug på samme main kan bruges efter live-verifikation; ingen gatebypass. Nyt main-head skal stadig have relevant sourcebevis og hvert nyt artifact fulde post-data-gates.
- Private archive-/Supabasekapacitet er fortsat ÅBEN: aktuel politik projicerer hele archive * 60 builds/dag * 31 dage * 2/3 reads mod 5GB/måned med reserve. Tabsfrit mindre cacheformat er ikke i sig selv bevis for budget. Mål faktisk archive og binding til faktisk anvendt kandidat før launchløfte.
- Modelcutover, reaktivering af normalworkflow/watchdog og ekstern cron skal først følge faktisk komplet vejr, WAM/Feggesund, fulde gates og deployment. Ingen aktiv vejrkørsel er startet som led i disse forensics.

## Arbejdsstatus og næste sikre trin

Mainworktree branch: `codex/weather-handoff-runtime-4.0.337`, ingen tracked produktionsændringer ved dette checkpoint. Read-only scripts ligger untracked. Den isolerede nested worktree `.tmp-weather-forensic` på `codex/weather-cache-forensic` er KUN diagnose og må ALDRIG merges som release. Første diagnosticcommit `d14309db`; anden `baf71fd8`. Bevar øvrige `.cache/` og `.tmp-run-*`.

Næste: følg slutresultaterne/modelskiftet øverst. Implementér samlet .337 med målrettede tests, fuld dokumentations-/versionssynk, én exact-head-sourcegate, merge, kontrolleret genbrug/recovery og normal weather-handoff. Ingen samlet vejrkomplethed eller launchdato er bevist endnu. Første push af anden diagnosticrevision blev afvist af værktøjernes sikkerhedskontrol som ukendt ekstern destination. Read-only `git remote get-url` og `gh repo view` beviste ejerens eksisterende PUBLIC RavRadar-repo og ADMIN-adgang; kode/privacy-review og selvtest blev gentaget, hvorefter samme handling blev tilladt. Der blev alene pushed diagnosekode og vist aggregater, aldrig private cachepayloads. Dette var ikke en releasegate eller gatebypass.
