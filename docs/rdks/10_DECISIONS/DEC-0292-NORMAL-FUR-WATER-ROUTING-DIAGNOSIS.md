# DEC-0292 – Privat diagnose af Fur-vandstand i normale vejrhentninger

**Status:** PR516 merged med exact CI/proof; kontrolleret release fejlede før Pages. Afgrænset original-zonekontrol repareret lokalt; produktion stadig åben.
**Dato:** 2026-10-04

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
