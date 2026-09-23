# RavRadar 4.0.474 – afgrænset checkpointdiagnose

Den skrivefri databasefunktion i 4.0.473 blev installeret, men et
diagnosekald med hele den private historik gav kun `UNAVAILABLE`.
4.0.474 bruger den samme funktion i portioner på højst 32 kystdele
og summerer alene faste regelkoder og antal. Transport- og svarfejl
får en ufølsom fejlklasse. Ingen privat payload logges.

Score, vejrdata, kildeprioritet, cache, databaseaccept og geometri
er uændrede. Næste korte forsøg genbruger samme private vejrpakke;
normal vejrhentning følger først efter den beviste stopfejl er rettet.
Se DEC-0245 og det aktive roadmap.
