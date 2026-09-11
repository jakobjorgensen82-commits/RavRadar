# Copernicus-checkpointprofil 2026-09-11

## Formål og afgrænsning

Dette notat begyndte som en læsende analyse og indeholder nu også efterfølgende
lokale prototype- og slutmålinger. Produktions-main er ikke ændret af arbejdet;
den lokale 4.0.344-kandidat er endnu ikke produktionsverificeret. Der er ikke
brugt private produktionspayloads i de syntetiske målinger. Senere afsnit
supersederer eksplicit de tidligere prototyper, som ikke gav målt gevinst.

Undersøgelsen sammenligner den komplette oneoff-kørsel `34161930631`
(`sourceSha=57a4c91405...`, job `101865358086`) med oneoff-kørsel
`34588002366` (`sourceSha=5587001b45ff...`, job `103226555573`), der ramte den
hårde Copernicus-grænse på 3300 sekunder. Den undersøger både downloadformen og
det arbejde, som udføres ved hvert checkpoint.

## Observeret produktionstid

Loggens gentagne sekvens blev målt som:

1. `Selected product ...`
2. Copernicus-klientens `Total size ...`
3. runnerens næste checkpoint/progresslinje

| Kørsel | Komplette enheder | Selected -> Total size, median | Total size -> checkpoint, median | Hele enheden, median |
|---|---:|---:|---:|---:|
| `34161930631` | 39 | 15,7 s | 50,4 s | 66,1 s |
| `34588002366` | 14 | 19,6 s | 134,7 s | 153,9 s |

Den sidste fase er dermed steget med cirka 84,3 sekunder pr. gennemført enhed og
er 2,67 gange så lang i medianen. Det er en reel throughput-regression, men den
må **ikke** kaldes ren CPU-tid: Copernicus skriver `Total size` før selve
downloaden. Intervallet indeholder derfor download, åbning/parsing, merge,
validering og checkpointskrivning.

Konkrete datapunkter fra den nye kørsel viser desuden separat spild i
leverandørkaldet:

- ét Baltic-kald hentede 126,12 MB og gav 54 nye par;
- ét AMM-kald hentede 6,70 MB og gav 0 nye par;
- runneren nåede 14 checkpoints og reducerede Copernicus-restkøen fra 7136 til
  6544, altså 592 nye par på omtrent 55 minutter.

Starttallet 7136 er genverificeret i det eksisterende source-stage-inspect før
indsamlingen: 11251/18387. Tallet 7131 er allerede efter det første checkpoints
fem nye par og må ikke bruges som indsamlingens starttal.

Den gamle kørsel reducerede den tilsvarende kø med cirka 1979 par på omtrent 54
minutter. Den havde også et stort kald på 118,55 MB, som kun gav 45 par. Store
kontinuerte tidsintervaller for spredte timer fandtes altså allerede; de kan
forklare noget spild, men forklarer ikke alene regressionen mellem de to
kørsler.

## Kodevej og regression

`scripts/run-copernicus-current-pilot.py` samler de efterspurgte native timer pr.
shard, men kalder subset-klienten med intervallet fra første til sidste time
(`acquire_shard_rows`, omtrent linje 408-478). Et sparsomt sæt bliver dermed til
ét kontinuerligt tidsinterval. Der er ingen tids- eller dybdetiling i
`download_subset` (omtrent linje 364-393).

Mellem de to sammenlignede source-SHA'er blev den væsentligste faste
checkpointkæde indført i commit `e459b826`:

- hvert shard-checkpoint bygger og validerer donorbanken;
- banken committes atomisk og læses tilbage;
- en projektion til shadow bygges og shadow skrives igen;
- source-stage bygges, valideres og skrives;
- caller beregner derefter required-selection igen.

De centrale steder er `persist_source_stage_progress` i
`scripts/run-copernicus-current-pilot.py` (omtrent linje 546-613) og kaldet efter
hver shard (omtrent linje 1773-1814). Donorbankens build/projection/write ligger
i `scripts/lib/copernicus_current_donor_bank.py` (omtrent linje 215-243,
311-324 og 364-393). Source-stage build/write ligger i
`scripts/lib/copernicus_current_source_stage.py` (omtrent linje 1483-1611), og
shadow-validering/merge/write i `scripts/lib/copernicus_current.py` (omtrent
linje 1368-1417, 1737-1763 og 1922-1950).

Samme commit indførte også korrekt union-gap-prioritering: downstream-dækkede
par trækkes fra Copernicus' kritiske kø. Det gør forespørgslerne mere spredte og
forstærker problemet ved at omsætte `min..max` til et sammenhængende interval.
Union-gap-prioriteringen bør ikke fjernes; requestformen skal i stedet håndtere
spredte timer.

