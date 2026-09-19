# Strøm: 96-timersvalg og responsbundet modelalder

Status: **lokalt implementeret fra plan/producer til closure og JS-læser**,
endnu ikke produktionsverificeret eller leveret. Ingen rigtig providerkørsel,
ledgerændring, workflowændring, endelig modelbinding, SQL-generation eller
produktionsændring. De tidligere designafsnit nedenfor er historik; de konkrete
indgange og begrænsninger er nu følgende.

## Seneste implementering

- `build-copernicus-target-registry.py` bygger en separat hashbundet
  `agedDmiChallengePlan` fra den allerede validerede DMI-attestation. Ægte
  huller og challengepar forenes til providerens arbejdsplan, men rå
  `operationalDmiVerifiedPairCount` og DMI-ledger bevares. Ingen challenge
  giver gammel DMI stemplet MISSING. Uden challenge bevares legacy-registry.
- `run-copernicus-current-pilot.py::acquire_shard_rows` læser CF
  `forecast_reference_time` fra selve den hashbundne subsetfil. Scalar eller
  præcis timeindekseret reference accepteres; eventuel `forecast_period`
  krydstjekkes. Globale download-/creation-attributter er ikke modelbevis.
  Mangler koordinaten, gemmes normale U/V-data uden aldersbevis.
  Historiske analysetimer før subsetfilens fælles prognoseoprindelse beholder
  ligeledes deres eksisterende admission uden modelalder; de må ikke kassere
  hele subsetfilens øvrige gyldige fremtidstimer.
- `current_model_reference.py` og `current_aged_dmi_challenge.py` validerer
  bevis og 96-timersplan. `make_record` binder modelbeviset til record-id og
  acquisitionens subsethash. Eksisterende records forbliver byte-/hashgyldige.
- Source-stage og runner bruger samme challengefilter ved oprindeligt valg,
  progression, finalisering og bounded refresh. En modelreference skal være
  nyere end beskyttet DMI og ikke efter låst produktionstid. Almindelig
  acquisition af ægte huller køres før særskilt challengearbejde inden for
  det samme eksisterende budget. Genhentning nulstiller ingen modelalder.
- Closure genbygger planen imod den oprindelige ledger og attestation,
  vælger kvalificeret CP eller bevarer DMI, og binder `agedDmiReplacement`
  til valgt assignment. `agedDmiSelection` skelner rå DMI, udfordrede,
  erstattede og beholdte par. Ubefyldte challenges er ikke datamangler.
- Det nuværende OM-svar giver ingen dokumenteret oprindelig modelreference.
  Det anvendes derfor fortsat til ægte huller; ubesvarede challenges sendes
  ikke videre som falske regional-/OM-huller. Det er upstream-evidensgrænsen,
  ikke en antagelse om at hentetid svarer til modelalder.
- Ny CP-livekontrakt er
  `copernicus-live-current-record-fixed-decimal-model-reference-v2` med
  `modelRun`, `subsetSha256`, `modelReference` og hashbundet modelreference.
  Python-producenten og JS-læseren kontrollerer samme felter, valgt revision,
  96-timersgrænse og opaque closuremedlemskab. V1-læsere består parallelt.

`test-current-aged-dmi-challenge.py` er en lille 1-PART-test gennem faktisk
NetCDF-fixture/runner, CP-record, registry, source-stage, closure,
Python-liveprojektion og JS-merge. DMI-native-admission og tom regional policy
er afgrænsede fixtures; der køres ingen national råvejrfixture. Den beviser
præcis 96 timer, 95 timer, ukendt reservealder, nyere DMI igen, uændret ledger,
bevarelse ved lige gammel/ældre reserve og afvist ændret modelreference. Tests er ikke
produktionsevidens. De nye helperfiler og måltesten skal indgå i den samlede
release-/runtimeinventering ved endelig samling.

## Rettet nu

De eksisterende v1-projektioner for Copernicus/Open-Meteo-strøm binder
`acquisitionAt`, men ikke `modelRun` eller `modelReference`. Python-producenterne
og JavaScript-læseren afviser nu ikke-null eftermonterede modelreferencefelter i
disse v1-projektioner. Ellers kunne et ekstra ubundet felt se ud som et bevis,
når en senere generisk kildevælger vurderer modelalder. Eksisterende records
uden modelreference bevares og er fortsat gyldige huludfyldere. Deres hentealder
bliver aldrig en prognosealder. Hashindholdet for lovlige v1-records er uændret.

