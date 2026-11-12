# DEC-0272 – Bevar original backup, hvis privat installation ikke kan rulles tilbage

**Status:** Samlet lokal 4.0.525-kandidat; måltests bestået, ny exact-head CI og levering afventer.
**Dato:** 2026-10-01.

## Fejl og minimal rettelse

Den normale `installRestoredPrivateRuntime` flytter eksisterende filer til
transaktionsbestemte `.private-previous-*`-filer før installation. Ved en fejl
forsøger den tilbagerulning og rejser en særskilt fejl, hvis ikke alle filer
kan gendannes. Men den efterfølgende oprydning slettede også de originale
backupfiler, når tilbagerulningen var mislykkedes.

Ved `rollbackError` må oprydning fjerne egne
midlertidige installationsfiler, men ikke `.private-previous-*`. Den hidtidige
fejl og dens primære installationsårsag bevares. Bevarede filer giver mulighed
for eksplicit reparation; de betyder IKKE, at arbejdsområdet er konsistent,
at tilbagerulning er fuldført, eller at installation må rapporteres som succes.
Der indføres ingen automatisk geninstallation eller ny reparationsautoritet.

Den nært beslægtede component-stage-fejl samles i samme endnu ikke leverede
kandidat: ved primær unpack-, install- eller rollbackfejl må en efterfølgende
fejlet stageoprydning ikke erstatte den oprindelige exception/cause. Oprydning
forsøges stadig præcis som før. Hvis kun oprydningen fejler efter ellers
vellykket installation, skal denne fejl fortsat afvise installationen. Der
indføres ikke ny API, executor, retry, logpayload eller automatisk repair.
Rester efter mislykket oprydning er ikke renset eller repareret ved denne ændring.

Vellykket installation, vellykket tilbagerulning, filinventar, formater,
kryptografi, producentbindinger, lofter og model ændres ikke. Ingen workflow-
gate, normal vejrindsamling, publicering eller sikkerhedskontrol ændres.
Den separate levetid for bundle-prior/session/S/T er ikke løst her.

## Målrettet evidens

Den eksisterende test `test-private-production-runtime-workflow.mjs` bruger
egne kunstige temp-filer og eksisterende rename/remove-seams. Den udløser en
fejl midt i installationen og en separat fejl ved fjernelse under rollback.
Før rettelsen fejlede assertionen: oprydningen forsøgte at slette originalen.
Efter rettelsen bevares originalbytes, primær årsag og den hårde fejl; de
andre filer rulles tilbage, og egne midlertidige installationsfiler fjernes.
Tidligere positive og negative assertions i samme fil er bevaret.

To mellemliggende testforsøg efter runtimepatchen fandt alene en Windows-
realpath-antagelse i den nye test. Testen bruger nu faktisk realpath til
identitet; runtime blev ikke yderligere lempet. Endelig målkommando:
`node --test scripts/test-private-production-runtime-workflow.mjs`, 1/1 PASS,
0 fejl/annulleringer/skips, 1996,267 ms. Ikke en produktionsforekomstmåling,
heljobskapacitet eller en ny national prognose.

Efter versionsklargøring bestod én særskilt kommando med berørt runtime,
RDKS-beskyttelse, security, håndbog, modelversionering og releasekontrakt:
7/7 PASS, 0 fejl/skips, 2282,3768 ms. Runtimefilen overlapper den første
måltest og tælles ikke som et nyt selvstændigt bevis. Separat browser-
modullukning1/1 PASS,671,5633 ms. RDKS525/14 chatkilder, sourceplan47,
model67/c557f91a…/otte bindinger og versionskontrol består. Geodata er
byte-/objektkontrolleret version-only,61 browserfiler er version-only,
SQL ændrer kun håndbogspayload. Alle tre faktisk normaliserede persistente
kontrakthashes er uændrede; byteidentitet før normalisering gælder ikke
browser-cacheparametre. Ingen SQL-installation eller lokal fuld source-CI.

## Samtaledelta og leveringsrækkefølge

