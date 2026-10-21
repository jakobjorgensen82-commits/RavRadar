# DEC-0294 – SOURCE-kode og dens genererede kontrolmetadata

- **Status:** DELVIST IMPLEMENTERET; lokal, inaktiv forberedelse.
- **Dato:** 2026-10-21.
- **Omfang:** Den isolerede SOURCE-revision; ingen aktivering eller installation.

## Årsag og valg

Faktisk afledning af begge modelinventarer har påvist en selvbinding:
produktionsdelkæden når via den etablerede oprindelseslæser og normale
lager-/ejerskabskald SOURCE-indgangen, dens readiness og den nye bindingskode.
Egne C/I/T- og SQL-outputværdier som literaler i denne kode ville ændre selve
C/I-inputtet igen, når de udstedes. En LF-kildekopi alene løser ikke cirklen.

Genererede værdier placeres derfor i præcis én datafil:
`scripts/lib/source-producer-binding.generated.json`. Filen indeholder kun
schema, version, binding og output. Eksakte felter, kanonisk JSON, højst 8 KiB,
hashformater og sammenhæng kontrolleres. Den er ikke kode eller en alternativ
kalderautoritet. Nullfasen bevares, indtil faktiske værdier er afledt.

Begge normale bundlere får en ny v3-normaliseringsidentitet og undtager alene
denne navngivne genererede datafil ud over de eksisterende genererede filer.
`scripts/ravscore-operational-activation.mjs` får samtidig den præcise
releaseværktøjsgrænse, som begge normale modelprøver allerede kræver.
Der er ingen generel undtagelse for SOURCE, scripts, ukendte imports eller
implementeringskode. Indgang, hel-tail, readiness, reconciliation,
ejer-/proces-/filkontroller og metadata-validatoren forbliver faktisk i C/I.
Gamle rendererformater og I-manifestets fem felter bevares.

## Kilde- og udstedelsesbevis

Datafil, validator, tail og aktiveringsværktøj indgår eksplicit i den fysiske
producentfortegnelse. Den normale indgang kræver alle fortegnelsens filer som
entydige almindelige blobs i faktisk HEAD og uændrede arbejdsbytes.
`git diff` alene er ikke bevis for en hidtil ucommittet fil. Hele det faktiske
committede kildeindhold skal fortsat have sit normale kildebevis.

Dette er ikke et nyt bytebevis fra `fullRuntimeContractSha256`; den aktuelle
lagerkontrakt dér binder lager-ABI, ikke alle producentkilder.

Normal versionssynk skal ske før reel C → I → T-afledning. Derefter afledes
bindingsdata og SQL-output fra samme egne LF-kilde, og normal builder/check
skal genberegne alle faktiske C/I/T og SQL-pins til et stabilt resultat.
Opfundne tuples, sourceOverrides, ændrede gamle SQL-/JSON-originaler eller
omdøbning af en frossen 585-kilde til SOURCE må ikke bruges som bevis.

## Normale workflows og deres historiske kontroller

Første præcise 586-kontrol stoppede før native PostgreSQL: den gamle
completed-runtime-kontrol genkendte ikke den nye almindelige SOURCE-rute.
Det er ikke kun fem nye User-Agent-versionsfelter; build og manuel kalder
har også request-, selector- og outputændringer. Kontrollen må ikke repinnes
eller fjernes, og en testinverse må ikke blive produktets genbrugsautoritet.

En særskilt test-only inverse binder alle 152 build- og fire once-Git-hunks
til de faktiske hele efterbilleder og genskaber præcis den genuine b2-kilde.
Alle gamle 585- og ældre orakler bevares. Den faktiske nye kode prøves
særskilt: default-OFF, blandede/ukendte requests, 19 outputfelter, NO_WORK,
forberedt resultat, afslag uden legacy-fallback, gamle selectors over 24
tilstande samt faktisk dependency-, main- og B-før-S-rækkefølge. Det er
kildekontraktprøver, ikke native B/S, installation eller produktionseffekt.

## Status og bevarede grænser

