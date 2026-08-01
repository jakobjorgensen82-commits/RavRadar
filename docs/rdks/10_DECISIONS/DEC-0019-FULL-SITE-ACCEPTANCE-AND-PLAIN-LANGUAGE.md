# DEC-0019 – Samlet funktionstest og almindeligt dansk

- **Status:** IMPLEMENTERET
- **Version:** 4.0.69

## Beslutning
En release må ikke kaldes færdig alene på baggrund af struktur- og enhedstests. Admin skal have en samlet sitetest, som kontrollerer deployede moduler, aktuelle datasæt, Supabase-session, central readback, sikker gendannelse og håndbogsreviewets opret/læs/opdater/slet-kæde.

Knappen “Kontrollér nu” skal give synlig kørselsstatus og må aldrig fejle tavst.

Håndbogen skal være forståelig for en praktisk ekspert uden akademisk baggrund. Fagord forklares, ekspertopgaver formuleres som konkrete spørgsmål, og det skal altid fremgå, hvad RavRadar gør i dag, hvorfor det kan være utilstrækkeligt, og hvad ekspertens svar kan ændre.
