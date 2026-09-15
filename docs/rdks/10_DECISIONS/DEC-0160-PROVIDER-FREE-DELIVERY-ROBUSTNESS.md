# DEC-0160 – robust providerfri kodelevering uden falske stop

**Status:** Aktiv; implementeret lokalt i 4.0.378, produktionsbevis afventer
**Dato:** 2026-09-15

## Problem

Astra-gennemgangen viste, at den providerfri kodelevering kunne stoppe af
årsager, som ikke betød, at vejrdata eller artifact var ugyldige: gammel
assistent-Edge, rene versionsændringer i private kontrakthashes, identiske
private data med ny Git-producent, mistede Supabase-svar, midlertidige
502-fejl, en historisk pointer foran en kompatibel rollback og to forskellige
størrelsesgrænser. De uafhængige prewrite-kontroller kørte desuden fail-fast,
så næste fejl først blev synlig i næste release.

## Beslutning

- Den direkte kodelevering deployer kun `ravradar-assistant` fra den eksakte
  main-kilde og gør det før det eksisterende readiness-bevis. Der deployes
  ikke andre Edge-funktioner, migrationer eller vejrproviders.
- Privat specifikation, bundle, Pages-pakke og privacy-audit gennemføres som
  fire uafhængige prewrite-kontroller. Deres udfald samles i ét beslutningstrin.
  Enhver fejl stopper før private, centrale eller offentlige writes.
- Produktionsmutationer får ikke en generel “fortsæt ved fejl”. En afhængig
  kæde fortsætter kun, når dens konkrete forudsætninger er bevist.
- Private kontrakthashes normaliserer kun CRLF samt eksakte releaseversions-
  og cachebusterfelter. Enhver anden kildeændring ændrer fortsat hash.
- En byte-, model-, kontrakt- og tidsidentisk privat generation genbruges uden
  at omskrive pointerens oprindelige `sourceHead`; Git-commit er producentbevis,
  ikke en grund til at duplikere de samme vejrdata.
- Et usikkert CAS- eller pointer-write gentages aldrig blindt. Eksakt forventet
  version og payloadhash læses tilbage; kun præcis match tæller som succes.
- Sikre læsninger og idempotente Storage-operationer må genprøves én gang ved
  netværksfejl eller HTTP 429/502/503/504. Oprydning efter en allerede
  verificeret pointercommit registreres, men omskriver ikke succes til fejl.
- En udløbet, ellers kompatibel current må føre til normal målt koldstart,
  selv om en historisk previous er model-/kontraktmæssigt uegnet. Udløb gør
  ikke state frisk, og korruption er fortsat fatal.
- Download af offentlig detailruntime bruger manifestets eksakte byteantal
  under det fælles 192 MiB-loft.
- Historisk maintenance kan afsluttes af eksakt verificeret reconciliation,
  hvis det normale completion-svar gik tabt.

## Afgrænsning

Et GitHub-job, der bliver fysisk dræbt efter en central `PENDING`-write, kan
fortsat kræve den eksisterende store, forseglede recovery i
`update-and-deploy.yml`. Den kopieres ikke ind i code-only lige før launch.
Aktuel produktion er ikke `PENDING`; en fælles providerfri recoverykomponent
er efterfølgende robusthedsarbejde. Det 14-dages kildeartifact er ligeledes en
senere opgave. Ingen af delene er dagens cutoverblokering.

## Beviskrav

Målrettede regressioner skal dække to reelle historiske arkiver, ren
versionsændring kontra reel kontraktændring, samme indhold fra ny source,
write-gemt/svar-tabt, midlertidig 502, blandet udløbet/uegnet generation,
prewrite-fejlopsamling, præcis Edge-installation og manifestbundet størrelse.
Dernæst kræves én exact-head GitHub-sourcegate, merge og den faktiske
providerfri kodelevering. Først efter offentlig modelverifikation må normal
weather bevise numeriske scorer, rotation og cache. Ingen oneoff.
