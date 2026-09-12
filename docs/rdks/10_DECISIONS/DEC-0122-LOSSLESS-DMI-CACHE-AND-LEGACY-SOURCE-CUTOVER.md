# DEC-0122 – tabsfri DMI-cache og direkte cutover fra attesteret legacy-kilde

**Status:** Aktiv for exact-release 4.0.348. Overført under ejerens udtrykkelige forhåndsgodkendelse af nødvendige launchrettelser; én dokumenteret exact-releasebinding ad gangen og uændrede materielle grænser. De tidligere versionsoverførsler nedenfor er historik. 4.0.348 er lokal kandidat; exact-head-CI, append-only backendapply/readback, cachebundet same-head-handoff og offentlig cutoverbevis afventer.

### Versionsoverførsel 2026-09-12 – exact-release 4.0.348

PR #281 blev sourcegate-valideret på exact head og merged byteidentisk som `6868ae04`. Oneoff `34682428800` genbrugte dette bevis uden en anden fuld kildegate og opnåede komplet currentclosure på 79.414/79.414 samt grøn native WAM-gate. Den stoppede først bagefter, fordi rollback-oraklet krævede READY 48-timershistorik i en tilladt målt koldstart. Intet handoff, artifact eller cutover blev dannet.

DEC-0130 retter denne snævre model-warmup-kant og indfører en eksplicit, fastlåst cachekontrol mod target `2026-09-12T08:00:00Z`. Kontrollen må ikke hente nyt vejr hos DMI, Copernicus eller Open-Meteo; den genvaliderer de gemte data, kører alle uændrede slutgates og stopper uden automatisk genopfyldning, hvis cachen ikke længere kan bevises komplet.

Den tidligere WAM-binding er allerede centralt anvendt og må ikke omskrives. Exact-release 4.0.348 kræver derfor først den nye append-only migration `20260912122607_measured_rollback_warmup_binding.sql`, som kun fører model-/continuationforseglinger og readbackversion frem. Backendreadiness skal være grøn på same-head, før cachekontrollen og det nye handoff må begynde.

Under den stående ejerautorisation flyttes den materielt uændrede first-cutover-undtagelse alene til exact-release `4.0.348`. Et ældre handoff må ikke ommærkes. Current, WAM, Feggesund, freshness, privacy, full post-data validate/releasegate, same-head-handoff, deployment og offentlig verifikation består uændret. DMI-multipass er fortsat ikke livebevist, fordi den observerede kørsel kun loggede pass 1; dette er et særskilt normaldriftsmålepunkt og ikke en lempelse af launchkrav.

## Baggrund

Den bevarede DMI-kandidat indeholder langt flere gyldige currentpar end den seneste kørsel kunne genanvende. Rodårsagen er ikke tabte værdier, men en kombination af decoder-signaturdrift, for grov kassation af retained proofs og en meget stor gentagelse af identisk source-metadata. Samtidig krævede DEC-0114 først en ny moderne Candidate G-generation på samme head, selv om den integrerede model allerede kan starte ærligt som HISTORY_INCOMPLETE på komplette direkte input. Det gjorde den gamle models historik til en unødig forudsætning for den nye models første aktivering.

## Beslutning

