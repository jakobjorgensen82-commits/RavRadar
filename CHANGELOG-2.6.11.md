# RavRadar 2.6.11 – farvede kystzoner

- Pins er erstattet af klikbare, farvede kystlinjer.
- Linjens farve følger zonens RavScore.
- Den valgte zone fremhæves med en tykkere linje.
- Skjulte polygoner bevares til geofencing og beregninger.
- Vind- og strømpile forbliver ude over vandet.
- Alle zoner har nu et særskilt `coastLine`-felt, så kystforløbet kan finjusteres punkt for punkt uden at ændre kortlogikken.
- Eksisterende funktioner er bevaret.

## Vigtig kvalitetssikring
De nye linjer er en første GIS-struktur baseret på zonernes nuværende strandpunkter og orientering. For centimeter-/strandkantnøjagtighed skal hvert `coastLine`-forløb efterfølgende spores mod en autoritativ højopløst kystlinje eller manuelt verificeres på satellitkort.
