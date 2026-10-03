# DEC-0288 – Godkendt CP-kalder: første fejl, faktisk child-close og native genbinding

**Dato:** 2026-10-03. **Status:** DELVIST IMPLEMENTERET LOKALT i 4.0.541; ikke en ny offentlig version.

## Afgrænset ejerautoritet

Ejeren valgte "Godkend den afgrænsede rettelse" til den låste
`scripts/lib/copernicus-component-index.mjs`: første fejl må ikke skjules
af egen oprydning, og en startet underproces skal være lukket før oprydning
eller reservehentning. Nødvendige direkte callers, måltests og korrekt
dokumenteret hash-/modelgenbinding er omfattet. Ingen hashgenvej, ny
admissionworkflow, source-all-assets-læsning, privat joblog, donor, PROXY,
ny executor/supervisor eller genåbning af andre afvisninger følger med.
Scoreformler, kildeprioritet, geometri, budgetter, argumenter og adgangskrav
bevares. Ejerens GPT-6.1 Sol/Ekstra høj, tidsplan og cadence ændres ikke.

## Faktisk isolation og procesgrænse

På releasebranch `codex/copernicus-child-close-binding`, base/main
`8df23a9c6572f13715ed0a20269aa8a10f6da768`, ændres kun den eksisterende
`loadCopernicusComponentAuthority` i det låste index. De direkte callers
og CLI er allerede awaited og er byteuændrede. Første timeout/error bevares;
fejlet stop eller gentaget error er ikke et closebevis. Promise afsluttes
først ved actual child-close; uden close forbliver den pending, også gennem
ydre oprydning/fallback/OM. Egen oprydning forsøges efter close, og cleanup-only
er fortsat HARD. Ingen completedkill-/descendant-/runnergaranti er givet.

IndexLF ændres 6119a6e5…→cfdfdab9…; to genbrugte parents med fem og tre
underprøver matcher BIGs prøvede bytes. Isoleret 10 rapporterede parent/
subtestunits PASS, 0FAIL/0SKIP, 8374.027ms; 8 underprøver plus 2 parents,
ikke 10 nye unikke tests. 12 gamle parents og callers/CLI er bevaret.
RED og gamle fuldsuites gentages ikke for status. BIG519 forbliver separat/OFF.

## Native bindingskæde – ingen stale Candidate G eller alias

Den første normale native generation gav midlertidigt integrated0dfa6c2b…
med kun indexændringen. Den relevante release-metadata-test afslørede, at
det samme index også er i Candidate G's 65-filers closure. Derfor er
"Candidate G/continuation uændret" og 0dfa som endelig binding FORKASTET.
Dette var lokal integration, aldrig et produktionsartifact eller source-CI.

Normal Candidate G-builder giver nu
`28a69936b3d9a9c655e967c5e0c352d8401e5894ef3011bbfc55c85ad37f7ce7`:
kun indexets hash og aggregatehash ændres i dens metadata. Fysisk Candidate
G-kontrakt c73dac1b… og de andre 64 filehashes er uændrede. Det afledte
generated-modul har LF-SHA25626e1f266… og ligger selv i integrated closure.
Normal integrated-builder giver derfor endeligt
`29ea9a19647bf7d5edad0eee159267086d546f0d90a9f2778a77077351aad948`:
67 filer, direkte indexdelta plus afledt Candidate G-metadata; andre 65
hashes og fysisk kontrakt a226e7d1… er uændrede. Normal 12-filers continuation
giver `d983bb085f75252d00f0e2585cd0e274ea86020000f99037e9054a3989a4aef6`;
kun det afledte Candidate G-moduls hash ændres, de andre 11 er uændrede.
Ingen modelbody er kopieret/eval'et, ingen moduleksklusion eller hashalias.

