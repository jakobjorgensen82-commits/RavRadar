# 4.0.457 – genbinding af den faktiske beskyttede runtime

## Hvad der blev rettet

- Code-only-run `35730421484` kom igennem migration og database-readback, men
  stoppede korrekt, fordi den gemte predecessor-runtime ikke matchede den
  forældede identitet, der stadig stod i genbindingskoden.
- Den beskyttede predecessor er nu samlet opdateret til den faktisk gemte og
  offentligt verificerede generation `rr-20260921170645-210` fra source
  `a6d89798…`, inklusive integrated-/Candidate G-bundles og contract-hashes.
- Kontrollen er stadig fastlåst og fail-closed; den accepterer ikke vilkårlige
  runtime-forgængere og ændrer ikke private målinger eller continuation-state.

## Driftsstatus

Den forrige kørsel havde ingen providerkald eller datatab. Næste skridt er en
ny exact-head-kontrol og derefter code-only readback/genbinding på den nye
`main`. Først når den er grøn, genoptages normal vejrdrift fra den gemte
fremgang.

## Ikke ændret

DMI-first-prioritet, fallback, bevarelse af gamle gyldige værdier, MISSING-
semantik, scorematematik, Candidate G-reservens rolle og offentlig UI-adfærd
er ikke ændret.
