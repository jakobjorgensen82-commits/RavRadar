# DEC-0283 – Bevar den normale DMI-readers første fejl

**Dato:** 2026-10-02. **Status:** Lokal 4.0.536-kandidat; exact-head CI og produktion afventer.

## Faktisk caller og mindste ændring

Ejeren kræver først levering af alle allerede klargjorte rettelser, derefter
én almindelig vejrhentning, aktivering af eksisterende cron og genoptagelse
af hele revisionen.533/534/535 er nu faktisk leveret; den ordre er ikke et
krav om at vente på fremtidige536-rettelser før vejrhentning eller cron.

`verified-dmi-progress-inputs.mjs` bruger `inspectDmiForecastFile` til de
eksisterende normale cache-/progressfiler og `readDmiForecastRecord` til
baseline/kandidatposter. Fuld filreader og postvis writer bruger de samme
funktioner. Begge ejer netop deres eget åbne handle. En fejl fra parser,
readback eller hash/stat-kontrol kan blive erstattet af en samtidig
`handle.close()`-fejl i `finally`. BIG519 reproducerede dette i de faktiske
funktioner: to primærfejlscenarier røde, to close-only-scenarier grønne.
Den tidligere RED genbruges; ingen gentagelse eller produktionsfejl gættet.

536 tilføjer kun en lokal fejlmarkør, catch/rethrow og betinget videreførsel
af close-fejl i de to normale funktioner. Eget handle forsøges altid lukket.
Primærfejlen bevares uændret, også når close fejler. Hvis close er den eneste
fejl, afvises operationen fortsat hårdt; ingen delvis succes returneres.
Ingen ny helper/API, parser, hash/statregel, filgrænse, forecastformat eller
trusted-source-/autentificeringsregel. Descriptor-/OFF-stack fra519 følger
IKKE med. Det er ikke bevis for afsluttet cleanup, writer-eksklusivitet,
killpersistens, runner-tab eller national kapacitet.

## Måltests og bevarede kontrakter

De to allerede eksisterende BIG-testparents flyttes alene til den normale
release-suite: inspect/record med samtidig primær-/close-fejl samt close-only.
Alle tidligere syv releaseparents beholdes. Isoleret normal-suite536:
12PASS/0FAIL/1 eksisterende optionalcapacitySKIP,1225.5367ms.13 er Node's
parent/subtest-enheder, ikke13 unikke topniveau-cases. Ingen ny skip eller
kapacitetsvalidering. BIG20PASS/1skip indeholder flere OFF-descriptorprøver
og er ikke536s matrix. Eksisterende sourcegruppe bevares uden duplikering.

Faktisk normal progresscaller-suite er særskilt prøvet:14PASS/0FAIL/
1 eksisterende real-size-capacitySKIP,1324.8019ms; ingen ny skip. Den
bevarer fem atomiske tuples, gammel gyldig data ved nye huller, beskyttet
kontinuitet/cursor, afviste forkerte punkter/beviser og faktisk krypteret
progress-restore/rollback. Disse15 er ikke samme13reader-enheder.
Særskilt docs/privacy/modelversion/code-only/sourceplan5/5PASS279.7701ms,
0skip. RDKS536/14chat/414kapitler, model67/3a14/otte bindinger, source47,
releaseversion og lille sourcegate102browserfiler/deploykontrakt består.
Bevaringsscript viser to eksakte normalreader-deltaer, de to genbrugte
testparents og alle gamle tests uændrede,65browserfiler/2workflows kun
version, geodata kun topversion, normalCP/komponentworker/model/migrationer
urørte. SQL uden eksakt håndbogspayload har uændret LF-SHA256
154c3443752d840124f4caed95663e8a2c5bea346302e4dc6231a13f8ff62325.
Ingen ny lokal fuld source-/nationalkapacitetsmatrix.

Fysisk score, handicap, rangering, Top20-grænse og pc1–10/11–20/mobil1–20,
model67/3a14/otte bindinger/fysisk kontrakta226, sourcepriority DMI→CP→OM,
budgetter, cronplan og geometri er urørte.008/00945 er anvendt/immutable;
ingen migration eller standaloneSQL. Browser/workflow/geodata må kun få
eksisterende mekaniske releaseversioner. Særskilt diff skal bevise grænserne.

## Faktisk levering og ny drift – samtaledelta

533codeonly37004530145,534codeonly37006767489 og535codeonly37008318988 er
SUCCESS efter exact-head CI, fornyede writer/head/base/proof-kontroller og
tom contentdiff.535deploy110844312556 afsluttede14:51:53DK på main
c52e0bc64ec2032e5f282408fc7c4f569c4e3305 med Pages/exact210673/main/
disposition/reseal/terminal. Historisk vedligeholdelse var SKIPPED, ikkePASS.
Offentlig4.0.535 bevarer rr-20261002104907-210/reference09Z/generated
10:49:07.805Z/210zoner/673dele/complete:true. Faktisk offentlig20/day,
fem2–6Oct-datoer og begge modes er kontrolleret.534 faktisk pc og375CSS
publiciframe beviser ønsket kolonnerækkefølge og intet overløb; ikke fysisk
telefon eller en ny fuld210/673-browseraudit. Previewtab/helper er lukket.

