# RavRadar 4.0.263

- Retter 4.0.262's profilgate, som fejlagtigt lod et senere hul i femdøgnsprognosen slå den sammenhængende aktuelle Candidate G-opvarmning fra.
- Binder `candidateMemoryReady` og `candidateWarmupEligible` til den nærmeste fælles aktuelle referencetime i hver zone. Hele femdøgnets Candidate G-scorecoverage kræves fortsat.
- Bevarer global fail-closed rollback, hvis den faktisk valgte aktuelle referencetime mangler, har missing evidens eller har et tidsgab over tre timer.
- Bevarer prognosehullers lokale fail-closed stateadfærd: der opfindes ingen strøm, og det brugbare suffix starter igen fra den faste rand.
- Dokumenterer 4.0.262-produktion `32642532892`: cadence-replayet var korrekt med 673/673 accepterede states, nul replaymismatch, 110 positive og 563 fysisk fortsat nul, men profilen rullede tilbage til legacy på grund af den for brede gate.
- Målrettede regressionstests samt samlet lokal source-/RDKS-/releasegate er grønne for 4.0.263.
- Ændrer ikke Candidate G's `20/50/30`, strømgrænser, +10/-8-/13-timersregler, mobilisering, jagtbarhed, geometri, land-/vandpunkter, artifact, protected-dirty-data eller private caches. I `data/kystdata.json` og `data/zones.geojson` ændres kun versionsfeltet til 4.0.263.
