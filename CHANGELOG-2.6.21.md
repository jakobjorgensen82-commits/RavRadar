# RavRadar 2.6.21 – sikker brugerdata ved opdatering

- Service workeren sletter nu kun gamle caches med RavRadars eget `ravradar-app-`-prefix.
- Andre caches, IndexedDB og localStorage berøres ikke af app-opdateringen.
- RavRadar-data i localStorage sikkerhedskopieres løbende til den separate IndexedDB-database `ravradar-userdata`.
- Ved opstart gendannes manglende RavRadar-nøgler automatisk fra den seneste lokale sikkerhedskopi.
- Eksisterende fund, ravture, aktiv tur, konto/session og brugerindstillinger bevares.
- Appversion opdateret til 2.6.21.