`6b2432aa` tilføjede granularitet for delvise timer. `66bd6061` tilføjede fair
produktservice/interleaving. Ingen af dem forklarer alene den nye, næsten faste
efterbehandlingstid.

## Reproducerbar syntetisk profil

Målingen blev kørt fra repository-roden med projektets bundtede Python:

`C:\Users\Lenovo T14\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe`

Et inline, ikke-gemt benchmark importerede runneren med `importlib.util`, byggede
gyldige syntetiske targets/records via de eksisterende fixture-buildere, skrev
kun i en midlertidig mappe og kaldte
`persist_source_stage_progress(...)`. Modulreferencer til validatorer blev
wrappet med tællere; `cProfile.Profile().runcall(...)` målte samme kald. Ingen
netværkskald eller produktionsdata indgik.

### Kaldtælling, ét record

- `copernicus_current.validate_shadow`: 3 kald
- `source_stage.merge_positive`: 6 kald
- `source_stage.select_required`: 4 interne kald; med callerens efterfølgende
  selection mindst 5 i hele checkpointvejen
- `source_stage.validate_positive`: 17 kald
- `source_stage.validate_shadow`: 3 kald
- `donor_bank.merge_cache`: 1 kald
- `donor_bank.merge_positive`: 1 kald
- `donor_bank.validate_bank`: 3 kald
- `donor_bank.validate_positive`: 6 kald
- `donor_bank.validate_shadow`: 7 kald (nogle er kun header-/strukturkontrol)

Kaldtællingen viser redundans, men ikke i sig selv CPU-andelen, fordi flere
validatorer kalder hinanden.

### Profil, 1180 records

Fixture: 10 syntetiske targets gange 118 timer, gyldig donorbank, uændret
forsøgsjournal og ét checkpoint.

- 4.232.224 funktionskald på 2,335 s
- `validate_shadow`: 13 kald, 1,565 s inklusiv underkald
- `_validate_record`: 11.800 kald, svarende til præcis 10 fulde
  record-gennemløb, 1,525 s inklusiv underkald
- `validate_source_stage_progress`: 3 kald, 0,734 s
- `validate_bank`: 3 kald, 0,619 s
- `build_bank`: 1 kald, 0,612 s
- atomisk source-stage-writer: 1 kald, 0,499 s
- atomisk shadow-writer: 1 kald, 0,465 s
- source-stage build: 1 kald, 0,323 s
- cache-merge: 1 kald, 0,233 s
- atomisk bank-commit: 1 kald, 0,227 s

Tiderne er inklusive og overlapper; de må ikke lægges sammen.

### No-record-checkpoint, 1180 records

Et checkpoint uden nye records blev kørt efter en allerede normaliseret initial
bank:

- donorbankens SHA var uændret;
- shadow-SHA var uændret;
- et stage-only build/write gav logisk identisk source-stage-output;
- fuld nuværende checkpointvej: 1,115 s;
- stage-only build/write: 0,405 s;
- syntetisk forhold: 2,75 gange hurtigere.

En særskilt måling af samme Baltic-fixture gav 1,015 s med donorbankvejen og
0,554 s uden ny donorbankbehandling, altså 1,83 gange forskel. Det beviser en
lokal fast omkostning; det beviser ikke, at donorbanken kan fjernes.

## Hvad der kan genbruges sikkert i samme proces

Følgende invariants kan memoiseres som valideret state, hvis objekterne behandles
som immutable og generationsbindingen kontrolleres:

- registry og target-sæt, når de er fuldt valideret én gang og ikke ændres;
- den eksakte bankinstans/-generation, som netop har bestået fuld validering og
  atomisk commit;
- projektion og required-selection for samme bankgeneration og samme
  forsøgsjournal;
- serialiserede bytes/hash til readback-integritet, når den semantisk validerede
  objektinstans er den, der blev serialiseret.

Genbrug er ikke sikkert over en ny record-delta, ændrede masks, ændret positiv
AMM-evidens, mask-healing, ændret manifest/hash, ændrede attempts eller ændret
missing-set. Her skal kandidattilstanden genberegnes og bestå den strenge
validering før atomisk erstatning.

## Minimum samlet og holdbar ændring

1. **Bevar donorbank, provenance, masks og atomisk commit.** Optimer den interne
   transaktion; fjern ikke sikkerhedskontrakten eller det vedvarende checkpoint.
2. **Tilføj en snæver no-record-fastpath.** Kun efter initial normalisering og
   kun når records, positive beviser, masks, reference og manifest er uændrede,
   genbruges den validerede bank/projektion, og alene forsøgsjournal/source-stage
   opdateres. Først bevises outputlighed med fixtures for Baltic og AMM.
