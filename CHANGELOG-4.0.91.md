# RavRadar 4.0.91

## Rettelser

- GitHub-valideringen accepterer nu et kontrolleret lavere antal aktive zoner efter eksplicit godkendte zonesletninger og kræver samtidig fuld ID-overensstemmelse mellem zoneregister og conditions.
- Workflowet anvender kun retningsændringer med status `verified`; kladder og poster under vurdering kan ikke ændre produktionens score eller geometri.
- Håndbogsreviews arkiveres med den eksisterende tilladte status `rejected` og et tydeligt `[ARKIVERET]`-mærke, fordi det installerede Supabase-skema ikke tillader status `archived`.
- Arkiverede reviewposter filtreres fra den normale reviewkø, mens auditsporet bevares.
- Nye regressionstests dækker zonesletning, afvisning af ikke-godkendte retningskladder og reviewarkivering mod det eksisterende Supabase-statusskema.

## Sikkerhed

- Et zoneregister med færre end 150 aktive zoner udløser sikkerhedsstop, så en utilsigtet massesletning ikke kan deployes.
- `conditions.json` må hverken mangle aktive zoner eller indeholde slettede/ukendte zoner.
