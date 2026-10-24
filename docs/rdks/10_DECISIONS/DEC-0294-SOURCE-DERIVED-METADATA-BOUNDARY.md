# DEC-0294 – SOURCE-kode og dens genererede kontrolmetadata

## Lokal opfølgning 24. oktober — påvist WAM-fixtureidentitet, native-forløb fortsat åbent

Den bevarede SOURCE713-kontrol på c94 stoppede i PROVIDERS-H0 ved første wam_nsb-asset: 212 krævede mål, 0 accepterede og 212 ASSET_PROVENANCE_MISMATCH, uden afbrudt decode. scripts/fixtures/source19-current-initial-weather.py manglede assetIdentitySha256 i sit asset. Normal register_raw_cache_asset havde allerede registreret den kanoniske href-hash; official_wave_asset_identity kunne beregne samme fallback uden at ændre asset, mens MappingWaveAsset læste det manglende felt som tom streng. Den uændrede provenancekontrol afviste derfor sammenligningen.

To additive hunks er nu lokalt anvendt: fixturefeltet bruger normal asset_identity_sha256(href), og den eksisterende Python-prøvefil har fået test_initial_wam_asset_uses_normal_canonical_mapping_identity. Prøven udtrækker den faktiske asset-tildeling og de faktiske rene identitets-/MappingWaveAsset-definitioner; begge WAM-familier, kanonisering, uændret input og gammel manglende-felt-adfærd kontrolleres. ROOT kørte det normale --provider-diagnostic-unit én gang med EXIT0: 10 prøver på 0,702 s (6b93c9). Det er ikke en GRIB-decode eller native-admission.

Begge H0/H1-kaldere bruger samme rettede fixture for alle 121 offsets. Den normale updater, admission, model-/kildevalg, 4.0.588, C157/I153/T12, de syv bindinger, lager-ABI og udstedt SQL bevares uden ny udstedelse. Kun den konkrete ukendte WAM-årsag er nu afklaret; de ældre målinger nedenfor bevares som historik. Faktisk native H0/H1, efterfølger, PostgreSQL, ny præcis samlet SOURCE-CI, CURRENT, kontrolleret installation og offentlig effekt er fortsat åbne. SOURCE er inaktiv; installeret 587 er en separat forudsætning, og P0-vejrhentningen påvirkes ikke.

## Historisk lokal opfølgning 23. oktober — faktisk udstedt, endnu ikke kvalificeret eller installeret

Efter den første fejlede SOURCE-nativekontrol er dens første underårsag fortsat ukendt. En separat reproduceret H0-fixturkonflikt er lokalt rettet, og faste H0/H1-fejlprojektioner er sammenkoblet. De normale Python-indgange 7+1 og Node22-checkpointprøven består. De fire ændrede prøve-/nativeblade er uden for de faktiske C157/I153/T12-inventarer, producentinventaret og lager-ABI; denne delta kræver ingen genudstedelse af version, bindinger eller SQL. Ny præcis SOURCE-CI skal stadig udføre sin egen nativefase med EXECUTED, origin=null og eligibleForReuse=false; historisk 586/587-evidens kan ikke erstatte den.

**Nyeste status:** IMPLEMENTERET OG LOKALT UDSTEDT som 4.0.588; fortsat inaktiv og ikke installeret. Denne opfølgning erstatter alene de ældre statusudsagn nedenfor om uudstedt version, manglende workflowport og afventende afledning. Hele den tidligere beslutningstekst bevares.

Den normale SOURCE-workflowport er nu lokalt anvendt på den sammenførte genuine587/P0-kilde. Version:set 4.0.588 er udført præcis én gang og skal ikke gentages for status. Faktisk C157/I153/T12, binding/output, append-only SQL 20261023182922 og normal synk af de syv forbrugere er lokalt udstedt. De fem normale fixedpoint-kontroller sluttede med EXIT0 (5b00d9); dette er lokal kildeudstedelse, ikke SQL-eksekvering eller installation. De fulde pins står i DEC-0294 og CURRENT_TRUTH.

