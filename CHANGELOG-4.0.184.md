# RavRadar 4.0.184

- Genopretter den tydelige forklaring af, hvilken lokal kystdel der leverer en hovedzones viste RavScore.
- Bevarer syvpunktsreglen: forskel på højst 7 point vises som hele zonen; først ved mere end 7 point fremhæves én eller flere bestemte dele.
- Viser navn og score for den bedste del og gør klart, når resten af zonen scorer lavere.
- Fører vinderens delscorer og faglige begrundelser videre til zonepanelet, debug, assistent og observationssnapshot.
- Bruger samme lokale resultatbygger i aktuel zonevisning og femdøgnsvisning.
- Ændrer ingen RavScore-regler, vægte, geometri, land-/vandpunkter eller DMI-routing.
- Produktionsverificeret i GitHub Actions #31575562432. Den offentlige runtime viser 4.0.184 og leverer for Reersø og Mullerup både score 78, vinderen Mullerup Klint og komplette delscorer/forklaringer.
