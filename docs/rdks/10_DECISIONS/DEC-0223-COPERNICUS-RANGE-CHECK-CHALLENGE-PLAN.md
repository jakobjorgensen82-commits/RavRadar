# DEC-0223 – Copernicus-range-kontrol skal bruge DMI’s challenge-plan

**Version:** 4.0.445
**Status:** Implementeret lokalt; livebevis mangler

## Beslutning

Når range-kontrollen sammenligner en gyldig Copernicus-donorbank med en
`READY`- eller `IN_PROGRESS`-source-stage, skal den bruge samme
`agedDmiChallengePlan`, som stage'en brugte. Challenge-planen er en del af
den låste DMI→Copernicus-kontrakt, ikke en valgfri rapportdetalje.

## Begrundelse

Run `35501561874` havde et ærligt DMI-fallbacksignal og gemte Copernicus-
fremgang, men den strenge kontrol kørte uden challenge-planen. Stage'en kunne
derfor vælge en anden restliste end kontrollen, selv om bank, shadow og forsøg
var gyldige. Det stoppede Open-Meteo før den kunne udfylde den faktiske rest.

## Sikkerhedsgrænse

Rettelsen godkender ikke ukendte eller ufuldstændige banker. Den gør kun
kontrolberegningen identisk med stage-beregningen. DMI-first, fallback-
prioritet, gamle gyldige data, MISSING-regler, score, geometri og kravet om et
separat komplethedsbevis er uændret.