### Tillæg 2026-10-21 — kalenderformatter og faktisk 040000-afledning

Den normale kalender genbruger højst 16 formatterkonfigurationer for præcise,
almindelige tidszonestrenge på højst 64 tegn. Datoer, vejr, scorer og
rankingresultater caches ikke. Ukendte, objekt- og implicitte tidszoners
normale coercion/afslag samt ugyldige datoer, DST og DA/DE/EN bevares.
Den eksisterende kalenderprøve består. En afgrænset lokal prøve med 2.048
kald giver identiske resultater, 2.048 → 1 formatterkonstruktion og målt
191,9514 → 28,1594 ms. Dette er ikke en national tidsmåling.

Modulet indgår faktisk i begge modelinventarer. Fra egen LF-kilde er derfor
normalt afledt mål `20261021040000` med følgende faktiske identiteter:

- C145: `cd24549a1a375d00499699397c0ff44bee70b699906462115f0a4101828649e5`.
- I141: `fddfef8b8955e5a6ab55b4fb273884f43cbf355041727865b2080be9ff3f1400`.
- T12: `9b9be3ded6a71e1c8d2253d626ac35a6daf172ad3acab6008f10cec9cd8cc231`.
- Append-only SQL: `91e1030424e886c19bc2c3d1eb24d2d9332d992c60b1ca3930e5409a9d3ed19f`.
- Kanonisk SQL: `be9843ed4b9aa178df4626eaa5df8e06d917b5077267fc8830857765e3d502bc`.
- Checkpointkontrakt: `08f8dd36fdd9ab2acf3e3c09625cd473bba4b6ecec3339702b4ee1ed0d872825`.
- Turlagerbinding: `86e6e9e8a68b6272e9c4e591071821c6033ead26898a1fed5773ce955c5e81e3`.

Begge normale bundlechecks, SOURCE-SQL-check, normal syvforbrugersynk-check
og kalenderprøven består faktisk på den egne LF-vært til fixedpoint.
De normale 11 genererede output er mekanisk indarbejdet i SOURCE-kilden.
Alle 66 tidligere SQL-filer er bytebevaret; numeriske SQL-regler og fysiske
scorekontrakter er uændrede. 040000 vælges fra samme genuine 585-forgænger.
De aldrig installerede 030000 og 020000 bevares som dateret kildehistorik,
ikke som mellemtrin. Dette erstatter kun deres tidligere aktuelle målvalg.

På den faktiske Windows-kilde består C-/I-/kalendermål særskilt. SQL- og
synk-check stopper derimod fortsat i den normale oprindelseslæser, linje 87,
på `supabase/migrations/20261017140000_established_native_current_origin_bound_successor.sql`:
rå 304.564 bytes har SHA-256
`d081fbe84968fbbabcb5e66dc7bd160d57fdd0e28528eeaba24cd33d881373bc`.
De 5.056 CRLF og ingen løse CR giver ved ren LF-projektion 299.508 bytes med
`f1d12590cfc93047afa94cdf152fab6e77f2851807695f0771127a2fdf6122b5`.
Projektionen er byteidentisk med både den genuine Git-blob og LF-værtens
råfil. Det er altså ikke ekstra SQL-indhold eller en påvist 040000-fejl.
Originalfilen er ikke normaliseret, og hashguard er ikke lempet; Windows-
afslaget bevares som faktisk fejl, ikke som et bestået SQL-/synkmål.

Denne lokale afledning er ikke ny præcis samlet CI, native PostgreSQL,
autentisk B/S-overgang, national efterfølgerkapacitet, installation eller
offentlig effekt. Den senere kvalifikation skal bruge den genuine egne
committede LF-kilde. SOURCE er fortsat inaktiv; ingen vejr-/providerfrist,
scoreformel, kildeprioritet, adminpunkt, geometri eller normal cron ændres.

### Tillæg 2026-10-21 — præcist PR-loft, ikke nye vejrbudgetter

