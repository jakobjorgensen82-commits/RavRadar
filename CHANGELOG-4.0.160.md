# RavRadar 4.0.160

- Tilføjer en fail-closed privat flertrinsvalidator for alle 774 nationale kystdelsidentiteter.
- Kræver mindst to komplette native tidstrin for hver faktisk tilgængelig WAM-/DKSS-familie; de 22 kendte familiegab forbliver missing.
- Kræver samme fysiske gridpunkt og vertikallag for current-U/V samt korrekt provider, collection, modelrun og native tid.
- QA-rapporten gemmer kun tilstedeværelse, kontekstbundne digests og provenance, aldrig rå vejrdata.
- State, RavScore, UI, admin, Supabase og offentlig runtime forbliver uændrede og deaktiverede.
