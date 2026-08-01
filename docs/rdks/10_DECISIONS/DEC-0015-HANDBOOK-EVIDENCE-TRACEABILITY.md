# DEC-0015 – Håndbogens evidens- og implementeringssporbarhed

**Status:** Aktiv og bindende  
**Besluttet:** 2026-08-01  
**Gælder fra:** RavRadar 4.0.60

## Beslutning
Håndbogen er RavRadars faglige forklaringslag og skal beskrive både den naturfaglige procesmodel og den faktiske kodevirkning. Hver væsentlig scoremekanisme skal kunne spores til:

1. en kodeplacering,
2. en evidensklasse,
3. en kilde eller eksplicit RavRadar-hypotese,
4. et ekspertvalideringspunkt, når mekanismen eller tærsklen ikke er tilstrækkeligt dokumenteret.

## Bindende krav
- Håndbogen må ikke nøjes med en overordnet beskrivelse af ravtransport.
- Den skal forklare tilstedeværelse, frigivelse, strøm, bølger, vind, vandstand, langs-/tværkysttransport, undertow, sortering, vegetation, kystmorfologi, aflejring og jagtbarhed.
- Den skal angive aktive vægte, tærskler, bonusser, fradrag, caps og regelrækkefølge fra den aktuelle kode.
- Forskning i plast eller generel sedimenttransport skal markeres som analogi, når den ikke er ravspecifik.
- Ekspertspørgsmål skal have stabile ID'er, så kommentarer og senere ændringer kan spores.
- En kodeændring i scoremotor, procesmodel, retning eller regelmotor kræver vurdering af, om håndbogen skal opdateres i samme release.
- Release Gate skal stoppe en release, hvis de obligatoriske fagkapitler, ekspertmatrixen eller kodesporbarheden mangler.

## Begrundelse
RavRadars vigtigste eksterne kvalitetssikring kommer fra rav-, sediment- og kysteksperter. De kan kun rette modellen præcist, hvis de kan se både antagelsen og dens konkrete implementering. En flot, men vag håndbog er derfor utilstrækkelig.
