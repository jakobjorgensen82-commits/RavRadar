# RavRadar 4.0.2

## DMI ecCodes-kompatibilitet og fejlsynlighed

- Retter ecCodes Python API-kaldet fra den ikke-eksisterende `codes_get_element` til `codes_get_elements(..., [index])[0]`.
- Tilføjer en rigtig ecCodes-smoketest efter installationen i GitHub Actions.
- Opstarts- og importfejl skriver nu `status=failed` og fejltekst til GitHub-output i stedet for `unknown`.
- Fejl vises i workflowrapporten og step summary.
- DMI-scriptet returnerer en reel fejlkode ved fatal opstartsfejl, mens workflowets fallback fortsat bevarer gamle DMI-data og Open-Meteo.
