# DEC-0292 – Privat diagnose af Fur-vandstand i normale vejrhentninger

**Status:** IMPLEMENTERET og deployet i 4.0.542; faktisk normal diagnoseeffekt, gammel årsag og timeretention er åbne.
**Dato:** 2026-10-04

# NYESTE – 2026-10-06 17.10 DK – kold SOURCE-bevarelse og fremrykkede referencer består lokalt

Den normale lokale kandidat gemmer nu selvstændigt kvalificerede SOURCE-
vandstandstimer som en separat valgfri bank i den eksisterende autentificerede
private forecastfil. Det er ikke et SOURCE-as-zone/PART-aggregat, en ny privat
destination eller en kopi af hele 519-revisionen. Native/protected/historical
input har fortsat prioritet; kun manglende kvalificerede timer genvindes.
Gamle snapshots uden banken kan læses. Originale timestamps og kildebeviser
bevares; ændret centralt målepunkt, beskadiget indhold, fremtidig markør og
udløb afvises. 121 private timer inkluderer allerede offentlig118h plus T+3.

Tre faktiske kolde filgenindlæsninger ved samme reference består med192
no-loss-timekontroller. Tre fremrykkede referencer består med yderligere192
kontroller på syv zoner plus Fur og både dkss_nsbs/dkss_lf. Det eksisterende
95-minutters native-edge-hold er uændret; ingen ny native måling opfindes.
De oprindelige SOURCE-records ændres ikke, mens den nye routede projektion
beregner konservativ prognosealder ved den aktuelle generationstid.

Den første samlede kompressionspakke fejlede den målte kildekapacitet og er
erstattet lokalt af særskilt begrænsede SOURCE-records. Faktisk filgenbrug
af256 kilder/30976 kvalificerede timer består; det er ikke national heljob-
kapacitet. Eksisterende samlede fil-, arkiv- og krypteringsbudgetter bevares.
Normal krypteret gemning/genbrug genvinder fire kvalificerede SOURCE-huller.
En indre ugyldig kildeforsegling afvises af forecast-recovery og den faktiske
workflow-gate uden at erstatte beskyttede forecastbytes. Den komplette
krypterede fil synkroniseres fortsat før erstatning, jf.89.167.

De direkte berørte cache-/filprøver består:10 rapporterede enheder,
0FAIL/SKIP/CANCEL. Den berørte filtestfamilie har12PASS og én eksplicit
fravalgt stor opt-in-kapacitetsprøve, ikke et fuldt nationalt kapacitetsbevis.
Dette lukker lokale kolde SOURCE-huller, ikke faktisk upload, tab af runner,
gamle Fur-årsag eller offentlig ny-generationseffekt. Bindingsopdatering og ny
migration er udtrykkeligt godkendt6oktober; de er endnu ikke gennemført her.
Gamle migrationer, scoreformel, central routing, kildevægte, strøm/hukommelse,
vandtemperatur, Limfjord-data og hård no-loss bevares. Ingen installation,
merge eller anden produktionsændring under aktiv writer. Lokalversion543;
PR522/Jordrav527-koordinering, egen exact-head-kontrol og sikker levering
mangler. Den samlede revision, Spørg RavRadar og GDPR er ikke færdigmeldt.
Ældre beskrivelser af manglende lokal SOURCE-bank er historiske; de tidligere
negative legacy-prøver bevares og dokumenterer hvorfor banken er nødvendig.

---

# HISTORISK – 2026-10-06 – T+3 og SOURCE-retention rettet lokalt; faktisk effekt åben

En ny lokal kold-genbrugsprøve afgrænser holdbarheden: den normale caller
pakker direkte PART-data før SOURCE-routing. Den afledte SOURCE-union gemmes
ikke dér. Hvis den næste beskyttede native kopi selv indeholder run-sømme,
kommer de fire afledte huller igen uden en selvstændig originalbank. Prøven
bruger den eksisterende pack/unpack og faktiske no-loss-sammenligner: 64
syntetiske tab registreres, ikke skjules. En ægte originaldonor genvinder
timerne efter kold JSON-genbrug. Aggregatets routede PART-proveniens er ikke
et originalt SOURCE-bevis. Dette er en lokal restgrænse, ikke et nyt målt
produktionstab eller bevis for den gamle Fur-årsag. Holdbar SOURCE-bevarelse
gennem flere generationer skal derfor færdiggøres før denne del kan lukkes;
ingen ny cachekontrakt, privat destination eller afvist binding er indført.

