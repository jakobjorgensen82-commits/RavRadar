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
- 4.0.207 er fortsat produktionsverificeret baseline, indtil den friske 4.0.208-kæde er grøn.