Præcis én ejerbestilt ordinary37009507544 startede14:54:06DK på uændret
mainc52e0bc6 efter renewedwriters0 og præcis tre gamlequeued/jobs0.
quick_confirmation=false, quick_progress_source udeladt/defaulttom,
normalbudgetter. Reentry/terminal/exactmain-currentUTC bestod;15:00metadata
viser DMI78/build110845885763 aktiv fra14:59:25 uden fejlet trin. Dette er
ikke faktisk restore/save/upload/deploybevis. Ingen ny vejrhentning eller
main/merge/kode-only under aktivt weather.536 må kun forberedes/kildeprøves.

Cron8348098 blev derefter genaktiveret via sammeChrome3. Kun Aktivér job/Gem;
fuld serverjoblistreload viser næste18:19DK, ikke Inaktiv. Samme19 */4 * * *UTC,
watch-missed-weather-schedule.yml/refmain/external_watchdog=true/payload/
credentials. Ingen ekstra aktiveringskrav om komplet cache eller revision.
Dokumenteret browsercrop ved375 ændrede ikke innerWidth og tæller ikke som
mobilbevis; den faktiske375CSSpubliciframe var særskilt. Viewport er nulstillet.

## Sammenlignelig dækning og historik

Ejeren kræver samme måling fremover. Hash-/bytes-/datasetbundet PUBLIC
14:24:26DK med uændret `hasValue` giver365481/397070=92.0444758%:
673dele×118timer×fem vejrfamilier.1Oct tilsvarende358366/397070=90.2526003%,
ændring+1.7918755 procentpoint. Vind90.16%,bølge100%,strøm98.17%,vandstand
85.25%,vandtemperatur86.64%. Det er numeriske prognosefelter, ikke observerede
stationsmålinger, privat historik eller nativeproviderdækning. Brugbar score
90.6174% er en anden nævner og må ikke erstatte dette tal. Rullende tidsvinduer
er forskellige, så forbedringen er ikke et kausalt retentionbevis. Hele1.3GB
er målt én gang til denne konkrete sammenligning og må ikke genhentes uændret.

Alle210 zoner har fortsat bølgehistorikadvarsel. Eksisterende strøm48h og
bølge288h=12d starter efter SIDSTE ukendte hul; et nyt hul genåbner forløbet.
Private lastUnknownAt/alder/genåbninger er ikke målt, så ingen kalenderdato
for komplet historik kan loves. Fremtidig FULL_HISTORY er modelprojektion,
ikke observeret historik. Nibe har nu91/118 brugbare timer i begge modes:
66incomplete+25full+27unavailable, utilgængelig fra04Z6Oct. Faktisk14DKpart-
strøm er numerisk. Den gamle88/118 var et andet vindue; upstreamårsag er åben.
Lyngbys pilposition bruges ikke i score; fælles kildeproblem/marinemaske er
ikke uafhængigt afklaret. Ingen punkt-, pil- eller scoreændring.

## Fortsat åbent og særskilte afvisninger

Fuld originalB/originalS-GCM/pin/sammeHKDF/faktiskfactory/awaitedupdater med
fire kunstige dele afvises stadig ved uændret673H0. Ikke fullCP/S-før-T.
Writer/kill/failure4min/runner/nationalkapacitet er åbne/OFF; ingen hel519kopi,
fakefactory, gatelempelse, modelkopi/eval eller dyr nationalførstegenerering.
Normalprogresssave ligger før bundlecreate, prior fjernes kun efter create;
ingen ny B-lifetimeregression er påvist. Andre opt-in readers er særskilt åbne.

Raw privat GitHub-joblog forbliver afvist også efterfilter/faste kodegodkendelse;
ingen browser/transport/endpointomvej. Separat11:08admissiongate-afvisning,
historiskdonor-read/FeggesundPROXY-forbud og SOURCEallassets-tilbagetrækning
består. Gamle diagnostics/sessiongodkendelser er afsluttede. Unknownchildstop
spærrer alle ydre cleanup; B/AAD-S/T og S-før-T må ikke ommærkes. Ingen blind
capraise/pruning/nøgler/planer/standaloneSQL. Adminlogin-afklaring gentages ikke.
536 kræver ny exact-head CI og sikker DEC0148-levering først efter faktisk
weathercompletion/resultatkontrol. GPT-6.1Sol/Ekstra høj forbliver valgt.
