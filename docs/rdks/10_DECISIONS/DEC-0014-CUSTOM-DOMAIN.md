# DEC-0014 – ravradar.dk som brugerens produktadresse

- **Status:** Planlagt og aktiv arkitekturretning
- **Besluttet:** 2026-08-01

## Beslutning
Brugerne skal på sigt benytte `https://ravradar.dk`. GitHub Pages må fortsat være hosting- og deploymentplatform, mens Supabase er backend.

## Krav
- Appen bruger relative URL'er og må ikke afhænge af GitHub-repository-stien.
- Custom domain aktiveres først, når DNS, HTTPS og Supabase redirect-URL'er er klar.
- Både `ravradar.dk` og eventuelt `www.ravradar.dk` skal have en bevidst canonical-/redirectstrategi.
- Service worker, manifest, login, admin og datakald regressionstestes på eget domæne.
- Den gamle GitHub Pages-adresse bevares som teknisk fallback eller viderestilles kontrolleret.
