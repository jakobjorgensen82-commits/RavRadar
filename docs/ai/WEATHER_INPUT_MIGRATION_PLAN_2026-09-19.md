# Afgrænset input-/state-migrationsanalyse

Dato: 2026-09-19. Read-only analyse med dette notat som eneste ændring.
Ingen SQL-generation, migration, produktionskald eller release udført.
Dette er en integrationsplan, ikke et bevis for gennemført migration.

## Verificeret udgangspunkt

- Repositoryets 4.0.429/`4bee5b0d` har integrated modelBundle
  `b114d226425eefd6b7a3c8280fb19982c312f0d88d2f9351c7dc6cbc4ece8c38`.
- En read-only closureberegning viser uændret modelContract, men ændret
  modelBundle. Ændrede closurefiler på analysetidspunktet er
  `js/core/public-delivery-contract.js`, `scripts/lib/dmi-forecast-store.mjs`,
  `scripts/lib/ravscore-production-adapters.mjs` og
  `scripts/public-conditions-lib.mjs`. De matematiske state-/scorefiler er
  uændrede. Sluthashen er med vilje ikke frosset.
- Den faktiske private forgænger skal stadig identificeres gennem central
  descriptor: sourceHead, dataset, contenthash, tidsreference og bindings.
  Det gamle `POST_CUTOVER_PREDECESSOR`-eksempel i migratoren er ikke den
  dynamiske workflows faktiske kildevalg.

## Eksisterende genbrug og begrænsninger

`deploy-code-only-repair.yml` beskriver den aktuelle private generation,
arkiverer dens præcise sourceHead, danner gammel restore-expectation og
restorer/unpacker med den gamle læser. Denne del kan genbruges.

`migrate-post-cutover-private-runtime.mjs` er derimod IKKE en generel
inputmigration. `validateAndMigrateConditions` skifter modelmetadata,
validerer gammel og ny state og tillader kun to gamle last-mile-bound-
reparationer. Den kører ingen historiske vejrinput gennem modellen.
Candidate G-state skal være uændret, og de otte andre private filer end
conditions kopieres byte-identisk. Det beviser ikke, at ny inputsemantik
giver samme historik.

`buildRavScoreRecoveryReplay` starter efter `initialState.time`; den kan
ikke rette allerede konsumerede timer. Dens maksimum er 72 timer fra et
initialt checkpoint; cold replay er 48 timer. Same-time bølgeændring
afvises konkret af `ravscore-wave-mobilisation-state.js`, hvis den nye
energi ikke svarer til den gemte. Konfliktkontrollen må ikke fjernes.

`prepare-code-only-public-runtime.mjs` renderer gemt conditions, men
genberegner ikke historisk state. Dens code-only/contract-rebind kræver
uændret indhold; last-mile-repair kræver uændret vejr. Saved-weather
publicerer en allerede bygget nyere privat generation. Ingen af dem er
alene en bølgeinputreparation.

`validateSameReferencePrivateRuntimeSuccessor` i
`protected-private-production-runtime.mjs` kræver samme dataset/tid,
uændrede measurements/Candidate-state og uændrede øvrige private filer.
En virkelig inputkorrektion må ikke sendes som dette kosmetiske rebind.

## Mindst indgribende korrekte overgang

1. Bevar/valider den præcise gamle private pakke med gammel læser før nogen
   ombinding. Bevar også tilgængeligt checkpoint før en historisk ændring.
2. Lav en snæver komponent-/PART-/time-inventering: uændret dokumenteret
   input, historisk ændret valgt input eller uklar gammel periodesemantik.
   Original hashverificeret GRIB kan bevise peakidentitet; et nyt label
   alene kan ikke. Bevar vind/strøm og andre uberørte komponenter.
3. Ny leverandørprioritet gælder fremad fra den fastlagte grænse. Den må
   ikke alene omskrive allerede attesteret valgt fortid. Hvis ny behandling
   giver præcis samme valgte historiske input og statealgoritmerne er
   uændrede, kan et snævert bevis tillade state-rebind til ny bundle uden
   nulstilling. Beviset skal være mere end strukturvalidering.
4. For hver faktisk historisk korrektion findes første ændrede time. Brug
   en valideret state STRICT før den time og replay det korrekte suffix
   gennem eksisterende part-pipeline. Begge spor påvirkes af Hs²×T:
   integrated mobilisation/last-mile og den private Candidate G-mobilisation.
   Man må ikke bevare den gamle Candidate G-state som om input var uændret.
5. Kildevinder vælges komponentvis før recovery-union. Genbrug
   `buildRavScoreProductionPartSeries` / `buildRavScoreRecoveryReplay` og
   de eksisterende state-/scorefunktioner; behold tvetydighedsafvisning.
   Genberegn afledte score-, zone-, readiness- og publicprojektioner.
6. Hvis der ikke findes en troværdig state før ændringen og tilstrækkelige
   råinput, kan præcis historik ikke genskabes ud fra en senere EWMA-state.
   Kun berørte dele må da få den allerede definerede bounded cold replay
   med ærlig usikkerhed; ikke en global reset eller påstået komplet historik.
   En 48-timers replay er ikke bevis for uændret 12-døgns bølgefortid.
