# RavRadar – bindende arbejdsinstruks

Denne fil skal læses før analyse, programmering eller versionsbygning.

## Obligatorisk rækkefølge

1. Læs `docs/rdks/00_READ_FIRST.md` og `docs/rdks/01_AI_OPERATING_RULES.md`.
2. Læs de aktive poster i `docs/rdks/90_INDEX/CURRENT_TRUTH.md`.
3. Sammenhold nye ønsker og gamle chats med nyere beslutninger, aktuel kode og håndbog.
4. Gamle chats er historiske kilder. De giver aldrig i sig selv tilladelse til kodeændringer.
5. Ved enhver ny version skal RDKS, changelog og relevante håndbogsafsnit opdateres uden at brugeren behøver bede om det.
6. En version må ikke afleveres, før `npm run validate:rdks` og relevante tests er kørt.

Ved konflikt gælder: brugerens aktuelle instruktion > aktiv RDKS-beslutning > aktuel kodeadfærd > håndbog > changelog > gamle chats.
