# DEC-0270 – Saml afgrænsede cache- og replayrettelser til faktisk drift

**Status:** Lokal 4.0.523-kandidat med beståede måltests; exact-head CI og produktionseffekt afventer.
**Dato:** 2026-10-01.

## Ejerens arbejdsrækkefølge

Ejeren ønsker analyse → rettelse → målrettet test → sikker release →
almindelig vejrkørsel → kontrol af faktisk effekt. Fremtidige forbedringer
skal fortsætte, og flere færdige rettelser må samles. Gentagne næsten ens
kontroller og nye generelle testrammer er ikke et mål. Eksisterende analyser
og tests genbruges; dataintegritet, exact-head source-CI og hvert artifacts
fulde efterdatagates består.

Brug den valgte Astra/Ultra til de vanskeligste resterende beslutninger om
dataintegritet og integration først. Når dette arbejde er afklaret, anbefales
skift til Astra Ekstra høj og derefter Sol Ekstra høj til passende resterende
arbejde. Ultra skal ikke fortsætte alene for ventetid, versionsmekanik eller
rutinekontrol. Ingen automatisk ændring af brugerens model eller abonnement.

## Produktionsgrundlag og isolation

4.0.522/PR490 er merged som `1d5a64d18afc34d3ebeca343ffa75074145cd30d`
efter grøn exact-head source-CI `36842745760`. Ordinary run `36843972587`
bestod kl. 14.39 dansk: no-loss, 54/54 artifact- og 3/3 releasekontroller,
privat pakke, CAS, R2 og Pages. Offentlig 4.0.522 blev målt med dataset
`rr-20261001112708-210`, target 09 UTC, 210 zoner og 673 dele. H0 havde
673 direkte verificerede strømvalg; historikkontrollen havde 673 continued
og ingen cold restart, men 420 zone/mode-kombinationer var stadig incomplete.
Dette er ikke en komplet cache, alle 118 timers dækning eller langtidsstabilitet.

Ny ordinary `36865862773` kører på samme uændrede main. Ingen merge eller
mainændring, ekstra dispatch eller cronstart må overlappe denne kørsel.
Cron 8348098 er pauset. 4.0.523 samles alene i `weather-restart-release`;
den store lokale 4.0.519-revision bevares særskilt.

**Ny ejerinstruktion under færdiggørelsen:** Når denne rettelsespakke er
sikkert publiceret og kontrolleret, skal cron 8348098 aktiveres, så normal
cacheopbygning fortsætter automatisk. Codex må pause den igen ved konkret
fejl eller nødvendigt releasearbejde. Dette erstatter ubestemt pause som
standard, men tillader ikke overlap, blind start før pakken eller gateomgåelse.
Komplet cache/langtidsstabilitet er ikke et ekstra krav for genaktivering.

## Fem afgrænsede rettelsesgrænser

1. **Historisk kildeprioritet.** Den eksisterende normale replayselektor
   skal bruge den allerede godkendte prioritet på selvstændigt gyldige
   DMI-, CP-, regionale og OM-kilder. Direkte native DMI må ikke behandles
   som regional reserve alene på leverandørnavnet. Faktisk tidligere valg
   adskilles fra tilfældig rækkefølge blandt peers. Samme reserveleverandør
   kræver sammenligneligt, responsbundet modelbevis for en nyere revision;
   ellers forbliver ubeskyttet tvetydighed synlig for streng replay.
   Den centrale 96-timersregel, låst model og begge kandidaters admission
   bevares. Ingen bredere PUBLIC-admission eller Feggesund-proxyhistorik.
2. **Arkivets strengkapacitet.** Eksisterende envelope-bytepolitik skal
   kontrolleres før store base64-, UTF-8- og JSON-strengallokeringer, også
   mod den aktuelle Nodes faktiske strenggrænse. Arkivformat, råfil- og
   transportlofter hæves ikke. Tidlig sikker afvisning er ikke større
   national kapacitet eller tilladelse til at beskære gyldige data.
3. **Fejl efter installeret progress.** En vellykket filinstallation
   efterfulgt af baseline- eller oprydningsfejl må ikke kaldes almindeligt
   cache-miss. Den kræver beskyttet reparation og hårdt stop via den
   eksisterende CLI/workflowkontrakt. Tidligere alvorlig rollback-/unionfejl
   bevares også ved efterfølgende oprydningsfejl. Den normale 4.0.522-
   kryptografi, unpack/merge og format beholdes; ingen helperrefaktor,
   nøgletransport eller nye sessionopt-ins indføres som sideeffekt.
4. **Redundant prognosespænd i UI.** Ejeren melder, at teksten stadig
   vises, selv om flaget har fået farve. 4.0.511 rettede detaljevisningen,
   men den separate `scoreQualityMarker` i `app.js` manglede samme
   upper>lower-kontrol. Rangliste og landsprognose skal også udelade
   fx »muligt spænd 92–92«. Det eksisterende krav om at bevare reelt
   71–78 og flagfarven består. Ingen score-, interval- eller modelberegning
   ændres; den faktiske renderer dækkes af den eksisterende UI-måltest.