7. Foretræk en reel nyere produktionstime og ny afledt generation, hvis
   gemte gyldige input dækker den. Det genbruger den almindelige monotone
   private-publicering og kræver ikke providerhentning i sig selv. Det må
   ikke ske ved kunstigt at omdatere gamle værdier. Hvis samme time er
   nødvendig, kræves en ny præcis input-repair-kontrakt gennem publisher,
   public-preparation og handoff, ikke udvidelse af CONTRACT_ONLY_REBIND.
8. Når input/state-overgangen er bestemt: generér begge endelige bundles,
   bind checkpoint/SQL/schema/installer og verificér gammel→ny overgang.
   Installer databasekontrakten før ny checkpointpublicering. Byg/gem én
   konsistent ny privat runtime+checkpointgeneration, publicér artifact med
   varig begin, verificér exact target og afslut central tilstand. Først
   derefter må normalruten være afhængig af den nye bindings restore.

## Åbne, konkrete beslutningsdata

- Findes PP1D/MWP-feltbevis for de faktisk konsumerede gamle bølgerækker?
- Hvilke valgte PART/timer ændres numerisk eller fra valid til ukendt?
- Findes en state før første berørte time samt tilstrækkelig replayhistorik?
- Kan en aktuel nyere reference bygges fra gemte inputs uden providerkald?

Ingen af disse fire spørgsmål besvares af den grønne schema-4→5-test.

## Efterfølgende afgrænset routingrettelse

Efter særskilt opdrag er den rent tekniske routingkant implementeret:
`MODEL_BINDING_METADATA_ONLY` bestemmes ud fra det fulde verificerede
før/efter-diff, hvor kun genkendte modelBundle-metadata må være ændret.
Den vælger eksisterende streng `code-only-reuse`; faktiske verificerede
last-mile-stateændringer beholder `MODEL_BINDING_MIGRATION` og repair.
Ingen ny code-only-undtagelse for ændret vejr, state eller historisk input
er indført. Same-time-publisher accepterer den nye præcise klassifikation
uden at kræve en opdigtet Candidate G-bundleændring. Dens øvrige krav om
uændrede measurements, Candidate-state og cachefiler er bevaret.

`test-post-cutover-migration-routing.mjs` består med små syntetiske data:
metadata-only/uændret score, reel last-mile-repair, afvist vejrændring,
afvist ukvalificeret scoreændring samt publisherens cache-/statekrav.
Det er ikke en implementering af den store wave-inputmigration ovenfor.

## Afgrænset offline replayhelper

`scripts/lib/ravscore-wave-input-migration.mjs` er nu implementeret uden
workflow- eller producerintegration. Den indeholder tre funktioner:

- `classifyPeakPeriodInputChanges`: sammenligner faktisk valgte rækker for
  ét præcist PART/punkt/timeinventar. Kun periodetallet og kvalificeret
  bølgeproveniens må korrigeres. Udokumenteret gammel bølgetuple kan
  eksplicit fjernes; kvalificeret eksisterende tuple må ikke erstattes af
  tomt. Vind, strøm, temperatur, vandstand, højde og retning ændres ikke
  ad denne vej (bortset fra samlet fjernelse af ukvalificeret bølgetuple).
- `planPeakPeriodStateMigration`: afgrænser første ændrede time og kræver
  model-/punktvalideret integrated+Candidate G-state med fælles tid strengt
  før ændringen samt hver verificeret historisk current/wave-time frem til
  target. Manglende state/suffix giver kun lokal affected-PART cold replay.
  Ukvalificeret råevidens afvises; den kamufleres ikke som missing.
- `replayPeakPeriodStateMigration`: kalder eksisterende fælles part-pipeline
  for begge spor. Den returnerer kun stateparret ved præcis H0 som target-
  continuation, ikke state ved forecastslut. Uberørt PART giver null series,
  så kalderen skal bevare dets state. Oprindelige objekter ændres ikke.

`test-ravscore-wave-input-migration.mjs` består med ét syntetisk PART og
ca. to døgns rækker: reel periodekorrektion ændrer begge mobilisationsspor;
checkpoint efter ændringen afvises som seed; manglende suffix/seed giver
målt lokal cold replay; historiske huller forbliver i lineage; 48 timer
påstås ikke at være præcis 12-døgnshistorik; ukvalificeret PP1D, råstrøm,
dobbelt time og uvedkommende vejrændring afvises. Ingen providerkald.

Integrationsgrænse: kalderen skal stadig levere den præcise gamle pakke og
et statepar fra SAMME verificerede beskyttede generation. Helperen beviser
ikke på egen hånd pakkeoprindelse eller original GRIB-bytes; correctedRecord
skal komme fra den autoriserede decoder/selector, ikke fra nye selvskrevne
labels. Den ændrer ingen modelBundle, caches eller publicering. Den er
snævert til DMI-peak-korrektion; anden fallback/proxykvalifikation udvides
ikke. Normal integration skal kalde den før generel initial-state-selection
ellers vinder den gamle state stadig. Zone-/artifact-/checkpointopbygning
skal bruge det nye målte resultat. Source-/modelclosure og SQL er fortsat
ufrosset; ingen fuld produktionsmigration er gennemført.

## Producerens konkrete integrationssnit

`preparePeakPeriodProductionTransition` er tilføjet i samme helper. Den
returnerer et samlet `pipelineOptions`-objekt til den eksisterende
`buildRavScoreProductionPartSeries`; begge state-spor og deres cold/warmup-
markører skiftes atomisk. Den ændrer hverken scoreformler eller modelBundle.
Den seneste måltest kalder den reelle part-pipeline med dette objekt og
sammenligner begge H0-continuations med det korrekte suffixreplay.