- C157: 787fd4bb1abbf694ccce99e89a1c7faa15c20fee6957fe31f6db3ef5c4ea37a5.
- I153: 5fa3e96cb3cf0f47e6a10bd37d4e1b1b93f837bf0f221dbb49d2a6442289dbc8.
- T12: e56c01e138e154c4603e3baf2063f5d9cfc0714adc38f66c3fa88c17cf0eda82.
- Kanonisk SOURCE-output: 97b0429f163965f943981c475880be15e14139ff0e0dbeda96cde4c99c1675f3.
- Checkpointkontrakt: acd12ffdbe2b9c18dfbe57711a240cab1c1f59a45dc94f6580e43ff9265dbae0.
- Migration 20261023182922_source_producer_original_bound_successor.sql: 344.469 bytes; SHA256 b4cac55d2b2164f32d5fe0cc405c7aabce55590b10d86809b1325af21adf17d5.
- Trippolitik: 62364701e81c53d00a39dcb03a793f524c831f26e046a213d11ce23a5d1348aa.

Den påviste indlæserkæde er lukket med fem additive, præcist whole-hash-bundne importinventarer for account-prewrite, account-runtime-transition, post-cutover-migrate, last-mile- og I71-kildehjælperne. De aktuelle fem filer var byteidentiske med de kendte ejere; alle gamle scannertabeller og almindelige relative imports bevares. Den afgrænsede normale inventarprøve bestod (027c35); ingen generel parserlempelse, filudelukkelse eller ny runtimeautoritet følger heraf.

De fem finite inventarrækker bevarer alle gamle HOST-tabeller og deres afslag på ukendte whole-bytes. De normale ni, elleve og femogtyve relative imports for de tre runtimeejere er fortsat bundet; de to faste historiske kildehjælpere har ingen almindelige relative ESM-imports. Der er hverken generel computed-import-fallback, alternativ kilde, ny capability eller udelukket implementering.

Den normale lokale prøve 67024 havde 76 PASS, 2 fejl og 1 Windows-skip. De to konkrete lokale fixture-/miljøfejl er lukket ved målrettet opfølgning 4393 med EXIT0; hele målet er ikke gentaget. De ni SOURCE-workflowtilfælde består. Dette må ikke kaldes samlet grønt SOURCE-CI, native PostgreSQL eller offentlig effekt.

ÅBENT: præcis samlet SOURCE-kvalifikation/native PostgreSQL/CI, kontrolleret installation og genlæsning, national kapacitet og almindelig efterfølger, efter-main CURRENT samt offentlig virkning og dokumenteret drift på Supabase Free/Cloudflare Free. Faktisk installeret 587 er stadig en særskilt forudsætning for SOURCE-overgangen. P0-vejrhentningen er fortsat aktiv og ejes af ROOT; denne dokumentopfølgning udleder intet nyt produktionsresultat. Alle fem mål er åbne til 18. november 2026.

De ældre formuleringer nedenfor om manglende workflowport, uudstedt version/metadata og afventende afledning er bevaret planhistorik og erstattet kun på disse konkrete punkter. Gamle migrationsoriginaler, autentiske B/S, originaler, offentliggjorte scorer og de historiske orakler bevares.

- **Status:** DELVIST IMPLEMENTERET; lokalt sammenført kode, planlagt 4.0.588 er uudstedt og inaktiv.
- **Oprindelig beslutningsdato:** 2026-10-21.
- **Præcisering:** 2026-10-23; genuine587-efterfølger på den samlede P0-kilde.
- **Omfang:** Kilde-/metadataadskillelse, ikke installation eller ny produktionsautoritet.

## Årsag og afgrænset valg

Den normale modelkæde når SOURCE-indgangen, dens tail, readiness og bindingskode.
Hvis egne C/I/T- og SQL-outputværdier stod som literaler i denne kode, ville
udstedelsen ændre selve beregningsinputtet igen. En ny LF-kopi eller et nyt
versionsnavn løser ikke den selvbinding.

Genererede værdier holdes derfor i præcis én datafil:
`scripts/lib/source-producer-binding.generated.json`. Den har kun schema,
version, binding og output. Kanonisk JSON, faste felter, højst 8 KiB,
hashformater og den indbyrdes sammenhæng kontrolleres. NULL er den reelle
uudstedte tilstand. Datafilen er hverken eksekverbar kode, et alternativt
kildevalg, en kaldervalgt tuple eller en capability.

