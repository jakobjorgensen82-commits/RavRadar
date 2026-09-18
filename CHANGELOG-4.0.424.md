# Changelog 4.0.424

4.0.423 blev merged som main `8718c1ec`, bestod exact-head sourcegate, og
backendrun `35400575522` installerede append-only migration `20260918190000`
samt verificerede Supabase, D1, Edge og den beskyttede integrated-readiness.

Det første almindelige normalrun `35400832705` stoppede før et eneste
providerkald. Begge gemte private runtime-generationer var korrekt bundet til
den tidligere kontrakt og blev afvist som inkompatible. Workflowet stoppede
imidlertid i restore-trinnet, før det nåede den allerede definerede målte
stateless recovery for en aktiv integreret model.

4.0.424 beholder tre restoreforsøg. Hvis og kun hvis den centralt aktive
handling er `integrated`, fortsætter manglende kompatibel privat runtime til
den eksisterende stateless recovery og bygger derefter en ny kontraktbundet
runtime fra de gyldige vejr- og checkpointkilder. Første cutover, Candidate G
og alle andre handlinger forbliver fail-closed. RavScore, vejrdata, geometri,
providerprioritet og rotation ændres ikke.
