# DEC-0018 – Admin-persistens og geografisk områdeintegritet

## Status
Bindende fra RavRadar 4.0.63.

Punkt 4 er historisk og erstattet af DEC-0075. Regelværkstedet og rettighederne
`rules_view`, `rules_edit` og `rules_publish` er ikke længere en aktiv del af
RavRadar. De øvrige punkter om områder og verificeret central lagring gælder
fortsat.

## Beslutning
1. Et foruddefineret geografisk område skal være baseret på en fælles, testbar områdedefinition og ikke på løs, lokal tekstmatchning i brugerfladen.
2. Valg af et område skal forvælge alle matchende zoner. Brugeren må derefter fravælge enkelte zoner, og filtrering må ikke ændre det underliggende udvalg.
3. Alle aktive zoner skal være dækket af mindst ét foruddefineret område. Release Gate skal stoppe ved tomme områder, udækkede zoner eller kendte krydsfejl.
4. Eksperter med `rules_view` skal kunne se hele regelfanebladet. `rules_edit` og `rules_publish` er fortsat særskilte myndigheder.
5. En grøn “Gemt centralt”-kvittering må først vises efter en verificeret genlæsning fra Supabase. Det synlige tidspunkt skal være brugerens lokale kvitteringstid; servertid opbevares separat til audit.
6. RavRadar skal have både en browserbaseret ejer-test og en CI-baseret server-test af Supabase-persistens.
7. Browsertesten skal ændre eksisterende centrale dokumenter med en unik testmarkør, læse markøren tilbage, opdatere den og gendanne originalen. Manglende gendannelse er en kritisk fejl.
8. CI-testen skal bruge isolerede testdata og gennemføre create/read/update/delete uden at berøre produktionskonfiguration.

## Begrundelse
En lokal statusbesked eller en succesfuld HTTP-anmodning er ikke i sig selv bevis for vedvarende central lagring. Tilsvarende kan løs tekstmatchning af områder give geografisk forkerte regler. Begge dele skal kunne efterprøves automatisk.
