# RavRadar 4.0.139

- Tilføjer en privat flertidsserie-gate for Blåvands to isolerede kystdele.
- Genbruger produktionens aktuelle native WAM-/DKSS-parser og nearest-valid-cell-regler over flere forecasttrin.
- Kræver mindst to fælles komplette native tidstrin, fuld komponentproveniens samt samme fysiske current-U/V-celle og vertikallag.
- Gemmer kun provenance, tilstedeværelse og kontekstbundne værdihash i det private artifact; ingen rå vejrværdier.
- Aktiverer ikke geometri, sampling, state, part-score, UI, public runtime eller admin-write. Parent-zonen og dens RavScore forbliver autoritative.

Produktionsverificeret: privat pilot #1997 bestod med fire fælles komplette native tider pr. del og 48 komponentposter med fuld DMI-proveniens, korrekte gridpunkter, nul interpolation/fallback, korrekt U/V-parring og forskellige celler mellem delene. Artifactet har ingen rå værdifelter eller credentialbærende URL. Normal produktion #1996 bestod central adminsync, frisk DMI/vejr, fuld Linux-validate, release-gate, Pages-artifact og deploy på `f94620f`; offentlig `version.json` viser 4.0.139.
