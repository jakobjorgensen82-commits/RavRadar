# RavRadar 4.0.117 – aktiv-zone scheduler og DMI-vind recovery

## Rodårsag
Produktion #1717 bekræftede, at 4.0.116 fjernede U/V-grid-mismatch, men DMI-vind havde fortsat ingen 24/96-timers dækning. Schedulerens dækningsnævner kom fra den gamle bulkcache i stedet for det aktuelle aktive zoneregister. Samtidig hed HARMONIE-familien `wind`, mens den gamle mangeltabel brugte `atmosphere`, så reel vindmangel kunne rangeres som nul.

## Ændring
- Schedulerens nævner er nu altid det aktuelle aktive zoneregister.
- Nye aktive zoner uden cache tæller eksplicit som manglende; udgåede cachezoner tæller ikke.
- Vind bruger konsekvent familien `wind` i både collection-mapping og deficitberegning.
- Hvis en aktiv zone helt mangler marinegrundlag, er DKSS fortsat ubetinget først.
- Når marinegrundlaget findes for alle aktive zoner, men 96-timershorisonten stadig bygges, kan en helt udsultet vind-/bølgefamilie få næste prioritet efter marine.
- `scheduleCoverageBeforeRun` beskriver nu samme aktive zoner og samme dækning, som scheduleren faktisk beslutter ud fra.
- Marine audits og DMI-only transportkravet er uændrede.

## Regression
Ny scheduler-kontrakttest beskytter aktiv-zone-nævner, `wind`-familien og marine-first. Ældre tests er opdateret til at validere kravet frem for 4.0.110-implementationsdetaljer.
