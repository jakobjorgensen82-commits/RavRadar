# Privat komponentfremskridt mellem kørsler – afgrænset design

Dato: 2026-09-19. Ingen produktionswrite, ny bucket eller SQL er udført.

## NYESTE status: implementeret lokalt, endnu ikke produktionsbevist

Dette afsnit erstatter ældre designstatus længere nede:

- Progressfilen er `.cache/weather-private-progress.encrypted` og bruger
  AES-256-GCM med domæneadskilt HKDF-nøgle afledt af den eksisterende
  `SUPABASE_SERVICE_ROLE_KEY`. Der skal derfor ikke oprettes eller årligt
  vedligeholdes en særskilt krypteringssecret.
- Ciphertextloftet er 256 MiB; den interne rå pack har fortsat sit separate
  768 MiB-sikkerhedsloft. Baselinebinding, conditionshash, bundlehash,
  autentificering og allowlist valideres før udpakning.
- Pakken indeholder de nye komponentbanker og originalbeviser samt DMI
  active/candidate/current, CP/OM-current, donor/journal/source-stage og
  coastal staging. Private filer med samme indhold som en allerede gemt
  basefil duplikeres ikke.
- Failed-run-save er best effort i Actions-cache, men en vellykket beskyttet
  runtime bærer samme operationelle fremskridt varigt. Cacheeviction kan
  dermed koste fremgang siden sidste succes, ikke den beskyttede baseline.
- Aktive workflows gemmer ikke længere disse private familier ukrypteret.
  De gamle post-build-, keepalive- og pilot-oneoff-indgange er permanent
  deaktiveret. Den rå DMI-GRIB-cache er fortsat tilladt, fordi den består af
  officielle offentlige kildeassets og ikke RavRadars private mellemdata.
- 11 krypterings-/restore-cases og 10 pack-/inventory-cases er grønne,
  inklusive korruption, forkert baseline, rollback, originale CP-bytes og
  de ekstra operationelle filer.

Først efter en vellykket rigtig generation må de gamle remote cachefamilier
oplistes præcist og slettes. Indtil da bevares de som overgangssikkerhed, men
ingen aktiv workflowvej skriver nye generationer af dem. Formuleringer
længere nede om særskilt secret, 64 MiB, ni filer eller manglende implementering
er historiske designtrin og ikke den aktuelle status.

## Nyeste faktiske måling og enklere implementeringsretning