P0-kildekontrollens faktiske 120-minutters jobafbrud er særskilt dokumenteret. SOURCE overtager alene det gennemgåede 180-minutters PR-loft; de øvrige kommandoer, trin, rettigheder, Node22-miljøet og den præcise Node24-child-afgrænsning er uændrede. Den eksisterende kontrol genskaber nu hele genuine c4f4-SOURCE120, derefter hele bb8d-P0120 gennem den gamle præcise Node24-inverse og fortsat hele 90-/75-minutters kæden. Historiske budgetter godkendes ikke som det aktuelle job.

ROOT har anvendt de tre gennemgåede blade og kørt de tre faktiske normale mål på de fysiske filer med Node22: tre PASS, nul fejl eller skip. Hele efterbilleder matcher den private gennemgang. Blade og normale testændringer har nul intersektion med C145/I141/T12; gamle SQL- og modelværdier bevares. Dette er ikke fuld kildekontrol, native PostgreSQL, national kapacitet eller installation. Forbedring af faktisk kontroltid behandles særskilt; ingen vejr- eller leverandørfrist forlænges.

### Tillæg 2026-10-21 — normale katalogheadere i den syntetiske providerfixture

Den efterfølgende faktiske Linux-kontrol kvalificerede nu providerens første kildested: normal ledgerforsegling, ikke SQL, signal, OOM eller en observeret timeout. En lille normal reproduktion har 118 verificerede par, men kun én af tre kørselsheadere; den strenge normale kontrol afviser præcist manglende processing-signature og derefter samme sealerlinje som i GitHub.

Kun fixturegrundlaget tilføjer de manglende katalogheadere fra det faktisk valgte syntetiske modelRun og de normale parser-/parameter-/gitterversioner samt den normale processing-signature. Nye processedSteps er tomme. Eksisterende decoder-ejet metadata, alle rækker og 121 inputtimer inklusive T+3 bevares. Den uændrede ledger, terminalkontrol og attestation afgør fortsat READY; der forfattes ingen færdig ledger eller numerisk produktproveniens.

Den normale lille prøve bevarer det gamle afslag og viser derefter ægte sealing af 118 par, nul rest og ærlig UPSTREAM_ABSENT for de to tomme kataloger. Eksisterende korruption og manglende terminalbevis afvises fortsat. ROOT har fysisk integreret de tre gennemgåede test-/fixtureblade og kørt den faktiske normale Node22→Python-kalder: ét bestået mål uden fejl eller skip. Alle 76 beskyttede blade, inklusive DMI-producent, validatorer, C/I/T, version/geodata og 66 migrationer, er byteuændrede. Kun afsluttende blanklinjer i de gennemgåede efterbilleder er normaliseret.

Det er ren ledger-/fixtureevidens, ikke ecCodes-/decoder-/Linux-native-/PostgreSQL- eller nationalt kapacitetsbevis. Ny samlet præcis kildekontrol, efterfølgende provider-/forecast-/followerfaser og sikker offentlig SOURCE-levering er stadig åbne. Koden er ikke aktiveret, og P0's almindelige vejrhentning har fortsat førsteprioritet. Ældre åbne diagnostikudsagn nedenfor er kun erstattet på de nu faktisk beviste kildested-/fixturepunkter.

### Første fejl skal bevares, ikke gættes

En efterfølgende native databaseprøve gav kun en generisk assertion. En reel
Node-assertion med fast brugerbesked tilføjer også faktiske og forventede
værdier; den gamle helbesked-regex mistede derfor selv en præcis child-kode.
Det beviser et diagnostikhul, ikke den oprindelige indre kørselsårsag.

De eksisterende testkaldere bevarer nu første kvalificerede fase og fysisk
kontrollerede kildested med SHA-256, linje og eventuel kolonne. Kun et endeligt
katalog af fejlkoder og rapportfelter må vises. Rå fejlbeskeder, stacks, SQL og
assertionværdier må ikke følge rapporten. De tre legacy-childfaser skelnes,
og deres faste rapport vælges før den uændrede exit-assertion. Den eksisterende
strenge CURRENT-rapportlæser genbruges med samme katalog og afslag.

