# RavRadar 3.1.3

- Aktuel vandstand kommer nu fra DMI oceanObs, også når DMI ForecastEDR svarer HTTP 429.
- En zone tæt på en DMI-station bruger stationen direkte.
- Zoner uden lokal station bruger højst to stationer: én på hver side langs den samme sammenhængende kystkorridor.
- Stationer i fjorde eller på andre kystgrene udelukkes, hvis de ikke ligger tæt på zonens kystkorridor.
- Diagnosen viser metode, side, kystafstand, rå stationsværdi, vægt og om observationen bruges i visningen.
- DMI-model/Open-Meteo beholdes som prognosekilder; den aktuelle viste vandstand er DMI-målt/interpoleret.