Den isolerede diagnosticbranch `codex/readonly-weather-evidence-20260919`,
commit `4c5489ec`, kørte kun læsning af metadata og gemte cachefiler.
[Run 35437186403](https://github.com/jakobjorgensen82-commits/RavRadar/actions/runs/35437186403),
storagejob `105881740492`, målte kl. 12.21.50 dansk:

- Private bucket, to objekter, faktisk samlet 95.212.566 bytes.
- Current 47.606.276 bytes; previous 47.606.290 bytes.
- Ingen urefererede, manglende eller størrelsesafvigende objekter.
- Ledig plads under projektets 700 MB-budget: 604.787.434 bytes.
- Estimeret uploadpeak med endnu en generation på current-størrelsen:
  142.818.842 bytes. Dette er et estimat, ikke målte nye komponentbanker.
- Otte metadatarequests, ingen objektdownload eller remote write; pointeren
  var uændret før/efter. Private indholdsbytes/hashes er ikke hermed bevist.

Kapacitet er således ikke en aktuel blocker. Den gamle teoretiske kant
ved tre maksimale generationer består, men må ikke omtales som aktuel fuld
Storage. Main-workflow og produktion er urørt af diagnosticbranchen.

For at undgå en ny Supabase-pointer/CAS/retentionkæde implementeres nu en
enklere best-effort-vej: ét allowlistet komponentpack krypteres med
AES-256-GCM og en særskilt GitHub-secret, inden det gemmes i Actions-cache.
Kun ciphertext må caches; rå banker/originaler forbliver private. Hele
ciphertext autentificeres før unpack/brug, og snapshot skal matche præcis
den gendannede beskyttede produktionsbaseline. Det kan ikke overtage en
nyere baseline eller give score-/state-/produktionsautoritet.

Helper og normalworkflow er nu implementeret og måltestet lokalt, inklusive
uafhængigt review af autentificering, baselinebinding og rollback. Capture
kræver både hele den verificerede bundles indholdshash og conditionshash;
samme conditions i en anden bundle er ikke tilstrækkeligt. Krypterings-
secret er endnu ikke oprettet, og vejen er ikke aktiveret eller driftsbevist.
Keyrotation, cacheeviction og forkert tag/base giver cachemiss; normal
beskyttet runtime bevares. Et hårdt runnercrash kan stadig miste arbejde
efter sidste save.
GitHub-cache er derfor ikke et løfte om uendelig retention eller absolut
durabilitet. Den nye vej kræver ingen ny driftsservice eller databasepointer.

Ciphertext har et fast loft på 64 MiB for at begrænse trykket på den delte
Actions-cache; det er et ressourcebudget, ikke en målt national størrelse.
Rå pack har fortsat sin separate 768 MiB sikkerhedsgrænse. Overbudget
bevarer den tidligere krypterede fil og stopper ikke den almindelige
produktion. Workflowet gemmer kun et faktisk nyt, fuldført snapshot.
Første rigtige kørsel skal rapportere encryptedBytes. Ingen gamle cacher
er slettet, og eksisterende GRIB-cacheprioritering er ikke ændret.

Nedenstående Supabase-slot/CAS-design er nu et tidligere alternativ, ikke
en bestilling på endnu et sideløbende persistenssystem.

## Historisk alternativ: konkrete krav og eksisterende genbrug

CP/OM-komponentbanker og deres originale responsbeviser må overleve et
failed normalrun og en ren hosted runner uden at afvente en færdig
produktionsbundle. Actions/cache er ikke en tilladt placering: repositoryet
er offentligt, og cacher kan være læsbare fra fork-PRs. De private punkter,
bankrækker og CP-originaler må kun bruge beskyttet lagring.

Genbrug findes allerede:

- `private-weather-component-pack.mjs` laver et allowlistet, hashbundet
  pack med banker, CP-originaler/receipts, progress, cursor og den snævre
  provider-ownership-historik. Uden produktionsmarker kan det fungere som
  cachefremskridt; det er ikke state- eller modelbevis.
- `createProtectedPrivateRuntimeClients` i
  `protected-private-production-runtime.mjs` har eksisterende Supabase-
  klient, retry, immutable upload, readback og exact-object deletion.
- Bucket `ravradar-private-production-runtime` er allerede service-role-
  only gennem den restriktive storagepolicy. Ingen ny bucket/service skal
  oprettes for dette formål.

Foreslået selvstændig rolle: `WEATHER_COMPONENT_PROGRESS_ONLY`, eget
objektprefix `weather-component-progress-v1/`, egen metadata-only pointer
`ravradar-weather-component-progress-v1`. Ingen integrated/Candidate G-
modelbinding, ingen readiness, ingen productionpromotion og ingen deployret
i denne pointer. Restorerede banker skal fortsat gennem deres normale
provider-/punkt-/tid-/råresponsvalidering.

## Foreløbig størrelses- og retentiongrænse

Højst 20.000.000 komprimerede bytes pr. snapshot er et foreløbigt sikkerheds-
loft, ikke et bevis for at en rigtig national bank passer. Højst én committed
current og ét midlertidigt uploadslot giver maksimalt 40.000.000 bytes til
progress. Aktuelle komprimerede sizes skal måles før driftsklar erklæring.

Save: validér pack, mål/comprimér, læs eksakt pointer og faktisk Storage-
inventory, afvis/skip overbudget uden at ændre current, upload immutable,
byte-/hashreadback og derefter version-CAS af current-pointer. Ved ukendt
CAS-resultat genlæses pointer; ingen blind genskrivning. Failed upload eller
readback beholder den gamle current. Restore læser kun en committed current
og udpakker til ny privat stage; den må ikke blindt overskrive en nyere
bank fra en allerede beskyttet produktionsgeneration.

Hver save/restore skal tage sig af eget pensioneret/orphaned progress,
inklusive afbrudt runner efter upload. Kun eget præcise prefix og beviste
ikke-refererede objekter må slettes. Ukendt pointer eller manglende eksakt
inventory giver ingen sletning og ingen ny upload. Der må ikke bygges et
system, som først kræver manuel eller årlig oprydning.

## To konkrete koblinger, som ikke må springes over

1. Storagebudgettet er samlet 700.000.000 bytes: allerede allokeret til
   to produktionsgenerationer á højst 350.000.000 bytes. Progress er IKKE
   yderligere 40 MB ovenpå. Save skal bruge faktisk ledig plads; normal
   publisher skal kende progress og prioritere de to produktionsgenerationer.
   Den eksisterende 350 MB-grænse må ikke sænkes til 330 MB blot for progress.
2. En ny `admin_documents.document_key` er ikke undtaget fra eksisterende
   `ravradar_admin_history`-trigger. Hver pointerændring opretter derfor en
   metadata-version. Uden SQL skal egne versioner læses, verificeres og
   ryddes bounded efter/inden næste save, med både exact key og exact version.
   Ingen bred sletning fra adminhistorik; egne fejl/ukendte versioner stopper
   kun progress, ikke almindelig deploy. Metadata må ikke indeholde rådata.

## Fundet plads-/durabilitetskant før implementering

Den eksisterende normalpublisher uploader og readback-verificerer den nye
runtime før pointer-CAS. Først derefter slettes den pensionerede previous.
Der kan derfor være TRE runtimegenerationer midlertidigt, selvom den
vedvarende kapacitetsberegning regner med to. Dette var eksisterende adfærd,
ikke en allerede implementeret progressændring.

En ny absolut fysisk 700 MB-kontrol kan ved størrelsesgrænsen derfor stoppe
en produktion, også uden progress. En isoleret progresshelper kan ikke på
én gang garantere fuld progressdurabilitet, absolut 700 MB under udskiftning
og at enhver eksisterende tilladt runtimepublicering altid fortsætter.

Sikker automatisk pensionering gælder kun progress, som allerede er bevist
dækket af en committed beskyttet runtime; det er ikke nok, at samme banker
ligger i en endnu lokal, upubliceret kandidat. At slette den eneste durable
progresskopi før ny remote kopi er verificeret kan miste fremskridt ved et
senere failed run. Denne prioritering skal være eksplicit, ikke skjult under
ordet »obsolete«.

Mulig snæver levering er best-effort save i målt headroom og bounded
oprydning af allerede dækket progress. Ved reel pladsnød kræves eksplicit
prioriteret progress-drop, eller en større fælles pending-object-protokol,
som lader fremtidig productionarchive bære PROGRESS_ONLY uden promotion.
Sidstnævnte udvider også normalpublisherens referencetælling/failure-cleanup
og bør ikke sniges ind som en lille cachehelper.

Status: driftsmanglen er reel og endnu ikke løst. Ingen progresspersistens
må beskrives som aktiv. Model/state/sikker produktionsrollback er uændret.

Root har efter denne afklaring udtrykkeligt afgrænset leverancen til design
og kendte mangler i denne omgang. Ingen ny pending-object/CAS-storageprotokol
implementeres nu; normal komponentintegration fortsætter separat. Der er
ikke godkendt blind sletning af ikke-obsolete fremskridt. Næste skridt er
reel read-only måling af current/previous/orphans, komprimeret componentpack
og transient kandidat-upload inden for det fælles eksisterende budget.

## Afgrænset evidensindsamling og læseværktøj, 2026-09-19

Read-only GitHub-metadata for manualrun `35416641052`, head
`a2d03d95fa35fa86153a6ddeeb1d60d60333e266`, viser at både publiceringen
af protected private runtime og anonym-adgangskontrollen lykkedes, selvom
det samlede run senere fejlede og deploy blev sprunget over. Dette beviser
ikke i sig selv hvilken generation der stadig er current nu.

Det undersøgte joblog og lokale payloadfri diagnostik indeholder ikke
current/previous-arkivernes komprimerede bytes eller en samlet fysisk
bucketinventarliste. Support-ZIP- og Actions-artifactstørrelser er IKKE
erstatninger for disse størrelser. Den lokale session har hverken
`SUPABASE_URL` eller `SUPABASE_SERVICE_ROLE_KEY`; der er ikke ledt efter
andre credentials. Den eksisterende `--describe-current` udelader previous
og størrelser, og `ensurePrivateBucket` må ikke bruges til en ren læseaudit,
da den også kan oprette en manglende bucket.

Det nye isolerede læseværktøj er
`scripts/audit-private-runtime-storage-capacity.mjs --output <ny-reportfil>`.
Det bruger kun GET af præcis adminpointer og bucketinfo samt Supabases
ikke-muterende POST `object/list` i den ene eksisterende bucket. Det opretter,
opdaterer og sletter intet og downloader ikke objektindhold. Grænser er
60 sekunder, 256 requests, 20.000 listeentries, 2.048 præfikser, dybde 8 og
2 MB pr. JSON-respons. Pointeren genlæses til sidst. Rapporten indeholder
kun størrelser, tællinger, booleans og faste statuskoder, aldrig objektstier,
pointerpayload, koordinater, vejrdata eller secrets.

Den eksisterende pointervalidator accepterer både sharded og historisk
single-object-format til denne metadataaudit. Referencer sammenholdes med
Storage-metadata; ukendt størrelse, manglende objekt eller uoverensstemmelse
giver `INCOMPLETE`, ikke et opdigtet nul. `unreferencedBytes` betyder kun
»ikke henvist af denne pointer«, IKKE »må slettes«. Det er en observeret
metadataoptælling, ikke en hashverificering eller atomisk Storage-snapshot.
Ekstra kandidat-upload estimeres eksplicit til samme komprimerede størrelse
som current; en virkelig ny generations størrelse er fortsat ukendt.

Ni små syntetiske scenarier består i
`scripts/test-private-runtime-storage-capacity-audit.mjs`: begge
pointerformater, paginering, præcise read-only endpoints, byte-mismatch,
ukendt metadata, ændret pointer, sti-/loopafvisning, ressourceloft og
payloadfri fejl. Ingen fuld gate eller providerhentning er kørt. Root ejer
en eventuel isoleret diagnosticbranch/workflow; værktøjet alene har ikke
skaffet fjernmålingen og giver ikke grundlag for at erklære ledig plads.

## Faktisk eksisterende Actions-cacheoverflade

Read-only cachemetadata viste 59 entries på i alt 10.151.849.950 bytes,
heraf 9.831.630.655 bytes fordelt på fem DMI-GRIB-generationer. Dette er
Actions-cache, ikke Supabase-forbrug. De konkrete workflowfiler på ovennævnte
head indeholder fortsat følgende ældre private cachefamilier:

- `.cache/dmi-grib`, `.cache/dmi-active-complete.json`,
  `.cache/dmi-candidate-progress.json` og legacy `data/live/dmi-bulk-cache.json`.
- `.cache/copernicus-current-shadow.json`, `copernicus-current-source-stage.json`,
  `copernicus-current-donor-bank.json`, `copernicus-current-segment-journal.json`
  samt deres eksplicitte `.invalid-*`-filer.
- `.cache/open-meteo-current-fallback.json`, `open-meteo-current-donor-bank.json`
  samt deres `.rejected` og `.rejected.previous`-filer.
- `.cache/current-field-shadow.json`, `.cache/coastal-point-staging`,
  `.cache/ravscore-continuation-checkpoint`,
  `.cache/verified-weather-source-handoff-cache`.
- Post-build-inputs `.cache/copernicus-current-targets.json`,
  `copernicus-post-build-authoritative-targets.json` og
  `copernicus-post-build-refresh-manifest.json`.

Weather-preflight og source-validation er særskilte metadatafamilier.
Inventaret er et konkret privacy-review-punkt for de eksisterende cacher;
ordet »private« i et stepnavn giver ikke cacheadgangsbeskyttelse. Ingen
cache er slettet eller payload downloadet under undersøgelsen. De nye
PART-komponentbanker, CP-originaler og componentpack er IKKE føjet til
Actions/cache i ukrypteret form.

## Enklere alternativ vurderet: kun krypteret best-effort progresscache

Root har efterfølgende bedt om at vurdere eksisterende Actions/cache med
én dedikeret `WEATHER_PROGRESS_ENCRYPTION_KEY` på 32 tilfældige bytes. Dette
blev først afklaret som designforslag; den senere lokale implementering
er beskrevet nedenfor og er ikke i sig selv produktionsaktivering.
Det er enklere end en ny Supabase-pointer/CAS/historik/oprydningsprotokol,
hvis formålet udtrykkeligt er best-effort fremskridt og ikke garanteret
durabilitet. Den beskyttede produktionsbundle forbliver autoritativ.

Krav til en sådan afgrænset levering:

1. Kun én fast allowlistet ciphertextfil i cache, aldrig bank-/råfilglobs.
   AES-256-GCM med tilfældig 12-byte IV og 16-byte tag; fast purpose,
   repository og schema bindes som AAD. Nøglen gives kun til betroede
   main-/manuelle-/schedule-kørsler, ikke PR-/forkkode, argv eller logs.
2. Hele ciphertext autentificeres med `decipher.final()` FØR indholdet
   bruges eller udpakkes. Eksisterende bytegrænser, packallowlist og
   kilde-/PART-/tidvalidering gælder stadig. AEAD gør ikke gamle data nyere:
   gammel progress må ikke erstatte nyere beskyttet runtime eller legitim
   valgt-kildehistorik. En cache er aldrig model/state/deploybevis.
3. Explicit save efter faktisk fremskridt skal også kunne køre efter en
   senere jobfejl. `always()` garanterer ikke save efter runner-crash,
   hard timeout eller afbrudt transport. Eviction, nøgleskift, manglende
   secret eller ugyldigt tag er cachemiss med payloadfri status, ikke en
   ny produktionsblokering. Intet ukrypteret fallback ved krypteringsfejl.

GitHub dokumenterer at fork-PRs kan læse maincache, mens almindelige
repo-secrets ikke gives til fork-runs; secrets skal desuden eksplicit
videregives til reusable workflows. Cacher kan udgå efter syv dages
inaktivitet eller pladsfortrængning. Node dokumenterer at AEAD-data først
kan betragtes som autentificeret efter vellykket `final()`.

Primærkilder: [GitHub cacheadgang og retention](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching),
[GitHub secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets),
[Node authenticated decryption](https://nodejs.org/api/crypto.html#decipherfinaloutputencoding),
[Supabase Storage list-implementering](https://github.com/supabase/storage-js/blob/master/src/packages/StorageFileApi.ts).

## Efterfølgende fjernmåling: ingen aktuel pladsblokering

Root rapporterede den isolerede læsekørsels resultat fra run `35437186403`,
job `105881740492`, observeret `2026-09-19T10:21:50Z`:

- `COMPLETE`, privat bucket, 2 objekter, 95.212.566 fysiske bytes.
- Current 47.606.276 bytes, previous 47.606.290 bytes.
- Ingen objekter uden pointerreference, manglende referencer eller
  metadata-størrelsesafvigelser i den observerede opgørelse.
- 604.787.434 bytes ledige inden for det eksisterende 700 MB-budget.
- Estimeret peak 142.818.842 bytes ved endnu en current-stor kandidat.
- Bucketens faktisk rapporterede objektloft er 402.653.184 bytes.

Indholdshashes er ikke kontrolleret af denne metadataaudit. Den praktiske
kapacitet er således ikke en aktuel blokering; den krypterede cache vælges
for at undgå en ny pointer-/oprydningsprotokol, ikke fordi målingen viser
pladsmangel. En fuld ny national komponentbanks størrelse er stadig ikke
målt. Der er ingen storagewrites i denne audit.

## Lokalt implementeret krypteret best-effort helper

`scripts/weather-component-progress-cache.mjs` har tre snævre kommandoer:

```text
capture-base --root WORKSPACE --protected-bundle-sha256 EXACT_VERIFIED_BUNDLE_HASH --base RUNNER_TEMP/base.json --report RUNNER_TEMP/capture-report.json
restore      --root WORKSPACE --base RUNNER_TEMP/base.json --report RUNNER_TEMP/restore-report.json
save         --root WORKSPACE --base RUNNER_TEMP/base.json --report RUNNER_TEMP/save-report.json
```

Kommandoerne køres med `node scripts/weather-component-progress-cache.mjs`.
`GITHUB_REPOSITORY` er scope; krypteringsnøglen gives kun i
`WEATHER_PROGRESS_ENCRYPTION_KEY` som canonical base64 af præcis 32 bytes.
Base-/reportfiler skal være nye filer; de skal ikke caches. Ingen secret
er oprettet af helperarbejdet.

Caller skal kun udføre `capture-base` lige efter en vellykket installation
af den eksakte beskyttede runtime og før vejrhentning. Den hasher
`data/live/conditions.json` streaming og kræver desuden den eksakte
`bundleContentSha256` fra den allerede verificerede protectedbundles
manifest via `privateRuntimeBundleContentSha256(manifest)`. Der gemmes
alene begge hashes og scope. Conditionshash alene er IKKE tilstrækkeligt:
to bundles kan have samme scoreinput, men forskellige ikke-valgte banker.
Det nye format har ingen fallback til conditions-only-binding. Uden
en sådan baseline er resultatet cachemiss, ikke tilladelse til fri restore.
Snapshot-headeren og AEAD binder præcis denne baseline. Restore kræver både
header-match og at de aktuelt installerede conditions stadig matcher
baselinen; dette kontrolleres igen efter validering og før filinstallation.
Save beholder den oprindeligt capturede binding, også når et mislykket
lokalt build senere har skrevet nye kandidatconditions. Dermed kan flere
failed runs fortsætte på samme protectedbaseline, men et snapshot kan ikke
spilles tilbage oven på en anden beskyttet generation.

Save bruger eksisterende allowlistpack med `conditions: {}`: ingen
produktionsmarker, readiness eller score/state. Packbuilderens nye valgfrie
`outputRoot` bevarer alle defaults og markerkrav; progresspack bygges i en
ny privat tempmappe og overskriver ikke produktionspacken. Packen gzip-
komprimeres og krypteres streaming. Restore dekrypterer først til privat
stage og afventer GCM-autentificeringen af hele filen, inden der udpakkes.
768 MiB plaintextpack og ciphertextloft 64 MiB håndhæves; det er
lofter, ikke målte driftsstørrelser. Kun den faste krypterede fil
`.cache/weather-component-progress.encrypted` må optræde i cache/save.

Alle komponentfiler valideres før installation. Eksisterende originaler
bevares i transaktionsbackups og rulles tilbage ved en håndteret filfejl.
Dette er ikke en global crash-atomisk flerfiltransaktion. En ny hosted
runner skal altid installere protectedbaseline først. Hvis rollback selv
fejler, bevares backups, rapporten siger `RESTORE_REPAIR_REQUIRED` og
`requiresProtectedRestore: true`, og CLI slutter med 2. Den runner må ikke
bruge de blandede filer; næste normale cron begynder på en ren runner.

Almindelige cachemisses giver exit 0. Rapporten indeholder kun faste koder,
booleans og størrelser. CLI/reportfejl giver exit 1. Caller må kun gemme
cache når den nye save-rapport har `saved: true`, så en tidligere restored
ciphertext ikke markeres som ny fremgang. Pakken indeholder ingen almindelig
conditions-/score-/statefil; øvrige eksisterende cachefiler røres ikke.

Ni målscenarier består i `test-weather-component-progress-cache.mjs`,
inklusive positive CP-originaler, korruption, forkert nøgle/scope/baseline,
samme conditions på en anden protectedbundle, rollback og bevarelse af
den eksisterende produktionspack samt gammel ciphertext ved komprimeret
overbudget. De ni eksisterende
packtests består også efter outputRoot-ændringen. Ingen providerkald eller
stor gate blev brugt. Et separat review har efterfølgende genkørt de otte
scenarier og kontrolleret helbundle-binding, autentificering før udpakning,
rollback og adskillelsen fra produktionsautoritet uden nye blokerende fund.
Reviewet fremhæver, at den observerede Actions-cache allerede er cirka
10,15 GB: faktisk `encryptedBytes` skal følges, og cacheeviction er stadig
en accepteret best-effort-begrænsning. Ingen automatisk blind oprydning.
Workflowwireup er lokalt færdigt; secretoprettelse og faktisk driftsbevis
mangler fortsat. Helperstatus beviser ikke driftsaktivering.

## Eksisterende ukrypterede cacher: konkret afgrænsning, stadig åben

Et separat read-only kodereview bekræfter, at den nye fem-fil-komponentpakke
IKKE beskytter følgende eksisterende Actions-save-grupper:

- DMI active/candidate: private sampling-/gridpunkter og rå PART/timeværdier.
- CP/OM current shadow, donorbanker, journaler og karantænefiler: private
  punkter, råvektorer og præcise PART/time-bindinger.
- Kystdel-staging og current-field-shadow: private punkter/samplede timer.
- Verified-weather-source-handoff: fem private payloadfiler; kun den separate
  attestation er dataminimeret. Post-build CP-cache gemmer også targetregister
  og en privat kystdelskopi.

Originale DMI-GRIB-filer og deres officielle assetmetadata er en anden
kategori; de indeholder ikke RavRadars valgte punkter. Continuationcheckpoint
er kompakt afledt state/PART-id/samplinghash, uden koordinater, råvejr eller
U/V; det må ikke fejlagtigt beskrives som en rå donorbank.

Main-only save gør ikke plaintext privat. Mindste foreslåede overgang er
samme gennemgåede kryptering til faste, særskilte råcachegrupper med bevarede
eksisterende validatorer. Før gamle restoreveje lukkes, skal seneste active
OG nyere candidate/donorfremskridt bevares og hashverificeres krypteret.
Produktionsbundlen alene indeholder ikke alle failed-run-fremskridt. Derefter
skiftes alle save/restore-par og andre producenter samlet; præcis oprydning
af gamle cache-id'er følger først efter verificeret bevarelse. Ingen cache
er slettet eller hentet i dette read-only review, og overgangen er ikke
implementeret. Den nye komponentkryptering må ikke kaldes fuld cacheprivacy.
