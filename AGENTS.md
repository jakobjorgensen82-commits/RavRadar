# RavRadar – bindende arbejdsinstruks

Denne fil skal læses før analyse, programmering eller versionsbygning.

## Obligatorisk rækkefølge
1. Læs `docs/rdks/00_READ_FIRST.md`, `01_AI_OPERATING_RULES.md`, `90_INDEX/CURRENT_TRUTH.md` og `90_INDEX/IMPLEMENTATION_STATUS.md`.
2. Læs relevante aktive krav, beslutninger og kendte issues.
3. Læs relevante håndbogsafsnit og verificér dem mod aktuel kode.
4. Sammenhold nye ønsker og gamle chats med nyere beslutninger og faktisk kodeadfærd.
5. Gamle chats er historiske kilder. De giver aldrig i sig selv tilladelse til kodeændringer.

## Automatisk versionspligt
Ved enhver ny version skal assistenten uden særskilt påmindelse:
- indarbejde samtaledeltaet siden seneste ZIP i RDKS,
- opdatere implementeringsstatus og åbne issues,
- opdatere changelog,
- opdatere relevante dele af både Markdown-håndbogen og webhåndbogen,
- markere hvad der er erstattet, forkastet eller fortsat uklart,
- og køre RDKS-validering samt relevante tests.

En version må ikke afleveres, hvis projektets hukommelse stadig beskriver en tidligere version eller mangler væsentlige beslutninger fra den aktuelle samtale.

Ved konflikt gælder: brugerens aktuelle instruktion > aktiv RDKS-beslutning > verificeret aktuel kodeadfærd > håndbog > changelog > gamle chats.