Målchecks: `test-live-current-pilot-4.0.232.mjs`,
`test-open-meteo-live-runtime.mjs`, `test-current-model-reference-boundary.py`.
De to JavaScript-checks bruger deres eksisterende små syntetiske fixtures,
herunder gamle men stadig horisontgyldige værdier og geografisk/source-bevis.

## Historisk analyse: hvorfor en isoleret alderskontrol ikke var nok

1. `scripts/build-copernicus-target-registry.py` danner den operationelle
   `required`-liste fra DMI-ledgerens eksakte `operationalComplementPairs`.
   `scripts/lib/current_operational_closure.py::build_current_operational_closure`
   kræver fortsat eksakt lighed. Gyldige gamle DMI-par er derfor slet ikke
   med i reservens kandidatmatrix.
2. `scripts/lib/copernicus_current.py::{ACQUISITION_FIELDS,make_acquisition,
   _validate_acquisition}` og `scripts/lib/open_meteo_current_fallback.py::{
   RECORD_FIELDS,build_record,_validate_record}` har strenge eksisterende
   schemaer uden responsbundet modelreference. `acquisitionAt`/`acquiredAt`
   er ikke erstatninger.
3. `scripts/build-live-current-pilot.py::{copernicus_entries,open_meteo_entries}`
   og Python/JavaScripts fixed-decimal-projektioner fører ikke modelreferencen
   gennem den hashbundne private kæde. Den nye v1-afvisning gør denne grænse
   eksplicit; den aktiverer ikke et nyt v2-bevis.
4. Closure schema 3 og JavaScripts `buildOperationalClosureDocumentProof`
   binder disjunkte DMI/complement-partitioner og eksakte klasseantal. Rå
   verificeret DMI og valgt DMI er i den nuværende kontrakt samme mængde.

## Historisk integrationskrav (implementeret lokalt som ovenfor)

- Bevar rå DMI-validledger og attestation helt uændrede: gammel gyldig DMI
  forbliver gyldig, også når en nyere reserve tillades som valgt input.
- Tilføj en separat hashbundet challenge-plan efter native admission med
  `productionReferenceAt`, præcist PART/time, afløst DMI-modelrun/sourceproof
  og årsagen `AGED_DMI_CHALLENGE`. Skeln reelle huller fra challengepar i
  plan, tællere og efterfølgende closure; manglende challenge-svar beholder DMI.
- CP skal udlede modelreference fra den faktiske subset-fil og knytte beviset
  til dens hash; OM tilsvarende fra det faktiske modelspecifikke svar.
  Ukendt/absent modelreference giver kun huludfyldning. Ingen afledning fra
  downloadtid, cachefilens dato eller prognosens `validTime`.
- Viderefør bevis gennem acquisition/record, bankvalg, valgt assignment og en
  ny versionsbundet live-projektion. Eksisterende v1-læser bevares for gamle
  gyldige records. Native tid/sted, U/V-polaritet, samme celle/lag, regional
  allowlist og opaque medlemskabsbevis ændres ikke.
- Kun ved `lockedReference - DMI.modelRun >= 96h` må en kvalificeret nyere
  CP-modelreference, dernæst OM, overtage samme par. Nyere DMI kan overtage
  igen; samme genhentede gamle DMI-run må ikke nulstille alderen.
- Lad closure beslutte det eksakte valg, og lad JS-læseren verificere samme
  hashbundne beslutning. Der må ikke indføres en anden uafhængig prioritering
  efter closure eller en falsk DMI-MISSING-klassifikation for at omgå schemaet.
- Test målrettet 96h minus 1 ms/præcis 96h, ukendt modelalder, nyere reserve,
  gammel genhentet DMI, nyere DMI igen, manglende reserve og bevaret native
  horisont. Både nye kandidat-/challengebeviser og legacy huludfyldning kræves.

Dette er en kontraktudvidelse gennem plan/producer/bank/closure/læser, ikke
en én-linjes ændring i `mergeLiveCurrentPilotIntoRecord`. Den er nu forbundet
lokalt, men skal leveres og bevises på rigtig drift før DEC-0210's regel kan
meldes produktionsverificeret for strøm. Fuld reservedækning er ikke bevist.
