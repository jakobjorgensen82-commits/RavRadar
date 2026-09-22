# RavRadar 4.0.453

## Rettet

- Normal integreret RavScore-recovery accepterer nu verificerede bølge-
  komponenter fra den allerede godkendte Copernicus/Open-Meteo-reservebank,
  når sted, time, komponent og record-id er bundet præcist.
- Den eksisterende Feggesund-proxy kan fortsat bruges efter sit eget
  kryptografiske proxybevis.
- Candidate G's særlige historiske wave-bridge er fortsat direkte DMI-only;
  fallbackdata kan ikke skjule et manglende migrationsbevis.

## Livefund

Normalrun `35695267017` fejlede efter leverandørkæden i den integrerede
cachebygning. Fejlen var ikke Node-hukommelse, men den for snævre replay-
klassifikation `RAVSCORE_RECOVERY_REPLAY_WAVE_UNVERIFIED`. Den gemte private
vejrprogression bevares og skal genbruges af næste normale run.

## Målrettet verifikation

- `node scripts/test-ravscore-recovery-replay.mjs`
- `node scripts/test-ravscore-production-adapters.mjs`
- `node --check scripts/lib/ravscore-recovery-replay.mjs`
- `git diff --check`