5. **DMI-først før historisk strømprioritering.** Den eksisterende live-merger
   kan lade en tidligere beregnet operationel reserve overskrive en senere
   selvstændigt verificeret DMI-række, selv med gyldig primary-callback.
   En lille wrapper genbruger de eksisterende validatorer og den centrale
   96h-regel på begge kandidater før historisk replayselektion. Rettelsen
   gælder kun de to eksisterende replay-callers; ellers har den senere
   prioritering mistet DMI-kandidaten allerede før sit valg. Den ændrer kun
   strøm, ikke closure-rækker, hashes eller de øvrige fire vejrtyper.
   PUBLICs oprindelige merger og sanitizer bevares byte-identisk.
   Replay får kun sine allerede tilladte originale/aktive kontekster.
   Ingen bank, capture, session,
   resolver-capability eller bredere PUBLIC-admission indføres.

Konkret review af en første bredere prototype fandt, at gyldig aktiv header
ikke beviser en matchende native-række i det aktive artifact. PUBLIC-retention
kunne derfor fortrænge gyldig reserve med en donor, som senere afvises af
artifactkontrollen. PUBLIC-delen blev taget ud før release; der indføres ikke
en ny parallel native-validator for at få den med. Native-bindingen er fortsat
et særskilt arbejde, ikke løst af de to replay-callers.

Den bredere lokale builderdefault er udtrykkeligt ikke udtaget: den påvirker
alle fem familier og kan beskytte en strømkandidat før strengere aktiv
PUBLIC-admission. Denne afhængighed kræver separat afklaring; den skjules
ikke ved at kopiere hele hunken eller lempe en validator. Øvrige opt-ins
uden normalcaller bliver i den store revision.

Kun implementerede og måltestede dele må indgå i det endelige PR-head.
En fundet kombinationsregression i den store lokale helpersamling er ikke
grund til at kopiere hele denne samling; den smalle normale sti repareres.

## Kontrol og afgrænsning

Genbrug eksisterende replay-, private-runtime- og progress-testfiler.
Måltests køres på berørte kontrakter; fuld source-CI én gang på PR'ens
eksakte head. Version, RDKS, begge håndbøger, uændret modelbundle og
versions-only-geodata skal kontrolleres. SQL-filen synkroniseres alene
som lokal håndbogskopi; ingen SQL-installation.

Næste sikre release følger efter aktivt runs afslutning og vurdering.
Faktisk cache-save kræver saved:true og ny upload, ikke blot grøn runstatus.
En ny completed baseline må ikke tvinges sammen med en cipher bundet til
en ældre baseline. No-loss, artifact, privat publish/CAS/R2/Pages består.
Effekten af hver rettelse rapporteres efter faktisk evidens; fravær af
udløsende tilfælde er ikke bevis for, at den konkrete fejlvej er afprøvet.

SOURCE, proofbank/session/capture/pin/HKDF/Node-tail og den større lokale
PUBLIC-ændring er ikke del af denne release. Den særskilt sikkerhedsafviste
admission-workflowgate afventer sit konkrete svar. Ingen ny privat audit,
gentagelse af audit 36749250698, modelændring, generisk executor eller
ændring af den uklare 72h-policy følger af denne beslutning.

## Faktisk lokal evidens

Separate kommandoer, ikke én samlet matrix: replaytest PASS (2,64 s);
privat arkivtest 1/1 PASS (4,403 s); root progress/workflow 26/26 PASS
(26,166 s); UI-test 1/1 PASS (0,146 s); root versions-/dokumentations-/
sikkerheds-/faktisk replaycaller-kontrol 7/7 PASS (1,190 s). Ingen skips
eller annulleringer. UI-testens første forsøg stoppede på gamle 4.0.511-
imports og separate i18n-modulinstanser, før de nye assertions. Kun testens
imports blev gjort versionsfølgende; runtimeoversættelser blev ikke lempet.
UI-testen kobles én gang i den eksisterende sourcegruppe; 47 grupper består.

Et uafhængigt afgrænset kildereview fandt ingen konkrete blockers i
replay-/arkivdeltaerne. Root kontrollerede den smalle restore- og UI-delta.
Modelbundle er uændret, 67 filer og otte bindinger. Den lokale Node24-
evidens er ikke Linux/Node22-CI, national kapacitet eller produktionsmåling.
Ingen bred lokal validate:source-genkørsel er udført; PR-head skal gennem
den fulde eksisterende GitHub-kildegate før merge.

Femte replay-only-målkommando `node scripts/test-protected-live-current-assembly.mjs`
bestod på 0,947 s. Den bruger de faktiske to producentcallers, prioritering og
streng replay med kunstige forseglede kilder. Eksisterende negatives bevares;
96h, ugyldige kilder, OM/regional/hold samt uændret PUBLIC/spatial-kontrol dækkes.
Første forsøg stoppede på en testfixture med en ekstra legitim fremtidstime,
som gjorde forventet supplementantal forkert. Fixturen blev afgrænset til H0;
runtime blev ikke lempet. Et uafhængigt review af de frosne fire filer fandt
ingen konkret blocker. Den bredere PUBLIC-idé er udtrykkeligt udeladt.

En utilsigtet udeladelse af den eksisterende bounded-conditions-predecessor-
gate i et forslag til testlisten blev sikkerhedsafvist før skrivning. Root
bekræftede uændrede bytes og tilføjede derefter kun den nye test; samtlige
gamle gates er bevaret. Ingen test fjernes eller svækkes.
