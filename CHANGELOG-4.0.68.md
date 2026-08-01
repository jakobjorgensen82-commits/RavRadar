# RavRadar 4.0.68

## Rettet
- Admin kunne ikke starte på GitHub Pages, fordi deploy-workflowet udelukkede `js/services/handbook-review-store.js`, selv om `admin-dashboard.js` importerede filen.
- Filen publiceres nu som almindelig klientkode. Den indeholder ingen hemmelige nøgler eller beskyttede dokumentdata; adgang til reviewdata håndhæves fortsat af Supabase-session og RLS.

## Forebyggelse
- Ny Pages-modullukningstest bygger det faktiske deploy-artifact og følger alle statiske JavaScript-importer fra `index.html` og `admin.html`.
- Releasen stopper, hvis et importeret browsermodul mangler i artifactet.
- Release Gate forhindrer fremover, at `handbook-review-store.js` fejlagtigt udelukkes igen.
