# Astra: model og samlet launchvej efter grøn backend

Dato: 2026-09-09. Selve gennemgangen var en read-only audit af produktionskoden uden kode-, workflow-, backend-, cache-, geometri- eller modelændring. Rapporten indgår efterfølgende som dokumentation i 4.0.340-releasepakken; dens auditøjeblik var ikke i sig selv et commit eller deploy.

## Konklusion

Ingen ny konkret fejl fundet i selve scoreberegningen, state/recovery, partial-history-kontrakten eller de gennemgåede backend-/Pages-overgange. Tre målrettede lokale modelprøver er grønne. Dette er ikke et end-to-end-produktionsbevis eller en garanti for alle ukendte fejl.

Der blev fundet en konkret forskel mellem den oprindeligt godkendte first-cutover-størrelsesgrænse og den faktiske publisher. Ejeren har efterfølgende afklaret den ved udtrykkeligt at godkende Supabases officielle Free-grænse på 52.428.800 byte for denne ene launch. En separat UI-fejl ved afvist turstart kan vente til efter launch. Den aktive oneoff må fortsætte og gemme sin fremgang; intet fund begrunder at nulstille data eller aflyse den.

## Eksakt grundlag og eksisterende bevis

- Main: `b0ca7f5d8a30bce3eb202ee8301fb29f69c25f24`. Lokal HEAD: `691a72fd81c16c1bd737d81f62f1dc1fd2a2e9d2`. Begge har Git-tree `5ec1bbf15f80ed52d2b7ca0e8cf1ccb867a81906`; main-træet blev verificeret via GitHub Git Commit API. Audit er derfor ikke af et løst udrullet udkast.
- Exact-head source-CI `34368512573` er SUCCESS på `691a72fd`, inklusive sourcekontrakter/releasegovernance. Den store kildegate er ikke gentaget.
- Backend `34371639398`, attempt 2, er SUCCESS på samme main, inklusive migrations-, D1-, Edge- og protected-readiness-kæden. Den tidligere forbigående loginfejl er dokumenteret særskilt i CURRENT_SESSION_HANDOFF.
- Oneoff `34371642565` er ved auditens seneste snapshot stadig aktiv i `Fill only the exact operational DMI gap seal`; et aktivt trin er ikke komplet vejr-/handoffbevis.
- Modellen ligger i `js/core/ravscore-integrated.js`, med identitet `RRS-COASTAL-PROCESS-INTEGRATED-1.1.0` og state `6.0.0` i `js/core/ravscore-model-contract.js:12`. State/recovery og produktionsadaptere ligger i de tilsvarende `js/core`- og `scripts/lib`-moduler.

## Verificerede grænseflader

1. `js/core/ravscore-integrated.js:392` skelner direkte input fra historik. Ugyldig strøm, vind eller fysisk bølgeinput er UNAVAILABLE. Gyldige direkte input med HISTORY_INCOMPLETE giver konservative numeriske lower/upper-bounds, forklaring og kalibrering fra. Waders-loft anvendes på begge viste grænser. Ingen scoreformel ændret.
2. `scripts/lib/ravscore-production-part-pipeline.mjs:87` bruger verificeret recovery før target og samme scoretider i integreret model og det separate private Candidate G-orakel. `scripts/lib/ravscore-production-adapters.mjs:820` projicerer continuation fra den valgte scores tidspunkt, ikke ukritisk sidste fremtidstime.
3. `scripts/lib/ravscore-integrated-runtime.mjs:55` afviser forkert Open-Meteo-klassificering og holder kalibrering lukket for combined-current/proxy-input. Komponenter eller kilder ommærkes ikke for at gøre modellen klar.
4. `js/services/data-service.js:180` kræver schema 4, 210/673, de fire offentlige filbindinger og eksakt modelbundle. `:364` accepterer HISTORY_INCOMPLETE. En gyldig ældre pakke vælger korrekt senere UTC-time fra samme hashbundne prognose i stedet for at blive afvist alene på alder.
5. `scripts/audit-ravscore-integrated-public-runtime.mjs:1020` kontrollerer target til target+117 og begge jagtformer; `:1087` kræver nul utilgængelige zone/mode-timer. Færdig strømclosure alene erstatter ikke WAM/Feggesund og samlet runtimekontrol.
6. `scripts/integrated-cutover-readiness.mjs:1112` genkontrollerer protected exact-head/model plus live DB/Edge. `scripts/ravscore-operational-activation.mjs:3791` bruger kontrollen før planen. Et tidligere grønt backendrun står ikke alene.
7. `reusable-weather-build.yml:1514` kræver fulde datagates før beskyttet publicering. Godkendt measured warmup har eksplicit checkpoint-N/A; manglende rollback-READY er ikke automatisk en first-cutover-blokker.
8. `reusable-pages-deploy.yml:330`, `:399` og `:540` binder begin-CAS, offentlig readback og complete. `:590` håndterer afbrudt overgang efter observeret identitet. Public verifier kontrollerer faktisk manifest, data, hashes og frontendimplementation; ren grøn buildstatus er ikke offentlig launch.
9. Service worker bruger frisk manifest og indholdsadresserede data; frontendkode er network-first. Edge-bindingkonflikt giver lokal forklaring, ikke blandede modelscorer. Første virkelige browser-/mobilindlæsning mangler stadig og kan ikke erstattes af denne læsekontrol.

## F1: godkendt bytegrænse er ikke den faktiske uploadgrænse

Status: konkret kontrolgab; ingen faktisk overskridelse observeret. Afklares før first-cutover-dispatch, ikke skjult som et rent dokumentationskomma.

