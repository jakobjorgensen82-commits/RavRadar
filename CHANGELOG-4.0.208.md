# RavRadar 4.0.208

## Lokal validering

- Skelner nu et udløbet lokalt vejrsnapshot fra en aktuel zone-/vejrdækningsfejl.
- Bevarer fail-closed: manglende, ukendte eller atomisk mismatchede zone-/vejrdatasæt stopper fortsat valideringen.
- Tilføjer `npm run audit:deployed-zone-weather`, som uden skrivning sammenholder den deployede zonebestand og det offentlige vejrdatasæt og kontrollerer de tre Vadehavszoner eksplicit.
- Tilføjer en eksplicit vejrhyrderingskommando med base-URL-argument; den ændrer ikke central adminstatus eller tombstones.

## Dokumentation

- Retter den historiske 211-zoneformulering: den effektive centrale produktion har 210 hovedzoner efter sletning af Fejø/Femø og Havnø/Mariager Fjord øst.
- Opdaterer RDKS, roadmap, begge håndbøger, kendte issues og sessionshandoff med forskellen mellem rå repositorydata, central admin-sandhed og deployet runtime.

## Produktpåvirkning

- Ingen ændring af zoner, geometri, DMI-kilder, RavScore eller offentlig UI-adfærd.
- 4.0.208 er produktionsverificeret i GitHub Actions #31848912461 på commit `7a3382f200a72b702d814ba4d8ca205dc4523369`: central adminhydrering/tombstones, frisk vejrbygning, fuld validering, releasegate, Supabase, artifact og deploy bestod. Direkte efterkontrol viste version 4.0.208, datasæt `rr-20260814230422-210`, 210/210 og alle tre Vadehavszoner med vejrdata.
