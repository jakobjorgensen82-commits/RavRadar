# RavRadar 4.0.59

## Release-pipeline og versionsbevarelse

- Rettet kystlinje-generatoren, så regenerering af `data/zones.geojson` bevarer den aktuelle RavRadar-releaseversion.
- Historiske geometrisnapshots må fortsat levere geometri, men må ikke længere nedgradere appens topniveau-version.
- Release Gate valideres nu i samme rækkefølge som GitHub Actions: geometriopbygning, fuld validering og release-gate.
- Bevarer håndbog, RDKS, Supabase-sikkerhed, ekspertrettigheder og domæneberedskab fra 4.0.58.
