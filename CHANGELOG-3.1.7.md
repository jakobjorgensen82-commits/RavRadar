# RavRadar 3.1.7 – robust DMI acquisition

- Bevarer DMI-prognoser mellem kørsler i stedet for at genopbygge en tom cache.
- GitHub Actions gendanner og gemmer `dmi-forecast-cache.json`, `conditions.json` og `weather-health.json` mellem planlagte kørsler.
- Vedvarende zonerotation sikrer, at de samme første zoner ikke vælges hver gang.
- HTTP 429 og `Retry-After` gemmes på tværs af kørsler.
- Maksimalt to live-zoner og otte faktiske DMI-requests pr. kørsel som standard.
- DMI-cache checkpointes atomisk efter live-forsøg.
- Gyldig DMI-cache tæller nu korrekt som DMI-dækning i weather health.
- Udløbne cacheposter påvirker ikke længere minimumsdækningen.
- Ny funktionel test: `test-dmi-acquisition-resilience.mjs`.
