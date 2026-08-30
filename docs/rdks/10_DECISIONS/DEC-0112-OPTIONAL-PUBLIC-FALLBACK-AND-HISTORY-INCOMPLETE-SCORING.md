# DEC-0112 – frisk primary må publiceres uden gyldig fallback; HISTORY_INCOMPLETE er en særskilt scorekvalitet

**Status:** Ejerbesluttet og bindende. Publiceringsdelen er 4.0.316-hotfixkandidat og ikke liveverificeret. Modeldelen er bindende acceptkrav under DEC-0102 og implementeres ikke som del af P0-hotfixen.

**Dato:** 2026-08-30

## Hændelse og bevis

4.0.315-retirementen bestod PR #233 exact-head `33299676128` og blev merged som `63d789a4`. Post-merge-run `33299747300` frigav den tidligere D1-/reconstruction-readiness og startede det normale build. Dermed er den stale grøn-no-op-interlock ikke længere den aktuelle blocker.

Runnet stoppede rødt ved **“Stage audited last verified Candidate G public fallback”**. Der fandtes ingen komplet measured-only fallback, som både var højst 72 timer gammel og stadig lå inden for sin egen prognosehorisont. Stoppet beskyttede korrekt mod at vise gamle data, men gjorde samtidig en gyldig frisk primary afhængig af, at et ældre reservedatasæt fandtes. Aktuelle og femdøgnsprognoser blev derfor ikke publiceret. Ingen syntetiske eller interpolerede data blev skabt eller anvendt.

## Beslutning for 4.0.316

1. En last-verified Candidate G-fallback er valgfri, når den nye primary er frisk, measured-only og består alle egne current-hour-, input-, provenance-, 210/673-, accounting-, audit-, validate-, release-, artifact- og Pages-gates.
2. En fallback må fortsat kun stages, hvis den er én komplet, auditeret, measured-only 210/673-pakke, er højst 72 timer gammel og ikke har overskredet sin kortere prognose-/produktudløbsgrænse.
3. Hvis ingen sådan fallback findes, er det en forventet **ingen-fallback**-tilstand, ikke en fejl i en ellers gyldig frisk primary. Gammel, udløbet, ufuldstændig, ukendt, blandet, rekonstrueret eller manipuleret fallback må aldrig vises. Den skal være fraværende i manifestet og fjernes fra de publicerede fallbackfiler, så en tidligere kopi ikke kan genbruges.
4. Fravær af gyldig fallback må ikke blokere offentliggørelse af frisk current- og femdøgnsvejr. Det lemper ikke primary: uventede optællinger, inkonsistent manifest/fil-accounting, auditafvigelser, manglende current/future-input eller andre primaryfejl stopper fortsat fail-closed.
5. Hotfixen må ikke interpolere, backfille, låne fra andre zoner eller skabe syntetisk Candidate G-state. Manglende historik og manglende fallback forbliver ærligt manglende.
6. 4.0.316 må ikke kaldes live eller produktionsverificeret, før exact-head-kildegaten, merge, en frisk normal post-merge-produktion med fuld validate/releasegate/artifact/Pages og offentlig kontrol af 210/673 samt aktuelle og femdøgnsprognoser er grønne.

## Bindende modelbeslutning under DEC-0102

1. `HISTORY_INCOMPLETE` er en scorekvalitet, ikke det samme som manglende aktuelle eller fremtidige input. Når de direkte, tidsbundne current/future-input for en scoretime er gyldige, skal den kommende model fortsat levere scores over hele den aktuelle og femdøgns tidsflade, selv om det rullende historikvindue endnu ikke er komplet.
2. `HISTORY_INCOMPLETE` må ikke skjules som normal fuld historik. Score, detaljer, femdøgnsvisning, admin og ekspertflade skal vise en tydelig, stabil og meningsmæssigt ens advarsel på dansk, tysk og engelsk. Advarslen skal forsvinde automatisk, når den nødvendige sammenhængende historik igen er komplet; der må ikke kræves manuel nulstilling.
3. Enhver tur, observation eller anden læringsevidens bundet til en `HISTORY_INCOMPLETE`-score skal have `calibrationEligible=false` gennem alle klient-, Edge-, lager-, manifest- og auditgrænser.
4. Manglende eller ugyldigt current/future-input er en separat `UNAVAILABLE`-tilstand for den berørte time. `HISTORY_INCOMPLETE` må aldrig udfylde, bære frem, interpolere eller omklassificere sådanne input.
5. Beslutningen kræver fuld producent-/forbrugermatrix og modeltests under DEC-0102. Den fastsætter tilgængelighed, mærkning og kalibreringsgrænse, men godkender ikke en utestet numerisk erstatning for historikafhængige komponenter.

## Systemisk arkitekturroadmap

P0-hændelserne viste tre strukturelle risici: et monolitisk workflow med mange skjulte afhængigheder, grøn topstatus som kan dække over no-op/skipped produktion, og spredt kobling mellem versioner, dokumentation og tekstfølsomme tests. De skal reduceres som en eksplicit del af DEC-0102-modelleverancen gennem klarere trinresultater, maskinlæsbar producer-/consumerstatus, central versions-/kontraktmetadata og semantiske tests. Arbejdet må ikke blandes ind i den afgrænsede 4.0.316-P0-hotfix.

## Uændrede grænser

Candidate G-formel, RavScore, DMI/Copernicus, storage, geometri, zoner, land-/vandpunkter og private data ændres ikke af 4.0.316-publiceringsbeslutningen. DEC-0111's forbud mod at genåbne den tilbagetrukne rekonstruktionsoperation består.
