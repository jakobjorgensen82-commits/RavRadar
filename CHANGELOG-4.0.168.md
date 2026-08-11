# RavRadar 4.0.168

- Privat #31440337378 fandt ved midnat en reel tidsdækningsfejl: to på hinanden følgende havtrin gav intet native tidspunkt tre timer senere, så shadow-score stoppede korrekt med 0/752.
- Den private nationale flertrinsindsamling henter nu fire assets i stedet for to, så en native tretimers vandstandsændring kan beregnes uden interpolation.
- Den transiente shadow-inputgate kræver eksplicit mindst ét native `t`/`t+3h`-par pr. fuldt dækket del og stopper tidligere med `NO_NATIVE_THREE_HOUR_WATER_TREND`, hvis kilden ikke leverer det.
- Ingen offentlig score, geometri, admin-data eller runtime blev ændret af det fejlede private run.