Det præcise snit i `scoreCoastalPartsRuntime` er efter materialisering af
`hourly` og alle recovery-rækker, men før kaldet til
`buildRavScoreProductionPartSeries`:

1. Behold de nuværende initialSelection/Candidate G-valg samlet som
   `currentPipelineOptions`; bland aldrig et rettet integrated seed med
   gammel Candidate G-state.
2. For et PART med en faktisk verificeret inputovergang kaldes helperen
   med `previousRecord`, `correctedRecord`, `previousProductionReferenceAt`,
   `targetReferenceAt`, `currentPipelineOptions` og tilgængelige
   `preChangePairs`. Recordparret skal dække det samme præcise inventar.
3. Brug returneret `pipelineOptions` som ét samlet spread i det eksisterende
   pipelinekald. Bevar `part`, `zone` og de eksisterende native-cadence-
   resolverfunktioner. Helperens recoverySources må ikke efterfølgende
   unioneres med de ukorrigerede deployed/progressive-kilder.
4. Brug det samme korrigerede H0/future-record i partRows, sourceAgeHour,
   flowPoints og publicprojektion, så en korrigeret score ikke ledsages af
   gamle vejrdata. Normal zone-/readinessopbygning genbruges.

Forskellen mellem allerede konsumeret og nyt input afgøres ved det fælles
statepars tid, ikke alene ved target-timen. Ændringer efter stateparret
er nye bridge-/forecastinput; begge gamle states bevares og den almindelige
pipeline konsumerer de nye rækker. En bølgeændring på eller før stateparret
kræver et par strengt før ændringen, ellers kun berørt PARTs bounded cold
replay. Andre ændringer på eller før stateparret (herunder strøm, vind,
vandstand, temperatur eller deres proveniens) afvises fra peak-ruten; de
kan ikke kaldes kosmetisk metadata eller skjules i et bundle-rebind.

Samme produktionstime giver ikke en ny publiceringsret: selv future-only
inputændringer kan bevare H0-state, men bryder publisherens uændrede-
measurements-kontrakt. Assistenten afviser derfor ændrede valgte rækker ved
samme time. En reelt nyere dækket time kan bruges; gamle værdier må ikke
omdateres. Offline replayhelperen kan fortsat analysere samme time uden at
publicere noget.

### Verificerede forberedelsesbegrænsninger

Det eksisterende `deployedRecoverySource` er IKKE det gamle faktisk valgte
input. Det bruger gammel bulkcache med den NYE `bulkZoneToForecastRecord`,
den NYE `liveCurrentPilot` og de NYE komponentbanker/adapters. Desuden
starter source-vinduet efter den valgte state og kan derfor ikke afsløre
en ændring i allerede konsumeret historie. Den må ikke bruges som før-
record til denne migration.

Den beskyttede `conditions.json` gemmer H0/future-weather og H0-statepar,
men ikke det rå tidligere konsumerede suffix. Gamle input skal genskabes
med præcis forgængerkode og dens beskyttede caches/kildevindere, og hvor
det ikke kan bevises, kan eksakt historik ikke påstås. Original GRIB er
fortsat ikke fundet lokalt; ingen reel berørt PART-/timeoptælling er lavet.

96-timers-reglen er fremadrettet kildevalg. Et gammelt DMI-kildestempel
er ikke i sig selv tilladelse til at genfortolke gammel konsumeret strøm,
eller til at slette en stadig gyldig historisk værdi. Numerisk/proveniens-
ændret valgt historik skal med i overgangens inventar og eventuelle replay.
Manglende originalt modelRun må ikke erstattes af fetchedAt.

Helperen accepterer ikke gammelt modelBundle som nutidig state. En separat
kontrolleret bro kræver gammel læsers validering af den præcise beskyttede
generation, uændret faktisk statealgoritme og bevis for uændret input frem
til hvert genbrugt seed. Først derefter kan bindingmetadata flyttes og den
nuværende statevalidator bruges. Det bevis er endnu ikke implementeret.

Status: producer-assistenten og afgrænsede integrationstests er lokale og
grønne. Rootcallsite, verificeret predecessor-inputeksport, bundlebro og
egentlig leveringsmigration er fortsat ikke færdige. Ingen workflow-, SQL-,
provider- eller produktionshandling er udført i dette snit.

## Implementeret beskyttet forgængereksport – ikke en opdigtet bundlebro

`scripts/export-protected-predecessor-inputs.mjs` er nu en afgrænset privat
eksportkommando. Den tager `--private-root`, `--bundle`, `--predecessor-root`,
`--predecessor-descriptor`, `--expected-source-head`, `--output` og eventuelt
`--repository-root`/`--now`. Den bruger den præcise gamle archives bundlelæser
til descriptor/model/manifest/tid/inventar/alle filhashes. Den gamle
continuationimplementerings hash sammenlignes desuden direkte med den
forseglede generations contracthash. Output skal ligge i privat mappe uden
for repositoryet, bundle og kildearkiv, og eksisterende output overskrives
ikke. Stdout indeholder kun den payloadfri optælling.

`scripts/lib/protected-predecessor-inputs.mjs` validerer conditions-bytes mod
manifestet igen og eksporterer for hver faktisk del:

- den præcise gamle H0/future `weather`-projektion, uden at indsætte U/V,
  bølgeproveniens eller gamle timer, som ikke findes;
