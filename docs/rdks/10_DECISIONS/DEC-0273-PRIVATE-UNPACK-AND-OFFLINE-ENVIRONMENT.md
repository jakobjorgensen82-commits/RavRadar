# DEC-0273 – Bevar udpakningens primærfejl og begræns tre offlinemiljøer

**Status:** Lokal4.0.526-kandidat; måltests bestået, exact-head CI og levering afventer.
**Dato:** 2026-10-01.

## Afgrænsning

Ejeren ønsker fortsat konkret revision efter analyse → rettelse → måltest →
produktion → effektkontrol. To små, allerede reproducerede519-deltaer leveres
separat fra klar525. Ingen ny generisk executor/testinfrastruktur, privatrekonstruktion,
workflowgate, normal sessionoptin eller modelændring.

Unpack åbnede sin inputfil før stage-mkdir uden for try/finally. En eksisterende
modtagermappe kunne derfor lække filhandle. De to efterfølgende close-operationer
kunne også skjule en tidligere format-, læse- eller skrivefejl. Outputstien
opløses nu før åbning; mkdir er dækket af ejerskabets try/finally. Begge ejede
handles forsøges lukket, og den første fejl bevares. Close-only fejler fortsat
hårdt. En rigtig close-fejl beviser ikke, at OS-handle er lukket. Delvis stage
er ikke en succesfuld installation; callerens oprydning/repairautoritet er uændret.

Tre faste offlinekald får copernicusOfflineEnvironment: packens CP-storage-
inventory, CP-progressunion og current-donor-union. Profilen læser kun PATH,
temp-/OS-/locale-/timezone-/biblioteksfelter og sætter PYTHONUTF8=1. Det eksisterende
valg af Python/venv, argumenter, cwd, tidsbudget og invocation bevares. Den
kopierer ikke parentens master-/provider-/GitHub-/Supabase-nøgler og ændrer ikke
forældremiljøet. Det er IKKE filsystem/home/config-, netværks- eller procesisolering.
Windows/libuv kan tilføje OS-felter. Timeout/descendant-stop/cleanup-ejerskab
er fortsat åbne og må ikke kaldes løst af denne profil.

## Forkastet udvidelse og bevarede kontrakter

En lokal prototype brugte også profilen i copernicus-component-index, som
indgår i den frosne modelclosure. Modelkontrollen afviste korrekt denne ændring.
Den blev trukket helt tilbage; ingen modelbundle eller modelhash blev opdateret.
Modulets offline authority og onlineleverandørens miljø er derfor uændrede.
Ingen påstand om at alle CP-children er isoleret eller om konstateret nøglelækage.

Crypto, persisted inventory, pakkeformat/lofter, DMI-først/CP før OM/96h,
PUBLIC-admission, rådata, geometri, RavScore og efterdatagates bevares.
De særskilt afviste admission-/donoropgaver genåbnes ikke. SOURCE og stor519s
proof/session/capture/pin/HKDF/Node-tail/driver følger ikke med.

## Eksisterende måltests og evidens

Handlefejlen blev først reproduceret i519: fem fejlgrene plus parent var røde;
source-close-only var allerede hård. En indledende Windows-realpath-fejl i
selve testen blev rettet før den egentlige RED. Seks subcases i eksisterende
packtest bruger kunstig pack, mock af egne reelle handles og faktisk lukning
før syntetisk closefejl: mkdir, format, read, write, destination-close og
source-close. Originale packbytes og eksisterende destination bevares.

Miljøtesten bruger kunstige værdier, en master-key-getter der ikke må læses,
selvstændig kopi og faktisk Python-child med kun boolean/UTF8 i stdout.
Ingen private miljøværdier vises. Faktisk kunstig CP-originalpack, krypteret
gemning/gendannelse og union dækkes af de eksisterende fire testfiler.
I519 bestod75/75 efter afgrænsning; det er ikke75 nye cases eller en ny
national prognose. Current-donor-CLI's separate --help kontrollerer kun
imports/parser, ikke ny per-row-donorunion.

Kun de små runtimeændringer og regressioner er overført til526. Isoleret kommando:
node --test scripts/test-copernicus-component-index.mjs scripts/test-private-weather-component-pack.mjs scripts/test-weather-component-progress-cache.mjs scripts/test-weather-component-progress-workflow.mjs
med eksisterende bundled Python bestod49/49,0fail/skip,25935,997ms.
Forskellen fra519 skyldes de udeladte store opt-ins, ikke fjernede tests.
Ingen fuld lokal source-CI, privat audit, leverandørkørsel eller kapacitetsmåling.

Efter versionsløft består særskilt docs/security/modelversion5/5 på300,0612ms
og browser/releasekontrakt3/3 på1152,9694ms, begge uden skips. Ikke én57-case-
matrix. Første docs-kommando nævnte også et ikke-eksisterende public-release-
testnavn; kun de fem rapporterede filer tæller. Den korrekte eksisterende
release-contract-metadata indgår i den efterfølgende3/3-kommando.
RDKS526/14chatkilder,404håndbogskapitler, model67/c557f91a…/otte bindinger
og versionskontrol består. Geodata er både byte- og objektkontrolleret kun
topversion;61 browserfiler ændrer kun versionshenvisninger. SQL er LF-identisk
uden for håndbogspayload; ingen installation. Frozen CP-authority og persisted
fileinventarer er uændrede. Den lille sourcegate består for101browserfiler.
Første sandboxforsøg kunne ikke starte sine Node-children (statusnull/EPERM);
samme uændrede kontrol bestod med nødvendig procesadgang. Ingen runtimelempelse.
Sourceplan47 er uændret. Et broad-stage-forsøg blev afvist før udførelse;
den faktiske release-sti blev read-only genbekræftet før eksplicit filstaging.

## Levering

525/PR493 er uændret exact-head-grøn5e08d5c5/36902939580/sourceproof11182851853.
526 forberedes ovenpå i egen branch og kan få kilde-CI som stacket PR.
Den må ikke merges til525-grenen. Afslut først ordinary36896697919 på
uændret524/main07e4ef4c og vurder faktisk save/upload/no-loss/artifact/private/
CAS/R2/Pages. Lever525 efter DEC-0148. Retarget derefter526 til main og
verificér præcis head, base, indhold og relevante gates før sikker release.
Aktiv cron og vejrhentning må ikke overlappes af mainændring.
Færdig lokal test er ikke levering eller målt fejlvejsvirkning i produktion.
