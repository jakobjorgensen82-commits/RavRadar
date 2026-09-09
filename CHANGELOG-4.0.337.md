# RavRadar 4.0.337 – tabsfri vejrcache og kontrolleret direkte modelcutover

Dato: 2026-09-09

## Ændret

- DMI Pythonbinding, native library og definitions er fastlåst til den gennemgåede runtime.
- Kompatible currentproofs fra 2.48.0/2.48.2 kan genbruges uden relabel; rå GRIB-/processed-step-reuse kræver fortsat eksakt signatur.
- Ét ugyldigt retained proof fjerner kun den konkrete proof-enhed.
- Current, bølger, vind, vandstand og temperatur donorbackfilles alene som komplette atomisk validerede tuples.
- DMI-bulkdokumentet bruger en fælles tabsfri tre-tabellers codec i Python og Node. Unknown, Unicode, nested og proto-navne bevares, input muteres ikke, og validering sker før ekspansion.
- Oneoff-wrapperens afsluttende progresskontrol læser også gennem codec'en; den kan derfor fortsætte på den kompakte cache i stedet for fejlagtigt at afvise den efter en vellykket producentpassering.
- Slutgennemgangen fandt en separat legacy-blocker: den bevarede 760 MB-cache kunne blive afvist af det nye 256 MiB-loft, før codec'en fik mulighed for at komprimere den. Pilot, normal vedligeholdelse, oneoff og betinget punktaktivering materialiserer derfor først en afgrænset legacyfil til et separat atomisk output og lader derefter de uændrede strenge READY-, provenance- og registerlæsere kontrollere den. En overstor allerede kodet fil afvises fortsat, og kildefilen røres ikke ved fejl.
- Private preflight- og size-dryrun-beviser bindes til den faktiske DMI-kandidat.
- Første integrerede cutover kan bruge den fastlåste offentlige legacy Candidate G direkte og viser ufuldstændig historik ærligt.
- Legacy first cutover kræver et konkret succesfuldt komplet oneoff-run og den eksakte forseglede cache.
- Releasegaten og DMI/WAM-integrationskontrakten følger refaktoreringen: first-cutover-restoren kontrolleres med den snævre legacy-undtagelse, mens READY-læsning og den atomiske DMI-write attesteres gennem den fælles codec-aware validering frem for rå JSON-markører.
- Den fulde 210/673-public-runtime-test bygger kun det store payload én gang; alderstilstande prøves på manifestkopier med uændrede assertions, så kildegaten ikke løber tør for Node-hukommelse.
- Den nationale 210/673-runtimeaudit ændrer ét Feggesund-proof med copy-on-write i stedet for at deep-clone hele den private runtime; samme positive og negative audits består nu under Nodes normale lokale heaploft.

## Ejerens snævre launchundtagelse

Kun 4.0.337-first-cutover må fortsætte, når det målte private archive højst er 50.000.000 bytes, to retained generationer holder lagerbudgettet, checkpointet holder sit loft, og alle integrity-, privacy- og readbackgates består. Den generelle egressfremskrivning ændres ikke, og undtagelsen tillader ikke tilbagevendende automatisk kadence.

Den afsluttende helikopterkontrol fjernede samtidig en modstridende legacy-betingelse i oneoff-gaten: månedsfremskrivningen skal stadig beregnes og stemme internt, men dens forventede røde resultat må ikke længere blokere netop denne afgrænsede engangsundtagelse.

## Åbent før normal højfrekvent drift

Cachetransporten bygges parallelt uden nulstilling, køres i shadow, sammenlignes logisk og kryptografisk, skifter pegepind atomisk og bevarer rollback. Normal højfrekvent cron/watchdog må først aktiveres efter positivt drift- og budgetbevis.

## Status

Den tidligere lokale målmatrix er grøn. Den eksakte codec i commit `bce970af` bestod read-only produktionsskala-jobbet `34288231609` på 760.487.472 inputbyte og 578.063 sourceposter: 94.150.151 encoded byte, identisk logisk hash/count, uændret input og efterfølgende Node-validering. Basecommitten er pushet; den afsluttende legacy-normalisering, dens kontrakttests og dokumentationssynk er fortsat lokale og kræver en ny samlet slutgate. Den separate historiske Open-Meteo-overlapprobe i diagnose-runnet fejlede fortsat og er ikke codecbevis. GitHub exact-head sourcegate, merge, komplet main-oneoff, fulde produktionsgates og offentlig integreret modelcutover mangler.