- integrated+Candidate G-state fra samme H0, valideret af den gamle læser;
- oprindelig kildecommit, generation, modelbinding, conditionshash og
  stateparhash;
- `rawSelectedInputRecord:null`, `RAW_HISTORY_NOT_PERSISTED`,
  `inputEquivalenceProved:false` og `affectedByPeakCorrection:null`.

Eksporten bevarer den gamle states bevis og binding uændret. Den ombinder
ikke til den nye parserkontrakt, erklærer ikke alle dele berørt og nulstiller
ingen dele. `requirePersistedRawPredecessorRecord` afviser eksplicit, at den
begrænsede scoreprojektion bruges som kvalificeret rå replayhistorik.

Den afgørende verificerede mangel ligger i den gamle producent:
`scoreWeatherProjection` i `ravscore-integrated-runtime.mjs` gemmer kun
projekteret vejr, inklusive komprimeret current-proveniens; U/V og eksakt
wave-source følger ikke med. `buildIntegratedPartPublicProjection` gemmer
kun scorede timer fra H0 og frem, og kun H0-continuation beholdes. Hverken
en senere rå DMI-cache eller den nye provider-ownership-historik er en
journal over tidligere konsumeret bølgeinput. En fjern GRIB-cache, der endnu
ikke er hentet/verificeret, kan ikke tælle som dette bevis.

Derfor er selve historiske bundlebro stadig uafklaret: bevaret gammel
binding+state kan bruges som forgængerevidens, men kan ikke bare få nyt
PP1D-stempel. Hvis berørt PART/historisk input kan bevises, bruges præcis
pre-change replay hvor beviserne findes; ellers fremadrettet bounded cold
for netop den berørte del. Manglende journal alene er ikke grund til blind
673-dels nulstilling. Der er ikke opfundet en berørt optælling.

`test-protected-predecessor-inputs.mjs` består med ét lille syntetisk
statepar og ægte gamle validatorer: eksakte gemte værdier/states bevares,
ændrede bytes/generation/model/par/H0 afvises, og manglende råhistorik kan
ikke bruges som replaybevis. CLI syntax er kontrolleret. Eksporten er endnu
ikke kørt på privat produktion, og ingen ny privat runtimepayloadfil eller
fremtidig inputjournal er føjet til 9+1-inventaret. Journal kræver særskilt
koordineret scope/retention/størrelses-/restorekontrakt før implementering.

## Snæver afklaring af gammel PP1D/MWP-identitet

Verificeret direkte i `git show HEAD:scripts/update-dmi-bulk.py` fra
4.0.429/`4bee5b0d`, ikke udledt fra den nye decoder:

- linje 374 og `classify_parameter` ved 3568 accepterer både PP1D og MWP
  under samme `dominant-wave-period`; collection vælger kun wave-family.
- `process_grib` ved 5586 læser messages i filorden. Tildelingen ved 5881
  erstatter kandidatlisten for samme alias/PART, når en senere message har
  gyldige kandidater. Den sidst kvalificerede periodebesked kan derfor vinde.
- `native_component_source` ved 5487 gemmer grid/model/time, itemId,
  assetIdentitySha256 og contentSha256, men ikke periodens shortName,
  paramId, indicatorOfParameter eller message-position.
- URL-hashen ved 1316 identificerer hele GRIB-assetet. `grib_asset` ved 736
  vælger en GRIB-datafil ud fra assetrolle/type; titel/URL er ikke en bindende
  specifikation af den senere valgte periodebesked.
- `gribFieldInventory`/`persistentFieldInventory` ved 5630 er collection-
  summeringer på tværs af messages/aktiver. De beviser sete felter, ikke
  det valgte felt for et bestemt asset, PART og gyldig time.

Cachemetadata alene kan derfor ikke kvalificere gammel peak-semantik.
Næste minimale read-only evidens er den faktiske gemte fjern-GRIB-cache:
find de unikke sourceassets, som de relevante gamle wave-rækker henviser
til, og match byteantal/contentSha256 mod både native source og cache-
manifest. Undersøg periodemessages i original rækkefølge og deres gridvalg;
sammenlign det gamle faktisk valgte periodetal med PP1D fra samme asset.
Et bredt nyt providerdownload er ikke nødvendigt for dette første bevis.

Scope afgrænses først til disse waveassets og de PART-/native-times, der
faktisk bruger dem. Interpolerede timer kræver begge native endpoints;
Feggesunds godkendte waveproxy kræver de faktiske to donorers endpoints.
Vind, strøm, vandstand og temperatur påvirkes ikke alene af dette aliasfund.
Hvor PP1D og gammel valgt periode faktisk er identiske, er der ingen
numerisk perioderettelse; det er stadig ikke automatisk bevis for al ældre
konsumeret historie. Anderledes periode eller manglende kvalificeret PP1D
markerer konkret påvirket waveinput, ikke automatisk alle 673 states.

Selv korrekt rå GRIB beviser ikke alene hvilke gamle rækker en endnu ældre
stategeneration konsumerede. Den beskyttede generation og dens parser skal
stadig kobles til valgt input/state-tid. Raw-cacheinspektionen er derfor den
næste nødvendige afklaring, ikke en allerede opfyldt migrationsgodkendelse.
Der er ikke lavet yderligere abstrakte helpers, ny statejournal eller reset.

## Konkret read-only evidensinventar efter genstart

