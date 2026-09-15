# RavRadar 4.0.367 – central cutover-recovery og sand deployterminal

**Dato:** 2026-09-15
**Status:** Lokal releasekandidat; exact-head PR-gate, merge, manuel code-only-deploy og offentlig verifikation mangler.

## Faktisk fejl

Run `34877443841` publicerede det integrerede Pages-artifact og den private
runtime, men afsluttede ikke den centrale modelovergang. Buildet fortsatte efter
en fejlet privacyaudit og manglende plan, uploadede et ufuldstændigt handoff og
kørte derfor aldrig begin/complete-CAS. Terminalen så kun et grønt Pages-deploy
og en grøn offentlig readback og mærkede fejlagtigt hele installationen grøn.

Central tilstand er fortsat legacy Candidate G uden operationel række. Pages
viser targetmanifest `4254bdb2…` fra `fa418f43`. Det offentlige dataset er
strukturelt 210 zoner/673 dele, men alle aktuelle modes er utilgængelige.

## Rettelse

- Code-only-workflowet opdager kun den eksakte kombination af manglende
  operationel række, legacyprofil og det offentlige targetmanifest fra run
  `34877443841`.
- Recoveryen er fastlåst til repository, run, attempt, head, deployment,
  artifact, digest, størrelse og kanoniske hashes for kilde, attestation,
  verification, targetmanifest, audit, readiness, binding og Pages-seal.
- Det offentlige target verificeres frisk mod det historiske contract, bundle og
  implementation closure. Main genkontrolleres umiddelbart før atomisk central
  version 0→1.
- Efter recovery læses central igen, og det samme code-only-run fortsætter gennem
  den eksisterende historisk-til-aktuel bindingsmigration og deployer 4.0.367.
- Den genbrugelige Pages-terminal kræver nu deploy, offentlig verification,
  checkpoint og handlingens konkrete completion. Kun en udtrykkelig, vellykket
  reconciliation kan erstatte et fejlet completion-led.
- Versionsgeneratoren opdaterer nu kun det aktive bindingsafsnit og bevarer
  historiske RavScore-versioner i begge håndbøger.

## Afgrænsning

Der køres ingen DMI-, Copernicus- eller Open-Meteo-hentning, ingen oneoff og
ingen gentagelse af det gamle cutover. PR-headens ene grønne sourcegate
genbruges efter merge. Først efter central og offentlig 4.0.367-verifikation
startes normal weather separat og tidsbegrænset for at bevise numeriske scorer,
rotation og cachevedligeholdelse.

Se DEC-0149.
