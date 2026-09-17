# RavRadar 4.0.399

## Browserens importgraf kan opløses igen

Code-only-run `35175276505` stoppede efter 19 sekunder i den første
implementeringslukning. Det skete før kildebevis, data, Supabase, privat
runtime, providerkald eller deploy.

Ved det manuelle 4.0.398-versionsløft var `?v=` blevet til `$1` i 21 imports i
`app.js` og `bootstrap.js`. Versionsnummeret så korrekt ud for den eksisterende
tekstkontrol, men importstien pegede på et filnavn, som ikke findes.

4.0.399 gendanner alle 21 imports som `fil.js?v=4.0.399`. Både den generelle
releaseversionskontrol og browserens modullukningskontrol afviser nu en
tilsvarende ugyldig dollarmarkør.

Rettelsen ændrer ikke RavScore, vejrdata, providercache, providerprioritet,
geometri, modelbinding eller offentlig score.

Se DEC-0181.
