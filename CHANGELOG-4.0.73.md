# RavRadar 4.0.73

## Samlet stabilitets- og diagnostikrelease

- Ekspertreview sender nu `created_by` eksplicit, viser Supabases fulde fejltekst og kan arbejde med ældre installerede skemaer uden at kræve ny opsætning.
- Systemtesten bruger en gyldig reviewstatus (`reviewing`) og rydder testposten. Hvis den eksisterende RLS-installation ikke tillader DELETE, arkiveres posten tydeligt i stedet for at efterlade en skjult fejl.
- Ny idempotent Supabase-migration kan give owner/full_admin sikker DELETE-adgang til reviewoprydning. Den ændrer ikke URL, nøgler, brugere eller øvrig opsætning.
- Vandstandsstationers historik bevares ved hydrering. En nyere, men fattigere stationsfil må ikke slette kendte stationer eller tidligere leveringshistorik.
- Kørsel uden ny observationshentning bruger kun cache til at bevare livscyklus og må ikke nulstille stationer til “aldrig leveret”.
- DMI-status i admin skelner nu mellem brugbar brugerprognose, fuld DMI-komponentdækning, observationsstatus og cacheanvendelighed.
- Den samlede sitetest åbner aktive adminfaner, kontrollerer kritiske ressourcer direkte og skelner mellem fejl og performanceadvarsler.
- Performancekontrollen navngiver langsomme ressourcer og bruger eksplicitte startup-mærker for zoner, manifest, conditions, zonefarver, rangliste og prognose.
- Diagnostikeksporten viser nu shipped, admin-, aktive og kladderegler særskilt i stedet for et uklart enkelt tal.