- `scripts/private-production-runtime-workflow.mjs:144` kræver højst **50.000.000 byte** for DEC-0122-undtagelsen.
- `scripts/protected-private-production-runtime.mjs:41` bruger **50 × 1024 × 1024 = 52.428.800 byte** som generel archivegrænse.
- Oneoff måler med den rigtige archivebuilder (`private-production-runtime-workflow.mjs:802`), men handoff forsegler sourcecacher, ikke den senere produktionsbundles præcise bytes. Produktionsbundlen genbygges.
- Cutover kalder publisheren i `reusable-weather-build.yml:1731`; publisher `:545` bygger, archivekontrol `:242` bruger den større grænse, og `:566`/`:582` uploader uden en yderligere decimal 50-MB-kontrol.
- Der er ingen eksisterende CLI-dry-run/maksbytesparameter eller pause, som kan måle netop den fremtidige genbyggede archive før dispatch. En god oneoff-margin er nyttig størrelsesevidens, men ikke håndhævelse af den godkendte materielle grænse.

Næste beslutning: håndhæv den godkendte grænse i den faktiske produktionssti med målrettet grænsetest før upload, eller få en udtrykkelig ejerbeslutning om ændret materiel grænse. Ingen automatisk udvidelse, bucketændring eller deploy i denne audit. Rettes kode, gælder normal exact-head-, version-, handoff- og releasekontrakt fortsat; eksisterende cachefremgang skal bevares.

## F2: turstart kan afvises uden synlig forklaring

### F1-afklaring efter ejerens opfølgning

Supabases officielle Studio-kode på commit `a96a587f65f317ae56d4ff3d403e36d0d61a8473`, `apps/studio/components/interfaces/Storage/StorageSettings/StorageSettings.constants.ts:1`, definerer Free-grænsen som `50 * 1024 * 1024` og kalder den i kommentaren 50 MB. Det er 52.428.800 byte / 50 MiB. Vores generelle publishergrænse følger derfor Supabases officielle kodekonstant; DEC-0122's særskilte decimalgrænse er den lavere. Dette er officiel kodeevidens, ikke live-readback af netop projektets konfiguration.

Ejeren godkendte derefter udtrykkeligt alene denne ene launchs maksimale archive på 52.428.800 byte. Det ændrer ingen kode, kildegate, handoff, cache eller kadence; oneoffens eksisterende strengere 50.000.000-kontrol består fortsat som nødvendig producentgate. Ingen faktisk for stor archive er konstateret.

Officiel kilde: https://github.com/supabase/supabase/blob/a96a587f65f317ae56d4ff3d403e36d0d61a8473/apps/studio/components/interfaces/Storage/StorageSettings/StorageSettings.constants.ts#L1

### UI-fundet

Status: konkret afgrænset UI-feedbackfejl, ikke fejl i områdeprognoserne og ikke grund til at kassere oneoff.

Ved senere timeprojektion fra en ældre pakke har zonevinderne aktuelle individuelle scores; andre kystdeles gamle snapshots afvises bevidst som aktuelle (`data-service.js:659`; regression `test-ravscore-public-data-service-binding.mjs:608`). Dette kan ske allerede ved første launch fra en flere timer gammel oneoff.

Start ravtur tilbyder stadig alle dele. Ikke-vindende del for valgt jagtform kan derfor afvises i `trip-evidence-public-adapter.js:130`. Dialogen lukker før valideringen (`trip-evidence-dialog.js:323`), og fejlteksten ender kun i `#tripStatus` (`app.js:320`), som er visually-hidden (`index.html:17`). En seende bruger kan opleve, at turen ikke starter uden nogen forklaring.

Bevar afvisningen af stale snapshots; gør fejlen synlig eller begræns valget til reelt gyldige snapshots i en efterfølgende afgrænset UI-rettelse. Kort, område-/femdøgnsprognoser og Konto → Indberet tur eller fund er separate og ikke gjort utilgængelige af dette fund. Ingen UI-ændring udført.

## Lokale målprøver

- `node scripts/test-ravscore-integrated-model.mjs`: bestået.
- `node scripts/test-ravscore-integrated-generator.mjs`: bestået.
- `node scripts/test-ravscore-recovery-replay.mjs`: bestået.

Generatorprøvens første forsøg blev stoppet af Windows Store-Pythonaliaset (exit 9009), ikke en reproduceret modelfejl. Genkørsel med den allerede installerede Python-runtime forrest i alene testprocessens PATH bestod. Ingen installation eller permanente systemindstillinger ændret. Ingen ny stor sourcegate, providerhentning eller produktionswrite i auditen.

## Tilbage før og efter launch

Før launch: luk F1's materielle grænse; terminalt grønt exact-main-handoff, 79.414/79.414 currents og WAM/Feggesund 354/354; fulde produktions-/privacy-/kapacitetsgates; offentlig readback og kontrolleret aktivering; første reel browserkontrol. Ingen garanti for ekstern oppetid eller empirisk højere fundpræcision.

Efter launch: tabsfri cachetransport og bæredygtig almindelig cron/watchdog-vedligeholdelse, kildeattesteret 48h-Open-Meteo-historik, gammel-rest-prioritet og F2. Hyppig automatisk drift er ikke godkendt alene ved et grønt engangsdeploy.

Første dispatch må kun bruge `update-and-deploy.yml` på eksakt main, `ravscore_integrated_first_cutover=true`, den eksisterende eksakte bekræftelsestoken og det konkrete succesfulde handoff-run-id. `force` og andre operationsflag er false. Den må ikke startes automatisk, før ovenstående grænse er afklaret.

Astra-gennemgangen er afgrænset og afsluttet; Sol / Ekstra høj er passende til næste afklarede implementerings- og integrationsafsnit. Ukendt ny systemisk fejl vurderes på ny.
