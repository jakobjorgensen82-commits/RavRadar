# RavRadar 4.0.241

## Kontrolleret bølgeinput i RavScore

- Bølgehøjde, bølgeperiode og bølgeretning indgår nu samlet som en relativ støtte til transportdelen.
- DMI's bølgeretning fra havet omregnes til bevægelsesretning og sammenholdes med den lokale retning fra hav mod land.
- Effekten er begrænset til højst plus/minus 12 transportpoint, svarende til cirka plus/minus 4 point i samlet RavScore med de nuværende vægte.
- Manglende bølgeperiode, bølgeretning, bølgehøjde eller lokal kystretning giver nul bølgeeffekt.
- Fralandsstrømmens eksisterende scorelofter gælder fortsat efter bølgejusteringen.
- Transportforklaringen fortæller enkelt, om retning og periode støtter indtransporten.

## Uændret

- Vægtene er fortsat 40 % jagtbarhed, 35 % transport og 25 % mobilisering.
- Eksisterende jagtbarheds- og mobiliseringsregler for bølgehøjde er uændrede.
- Ingen pilekonventioner, kystdata eller land-/vandpunkter er ændret.

## Validering

- Målrettede regressionskontroller er grønne. 55.296 syntetiske scenarier holdt scoreændringen inden for plus/minus 5; national public-audit gav minus 1 til plus 1 og ingen farveskift. PR #25 og frisk produktion `#32405699346` er grønne gennem fuld validering, release-gate og Pages-deploy på `eb66b280`; direkte Pages-kontrol viser 4.0.241. Systematisk onlineaudit gennemføres som sidste trin.
