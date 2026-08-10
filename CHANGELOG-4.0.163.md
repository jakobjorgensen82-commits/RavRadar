# RavRadar 4.0.163

- Registrerer #2152 som privat CI-bevis for 770 isolerede `shadow-v2`-historikker og fire eksplicitte current/state-gab.
- Tilføjer en særskilt native HARMONIE-vindgate for alle 774 scorekandidater.
- Kræver mindst to komplette forecasttrin med wind-U/V fra samme fysiske gridcelle samt fuld DMI-provenance.
- Rapporten gemmer kun digests og provenance; ingen rå vindværdier, parentfallback, interpolation, state, score eller public runtime aktiveres.
