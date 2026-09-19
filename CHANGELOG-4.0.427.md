# RavRadar 4.0.427

## Rettet

- En gyldig 673-dels operationel strømpakke kasseres ikke længere, fordi en
  separat valgfri historik- eller referencedel er ugyldig.
- DMI-current behandler reelle huller fra den tidligste manglende time fremad,
  før scalar-only vedligeholdelse og refresh.
- Det kritiske HARMONIE-forsøg afgøres af eksakt vind på produktionstimen og
  bruger et smalt katalogopslag på netop denne time.
- En nyere privat runtime kan sikkert afløse en strukturelt gyldig generation
  med historisk modelbinding. Samme-time-konflikt og tidsregression stoppes
  fortsat.

## Produktionsbevis

4.0.426-run `35405307261` byggede 673/673 aktuelle strømdele før adapteren,
men endte med 56 i scoreinputtet og stoppede før privat publicering/deploy.
Det havde også 1.122 manglende fremtidspar af 79.414. 4.0.427 skal derfor
bevises i én almindelig weather med aktuel score, deploy og fuld gyldig
vejrdækning. `MISSING` er robusthed, ikke komplethed.

RavScore-formel, vægte, geometri, land-/vandpunkter og providerorden er
uændrede. Append-only migration
`20260919010000_current_input_foundation_binding.sql` binder de nye
model-/continuation-identiteter uden at ændre forgængermigrationen. Se DEC-0207.
