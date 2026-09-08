# WAM-helkædeaudit og genstartscheckpoint – 2026-09-08

## Implementeringsstatus efter auditen

Auditens samlede korrekthedspakke er implementeret og måltestet som lokal 4.0.335: atomisk per-tuple-admission, granulær legacy-salvage, separat parser-/dækningsklassifikation, exact-proof WAM-resume, operationel exact multi-run-kontinuitet, Feggesunds deferred direct/proxy-scope og uafhængig currentprogression før en sen fail-closed WAM-gate. Python-syntaks, 32 validator-tests, 24 producenttests samt workflowinventar og integreret workflowadapter er grønne. Exact-head CI, merge og positiv runtime er endnu ikke beviste.

## Sikker arbejdsgrænse

Analyse, ikke ny release eller implementeret rettelse. Efter ejerens Windows-genstart var tracked source uændret: branch `codex/wam-readiness-4.0.334`, HEAD `808820cd4caeec36c45d880d84a767b396a70221`, origin/main `836e23ec207e56b6ed275b66f9758dcd311bbe7b`. Private `.cache/` og `.tmp-run-*` er bevaret og må aldrig stages. Ingen ny oneoff, commit, PR, merge eller deploy blev startet under auditen.

4.0.334 er allerede sourcegate-verificeret i `34187779106` og merged via PR #267. Ældre toptekster, som kalder den uncommitted/lokal, er historiske. Senest verificerede offentlige model er stadig 4.0.316 / Candidate G, ikke integrated.

## Eksakt evidens

- Oneoff `34189720294`, job `101945117862`, attempt 1, main `836e23ec207e56b6ed275b66f9758dcd311bbe7b`, target `2026-09-08T05:00:00Z`, er afsluttet med failure; genbekræftet efter genstarten.
- Exact-main sourcegate bestod 05:12:51–05:32:52 UTC. DMI-arbejdet løb cirka 05:35:50–06:24:17 UTC. Step-conclusion success under continue-on-error er ikke producentens terminale succesbevis.
- Begge WAM-familier fik behandlingstid: 44 forecast-assets i wam_dw og 44 i wam_nsb blev afvist transaktionelt med `operational WAM asset is not exact and complete`. Den præcise første afviste tuple/proveniens er ikke bevist af loggen.
- Tidligere loganalyse fandt efterfølgende `GRIB_PARAMETERS_UNRECOGNIZED`/parser-blocked for begge collections og producentens `MIXED_RUN_INTERPOLATION`. Den separate WAM-CLI fejlede med `CACHE_INVALID`. Det er forskellige kontrollag, ikke én bevist årsag.
- GRIB-, DMI-kandidat- og regional-cache-saves bestod før WAM-gaten. Strict READY active-promotion blev skipped. Copernicus/Open-Meteo-fill, closure, runtime, handoff og deploy blev ikke nået. Den senere røde Open-Meteo-terminal er sekundær efter skipped fill.
- Kandidaten findes stadig i GitHubs exact-key/ref-inventar: `dmi-zone-candidate-v1-Linux-2026-W37-118-preflight-34189720294-1`, id `7442401046`, main-ref, oprettet `2026-09-08T06:24:51.537740Z`, komprimeret 46.024.636 bytes. Det er eksistens, ikke tuplekomplethed eller ukomprimeret størrelse. Et GET på `/actions/caches/{id}` gav 404; det var ikke cachetabsbevis. Brug liste-endpoint med key/ref.
- Tidligere oneoff `34161930631` ved target `2026-09-07T21:00:00Z` beviste 79.414/79.414 strømpar: DMI 61.860, Copernicus 16.593, regional 944, Open-Meteo 17, missing 0, men fejlede senere Feggesunds bølger. Dette er ikke dagens aktuelle dækning eller komplet vejrbevis.

## Verificerede sammenhængende kodeproblemer

Henvisninger gælder uændret 4.0.334 og er ikke i sig selv produktionsbevis.