Private stdout-/stderr-bytes bevares før filtrering uden for databaseprøvens
normale oprydning. Den eksisterende 2-MiB-buffer og 240-minutters childfrist
ændres ikke: bufferstop, signal eller ukendt capture mærkes ufuldstændigt og
fortolkes ikke som en hel rapport. Fejl i diagnostik må ikke erstatte den
oprindelige fejl, give child-succes eller ændre processtop og oprydning.

Kun test-/fixturefiler uden for begge aktuelle C/I-inventarer ændres. Derfor
udstedes ingen ny version, C/I/T eller SQL af dette trin. Små kode-, frame-,
privatheds- og childfaseprøver er særskilte fra Linux/native PostgreSQL.
Præcis ny kildekontrol og egentlig årsagsafklaring kræves stadig; en bedre
rapport er ikke en produktrettelse eller en offentlig SOURCE-levering.

Den følgende præcise kontrol nåede providerbarnets ikke-nul-udfald. Den gamle
assertion ved denne procesgrænse beviser hverken barnets exceptiontype, SQL-fejl,
positiv timeout eller hukommelsesmangel. En supplerende test-only projektion
bevarer derfor faktisk signed returkode, fast signalnavn samt de allerede
lukkede private stdout/stderr-strømmes byteantal, SHA-256 og fuldstændighed.
Manglende, ændret eller oversize capture er ufuldstændig og må ikke give en
udledt årsag; SIGKILL er ikke i sig selv OOM-bevis.

Providerens normale CLI videresender ved den første reelle exception alene
en fast type, eventuel faktisk 30/120-sekunders helper-timeout, kendt helperkode
og fysisk kvalificeret script/SHA-256/linje. Kun de 36 eksisterende, AST-bundne
afvisningskoder eller UNKNOWN må følge rapporten. Ingen rå besked, argv, stack,
assertionværdier eller vejrdata vises. Diagnostikfejl må ikke erstatte den
oprindelige fejl. Alle tidligere projektioner, assertions, procesudfald,
oprydning, 2-MiB-buffer, 240-minutters childfrist og helperfrister bevares.

Fire test-/fixtureblade ændres uden for aktuelle C/I-inventarer. Syv rene
normale Node/Python-mål består uden skip; de omfatter signal, ukendt kode,
strenge headers, faktisk timeouttype, ufuldstændig capture og adversarial tekst.
Den første private Windows-invocation nåede ingen test før en file-URL-fejl;
kun dens invocation blev rettet før det ene faktisk kørte mål. Linux-kvalificeret
positiv frame, native PostgreSQL, ny præcis CI og selve providerårsagen er stadig
åbne. 030000, C/I/T, alle migrationer og den almindelige vejrhentning ændres ikke.

Den efterfølgende Linux-kontrol bestod både den aktuelle distribution og hele
den native SDK-/offlinegruppe. Den stoppede senere ved import af den udskilte
normale tail: to ubrugte gzip-/gunzip-deklarationer havde ikke deres gamle
importbindinger. Begge deklarationer fjernes; der indføres ikke nye imports
eller komprimeringsadfærd. En statisk gennemgang af hele entry/tail fandt
ingen andre ubundne navne. Den normale berørte DMI-kalderprøve består lokalt
med 34 PASS og otte bevarede Linux-specifikke skips; det er ikke Linux-bevis.

Ændringen er faktisk modelbundet kode, ikke en testrettelse. Derfor afledes
egne C145/I141/T og nye SQL-output igen fra den korrigerede LF-kilde.
Append-only `20261021030000_source_producer_original_bound_successor.sql`
erstatter alene den aldrig installerede 020000-kandidat som valgt SOURCE-mål
fra samme genuine 585-forgænger. Den gamle 020000-fil og alle øvrige 65
eksisterende migrationsfiler bevares byteeksakt; den må ikke installeres som
et mellemtrin. Den normale midlertidige migrationsvisning vælger fortsat kun
den præcise krævede kæde. Ny samlet CI, PostgreSQL og aktivering er åbne.

