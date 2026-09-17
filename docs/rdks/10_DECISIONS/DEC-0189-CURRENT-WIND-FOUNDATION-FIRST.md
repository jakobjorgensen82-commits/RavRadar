# DEC-0189 – Aktuel vindgrund først, når kystdele mangler vind

**Status:** Aktiv og bindende; implementeret lokalt i 4.0.406, livebevis afventer
**Dato:** 2026-09-17

## Baggrund

Den almindelige produktionskørsel `35205052150` hentede og gemte DMI-strøm,
DMI-bølger, Copernicus og Open-Meteo og byggede den runtime, som senere kom
online som 4.0.405. DMI-leddet brugte sit normale tidsbudget på DKSS-current
og WAM og nåede ikke `harmonie_dini_sf`.

Den offentlige runtime har 673 kystdele. 377 kan beregne score. De øvrige 296
har strøm og bølger, men mangler vindhastighed og vindretning på delpunktet og
får derfor `WADERS_WIND_INPUT_MISSING` og `BEACH_WIND_INPUT_MISSING`. 224 af
disse dele udgør 69 helt utilgængelige zoner; 72 ligger i 31 delvise zoner.
60 af de 69 zoner har samtidig vind på det ældre zonepunkt. Problemet er
derfor ikke generelt manglende vejrhentning, men at den nye models delpunkter
ikke fik HARMONIE-vind, før DMI-budgettet var brugt.

## Beslutning

1. Hvis mindst ét aktivt registreret punkt mangler vind, planlægges
   `harmonie_dini_sf` før DKSS-current og WAM i den almindelige DMI-kørsel.
2. Den forreste HARMONIE-grundopfyldning må forsøge præcis ét aktuelt asset.
   Ét komplet atmosfæregitter bruges til alle aktive registrerede punkter.
3. Efter dette ene forsøg fortsætter samme kørsel med den eksisterende
   prioritet for streng DKSS-current, kritisk WAM og øvrigt arbejde.
4. HARMONIE-grundopfyldningen tæller ikke mod den almindelige collectionkvote,
   men den må heller ikke fortsætte gennem hele tidsbudgettet.
5. Et mislykket eller utilgængeligt HARMONIE-forsøg må ikke skjule problemet;
   det registreres med sin rigtige fejlkode, mens øvrige uafhængige
   providerled fortsat kan gemme deres fremskridt.

## Grænser

- Ingen oneoff bruges. Rettelsen bevises i én almindelig vejropdatering.
- Kildeordenen for strøm er uændret: DMI, Copernicus, regional DMI og
  Open-Meteo. Copernicus og Open-Meteo opfindes ikke som vindkilder.
- RavScore, geometri, land-/vandpunkter og providerdata ændres ikke.
- `MISSING` forbliver ærligt lokalt: gyldige gamle værdier beholdes først,
  og et lokalt hul må ikke gøre resten af RavRadar ubrugelig.

## Verifikation

Efter exact-head, merge og providerfri 4.0.406-deploy køres én almindelig
vejropdatering. Loggen skal vise HARMONIE før DKSS/WAM, højst ét
grundopfyldningsforsøg, efterfølgende current-/bølgearbejde og gemte cacher.
Den nye offentlige runtime skal måles på delniveau: vinddækning, scorede dele,
delvise zoner og helt utilgængelige zoner. Scheduler genaktiveres først, når
den almindelige vedligeholdelse er bevist.
