# DEC-0275 – Kortfeltets størrelse og top20 uden ny scoremodel

**Status:** Kortfixet er afgrænset i isoleret 4.0.528-kandidat; top20 er bevaret separat. Exact-head CI og produktion afventer.
**Dato:** 2026-10-01.

## Tillæg 2. oktober: lever det uafhængige kortfix først

528 indeholder nu kun kortcontainerens observer og dens regressioner samt
versions-/dokumentationssynkronisering. Producentlimit, browserlimit,
top20-overskrift og kolonnelayout er tilbageholdt i en separat lokal patch.
Begge stier viser igen top5. Scoremodel og den eksisterende67-filers binding
c557f91a… er faktisk kontrolleret uændret, uden hashregen eller gatelempelse.
Alle gamle gates og de allerede tilføjede tre måltests er bevaret; de to
prognoseregressioner beviser nu netop uændret top5/femdage efter afgrænsningen.
Tre målkommandoer består3/3/374.3671ms uden skips. Ikke en ny fuld kildegate.

Top20-ordren består; de følgende top20-afsnit dokumenterer det særskilte
lokale design og de tidligere målprøver, IKKE runtime i528. Teknisk rebinding
afklares senere imod ejerens krav om urørt scoremodel. Ingen privat sealed
runtime ommærkes, og ingen national detaljepakke hentes som UI-genvej.
Kortfixet kræver egen exact-head CI og faktisk offentlig kontrol efter527.

Ejeren har samtidig bestilt faktisk ravradar.dk-opsætning via browser og
kontinuerlig revision/drift. Domænet er Verified hos GitHub via én Simply-
TXT-record; endnu ingen Pages-routing/HTTPS-cutover. Intet webhotel/tilkøb.
Eksisterende heartbeat er opdateret; ingen ændring af cron-cadence/model.
Ingen mainændring under ordinary36920739569, som fortsætter beregningen.

## Ejerens ordre og uændrede grænser

Ejeren viste et kort med tom bund og bad derefter konkret om top20 i
5-dages RavRadar, kompatibelt med pc og mobil. Scoremodellen skal ikke røres.
Den første top20-besked var kun et spørgsmål; implementering begyndte først
efter den efterfølgende udtrykkelige ordre. Fem dage, begge søgemåder,
scoretal, handicap, tidsvalg, sortering og historikadvarsler bevares.
Den separate aktuelle liste Bedste områder er fortsat top5.

## Kortfejl: faktisk årsag og lille rettelse

En frisk Chrome-indlæsning af offentlig526 reproducerede et felt, som voksede
fra390 til653px efter ranglisten var hentet. Leaflets SVG blev på468px
(390 med bibliotekets padding), og indlæste fliser nåede kun484px fra toppen.
Window-resize alene registrerer ikke denne ændring af selve kortfeltet.

Den faktiske createMap observerer nu sin egen container med ResizeObserver.
Gentagne beskeder samles i én animationframe. Positive feltmål udløser
Leaflets invalidateSize med pan:true/animate:false, så biblioteket fastholder
det projicerede centrum uden animation eller ny fitBounds. Leaflets normale
pixelafrunding består; eksakt uændrede geografiske decimaler påstås ikke.
Et første lokalt pan:false-forsøg udfyldte feltet, men flyttede centrum ved
højdeforøgelse; dette blev forkastet før release. Unload afkobler observer
og ventende frame. Uden ResizeObserver bevares Leaflets window-resize.
CSS-feltets højde, geometri, zoner, pileregler og score ændres ikke af fixet.

## Top20 og kompatibilitet

**Uafklaret releasegrænse:** Den afsluttende rækkelimit ligger i
`scripts/public-conditions-lib.mjs`, som indgår i den frosne 67-filers
implementeringsbundle. Selv ændringen fra5 til20 giver korrekt STALE i
modelkontrollen. Ingen scoreformel, comparator, parametre eller state-logik
er ændret, men uændret bundlehash kan derfor IKKE påstås for kandidaten.
Hashen er ikke regenereret, og ingen gate/entrypoint er fjernet eller lempet.
Top20 er måltestet lokalt, men ikke releaseklar. Afklar særskilt den snævre
tekniske rebinding imod ejerens udtrykkelige krav om urørt scoremodel; ellers
hold top20 tilbage og lever det uafhængige kortfix uden modelændring.

Kun den offentlige producents afsluttende truncering og browserfallbackens
rækkelimit ændres fra5 til20. Eksisterende comparator og model bruges urørt.
Datoafgrænsningen forbliver fem dage. En eksisterende gemt indeks-pakke med
fem rækker er stadig gyldig og vises uden ommærkning eller automatisk stor
detaljehentning. Tyve rækker kræver en ny almindelig vejrproduktion med528;
kode-only og gamle forseglede femrækkers indeks lover ikke tyve resultater.
Hvis færre end20 zoner har gyldige scorer, vises kun de gyldige resultater.

Pc over880px får to listekolonner i normal læserækkefølge; mobil får én.
Lange navne ombrydes i en minmax(0,1fr)-celle, mens rang og score bevares.
Liste og side scroller normalt; ingen ny indre liste-scroll eller nye
datakrav. Dansk, tysk og engelsk top20-overskrift ejes kun af appens UI og
vælger eksisterende sprog. Første forslag rettede de tre i18n-tekster;
modelcheck afviste dette, fordi i18n indgår i den frosne transitive closure.
Det forslag er helt trukket tilbage: i18n er urørt bortset fra normaliserede
versionsreferencer. Ingen modelbundle/hash blev regenereret eller gate lempet.

## Afgrænset kontrol

Den eksisterende korttest var RED uden observer. Actual createMap-factory
med kunstige browsergrænser består efter fix: vækst/krympning, nulstørrelse,
samlet frame og unload. De eksisterende zonegrænse-, pile- og flisesømtests
består. Ingen kopieret kort-/scorealgoritme eller national førstegenerering.

Eksisterende progressiv-producenttest bruger25 kunstige zoner og seks datoer:
begge søgemåder giver20 unikke sorterede rækker på fem dage, kendte gamle
top5 scorer bevares, og input er uændret. Første testforventning manglede
nulpolstring i fire zone-id'er; fixtureforventningen blev rettet, ikke runtime.
Den faktiske browserfallback er også kørt gennem25 zoner og bevarer fem dage.
Tre regressioner tilføjes til eksisterende public-hour-testgruppe; alle gamle
gates består og sourceplanen er stadig47 grupper. Én exact-head CI kræves.

En disponibel localhost-prøve serverer kun kortmodul, i18n, offentlig CSS og
den faktiske udtrukne renderer med kunstige forberedte rækker. Den er ikke
et nyt produktions-/forecastmiljø. Chrome ved1280px viser20 rækker i to
kolonner;375px viser én uden vandret sideoverløb, også med langt navn.
Dagskift og søgemåde er kontrolleret. Denne prøve er ikke national score- eller
produktionsdatakontrol. Den endelige effekt kontrolleres efter levering.

## Levering og revision

Offentlig526 og code-only36919772809 er faktisk verificeret.527/PR495 har
grøn exact-head36920238752 på276eb2b7; den må ikke ændres af528.528 stakkes
separat ovenpå527 og retargetes først til main efter sikker527-levering.
Ordinary36920739569 på526/main3b9f3212 kører; ingen merge/mainændring imens.
Cron er aktiv. Genoptaget Chrome virker efter ejerens åbning af udvidelsens
panel; dette er tidsmæssig evidens, ikke bevist policy-rodårsag.
Ejeren har valgt Sol6.1/Ekstra høj. Stor519 og særskilte afvisninger bevares.