1. DMI-cachen er en vedvarende, privat datakilde. En ny targettime eller modelkørsel nulstiller den ikke. Gyldige rækker og deres originale beviser genvalideres og genbruges; reelle huller, ugyldige/udløbne rækker og halen behandles først. En nyere komplet tuple erstatter først den gamle atomisk efter validering.
2. Den snævert gennemgåede ecCodes 2.48.0/2.48.2-processingklasse må genbruge allerede verificerede currentrækker, når parser-, parameter-, grid- og registerbinding er uændret. Rå GRIB- og processed-step-skip kræver fortsat eksakt runtime-signatur. Originale signatures og hashes omskrives aldrig.
3. Ét ugyldigt retained proof må kun gøre den berørte proof-enhed manglende. Det autentificerede kontrolplan valideres før sanitation, og alle øvrige uafhængigt gyldige proofs bevares. Same-asset-konflikter må ikke løses med last-write-wins.
4. DMI-dokumentet lagres tabsfrit med tre deduplikerede source-tabeller og strenge referencer. Den logiske schema-2-visning rekonstrueres identisk. Legacy-JSON kan læses på en afgrænset migrationsvej; nye writes er atomiske og kompakte. En stor legacyfil materialiseres altid til et separat output før første almindelige reader, hvorefter outputtet genlæses under det normale 256 MiB-loft. Kilden må ikke erstattes ved fejl, og legacy-undtagelsen må aldrig acceptere en overstor allerede kodet wrapper. Alle Python- og Node-læsere bruger den fælles codec, mens bytebaserede integritetshashes fortsat hashes over den faktisk lagrede fil.
5. Første integrerede cutover må tage udgangspunkt direkte i den eksakt attesterede offentlige legacy Candidate G-generation. Den behøver ikke først publicere en ny moderne Candidate G på samme head. Dette supersederer kun DEC-0114's mellemtrin om moderne same-head Candidate G.
6. Legacykilden skal fortsat være den fastlåste kildecommit, tree, schema-2-manifest, 210 zoner, 673 kystdele, eksakt source-register og kendt Candidate G-controllerbinding. Ukendt eller modstridende central modeltilstand stopper.
7. Cutover bygger den integrerede runtime på den aktuelle main-kode og centralt hydrerede aktive konfiguration. Manglende ældre målt historik giver HISTORY_INCOMPLETE, Candidate G-oraklet BUILDING_MEASURED_ONLY og calibrationEligible=false. Historik må ikke syntetiseres, interpoleres, lånes eller carry-forwardes.
8. Den offentlige legacygeneration forbliver uændret frem til den eksisterende tofasetransaktion med plan, PENDING, compare-and-swap, artifact/privacy/releasegates, public verifikation, complete/abort og reconciliation. Direkte betyder derfor ikke ukontrolleret eller delvist deploy.
9. Private preflight, backup og den videnskabelige audit skal bindes til præcis den DMI-kandidat, som weatherbuilderen brugte. Ingen gammel data/live-pegepind må måles eller attesteres i stedet.
10. De eksisterende krav til faktisk privat objektstørrelse, integritet, privacy, lager og egress er ikke lempet af denne beslutning. En eventuel afgrænset first-cutover-undtagelse kræver en særskilt, udtrykkelig ejerbeslutning og dokumenteres som tillæg; den er ikke implicit godkendt her.

## Tillæg 2026-09-09 – ejerens afgrænsede first-cutover-undtagelse

Ejeren har udtrykkeligt godkendt, at 4.0.337 må bruge én eksakt, succesfuld og komplet oneoff-kørsel som input til første integrerede cutover, selv om den konservative fremskrivning for 60 fulde private objekttransporter pr. døgn overskrider det almindelige månedlige egressbudget.

Undtagelsen gælder kun, når den faktisk målte komprimerede private runtime er højst 50.000.000 byte, to bevarede generationer er inden for lagerbudgettet, checkpointet er inden for databasegrænsen, og alle eksisterende integritets-, privacy-, readback-, closure-, release- og deploymentgates består. Cutoveren skal bindes til netop den grønne oneoff-run-id og eksakte source-head. Den eksisterende cache må ikke nulstilles.

Den almindelige månedlige egressfremskrivning skal fortsat beregnes og valideres for intern konsistens, men dens forventede negative resultat er ikke en gate for denne ene first-cutover. Ellers ville undtagelsen være logisk virkningsløs. Resultatet forbliver bindende negativt bevis mod tilbagevendende fuld transport.

Undtagelsen godkender ikke normal højfrekvent drift. Automatisk fuld kadence forbliver blokeret, indtil cachetransporten er omlagt tabsfrit, skyggeverificeret mod den bevarede cache og kan dokumentere et bæredygtigt dataforbrug. Opgaven er obligatorisk post-launch-arbejde og må ikke lukkes alene, fordi den nye model er online.

### Versionsoverførsel til 4.0.338

Under ejerens stående autorisation til nødvendige launchændringer overføres den samme engangsundtagelse alene til 4.0.338. Denne successor retter Supabase CLI-parseren og backendworkflowets skriveafgrænsning; den udvider ikke cache-, runtime-, størrelse-, integritets- eller kadencegrænserne. En 4.0.337-handoff kan ikke bruges, fordi producent, artifact og consumer fortsat skal være bundet til samme eksakte `main`-head. Launch kræver derfor en ny komplet 4.0.338-oneoff.

Policyversionen skal matche `package.json` fail-closed i releaseversionsgaten. På dette tidspunkt arvede 4.0.339 og senere ikke undtagelsen uden en ny udtrykkelig beslutning. Den efterfølgende udtrykkelige 4.0.339-beslutning nedenfor supersederer alene denne versionsgrænse; alle øvrige betingelser består.

### Versionsoverførsel til 4.0.339