Historiske Top20-builder må fortsat gengive præcis c557→3a14/applied008,
ikke kræve at dagens ændrede native closure kaldes3a14. Hashbundne historiske
manifester fra det eksisterende backup-tag/main indeholder kun sti/hashmetadata.
Begge komplette før-/efterhashes verificeres; den normale native kildegate
består separat. Candidate G/a249 og continuation4668 er de HISTORISKE
endpoints, ikke dagens runtimebinding. Dette bevarer den udstedte migration;
det lemper ikke aktuel native kontrol eller genåbner gamle undtagelser.

## Append-only SQL og lokale forbrugere

Ny lokal successor `20261003080000_copernicus_child_close_binding.sql`
er normalt genereret fra LF-hashlåste applied008 og00945. Disse er immutable
103de25a… og31632e33…. Kun aktuelle bindingsstempler/diagnostik, exact
predecessorbridge, dens metadataattestation og eksisterende55s flyttes frem.

Ny privat, security-invoker helper kræver root3a14, 673 homogene3a14states,
continuation4668 og companiona249. Den ændrer alene integrated root/states,
companionbundle og continuation til de faktisk native targethashes, hvorefter
hele den aktuelle payloadvalidator skal bestå. Målinger, tid, historik, roller,
companionstates og alle andre felter bevares. Ukendt/mixed/missing afvises.
Den historiske c557→3a14-projektion bevares og går derefter gennem samme
exact CP-bridge/fullvalidator. Ingen stored row/cipher ændres i projektionen.
Same-T-CAS sammenligner hele projected payload og ignorerer kun de tre
allerede afledte generation/state/companiongenerationdigests. Begge helpers
indgår i samme exact pg_proc-definitionreadback og restricted execute/searchpath.

Applied00945s55s er både faktisk reasserted og pg_proc-readbackkrævet, også
i begge mutable installationskopier. Ingen historisk30s genindføres eller
global bound hæves. Otte eksisterende bindingsforbrugere er lokalt synkroniseret
fra den nye read-only/prevaliderede anchor; fysisk kontrakt og11feltsformer
bevares. Readiness/releaseinventory og code-only migrationplan kræver det
præcise nye append-onlyled. Ingen SQL er installeret, ingen provider dispatched.

## Prøver og åbne produktionskrav

Tillæg10:52DK: PR509/firsthead8dea110e…/source-CI37110262078/attempt1
afvist ved step8 kl.10:44:55DK; tree/proof9/10 SKIPPED, intet ROOTproof.
Ingen rawjoblog. Lokal5-filsmatrix4PASS/1FAIL2164.1192ms reproducerede stale
historisk hourly-v1→v2-fixture i protectedprivate-runtimeprøven: positive
historicalexpected havde dagens d983 i stedet for sit immutable4668-endpoint.
Fixture bruger nu PRIVATE_HOURLY_V1_PREDECESSORs præcise continuation; ekstra
negativ case med currentd983+oldprojection skal fortsat afvises. Produktions-
predicate/admission/parser/cipher/restore ændres ikke. Hele denne eksisterende
fil1/1PASS3546.4227ms/0skip efterfix; direkte SQL/readiness/workflowmål3/3PASS
523.3844ms. Ingen ny unik fullruntimecase, genåbnet historiskadmission eller
fuld lokal sourcegentagelse. Ny funktionelt korrigeret head og dens exact-CI
kræves; den lokale årsag forklarer ikke i sig selv alle GitHub-fund.

Første lokale integrationsmatrix: 6PASS/1FAIL730.723ms. Candidate G's stale
metadata blev korrekt afvist; native65/Candidate/12continuation-genbinding
blev rettet, ikke testlempet. Metadata-test PASS1053.0656ms på mellemtrinnet.
Separat readinessfixture antog fejlagtigt, at en immutable historisk migration
havde dagens continuationhash. Den bruger nu sit navngivne4668-endpoint;
den aktuelle migration kræver separat d983. Readiness plus to eksisterende
private migration/routing-fixtures3PASS1068.108ms/0skip på mellemtrinnet.
Det er syntetisk eksisterende input, ikke privat produktionsrestore/fullfactory.