1. `scripts/update-dmi-bulk.py:8940` kræver alle relevante parent/PART-bølgetuples i ét asset. Et lokalt hul ruller hele filen tilbage, inklusive andre brugbare tuples. Historikbootstrap har samme all-target-krav ved 4666/4704. Normal drift bypasser denne stage-validator. Kræv fælles atomisk per-tuple-admission; parse/control-plane-korruption må stadig rulle den berørte transaktion tilbage.
2. `scripts/lib/dmi_wave_history_bootstrap.py:1307` genbruger native historikvalidering over hele operationelle bridge/prognose med global single-run-per-collection. Den kan ikke kreditere den godkendte Feggesund-proxy, som først dannes i `scripts/update-weather.mjs:1209`. Tidligere P2-only/native-proxy-vurdering er supersederet: operationel gate og slutruntime har modstridende acceptkontrakter. Brug samme operationelle direct-first/proxy-policy; native historisk replay forbliver separat og uden proxy.
3. Den globale operationelle single-run-regel skal afgrænses mod DEC-0119: forskellige eksakte timer med hver sit valide kildebevis er ikke cross-run-interpolation. Bevar same-run/grid/cell for faktisk interpolation og strict historisk migration. Ingen generel cross-run-interpolation eller blending er tilladt.
4. Cold-start-cache-first ved 4388 kalder på enhver `MISSING_CELL` reset_private_part_wave_cache ved 4285, som fjerner alle PART-bølgetuples, også uafhængigt gyldige timer og prognoser. Isolér kun konkret ubeviselige wave-enheder efter nyere granulær salvagekontrakt. Validatoren undersøger også wave-bearing rækker uden for krævet vindue; scope/salvage skal være eksplicit. Ingen global nulstilling.
5. Asset-catch ved 9100 fortsætter før recognized.update(found) ved 9163. Fuld coverageafvisning kan derfor blive ukendte-parametre-fejl ved 9344 og falsk parser-blocked/24 timer ved 9390 (PARSER_VERSION 20). Bevar aggregate parseevidens før rollback, adskil parserfejl fra tuplemangler, og gendan kun præcist dokumenteret gammel falsk blokering. Ikke generel cooldown-/cachesletning.
6. Normal process_grib ved 3933–4001 skriver ny Hs/periode og fjerner gammel retning, før komplet ny tuple/source er sikker. Bevar tidligere valideret tuple til fuld atomisk erstatning. Test samme admission i normal/oneoff, calm/zero-Hs-kontrakt og same-cell-valg.
7. Ved 8582 er same_processing altid false under operationel WAM-bootstrap; dermed undertrykkes processedSteps-genbrug, så gentagen prefixbehandling er mulig. Normal nonmarine-genbrug mangler DKSS-lignende exact asset/output-proof. Fjern ikke blot flaget: bind genbrug til collection/run/time/assetrevision/processing og reelle validerede outputs. Partial markers må ikke skjule huller; missing og hale før refresh.
8. Oneoffens WAM-gate ligger før DMI-residual og Copernicus/Open-Meteo; reusable build har samme placering ved 1051. Adskil inputintegritet fra availability: bølgemangler må ikke standse valid uafhængig currentindsamling/cachesave. Alle operationelle WAM/current/runtimekrav skal stadig bestå før handoff/artifact/deploy. Registry/ledger/target/source/hash-fejl forbliver fatale; ingen blanket continue-on-error.

## To åbne diagnoser – må ikke gættes

Det første WAM-afviste punkt/felt er ukendt. Den afsluttende uafhængige metadataaudit fandt ingen generel mismatch: initial_zone_records:8053 og native_component_source:3475 bruger samme sampling_identity; AssetStagedZone:2568 bevarer metadata; selector/MappingWaveAsset/raw capture bruger samme kanoniske assetidentitet, og optionalFieldSet følger retningstilstanden. Lokalt celle-/afstand-/retning-/captureproblem er muligt. Feggesund alene forklarer ikke NSB-afvisningen.

Tilføj aggregate-only afvisningstællere før rollback for manglende tuple, ugyldig retning, source-capture-fejl, assetmismatch og native-proveniensfejl samt genkendte parametre. Ingen rå værdier, koordinater, U/V eller komplette payloads i log/commit. Brug produktionsformet syntetisk asset gennem faktisk parser/proveniens/admission, ikke kun en håndlavet grøn validatorfixture.

