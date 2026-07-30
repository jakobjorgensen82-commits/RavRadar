# Engangsopsætning af ekspertlogin

RavRadar 4.0.40 viser eksperten et enkelt login:

- Brugernavn: `ekspert`
- Kode: den adgangskode du selv vælger

## Opret kontoen én gang i Supabase

1. Åbn **Authentication → Users**.
2. Klik **Add user → Create new user**.
3. Brug e-mailen `ekspert@ravradar.dk`. Denne adresse vises ikke for eksperten; den bruges kun internt af Supabase Auth.
4. Vælg den kode, du vil give eksperten. Brug mindst 8 tegn, selv om den gerne må være nem at skrive.
5. Slå **Auto Confirm User** til, hvis valget vises.
6. Opret brugeren.

Det eksisterende database-trigger giver automatisk den nye konto rollen `expert`. Der skal ikke køres SQL.

Eksperten åbner derefter `handbook.html`, logger ind med brugernavnet `ekspert` og den kode, du har valgt. Kontoen kan læse og indsende egne rettelser, men kan ikke åbne RavRadar Admin.
