# RavRadar 4.0.425

## Rettet

- Normal drift genkender nu `integrated-historical-maintenance` efter tre
  afviste private runtime-generationer.
- Den historiske integrated-vedligeholdelse må kun fortsætte uden runtimebundle,
  når det eksisterende schema-6-checkpoint er aktuelt og består den fulde
  struktur-, integritets-, modelbindings-, 673-dels- og tidsvalidering.
- Et manglende, udløbet, fremtidigt, beskadiget eller inkompatibelt checkpoint
  stopper før providerarbejdet.

## Uændret sikkerhed og produkt

- Stateless cold start er fortsat kun tilladt for exact aktiv `integrated`.
- Candidate G, første cutover, retur og ukendte handlinger åbnes ikke.
- RavScore-formel, vejrdata, geometri, providerprioritet og rotation er uændrede.
- `MISSING` er fortsat lokal robusthed og tæller aldrig som komplet data.

## Produktionsbevis

Efter exact-head, merge og deploy køres én almindelig weather, ikke oneoff.
Den skal bevise providerfremgang, fuld gyldig datadækning, Feggesund 354/354,
aktuel time, scorer og efterfølgende normal cachevedligeholdelse.