Første525-head02ed3c4 fik grøn exact-head CI36897750089/sourceproof11181171189.
Den grønne status dækker IKKE den senere tilføjelse. I stor519 blev tre nye
kunstige fejlgrene først røde, fordi cleanupfejlen erstattede primary; den
negative cleanup-only-kontrol bestod allerede. Efter minimal rettelse bestod
begge berørte eksisterende filer samlet28/28 på9732,7725ms. Første samlede
forsøg havde27PASS/1FAIL alene pga. Windows' Python Store-alias; den eksisterende
bundled Python blev valgt uden installation, gates eller runtimeændring.
Kun den nye regression og den lille runtime-delta blev derefter overført
til releasecheckout:16/16 PASS på8332,7965ms,0skip, inklusive faktisk kunstig
CP-originalpack. Forskellen i antal skyldes større519s øvrige lokale opt-ins;
de blev ikke kopieret eller aktiveret. En ny exact-head CI kræves efter push.
Efter dokumentation: fire eksisterende RDKS/security/håndbogsfiler4/4 PASS,
270,8361ms,0skip; RDKS525/14kilder,source47,model67/otte bindinger og diffcheck
består. SQL uden for eksakt håndbogspayload er LF-identisk; CRLF/LF er ikke
en SQL-ændring. Der blev ikke kørt SQL eller ændret geodata i denne tilføjelse.

523 og524 er allerede leveret og offentligt verificeret;524 beholdt dataset
rr-20261001143611-210. Cron8348098 blev genaktiveret på uændret firetimersplan,
minut19 UTC. Ejeren ønsker fortsat vejrhentning sideløbende med rettelser.
En kortvarig, efterfølgende tilbagekaldt stopordre nåede at annullere
36895117738. Run sluttede cancelled kl.19.02; save/upload og deploy blev
sprunget over, og der hævdes ingen ny gemt fremdrift eller publicering.
Efter ejerens præcise nye ordre blev én ordinary36896697919 startet kl.19.04
på uændret524/main07e4ef4c, quick_confirmation=false/defaulttom source.
Cron er fortsat aktiv. Ingen mainændring eller release må overlappe aktivt
weather-run; lokal kandidat og PR-kildekontrol kan færdiggøres imens.

Astra Ekstra høj er valgt og tilstrækkelig. Færdig lokal rettelse, grøn CI,
offentlig levering og faktisk fejlvejsvirkning skal beskrives hver for sig.
Ingen ny privat audit, afvist admissiongate, historisk donoromvej, SOURCE-
eller sessionaktivering indgår. Den store dirty519-revision bevares separat.

## Tillæg 2026-11-02 — separat databasebackup før Free

Den oprindelige regel om at bevare originale backupfiler ved mislykket rollback består uændret. Den nye lokale databasebackup i håndbog 89.300 er et særskilt formål: fem komprimerede/krypterede SQL-filer, GCM/eksakt SHA, central og DB-uafhængig genfinding samt eksplicit create-only materialisering i privat RUNNER_TEMP. Det er hverken vejrets B/S-backup, ét atomisk databasesnapshot eller en udført produktionsrestore.

Skrivefri standard, eksisterende vejr→turlager-køer og 20 minutters operation/30 minutters job bevares på den midlertidige Linux-runner med Node 24 og CLI 2.117.0. Ukendt udfald giver stop uden automatisk gentagelse. De normale lokale mål består; ny præcis kilde-/nativekvalifikation og levering, faktisk lageradgang, kompatibel Auth/schema/datarestore og anti-genoplivning samt managed-DDL, Storage-bytes og uafhængig nøglerecovery er åbne. FreeReady eller Pro-opsigelse må ikke afledes af lokal byteverifikation alene. Ingen originaler slettes, og ingen SOURCE-, statistik-, scheduler-, model- eller gateaktivering følger med.

## Tillæg 2026-11-04 — eksisterende arkiv til egen isoleret standardrestore

Den lokale kandidat forbinder kun de to eksisterende restoreejere. Normal syntetisk prøve er fortsat default og henter intet rigtigt arkiv. Den udtrykkelige arkivgren bruger eksakt indeks-SHA, kvalificeret genlæst main og samme autentificerede runSupabaseDatabaseArchive-materialisering. Alle fem oprindelige filnavne, GCM-/SHA-beviser og create-only private SQL-bytes bevares.

SQL udføres alene i det nye lokale B-projekt gennem de eksisterende container-, loopback-, psql-, processtop- og Dockerlukningskontroller. Den ejede bridge skal være intern før containerstart; produktionsnøgler isoleres til arkivlæseren. Strømning i højst 64 KiB med backpressure og fuld fil-/hashkontrol erstatter kun de virkelige filers bufferbehov. Enkelttransaktion, ON_ERROR_STOP, 20 minutters operation, 2 minutters oprydning, 23 minutters trin, 30 minutters job og 90 sekunder pr. psql-kald består. Ingen automatisk gentagelse eller produktionsrestore tilføjes.

