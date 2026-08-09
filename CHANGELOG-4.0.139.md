# RavRadar 4.0.139

- Tilføjer en privat flertidsserie-gate for Blåvands to isolerede kystdele.
- Genbruger produktionens aktuelle native WAM-/DKSS-parser og nearest-valid-cell-regler over flere forecasttrin.
- Kræver mindst to fælles komplette native tidstrin, fuld komponentproveniens samt samme fysiske current-U/V-celle og vertikallag.
- Gemmer kun provenance, tilstedeværelse og kontekstbundne værdihash i det private artifact; ingen rå vejrværdier.
- Aktiverer ikke geometri, sampling, state, part-score, UI, public runtime eller admin-write. Parent-zonen og dens RavScore forbliver autoritative.

Status ved kandidat: lokale self-tests og workflowkontrakt består; privat CI-pilot, artifactreview og normal produktionsverifikation afventer.
