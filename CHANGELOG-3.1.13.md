# RavRadar 3.1.13

## Geografisk kontrol i admin
- Havpunkt og landpunkt kan trækkes direkte på kortet.
- Koordinater kan også redigeres præcist i felter.
- Bugtede zoner kan få flere kystdele (`directionAnchors`), hver med eget havpunkt, landpunkt, pålandsretning, navn og vægt.
- Primær kystdel eksporteres fortsat til de gamle felter (`dataPoint`, `pinPoint`, `onshoreDirectionDeg`) for bagudkompatibilitet.
- Godkendelse kræver bekræftelse af alle havpunkter, landpunkter og retninger.

## Scoring og forklaring
- Transportmotoren vurderer alle kystdele pr. time.
- Den bedst eksponerede kystdel vægter højest, mens øvrige gunstige kystdele bruges som støtte.
- Hvis strømmen går væk fra alle kystdele, anvendes den mindst ugunstige retning, og de eksisterende transportlofter begrænser scoren.
- RavScore-visningen forklarer i almindeligt dansk, hvilken kystdel der vægter højest, og hvad der sker ved de øvrige kystdele.
- Debug-visningen indeholder alle ankre, valgt anker og udvælgelsesmetode.

## Test
- Ny funktionel test af fleranker-logik, brugerforklaring og loft ved udgående strøm.
- Hele projektets valideringssuite består.
