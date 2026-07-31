# RavRadar 4.0.44 – admin-stabilisering

- Retter en JavaScript-syntaksfejl i `admin-dashboard.js`, som stoppede hele modulet efter visning af Overblik og gjorde alle faner døde.
- Fjerner en utilsigtet dublering af rettigheds- og fanekoden inde i click-handleren.
- Genopretter normal navigation mellem alle adminfaner, samtidig med at rettighedskontrollen bevares.
- Tilføjer automatisk frontend-test, der kontrollerer JavaScript-syntaks, én enkelt rettighedsdefinition og fungerende fanebinding.
- Bevarer Supabase 4.0.43-installationen og central lagring uændret.

## Rodårsag

4.0.43 indeholdt en ny `const TAB_PERMISSIONS` og funktionsdeklarationer inde i fanernes event-handler. Det gav en parsefejl, før event-handlerne blev registreret. HTML og den allerede gengivne status kunne derfor ses, men fanerne reagerede ikke.
