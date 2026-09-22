# DEC-0232 – Selvstændig vejrkæde og append-only backend-reparation

**Status:** Aktiv implementering i 4.0.455; livebevis afventer
**Dato:** 2026-09-22

## Problem

Normalrun `35703630226` gennemførte leverandør- og cachetrinene, men stoppede
ved den integrerede backend-readback. Code-only-run `35706883724` reproducerede
samme fejl uden providerarbejde: Supabase' tre trip-policy-funktioner havde en
anden definition end repositoryets kendte binding. Samtidig viste en release-
kontrol, at den seneste fælles recovery-ændring ikke var ført gennem den
genererede Candidate G-bundle og checkpoint-CAS-bindingen.

## Bindende rettelse

- Historiske Supabase-migrationer må ikke ændres. En ny append-only migration
  `20260922100000_integrated_trip_binding_repair.sql` genindsætter de tre
  trip-policy-funktioner med de aktuelle modelhashes og den aktuelle
  checkpoint-CAS-/continuation-binding.
- Den nye migration er canonical source for mutable `supabase/schema.sql`,
  installationsscriptet og service-readback. Den gamle migration bevares som
  historisk spor.
- Den integrerede vejrworkflow udfører backend-readback før DMI, Copernicus og
  Open-Meteo. En forkert binding stopper tidligt og entydigt; en grøn binding
  går videre gennem eksisterende retry, checkpoint, cache, artifact og deploy.
- Candidate G forbliver inaktiv. Bundle-regenereringen er kun en mekanisk
  konsistensrettelse af en fælles recovery-afhængighed; den aktiverer ikke
  modellen og ændrer ikke scoreformlen. Den isolerede reservekontrakt bærer
  også den fælles 118-timers leveringshorisont, så en kandidat-stage ikke
  fejler på en integreret-only eksport.
- Statiske UI-orakler skal følge den aktuelle kode, og manifestets statiske
  kerne skal kontrolleres separat fra den dynamiske leveringsoversigt.
- Den tidlige kildegate forbliver fem afgrænsede kildegrupper med 29 direkte
  kommandoer inklusive bindingernes forhåndskontrol; den historiske fulde
  validate-/release-suite hører ikke hjemme dér.

## Drift uden Codex

GitHub Actions og cron er den selvstændige driftsmotor. Codex må bruges til
udvikling og analyse, men runtime må ikke kræve Codex til overvågning,
genstart eller manuel fejlretning. Checkpoints og retry skal gøre normal
vedligeholdelse genkørbar; datatab, forkert binding, ugyldigt artifact og
sikkerhedsfejl er fortsat reelle stop.

## Verifikation

Målrettede UI-, release-, migrations- og installkontroller er grønne. Windows-
lokal readiness-test kan ikke starte sin underproces i den begrænsede sandbox
(`spawnSync`/EPERM); samme testkæde skal verificeres på exact-head i GitHub.
Først derefter køres én normal vejrkørsel fra gemt fremgang og følges af cron-
bevis for selvstændig cachevedligeholdelse.