3. **På positive checkpoints behandles kun delta én gang.** Byg én
   kandidatgeneration, kør én fuld semantisk validering før commit, og lad
   projektion, shadow og source-stage konsumere præcis denne validerede immutable
   kandidat. Writers skal fortsat verificere byte/hash/readback, men behøver ikke
   gentage identiske fulde semantiske traverseringer af samme objekt.
4. **Genbrug selection inden for generationen.** Caller må ikke vælge required
   igen, hvis persist allerede returnerer selection for samme bankgeneration og
   attempts. Et generations-id/hash skal gøre stale genbrug umuligt.
5. **Del spredte timer i små, begrænsede tidsfliser.** Ingen request må spænde
   hen over store uønskede mellemrum alene på grund af `min..max`. Fliser skal
   være deterministiske, checkpointes hver for sig og budgetvurderes før start.
   Mål først den optimerede checkpointomkostning, så flisestørrelsen ikke blot
   bytter downloadspild med for mange dyre checkpoints.
6. **Hold scheduler-liveness adskilt fra admission/provenance.** En eventuel
   fair rotationsmarkør skal være en separat, bounded scheduler-hint. Den må
   aldrig udgøre bevis for forsøg, kildeadmission, mask-healing eller positiv
   donorprovenance. Deterministisk referenceafledt rotation er mindst risikabel,
   hvis den giver den krævede fairness; ellers bruges et separat atomisk hint med
   sikker fallback ved manglende/defekt state.

Begge workflows bruger samme runner: normal kørsel med cirka 360 sekunders
budget og oneoff med cirka 3300 sekunder. Løsningen skal derfor ligge i den
fælles runner/biblioteker og testes mod begge budgetprofiler; workflows må kun
fortsætte med at levere forskellige tidsbudgetter.

## Vigtige modargumenter og ikke-beviste forhold

- GitHub-logmålingen kan ikke fordele de 84,3 ekstra sekunder præcist mellem
  netværk, parsing og Python-efterbehandling.
- Den lokale Windows-tempfixture er mindre og enklere end den virkelige bank,
  Linux-runneren og fuld AMM-certificering. Absolutte tider må ikke
  ekstrapoleres direkte.
- Mindre hyppige checkpoints er ikke den sikre løsning: det øger tab ved timeout
  eller runnerafbrydelse og strider mod granularitetskravet.
- Donorbanken må ikke springes over generelt; den bærer reserve, provenance og
  masks, som shadow alene ikke kan erstatte.
- Union-gap-prioriteringen må ikke rulles tilbage. Den er fagligt korrekt og
  forklarer, hvorfor Copernicus ikke skal bruge den kritiske kø på allerede
  downstream-dækkede par.
- Tidsfliser har også fast overhead. De skal valideres med et realistisk
  fixturebenchmark efter checkpointoptimeringen.
- De observerede logs kan ikke bevise, om bestemte nuværende huller afvises af
  freshness, admission eller masks. Det kræver den særskilte, læsende private
  cachediagnose.

Den sikre konklusion er derfor todelt: der er både dokumenteret kontinuerligt
downloadspild for spredte timer og dokumenteret redundant fuld
checkpointbehandling. En samlet minimumsrettelse skal adressere begge uden at
ændre acceptance-, provenance- eller closure-semantik.

## Første positive prototype, endnu ikke en acceptabel optimering

En lokal 1.180-record-prøve med forberedte bank/shadow/stage-snapshots reducerede `_validate_record` til 2.360 kald og gav byteidentiske tre filer. Men den udførte 18 ekstra streaming-canonical-gennemløb: uinstrumenteret cirka 1,44 sekunder mod cirka 1,19 sekunder for den gamle strenge referencekæde i samme proces. Målevariation er mulig, men der er ikke dokumenteret hastighedsgevinst. Prototypen må derfor ikke omtales som en færdig ydelsesrettelse eller sendes i produktion på dette grundlag.

Instrumenteret peak var 11,15 MB ved cirka 1 MB bank; særskilt 20,99 MB spool-prøve brugte cirka 2,12 MB peak. Det dokumenterer alene de konkrete lokale fixtures, ikke runnerkapacitet. Næste revision skal reducere gentagne interne hash-/accessorlag, stadig verificere alle tre eksakte snapshots før første durable commit og bevare byte-readback samt offentlig streng validering. Samlet vægtid og hukommelse skal sammenlignes igen; færre recordvalideringer er ikke tilstrækkelig evidens.

## Endelig positiv checkpointmåling efter readback-rettelse

Den efterfølgende konsoliderede prototype erstatter resultatet i afsnittet
ovenfor. Den beregner forventet størrelse og SHA-256 direkte fra encoderens
fragmenter under skrivningen, kontrollerer tempfilen mod denne uafhængige
forventning efter `flush`/`fsync` og kontrollerer samme fil igen i den samlede
precommit-verifikation. En injiceret trunkering ved den anden `fsync` afvises,
før bank, shadow eller source-stage ændres.

