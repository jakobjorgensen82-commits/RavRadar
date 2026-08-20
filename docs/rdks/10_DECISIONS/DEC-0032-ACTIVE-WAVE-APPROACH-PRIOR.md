# DEC-0032 - Aktiv, begrænset bølgeretning og bølgeperiode

## Status

Aktiv og fuldt produktionsverificeret i 4.0.241. PR #25, frisk fuld produktionsvalidering, release-gate og Pages-deploy er grønne på mergecommit `eb66b280`; onlineaudit af 210 zoner, 673 kystdele, 420 aktuelle og 2.100 prognosevisninger bestod uden fejl.

## Beslutning

RavScore må bruge bølgehøjde, bølgeperiode og bølgeretning samlet som en konservativ justering af transportkomponenten.

- DMI-bølgeretning fortolkes som retningen, bølgerne kommer fra, og omregnes før sammenligning med lokal pålandsretning.
- Den relative energiproxy er signifikant bølgehøjde i anden gange bølgeperiode. Den må ikke beskrives som bundforskydning eller sikker viden om ravtransport.
- Bølgeeffekten vokser kun ved reel bølgeaktivitet.
- Transportkomponenten må højst flyttes 12 point op eller ned.
- Eksisterende lofter ved fralandsstrøm anvendes efter bølgejusteringen og kan derfor ikke omgås.
- Manglende højde, periode, retning eller lokal pålandsretning giver nul bølgeeffekt.
- Jagtbarhed, mobilisering, vægte og eksisterende tærskler ændres ikke i dette delmål.

## Begrundelse

Fase D viste, at højde alene ikke beskriver bølgernes transportstøtte. Retning afgør, om energien peger mod kysten, og periode skelner korte lokale bølger fra længere bølger med større relativ energi. Den begrænsede justering giver denne fysik plads uden at gøre en endnu ikke lokalt kalibreret proxy dominerende.

## Krav før produktion

- Målrettet regression af retning, periode, fallback, loft og forklaring.
- Syntetisk audit for ekstreme og manglende input.
- National offentlig før/efter-audit.
- Fuld RavRadar-validering og release-gate med frisk produktionsdata.
- Systematisk browserkontrol af 210 zoner og 673 kystdele efter deploy.

## Næste beslutning

De foreløbige vægte 25 procent jagtbarhed, 40 procent transport og levering samt 35 procent mobilisering vurderes særskilt efter dette delmål. Bølgeeffekt og vægte må ikke aktiveres i samme ændring.
