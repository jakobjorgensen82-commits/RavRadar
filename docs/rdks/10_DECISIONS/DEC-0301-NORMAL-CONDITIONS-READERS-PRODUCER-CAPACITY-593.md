# DEC-0301 – Producentens conditions-grænse i normal genbrug og direkte 591 → 593

**Dato:** 2026-10-30
**Status:** 4.0.593 og den efterfølgende controllerrettelse er præcist kvalificeret og merget. SQL er faktisk installeret og genlæst; normal prepare/install og source-genbrug bestod. Senere DMI-arbejde blev afvist af en yderligere gammel Pythonlæsegrænse. Den afgrænsede rolleopdelte rettelse er lokalt målprøvet, men endnu ikke kildekvalificeret eller leveret. Offentligt nyt 593-vejr er fortsat åbent. Tidligere statusafsnit nedenfor er dateret historik på disse konkrete punkter.

## Faktisk forgænger og versionsforløb

Den nye kandidat bygger videre fra den faktisk anvendte 591-familie. 592 og dens udstedte tuple samt migration bevares som uforanderlig historik; 592 er ikke installeret og er ikke en nødvendig mellemstation. Den normale 593-migration er afledt med den ægte offentlige 591 som forgænger. Alle 70 tidligere migrationsfiler er byteuændrede; den nye append-only fil giver 71 i kilden. Den eksisterende installationsstaging vælger de 59 krævede forgængere plus den nye 593-fil, uden at installere 592.

Den lokale udstedelse har version 20261030105202 og migration 20261030105202_assistant_public591_later_h0_original_bound_successor.sql. Normal versionssynk, C/I/T-afledning, kanonisk SQL-inverse, syv normale forbrugere og friske C/I-, public591-/aktive builder- samt synkkontroller er gennemført til fastpunkt. Denne kvittering er hverken rigtig PostgreSQL, SQL-eksekvering, samlet kildekontrol eller produktionsaktivering.

## Konkret kapacitetsfejl

Producentens eksisterende PRIVATE_CONDITIONS_MAX_BYTES er 535.822.312 bytes. Den normale syntetiske prøve fra DEC-0300 viste en gyldig fil på 299.262.881 bytes gennem producent, B-gemning og efter rettelse B/S-parring. Senere uafhængige læselofter på 256 MiB kan stadig afvise den samme filklasse. Kildegennemgangen fandt dem i normal originalkontrol, retention-læseren og den navngivne 591-snapshotgren før første metadataovergang.

Retention-kaldet ligger både i den normale planlægning før leverandørarbejdet og senere i beregningen. Origin-kontrollen ligger før scoring. En frisk og korrekt nyere B/S-pakning omgår ikke disse normale læsere. En positiv samlet råpayloadmåling eller en offentlig detailfilstørrelse er ikke den autentificerede private conditions-posts størrelse. Den aktuelle produktionsudløser og individuelle størrelse er fortsat åbne ved denne dokumentforberedelse.

## Tre præcist afgrænsede kildeejere

1. scripts/lib/established-native-current-origin.mjs bruger producentgrænsen til den normale aktuelle familie og den præcist navngivne 591-forgængers arbejdsfil. Den aktuelle normale original-B-læsning følger samme grænse. Den særskilte gamle arkivkontrol, seed og øvrige gamle familier beholder 256 MiB. Ingen oprindelsesattest, familievalg eller bevissammenhæng må ændres.
2. scripts/read-authenticated-dmi-current-companions.mjs lader den eksisterende normale stat-kontrol af original-B-conditions følge producentens grænse. Filtype, descriptor, hele bytes/SHA, datasæt/tid, frisk kontrol og normal companion-lukning er uændrede.
3. scripts/lib/authenticated-frozen586-predecessor.mjs ændrer kun den lukkede FROZEN591-profils tre original-/friskhedslæsninger til producentgrænsen. 586/587/588/590, deres kodebanker, attester og interne adgangsobjekter beholder deres gamle grænser. Den normale førskrivningskalder vælger 591 gennem assistant-public591-successor; en kalder må ikke vælge en anden profil eller fabrikere et handle.

Origin- og snapshot-ejerne indgår i C/I-input. Den nye præcise importvariant registrerer deres faktiske nye bounded-json-writer-import og hele kildebytes; den skjuler ikke ændringen gennem en inverse eller undtagelse fra modelafledningen. Retention-læseren ligger uden for modelinput. Den normale producentkonstant er ikke transportens 768-MiB-grænse og bliver ikke en ny JSON-politik. Særlige completed-stage-, cold-start- og gamle arkivspor ændres ikke af denne leverance.

## Verificeret normalt kildegrundlag

Den normale afledning ændrer C98 til C99 og I97 til I98. Begge inkluderer nu den allerede eksisterende bounded-json-writer som en faktisk afhængighed. Der fjernes ingen input og ændres ingen normalisering eller indgangspunkter. De øvrige normaliserede kildehashes er uændrede. Ud over de to gennemgåede I/O-læsere ændres kun præcis to normale releaseVersion-metadataværdier i private-production-runtime-workflow med bevaret retired-lås; I indeholder desuden det normalt nyafledte C-artifact. En hel inverse beviser netop metadataændringerne uden bred lempelse. Det integrerede modelkontraktdigest er fortsat a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b. Der er ingen numerisk formelændring.