Den store fixture havde 340 syntetiske, centralt bundne targets og 118 hele
UTC-timer, i alt 40.120 gyldige Baltic-records i én eksisterende valideret
donorgeneration. Koordinaterne blev holdt inden for samme lille Baltic-område.
Der var ingen leverandør- eller netværkskald. Kørselrækkefølgen var sekventiel:
seed-checkpoint, tracemalloc/checkpoint med en simpel tæller uden gemt
kaldhistorik, uinstrumenteret checkpoint og til sidst den tidligere strenge
referencekæde. Kommandoen var:

`C:\Users\Lenovo T14\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe -B .tmp-cp-positive-profile.py`

Harnessen var en midlertidig, ugemt analysefil og blev fjernet efter målingen.
Det eksakte stdout-resultat var:

```json
{"bankFileBytes":34320677,"byteIdenticalToStrict":true,"elapsedSeconds":120.9006,"records":40120,"shadowFileBytes":31475623,"stageFileBytes":1636,"strictElapsedSeconds":45.9263,"strictToPreparedRatio":1.668,"tracedPeakBytes":77127461,"uninstrumentedElapsedSeconds":27.5362,"validateRecordCalls":80240}
```

Det relevante vægtidsresultat efter readback-rettelsen er derfor 27,536
sekunder mod 45,926 sekunder for strict-kæden, svarende til 1,668 gange. Alle
tre filer var byte-for-byte identiske. De 80.240 recordvalideringer er præcis to
fulde gennemløb af 40.120 records; det historiske fixture havde ti. Den målte
tracemalloc-peak på 77.127.461 bytes er ekstra Python-allokering efter, at den
store fixture allerede var bygget. Snapshottet beholder ingen serialiseret
payload i RAM; de tre eksakte payloads ligger som tempfiler indtil commit eller
oprydning.

En tidligere måling før den uafhængige encoder-digest gav 21,450 mod 39,256
sekunder (1,83 gange), men må ikke bruges som slutresultat. Den medtog ikke det
nødvendige write/readback-bevis. Den store fixture måler Baltic-skala, ikke en
stor AMM-/maskpopulation. AMM-positive admission, Baltic-zero-witness,
mask-healing, stale snapshot, crashrækkefølge og byte-outputlighed dækkes i den
mindre måltest; dens semantiske dækning må ikke forveksles med en separat
storskala-ydelsesmåling af disse varianter.

## Requestformen efter faktisk post-migrationsmåling

Læsende run `34623745943` er grønt på exact forensic-head `39a7bfc4` og uændrede
produktionsinput. På den faste rest efter regional migration er 9 af 34 Baltic-
shards og 5 af 9 AMM15-shards berørt. To Baltic- og tre AMM15-shards har hver
37 nødvendige timer over 118 timer, inklusive ét 80-timers tomt mellemrum og ét
enkelt timesgap. En yderligere AMM15-shard har 33 nødvendige timer over 36 med
tre enkelte timesgab; øvrige requests er korte og sammenhængende.

Dette præciserer minimumspunkt 5 ovenfor: split kun ved mindst 24 hele tomme
native timer, ikke i faste 24-timersfliser og ikke ved hvert enkelt timesgap.
På den konkrete fulde produktrest bliver 14 brede requests strukturelt til
19 segmenter, og samlet envelope falder fra 646 til 246 shard-timer før
pair-level kildeprerequisites. Der spares 400 tomme envelope-timer mod fem
ekstra checkpoints. Det er ikke en direkte måling af bytes eller runtime,
fordi fysisk bbox, grid og dybde også bestemmer downloadet.

Segmenterne får ét stykke pr. geografisk shard i hvert fair pass. Ingen ny
maksimal par-/requestkvote, ændret spatial shardidentitet eller lempet
admission indføres. Små mellemrum beholdes for at undgå mikroopdeling med høj
fast overhead. Fejl er lokale til exact segment-pair-mængden; immutable gamle
brede attempts pensioneres kun efter kollektiv fuld erstatning med aktuelle
samme-reference/source/shard-forsøg. Se DEC-0126 og residualauditens sidste
afsnit for den fulde kontrakt og resterende livebevis.

De nye privacy-sikre acquire/hash/parse- og admission/merge/checkpointtider skal
bruges til faktisk sammenligning efter merge. Eksisterende historisk navngivne
executedShardCount-/failed-shard-tællere beskriver gennemførte/forsøgte enheder
og må efter segmentering ikke præsenteres som antal unikke geografiske shards.
Der indføres ingen adaptiv deadlinegrænse på den gamle brede requestfordeling;
først skal den nye segmentøkonomi måles. Wrapperens eksisterende soft-/hardstop
og sikring af tidligere checkpoints består.
