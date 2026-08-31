# Nedlukningscheckpoint – RavScore state 6 – 2026-08-31 06:34 CEST

## Status

Dette er et permanent, lokalt WIP-checkpoint før planlagt computernedlukning. Det er **ikke releaseklart**, må ikke merges eller deployes som det står, og er oprettet for at sikre, at intet arbejde går tabt.

Branch: `codex/ravscore-first-cutover-cold-start`.

Seneste allerede committed modelarbejde før dette checkpoint:

- `ebf05cff` – samlet integreret RavScore state 6-kandidat.
- `5c119c32` – dokumenteret integration af seneste verificerede main-ancestry.
- `947554c4` – forward-port af den produktionsverificerede, statefrie trip-storage-retry.

Den offentlige model er fortsat Candidate G. Dette checkpoint aktiverer eller publicerer ikke state 6.

## Sikret i checkpointet

- Workflowmonolitten er lokalt opdelt i controller, reusable weather-build og reusable Pages-deploy.
- Central releasekontraktmetadata og modelbindingsmetadata er tilføjet.
- `version.json` er ottende bindingsforbruger.
- Candidate G-rollbackbindingen er regenereret som 55-filers bundle:
  - kontrakt `c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8`
  - bundle `dcbd8d72aa9794dc7dc24eae52f23d25914af61a49c5fcd73742818f4ca77bb4`
- Pages-privacygaten accepterer kun eksakt integreret eller eksakt Candidate G-rollbackbinding fra manifestet og afviser mixed/unknown binding.
- De 10 Markdown-filer, som midlertidigt blev afkortet ved en lokal redigeringsfejl, er genoprettet fra `947554c4`. Byte-/diffkontrol beviste genopretningen, hvorefter kun de kendte 8-forbruger-, 55-filers- og PR #237-statusrettelser blev genanvendt.
- Ingen syntetisk historik, interpolation af det gamle driftshul eller Feggesund-nabolån er genindført.

## Kontrol udført før nedlukning

Grønne målrettede kontroller rapporteret og/eller genkørt i dette arbejdsafsnit:

- parsing af alle tre workflowfiler;
- exact job-body/step-order-sammenligning mod den tidligere monolit;
- reusable workflow interface/failure-test;
- production outcome;
- RavScore dispatch;
- operational Pages recovery;
- release-contract metadata;
- release-version;
- Pages artifact privacy;
- protected handbook merge;
- modelbindingssynk;
- scoped `git diff --check` efter Markdown-genopretningen.

Seneste observerede automatiske Candidate G-produktion `33355833084` på main `8c03e25d` sluttede grønt med fuld vejrbygning, validate, releasegate, artifact og Pages-deploy. Det er driftsbevis for Candidate G, ikke state-6-releasebevis.

## Kendte åbne punkter

1. `test-workflow-validation-order-4.0.108.mjs` kender endnu ikke de to nye reusable workflowfilnavne. Det er den eneste kendte røde måltest i workflow-splitten.
2. De øvrige scripts, som historisk læser kun `.github/workflows/update-and-deploy.yml`, skal migreres rollebevidst til controller/build/deploy-kilder. Positive assertions må ikke baseres på naiv tekstsammenkædning.
3. `release-gate.mjs` skal færdiggøre samme rollebevidste opdeling.
4. Arkitekturgælden må først markeres lokalt lukket, når inventory/consumer-migreringen og relevante måltests er grønne.
5. Hele modelhelheden skal derefter genreviewes samlet: fysik/last mile, konservativ `HISTORY_INCOMPLETE`, nøddrift, migration, rollback, producent-/forbrugermatrix, privacy og geodatabevis.
6. Fuld `validate:source` skal køres én gang på PR'ens eksakte head i GitHub. Derefter følger sikker merge, frisk produktion og offentlig desktop-/mobilverifikation.

## Sikkerhedsgrænser

- Ingen private payloads, koordinater, rå U/V eller credentials er skrevet i checkpointet.
- Ingen geometri, zoner eller land-/vandpunkter er ændret.
- Intet i dette lokale WIP-checkpoint er pushet, merged eller deployet.
- Alle subagenter er afsluttet; der er ingen kendt aktiv lokal test- eller skriveproces.

## Præcis genoptagelse

1. Læs AGENTS.md og den obligatoriske RDKS-startkæde.
2. Læs dette checkpoint og kontroller branch/HEAD/status.
3. Kør ikke fulde tests først; luk inventory/consumer- og releasegate-migreringen med måltests.
4. Opdater aktiv RDKS/håndbog uden at ændre historiske 4.0.317-hashes.
5. Kør samlet slutreview og derefter den ene bindende exact-head-kæde.
