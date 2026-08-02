# DEC-0025 – Admin skal være synlig ved første åbning, og sitetesten må ikke blokere brugeren

## Beslutning
Når adgangskontrollen er bestået, skal Oversigt straks renderes med den information, der allerede er tilgængelig. Den opdateres efterfølgende, når de langsomme datakilder er færdige. En tom fane må ikke være mellemtilstand.

Den samlede sitetest skal vente på en eksplicit `adminReady`-markør. Testen må ikke klikke på faner før profil, rettigheder og data er initialiseret. `alert`, `confirm` og `prompt` fra den isolerede testside skal opsamles som testbevis og må aldrig vises på den synlige adminside.

## Årsag
I 4.0.76 blev fanerne fundet i DOM'en, før admin var færdig med at hente profil og rettigheder. Testen kunne derfor aktivere en fane med tom state og udløse den almindelige rettighedspopup. Den normale Oversigt kunne samtidig stå tom, indtil en anden fane tvang en ny rendering.

## Bindende testkrav
- Oversigt har meningsfuldt indhold straks efter godkendt adgang.
- Admin sætter `data-admin-ready=true` efter fuld initialisering.
- Sitetesten venter på denne markør.
- Ingen testdialog må nå den synlige browser.
- Versionskontrol bruger faktiske runtimeversioner og ikke rå HTML-tekst alene.