Kontrolleret 2026-09-19 uden providerkald, dispatch, dataændring eller upload.
Berørte gamle PP1D/MWP-rækker er fortsat **ikke optalt**: manglende bevis er
ikke en optælling på nul og ikke tilladelse til at nulstille alle 673 dele.

### Hvad der faktisk findes lokalt

- `.tmp-420/support-current/RavRadar-support-2.zip`: 13.803.498 bytes,
  1.951 ZIP-entries.
- `.tmp-420/helikopter-354166/support/RavRadar-support-7.zip`:
  13.896.204 bytes, 1.967 ZIP-entries.
- `.tmp-420/pages/extracted/data/live/public-condition-details.json`:
  146.966.250 bytes; tilhørende offentligt manifest: 63.865 bytes.
- Udpakkede safe-acquisition-planer, current-stage-trace, runtime-audit,
  operational-controls og validation-rapporter fra run 35416641052.

Begge supportarkivers fulde entry-inventar er læst: ingen rå
`dmi-bulk-cache.json`, `asset-manifest.json`, private `conditions.json`,
private runtime-diagnostik eller GRIB-filer. De to safe-planer, current-trace,
offentlige details og offentligt manifest er desuden gennemgået med
payloadfri nøgleoptælling: ingen `itemId`, `assetIdentitySha256`,
`contentSha256`, `rawContentSha256`, `nativeValidTime`, `modelRun`,
`wavePeriodSemantics`, `wavePeriodField`, feltinventar eller bevaret
continuation-state. De kan derfor ikke afgøre, hvilken periodebesked der
blev valgt. Ingen private værdier eller koordinater er udskrevet.

### Hvad GitHub-metadata konkret beviser

Sidste provider-run `35416641052`, attempt 1, er afsluttet med failure på
`a2d03d95fa35fa86153a6ddeeb1d60d60333e266` (4.0.428), ikke på den nye
4.0.429-kode. Dets seks ikkeudløbne artifacts er support-7 og de fem små
safe-rapporter. Artifact-digesten for support-7 er hash af GitHubs ydre
artifactarkiv, ikke automatisk hash af den indre lokale support-ZIP.

De små artifacts fra saved-weather-run `35421108551` er recovery
`10577698127` (62.117 bytes) og handoff `10576743686` (28.546 bytes).
Workflowets handoff-inventar indeholder offentlig manifest/binding,
kodebundle, verifikationer og segl; ikke originalt bølgeinput eller rå
GRIB. De kan understøtte generationens deploy-/modelidentitet, ikke
erstatte manglende native kildebevis. Run `35419876748` har ingen artifacts.

Cache-listen giver følgende præcise indgange på `refs/heads/main`:

| Cache-id | Eksakt key | Gemte bytes |
| --- | --- | ---: |
| 7870074848 | `dmi-zone-candidate-v1-Linux-2026-W38-normal-35416641052-1` | 5.785.691 |
| 7870072691 | `dmi-grib-v4-Linux-2026-W38-35416641052-1` | 1.968.654.353 |

Kaldets oprindelige workflow på `a2d03d95` er læst direkte med `git show`:
den første key gemmer `.cache/dmi-candidate-progress.json`, den anden
`.cache/dmi-grib`. Normal scoreproduktion i dette run læser netop candidate-
cachen. Det er et konkret spor, men det fejlede runs kandidat er ikke i
sig selv bevis for en publiceret beskyttet generations konsumerede input.
Listen indeholder ingen member-hashes, indre assetmanifest eller filbytes.

### Mindste manglende adgang og næste bevis