CACHE_INVALID er ikke bevist størrelsesfejl/cachekorruption. CLI-loft er 256 MiB mod handoffets 768 MiB for DMI-filen og 4 GiB samlet. Manglende fil, størrelse, JSON og schema er sammenlagt til samme kode. Faktisk ukomprimeret størrelse er ikke målt. Tilføj bounded IO/size/JSON/schema-diagnostik og harmonisér kun lofter efter dokumenteret ressourcebehov; bevar hårde grænser.

## Samlet implementering og nødvendige fokustests

Én rettelse af wave-admission/genbrug/gateplacering, ikke ny providerarkitektur eller scoremodel. Ingen geometri, punkter, scoreformel, generel proxy eller current-kildeorden ændres. Copernicus/Open-Meteos gennemgåede target/source-stage/exact-residualkæde gav ikke grundlag for separat refaktorering.

- Valid plus missing tuple i samme fil: bevar valid del uden at overclaime missing; malformed parse rulles tilbage.
- Normal og oneoff: ufuldstændig ny tuple kan ikke erstatte tidligere valid tuple; én legacy MISSING_CELL kan ikke slette andre bølgetimer.
- To delvise kørsler fortsætter til hale; ændret assetrevision eller manglende outputs kan ikke skjules af processedSteps.
- Exact retained old/new-run accepteres efter operationel policy; cross-run-interpolation afvises.
- Feggesund følger præcis DEC-0114 direct/proxy/missing, 354/354; øvrige manglende bølger er ærlige huller.
- Genuine-cold-start genbruger kun faktisk verificeret historie/HISTORY_INCOMPLETE; strict migration lempes ikke.
- Parserblock versus coverageafvisning samt snæver persisted recovery; bounded fil-/JSON-/schema-diagnose.
- WAM-missing tillader valid currentfill/save, men ikke handoff/deploy; registry/ledger/hashfejl stopper stadig.

Derefter versions-/RDKS-/håndbogs-/changeloglukning, én fuld validate:source på PR'ens eksakte head i GitHub, sikker merge og main-oneoff med gemt kandidat. Ingen bypass eller gentagne brede lokale tests uden ny evidens. Kræv stadig 79.414/79.414 current, komplet operationelt vejr, Feggesund 354/354, spatial, kapacitet og fulde post-data validate/releasegate før publicering.

## Drift og model-online

Live-genbekræftet disabled_manually: update-and-deploy.yml og preserve-copernicus-current-shadow.yml. Watchdog blev deaktiveret under kontrolleret cutover for ikke at dispatch'e gentagne gange til disabled normalworkflow. Dette er midlertidig pause, ikke normal drift. Begge skal reaktiveres/observeres efter cutover; ekstern cron primær, GitHub schedule reserve, oneoff ikke permanent vedligeholder.

Efter komplet exact-main oneoff skal Phase A skabe den krævede moderne Candidate G-sourceidentitet på samme nye main før særskilt Phase B med exact oneoff-id/token. Direkte gammel offentlig Candidate G til Phase B er ikke gyldigt. Brug serialiseret kø, verificér hver accepteret run/head. Planlagt Phase A force=false, fordi Candidate G-buildvejen selv tvinger nødvendig update. Revalidér live kø, central source og gatebetingelser ved udførelse; åbn ikke bred cron-dispatch midt i overgangen. Slutkontrol omfatter offentlig model, 210/673, current/femdøgn, begge modes og desktop/mobil; derpå normal vedligeholdelse.

## Lokal genoptagelse og model

Efter genstarten manglede npm på PATH. Installeret Node: `C:/Users/Lenovo T14/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`. `node scripts/validate-rdks.mjs` bestod for 4.0.334. Det er kort dokumentationskontrol, ikke source-/produktionsgate. Runtime-shims kun i systemtemp, aldrig stages.

Astra/Ultra-helhedsaudit er afsluttet ved denne sikre grænse. Næste anbefaling er GPT-5.6 Sol / Ekstra høj til den afgrænsede DMI-cacheimplementation, fokustests og kritisk integration. Første konkrete runtimeafvisning skal stadig instrumenteres/bevises. Terra først til ren overvågning eller mekanisk dokumentation. Selve WAM-rettelsen er endnu ikke implementeret.
