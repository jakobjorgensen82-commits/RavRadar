# RavRadar 4.0.237

## Rettet lokalt

- Den aktuelle lokale zonevisning vælger nu den nærmeste **komplette fælles time for hele zonen** i stedet for blot den nærmeste række til byggetiden. Begge jagtformer og alle zonens kystdele skal være beregnelige ved samme eksakte tidspunkt.
- Zonens valgte tidspunkt føres som `currentReferenceAt` gennem fuld runtime, offentlig startpakke, detaljepakke og frontend. Score, vinderdel, vejr, forklaring, debug og lokale pile bruger dermed samme zonetid.
- Hver kystdels `current` og `flowPoints` bygges på zonens fælles time. En strømpil må kun bruge en dokumenteret celle fra præcis dette tidspunkt; den nærmeste nabotimes celle kan ikke længere lånes.
- Nærzoom viser kun lokale pile, når kystdelens aktuelle post faktisk matcher zonens `currentReferenceAt`. En gammel eller ufuldstændig blanding skjules derfor fail-closed.

## Fund og afgrænsning

- Metadataaudit af det aktuelle 210-zone/673-dels livegrundlag fandt en komplet fælles lokal time i alle 210 zoner. 192 zoner kan bruge selve produktionsreferencetimen, 14 bruger den nærmeste komplette time én time før, og fire bruger én time efter.
- Den hidtidige runtime havde 642/673 kystdele på deres zones nærmeste komplette time; 31 dele brugte en anden nær-time. Dette forklarede de aktuelle lokale hovedzonefallbacks og blandede pile uden at være et brud på selve 673/673-kildegaten.
- 673/673 betyder fortsat, at alle 673 dele har en tilladt, verificeret strømrecord. Det betyder ikke, at hele landet skal bruge én national klokktime. Den nye lås gælder pr. zone og forhindrer tidsblanding inden for den viste lokale sammenligning.

## Sikkerhed og test

- Ejerens land-/vandpunkter, kystgeometri, U/V, kildeorden, afstandsgrænser, RavScoreformel, rollback og 100 %-krav er uændrede.
- Målrettede regressioner er grønne for progressiv offentlig runtime, 210 zoner, 673 dele, 2.100 femdøgnsvisninger, pile, DMI-bulk/forecast og kontrolleret Copernicus-livefletning.
- Den lokale determinismetests pipeline består. Den ældre repository-runtime har fortsat kun 209 zoner og kan derfor ikke udgøre det endelige 210-zonebevis; fuld frisk validering, releasegate og livekontrol skal gennemføres centralt.
