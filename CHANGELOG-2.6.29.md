# RavRadar 2.6.29

## Implementeret

- Administratoradgang vises efter 10 tryk på logoet og korrekt PIN 1931.
- Administrationssiden er sessionslåst og kan ikke åbnes direkte uden først at låse udviklertilstanden op.
- Nyt administratorcenter med fanerne Dashboard, Vejr, Zoner, Regler, Vidensbase, Analyse og System.
- Visning af DMI-dækning, fejlvarighed, alarmkvote, kildefordeling og genereringstidspunkt.
- Visning af vandstandsmetode samt de stationer, afstande og vægte der ligger bag interpolation, når data findes.
- Søgbar zoneliste med kysttype, region, vejrkilde og stationstilknytning.
- Læsbar kontrol af regelmotorens status, type, vidensklasse, tillid, prioritet og version.
- Lokal analyse af observationer, bevarede vejrsnapshots og ravture.
- Pseudonymiseret observationseksport og separat diagnostikeksport.
- Sikker rydning af kun RavRadar-caches; lokale brugerdata slettes ikke.
- Mobilkortet er øget til cirka to tredjedele af skærmhøjden.
- Service worker og versionsnumre opdateret til 2.6.29.

## Bevidst ikke implementeret endnu

- Regler kan ikke ændres permanent fra browseren. Det kræver Supabase Auth, administratorrolle og server-side validering.
- Alarmstatus beregnes, men ekstern alarmkanal som e-mail eller push er ikke konfigureret.
- GitHub Actions-status kan ikke hentes sikkert fra den statiske app uden API-integration.
