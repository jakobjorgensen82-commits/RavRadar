# RavRadar 4.0.261

- Aktiverer `RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3` som RavRadars samlede offentlige scoreprofil med vægtene `20/50/30`.
- Tillader den udtrykkeligt ejer-godkendte, ikke-offentlige opvarmningsperiode, mens den faste 48-timers transporthukommelse endnu er ufuldstændig; den faktiske status forbliver synlig som `candidate-active-pre-public-warmup` og `WINDOW_INCOMPLETE`.
- Kræver fortsat beregnelige Candidate G-resultater for alle 673 kystdele, alle produktionstimer og begge jagtformer. Én manglende projektion udløser samlet fail-closed rollback uden blandede profiler.
- Bevarer `RRS-CURRENT-B0-4.0.247` med `25/40/35` som eksakt, øjeblikkelig global rollbackprofil.
- Gemmer det versionsbundne profilvalg i det private centrale admin-dokument `ravscore-profile-selection`, hvor automatisk modelaktivering fortsat er forbudt.
- Opdaterer den dataminimerede 210/673-shadow til at kontrollere, at offentlig score, zonefarve og bedste tidspunkt bruger Candidate G, uden rå strømvektorer, koordinater eller private payloads.
- Registrerer ejerbeslutningen i DEC-0060 samt aktiv RDKS, håndbog og changelog.
- Ændrer ikke artifact, protected-dirty-data, privat cache, geometri, land-/vandpunkter, bundmodel eller sikkerhedsbetydning. I `data/kystdata.json` og `data/zones.geojson` ændres kun versionsfeltet til 4.0.261.
