# DEC-0212 – Forgænger-restore bruger en fuld kompatibilitetslukning

**Status:** Aktiv; implementeret lokalt i 4.0.432, produktionsbevis mangler

**Dato:** 2026-09-19

**Grundlag:** Providerfri code-only-kørsel `35448284914`

## Problem

Efter 4.0.431 havde afsluttet den centrale PENDING-overgang som ACTIVE,
afviste current-runtimeinstallationen korrekt begge gemte generationer som
tilhørende forgængerens model eller kontrakt. Workflowet pakkede den eksakte
forgængerkilde ud og forsegledes dens forventning, men kopierede bagefter kun
den aktuelle restore-wrapper ind i kildetræet.

Wrapperen havde siden forgængeren fået to modeluafhængige afhængigheder:
komponentinventaret og en robust Supabase-responsebody-transport. Først
manglede inventarfilen. Helhedskrydset viste, at den næste sekventielle fejl
ville være den manglende `readSupabaseBodyTransport`-eksport i forgængerens
gamle Supabase-helper.

## Beslutning

En historisk private-runtime-restore skal have én eksplicit og testet
kompatibilitetslukning:

1. Historisk forventning, modelbinding og bundleidentitet forsegles først mod
   den urørte, eksakte forgængercommit.
2. Den aktuelle source-gated restore-wrapper og dens modeluafhængige ændrede
   hjælpefiler installeres derefter samlet: Supabase-transport og privat
   komponentinventar.
3. Forgængerens `private-production-runtime-bundle.mjs` og
   `ravscore-model-contract.js` bevares. De må ikke erstattes af nutidig
   modelkode under historisk restore.
4. Wrapperen importeres før Storage, privacy, migration og artifact. Manglende
   eksport eller modul stopper dermed ved en tydelig kompatibilitetskontrol.
5. Kildetesten klassificerer alle wrapperens relative imports og kræver, at de
   to kopierede hjælpefiler fortsat er lokale blade uden skjulte relative
   imports. En fremtidig afhængighedsændring skal derfor opdages i sourcegate,
   ikke én fejl ad gangen i produktion.

## Afgrænsning og drift

Dette er ikke en modelmigration og lemper ingen hash-, binding-, privacy-,
210/673-, historik-, warmup-, Storage- eller CAS-kontrol. Migration
`20260919020000` er allerede anvendt og skal ikke rulles tilbage. Næste
kørsel starter fra central ACTIVE version 31 og skal være providerfri.

Vejrrettelserne fra DEC-0210 er fortsat kun kodeleveret. DMI-first,
reservekilder, komponentbevaring, Feggesund, fuld dækning, automatisk
genoptagelse og browseradfærd skal stadig bevises i almindelige vejrkørsler.
