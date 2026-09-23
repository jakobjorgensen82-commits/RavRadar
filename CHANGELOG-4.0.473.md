# RavRadar 4.0.473 – præcis, privatlivssikker checkpointdiagnose

Den seneste providerfri 4.0.472-levering genbrugte aktuel privat vejrpakke,
men databasen afviste fortsat den beskyttede scorehistorik. Alle 673
integrerede kystdele havde en sidste evidensrække, så den hidtidige
forklaring var ikke den udløsende livefejl.

4.0.473 tilføjer en ny append-only, skrivefri databasefunktion og en
snæver klient, der kun efter afvisning viser faste regelkoder og antal.
Private vejrværdier, kystdele, tider og nøgler logges ikke. Eksisterende
score, CAS-kontrol, vejrdata, leverandørvalg og geometri ændres ikke.

Efter præcis diagnose skal den beviste afvisning rettes; derefter følger
én normal vejrkørsel med før/efter for hver vejrtype og leverandør.
Se DEC-0244 og aktivt roadmap. Produktionsbevis afventer.
