# RavRadar 4.0.142

- Tilføjer en privat Blåvand-specifik central admin-roundtrip og rollback-gate.
- Skriver kun et unikt midlertidigt, aldrig aktivt kladdedokument; det læses, opdateres, slettes og verificeres fraværende.
- Hash og versionskontrol skal bevise, at runtime-dokumenterne `coastline-overrides` og `direction-reviews` er helt uændrede.
- Ingen geometri, sampling, state, offentlig UI, adminændring eller RavScore aktiveres.
- Verificeret i privat pilot #2014 og fuld produktion #2013. Kun eksplicit ejer-go/no-go kan åbne en senere aktivering.
