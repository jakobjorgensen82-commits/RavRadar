# RavRadar 4.0.207

## Admin: ét autoritativt land-/havpunktpar

- Fjernet de to uvirksomme knapper **Sæt nyt havpunkt** og **Sæt nyt landpunkt** efter ejerbeslutning.
- Bevarer træk af de eksisterende markører, rød hav→land-pil, geometrikontrol, central readback, DMI-/releasevalidering, runtimepropagering og rollback.
- Regressionstesten beskytter både fraværet af de fjernede funktioner og den fortsatte eksisterende markør-/runtimekæde.

## Projektviden og roadmap

- DEC-0037 fastlægger ét autoritativt punktpar pr. aktiv kyststrækning og fravælger automatisk national genopdeling og ekstra aktive par.
- En skrivebeskyttet orienteringsaudit registreres som triage: 199 kontrolkandidater i 122 zoner, heraf 171 `MultiLineString`-dele.
- Den gradvise manuelle ejerreview er ikke en blokering for uafhængigt roadmaparbejde, men er en forudsætning for endelig faglig score- og brugerreleasegodkendelse.
- Sessionshandoff, RDKS, roadmap og begge håndbogsudgaver er opdateret til den aktuelle sandhed.

## Produktionsbevis

- GitHub Actions #31845836107 på commit `5176d2e14b2c5cff745caa428e6f1b43f45eb824` bestod frisk vejrdata, fuld projektvalidering, releasegate, Supabase-synkronisering, Pages-artifact og deploy.
