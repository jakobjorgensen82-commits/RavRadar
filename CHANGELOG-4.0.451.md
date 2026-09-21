# RavRadar 4.0.451

## Rettet

- Den seneste normale kørsel stoppede i RavScore-replay, fordi den gamle
  deployede runtime og den nye accepterede DMI-cache havde forskellige gyldige
  strømkomponenter for samme time. Loggen beviser ikke deres modelkørsel eller
  revision; den præcise produktionsårsag er stadig åben.
- Den progressive DMI-cache må nu kun i det kendte
  `deployed-private-runtime` → `progressive-private-dmi`-forløb erstatte en
  ens modelkørsel, når den fælles DMI-vælger beviser en nyere officiel revision
  for alle ændrede native endepunkter. En nyere deployet revision bevares også
  mod en ældre arbejdscache. Strøm og bølger behandles fortsat
  hver for sig.
- Ukendte eller generiske konflikter fra samme eller ikke-sammenlignelige
  modelkørsel stopper fortsat fail-closed.

## Validering

- `scripts/test-ravscore-recovery-replay.mjs` er grøn.
- De målrettede vejrtests for kildevalg, runtime, komponentsammensætning,
  kildealder og versionskonsistens er grønne.