Målrettede lokale kunstige prøver har evidens for denne kildegren, ikke for hosted Docker eller et rigtigt arkiv. Kildekvalifikation og levering, den normale hosted standardprøve med egen lukning, faktisk adgang/capture og autentificeret arkivvalg er tekniske forudsætninger før den faktiske arkivprøve. Den private førstehostedplan er en arbejdsrækkefølge under ejerens stående autoritet; den er ikke en ny menneskelig tilladelsesgrænse eller et forbud mod lokal kildeforberedelse.

Sund lokal Auth efter udført SQL er ikke bevaret brugerlogin. PG17/managed-DDL- og projektkompatibilitet, fuld række-/schema-/RLS-/sekvensparitet, snapshotintegritet, Auth-data/login, Storage-bytes, uafhængige slettebarrierer/nøgler, målt forbrug og varig frekvens/retention består åbne. authRestoreVerified, fullDatabaseBackupVerified og freeReady forbliver false. Der udstedes ingen binding, migration, aktivering eller Free-/Pro-konklusion med denne dokumentation.

## 4. november — særskilt backupmetadata efter 808

Cloudflare-adgangen til administrationsarkivet er klargjort. Den normale kontrol nåede derefter bucketegenskaberne og stoppede på R2_BUCKET_PROPERTIES; diskrettelsens 808-kandidat omfatter den præcise korrektion af dette metadataformat. Det gamle HTTP 403 beskriver derfor ikke det aktuelle stop. Den særskilte backupbucket er ikke derved oprettet eller verificeret, og dens faktiske adgang, eksport og arkiv er fortsat ubekræftede.

Backuphjælperens separate formatrettelse tillader kun, at jurisdiction og lagerklasse mangler i liste- og oprettelsessvar. Et tilstedeværende forkert eller null felt afvises stadig, og det præcise backupbucketnavn kræves. En frisk fuld detailaflæsning skal fortsat bevise EU, Standard, deaktiveret r2.dev og ingen egne domæner, før resultatet er VERIFIED. Der er ingen import af administrationsbucketens politik, nye credentials eller automatisk gentagelse.

De egne målprøver af denne korrektion er lokal, syntetisk evidens. De erstatter ikke faktisk backupbucketadgang, eksakt kildekvalifikation, autentificeret arkiv, kompatibel Auth-/datagendannelse eller FreeReady. Dokumentoprydningen i 89.298 beholder sine særskilte bevaringsgates; fuld database-/Authbackup er en gate før Pro-opsigelse og må ikke opfindes som en ekstra gate for den allerede afgrænsede tredokumentoprydning.

## Tillæg 2026-11-04 — kildeport over PR810

Den separate backup- og målerpakke er nu lokalt sammensat med præcis PR810-kilde 45594e185f087ff02c8e72649d02cb45cf79cf16. Alle 21 gennemgåede produkt- og testejere bevarer deres tidligere efterbytes. PR810s SDK-, statfs-, én-pass- og direkte workflowkalderrettelser bevares; gamle dokumentbaser må ikke overskrive dem.

Diskrettelsen fra PR808 er kilde- og nativekvalificeret og merget til main. PR810 og denne backupport har hver deres faktiske leveringsstatus. Denne private komposition ændrer ingen drift og ommærker hverken den tidligere SDK-Linux-prøve, historisk584-nationalprøve eller 597-databasebevis som et nyt resultat.

Backuphjælperens 12 allerede beståede formatmål genbruges kun med præcis samme helper, test, transportafhængighed og Node-version. Samlet ny kildekvalifikation og levering, faktisk særskilt backupbucket- og arkivadgang, fuld database- og Authgendannelse, uafhængig nøglerecovery, varig frekvens/retention samt målt egnethed til Free er fortsat åbne. Pro beholdes; ingen automatisk backup, beskæring, sletning eller FreeReady aktiveres.


## 5. november — 4.0.598: præcis afvisning af anonym arkivadgang

Den private arkivkontrol skelner mellem faktisk læseadgang og en afvist usigneret forespørgsel. R2 kan afvise den normale GET/Range-metode med HTTP400 og den præcise XML-fejl InvalidArgument/Authorization. Kun denne begrænsede fejlkuvert med korrekt indholdstype og højst 4.096 accepterede byte giver den afgrænsede fortolkning. Friske private EU-bucketegenskaber og autentificeret objektlæsning med nøjagtigt byteantal og SHA-256 kræves fortsat. HTTP401/403/404 bevares; succes, redirect, ukendt400, serverfejl, for stor eller forkert XML afvises. Anonyme successvar annulleres uden objektlæsning.

