# DEC-0299 – Faste fejlkategorier ved privat B/S-sammenføring

**Portstatus 2026-10-30:** Beslutningsgrundlaget nedenfor beskriver den særskilte kritiske 591-kandidat under kildekvalifikation. Samme afgrænsede kontrol er forberedt i den kommende 4.0.592-kilde, som endnu ikke er offentligt leveret. Porten bevarer den allerede udstedte 592-modelbinding, den strenge ægte 591-forgængergren og alle 70 SQL-filer. Den giver ingen ny model-/versionsudstedelse eller produktionsaktivering. Faktisk conditions-entrys størrelse og det konkrete produktionsstops udløsning er fortsat ukendte.


**Dato:** 2026-10-30
**Status:** Afgrænset lokal observationskandidat; præcis kvalifikation, levering og faktisk produktionsårsag er åbne.

## Problem og dokumenteret afgrænsning

Det eksisterende kommandolinjeled kasserer den underliggende fejl og udskriver kun PRIVATE_B_S_RECONCILE_REFUSED. Denne besked beviser et afslag, men kan ikke bestemme årsagen. Den seneste almindelige vejrhentning stoppede i dette led før leverandører; dens private S-reference og konkrete fejlkategori er fortsat ukendte.

En hård 150-minuttersafvisning er falsificeret: den eksisterende klassifikation giver STALE_TARGET_VALID, og normal sammenføring med et 261 minutter gammelt target består. Den faktisk undersøgte restore meldte rollbackSelected=false og currentGenerationRejected=false; valgt CURRENT-fallback er derfor heller ikke årsagen i dette observerede led. Ingen grænse hæves og ingen historik nulstilles på disse afviste hypoteser.

## Mindste ændring

Bevar den eksisterende stoplinje og afslutning. Tilføj kun fast kind, phase, code og errorClass fra de allerede definerede trin og afslag. Den lukkede observation må ikke kopiere rå Error/message/stack, filstier, vejrdata, strømværdier, brugeridentiteter eller nøgler og må ikke aktivere getters. Ukendte værdier skal forblive ukendte.

Den oprindelige fejl genkastes. Første fejl bevares gennem oprydning og tabt svar. Alle logiske accept-/afvisningsgrene, originalkontroller, CAS, frisk genlæsning og regler om ukendt skriveudfald er uændrede. En kvittering er aldrig adgang til at fortsætte eller gentage et muligt write. Importfejl eller brat processtop før instrumenteringen kan fortsat ligge uden en ny fast kategori.

## Faktisk lokal evidens

- Én normal syntetisk B/S-prøve består både før og efter det frosne observationsblad med targetalder 261 minutter. Resultatet er ADVANCED_READBACK_PROVED, én normal checkpoint-CAS og uændret hel B; der hentes ingen private vejrpakker.
- En separat normal samme-H0-konflikt giver S_NOT_BEHIND og ASSERTION_ERROR med nul ekstra CAS-kald og uændret hel B/S. Det er API-afslaget; produktions-CLI-fasen er ikke bevist af denne prøve.
- Den faktiske nye kategori-/privacy-grænse og et normalt CLI-afslag er målprøvet. Rå markører må ikke slippe ud. En privat klargøringsfejl er bevaret særskilt og er ikke produktionsårsagen.
- Der er ikke kørt en ny bred suite, PostgreSQL eller produktion i denne dokumentationsleverance. Identiteter, hele pins og private resultater findes i checkpointet.

## Leveringsgrænse

Kandidaten er 4.0.591 med uændrede C/I/T, model-/SQL-kilder, originaler, historik, kildeprioritet, adminpunkter, geometri og scoreformel. Normal præcis kildekontrol og et sikkert skrivefrit vindue kræves før levering. Derefter følges faktisk almindelig drift; et nyt fast afslag kan gøre årsagen konkret, men denne observation kaldes ikke en rodårsagsrettelse på forhånd.

Ingen SOURCE-, statistik- eller retentionaktivering og ingen mailafsender, ny tjeneste, nøgle eller plan. Alle fem mål består. Håndbog 89.285, stabilt ID private-bs-reconcile-fixed-failure-categories-2026-10-30, spejles i webhåndbogen og installationsfilens statiske håndbogspayload. Ingen DDL eller migration ændres; ældre daterede fronter og afsnit bevares.