Den lokale `gh cache` har kun list/delete. Den dokumenterede
[GitHub REST-cache-API](https://docs.github.com/en/rest/actions/cache)
tilbyder cachemetadata, men ingen indholds-downloadroute. Dette er en
afgrænset adgangsmangel i den undersøgte CLI/API, ikke et bevis for at
originalerne er tabt eller umulige at eksportere med en godkendt runner.

Næste nødvendige skridt er en **beskyttet read-only indholdseksport** af
den præcise 5,8 MB kandidatcache, eller den beskyttede produktionsgenerations
tilsvarende DMI-cache. Derefter skal dens faktisk refererede waveassets
matches mod `asset-manifest.json` og originale hash-/bytebundne WAM-assets
i den præcise GRIB-cache. Start med kildeinventaret; der er ikke grundlag
for at hente alle ca. 1,97 GB blindt. Selektiv udtræksadgang er endnu ikke
verificeret. Originaler må ikke lægges i et offentligt Actions-artifact.

Den allerede implementerede beskyttede forgængereksport kan efter adgang
bevise gammel generation/statepar; kandidat- og GRIB-cache kan undersøge
det konkrete periodemiks. De to beviser skal kobles sammen før en berørt
historisk state eller en modelBundle-bro godkendes. Ingen gammel inputværdi,
privat payload, indholdshash eller berørt optælling er opfundet her.

### Afgrænset audit til en isoleret runner

`scripts/audit-dmi-wave-period-evidence.py` er tilføjet til den nu konkrete
datatilgang, ikke som en ny migrationsbro. Den tager `--candidate`,
`--raw-dir`, `--stage manifest|grib`, `--max-assets`, `--max-bytes`,
`--max-seconds` og eventuelt en ny `--output`-rapportfil. Den genbruger
4.0.429's tabsfri DMI-storage-læser; producer, scheduler og netværksklienter
importeres ikke. Candidate, manifest og GRIB omskrives aldrig.

Manifesttrinnet tæller eksakt kildeidentitet, model/native-tid,
indhentningstid, itemrevision og byte/hashbinding. GRIB-trinnet læser kun
verificerede aktiver og sammenligner PP1D/MWP med den gemte periode på den
gemte gridcelle: samme gamle grid-digest, præcis afrundet celleidentitet,
samme GRIB-modelrun/native-time og sekundenhed. Det gensampler ikke et
nærliggende punkt. Flere kvalificerede PP1D/MWP-messages tælles som
uafklarede i stedet for at vælge en vilkårligt.

Gammel `valid_value`, direkte wave-tildeling og storagewriter er verificeret
på både `a2d03d95` og `4bee5b0d`: periodetallet rundes ikke; `float(value)`
lagres med tabsfri JSON. Audit bruger derfor eksakt numerisk lighed, ikke
en ny tolerance. Missing-sentinelen bruger den gamle `1e-12`-regel.
Grididentitet bruger de gamle ti GRID_DEFINITION_KEYS, samme Lambert-null-
regel og samme JSON-hashformat. Numrene selv, koordinater, parts, URL'er,
assetidentiteter og private hashes kommer ikke med i rapport/log.

Rapporten har faste aggregerede tællere, budgetstatus og altid
`oldSamplerWinnerReplayed:false`, `productionGenerationProved:false`,
`historicalStateImpactProved:false`, `affectedStateCount:null`. Selv et
entydigt MWP-match og en PP1D-afvigelse beviser kun den konkrete gemte
native række, ikke hele tidligere statehistorik eller alle interpolerede
timer. Manglende aktiver og uafklarede beskeder tælles særskilt.

Den lille syntetiske test dækker kilde-/manifest-/bytebinding, ændrede bytes,
bevarede inputfiler, budgetstop, eksakt periodetal, forskelligt modelrun/grid
og payloadfri output. Den bruger en markeret syntetisk ecCodes-grænse;
lokal Python har ikke ecCodes, så faktisk GRIB-læsning er endnu ikke bevist.
En runner skal bruge eksisterende `requirements-dmi.txt`.

Det eksisterende `current-input-diagnostic`-job i
`validate-copernicus-current-pilot.yml` er en branch-kørbar diagnoseindgang,
men dets gamle trin kræver et vellykket 118-handoff og hydrerer/bygger
current+score. Det må ikke dispatches uændret til dette formål. En isoleret
branch-override skal kun have exact-cache restore af ovenstående keys,
denne audit og upload af den validerede tæller-rapport. Ingen secrets,
providerkald, cache-save, central hydrering, score-/statebygning eller deploy.
Ingen dispatch er udført af denne audit-delopgave.

## Faktisk runnerresultat og konkret overgangsbeslutning

Root har nu kørt den isolerede providerfri diagnose: GitHub run
`35437186403`, job `105881740614`, afsluttet success. Det konkrete resultat:

| Observation | Antal |
| --- | ---: |
| Candidate-filens bytes | 53.664.155 |
| Bulk-entities / timerækker | 1.256 / 125.015 |
| Native bølgeperioder med kilde | 53.765 |
| Unikke refererede assets | 121 |
| Assets uden match i det bevarede manifest | 22 |
| Byte- og hashverificerede assets | 99 |
| Verificerede originale bytes | 297.063.144 |
| Numerisk sammenlignede native rækker | 44.217 |
| Eksakt MWP-match, men forskellig fra PP1D | 44.174 |
| Samme værdi for MWP og PP1D | 43 |
| Entities med mindst én PP1D-afvigelse | 868 |

Alle 99 inspicerede assets havde både PP1D og MWP. Ingen hash-, byte-,
manifestmatch-, parser- eller budgetfejl blev rapporteret. De 22 manglende
assets er en særskilt evidensmangel; deres rækker tælles ikke som uændrede.
Dette er konkret bevis for den gamle periodesemantik i de sammenlignede
native rækker, ikke kun mistanke ud fra parserkode. Det beviser endnu ikke
en publiceret generations statehistorik.

### 1.256 er ikke 1.256 kystdele

`update-dmi-bulk.py` opretter bulkens `zones` af aktive parent-zoner,
`PART::`-kystdele og `SOURCE::`-vandstandspunkter. Roterende research og
private-stage skrives ikke til dette aktive output. `sampling_identity`
i `lib/dmi_native_provenance.py` koder disse forskellige entityTypes.
Derfor kan 868 berørte bulk-entities ikke kaldes 868 berørte aktive dele.
Det er endnu ikke målt, hvordan de fordeler sig; den nærliggende aritmetik
670 dele + 198 forældre må ikke anvendes som et målt resultat.

Den samme audit har nu faste `entityGroups` og valgfri
`--protected-conditions` + `--bundle-manifest`. Med begge argumenter skal
den anvendte `--candidate` være netop den beskyttede generations
`data/live/dmi-bulk-cache.json`: både den og conditions bindes til de
respektive manifestfiler med eksakte bytes/hash. Et senere fejlet runs
kandidatcache kan ikke blandes ind. Kildens entityId/type/parent og
samplingPoint matches mod conditions' 673 aktive dele. Rapporten tæller
derefter ændrede native rækker før/på/efter beskyttet H0 og antal berørte
aktive dele. Den gamle bundlelæser skal stadig separat validere descriptor,
hele bundlen og statepar; Python-scope er ikke en erstatning for den.

### Anden diagnose gennemført – præcis beskyttet generations scope

[Run 35438520417](https://github.com/jakobjorgensen82-commits/RavRadar/actions/runs/35438520417),
job `105885207246`, diagnosticcommit `45342643`, er afsluttet success.
Den beskyttede generation er for `2026-09-19T02:00:00.000Z` (04 dansk).
Den er gendannet med sin eksakte gamle readers model-/kontrakthashes og
fulde bundlevalidering, og current-identiteten er uændret før/efter læsning.
Ingen providerkald, fjernwrites, deploy eller privat artifactupload.

| Beskyttet PART-scope | Målt antal |
| --- | ---: |
| Aktive dele med præcis identitet/punkt | 673 |
| Native bølgerækker med præcis PART-identitet | 41.837 |
| Sammenlignede rækker fra hashverificerede GRIB-filer | 34.434 |
| Gemte perioder forskellige fra PP1D | 34.404 |
| Heraf før / på / efter beskyttet H0 | 15.763 / 461 / 18.180 |
| Dele med mindst én ændret periode før/på H0 | 673 |

Bulkens 1.256 entities er nu faktisk opdelt som 673 kystdele, 210 forældre
og 373 vandstandspunkter. 195 forældre har også forskellig periode;
vandstandspunkterne har ingen bølgerækker. Den første rapports 868 berørte
entities var således 673 dele + 195 forældre, ikke det tidligere eksplicit
afviste gæt om 670 + 198. 22 originalassets findes fortsat ikke i manifestet.

`productionGenerationProved=true` betyder her verificeret beskyttet pakke.
`publicDeploymentProved=false`, `oldSamplerWinnerReplayed=false` og
`historicalStateImpactProved=false` består. Resultatet beviser en fejl i
den gemte historiske inputbank for alle 673 dele, ikke 673 dokumenteret
forkerte scorer og ikke en genskabt journal over faktisk konsumeret input.
Den manglende journal kan ikke skabes ved endnu en identisk diagnose.
Den nødvendige overgang skal bruge korrigeret, kvalificeret målehistorik
og kun bevare gamle states, hvor relevant inputækvivalens faktisk kan bevises.

Konklusion efter uafhængigt krydstjek: den eksisterende measured-cold replay
er den mindste forsvarlige overgang for de 673 dokumenteret eksponerede
statepar, medmindre en konkret undtagelse kan bevises. Rapporten beviser
aktuelt nul sådanne undtagelser. Dispositionen skal hedde eksempelvis
`HISTORICAL_WAVE_INPUT_EXPOSURE_UNRESOLVED`, ikke `STATE_IMPACT_PROVED`.
Det er derfor ikke længere korrekt at forbyde scope 673 alene på antallet;
det målte eksponeringsscope er nu faktisk 673. Ingen state er nulstillet
eller genberegnet i diagnosen eller denne beslutningsafgrænsning.

Den konkrete integration skal binde engangsovergangen til gammel bundle,
H0, binding og eksakte PART-identiteter, holde originalen urørt og give
begge modeller `state:null`/`previousCandidateGContinuation:null` sammen
med `source:'COLD_START'`, den eksisterende measured-cold-disposition og
`candidateGRollbackMeasuredColdStart:true`. Brug samme kvalificerede
48-timers recoveryinput for begge, bevar gyldig strøm og øvrige felter,
og accepter ukendt bølgeinput, når originale PP1D-beviser mangler. Bevar
historyBounds/warmup og publicér kun på en nyere time. Overgangen må ikke
gentages ved hver almindelig fremtidig kørsel.

Dette er en evidensbaseret inputreparation, ikke en ny scoreformel eller
tilladelse til at kalde 48 timers replay for komplet historik/READY.
Genudtræk fra gemte originale assets og normalcallerens engangskobling er
de næste konkrete kodeopgaver; ingen tredje identisk diagnose er nødvendig.

### Historisk plan for den nu gennemførte anden diagnose

Én ekstra providerfri read-only restore af den faktiske beskyttede
47,6 MB-generation er begrundet: den giver den præcise produktionscache,
aktive PART-identiteter og H0, som første diagnose ikke havde. Brug gammel
reader/sourcecommit til bundlevalidering; behold originalen uændret. Kør
den eksisterende audit med denne cache/conditions/manifest og samme
eksakte GRIB-cache. Upload kun tællerrapporten. Formålet er ikke endnu en
generel kontrol, men at skelne aktive dele fra parent/source-punkter og
historisk relevant input fra rene fremtidige prognoseændringer.

Feggesunds tre godkendte proxydele skal vurderes ud fra de to faktisk
brugte parent-donorer og protected current/hourly `waveInputSource`.
Manglende native `PART::`-række er ikke bevis for, at proxy-state er uberørt.
Gammel `bulkZoneToForecastRecord` fra `lib/dmi-forecast-store.mjs` plus
`verifiedIntegratedPartHourly`/`dmiExpectedIdentityForPart` fra den gamle
`ravscore-production-adapters.mjs` er de konkrete læsere til at kontrollere
valgt H0-input. Scoreprojektionen gemmer periodetallet, men ikke bølgens
fulde kilde. Bulk-tal og score-tal må ikke sammenlignes ukritisk:
den gamle forecastadapter anvender `Number(value.toFixed(1))` på perioden,
mens rå bulk-cache lagrer det uafrundede tal. Interpolation/proxy skal
ligeledes følge den gamle kode, ikke en ny egen omtrentlig beregning.

### Selve rettelsesvejen – eksisterende measured replay, ingen falsk historik

1. Valider den beskyttede forgænger med dens gamle kode og behold bundle,
   originalcache og statepar uændret som bevis. Afgræns aktive berørte dele
   ved den konkrete cache-/kilde-/tidssammenhæng, inklusive proxyafhængighed.
2. Genudtræk kvalificeret PP1D fra de faktisk bevarede hashbundne GRIB-assets.
   Ingen MWP-værdi må få et nyt peak-stempel. Hvis et nødvendigt originalt
   asset mangler, er den historiske bølge ukendt, ikke automatisk peak.
3. For en del med beviseligt ændret konsumeret input og uden ægte seed før
   ændringen: brug den eksisterende `buildRavScoreProductionPartSeries`
   med `initialSelection={state:null,source:'COLD_START',
   candidateGSourceDisposition:'VALIDATED_ROLLBACK_ORACLE_REBUILT_FROM_MEASURED_HISTORY'}`,
   `previousCandidateGContinuation:null`, `legacyCandidateGMigrationState:null`
   og `candidateGRollbackMeasuredColdStart:true`. Begge modeller genberegnes
   fra samme kvalificerede recoveryrækker; der må ikke kun rettes integrated.
4. `ravScoreRecoveryReplayStartAt(null,T)` starter præcis T−48 timer.
   `buildRavScoreRecoveryReplay` samler uafhængigt verificeret strøm og bølge.
   Ukendte timer bliver ærlige unknown-positioner; eksisterende readiness-
   og historyBounds-regler håndterer det. Det kræver ikke en opdigtet gammel
   inputjournal, fordi gammel berørt state bevidst ikke genbruges.
5. Uændrede dele beholder deres eget verificerede statepar, kun efter den
   snævre gamle/new-contract bro har bevist relevant algoritme/input-
   ækvivalens. Fremtidsændring alene må ikke nulstille H0. En ukendt del er
   ikke automatisk uændret eller automatisk berørt. Disse dispositioner
   vælges FØR `selectRavScoreProductionInitialState`, så en gammel binding
   ikke først valideres forkert som den nye.
6. Publicér på en reelt nyere produktionstime. Ændret historisk input/score
   er ikke `CONTRACT_ONLY_REBIND`, binding-only code-only eller samme-time
   metadatareparation. Gem det nye integrated+Candidate G-par atomisk i den
   eksisterende private generation og mixed-warmup checkpoint.

Dette er en afgrænset genstart af berørte PART-par, ikke en ny scoreformel,
global 673-dels nulstilling eller en tilbagevenden til gammel offentlig
model. Allerede gyldige vejrkomponenter og uændrede deles state bevares.
At replayvinduet er 48 timer er IKKE et løfte om READY efter 48 timer:
den eksisterende integrated pipeline starter ukendt bølgememory med
0..100-bounds, og den konservative mobilisation-truncation er 288 timer.
Faktisk historyBounds/readiness afgør usikkerheden; ingen flag må sættes
grønne alene på baggrund af et gennemført 48-timers loop.

Vandstand/T+3 skal håndteres separat som state-neutral inputsanitering,
jf. den samtidige DMI-analyse: integrated stateinput og Candidate G's
statewalk forbruger strøm+bølge, ikke vandstand. En forkastet vandstand
kræver opdateret offentlig vejr-/best-time-projektion, men er ikke alene
grund til state-reset. Dette er nu implementeret lokalt i
`scripts/lib/ravscore-wave-input-migration.mjs`: prædikatet genbruger
`verifiedIntegratedPartHourly` som oracle for den faktiske DMI-only-
sanitering og samme-series T+3-kontrol. Det tillader alene fjernelse til
`null` med sanitizerens eksakte vandstandsproveniens; en ugyldig
`sources.waterLevel` må bevares eller fjernes, men aldrig opgraderes.
Gyldig DMI-vandstand/kilde må ikke slettes. Alle øvrige felter og
proveniens, herunder strøm, vind og temperatur, sammenlignes fortsat
uændret. Det er ikke en bred undtagelse for andre inputændringer.

Water-only får `WATER_LEVEL_SANITIZED_STATE_UNCHANGED`, bevarer begge
initiale continuation-states og kræver offentlig genberegning. Wave+water
beholder den egentlige wave-replay-disposition. Ingen undtagelse tillader
ændret vejr på samme publiceringstime. Positiv-til-positiv genberegning
af en DMI-trend i public/legacy-projektion er bevidst ikke omfattet af
denne snævre fjernelsesregel og må ikke fejlagtigt routes gennem den
historiske peak-migration som begrundelse for state-reset.

Måltesten `scripts/test-ravscore-wave-input-migration.mjs` kontrollerer
det faktiske integrated/Candidate G-statepar og scoretal før/efter
vandstandssanitering, fortsat bølgereplay, ændret offentlig best-time ved
lige scorer, gyldig DMI-beskyttelse, ugyldig reservekilde-fjernelse samt
afvisning af samtidige strøm-, vind-, temperatur- og proveniensændringer.
Kun denne afgrænsede offline-test er kørt; ingen ny gate, providerhentning,
produktionstilstand eller endelig modelbinding er ændret af dette snit.
