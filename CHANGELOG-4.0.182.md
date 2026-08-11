# RavRadar 4.0.182

- Kombinerer de oprindelige hovedzoner med de ejer-godkendte præcise kystforløb: 212 hovedzoner, hvor 206 bruger præcis kyst og seks bevarer deres sikre gamle linje.
- Viser fortsat kun én klikbar linje, ét navn, én scorefarve og to ydre grænsemarkeringer pr. hovedzone. De 643 lokale beregningsdele vises ikke som selvstændige zoner.
- Tilføjer Vadehavets relevante fastlandskyst fra Emmerlev mod Esbjerg i tre hovedzoner og bevarer de godkendte forbindelser ved digekysten og Ribe Å.
- Retter en asymmetrisk overlapkontrol, som havde overset 11 additive dubletdele. Slutbestanden har nul tværzoneoverlap og nul uafklarede relevante kysthuller.
- Alle 643 dele har land-/vandpunkt. De 39 nye eller ændrede punkter har fuld native WAM- og DKSS-dækning i privat #31532688885; samlet dækning er 632 fulde og 11 dokumenteret delvise dele.
- Privat #31533385967 beviste desuden den deaktiverede runtimekontrakt og central Supabase-opret/læs/opdater/slet/rollback uden ændring af beskyttede admin-dokumenter.

RavScore-reglerne ændres ikke. Manglende lokale data forbliver manglende, og de seks fallbackzoner får ikke opdigtet præcisionsgeometri.
- Den historiske 4.0.48-kystgenerator bevarer nu de tre ejer-godkendte nye Vadehavszoner gennem den centrale admin- og vejrbygning.
