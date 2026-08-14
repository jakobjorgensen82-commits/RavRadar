# DEC-0037 – Ét autoritativt land-/havpunktpar pr. kyststrækning

- **Status:** Aktiv
- **Besluttet:** 2026-08-15
- **Ejerbeslutning:** Ja

## Baggrund

De lokale kyststrækninger blev indført for at give en hovedzone flere geografisk meningsfulde dele med hver sin lokale retning, DMI-sampling og score. Den aktive kontrakt har 673 kyststrækninger og præcis ét blåt havpunkt samt ét grønt landpunkt pr. strækning.

En skrivebeskyttet orienteringsaudit fandt 199 kontrolkandidater i 122 hovedzoner ved mindst 35 graders vedvarende retningsvariation. Resultatet er triage, ikke 199 dokumenterede fejl: 171 kandidater er `MultiLineString`-geometrier, hvor fragmenter, småøer eller flere adskilte kyststykker kan udløse kontrollen. Auditten beviser derfor ikke, at en ny flerpunktsmodel eller automatisk landsdækkende genopdeling er fagligt korrekt.

## Beslutning

1. Hver aktiv lokal kyststrækning beholder ét og kun ét autoritativt land-/havpunktpar.
2. Administratoren retter en strækning ved at trække dens eksisterende blå og grønne markør. Admin må ikke oprette ekstra aktive punktpar på samme uændrede strækning.
3. De tidligere knapper **Sæt nyt havpunkt** og **Sæt nyt landpunkt** fjernes. Træk, hav→land-pil, geometrikontrol, central readback, DMI-validering og rollback bevares.
4. På bugtede strækninger vælger ejeren manuelt det mest repræsentative sted og accepterer, at én lokal retning er en dokumenteret tilnærmelse for hele strækningen.
5. En centralt godkendt flytning bliver først autoritativ efter readback og en grøn efterfølgende DMI-/releasekørsel. Indtil da er den seneste produktionsverificerede placering aktiv.
6. En eventuel fremtidig opdeling af en strækning eller flerpunktsmodel kræver en ny udtrykkelig ejerbeslutning og en særskilt konsekvensanalyse af DMI, historik, score, forklaring, admin og rollback.

## Manuel gennemgang og roadmap

Ejeren kan gennemgå alle hovedzoner og kyststrækninger gradvist. Gennemgangen er ikke en blokering for roadmaparbejde, som er uafhængigt af lokale retninger, eksempelvis performance, Supabase, besøgstæller/adminrapport, dokumentation og generel UI.

Gennemgangen skal være afsluttet, før RavRadar erklærer alle lokale retninger og RavScores endeligt fagligt kvalitetssikrede, før større scorekalibrering bygger på dem, og før den endelige domæne-/brugerrelease.

## Konsekvens

Den aktuelle score- og datamodel ændres ikke. Ét punktpar bestemmer fortsat strækningens DMI-vandpunkt og den afledte hav→land-retning. Manglende eller afvist DMI-validering må ikke erstattes med nul, en gammel kladde eller et skjult ekstra punktpar.