Efter at 4.0.338 blev exact-head-valideret og merged, bestod backend `34350871769` hele pre-write-planen og anvendte migration 1–3. Migration 4 stoppede på PostgreSQL `SQLSTATE 42601` og rullede sin egen transaktion helt tilbage. Migration 5–8 samt D1, Edge, Worker, protected readiness og offentlig modelændring blev ikke kørt. 4.0.339 retter alene det samme ugyldige `IS DISTINCT FROM CASE`-udtryk i de fem pending migrationer og deres schema-/installationskopier.

Ejeren har derefter udtrykkeligt godkendt, at den materielt uændrede first-cutover-undtagelse overføres alene til exact-release 4.0.339. Et handoff fra 4.0.338 kan ikke bruges, fordi producent og consumer fortsat skal være bundet til samme eksakte `main`-head. Launch kræver derfor en komplet 4.0.339-main-oneoff, selv om fremgang fra de bevarede cacher må genbruges.

Policyversionen skal fortsat matche `package.json` fail-closed. Den oprindelige overførsel omfattede kun 4.0.339. Ejerens efterfølgende udtrykkelige autorisation nedenfor supersederer alene behovet for ny versionsgodkendelse. Arkivloftet på 50.000.000 byte og alle storage-, checkpoint-, integritets-, privacy-, readback-, closure-, release- og deploymentkrav består uændret; tilbagevendende fuld kadence er fortsat ikke godkendt.

### Stående autorisation til nødvendige launchsuccessors

Ejeren har udtrykkeligt godkendt, at undtagelsen også må flyttes til 4.0.340 og senere versioner, hvis en nødvendig launchrettelse kræver det. Codex skal ikke bede om gentagen tilladelse alene til versionsflytningen. Den aktuelle rettelse færdiggøres dog fortsat som 4.0.339 i PR #273; den fejlede test kræver ikke i sig selv en ny release.

Hver nødvendig overførsel skal registreres i projektets hukommelse, bindes til den valgte eksakte release og main-head og kræve et komplet handoff fra samme head. Dette er ikke en flydende versionsmatch eller en ekstra first cutover, og ingen tekniske grænser eller driftskadence udvides. Cacheprogression må fortsat genbruges på tværs af releases efter genvalidering; eksisterende kørsler skal gemme den før main-skift.

### Ejerpræcisering 2026-09-09 – Supabases faktiske 50-MiB-grænse

Ejeren har udtrykkeligt godkendt, at den ene first-cutover må bruge Supabases officielle Free-grænse på højst `50 * 1024 * 1024 = 52.428.800` archive-byte. Dette supersederer alene denne beslutnings tidligere decimalgrænse på 50.000.000 byte. Supabases officielle Studio-kode kalder værdien 50 MB, men definerer den som 50 MiB: https://github.com/supabase/supabase/blob/a96a587f65f317ae56d4ff3d403e36d0d61a8473/apps/studio/components/interfaces/Storage/StorageSettings/StorageSettings.constants.ts#L1 .

Den eksisterende protected publisher håndhæver allerede præcis 52.428.800 byte før upload. Oneoffens strengere 50.000.000-byte-kontrol bevares og må fortsat stoppe producenten; den behøver ikke lempes for at udføre denne launch. Præciseringen kræver derfor ingen kodeændring, ny source-head eller ny kildegate og gør ikke det aktuelle handoff ugyldigt.

Dette udvider ikke antallet af launches, retained generationer, checkpointgrænsen, storage-/egressbudgettet, privacy, readback, closure, releasegates, normal kadence eller nogen cache-/vejr-/modelkontrakt. Den faktiske publiceringsarchive skal fortsat valideres mod publisherens grænse før upload. Officiel kodeevidens er ikke live-readback af projektets Storage-indstilling; eksisterende bucket-/uploadkontrol består.

### Versionsoverførsel 2026-09-09 – exact-release 4.0.340

Efter den dokumenterede producer/consumer-forskel ved en WAM-modelkørselsseam bruger first-cutoveren exact-release `4.0.340`. Dette er den allerede ejerautoriserede nødvendige launchrettelse, ikke en ny eller bredere undtagelse. Handoff skal komme fra samme eksakte 4.0.340-main-head; kildecacheprogression fra 4.0.339 må kun genbruges efter de eksisterende valideringer. Alle materielle grænser og gates består.

### Versionsoverførsel 2026-09-10 – exact-release 4.0.341

