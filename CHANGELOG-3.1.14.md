# RavRadar 3.1.14

## Rullende DMI-cache

- DMI-opbygningen arbejder nu med op til 20 prioriterede zoner pr. central kørsel i stedet for kun 2.
- Zonecursoren fortsætter fra sidste forsøg, så de samme zoner ikke vælges igen og igen.
- Manglende eller snart udløbende prognoser prioriteres først.
- DMI-requestbudgettet er hævet til 90 kald, så en fuld pulje kan hente vind, bølger og havmodel.
- HTTP 429 stopper fortsat DMI-hentningen straks og gemmer cooldown til næste kørsel.
- Gyldige DMI-prognoser beholdes i cachen indtil deres reelle prognoseudløb.
- Diagnostikken viser nu strategien `rolling-cache-warmup` og cachepolitikken `until-forecast-expiry`.
- Adminpanelet kalder nu processen “Rullende DMI-opbygning”.
