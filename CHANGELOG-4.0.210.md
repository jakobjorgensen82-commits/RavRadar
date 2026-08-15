# RavRadar 4.0.210

- Kræver sammenhængende DMI-komponentdækning fra den aktuelle byggetid i stedet for kun et sent sluttidspunkt.
- Fjerner den falske komplette status for 200 hovedzoner med strømdata alene langt ude i prognosehalen.
- Prioriterer de relevante `dkss_idw`- og `dkss_nsbs`-kørsler til målrettet genhentning.
- Bevarer missing som missing og ændrer ingen kilde, fallback, RavScore eller mobiliseringstærskel.
- Tilføjer regression for fjern hale, interne huller, nuller og native cadence.