Ejeren har udtrykkeligt fastholdt vandstandsrettelserne fra den planlagte
opgave. Fravalget af nye scoremodelopgaver ændrer ikke denne autoritet.
En normal caller-prøve reproducerede, at zone-/store-routing accepterede
en gyldig T+3-time fra en anden serie, mens PART allerede krævede samme
serie. Begge veje bruger nu lokalt samme verificerede seriekontrol.
Ukendt trend fjerner ikke gyldig aktuel vandstand, og central routing,
vægtning, scoreformel og offentlig 118h-horisont ændres ikke.

40 blandede serieforløb og gyldige kontrolforløb samt de fire berørte
måltests består. Dette er lokal evidens, ikke nye produktionsdata eller
gammel Fur-årsagsbevis. Selvstændig derived-SOURCE-retention og frisk
samlet donor-kvalifikation er siden også implementeret lokalt i den normale
bankbygger med de eksisterende beskyttede/historiske native banker.
117/121-sømmen blev reproduceret før rettelsen; bagefter består 64 præcise
retention/no-loss-timekontroller over syv zoner plus Fur og begge collections.
Gyldig aktiv kilde beholder prioritet; kun manglende kvalificerede timer
fyldes, uden ændring af originale native banker. Færdig union kvalificeres
under en ny record-identitet, aldrig gennem et gammelt memo efter tilføjelser.
Relevante bindinger, tilladte destinationer, egen CI, kontrolleret levering
og faktisk ny-generationseffekt er åbne; gamle bindinger er ikke ændret.
Hård no-loss og de øvrige restriktioner består.

# NYESTE – 5. oktober – seneste tab er tre kystzoner, ikke Fur

Den afsluttede naturlige vejrhentning havde 21 vandstandstab, ligeligt fordelt
på Agger, Lyngby og Harboøre. Fur-diagnosen havde 0 tab. Pages blev sprunget
over, og sidste gyldige offentlige datasæt blev bevaret. Det er ikke bevis
for rettelse eller årsag til de gamle Fur-huller.

Den lokale 543-kandidat tillader kun verificeret dkss_lf-vandstand på syv
ejerzoner, ikke strøm eller temperatur. Den fjerner en kildeafvisning når
valgte input findes, men genskaber ikke manglende kilder, gamle vægte eller
gammel årsag. Diagnose, central interpolation og no-loss består; automatisk
sikker timeretention er stadig åben. Se DEC-0291 og begge håndbøgers 89.160.

# NYESTE – 2026-10-04 22:45 DK – 4.0.542 faktisk leveret; ny vejreffekt afventer

PR516 og PR517 er merged efter hver sin exact-head kildekontrol og proof.
Den reparerede kontrollerede release afsluttede kl.22.20 DK med faktisk
original-restore, privat overgang/publicering, eksakt datagenbrug og Pages.
Hjemmesiden viser 4.0.542. Første releasefejl før Pages er historisk.
Den allerede installerede nye databaseovergang blev ikke gentaget; faktisk
migrationsplan var tom. Gamle migrationer, scoreformler og kystpunkter er urørte.

Kode-only genbrugte gyldige 16Z-data uden providerkald eller ny scoreberegning.
Syvzoners kilderene strøm og 48h-state behandles først ved ægte NEW-T;
faktisk offentlig effekt er stadig åben. Originaler og bevist øvrig historik bevares.
Cron er ikke ændret efter ejerens »pyt«. Den naturlige vejrhentning var kl.22.41
aktiv ved DMI uden fejlede trin; restorecounts/save/cache/deploy er ikke målt endnu.
Den godkendte manuelle kørsel venter på faktisk ledig writer. Ingen overlap/replacement.

NORMAL Fur-diagnosen er leveret, ikke automatisk timeretention. Gamle 7/12 timers
årsag og sikker genvinding er åbne. Hash/presence kan ikke genskabe gamle vægte
eller tilsidesætte central routing. No-loss består; første legacy-spor kan være ukendt.
Ingen hjemmesidealarm/usermail. FIELD-dækning er stadig 96.440426121%, alle fem
samtidig 92.842571839% over 210/673/118h i samme 16Z-data, ikke ny coverage/privathistorik.
Detaljeret privat evidens ligger i checkpoint. Modstridende ældre statusser er historik.

