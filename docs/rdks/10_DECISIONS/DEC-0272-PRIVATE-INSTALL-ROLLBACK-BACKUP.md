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
