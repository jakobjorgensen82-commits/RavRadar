# RavRadar 4.0.63

## Regelbygger og geografiske områder
- Alle foruddefinerede områder bruger nu en fælles, testbar områdemodel.
- Valg af område forvælger alle matchende zoner med det samme.
- Enkeltzoner kan fravælges uden at søgning eller filtrering nulstiller valget.
- Områdeauditen dækker hele Danmark og stopper release ved udækkede zoner eller tomme områder.
- Nordjyske østkyst kan ikke længere matche Thy-zoner via løse tekstsøgninger.

## Ekspertadgang til regler
- Eksperter med `rules_view` kan se hele regelfanebladet.
- Redigeringsfunktioner kræver fortsat `rules_edit`.
- Aktivering og publicering kræver fortsat den særskilte rettighed `rules_publish`, som kan tildeles en ekspert.

## Central lagring og tid
- “Gemt centralt” bruger nu tidspunktet for den verificerede browserkvittering og viser brugerens lokale tid.
- Supabases servertid bevares særskilt i statusdata til diagnostik.

## Supabase-persistenstest
- Ny ejerstyret test i admin udfører skrivning, frisk genlæsning, opdatering og sikker gendannelse af centrale dokumenter.
- Testen læser ekspertprofiler/rettigheder og håndbogskommentarer gennem de normale RLS-beskyttede API-veje.
- GitHub Actions udfører desuden en isoleret create/read/update/delete-rundtur med servernøglen.
- Release Gate og lokal validering kontrollerer, at testkæden fortsat findes og er koblet korrekt.
