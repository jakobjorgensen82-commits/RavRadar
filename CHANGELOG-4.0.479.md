# RavRadar 4.0.479 – vejrcache og afgrænset Copernicus-fremgang

- Retter den eksakte 4.0.477→4.0.479-overgang, hvor ændret DMI-planlægning
  fejlagtigt afviste den senest gemte private vejrpakke. Alle data- og
  integritetskontroller består fortsat.
- Opdeler lange operationelle Copernicus-forespørgsler i højst 24 timer,
  så et enkelt kald ikke bør bruge hele den afgrænsede tur uden gemt
  fremgang. Nye payloadfri startlinjer gør nul-fremgang efterprøvbar.
- Giver kun den beskyttede scorecheckpointfunktion en afgrænset
  30-sekunders databasegrænse via ny append-only migration.
- Ingen ændring af scoreformel, vejrprioritet, vandstandens DMI-only-regel,
  kystgeometri, adgang til private data eller tom-værdi-reglen.
- Copernicus' faktiske nye bidrag, Open-Meteos 5.501 havstrømsrester,
  DMI-andel, øvrige vejrtyper og cache-/deployforløb kræver livebevis.
