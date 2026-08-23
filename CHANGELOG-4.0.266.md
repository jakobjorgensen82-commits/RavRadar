# RavRadar 4.0.266

- Retter den virkelige magic-link-retur: Supabases standardadresse og tilladte redirect peger nu på RavRadars aktuelle GitHub Pages-adresse i stedet for localhost.
- Installerer den manglende produktionskolonne `data_quality_flags` og den private RLS-læseregel for brugerens egne observationer.
- Bevarer én `observations`-række pr. tur. Ingen ny logtabel, dubletpost eller kopi oprettes, og eksisterende ture ændres eller slettes ikke.
- Bevarer den lokale leveringskø, så en allerede afventende efterregistrering prøves igen med samme klient-id ved næste sideindlæsning.
- Erstatter den tekniske brugerfejl om Supabase med en enkel besked om, at RavRadar ikke kunne hente de gemte ture lige nu.
- Tilføjer en versionsstyret, idempotent migration og en regressionstest, der kræver kolonne, privat SELECT-policy, tabelgrant og PostgREST-schemaopdatering uden dataændrende SQL.
- Dokumenterer, at Supabases Site URL og redirect-liste skal ændres samtidig med flytningen til `https://ravradar.dk/`.
- Candidate G, `20/50/30`, vejrdata, geometri, land-/vandpunkter, artifact, protected-dirty-data og private caches er uændrede. I `data/kystdata.json` og `data/zones.geojson` ændres kun versionsfeltet til 4.0.266.
- Central auth-konfiguration og databasemigration er rettet og read-only efterkontrolleret. Exact-head, merge, frisk produktion og den afsluttende interaktive login-/turlogprøve afventer.
