# DEC-0049: Landsrangering korrigeres for mange retningsmuligheder

**Status:** Godkendt af ejeren 2026-08-21

## Problem

Bedste områder og 5-dages RavRadar sorterede hidtil zoner efter den højeste lokale kystdels RavScore. En zone med mange forskelligt vendte dele fik dermed mange flere muligheder for at ramme en gunstig retning end en zone med én del.

## Beslutning

Begge nationale top-5-lister bruger modellen `direction-broad-19-v1` som intern sorteringsscore. Den viste RavScore og alle lokale resultater bevares.

Korrektionen er højst 19 point og skaleres med zonens vejruafhængige retningsmulighed og den andel af zonens dele, der støtter vinderen. Ved støtte fra mindst halvdelen af zonen er korrektionen nul. Mellem en fjerdedel og halvdelen udfases den lineært. En helzonevurdering og en zone med én effektiv retning korrigeres ikke.

Retningsmuligheden beregnes med samme 360-graders metode som den godkendte nationale analyse. Gentagne ens retninger tæller ikke som nye muligheder.

## Sikkerhedsgrænser

- Kun rækkefølgen i de to nationale lister ændres.
- RavScore, delscorer, niveau, farve, pile og forklaringer ændres ikke.
- Manglende eller uoverensstemmende kystdelskontrakt giver ingen korrektion.
- Ingen geometri eller land-/vandpunkter flyttes.
- Ændringen kræver målrettet regression, exact-head-gate, fuld produktionsgate og efterfølgende 210/673-browserkontrol.

## Evidens

107 timer og 214 jagtformskontekster reducerede 6+-zoners top-5-overrepræsentation fra 3,68x til 1,11x. En 1.000-gentagelsers blokbootstrap gav 0,94x-1,30x. Ingen helzonevinder og ingen vinder med støtte fra mindst halvdelen af zonen mistede førstepladsen.