## Lokal udstedelse

- C: 12f78005304316a680716a1d437e06a582815c1645a2eb567028bcc18ff99ffa
- I: 69bf81c3cc5e256deee2c116a52462597f4cfc47cb6c855c6dba969c1dcf4643
- T: e894dd096d03f71cc334d97f85931c2b3969e9b140cb5403a4787cf4b81fbc2e
- Ny migrations SHA-256: 47c51886a58aa1cfbbc244a5469ace67521774499135666c26fccd8c7f291bfd

De præcise private kvitteringer og hele før-/efterpinde føres i checkpointet. Hele frem- og tilbagepatchen for de tre nye læsere er bevist. Det er ikke en fysisk stor kapacitetsprøve af de nye tre led. Eksisterende normale kapacitets-/original-/afslagsmål skal kvalificere den faktisk nye kilde; gammel syntetisk B/S-evidens eller kildekontrol må ikke ommærkes som denne nye prøve eller som produktionsbevis.

## Uændrede grænser og nødvendig levering

Fuld filstørrelse/SHA, byteidentitet, fysisk fil-/mappeidentitet, ægte B/S, attest, frisk pointer-/versionsgenlæsning, CAS, oprindelig fejl, oprydning og hård no-loss består. Registry beholder 16 MiB. Scoreformel, numeriske vejrdata og historiske scorer, kildeprioritet DMI → Copernicus → Open-Meteo, administratorpunkter og geometri ændres ikke. En ny kildebinding er ikke en ny fysisk scoremodel eller adgang til at forkaste data.

Præcis samlet kilde- og native-kvalifikation, aktuelt main-bevis, autentificeret førskrivning, normal SQL-installation og databasegenlæsning er åbne. Første offentlige 593-levering skal fortsat ske gennem den krævede strengt senere almindelige generation og normale Edge-/Pages-/offentlige kontroller. Lokal samme-H0-metadataforberedelse giver ingen offentlig samme-H0-adgang. Ingen produktionsændring under en aktiv skrivende proces og ingen genoptagelse afledt af dette dokumentationsdelta.

De tidligere 592-forbedringer til assistent, observation, deling og admin bevares i kandidaten, men deres offentlige effekt er fortsat ikke påstået. SOURCE-revision, samlet statistik, automatisk sletning, mailafsender og DNS-/Pages-projektaktivering følger ikke med. Alle fem mål er fortsat åbne. Nyt kanonisk håndbogsafsnit 89.287 har stabilt ID normal-conditions-reader-producer-capacity-4-0-593. Alle 538 gamle afsnit bevares, webhåndbog og INSTALL-payload spejles normalt; installationsfilens håndbogskopi er dokumentation, ikke udført SQL.

## Privat tillæg 30. oktober — særskilt completed-stage-kapacitet

Den oprindelige593-leverances afgrænsning ovenfor er historisk uændret. En efterfølgende privat kandidat tilføjer to særskilte completed-stage-ejere: ordinary-completed-stage-admission og ordinary-completed-stage-lineage. Conditions følger PRIVATE_CONDITIONS_MAX_BYTES ved forælder-, barn- og lineagekontrol. Installeret læsning udvides kun for full-conditions/data/live/conditions.json til535.822.312 bytes og dmi-forecast-cache/data/live/dmi-forecast-cache.json samt weather-component-inputs/.cache/weather-component-inputs.pack til den eksisterende768-MiB-filpayloadgrænse. Alle øvrige installerede roller, Candidate-bulk og komprimeret transport beholder350.000.000 bytes.

Installerede filer hashes i64-KiB-blokke med hele manifestets byteantal/SHA og samme fil-/stiidentitet før/efter. Håndtaget lukkes, og lukningsfejl må ikke maskere nogen oprindelig fejl. Source-, parent-, origin-, GCM-, attest-, CAS- og no-loss-krav består. Normal lokal kalderkvalifikation og særskilt stort syntetisk I/O-bevis foreligger; stor autentificeret heladmission, præcis samlet kilde, sikker levering og faktisk effekt er åbne.

De to ejere ligger uden for alle105 modelinput. Kandidaten ændrer ikke udstedt593, C/I/T,71 SQL-filer eller faglige regler. Ingen faktisk genoptagelse eller produktionshandling er udført af dokumentforberedelsen. Se håndbog89.288 og privat checkpoint.

## 30. oktober — præcis offentlig projektionskontrakt i den normale 591 → 593-overgang

Den første almindelige vejrhentning efter den faktisk verificerede593-installation stoppede i projectOriginal før leverandørerne. Kontrollen krævede, at alene continuationStateContractSha256 ændredes. Den eksisterende kompakte prognosedeling ændrer imidlertid også den normale publicProjectionContractSha256: copy-public-delivery-shards.mjs kopierer nu den allerede beregnede kompakte delingsprojektion. Dette er en konkret controllerinkompatibilitet, ikke ugyldige leverandørdata eller bevis for tab af originaler.

