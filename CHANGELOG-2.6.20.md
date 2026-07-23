# RavRadar 2.6.20

## PWA-opdateringer

- Viser versionsnummer i appens footer.
- Registrerer service worker med versionsstyret URL og `updateViaCache: none`.
- Tjekker automatisk efter en ny version ved opstart og når appen bliver aktiv igen.
- Viser banneret **“Ny version af RavRadar er klar – Opdater nu”**.
- Knappen aktiverer den ventende service worker og genindlæser appen én gang.
- HTML bruger network-first, så en gammel appskal ikke fastholder brugeren.
- Gamle app-caches slettes ved aktivering.
- Live vejrdata hentes fortsat uden browsercache og bruger cache som fallback.
