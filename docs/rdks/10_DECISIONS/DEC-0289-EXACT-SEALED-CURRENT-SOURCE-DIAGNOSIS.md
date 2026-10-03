# DEC-0289 – Skrivefri diagnose af én ejerudpeget original strømpakke

**Status:** Implementeret lokalt; exact-head CI, merge og faktisk læsning afventer.
**Dato:** 2026-10-03

## Ejerbeslutning og evidens

Ejeren bad om en tilbundsgående analyse af Lyngby/Lodbjerg og de to nabozoner,
godkendte læsning af den præcise pakke, udvidede til hele den allerede udpegede
pakke og gav derefter særskilt ja til diagnosekode og GitHub-læseworkflow.
Læsegodkendelsen var ikke i sig selv kode-/workflowautoritet; det senere ja er.
Den nye mulighed er diagnose, ikke automatisk rettelse af model eller geometri.

Offentlige hashbundne data viser DKSS-LF-punktet på land ved Lodbjerg, mens
transportscoren er høj. Den faktiske kode bruger samme valgte kandidat til
strømværdi og pilpunkt. Det beviser ikke endnu alle historiske kilders geografi.
Den høje score kan matematisk vedvare ved senere svag udgående strøm gennem
den uændrede 48-timers hukommelse. Prognosetimer er ikke målt fortidshistorik.

## Fastlåst læsning

- Kun artifact `11281483201`, `ravradar-private-build-stage-37136425685-1`,
  originalrun `37136425685`, attempt 1 og source
  `bbc3c79fe555dffbff4a88af8cdf54573953efdb` i ejerens RavRadar-repository.
- Faktisk ZIP skal være 197244788 bytes og SHA-256
  `b9089a8adb6c864e9c040f31c5cf236b6a0cb87cdcdc71f34ff1693c40f96140`.
  Én `sealed.bin` på 197244654 bytes; metadata, repository, source og udløb
  kontrolleres før download og den faktiske digest før dekryptering.
- Original AAD/HKDF/GCM, descriptor, archive-, model-, inventory- og
  filhashkontroller genbruges uændret. Forventningen beregnes fra den samme
  uændrede originalkontrakt, aldrig ud fra den krypterede descriptors påstand.
  Dataset `rr-20261003175138-210`, reference 3. oktober 16Z og generation
  `2026-10-03T17:51:38.558Z` er særskilt fastlåst.
- Main-only, aktuel main og live grøn exact-content kildekontrol kræves.
  Den almindelige produktionsconcurrency bevares uden annullering.
  Ingen merge eller diagnosedispatch mens almindelig writer er aktiv.
- Den eksisterende GitHub-nøgle bruges kun i autentificeringstrinnet og må
  ikke eksporteres. Inspektionen afviser kendte secrets/tokens i sit miljø.

## Sikkert resultat og åbne grænser

Kun de tre allerede offentlige PART-identiteter undersøges: Porskær Bakker,
Gjævhul Bakke og Hviderimmer. Den gemte kompakte state valideres med den
kanoniske uændrede strøm-replay. Originale bulk-rækker kontrolleres med den
eksisterende DMI-verifier, før tid/styrke sammenlignes. En sådan sammenligning
er eksplicit ikke en lagret kausal join. Manglende eller ændret råværdi bliver
UNMATCHED, aldrig et antaget bevis. Original maskestatus må ikke opfindes.

Kun faste, bounded aggregater offentliggøres som diagnoserapport. Ingen rå
U/V, koordinater, sourcepayload, sampleledger, private filstier eller primære
exceptiontekster forlader runnerens midlertidige område. Oprydning sletter
kun dette jobs egne navngivne scratchfiler. Lokal ZIP-bevaring er ikke et nyt
produktionsbackup eller en pointerændring.

Ingen provider, normal vejrbygning, ny scoregeneration, moving-pointer-read,
central-/R2-write, cachegemning, recovery, migration, standalone SQL eller
deploy. Ingen nye nøgler, planer, rolle-/credentialændringer, raw-private-log,
donor, admissionbypass, frozen-model-copy/eval eller lempelse af gates.
Native67/model29ea/continuationd983/storageABI og otte produktionsbindings-
forbrugere er uændrede. Offentlig/main-version forbliver 4.0.541; dette er
diagnoseværktøj, ikke en 4.0.542-produktlevering.

Ejeren har foreslået kontrol af alle zoner for samme fejltype. Det er fagligt
relevant, men en sådan udvidelse er endnu ikke implementeret eller udført.
Lyngbyårsagen skal først afgrænses, og mistanke må ikke blive automatisk rettelse.