Den efterfølgende helkædekontrol fandt en selvstændig WAM-integritetsfejl: en delvist accepteret fil eller en enkelt fil i en komplet kvalitetsopdatering kunne mutere den aktive kandidat før et sammenhængende modelkørselsbevis og dermed skabe en lineage-/tretimers-seam. DEC-0123 isolerer derfor hver collection/modelkørsel i en kandidat, kræver fuld fildenominator og tillader kun atomisk promotion ved eksakt pair-superset uden nye lineage-konflikter. En ældre kausal fallbackfase bruger altid sin egen modelkørselsproveniens.

Under ejerens stående autorisation flyttes den materielt uændrede first-cutover-undtagelse alene til exact-release `4.0.341`. Et 4.0.340-handoff kan ikke ommærkes eller bruges til cutoveren; den kræver et komplet handoff fra samme eksakte 4.0.341-main-head. Bevarede DMI-, Copernicus-, Open-Meteo- og WAM-cacher må fortsat genvalideres og genbruges uden nulstilling.

Ingen størrelse-, storage-, checkpoint-, privacy-, readback-, closure-, release-, deployment- eller kadencegrænse er udvidet. 4.0.341 er lokalt måltestet, men er endnu ikke exact-head-CI-valideret, merged, main-runtimeverificeret eller offentliggjort. Candidate G forbliver offentlig, indtil hele kæden har positivt bevis.

### Versionsoverførsel 2026-09-11 – exact-release 4.0.342

4.0.341 blev efterfølgende merged som `caa49c42`. Backendkørsel `34534769955` blev rapporteret grøn, men main-oneoff `34534764449` producerede intet komplet handoff og foretog ingen cutover. Den isolerede WAM-candidate beskyttede den aktive cache, men whole-asset-admissionen rullede samtidig alle brugbare søskenderækker tilbage, når enkelte NSB-dele fejlede. Samme helhedsreview fandt en for grov Copernicus-grænse, hvor én manglende bestilt native time kunne kassere de øvrige eksakte rækker i et ellers strukturelt gyldigt shard.

DEC-0124 erstatter derfor alene whole-asset-admission med lineage-sikker per-part/time-admission og lader Copernicus bevare eksakte returnerede shardrækker, mens fraværende timer forbliver i resten. Under ejerens stående autorisation flyttes den materielt uændrede first-cutover-undtagelse alene til exact-release `4.0.342`. Et 4.0.341-handoff kan ikke ommærkes eller bruges; cutover kræver et komplet handoff fra samme eksakte 4.0.342-main-head.

Bevarede provider- og WAM-cacher må genvalideres og genbruges uden nulstilling. Arkiv-, storage-, checkpoint-, integritets-, privacy-, readback-, closure-, release-, deployment- og kadencegrænser består. Især kræves fortsat særskilt komplet currentclosure på 79.414/79.414 og komplet bølgeclosure med 79.060 native WAM-par plus Feggesund 354/354. Candidate G forbliver offentlig, indtil hele 4.0.342-kæden er positivt bevist.

### Versionsoverførsel 2026-09-11 – exact-release 4.0.343

4.0.342 blev merged som `6a3133fe`. Oneoff `34565347360` bevarede og gemte providerprogression, men sluttede uden komplet handoff eller cutover: current havde 1.555 rester, og WAM fejlede terminalt. Helkædeanalysen viste DMI-family-starvation, Copernicus AMM15-product-starvation og to eksakte WAM-dele med forkert NSB-ejerskab. Det var ikke et cache-reset og kan ikke løses sikkert ved blot at øge runtime.

DEC-0125 indfører bounded fair DMI-familyservice, separate roterede Baltic-/AMM15-køer og én fælles eksakt WAM-owner-policy. Normal og oneoff bruger samme producenter. Under ejerens stående autorisation flyttes den materielt uændrede first-cutover-undtagelse alene til exact-release `4.0.343`. Et 4.0.342-handoff kan ikke ommærkes eller bruges; cutover kræver et komplet handoff fra samme eksakte 4.0.343-main-head.

Bevarede provider- og WAM-cacher genvalideres og genbruges uden nulstilling. Arkiv-, storage-, checkpoint-, integritets-, privacy-, readback-, closure-, release-, deployment- og kadencegrænser består. Current kræver stadig 79.414/79.414, og bølger kræver 79.060 native WAM plus Feggesund 354/354. Candidate G forbliver offentlig, indtil hele 4.0.343-kæden er positivt bevist.

### Versionsoverførsel 2026-09-11 – exact-release 4.0.344

