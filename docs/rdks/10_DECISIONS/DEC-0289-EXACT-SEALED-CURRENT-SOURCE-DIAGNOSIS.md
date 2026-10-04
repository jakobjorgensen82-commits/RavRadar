# DEC-0289 – Skrivefri diagnose af én ejerudpeget original strømpakke

**Status:** PR510/511 er merged; korrigeret nabokontrol er faktisk authenticated og replay-matched. Godkendt national udvidelse er lokalt måltestet; egen CI/merge og faktisk national læsning afventer.
**Dato:** 2026-10-03

## Faktisk læsning og godkendt national udvidelse 2026-10-04

PR511/head288c566c bestod exactCI37164129369 og ROOTproof11288622599,
og blev merged04:48:33 DK til mainbde77345. Correctedfixedread37172221379
afsluttede SUCCESS04:50:12 DK. Originalkontrakter/ZIPdigest, authentication,
inspect, safeupload og owncleanup faktisk PASS. Kun safeartifact11291319355
blev hentet, ingen lokal cipher eller rå privatpayload. Offentlig541 uændret.
Tre naboers state replay matcher: Lyngby-supply95.821344 reproduceret over
48h/49slots inklusive endepunkter. Kildematch LF_LAND_POINT17/NSBS2/UNMATCHED30;
netto land0/NSBS0/UNMATCHED95.821344. Landpunktet er ikke bevist årsag.
UNMATCHED er ikke automatisk ugyldig historik; kausal join er ikke lagret,
original GRIB-mask findes ikke i baselineinventory og er ikke målt.

Den særskilt godkendte alle-zoneplan tilføjer kun NATIONAL_210_673-valg og
READ-SEALED-NATIONAL-11281483201-bekræftelse i SAME reader/workflow. Gammelt
LYNGBY_NEIGHBORS-valg er standard; completednaboread gentages ikke blindt.
Samme originalinput/forventning/auth/fullbundleverifier/reducer og gates.
210 unikke zoner/673 dele, tilhørsforhold og ikke-tomme zoner kontrolleres.
Hver presentstate gennemgår uændret hard context/replaykontrol uden catch.
Absentstate tælles særskilt, aldrig fabrikeret eller kaldt verified replay.
Rapporten har faste total-/zoneoptællinger for replay/ready/fravær og
sourcegrupper under uændret32KiB; kompakt national JSON, ingen rawfields.
Ét kendt Lyngby-landpunkt er eksplicit IKKE global land-/vandmask. Source-
match er fortsat tid/styrke, ikke persistedcausaljoin eller nativevalidity.

To eksisterende testparents genbruges: verifier/replay/privacy-parent
PASS1426.1394ms og workflow-parent PASS4.0211ms, 0FAIL/0SKIP. Syntetisk
673/210-testdata er en lille testmatrix, ikke673 nye unikke prøver eller
faktisk nationalproduktion. Identitet/fravær/presentmismatch/UNMATCHED,
inputimmutabilitet/32KiB/privacy samt fixedscope/fixedconfirmation prøves.
Original auth/ZIP/gates/secretseparation/cleanup/defaultread er uændrede.
Egen exact-head kildekontrol, sikker merge og faktisk nationalread afventer.
Pakkens udløb4Oct20:34:41 DK giver ikke autoritet til nyt input eller relabel.

Ordinary37164593278 fejlede04:34:33 DK på syv Fur-waterLevel-tab8Oct07–13Z,
øvrige familiers tab0/identitet0. Priorprogress faktisk RESTORED32files og
ny komponentcache faktisk saved/uploaded; ingen deploy. Aktuel NORMALcaller
har protectedpublicSOURCE-backfill og directPART-før-SOURCE-routing.
Dette sourceplanbevis er ikke målte tabsrækker eller kausal retentionforklaring;
DMI-budgetfejl kan heller ikke alene bevise tabenes årsag. Ingen spekulativ
patch, capraise, gatelempelse eller andre nye privateciphermål.

## Historisk nøglebinding-opfølgning 2026-10-04

PR510/head36fe6ce7 bestod exact-head CI37154054174 og blev merged
01:56:24 DK til maina459b846. Den ene godkendte læsning37163385963 stoppede
01:57:40 DK i autentificeringstrinnet; inspektion var SKIPPED, ikke PASS.
Workflowet slog fejlagtigt et nyt secretnavn op. Den faktisk injicerede værdi
var tom, mens den uændrede producent bruger den eksisterende
`secrets.SUPABASE_SERVICE_ROLE_KEY` som masterinput. Kun læserens binding
rettes til samme eksisterende nøgle; ingen nøgle eller rettighed ændres.
Den eksisterende workflowtest sammenligner nu producent og læser: én RED
og tre PASS før rettelsen, fire PASS efter, ingen skip. Den gamle test havde
spejlet det forkerte navn. AAD/HKDF/GCM, target, gates og cleanup er uændrede.
Dette er ikke autentificering, privat historielæsning eller Lyngbyårsagsbevis.

Ejeren har nu stående godkendt læsning af relevante private joblogs. Det
erstatter tidligere loglæseafvisning, ikke krav om at holde secrets og private
payloads ude af svar, commits og offentlige rapporter. Ingen ACL-/rolleændring.
Ejeren har også godkendt planen om skrivefri kontrol af alle zoner for samme
fejltype; implementering og udførelse afventer Lyngbyårsagens afgrænsning.

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

Standardvalget undersøger de tre allerede offentlige PART-identiteter: Porskær Bakker,
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
deploy. Ingen nye nøgler, planer, rolle-/credentialændringer,
donor, admissionbypass, frozen-model-copy/eval eller lempelse af gates.
Native67/model29ea/continuationd983/storageABI og otte produktionsbindings-
forbrugere er uændrede. Offentlig/main-version forbliver 4.0.541; dette er
diagnoseværktøj, ikke en 4.0.542-produktlevering.

Ejeren har godkendt kontrol af alle zoner for samme fejltype. Udvidelsen er
nu implementeret lokalt som ovenfor, men endnu ikke udført på originalpakken.
Lyngbyårsagen er afgrænset til reproduceret memory uden tilstrækkelig kausal
kildejoin. Mistanke må ikke blive automatisk model-/pil-/geometrirettelse.
