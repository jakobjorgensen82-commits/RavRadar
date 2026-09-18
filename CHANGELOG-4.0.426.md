# RavRadar 4.0.426

## Rettet

- Normalrun `35403510608` beviste, at hverken GitHub-cache eller beskyttet
  Supabase havde et schema-6-checkpoint.
- `integrated-historical-maintenance` kan nu bruge den eksisterende afgrænsede
  48-timers measured state-less recovery, når checkpointfilen reelt mangler.
- En checkpointfil, der findes, valideres fortsat fuldt. Udløbet, fremtidig,
  beskadiget eller inkompatibel state stopper og maskeres aldrig som fravær.

## Uændret sikkerhed og produkt

- Recovery gælder kun den allerede centralt aktive integrerede model og dens
  midlertidige samme-model historical-maintenance-reseal.
- Candidate G, første cutover, retur og ukendte actions åbnes ikke.
- Der opfindes ingen vejrhistorik; ukendte målte positioner forbliver ukendte.
- RavScore-formel, vejrlogik, geometri, providerprioritet og rotation er
  uændrede.
- `MISSING` er kun lokal robusthed og tæller aldrig som komplet data.

## Produktionsbevis

Efter exact-head, merge og deploy køres én almindelig weather, ikke oneoff.
Den skal gemme en ny privat runtime og checkpoint samt bevise providerfremgang,
100 % gyldig datadækning, Feggesund 354/354, aktuel time, scorer og normal
cachevedligeholdelse.