På endelige29ea/a249→28a6/d983: successorcheck, otteconsumercheck og SQL-
install/paritet/security/same-T-prøve3PASS143.3309ms/0skip. Dette er kilde/
metadata/kontraktprøver, IKKE actual SQL-eksekvering eller livebackendreadback.
Dette måltrin var før versionsløftet; nedenstående lokale4.0.541 ændrer ikke
disse runtime-/SQL-kontraktbytes. Commit/push/exact-head CI/merge/deploy mangler.
Dokumentationskontrol afviste først stale aktive bindingsstempler i webbogen;
efter sandfærdig offentlig/lokal adskillelse afviste den endnu et manglende
præcist Markdown-stempel. Tests blev ikke lempet. Endelig samme håndbogstest
1/1PASS130.8653ms/0skip,419kapitler; beskyttet RDKS-dokumentation1/1PASS
146.4816ms/0skip,5eksisterende versions-/hashbundne dokumenter. Endelig native
integratedcheck bekræfter29ea/67, historisk Top20check bekræfter issued008, og
RDKS540/14chat samt relevantdiffcheck består. SQLs mekaniske håndbogssync
ændrer kun payload; outsideLFsha96b16eb8667997349ae537744e1cb6af63dc1f92b494cab62e4cf37b4a5c7f49
er identisk før/efter. Det er RELEASEs nye lokale bindingsbaseline, ikke BIGs
gamle99114… eller den tidligere offentlige154c…baseline. Ingen SQLinstallation.

Lokal4.0.541 følger nu den eksisterende mekaniske versionsvej; offentlig540
og model3a14 er fortsat urørte. Samtaledelta, changelog, status/issues/roadmaps,
begge håndbøger og faktisk offentlig/lokal bindingsadskillelse opdateres samlet.
Geodata må kun ændre topversionen; native67/65/12 og de afgrænsede runtimebytes
skal fortsat matche. Ingen automatisk aktivering eller standaloneSQL følger.

Den lokale4.0.541-matrix modelversion/håndbog/protectedRDKS/releaseContract/
sourceplan/code-only-public-runtime består6/6filunits1108.5206ms/0skip.
Code-only-testen importerer allerede den eksisterende routingprøve; dens
resultat tælles ikke som en ny uafhængig prøve. Model-/releaseContractprøverne
genberegner faktisk nativeclosures på541; ingen runtime/CP-fuldsuite gentaget.
Sourcecriticalkontrollen består102browserfiler/aktiver/version/postdatagates;
sourceplan47direkte kritiske kommandoer og RDKS541/14chat består. Særskilt
strippeddiff beviser ONLYtopversion540→541 i begge geodata,65browserfiler og
to versionerede workflows ONLYversion samt uændrede index/testLF/direktecallers
og applied008/00945. Mekanisk handbookversionssyncs outsideLF96b16eb8… består.
Dette er lokale kilde-/syntetiske kontraktprøver, ikke privat produktionsrestore.

Resterende exact-head source-integritet og code-only
originalB/AAD-S/fullRuntimeContract/673-state-bridge/resultatgates kræves før
levering. Alle outerunknownstop/CP-SførT/writer/kill/failure4min/runnerloss/
nationalkapacitet/OFF og øvrige store revisionspunkter er fortsat åbne.

Offentlig540/main8df/seneste ordinary37096157187/04Z forbliver uændret.
Denne almindelige vejrhentning har faktisk gemning/cache/upload/deploy og
requireddeploy09:22:27DK; det er ikke actualrestore/fileCount/priorMatchedkey
eller ny offentlig FIELD/Top20/Nibe/gap-alderkontrol. Cron8348098 holdes aktiv;
ingen main/merge/bindingsinstallation/code-only mens en ny weatherwriter er aktiv.
