# RavRadar 2.6.26

- Vandstand bruger nu DMI-stationsobservationer, interpoleret mellem de to nærmeste stationer, når data er tilgængelige.
- Fem-døgns vandstand foretrækker DMI's havmodel; Open-Meteo bruges kun som markeret fallback.
- Central vejropdatering skriver `data/live/weather-health.json` med DMI-dækning, fejlvarighed og alarmstatus.
- Administratoralarm er begrænset til højst 2 beskeder i et rullende døgn.
- Supabase-skemaet indeholder driftsstatus, alarmlog, retentionpolitik og en kontrolleret funktion til sletning af gammel vejrdata.
- Lokal historik kan ryddes med `npm run maintenance:weather`; standard er 90 dage og kan ændres via miljøvariabel.
- Vejrsnapshots knyttet til brugerfund er ikke omfattet af automatisk oprydning.
