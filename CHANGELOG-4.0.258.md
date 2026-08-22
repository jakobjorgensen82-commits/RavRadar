# RavRadar 4.0.258

## Efterfølgende score-neutralt forskningscheckpoint

- DEC-0055 tilføjer en privat Candidate G-variant, hvor verificeret kystnormal strøm styrer transportpotentialet.
- Fuld indgående strøm bygger 10 point pr. effektiv time; fuld udgående strøm reducerer straks med 8 point pr. effektiv time og når 0 fra 13 timer.
- Bølger kan ikke skabe transport og har højst en 15 procents afhængig leveringsrolle.
- Replayet viser korrekt mekanik, men også at strømgrænsen og reservoirtilstanden ved start er åbne aktiveringsblokeringer.
- Dette checkpoint ændrer ikke version, offentlig score, UI, data, geometri eller land-/vandpunkter og er ikke en produktionsaktivering.

## Candidate G: vindstyret waders-jagtbarhed

- Den foretrukne private forskningsvariant er `G-50-50-NO-DIRECT-WIND-WADERS-WIND-LED` med analyseprioren `20/50/30`.
- Vind er waders-jagtbarhedens hovedsignal: 100 til og med 6 m/s, derefter 7/80, 8/60, 10/35, 13/10 og 15/0.
- WAM's signifikante bølgehøjde kan kun give et blødt fradrag på 20 procent af et negativt gab, højst 20 point. Bølger kan ikke hæve jagtbarheden eller alene give et hårdt stop.
- Waders-score er højst jagtbarheden, også efter centrale regler. Strandscore er uændret og har intet jagtbarhedsloft.
- `20/45/35`, 18 m/s-stop og den tidligere bølgekobling er historiske referencespor efter DEC-0054.

## Evidens

- Det private replay har 1.460 evalueringer og 730 uændrede strandscorer.
- Ingen waders-score overstiger jagtbarheden; ingen af 138 lave jagtbarheder får mindst 55 point.
- Bølgefradraget er gennemsnitligt 4,002 point og højst 20. Alle seks replaytilfælde ved mindst 15 m/s ender på 0.
- Målrettede kandidat-, mode-, scenarie- og nationale shadow-self-tests består.

## Uændret

- Offentlig RavScore er fortsat `25/40/35`; Candidate G er diagnostic-only og kan ikke aktivere sig selv.
- Ingen nye rådata er hentet. Private cachepayloads er Git-ignorerede og indgår ikke i committen.
- DMI/fallback, central admin, offentlig UI-adfærd, koordinater, geometri og land-/vandpunkter er uændrede. Kun releaseversionens metadata i de versionsbærende datafiler er løftet.
- Artifact og protected-dirty-data er urørte.

## Validering

- Første lokale `scripts/validate-source.ps1` bestod alle kildechecks og stoppede alene ved det endnu manglende versionsspecifikke changelog. Efter oprettelsen bestod releasegaten.
- Den afsluttende samlede lokale `scripts/validate-source.ps1`, inklusive releasegaten, er grøn.
- PR #73's exact-head-kildegate `32586707063` bestod, og merge `9bdb8de8` blev fuldt produktionsverificeret i `32586958989` med support `RavRadar-support-3405`, Supabase og Pages.
- Live 4.0.258/datasæt `rr-20260822171406-210` er verificeret med 210 zoner, 673 kystdele og 2.100 femdøgnsvisninger. Den offentlige score er fortsat uændret.
