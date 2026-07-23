# RavRadar 2.5.2

- Fjerner teksten “Ingen billeder” robust, også når den indsættes dynamisk.
- Ny service-worker-cache og network-first for HTML, CSS og JavaScript, så gamle grænseflader ikke hænger fast.
- Vejrdata genereres og deployes direkte i GitHub Actions uden automatisk commit til `main`.
- Dermed undgås de gentagne merge-konflikter i `data/live/conditions.json`.
- GitHub Pages deployes fortsat kun gennem GitHub Actions.