Begge normale modelbyggere bruger den deklarerede v3-normalisering. De
undtager den navngivne genererede datafil og det præcise eksisterende
releaseværktøj `scripts/ravscore-operational-activation.mjs` ud over deres
allerede genererede filer. Der er ingen generel undtagelse for SOURCE,
scripts, ukendte imports eller implementeringskode. Indgang, tail,
readiness, reconciliation og deres faktiske normale JavaScript-ejere
forbliver bundet gennem den virkelige importkæde. De eksisterende
rendererformater og I-manifestets fem felter bevares.

## Fysisk kildebevis er en anden grænse end lager-ABI

Den normale SOURCE-indgang kræver producentfortegnelsens filer som entydige,
almindelige blobs i faktisk HEAD og uændrede arbejdsbytes. Genereret metadata,
dens validator, tail, aktiveringsværktøj og de konkrete eksekverbare ejere skal
fortsat have deres rigtige fortegnelsesejere. Ucommittet eller manglende kode
bliver ikke godkendt af en tom diff eller en lokal markør.

`fullRuntimeContractSha256` beskriver den persistente lager-ABI. Tilføjelser
til `PRIVATE_RUNTIME_PRODUCER_SOURCE_FILES` er ikke i sig selv en ny
lager-ABI eller et samlet bytebevis fra denne hash. Normal kilde-/ejerkontrol
og faktisk lagerkompatibilitet må ikke forveksles.

## Afledning på den nye samlede kilde

ROOT vælger faktisk apprelease og en ny migrationstid efter den genuine
587-forgænger. Planlagt apprelease er 4.0.588; ingen ny identitet er udstedt
som del af denne dokumentation.

Normal versionssynk kommer før C → I → T. Den genererede C-fil skal være
aktuel, før de efterfølgende afhængigheder beregnes. SOURCE-binding og derefter
SQL-output afledes fra disse faktiske resultater på samme kilde. SQL-builderen
skal genberegne C/I/T, de fulde genererede moduler og alle outputpins, før den
ene nye fil kan oprettes med append-only-semantik. De syv normale forbrugere
synkroniseres derefter, og normal genberegning skal nå samme fixedpoint.

Den nye forgænger er genuine587, ikke den gamle isolerede revisions 585.
Alle 66 nuværende migrationsoriginaler, originale B/S-attester, projektioner
og offentliggjorte scorer bevares. Gamle C145/I141-, 020000-, 030000- og
040000-beviser fra den isolerede SOURCE-4.0.586 er dateret historik, ikke nye
værdier eller mellemtrin. Ingen retagging, sourceOverrides eller omskrivning
af gamle SQL-/JSON-originaler må erstatte faktisk afledning.

## Kvalifikation og driftsadskillelse

Den normale workflowintegration er særskilt ÅBEN: reusable-weather-build og run-current-weather-once er endnu ikke koblet til source_normal_producer, selv om action, entry og tail er fysisk samlet. Denne kaldersammenføring skal afsluttes og gennemgås før C/I/T-/SQL-udstedelse, præcis CI eller aktivering; fysisk kildekomposition er ikke en lukket normal rute.

Før-merge SOURCE-native-/PostgreSQL-kontrol skal bruge sin egen fase,
kommando, artifactidentitet og faktiske beviskæde. Gammel native586/587 må ikke
udvides med et alias, og test-only historiske inverser er ikke produktadgang.
Den normale account-indgang ejer prewrite-, sync-, workflow- og Node24-
strukturtargets én gang; disse imports er ikke en ekstra native/follower-
eller CURRENT-kørsel.

Den særskilte opt-in CURRENT-kvalifikation kommer først efter faktisk grønt
main og dets normale kildebevis. Den forudsætter ikke allerede installeret
SOURCE. Faktisk installeret 587 er derimod fortsat en separat forudsætning for
den senere produktionsovergang til SOURCE.

Lokal komposition, metadataafledning, SQL-kildetekst og delprøver er ikke
samlet CI, databaseinstallation, B før S/genlæsning, national kapacitet eller
offentlig drift. Disse beviser og egnethed til Supabase Free/Cloudflare Free
står åbne, indtil de faktisk er målt og gennemført.

P0 og den almindelige vejrhentning har førsteprioritet og deres egen aktuelle
status hos ROOT. Denne dokumentation ændrer ikke scoreformel, kildeprioritet,
administratorpunkter, geometri, historik, tidsbudget, cron eller planer og
giver ingen ny aktiverings-, nulstillings- eller sletteautoritet.
