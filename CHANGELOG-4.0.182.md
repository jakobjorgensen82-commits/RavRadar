# RavRadar 4.0.182

## Releasekæde
- To fejlede produktionsforsøg blev stoppet før deploy. Legacy-generatoren bevarer nu de tre ejer-godkendte Vadehavszoner.
- En nyere, eksplicit ejer-godkendt kystaktivering kan nu promoveres forbi en ældre central manifest præcis én gang. Når versionerne er ens, er den centrale Supabase-version igen autoritativ, inklusive rollback.
- En målrettet regressionstest beskytter både engangspromotionen og den efterfølgende centrale rollback.
- Den eksisterende stations-sync-kontrakttest accepterer nu sikker, læsbar Python-formatering uden at svække kontrollen af de centrale dokumentstier.
- Produktion #31541126136 bestod alle gates og deploy. Onlinekontrol bekræftede version 4.0.182, 211 effektive hovedzoner, 643 kystdele, alle tre nye Vadehavszoner og et synligt kort uden browserfejl.

- Kombinerer de oprindelige hovedzoner med de ejer-godkendte præcise kystforløb: 212 hovedzoner, hvor 206 bruger præcis kyst og seks bevarer deres sikre gamle linje.
- Viser fortsat kun én klikbar linje, ét navn, én scorefarve og to ydre grænsemarkeringer pr. hovedzone. De 643 lokale beregningsdele vises ikke som selvstændige zoner.
- Tilføjer Vadehavets relevante fastlandskyst fra Emmerlev mod Esbjerg i tre hovedzoner og bevarer de godkendte forbindelser ved digekysten og Ribe Å.
- Retter en asymmetrisk overlapkontrol, som havde overset 11 additive dubletdele. Slutbestanden har nul tværzoneoverlap og nul uafklarede relevante kysthuller.
- Alle 643 dele har land-/vandpunkt. De 39 nye eller ændrede punkter har fuld native WAM- og DKSS-dækning i privat #31532688885; samlet dækning er 632 fulde og 11 dokumenteret delvise dele.
- Privat #31533385967 beviste desuden den deaktiverede runtimekontrakt og central Supabase-opret/læs/opdater/slet/rollback uden ændring af beskyttede admin-dokumenter.

RavScore-reglerne ændres ikke. Manglende lokale data forbliver manglende, og de seks fallbackzoner får ikke opdigtet præcisionsgeometri.
- Den historiske 4.0.48-kystgenerator bevarer nu de tre ejer-godkendte nye Vadehavszoner gennem den centrale admin- og vejrbygning.

## Efterfølgende read-only kvalitetssikring
- Tilføjer en privat visuel auditbygger, som læser den aktive hash-låste 4.0.182-bestand og kan vise både hele Danmark og hver af de 643 dele uden at ændre geometri, admin-data, vejr eller RavScore.
- Landsvisningen og lokale stikprøver ved Voerså–Sibirien og Vadehavet er åbnet og kontrolleret i browseren. Aktiveringskontrakten og 643/643 land-/vandpunktpar er genvalideret.
- Forældede RDKS-formuleringer om afventende runtimegate og manglende aktivering er markeret som historiske eller lukket.
