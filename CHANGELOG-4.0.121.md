# RavRadar 4.0.121 – workflowoprydning

- Fjernet `.github/workflows/schedule-test.yml`; det var kun historisk diagnostik af GitHub schedule og indgik ikke i den eksternt udløste produktionsplan.
- Fjernet `.github/workflows/pages-microtest.yml`; det var kun en manuel Pages-diagnose og kunne konkurrere med produktionsdeployet om `github-pages`-miljøet.
- Bevaret `.github/workflows/update-and-deploy.yml` som eneste repository-ejede produktionsworkflow.
- Dokumenteret, at `pages-build-deployment` er GitHubs egen Pages-mekanisme og ikke RavRadar-kode.
- Udvidet workflow-kontrakttesten, så uventede YAML-workflows kræver en bevidst kode- og dokumentationsændring.

Ingen ændring af DMI-data, forecastkæde, RavScore, adminlogik eller offentligt UI.