Den oprindelige fælles R2-transport og dens historiske kaldere bevares bytepræcist. En separat privat adapter bruges kun af dokumenthistorik og databasebackup. De eksisterende autentificerede læse- og bytebudgetkontroller bevares; kun den præcise usignerede probe føres ulæst frem til den afgrænsede fejlkontrol eller annullering. Et klassificeret læseafslag er ikke selv bevis for private bucketindstillinger, locator, fuld backup eller databasegendannelse.

Et gyldigt målt HTTP-statusfelt fra en senere childfejl bevares i workflowets fejlrapport. Det erstatter den tidligere udeladelse af operationsstatus, men må ikke blandes sammen med Supabases særskilte privacyHttpStatus og privacyStage. Manglende eller ugyldige målinger forbliver ukendte. Arkivering kan have gemt et uændrligt objekt før et senere afslag; det giver ingen automatisk genkørsel eller adgang til locator-publicering eller prune.

Den afgrænsede rettelse bevarer 4.0.598-kandidatens C/I/T og version, alle gamle migrationsbytes og den nye598-migration, scoreformel, kildeprioritet, originale vejr- og scoredata, administratorpunkter og geometri. Den normale håndbogssynkronisering ændrer kun dokumentations-JSON i INSTALL, aldrig DDL. De samlede eksisterende R2-, dokumenthistorik-, databasebackup- og workflowmål er de relevante kontrolindgange. Præcis slut-head-kildekontrol, sikker levering og faktisk gendannelses-/FreeReady-bevis er fortsat selvstændige krav.

Se håndbog 89.313. Private statusaflæsninger, kørselspins og konkrete prøvekvitteringer føres i privat evidens; løbende kørselstilstande hører ikke til i denne dokumentation.

## 11. november — lokal SQL/Auth-reservefornyelse med bevaret SOURCE611

Den lokale kilde samler den afgrænsede Auth-forudsætning og automatisk reservefornyelse i 11 filer. Den normale isolerede gendannelse sammenligner alle autentificerede COPY-kolonner, dubletantal og eksporterede sekvenstilstande uden tab af numerisk præcision. Forløbet er forberedt til at prøve passwordlogin på en frisk syntetisk Auth-konto i det isolerede lokale Auth-system, mens oprindelige Auth-rækker beskyttes og efterkontrolleres. Dette er SQL/Auth-scope; de brede felter for fuld database-/applikationsrecovery forbliver false.

Capture, fysisk restore og rotation udføres hver for sig i eksisterende normale ledige vinduer. Syvdøgnscadencen bruger det oprindelige vejrslot, mindst 35 minutters resttid og de eksisterende ydre/indre skrivelåse. Kun en fuldt positiv kontrol efter faktisk fysisk cleanup kan gemme den lille GCM-autentificerede, create-only reservekvittering. En nyere særskilt verificeret reserve kan afløse bootstrapreserven; kvitteringen udløber med sin gruppe før indekset. Ukendt skrive- eller stopudfald giver ingen positiv kvittering eller sletteautoritet.

RAW455, C193, I190, T12 og alle 556 beskyttede filer er bevaret. Der er ikke udstedt ny SOURCE, model, SQL eller version. Den nødvendige normale workflow-integration er prøvet lokalt med den eksisterende Python-runtime. Testlæseren genkender additivt den allerede gennemgåede adminhistorik-workflowefterfølger; gamle pins og ukendte eller ændrede bytes afvises fortsat. De byteidentiske øvrige 11 arkiv-, 41 kalder- og 27 restore-selftests genbruges fra deres præcise tidligere evidens og er ikke genkørt.

Kilden er lokalt integreret, ikke hosted kvalificeret, installeret eller aktiveret. Faktisk isoleret SQL/Auth-restore af den eksisterende backup, holdbar kvittering, fysisk ophør og målt tids-/ressourcemargen mangler fortsat. Storage-objektlegemer, fuld applikationsrecovery, slettebarrierer og uafhængig nøglerecovery er særskilte åbne beviser. Pro er den senest faktisk aflæste plan; isoleret backup-egress og varig Free-margen er ikke bevist. Ingen ny tjeneste, nøgle, plan, automatisk capture, rotation eller nedgradering er aktiveret.

Håndbogens samlede Markdown-/web-/installationsdelta er forberedt særskilt til hovedagenten. Den normale webhåndbogssynk ændrer en genereret JSON-payload i den beskyttede INSTALL-fil; den må derfor ikke anvendes skjult på den allerede udstedte SOURCE-kilde. Håndbog 89.337 beskriver den forberedte kilde, men afsnittet er endnu ikke indarbejdet i denne uændrede installationskopi.
