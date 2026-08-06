RAVRADAR – GITHUB PAGES MIKROTEST

Formål
------
Denne patch tilføjer kun workflowet:
.github/workflows/pages-microtest.yml

Den ændrer ikke RavRadar-koden, data, RavScore eller versionsnummeret.
Workflowet starter kun manuelt.

Sådan bruges den
----------------
1. Pak ZIP-filen ud i roden af den aktuelle RavRadar-projektmappe.
2. Commit og push filen med GitHub Desktop.
3. Gå til GitHub > Actions > GitHub Pages microtest.
4. Vælg Run workflow og start én kørsel.
5. Start ikke det normale vejrworkflow samtidig.
6. Download loggen, hvis testen fejler.

Vigtigt
-------
Hvis testen lykkes, publicerer den midlertidigt en enkel diagnoseside i stedet for
RavRadar. Det er tilsigtet. Derefter kan det normale RavRadar-workflow publicere
RavRadar igen.

Fortolkning
-----------
- Mikrotesten fejler med deployment_queued eller deployment_in_progress:
  Problemet ligger i GitHub Pages/repositoryets Pages-miljø, ikke i RavRadars artifact.

- Mikrotesten lykkes:
  GitHub Pages fungerer, og fejlen skal søges i det normale RavRadar-artifact eller
  i det normale workflows aflevering af artifactet.
