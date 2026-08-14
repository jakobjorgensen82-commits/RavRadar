# RavRadar – overlevering til næste chat

## Start her

Læs `AGENTS.md`, `docs/ai/CODEX_START_HERE.md`, den obligatoriske RDKS-kæde, DEC-0030, DEC-0031 og DEC-0037 før kodearbejde. Kontrollér derefter gitstatus, seneste commit og GitHub Actions.

## Aktuel sandhed

- 4.0.208 er seneste produktionsverificerede baseline (#31848912461, commit `7a3382f200a72b702d814ba4d8ca205dc4523369`). Central adminhydrering/tombstones, frisk vejr, fuld validering, releasegate, Supabase, Pages-artifact og deploy bestod.
- 4.0.208 forbedrer lokal snapshotdiagnose og tilføjer en skrivebeskyttet deployaudit. Den ændrer ikke zoner, geometri, DMI-kilder, score eller offentlig UI.
- Den faktiske deployede runtime viser version 4.0.208 og datasæt `rr-20260814230422-210` med 210/210 matchende zoner og vejrposter. Alle tre Vadehavszoner `DK-B04-12`–`DK-B04-14` findes med vejrdata.
- Det indcheckede 31. juli-snapshot er historisk. Et råt repositoryregister er heller ikke centralt effektivt før adminhydrering og tombstones. Derfor skal et lokalt mismatch ikke omtales som en produktionszonefejl uden deployaudit.
- `validate:data` er fortsat fail-closed. Stale mismatch forklares særskilt; aktuel mismatch eller atomisk manifest/conditions-drift er hård fejl.
- `npm run audit:deployed-zone-weather` er read-only. `npm run hydrate:deployed-weather` hydrerer kun vejr og erstatter ikke central adminhydrering.

## Første opgave i næste chat

1. Fortsæt den aktive P1-opgave: DMI-first femdøgnskæder pr. komponent under DEC-0030. Analyse og design før enhver ny kilde, fallback eller scoreændring.
2. Overvåg Supabase-egress gennem næste billingperiode; den private dataminimerede besøgstæller med enkel adminrapport er fortsat P2.
3. Ejerens manuelle land-/vandmarkørreview kan fortsætte gradvist og må ikke erstattes af automatisk national genopdeling.

## Beskyttede beslutninger

- Én autoritativ land-/vandmarkørpar pr. aktiv kyststrækning; manuel gradvis ejerreview kan udskydes, men kræves før endelig faglig brugerrelease.
- Central adminstatus er autoritativ; Fejø/Femø og Havnø/Mariager Fjord øst forbliver slettede.
- Funktioner må ikke fjernes uden ejerbeslutning.
- DMI-first, missing forbliver missing, og ingen gate må svækkes for at få grønt.
- Kritisk arbejde udføres med GPT-5.6 Sol og Ekstra høj indsats.
