# Laast fallbacktime - produktion #3246

## Produktionsbevis

Naturlig produktion `#3246` (`32330101853`) bestod readiness, frisk vejrbygning, fuld validering, releasegate, Supabase, Pages-artifact og deploy. Buildet tog 7:58 og byggede datasæt `rr-20260820040308-210` med `productionReferenceAt=2026-08-20T03:00:00Z`.

## Fund

Buildet passerede 04 UTC, mens produktionen korrekt forblev laast til 03 UTC. Open-Meteos femdoegnskald hentede kun fremtid fra den aktuelle 04-time. Seks zoner uden DMI-boelge paa 03-timen (`DK-B07-07`, `DK-B07-09`, `DK-B07-12`, `DK-B07-13`, `DK-B07-17`, `DK-B08-19`) gik derfor fra 118 til 117 boelgetimer og havde `missing` netop paa den laaste aktuelle time.

Det er ikke WAM-rotation: den aktive WAM 18Z-cyklus og dens 18.879 zonetimer er uændret fra #3245. Tabet er afgraenset til fallbackvinduet ved timeskiftet.

## Kandidatrettelse

Open-Meteo-kaldet medtager nu et dynamisk, begraenset bagudvindue beregnet fra forskellen mellem byggetid og laast referencetime. Resultatet filtreres derefter til referencetimen og hoejst 120 timer, saa bagudvinduet ikke forkorter halen. Kildeorden, mergeprioritet, vaerdier, score, geometri og punkter er uændrede.

Regressionen simulerer 11:00 -> 12:04, kraever 11:00 som foerste fallbacktime og bevarer 120 timer. Rettelsen er en PR-kandidat og er ikke produktionsverificeret, foer en frisk main-produktion krydser et timeskifte med fulde gates.

Den udvidede Playwright-audit er gentaget mod det deployede #3246-datasæt: 210 zoner, 673 dele, 420 aktuelle visninger og 2.100 femdoegnsvisninger med nul mismatch, consolefejl, pagefejl eller HTTP-fejl. De seks reelle boelge-nullfelter blev vist som `Mangler`; UI laante ingen vaerdi fra en anden time.

## Historik og state

#3246 genbrugte samme 03:00-reference som #3245. Alle 210 zoner har derfor fortsat 65 raasamples og 34,903 timers spaend; der er ikke skabt en falsk ekstra historiktime. Den gamle main-enrichment har fortsat 55 verificerede samples i 197 zoner, 49 i en zone og nul i de 12 reelle parent-huller. State er fortsat 4/4, score-neutral og uden aktivt current-regime.

Ingen land-/vandpunkter er flyttet.
