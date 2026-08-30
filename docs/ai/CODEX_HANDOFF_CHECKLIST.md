# Codex handoff-checkliste

## Éngangsstart
- Åbn den eksisterende lokale RavRadar Git-mappe; opret ikke et nyt tomt projekt.
- Kontrollér at `git status` viser de forventede dokumentationsændringer, og at `.git` stadig tilhører det eksisterende repository.
- Læs `docs/ai/CODEX_START_HERE.md` og `AGENTS.md` før første kodeopgave.
- Bekræft den aktuelle offentlige produktionssandhed og det aktuelle handoff. PR #233/exact-head `33299676128` blev merged som `63d789a4`; run `33299747300` frigav D1-gaten og startede build, men stoppede før artifact/Pages på manglende gyldig fallback. 4.0.316 gør fallback valgfri for en frisk primary, men er ikke live før fuld post-merge produktion og offentlig current+femdøgnskontrol. Den gamle 4.0.117-bootstrap og rekonstruktionsplanen er historik.
- Kør `npm run validate:rdks`; brug `npm run validate` før første ændringsrelease.
- Den historiske 4.0.117-workflowbypass er lukket; genåbn kun sporet ved konkret regressionsbevis. Kræv fortsat, at ethvert nyt produktionsartifact har `npm run validate` og `npm run release:gate` som faktiske `success` efter frisk data. Topniveauets grønne runstatus alene tæller ikke.

## Ved hver opgave
- Find aktivt RDKS-krav/issue eller registrer det før større implementering.
- Tegn/skriv den relevante runtimekæde og identificér sidste verificerede fungerende tilstand.
- Undersøg git diff og relevante historiske commits ved regressioner.
- Ret årsagen minimalt og tilføj/adaptér kontrakttest uden at hardcode admin-data.
- Opdater Current Truth/Status/Issues/handbook/changelog, når sandheden ændres.

## Før push/release
- `git diff --check`
- relevante målrettede tests
- bevis at enhver test, som kan stoppe fuld produktion, er nåelig fra `validate:source`; workflowassertions må låse semantik, ikke afløste tekstliteraler
- `npm run validate:rdks` og håndbog/version/geodatakontrol
- fuld `validate:source` på PR'ens eksakte head
- efter central hydrering/frisk data: `npm run validate` og `npm run release:gate`
- kontroller at source-neutrality består
- ved 4.0.311: bevis capacity/CAS→installationstype-intent, partial-existing→D1-roll-forward, partial-fresh→exact-main/Supabase/eksakt Edge/dobbelt attest, 20-/30-minutters lease, femsekunders prober, 600 sekunders restlease og samlet syvminutters Worker-gate
- ved 4.0.313: bevis migration-only nullable replay, strict schema-v2 stored/readback, bounded schema-v1, forskellige gamle/nye hashes, byteidentisk row/hash/registry, missing-registry repair med gammel hash, modstridende registry-stop og faste ikke-lækkende fejl
- ved 4.0.314: bevis singleton kun i målt `AFTER` på uafhængigt bevist 3-timerskadence, uændret replay/bracket/targetanker/source/CAS, ikke-annullerende concurrency samt exact-D1 → inspect/apply → apply+Pages-låst normalproduktion og ulåst 4.0.315
- ved 4.0.316: bevis at kun forventet fravær af gyldig fallback er ikke-blokerende; gammel/udløbet fallback er væk fra manifest/public files, mens primary accounting/audit, direkte input, 210/673 og fulde releasegates fortsat stopper fail-closed
- bevar `calibration_eligible` som udelukkelseslås; ingen global læring uden server-side signeret manifestbinding
- commit med tydelig årsag/effekt
- push og læs GitHub Actions-resultatet
- ved DMI/Supabase/pipelineændring: verificér den friske produktion før "stabil" erklæres

## Hvis GitHub fejler
Brug loggen fra den aktuelle run. Sammenlign head SHA med lokal commit. Find første reelle fejlede step/kommando. Brug ikke en gammel supportpakke som bevis for en ny failure, medmindre tidsstempler og SHA matcher.
