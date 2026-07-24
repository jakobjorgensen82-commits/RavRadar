# RavRadar 2.6.28 – regelmotor, snapshots og driftskontrol

Faktisk implementeret i denne version:

- kørbar regelmotor med geografi, betingelser, prioritet, bonus/penalty, gate og override
- tests af regelmotoren
- uforanderligt, versionsmærket vejrsnapshot på hver observation, inklusive score og matchede regler
- administrator-kontrolcenter (`admin.html`) med DMI-status, kildefordeling, alarmkvote, regler og lokal observationseksport
- central `weather-health.json` med højst to alarmmarkeringer pr. 24 timer
- validering af weather-health-filen
- rettelse af en fejl i Open-Meteo-prognosen, hvor en ikke-defineret stationsværdi blev brugt
- versionsløft til 2.6.28 i app, cache og GitHub Actions

Begrænsning:

- Kontrolcenteret viser og eksporterer data, men produktionssikre administrative skrivehandlinger kræver fortsat Supabase Auth og server-side roller.
- Selve udsendelsen af administratorbeskeder kræver en valgt kanal (for eksempel e-mail eller GitHub Issue). Denne version beregner og begrænser alarmbehovet, men sender ikke beskeder eksternt.
