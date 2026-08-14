# RavRadar – overlevering til næste chat

## Start her

Læs `AGENTS.md`, `docs/ai/CODEX_START_HERE.md`, den obligatoriske RDKS-kæde, DEC-0030, DEC-0031 og DEC-0037 før kodearbejde. Kontrollér derefter gitstatus, seneste commit og GitHub Actions.

## Aktuel sandhed

- 4.0.207 er seneste produktionsverificerede baseline (#31845836107, commit `5176d2e14b2c5cff745caa428e6f1b43f45eb824`).
- 4.0.208 er en snæver kandidat, som forbedrer lokal snapshotdiagnose og tilføjer en skrivebeskyttet deployaudit. Den ændrer ikke zoner, geometri, DMI-kilder, score eller offentlig UI.
- Den faktiske deployede runtime har 210/210 matchende zoner og vejrposter. Alle tre Vadehavszoner `DK-B04-12`–`DK-B04-14` findes med vejrdata.
- Det indcheckede 31. juli-snapshot er historisk. Et råt repositoryregister er heller ikke centralt effektivt før adminhydrering og tombstones. Derfor skal et lokalt mismatch ikke omtales som en produktionszonefejl uden deployaudit.
- `validate:data` er fortsat fail-closed. Stale mismatch forklares særskilt; aktuel mismatch eller atomisk manifest/conditions-drift er hård fejl.
- `npm run audit:deployed-zone-weather` er read-only. `npm run hydrate:deployed-weather` hydrerer kun vejr og erstatter ikke central adminhydrering.

## Første opgave i næste chat

1. Tjek om 4.0.208-kørslen har gennemført frisk central vejrbygning, fuld validering, releasegate, Supabase, artifact og deploy.
2. Opdater RDKS/handoff med run-ID og commit, hvis hele kæden er grøn. Hvis den fejler, analyser hele kæden og ret kun dokumenteret rodårsag.
3. Fortsæt derefter den aktive P1-opgave: DMI-first femdøgnskæder pr. komponent under DEC-0030. Analyse og design før enhver ny kilde, fallback eller scoreændring.

## Beskyttede beslutninger

- Én autoritativ land-/vandmarkørpar pr. aktiv kyststrækning; manuel gradvis ejerreview kan udskydes, men kræves før endelig faglig brugerrelease.
- Central adminstatus er autoritativ; Fejø/Femø og Havnø/Mariager Fjord øst forbliver slettede.
- Funktioner må ikke fjernes uden ejerbeslutning.
- DMI-first, missing forbliver missing, og ingen gate må svækkes for at få grønt.
- Kritisk arbejde udføres med GPT-5.6 Sol og Ekstra høj indsats.
