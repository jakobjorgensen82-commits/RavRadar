# RavRadar 4.0.254

## Score-neutral waders-kandidat

- Forskningsvarianten `G-50-50-NO-DIRECT-WIND-WADERS-LIMIT` bevarer Candidate G for strand og begrænser kun waders-slutscoren til waders-jagtbarheden.
- Waders-vindkomponenten giver fuld score til og med 6 m/s og falder derefter progressivt gennem ankerpunkterne 7/80, 8/60, 10/35, 13/10 og 18/0.
- Historisk replay af 1.460 evalueringer giver 730/730 uændrede strandscorer, nul waders-score over jagtbarheden og nul middel/gode waders-scorer ved jagtbarhed under 35.
- Kandidaten er ført gennem den private nationale shadowanalyse og kan ikke løftes over waders-jagtbarheden af efterfølgende ekspertregler.

## Uændret

- Kandidaten er fortsat privat og score-neutral; den offentlige RavScore er fortsat den aktive 25/40/35-model.
- Strandjagt påvirkes ikke af waders-begrænsningen. Jagtbarhed er fortsat metodeeffektivitet og ikke en sikkerhedsadvarsel.
- Bundforhold, bathymetri og generel stedegnethed er bevidst udeladt på grund af lokale undtagelser og utilstrækkelig robusthed.
- Ingen geometri, land-/vandpunkter, private artifacts eller beskyttede data er ændret. Versionsfeltet i de to kystdatafiler er alene opdateret som krævet versionsmetadata.

## Verifikation

- RDKS-, model-, scenarie-, privatlivs-, workflow- og releasekontroller er grønne lokalt. Exact-head-kildegate og eventuel central produktionsverifikation skal fortsat dokumenteres efter push.
- Offentlig aktivering, endelige delvægte og UI-/forklaringskontrakt afventer ejerens samlede gennemgang og udtrykkelige go/no-go-beslutning.