4.0.343 er merged på `5587001b`, men oneoff `34588002366` sluttede uden currentclosure og handoff. DEC-0126 samler den målte regionale prooflevetidsfejl, DMI-lead-/tidsdeling og katalogterminal, samt CP-checkpoint-, kadence- og spredt-requestrettelse. Faktisk læsende migration genbrugte 656 af en fast 1.658-rest uden tab; det er ikke ny produktionsdækning eller launchbevis.

Under ejerens stående autorisation flyttes den materielt uændrede first-cutover-undtagelse alene til exact-release `4.0.344`. Et ældre handoff kan ikke ommærkes eller bruges. Cutover kræver et komplet handoff fra samme eksakte 4.0.344-main-head. Bevarede provider- og WAM-cacher genvalideres og genbruges uden nulstilling; tidligere korrekt anvendte SQL-/modelbindinger ændres ikke af denne Python-/schedulerpakke.

Arkiv-, storage-, checkpoint-, privacy-, readback-, dataintegritets-, closure-, release-, deployment- og kadencegrænser består. Current kræver 79.414/79.414 og bølger 79.060 native WAM plus Feggesund 354/354. Lokal 4.0.344 er endnu ikke exact-head-CI-valideret, merged eller produktionsverificeret. Candidate G forbliver offentlig, indtil den nye samlede kæde er positivt bevist.

### Versionsoverførsel 2026-09-12 – exact-release 4.0.345

PR #278 blev efterfølgende merged som `f2cc2a77`, men main-run `34635781802` og oneoff `34642214559` producerede intet komplet handoff og ingen cutover. Oneoff sluttede 78.381/79.414 med 1.033 provider-negative currentpar; WAM/Feggesund var grøn. Den målte Copernicus-efterbehandling brugte hovedparten af fasen på gentagne fulde checkpoints.

Under ejerens stående autorisation og aktuelle instruktion om autonom sikker lancering flyttes den materielt uændrede first-cutover-undtagelse alene til exact-release `4.0.345`. Et 4.0.344-handoff findes ikke og må ikke konstrueres eller ommærkes. 4.0.345 bevarer cacherne, men tilføjer durable segmentreceipts og bounded consolidation efter DEC-0127. Kun et komplet runbundet handoff fra samme eksakte 4.0.345-main-head kan bruges.

Alle eksisterende arkiv-, storage-, checkpoint-, privacy-, readback-, dataintegritets-, closure-, release-, deployment- og kadencegrænser består. Exact-content sourceproof kan alene undgå gentagelse af en allerede grøn kildegate på byteidentisk tracked indhold; det ændrer ikke de fulde post-data-gates. Current kræver fortsat 79.414/79.414 og bølger 79.060 native WAM plus Feggesund 354/354. Candidate G forbliver offentlig, indtil den komplette kæde og den integrerede model er verificeret i produktion.

### Versionsoverførsel 2026-09-12 – exact-release 4.0.346

4.0.345 blev exact-head-valideret og merged som `64d2f23f`. Main-oneoff `34667430392` genbrugte den eksakte kildeproof uden en anden kildegate, men sluttede fail-closed uden handoff eller cutover. Den bevarede cache nåede 64.400/79.414 DMI-currentpar, hvorefter producentens 3.000-sekunders runtime udløb. Den efterfølgende kæde reducerede resten til 184 provider-negative par, men fuld 79.414/79.414-currentclosure blev ikke opnået.

DEC-0128 retter den systemiske wrapperfejl, hvor alle påståede DMI-passager delte én deadline, og hvor producentens sikre exit-kode 2 ved ufuldstændig strict-current-ledger stoppede før rotationen kunne gavne en ny passage. Under ejerens stående autorisation flyttes den materielt uændrede first-cutover-undtagelse derfor alene til exact-release `4.0.346`. Et ældre handoff må ikke ommærkes eller bruges; cutover kræver et komplet, succesfuldt og runbundet handoff fra samme eksakte 4.0.346-main-head.

Alle eksisterende archive-, storage-, checkpoint-, privacy-, readback-, dataintegritets-, closure-, release-, deployment- og kadencegrænser består. Hver ny DMI-passage får en selvstændig 3.000-sekunders producentgrænse, men wrapperen fortsætter kun efter en snævert klassificeret lokal runtime-rest og stopper et tredje strict-current-runtimepass uden verificeret pair-fremgang. Den allerede eksisterende exit-0-downloadbudgetvej forbliver særskilt. Dette er ikke en generel retry eller godkendelse af løbende fuld cachetransport. Candidate G forbliver offentlig, indtil hele same-head-kæden og den integrerede model er positivt verificeret.

