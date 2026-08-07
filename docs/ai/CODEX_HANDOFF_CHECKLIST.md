# Codex handoff-checkliste

## Éngangsstart
- Åbn den eksisterende lokale RavRadar Git-mappe; opret ikke et nyt tomt projekt.
- Kontrollér at `git status` viser de forventede dokumentationsændringer, og at `.git` stadig tilhører det eksisterende repository.
- Læs `docs/ai/CODEX_START_HERE.md` og `AGENTS.md` før første kodeopgave.
- Bekræft version 4.0.117 og baselinecommit `6c1dece…` i historikken.
- Kør `npm run validate:rdks`; brug `npm run validate` før første ændringsrelease.

## Ved hver opgave
- Find aktivt RDKS-krav/issue eller registrer det før større implementering.
- Tegn/skriv den relevante runtimekæde og identificér sidste verificerede fungerende tilstand.
- Undersøg git diff og relevante historiske commits ved regressioner.
- Ret årsagen minimalt og tilføj/adaptér kontrakttest uden at hardcode admin-data.
- Opdater Current Truth/Status/Issues/handbook/changelog, når sandheden ændres.

## Før push/release
- `git diff --check`
- relevante målrettede tests
- `npm run validate`
- `npm run release:gate`
- kontroller at source-neutrality består
- commit med tydelig årsag/effekt
- push og læs GitHub Actions-resultatet
- ved DMI/Supabase/pipelineændring: verificér den friske produktion før "stabil" erklæres

## Hvis GitHub fejler
Brug loggen fra den aktuelle run. Sammenlign head SHA med lokal commit. Find første reelle fejlede step/kommando. Brug ikke en gammel supportpakke som bevis for en ny failure, medmindre tidsstempler og SHA matcher.
