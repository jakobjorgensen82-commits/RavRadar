# DEC-0269 – Eksakt nulformat i afledte regionale strømbeviser

**Status:** Aktiv afgrænsning; lokal 4.0.522-kandidat, ikke produktionsbevist.
**Dato:** 2026-10-01.

## Faktisk udgangspunkt

4.0.521 er merged som `aeac44b4`. Normalrun `36826445588`, attempt 1,
gennemførte vejrbygningen og gemte krypteret fremdrift `36826445588-1`
(cache-id `8353412294`), men fejlede ved no-loss før artifact, CAS,
R2-publicering og Pages. Over 80 fælles timer/53.840 PART-timer var
current-tabet 11.616; de fire øvrige vejrfamilier og identiteter havde
nul tab. Offentlig 4.0.510 og pauset cron `8348098` er uændrede.

En isoleret syntetisk kæde fandt, at Python skrev præcis negativt nul
med minus i det afledte regionale vector commitment, mens den uændrede
JavaScript-kontrol skrev nul uden minus. En ugyldig regional entry kan
afvise hele den operationelle closure, også dens ellers gyldige
CP-/OM-rækker. Dette er en bevist kodefejl, men negativt nuls forekomst
og årsagsandel i det faktiske runs private input er IKKE målt.

## Afgrænset rettelse

1. En regional, fælles formatter normaliserer alene eksakt numerisk nul
   til samme positive nulformat. Den bruges i tre afledte steder:
   regional evidens, den operationelle liveprojektion og den private
   regionale referenceprojektion. Ikke-nulværdier beholder eksisterende
   formatering, også bittesmå ikke-nulværdier; ingen ny tolerance indføres.
2. Rå shadow, originale sample-/kildebeviser, talværdier og generisk
   kanonisering forbliver uændrede. JavaScript-validatoren, beviskrav,
   scoremodel, geometri, leverandørprioritet og privat filinventar
   ændres ikke. Manglende data bliver aldrig til nul.
3. Ældre afledte regional-/OM-/closure-/live-bindinger genbygges samlet
   fra de godkendte input i den eksisterende producentkæde. Gamle
   forseglede hashfelter må ikke omskrives, og der indføres intet alias
   mellem gamle og nye commitments. Det er ikke tilladelse til en ny
   privat læseaudit eller til at rekonstruere manglende originalbeviser.
4. PUBLIC-admission forbliver active-context-only som i
   [DEC-0268](DEC-0268-REPLAY-FIRST-WEATHER-RESTART.md). SOURCE-resolver,
   bredere PUBLIC-/session-/bevisbank-opt-ins og øvrigt ufærdigt arbejde
   i feggesund leveres ikke her. Ingen SQL-installation eller ny model.
5. Den særskilt foreslåede ekstra tidlige workflowgate blev
   sikkerhedsafvist og afventer konkret ejersvar. Den aktiveres ikke,
   er ikke del af 4.0.522 og er ikke et ekstra releasekrav. Eksisterende
   no-loss-/artifact-/deploykrav bevares; ingen gate lempes.

Beslutningen supplerer DEC-0268; den erstatter ingen fysisk modelregel,
bevisgrænse eller tidligere bevarelseskrav. DEC-0238's adskillelse af
operationel closure og valgfrie historikbeviser består.

## Bevisniveau og næste trin

En konkret syntetisk producent-/forbrugerkæde er rød før og grøn efter
rettelsen. Den dækker negativt/positivt nul, uændrede rå bindinger,
ikke-nulformat og afvisning af ændrede værdier og gamle commitments.
Rootens prøve gennem de faktiske producenter på et kunstigt
673 × 118-tildelingsdomæne består på 59,640 sekunder under prøvens
120-sekundersbudget. Alle tre JS-beviser accepteres; ændret indhold
afvises, og originalbytes er uændrede. Prøven omfatter 9 direkte
rækker, 1 state-only-hold, 1 advisory og 1 regional reference; den
bygger ikke en fuld national prognose. En tidligere forkert
testforventning om U/V på hold blev rettet før rootens grønne prøve;
det ændrede ikke runtime. Tre separate Python-scripts består, og en
separat Node-kørsel har 3/3 PASS uden skips. Fuld source-CI på eksakt
head afventer. Disse lokale prøver beviser ikke national
produktionskapacitet eller årsagen i run `36826445588`.

Før release kræves relevante måltests, versions-/RDKS-/håndbogskontrol,
uændret modelbinding og fuld exact-head source-CI. Næste driftsbevis skal
komme fra en sikker almindelig kørsel med bevaret gemt fremdrift og
beskyttet baseline samt uændret kontrol af restore/save, femfelts-no-loss,
artifact, CAS/R2/Pages og den synlige prognose. Ingen blind genstart,
oneoff, automatisk cronstart eller løfte om fuld cache følger lokale
prøver. Det bredere stabilitets- og dækningsarbejde forbliver åbent.
