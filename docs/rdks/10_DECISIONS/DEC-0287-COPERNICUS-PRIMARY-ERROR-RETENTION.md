# DEC-0287 – Bevar første gemmefejl gennem Copernicus-kædens egne callers

**Dato:** 2026-10-02. **Status:** Implementeret og måltestet i isoleret4.0.540-kandidat; egen exact-head CI og produktion afventer.

Kun atomic_json, BoundedComponentTransport.download og save_component_bank
udtages fra den allerede RED-reproducerede lokale519-revision til præcis
godkendt main42e1581957b513cd04fb799a61135ec47fcb8d27. Ingen hel519copy,
frozenindex-/modelændring, ny API, executor, admission, supervisor eller OFF.

Receiptens fsync/replace, ydre requestcleanup og producerens bankcheckpoint
må ikke få deres første fejl maskeret af egen senere oprydning. Minimal
failed/catch/rethrow/finally bevarer første thrownværdi og forsøger stadig
egen tempfil eller requestmappe. Cleanup-only er stadig HARD, også efter
validcommit; acquire_subset udgiver ikke last_receipt ved fejlet return,
og produceren returnerer ikke et normalt resultat ved checkpointfejl.

Gamle gyldige receipts og gammel bank bevares byteidentisk før validcommit.
En komplet nycommit beholdes ved cleanup-only, uden rollback/orphanpruning.
Samme faktisk lille producerprøve genoptager fra diskens overlevende bank
via frisk transport/cache/original_component_admitter: før commit1syntetisk
request/1checkpoint, efter completecommit0/0 og byteidentisk bank. Alle gamle
recordIds/receipts og3 genuineoriginal-bytecandidates bevares. Ingen provider
eller privat produktionsinput bruges; ingen fakefactory/certificate.

## Præcis evidens og begrænsning

Genbrug BIGs allerede dokumenterede receipt2RED+kontrol, request1RED+kontrol
og bank1RED+kontrol; ingen gentagelse af RED eller26testfuldsuite.
Tre eksisterende parents med7underprøver er identiske i isolation.23gamle
parents er byteidentiske. På den nye releasebasis køres kun disse tre samt
to gamle retry-/walltime-/timeoutparents:5PASS/0FAIL/0SKIP4.011s.
Samme bankparent indeholder diskresume; ikke en ekstra unik testmatrix.

Streng inversdiff beviser præcis tre runtimefunktioner/ingen anden moduledelta.
Transportinverse LF-SHA2568dfa15fe96146dc7de550982aaa4bf4d6913727279f509264d84c6218ee060c1,
bankinverse87aed449ad015545a0f8a5aea3dc4adcf951d0e495c2c823a4aceae04c59db6f,
testinsertion0a5c0a619ed34d4bf15649c8b9bd6a5a342d4a5d919ccbf8b23d17e5a6f3fde4.
De tre valgte filer matcher kun deres tilsvarende BIGdeltaer; øvrig519 kopieres ikke.
Modelbundle67/3a14 og otte bindinger verificeret uændrede. Args/requests/retries/
budgets/DatasetUpdating76/parser/hash/seals/format/admin/geometri/score/Top20/
SQL-runtime/gates/cron/plan uændrede. SQL kun eksakt håndbogskopi, aldrig installation.

RDKS540/14chatkilder og sourcecritical102 består. Scopekontrol beviser76andre
produkt-/workflowfiler kun539→540version, geodata udelukkende topversion og
SQL udelukkende eksakt håndbogspayload; udenforpayload LF-SHA256
154c3443752d840124f4caed95663e8a2c5bea346302e4dc6231a13f8ff62325 uændret.
Appliedmigrations byteuændrede; ingen installation eller skjult bindingssynk.

Fem eksisterende docs/privacy/modelversion/kode-only/håndbogsfilkontroller gav
først4PASS/1FAIL287.2682ms: håndbogens aktive bindingskapitel havde allerede
på539 de gamle tekster over67/over65 uden mellemrum og uaktuel531-kandidatstatus.
Dette er dokumentationsfejl, ikke model-/runtime-RED. Aktuel tekst er rettet
til faktisk leveretTop20/binding og korrekte mellemrum; kun samme fejlede
håndbogstest er kørt igen:1PASS121.8033ms/0skip/418kapitler. Gamle markerkrav
og modelhash er bevaret, ingen testlempelse eller gentaget runtimefuldsuite.

Ved22:19:34 er almindelig37059837688/attempt1/exactmain42e15819 fundet aktiv.
Den blev ikke dispatched af dette arbejdsafsnit.540 må gerne kildeverificeres,
men merge/main/kode-only venter på netop dens faktiske resultatkontrol.

Syntetisk cleanup delegerer faktisk egen fjernelse før den kunstige fejl.
Dette beviser ikke repareret disk, completedcleanup, OS-/descendantstop,
writer-eksklusivitet, kill/failure4min, runner-loss, nationalkapacitet eller
fuld authenticatedfactory/updater/CP-SførT. Separat post-spawn/no-close RED
er URETTET og udelades ikke som løst; unknownchildstop blokerer ALLEoutercleanup.
Alle særskilte rawlog/admission/donor/PROXY/SOURCE-afvisninger består.

## Faktisk leveret basis og næste kontrol

ONEordinary37036350223 afsluttede21:02:23 med actualsave/upload/nytcache,
no-loss/private/CAS/R2/privacy/Pages/reseal/terminal/requireddeploy.
538/539 er merged og offentliggjort21:21:47/21:42:04. Public539/main42e15819
og16Zrr-20261002181346-210/210/673/118/3a14/a226/8bindinger er bekræftet.
Gamle pending-/stackedordrer er udført, ikke næste leveringsopgaver.

Ny FIELD21:45:395244/397070=99.540131463%, før12Z92.179464578%, samme metode,
alle118hashes/bytes/start-slutmanifest. Nibe118brugbare/BOTH/59incomplete+
59futureFULL_HISTORY/0unavailable. Ikke privat historik/nativeprovider/score/
kausal revisionsgevinst; rollingvinduer forskellige, ingen kalenderETA.
Ingen refetch af uændret1.42GB eller ny providerdispatch for kodebevis.

540 kræver egen exact-head source-CI, unexpiredROOTproof, fornyede writers/
main/head/base/content og sikker DEC0148false før faktisk Pages/model/main/
disposition/reseal/terminal/offentlig effekt. Ingen merge/main/kode-only under
aktiv vejrhentning. Cron8348098 forbliver aktiv/uændret. Ejerens GPT-6.1 Sol/
Ekstra høj og plan/kadence ændres ikke. Begge håndbøger89.148 er opdateret.
