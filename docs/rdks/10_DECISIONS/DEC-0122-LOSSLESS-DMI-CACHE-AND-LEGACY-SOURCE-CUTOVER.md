# DEC-0122 – tabsfri DMI-cache og direkte cutover fra attesteret legacy-kilde

**Status:** Aktiv for 4.0.337. Produktionsbevis, merge og offentlig cutover afventer.

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