Ejeren kræver fremtidig diagnose af Fur-hullerne og levering sammen med den
klargjorte syvzonerettelse efter aktiv vejrhentning. Dette erstatter det gamle
faste læseværktøj som næste arbejdsvej, ikke tilladelse til en anden gammel
cipher eller offentliggørelse af private produktionsdata.

Den faktiske normale verified-PART→SOURCE-routing indsamler kun ved Fur del04
et privat, bounded 118h-spor. Det indeholder præcise dataset-/tidsidentiteter,
hashes af faktisk kontekst, valgte brackets og anvendt konfiguration samt
boolean/counts for direkte PART, verificerede/tilladte valgte SOURCE-input,
routet output og den tidligere valgte SOURCE-bank. Det gemmes i eksisterende
private conditions/hourpack/cache-flow, ikke en ny destination eller provider.
Ingen rå værdier, source-ID-liste, koordinater eller configpayload gemmes i sporet.

Eksisterende no-loss-kontrol sammenholder reelle offentlige Fur-tab med de to
private, korrekt tidsbundne spor og skriver kun en fast kode/count-rapport.
Manglende legacy-spor, ændret kontekst og manglende identitetsjoin er eksplicit
ukendt. En ændret bracket med bevarede tidligere kilder er en målt mekanisme,
ikke bevis for den gamle kørsel. De gamle 7/12 timers rodårsag er stadig OPEN.
Rapporten ændrer ikke score, datatilgængelighed, routing, budget eller no-loss.

Normal caller-, actual-router-, privat komprimerings-/restore- og offentlig
byte-neutral projektionstest er genbrugt og består lokalt. Ingen nyt nationalt
produktionsinput, frozen-model-eval eller privat cache er læst. Første nye
generation kan ærligt mangle et tidligere spor; diagnose sammenligner kun
korrekt matchede faktisk gemte generationer.

**Separat OPEN:** Bevarelse af gyldige tidligere timer, så et genvindeligt tab
ikke stopper deploy. Den skal ske før uændret slutkontrol med ægte provenance
og alle relevante model-/publickontrakter. Ingen blanket-bypass, falsk nulværdi,
rå public-payload-reparation eller skjult tab er godkendt eller implementeret.

**Konkret CI-reparation kl.21:16 DK:** Første exact-head kontrol fejlede på
to kommandoer. PART-testens udtræksgrænse og code-only-klassifikationsasserts
følger nu de reelle callers. Den eksisterende legacy restore-lukning manglede
wrapperens nye plain-helper; den kopieres efter originalforventning sammen
med wrapperen, men model og bundle-verifier erstattes ikke. Begge berørte
legacy/protected tests og code-only-regression består. Ingen runtimebinding,
no-loss, originalpin, scoreformel eller gammel migration ændres. Ny head og
én frisk kildekontrol/proof kræves; den fejlede head må ikke merges.
Den ekstra målrettede workflowkontrol afslørede også testens gamle inventar
og checkpointmarker. Kun tre allerede eksisterende main-workflows er registreret;
alle no-deploy-assertions består. Checkpointassertion kræver nu også den faktiske
strenge owner-original-udelukkelse. Hele denne workflowkontrol består; ingen
produktionscondition er ændret, og native builders/otte bindinger er uændrede.

**Release kl.21:56 DK:** PR516 merged kl.21:35 efter exact CI/proof.
Kontrolleret release stoppede kl.21:38 i arkivets parent-ID-kontrol; den nye
migration er installeret, men privat publish og Pages er SKIPPED. Hjemmesiden
bevarer kode 541 og 16Z-data. ID-regex afviste gyldige Samsø-/Læsø-zoner.
Rettelsen kræver begge autentificerede originale 210-zoneinventarer med ens
nøgler, alle 673 delidentiteter og eksakt parentmedlemskab. Ukendt parent,
forkert del-id og forskellige inventarer afvises stadig. Samme eksisterende
arkivparent gik fra 4PASS/2FAIL til 6PASS/0FAIL; det er parent/subtest-enheder,
ikke national produktionskontrol. Normale migration/code-only-tests og native
bundle/otte consumers består uændret. Ingen ny binding eller migration kræves
af denne rettelse. Ny exact-head CI/proof og faktisk produktion mangler stadig.
Se DEC-0291 og privat checkpoint for eksakte hashes og test-/kørselsevidens.
