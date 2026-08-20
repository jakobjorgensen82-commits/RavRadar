# Ikke-deployerende PR-kildegate - 4.0.237

## Resultat

Kladde-PR `#1` har nu en automatisk, ikke-deployerende kildegate. GitHub Actions-run `32324297169` bestod den 2026-08-20.

Gaten koerer:

- RDKS-validering
- current-historik, retention og reference-time-tests
- production-hour-lock
- workflowinventar, valideringsraekkefoelge og deployisolering
- release governance gate

Workflowet udloeses kun af `pull_request`, har kun `contents: read`, bruger ingen secrets og har ingen Pages- eller deployrettigheder. Sikkerhedskontrakten afviser fremtidige aendringer, der tilfoejer push-, schedule- eller dispatch-trigger, secrets eller deploymulighed.

## Bevidst graense

En ra PR-checkout kan ikke koere den fulde produktionsvalidering korrekt. Repositoryets lokale vejrsnapshot er historisk, og den centrale admin-sandhed kraever Supabase-hydrering. Foerste gateforsog `32324126250` viste derfor korrekt `209/211` mod det historiske lokale register. Det er ikke en produktionsfejl og maa ikke omgaas ved at give en PR adgang til produktionshemmeligheder.

Fuld `npm run validate` og `npm run release:gate` skal fortsat koere efter central adminhydrering, frisk vejropbygning og current-proveniens i produktionsworkflowet, foer en ny baseline kan kaldes produktionsverificeret. PR `#1` forbliver kladde og er ikke flettet eller deployet.