### Versionsoverførsel 2026-09-12 – exact-release 4.0.347

4.0.346 blev exact-head-valideret og merged som `e912ef9a`. Main-oneoff `34675040245` genbrugte sourceproofet uden en anden fuld kildegate og gemte både DMI-GRIB og kandidatprogression, men startede kun pass 1. Den afsluttende rapport havde den forventede DKSS-runtime/currentrest samt et samtidigt checkpointet HARMONIE-runtime-stop, som DEC-0128's for snævre wrapperallowlist behandlede som veto.

DEC-0129 indfører først et særskilt opt-in terminalbevis efter fuld producentfinalisering. Derefter må alene den eksakte indre HARMONIE-runtime med `partialProgressPreserved:true` eller den eksakte ydre tre-feltsform være en tilladt ledsagefejl, når alle eksisterende DKSS-/ledger-/same-target-/slutcache-/frisk-fremgangskrav allerede er opfyldt. HARMONIE kan ikke selv åbne et pass; watchdoghistorik, download, WAM og alle andre fejl forbliver blokerende. Under ejerens stående autorisation flyttes den materielt uændrede first-cutover-undtagelse alene til exact-release `4.0.347`. Et 4.0.346-handoff kan ikke ommærkes eller bruges; den næste oneoff må genbruge, genvalidere og videreføre de bevarede cacher uden nulstilling.

Alle størrelse-, archive-, storage-, checkpoint-, integritets-, privacy-, readback-, closure-, release-, deployment- og kadencegrænser består. Current kræver fortsat 79.414/79.414, bølger 79.060 native WAM plus Feggesund 354/354, og Candidate G forbliver offentlig indtil positiv same-head-cutover og offentlig modelkontrol.

## Konsekvenser

- Bevarede data kan genbruges på tværs af target- og leverandørskift uden at være låst til Open-Meteo.
- En defekt fil eller proof-enhed stopper ikke behandlingen af uafhængigt gyldige data, men komplet publiceringsclosure er fortsat 673 × 118 med nul mangler og nul overlap.
- DMI, Copernicus og Open-Meteo beholder kildeprioriteten. En midlertidig lavere prioriteret række kan senere erstattes af en højere prioriteret komplet række.
- Candidate G er fortsat offentlig, indtil en frisk main-kørsel har bevist hele produktionskæden. Lokale tests eller kompakt størrelse er ikke produktionsbevis.

## Beviskrav

- Tabsfri Python- og Node-roundtrip, unknown/Unicode/nested/proto-kollisioner, ingen inputmutation, to-pass-afvisning og størrelses-/depth-/countgrænser.
- N−1-bevarelse ved ét ugyldigt proof, kompatibel og inkompatibel processing-signatur, same-asset-konflikt og komponentatomisk donorbackfill.
- Workflowtest for eksakt kandidatbinding, codec-aware READY- og oneoff-progresslæsning samt legacy-source-cutover uden gammel private-state-kontaminering.
- Pilot, normal vedligeholdelse, oneoff og conditional point activation skal materialisere bounded legacyinput før første DMI-reader og derefter bruge `materialized_path` i READY-/provenance-/registerkontrollen. Python-testen beviser separat output, idempotent encoded-copy, inputbevarelse ved fejl og afvisning af in-place/overstor encoded wrapper; Node-testen bevarer den fælles logiske codec-kontrakt.
- Releasegaten skal kontrollere den atomiske write i den fælles storage-codec og den eksakte first-cutover-undtagelse; den må ikke fastholde tekstkrav fra før refaktoreringen. Public-runtime-kontrakten skal stadig prøve fuld 210/673-projektion, men gentagne alderstilstande må genbruge det allerede validerede manifest, og isolerede proof-fejl må bruge copy-on-write, så sourcegaten er ressourcebegrænset uden tab af assertions.
- Read-only produktionsskala-job `34288231609` på codec-commit `bce970af`: 760.487.472 inputbyte, 578.063 sourceposter, 94.150.151 encoded byte, identisk logisk hash/count, uændret input og grøn Node-readback. Den separate historiske overlapdiagnose i samme workflow fejlede og er ikke en del af codecbeviset.
- Én GitHub validate:source på PR'ens eksakte head.
- Før offentlig ændring: frisk komplet providerclosure, WAM/Feggesund, integreret runtime, spatial-, privacy-, release-, artifact-, backend-, CAS- og offentlig verifikation på den mergede main-head.
