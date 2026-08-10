# RavRadar 4.0.158

- Fortolker #2122's native gridresultat korrekt som modeldækning: 752 valgte vandpunkter har fuld WAM+DKSS-dækning, 22 har én komplet native havmodelfamilie og et eksplicit komponentgab.
- Et vandpunkt består vand-/gridgaten med mindst én komplet native havmodelfamilie. Manglende bølge eller DKSS forbliver `missing`, aldrig nul og aldrig skjult som fuld vejrdækning.
- De ni geometrisk tvivlsomme dele forbliver blokerede: otte har gyldig modeldækning på begge sider og én på ingen; ingen har præcis én entydig side.
- Det kompakte QA-artifact uploades nu også ved fail-closed stop.
- Produktion #2126 og privat national #2127 bestod. #2127 verificerede 774 gyldige valgte vandpunkter, 752 fuldt dækkede, 22 delvist dækkede, nul ugyldige og ni fortsat fail-closed.