Den efterfølgende præcise kontrol bestod den tidlige Linux-pakkelæser, men
stoppede før native PostgreSQL ved en gammel cache-only distributionsprøve.
Den genuine gamle pakke har 49 afhængigheder; SOURCE tilføjer alene den
officielle artifact-SDK's 210 ekstra pakker. Produktvagten kræver allerede
begge hele aktuelle manifests, faktisk transitiv graf og præcis hel-inverse
til de gamle manifests. Den vagt, låsefil og gamle forventninger ændres ikke.

Test-only afledning bevarer hele den gamle 49-pakkeprøve, mens den faktiske
259-pakkedistribution kontrolleres særskilt gennem installerede metadata,
enginekrav, officielle importflader, de reelle manifestvagter og syv afslag.
De fire efterfølgende officielle SDK-loopbackprøver og begge offline-npm- /
cohortprøver beholder de faktiske nye manifests og den normale actionkode.
De bruger ikke den historiske projektion som eksekveret pakke. Oprydning
omfatter kun præcist ejede, identitetskontrollerede blade og mapper og bevarer
første fejl. Det lokale Node24-mål består uden API-kald. Python-syntaks er
adskilt fra Linux-native bevis; en Windows-prøves Node-opstart afvises under
det uændrede Linux-miljøfilter og må ikke ommærkes som native PASS. Faktisk
Linux-cohort, PostgreSQL og samlet ny CI er fortsat åbne.

Den næste faktiske Linux-kontrol bestod distributionsprøven og 19 af de 20
efterfølgende prøver. Den negative tomme-cacheprøve stoppede på sin gamle
64-KiB-læsning af npm's større testlog, ikke på manglende fysisk processtop.
En test-only læser bevarer det præcise ENOTCACHED-linjesuffix og scanner hele
filen i 64-KiB-portioner med lille suffikshukommelse, 16-MiB-testlogloft samt
uændret filidentitet og størrelse til EOF. To portable mål bevarer syv
positive og seks negative logtilfælde samt afslag på forkert filtype og
oversize. Det er læserbevis, ikke en ny native kørsel; produktets frister,
proceskontrol, logning og afhængigheder ændres ikke.

Fire normale lokale mål består: streng dataform, faktisk C/I-kæde og uændret
offentlig pakkelæser, den faktiske committed-source-funktions syntetiske
afslag samt nu den faktiske udstedte kanoniske SQL i bindingssynkroniseringen. Den uafhængige
gennemgang har fundet og fået rettet en I-manifest-formkonflikt og en
objektidentitetsfejl i prøvens kommende udstedte fase.

Normal version 586 er synkroniseret én gang. Den faktiske lokale merge med
b2 bevarer ægte e7-ancestry; en ny almindelig Git-worktree af denne egen
commit leverer LF-kilder uden at ændre gamle SQL-/JSON-originaler. Faktisk
C145/I141/T, den nye append-only 020000-SQL og syv normale forbrugere er
afledt og genberegnet uændret til fuldt fixedpoint.

To gamle SOURCE-importprøver læste fejlagtigt den nyere 0d39-kalder som den
bevarede e938-variant. De uændrede 25.801 førbytes er nu inert, hashbundet
testdata. Alle gamle import-, mutations- og hel-inversekrav bevares; nyere
aktuel kode kontrolleres særskilt. Begge rettede mål består. Der opfindes
ingen historisk commit, og produktkode eller C/I/T ændres ikke af testrettelsen.

Dette er ikke native PostgreSQL, ægte 585-B/S-overgang,
national efterfølgerkapacitet, installation eller offentlig effekt. Disse
normale krav består. SOURCE er inaktiv, alle fem hovedmål er åbne, og den
almindelige vejrhentning må ikke forstyrres. DMI → Copernicus → Open-Meteo,
vandstand kun DMI, gyldige originaler, historik, scoreformel, adminpunkter,
geometri, cron og tidsbudgetter er uændrede.