En hel kilde-/hashgennemgang af alle ni projektionsfiler mod den ægte frosne591 viser otte normaliserede identiske filer og præcis denne kopieringsændring. Gammel projektion er c495b80c7ca8906d81ae0a58f340fe693f79acce51ca6efc7933681d9505da09; den gennemgåede593-projektion er24e95d442450769ff233e42aa4b100842c353c8d28735defbbfef5d5457c99ec. Lager-ABI er uændret ede0b53b8ed0f3fa5d0e505ea7c07d98969dc7a38fe94ae034a85f9c5d5af7ff.

Den normale assertion kræver nu i den faste assistant-public591-successor-profil og udstedte4.0.593 præcis hele den gamle kontraktmap og hele den nye kontraktmap. Forgængerens eksisterende provenance ejer gammel ABI og projektion; den udstedte binding ejer gammel og ny T. Det nye projektionstal er den særskilt gennemgåede hele kildekontrakt. Manglende eller ekstra felter, en anden ABI, projektion eller T afvises. Der er ingen caller-valgt profil, tuple eller adgangsgenvej. Andre historiske profiler beholder den oprindelige OnlyT-kontrol.

Den samme assertion bruges af den faktiske projectOriginal-kalder. Normal regression bruger den faktiske privateRuntimeContractHashes sammen med den navngivne frosne591-provenance; den fejlede på den gamle antagelse og består efter den præcise rettelse. Negative felt-/hashcases bevares. Den efterfølgende normale migration kræver fortsat metadataOnly, ingen reparation eller genberegning, præcis fuld ændringsmængde, genbinding af de samme eksisterende public-hour-data og byteuændrede øvrige filer. Hele B-originalinventaret, gamle attester, hele S-inversen inklusive ukendte felter, frisk reproduktion/pointer, CAS og no-loss består. Den gamle currentGridOriginalOnly-kontrol er en anden, ikke kaldt gren og ændres ikke.

Controlleren ligger uden for de105 modelinput og65 native-modulinput. Dette giver ingen ny version, C/I/T, SQL eller geninstallation; den faktiske593-installation bevares. Den ændrede kilde kræver stadig normal præcis kildekvalifikation samt faktisk gennemført normal prepare/install, leverandørarbejde, gemning, deploy og offentlig kontrol. Den statiske helikoptergennemgang fandt ingen anden konkret inkompatibilitet i den efterfølgende kæde, men er ikke et produktionsbevis. De manglende gamle kompakte delingsfiler skal ikke fabrikeres i originale591-pakker. Alle fem mål er fortsat åbne. Se håndbog89.290 og privat checkpoint.

## 30. oktober — Python RAW-retention: samme producentgrænse uden ny binding

Den normale read_current_history_demands læser manifest.json og den beskyttede B/payload/data/live/conditions.json før leverandørhentning. Begge fik tidligere samme 256-MiB-loft. En fysisk gyldig conditions-fil over dette loft er nu reproduceret som DMI_RAW_CURRENT_B_BOUNDARY_INVALID gennem den eksisterende normale kalder. Afvisningen efterlader den gamle kandidat; selectorens efterfølgende præcise ledgertimekontrol afviser derfor korrekt en anden starttime. Den kontrol lempes ikke.

Kun conditions-rollen bruger nu producentens eksisterende 535.822.312-bytegrænse; manifestets 256 MiB, regulær fil, enkelt link, SHA, B-manifest, S-generation og registry bevares. Den eksisterende raw-retentionprøve accepterer både en repræsentativ stor fil og producentens maksimum og afviser maksimum+1, for stort/ugyldigt manifest, hardlinks, forkert filtype, SHA, S og registry. Den efterfølgende normale nonmarine-, arkiv- og genbrugsdel består også. Det er syntetisk fysisk I/O uden providerkald, ikke produktionseffekt.

Python-ejeren ligger uden for den uændrede C/I-kildeafledning og de uændrede native-moduler; normal bundle-/bindingskontrol bekræfter samme udstedte 593-tuple og syv forbrugere. Ingen ny version eller SQL kræves af dette snævre læsefix. Andre 256-MiB-grænser for DMI-lager, donorbanker og journaler ændres ikke. Den brede DMI_PRODUCER_EXCEPTION er ikke entydigt en B-fejl og må ikke bruges som grundlag for en generel ny stop- eller fallbackregel. Færdiggjort delvis leverandørledger skal fortsat kunne bruge CP/OM gennem de eksisterende strenge regler.

Nødvendig afslutning er præcis kildekvalifikation og en almindelig genoptaget forsyningskæde med faktisk ny ledger, DMI/Copernicus/Open-Meteo, beregning, B før S, deploy og offentlig dækningskontrol. Den fejlede kørsel nåede ikke en ny færdig beregning; en gammel offentlig pakke må ikke kaldes et nyt beregningscheckpoint. Ingen historiknulstilling eller geninstallation følger af denne rettelse.
