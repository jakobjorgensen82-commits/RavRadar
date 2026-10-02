# DEC-0281 – Top20 læses nedad i hver pc-kolonne

**Dato:** 2026-10-02. **Status:** Afgrænset 4.0.534-kandidat; ikke leveret.

## Ny ejerpræcisering

Ejeren godkendte to kolonner, men ønsker nr.1–10 nedad i venstre kolonne
og nr.11–20 nedad i højre. Mobil skal fortsat have én liste fra1 til20.
Dette erstatter den tidligere tværgående visningsrækkefølge, ikke rangeringen.
Top20 og hele vejrhentningsrevisionen skal fortsætte samtidigt.

## Mindste ændring og bevaringsgrænse

Den faktiske renderNationalForecast sætter kun sit antal pc-gridrækker til
min(10,antal resultater), mindst1 for tomtilstanden. Eksisterende min-width880px
regel får column-flow og dette antal rækker. DOM-/tabulator-/skærmlæserorden
forbliver1–20. Smal skærm bruger fortsat standardens én kolonne/row-flow.
Gamle autentificerede fem bliver fem venstrestillede rækker uden ekstra tomme
gridrækker; delvise lister fordeles efter samme ti-rækkers grænse.

Ingen score, handicap, sammenligningsfunktion, producent, datoer, søgemåder,
historik, kort, model67/3a14, otte bindinger, migration, cap eller workflowgate
ændres. Ingen frossen rehash, opdigtede rækker eller privat datahentning.

## Målrettet evidens

Eksisterende faktisk-rendererprøve var RED på manglende gridrækkeantal før
ændringen. Den genbrugte prøve bevarer fallback20/sortering/femdage og tester
nu også gemt5 og beach med0/1/11/20 rækker. Broad-ranking-regression bevares.
Den første nye prepared-fixture manglede hasNumber; kun testmiljøets eksisterende
dependency blev tilføjet, ingen runtimelempelse.

Samme Chrome3 med eksisterende kunstigt preview/faktisk renderer og CSS:
pc1249CSS dokumentbredde, nr.1–10 x32.667 og nr.11–20 x628.667;1 og11 samme y,
rangorden bevares. Tab fra10 går til11.375CSS-iframe/document360 viser én
nedadgående20-liste uden vandret overløb, også tysk tekst og lange navne.
Anonymt lokalt zonevalg11 gav z15, femte dag blev valgt, begge søgemåder
bevarede20; gamle5 gav faktisk fem gridrækker. Engelsk sprog blev aflæst.
Iframe-Playwright-clicks gav ingen effekt; samme browsers friske AX-knapper
gav faktisk efterkontrol. Ingen anden browser/transport/policy eller credentials.
Det er lokal kunstig layoutkontrol, ikke fysisk telefon/fuld app/offentlig effekt.
Previewfaner og loopbackprocessen er lukket; ingen viewportoverride blev sat.

Isoleret målkommando3/3PASS208.5878ms/0skip (renderer, broad-ranking,
moduleversion); tidligere2/2 overlapper og tæller ikke som nye unikke cases.
Særskilt docs/security/modelversion/code-only4/4PASS243.5314ms/0skip.
RDKS534/14chat/412håndbogsafsnit og releaseversion består; sourcegate102
browserfiler og relevante efterdatagates er intakte. Model67/3a14 og otte
bindinger blev kun kontrolleret, ikke regenereret. Særskilt diff beviser
geodataONLYtopversion,64browserfiler/2workflowsONLYversion og kun én ekstra
browser-layoutlinje/CSSregel. SQLudenfor præcis håndbogspayload har uændret
LFhash154c3443752d840124f4caed95663e8a2c5bea346302e4dc6231a13f8ff62325;
anvendte migrationer og begge CPcallers er urørte. Ingen fuld lokal sourcegentagelse.

## Sikker leveringsrækkefølge

533/PR501/head791aeffc er exact-head-grøn med CI36989653512/proof11219467236;
urørt og skal leveres først.534 bygger separat på samme533head, ikke på dirty519.
Den ene ejerbestilte ordinary36988295501 kører stadig på offentlig532/main
ccc5a7c1. Ingen merge/mainændring/kode-only mens den er aktiv. Efter faktisk
resultatkontrol leveres533, derefter retargetes534 til main og head/base/indhold/
exact-headCI/proof/writers genkontrolleres før DEC0148 og offentlig pc/mobilkontrol.
Cron8348098/14:19DK er uændret.534 exact-headCI og offentlig levering er åbne.
Stor519/OFF/fullCP-S-T/writer/kill/failure4min/runner/nationalkapacitet er ikke
færdiggjort af denne visningsrettelse. Alle særskilte afvisninger består.
